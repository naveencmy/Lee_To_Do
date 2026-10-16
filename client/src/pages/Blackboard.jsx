// ═══════════════════════════════════════════════════════════════
// Blackboard.jsx — Terminal Workstream Blackboard Page
// Real animated SVG icons for column streams
// ═══════════════════════════════════════════════════════════════
import { useState } from 'react';
import KanbanColumn from '../components/KanbanColumn.jsx';
import TaskModal from '../components/TaskModal.jsx';
import {
  KanbanIcon,
  FlameIcon,
  ActivityIcon,
  AlertIcon,
} from '../components/AnimatedIcons.jsx';

const COLUMNS = [
  { id: 'todo', title: 'TO-DO', tag: '01', icon: <KanbanIcon size={16} />, className: 'column--todo' },
  { id: 'urgent', title: 'URGENT', tag: '02', icon: <FlameIcon size={16} />, className: 'column--urgent' },
  { id: 'inprogress', title: 'IN PROGRESS', tag: '03', icon: <ActivityIcon size={16} />, className: 'column--inprogress' },
  { id: 'blocked', title: 'BLOCKED', tag: '04', icon: <AlertIcon size={16} />, className: 'column--blocked' },
];

export default function Blackboard({ taskManager, showToast }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [defaultColumn, setDefaultColumn] = useState('todo');

  const handleCreateTask = (columnId) => {
    setEditingTask(null);
    setDefaultColumn(columnId);
    setModalOpen(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setDefaultColumn(task.column_name);
    setModalOpen(true);
  };

  const handleSaveTask = async (taskData) => {
    try {
      if (editingTask) {
        await taskManager.updateTask(editingTask.id, taskData);
        showToast('Task updated successfully');
      } else {
        await taskManager.createTask(taskData);
        showToast('Task record initialized');
      }
      setModalOpen(false);
      setEditingTask(null);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await taskManager.deleteTask(taskId);
      showToast('Task purged from database');
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleDrop = async (taskId, targetColumn) => {
    try {
      await taskManager.moveTask(taskId, targetColumn);
    } catch (err) {
      showToast(`Failed to transition task column`);
    }
  };

  if (taskManager.loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 140px)',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--font-size-sm)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 32,
            height: 32,
            border: '2px solid var(--border-medium)',
            borderTopColor: 'var(--accent-primary)',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
            margin: '0 auto 16px',
          }} />
          <div>[SYSTEM_INITIALIZING // SYNCING_D1_RECORDS]</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="kanban" id="kanban-board">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={taskManager.getColumnTasks(col.id)}
            onToggleTask={taskManager.toggleTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onAddTask={() => handleCreateTask(col.id)}
            onDrop={handleDrop}
          />
        ))}
      </div>

      {modalOpen && (
        <TaskModal
          task={editingTask}
          defaultColumn={defaultColumn}
          onSave={handleSaveTask}
          onClose={() => {
            setModalOpen(false);
            setEditingTask(null);
          }}
          onDelete={editingTask ? () => {
            handleDeleteTask(editingTask.id);
            setModalOpen(false);
            setEditingTask(null);
          } : null}
        />
      )}
    </>
  );
}
