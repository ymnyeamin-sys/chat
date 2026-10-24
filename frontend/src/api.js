* { box-sizing: border-box; }
html, body, #root {
  margin: 0;
  min-height: 100%;
  font-family: Inter, Arial, sans-serif;
  background: #0b1220;
  color: #e5eefb;
}
body {
  min-height: 100vh;
}
button, input {
  font: inherit;
}
button {
  border: none;
  cursor: pointer;
}
.auth-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #111827, #0f172a);
}
.auth-card {
  width: min(480px, 92vw);
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 30px 50px rgba(15, 23, 42, 0.4);
}
.auth-card h1 {
  margin: 0 0 18px;
  font-size: 2rem;
}
.segmented-control {
  display: inline-flex;
  background: #111827;
  padding: 6px;
  border-radius: 12px;
  margin-bottom: 18px;
}
.segmented-control button {
  border-radius: 10px;
  padding: 8px 16px;
  background: transparent;
  color: #cbd5e1;
}
.segmented-control button.active {
  background: #2563eb;
  color: white;
}
.auth-form {
  display: grid;
  gap: 14px;
}
.auth-form label {
  display: grid;
  gap: 8px;
  color: #cbd5e1;
}
.auth-form input {
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.8);
  color: #f8fafc;
  padding: 12px 14px;
}
.primary {
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  color: white;
  border-radius: 12px;
  padding: 12px 18px;
  font-weight: 600;
}
.app-shell {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr) 260px;
  min-height: 100vh;
  background: #0f172a;
}
.sidebar, .profile-panel {
  background: #111827;
  border-right: 1px solid rgba(148, 163, 184, 0.12);
  padding: 16px;
}
.profile-panel {
  border-right: none;
  border-left: 1px solid rgba(148, 163, 184, 0.12);
}
.brand-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}
.conversation-list {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}
.conversation-item {
  display: flex;
  gap: 12px;
  align-items: center;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 12px;
  text-align: left;
  color: white;
}
.conversation-item.selected {
  border-color: rgba(96, 165, 250, 0.8);
  background: rgba(37, 99, 235, 0.12);
}
.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #22c55e, #3b82f6);
  font-weight: 700;
}
.avatar.large {
  width: 72px;
  height: 72px;
  margin: 0 auto 12px;
}
.meta {
  display: grid;
  gap: 4px;
  overflow: hidden;
}
.meta small {
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chat-panel {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(15, 23, 42, 0.7);
}
.call-controls {
  display: flex;
  gap: 8px;
}
.call-controls button {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(30, 41, 59, 0.8);
  color: white;
}
.messages-panel {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
}
.message {
  display: flex;
  justify-content: flex-start;
}
.message.mine {
  justify-content: flex-end;
}
.message-bubble {
  max-width: min(70%, 420px);
  background: rgba(30, 41, 59, 0.8);
  border-radius: 16px;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.08);
}
.message.mine .message-bubble {
  background: rgba(37, 99, 235, 0.18);
}
.composer {
  display: flex;
  gap: 12px;
  padding: 16px 20px 22px;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(15, 23, 42, 0.7);
}
.composer input {
  flex: 1;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.8);
  color: white;
  padding: 12px 14px;
}
.empty-state {
  display: grid;
  place-items: center;
  height: 100%;
  color: #cbd5e1;
}
.profile-box, .panel-box {
  background: rgba(17, 24, 39, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
}
.error {
  background: rgba(127, 29, 29, 0.2);
  border: 1px solid rgba(248, 113, 113, 0.5);
  color: #fecaca;
  padding: 10px 12px;
  border-radius: 10px;
}
.loading-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  color: #cbd5e1;
}
@media (max-width: 900px) {
  .app-shell {
    grid-template-columns: 1fr;
  }
  .sidebar, .profile-panel {
    border: none;
  }
  .chat-panel {
    min-height: 70vh;
  }
}
