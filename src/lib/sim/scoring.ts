import { fmt } from '../format';
import { KN, RAD } from './constants';
import { angDiff, courseName, dirName } from './geometry';
import type { Method, SimState } from './types';

export interface Feedback {
	kind: 'good' | 'warn';
	text: string;
}

export interface Result {
	/** Seconden tussen alarm en oppakken. */
	time: number;
	stats: [label: string, value: string][];
	feedback: Feedback[];
}

/** Waar ligt de drenkeling ten opzichte van de boot bij het oppakken. */
function where(s: SimState): string {
	const { boat, wind } = s;
	const mob = s.mob!;
	const d = angDiff(wind.dir, boat.h);
	const brg = Math.atan2(mob.x - boat.x, -(mob.y - boat.y)) / RAD;
	const rel = angDiff(brg, boat.h);
	if (Math.abs(rel) < 25) return 'recht voor de boeg';
	if (Math.abs(rel) > 155) return 'achter de spiegel';
	const sb = rel > 0;
	const loef = (sb && d >= 0) || (!sb && d < 0);
	return `${sb ? 'stuurboord' : 'bakboord'}, ${loef ? 'loefzijde' : 'lijzijde'}`;
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
		['Te hard gepasseerd', String(run.flybys)]
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
	if (run.flybys) warn(`${run.flybys}× te hard langs de drenkeling. Begin eerder met vieren.`);
	if (run.crash) warn(`${run.crash}× klapgijp. Schoot eerst inhalen, dan gijpen.`);
	if (run.maxDist > 60)
		warn(
			`Je kwam tot ${Math.round(run.maxDist)} m van de drenkeling. Hoe verder weg, hoe groter de kans dat je hem uit het oog verliest.`
		);
	if (!run.flybys && !run.crash && ap >= 40 && ap <= 110 && time < 90) good('Strak uitgevoerd.');
	if (showIdeal !== 'off')
		good(
			`Groene stippellijn: ideale koers volgens ${method === 'halvewind' ? 'de halve-windmethode' : 'het MOB-je'}. Oranje: jouw spoor. Bekijk ze samen via "Bekijk je spoor".`
		);

	return { time, stats, feedback: fb };
}
