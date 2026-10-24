const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8787';

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(payload?.error || payload || 'Request failed');
  }

  return payload;
}

export async function register(payload) {
  return apiFetch('/api/v1/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function login(payload) {
  return apiFetch('/api/v1/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchConversations() {
  return apiFetch('/api/v1/conversations');
}

export async function createConversation(payload) {
  return apiFetch('/api/v1/conversations', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchMessages(conversationId) {
  return apiFetch(`/api/v1/conversations/${conversationId}/messages`);
}

export async function sendMessage(conversationId, payload) {
  return apiFetch(`/api/v1/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
