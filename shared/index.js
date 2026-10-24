export const API_VERSION = '/api/v1';
export const DEFAULT_STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302'
];
export const MAX_MESSAGE_LENGTH = 2000;
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const RATE_LIMITS = {
  auth: { requests: 10, windowMs: 60_000 },
  messages: { requests: 60, windowMs: 60_000 },
  calls: { requests: 30, windowMs: 60_000 }
};

export function sanitizeText(value, maxLength = 2000) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function validateUsername(value) {
  const username = String(value || '').trim();
  if (username.length < 3 || username.length > 24) {
    return 'Username must be 3-24 characters';
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return 'Username can contain only letters, numbers, dots, underscores, and dashes';
  }
  return null;
}

export function validatePassword(value) {
  const password = String(value || '');
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  return null;
}

export function validateRegisterPayload(payload) {
  const usernameError = validateUsername(payload?.username);
  if (usernameError) {
    return { ok: false, error: usernameError };
  }

  if (!isValidEmail(payload?.email)) {
    return { ok: false, error: 'Please enter a valid email address' };
  }

  const passwordError = validatePassword(payload?.password);
  if (passwordError) {
    return { ok: false, error: passwordError };
  }

  return {
    ok: true,
    value: {
      username: sanitizeText(payload.username, 24),
      email: sanitizeText(payload.email, 255).toLowerCase(),
      password: String(payload.password || '')
    }
  };
}

export function validateLoginPayload(payload) {
  const username = sanitizeText(payload?.username, 24);
  if (!username) return { ok: false, error: 'Username is required' };
  if (!String(payload?.password || '').length) return { ok: false, error: 'Password is required' };
  return { ok: true, value: { username, password: String(payload.password) } };
}

export function validateMessagePayload(payload) {
  const content = sanitizeText(payload?.content, MAX_MESSAGE_LENGTH);
  if (!content) return { ok: false, error: 'Message cannot be empty' };
  return { ok: true, value: { content } };
}
