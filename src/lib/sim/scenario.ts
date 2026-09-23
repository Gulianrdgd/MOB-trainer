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

/**
 * Nieuwe beginsituatie. Alle toeval komt uit rng, dus dezelfde seed geeft dezelfde situatie.
 * Er worden altijd vier getallen getrokken, in vaste volgorde, ook als een waarde vastligt.
 * Zo geeft een seed dezelfde boeg en hetzelfde alarmmoment, of de wind nu willekeurig
 * was of (via een gedeelde link) vastligt.
 */
export function createScenario(o: ScenarioOptions, rng: Rng): Scenario {
	const rDir = rng();
	const rTwa = rng();
	const rSide = rng();
	const rAt = rng();
	const dir = o.windDir === 'random' ? Math.floor(rDir * 16) * 22.5 : +o.windDir;
	const twa =
		o.startCourse === 'random' ? RANDOM_TWA[Math.floor(rTwa * RANDOM_TWA.length)] : +o.startCourse;
	const side = rSide < 0.5 ? 1 : -1;
	return {
		dir,
		h: norm360(dir + side * twa),
		at: o.mobMode === 'auto' ? 6 + rAt * 14 : Infinity
	};
}
