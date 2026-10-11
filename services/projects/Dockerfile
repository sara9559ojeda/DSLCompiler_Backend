# Build context is the monorepo root (see docker-compose.yml).
#
# Two consumers of this file: the `runtime` stage (final image, runs the
# HTTP server) and the `build` stage (used directly by docker-compose's
# `projects-migrate` one-off service, via `target: build` — it still has
# the Prisma CLI, which the lean runtime image deliberately doesn't).
FROM node:20-slim AS deps
WORKDIR /app
# Prisma's engines (generate, and later `migrate deploy` in the `build`
# stage) link against OpenSSL on Debian, same as the `runtime` stage below.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY services/compiler/package.json services/compiler/package.json
COPY services/projects/package.json services/projects/package.json
COPY services/ai-assist/package.json services/ai-assist/package.json
COPY apps/gateway/package.json apps/gateway/package.json
RUN npm ci

FROM deps AS build
COPY packages/shared packages/shared
COPY services/projects services/projects
RUN npm run build --workspace=packages/shared
# prisma generate needs a syntactically valid DATABASE_URL, not a live connection.
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    npm run build --workspace=services/projects

FROM node:20-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY services/compiler/package.json services/compiler/package.json
COPY services/projects/package.json services/projects/package.json
COPY services/ai-assist/package.json services/ai-assist/package.json
COPY apps/gateway/package.json apps/gateway/package.json
RUN npm ci --omit=dev

FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Prisma's query engine links against OpenSSL on Debian.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
RUN useradd --create-home --shell /bin/bash appuser
COPY --from=prod-deps /app/node_modules ./node_modules
# `prisma generate`'s output (node_modules/.prisma/client) was produced in
# `build` against `deps`'s node_modules, not `prod-deps`'s separate `npm ci`
# — copy it on top, or @prisma/client throws "did not initialize" at runtime.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/services/projects/package.json services/projects/package.json
COPY --from=build /app/services/projects/dist services/projects/dist
RUN chown -R appuser:appuser /app
USER appuser
EXPOSE 4003
CMD ["node", "services/projects/dist/http/main.js"]
