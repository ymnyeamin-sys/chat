import { getCorsHeaders } from './config.js';
import { getDb, nowISO, randomId } from './db.js';
import { getSessionToken, requireAuth } from './auth.js';
import { API_VERSION, DEFAULT_STUN_SERVERS, validateLoginPayload, validateMessagePayload, validateRegisterPayload } from '../shared/index.js';

const globalMap = globalThis.__bondhuSockets || new Map();
globalThis.__bondhuSockets = globalMap;

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

function setCookie(response, token) {
  const cookieValue = `bondhuchat_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7};`;
  response.headers.append('Set-Cookie', cookieValue);
  return response;
}

function ensureOrigin(request) {
  const origin = request.headers.get('Origin') || 'http://localhost:5173';
  const headers = getCorsHeaders(origin);
  return headers;
}

function broadcastToUser(userId, payload) {
  const sockets = globalMap.get(userId) || new Set();
  sockets.forEach((socket) => {
    try {
      socket.send(JSON.stringify(payload));
    } catch {
      // ignore socket failures
    }
  });
}

async function insertMessage(env, conversationId, senderId, content, replyTo = null) {
  const db = getDb(env);
  const id = randomId('msg');
  const ts = nowISO();

  await db.prepare(
    'INSERT INTO messages (id, conversation_id, sender_id, content, reply_to, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, conversationId, senderId, content, replyTo, ts).run();

  await db.prepare('UPDATE conversations SET updated_at = ?, last_message_id = ? WHERE id = ?')
    .bind(ts, id, conversationId)
    .run();

  const members = await db.prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ?').bind(conversationId).all();
  for (const member of members.results || []) {
    if (member.user_id === senderId) {
      await db.prepare('INSERT OR IGNORE INTO message_receipts (id, message_id, user_id, status, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(randomId('receipt'), id, member.user_id, 'sent', ts)
        .run();
      continue;
    }

    await db.prepare('INSERT OR IGNORE INTO message_receipts (id, message_id, user_id, status, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(randomId('receipt'), id, member.user_id, 'sent', ts)
      .run();
    await db.prepare('UPDATE conversation_members SET unread_count = unread_count + 1 WHERE conversation_id = ? AND user_id = ?')
      .bind(conversationId, member.user_id)
      .run();
  }

  const freshMessage = await db.prepare(
    'SELECT m.*, u.username AS sender_username FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?'
  ).bind(id).first();

  return freshMessage;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const originHeaders = ensureOrigin(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: originHeaders });
    }

    if (pathname === '/health') {
      return jsonResponse({ ok: true, service: 'bondhuchat' }, 200, originHeaders);
    }

    if (pathname === `${API_VERSION}/register`) {
      if (request.method !== 'POST') return jsonResponse({ ok: false, error: 'Method not allowed' }, 405, originHeaders);
      const body = await request.json().catch(() => ({}));
      const validation = validateRegisterPayload(body);
      if (!validation.ok) return jsonResponse({ ok: false, error: validation.error }, 400, originHeaders);

      const username = validation.value.username;
      const email = validation.value.email;
      const passwordHash = await (await import('./auth.js')).hashPassword(validation.value.password);
      const now = nowISO();
      const userId = randomId('user');

      try {
        await getDb(env).prepare(
          'INSERT INTO users (id, username, email, password_hash, full_name, created_at, updated_at, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(userId, username, email, passwordHash, body.full_name || '', now, now, now).run();
      } catch (error) {
        return jsonResponse({ ok: false, error: 'Username or email already in use' }, 409, originHeaders);
      }

      const sessionToken = randomId('sess');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
      await getDb(env).prepare(
        'INSERT INTO sessions (id, user_id, session_token, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(randomId('session'), userId, sessionToken, expiresAt, now, now).run();

      const response = jsonResponse({ ok: true, user: { id: userId, username, email, full_name: body.full_name || '' }, sessionToken }, 200, originHeaders);
      return setCookie(response, sessionToken);
    }

    if (pathname === `${API_VERSION}/login`) {
      if (request.method !== 'POST') return jsonResponse({ ok: false, error: 'Method not allowed' }, 405, originHeaders);
      const body = await request.json().catch(() => ({}));
      const validation = validateLoginPayload(body);
      if (!validation.ok) return jsonResponse({ ok: false, error: validation.error }, 400, originHeaders);

      const userRow = await getDb(env).prepare('SELECT * FROM users WHERE username = ?').bind(validation.value.username).first();
      if (!userRow) return jsonResponse({ ok: false, error: 'Invalid username or password' }, 401, originHeaders);

      const valid = await (await import('./auth.js')).verifyPassword(validation.value.password, userRow.password_hash);
      if (!valid) return jsonResponse({ ok: false, error: 'Invalid username or password' }, 401, originHeaders);

      const sessionToken = randomId('sess');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
      await getDb(env).prepare(
        'INSERT INTO sessions (id, user_id, session_token, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(randomId('session'), userRow.id, sessionToken, expiresAt, nowISO(), nowISO()).run();

      const response = jsonResponse({ ok: true, user: { id: userRow.id, username: userRow.username, email: userRow.email, full_name: userRow.full_name || '' }, sessionToken }, 200, originHeaders);
      return setCookie(response, sessionToken);
    }

    if (pathname === `${API_VERSION}/logout`) {
      if (request.method !== 'POST') return jsonResponse({ ok: false, error: 'Method not allowed' }, 405, originHeaders);
      const auth = await requireAuth(request, env);
      if (!auth.ok) return jsonResponse({ ok: false, error: auth.error }, auth.status, originHeaders);
      await getDb(env).prepare('DELETE FROM sessions WHERE session_token = ?').bind(getSessionToken(request)).run();
      const response = jsonResponse({ ok: true }, 200, originHeaders);
      response.headers.append('Set-Cookie', 'bondhuchat_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0;');
      return response;
    }

    if (pathname === `${API_VERSION}/session`) {
      const auth = await requireAuth(request, env);
      if (!auth.ok) return jsonResponse({ ok: false, error: auth.error }, auth.status, originHeaders);
      return jsonResponse({ ok: true, user: auth.user, sessionToken: auth.session.token }, 200, originHeaders);
    }

    if (pathname === `${API_VERSION}/users`) {
      const auth = await requireAuth(request, env);
      if (!auth.ok) return jsonResponse({ ok: false, error: auth.error }, auth.status, originHeaders);
      const query = new URL(request.url).searchParams.get('query') || '';
      const safeQuery = `%${String(query).trim()}%`;
      const users = await getDb(env).prepare(
        'SELECT id, username, email, full_name, avatar_url, bio FROM users WHERE (username LIKE ? OR email LIKE ?) AND id != ? ORDER BY username LIMIT 20'
      ).bind(safeQuery, safeQuery, auth.user.id).all();
      return jsonResponse({ ok: true, users: users.results || [] }, 200, originHeaders);
    }

    if (pathname === `${API_VERSION}/conversations`) {
      const auth = await requireAuth(request, env);
      if (!auth.ok) return jsonResponse({ ok: false, error: auth.error }, auth.status, originHeaders);

      if (request.method === 'GET') {
        const rows = await getDb(env).prepare(
          `SELECT c.id, c.name, c.updated_at, c.last_message_id, cm.unread_count,
                  (SELECT content FROM messages WHERE id = c.last_message_id) AS last_message,
                  (SELECT group_concat(u2.username) FROM conversation_members cm2 JOIN users u2 ON u2.id = cm2.user_id WHERE cm2.conversation_id = c.id AND cm2.user_id != ?) AS participant_names
           FROM conversations c
           JOIN conversation_members cm ON cm.conversation_id = c.id
           WHERE cm.user_id = ?
           ORDER BY c.updated_at DESC`
        ).bind(auth.user.id, auth.user.id).all();

        const conversations = (rows.results || []).map((row) => ({
          id: row.id,
          name: row.name,
          updated_at: row.updated_at,
          last_message: row.last_message,
          unread_count: row.unread_count || 0,
          participants: []
        }));

        for (const conversation of conversations) {
          const participants = await getDb(env).prepare(
            'SELECT u.id, u.username, u.full_name FROM conversation_members cm JOIN users u ON u.id = cm.user_id WHERE cm.conversation_id = ?'
          ).bind(conversation.id).all();
          conversation.participants = participants.results || [];
        }

        return jsonResponse({ ok: true, conversations }, 200, originHeaders);
      }

      if (request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const targetUsername = String(body.username || '').trim();
        if (!targetUsername) return jsonResponse({ ok: false, error: 'Username is required' }, 400, originHeaders);

        const targetUser = await getDb(env).prepare('SELECT id, username FROM users WHERE username = ?').bind(targetUsername).first();
        if (!targetUser) return jsonResponse({ ok: false, error: 'User not found' }, 404, originHeaders);
        if (targetUser.id === auth.user.id) return jsonResponse({ ok: false, error: 'You cannot chat with yourself' }, 400, originHeaders);

        const existing = await getDb(env).prepare(
          `SELECT c.id FROM conversations c
           JOIN conversation_members cm1 ON cm1.conversation_id = c.id
           JOIN conversation_members cm2 ON cm2.conversation_id = c.id
           WHERE c.type = 'direct' AND cm1.user_id = ? AND cm2.user_id = ?
           GROUP BY c.id LIMIT 1`
        ).bind(auth.user.id, targetUser.id).all();

        if ((existing.results || []).length > 0) {
          const conversation = await getDb(env).prepare('SELECT * FROM conversations WHERE id = ?').bind(existing.results[0].id).first();
          return jsonResponse({ ok: true, conversation }, 200, originHeaders);
        }

        const conversationId = randomId('conv');
        const now = nowISO();
        await getDb(env).prepare('INSERT INTO conversations (id, type, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
          .bind(conversationId, 'direct', auth.user.id, now, now)
          .run();

        await getDb(env).prepare('INSERT INTO conversation_members (id, conversation_id, user_id, joined_at, unread_count) VALUES (?, ?, ?, ?, 0)')
          .bind(randomId('member'), conversationId, auth.user.id, now)
          .run();
        await getDb(env).prepare('INSERT INTO conversation_members (id, conversation_id, user_id, joined_at, unread_count) VALUES (?, ?, ?, ?, 0)')
          .bind(randomId('member'), conversationId, targetUser.id, now)
          .run();

        const conversation = await getDb(env).prepare('SELECT * FROM conversations WHERE id = ?').bind(conversationId).first();
        return jsonResponse({ ok: true, conversation }, 200, originHeaders);
      }
    }

    if (pathname.startsWith(`${API_VERSION}/conversations/`)) {
      const auth = await requireAuth(request, env);
      if (!auth.ok) return jsonResponse({ ok: false, error: auth.error }, auth.status, originHeaders);
      const urlParts = pathname.split('/');
      const conversationId = urlParts[3] || urlParts[4];
      if (!conversationId) return jsonResponse({ ok: false, error: 'Conversation not found' }, 404, originHeaders);

      const membership = await getDb(env).prepare('SELECT * FROM conversation_members WHERE conversation_id = ? AND user_id = ?').bind(conversationId, auth.user.id).first();
      if (!membership) return jsonResponse({ ok: false, error: 'Unauthorised conversation access' }, 403, originHeaders);

      if (request.method === 'GET' && pathname.endsWith('/messages')) {
        const page = Number(new URL(request.url).searchParams.get('page') || '1');
        const offset = (page - 1) * 30;
        const rows = await getDb(env).prepare(
          'SELECT m.*, u.username AS sender_username FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.conversation_id = ? ORDER BY m.created_at DESC LIMIT 30 OFFSET ?'
        ).bind(conversationId, offset).all();
        const messages = (rows.results || []).reverse();
        await getDb(env).prepare('UPDATE conversation_members SET unread_count = 0 WHERE conversation_id = ? AND user_id = ?').bind(conversationId, auth.user.id).run();
        return jsonResponse({ ok: true, messages }, 200, originHeaders);
      }

      if (request.method === 'POST' && pathname.endsWith('/messages')) {
        const body = await request.json().catch(() => ({}));
        const validation = validateMessagePayload(body);
        if (!validation.ok) return jsonResponse({ ok: false, error: validation.error }, 400, originHeaders);
        const message = await insertMessage(env, conversationId, auth.user.id, validation.value.content);
        const payload = { type: 'new_message', message };
        const others = await getDb(env).prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ?').bind(conversationId).all();
        for (const row of others.results || []) {
          broadcastToUser(row.user_id, payload);
        }
        return jsonResponse({ ok: true, message }, 200, originHeaders);
      }

      if (request.method === 'POST' && pathname.endsWith('/typing')) {
        const body = await request.json().catch(() => ({}));
        const isTyping = Boolean(body.isTyping);
        const others = await getDb(env).prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?').bind(conversationId, auth.user.id).all();
        for (const row of others.results || []) {
          broadcastToUser(row.user_id, { type: 'typing', conversationId, userId: auth.user.id, isTyping });
        }
        return jsonResponse({ ok: true }, 200, originHeaders);
      }
    }

    if (pathname === `${API_VERSION}/blocks`) {
      const auth = await requireAuth(request, env);
      if (!auth.ok) return jsonResponse({ ok: false, error: auth.error }, auth.status, originHeaders);
      const body = await request.json().catch(() => ({}));
      const targetUsername = String(body.username || '').trim();
      const target = await getDb(env).prepare('SELECT id FROM users WHERE username = ?').bind(targetUsername).first();
      if (!target) return jsonResponse({ ok: false, error: 'User not found' }, 404, originHeaders);
      await getDb(env).prepare('INSERT OR IGNORE INTO user_blocks (id, blocker_id, blocked_id, created_at) VALUES (?, ?, ?, ?)')
        .bind(randomId('block'), auth.user.id, target.id, nowISO())
        .run();
      return jsonResponse({ ok: true }, 200, originHeaders);
    }

    if (pathname === '/ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader !== 'websocket') {
        return jsonResponse({ ok: false, error: 'WebSocket upgrade required' }, 426, originHeaders);
      }

      const token = new URL(request.url).searchParams.get('token');
      if (!token) return jsonResponse({ ok: false, error: 'WebSocket requires token auth' }, 401, originHeaders);
      const auth = await requireAuth(new Request('http://app.local/session?token=' + encodeURIComponent(token), { headers: { Cookie: `bondhuchat_session=${token}` } }), env);
      if (!auth.ok) return jsonResponse({ ok: false, error: auth.error }, auth.status, originHeaders);

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      server.accept();
      server.addEventListener('message', async (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'typing') {
            const peers = await getDb(env).prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?').bind(payload.conversationId, auth.user.id).all();
            for (const row of peers.results || []) {
              broadcastToUser(row.user_id, { type: 'typing', conversationId: payload.conversationId, userId: auth.user.id, isTyping: payload.isTyping });
            }
            return;
          }

          if (payload.type === 'send_message') {
            const conversation = await getDb(env).prepare('SELECT conversation_id FROM conversation_members WHERE conversation_id = ? AND user_id = ?').bind(payload.conversationId, auth.user.id).first();
            if (!conversation) return;
            const message = await insertMessage(env, payload.conversationId, auth.user.id, String(payload.content || '').trim());
            const others = await getDb(env).prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?').bind(payload.conversationId, auth.user.id).all();
            for (const row of others.results || []) {
              broadcastToUser(row.user_id, { type: 'new_message', message });
            }
            return;
          }

          if (payload.type === 'call_signal') {
            const targetUserId = payload.to || payload.target;
            if (targetUserId) {
              broadcastToUser(targetUserId, { type: 'call_signal', signal: payload.signal, from: auth.user.id });
            }
          }
        } catch (error) {
          server.send(JSON.stringify({ type: 'error', message: 'Invalid socket payload' }));
        }
      });

      const sockets = globalMap.get(auth.user.id) || new Set();
      sockets.add(server);
      globalMap.set(auth.user.id, sockets);

      server.addEventListener('close', () => {
        const set = globalMap.get(auth.user.id);
        if (set) {
          set.delete(server);
          if (set.size === 0) globalMap.delete(auth.user.id);
        }
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    return jsonResponse({ ok: false, error: 'Not found' }, 404, originHeaders);
  }
};
