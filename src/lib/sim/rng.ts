/** Random generator die getallen in [0, 1) geeft, zoals Math.random. */
export type Rng = () => number;

/** Mulberry32: klein, snel en reproduceerbaar met een 32-bit seed. */
export function mulberry32(seed: number): Rng {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Nieuwe seed voor een willekeurige run. */
export const randomSeed = () => Math.floor(Math.random() * 2 ** 32);
