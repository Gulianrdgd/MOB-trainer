<script lang="ts">
	import { game } from '$lib/state/game.svelte';
	import HoldButton from './HoldButton.svelte';

	const showMob = $derived(game.running && game.runManualMob && !game.hasMob);
</script>

<div
	class="pointer-events-none absolute bottom-[78px] left-1/2 -translate-x-1/2 text-[13px] whitespace-nowrap text-muted touch:hidden"
>
	←/→ roer, ↑ aantrekken, ↓ vieren, spatie alles los, M man over boord, P pauze
</div>

<div
	class="pointer-events-none absolute right-2.5 bottom-2.5 left-2.5 flex items-end justify-between gap-2"
>
	<div class="pointer-events-auto flex gap-2 max-[520px]:gap-1.5">
		<HoldButton bind:held={game.hold.left}
			>◀<small class="text-[12px] font-medium opacity-75">roer</small></HoldButton
		>
		<HoldButton bind:held={game.hold.right}
			>▶<small class="text-[12px] font-medium opacity-75">roer</small></HoldButton
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
	<div class="pointer-events-auto flex gap-2 max-[520px]:gap-1.5">
		<HoldButton bind:held={game.hold.in} disabled={game.runAutoTrim}
			>▲<small class="text-[12px] font-medium opacity-75">aantrekken</small></HoldButton
		>
		<HoldButton bind:held={game.hold.out} disabled={game.runAutoTrim}
			>▼<small class="text-[12px] font-medium opacity-75">vieren</small></HoldButton
		>
		<HoldButton bind:held={game.hold.loose}
			>Los<small class="text-[12px] font-medium opacity-75">alles</small></HoldButton
		>
	</div>
</div>
