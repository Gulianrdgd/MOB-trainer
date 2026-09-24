import { KN, PICKUP_OFFSET, RAD, SPEED_FACTOR, TURN_RATE } from './constants';
import { angDiff, clamp } from './geometry';
import { polar } from './physics';
import type { Boat, IdealPath, Method, Vec, Wind } from './types';

/**
 * Het ideale pad wordt opgebouwd vanuit de echte toestand van de boot bij het alarm:
 * eerst een reactiemoment rechtdoor, daarna bochten met een straal die past bij de snelheid.
 * Lokaal assenstelsel: b = richting loef, a = dwars op de wind naar de kant waar de koers nu heen wijst.
 * phi = hoek van de koers t.o.v. de wind op deze boeg (negatief = andere boeg).
 */
interface AB {
	a: number;
	b: number;
}

export function turnRadius(v: number): number {
	return Math.max(2.5, v / (0.75 * TURN_RATE * RAD * clamp(v / 1.2, 0.12, 1)));
}

export function legSpeed(th: number, kn: number): number {
	return Math.max(0.8, polar(th) * kn * SPEED_FACTOR * KN);
}

/** Tekent een pad in het lokale assenstelsel met rechte stukken en bogen. */
export class Builder {
	readonly pts: AB[];
	a: number;
	b: number;
	phi: number;

	constructor(a: number, b: number, phi: number) {
		this.a = a;
		this.b = b;
		this.phi = phi;
		this.pts = [{ a, b }];
	}

	straight(len: number): this {
		if (len <= 0) return this;
		const n = Math.max(1, Math.ceil(len));
		const sa = Math.sin(this.phi * RAD);
		const cb = Math.cos(this.phi * RAD);
		for (let i = 1; i <= n; i++)
			this.pts.push({ a: this.a + (sa * len * i) / n, b: this.b + (cb * len * i) / n });
		this.a += sa * len;
		this.b += cb * len;
		return this;
	}

	/** Draai naar hoek `to` met straal r, in stappen van maximaal 3°. */
	arc(to: number, r: number): this {
		while (Math.abs(to - this.phi) > 1e-6) {
			const d = clamp(to - this.phi, -3, 3);
			const mid = this.phi + d / 2;
			const ds = r * Math.abs(d) * RAD;
			this.a += Math.sin(mid * RAD) * ds;
			this.b += Math.cos(mid * RAD) * ds;
			this.phi += d;
			this.pts.push({ a: this.a, b: this.b });
		}
		return this;
	}

	mark(): AB {
		return { a: this.a, b: this.b };
	}
}

/** Catmull-Rom-spline door pts, n punten per segment. */
export function spline(pts: Vec[], n = 14): Vec[] {
	const out: Vec[] = [];
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[Math.max(0, i - 1)];
		const p1 = pts[i];
		const p2 = pts[i + 1];
		const p3 = pts[Math.min(pts.length - 1, i + 2)];
		for (let j = 0; j < n; j++) {
			const t = j / n;
			const t2 = t * t;
			const t3 = t2 * t;
			out.push({
				x:
					0.5 *
					(2 * p1.x +
						(-p0.x + p2.x) * t +
						(2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
						(-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
				y:
					0.5 *
					(2 * p1.y +
						(-p0.y + p2.y) * t +
						(2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
						(-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
			});
		}
	}
	out.push(pts[pts.length - 1]);
	return out;
}

/** Eerste hint na het alarm. */
export const REACT = 'Reddingsboei gooien (B) en naar de drenkeling blijven wijzen';

/**
 * Ideaal pad vanaf de boot naar de drenkeling op positie mob, relatief ten opzichte van mob.
 * Het pad eindigt `offset` meter dwars naar lij van de drenkeling, zodat hij bij het stilliggen
 * aan loefzijde ligt en de boot van hem af drijft. Met offset 0 eindigt het op de drenkeling,
 * zoals in het prototype.
 */
export function idealPath(
	wind: Wind,
	boat: Boat,
	mob: Vec,
	method: Method,
	offset = PICKUP_OFFSET
): IdealPath {
	const W = wind.dir * RAD;
	const u = { x: Math.sin(W), y: -Math.cos(W) };
	const v = { x: Math.cos(W), y: Math.sin(W) };
	const side = angDiff(wind.dir, boat.h) >= 0 ? 1 : -1;
	const e = { x: -side * v.x, y: -side * v.y };
	const toW = (p: AB): Vec => ({ x: e.x * p.a + u.x * p.b, y: e.y * p.a + u.y * p.b });
	const rel = { x: boat.x - mob.x, y: boat.y - mob.y };
	const a0 = rel.x * e.x + rel.y * e.y;
	const b0 = rel.x * u.x + rel.y * u.y;
	const phi0 = Math.abs(angDiff(wind.dir, boat.h));
	const react = boat.v * 1.2 + 0.5;
	const r0 = turnRadius(Math.max(boat.v, 0.8));

	if (method === 'halvewind') {
		const B = new Builder(a0, b0, phi0).straight(react);
		const iTurn = B.pts.length - 1;
		B.arc(90, r0);
		const D = Math.max(wind.kn * 2.6, 30, B.a + 12);
		const L = 16;
		const s60 = Math.sin(60 * RAD);
		const c60 = Math.cos(60 * RAD);
		// eindaanloop op 60 graden van de wind; eindpunt E dwars naar lij van de drenkeling
		const E = offset ? { a: -offset * c60, b: -offset * s60 } : { a: 0, b: 0 };
		const rest: AB[] = [
			B.mark(),
			{ a: Math.max(D * 0.35, B.a + 3), b: -1 },
			{ a: D, b: -1.5 },
			{ a: D + 5, b: 4 },
			{ a: D - 6, b: 5 },
			{ a: L * s60 + E.a, b: -L * c60 + E.b },
			{ a: L * s60 * 0.3 + E.a, b: -L * c60 * 0.3 + E.b },
			E
		];
		const sp = spline(
			rest.map((p) => ({ x: p.a, y: p.b })),
			24
		).map((p) => ({ a: p.x, b: p.y }));
		// sp[j] komt op index base + j; elk splinesegment is 24 punten
		const base = B.pts.length - 1;
		const seg = (k: number) => base + k * 24;
		return {
			pts: B.pts.concat(sp.slice(1)).map(toW),
			labels: [
				{ p: toW(rest[3]), text: 'overstag' },
				{ p: toW(rest[5]), text: 'oploeven, vieren' }
			],
			phases: [
				{ from: 0, hint: REACT },
				{ from: iTurn, hint: 'Naar halve wind sturen' },
				{ from: base, hint: 'Halve wind van de drenkeling af varen' },
				{ from: seg(2) + 12, hint: 'Overstag' },
				{ from: seg(4), hint: 'Halve wind terug, drenkeling voor je' },
				{ from: seg(5), hint: 'Oploeven en vieren om af te remmen' },
				{ from: seg(6), hint: 'Killend bij, drenkeling aan loef: vieren' }
			]
		};
	}

	// MOB-je: afvallen tot voor de wind (15° marge tegen gijpen), oploeven naar aan de wind,
	// doorvaren tot de drenkeling dwars ligt, overstag, dan aan de wind killend bij.
	const RUN = 165;
	const CLOSE = 45;
	const Lt = 20;
	const rTack = 2.5;
	const H = (ph: number): AB => ({ a: Math.sin(ph * RAD), b: Math.cos(ph * RAD) });
	// eindaanloop aan de wind op -CLOSE; eindpunt E dwars naar lij van de drenkeling
	const E = offset
		? { a: -offset * Math.sin(CLOSE * RAD), b: -offset * Math.cos(CLOSE * RAD) }
		: { a: 0, b: 0 };
	// verplaatsing tijdens overstag
	const tk = new Builder(0, 0, CLOSE).arc(-CLOSE, rTack);
	const dA = tk.a;
	const dB = tk.b;
	const plan = (R: number) => {
		const B = new Builder(a0, b0, phi0).straight(react);
		const iTurn = B.pts.length - 1;
		B.arc(RUN, r0);
		const runStart = B.mark();
		const iRun = B.pts.length - 1;
		B.straight(R);
		const runEnd = B.mark();
		const iLuff = B.pts.length - 1;
		B.arc(CLOSE, turnRadius(legSpeed(110, wind.kn)));
		const luffEnd = B.mark();
		const iClose = B.pts.length - 1;
		const qa = E.a - B.a - dA;
		const qb = E.b - B.b - dB;
		const h1 = H(CLOSE);
		const h2 = H(-CLOSE);
		return {
			B,
			iTurn,
			iRun,
			iLuff,
			iClose,
			runStart,
			runEnd,
			luffEnd,
			s: qa * h1.a + qb * h1.b,
			t: qa * h2.a + qb * h2.b
		};
	};
	type Plan = ReturnType<typeof plan>;
	// run zo lang dat er een echt aan-de-windse rak is (dwarspeiling) en genoeg aanloop om af te remmen
	const solve = (f: (p: Plan) => number, target: number) => {
		if (f(plan(0)) >= target) return 0;
		let lo = 0;
		let hi = 250;
		for (let i = 0; i < 40; i++) {
			const m = (lo + hi) / 2;
			if (f(plan(m)) < target) lo = m;
			else hi = m;
		}
		return hi;
	};
	const R = Math.max(
		solve((p) => p.t, Lt),
		solve((p) => p.s, 5)
	);
	const P = plan(R);
	const B = P.B;
	B.straight(Math.max(0, P.s));
	const tackAt = B.mark();
	const iTack = B.pts.length - 1;
	B.arc(-CLOSE, rTack);
	const appStart = B.mark();
	const iApp = B.pts.length - 1;
	B.straight(Math.hypot(E.a - B.a, E.b - B.b));
	const mid = (p: AB, q: AB): AB => ({ a: (p.a + q.a) / 2, b: (p.b + q.b) / 2 });
	return {
		pts: B.pts.map(toW),
		labels: [
			{ p: toW(mid(P.runStart, P.runEnd)), text: 'voor de wind' },
			{ p: toW(P.luffEnd), text: 'oploeven' },
			{ p: toW(tackAt), text: 'drenkeling dwars: overstag' },
			{ p: toW(mid(appStart, E)), text: 'killend bij' }
		],
		phases: [
			{ from: 0, hint: REACT },
			{ from: P.iTurn, hint: 'Nu afvallen tot bijna voor de wind' },
			{ from: P.iRun, hint: 'Voor de wind doorvaren, pas op voor een gijp' },
			{ from: P.iLuff, hint: 'Oploeven naar aan de wind, schoot aantrekken' },
			{ from: P.iClose, hint: 'Aan de wind doorvaren tot de drenkeling dwars ligt' },
			{ from: iTack, hint: 'Drenkeling dwars: overstag' },
			{ from: iApp, hint: 'Killend bij, drenkeling aan loef: vieren om vaart te minderen' }
		]
	};
}
