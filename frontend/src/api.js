export async function apiFetch(path, options = {}) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(data?.error || 'Request failed');
  }

  return data;
}
