FROM node:22-slim

RUN corepack enable

WORKDIR /workspace

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/mcp ./apps/mcp

RUN pnpm install --frozen-lockfile || pnpm install

WORKDIR /workspace/apps/mcp
EXPOSE 3002
CMD ["pnpm", "start:dev"]
