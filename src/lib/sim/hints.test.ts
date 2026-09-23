import { describe, expect, it } from 'vitest';
import { autopilot, createAutopilot } from './autopilot';
import { createHintTracker, currentHint } from './hints';
import { createSim, step, triggerMob } from './physics';
import type { Method } from './types';

/** Welke hints de autopiloot op het ideale pad achter elkaar te zien krijgt. */
function hintsAlongPath(method: Method, h: number) {
	const s = createSim({ dir: 0, h, at: Infinity }, 12, { autoTrim: false, method });
	triggerMob(s);
	const ap = createAutopilot();
	const tr = createHintTracker();
	const seen: string[] = [];
	while (!s.finished && s.t < 300) {
		const hint = currentHint(tr, s);
		if (hint && hint !== seen.at(-1)) seen.push(hint);
		step(s, autopilot(ap, s), 1 / 60);
	}
	expect(s.finished).toBe(true);
	return seen;
}

/** a komt in volgorde voor in b (niet per se aaneengesloten). */
const inOrder = (a: string[], b: string[]) => {
	let i = 0;
	for (const x of b) if (x === a[i]) i++;
	return i === a.length;
};

describe('leerstand', () => {
	it.each([60, 90, 135])('MOB-je vanaf %i° geeft de fasen in volgorde', (h) => {
		const seen = hintsAlongPath('mobje', h);
		expect(seen).not.toContain('Terug naar de groene lijn');
		expect(
			inOrder(
				[
					'Nu afvallen tot bijna voor de wind',
					'Oploeven naar aan de wind, schoot aantrekken',
					'Drenkeling dwars: overstag',
					'Killend bij: vieren om vaart te minderen',
					'Alles los (spatie)'
				],
				seen
			),
			seen.join(' > ')
		).toBe(true);
	});

	it.each([60, 90, 135])('halve wind vanaf %i° geeft de fasen in volgorde', (h) => {
		const seen = hintsAlongPath('halvewind', h);
		expect(seen).not.toContain('Terug naar de groene lijn');
		expect(
			inOrder(
				[
					'Halve wind van de drenkeling af varen',
					'Overstag',
					'Halve wind terug, drenkeling voor je',
					'Oploeven en vieren om af te remmen',
					'Alles los (spatie)'
				],
				seen
			),
			seen.join(' > ')
		).toBe(true);
	});

	it('zegt dat je terug moet als je ver van het pad raakt', () => {
		const s = createSim({ dir: 0, h: 90, at: Infinity }, 12, { autoTrim: true, method: 'mobje' });
		triggerMob(s);
		const tr = createHintTracker();
		s.boat.x += 40;
		s.boat.y -= 40;
		expect(currentHint(tr, s)).toBe('Terug naar de groene lijn');
	});
});
