import { describe, expect, it } from 'vitest';
import { parseSettings } from './settings.svelte';

describe('parseSettings', () => {
	it('neemt geldige waarden over', () => {
		const ok = {
			windDir: '22.5',
			windStrength: 'stevig',
			startCourse: 'random',
			mobMode: 'manual',
			autoTrim: 'true',
			showIdeal: 'after',
			method: 'halvewind',
			timeScale: 2,
			hints: 'on',
			variableWind: 'on'
		};
		expect(parseSettings(ok)).toEqual(ok);
	});

	it('laat ongeldige en onbekende waarden weg', () => {
		expect(
			parseSettings({
				windDir: '400',
				startCourse: '10',
				timeScale: 1000,
				method: 'x',
				__proto__: { polluted: true },
				extra: 1
			})
		).toEqual({});
		expect(parseSettings(JSON.parse('{"__proto__": {"timeScale": 99}}'))).toEqual({});
	});

	it('geeft niets terug voor rommel', () => {
		expect(parseSettings(null)).toEqual({});
		expect(parseSettings('abc')).toEqual({});
		expect(parseSettings([1, 2])).toEqual({});
	});
});
