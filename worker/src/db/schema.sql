-- Lee To-Do: Cloudflare D1 Schema
-- Run: npx wrangler d1 execute lee-todo-db --local --file=src/db/schema.sql

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  column_name TEXT NOT NULL DEFAULT 'todo' CHECK(column_name IN ('todo', 'urgent', 'inprogress', 'blocked')),
  due_date TEXT,
  period TEXT DEFAULT 'none' CHECK(period IN ('none', 'daily', 'weekly', 'monthly')),
  is_checked INTEGER DEFAULT 0,
  blocker_reason TEXT,
  position INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  key_p256dh TEXT NOT NULL,
  key_auth TEXT NOT NULL,
  device_name TEXT DEFAULT 'Unknown Device',
  created_at TEXT DEFAULT (datetime('now'))
);

-- User settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES 
  ('notifications_enabled', 'true'),
  ('quiet_hours_start', '22:00'),
  ('quiet_hours_end', '07:00'),
  ('remind_overdue_hours', '2'),
  ('remind_due_today', 'true'),
  ('remind_due_tomorrow', 'true'),
  ('weekly_digest', 'true'),
  ('weekly_digest_day', 'sunday'),
  ('theme', 'dark'),
  ('timezone', 'Asia/Kolkata');

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_name);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(column_name, position);
