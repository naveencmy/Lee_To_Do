// ═══════════════════════════════════════════════════════════════
// KanbanColumn.jsx — Terminal Workstream Column with Drop Zone
// Animated icons for column badges and new task creation
// ═══════════════════════════════════════════════════════════════
import { useState, useCallback } from 'react';
import TaskCard from './TaskCard.jsx';
import { PlusIcon } from './AnimatedIcons.jsx';

export default function KanbanColumn({ column, tasks, onToggleTask, onEditTask, onDeleteTask, onAddTask, onDrop }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onDrop(taskId, column.id);
    }
  }, [column.id, onDrop]);

  return (
    <div
      className={`column ${column.className} ${isDragOver ? 'column--drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      id={`column-${column.id}`}
    >
      {/* Column header */}
      <div className="column__header">
        <div className="column__title-group">
          <span className="column__icon">{column.icon}</span>
          <h2 className="column__title">
            <span className="column__tag">[{column.tag}]</span>
            <span>{column.title}</span>
          </h2>
        </div>
        <span className="column__count">{tasks.length}</span>
      </div>

      {/* Column body with tasks */}
      <div className="column__body">
        {tasks.length === 0 ? (
          <div className={`column__empty ${isDragOver ? 'column__empty--drag-over' : ''}`}>
            <span>{column.icon}</span>
            <span>{isDragOver ? 'READY_TO_DROP' : 'NO_ACTIVE_TASKS'}</span>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={() => onToggleTask(task.id)}
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task.id)}
            />
          ))
        )}
      </div>

      {/* Add task button at bottom */}
      <button className="add-task-btn" onClick={onAddTask} id={`add-task-${column.id}`}>
        <PlusIcon size={14} />
        <span>Add Task</span>
      </button>
    </div>
  );
}
