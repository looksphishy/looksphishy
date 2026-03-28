# Stage 1: base — enable corepack/pnpm
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# Stage 2: deps — install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY libs/shared/package.json libs/shared/
RUN pnpm install --frozen-lockfile

# Stage 3: build — compile TypeScript
FROM deps AS build
COPY apps/api/ apps/api/
COPY libs/shared/ libs/shared/
RUN pnpm --filter @looksphishy/api build

# Stage 4: production — minimal runtime image
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/libs/shared/node_modules ./libs/shared/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/libs/shared/ ./libs/shared/
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/entrypoint.sh apps/api/

RUN chmod +x apps/api/entrypoint.sh

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

ENTRYPOINT ["apps/api/entrypoint.sh"]
