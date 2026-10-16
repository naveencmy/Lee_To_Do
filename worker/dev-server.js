// ═══════════════════════════════════════════════════════════════
// Local Dev Server — Express + sql.js + web-push + CF AI Gateway
// Production-equivalent local server with real notifications & AI
// ═══════════════════════════════════════════════════════════════
import express from 'express';
import corsMiddleware from 'cors';
import initSqlJs from 'sql.js';
import webpush from 'web-push';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Load .dev.vars as environment variables ──
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvFile(join(__dirname, '.dev.vars'));

const app = express();
const PORT = 8787;

// ── Middleware ──
app.use(corsMiddleware());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════
// DATABASE — sql.js (pure JS SQLite)
// ═══════════════════════════════════════════════════════════════
let db;
const dbPath = join(__dirname, 'local.db');

async function initDB() {
  const SQL = await initSqlJs();
  if (existsSync(dbPath)) {
    db = new SQL.Database(readFileSync(dbPath));
  } else {
    db = new SQL.Database();
  }
  const schemaSQL = readFileSync(join(__dirname, 'src', 'db', 'schema.sql'), 'utf-8');
  for (const stmt of schemaSQL.split(';').filter(s => s.trim())) {
    try { db.run(stmt + ';'); } catch (e) {
      if (!e.message.includes('already exists')) console.warn('Schema:', e.message);
    }
  }
  saveDB();
  console.log('✅ Database ready');
}

function saveDB() {
  writeFileSync(dbPath, Buffer.from(db.export()));
}

function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function dbGet(sql, params = []) {
  return dbAll(sql, params)[0] || null;
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  saveDB();
}

// ═══════════════════════════════════════════════════════════════
// WEB PUSH — Real VAPID-based notifications
// ═══════════════════════════════════════════════════════════════
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:lee-todo@localhost.dev';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  console.log('✅ Web Push configured (VAPID keys loaded)');
} else {
  console.warn('⚠️  VAPID keys not found in .dev.vars — push will not work');
}

async function sendPushToAll(payload) {
  const subs = dbAll('SELECT * FROM push_subscriptions');
  let sent = 0, failed = 0;
  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.key_p256dh, auth: sub.key_auth },
    };
    try {
      await webpush.sendNotification(pushSub, JSON.stringify(payload));
      sent++;
    } catch (err) {
      failed++;
      console.error(`Push failed for ${sub.device_name}:`, err.statusCode || err.message);
      if (err.statusCode === 404 || err.statusCode === 410) {
        dbRun('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
        console.log(`  → Removed expired subscription: ${sub.device_name}`);
      }
    }
  }
  return { sent, failed };
}

// ═══════════════════════════════════════════════════════════════
// CLOUDFLARE WORKERS AI & AI GATEWAY — REST API integration
// ═══════════════════════════════════════════════════════════════
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;
const CF_AI_GATEWAY = process.env.CF_AI_GATEWAY || process.env.CF_AI_GATEWAY_ID || null;
const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';

let lastAiError = null;
let lastAiSuccessMethod = null;

function parseAiOutput(data) {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (typeof data.result?.response === 'string') return data.result.response;
  if (typeof data.result?.choices?.[0]?.message?.content === 'string') return data.result.choices[0].message.content;
  if (typeof data.response === 'string') return data.response;
  if (typeof data.choices?.[0]?.message?.content === 'string') return data.choices[0].message.content;
  if (typeof data.result === 'string') return data.result;
  return null;
}

async function callWorkersAI(messages) {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN ||
    CF_ACCOUNT_ID === 'your_cloudflare_account_id_here' ||
    CF_API_TOKEN === 'your_cloudflare_api_token_here') {
    lastAiError = 'Cloudflare credentials (CF_ACCOUNT_ID / CF_API_TOKEN) are missing or set to placeholder.';
    return null;
  }

  // 1. Direct Cloudflare Workers AI endpoint: https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${AI_MODEL}`;
  try {
    console.log(`🤖 Calling Cloudflare Workers AI endpoint: ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (response.ok) {
      const data = await response.json();
      const text = parseAiOutput(data);
      if (text) {
        lastAiSuccessMethod = 'Direct Cloudflare Workers AI (@cf/meta/llama-3.1-8b-instruct)';
        lastAiError = null;
        console.log(`Direct Cloudflare Workers AI success!`);
        return text;
      }
    } else {
      const errText = await response.text();
      console.warn('Cloudflare Workers AI error:', response.status, errText);
      lastAiError = `Workers AI HTTP ${response.status}: ${errText.slice(0, 150)}`;
    }
  } catch (err) {
    console.warn('Cloudflare Workers AI fetch error:', err.message);
    lastAiError = `Workers AI network error: ${err.message}`;
  }

  // 2. Secondary fallback to Cloudflare AI Gateway if configured
  if (CF_AI_GATEWAY) {
    const gwUrl = `https://gateway.ai.cloudflare.com/v1/${CF_ACCOUNT_ID}/${CF_AI_GATEWAY}/workers-ai/${AI_MODEL}`;
    try {
      console.log(`🤖 Attempting Cloudflare AI Gateway: ${gwUrl}...`);
      const response = await fetch(gwUrl, {
        method: 'POST',
        headers: {
          'cf-aig-authorization': `Bearer ${CF_API_TOKEN}`,
          'Authorization': `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = parseAiOutput(data);
        if (text) {
          lastAiSuccessMethod = `AI Gateway (${CF_AI_GATEWAY})`;
          lastAiError = null;
          console.log(` Cloudflare AI Gateway success: ${lastAiSuccessMethod}`);
          return text;
        }
      }
    } catch (err) {
      console.warn(' Cloudflare AI Gateway error:', err.message);
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// TASK HELPERS
// ═══════════════════════════════════════════════════════════════
function computeStatus(task) {
  const now = new Date();
  const due = task.due_date ? new Date(task.due_date) : null;
  if (task.is_checked) return 'completed';
  if (task.column_name === 'blocked') return 'blocked';
  if (!due) return 'on-track';
  const diffHours = (due.getTime() - now.getTime()) / 3600000;
  if (diffHours < 0) return 'overdue';
  if (diffHours < 24) return 'due-today';
  if (diffHours < 48) return 'due-soon';
  return 'on-track';
}

function enrichTask(t) {
  return { ...t, is_checked: !!t.is_checked, status: computeStatus(t) };
}

function genId() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════
// TASK ROUTES
// ═══════════════════════════════════════════════════════════════
app.get('/api/tasks', (req, res) => {
  res.json({ tasks: dbAll('SELECT * FROM tasks ORDER BY column_name, position ASC').map(enrichTask) });
});

app.post('/api/tasks', (req, res) => {
  const { title, column_name = 'todo', due_date = null, period = 'none', blocker_reason = null } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  const id = genId(), now = new Date().toISOString();
  const pos = dbGet('SELECT COALESCE(MAX(position),-1)+1 as p FROM tasks WHERE column_name=?', [column_name])?.p ?? 0;
  dbRun('INSERT INTO tasks (id,title,column_name,due_date,period,blocker_reason,position,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [id, title.trim(), column_name, due_date, period, blocker_reason, pos, now, now]);
  res.status(201).json({ task: enrichTask(dbGet('SELECT * FROM tasks WHERE id=?', [id])) });
});

app.put('/api/tasks/:id', (req, res) => {
  const e = dbGet('SELECT * FROM tasks WHERE id=?', [req.params.id]);
  if (!e) return res.status(404).json({ error: 'Not found' });
  const now = new Date().toISOString();
  dbRun('UPDATE tasks SET title=?,column_name=?,due_date=?,period=?,is_checked=?,blocker_reason=?,position=?,updated_at=? WHERE id=?', [
    req.body.title ?? e.title, req.body.column_name ?? e.column_name,
    req.body.due_date !== undefined ? req.body.due_date : e.due_date,
    req.body.period ?? e.period,
    req.body.is_checked !== undefined ? (req.body.is_checked ? 1 : 0) : e.is_checked,
    req.body.blocker_reason !== undefined ? req.body.blocker_reason : e.blocker_reason,
    req.body.position !== undefined ? req.body.position : e.position, now, req.params.id]);
  res.json({ task: enrichTask(dbGet('SELECT * FROM tasks WHERE id=?', [req.params.id])) });
});

app.put('/api/tasks/:id/move', (req, res) => {
  const { column_name, position = 0 } = req.body;
  if (!column_name) return res.status(400).json({ error: 'column_name required' });
  const e = dbGet('SELECT * FROM tasks WHERE id=?', [req.params.id]);
  if (!e) return res.status(404).json({ error: 'Not found' });
  const now = new Date().toISOString();
  dbRun('UPDATE tasks SET position=position+1 WHERE column_name=? AND position>=? AND id!=?', [column_name, position, req.params.id]);
  dbRun('UPDATE tasks SET column_name=?,position=?,updated_at=? WHERE id=?', [column_name, position, now, req.params.id]);
  res.json({ task: enrichTask(dbGet('SELECT * FROM tasks WHERE id=?', [req.params.id])) });
});

app.put('/api/tasks/batch/reorder', (req, res) => {
  const { tasks: updates } = req.body;
  if (!Array.isArray(updates)) return res.status(400).json({ error: 'tasks array required' });
  const now = new Date().toISOString();
  for (const { id, column_name, position } of updates) {
    dbRun('UPDATE tasks SET column_name=?,position=?,updated_at=? WHERE id=?', [column_name, position, now, id]);
  }
  res.json({ success: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  if (!dbGet('SELECT 1 FROM tasks WHERE id=?', [req.params.id])) return res.status(404).json({ error: 'Not found' });
  dbRun('DELETE FROM tasks WHERE id=?', [req.params.id]);
  res.json({ success: true, deleted: req.params.id });
});

// ═══════════════════════════════════════════════════════════════
// AI ROUTES — Cloudflare Workers AI + Local NLP fallback
// ═══════════════════════════════════════════════════════════════
// ── Robust Task Fuzzy Finder (Bag-of-Words & Acronym-Aware) ──
function findTaskMatch(query, list) {
  if (!query || typeof query !== 'string' || !query.trim() || !list?.length) return null;
  const q = query.trim().toLowerCase();

  // 1. Direct ID match
  const byId = list.find(t => t.id === query.trim());
  if (byId) return byId;

  // 2. Exact title match
  const exact = list.find(t => t.title.toLowerCase() === q);
  if (exact) return exact;

  // 3. Normalized stripped query (remove command verbs & conversational filler)
  const cleaned = q
    .replace(/\b(delete|remove|drop|trash|purge|kill|discard|move|put|shift|transfer|create|add|please|could you|can you|the|task|called|named|from my board|my|to|into)\b/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  if (cleaned) {
    const cleanedExact = list.find(t => t.title.toLowerCase() === cleaned);
    if (cleanedExact) return cleanedExact;
  }

  // 4. Substring match (either full query or cleaned candidate)
  for (const t of list) {
    const tLower = t.title.toLowerCase();
    if (tLower.includes(q) || q.includes(tLower)) return t;
    if (cleaned && (tLower.includes(cleaned) || cleaned.includes(tLower))) return t;
  }

  // 5. Bag-of-Words / Token Overlap (allows 2-letter acronyms 'ml', 'os', 'db', 'ai', 'ci', 'cd', ignores word order)
  const stopWords = new Set(['the', 'task', 'a', 'an', 'to', 'for', 'in', 'on', 'delete', 'remove', 'please', 'that', 'this', 'my', 'me', 'board', 'from']);
  const extractTokens = (str) =>
    str.toLowerCase().split(/[\s,.'"-]+/).filter(w => w.length >= 2 && !stopWords.has(w));

  const queryTokens = extractTokens(cleaned || q);

  if (queryTokens.length > 0) {
    let bestMatch = null;
    let maxScore = 0;

    for (const t of list) {
      const taskTokens = extractTokens(t.title);
      let hits = 0;
      for (const qt of queryTokens) {
        if (taskTokens.includes(qt) || taskTokens.some(tt => tt.includes(qt) || qt.includes(tt))) {
          hits++;
        }
      }
      const score = hits / Math.max(queryTokens.length, 1);
      if (score > maxScore && hits >= 1) {
        maxScore = score;
        bestMatch = t;
      }
    }

    if (maxScore >= 0.5) {
      return bestMatch;
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// AI ROUTES — Cloudflare Workers AI + Bulletproof Mutations
// ═══════════════════════════════════════════════════════════════
app.post('/api/ai/chat', async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

  const tasks = dbAll('SELECT * FROM tasks WHERE is_checked=0 ORDER BY column_name, position');
  const allTasks = dbAll('SELECT * FROM tasks');
  const today = new Date().toISOString().split('T')[0];
  const msgLower = message.toLowerCase();

  // ── 1. PRE-FLIGHT DETERMINISTIC INTENT DETECTION (Instant Direct Action) ──
  // If user explicitly asks to DELETE/REMOVE a task:
  if (/\b(delete|remove|purge|drop|trash|kill|discard)\b/i.test(msgLower)) {
    const match = findTaskMatch(message, allTasks);
    if (match) {
      dbRun('DELETE FROM tasks WHERE id=?', [match.id]);
      return res.json({
        type: 'mutation',
        mutation: { action: 'delete', task: { id: match.id, title: match.title } },
        result: { success: true },
        message: `🗑️ Deleted task **"${match.title}"** (${match.column_name.toUpperCase()})`,
      });
    }
  }

  // If user explicitly asks to MOVE a task:
  if (/\b(move|shift|transfer|put)\b/i.test(msgLower)) {
    let targetCol = null;
    if (msgLower.includes('urgent')) targetCol = 'urgent';
    else if (msgLower.includes('progress') || msgLower.includes('doing')) targetCol = 'inprogress';
    else if (msgLower.includes('block')) targetCol = 'blocked';
    else if (msgLower.includes('todo') || msgLower.includes('to-do')) targetCol = 'todo';

    if (targetCol) {
      const match = findTaskMatch(message, allTasks);
      if (match) {
        const now = new Date().toISOString();
        dbRun('UPDATE tasks SET column_name=?,updated_at=? WHERE id=?', [targetCol, now, match.id]);
        return res.json({
          type: 'mutation',
          mutation: { action: 'move', task: { id: match.id, column_name: targetCol } },
          result: { success: true },
          message: `✅ Moved **"${match.title}"** to **${targetCol.toUpperCase()}**`,
        });
      }
    }
  }

  // ── Build clean board context for AI ──
  const boardContext = tasks.map(t =>
    `- [${t.column_name.toUpperCase()}] "${t.title}" | Due: ${t.due_date || 'No due date'} | Recurrence: ${t.period}${t.blocker_reason ? ' | Blocker: ' + t.blocker_reason : ''}`
  ).join('\n');

  const completedCount = allTasks.filter(t => t.is_checked).length;
  const overdue = tasks.filter(t => t.due_date && t.due_date < today);
  const urgentCount = tasks.filter(t => t.column_name === 'urgent').length;
  const inProgressCount = tasks.filter(t => t.column_name === 'inprogress').length;
  const blockedCount = tasks.filter(t => t.column_name === 'blocked').length;

  // ── Gemini-grade System Prompt ──
  const systemPrompt = `You are Lee, an advanced AI productivity co-pilot for a Kanban task management board.

CURRENT BOARD DATA:
${boardContext || '(Board is empty)'}

METRICS:
- Total Active: ${tasks.length}
- Urgent: ${urgentCount}
- In Progress: ${inProgressCount}
- Blocked: ${blockedCount}
- Completed: ${completedCount}
- Overdue: ${overdue.length}

TODAY'S DATE: ${today} (IST Asia/Kolkata)

CRITICAL INTENT RULES:
1. If the user asks to DELETE or REMOVE a task (e.g. "delete X", "delete the X task", "remove X"):
   You MUST return ONLY a JSON block:
   \`\`\`json
   {"action":"delete","title_match":"exact title or keywords"}
   \`\`\`
   EXAMPLES:
   - "delete the ML assignment submit task" -> {"action":"delete","title_match":"ML assignment submit"}
   - "remove the database project" -> {"action":"delete","title_match":"database project"}
   - "delete task 123" -> {"action":"delete","title_match":"123"}
   DO NOT return a summary, greeting, or ask for clarification when asked to delete a task!

2. If the user asks to MOVE a task:
   \`\`\`json
   {"action":"move","title_match":"...","column_name":"todo|urgent|inprogress|blocked"}
   \`\`\`

3. If the user asks to CREATE or ADD a task:
   \`\`\`json
   {"action":"create","title":"...","column_name":"todo|urgent|inprogress|blocked","due_date":"YYYY-MM-DD or null","period":"none|daily|weekly|monthly"}
   \`\`\`

4. ONLY if the user is asking a QUESTION or asking for a SUMMARY:
   Format the response like Google Gemini:
   - Lead with an overview metric bar: **Active: ${tasks.length}** • **Urgent: ${urgentCount}** • **In Progress: ${inProgressCount}** • **Overdue: ${overdue.length}**
   - Group tasks under headers: ### 🔥 Urgent, ### ⚡ In Progress, ### 📝 To-Do, ### 🔴 Blocked
   - Clean task items: - **Task Title** \`Due: YYYY-MM-DD\` (include recurrence like \`Daily\` if recurring).
   - End with: > 💡 **Next Action Recommendation:** [1 concise advice].`;

  const aiResponse = await callWorkersAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message },
  ]);

  if (aiResponse) {
    const responseStr = String(aiResponse);
    // ── Parse AI response for JSON action blocks or tool_calls ──
    const jsonMatch = responseStr.match(/```json\s*\n?([\s\S]*?)\n?```/) ||
      responseStr.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/);

    if (jsonMatch) {
      try {
        const rawAction = JSON.parse(jsonMatch[1]);
        const action = rawAction.action ? rawAction : (rawAction.task || rawAction);

        if (action.action === 'create') {
          const id = genId(), now = new Date().toISOString();
          const col = action.column_name || 'todo';
          const pos = dbGet('SELECT COALESCE(MAX(position),-1)+1 as p FROM tasks WHERE column_name=?', [col])?.p ?? 0;
          dbRun('INSERT INTO tasks (id,title,column_name,due_date,period,blocker_reason,position,created_at,updated_at) VALUES (?,?,?,?,?,NULL,?,?,?)',
            [id, action.title, col, action.due_date || null, action.period || 'none', pos, now, now]);

          const cleanMsg = responseStr.replace(/```json[\s\S]*?```/g, '').replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();
          return res.json({
            type: 'mutation',
            mutation: { action: 'create', task: action },
            result: { success: true, id },
            message: cleanMsg || ` Created task **"${action.title}"** in **${col.toUpperCase()}**${action.due_date ? ` (due ${action.due_date})` : ''}`,
          });
        }

        if (action.action === 'move') {
          const target = action.title_match || action.title || action.task_title || action.id;
          const match = findTaskMatch(target, allTasks) || findTaskMatch(message, allTasks);
          if (match) {
            const now = new Date().toISOString();
            const targetCol = action.column_name || 'todo';
            dbRun('UPDATE tasks SET column_name=?,updated_at=? WHERE id=?', [targetCol, now, match.id]);
            const cleanMsg = responseStr.replace(/```json[\s\S]*?```/g, '').replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();
            return res.json({
              type: 'mutation',
              mutation: { action: 'move', task: { id: match.id, column_name: targetCol } },
              result: { success: true },
              message: cleanMsg || ` Moved **"${match.title}"** to **${targetCol.toUpperCase()}**`,
            });
          }
        }

        if (action.action === 'delete' || action.action === 'remove') {
          const target = action.title_match || action.title || action.task_title || action.id ||
            (typeof action.task === 'string' ? action.task : action.task?.title || action.task?.id);
          const match = findTaskMatch(target, allTasks) || findTaskMatch(message, allTasks);
          if (match) {
            dbRun('DELETE FROM tasks WHERE id=?', [match.id]);
            const cleanMsg = responseStr.replace(/```json[\s\S]*?```/g, '').replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();
            return res.json({
              type: 'mutation',
              mutation: { action: 'delete', task: { id: match.id, title: match.title } },
              result: { success: true },
              message: cleanMsg || ` Deleted task **"${match.title}"**`,
            });
          }
        }
      } catch (e) {
        console.warn('JSON action parse error:', e.message);
      }
    }

    // ── FALLBACK INTENT GUARD: If user clearly wanted to DELETE but LLM didn't wrap in JSON ──
    if (msgLower.match(/\b(delete|remove|purge|drop|trash|kill|discard)\b/i)) {
      const match = findTaskMatch(message, allTasks);
      if (match) {
        dbRun('DELETE FROM tasks WHERE id=?', [match.id]);
        return res.json({
          type: 'mutation',
          mutation: { action: 'delete', task: { id: match.id, title: match.title } },
          result: { success: true },
          message: `Deleted task **"${match.title}"**`,
        });
      }
    }

    // ── FALLBACK INTENT GUARD: If user clearly wanted to MOVE but LLM didn't wrap in JSON ──
    if (msgLower.match(/\b(move|shift|transfer|put)\b/i)) {
      let targetCol = null;
      if (msgLower.includes('urgent')) targetCol = 'urgent';
      else if (msgLower.includes('progress')) targetCol = 'inprogress';
      else if (msgLower.includes('block')) targetCol = 'blocked';
      else if (msgLower.includes('todo') || msgLower.includes('to-do')) targetCol = 'todo';

      if (targetCol) {
        const match = findTaskMatch(message, allTasks);
        if (match) {
          const now = new Date().toISOString();
          dbRun('UPDATE tasks SET column_name=?,updated_at=? WHERE id=?', [targetCol, now, match.id]);
          return res.json({
            type: 'mutation',
            mutation: { action: 'move', task: { id: match.id, column_name: targetCol } },
            result: { success: true },
            message: `Moved **"${match.title}"** to **${targetCol.toUpperCase()}**`,
          });
        }
      }
    }

    // Pure conversational AI response from Cloudflare
    return res.json({ type: 'conversation', message: aiResponse });
  }

  // ═════════════════════════════════════════════════════
  // STRICTLY CLOUDFLARE ONLY — No local LLM or NLP fallback
  // ════════════════════════════════════════════════════
  console.error(' Cloudflare AI failure:', lastAiError);
  return res.status(502).json({
    type: 'error',
    error: 'Cloudflare Workers AI Unavailable',
    message: `**Cloudflare AI Error**: ${lastAiError || 'Could not communicate with Cloudflare Workers AI. Ensure your Cloudflare API Token has Workers AI permissions.'}`,
  });
});

// ═══════════════════════════════════════════════════════════════
// PUSH NOTIFICATION ROUTES — Real web-push delivery
// ═══════════════════════════════════════════════════════════════
app.get('/api/push/vapid-key', (req, res) => {
  if (!VAPID_PUBLIC) return res.status(500).json({ error: 'VAPID keys not configured' });
  res.json({ publicKey: VAPID_PUBLIC });
});

app.post('/api/push/subscribe', (req, res) => {
  const { subscription, deviceName } = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
  const keys = subscription.keys || {};
  const id = `sub_${Date.now()}`;
  // Remove existing subscription for same endpoint
  dbRun('DELETE FROM push_subscriptions WHERE endpoint = ?', [subscription.endpoint]);
  dbRun('INSERT INTO push_subscriptions (id, endpoint, key_p256dh, key_auth, device_name, created_at) VALUES (?,?,?,?,?,datetime("now"))',
    [id, subscription.endpoint, keys.p256dh || '', keys.auth || '', deviceName || 'Unknown']);
  console.log(` Device registered: ${deviceName} (${id})`);
  res.json({ success: true, id });
});

app.delete('/api/push/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'Endpoint required' });
  dbRun('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
  res.json({ success: true });
});

app.get('/api/push/subscriptions', (req, res) => {
  res.json({ subscriptions: dbAll('SELECT id, device_name, created_at FROM push_subscriptions') });
});

app.post('/api/push/test', async (req, res) => {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(500).json({ error: 'VAPID keys not configured in .dev.vars' });
  }
  const result = await sendPushToAll({
    title: ' Lee To-Do',
    body: 'Test notification — push is working! ',
    icon: '/icons/favicon.svg',
    badge: '/icons/favicon.svg',
    tag: 'test-notification',
    data: { url: '/' },
  });
  console.log(` Test push: ${result.sent} sent, ${result.failed} failed`);
  res.json({ success: true, ...result });
});

// ═══════════════════════════════════════════════════════════════
// SETTINGS ROUTES
// ═══════════════════════════════════════════════════════════════
app.get('/api/settings', (req, res) => {
  const settings = {};
  for (const r of dbAll('SELECT key, value FROM settings')) {
    if (r.value === 'true') settings[r.key] = true;
    else if (r.value === 'false') settings[r.key] = false;
    else if (!isNaN(r.value) && r.value.trim() !== '') settings[r.key] = Number(r.value);
    else settings[r.key] = r.value;
  }
  res.json({ settings });
});

app.post('/api/settings', (req, res) => {
  const now = new Date().toISOString();
  for (const [k, v] of Object.entries(req.body || {})) {
    dbRun('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?,?,?)', [k, String(v), now]);
  }
  res.json({ success: true });
});

app.put('/api/settings/:key', (req, res) => {
  const { value } = req.body;
  if (value === undefined) return res.status(400).json({ error: 'Value required' });
  dbRun('INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES (?,?,datetime("now"))', [req.params.key, String(value)]);
  res.json({ success: true, key: req.params.key, value });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    push: !!(VAPID_PUBLIC && VAPID_PRIVATE),
    ai: !!(CF_ACCOUNT_ID && CF_API_TOKEN && CF_ACCOUNT_ID !== 'your_cloudflare_account_id_here'),
    ai_gateway: CF_AI_GATEWAY,
    ai_status: {
      gateway: CF_AI_GATEWAY,
      lastSuccess: lastAiSuccessMethod,
      lastError: lastAiError,
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════
initDB().then(() => {
  app.listen(PORT, () => {
    const aiConfigured = CF_ACCOUNT_ID && CF_API_TOKEN && CF_ACCOUNT_ID !== 'your_cloudflare_account_id_here';
    const pushOk = !!(VAPID_PUBLIC && VAPID_PRIVATE);
    console.log(`\n═══════════════════════════════════════════════`);
    console.log(`   Lee To-Do API  -  http://localhost:${PORT}`);
    console.log(`   Tasks:         -    /api/tasks`);
    console.log(`   AI Engine:     -   ${aiConfigured ? (CF_AI_GATEWAY ? `Cloudflare AI Gateway [${CF_AI_GATEWAY}] + Workers AI` : 'Cloudflare Workers AI configured') : 'Local Smart NLP'}`);
    console.log(`   Push:          -   ${pushOk ? 'Web Push ready (VAPID active)' : 'No VAPID keys'}`);
    console.log(`═══════════════════════════════════════════════\n`);
  });
}).catch(err => { console.error('DB init failed:', err); process.exit(1); });
