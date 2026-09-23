# Man-over-boord trainer

Zeilsimulator om de man-over-boordmanoeuvre te oefenen, met het MOB-je of de halve-windmethode. Gebouwd met SvelteKit, Svelte 5 en Tailwind CSS v4. De site is volledig statisch; er is geen server-runtime nodig.

## Lokaal draaien

Je hebt Node 24 en pnpm nodig (`corepack enable` zet de juiste pnpm-versie klaar).

```sh
pnpm install
pnpm dev
```

Open daarna http://localhost:5173.

## Testen

```sh
pnpm test      # Vitest: unit tests, autopiloot-regressietest en pariteit met het prototype
pnpm check     # svelte-check en TypeScript
pnpm lint      # Prettier en ESLint
```

De pariteitstest draait de simulatiecode uit `reference/man-over-boord.html` naast de nieuwe code en eist na elke stap exact dezelfde toestand. Laat dat bestand daarom staan.

## Builden

```sh
pnpm build     # schrijft de site naar build/, met .br- en .gz-versies van elk bestand
pnpm preview   # bekijk de build op http://localhost:4173
```

## Deployen

De `Dockerfile` bouwt de site (en draait eerst de tests) en serveert hem met Caddy op poort 80:

- gehashte bestanden in `/_app/immutable/` worden een jaar gecachet
- `index.html` en de overige bestanden krijgen `Cache-Control: no-cache`
- Caddy levert de voorgecomprimeerde brotli- en gzip-bestanden uit

Achter Traefik:

1. Pas in `docker-compose.yml` het domein (`mob.example.com`), de entrypoint (`websecure`), de certresolver (`letsencrypt`) en het netwerk (`traefik`) aan je eigen opstelling aan.
2. Start de container:

   ```sh
   docker compose up -d --build
   ```

Zonder Docker kun je ook de inhoud van `build/` op elke statische webserver zetten.

## Footer

Naam en GitHub-link staan in `src/lib/config.ts`. Een link die op `TODO` staat of leeg is, wordt niet getoond.

## Structuur

```
src/lib/sim/        simulatie zonder DOM: fysica, ideaal pad, scoring, seedbare RNG
src/lib/render/     tekenen op het canvas
src/lib/state/      spelstatus, game loop, invoer en instellingen (runes)
src/lib/components/ Svelte-componenten
reference/          het oorspronkelijke prototype in één HTML-bestand
```
