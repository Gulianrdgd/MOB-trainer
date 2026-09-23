<script lang="ts">
	import type { HudView } from '$lib/state/game.svelte';

	let { hud }: { hud: HudView } = $props();

	const rows = $derived<[string, string, boolean][]>([
		['Snelheid', hud.speed, false],
		['Koers', hud.course, false],
		['Windhoek', hud.twa, false],
		['Afstand', hud.dist, false],
		['Peiling', hud.brg, false],
		['Tijd', hud.time, false],
		['Boei', hud.buoy, hud.buoyWarn],
		['Zicht', hud.sight, hud.sightWarn]
	]);
</script>

<div
	data-tour="hud"
	class="absolute top-2.5 left-2.5 w-[196px] panel px-3 py-2.5 max-[520px]:w-[168px] max-[520px]:px-2.5 max-[520px]:py-2"
>
	<div
		class={['text-lg leading-[1.15] font-bold max-[520px]:text-[16px]', hud.alarm && 'text-buoy']}
		aria-live="polite"
	>
		{hud.status}
	</div>
	<dl
		class="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-px text-[15px] max-[520px]:text-[14px]"
	>
		{#each rows as [label, value, warn] (label)}
			<dt class="text-muted">{label}</dt>
			<dd class={['text-right font-semibold tabular-nums', warn && 'text-warn']}>{value}</dd>
		{/each}
	</dl>
	<div class="mt-1.5 text-[15px] font-semibold">{hud.koers}</div>
	<div class="mt-2" data-tour="trim">
		<div class="flex justify-between text-[14px] text-muted">
			<span>Schoot</span><span class="font-semibold text-warn">{hud.luff}</span>
		</div>
		<div class="relative mt-[3px] h-2.5 rounded-[5px] bg-sea-line" aria-hidden="true">
			<div
				class="absolute -top-[3px] h-4 w-[3px] -translate-x-px rounded-sm bg-good"
				style:left="{hud.trimOpt}%"
			></div>
			<div
				class="absolute top-px size-2 -translate-x-1 rounded-full bg-ink"
				style:left="{hud.trimCur}%"
			></div>
		</div>
		<div class="mt-px flex justify-between text-[12px] text-muted">
			<span>strak</span><span>los</span>
		</div>
	</div>
</div>
