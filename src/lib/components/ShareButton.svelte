<script lang="ts">
	import { courseName, dirName } from '$lib/sim/geometry';
	import { toSearchParams, type SharedScenario } from '$lib/share';
	import { game } from '$lib/state/game.svelte';

	let { scenario, class: className }: { scenario: SharedScenario; class: string } = $props();

	/** Link die niet gekopieerd kon worden: tonen zodat je hem zelf kunt kopiëren. */
	let manual = $state<string | null>(null);

	const url = $derived(`${location.origin}${location.pathname}?${toSearchParams(scenario)}`);

	async function share() {
		const text = `Oefen deze man-over-boordsituatie: wind uit ${dirName(scenario.windDir)}, ${courseName(scenario.startCourse).toLowerCase()}.`;
		if (navigator.share) {
			try {
				await navigator.share({ title: 'Man-over-boord trainer', text, url });
				return;
			} catch (e) {
				if (e instanceof DOMException && e.name === 'AbortError') return;
			}
		}
		try {
			await navigator.clipboard.writeText(url);
			game.showToast('Link gekopieerd');
		} catch {
			manual = url;
		}
	}
</script>

<button type="button" class={className} onclick={share}>Deel deze situatie</button>
{#if manual}
	<label class="mt-2 block w-full text-[14px] text-muted">
		Kopieer de link:
		<input
			readonly
			value={manual}
			class="mt-1 block w-full rounded-lg border border-panel-edge bg-transparent px-2 py-1.5 text-ink"
			onfocus={(e) => e.currentTarget.select()}
		/>
	</label>
{/if}
