/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

// Offline aan de waterkant: de hele (kleine, statische) app gaat bij installatie in de cache.
import { build, files, prerendered, version } from '$service-worker';

const self = globalThis.self as unknown as ServiceWorkerGlobalScope;

const CACHE = `mob-trainer-${version}`;
const ASSETS = [...build, ...files, ...prerendered];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
			await self.clients.claim();
		})()
	);
});

self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== self.location.origin) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);

			// gebouwde bestanden en static/ veranderen niet binnen een versie
			if (ASSETS.includes(url.pathname) && req.mode !== 'navigate') {
				const hit = await cache.match(url.pathname);
				if (hit) return hit;
			}

			// de rest: eerst het netwerk, offline uit de cache.
			// Een gedeelde link (?wind=...) valt terug op de voorgerenderde pagina.
			try {
				const res = await fetch(req);
				if (res.status === 200 && ASSETS.includes(url.pathname))
					cache.put(url.pathname, res.clone());
				return res;
			} catch (err) {
				const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
				if (hit) return hit;
				throw err;
			}
		})()
	);
});
