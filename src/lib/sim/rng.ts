/** Random generator die getallen in [0, 1) geeft, zoals Math.random. */
export type Rng = () => number;

/** Toestand van een mulberry32-generator als gewoon getal, zodat hij in de sim-state past. */
export interface RngState {
	seed: number;
}

/** Eén stap mulberry32: past de toestand aan en geeft een getal in [0, 1). */
export function nextRandom(r: RngState): number {
	r.seed = (r.seed + 0x6d2b79f5) >>> 0;
	let t = r.seed;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Mulberry32: klein, snel en reproduceerbaar met een 32-bit seed. */
export function mulberry32(seed: number): Rng {
	const r = { seed: seed >>> 0 };
	return () => nextRandom(r);
}

/** Nieuwe seed voor een willekeurige run. */
export const randomSeed = () => Math.floor(Math.random() * 2 ** 32);
