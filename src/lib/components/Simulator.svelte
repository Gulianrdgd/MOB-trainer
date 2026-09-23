<script lang="ts">
	import { game } from '$lib/state/game.svelte';
</script>

<canvas
	class="absolute inset-0 block size-full touch-none"
	aria-label="Zeilsimulator, bovenaanzicht"
	{@attach (canvas) => game.attach(canvas)}
></canvas>
