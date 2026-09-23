import { DIRS } from './constants';

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const norm360 = (a: number) => ((a % 360) + 360) % 360;

/** a - b, genormaliseerd naar [-180, 180). */
export const angDiff = (a: number, b: number) => ((((a - b) % 360) + 540) % 360) - 180;

export const dirName = (a: number) => DIRS[Math.round(norm360(a) / 22.5) % 16];

/** Naam van de koers bij windhoek th (0 tot 180). */
export function courseName(th: number): string {
	if (th < 30) return 'In de wind';
	if (th < 70) return 'Aan de wind';
	if (th < 110) return 'Halve wind';
	if (th < 158) return 'Ruime wind';
	return 'Voor de wind';
}
