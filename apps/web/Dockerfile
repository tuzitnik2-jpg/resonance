# Production image for the Next.js web app.
# IMPORTANT: this runs a real production build (`next build` + `next start`), NOT `next dev`.
# A dev server behind a reverse proxy fails to hydrate (its HMR websocket can't connect), which
# renders a blank page — the whole point of this file is to avoid that.
FROM node:22-slim

RUN corepack enable
WORKDIR /workspace

# Copy the whole workspace so pnpm can resolve every `workspace:*` dependency, then install.
COPY . .
RUN pnpm install --frozen-lockfile || pnpm install

# Build via turbo so workspace dependencies compile to dist/ first (build needs dev
# dependencies, so set NODE_ENV afterwards).
RUN pnpm exec turbo run build --filter=web
ENV NODE_ENV=production

WORKDIR /workspace/apps/web
EXPOSE 3000
CMD ["pnpm", "start"]
