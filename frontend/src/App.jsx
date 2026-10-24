import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from './api.js';
import { DEFAULT_STUN_SERVERS } from '../../shared/index.js';

const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8787/ws';

function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '', fullName: '' });
  const [user, setUser] = useState(null);
  const [sessionToken, setSessionToken] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const [callState, setCallState] = useState({ status: 'idle', kind: 'audio', callerId: null, incoming: false });
  const wsRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const getConversationPeer = (conversation) => {
    if (!conversation) return null;
    const others = conversation.participants.filter((participant) => participant.id !== user?.id);
    return others[0] || null;
  };

  const connectSocket = async () => {
    if (!user) return;
    if (wsRef.current) {
      wsRef.current.close();
    }

    const token = sessionToken || localStorage.getItem('bondhuchat_session_token') || '';
    const socket = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);
    wsRef.current = socket;

    socket.onopen = () => {
      console.info('WebSocket connected');
    };

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);

      if (payload.type === 'new_message') {
        const message = payload.message;
        setMessages((prev) => {
          const alreadyPresent = prev.some((item) => item.id === message.id);
          if (alreadyPresent) return prev;
          return [...prev, message];
        });

        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === message.conversation_id
              ? { ...conv, last_message: message.content, updated_at: message.created_at }
              : conv
          )
        );
      }

      if (payload.type === 'typing') {
        setTypingUsers((prev) => ({
          ...prev,
          [payload.conversationId]: payload.isTyping
        }));
      }

      if (payload.type === 'call_signal') {
        handleRemoteSignal(payload.signal);
      }
    };

    socket.onclose = () => {
      setTimeout(() => connectSocket(), 2000);
    };
  };

  const fetchSession = async () => {
    try {
      const data = await apiFetch('/api/v1/session');
      setUser(data.user);
      setSessionToken(data.sessionToken || localStorage.getItem('bondhuchat_session_token') || '');
      localStorage.setItem('bondhuchat_session_token', data.sessionToken || '');
      await loadConversations();
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    const data = await apiFetch('/api/v1/conversations');
    setConversations(data.conversations || []);
    if (data.conversations?.length) {
      const firstId = selectedConversationId || data.conversations[0].id;
      if (firstId) {
        setSelectedConversationId(firstId);
        await loadMessages(firstId);
      }
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const data = await apiFetch(`/api/v1/conversations/${conversationId}/messages`);
      setMessages(data.messages || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAuth = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const endpoint = authMode === 'login' ? '/api/v1/login' : '/api/v1/register';
      const payload = authMode === 'login'
        ? { username: form.username, password: form.password }
        : {
            username: form.username,
            email: form.email,
            password: form.password,
            full_name: form.fullName
          };

      const data = await apiFetch(endpoint, {
        method: 'POST',
        body: payload
      });

      setUser(data.user);
      setSessionToken(data.sessionToken || '');
      if (data.sessionToken) {
        localStorage.setItem('bondhuchat_session_token', data.sessionToken);
      }
      await loadConversations();
      setSelectedConversationId((prev) => prev || (data.conversations?.[0]?.id || null));
    } catch (err) {
      setError(err.message || 'Authentication failed');
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/v1/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      setUser(null);
      setMessages([]);
      setConversations([]);
      setSelectedConversationId(null);
      localStorage.removeItem('bondhuchat_session_token');
      if (wsRef.current) wsRef.current.close();
    }
  };

  const sendTyping = (conversationId, isTyping) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'typing', conversationId, isTyping }));
  };

  const handleSendMessage = async () => {
    if (!draft.trim() || !selectedConversationId) return;
    const content = draft.trim();
    setDraft('');
    try {
      const data = await apiFetch(`/api/v1/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        body: { content }
      });
      setMessages((prev) => [...prev, data.message]);
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'send_message', conversationId: selectedConversationId, content }));
      }
    } catch (err) {
      setError(err.message || 'Message failed to send');
    }
  };

  const createConversation = async (recipientUsername) => {
    try {
      const data = await apiFetch('/api/v1/conversations', {
        method: 'POST',
        body: { username: recipientUsername }
      });
      await loadConversations();
      setSelectedConversationId(data.conversation.id);
      await loadMessages(data.conversation.id);
    } catch (err) {
      setError(err.message || 'Unable to create conversation');
    }
  };

  const searchUsers = async (value) => {
    setSearch(value);
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const data = await apiFetch(`/api/v1/users?query=${encodeURIComponent(value)}`);
      setSearchResults(data.users || []);
    } catch {
      setSearchResults([]);
    }
  };

  const ensurePeerConnection = (kind = 'audio') => {
    const pc = new RTCPeerConnection({ iceServers: DEFAULT_STUN_SERVERS.map((server) => ({ urls: server })) });
    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'call_signal',
          signal: { type: 'candidate', candidate: event.candidate }
        }));
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        remoteStreamRef.current = stream;
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState((prev) => ({ ...prev, status: 'connected' }));
      }
      if (pc.connectionState === 'failed') {
        setCallState((prev) => ({ ...prev, status: 'failed' }));
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected') {
        setCallState((prev) => ({ ...prev, status: 'reconnecting' }));
      }
      if (pc.iceConnectionState === 'connected') {
        setCallState((prev) => ({ ...prev, status: 'connected' }));
      }
    };

    return pc;
  };

  const handleRemoteSignal = async (signal) => {
    if (!signal) return;

    if (!peerConnectionRef.current) {
      ensurePeerConnection(callState.kind || 'audio');
    }

    const pc = peerConnectionRef.current;

    if (signal.type === 'offer') {
      setCallState({ status: 'incoming', kind: signal.kind || 'audio', incoming: true, callerId: signal.from });
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: signal.kind === 'video'
      });
      localStreamRef.current = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      wsRef.current.send(JSON.stringify({ type: 'call_signal', signal: { type: 'answer', answer } }));
      setCallState((prev) => ({ ...prev, status: 'connected' }));
      return;
    }

    if (signal.type === 'answer') {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
      return;
    }

    if (signal.type === 'candidate') {
      if (signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    }
  };

  const startCall = async (kind = 'audio') => {
    if (!selectedConversation) return;
    const peer = getConversationPeer(selectedConversation);
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: kind === 'video'
    });
    localStreamRef.current = stream;
    const pc = ensurePeerConnection(kind);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    wsRef.current.send(JSON.stringify({
      type: 'call_signal',
      to: peer?.id,
      signal: { type: 'offer', kind, offer }
    }));
    setCallState({ status: 'ringing', kind, incoming: false, callerId: peer?.id || null });
  };

  const acceptCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callState.kind === 'video'
    });
    localStreamRef.current = stream;
    const pc = ensurePeerConnection(callState.kind || 'audio');
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    setCallState((prev) => ({ ...prev, status: 'connecting' }));
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setCallState({ status: 'idle', kind: 'audio', callerId: null, incoming: false });
  };

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    if (!user) return;
    connectSocket();
  }, [user]);

  useEffect(() => {
    if (!selectedConversationId) return;
    loadMessages(selectedConversationId);
  }, [selectedConversationId]);

  if (loading) return <div className="shell center">Loading BondhuChat…</div>;

  if (!user) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="brand-row">
            <div className="brand-badge">B</div>
            <div>
              <h1>BondhuChat</h1>
              <p>Private messaging for close friends</p>
            </div>
          </div>

          <div className="switcher">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')} type="button">
              Log in
            </button>
            <button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')} type="button">
              Register
            </button>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            {authMode === 'register' && (
              <label>
                Full name
                <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </label>
            )}

            <label>
              Username
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </label>

            {authMode === 'register' && (
              <label>
                Email
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
            )}

            <label>
              Password
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </label>

            {error && <div className="error-box">{error}</div>}

            <button className="primary-btn" type="submit">
              {authMode === 'login' ? 'Login' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="topbar">
          <div className="brand-short">B</div>
          <div>
            <strong>{user.username}</strong>
            <small>Online</small>
          </div>
        </div>

        <div className="search-box">
          <input value={search} onChange={(e) => searchUsers(e.target.value)} placeholder="Search friends" />
        </div>

        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((friend) => (
              <button key={friend.id} className="friend-row" onClick={() => createConversation(friend.username)} type="button">
                <span>{friend.username}</span>
                <small>Start chat</small>
              </button>
            ))}
          </div>
        )}

        <div className="conversations">
          {conversations.map((conversation) => {
            const peer = getConversationPeer(conversation);
            return (
              <button
                key={conversation.id}
                className={`conversation-row ${conversation.id === selectedConversationId ? 'selected' : ''}`}
                onClick={() => setSelectedConversationId(conversation.id)}
                type="button"
              >
                <div className="avatar">{peer?.username?.[0]?.toUpperCase() || 'U'}</div>
                <div className="conversation-meta">
                  <div className="row">
                    <strong>{peer?.username || 'Unknown user'}</strong>
                    <span>{formatTime(conversation.updated_at)}</span>
                  </div>
                  <small>{conversation.last_message || 'No messages yet'}</small>
                </div>
              </button>
            );
          })}
        </div>

        <button className="secondary-btn" type="button" onClick={handleLogout}>Logout</button>
      </aside>

      <main className="chat-panel">
        {selectedConversation ? (
          <>
            <header className="chat-header">
              <div className="header-user">
                <div className="avatar large">{getConversationPeer(selectedConversation)?.username?.[0]?.toUpperCase() || 'U'}</div>
                <div>
                  <strong>{getConversationPeer(selectedConversation)?.username || 'Unknown user'}</strong>
                  <small>{typingUsers[selectedConversation.id] ? 'typing…' : 'online'}</small>
                </div>
              </div>

              <div className="call-actions">
                <button type="button" onClick={() => startCall('audio')}>Audio call</button>
                <button type="button" onClick={() => startCall('video')}>Video call</button>
              </div>
            </header>

            <div className="messages-area">
              {messages.map((message) => (
                <div key={message.id} className={`message-bubble ${message.sender_id === user.id ? 'mine' : ''}`}>
                  <div className="message-content">{message.content}</div>
                  <div className="message-meta">{formatTime(message.created_at)}</div>
                </div>
              ))}
            </div>

            <div className="composer">
              <input
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  sendTyping(selectedConversation.id, e.target.value.trim().length > 0);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSendMessage();
                }}
                placeholder="Type a message"
              />
              <button type="button" className="primary-btn" onClick={handleSendMessage}>Send</button>
            </div>
          </>
        ) : (
          <div className="empty-state">Start a new conversation</div>
        )}
      </main>

      <aside className="details-panel">
        {callState.status !== 'idle' && (
          <div className="call-panel">
            <h3>Call status</h3>
            <p>{callState.status}</p>
            {callState.incoming && (
              <div className="call-controls">
                <button type="button" onClick={acceptCall}>Accept</button>
                <button type="button" onClick={endCall}>Reject</button>
              </div>
            )}
            {!callState.incoming && callState.status !== 'idle' && (
              <div className="call-controls">
                <button type="button" onClick={endCall}>End call</button>
              </div>
            )}
          </div>
        )}

        <div className="profile-card">
          <h3>Profile</h3>
          <div className="profile-name">{user.full_name || user.username}</div>
          <div className="profile-handle">@{user.username}</div>
        </div>
      </aside>
    </div>
  );
}

export default App;
