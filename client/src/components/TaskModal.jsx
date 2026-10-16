// ═══════════════════════════════════════════════════════════════
// TaskModal.jsx — Terminal-Grade Task Editor Modal
// Uses CustomSelect with zero white-on-white native select bugs
// Fully responsive with pure black/pure white theme support
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import { getTodayStr } from '../utils/dateUtils.js';
import CustomSelect from './CustomSelect.jsx';
import {
  EditIcon,
  PlusIcon,
  CloseIcon,
  TrashIcon,
  CalendarIcon,
  TerminalIcon,
} from './AnimatedIcons.jsx';

const COLUMN_OPTIONS = [
  { value: 'todo', label: 'To-Do', dot: '#8b5cf6' },
  { value: 'urgent', label: 'Urgent', dot: '#ef4444' },
  { value: 'inprogress', label: 'In Progress', dot: '#06b6d4' },
  { value: 'blocked', label: 'Blocked', dot: '#f97316' },
];

const PERIOD_OPTIONS = [
  { value: 'none', label: 'None (one-time)' },
  { value: 'daily', label: 'Daily cadence' },
  { value: 'weekly', label: 'Weekly cycle' },
  { value: 'monthly', label: 'Monthly milestone' },
];

export default function TaskModal({ task, defaultColumn, onSave, onClose, onDelete }) {
  const isEditing = !!task;
  const titleRef = useRef(null);

  const [formData, setFormData] = useState({
    title: task?.title || '',
    column_name: task?.column_name || defaultColumn || 'todo',
    due_date: task?.due_date || '',
    period: task?.period || 'none',
    blocker_reason: task?.blocker_reason || '',
  });

  useEffect(() => {
    if (titleRef.current) titleRef.current.focus();
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSave({
      ...formData,
      due_date: formData.due_date || null,
      blocker_reason: formData.column_name === 'blocked' ? formData.blocker_reason : null,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal term-window" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Terminal Header */}
        <div className="term-window__header modal__header">
          <div className="term-window__controls">
            <span className="term-dot term-dot--red" onClick={onClose} title="Close" />
            <span className="term-dot term-dot--yellow" />
            <span className="term-dot term-dot--green" />
            <span className="term-window__title">
              {isEditing ? `task_edit --id="${task.id?.slice(0, 8)}"` : 'task_new --stage=draft'}
            </span>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close modal">
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Form Title & Icon */}
        <div className="modal__banner">
          <div className="modal__banner-icon">
            {isEditing ? <EditIcon size={20} /> : <PlusIcon size={20} />}
          </div>
          <div>
            <h2 className="modal__title">
              {isEditing ? 'Modify Task Entry' : 'Create Task Record'}
            </h2>
            <div className="modal__subtitle">
              {isEditing ? `TARGET: ${formData.column_name.toUpperCase()}` : 'INITIALIZE NEW WORKSTREAM ITEM'}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            {/* Title */}
            <div className="form-group">
              <label htmlFor="task-title" className="term-label">
                <span>$ TASK_TITLE *</span>
              </label>
              <input
                id="task-title"
                ref={titleRef}
                type="text"
                className="term-input"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g. Complete Operating Systems Lab 4"
                required
                autoComplete="off"
              />
            </div>

            {/* Column + Due Date row */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="task-column" className="term-label">
                  <span>$ COLUMN_TARGET</span>
                </label>
                <CustomSelect
                  id="task-column"
                  value={formData.column_name}
                  onChange={(e) => handleChange('column_name', e.target.value)}
                  options={COLUMN_OPTIONS}
                />
              </div>

              <div className="form-group">
                <label htmlFor="task-due" className="term-label">
                  <span>$ DUE_TIMESTAMP</span>
                </label>
                <div className="term-date-wrapper">
                  <input
                    id="task-due"
                    type="date"
                    className="term-input"
                    value={formData.due_date}
                    onChange={(e) => handleChange('due_date', e.target.value)}
                    min={getTodayStr()}
                  />
                  <span className="term-date-icon">
                    <CalendarIcon size={16} />
                  </span>
                </div>
              </div>
            </div>

            {/* Period */}
            <div className="form-group">
              <label htmlFor="task-period" className="term-label">
                <span>$ RECURRENCE_CADENCE</span>
              </label>
              <CustomSelect
                id="task-period"
                value={formData.period}
                onChange={(e) => handleChange('period', e.target.value)}
                options={PERIOD_OPTIONS}
              />
            </div>

            {/* Blocker reason (shown only for blocked column) */}
            {formData.column_name === 'blocked' && (
              <div className="form-group">
                <label htmlFor="task-blocker" className="term-label term-label--alert">
                  <span>$ BLOCKER_DEPENDENCY *</span>
                </label>
                <textarea
                  id="task-blocker"
                  className="term-input term-textarea"
                  value={formData.blocker_reason}
                  onChange={(e) => handleChange('blocker_reason', e.target.value)}
                  placeholder="What is blocking execution? (API keys, waiting on PR, hardware issue...)"
                  rows={2}
                />
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="modal__footer term-modal__footer">
            {onDelete && (
              <button
                type="button"
                className="btn btn--danger term-btn"
                onClick={onDelete}
                style={{ marginRight: 'auto' }}
              >
                <TrashIcon size={15} />
                <span>Delete</span>
              </button>
            )}
            <button type="button" className="btn btn--secondary term-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary term-btn term-btn--primary"
              disabled={!formData.title.trim()}
            >
              {isEditing ? <EditIcon size={15} /> : <PlusIcon size={15} />}
              <span>{isEditing ? 'Commit Changes' : 'Execute Create'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
