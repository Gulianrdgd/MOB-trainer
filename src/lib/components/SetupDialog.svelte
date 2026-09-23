<script lang="ts">
	import { game } from '$lib/state/game.svelte';
	import { settings, type Settings } from '$lib/state/settings.svelte';
	import Dialog from './Dialog.svelte';
	import Footer from './Footer.svelte';
	import Segmented, { type Option } from './Segmented.svelte';
	import { focusOnMount } from './focus';

	const v = $derived(settings.values);

	const windDirs: Option<string>[] = [
		{ value: '315', label: 'NW' },
		{ value: '0', label: 'N' },
		{ value: '45', label: 'NO' },
		{ value: '270', label: 'W' },
		{ value: 'random', label: '?', title: 'Willekeurig' },
		{ value: '90', label: 'O' },
		{ value: '225', label: 'ZW' },
		{ value: '180', label: 'Z' },
		{ value: '135', label: 'ZO' }
	];
	const strengths: Option<Settings['windStrength']>[] = [
		{ value: 'licht', label: 'Licht, 8 kn' },
		{ value: 'matig', label: 'Matig, 12 kn' },
		{ value: 'stevig', label: 'Stevig, 18 kn' }
	];
	const courses: Option<string>[] = [
		{ value: 'random', label: 'Willekeurig' },
		{ value: '45', label: 'Aan de wind' },
		{ value: '90', label: 'Halve wind' },
		{ value: '135', label: 'Ruime wind' },
		{ value: '172', label: 'Voor de wind' }
	];
	const mobModes: Option<Settings['mobMode']>[] = [
		{ value: 'auto', label: 'Onverwacht' },
		{ value: 'manual', label: 'Zelf starten' }
	];
	const trims: Option<Settings['autoTrim']>[] = [
		{ value: 'false', label: 'Zelf trimmen' },
		{ value: 'true', label: 'Automatisch' }
	];
	const methods: Option<Settings['method']>[] = [
		{ value: 'mobje', label: 'MOB-je (via voor de wind)' },
		{ value: 'halvewind', label: 'Halve wind' }
	];
	const ideals: Option<Settings['showIdeal']>[] = [
		{ value: 'live', label: 'Tijdens het varen' },
		{ value: 'after', label: 'Pas na afloop' },
		{ value: 'off', label: 'Uit' }
	];

	const set =
		<K extends keyof Settings>(key: K) =>
		(value: Settings[K]) =>
			settings.set(key, value);
</script>

<Dialog>
	{#snippet children(titleId)}
		<h1 id={titleId} class="mb-1 text-[28px] leading-[1.1] font-bold">Man over boord oefenen</h1>
		<p class="my-1 max-w-[62ch] text-muted">
			Kies de omstandigheden. Zodra de drenkeling te water gaat, loopt de tijd. Je haalt hem op door
			langzamer dan 1,5 knoop naast hem te komen.
		</p>

		<Segmented
			label="Wind uit"
			options={windDirs}
			value={v.windDir}
			onchange={set('windDir')}
			compass
		/>
		<Segmented
			label="Windkracht"
			options={strengths}
			value={v.windStrength}
			onchange={set('windStrength')}
		/>
		<Segmented
			label="Koers op het moment van het alarm"
			options={courses}
			value={v.startCourse}
			onchange={set('startCourse')}
		/>
		<Segmented label="Alarm" options={mobModes} value={v.mobMode} onchange={set('mobMode')} />
		<Segmented label="Schoot" options={trims} value={v.autoTrim} onchange={set('autoTrim')} />
		<Segmented
			label="Methode voor de ideale koers"
			options={methods}
			value={v.method}
			onchange={set('method')}
		/>
		<Segmented
			label="Ideale koers tonen"
			options={ideals}
			value={v.showIdeal}
			onchange={set('showIdeal')}
		/>

		<button
			type="button"
			class="mt-4 h-[52px] w-full rounded-xl border-0 bg-buoy text-[19px] font-bold text-white"
			onclick={() => game.newRun(false)}
			{@attach focusOnMount}
		>
			Start
		</button>

		<div
			class="mt-3 text-[15px] text-muted [&_kbd]:rounded [&_kbd]:border [&_kbd]:border-panel-edge [&_kbd]:px-1 [&_kbd]:font-sans [&_kbd]:font-semibold [&_kbd]:text-ink"
		>
			<p class="my-1 max-w-[62ch]">
				<kbd>←</kbd> <kbd>→</kbd> roer. <kbd>↑</kbd> schoot aantrekken, <kbd>↓</kbd> vieren,
				<kbd>spatie</kbd> alles los (zolang je hem vasthoudt). <kbd>M</kbd> man over boord,
				<kbd>P</kbd> pauze, <kbd>R</kbd> instellingen. Op een telefoon gebruik je de knoppen onderin.
			</p>
			<p class="my-1 max-w-[62ch]">
				Het groene streepje bij Schoot is de ideale stand. Vier je verder dan dat, dan klappert het
				zeil en verlies je vaart. Zo rem je af bij de drenkeling. Gijp je met de schoot ver uit bij
				matige of stevige wind, dan krijg je een klapgijp.
			</p>
		</div>

		<Footer />
	{/snippet}
</Dialog>
