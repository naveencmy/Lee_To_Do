// ═══════════════════════════════════════════════════════════════
// useTasks Hook — Task state management with CRUD operations
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import { tasksApi } from '../utils/api.js';

const COLUMNS = ['todo', 'urgent', 'inprogress', 'blocked'];

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch all tasks ──
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tasksApi.list();
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ── Get tasks grouped by column ──
  const getColumnTasks = useCallback((columnName) => {
    return tasks
      .filter((t) => t.column_name === columnName)
      .sort((a, b) => a.position - b.position);
  }, [tasks]);

  // ── Create a task ──
  const createTask = useCallback(async (taskData) => {
    try {
      const data = await tasksApi.create(taskData);
      setTasks((prev) => [...prev, data.task]);
      return data.task;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // ── Update a task ──
  const updateTask = useCallback(async (id, updates) => {
    try {
      const data = await tasksApi.update(id, updates);
      setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)));
      return data.task;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // ── Toggle task check ──
  const toggleTask = useCallback(async (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    return updateTask(id, { is_checked: !task.is_checked });
  }, [tasks, updateTask]);

  // ── Move task to column (drag & drop) ──
  const moveTask = useCallback(async (taskId, targetColumn, position = 0) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, column_name: targetColumn, position } : t))
    );

    try {
      const data = await tasksApi.move(taskId, targetColumn, position);
      // Refresh to get correct positions
      await fetchTasks();
      return data.task;
    } catch (err) {
      // Revert on failure
      await fetchTasks();
      setError(err.message);
      throw err;
    }
  }, [fetchTasks]);

  // ── Delete a task ──
  const deleteTask = useCallback(async (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await tasksApi.delete(id);
    } catch (err) {
      await fetchTasks();
      setError(err.message);
      throw err;
    }
  }, [fetchTasks]);

  // ── Stats ──
  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.is_checked).length,
    overdue: tasks.filter((t) => t.status === 'overdue').length,
    dueToday: tasks.filter((t) => t.status === 'due-today').length,
    blocked: tasks.filter((t) => t.column_name === 'blocked').length,
    urgent: tasks.filter((t) => t.column_name === 'urgent').length,
    byColumn: Object.fromEntries(
      COLUMNS.map((col) => [col, tasks.filter((t) => t.column_name === col).length])
    ),
  };

  return {
    tasks,
    loading,
    error,
    stats,
    fetchTasks,
    getColumnTasks,
    createTask,
    updateTask,
    toggleTask,
    moveTask,
    deleteTask,
    clearError: () => setError(null),
  };
}
