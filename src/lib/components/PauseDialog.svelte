<script lang="ts">
	import { game } from '$lib/state/game.svelte';
	import Dialog from './Dialog.svelte';
	import { focusOnMount } from './focus';
</script>

<Dialog narrow>
	{#snippet children(titleId)}
		<h1 id={titleId} class="mb-1 text-[28px] leading-[1.1] font-bold">Pauze</h1>
		<div class="mt-3.5 flex">
			<button
				type="button"
				class="h-[46px] flex-1 rounded-[10px] border border-ink bg-ink font-bold text-sea"
				onclick={() => game.togglePause()}
				{@attach focusOnMount}
			>
				Verder varen
			</button>
		</div>
	{/snippet}
</Dialog>
