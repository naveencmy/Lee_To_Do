// ═══════════════════════════════════════════════════════════════
// TaskCard.jsx — Draggable Terminal Task Record
// Animated hover icons (itshover style) with zero emojis
// ═══════════════════════════════════════════════════════════════
import { useState, useCallback } from 'react';
import { formatDate, timeAgo } from '../utils/dateUtils.js';
import {
  EditIcon,
  TrashIcon,
  CalendarIcon,
  RefreshIcon,
  AlertIcon,
} from './AnimatedIcons.jsx';

export default function TaskCard({ task, onToggle, onEdit, onDelete }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback((e) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    requestAnimationFrame(() => setIsDragging(true));
  }, [task.id]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const cardClasses = [
    'task-card',
    isDragging && 'task-card--dragging',
    task.is_checked && 'task-card--checked',
  ].filter(Boolean).join(' ');

  const shortId = task.id ? (task.id.startsWith('task_') ? task.id.slice(-5) : task.id.slice(0, 6)) : '001';

  return (
    <div
      className={cardClasses}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      id={`task-${task.id}`}
    >
      {/* Top row: Checkbox + Title + Actions */}
      <div className="task-card__top">
        {/* Checkbox */}
        <div
          className={`task-card__checkbox ${task.is_checked ? 'task-card__checkbox--checked' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          role="checkbox"
          aria-checked={task.is_checked}
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onToggle()}
          title={task.is_checked ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {task.is_checked && (
            <svg viewBox="0 0 12 12">
              <polyline points="2 6 5 9 10 3" />
            </svg>
          )}
        </div>

        {/* Title & Terminal ID */}
        <div className="task-card__content">
          <div className="task-card__id">#{shortId.toUpperCase()}</div>
          <div className="task-card__title">{task.title}</div>
        </div>

        {/* Action buttons with animated icons */}
        <div className="task-card__actions">
          <button
            className="task-card__action-btn"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            title="Edit task config"
            aria-label="Edit task"
          >
            <EditIcon size={14} />
          </button>
          <button
            className="task-card__action-btn task-card__action-btn--delete"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Purge task record"
            aria-label="Delete task"
          >
            <TrashIcon size={14} />
          </button>
        </div>
      </div>

      {/* Meta row: status, due date, period, last updated */}
      <div className="task-card__meta">
        {/* Status badge */}
        {task.status && !task.is_checked && (
          <span className={`task-card__status task-card__status--${task.status}`}>
            {task.status.replace(/-/g, '_')}
          </span>
        )}
        {task.is_checked && (
          <span className="task-card__status task-card__status--completed">COMPLETED</span>
        )}

        {/* Due date */}
        {task.due_date && (
          <span className="task-card__due">
            <CalendarIcon size={12} />
            <span>{formatDate(task.due_date)}</span>
          </span>
        )}

        {/* Period badge */}
        {task.period && task.period !== 'none' && (
          <span className="task-card__period">
            <RefreshIcon size={11} />
            <span>{task.period.toUpperCase()}</span>
          </span>
        )}

        {/* Last updated */}
        {task.updated_at && (
          <span className="task-card__updated">
            {timeAgo(task.updated_at)}
          </span>
        )}
      </div>

      {/* Blocker reason (only for blocked column) */}
      {task.column_name === 'blocked' && task.blocker_reason && (
        <div className="task-card__blocker">
          <AlertIcon size={13} />
          <span>{task.blocker_reason}</span>
        </div>
      )}
    </div>
  );
}
