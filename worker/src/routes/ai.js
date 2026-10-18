// ═══════════════════════════════════════════════════════════════
// AI Assistant Routes — Cloudflare Workers AI + Bulletproof Co-Pilot Engine
// Zero-Failure Architecture: Dual LLM + Deterministic Semantic NLP Fallback
// ═══════════════════════════════════════════════════════════════
import { Hono } from 'hono';

export const aiRouter = new Hono();

// ── Date NLP Parser ──
function parseDateNLP(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();
  const now = new Date();

  // 1. Explicit ISO format (YYYY-MM-DD)
  const isoMatch = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  // 2. Relative keywords
  if (/\b(today|tonight)\b/i.test(lower)) {
    return now.toISOString().split('T')[0];
  }

  if (/\b(tomorrow)\b/i.test(lower)) {
    const tm = new Date(now.getTime() + 86400000);
    return tm.toISOString().split('T')[0];
  }

  const inDaysMatch = lower.match(/\bin\s+(\d+)\s+days?\b/i);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10);
    const future = new Date(now.getTime() + days * 86400000);
    return future.toISOString().split('T')[0];
  }

  // 3. Days of the week
  const daysMap = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const dayRegex = /\b(?:by|on|due|next)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i;
  const dayMatch = lower.match(dayRegex);
  if (dayMatch) {
    const targetDay = daysMap[dayMatch[1].toLowerCase()];
    const currentDay = now.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7; // Target next upcoming day
    const targetDate = new Date(now.getTime() + diff * 86400000);
    return targetDate.toISOString().split('T')[0];
  }

  return null;
}

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

    if (maxScore >= 0.4) {
      return bestMatch;
    }
  }

  return null;
}

// ── Smart Deterministic Task Co-Pilot (Zero-Latency Instant Actions & Fallback) ──
function analyzeBoardLocally(tasks, intent, userMessage) {
  const today = new Date().toISOString().split('T')[0];
  const activeTasks = tasks.filter(t => !t.is_checked);
  const completedTasks = tasks.filter(t => t.is_checked);
  const overdue = activeTasks.filter(t => t.due_date && t.due_date < today);
  const urgent = activeTasks.filter(t => t.column_name === 'urgent');
  const inProgress = activeTasks.filter(t => t.column_name === 'inprogress');
  const blocked = activeTasks.filter(t => t.column_name === 'blocked');
  const todo = activeTasks.filter(t => t.column_name === 'todo');

  const statBar = `**Active: ${activeTasks.length}** • **Urgent: ${urgent.length}** • **In Progress: ${inProgress.length}** • **Overdue: ${overdue.length}** • **Completed: ${completedTasks.length}**`;

  if (intent === 'overdue') {
    if (overdue.length === 0) {
      return `${statBar}\n\n### All Caught Up!\nThere are currently **no overdue tasks** on your board. Great job staying on schedule!\n\n> 💡 **Next Action Recommendation:** Review your [IN PROGRESS] items to keep momentum.`;
    }
    const list = overdue.map(t => `- **${t.title}** \`Due: ${t.due_date}\` (${t.column_name.toUpperCase()})`).join('\n');
    return `${statBar}\n\n### Overdue Tasks (${overdue.length})\n${list}\n\n> 💡 **Next Action Recommendation:** Focus immediately on clearing overdue items or reschedule them if priorities shifted.`;
  }

  if (intent === 'priority' || intent === 'focus') {
    if (urgent.length > 0) {
      const top = urgent[0];
      const list = urgent.map(t => `- **${t.title}** \`Due: ${t.due_date || 'No due date'}\``).join('\n');
      return `${statBar}\n\n### Top Priority: ${top.title}\nHere are your urgent high-priority tasks:\n${list}\n\n> 💡 **Next Action Recommendation:** Start with **"${top.title}"** before moving to any other column.`;
    }
    if (inProgress.length > 0) {
      const top = inProgress[0];
      return `${statBar}\n\n### Active Focus: ${top.title}\nYou have no tasks marked urgent. Your active task in progress is:\n- **${top.title}** \`Due: ${top.due_date || 'No due date'}\`\n\n> 💡 **Next Action Recommendation:** Finish **"${top.title}"** to move it to Completed!`;
    }
    if (todo.length > 0) {
      return `${statBar}\n\n### Next Up: ${todo[0].title}\nNo tasks currently in progress. Pick your next task from To-Do:\n- **${todo[0].title}** \`Due: ${todo[0].due_date || 'No due date'}\`\n\n> 💡 **Next Action Recommendation:** Move this task to In Progress and begin work.`;
    }
    return `${statBar}\n\n### Board is Clear\nYou have no pending tasks! Enjoy your break or create new tasks using the **+ Add Task** button.`;
  }

  // Default: Full Board Summary
  let summary = `${statBar}\n\n`;

  if (urgent.length > 0) {
    summary += `### Urgent (${urgent.length})\n` + urgent.map(t => `- **${t.title}** \`Due: ${t.due_date || 'None'}\`${t.period !== 'none' ? ` (${t.period})` : ''}`).join('\n') + '\n\n';
  }
  if (inProgress.length > 0) {
    summary += `### In Progress (${inProgress.length})\n` + inProgress.map(t => `- **${t.title}** \`Due: ${t.due_date || 'None'}\``).join('\n') + '\n\n';
  }
  if (blocked.length > 0) {
    summary += `### Blocked (${blocked.length})\n` + blocked.map(t => `- **${t.title}** ${t.blocker_reason ? `*(Reason: ${t.blocker_reason})*` : ''}`).join('\n') + '\n\n';
  }
  if (todo.length > 0) {
    summary += `### To-Do (${todo.length})\n` + todo.slice(0, 5).map(t => `- **${t.title}** \`Due: ${t.due_date || 'None'}\``).join('\n') + (todo.length > 5 ? `\n- *...and ${todo.length - 5} more in To-Do*` : '') + '\n\n';
  }

  const advice = urgent.length > 0
    ? `Tackle your ${urgent.length} urgent task(s) first today.`
    : inProgress.length > 0
      ? `Complete your active work in In Progress.`
      : `Pick a top item from your To-Do column.`;

  summary += `> **Next Action Recommendation:** ${advice}`;
  return summary;
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

- For "create": title and column_name are required. due_date optional (YYYY-MM-DD format). period optional ('none','daily','weekly','monthly').
- For "update": id is required, plus any fields to change.  
- For "delete": id or title is required.
- For "move": id or title and column_name are required.
- When user says "urgent" or "high priority", set column_name to "urgent".
- Default column is "todo".

EXAMPLES:
- User: "add task submit ML assignment by Friday" -> <tool_call>{"action": "create", "task": {"title": "Submit ML assignment", "column_name": "todo", "due_date": "YYYY-MM-DD", "period": "none"}}</tool_call>
- User: "delete the ML assignment submit task" -> <tool_call>{"action": "delete", "task": {"title": "ML assignment submit"}}</tool_call>
- User: "move database project to urgent" -> <tool_call>{"action": "move", "task": {"title": "database project", "column_name": "urgent"}}</tool_call>

MODE 2 — CONVERSATION & ANALYTICS (when user asks questions, wants summaries, insights):
Format like Google Gemini:
- Lead with an overview metric bar: **Active: X** • **Urgent: Y** • **In Progress: Z** • **Overdue: W**
- Group tasks under headers: ### Urgent, ### In Progress, ### To-Do, ### Blocked
- Clean task items: - **Task Title** \`Due: YYYY-MM-DD\`
- End with: > **Next Action Recommendation:** [1 concise advice].`;

// ── POST /api/ai/chat — Main AI endpoint ──
aiRouter.post('/chat', async (c) => {
  const { AI, DB } = c.env;
  let body = {};
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ error: 'Invalid JSON request' }, 400);
  }

  const { message } = body;
  if (!message || !message.trim()) {
    return c.json({ error: 'Message is required' }, 400);
  }

  // Fetch current board state
  let tasks = [];
  try {
    const { results } = await DB.prepare(
      'SELECT id, title, column_name, due_date, period, is_checked, blocker_reason, updated_at FROM tasks ORDER BY column_name, position'
    ).all();
    tasks = results || [];
  } catch (dbErr) {
    console.error('Database query error in AI route:', dbErr.message);
  }

  const msgLower = message.toLowerCase().trim();

  // ═══════════════════════════════════════════════════════════════
  // 1. FAST DETERMINISTIC INTENT HANDLERS (Zero-Latency Guarantee)
  // ═══════════════════════════════════════════════════════════════

  // A. DELETE INTENT
  if (/\b(delete|remove|purge|drop|trash|kill|discard)\b/i.test(msgLower)) {
    const match = findTaskMatch(message, tasks);
    if (match) {
      await DB.prepare('DELETE FROM tasks WHERE id = ?').bind(match.id).run();
      return c.json({
        type: 'mutation',
        mutation: { action: 'delete', task: { id: match.id, title: match.title } },
        result: { success: true },
        message: `Deleted task **"${match.title}"** (${match.column_name.toUpperCase()})`,
      });
    }
  }

  // B. MOVE INTENT
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
          message: `Moved **"${match.title}"** to **${targetCol.toUpperCase()}**`,
        });
      }
    }
  }

  // C. CREATE / ADD TASK INTENT
  const isCreateIntent = /\b(add|create|new|schedule|insert|remind me to)\b/i.test(msgLower) &&
    !/\b(how to|why|what|show|list)\b/i.test(msgLower);

  if (isCreateIntent) {
    let targetCol = 'todo';
    if (/\b(urgent|high priority|critical)\b/i.test(msgLower)) targetCol = 'urgent';
    else if (/\b(progress|doing)\b/i.test(msgLower)) targetCol = 'inprogress';
    else if (/\b(block|blocked)\b/i.test(msgLower)) targetCol = 'blocked';

    let period = 'none';
    if (/\bdaily\b/i.test(msgLower)) period = 'daily';
    else if (/\bweekly\b/i.test(msgLower)) period = 'weekly';
    else if (/\bmonthly\b/i.test(msgLower)) period = 'monthly';

    const dueDate = parseDateNLP(message);

    // Clean title from command verbs and extracted properties
    let rawTitle = message
      .replace(/\b(add|create|insert|schedule|new|task|item|todo|to-do|please|could you|can you|remind me to)\b/gi, ' ')
      .replace(/\b(in urgent|to urgent|in todo|to todo|in progress|to progress|in blocked|to blocked)\b/gi, ' ')
      .replace(/\b(daily|weekly|monthly)\b/gi, ' ')
      .replace(/\b(by|on|due|next)?\s*(today|tomorrow|yesterday|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, ' ')
      .replace(/\bin\s+\d+\s+days?\b/gi, ' ')
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');

    if (rawTitle.length >= 2) {
      // Capitalize first letter
      const finalTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
      const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const now = new Date().toISOString();

      const posResult = await DB.prepare(
        'SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM tasks WHERE column_name = ?'
      ).bind(targetCol).first();

      await DB.prepare(
        `INSERT INTO tasks (id, title, column_name, due_date, period, blocker_reason, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`
      ).bind(id, finalTitle, targetCol, dueDate || null, period, posResult?.next_pos ?? 0, now, now).run();

      const recurrenceLabel = period !== 'none' ? ` (${period.toUpperCase()})` : '';
      const dueLabel = dueDate ? ` [Due: ${dueDate}]` : '';

      return c.json({
        type: 'mutation',
        mutation: { action: 'create', task: { id, title: finalTitle, column_name: targetCol, due_date: dueDate, period } },
        result: { success: true, id },
        message: ` Created task **"${finalTitle}"** in **${targetCol.toUpperCase()}**${dueLabel}${recurrenceLabel}`,
      });
    }
  }

  // D. STATUS & ANALYTICS QUESTIONS INTENT
  let questionIntent = null;
  if (/\b(overdue|late|past due)\b/i.test(msgLower)) questionIntent = 'overdue';
  else if (/\b(focus|priority|priorities|next|what should i do)\b/i.test(msgLower)) questionIntent = 'focus';
  else if (/\b(summary|digest|status|overview|report|stats|board)\b/i.test(msgLower)) questionIntent = 'summary';

  // ═══════════════════════════════════════════════════════════════
  // 2. WORKERS AI EXECUTION WITH GRACEFUL FALLBACK
  // ═══════════════════════════════════════════════════════════════
  let aiOutputText = null;

  if (AI && typeof AI.run === 'function') {
    const now = new Date();
    const boardContext = tasks.length > 0
      ? `\n\nCurrent Board State (${now.toISOString().split('T')[0]}):\n${tasks.map(t =>
        `- [${t.column_name.toUpperCase()}] "${t.title}" | Due: ${t.due_date || 'none'} | Period: ${t.period} | Checked: ${t.is_checked ? 'yes' : 'no'}${t.blocker_reason ? ` | Blocked: ${t.blocker_reason}` : ''} | ID: ${t.id}`
      ).join('\n')}`
      : '\n\nThe board is currently empty. No tasks yet.';

    const currentDate = `\nCurrent Date & Time: ${now.toISOString()}`;
    const gatewayId = c.env.AI_GATEWAY_ID || c.env.CF_AI_GATEWAY || c.env.AI_GATEWAY_SLUG;

    const aiPayload = {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + currentDate + boardContext },
        { role: 'user', content: message }
      ],
      max_tokens: 1024,
      temperature: 0.6,
    };

    try {
      let aiResponse;
      if (gatewayId) {
        aiResponse = await AI.run('@cf/meta/llama-3.1-8b-instruct', aiPayload, { gateway: { id: gatewayId, skipCache: false } });
      } else {
        aiResponse = await AI.run('@cf/meta/llama-3.1-8b-instruct', aiPayload);
      }
      aiOutputText = aiResponse?.response || aiResponse?.result?.response || (typeof aiResponse === 'string' ? aiResponse : null);
    } catch (gwErr) {
      console.warn('Workers AI primary model failed, trying fallback model:', gwErr.message);
      try {
        const fallbackResp = await AI.run('@cf/meta/llama-3-8b-instruct', aiPayload);
        aiOutputText = fallbackResp?.response || fallbackResp?.result?.response || (typeof fallbackResp === 'string' ? fallbackResp : null);
      } catch (fallbackErr) {
        console.warn('Workers AI fallback model also unavailable:', fallbackErr.message);
      }
    }
  }

  // ── 3. PARSE AI OUTPUT (IF WORKERS AI SUCCEEDED) ──
  if (aiOutputText) {
    const toolCallMatch = aiOutputText.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/) ||
      aiOutputText.match(/```json\s*\n?([\s\S]*?)\n?```/);

    if (toolCallMatch) {
      try {
        const rawMutation = JSON.parse(toolCallMatch[1]);
        const mutation = rawMutation.action ? rawMutation : (rawMutation.task || rawMutation);
        const result = await executeMutation(DB, mutation);
        const cleanText = aiOutputText.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').replace(/```json[\s\S]*?```/g, '').trim();

        return c.json({
          type: 'mutation',
          mutation: mutation,
          result: result,
          message: cleanText || `Done! ${getMutationDescription(mutation)}`,
        });
      } catch (parseErr) {
        console.warn('Failed to parse AI JSON tool call:', parseErr.message);
      }
    }

    // Return conversational text from LLM
    return c.json({
      type: 'conversation',
      message: aiOutputText.replace(/<\/?tool_call>/g, '').trim(),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. BULLETPROOF LOCAL CO-PILOT FALLBACK (Zero 500 Errors!)
  // ═══════════════════════════════════════════════════════════════
  // If Workers AI is offline, rate-limited, or unconfigured, the local co-pilot
  // answers with high precision from live D1 data!
  console.log('Serving request via Local Intelligent Co-Pilot Engine');

  const localReport = analyzeBoardLocally(tasks, questionIntent || 'summary', message);
  return c.json({
    type: 'conversation',
    message: localReport,
  });
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
