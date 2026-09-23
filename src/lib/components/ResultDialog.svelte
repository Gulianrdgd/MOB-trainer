<script lang="ts">
	import { fmtTime } from '$lib/format';
	import type { Result } from '$lib/sim/scoring';
	import { game } from '$lib/state/game.svelte';
	import Dialog from './Dialog.svelte';
	import ShareButton from './ShareButton.svelte';
	import { focusOnMount } from './focus';

	let { result }: { result: Result } = $props();

	const title = $derived(`Aan boord in ${fmtTime(result.time)}`);
	const scenario = $derived(game.currentScenario());
	const rowBtn = 'h-[46px] min-w-[130px] flex-1 rounded-[10px] border font-bold';
	const secondary = `${rowBtn} border-panel-edge bg-transparent`;
	const primary = `${rowBtn} border-ink bg-ink text-sea`;
</script>

<Dialog>
	{#snippet children(titleId)}
		<h1 id={titleId} class="mb-1 text-[28px] leading-[1.1] font-bold">{title}</h1>
		<dl class="my-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-[3px]">
			{#each result.stats as [label, value] (label)}
				<dt class="text-muted">{label}</dt>
				<dd class="font-semibold tabular-nums">{value}</dd>
			{/each}
		</dl>
		{#each result.feedback as fb (fb.text)}
			<p
				class={[
					'my-1.5 max-w-[62ch] border-l-[3px] pl-3',
					fb.kind === 'good' ? 'border-good' : 'border-warn'
				]}
			>
				{fb.text}
			</p>
		{/each}
		<div class="mt-3.5 flex flex-wrap gap-2">
			<button
				type="button"
				class={primary}
				onclick={() => game.newRun(false)}
				{@attach focusOnMount}
			>
				Nog een keer
			</button>
			<button type="button" class={secondary} onclick={() => game.newRun(true)}>
				Zelfde situatie
			</button>
		</div>
		<div class="mt-3.5 flex flex-wrap gap-2">
			<button type="button" class={secondary} onclick={() => (game.overlay = 'track')}>
				Bekijk je spoor
			</button>
			<button type="button" class={secondary} onclick={() => game.openSetup()}>Instellingen</button>
		</div>
		{#if scenario}
			<div class="mt-2 flex flex-wrap gap-2">
				<ShareButton {scenario} class={secondary} />
			</div>
		{/if}
	{/snippet}
</Dialog>
