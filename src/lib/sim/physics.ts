import {
	BUOY_RANGE,
	KN,
	PICK_R,
	PICK_V,
	POLAR,
	RAD,
	SIGHT_R,
	SPEED_FACTOR,
	TURN_RATE
} from './constants';
import { angDiff, clamp, norm360 } from './geometry';
import { idealPath } from './idealPath';
import { createWindField, updateWindField, windAt } from './wind';
import type {
	Boat,
	Input,
	Scenario,
	SimConfig,
	SimEvent,
	SimState,
	TrackMark,
	Wind
} from './types';

/** Snelheidsfractie bij windhoek th, lineair geïnterpoleerd uit de polar. */
export function polar(th: number): number {
	for (let i = 1; i < POLAR.length; i++) {
		const [a, va] = POLAR[i - 1];
		const [b, vb] = POLAR[i];
		if (th <= b) return va + ((vb - va) * (th - a)) / (b - a);
	}
	return 0.72;
}

/** Ideale giekhoek bij windhoek th. */
export const optBoom = (th: number) => clamp(th - 25, 0, 85);

export interface SailState {
	/** Fractie van de maximale aandrijving. */
	p: number;
	/** 0..1, hoeveel het zeil klappert. */
	luff: number;
	/** Werkelijke giekhoek; de giek kan niet verder uit dan de wind toelaat. */
	disp: number;
}

export function sail(th: number, boom: number): SailState {
	if (th < 28) return { p: 0, luff: 1, disp: Math.min(boom, th) };
	const o = optBoom(th);
	const eff = Math.min(boom, th);
	const diff = eff - o;
	if (diff > 0) {
		const l = clamp(diff / 12, 0, 1);
		return { p: 1 - l, luff: l, disp: eff };
	}
	return { p: 1 - 0.7 * Math.min(1, -diff / 80), luff: 0, disp: eff };
}

/** Boot op de startkoers, getrimd en al op snelheid. */
export function createBoat(scn: Scenario, kn: number): Boat {
	const th = Math.abs(angDiff(scn.dir, scn.h));
	const b = optBoom(th);
	return {
		x: 0,
		y: 0,
		h: scn.h,
		v: polar(th) * sail(th, b).p * kn * SPEED_FACTOR * KN,
		boom: b,
		rudder: 0,
		luff: 0,
		disp: b
	};
}

export function createSim(scn: Scenario, kn: number, config: SimConfig): SimState {
	const boat = createBoat(scn, kn);
	return {
		config,
		wind: { dir: scn.dir, kn },
		windField: config.variableWind
			? createWindField(scn.windSeed ?? 0, { dir: scn.dir, kn }, { x: 0, y: 0 })
			: null,
		boat,
		mob: null,
		buoy: null,
		t: 0,
		mobAt: scn.at,
		track: [{ x: 0, y: 0 }],
		mobIdx: -1,
		trackTimer: 0,
		run: {
			flybys: 0,
			tacks: 0,
			gybes: 0,
			crash: 0,
			maxDist: 0,
			armed: false,
			inPass: false,
			approachTh: null,
			approachFar: false,
			startTh: 0,
			buoyAt: null,
			outOfSight: 0
		},
		replay: [],
		marks: [],
		prevTh: Math.abs(angDiff(scn.dir, scn.h)),
		prevSide: angDiff(scn.dir, scn.h) >= 0 ? 1 : -1,
		finished: false
	};
}

/** Drenkeling te water, 3,3 m achter de boot. Geeft false als dat nu niet kan. */
export function triggerMob(s: SimState): boolean {
	if (s.finished || s.mob) return false;
	const { boat, wind } = s;
	const hr = boat.h * RAD;
	const pos = { x: boat.x - Math.sin(hr) * 3.3, y: boat.y + Math.cos(hr) * 3.3 };
	s.mobIdx = s.track.length;
	s.track.push({ x: boat.x, y: boat.y });
	s.mob = { ...pos, t0: s.t, ideal: idealPath(wind, boat, pos, s.config.method) };
	s.run.startTh = Math.abs(angDiff(wind.dir, boat.h));
	sample(s);
	return true;
}

/** Reddingsboei gooien, richting de drenkeling. Geeft false als dat nu niet kan. */
export function throwBuoy(s: SimState): boolean {
	const { boat, mob } = s;
	if (!mob || s.buoy || s.finished) return false;
	const dx = mob.x - boat.x;
	const dy = mob.y - boat.y;
	const dist = Math.hypot(dx, dy);
	const k = dist > 0 ? Math.min(dist, BUOY_RANGE) / dist : 0;
	s.buoy = { x: boat.x + dx * k, y: boat.y + dy * k };
	s.run.buoyAt = s.t - mob.t0;
	return true;
}

function sample(s: SimState) {
	const { boat, mob } = s;
	if (mob)
		s.replay.push({ t: s.t, x: boat.x, y: boat.y, h: boat.h, v: boat.v, mx: mob.x, my: mob.y });
}

function mark(s: SimState, type: TrackMark['type']) {
	s.marks.push({ t: s.t, x: s.boat.x, y: s.boat.y, type });
}

/** Wind zoals de boot hem nu voelt: de basiswind, of met vlagen en schiftingen. */
export const localWind = (s: SimState): Wind =>
	s.windField ? windAt(s.windField, s.wind, s.boat, s.t) : s.wind;

/** Eén tijdstap. Muteert alleen s en geeft terug wat er gebeurde. */
export function step(s: SimState, input: Input, dt: number): SimEvent[] {
	const events: SimEvent[] = [];
	if (s.finished) return events;
	const { boat, wind, run } = s;
	s.t += dt;
	if (s.windField) updateWindField(s.windField, wind, boat, dt);
	// w: wind op de boot; zonder variabele wind precies s.wind
	const w = localWind(s);

	// roer
	const want = (input.right ? 1 : 0) - (input.left ? 1 : 0);
	boat.rudder += clamp(want - boat.rudder, -3.2 * dt, 3.2 * dt);
	const d = angDiff(w.dir, boat.h);
	const th = Math.abs(d);
	const side = d >= 0 ? 1 : -1;

	// schoot
	if (input.loose) boat.boom = Math.min(90, boat.boom + 140 * dt);
	else if (s.config.autoTrim) {
		const o = optBoom(th);
		boat.boom += clamp(o - boat.boom, -60 * dt, 60 * dt);
	} else {
		if (input.in) boat.boom = Math.max(0, boat.boom - 38 * dt);
		if (input.out) boat.boom = Math.min(90, boat.boom + 38 * dt);
	}
	const sp = sail(th, boat.boom);
	boat.luff = sp.luff;
	boat.disp = sp.disp;

	// snelheid
	const tgt = polar(th) * sp.p * w.kn * SPEED_FACTOR * KN;
	const k = tgt > boat.v ? 0.35 : 0.3;
	boat.v += (tgt - boat.v) * Math.min(1, k * dt);
	boat.v -= boat.v * Math.abs(boat.rudder) * 0.12 * dt;
	if (boat.v < 0) boat.v = 0;

	// sturen
	boat.h = norm360(boat.h + boat.rudder * TURN_RATE * clamp(boat.v / 1.2, 0.12, 1) * dt);
	// in de wind zonder vaart valt de boeg af
	if (th < 35 && boat.v < 0.6) boat.h = norm360(boat.h - side * 5 * (1 - boat.v / 0.6) * dt);

	// overstag of gijp
	const d2 = angDiff(w.dir, boat.h);
	const side2 = d2 >= 0 ? 1 : -1;
	if (side2 !== s.prevSide) {
		if (s.prevTh < 90) {
			run.tacks++;
			mark(s, 'tack');
			events.push({ type: 'tack' });
		} else {
			run.gybes++;
			if (!s.config.autoTrim && boat.boom > 55 && w.kn >= 12) {
				run.crash++;
				boat.v *= 0.55;
				mark(s, 'crash');
				events.push({ type: 'crash' });
			} else {
				mark(s, 'gybe');
				events.push({ type: 'gybe' });
			}
		}
	}
	s.prevSide = side2;
	s.prevTh = Math.abs(d2);

	// verplaatsen, met drift door de wind
	const hr = boat.h * RAD;
	const wrBoat = (w.dir + 180) * RAD;
	const lee = 0.12 * (w.kn / 12) * (1 - 0.6 * clamp(boat.v / 1.5, 0, 1));
	boat.x += (Math.sin(hr) * boat.v + Math.sin(wrBoat) * lee) * dt;
	boat.y += (-Math.cos(hr) * boat.v - Math.cos(wrBoat) * lee) * dt;
	s.trackTimer += dt;
	if (s.trackTimer > 0.2) {
		s.trackTimer = 0;
		s.track.push({ x: boat.x, y: boat.y });
		sample(s);
		if (s.track.length > 6000) {
			s.track.splice(1, 1);
			if (s.mobIdx > 0) s.mobIdx--;
		}
	}

	// drenkeling, drijft met de basiswind
	const wr = (wind.dir + 180) * RAD;
	if (!s.mob && s.t >= s.mobAt && triggerMob(s)) events.push({ type: 'mob' });
	const mob = s.mob;
	if (mob) {
		const md = 0.04 * (wind.kn / 12);
		mob.x += Math.sin(wr) * md * dt;
		mob.y -= Math.cos(wr) * md * dt;
		if (s.buoy) {
			s.buoy.x += Math.sin(wr) * md * dt;
			s.buoy.y -= Math.cos(wr) * md * dt;
		}
		const dist = Math.hypot(mob.x - boat.x, mob.y - boat.y);
		run.maxDist = Math.max(run.maxDist, dist);
		if (dist > SIGHT_R) run.outOfSight += dt;
		if (dist > 8) run.armed = true;
		if (dist > 18) run.approachFar = true;
		if (dist < 15 && run.approachFar) {
			run.approachTh = Math.abs(angDiff(w.dir, boat.h));
			run.approachFar = false;
		}
		if (dist > 9) run.inPass = false;
		if (run.armed && dist < PICK_R) {
			if (boat.v < PICK_V) {
				s.finished = true;
				sample(s);
				events.push({ type: 'finish' });
			} else if (!run.inPass) {
				run.inPass = true;
				run.flybys++;
				events.push({ type: 'flyby', speed: boat.v / KN });
			}
		}
	}
	return events;
}
