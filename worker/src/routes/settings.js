// ═══════════════════════════════════════════════════════════════
// Settings Routes — User preferences & configuration
// ═══════════════════════════════════════════════════════════════
import { Hono } from 'hono';

export const settingsRouter = new Hono();

// ── GET /api/settings — Get all settings ──
settingsRouter.get('/', async (c) => {
  const db = c.env.DB;
  
  try {
    const { results } = await db.prepare('SELECT key, value FROM settings').all();
    
    const settings = {};
    for (const row of results) {
      // Auto-parse booleans and numbers
      if (row.value === 'true') settings[row.key] = true;
      else if (row.value === 'false') settings[row.key] = false;
      else if (!isNaN(row.value) && row.value.trim() !== '') settings[row.key] = Number(row.value);
      else settings[row.key] = row.value;
    }
    
    return c.json({ settings });
  } catch (err) {
    return c.json({ error: 'Failed to fetch settings', detail: err.message }, 500);
  }
});

// ── POST /api/settings — Save settings (batch) ──
settingsRouter.post('/', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  
  if (!body || typeof body !== 'object') {
    return c.json({ error: 'Settings object is required' }, 400);
  }
  
  try {
    const now = new Date().toISOString();
    const batch = Object.entries(body).map(([key, value]) =>
      db.prepare(
        `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`
      ).bind(key, String(value), now)
    );
    
    if (batch.length > 0) {
      await db.batch(batch);
    }
    
    return c.json({ success: true, updated: Object.keys(body) });
  } catch (err) {
    return c.json({ error: 'Failed to save settings', detail: err.message }, 500);
  }
});

// ── PUT /api/settings/:key — Update a single setting ──
settingsRouter.put('/:key', async (c) => {
  const db = c.env.DB;
  const key = c.req.param('key');
  const { value } = await c.req.json();
  
  if (value === undefined) return c.json({ error: 'Value is required' }, 400);
  
  try {
    await db.prepare(
      `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`
    ).bind(key, String(value)).run();
    
    return c.json({ success: true, key, value });
  } catch (err) {
    return c.json({ error: 'Failed to update setting', detail: err.message }, 500);
  }
});
