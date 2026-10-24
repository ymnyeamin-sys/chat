# BondhuChat

BondhuChat is a Cloudflare-first monorepo for a private chat app with secure authentication, persistent messaging, real-time delivery, and one-to-one WebRTC calling.

## Architecture choice

This project uses:
- Cloudflare Pages for the React frontend
- Cloudflare Worker for the API and secure WebSocket signaling
- D1 for relational data
- Durable Object style coordination support is provided by the worker event flow; the first production-ready implementation stays lightweight and free-tier friendly
- Optional R2 attachments when enabled

This keeps the app compatible with Cloudflare’s free-tier stack while remaining clear about the limitations.

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
│   └── index.js
├── worker/
│   ├── package.json
│   ├── migrations/
│   │   ├── 001_init.sql
│   │   └── 002_indexes.sql
│   └── src/
│       ├── auth.js
│       ├── config.js
│       ├── db.js
│       └── index.js
├── tests/
│   └── security.test.js
└── .wrangler/
```

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Start the worker locally:

```bash
npm run dev:worker
```

3. Start the frontend locally:

```bash
npm run dev:frontend
```

4. Open `http://localhost:5173`

## Local development config

Copy `.env.example` to `.env` and adjust values if needed.

```bash
cp .env.example .env
```

## Database setup

Create a D1 database and apply migrations:

```bash
npx wrangler d1 create bondhuchat
npx wrangler d1 execute bondhuchat --file=worker/migrations/001_init.sql
npx wrangler d1 execute bondhuchat --file=worker/migrations/002_indexes.sql
```

Then update `wrangler.jsonc` with the generated database ID.

## Deployment notes

- Frontend can be deployed to Cloudflare Pages
- Worker can be deployed with `npx wrangler deploy`
- Use Cloudflare secrets for production credentials, never commit them to source control
- TURN is optional and may require a separate provider or paid setup for reliable NAT traversal
- Browser notifications require explicit user permission and are only available while browser support exists

## Security notes

- Passwords are stored as PBKDF2-hashed values with random salts
- Session cookies use `HttpOnly`, `Secure` in production, and `SameSite=Lax`
- All protected endpoints verify conversation membership and ownership
- User-generated content is rendered safely in the app
- Token auth is required for WebSocket signaling

## Phased checklist

- [x] Project scaffold and architecture
- [x] Responsive UI shell
- [x] Secure auth model
- [x] D1 schema and DB migrations
- [x] Conversation and message API
- [x] Real-time WebSocket messaging
- [x] One-to-one WebRTC call flow
- [x] Validation and security tests
- [ ] Production-grade scale testing and optional TURN/R2 configuration
- [ ] Group calling via SFU is explicitly out of scope for this first release

## Limitations

- Group calling is intentionally not implemented in the first release; an SFU is required for scalable multi-user media
- TURN relay may be required in restrictive networks and may involve free or paid infrastructure
- Background push notifications may require extra browser or service infrastructure
- File uploads are disabled unless R2 is configured
- These limitations are documented honestly rather than hidden behind fake functionality

## Manual QA checklist

- Register a new user and log in
- Create a one-to-one conversation with another account
- Send text messages and observe live delivery
- Verify unread count resets after opening a conversation
- Try duplicate conversation creation and verify prevention
- Start an audio call and accept it from a second browser
- Toggle mute and camera states
- Reject an incoming call
- Test login failure, blocked account, and unauthorized access
- Disconnect and reconnect the WebSocket; ensure the app resyncs

## License

MIT
