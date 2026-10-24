# BondhuChat

BondhuChat is a Cloudflare-first monorepo for a private chat app with secure authentication, persistent messaging, and one-to-one WebRTC calling.

## Architecture choice

This project uses:
- Cloudflare Pages for the React frontend
- Cloudflare Worker for the API and secure WebSocket signaling
- D1 for relational data
- Durable Objects for per-conversation coordination
- Optional R2 for attachments when enabled

This keeps the project aligned with Cloudflare's free-tier stack and avoids mixing incompatible deployment patterns.

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
- [ ] Phase 2: D1 schema and secure authentication
- [ ] Phase 3: conversations, persistent messaging, and WebSocket delivery
- [ ] Phase 4: unread counts, receipts, typing indicators, presence, and privacy
- [ ] Phase 5: real one-to-one WebRTC audio/video calling
- [ ] Phase 6: attachments and notifications (requires R2/browser-push support)
- [ ] Phase 7: tests, security review, deployment, and documentation
- [ ] Phase 8: optional group calling with a future SFU architecture

## Quickstart

1. Install dependencies
   ```bash
   npm install
   ```

2. Copy the local environment file
   ```bash
   cp .env.example .env
   ```

3. Run the worker locally
   ```bash
   npm run dev:worker
   ```

4. Run the frontend locally
   ```bash
   npm run dev:frontend
   ```

5. Open the app in your browser
   - Frontend: http://localhost:5173
   - API: http://localhost:8787

## Cloudflare setup

Create the D1 database, then apply migrations:

```bash
npx wrangler d1 create bondhuchat
npx wrangler d1 migrations apply bondhuchat --local
npx wrangler d1 migrations apply bondhuchat --remote
```

Update the `database_id` in `wrangler.jsonc` before deployment.

## Deployment summary

```bash
npx wrangler login
npx wrangler deploy
npx wrangler pages project create bondhuchat --production-branch main
```

Set `VITE_API_BASE` to your deployed Worker URL before deploying the frontend.

## Limits and honest notes

- Passwords are hashed with PBKDF2 and never stored in plaintext.
- Session cookies are HttpOnly; they are marked Secure in production HTTPS deployments.
- One-to-one WebRTC requires a public STUN service and may need TURN in restrictive networks.
- Browser notifications require user permission and additional infrastructure for background push delivery.
- Group calling is intentionally deferred. Workers alone are not a full SFU.

## Next steps

The project begins with a working monorepo scaffold and responsive UI, then moves into secure auth, D1 schema, messaging, and WebRTC call signaling.
