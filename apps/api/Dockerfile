# Production image for the NestJS API.
# Builds to dist/ and runs `node dist/main.js` (not `nest start --watch`). On boot it applies any
# pending Prisma migrations, then starts the server.
FROM node:22-slim

# Prisma's engines need OpenSSL, which the slim image doesn't ship.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable
WORKDIR /workspace

# Copy the whole workspace so pnpm can resolve every `workspace:*` dependency, then install.
COPY . .
RUN pnpm install --frozen-lockfile || pnpm install

# Build via turbo so workspace dependencies (@resonance/domain, shared, ai, db — including
# prisma generate) compile to dist/ first. Build needs dev deps, so set NODE_ENV after.
RUN pnpm exec turbo run build --filter=api
ENV NODE_ENV=production

EXPOSE 3001
# Apply migrations, seed the admin login account (idempotent — an existing user is skipped;
# credentials come from SEED_ADMIN_* or the defaults in seed.ts), then launch the server.
CMD ["sh", "-c", "pnpm --filter @resonance/db migrate:deploy && pnpm --filter @resonance/db seed && node apps/api/dist/main.js"]
