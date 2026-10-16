// ═══════════════════════════════════════════════════════════════
// AI Assistant Routes — Cloudflare Workers AI via AI Gateway
// Dual-purpose: Kanban mutations + Conversational analytics
// ═══════════════════════════════════════════════════════════════
import { Hono } from 'hono';

export const aiRouter = new Hono();

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

  // 3. Normalized stripped query
  const cleaned = q
    .replace(/\b(delete|remove|drop|trash|purge|kill|discard|move|put|shift|transfer|create|add|please|could you|can you|the|task|called|named|from my board|my|to|into)\b/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  if (cleaned) {
    const cleanedExact = list.find(t => t.title.toLowerCase() === cleaned);
    if (cleanedExact) return cleanedExact;
  }

  // 4. Substring match
  for (const t of list) {
    const tLower = t.title.toLowerCase();
    if (tLower.includes(q) || q.includes(tLower)) return t;
    if (cleaned && (tLower.includes(cleaned) || cleaned.includes(tLower))) return t;
  }

  // 5. Bag-of-Words / Token Overlap
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

// ── System prompt for the AI assistant ──
const SYSTEM_PROMPT = `You are Lee, a smart personal productivity AI assistant for a task management Kanban board.
You help a busy CSE student manage academic, project, research, and personal development tasks.

You have TWO modes of operation:

MODE 1 — KANBAN MUTATION (when user wants to create, edit, delete, or move tasks):
You MUST respond with a JSON object wrapped in <tool_call> tags:
<tool_call>
{"action": "create|update|delete|move", "task": {"title": "...", "column_name": "todo|urgent|inprogress|blocked", "due_date": "YYYY-MM-DD", "period": "none|daily|weekly|monthly", "blocker_reason": "...", "id": "..."}}
</tool_call>

- For "create": title and column_name are required. due_date optional.
- For "update": id is required, plus any fields to change.  
- For "delete": id or title is required.
- For "move": id or title and column_name are required.
- When user says "urgent" or "high priority", set column_name to "urgent".
- Default column is "todo".

EXAMPLES OF DELETE:
- User: "delete the ML assignment submit task" -> <tool_call>{"action": "delete", "task": {"title": "ML assignment submit"}}</tool_call>
- User: "remove the database project" -> <tool_call>{"action": "delete", "task": {"title": "database project"}}</tool_call>
DO NOT return a summary, greeting, or ask for clarification when asked to delete a task!

MODE 2 — CONVERSATION & ANALYTICS (when user asks questions, wants summaries, insights):
Respond in natural conversational text with markdown formatting.
Analyze the provided task data to give insights like:
- Task completion rates
- Overdue task alerts
- Productivity patterns
- Daily/weekly summaries
- Suggestions for prioritization
- Blocked task resolution ideas

RULES:
- Be concise, friendly, and actionable
- Use emojis sparingly for visual clarity
- Always consider due dates relative to the current date provided`;

// ── POST /api/ai/chat — Main AI endpoint ──
aiRouter.post('/chat', async (c) => {
  const { AI, DB } = c.env;
  const { message, context } = await c.req.json();

  if (!message || !message.trim()) {
    return c.json({ error: 'Message is required' }, 400);
  }

  try {
    // Fetch current board state for context
    const { results: tasks } = await DB.prepare(
      'SELECT id, title, column_name, due_date, period, is_checked, blocker_reason, updated_at FROM tasks ORDER BY column_name, position'
    ).all();

    const msgLower = message.toLowerCase();

    // ── 1. PRE-FLIGHT DETERMINISTIC INTENT DETECTION (Instant Direct Action) ──
    if (/\b(delete|remove|purge|drop|trash|kill|discard)\b/i.test(msgLower)) {
      const match = findTaskMatch(message, tasks);
      if (match) {
        await DB.prepare('DELETE FROM tasks WHERE id = ?').bind(match.id).run();
        return c.json({
          type: 'mutation',
          mutation: { action: 'delete', task: { id: match.id, title: match.title } },
          result: { success: true },
          message: `🗑️ Deleted task **"${match.title}"** (${match.column_name.toUpperCase()})`,
        });
      }
    }

    if (/\b(move|shift|transfer|put)\b/i.test(msgLower)) {
      let targetCol = null;
      if (msgLower.includes('urgent')) targetCol = 'urgent';
      else if (msgLower.includes('progress') || msgLower.includes('doing')) targetCol = 'inprogress';
      else if (msgLower.includes('block')) targetCol = 'blocked';
      else if (msgLower.includes('todo') || msgLower.includes('to-do')) targetCol = 'todo';

      if (targetCol) {
        const match = findTaskMatch(message, tasks);
        if (match) {
          const now = new Date().toISOString();
          await DB.prepare('UPDATE tasks SET column_name = ?, updated_at = ? WHERE id = ?').bind(targetCol, now, match.id).run();
          return c.json({
            type: 'mutation',
            mutation: { action: 'move', task: { id: match.id, column_name: targetCol } },
            result: { success: true },
            message: `✅ Moved **"${match.title}"** to **${targetCol.toUpperCase()}**`,
          });
        }
      }
    }

    const now = new Date();
    const boardContext = tasks.length > 0
      ? `\n\nCurrent Board State (${now.toISOString().split('T')[0]}):\n${tasks.map(t =>
        `- [${t.column_name.toUpperCase()}] "${t.title}" | Due: ${t.due_date || 'none'} | Period: ${t.period} | Checked: ${t.is_checked ? 'yes' : 'no'}${t.blocker_reason ? ` | Blocked: ${t.blocker_reason}` : ''} | ID: ${t.id}`
      ).join('\n')}`
      : '\n\nThe board is currently empty. No tasks yet.';

    const currentDate = `\nCurrent Date & Time: ${now.toISOString()}`;

    // Call Workers AI (with Cloudflare AI Gateway support if configured)
    // Call Cloudflare Workers AI
    const gatewayId = c.env.AI_GATEWAY_ID || c.env.CF_AI_GATEWAY;
    let aiResponse;
    const aiPayload = {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + currentDate + boardContext },
        { role: 'user', content: message }
      ],
      max_tokens: 1024,
      temperature: 0.7,
    };

    try {
      if (gatewayId) {
        aiResponse = await AI.run('@cf/meta/llama-3.1-8b-instruct', aiPayload, { gateway: { id: gatewayId, skipCache: false } });
      } else {
        aiResponse = await AI.run('@cf/meta/llama-3.1-8b-instruct', aiPayload);
      }
    } catch (gwErr) {
      console.warn('AI run with gateway failed, attempting direct run:', gwErr.message);
      aiResponse = await AI.run('@cf/meta/llama-3.1-8b-instruct', aiPayload);
    }

    const responseText = aiResponse.response || '';

    // Check if the response contains a tool call or json block (kanban mutation)
    const toolCallMatch = responseText.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/) ||
                          responseText.match(/```json\s*\n?([\s\S]*?)\n?```/);

    if (toolCallMatch) {
      try {
        const mutation = JSON.parse(toolCallMatch[1]);

        // Execute the mutation
        const result = await executeMutation(DB, mutation);

        // Clean response text (remove tool call tags)
        const cleanText = responseText.replace(/<tool_call>[\s\S]*?<\/tool_call>/, '').trim();

        return c.json({
          type: 'mutation',
          mutation: mutation,
          result: result,
          message: cleanText || `Done! ${getMutationDescription(mutation)}`,
        });
      } catch (parseErr) {
        // If JSON parse fails, treat as conversation
        return c.json({
          type: 'conversation',
          message: responseText.replace(/<\/?tool_call>/g, '').trim(),
        });
      }
    }

    // Pure conversation response
    return c.json({
      type: 'conversation',
      message: responseText,
    });

  } catch (err) {
    console.error('AI Error:', err);
    return c.json({
      error: 'AI processing failed',
      detail: err.message,
      type: 'error'
    }, 500);
  }
});

// ── Execute a kanban mutation from AI ──
async function executeMutation(db, mutation) {
  const { action, task } = mutation;
  const now = new Date().toISOString();

  switch (action) {
    case 'create': {
      const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const posResult = await db.prepare(
        'SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM tasks WHERE column_name = ?'
      ).bind(task.column_name || 'todo').first();

      await db.prepare(
        `INSERT INTO tasks (id, title, column_name, due_date, period, blocker_reason, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id, task.title, task.column_name || 'todo', task.due_date || null,
        task.period || 'none', task.blocker_reason || null, posResult?.next_pos ?? 0, now, now
      ).run();

      return { success: true, id, action: 'created' };
    }

    case 'update': {
      if (!task.id) return { success: false, error: 'Task ID required for update' };

      const existing = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(task.id).first();
      if (!existing) return { success: false, error: 'Task not found' };

      await db.prepare(
        `UPDATE tasks SET title = ?, column_name = ?, due_date = ?, period = ?,
         blocker_reason = ?, updated_at = ? WHERE id = ?`
      ).bind(
        task.title || existing.title,
        task.column_name || existing.column_name,
        task.due_date !== undefined ? task.due_date : existing.due_date,
        task.period || existing.period,
        task.blocker_reason !== undefined ? task.blocker_reason : existing.blocker_reason,
        now, task.id
      ).run();

      return { success: true, id: task.id, action: 'updated' };
    }

    case 'delete': {
      let targetId = task.id;
      let targetTitle = task.title || task.title_match;
      if (!targetId && targetTitle) {
        const found = await db.prepare('SELECT id, title FROM tasks WHERE LOWER(title) LIKE ?').bind(`%${targetTitle.toLowerCase()}%`).first();
        if (found) {
          targetId = found.id;
          targetTitle = found.title;
        }
      }
      if (!targetId) return { success: false, error: 'Task not found to delete' };
      await db.prepare('DELETE FROM tasks WHERE id = ?').bind(targetId).run();
      return { success: true, id: targetId, title: targetTitle, action: 'deleted' };
    }

    case 'move': {
      let targetId = task.id;
      let targetTitle = task.title || task.title_match;
      if (!targetId && targetTitle) {
        const found = await db.prepare('SELECT id, title FROM tasks WHERE LOWER(title) LIKE ?').bind(`%${targetTitle.toLowerCase()}%`).first();
        if (found) {
          targetId = found.id;
          targetTitle = found.title;
        }
      }
      if (!targetId || !task.column_name) return { success: false, error: 'Task ID/title and column required' };
      await db.prepare(
        'UPDATE tasks SET column_name = ?, updated_at = ? WHERE id = ?'
      ).bind(task.column_name, now, targetId).run();
      return { success: true, id: targetId, title: targetTitle, action: 'moved', to: task.column_name };
    }

    default:
      return { success: false, error: `Unknown action: ${action}` };
  }
}

// ── Human-readable mutation description ──
function getMutationDescription(mutation) {
  const { action, task } = mutation;
  switch (action) {
    case 'create': return `Created task "${task.title}" in ${task.column_name || 'todo'}`;
    case 'update': return `Updated task "${task.title || task.id}"`;
    case 'delete': return `Deleted task ${task.id}`;
    case 'move': return `Moved task to ${task.column_name}`;
    default: return `Performed ${action}`;
  }
}
