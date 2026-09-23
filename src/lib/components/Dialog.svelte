<script lang="ts">
	import type { Snippet } from 'svelte';

	let { narrow = false, children }: { narrow?: boolean; children: Snippet<[string]> } = $props();

	const titleId = $props.id();
</script>

<!-- Veil over het canvas met een kaart in het midden. data-card: pijltjes en spatie werken hier gewoon. -->
<div class="absolute inset-0 z-10 flex items-center justify-center bg-veil p-3">
	<div
		role="dialog"
		aria-modal="true"
		aria-labelledby={titleId}
		data-card
		class={[
			'max-h-full w-full overflow-auto rounded-[14px] border border-panel-edge bg-panel px-5 py-[18px] select-text',
			narrow ? 'max-w-[320px] text-center' : 'max-w-[560px]'
		]}
	>
		{@render children(titleId)}
	</div>
</div>
