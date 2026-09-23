import { BUOY_IN_TIME } from './sim/constants';
import { courseName } from './sim/geometry';
import type { Method, RunStats, WindStrength } from './sim/types';

/** Eén geslaagde poging, zoals die in localStorage staat. */
export interface Attempt {
	/** Tijdstip in ms sinds 1970. */
	at: number;
	/** Seconden van alarm tot oppakken. */
	time: number;
	method: Method;
	windDir: number;
	windStrength: WindStrength;
	/** Windhoek bij het alarm. */
	startTh: number;
	flybys: number;
	crash: number;
	/** Seconden na het alarm, null als de boei niet gegooid is. */
	buoyAt: number | null;
	outOfSight: number;
}

export const MAX_ATTEMPTS = 50;

export function attemptFrom(
	run: RunStats,
	o: { at: number; time: number; method: Method; windDir: number; windStrength: WindStrength }
): Attempt {
	return {
		...o,
		startTh: run.startTh,
		flybys: run.flybys,
		crash: run.crash,
		buoyAt: run.buoyAt,
		outOfSight: run.outOfSight
	};
}

/** Nieuwste eerst, hooguit 50. */
export const addAttempt = (list: Attempt[], a: Attempt) => [a, ...list].slice(0, MAX_ATTEMPTS);

/** Fouten van een poging, in woorden. Leeg als alles goed ging. */
export function mistakes(a: Attempt): string[] {
	const out: string[] = [];
	if (a.flybys) out.push(`${a.flybys}× te hard`);
	if (a.crash) out.push(`${a.crash}× klapgijp`);
	if (a.buoyAt === null) out.push('geen boei');
	else if (a.buoyAt > BUOY_IN_TIME) out.push('boei te laat');
	if (a.outOfSight > 0) out.push('uit zicht');
	return out;
}

export interface Summary {
	best: Record<WindStrength, Attempt | null>;
	/** Startkoers waarbij het vaakst iets misging. */
	weakest: { course: string; flawed: number; total: number } | null;
}

export function summarize(list: Attempt[]): Summary {
	const best: Summary['best'] = { licht: null, matig: null, stevig: null };
	const byCourse = new Map<string, { flawed: number; total: number }>();
	for (const a of list) {
		const b = best[a.windStrength];
		if (!b || a.time < b.time) best[a.windStrength] = a;
		const c = courseName(a.startTh);
		const e = byCourse.get(c) ?? { flawed: 0, total: 0 };
		e.total++;
		if (mistakes(a).length) e.flawed++;
		byCourse.set(c, e);
	}
	let weakest: Summary['weakest'] = null;
	for (const [course, e] of byCourse) {
		if (!e.flawed) continue;
		if (
			!weakest ||
			e.flawed > weakest.flawed ||
			(e.flawed === weakest.flawed && e.flawed / e.total > weakest.flawed / weakest.total)
		)
			weakest = { course, ...e };
	}
	return { best, weakest };
}

/** Alleen geldige pogingen uit onbetrouwbare opslag overnemen. */
export function parseAttempts(raw: unknown): Attempt[] {
	if (!Array.isArray(raw)) return [];
	const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
	return raw
		.filter(
			(a): a is Attempt =>
				!!a &&
				typeof a === 'object' &&
				num(a.at) &&
				num(a.time) &&
				num(a.windDir) &&
				num(a.startTh) &&
				num(a.flybys) &&
				num(a.crash) &&
				num(a.outOfSight) &&
				(a.buoyAt === null || num(a.buoyAt)) &&
				(a.method === 'mobje' || a.method === 'halvewind') &&
				['licht', 'matig', 'stevig'].includes(a.windStrength)
		)
		.slice(0, MAX_ATTEMPTS);
}
