<script lang="ts">
	import Controls from '$lib/components/Controls.svelte';
	import Hud from '$lib/components/Hud.svelte';
	import PauseDialog from '$lib/components/PauseDialog.svelte';
	import ResultDialog from '$lib/components/ResultDialog.svelte';
	import SetupDialog from '$lib/components/SetupDialog.svelte';
	import Simulator from '$lib/components/Simulator.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import WindCompass from '$lib/components/WindCompass.svelte';
	import { game } from '$lib/state/game.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { fromSearchParams } from '$lib/share';
	import { onMount } from 'svelte';

	onMount(() => {
		settings.load();
		const shared = fromSearchParams(new URLSearchParams(location.search));
		if (shared) game.loadShared(shared);
	});

	const small = 'panel h-9 min-w-10 rounded-lg px-2.5 font-semibold';
</script>

<svelte:head>
	<title>Man-over-boord trainer</title>
	<meta
		name="description"
		content="Oefen de man-over-boordmanoeuvre in een eenvoudige zeilsimulator, met het MOB-je of de halve-windmethode."
	/>
</svelte:head>

<svelte:window
	onkeydown={(e) => game.onKeyDown(e)}
	onkeyup={(e) => game.onKeyUp(e)}
	onblur={() => game.releaseAll()}
/>

<main class="contents">
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
</main>
