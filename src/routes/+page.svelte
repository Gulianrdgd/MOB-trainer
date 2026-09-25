<script lang="ts">
	import Controls from '$lib/components/Controls.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Hud from '$lib/components/Hud.svelte';
	import HistoryDialog from '$lib/components/HistoryDialog.svelte';
	import PauseDialog from '$lib/components/PauseDialog.svelte';
	import ResultDialog from '$lib/components/ResultDialog.svelte';
	import SetupDialog from '$lib/components/SetupDialog.svelte';
	import Simulator from '$lib/components/Simulator.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import Tutorial from '$lib/components/Tutorial.svelte';
	import WindCompass from '$lib/components/WindCompass.svelte';
	import { game } from '$lib/state/game.svelte';
	import { history } from '$lib/state/history.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { fromSearchParams } from '$lib/share';
	import { site } from '$lib/config';
	import { onMount } from 'svelte';

	onMount(() => {
		settings.load();
		history.load();
		const shared = fromSearchParams(new URLSearchParams(location.search));
		if (shared) game.loadShared(shared);
	});

	const small = 'panel h-9 min-w-10 rounded-lg px-2.5 font-semibold';

	const title = 'Man-over-boord trainer: MOB oefenen voor je zeilexamen';
	const description =
		'Oefen gratis de man-over-boordmanoeuvre in een zeilsimulator in je browser, met het MOB-je of de halve-windmethode. Na afloop zie je je spoor naast de ideale koers.';
	const canonical = `${site.url}/`;
	const image = `${site.url}/icons/icon-512.png`;

	// Een JSON-LD-blok wordt niet uitgevoerd, dus de CSP laat het door.
	const jsonLd =
		`<script type="application/ld+json">${JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'WebApplication',
			name: 'Man-over-boord trainer',
			url: canonical,
			description,
			inLanguage: 'nl',
			applicationCategory: 'EducationalApplication',
			operatingSystem: 'Any',
			isAccessibleForFree: true,
			offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
			author: { '@type': 'Person', name: site.author, url: site.githubUrl }
		})}</` + `script>`;
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<!-- Gedeelde links (?wind=...) zijn dezelfde pagina voor zoekmachines. -->
	<link rel="canonical" href={canonical} />

	<meta property="og:type" content="website" />
	<meta property="og:locale" content="nl_NL" />
	<meta property="og:site_name" content="MOB-trainer" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={image} />
	<meta property="og:image:width" content="512" />
	<meta property="og:image:height" content="512" />
	<meta name="twitter:card" content="summary" />

	<!-- eslint-disable-next-line svelte/no-at-html-tags -- vaste inhoud, geen gebruikersinvoer -->
	{@html jsonLd}
</svelte:head>

<svelte:window
	onkeydown={(e) => game.onKeyDown(e)}
	onkeyup={(e) => game.onKeyUp(e)}
	onblur={() => game.releaseAll()}
/>

<main class="flex h-full flex-col">
	<div class="relative min-h-0 flex-1 overflow-hidden">
		<Simulator />
		<Hud hud={game.hud} />

		<div class="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5">
			<WindCompass wind={game.wind} />
			<div class="flex gap-1.5">
				<button type="button" class={small} onclick={() => game.openSetup()}>Instellingen</button>
				<button type="button" class={small} aria-label="Pauze" onclick={() => game.togglePause()}>
					II
				</button>
				<button
					type="button"
					class={small}
					aria-label="Simulatiesnelheid"
					onclick={() => settings.set('timeScale', settings.values.timeScale === 1 ? 2 : 1)}
				>
					{settings.values.timeScale}×
				</button>
			</div>
		</div>

		<Controls />
		<Toast {...game.toast} />

		{#if game.overlay === 'setup'}
			<SetupDialog />
		{:else if game.overlay === 'result' && game.result}
			<ResultDialog result={game.result} />
		{:else if game.overlay === 'history'}
			<HistoryDialog />
		{:else if game.overlay === 'track'}
			<button
				type="button"
				class="absolute bottom-[90px] left-1/2 z-[4] h-11 -translate-x-1/2 rounded-[10px] border-0 bg-ink px-[18px] font-bold text-sea"
				onclick={() => (game.overlay = 'result')}
			>
				Terug naar resultaat
			</button>
		{/if}
		{#if game.showPaused}
			<PauseDialog />
		{/if}
		{#if game.tutorialStep !== null}
			<Tutorial />
		{/if}
	</div>
	<Footer />
</main>
