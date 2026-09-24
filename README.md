# Man-over-boord trainer
Wat doe je als je een zeil examen hebt en je nog thuis wilt oefenen. Je vibecoded een MOB simulator natuurlijk! 

Het heeft mij veel geholpen, misschien helpt het jou ook. Als er fouten zijn laat me dat vooral weten via mijn email of via een github issue. 

Gebouwd met SvelteKit, Svelte 5 en Tailwind CSS v4. 

## Wat zit erin

- MOB-je en halve-windmethode, met de ideale koers als groene stippellijn
- terugkijken na afloop: kaart met je spoor, tijdlijn en snelheidsgrafiek
- reddingsboei gooien (B) en een zicht-indicator, beide in de feedback
- leerstand met hints per fase, en vlagen en windschiftingen als optie
- situatie delen via een link (wind, windkracht, startkoers, methode, seed, vlagen)
- geschiedenis van de laatste 50 pogingen, alleen in de browser (localStorage)
- rondleiding bij de eerste start

## Lokaal draaien

Je hebt [Deno](https://deno.com) 2 nodig.

```sh
deno install
deno task dev
```

Open daarna http://localhost:5173.

## Testen

```sh
deno task test     # Vitest: unit tests, autopiloot-regressietest en pariteit met het prototype
deno task check    # svelte-check en TypeScript
deno task lint     # Prettier en ESLint
```

De pariteitstest draait de simulatiecode uit `reference/man-over-boord.html` naast de nieuwe code en eist na elke stap exact dezelfde toestand. Laat dat bestand daarom staan.

## Builden

```sh
deno task build    # schrijft de site naar build/, met .br- en .gz-versies van elk bestand
deno task preview  # bekijk de build op http://localhost:4173
```

## Deployen

Bij elke push naar `main` bouwt GitHub Actions (`.github/workflows/docker.yml`) het image voor amd64 en arm64 en zet het in GitHub Container Registry:

- `ghcr.io/gulianrdgd/mob-trainer:latest` (laatste versie van `main`)
- `ghcr.io/gulianrdgd/mob-trainer:sha-<commit>` (elke commit)
- `ghcr.io/gulianrdgd/mob-trainer:1.2.3` bij een git-tag `v1.2.3`

De tests draaien tijdens het bouwen; faalt er een, dan komt er geen nieuw image. Pull requests worden alleen gebouwd, niet gepubliceerd.

In het image serveert Caddy de site op poort 80:

- gehashte bestanden in `/_app/immutable/` worden een jaar gecachet
- `index.html` en de overige bestanden krijgen `Cache-Control: no-cache`
- Caddy levert de voorgecomprimeerde brotli- en gzip-bestanden uit

Achter Traefik:

1. Pas in `docker-compose.yml` het domein (`mob.example.com`), de entrypoint (`websecure`), de certresolver (`letsencrypt`) en het netwerk (`traefik`) aan je eigen opstelling aan.
2. Start of werk bij:

   ```sh
   docker compose pull && docker compose up -d
   ```

Is de repository privé, dan is het image dat ook: log op de server eenmalig in met een GitHub-token met `read:packages` (`docker login ghcr.io`), of zet het package op GitHub op openbaar.

Zelf bouwen kan ook: `docker build -t mob-trainer .`

Zonder Docker kun je ook de inhoud van `build/` op elke statische webserver zetten. Zorg dan dat `service-worker.js` en `index.html` niet lang gecachet worden, anders zien bezoekers updates pas laat.

## Offline en installeren

Na het eerste bezoek zet de service worker de hele app in de cache; daarna werkt hij zonder verbinding, ook met een gedeelde link. Op een telefoon kun je hem via "Zet op beginscherm" als app installeren. De iconen staan in `static/icons/`; de PNG's zijn gemaakt van `icon.svg` en `maskable.svg`.

## Structuur

```
src/lib/sim/        simulatie zonder DOM: fysica, ideaal pad, scoring, seedbare RNG
src/lib/render/     tekenen op het canvas
src/lib/state/      spelstatus, game loop, invoer en instellingen (runes)
src/lib/components/ Svelte-componenten
reference/          het oorspronkelijke prototype in één HTML-bestand
```
