<script lang="ts">
	import { game } from '$lib/state/game.svelte';
	import { focusOnMount } from './focus';

	interface Step {
		/** data-tour van het element dat oplicht; null voor een algemene uitleg. */
		target: string | null;
		title: string;
		text: string;
	}

	const steps: Step[] = [
		{
			target: null,
			title: 'Welkom aan boord',
			text: 'Een korte rondleiding langs het scherm. Je boot ligt stil zolang je hier bent.'
		},
		{
			target: 'hud',
			title: 'Je instrumenten',
			text: 'Snelheid, koers en de hoek tussen je koers en de wind. Na het alarm zie je hier ook de afstand en peiling naar de drenkeling en de tijd.'
		},
		{
			target: 'trim',
			title: 'De schoot',
			text: 'Het groene streepje is de ideale stand, de stip is waar je schoot nu staat. Vier je verder dan het streepje, dan klappert het zeil en rem je af.'
		},
		{
			target: 'wind',
			title: 'De wind',
			text: 'De pijl wijst waar de wind heen waait. Wind uit het noorden waait dus naar de onderkant van je scherm.'
		},
		{
			target: 'rudder',
			title: 'Sturen',
			text: 'Houd ← of → vast om te sturen, of A en D. Op een telefoon houd je deze knoppen ingedrukt.'
		},
		{
			target: 'sheet',
			title: 'Schoot bedienen',
			text: '↑ trekt de schoot aan, ↓ viert hem. Spatie laat alles los zolang je hem vasthoudt: zo rem je af bij de drenkeling.'
		},
		{
			target: null,
			title: 'Man over boord',
			text: 'Op een onverwacht moment gaat er iemand overboord en loopt de tijd. Heb je "Zelf starten" gekozen, dan druk je zelf op M of de MOB-knop. Gooi meteen de reddingsboei (B) en houd de drenkeling in zicht. Vaar terug en kom langzamer dan 1,5 knoop naast de drenkeling. De groene stippellijn toont de ideale koers.'
		}
	];

	let root: HTMLDivElement | undefined = $state();
	let viewport = $state(0);

	const index = $derived(game.tutorialStep ?? 0);
	const step = $derived(steps[index]);
	const last = $derived(index === steps.length - 1);

	/** Omtrek van het uitgelichte element, relatief aan de simulatie. */
	const rect = $derived.by(() => {
		void viewport;
		if (!root || !step.target) return null;
		const el = document.querySelector(`[data-tour="${step.target}"]`);
		if (!el) return null;
		const r = el.getBoundingClientRect();
		const o = root.getBoundingClientRect();
		const pad = 6;
		return {
			left: r.left - o.left - pad,
			top: r.top - o.top - pad,
			width: r.width + pad * 2,
			height: r.height + pad * 2,
			/** Kaart onder het element als dat in de bovenste helft staat, anders erboven. */
			below: r.top + r.height / 2 - o.top < o.height / 2
		};
	});

	const next = () => (last ? game.endTutorial() : (game.tutorialStep = index + 1));
</script>

<svelte:window
	onresize={() => viewport++}
	onkeydown={(e) => {
		if (e.key === 'Escape') game.endTutorial();
	}}
/>

<div bind:this={root} class="absolute inset-0 z-20">
	{#if rect}
		<div
			class="pointer-events-none absolute rounded-xl border-[3px] border-buoy shadow-[0_0_0_9999px_var(--veil)]"
			style:left="{rect.left}px"
			style:top="{rect.top}px"
			style:width="{rect.width}px"
			style:height="{rect.height}px"
		></div>
	{:else}
		<div class="absolute inset-0 bg-veil"></div>
	{/if}

	<div
		class={[
			'absolute inset-x-0 flex justify-center px-3',
			!rect && 'inset-y-0 items-center',
			rect?.below && 'bottom-[92px]',
			rect && !rect.below && 'top-3'
		]}
	>
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="tour-title"
			aria-describedby="tour-text"
			data-card
			class="w-full max-w-[400px] rounded-[14px] border border-panel-edge bg-panel px-5 py-4 shadow-lg select-text"
		>
			<p class="text-[13px] text-muted">Stap {index + 1} van {steps.length}</p>
			<h2 id="tour-title" class="mt-0.5 text-[20px] leading-[1.15] font-bold">{step.title}</h2>
			<p id="tour-text" class="mt-1.5">{step.text}</p>
			<div class="mt-4 flex gap-2">
				<button
					type="button"
					class="h-11 flex-1 rounded-[10px] border border-panel-edge bg-transparent font-bold"
					onclick={() => game.endTutorial()}
				>
					Overslaan
				</button>
				{#key index}
					<button
						type="button"
						class="h-11 flex-1 rounded-[10px] border border-ink bg-ink font-bold text-sea"
						onclick={next}
						{@attach focusOnMount}
					>
						{last ? 'Beginnen' : 'Volgende'}
					</button>
				{/key}
			</div>
		</div>
	</div>
</div>
