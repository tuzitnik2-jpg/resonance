# Production image for the MCP server.
# Compiles with tsc to dist/ and runs `node dist/main.js` (not `tsx watch`).
FROM node:22-slim

RUN corepack enable
WORKDIR /workspace

# Copy the whole workspace so pnpm can resolve every `workspace:*` dependency, then install.
COPY . .
RUN pnpm install --frozen-lockfile || pnpm install

# Build via turbo so workspace dependencies compile to dist/ first.
RUN pnpm exec turbo run build --filter=mcp
ENV NODE_ENV=production

WORKDIR /workspace/apps/mcp
EXPOSE 3002
CMD ["node", "dist/main.js"]
