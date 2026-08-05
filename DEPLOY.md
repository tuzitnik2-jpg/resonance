# Deploying Resonance to production

The repo ships production Docker images for all three services. **Never run `next dev` /
`start:dev` in production** — a dev server behind a reverse proxy fails to hydrate (its HMR
websocket can't connect) and renders a blank page.

## Services

| Service | Port | Image | Runs |
| ------- | ---- | ----- | ---- |
| web     | 3000 | `apps/web/Dockerfile` | `next start` on a production build |
| api     | 3001 | `apps/api/Dockerfile` | Prisma migrate (+ seed) → `node dist/main.js` |
| mcp     | 3002 | `apps/mcp/Dockerfile` | `node dist/main.js` |
| db      | 5432 | `postgres:16` | — |

## Quick start (docker compose)

```sh
cp .env.example .env   # then fill it in (see below)
docker compose up -d --build
```

The web app is then on :3000, the API on :3001, the MCP server on :3002. Point your reverse
proxy / domain at the **web** service only; the browser reaches the API through the web app's
`/api/v1/*` proxy, so the API and MCP ports don't need to be exposed publicly (expose 3002 only
if you use the ChatGPT MCP connector).

## Required environment (.env)

- `DATABASE_URL` — e.g. `postgresql://resonance:resonance@db:5432/resonance` inside compose.
- `JWT_SECRET` — long random string; sessions break if it changes.
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — the login account. The API container seeds it on
  boot (idempotent; an existing user is never overwritten).
- `API_INTERNAL_URL` — where the web server reaches the API. Compose sets `http://api:3001`
  automatically; on split hosting set the API's internal/public URL. Wrong value ⇒ 502 on every
  `/api/v1/*` call.
- `RESONANCE_API_URL` — same thing for the MCP server (compose sets it automatically).

## First-boot checklist

1. `docker compose up -d --build` finishes with all services `running`.
2. `curl http://<host>:3001/api/v1/health` → `200 {"status":"ok"}`.
3. Open the web app → login screen → sign in with the seed credentials.
4. Home shows your library totals (served from `GET /api/v1/context`).

## Troubleshooting

- **Blank/black page** — the web container is running a dev server, or an old service worker is
  cached. Verify the container logs say `next start`; in the browser: DevTools → Application →
  Service Workers → Unregister + Clear site data.
- **502 on `/api/v1/*`** — the web container can't reach the API: check `API_INTERNAL_URL` and
  that the api container is healthy (`docker compose logs api`).
- **Login 401** — wrong credentials, or the seed didn't run (`SEED_ADMIN_EMAIL` unset). Check
  `docker compose logs api` for the seed output.
