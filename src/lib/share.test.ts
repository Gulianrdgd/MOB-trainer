import { describe, expect, it } from 'vitest';
import { fromSearchParams, socialText, toSearchParams, type SharedScenario } from './share';

const s: SharedScenario = {
	windDir: 247.5,
	windStrength: 'stevig',
	startCourse: 135,
	method: 'halvewind',
	seed: 4294967295,
	variableWind: false
};

describe('gedeelde situatie in de URL', () => {
	it('komt ongeschonden terug', () => {
		expect(fromSearchParams(toSearchParams(s))).toEqual(s);
		expect(toSearchParams(s).toString()).toBe(
			'wind=247.5&kracht=stevig&koers=135&methode=halvewind&seed=4294967295'
		);
	});

	it('neemt vlagen mee als die aan staan', () => {
		const v = { ...s, variableWind: true };
		expect(toSearchParams(v).get('vlagen')).toBe('1');
		expect(fromSearchParams(toSearchParams(v))).toEqual(v);
	});

	it.each([
		['ontbrekende seed', 'wind=0&kracht=matig&koers=90&methode=mobje'],
		['wind buiten bereik', 'wind=360&kracht=matig&koers=90&methode=mobje&seed=1'],
		['koers in de wind', 'wind=0&kracht=matig&koers=10&methode=mobje&seed=1'],
		['onbekende kracht', 'wind=0&kracht=storm&koers=90&methode=mobje&seed=1'],
		['onbekende methode', 'wind=0&kracht=matig&koers=90&methode=gok&seed=1'],
		['negatieve seed', 'wind=0&kracht=matig&koers=90&methode=mobje&seed=-1'],
		['kommagetal als seed', 'wind=0&kracht=matig&koers=90&methode=mobje&seed=1.5'],
		['tekst', 'wind=abc&kracht=matig&koers=90&methode=mobje&seed=1']
	])('weigert %s', (_, q) => expect(fromSearchParams(new URLSearchParams(q))).toBeNull());
});

describe('deeltekst', () => {
	it('noemt tijd, fouten en omstandigheden en daagt uit', () => {
		expect(socialText({ time: 47.8, mistakes: 0, scenario: s })).toBe(
			'Ik haalde de drenkeling in 0:47 aan boord, zonder fouten (wind WZW, 18 kn, halve-windmethode). Denk je dat je me kunt verslaan?'
		);
		expect(socialText({ time: 95, mistakes: 1, scenario: { ...s, method: 'mobje' } })).toContain(
			'in 1:35 aan boord, met 1 fout'
		);
		expect(socialText({ time: 60, mistakes: 3, scenario: s })).toContain('met 3 fouten');
	});
});
