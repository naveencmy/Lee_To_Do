// ═══════════════════════════════════════════════════════════════
// Settings.jsx — Terminal Configuration & Device Management
// CustomSelect for 100% bug-free dropdowns + animated SVG icons
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import { settingsApi } from '../utils/api.js';
import CustomSelect from '../components/CustomSelect.jsx';
import {
  BellIcon,
  ClockIcon,
  SunIcon,
  MoonIcon,
  TerminalIcon,
  PlugConnectedIcon,
  RefreshIcon,
  TrashIcon,
} from '../components/AnimatedIcons.jsx';

const THEME_OPTIONS = [
  { value: 'dark', label: 'Pure Black (#000000)', dot: '#10b981' },
  { value: 'light', label: 'Pure White (#ffffff)', dot: '#f59e0b' },
];

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'IST — India Standard Time (UTC+5:30)' },
  { value: 'UTC', label: 'UTC — Coordinated Universal Time' },
  { value: 'America/New_York', label: 'EST — Eastern Time (UTC-5:00)' },
  { value: 'Europe/London', label: 'GMT — Greenwich Mean Time' },
  { value: 'Asia/Tokyo', label: 'JST — Japan Standard Time (UTC+9:00)' },
];

export default function Settings({ notifications, showToast, theme = 'dark', setTheme }) {
  const [settings, setSettings] = useState({
    notifications_enabled: true,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
    remind_overdue_hours: 2,
    remind_due_today: true,
    remind_due_tomorrow: true,
    weekly_digest: true,
    weekly_digest_day: 'sunday',
    theme: theme,
    timezone: 'Asia/Kolkata',
  });
  const [loading, setLoading] = useState(true);

  // Fetch settings from worker
  useEffect(() => {
    (async () => {
      try {
        const data = await settingsApi.get();
        if (data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings, theme: theme }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    })();

    notifications.fetchDevices();
  }, []);

  const updateSetting = useCallback(async (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (key === 'theme' && setTheme) {
      setTheme(value);
    }
    try {
      await settingsApi.update(key, value);
    } catch (err) {
      showToast(`Failed to persist ${key} setting`);
    }
  }, [showToast, setTheme]);

  const Toggle = ({ settingKey }) => (
    <div
      className={`toggle ${settings[settingKey] ? 'toggle--active' : ''}`}
      onClick={() => updateSetting(settingKey, !settings[settingKey])}
      role="switch"
      aria-checked={settings[settingKey]}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && updateSetting(settingKey, !settings[settingKey])}
    >
      <div className="toggle__knob" />
    </div>
  );

  const handleTestNotification = async () => {
    try {
      const result = await notifications.testNotification();
      showToast(`Test push dispatched to ${result.sent} device(s)`);
    } catch (err) {
      showToast('Failed to dispatch test push');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        [READING_SYSTEM_CONFIG...]
      </div>
    );
  }

  return (
    <div className="settings" id="settings-page">
      {/* ── 1. Push Notifications Section ── */}
      <div className="settings__section">
        <div className="settings__section-header">
          <BellIcon size={18} />
          <span>PUSH_NOTIFICATIONS // CLIENT_BRIDGE</span>
        </div>

        <div className="settings__item">
          <div className="settings__item-info">
            <div className="settings__item-label">Device Web Push Subscription</div>
            <div className="settings__item-desc">
              {notifications.isSubscribed
                ? '[STATUS: ACTIVE // REGISTERED_TO_D1]'
                : '[STATUS: INACTIVE // SUBSCRIPTION_REQUIRED]'}
            </div>
          </div>
          {notifications.isSubscribed ? (
            <button className="btn btn--secondary" onClick={notifications.unsubscribe} style={{ fontSize: 'var(--font-size-xs)' }}>
              Disconnect
            </button>
          ) : (
            <button
              className="btn btn--primary"
              onClick={async () => {
                const res = await notifications.subscribe();
                if (res?.success) {
                  showToast('Web Push enabled and registered!');
                } else {
                  showToast(`Error: ${res?.error || 'Subscription failed'}`);
                }
              }}
              style={{ fontSize: 'var(--font-size-xs)' }}
            >
              Connect Device
            </button>
          )}
        </div>

        <div className="settings__item">
          <div className="settings__item-info">
            <div className="settings__item-label">Desktop Alert Verification</div>
            <div className="settings__item-desc">
              Verify native OS alerts in Windows Action Center / Browser
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn--secondary"
              onClick={() => {
                notifications.showLocalNotification('Lee To-Do // Desktop Alert', {
                  body: 'Terminal notifications are active and responsive! (Windows Action Center)',
                });
                showToast('Desktop alert triggered');
              }}
              style={{ fontSize: 'var(--font-size-xs)' }}
            >
              Instant Test
            </button>
            {notifications.isSubscribed && (
              <button
                className="btn btn--secondary"
                onClick={handleTestNotification}
                style={{ fontSize: 'var(--font-size-xs)' }}
              >
                Server Push
              </button>
            )}
          </div>
        </div>

        <div className="settings__item">
          <div className="settings__item-info">
            <div className="settings__item-label">Global Notification Daemon</div>
            <div className="settings__item-desc">Enable or halt cron worker notification processing</div>
          </div>
          <Toggle settingKey="notifications_enabled" />
        </div>
      </div>

      {/* ── 2. Reminder Schedule Section ── */}
      <div className="settings__section">
        <div className="settings__section-header">
          <ClockIcon size={18} />
          <span>CRON_TRIGGERS // DISPATCH_INTERVALS</span>
        </div>

        <div className="settings__item">
          <div className="settings__item-info">
            <div className="settings__item-label">Overdue Task Alarms</div>
            <div className="settings__item-desc">Every 2 hours during active working hours</div>
          </div>
          <Toggle settingKey="remind_overdue_hours" />
        </div>

        <div className="settings__item">
          <div className="settings__item-info">
            <div className="settings__item-label">Morning Due Today Briefing</div>
            <div className="settings__item-desc">Daily summary at 08:00 AM local time</div>
          </div>
          <Toggle settingKey="remind_due_today" />
        </div>

        <div className="settings__item">
          <div className="settings__item-info">
            <div className="settings__item-label">Evening Due Tomorrow Preview</div>
            <div className="settings__item-desc">Daily preview at 19:00 PM local time</div>
          </div>
          <Toggle settingKey="remind_due_tomorrow" />
        </div>
      </div>

      {/* ── 3. Appearance Section (CustomSelect for Theme) ── */}
      <div className="settings__section">
        <div className="settings__section-header">
          {theme === 'dark' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
          <span>SYSTEM_APPEARANCE // MONOCHROME_THEME</span>
        </div>

        <div className="settings__item">
          <div className="settings__item-info">
            <div className="settings__item-label">Interface Theme Palette</div>
            <div className="settings__item-desc">
              Choose Pure Black (#000000) or Pure White (#ffffff)
            </div>
          </div>
          <div style={{ width: '240px' }}>
            <CustomSelect
              id="theme-select"
              value={theme}
              onChange={(e) => updateSetting('theme', e.target.value)}
              options={THEME_OPTIONS}
            />
          </div>
        </div>

        <div className="settings__item">
          <div className="settings__item-info">
            <div className="settings__item-label">Timezone Localization</div>
            <div className="settings__item-desc">Used for precise cron notification scheduling</div>
          </div>
          <div style={{ width: '280px' }}>
            <CustomSelect
              id="timezone-select"
              value={settings.timezone}
              onChange={(e) => updateSetting('timezone', e.target.value)}
              options={TIMEZONE_OPTIONS}
            />
          </div>
        </div>
      </div>

      {/* ── 4. Registered Devices Section ── */}
      <div className="settings__section">
        <div className="settings__section-header">
          <PlugConnectedIcon size={18} connected={true} />
          <span>CONNECTED_DEVICES // D1_STORAGE</span>
        </div>

        {notifications.devices.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>
            [NO_ACTIVE_PUSH_DEVICES // CLICK_CONNECT_DEVICE_ABOVE]
          </div>
        ) : (
          notifications.devices.map((dev) => (
            <div key={dev.id} className="settings__item">
              <div className="settings__item-info">
                <div className="settings__item-label">{dev.device_name}</div>
                <div className="settings__item-desc">ID: {dev.id} | Subscribed: {dev.created_at}</div>
              </div>
              <span className="term-status-pill term-status-pill--active">
                <span className="term-status-dot" />
                <span>ONLINE</span>
              </span>
            </div>
          ))
        )}
      </div>

      {/* ── 5. System Architecture Section ── */}
      <div className="settings__section">
        <div className="settings__section-header">
          <TerminalIcon size={18} />
          <span>HOST_MANIFEST // STACK_TELEMETRY</span>
        </div>

        <div className="settings__item">
          <div className="settings__item-info">
            <div className="settings__item-label">Frontend Architecture</div>
            <div className="settings__item-desc">Vite React SPA + Pure Terminal CSS (Zero UI Framework Bloat)</div>
          </div>
          <span className="term-status-pill">REACT 18</span>
        </div>

        <div className="settings__item">
          <div className="settings__item-info">
            <div className="settings__item-label">Edge Database & Compute</div>
            <div className="settings__item-desc">Cloudflare Workers + Cloudflare D1 Distributed SQLite</div>
          </div>
          <span className="term-status-pill">CLOUDFLARE_EDGE</span>
        </div>

        <div className="settings__item">
          <div className="settings__item-info">
            <div className="settings__item-label">AI Gateway & Inference</div>
            <div className="settings__item-desc">Cloudflare Workers AI Llama-3.1-8B with local NLP Fallback</div>
          </div>
          <span className="term-status-pill">LLAMA_3.1</span>
        </div>
      </div>
    </div>
  );
}
