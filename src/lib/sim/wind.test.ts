import { describe, expect, it } from 'vitest';
import { autopilot, createAutopilot } from './autopilot';
import { angDiff } from './geometry';
import { createSim, localWind, step, triggerMob } from './physics';
import { createWindField, shiftAt, windAt } from './wind';
import type { Input } from './types';

const none: Input = { left: false, right: false, in: false, out: false, loose: false };
const base = { dir: 225, kn: 12 };

describe('variabele wind', () => {
	it('schift hooguit ongeveer 8 graden', () => {
		for (let seed = 1; seed < 50; seed++) {
			const f = createWindField(seed, base, { x: 0, y: 0 });
			for (let t = 0; t < 600; t += 0.5) expect(Math.abs(shiftAt(f, t))).toBeLessThanOrEqual(8);
		}
	});

	it('geeft meer wind midden in een vlaag en de basiswind ver ervan', () => {
		const f = createWindField(7, base, { x: 0, y: 0 });
		const g = f.gusts[0];
		const inGust = windAt(f, base, g, 0);
		expect(inGust.kn).toBeGreaterThan(base.kn * 1.2);
		const far = windAt(f, base, { x: 1e6, y: 1e6 }, 0);
		expect(far.kn).toBe(base.kn);
	});

	it('is reproduceerbaar met dezelfde seed', () => {
		const run = () => {
			const s = createSim({ dir: 225, h: 135, at: Infinity, windSeed: 42 }, 12, {
				autoTrim: true,
				method: 'mobje',
				variableWind: true
			});
			for (let i = 0; i < 60 * 120; i++) step(s, { ...none, right: i % 600 < 60 }, 1 / 60);
			return s;
		};
		expect(run()).toEqual(run());
	});

	it('blijft vlagen rond de boot houden, ook na lang varen', () => {
		const s = createSim({ dir: 0, h: 90, at: Infinity, windSeed: 3 }, 12, {
			autoTrim: true,
			method: 'mobje',
			variableWind: true
		});
		for (let i = 0; i < 60 * 600; i++) step(s, none, 1 / 60);
		const near = s.windField!.gusts.filter((g) => Math.hypot(g.x - s.boat.x, g.y - s.boat.y) < 250);
		expect(near.length).toBeGreaterThanOrEqual(3);
	});

	it('laat de boot de lokale wind voelen', () => {
		const s = createSim({ dir: 0, h: 90, at: Infinity, windSeed: 9 }, 12, {
			autoTrim: true,
			method: 'mobje',
			variableWind: true
		});
		const g = s.windField!.gusts[0];
		Object.assign(s.boat, { x: g.x, y: g.y });
		expect(localWind(s).kn).toBeGreaterThan(12);
		expect(Math.abs(angDiff(localWind(s).dir, 0))).toBeLessThanOrEqual(8);
	});

	it('is met de autopiloot nog steeds te varen zonder gijpen', () => {
		let picked = 0;
		for (let seed = 1; seed <= 20; seed++) {
			const s = createSim({ dir: 0, h: 90, at: Infinity, windSeed: seed }, 12, {
				autoTrim: false,
				method: 'halvewind',
				variableWind: true
			});
			triggerMob(s);
			const ap = createAutopilot();
			while (!s.finished && s.t < 300) step(s, autopilot(ap, s), 1 / 60);
			expect(s.run.crash, `seed ${seed}`).toBe(0);
			if (s.finished) picked++;
		}
		expect(picked).toBeGreaterThanOrEqual(15);
	});
});
