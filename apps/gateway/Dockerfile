# Build context is the monorepo root (see docker-compose.yml).
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY services/compiler/package.json services/compiler/package.json
COPY services/projects/package.json services/projects/package.json
COPY services/ai-assist/package.json services/ai-assist/package.json
COPY apps/gateway/package.json apps/gateway/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/gateway apps/gateway
RUN npm run build --workspace=packages/shared \
 && npm run build --workspace=apps/gateway

FROM node:20-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY services/compiler/package.json services/compiler/package.json
COPY services/projects/package.json services/projects/package.json
COPY services/ai-assist/package.json services/ai-assist/package.json
COPY apps/gateway/package.json apps/gateway/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev

FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN useradd --create-home --shell /bin/bash appuser
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/gateway/package.json apps/gateway/package.json
COPY --from=build /app/apps/gateway/dist apps/gateway/dist
USER appuser
EXPOSE 4000
CMD ["node", "apps/gateway/dist/main.js"]
