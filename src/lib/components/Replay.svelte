<script lang="ts" module>
	import type { ReplaySample, TrackMark, Vec } from '$lib/sim/types';

	export interface ReplayData {
		samples: ReplaySample[];
		marks: TrackMark[];
		/** Ideaal pad relatief ten opzichte van de drenkeling. */
		ideal: Vec[];
		windDir: number;
	}
</script>

<script lang="ts">
	import { fmt, fmtTime } from '$lib/format';
	import { KN, PICK_V } from '$lib/sim/constants';
	import { angDiff, courseName, dirName } from '$lib/sim/geometry';
	import { onDestroy } from 'svelte';

	let { data }: { data: ReplayData } = $props();

	const MARK_LABEL = { tack: 'Overstag', gybe: 'Gijp', crash: 'Klapgijp' } as const;

	const samples = $derived(data.samples);
	const t0 = $derived(samples[0].t);
	/** Duur tot het oppakken, naar boven afgerond op de stap van de slider (0,1 s). */
	const duration = $derived(Math.ceil((samples[samples.length - 1].t - t0) * 10) / 10);
	const marks = $derived(data.marks.filter((m) => m.t >= t0 && m.t <= t0 + duration + 1e-9));

	let time = $state(0);
	let playing = $state(false);

	/** Laatste monster op of voor tijd t (seconden na het alarm). */
	const current = $derived.by(() => {
		const t = t0 + time;
		let lo = 0;
		let hi = samples.length - 1;
		while (lo < hi) {
			const mid = (lo + hi + 1) >> 1;
			if (samples[mid].t <= t) lo = mid;
			else hi = mid - 1;
		}
		return { i: lo, s: samples[lo] };
	});

	/* ---------- kaart (wereldcoördinaten in meters, noord boven) ---------- */

	const bounds = $derived.by(() => {
		let x0 = Infinity;
		let x1 = -Infinity;
		let y0 = Infinity;
		let y1 = -Infinity;
		const add = (x: number, y: number) => {
			x0 = Math.min(x0, x);
			x1 = Math.max(x1, x);
			y0 = Math.min(y0, y);
			y1 = Math.max(y1, y);
		};
		for (const s of samples) add(s.x, s.y);
		const m = samples[0];
		for (const p of data.ideal) add(m.mx + p.x, m.my + p.y);
		const pad = Math.max(8, 0.08 * Math.max(x1 - x0, y1 - y0));
		return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad };
	});
	/** Maat voor symbolen, zodat ze bij elke zoom even groot lijken. */
	const unit = $derived(Math.max(bounds.w, bounds.h) / 100);

	const pathOf = (pts: Vec[]) =>
		pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join('');
	const trackPath = $derived(pathOf(samples));
	const donePath = $derived(pathOf(samples.slice(0, current.i + 1)));
	const idealPath = $derived(pathOf(data.ideal));

	/* ---------- snelheidsgrafiek (pixels) ---------- */

	let chartW = $state(320);
	const CH = 84;
	const M = { l: 34, r: 8, t: 8, b: 18 };
	const vmax = $derived(Math.max(2, Math.ceil(Math.max(...samples.map((s) => s.v / KN)))));
	const cx = (t: number) => M.l + (duration ? (t / duration) * (chartW - M.l - M.r) : 0);
	const cy = (kn: number) => M.t + (1 - kn / vmax) * (CH - M.t - M.b);
	const speedLine = $derived(
		samples
			.map((s, i) => `${i ? 'L' : 'M'}${cx(s.t - t0).toFixed(1)} ${cy(s.v / KN).toFixed(1)}`)
			.join('')
	);
	const speedArea = $derived(`${speedLine}L${cx(duration).toFixed(1)} ${cy(0)}L${cx(0)} ${cy(0)}Z`);

	function scrub(e: PointerEvent) {
		if (e.type === 'pointerdown') (e.currentTarget as Element).setPointerCapture(e.pointerId);
		else if (!(e.buttons & 1)) return;
		const r = (e.currentTarget as Element).getBoundingClientRect();
		const f = (e.clientX - r.left - M.l) / (r.width - M.l - M.r);
		time = Math.max(0, Math.min(duration, f * duration));
		stop();
	}

	/* ---------- afspelen ---------- */

	let raf = 0;

	function stop() {
		cancelAnimationFrame(raf);
		playing = false;
	}

	function togglePlay() {
		if (playing) return stop();
		if (time >= duration) time = 0;
		playing = true;
		let last = performance.now();
		raf = requestAnimationFrame(function tick(now) {
			// vier keer zo snel als echt
			time = Math.min(duration, time + ((now - last) / 1000) * 4);
			last = now;
			if (time >= duration) stop();
			else raf = requestAnimationFrame(tick);
		});
	}

	onDestroy(stop);

	const readout = $derived.by(() => {
		const s = current.s;
		const th = Math.abs(angDiff(data.windDir, s.h));
		return `${fmtTime(time)}, ${fmt(s.v / KN)} kn, ${courseName(th).toLowerCase()}`;
	});

	const markShape = (type: TrackMark['type'], x: number, y: number, r: number) =>
		type === 'tack'
			? `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`
			: type === 'gybe'
				? `M${x - r} ${y - r}h${2 * r}v${2 * r}h${-2 * r}Z`
				: `M${x} ${y - r * 1.3}l${r * 1.3} ${r * 1.3}l${-r * 1.3} ${r * 1.3}l${-r * 1.3} ${-r * 1.3}Z`;
	const types = $derived([...new Set(marks.map((m) => m.type))]);
</script>

<section class="mt-4" aria-labelledby="replay-title">
	<h2 id="replay-title" class="mb-1.5 text-[17px] font-semibold">Terugkijken</h2>

	<svg
		viewBox="{bounds.x} {bounds.y} {bounds.w} {bounds.h}"
		class="block h-56 w-full rounded-[10px] border border-panel-edge bg-sea"
		role="img"
		aria-label="Kaart van je spoor na het alarm naast de ideale koers, op {fmtTime(time)}."
	>
		<path
			d={idealPath}
			transform="translate({current.s.mx} {current.s.my})"
			fill="none"
			class="stroke-chart-ideal"
			stroke-width="2"
			stroke-dasharray="6 5"
			vector-effect="non-scaling-stroke"
		/>
		<path
			d={trackPath}
			fill="none"
			class="stroke-chart-own opacity-30"
			stroke-width="2"
			stroke-linejoin="round"
			vector-effect="non-scaling-stroke"
		/>
		<path
			d={donePath}
			fill="none"
			class="stroke-chart-own"
			stroke-width="2"
			stroke-linejoin="round"
			stroke-linecap="round"
			vector-effect="non-scaling-stroke"
		/>
		{#each marks as m (m.t)}
			<path
				d={markShape(m.type, m.x, m.y, unit * 1.3)}
				class="fill-ink stroke-panel"
				stroke-width="2"
				vector-effect="non-scaling-stroke"
			>
				<title>{MARK_LABEL[m.type]} na {fmtTime(m.t - t0)}</title>
			</path>
		{/each}
		<circle
			cx={current.s.mx}
			cy={current.s.my}
			r={unit * 1.6}
			fill="none"
			class="stroke-buoy"
			stroke-width="3"
			vector-effect="non-scaling-stroke"
		/>
		<path
			d="M0 {-unit * 4.5} L{unit * 2.2} {unit * 3} L{-unit * 2.2} {unit * 3} Z"
			transform="translate({current.s.x} {current.s.y}) rotate({current.s.h})"
			class="fill-ink stroke-panel"
			stroke-width="2"
			vector-effect="non-scaling-stroke"
		/>
	</svg>

	<ul class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-muted">
		<li class="flex items-center gap-1.5">
			<svg width="22" height="8" aria-hidden="true"
				><line x1="1" y1="4" x2="21" y2="4" class="stroke-chart-own" stroke-width="2" /></svg
			>jouw spoor
		</li>
		<li class="flex items-center gap-1.5">
			<svg width="22" height="8" aria-hidden="true"
				><line
					x1="1"
					y1="4"
					x2="21"
					y2="4"
					class="stroke-chart-ideal"
					stroke-width="2"
					stroke-dasharray="6 4"
				/></svg
			>ideale koers
		</li>
		{#each types as type (type)}
			<li class="flex items-center gap-1.5">
				<svg width="12" height="12" aria-hidden="true"
					><path d={markShape(type, 6, 6, 4)} class="fill-ink" /></svg
				>{MARK_LABEL[type].toLowerCase()}
			</li>
		{/each}
		<li class="ml-auto flex items-center gap-1.5">
			wind uit {dirName(data.windDir)}
			<span class="inline-block text-buoy" style:rotate="{data.windDir}deg" aria-hidden="true"
				>↓</span
			>
		</li>
	</ul>

	<p class="mt-3 text-[14px] text-muted">Snelheid in knopen</p>
	<div bind:clientWidth={chartW}>
		<svg
			width={chartW}
			height={CH}
			class="block touch-none"
			role="img"
			aria-label="Snelheid na het alarm, hoogste {vmax} knopen."
			onpointerdown={scrub}
			onpointermove={scrub}
		>
			{#each [0, vmax] as kn (kn)}
				<line
					x1={M.l}
					x2={chartW - M.r}
					y1={cy(kn)}
					y2={cy(kn)}
					class="stroke-panel-edge"
					stroke-width="1"
				/>
				<text x={M.l - 6} y={cy(kn) + 4} text-anchor="end" class="fill-muted text-[11px]">{kn}</text
				>
			{/each}
			<line
				x1={M.l}
				x2={chartW - M.r}
				y1={cy(PICK_V / KN)}
				y2={cy(PICK_V / KN)}
				class="stroke-muted"
				stroke-width="1"
				stroke-dasharray="3 3"
			/>
			<text x={M.l - 6} y={cy(PICK_V / KN) + 4} text-anchor="end" class="fill-muted text-[11px]"
				>1,5</text
			>
			<path d={speedArea} class="fill-chart-own opacity-10" />
			<path
				d={speedLine}
				fill="none"
				class="stroke-chart-own"
				stroke-width="2"
				stroke-linejoin="round"
			/>
			{#each marks as m (m.t)}
				<path
					d={markShape(m.type, cx(m.t - t0), cy(0), 4)}
					class="fill-ink stroke-panel"
					stroke-width="2"
				>
					<title>{MARK_LABEL[m.type]} na {fmtTime(m.t - t0)}</title>
				</path>
			{/each}
			<line x1={cx(time)} x2={cx(time)} y1={M.t} y2={cy(0)} class="stroke-ink" stroke-width="1" />
			<circle
				cx={cx(time)}
				cy={cy(current.s.v / KN)}
				r="4"
				class="fill-chart-own stroke-panel"
				stroke-width="2"
			/>
			<text x={M.l} y={CH - 4} class="fill-muted text-[11px]">0:00</text>
			<text x={chartW - M.r} y={CH - 4} text-anchor="end" class="fill-muted text-[11px]"
				>{fmtTime(duration)}</text
			>
		</svg>
	</div>

	<div class="mt-2 flex items-center gap-3">
		<button
			type="button"
			class="h-10 min-w-[104px] rounded-[10px] border border-panel-edge px-3 font-bold"
			onclick={togglePlay}
		>
			{playing ? 'Pauzeren' : 'Afspelen'}
		</button>
		<input
			type="range"
			min="0"
			max={duration}
			step="0.1"
			bind:value={time}
			oninput={stop}
			aria-label="Tijdlijn"
			aria-valuetext={readout}
			class="min-w-0 flex-1 accent-buoy"
		/>
	</div>
	<p class="mt-1 text-[14px] font-semibold tabular-nums" aria-live="off">{readout}</p>
</section>
