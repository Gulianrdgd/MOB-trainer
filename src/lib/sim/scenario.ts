import { norm360 } from './geometry';
import type { Rng } from './rng';
import type { Scenario } from './types';

export interface ScenarioOptions {
	/** Windrichting in graden als string, of 'random'. */
	windDir: string;
	/** Windhoek bij het alarm als string, of 'random'. */
	startCourse: string;
	mobMode: 'auto' | 'manual';
}

const RANDOM_TWA = [45, 60, 90, 110, 135, 165];

/** Nieuwe beginsituatie. Alle toeval komt uit rng, dus dezelfde seed geeft dezelfde situatie. */
export function createScenario(o: ScenarioOptions, rng: Rng): Scenario {
	const dir = o.windDir === 'random' ? Math.floor(rng() * 16) * 22.5 : +o.windDir;
	const twa =
		o.startCourse === 'random' ? RANDOM_TWA[Math.floor(rng() * RANDOM_TWA.length)] : +o.startCourse;
	const side = rng() < 0.5 ? 1 : -1;
	return {
		dir,
		h: norm360(dir + side * twa),
		at: o.mobMode === 'auto' ? 6 + rng() * 14 : Infinity
	};
}
