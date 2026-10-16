// ═══════════════════════════════════════════════════════════════
// Tasks CRUD Routes
// ═══════════════════════════════════════════════════════════════
import { Hono } from 'hono';

export const tasksRouter = new Hono();

// ── Helper: Generate unique ID ──
function generateId() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── Helper: Compute task status based on dates and column ──
function computeStatus(task) {
  const now = new Date();
  const due = task.due_date ? new Date(task.due_date) : null;
  
  if (task.is_checked) return 'completed';
  if (task.column_name === 'blocked') return 'blocked';
  if (!due) return 'on-track';
  
  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  if (diffHours < 0) return 'overdue';
  if (diffHours < 24) return 'due-today';
  if (diffHours < 48) return 'due-soon';
  return 'on-track';
}

// ── GET /api/tasks — List all tasks ──
tasksRouter.get('/', async (c) => {
  const db = c.env.DB;
  
  try {
    const { results } = await db.prepare(
      'SELECT * FROM tasks ORDER BY column_name, position ASC'
    ).all();
    
    const tasks = results.map(task => ({
      ...task,
      is_checked: !!task.is_checked,
      status: computeStatus(task),
    }));
    
    return c.json({ tasks });
  } catch (err) {
    return c.json({ error: 'Failed to fetch tasks', detail: err.message }, 500);
  }
});

// ── POST /api/tasks — Create a new task ──
tasksRouter.post('/', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  
  const { title, column_name = 'todo', due_date = null, period = 'none', blocker_reason = null } = body;
  
  if (!title || !title.trim()) {
    return c.json({ error: 'Title is required' }, 400);
  }
  
  const id = generateId();
  const now = new Date().toISOString();
  
  // Get next position in column
  const posResult = await db.prepare(
    'SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM tasks WHERE column_name = ?'
  ).bind(column_name).first();
  
  const position = posResult?.next_pos ?? 0;
  
  try {
    await db.prepare(
      `INSERT INTO tasks (id, title, column_name, due_date, period, blocker_reason, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, title.trim(), column_name, due_date, period, blocker_reason, position, now, now).run();
    
    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
    
    return c.json({ 
      task: { ...task, is_checked: !!task.is_checked, status: computeStatus(task) } 
    }, 201);
  } catch (err) {
    return c.json({ error: 'Failed to create task', detail: err.message }, 500);
  }
});

// ── PUT /api/tasks/:id — Update a task ──
tasksRouter.put('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();
  
  const existing = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Task not found' }, 404);
  
  const title = body.title ?? existing.title;
  const column_name = body.column_name ?? existing.column_name;
  const due_date = body.due_date !== undefined ? body.due_date : existing.due_date;
  const period = body.period ?? existing.period;
  const is_checked = body.is_checked !== undefined ? (body.is_checked ? 1 : 0) : existing.is_checked;
  const blocker_reason = body.blocker_reason !== undefined ? body.blocker_reason : existing.blocker_reason;
  const position = body.position !== undefined ? body.position : existing.position;
  const now = new Date().toISOString();
  
  try {
    await db.prepare(
      `UPDATE tasks SET title = ?, column_name = ?, due_date = ?, period = ?, 
       is_checked = ?, blocker_reason = ?, position = ?, updated_at = ?
       WHERE id = ?`
    ).bind(title, column_name, due_date, period, is_checked, blocker_reason, position, now, id).run();
    
    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
    
    return c.json({ 
      task: { ...task, is_checked: !!task.is_checked, status: computeStatus(task) } 
    });
  } catch (err) {
    return c.json({ error: 'Failed to update task', detail: err.message }, 500);
  }
});

// ── PUT /api/tasks/:id/move — Move task to a different column (drag & drop) ──
tasksRouter.put('/:id/move', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const { column_name, position } = await c.req.json();
  
  if (!column_name) return c.json({ error: 'column_name is required' }, 400);
  
  const existing = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Task not found' }, 404);
  
  const now = new Date().toISOString();
  
  try {
    // Shift positions in the target column
    if (position !== undefined) {
      await db.prepare(
        'UPDATE tasks SET position = position + 1 WHERE column_name = ? AND position >= ? AND id != ?'
      ).bind(column_name, position, id).run();
    }
    
    const finalPosition = position ?? 0;
    
    await db.prepare(
      'UPDATE tasks SET column_name = ?, position = ?, updated_at = ? WHERE id = ?'
    ).bind(column_name, finalPosition, now, id).run();
    
    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
    
    return c.json({ 
      task: { ...task, is_checked: !!task.is_checked, status: computeStatus(task) } 
    });
  } catch (err) {
    return c.json({ error: 'Failed to move task', detail: err.message }, 500);
  }
});

// ── PUT /api/tasks/reorder — Reorder tasks within a column ──
tasksRouter.put('/batch/reorder', async (c) => {
  const db = c.env.DB;
  const { tasks: taskUpdates } = await c.req.json();
  
  if (!Array.isArray(taskUpdates)) {
    return c.json({ error: 'tasks array is required' }, 400);
  }
  
  try {
    const now = new Date().toISOString();
    const batch = taskUpdates.map(({ id, column_name, position }) =>
      db.prepare('UPDATE tasks SET column_name = ?, position = ?, updated_at = ? WHERE id = ?')
        .bind(column_name, position, now, id)
    );
    
    await db.batch(batch);
    
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: 'Failed to reorder', detail: err.message }, 500);
  }
});

// ── DELETE /api/tasks/:id — Delete a task ──
tasksRouter.delete('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  
  const existing = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Task not found' }, 404);
  
  try {
    await db.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
    return c.json({ success: true, deleted: id });
  } catch (err) {
    return c.json({ error: 'Failed to delete task', detail: err.message }, 500);
  }
});
