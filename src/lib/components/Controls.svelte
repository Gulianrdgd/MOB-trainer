<script lang="ts">
	import { game } from '$lib/state/game.svelte';
	import HoldButton from './HoldButton.svelte';

	const showMob = $derived(game.running && game.runManualMob && !game.hasMob);
	const showBuoy = $derived(game.running && game.hasMob && !game.hasBuoy && !game.finished);
</script>

{#if game.hint}
	<div
		role="status"
		class={[
			'pointer-events-none absolute bottom-[78px] left-1/2 max-w-[calc(100%-24px)] -translate-x-1/2 panel px-3 py-1.5 text-center text-[16px] font-semibold max-[520px]:bottom-[74px]',
			showBuoy && 'max-[520px]:bottom-[140px]'
		]}
	>
		{game.hint}
	</div>
{:else}
	<div
		class="pointer-events-none absolute bottom-[78px] left-1/2 -translate-x-1/2 text-[13px] whitespace-nowrap text-muted touch:hidden"
	>
		←/→ roer, ↑ aantrekken, ↓ vieren, spatie alles los, M man over boord, B boei, P pauze
	</div>
{/if}

<div
	class="pointer-events-none absolute right-2.5 bottom-2.5 left-2.5 flex items-end justify-between gap-2"
>
	<div data-tour="rudder" class="pointer-events-auto flex gap-2 max-[520px]:gap-1.5">
		<HoldButton bind:held={game.hold.left}
			><kbd class="keycap text-[16px]">←</kbd><small class="text-[12px] font-medium opacity-75"
				>roer</small
			></HoldButton
		>
		<HoldButton bind:held={game.hold.right}
			><kbd class="keycap text-[16px]">→</kbd><small class="text-[12px] font-medium opacity-75"
				>roer</small
			></HoldButton
		>
	</div>
	{#if showMob}
		<button
			type="button"
			class="pointer-events-auto flex h-[58px] min-w-[84px] items-center justify-center rounded-xl bg-buoy px-3 text-[15px] font-bold text-white max-[520px]:h-[54px]"
			onclick={() => game.triggerMob()}
		>
			MOB!
		</button>
	{/if}
	{#if showBuoy}
		<button
			type="button"
			class="pointer-events-auto flex h-[58px] min-w-[84px] flex-col items-center justify-center rounded-xl bg-buoy px-3 text-[15px] leading-[1.05] font-bold text-white max-[520px]:absolute max-[520px]:bottom-[64px] max-[520px]:left-1/2 max-[520px]:h-[54px] max-[520px]:-translate-x-1/2"
			onclick={() => game.throwBuoy()}
		>
			<kbd class="keycap text-[16px]">B</kbd><small class="text-[12px] font-medium">boei</small>
		</button>
	{/if}
	<div data-tour="sheet" class="pointer-events-auto flex gap-2 max-[520px]:gap-1.5">
		<HoldButton bind:held={game.hold.in} disabled={game.runAutoTrim}
			><kbd class="keycap text-[16px]">↑</kbd><small class="text-[12px] font-medium opacity-75"
				>aantrekken</small
			></HoldButton
		>
		<HoldButton bind:held={game.hold.out} disabled={game.runAutoTrim}
			><kbd class="keycap text-[16px]">↓</kbd><small class="text-[12px] font-medium opacity-75"
				>vieren</small
			></HoldButton
		>
		<HoldButton bind:held={game.hold.loose}
			><kbd class="keycap text-[12px]">spatie</kbd><small class="text-[12px] font-medium opacity-75"
				>alles los</small
			></HoldButton
		>
	</div>
</div>
