import { KN, RAD } from './constants';
import { nextRandom, type RngState } from './rng';
import type { Vec, Wind } from './types';

/** Vlaag: een plek met meer wind die met de wind meedrijft. */
export interface Gust extends Vec {
	/** Straal in meters. */
	r: number;
	/** Extra wind in het midden, als fractie (0,3 = 30% meer). */
	k: number;
}

/** Vlagen en langzame windschiftingen. Alle toeval komt uit `rng`. */
export interface WindField {
	rng: RngState;
	gusts: Gust[];
	/** Twee trage sinussen voor de windrichting: amplitude (graden), periode (s), fase. */
	shifts: { a: number; p: number; ph: number }[];
}

const GUSTS = 14;
/** Vlagen verschijnen in een band van deze afstand bovenwinds van de boot. */
const SPAWN = { near: 70, far: 170, side: 130 };
/** Voorbij deze afstand benedenwinds (of opzij) verdwijnt een vlaag. */
const GONE = { down: 110, side: 160 };

/** Eenheidsvector waar de wind heen waait, in wereldcoördinaten (y naar zuid). */
const downwind = (dir: number) => {
	const wr = (dir + 180) * RAD;
	return { x: Math.sin(wr), y: -Math.cos(wr) };
};

function spawn(f: WindField, wind: Wind, around: Vec, along: number): Gust {
	const d = downwind(wind.dir);
	const side = (nextRandom(f.rng) * 2 - 1) * SPAWN.side;
	return {
		x: around.x + d.x * along - d.y * side,
		y: around.y + d.y * along + d.x * side,
		r: 25 + nextRandom(f.rng) * 35,
		k: 0.25 + nextRandom(f.rng) * 0.2
	};
}

export function createWindField(seed: number, wind: Wind, at: Vec): WindField {
	const f: WindField = { rng: { seed: seed >>> 0 }, gusts: [], shifts: [] };
	for (const [a, p] of [
		[5, 70],
		[3, 31]
	])
		f.shifts.push({
			a: a * (0.7 + 0.3 * nextRandom(f.rng)),
			p: p * (0.8 + 0.4 * nextRandom(f.rng)),
			ph: nextRandom(f.rng) * 2 * Math.PI
		});
	// eerste vlagen verspreid over het hele gebied rond de start
	for (let i = 0; i < GUSTS; i++)
		f.gusts.push(spawn(f, wind, at, -SPAWN.far + nextRandom(f.rng) * (SPAWN.far + GONE.down)));
	return f;
}

/** Windschifting in graden op tijd t. */
export const shiftAt = (f: WindField, t: number) =>
	f.shifts.reduce((sum, s) => sum + s.a * Math.sin((2 * Math.PI * t) / s.p + s.ph), 0);

/** Wind op positie p en tijd t. */
export function windAt(f: WindField, base: Wind, p: Vec, t: number): Wind {
	let extra = 0;
	for (const g of f.gusts) {
		const q = Math.hypot(p.x - g.x, p.y - g.y) / g.r;
		if (q < 1) extra += g.k * (1 - q * q) ** 2;
	}
	return { dir: base.dir + shiftAt(f, t), kn: base.kn * (1 + Math.min(extra, 0.6)) };
}

/** Vlagen laten meedrijven; wat ver voorbij de boot is, komt bovenwinds terug. */
export function updateWindField(f: WindField, base: Wind, boat: Vec, dt: number) {
	const d = downwind(base.dir);
	const v = base.kn * KN * 0.5;
	for (let i = 0; i < f.gusts.length; i++) {
		const g = f.gusts[i];
		g.x += d.x * v * dt;
		g.y += d.y * v * dt;
		const rx = g.x - boat.x;
		const ry = g.y - boat.y;
		const along = rx * d.x + ry * d.y;
		const side = Math.abs(-rx * d.y + ry * d.x);
		if (along > GONE.down || side > GONE.side)
			f.gusts[i] = spawn(
				f,
				base,
				boat,
				-(SPAWN.near + nextRandom(f.rng) * (SPAWN.far - SPAWN.near))
			);
	}
}
