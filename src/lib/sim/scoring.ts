import { fmt } from '../format';
import { BUOY_IN_TIME, KN, RAD, SIGHT_R } from './constants';
import { angDiff, courseName, dirName } from './geometry';
import { localWind } from './physics';
import type { Method, SimState } from './types';

export interface Feedback {
	kind: 'good' | 'warn';
	text: string;
}

export interface Result {
	/** Seconden tussen alarm en oppakken. */
	time: number;
	side: PickupSide;
	stats: [label: string, value: string][];
	feedback: Feedback[];
}

/** Kant waar de drenkeling ligt bij het oppakken. Goed is loefzijde: de boot drijft van hem af. */
export type PickupSide = 'loef' | 'lij' | 'boeg' | 'spiegel';

export function pickupSide(s: SimState): { side: PickupSide; starboard: boolean } {
	const { boat } = s;
	const mob = s.mob!;
	const d = angDiff(localWind(s).dir, boat.h);
	const brg = Math.atan2(mob.x - boat.x, -(mob.y - boat.y)) / RAD;
	const rel = angDiff(brg, boat.h);
	const starboard = rel > 0;
	if (Math.abs(rel) < 25) return { side: 'boeg', starboard };
	if (Math.abs(rel) > 155) return { side: 'spiegel', starboard };
	const loef = (starboard && d >= 0) || (!starboard && d < 0);
	return { side: loef ? 'loef' : 'lij', starboard };
}

/** Waar ligt de drenkeling ten opzichte van de boot bij het oppakken, in woorden. */
function where(s: SimState): string {
	const { side, starboard } = pickupSide(s);
	if (side === 'boeg') return 'recht voor de boeg';
	if (side === 'spiegel') return 'achter de spiegel';
	return `${starboard ? 'stuurboord' : 'bakboord'}, ${side === 'loef' ? 'loefzijde' : 'lijzijde'}`;
}

/** Resultaat en feedback van een afgeronde run. */
export function score(s: SimState, showIdeal: 'live' | 'after' | 'off', method: Method): Result {
	const { boat, wind, run } = s;
	const mob = s.mob!;
	const time = s.t - mob.t0;
	const th = Math.abs(angDiff(wind.dir, boat.h));
	const ap = run.approachTh ?? th;

	const stats: Result['stats'] = [
		['Wind', `${dirName(wind.dir)}, ${wind.kn} kn`],
		['Koers bij alarm', `${courseName(run.startTh)} (${Math.round(run.startTh)}°)`],
		['Aanloopkoers', `${courseName(ap)} (${Math.round(ap)}°)`],
		['Snelheid bij oppakken', `${fmt(boat.v / KN)} kn`],
		['Drenkeling', where(s)],
		['Verste afstand', `${Math.round(run.maxDist)} m`],
		['Overstag / gijp', `${run.tacks} / ${run.gybes}`],
		['Te hard gepasseerd', String(run.flybys)],
		['Reddingsboei', run.buoyAt === null ? 'niet gegooid' : `na ${fmt(run.buoyAt)} s`],
		['Uit zicht', `${Math.round(run.outOfSight)} s`]
	];

	const fb: Feedback[] = [];
	const good = (text: string) => fb.push({ kind: 'good', text });
	const warn = (text: string) => fb.push({ kind: 'warn', text });
	if (ap >= 40 && ap <= 110)
		good('Je liep aan met aan de wind tot halve wind. Daar kun je vaart regelen met de schoot.');
	else if (ap > 110)
		warn(
			'Je liep aan met ruime of voor de wind. Vieren remt dan nauwelijks af, dus je bent afhankelijk van geluk.'
		);
	else
		warn(
			'Je schoot op in de wind. Dat kan, maar je hebt weinig controle als je de afstand verkeerd inschat.'
		);
	const { side } = pickupSide(s);
	if (side === 'loef') good('Drenkeling aan loefzijde opgepakt: de boot drijft van hem af.');
	else if (side === 'lij')
		warn(
			'Drenkeling aan lijzijde opgepakt. De boot drijft dan over hem heen. Kom zo aan dat hij aan loefzijde ligt, bij de want.'
		);
	else if (side === 'boeg')
		warn(
			'Drenkeling recht voor de boeg: je kunt hem raken. Kom zo aan dat hij aan loefzijde ligt, bij de want.'
		);
	else
		warn(
			'Drenkeling achter de spiegel: je lag niet naast hem. Kom zo aan dat hij aan loefzijde ligt, bij de want.'
		);
	if (run.flybys) warn(`${run.flybys}× te hard langs de drenkeling. Begin eerder met vieren.`);
	if (run.crash) warn(`${run.crash}× klapgijp. Schoot eerst inhalen, dan gijpen.`);
	if (run.buoyAt === null)
		warn('Geen reddingsboei gegooid. Gooi hem direct bij het alarm (toets B).');
	else if (run.buoyAt > BUOY_IN_TIME)
		warn(
			`Reddingsboei pas na ${fmt(run.buoyAt)} s gegooid. Gooi hem direct: de drenkeling heeft dan iets om vast te houden en de plek is gemarkeerd.`
		);
	else good(`Reddingsboei na ${fmt(run.buoyAt)} s gegooid.`);
	if (run.outOfSight > 0)
		warn(
			`Je kwam tot ${Math.round(run.maxDist)} m van de drenkeling en was hem ${Math.round(run.outOfSight)} s uit zicht (verder dan ${SIGHT_R} m). Hoe verder weg, hoe groter de kans dat je hem uit het oog verliest.`
		);
	else good('De drenkeling bleef de hele tijd in zicht.');
	if (!run.flybys && !run.crash && ap >= 40 && ap <= 110 && time < 90) good('Strak uitgevoerd.');
	if (showIdeal !== 'off')
		good(
			`Groene stippellijn: ideale koers volgens ${method === 'halvewind' ? 'de halve-windmethode' : 'het MOB-je'}. Oranje: jouw spoor. Bekijk ze samen via "Bekijk je spoor".`
		);

	return { time, side, stats, feedback: fb };
}
