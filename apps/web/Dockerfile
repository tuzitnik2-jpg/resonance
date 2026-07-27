FROM node:22-slim

RUN corepack enable

WORKDIR /workspace

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile || pnpm install

WORKDIR /workspace/apps/web
EXPOSE 3000
CMD ["pnpm", "dev"]
