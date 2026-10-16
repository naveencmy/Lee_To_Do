// ═══════════════════════════════════════════════════════════════
// Lee To-Do API — Cloudflare Worker (Hono Framework)
// ═══════════════════════════════════════════════════════════════
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { tasksRouter } from './routes/tasks.js';
import { aiRouter } from './routes/ai.js';
import { pushRouter } from './routes/push.js';
import { settingsRouter } from './routes/settings.js';
import { handleCronNotifications } from './cron/notifier.js';

const app = new Hono();

// ── CORS for cross-origin requests from Cloudflare Pages ──
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// ── Health check ──
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'lee-todo-api' });
});

// ── Route modules ──
app.route('/api/tasks', tasksRouter);
app.route('/api/ai', aiRouter);
app.route('/api/push', pushRouter);
app.route('/api/settings', settingsRouter);

// ── 404 fallback ──
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// ── Error handler ──
app.onError((err, c) => {
  console.error('Worker Error:', err.message, err.stack);
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

// ── Export with scheduled handler for cron ──
export default {
  fetch: app.fetch,
  
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleCronNotifications(env));
  }
};
