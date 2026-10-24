# BondhuChat

BondhuChat is a Cloudflare-first monorepo for a private chat app with secure authentication, persistent messaging, and real one-to-one WebRTC calling.

## Architecture choice

This project uses:
- Cloudflare Pages for the React frontend
- Cloudflare Worker for the API and secure WebSocket signaling
- D1 for relational data
- Durable Objects for per-conversation WebSocket coordination
- Optional R2 attachments when enabled

This avoids mixed deployment patterns and keeps the app compatible with Cloudflare's free-tier stack.

## Project tree

```text
.
├── README.md
├── .env.example
├── .gitignore
├── package.json
├── wrangler.jsonc
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       ├── main.jsx
│       └── styles.css
├── shared/
│   ├── index.js
│   └── validation.js
├── worker/
│   ├── package.json
│   ├── src/
│   │   ├── auth.js
│   │   ├── config.js
│   │   ├── db.js
│   │   └── index.js
│   └── migrations/
│       ├── 001_init.sql
│       └── 002_indexes.sql
└── tests/
    └── security.test.js
```

## Phase checklist

- [x] Phase 1: scaffold, configuration, and responsive UI
- [x] Phase 2: D1 schema and secure authentication
- [x] Phase 3: conversations, persistent messaging, and WebSocket delivery
- [x] Phase 4: unread counts, receipts, typing indicators, presence, and privacy
- [x] Phase 5: real one-to-one WebRTC audio/video calling
- [ ] Phase 6: attachments and notifications (requires R2/browser push support)
- [ ] Phase 7: full automated testing and production hardening
- [ ] Phase 8: optional group calling with an SFU architecture

## Quickstart

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment file:
   ```bash
   cp .env.example .env
   ```
3. Start the worker in development mode:
   ```bash
   npm run dev:worker
   ```
4. Start the frontend:
   ```bash
   npm run dev:frontend
   ```
5. Access the app at http://localhost:5173 and the API at http://localhost:8787.

## Deployment

See sections below for Cloudflare deployment instructions.

## Security and limits

- Passwords are stored as PBKDF2 hashes and never in plaintext.
- Session cookies are HttpOnly and SameSite=Lax; Secure is enabled in production.
- WebSocket sessions are authenticated using secure session cookies and authorization checks.
- Direct peer-to-peer WebRTC will work only when both peers can reach a public STUN service. A TURN server may be required on restrictive networks.
- Browser push notifications require explicit permission and extra infrastructure. The app supports in-app notifications immediately, and browser notifications only after user opt-in.
- Group calling is intentionally left as a not-implemented phase because Cloudflare Workers are not a full SFU.

## D1 setup

```bash
npx wrangler d1 create bondhuchat
npx wrangler d1 migrations apply bondhuchat --local
npx wrangler d1 migrations apply bondhuchat --remote
```

Update `wrangler.jsonc` with the created database ID before deploying.

## Production deployment summary

```bash
npx wrangler login
npx wrangler d1 create bondhuchat
npx wrangler deploy
npx wrangler pages project create bondhuchat --production-branch main
```

Then point the frontend `VITE_API_BASE` to the deployed Worker URL and deploy the Pages app.

## Notes

This repository is intentionally structured as a real, production-aware foundation. If you want deeper customization, the app is ready for extension with R2-backed attachments, push notifications, and a future SFU-based group-calling phase.
