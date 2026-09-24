<script lang="ts">
	import { courseName, dirName } from '$lib/sim/geometry';
	import { toSearchParams, type SharedScenario } from '$lib/share';
	import { onDestroy } from 'svelte';

	let { scenario, class: className }: { scenario: SharedScenario; class: string } = $props();

	/** Wat er na de klik gebeurde: gedeeld via het deelmenu, gekopieerd, of zelf kopiëren. */
	let outcome = $state<'shared' | 'copied' | 'manual' | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;
	onDestroy(() => clearTimeout(timer));

	const url = $derived(`${location.origin}${location.pathname}?${toSearchParams(scenario)}`);

	const label = $derived(
		outcome === 'copied'
			? 'Link gekopieerd'
			: outcome === 'shared'
				? 'Gedeeld'
				: 'Deel deze situatie'
	);

	function done(o: 'shared' | 'copied') {
		outcome = o;
		clearTimeout(timer);
		// knoptekst na een paar seconden terug; de link blijft staan
		timer = setTimeout(() => {
			if (outcome === o) outcome = o === 'copied' ? 'manual' : null;
		}, 2500);
	}

	async function share() {
		const text = `Oefen deze man-over-boordsituatie: wind uit ${dirName(scenario.windDir)}, ${courseName(scenario.startCourse).toLowerCase()}.`;
		if (navigator.share) {
			try {
				await navigator.share({ title: 'Man-over-boord trainer', text, url });
				return done('shared');
			} catch (e) {
				if (e instanceof DOMException && e.name === 'AbortError') return;
			}
		}
		try {
			await navigator.clipboard.writeText(url);
			done('copied');
		} catch {
			// geen klembord (bijvoorbeeld via http): link tonen om zelf te kopiëren
			outcome = 'manual';
		}
	}
</script>

<button type="button" class={className} onclick={share}>{label}</button>
<p class="sr-only" role="status">{outcome === 'copied' ? 'Link gekopieerd' : ''}</p>
{#if outcome === 'copied' || outcome === 'manual'}
	<label class="mt-1 block w-full text-[14px] text-muted">
		{outcome === 'copied' ? 'Gekopieerd, plak hem waar je wilt:' : 'Kopieer de link:'}
		<input
			readonly
			value={url}
			class="mt-1 block w-full rounded-lg border border-panel-edge bg-transparent px-2 py-1.5 text-ink"
			onfocus={(e) => e.currentTarget.select()}
		/>
	</label>
{/if}
