import { describe, expect, it } from 'vitest';
import { KN } from './constants';
import { createSim, optBoom, polar, sail, step, triggerMob } from './physics';
import { createScenario } from './scenario';
import { mulberry32 } from './rng';
import type { Input } from './types';

describe('polar', () => {
	it('volgt de tabel op de knooppunten', () => {
		expect(polar(0)).toBe(0);
		expect(polar(28)).toBe(0);
		expect(polar(40)).toBeCloseTo(0.55);
		expect(polar(95)).toBe(1);
		expect(polar(180)).toBeCloseTo(0.72);
	});
	it('interpoleert lineair', () => {
		expect(polar(45)).toBeCloseTo(0.675);
		expect(polar(135)).toBeCloseTo(0.885);
	});
	it('geeft 0,72 voorbij 180°', () => expect(polar(190)).toBe(0.72));
});

describe('optBoom', () => {
	it('is windhoek min 25, begrensd op 0..85', () => {
		expect(optBoom(10)).toBe(0);
		expect(optBoom(25)).toBe(0);
		expect(optBoom(45)).toBe(20);
		expect(optBoom(90)).toBe(65);
		expect(optBoom(110)).toBe(85);
		expect(optBoom(180)).toBe(85);
	});
});

describe('sail', () => {
	it('geeft geen aandrijving in de wind', () => {
		expect(sail(20, 40)).toEqual({ p: 0, luff: 1, disp: 20 });
		expect(sail(20, 5)).toEqual({ p: 0, luff: 1, disp: 5 });
	});
	it('geeft volle aandrijving bij de ideale stand', () => {
		expect(sail(90, 65)).toEqual({ p: 1, luff: 0, disp: 65 });
	});
	it('klappert als je te ver viert', () => {
		const s = sail(90, 71);
		expect(s.luff).toBeCloseTo(0.5);
		expect(s.p).toBeCloseTo(0.5);
		expect(sail(90, 90).luff).toBe(1);
		expect(sail(90, 90).p).toBe(0);
	});
	it('verliest aandrijving als je te strak zit', () => {
		expect(sail(90, 25).p).toBeCloseTo(1 - 0.7 * 0.5);
		expect(sail(90, 25).luff).toBe(0);
		expect(sail(180, 0).p).toBeCloseTo(0.3);
	});
	it('laat de giek niet verder uit dan de wind toelaat', () => {
		expect(sail(40, 90).disp).toBe(40);
	});
});

describe('step', () => {
	const none: Input = { left: false, right: false, in: false, out: false, loose: false };
	const setup = (seed: number) =>
		createSim(
			createScenario(
				{ windDir: 'random', startCourse: 'random', mobMode: 'auto' },
				mulberry32(seed)
			),
			12,
			{ autoTrim: false, method: 'mobje' }
		);

	it('is reproduceerbaar met dezelfde seed', () => {
		const a = setup(7);
		const b = setup(7);
		for (let i = 0; i < 2000; i++) {
			step(a, { ...none, right: i % 300 < 90 }, 1 / 60);
			step(b, { ...none, right: i % 300 < 90 }, 1 / 60);
		}
		expect(a).toEqual(b);
	});

	it('houdt koers en snelheid zonder input', () => {
		const s = setup(3);
		const h = s.boat.h;
		const v = s.boat.v;
		for (let i = 0; i < 60; i++) step(s, none, 1 / 60);
		expect(s.boat.h).toBeCloseTo(h, 6);
		expect(s.boat.v).toBeCloseTo(v, 6);
	});

	it('laat de drenkeling vallen op het alarmmoment', () => {
		const s = setup(11);
		let t = 0;
		while (!s.mob) {
			const ev = step(s, none, 1 / 60);
			t += 1 / 60;
			if (s.mob) expect(ev).toContainEqual({ type: 'mob' });
		}
		expect(t).toBeGreaterThanOrEqual(s.mobAt);
		expect(s.mobIdx).toBeGreaterThan(0);
		expect(triggerMob(s)).toBe(false);
	});

	it('stapt niet meer na het oppakken', () => {
		const s = setup(5);
		s.finished = true;
		const before = structuredClone(s);
		expect(step(s, none, 1 / 60)).toEqual([]);
		expect(s).toEqual(before);
	});

	it('laat mobIdx op -1 als het spoor voor het alarm vol raakt', () => {
		const s = createSim({ dir: 0, h: 90, at: Infinity }, 12, {
			autoTrim: true,
			method: 'mobje'
		});
		for (let i = 0; i < 6100 * 13; i++) step(s, none, 1 / 60);
		expect(s.track.length).toBe(6000);
		expect(s.mobIdx).toBe(-1);
	});

	it('telt een klapgijp met de schoot ver uit', () => {
		const s = createSim({ dir: 0, h: 170, at: Infinity }, 12, {
			autoTrim: false,
			method: 'mobje'
		});
		s.boat.boom = 85;
		const events = [];
		for (let i = 0; i < 120; i++) events.push(...step(s, { ...none, right: true }, 1 / 60));
		expect(events).toContainEqual({ type: 'crash' });
		expect(s.run.crash).toBe(1);
		expect(s.boat.v).toBeLessThan(0.72 * 12 * 0.42 * KN);
	});
});

describe('createScenario', () => {
	const random = { windDir: 'random', startCourse: 'random', mobMode: 'auto' } as const;

	it('geeft met een vastgelegde wind en koers dezelfde situatie als met willekeurig', () => {
		for (let seed = 1; seed < 200; seed++) {
			const a = createScenario(random, mulberry32(seed));
			const twa = Math.abs(((a.h - a.dir + 540) % 360) - 180);
			const b = createScenario(
				{ windDir: String(a.dir), startCourse: String(twa), mobMode: 'auto' },
				mulberry32(seed)
			);
			expect(b.dir).toBe(a.dir);
			expect(b.h).toBeCloseTo(a.h, 9);
			expect(b.at).toBe(a.at);
		}
	});

	it('geeft Infinity als alarmtijd bij zelf starten', () => {
		expect(createScenario({ ...random, mobMode: 'manual' }, mulberry32(1)).at).toBe(Infinity);
	});
});
