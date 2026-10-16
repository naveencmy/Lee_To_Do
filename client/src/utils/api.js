// ═══════════════════════════════════════════════════════════════
// API Utility — Central API client for all backend requests
// ═══════════════════════════════════════════════════════════════

const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ── Task API ──
export const tasksApi = {
  list: () => request('/api/tasks'),
  create: (task) => request('/api/tasks', { method: 'POST', body: task }),
  update: (id, data) => request(`/api/tasks/${id}`, { method: 'PUT', body: data }),
  move: (id, column_name, position) =>
    request(`/api/tasks/${id}/move`, { method: 'PUT', body: { column_name, position } }),
  reorder: (tasks) =>
    request('/api/tasks/batch/reorder', { method: 'PUT', body: { tasks } }),
  delete: (id) => request(`/api/tasks/${id}`, { method: 'DELETE' }),
};

// ── AI API ──
export const aiApi = {
  chat: (message) => request('/api/ai/chat', { method: 'POST', body: { message } }),
};

// ── Push API ──
export const pushApi = {
  getVapidKey: () => request('/api/push/vapid-key'),
  subscribe: (subscription, deviceName) =>
    request('/api/push/subscribe', { method: 'POST', body: { subscription, deviceName } }),
  unsubscribe: (endpoint) =>
    request('/api/push/unsubscribe', { method: 'DELETE', body: { endpoint } }),
  listSubscriptions: () => request('/api/push/subscriptions'),
  testNotification: () => request('/api/push/test', { method: 'POST' }),
};

// ── Settings API ──
export const settingsApi = {
  get: () => request('/api/settings'),
  save: (settings) => request('/api/settings', { method: 'POST', body: settings }),
  update: (key, value) => request(`/api/settings/${key}`, { method: 'PUT', body: { value } }),
};
