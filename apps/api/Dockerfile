# Stage 1: base — install pnpm for dependency stages
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# Stage 2: deps — install all dependencies (including devDependencies for build)
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
RUN pnpm --filter @looksphishy/shared build && pnpm --filter @looksphishy/api build

# Stage 4: prod-deps — production dependencies only
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY libs/shared/package.json libs/shared/
RUN pnpm install --frozen-lockfile --prod

# Stage 5: production — minimal runtime image (no pnpm, no devDeps)
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps /app/libs/shared/node_modules ./libs/shared/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/apps/api/drizzle.config.ts ./apps/api/
COPY --from=build /app/apps/api/src/database/schema.ts ./apps/api/src/database/
COPY --from=build /app/libs/shared/dist ./libs/shared/dist
COPY --from=build /app/libs/shared/package.json ./libs/shared/
COPY package.json ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/health || exit 1

CMD ["node", "apps/api/dist/main.js"]
