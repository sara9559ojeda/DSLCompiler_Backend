# Build context is the monorepo root (see docker-compose.yml).
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/compiler-core/package.json packages/compiler-core/package.json
COPY services/compiler/package.json services/compiler/package.json
COPY services/projects/package.json services/projects/package.json
COPY services/ai-assist/package.json services/ai-assist/package.json
COPY apps/gateway/package.json apps/gateway/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM deps AS build
# Only packages/compiler-core is needed here now (DslValidator.ts imports it
# directly) — services/compiler itself (the HTTP server + sharp) never gets
# pulled into this image.
COPY packages/shared packages/shared
COPY packages/compiler-core packages/compiler-core
COPY services/ai-assist services/ai-assist
RUN npm run build --workspace=packages/shared \
 && npm run build --workspace=packages/compiler-core \
 && npm run build --workspace=services/ai-assist

FROM node:20-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/compiler-core/package.json packages/compiler-core/package.json
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
COPY --from=build /app/packages/compiler-core/package.json packages/compiler-core/package.json
COPY --from=build /app/packages/compiler-core/dist packages/compiler-core/dist
COPY --from=build /app/services/ai-assist/package.json services/ai-assist/package.json
COPY --from=build /app/services/ai-assist/dist services/ai-assist/dist
USER appuser
EXPOSE 4004
CMD ["node", "services/ai-assist/dist/http/main.js"]
