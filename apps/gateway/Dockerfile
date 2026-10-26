# Build context is the monorepo root (see docker-compose.yml).
#
# Two final images:
#   - `runtime`: the gateway alone. docker-compose builds this one
#     (`target: runtime`) and runs the compiler as its own container.
#   - `bundled` (last stage, so the default when no target is given — what
#     Render builds): gateway + compiler in one container, talking gRPC over
#     127.0.0.1. Render's edge only speaks HTTP/1.x to containers and this
#     plan has no private network, so co-locating the two is how the
#     gateway → compiler hop stays gRPC in production. See ADR 0013.
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/grpc-contracts/package.json packages/grpc-contracts/package.json
COPY packages/compiler-core/package.json packages/compiler-core/package.json
COPY services/compiler/package.json services/compiler/package.json
COPY services/projects/package.json services/projects/package.json
COPY services/ai-assist/package.json services/ai-assist/package.json
COPY apps/gateway/package.json apps/gateway/package.json
RUN npm ci

FROM deps AS build
COPY packages/shared packages/shared
COPY packages/grpc-contracts packages/grpc-contracts
COPY packages/compiler-core packages/compiler-core
COPY services/compiler services/compiler
COPY apps/gateway apps/gateway
RUN npm run build --workspace=packages/shared \
 && npm run build --workspace=packages/grpc-contracts \
 && npm run build --workspace=packages/compiler-core \
 && npm run build --workspace=services/compiler \
 && npm run build --workspace=apps/gateway

FROM node:20-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/grpc-contracts/package.json packages/grpc-contracts/package.json
COPY packages/compiler-core/package.json packages/compiler-core/package.json
COPY services/compiler/package.json services/compiler/package.json
COPY services/projects/package.json services/projects/package.json
COPY services/ai-assist/package.json services/ai-assist/package.json
COPY apps/gateway/package.json apps/gateway/package.json
RUN npm ci --omit=dev

FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN useradd --create-home --shell /bin/bash appuser
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/grpc-contracts/package.json packages/grpc-contracts/package.json
COPY --from=build /app/packages/grpc-contracts/dist packages/grpc-contracts/dist
COPY --from=build /app/packages/grpc-contracts/proto packages/grpc-contracts/proto
COPY --from=build /app/apps/gateway/package.json apps/gateway/package.json
COPY --from=build /app/apps/gateway/dist apps/gateway/dist
USER appuser
EXPOSE 4000
CMD ["node", "apps/gateway/dist/main.js"]

FROM runtime AS bundled
COPY --from=build /app/packages/compiler-core/package.json packages/compiler-core/package.json
COPY --from=build /app/packages/compiler-core/dist packages/compiler-core/dist
COPY --from=build /app/services/compiler/package.json services/compiler/package.json
COPY --from=build /app/services/compiler/dist services/compiler/dist
COPY apps/gateway/bundled/start.mjs apps/gateway/bundled/start.mjs
CMD ["node", "apps/gateway/bundled/start.mjs"]
