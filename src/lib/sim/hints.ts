import { REACT } from './idealPath';
import type { SimState } from './types';

/** Volgt de voortgang langs het ideale pad; de index loopt alleen vooruit. */
export interface HintTracker {
	idx: number;
}

export const createHintTracker = (): HintTracker => ({ idx: 0 });

/** Verder dan dit (meters) van het pad krijg je de hint om terug te gaan. */
const OFF_PATH = 25;

/** Hint voor de leerstand, of null als er (nog) geen drenkeling is. */
export function currentHint(tr: HintTracker, s: SimState): string | null {
	const { mob, boat } = s;
	if (!mob || s.finished) return null;
	const { pts, phases } = mob.ideal;
	const d = (i: number) => Math.hypot(mob.x + pts[i].x - boat.x, mob.y + pts[i].y - boat.y);
	while (tr.idx < pts.length - 1 && (d(tr.idx) < 3 || d(tr.idx + 1) < d(tr.idx))) tr.idx++;

	const dist = Math.hypot(mob.x - boat.x, mob.y - boat.y);
	if (s.run.armed && dist < Math.max(6, boat.v * 5)) return 'Alles los (spatie)';
	if (d(tr.idx) > OFF_PATH) return 'Terug naar de groene lijn';
	let hint = phases[0].hint;
	for (const p of phases) if (p.from <= tr.idx) hint = p.hint;
	if (hint === REACT && s.buoy) return 'Naar de drenkeling blijven wijzen';
	return hint;
}
