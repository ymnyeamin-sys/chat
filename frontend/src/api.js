* {
  box-sizing: border-box;
}

:root {
  color-scheme: dark;
  --bg: #07111f;
  --bg-alt: #0d1728;
  --panel: #0f1c2d;
  --panel-strong: #12243a;
  --line: rgba(148, 163, 184, 0.18);
  --primary: #3b82f6;
  --primary-strong: #2563eb;
  --text: #e5eefb;
  --muted: #9db4d0;
  --error: #fecaca;
  --error-bg: rgba(127, 29, 29, 0.32);
}

html, body, #root {
  margin: 0;
  min-height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: Inter, 'Segoe UI', sans-serif;
}

body {
  min-height: 100vh;
}

button, input {
  font: inherit;
}

button {
  cursor: pointer;
}

.auth-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: radial-gradient(circle at top, #122d4d, #07111f 50%);
}

.auth-card {
  width: min(440px, 92vw);
  background: rgba(15, 28, 45, 0.9);
  border: 1px solid var(--line);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 28px 60px rgba(2, 6, 23, 0.45);
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.brand-mark {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--primary), #1d4ed8);
  font-size: 1.5rem;
  font-weight: 700;
}

h1, h2, h3, p {
  margin: 0;
}

.eyebrow {
  color: var(--muted);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.segmented-control {
  display: inline-flex;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid var(--line);
  padding: 6px;
  border-radius: 12px;
  gap: 8px;
  margin-bottom: 18px;
}

.segmented-control button {
  background: transparent;
  color: var(--muted);
  border: none;
  border-radius: 10px;
  padding: 8px 14px;
}

.segmented-control button.active {
  background: var(--primary);
  color: white;
}

.auth-form {
  display: grid;
  gap: 14px;
}

.auth-form label {
  display: grid;
  gap: 8px;
  color: var(--muted);
}

.auth-form input {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid var(--line);
  color: white;
  border-radius: 12px;
  min-height: 46px;
  padding: 10px 12px;
}

.primary-button {
  border: none;
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  color: white;
  border-radius: 12px;
  min-height: 46px;
  padding: 0 18px;
  font-weight: 600;
}

.ghost-button {
  background: rgba(148, 163, 184, 0.1);
  border: 1px solid var(--line);
  color: var(--text);
  border-radius: 10px;
  padding: 8px 12px;
}

.app-shell {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr) minmax(200px, 260px);
  min-height: 100vh;
  background: var(--bg);
}

.sidebar,
.profile-panel {
  background: rgba(15, 28, 45, 0.94);
  border-right: 1px solid var(--line);
  padding: 18px 14px;
}

.profile-panel {
  border-right: none;
  border-left: 1px solid var(--line);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.conversation-list {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.conversation-item {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
  border: 1px solid transparent;
  background: rgba(19, 34, 52, 0.8);
  padding: 12px;
  border-radius: 14px;
  color: white;
  text-align: left;
}

.conversation-item.selected {
  border-color: rgba(96, 165, 250, 0.8);
  background: rgba(37, 99, 235, 0.12);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #10b981, #3b82f6);
  font-weight: 700;
}

.avatar.large {
  width: 68px;
  height: 68px;
  margin: 0 auto 10px;
  font-size: 1.6rem;
}

.conversation-meta {
  display: grid;
  gap: 4px;
  overflow: hidden;
}

.conversation-meta small {
  color: var(--muted);
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
  gap: 16px;
  padding: 20px 16px;
  border-bottom: 1px solid var(--line);
  background: rgba(11, 19, 31, 0.7);
}

.chat-actions {
  display: flex;
  gap: 8px;
}

.chat-actions button {
  background: rgba(19, 34, 52, 0.8);
  border: 1px solid var(--line);
  border-radius: 10px;
  color: white;
  padding: 8px 12px;
}

.messages-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  overflow: auto;
}

.message-row {
  display: flex;
  justify-content: flex-start;
}

.message-row.mine {
  justify-content: flex-end;
}

.message-bubble {
  max-width: min(72%, 420px);
  background: rgba(19, 34, 52, 0.8);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 12px 14px;
}

.message-row.mine .message-bubble {
  background: rgba(37, 99, 235, 0.18);
}

.message-content {
  line-height: 1.5;
}

.message-meta {
  margin-top: 6px;
  color: var(--muted);
  font-size: 0.75rem;
}

.composer {
  display: flex;
  gap: 12px;
  padding: 16px 18px 20px;
  border-top: 1px solid var(--line);
  background: rgba(11, 19, 31, 0.7);
}

.composer input {
  flex: 1;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid var(--line);
  border-radius: 12px;
  color: white;
  padding: 12px 14px;
}

.empty-state {
  display: grid;
  place-items: center;
  min-height: 100%;
  color: var(--muted);
}

.empty-state.large {
  min-height: 80vh;
}

.profile-card,
.info-card {
  background: rgba(15, 28, 45, 0.8);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 18px;
}

.profile-card {
  text-align: center;
}

.info-card p {
  color: var(--muted);
  margin-top: 8px;
}

.loading-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  color: var(--muted);
}

.error-box {
  background: var(--error-bg);
  border: 1px solid rgba(248, 113, 113, 0.5);
  color: var(--error);
  border-radius: 10px;
  padding: 10px 12px;
}

@media (max-width: 920px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .sidebar,
  .profile-panel {
    border: none;
  }

  .chat-panel {
    min-height: 70vh;
  }
}
