# syntax=docker/dockerfile:1

# ---- build: statische site met Deno ----
# Altijd op het platform van de bouwer: de site is voor elke architectuur hetzelfde,
# alleen de Caddy-laag hieronder verschilt per platform.
FROM --platform=$BUILDPLATFORM denoland/deno:2.9.7 AS build
WORKDIR /app
COPY package.json deno.lock ./
RUN deno install --frozen
COPY . .
# tests eerst: een falende test houdt de deploy tegen
RUN deno task test && deno task build

# ---- serve: Caddy met voorgecomprimeerde bestanden (.br/.gz uit adapter-static) ----
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/build /srv
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO /dev/null http://127.0.0.1/ || exit 1
