/**
 * Pariteitstest: draait de simulatiecode uit reference/man-over-boord.html (met een
 * minimale DOM-stub) naast step() en eist dat de toestand na elke stap exact gelijk is.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createSim, step, triggerMob } from './physics';
import type { Input, Method } from './types';

interface RefBoat {
	x: number;
	y: number;
	h: number;
	v: number;
	boom: number;
	rudder: number;
}
interface RefApi {
	update(dt: number): void;
	newRun(repeat: boolean): void;
	triggerMOB(): void;
	settings: Record<string, unknown>;
	keys: Record<string, boolean>;
	boat: RefBoat;
	mob: { x: number; y: number; ideal: { pts: { x: number; y: number }[] } } | null;
	run: Record<string, unknown>;
	finished: boolean;
	t: number;
	wind: { dir: number; kn: number };
}

const pick = (b: RefBoat) => ({ x: b.x, y: b.y, h: b.h, v: b.v, boom: b.boom, rudder: b.rudder });

function loadReference(): RefApi {
	const html = readFileSync(
		new URL('../../../reference/man-over-boord.html', import.meta.url),
		'utf8'
	);
	let src = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
	// interne functies en toestand naar buiten brengen, en de game loop niet starten
	src = src.replace(
		/\}\)\(\);\s*$/,
		`globalThis.__ref={update,newRun,triggerMOB,settings,keys,
			get boat(){return boat},get mob(){return mob},get run(){return run},
			get finished(){return finished},get t(){return t},wind};})();`
	);
	const noop = () => {};
	// alles wat de DOM-code aanraakt slikt elke aanroep of eigenschap
	const sink: object = new Proxy(noop, {
		get: (_, k) => (k === Symbol.toPrimitive ? () => '' : sink),
		set: () => true,
		apply: () => sink
	});
	const g = globalThis as Record<string, unknown>;
	const stubs: Record<string, unknown> = {
		document: { querySelector: () => sink, querySelectorAll: () => [], documentElement: sink },
		addEventListener: noop,
		matchMedia: () => sink,
		MutationObserver: class {
			observe() {}
		},
		getComputedStyle: () => ({ getPropertyValue: () => '' }),
		requestAnimationFrame: noop,
		localStorage: { getItem: () => null, setItem: noop },
		window: { devicePixelRatio: 1 }
	};
	// blijft staan: de referentiefuncties gebruiken de stubs ook tijdens de test (Vitest isoleert per bestand)
	Object.assign(g, stubs);
	new Function(src)();
	return g.__ref as RefApi;
}

const KEYMAP: Record<keyof Input, string> = {
	left: 'arrowleft',
	right: 'arrowright',
	in: 'arrowup',
	out: 'arrowdown',
	loose: ' '
};

/** Reproduceerbare inputreeks: blokken van willekeurige lengte met willekeurige toetsen. */
function* inputs(seed: number, n: number): Generator<Input> {
	let a = seed;
	const rnd = () => (a = (a * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
	let cur: Input = { left: false, right: false, in: false, out: false, loose: false };
	let left = 0;
	for (let i = 0; i < n; i++) {
		if (left-- <= 0) {
			left = 10 + Math.floor(rnd() * 90);
			const steer = rnd();
			const sheet = rnd();
			cur = {
				left: steer < 0.25,
				right: steer > 0.75,
				in: sheet < 0.2,
				out: sheet > 0.8,
				loose: sheet > 0.95
			};
		}
		yield cur;
	}
}

describe('pariteit met het referentie-prototype', () => {
	const ref = loadReference();

	it.each<[Method, string, string, 'true' | 'false']>([
		['mobje', 'matig', '90', 'false'],
		['mobje', 'stevig', '172', 'false'],
		['halvewind', 'licht', '45', 'true'],
		['halvewind', 'stevig', '135', 'false']
	])('%s, %s, startkoers %s, autoTrim %s', (method, windStrength, startCourse, autoTrim) => {
		Object.assign(ref.settings, {
			windDir: 'random',
			windStrength,
			startCourse,
			mobMode: 'manual',
			autoTrim,
			method
		});
		for (let seed = 1; seed <= 5; seed++) {
			const orig = Math.random;
			let r = seed;
			Math.random = () => (r = (r * 16807) % 2147483647) / 2147483647;
			try {
				ref.newRun(false);
			} finally {
				Math.random = orig;
			}
			// prototype: harder afremmen en een ideaal pad dat op de drenkeling eindigt
			const s = createSim({ dir: ref.wind.dir, h: ref.boat.h, at: Infinity }, ref.wind.kn, {
				autoTrim: autoTrim === 'true',
				method,
				prototype: true
			});
			expect(s.boat).toEqual(expect.objectContaining(pick(ref.boat)));

			let i = 0;
			for (const input of inputs(seed * 31 + method.length, 60 * 90)) {
				for (const [k, key] of Object.entries(KEYMAP)) ref.keys[key] = input[k as keyof Input];
				if (i === 60 * 4) {
					ref.triggerMOB();
					triggerMob(s);
				}
				ref.update(1 / 60);
				step(s, input, 1 / 60);
				i++;
				const ctx = `seed ${seed}, stap ${i}`;
				expect(s.boat, ctx).toEqual(expect.objectContaining(pick(ref.boat)));
				if (ref.finished) break;
			}
			expect(s.mob!.ideal.pts).toEqual(ref.mob!.ideal.pts);
			expect(s.run.tacks).toBe(ref.run.tacks);
			expect(s.run.gybes).toBe(ref.run.gybes);
			expect(s.run.crash).toBe(ref.run.crash);
			expect(s.run.flybys).toBe(ref.run.flybys);
		}
	});
});
