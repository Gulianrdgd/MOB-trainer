import { describe, expect, it } from 'vitest';
import { autopilot, createAutopilot } from './autopilot';
import { STRENGTH } from './constants';
import { angDiff } from './geometry';
import { createSim, step } from './physics';
import { mulberry32 } from './rng';
import { createScenario } from './scenario';
import { pickupSide } from './scoring';
import type { Method, WindStrength } from './types';

const DT = 1 / 60;
const TIMEOUT = 300;
const RUNS = 25;
const STRENGTHS: WindStrength[] = ['licht', 'matig', 'stevig'];
const COURSES = [45, 90, 135, 172];

function run(method: Method, strength: WindStrength, course: number, seed: number) {
	const scn = createScenario(
		{ windDir: 'random', startCourse: String(course), mobMode: 'auto' },
		mulberry32(seed)
	);
	const s = createSim(scn, STRENGTH[strength], { autoTrim: false, method });
	const ap = createAutopilot();
	while (!s.finished && (!s.mob || s.t - s.mob.t0 < TIMEOUT)) step(s, autopilot(ap, s), DT);
	return s;
}

// De eis voor MOB-je (minstens 50%) geldt over alle runs samen. Met het afremmen van het
// prototype (0,3) bleef de autopiloot bij lichte wind net buiten de oppakstraal; met de
// huidige DECEL haalt hij ze allemaal, maar de eis blijft zoals hij was.
describe.each<Method>(['halvewind', 'mobje'])('autopiloot op het ideale pad: %s', (method) => {
	let picked = 0;
	let total = 0;

	describe.each(STRENGTHS)('wind %s', (strength) => {
		it.each(COURSES)('startkoers %i°', (course) => {
			for (let seed = 1; seed <= RUNS; seed++) {
				const s = run(method, strength, course, seed * 7919 + course);
				const ctx = `seed ${seed}`;
				expect(s.run.gybes, ctx).toBe(0);
				expect(s.run.crash, ctx).toBe(0);
				if (method === 'halvewind') expect(s.finished, ctx).toBe(true);
				total++;
				if (s.finished) {
					picked++;
					// het ideale pad eindigt zo dat de drenkeling aan loefzijde ligt
					expect(pickupSide(s).side, ctx).toBe('loef');
				}
			}
		});
	});

	it(method === 'halvewind' ? 'pakt alle drenkelingen op' : 'pakt minstens de helft op', () => {
		expect(total).toBe(STRENGTHS.length * COURSES.length * RUNS);
		expect(picked / total).toBeGreaterThanOrEqual(method === 'halvewind' ? 1 : 0.5);
	});
});

describe('ideaal pad MOB-je', () => {
	it('komt nergens binnen 10° van pal voor de wind (behalve de startkoers zelf)', () => {
		for (const strength of STRENGTHS)
			for (const course of COURSES)
				for (let seed = 1; seed <= RUNS; seed++) {
					const s = createSim(
						createScenario(
							{ windDir: 'random', startCourse: String(course), mobMode: 'manual' },
							mulberry32(seed)
						),
						STRENGTH[strength],
						{ autoTrim: false, method: 'mobje' }
					);
					step(s, { left: false, right: false, in: false, out: false, loose: false }, DT);
					s.mobAt = 0;
					step(s, { left: false, right: false, in: false, out: false, loose: false }, DT);
					const pts = s.mob!.ideal.pts;
					const limit = Math.max(170, s.run.startTh + 1e-6);
					for (let i = 1; i < pts.length; i++) {
						const dx = pts[i].x - pts[i - 1].x;
						const dy = pts[i].y - pts[i - 1].y;
						if (Math.hypot(dx, dy) < 1e-9) continue;
						const h = Math.atan2(dx, -dy) / (Math.PI / 180);
						const twa = Math.abs(angDiff(s.wind.dir, h));
						expect(twa, `${strength} ${course}° seed ${seed} punt ${i}`).toBeLessThanOrEqual(limit);
					}
				}
	});
});
