// ═══════════════════════════════════════════════════════════════
// AnimatedIcons.jsx — Real Animated SVG Icons (Inspired by itshover.com)
// Micro-interactions with smooth SVG path & transform transitions
// ═══════════════════════════════════════════════════════════════

// ── 1. Plug Connected Icon (from itshover.com plug-connected-icon) ──
export function PlugConnectedIcon({ size = 20, className = '', connected = true }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-plug ${connected ? 'is-connected' : ''} ${className}`}
    >
      {/* Left plug body */}
      <path className="plug-left" d="m19 5 3-3" />
      <path className="plug-left" d="m2 22 3-3" />
      <path className="plug-body-left" d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z" />
      {/* Right plug body */}
      <path className="plug-body-right" d="M7.5 13.5 10 11" />
      <path className="plug-body-right" d="M10.5 16.5 13 14" />
      <path className="plug-right" d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z" />
      {/* Spark indicator */}
      <circle className="plug-spark" cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

// ── 2. Terminal Icon ──
export function TerminalIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-terminal ${className}`}
    >
      <rect x="3" y="4" width="18" height="16" rx="2" className="terminal-box" />
      <polyline points="7 9 10 12 7 15" className="terminal-prompt" />
      <line x1="13" y1="15" x2="17" y2="15" className="terminal-cursor" />
    </svg>
  );
}

// ── 3. Kanban / Board Icon ──
export function KanbanIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-kanban ${className}`}
    >
      <rect x="3" y="3" width="5" height="18" rx="1.5" className="kanban-col col-1" />
      <rect x="10" y="3" width="5" height="12" rx="1.5" className="kanban-col col-2" />
      <rect x="17" y="3" width="5" height="15" rx="1.5" className="kanban-col col-3" />
    </svg>
  );
}

// ── 4. Check Square / Task Complete Icon ──
export function CheckSquareIcon({ size = 20, className = '', checked = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-check ${checked ? 'is-checked' : ''} ${className}`}
    >
      <rect x="3" y="3" width="18" height="18" rx="4" className="check-box" />
      <polyline points="8 12 11 15 16 9" className="check-mark" />
    </svg>
  );
}

// ── 5. Plus / Add Icon ──
export function PlusIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-plus ${className}`}
    >
      <circle cx="12" cy="12" r="9" className="plus-circle" />
      <line x1="12" y1="8" x2="12" y2="16" className="plus-line-v" />
      <line x1="8" y1="12" x2="16" y2="12" className="plus-line-h" />
    </svg>
  );
}

// ── 6. Bell / Notification Icon ──
export function BellIcon({ size = 20, className = '', active = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-bell ${active ? 'is-active' : ''} ${className}`}
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" className="bell-body" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" className="bell-clapper" />
      {active && <circle cx="18" cy="4" r="2.5" fill="#ef4444" stroke="none" className="bell-dot" />}
    </svg>
  );
}

// ── 7. Settings / Gear Icon ──
export function SettingsIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-settings ${className}`}
    >
      <circle cx="12" cy="12" r="3" className="gear-center" />
      <path
        className="gear-teeth"
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
      />
    </svg>
  );
}

// ── 8. Unique Float AI Neural Core Icon (Custom Quantum Co-Pilot) ──
export function FloatAiIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-float-ai ${className}`}
    >
      {/* Outer tilted elliptical orbit */}
      <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(-30 12 12)" className="float-ai-orbit float-ai-orbit--1" />
      {/* Reverse intersecting orbital ring */}
      <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(30 12 12)" className="float-ai-orbit float-ai-orbit--2" />
      {/* Glowing inner neural nucleus / core */}
      <circle cx="12" cy="12" r="3.2" className="float-ai-core" fill="currentColor" fillOpacity="0.3" />
      {/* Quantum satellite nodes */}
      <circle cx="19" cy="8" r="1.3" className="float-ai-node float-ai-node--1" fill="currentColor" />
      <circle cx="5" cy="16" r="1.3" className="float-ai-node float-ai-node--2" fill="currentColor" />
      {/* Micro center spark */}
      <circle cx="12" cy="12" r="1" className="float-ai-center-dot" fill="currentColor" />
    </svg>
  );
}

// ── 8b. Legacy Sparkles / Generic Icon ──
export function SparklesIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-sparkles ${className}`}
    >
      <path
        className="sparkle-primary"
        d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"
      />
      <path className="sparkle-secondary" d="m5 3 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z" />
      <path className="sparkle-tertiary" d="m19 17 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z" />
    </svg>
  );
}

// ── 9. Trash / Delete Icon ──
export function TrashIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-trash ${className}`}
    >
      <g className="trash-lid">
        <path d="M3 6h18" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </g>
      <path className="trash-can" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <line className="trash-bar" x1="10" y1="11" x2="10" y2="17" />
      <line className="trash-bar" x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

// ── 10. Edit / Pencil Icon ──
export function EditIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-edit ${className}`}
    >
      <path className="edit-pen" d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path className="edit-tip" d="m15 5 4 4" />
    </svg>
  );
}

// ── 11. Calendar Icon ──
export function CalendarIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-calendar ${className}`}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" className="calendar-box" />
      <line x1="16" y1="2" x2="16" y2="6" className="calendar-ring-r" />
      <line x1="8" y1="2" x2="8" y2="6" className="calendar-ring-l" />
      <line x1="3" y1="10" x2="21" y2="10" className="calendar-line" />
      <rect x="8" y="14" width="2" height="2" className="calendar-dot dot-1" />
      <rect x="14" y="14" width="2" height="2" className="calendar-dot dot-2" />
    </svg>
  );
}

// ── 12. Clock / Time Icon ──
export function ClockIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-clock ${className}`}
    >
      <circle cx="12" cy="12" r="10" className="clock-rim" />
      <polyline points="12 6 12 12 16 14" className="clock-hands" />
    </svg>
  );
}

// ── 13. Sun / Light Theme Icon ──
export function SunIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-sun ${className}`}
    >
      <circle cx="12" cy="12" r="4" className="sun-center" />
      <path
        className="sun-rays"
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
      />
    </svg>
  );
}

// ── 14. Moon / Dark Theme Icon ──
export function MoonIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-moon ${className}`}
    >
      <path className="moon-body" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      <circle cx="17" cy="5" r="1" fill="currentColor" className="moon-star star-1" />
      <circle cx="19" cy="9" r="1" fill="currentColor" className="moon-star star-2" />
    </svg>
  );
}

// ── 15. Chevron Down Icon ──
export function ChevronDownIcon({ size = 18, className = '', open = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-chevron ${open ? 'is-open' : ''} ${className}`}
    >
      <polyline points="6 9 12 15 18 9" className="chevron-arrow" />
    </svg>
  );
}

// ── 16. Close / X Icon ──
export function CloseIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-close ${className}`}
    >
      <line x1="18" y1="6" x2="6" y2="18" className="x-line-1" />
      <line x1="6" y1="6" x2="18" y2="18" className="x-line-2" />
    </svg>
  );
}

// ── 17. Flame / Urgent Icon ──
export function FlameIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-flame ${className}`}
    >
      <path
        className="flame-outer"
        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
      />
    </svg>
  );
}

// ── 18. Alert / Blocked Icon ──
export function AlertIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-alert ${className}`}
    >
      <polygon
        points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"
        className="alert-shape"
      />
      <line x1="12" y1="8" x2="12" y2="12" className="alert-bar" />
      <line x1="12" y1="16" x2="12.01" y2="16" className="alert-dot" />
    </svg>
  );
}

// ── 19. Activity / In Progress Icon ──
export function ActivityIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-activity ${className}`}
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" className="activity-wave" />
    </svg>
  );
}

// ── 20. Send / Run Icon ──
export function SendIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-send ${className}`}
    >
      <line x1="22" y1="2" x2="11" y2="13" className="send-arrow" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" className="send-plane" />
    </svg>
  );
}

// ── 21. Refresh / Sync Icon ──
export function RefreshIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-refresh ${className}`}
    >
      <path d="M21.5 2v6h-6" className="refresh-arrow-top" />
      <path d="M2.5 22v-6h6" className="refresh-arrow-bottom" />
      <path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8" className="refresh-arc-top" />
      <path d="M22 12.5a10 10 0 0 1-18.8 4.3L2.5 16" className="refresh-arc-bottom" />
    </svg>
  );
}

// ── 22. Filter Icon ──
export function FilterIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-filter ${className}`}
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" className="filter-funnel" />
    </svg>
  );
}

// ── 23. Microphone Voice Icon ──
export function MicIcon({ size = 18, className = '', recording = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-mic ${recording ? 'is-recording' : ''} ${className}`}
    >
      <path className="mic-capsule" d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path className="mic-stand" d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line className="mic-stem" x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

// ── 24. Copy Icon ──
export function CopyIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-copy ${className}`}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" className="copy-front" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" className="copy-back" />
    </svg>
  );
}

// ── 25. Check Icon ──
export function CheckIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`hover-icon icon-check ${className}`}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}


