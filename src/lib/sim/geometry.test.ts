import { describe, expect, it } from 'vitest';
import { angDiff, courseName, dirName, norm360 } from './geometry';

describe('angDiff', () => {
	it('geeft a - b in [-180, 180)', () => {
		expect(angDiff(10, 0)).toBe(10);
		expect(angDiff(0, 10)).toBe(-10);
		expect(angDiff(350, 10)).toBe(-20);
		expect(angDiff(10, 350)).toBe(20);
		expect(angDiff(180, 0)).toBe(-180);
		expect(angDiff(0, 180)).toBe(-180);
		expect(angDiff(725, 0)).toBe(5);
		expect(angDiff(-90, 0)).toBe(-90);
	});

	it('blijft altijd binnen het bereik', () => {
		for (let a = -720; a <= 720; a += 7.5)
			for (let b = -720; b <= 720; b += 11) {
				const d = angDiff(a, b);
				expect(d).toBeGreaterThanOrEqual(-180);
				expect(d).toBeLessThan(180);
				expect(norm360(b + d)).toBeCloseTo(norm360(a), 9);
			}
	});
});

describe('courseName', () => {
	it.each([
		[0, 'In de wind'],
		[29.9, 'In de wind'],
		[30, 'Aan de wind'],
		[69.9, 'Aan de wind'],
		[70, 'Halve wind'],
		[109.9, 'Halve wind'],
		[110, 'Ruime wind'],
		[157.9, 'Ruime wind'],
		[158, 'Voor de wind'],
		[180, 'Voor de wind']
	])('%s° is %s', (th, name) => expect(courseName(th)).toBe(name));
});

describe('dirName', () => {
	it('rondt af op 16 windstreken', () => {
		expect(dirName(0)).toBe('N');
		expect(dirName(11)).toBe('N');
		expect(dirName(12)).toBe('NNO');
		expect(dirName(225)).toBe('ZW');
		expect(dirName(355)).toBe('N');
		expect(dirName(-45)).toBe('NW');
	});
});
