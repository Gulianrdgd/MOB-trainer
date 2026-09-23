import { STRENGTH } from './sim/constants';
import type { Method, WindStrength } from './sim/types';

/** Een vaste situatie die een instructeur via een link kan delen. */
export interface SharedScenario {
	/** Windrichting in graden. */
	windDir: number;
	windStrength: WindStrength;
	/** Windhoek bij het alarm in graden. */
	startCourse: number;
	method: Method;
	seed: number;
	/** Vlagen en windschiftingen; dezelfde seed geeft dezelfde vlagen. */
	variableWind?: boolean;
}

const METHODS: readonly Method[] = ['mobje', 'halvewind'];

export function toSearchParams(s: SharedScenario): URLSearchParams {
	const p = new URLSearchParams({
		wind: String(s.windDir),
		kracht: s.windStrength,
		koers: String(s.startCourse),
		methode: s.method,
		seed: String(s.seed)
	});
	if (s.variableWind) p.set('vlagen', '1');
	return p;
}

/** Leest een gedeelde situatie uit de URL. Null als er iets ontbreekt of ongeldig is. */
export function fromSearchParams(p: URLSearchParams): SharedScenario | null {
	const num = (key: string) => {
		const v = p.get(key);
		return v !== null && /^\d+(\.\d+)?$/.test(v) ? Number(v) : NaN;
	};
	const windDir = num('wind');
	const startCourse = num('koers');
	const seed = num('seed');
	const windStrength = p.get('kracht') as WindStrength;
	const method = p.get('methode') as Method;
	if (!(windDir >= 0 && windDir < 360)) return null;
	if (!(startCourse >= 30 && startCourse <= 180)) return null;
	if (!(Number.isInteger(seed) && seed < 2 ** 32)) return null;
	if (!(windStrength in STRENGTH) || !METHODS.includes(method)) return null;
	return {
		windDir,
		windStrength,
		startCourse,
		method,
		seed,
		variableWind: p.get('vlagen') === '1'
	};
}
