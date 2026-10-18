// ═══════════════════════════════════════════════════════════════
// Cron Notification Handler — Cloudflare Cron Triggers & On-Demand
// Dispatches Daily Briefings, Weekly Digests, Overdue Alarms & Reminders
// ═══════════════════════════════════════════════════════════════
import { sendWebPush } from '../routes/push.js';

// ── Timezone-Aware Local Time Resolver ──
function getLocalTimeInfo(timezoneStr = 'Asia/Kolkata') {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezoneStr,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
    });
    const parts = formatter.formatToParts(now);
    const map = {};
    for (const p of parts) map[p.type] = p.value;
    const hour = parseInt(map.hour, 10) + parseInt(map.minute, 10) / 60;
    const dateStr = `${map.year}-${map.month}-${map.day}`;
    const weekday = (map.weekday || '').toLowerCase();
    return { hour, dateStr, weekday, now };
  } catch (e) {
    const now = new Date();
    const hour = ((now.getUTCHours() + 5.5 + now.getUTCMinutes() / 60) % 24 + 24) % 24;
    const dateStr = now.toISOString().split('T')[0];
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const weekday = days[now.getUTCDay()];
    return { hour, dateStr, weekday, now };
  }
}

export async function handleCronNotifications(env, options = {}) {
  const db = env.DB;
  const isForced = !!options.force;

  try {
    // 1. Fetch user configuration
    const { results: rawSettings } = await db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rawSettings || []) {
      if (r.value === 'true') settings[r.key] = true;
      else if (r.value === 'false') settings[r.key] = false;
      else if (!isNaN(r.value) && r.value.trim() !== '') settings[r.key] = Number(r.value);
      else settings[r.key] = r.value;
    }

    if (settings.notifications_enabled === false && !isForced) {
      console.log('Notifications disabled in settings, skipping cron');
      return { success: true, skipped: 'disabled' };
    }

    const timezone = settings.timezone || 'Asia/Kolkata';
    const { hour: localHour, dateStr: todayStr, weekday: currentWeekday, now } = getLocalTimeInfo(timezone);

    // 2. Quiet hours verification
    if (!isForced && settings.quiet_hours_start && settings.quiet_hours_end) {
      const qStart = parseInt(String(settings.quiet_hours_start).split(':')[0], 10);
      const qEnd = parseInt(String(settings.quiet_hours_end).split(':')[0], 10);

      if (qStart > qEnd) {
        if (localHour >= qStart || localHour < qEnd) {
          console.log(`In quiet hours (${settings.quiet_hours_start} - ${settings.quiet_hours_end}), skipping notifications`);
          return { success: true, skipped: 'quiet_hours' };
        }
      } else if (localHour >= qStart && localHour < qEnd) {
        console.log(`In quiet hours (${settings.quiet_hours_start} - ${settings.quiet_hours_end}), skipping notifications`);
        return { success: true, skipped: 'quiet_hours' };
      }
    }

    // 3. Fetch active tasks and push subscribers
    const { results: allTasks } = await db.prepare('SELECT * FROM tasks').all();
    const tasks = (allTasks || []).filter(t => !t.is_checked);

    const { results: subs } = await db.prepare('SELECT * FROM push_subscriptions').all();
    if (!subs || subs.length === 0) {
      console.log('No registered push subscriptions found');
      return { success: true, sent: 0, failed: 0, reason: 'no_subscriptions' };
    }

    // 4. Compute dates
    const tomorrowDate = new Date(now.getTime() + 86400000);
    const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

    const notifications = [];

    // ── A. DAILY TASKS & MORNING BRIEFING ──
    // Includes recurring daily tasks (period === 'daily') AND tasks due today (due_date === todayStr)
    const dailyRecurringTasks = tasks.filter(t => t.period === 'daily');
    const dueTodayTasks = tasks.filter(t => t.due_date === todayStr);
    const combinedDailyTasks = Array.from(new Set([...dailyRecurringTasks, ...dueTodayTasks]));

    const isMorningWindow = (localHour >= 7.0 && localHour < 10.5) || isForced;
    if (combinedDailyTasks.length > 0 && isMorningWindow && settings.remind_due_today !== false) {
      const dailyList = combinedDailyTasks.slice(0, 4).map(t => {
        const tag = t.period === 'daily' ? 'Daily' : 'Today';
        return `• [${tag}] ${t.title}`;
      }).join('\n');
      const extra = combinedDailyTasks.length > 4 ? `\n...and ${combinedDailyTasks.length - 4} more` : '';

      notifications.push({
        title: `Daily Task Notice: ${combinedDailyTasks.length} Item${combinedDailyTasks.length > 1 ? 's' : ''} Scheduled`,
        body: `${dailyList}${extra}`,
        tag: 'daily-tasks-briefing',
        urgency: 'normal',
      });
    }

    // ── B. WEEKLY TASKS & WEEKLY DIGEST ──
    // Includes recurring weekly tasks (period === 'weekly') AND weekly digest on configured day
    const weeklyRecurringTasks = tasks.filter(t => t.period === 'weekly');
    const digestDay = String(settings.weekly_digest_day || 'sunday').toLowerCase();
    const isDigestDay = currentWeekday === digestDay || isForced;

    if (settings.weekly_digest !== false && (weeklyRecurringTasks.length > 0 || isDigestDay)) {
      // Completed in the last 7 days
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
      const completedRecent = (allTasks || []).filter(t => t.is_checked && t.updated_at >= sevenDaysAgo);
      const urgentCount = tasks.filter(t => t.column_name === 'urgent').length;
      const blockedCount = tasks.filter(t => t.column_name === 'blocked').length;

      let weeklyBody = '';
      if (weeklyRecurringTasks.length > 0) {
        weeklyBody += `Weekly Tasks (${weeklyRecurringTasks.length}):\n` +
          weeklyRecurringTasks.slice(0, 3).map(t => `• ${t.title}`).join('\n') + '\n';
      }
      weeklyBody += `Board Health: ${tasks.length} active (${urgentCount} urgent, ${blockedCount} blocked). Completed this week: ${completedRecent.length} ✅`;

      notifications.push({
        title: `Weekly Task Digest & Notice`,
        body: weeklyBody.trim(),
        tag: 'weekly-digest-notice',
        urgency: 'normal',
      });
    }

    // ── C. OVERDUE TASK ALARMS ──
    const overdueTasks = tasks.filter(t => t.due_date && t.due_date < todayStr);
    if (overdueTasks.length > 0 && settings.remind_overdue_hours !== false) {
      notifications.push({
        title: `${overdueTasks.length} Overdue Task${overdueTasks.length > 1 ? 's' : ''} Alert`,
        body: overdueTasks.slice(0, 3).map(t => `• ${t.title} (due ${t.due_date})`).join('\n') +
          (overdueTasks.length > 3 ? `\n...and ${overdueTasks.length - 3} more` : ''),
        tag: 'overdue-tasks',
        urgency: 'high',
      });
    }

    // ── D. EVENING DUE TOMORROW PREVIEW ──
    const isEveningWindow = (localHour >= 18.0 && localHour < 21.5) || isForced;
    const dueTomorrowTasks = tasks.filter(t => t.due_date === tomorrowStr);
    if (dueTomorrowTasks.length > 0 && isEveningWindow && settings.remind_due_tomorrow !== false) {
      notifications.push({
        title: `${dueTomorrowTasks.length} Task${dueTomorrowTasks.length > 1 ? 's' : ''} Due Tomorrow`,
        body: dueTomorrowTasks.slice(0, 3).map(t => `• ${t.title}`).join('\n'),
        tag: 'due-tomorrow',
        urgency: 'normal',
      });
    }

    // ── E. BLOCKED TASKS NOTIFICATION ──
    const blockedTasks = tasks.filter(t => t.column_name === 'blocked');
    const isBlockedWindow = (localHour >= 10.0 && localHour < 12.0) || isForced;
    if (blockedTasks.length > 0 && isBlockedWindow) {
      notifications.push({
        title: `${blockedTasks.length} Blocked Task${blockedTasks.length > 1 ? 's' : ''} Need Resolution`,
        body: blockedTasks.slice(0, 3).map(t => `• ${t.title}${t.blocker_reason ? ': ' + t.blocker_reason : ''}`).join('\n'),
        tag: 'blocked-tasks',
        urgency: 'normal',
      });
    }

    // ── F. URGENT TASKS ALARM ──
    const urgentTasks = tasks.filter(t => t.column_name === 'urgent');
    const isUrgentWindow = (localHour >= 8.0 && localHour < 10.0) || isForced;
    if (urgentTasks.length > 0 && isUrgentWindow && !notifications.some(n => n.tag === 'daily-tasks-briefing')) {
      notifications.push({
        title: `${urgentTasks.length} Urgent Priority Task${urgentTasks.length > 1 ? 's' : ''}`,
        body: urgentTasks.slice(0, 3).map(t => `• ${t.title}`).join('\n'),
        tag: 'urgent-tasks',
        urgency: 'high',
      });
    }

    // If on a forced trigger and no specific conditions matched, send a comprehensive status notice
    if (notifications.length === 0 && isForced) {
      notifications.push({
        title: `Lee To-Do: Schedule Status`,
        body: `Active: ${tasks.length} tasks • Daily: ${dailyRecurringTasks.length} • Weekly: ${weeklyRecurringTasks.length} • Overdue: ${overdueTasks.length}`,
        tag: 'schedule-status',
        urgency: 'normal',
      });
    }

    // 5. Send Web Push notifications
    let totalSent = 0;
    let totalFailed = 0;

    for (const notif of notifications) {
      const payload = JSON.stringify({
        title: notif.title,
        body: notif.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        tag: notif.tag,
        renotify: true,
        requireInteraction: notif.urgency === 'high',
        data: { url: '/', urgency: notif.urgency },
        actions: [
          { action: 'open', title: 'Open Board' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      });

      for (const sub of subs) {
        try {
          await sendWebPush(env, {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.key_p256dh, auth: sub.key_auth }
          }, payload);
          totalSent++;
        } catch (err) {
          totalFailed++;
          console.error(`Push to ${sub.device_name} failed:`, err.message);
          if (err.status === 410 || err.status === 404) {
            await db.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(sub.id).run();
            console.log(`Cleaned up expired subscription: ${sub.device_name}`);
          }
        }
      }
    }

    console.log(`Cron Complete: Dispatched ${notifications.length} notification batches to ${subs.length} devices (Sent: ${totalSent}, Failed: ${totalFailed})`);
    return {
      success: true,
      notificationsDispatched: notifications.length,
      devicesCount: subs.length,
      sent: totalSent,
      failed: totalFailed,
      notifications: notifications.map(n => ({ title: n.title, tag: n.tag })),
    };

  } catch (err) {
    console.error('Cron notification error:', err.message, err.stack);
    return { success: false, error: err.message };
  }
}
