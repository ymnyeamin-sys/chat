import { validateLoginPayload, validateRegisterPayload } from '../shared/validation.js';
import { hashPassword, verifyPassword } from './auth.js';
import { AUTH_COOKIE_NAME, getCorsHeaders, SESSION_TTL_MS } from './config.js';
import { getDb, nowISO, randomId } from './db.js';

const JSON_HEADERS = {
  'content-type': 'application/json;charset=UTF-8'
};

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...getCorsHeaders(),
      ...extraHeaders
    }
  });
}

function parseJson(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return {};
  return request.json();
}

function getCookie(headers, name) {
  const cookieHeader = headers.get('Cookie') || headers.get('cookie') || '';
  const match = cookieHeader.split('; ').find((pair) => pair.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=').slice(1).join('='));
}

async function getCurrentUser(request, env) {
  const token = getCookie(request.headers, AUTH_COOKIE_NAME);
  if (!token) return null;

  const row = await env.DB.prepare(`
    SELECT u.*
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.session_token = ? AND s.expires_at > ?
  `).bind(token, nowISO()).first();

  return row;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: getCorsHeaders(request.headers.get('Origin') || '*')
      });
    }

    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return jsonResponse({ ok: true, service: 'bondhuchat-worker' }, 200);
    }

    if (url.pathname === '/api/v1/me') {
      const user = await getCurrentUser(request, env);
      if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

      return jsonResponse({
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        bio: user.bio,
        last_seen: user.last_seen
      });
    }

    if (url.pathname === '/api/v1/register' && request.method === 'POST') {
      const payload = await parseJson(request);
      const validation = validateRegisterPayload(payload);
      if (!validation.ok) {
        return jsonResponse({ error: validation.error }, 400);
      }

      const existing = await env.DB.prepare(`
        SELECT id FROM users WHERE username = ? OR email = ?
      `).bind(validation.value.username, validation.value.email).first();

      if (existing) {
        return jsonResponse({ error: 'A user with that username or email already exists' }, 409);
      }

      const passwordHash = await hashPassword(validation.value.password);
      const userId = randomId('user');
      const createdAt = nowISO();

      await env.DB.prepare(`
        INSERT INTO users (id, username, email, password_hash, full_name, avatar_url, bio, created_at, updated_at, last_seen)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        validation.value.username,
        validation.value.email,
        passwordHash,
        validation.value.fullName,
        null,
        null,
        createdAt,
        createdAt,
        createdAt
      ).run();

      return jsonResponse({ ok: true, userId }, 201);
    }

    if (url.pathname === '/api/v1/login' && request.method === 'POST') {
      const payload = await parseJson(request);
      const validation = validateLoginPayload(payload);
      if (!validation.ok) {
        return jsonResponse({ error: validation.error }, 400);
      }

      const user = await env.DB.prepare(`
        SELECT * FROM users WHERE username = ?
      `).bind(validation.value.username).first();

      if (!user) {
        return jsonResponse({ error: 'Invalid username or password' }, 401);
      }

      const valid = await verifyPassword(validation.value.password, user.password_hash);
      if (!valid) {
        return jsonResponse({ error: 'Invalid username or password' }, 401);
      }

      const sessionToken = randomId('session');
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
      await env.DB.prepare(`
        INSERT INTO sessions (id, user_id, session_token, expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(randomId('sess'), user.id, sessionToken, expiresAt, nowISO(), nowISO()).run();

      const response = jsonResponse({ ok: true, user: { id: user.id, username: user.username } });
      const secureFlag = request.url.startsWith('https://') ? '; Secure' : '';
      response.headers.set('Set-Cookie', `${AUTH_COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secureFlag}`);
      return response;
    }

    if (url.pathname === '/api/v1/logout' && request.method === 'POST') {
      const token = getCookie(request.headers, AUTH_COOKIE_NAME);
      if (token) {
        await env.DB.prepare(`DELETE FROM sessions WHERE session_token = ?`).bind(token).run();
      }

      const response = jsonResponse({ ok: true });
      response.headers.set('Set-Cookie', `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
      return response;
    }

    return jsonResponse({ error: 'Not found' }, 404);
  }
};
