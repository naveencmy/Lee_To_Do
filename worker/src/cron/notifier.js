// ═══════════════════════════════════════════════════════════════
// Cron Notification Handler — Runs every 2 hours via Cloudflare Cron Triggers
// Checks tasks and sends push notifications to all subscribed devices
// ═══════════════════════════════════════════════════════════════
import { sendWebPush } from '../routes/push.js';

export async function handleCronNotifications(env) {
  const db = env.DB;
  
  try {
    // Check if notifications are enabled
    const notifSetting = await db.prepare(
      "SELECT value FROM settings WHERE key = 'notifications_enabled'"
    ).first();
    
    if (notifSetting?.value === 'false') {
      console.log('Notifications disabled, skipping cron');
      return;
    }
    
    // Check quiet hours
    const quietStart = await db.prepare("SELECT value FROM settings WHERE key = 'quiet_hours_start'").first();
    const quietEnd = await db.prepare("SELECT value FROM settings WHERE key = 'quiet_hours_end'").first();
    const timezone = await db.prepare("SELECT value FROM settings WHERE key = 'timezone'").first();
    
    const now = new Date();
    const currentHour = now.getUTCHours() + 5.5; // IST offset (default)
    const normalizedHour = ((currentHour % 24) + 24) % 24;
    
    if (quietStart?.value && quietEnd?.value) {
      const qStart = parseInt(quietStart.value.split(':')[0]);
      const qEnd = parseInt(quietEnd.value.split(':')[0]);
      
      if (qStart > qEnd) {
        // Quiet hours span midnight (e.g., 22:00 - 07:00)
        if (normalizedHour >= qStart || normalizedHour < qEnd) {
          console.log('In quiet hours, skipping notifications');
          return;
        }
      } else if (normalizedHour >= qStart && normalizedHour < qEnd) {
        console.log('In quiet hours, skipping notifications');
        return;
      }
    }
    
    // Fetch all tasks
    const { results: tasks } = await db.prepare(
      'SELECT * FROM tasks WHERE is_checked = 0 ORDER BY due_date ASC'
    ).all();
    
    if (tasks.length === 0) return;
    
    // Fetch all push subscriptions
    const { results: subs } = await db.prepare('SELECT * FROM push_subscriptions').all();
    if (subs.length === 0) return;
    
    // Categorize tasks and build notifications
    const notifications = [];
    const todayStr = now.toISOString().split('T')[0];
    const tomorrowDate = new Date(now.getTime() + 86400000);
    const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
    
    // Overdue tasks
    const overdueTasks = tasks.filter(t => t.due_date && t.due_date < todayStr);
    if (overdueTasks.length > 0) {
      notifications.push({
        title: `🚨 ${overdueTasks.length} Overdue Task${overdueTasks.length > 1 ? 's' : ''}`,
        body: overdueTasks.slice(0, 3).map(t => `• ${t.title}`).join('\n') + 
              (overdueTasks.length > 3 ? `\n...and ${overdueTasks.length - 3} more` : ''),
        tag: 'overdue-tasks',
        urgency: 'high',
      });
    }
    
    // Due today
    const dueTodayTasks = tasks.filter(t => t.due_date === todayStr);
    if (dueTodayTasks.length > 0) {
      notifications.push({
        title: `📋 ${dueTodayTasks.length} Task${dueTodayTasks.length > 1 ? 's' : ''} Due Today`,
        body: dueTodayTasks.map(t => `• ${t.title}`).join('\n'),
        tag: 'due-today',
        urgency: 'normal',
      });
    }
    
    // Due tomorrow (only send in evening: 18:00-21:00)
    if (normalizedHour >= 18 && normalizedHour < 21) {
      const dueTomorrowTasks = tasks.filter(t => t.due_date === tomorrowStr);
      if (dueTomorrowTasks.length > 0) {
        notifications.push({
          title: `⏰ ${dueTomorrowTasks.length} Task${dueTomorrowTasks.length > 1 ? 's' : ''} Due Tomorrow`,
          body: dueTomorrowTasks.map(t => `• ${t.title}`).join('\n'),
          tag: 'due-tomorrow',
          urgency: 'normal',
        });
      }
    }
    
    // Blocked tasks reminder (daily at ~10AM)
    if (normalizedHour >= 9.5 && normalizedHour < 11.5) {
      const blockedTasks = tasks.filter(t => t.column_name === 'blocked');
      if (blockedTasks.length > 0) {
        notifications.push({
          title: `🔴 ${blockedTasks.length} Blocked Task${blockedTasks.length > 1 ? 's' : ''} Need Attention`,
          body: blockedTasks.slice(0, 3).map(t => 
            `• ${t.title}${t.blocker_reason ? ': ' + t.blocker_reason : ''}`
          ).join('\n'),
          tag: 'blocked-tasks',
          urgency: 'normal',
        });
      }
    }
    
    // Urgent tasks
    const urgentTasks = tasks.filter(t => t.column_name === 'urgent');
    if (urgentTasks.length > 0 && normalizedHour >= 7.5 && normalizedHour < 9.5) {
      notifications.push({
        title: `🔥 ${urgentTasks.length} Urgent Task${urgentTasks.length > 1 ? 's' : ''} Waiting`,
        body: urgentTasks.slice(0, 3).map(t => `• ${t.title}`).join('\n'),
        tag: 'urgent-tasks',
        urgency: 'high',
      });
    }
    
    // Send notifications to all subscribers
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
        } catch (err) {
          console.error(`Push to ${sub.device_name} failed:`, err.message);
          // Clean up invalid subscriptions
          if (err.status === 410 || err.status === 404) {
            await db.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(sub.id).run();
            console.log(`Removed invalid subscription: ${sub.device_name}`);
          }
        }
      }
    }
    
    console.log(`Cron: Sent ${notifications.length} notification types to ${subs.length} devices`);
    
  } catch (err) {
    console.error('Cron notification error:', err.message, err.stack);
  }
}
