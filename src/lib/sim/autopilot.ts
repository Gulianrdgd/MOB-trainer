import { RAD } from './constants';
import { angDiff, clamp, norm360 } from './geometry';
import { optBoom } from './physics';
import type { Input, SimState, Vec } from './types';

/**
 * Stuurt de boot langs het ideale pad. Gebruikt in de regressietest om te bewijzen
 * dat het pad met de echte bootfysica te varen is.
 */
export interface Autopilot {
	/** Padindex; loopt alleen vooruit. */
	idx: number;
	input: Input;
}

export const createAutopilot = (): Autopilot => ({
	idx: 0,
	input: { left: false, right: false, in: false, out: false, loose: false }
});

/** Rest van het pad vanaf punt i, in meters. */
function remaining(pts: Vec[], i: number): number {
	let len = 0;
	for (let j = i; j < pts.length - 1; j++)
		len += Math.hypot(pts[j + 1].x - pts[j].x, pts[j + 1].y - pts[j].y);
	return len;
}

export function autopilot(ap: Autopilot, s: SimState): Input {
	const { boat, wind, mob } = s;
	const input = ap.input;
	input.left = input.right = input.in = input.out = input.loose = false;
	const th = Math.abs(angDiff(wind.dir, boat.h));
	let boomTarget = optBoom(th);

	if (mob) {
		const pts = mob.ideal.pts.map((p) => ({ x: mob.x + p.x, y: mob.y + p.y }));
		const d = (p: Vec) => Math.hypot(p.x - boat.x, p.y - boat.y);
		// volgend punt pakken als je binnen 3 m bent of het volgende punt dichterbij is
		while (ap.idx < pts.length - 1 && (d(pts[ap.idx]) < 3 || d(pts[ap.idx + 1]) < d(pts[ap.idx])))
			ap.idx++;
		// richten op het eerste punt minstens 5 m vooruit
		let aim = ap.idx;
		while (aim < pts.length - 1 && d(pts[aim]) < 5) aim++;
		const target = pts[aim];
		let want = norm360(Math.atan2(target.x - boat.x, -(target.y - boat.y)) / RAD);

		// nooit hoger dan 42° aan de wind, 25° vlak bij de drenkeling
		const dist = Math.hypot(mob.x - boat.x, mob.y - boat.y);
		const limit = dist < 12 ? 25 : 42;
		const twa = angDiff(wind.dir, want);
		if (Math.abs(twa) < limit) want = norm360(wind.dir - (twa >= 0 ? 1 : -1) * limit);

		// roer evenredig met de koersfout
		const r = clamp(angDiff(want, boat.h) / 20, -1, 1);
		if (boat.rudder < r - 0.05) input.right = true;
		else if (boat.rudder > r + 0.05) input.left = true;

		// laatste stuk: licht vieren, dichtbij helemaal los
		if (remaining(pts, ap.idx) < 25) {
			boomTarget = optBoom(th) + 5;
			if (dist < Math.max(6, boat.v * 5)) input.loose = true;
		}
	}

	if (!input.loose) {
		if (boat.boom > boomTarget + 1) input.in = true;
		else if (boat.boom < boomTarget - 1) input.out = true;
	}
	return input;
}
