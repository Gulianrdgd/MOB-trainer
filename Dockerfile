# syntax=docker/dockerfile:1

# ---- build: statische site met pnpm ----
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
# tests eerst: een falende test houdt de deploy tegen
RUN pnpm test && pnpm build

# ---- serve: Caddy met voorgecomprimeerde bestanden (.br/.gz uit adapter-static) ----
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/build /srv
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO /dev/null http://127.0.0.1/ || exit 1
