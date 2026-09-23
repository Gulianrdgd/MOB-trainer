<script lang="ts">
	import { dirName } from '$lib/sim/geometry';
	import type { Wind } from '$lib/sim/types';

	let { wind }: { wind: Wind | null } = $props();
</script>

<div class="w-[122px] panel px-2.5 py-2 text-center max-[520px]:w-[100px] max-[520px]:p-1.5">
	<svg
		viewBox="-50 -50 100 100"
		aria-hidden="true"
		class="mx-auto block size-24 max-[520px]:size-[76px]"
	>
		<circle r="44" fill="none" class="stroke-panel-edge" stroke-width="2" />
		<text x="0" y="-32" text-anchor="middle" font-size="12" font-weight="700" class="fill-ink"
			>N</text
		>
		<text x="35" y="4" text-anchor="middle" font-size="11" class="fill-muted">O</text>
		<text x="0" y="41" text-anchor="middle" font-size="11" class="fill-muted">Z</text>
		<text x="-35" y="4" text-anchor="middle" font-size="11" class="fill-muted">W</text>
		<g transform="rotate({wind?.dir ?? 0})">
			<line
				x1="0"
				y1="-26"
				x2="0"
				y2="18"
				class="stroke-buoy"
				stroke-width="5"
				stroke-linecap="round"
			/>
			<path d="M-10 12 L0 28 L10 12 Z" class="fill-buoy" />
		</g>
	</svg>
	<div class="mt-0.5 text-[15px] font-semibold">
		{wind ? `${dirName(wind.dir)}, ${wind.kn} kn` : 'Wind'}
	</div>
</div>
