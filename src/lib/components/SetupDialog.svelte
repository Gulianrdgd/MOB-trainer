<script lang="ts">
	import { dirName } from '$lib/sim/geometry';
	import { game } from '$lib/state/game.svelte';
	import { settings, type Settings } from '$lib/state/settings.svelte';
	import Dialog from './Dialog.svelte';
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
	const windModes: Option<Settings['variableWind']>[] = [
		{ value: 'off', label: 'Constant' },
		{ value: 'on', label: 'Vlagen en schiften' }
	];
	const hintOptions: Option<Settings['hints']>[] = [
		{ value: 'off', label: 'Uit' },
		{ value: 'on', label: 'Hints tonen' }
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

<Dialog wide>
	{#snippet children(titleId)}
		<h1 id={titleId} class="text-[28px] leading-[1.1] font-bold">Man over boord oefenen</h1>
		<p class="mt-1.5 max-w-[62ch]">
			Oefen de man-over-boordmanoeuvre voordat je hem op het water vaart. Op een onverwacht moment
			gaat er iemand overboord: vaar terug en kom langzamer dan 1,5 knoop naast de drenkeling. Na
			afloop zie je je spoor naast de ideale koers.
		</p>

		<div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_auto_auto]">
			<button
				type="button"
				class="col-span-2 h-[52px] rounded-xl border-0 bg-buoy px-6 text-[19px] font-bold text-white sm:col-span-1"
				onclick={() => game.newRun(false)}
				{@attach focusOnMount}
			>
				Start
			</button>
			<button
				type="button"
				class="h-[52px] rounded-xl border border-panel-edge px-4 font-bold"
				onclick={() => {
					game.newRun(false);
					game.startTutorial();
				}}
			>
				Rondleiding
			</button>
			<button
				type="button"
				class="h-[52px] rounded-xl border border-panel-edge px-4 font-bold"
				onclick={() => (game.overlay = 'history')}
			>
				Geschiedenis
			</button>
		</div>

		{#if game.shared}
			<p class="mt-3 rounded-[10px] border border-buoy px-3 py-2" role="status">
				Gedeelde situatie: wind uit {dirName(game.shared.windDir)}, startkoers
				{game.shared.startCourse}° van de wind. Druk op Start om hem te varen.
			</p>
		{/if}

		<div class="mt-4 grid gap-3 md:grid-cols-2">
			<fieldset
				class="flex flex-col gap-3 rounded-[10px] border border-panel-edge px-3.5 pt-1 pb-3.5"
			>
				<legend class="px-1 text-[17px] font-bold">Wind</legend>
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
					label="Windverloop"
					options={windModes}
					value={v.variableWind}
					onchange={set('variableWind')}
				/>
			</fieldset>

			<fieldset
				class="flex flex-col gap-3 rounded-[10px] border border-panel-edge px-3.5 pt-1 pb-3.5"
			>
				<legend class="px-1 text-[17px] font-bold">Oefening</legend>
				<Segmented
					label="Koers op het moment van het alarm"
					options={courses}
					value={v.startCourse}
					onchange={set('startCourse')}
				/>
				<Segmented label="Alarm" options={mobModes} value={v.mobMode} onchange={set('mobMode')} />
				<Segmented
					label="Methode voor de ideale koers"
					options={methods}
					value={v.method}
					onchange={set('method')}
				/>
			</fieldset>

			<fieldset
				class="flex flex-wrap gap-x-6 gap-y-3 rounded-[10px] border border-panel-edge px-3.5 pt-1 pb-3.5 md:col-span-2"
			>
				<legend class="px-1 text-[17px] font-bold">Hulp tijdens het varen</legend>
				<Segmented label="Schoot" options={trims} value={v.autoTrim} onchange={set('autoTrim')} />
				<Segmented
					label="Ideale koers tonen"
					options={ideals}
					value={v.showIdeal}
					onchange={set('showIdeal')}
				/>
				<Segmented
					label="Leerstand"
					options={hintOptions}
					value={v.hints}
					onchange={set('hints')}
				/>
			</fieldset>
		</div>

		<details class="mt-3 rounded-[10px] border border-panel-edge px-3.5 py-2.5">
			<summary class="cursor-pointer font-bold">Bediening en uitleg</summary>
			<div
				class="mt-2 text-[15px] text-muted [&_kbd]:rounded [&_kbd]:border [&_kbd]:border-panel-edge [&_kbd]:px-1 [&_kbd]:font-sans [&_kbd]:font-semibold [&_kbd]:text-ink"
			>
				<p class="my-1 max-w-[62ch]">
					<kbd>←</kbd> <kbd>→</kbd> roer. <kbd>↑</kbd> schoot aantrekken, <kbd>↓</kbd> vieren,
					<kbd>spatie</kbd> alles los (zolang je hem vasthoudt). <kbd>M</kbd> man over boord,
					<kbd>B</kbd> reddingsboei gooien, <kbd>P</kbd> pauze, <kbd>R</kbd> instellingen. Op een telefoon
					gebruik je de knoppen onderin.
				</p>
				<p class="my-1 max-w-[62ch]">
					Het groene streepje bij Schoot is de ideale stand. Vier je verder dan dat, dan klappert
					het zeil en verlies je vaart. Zo rem je af bij de drenkeling. Haal de drenkeling op aan
					loefzijde, bij de want. Gijp je met de schoot ver uit bij matige of stevige wind, dan
					krijg je een klapgijp.
				</p>
			</div>
		</details>
	{/snippet}
</Dialog>
