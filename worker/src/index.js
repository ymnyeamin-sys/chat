import { validateLoginPayload, validateMessagePayload, validateRegisterPayload, sanitizeText } from '../../shared/validation.js';
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

function getCookie(headers, name) {
  const cookieHeader = headers.get('Cookie') || headers.get('cookie') || '';
  const match = cookieHeader.split('; ').find((pair) => pair.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=').slice(1).join('='));
}

async function getCurrentUser(request, env) {
  const token = getCookie(request.headers, AUTH_COOKIE_NAME);
  if (!token) return null;

  const db = getDb(env);
  const row = await db.prepare(`
    SELECT u.*
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.session_token = ? AND s.expires_at > ?
  `).bind(token, nowISO()).first();

  return row;
}

async function parseJson(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return {};
  return request.json();
}

async function ensureConversationMembership(user, conversationId, env) {
  const db = getDb(env);
  const row = await db.prepare(`
    SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?
  `).bind(conversationId, user.id).first();

  if (!row) {
    throw new Error('You are not a member of this conversation');
  }
}

export class ChatRoom extends DurableObject {
  constructor(state, env) {
    super(state, env);
    this.sessions = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/emit') {
      const payload = await request.json();
      for (const socket of this.sessions.values()) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(payload));
        }
      }
      return jsonResponse({ ok: true });
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 400 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    const userId = url.searchParams.get('userId');
    const conversationId = url.searchParams.get('conversationId');

    if (!userId || !conversationId) {
      client.close();
      return new Response('Missing user or conversation data', { status: 400 });
    }

    this.sessions.set(userId, server);
    server.accept();

    server.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      for (const [otherUserId, socket] of this.sessions.entries()) {
        if (otherUserId !== userId && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'room-event', conversationId, payload: data }));
        }
      }
    });

    server.addEventListener('close', () => {
      this.sessions.delete(userId);
    });

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }
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
        full_name: user.full_name,
        email: user.email,
        avatar_url: user.avatar_url,
        bio: user.bio,
        last_seen: user.last_seen
      });
    }

    if (url.pathname === '/api/v1/register' && request.method === 'POST') {
      const payload = await parseJson(request);
      const validation = validateRegisterPayload(payload);
      if (!validation.ok) return jsonResponse({ error: validation.error }, 400);

      const existing = await getDb(env).prepare(`
        SELECT id FROM users WHERE username = ? OR email = ?
      `).bind(validation.value.username, validation.value.email).first();

      if (existing) {
        return jsonResponse({ error: 'A user with that username or email already exists' }, 409);
      }

      const passwordHash = await hashPassword(validation.value.password);
      const userId = randomId('user');
      const createdAt = nowISO();

      await getDb(env).prepare(`
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
      if (!validation.ok) return jsonResponse({ error: validation.error }, 400);

      const user = await getDb(env).prepare(`SELECT * FROM users WHERE username = ?`).bind(validation.value.username).first();
      if (!user) return jsonResponse({ error: 'Invalid username or password' }, 401);

      const valid = await verifyPassword(validation.value.password, user.password_hash);
      if (!valid) return jsonResponse({ error: 'Invalid username or password' }, 401);

      const sessionToken = randomId('session');
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
      await getDb(env).prepare(`
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
        await getDb(env).prepare(`DELETE FROM sessions WHERE session_token = ?`).bind(token).run();
      }

      const response = jsonResponse({ ok: true });
      response.headers.set('Set-Cookie', `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
      return response;
    }

    if (url.pathname === '/api/v1/users/search') {
      const user = await getCurrentUser(request, env);
      if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

      const query = url.searchParams.get('q') || '';
      const rows = await getDb(env).prepare(`
        SELECT id, username, full_name, avatar_url, bio
        FROM users
        WHERE username LIKE ? OR full_name LIKE ?
        ORDER BY username ASC
        LIMIT 10
      `).bind(`%${query}%`, `%${query}%`).all();

      return jsonResponse({ items: rows.results || [] });
    }

    if (url.pathname === '/api/v1/conversations' && request.method === 'GET') {
      const user = await getCurrentUser(request, env);
      if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

      const rows = await getDb(env).prepare(`
        SELECT c.id,
               c.type,
               c.name,
               c.updated_at,
               COALESCE((SELECT u.username FROM conversation_members cm2 JOIN users u ON u.id = cm2.user_id WHERE cm2.conversation_id = c.id AND cm2.user_id != ? LIMIT 1), c.name) AS display_name,
               (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message
        FROM conversation_members cm
        JOIN conversations c ON c.id = cm.conversation_id
        WHERE cm.user_id = ?
        ORDER BY c.updated_at DESC
      `).bind(user.id, user.id).all();

      return jsonResponse({ items: rows.results || [] });
    }

    if (url.pathname === '/api/v1/conversations' && request.method === 'POST') {
      const user = await getCurrentUser(request, env);
      if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

      const payload = await parseJson(request);
      const targetUsername = sanitizeText(payload?.targetUsername || '', 24);
      if (!targetUsername) return jsonResponse({ error: 'A target username is required' }, 400);

      const targetUser = await getDb(env).prepare(`SELECT * FROM users WHERE username = ?`).bind(targetUsername).first();
      if (!targetUser) return jsonResponse({ error: 'User not found' }, 404);

      const existing = await getDb(env).prepare(`
        SELECT c.id, c.type
        FROM conversations c
        JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = ?
        JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = ?
        WHERE c.type = 'direct'
        LIMIT 1
      `).bind(user.id, targetUser.id).first();

      if (existing) {
        return jsonResponse({
          id: existing.id,
          display_name: targetUser.username,
          participants: [{ id: targetUser.id, username: targetUser.username }]
        }, 200);
      }

      const conversationId = randomId('conversation');
      const now = nowISO();

      await getDb(env).prepare(`
        INSERT INTO conversations (id, name, type, created_by, created_at, updated_at, last_message_id)
        VALUES (?, ?, 'direct', ?, ?, ?, NULL)
      `).bind(conversationId, `${user.username}-${targetUser.username}`, user.id, now, now).run();

      await getDb(env).prepare(`
        INSERT INTO conversation_members (id, conversation_id, user_id, joined_at, unread_count)
        VALUES (?, ?, ?, ?, 0), (?, ?, ?, ?, 0)
      `).bind(randomId('member'), conversationId, user.id, now, randomId('member'), conversationId, targetUser.id, now).run();

      return jsonResponse({
        id: conversationId,
        display_name: targetUser.username,
        participants: [{ id: targetUser.id, username: targetUser.username }]
      }, 201);
    }

    const conversationMatch = url.pathname.match(/^\/api\/v1\/conversations\/([^/]+)\/messages$/);
    if (conversationMatch) {
      const conversationId = conversationMatch[1];
      const user = await getCurrentUser(request, env);
      if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

      await ensureConversationMembership(user, conversationId, env);

      if (request.method === 'GET') {
        const rows = await getDb(env).prepare(`
          SELECT m.*, u.username AS sender_name
          FROM messages m
          JOIN users u ON u.id = m.sender_id
          WHERE m.conversation_id = ? AND m.deleted_at IS NULL
          ORDER BY m.created_at ASC
          LIMIT 200
        `).bind(conversationId).all();

        return jsonResponse({ items: rows.results || [] });
      }

      if (request.method === 'POST') {
        const payload = await parseJson(request);
        const validation = validateMessagePayload(payload);
        if (!validation.ok) return jsonResponse({ error: validation.error }, 400);

        const messageId = randomId('msg');
        const sentAt = nowISO();

        await getDb(env).prepare(`
          INSERT INTO messages (id, conversation_id, sender_id, content, reply_to, attachments, created_at, deleted_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
        `).bind(messageId, conversationId, user.id, validation.value.content, null, null, sentAt).run();

        await getDb(env).prepare(`
          UPDATE conversations SET last_message_id = ?, updated_at = ? WHERE id = ?
        `).bind(messageId, sentAt, conversationId).run();

        const room = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(`conversation:${conversationId}`));
        await room.fetch(new Request(`${url.origin}/emit`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            type: 'message',
            message: {
              id: messageId,
              conversation_id: conversationId,
              sender_id: user.id,
              sender_name: user.username,
              content: validation.value.content,
              created_at: sentAt
            }
          })
        }));

        return jsonResponse({
          ok: true,
          message: {
            id: messageId,
            conversation_id: conversationId,
            sender_id: user.id,
            sender_name: user.username,
            content: validation.value.content,
            created_at: sentAt
          }
        }, 201);
      }
    }

    if (url.pathname === '/ws') {
      const user = await getCurrentUser(request, env);
      if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

      const conversationId = url.searchParams.get('conversationId');
      if (!conversationId) return jsonResponse({ error: 'conversationId is required' }, 400);

      const membership = await getDb(env).prepare(`
        SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?
      `).bind(conversationId, user.id).first();

      if (!membership) return jsonResponse({ error: 'Not a member of this conversation' }, 403);

      const room = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(`conversation:${conversationId}`));
      return room.fetch(new Request(`${url.origin}/ws?conversationId=${conversationId}&userId=${user.id}`, {
        headers: request.headers,
        method: 'GET'
      }));
    }

    return jsonResponse({ error: 'Not found' }, 404);
  }
};
