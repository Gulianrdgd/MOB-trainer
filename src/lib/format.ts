/** Getal met decimale komma. */
export const fmt = (v: number, d = 1) => v.toFixed(d).replace('.', ',');

/** Seconden als m:ss. */
export const fmtTime = (s: number) =>
	`${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
