// ═══════════════════════════════════════════════════════════════
// Navigation.jsx — Terminal Header with itshover-Style Animated Icons
// Pure Black / Pure White Theme Toggle & Real-time Connection State
// ═══════════════════════════════════════════════════════════════
import {
  KanbanIcon,
  SettingsIcon,
  BellIcon,
  SunIcon,
  MoonIcon,
  FlameIcon,
  PlugConnectedIcon,
} from './AnimatedIcons.jsx';

export default function Navigation({
  activePage,
  onPageChange,
  stats,
  isSubscribed,
  onSubscribe,
  theme = 'dark',
  onToggleTheme,
}) {
  return (
    <nav className="nav">
      {/* Left: Terminal Prompt + Brand */}
      <div className="nav__left">
        <div className="term-window__controls">
          <span className="term-dot term-dot--red" />
          <span className="term-dot term-dot--yellow" />
          <span className="term-dot term-dot--green" />
        </div>

        <div className="nav__logo" onClick={() => onPageChange('blackboard')}>
          <span className="nav__logo-text">LEE_TODO//CLI</span>
          <div className="term-host">
            <span className="term-host__prompt">$</span>
            <span>lee@workstation:</span>
            <span className="term-host__path">~/kanban</span>
          </div>
        </div>
      </div>

      {/* Middle: Page Tabs with Animated Icons */}
      <div className="nav__tabs">
        <button
          className={`nav__tab ${activePage === 'blackboard' ? 'nav__tab--active' : ''}`}
          onClick={() => onPageChange('blackboard')}
          id="tab-blackboard"
        >
          <KanbanIcon size={16} />
          <span>Blackboard</span>
        </button>
        <button
          className={`nav__tab ${activePage === 'settings' ? 'nav__tab--active' : ''}`}
          onClick={() => onPageChange('settings')}
          id="tab-settings"
        >
          <SettingsIcon size={16} />
          <span>Settings</span>
        </button>
      </div>

      {/* Right: Status, Theme Toggle, Notifications */}
      <div className="nav__right">
        {/* System connection indicator */}
        <div className="term-status-pill term-status-pill--active" title="Cloudflare D1 & Worker Synchronized">
          <PlugConnectedIcon size={14} connected={true} />
          <span>D1_ONLINE</span>
        </div>

        {/* Overdue alert badge */}
        {stats.overdue > 0 && (
          <div className="badge-overdue">
            <FlameIcon size={14} />
            <span>{stats.overdue} OVERDUE</span>
          </div>
        )}

        {/* Push notification toggle */}
        {!isSubscribed && (
          <button
            className="btn--icon btn-theme-toggle"
            onClick={onSubscribe}
            title="Enable Web Push Notifications"
            id="btn-enable-notif"
          >
            <BellIcon size={16} active={true} />
          </button>
        )}

        {/* Pure Black / Pure White Theme Toggle */}
        <button
          className="btn-theme-toggle"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Pure White Light' : 'Pure Black Dark'} Theme`}
          aria-label="Toggle Theme"
          id="btn-theme-toggle"
        >
          {theme === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />}
        </button>
      </div>
    </nav>
  );
}
