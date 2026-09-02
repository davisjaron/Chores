# Chore Chart

Family chore planner with two modes: **Assigned Schedule** and **Claim & Earn**.

> **Disclaimer:** This project was built with the assistance of AI. It is provided as-is, with no warranty. **Use at your own risk.** It is designed to run on a private home network (intranet) and **should not be exposed to the public internet** without additional security hardening (HTTPS, rate limiting, IP allowlisting, etc.).

## Features

- Parent login (email + password)
- Kid login (name + PIN)
- Assigned schedule mode with fair rotation, age matching, unavailable days
- Claim & earn mode with points, cash, rewards, rate limits
- Per-kid and total rate limits (first come, first served)
- Reward approval workflow (parent must approve redemptions)
- Points and cash transaction history with edit/delete
- Leaderboard with tie handling
- Configurable timezone
- Calendar and list views
- .ics export for Google/Apple/Outlook Calendar

## Quick Start (Development)

```bash
npm install
npm run db:setup
npm run dev
```

Open http://localhost:3000

### Seed credentials
- **Parent:** admin / password123
- **Kids:** Select name + PIN `1234`

Set `SEED_ADMIN_PASSWORD` in your `.env` to use a custom admin password.

## Docker (Production)

```bash
cp .env.example .env
# Edit NEXTAUTH_SECRET, NEXTAUTH_URL, and optionally SEED_ADMIN_PASSWORD

docker compose up -d --build
```

App runs on port 80. SQLite data persists in the `chore-data` Docker volume.

See [DEPLOY.example.md](DEPLOY.example.md) for full deployment instructions.

### VM sizing
- **1 vCPU + 2 GB RAM** is sufficient for a single family

## Security Notes

This app is designed for trusted home network use. Key considerations:

- **Authentication:** All API routes require session authentication. Parent-only operations (managing children, chores, rewards, settings, financial transactions) require a parent role.
- **Registration:** Locked after the first account is created — only an authenticated parent can register additional accounts.
- **Kid isolation:** Kids can only view/modify their own claims and transactions.
- **No HTTPS:** The app does not include TLS termination. If exposing beyond your LAN, put it behind a reverse proxy with HTTPS (e.g., Caddy, nginx, Cloudflare Tunnel).
- **No rate limiting:** There is no built-in request rate limiting on API endpoints.
- **PIN security:** Kid PINs are short numeric codes hashed with bcrypt — suitable for family use, not for high-security environments.
- **SQLite:** Single-file database. Not suitable for concurrent multi-server deployments.

## License

MIT
