<script lang="ts">
	import { fmtTime } from '$lib/format';
	import { mistakes, summarize } from '$lib/history';
	import { dirName } from '$lib/sim/geometry';
	import { game } from '$lib/state/game.svelte';
	import { history } from '$lib/state/history.svelte';
	import Dialog from './Dialog.svelte';
	import { focusOnMount } from './focus';

	const attempts = $derived(history.attempts);
	const summary = $derived(summarize(attempts));
	const strengths = [
		['licht', 'Licht'],
		['matig', 'Matig'],
		['stevig', 'Stevig']
	] as const;
	const METHOD = { mobje: 'MOB-je', halvewind: 'Halve wind' } as const;

	const date = (ms: number) =>
		new Date(ms).toLocaleString('nl-NL', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
</script>

<Dialog>
	{#snippet children(titleId)}
		<h1 id={titleId} class="mb-1 text-[28px] leading-[1.1] font-bold">Geschiedenis</h1>

		{#if attempts.length === 0}
			<p class="my-2 text-muted">
				Nog geen pogingen. Na elke drenkeling die je aan boord haalt, komen je tijd en fouten hier
				te staan.
			</p>
		{:else}
			<p class="my-1 text-muted">Je laatste {attempts.length} pogingen, op dit apparaat.</p>

			<h2 class="mt-3.5 mb-1.5 text-[17px] font-semibold">Beste tijd per windkracht</h2>
			<dl class="grid grid-cols-3 gap-2">
				{#each strengths as [key, label] (key)}
					{@const b = summary.best[key]}
					<div class="rounded-[10px] border border-panel-edge px-3 py-2">
						<dt class="text-[14px] text-muted">{label}</dt>
						<dd class="text-[22px] font-bold">{b ? fmtTime(b.time) : '-'}</dd>
					</div>
				{/each}
			</dl>

			<p class="mt-3">
				{#if summary.weakest}
					Het vaakst mis bij startkoers <b>{summary.weakest.course.toLowerCase()}</b>:
					{summary.weakest.flawed} van de {summary.weakest.total} pogingen had een fout.
				{:else}
					Geen fouten in je pogingen. Goed bezig.
				{/if}
			</p>

			<h2 class="mt-3.5 mb-1.5 text-[17px] font-semibold">Pogingen</h2>
			<div class="max-h-64 overflow-auto rounded-[10px] border border-panel-edge">
				<table class="w-full text-left text-[14px]">
					<thead class="sticky top-0 bg-panel text-muted">
						<tr>
							<th class="px-2.5 py-1.5 font-medium">Wanneer</th>
							<th class="px-2.5 py-1.5 font-medium">Tijd</th>
							<th class="px-2.5 py-1.5 font-medium max-[520px]:hidden">Methode</th>
							<th class="px-2.5 py-1.5 font-medium">Wind</th>
							<th class="px-2.5 py-1.5 font-medium">Fouten</th>
						</tr>
					</thead>
					<tbody>
						{#each attempts as a (a.at)}
							{@const m = mistakes(a)}
							<tr class="border-t border-panel-edge align-top">
								<td class="px-2.5 py-1.5 whitespace-nowrap">{date(a.at)}</td>
								<td class="px-2.5 py-1.5 font-semibold tabular-nums">{fmtTime(a.time)}</td>
								<td class="px-2.5 py-1.5 whitespace-nowrap max-[520px]:hidden"
									>{METHOD[a.method]}</td
								>
								<td class="px-2.5 py-1.5 whitespace-nowrap"
									>{dirName(a.windDir)}, {a.windStrength}</td
								>
								<td class={['px-2.5 py-1.5', m.length ? 'text-warn' : 'text-muted']}>
									{m.length ? m.join(', ') : 'geen'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<div class="mt-3.5 flex">
			<button
				type="button"
				class="h-[46px] flex-1 rounded-[10px] border border-ink bg-ink font-bold text-sea"
				onclick={() => (game.overlay = 'setup')}
				{@attach focusOnMount}
			>
				Terug
			</button>
		</div>
	{/snippet}
</Dialog>
