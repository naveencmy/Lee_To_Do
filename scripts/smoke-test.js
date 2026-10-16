// Quick smoke test for the Lee To-Do API
const BASE = 'http://localhost:8787';

async function test() {
  console.log('=== Lee To-Do API Smoke Test ===\n');

  // 1. Health check
  const health = await fetch(`${BASE}/api/health`).then(r => r.json());
  console.log('Health:', health.status);

  // 2. Create a task
  const created = await fetch(`${BASE}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Submit ML Assignment', column_name: 'urgent', due_date: '2026-10-17' }),
  }).then(r => r.json());
  console.log('Created task:', created.task.title, '| Column:', created.task.column_name, '| Status:', created.task.status);

  // 3. Create more tasks
  const tasks = [
    { title: 'Review Database Project', column_name: 'inprogress' },
    { title: 'Research Paper Literature Review', column_name: 'todo', due_date: '2026-10-20' },
    { title: 'Fix CI/CD pipeline', column_name: 'blocked', blocker_reason: 'Waiting for DevOps access' },
    { title: 'Morning workout routine', column_name: 'todo', period: 'daily' },
  ];
  for (const t of tasks) {
    const res = await fetch(`${BASE}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(t),
    }).then(r => r.json());
    console.log('Created:', res.task.title, '→', res.task.column_name);
  }

  // 4. List all tasks
  const list = await fetch(`${BASE}/api/tasks`).then(r => r.json());
  console.log(`\n Total tasks: ${list.tasks.length}`);
  for (const task of list.tasks) {
    console.log(`  [${task.column_name}] ${task.title} | status: ${task.status} | due: ${task.due_date || 'none'}`);
  }

  // 5. Test AI chat
  const aiRes = await fetch(`${BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Give me a summary' }),
  }).then(r => r.json());
  console.log('\n AI Summary (first 200 chars):', aiRes.message.substring(0, 200));

  // 6. Test AI task creation
  const aiCreate = await fetch(`${BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Add a task to complete OS assignment by Friday' }),
  }).then(r => r.json());
  console.log('AI Create:', aiCreate.message);

  console.log('\n=== All tests passed! ===');
}

test().catch(console.error);
