FROM node:22-slim

RUN corepack enable

WORKDIR /workspace

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile || pnpm install

WORKDIR /workspace/apps/api
EXPOSE 3001
CMD ["pnpm", "start:dev"]
