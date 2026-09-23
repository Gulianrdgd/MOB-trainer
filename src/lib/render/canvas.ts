import { RAD } from '$lib/sim/constants';
import { angDiff, clamp } from '$lib/sim/geometry';
import type { SimState, Vec } from '$lib/sim/types';
import type { ShowIdeal } from '$lib/state/settings.svelte';

const TOKENS = [
	'ideal',
	'sea',
	'sea-line',
	'wave',
	'ink',
	'muted',
	'buoy',
	'good',
	'hull',
	'hull-edge',
	'sail',
	'track',
	'track-mob'
] as const;
type Token = (typeof TOKENS)[number];

export interface DrawOptions {
	showIdeal: ShowIdeal;
	/** Animatietijd voor golven, loopt door zolang er gevaren wordt. */
	animT: number;
	reducedMotion: boolean;
}

const FONT = '"Barlow Semi Condensed", sans-serif';

/** Pseudo-random 0..1 per rastercel, voor de golfposities. */
const hash = (a: number, b: number) => {
	const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
	return s - Math.floor(s);
};

/** Tekent zee, golven, spoor, ideale lijn, boot, drenkeling en schaalbalk op een canvas. */
export class Renderer {
	private readonly ctx: CanvasRenderingContext2D;
	private VW = 0;
	private VH = 0;
	private DPR = 1;
	private C = {} as Record<Token, string>;
	cam = { x: 0, y: 0, s: 8 };

	constructor(private readonly canvas: HTMLCanvasElement) {
		this.ctx = canvas.getContext('2d')!;
	}

	/** Luistert naar formaat- en themawijzigingen. Geeft een opruimfunctie terug. */
	attach(): () => void {
		const onResize = () => this.resize();
		const onTheme = () => this.readTheme();
		addEventListener('resize', onResize);
		const mq = matchMedia('(prefers-color-scheme: dark)');
		mq.addEventListener('change', onTheme);
		const mo = new MutationObserver(onTheme);
		mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
		this.resize();
		return () => {
			removeEventListener('resize', onResize);
			mq.removeEventListener('change', onTheme);
			mo.disconnect();
		};
	}

	readTheme() {
		const cs = getComputedStyle(document.documentElement);
		for (const k of TOKENS) this.C[k] = cs.getPropertyValue('--' + k).trim();
	}

	resize() {
		this.DPR = Math.min(2, window.devicePixelRatio || 1);
		const r = this.canvas.getBoundingClientRect();
		this.VW = r.width;
		this.VH = r.height;
		this.canvas.width = Math.round(this.VW * this.DPR);
		this.canvas.height = Math.round(this.VH * this.DPR);
		this.readTheme();
	}

	baseScale = () => Math.min(this.VW, this.VH) / 70;
	private minScale = () => Math.min(this.VW, this.VH) / 320;
	private CY = () => this.VH * 0.54;

	resetCamera() {
		this.cam = { x: 0, y: 0, s: this.baseScale() };
	}

	/** Camera volgt de boot; met drenkeling boot en drenkeling in beeld, na afloop het hele spoor. */
	updateCam(s: SimState, dt: number, showIdeal: ShowIdeal) {
		const { boat, mob } = s;
		const cam = this.cam;
		const { VW, VH } = this;
		let tx = boat.x;
		let ty = boat.y;
		let sc = this.baseScale();
		if (s.finished && mob) {
			const pts: Vec[] = s.track.slice(Math.max(0, s.mobIdx));
			pts.push({ x: mob.x, y: mob.y });
			if (showIdeal !== 'off')
				for (const p of mob.ideal.pts) pts.push({ x: mob.x + p.x, y: mob.y + p.y });
			let x0 = Infinity;
			let x1 = -Infinity;
			let y0 = Infinity;
			let y1 = -Infinity;
			for (const p of pts) {
				x0 = Math.min(x0, p.x);
				x1 = Math.max(x1, p.x);
				y0 = Math.min(y0, p.y);
				y1 = Math.max(y1, p.y);
			}
			tx = (x0 + x1) / 2;
			ty = (y0 + y1) / 2;
			sc = clamp(
				Math.min((VW * 0.8) / (x1 - x0 + 10), (VH * 0.6) / (y1 - y0 + 10)),
				this.minScale() * 0.6,
				this.baseScale() * 1.4
			);
		} else if (mob) {
			let x0 = Math.min(boat.x, mob.x);
			let x1 = Math.max(boat.x, mob.x);
			let y0 = Math.min(boat.y, mob.y);
			let y1 = Math.max(boat.y, mob.y);
			if (showIdeal === 'live')
				for (const p of mob.ideal.pts) {
					x0 = Math.min(x0, mob.x + p.x);
					x1 = Math.max(x1, mob.x + p.x);
					y0 = Math.min(y0, mob.y + p.y);
					y1 = Math.max(y1, mob.y + p.y);
				}
			tx = (x0 + x1) / 2;
			ty = (y0 + y1) / 2;
			sc = clamp(
				Math.min((VW * 0.72) / (x1 - x0 + 2), (VH * 0.5) / (y1 - y0 + 2)),
				this.minScale(),
				this.baseScale()
			);
		}
		const f = Math.min(1, dt * 3);
		cam.x += (tx - cam.x) * f;
		cam.y += (ty - cam.y) * f;
		cam.s += (sc - cam.s) * Math.min(1, dt * 2);
	}

	private w2s = (x: number, y: number): [number, number] => [
		this.VW / 2 + (x - this.cam.x) * this.cam.s,
		this.CY() + (y - this.cam.y) * this.cam.s
	];

	draw(s: SimState, o: DrawOptions) {
		const { ctx, C, VW, VH, w2s } = this;
		ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
		ctx.fillStyle = C.sea;
		ctx.fillRect(0, 0, VW, VH);
		const sc = this.cam.s;
		const x0 = this.cam.x - VW / 2 / sc;
		const x1 = this.cam.x + VW / 2 / sc;
		const y0 = this.cam.y - this.CY() / sc;
		const y1 = this.cam.y + (VH - this.CY()) / sc;

		// kaartraster
		const g = sc > 3 ? 50 : 100;
		ctx.strokeStyle = C['sea-line'];
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (let x = Math.floor(x0 / g) * g; x <= x1; x += g) {
			const [sx] = w2s(x, 0);
			ctx.moveTo(sx, 0);
			ctx.lineTo(sx, VH);
		}
		for (let y = Math.floor(y0 / g) * g; y <= y1; y += g) {
			const [, sy] = w2s(0, y);
			ctx.moveTo(0, sy);
			ctx.lineTo(VW, sy);
		}
		ctx.stroke();

		// golven die met de wind meedrijven
		const wr = (s.wind.dir + 180) * RAD;
		const ux = Math.sin(wr);
		const uy = -Math.cos(wr);
		const px = -uy;
		const py = ux;
		const sp = Math.max(11, 34 / sc);
		const drift = o.animT * (0.6 + s.wind.kn / 20);
		const ox = ux * drift;
		const oy = uy * drift;
		const len = Math.max(1.3 * sc, 5);
		const bow = Math.max(0.5 * sc, 2);
		ctx.strokeStyle = C.wave;
		ctx.lineWidth = 1.4;
		ctx.lineCap = 'round';
		ctx.beginPath();
		for (let gx = Math.floor((x0 - ox) / sp) - 1; gx <= Math.ceil((x1 - ox) / sp) + 1; gx++) {
			for (let gy = Math.floor((y0 - oy) / sp) - 1; gy <= Math.ceil((y1 - oy) / sp) + 1; gy++) {
				const wx = gx * sp + ox + (hash(gx, gy) - 0.5) * sp * 0.8;
				const wy = gy * sp + oy + (hash(gy, gx) - 0.5) * sp * 0.8;
				const [cx, cy] = w2s(wx, wy);
				ctx.moveTo(cx - px * len, cy - py * len);
				ctx.quadraticCurveTo(cx + ux * bow, cy + uy * bow, cx + px * len, cy + py * len);
			}
		}
		ctx.stroke();

		// spoor
		const { track, boat } = s;
		const line = (a: number, b: number, col: string, w: number) => {
			if (b - a < 1) return;
			ctx.strokeStyle = col;
			ctx.lineWidth = w;
			ctx.lineJoin = 'round';
			ctx.beginPath();
			for (let i = a; i < b; i++) {
				const [sx, sy] = w2s(track[i].x, track[i].y);
				if (i === a) ctx.moveTo(sx, sy);
				else ctx.lineTo(sx, sy);
			}
			const [bx, by] = w2s(boat.x, boat.y);
			ctx.lineTo(bx, by);
			ctx.stroke();
		};
		this.drawIdeal(s, o.showIdeal);
		if (s.mobIdx < 0) line(0, track.length, C.track, 2);
		else {
			ctx.setLineDash([4, 5]);
			line(0, s.mobIdx + 1, C.track, 2);
			ctx.setLineDash([]);
			line(s.mobIdx, track.length, C['track-mob'], 2.5);
		}
		if (s.buoy) this.drawBuoy(s.buoy);
		if (s.mob) this.drawMob(s.mob, s.t, o.reducedMotion);
		this.drawBoat(s);
		if (s.mob) this.drawOffscreen(s.mob);
	}

	private drawIdeal(s: SimState, showIdeal: ShowIdeal) {
		const { ctx, C, w2s } = this;
		const mob = s.mob;
		if (!mob || showIdeal === 'off') return;
		if (showIdeal === 'after' && !s.finished) return;
		const sp = mob.ideal.pts;
		ctx.save();
		ctx.strokeStyle = C.ideal;
		ctx.lineWidth = 3;
		ctx.setLineDash([9, 7]);
		ctx.lineCap = 'round';
		ctx.globalAlpha = 0.85;
		ctx.beginPath();
		sp.forEach((p, i) => {
			const [x, y] = w2s(mob.x + p.x, mob.y + p.y);
			if (i) ctx.lineTo(x, y);
			else ctx.moveTo(x, y);
		});
		ctx.stroke();
		ctx.setLineDash([]);
		// richtingspijltjes
		ctx.fillStyle = C.ideal;
		for (let i = 10; i < sp.length - 2; i += 16) {
			const [a, b] = w2s(mob.x + sp[i].x, mob.y + sp[i].y);
			const [c, d] = w2s(mob.x + sp[i + 1].x, mob.y + sp[i + 1].y);
			ctx.save();
			ctx.translate(a, b);
			ctx.rotate(Math.atan2(d - b, c - a));
			ctx.beginPath();
			ctx.moveTo(7, 0);
			ctx.lineTo(-5, -6);
			ctx.lineTo(-5, 6);
			ctx.fill();
			ctx.restore();
		}
		ctx.font = `600 14px ${FONT}`;
		ctx.globalAlpha = 1;
		for (const { p, text } of mob.ideal.labels) {
			const [x, y] = w2s(mob.x + p.x, mob.y + p.y);
			ctx.beginPath();
			ctx.arc(x, y, 4, 0, 7);
			ctx.fill();
			ctx.fillText(text, x + 8, y - 6);
		}
		ctx.restore();
	}

	private drawBoat(s: SimState) {
		const { ctx, C } = this;
		const { boat, wind, t } = s;
		const [sx, sy] = this.w2s(boat.x, boat.y);
		const sc = this.cam.s;
		const d = angDiff(wind.dir, boat.h);
		const sgn = d >= 0 ? -1 : 1; // giek naar lij
		if (sc < 3.2) {
			ctx.fillStyle = C.hull;
			ctx.globalAlpha = 0.35;
			ctx.beginPath();
			ctx.arc(sx, sy, 14, 0, 7);
			ctx.fill();
			ctx.globalAlpha = 1;
		}
		ctx.save();
		ctx.translate(sx, sy);
		ctx.rotate(boat.h * RAD);
		ctx.scale(sc, sc);
		const lw = 1.2 / sc;
		// romp
		ctx.beginPath();
		ctx.moveTo(0, -3);
		ctx.bezierCurveTo(1.05, -2.1, 1.18, 0.6, 0.95, 3);
		ctx.lineTo(-0.95, 3);
		ctx.bezierCurveTo(-1.18, 0.6, -1.05, -2.1, 0, -3);
		ctx.closePath();
		ctx.fillStyle = C.hull;
		ctx.fill();
		ctx.strokeStyle = C['hull-edge'];
		ctx.lineWidth = lw * 1.3;
		ctx.stroke();
		// roer
		const ra = boat.rudder * 30 * RAD;
		ctx.beginPath();
		ctx.moveTo(0, 3);
		ctx.lineTo(Math.sin(ra) * 1, 3 + Math.cos(ra) * 1);
		ctx.lineWidth = lw * 2.4;
		ctx.stroke();
		// zeilen
		const flap = boat.luff;
		const drawSail = (ax: number, ay: number, b: number, L: number, phase: number) => {
			const bx = sgn * Math.sin(b * RAD) * L;
			const by = Math.cos(b * RAD) * L;
			const nx = sgn * Math.cos(b * RAD);
			const ny = -Math.sin(b * RAD);
			const bulge = L * (0.2 * (1 - flap) + flap * 0.14 * Math.sin(t * 22 + phase));
			const mx = ax + bx / 2 + nx * bulge;
			const my = ay + by / 2 + ny * bulge;
			ctx.beginPath();
			ctx.moveTo(ax, ay);
			ctx.quadraticCurveTo(mx, my, ax + bx, ay + by);
			ctx.lineTo(ax, ay);
			ctx.fillStyle = C.sail;
			ctx.fill();
			ctx.strokeStyle = C['hull-edge'];
			ctx.lineWidth = lw;
			ctx.stroke();
			return [ax + bx, ay + by];
		};
		drawSail(0, -2.85, Math.min(boat.disp * 0.75 + 6, 90), 2.0, 1.7);
		const [ex, ey] = drawSail(0, -0.6, boat.disp, 3.0, 0);
		ctx.beginPath();
		ctx.moveTo(0, -0.6);
		ctx.lineTo(ex, ey);
		ctx.lineWidth = lw * 2.2;
		ctx.stroke();
		// mast en windvaan
		ctx.fillStyle = C['hull-edge'];
		ctx.beginPath();
		ctx.arc(0, -0.6, 0.16, 0, 7);
		ctx.fill();
		const va = (wind.dir + 180 - boat.h) * RAD;
		ctx.strokeStyle = C.buoy;
		ctx.lineWidth = lw * 2;
		ctx.beginPath();
		ctx.moveTo(0, -0.6);
		ctx.lineTo(Math.sin(va) * 1.1, -0.6 - Math.cos(va) * 1.1);
		ctx.stroke();
		ctx.restore();
	}

	private drawMob(mob: Vec, t: number, reducedMotion: boolean) {
		const { ctx, C } = this;
		const [sx, sy] = this.w2s(mob.x, mob.y);
		const r = Math.max(0.55 * this.cam.s, 6);
		// pulserende ring; bij reduced motion een vaste ring
		const pulse = reducedMotion ? 0.35 : (t * 1.2) % 1;
		ctx.strokeStyle = C.buoy;
		ctx.globalAlpha = 1 - pulse;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(sx, sy, r + 4 + pulse * r * 2.2, 0, 7);
		ctx.stroke();
		ctx.globalAlpha = 1;
		ctx.lineWidth = r * 0.55;
		ctx.strokeStyle = C.buoy;
		ctx.beginPath();
		ctx.arc(sx, sy, r, 0, 7);
		ctx.stroke();
		ctx.strokeStyle = '#fff';
		ctx.lineWidth = r * 0.55;
		for (let i = 0; i < 4; i++) {
			const a = (i * Math.PI) / 2 + 0.4;
			ctx.beginPath();
			ctx.arc(sx, sy, r, a, a + 0.35);
			ctx.stroke();
		}
		ctx.fillStyle = C.ink;
		ctx.beginPath();
		ctx.arc(sx, sy, r * 0.42, 0, 7);
		ctx.fill();
	}

	/** Reddingsboei: oranje-witte ring zonder persoon erin. */
	private drawBuoy(p: Vec) {
		const { ctx, C } = this;
		const [sx, sy] = this.w2s(p.x, p.y);
		const r = Math.max(0.4 * this.cam.s, 5);
		ctx.lineWidth = r * 0.5;
		ctx.strokeStyle = C.buoy;
		ctx.beginPath();
		ctx.arc(sx, sy, r, 0, 7);
		ctx.stroke();
		ctx.strokeStyle = '#fff';
		for (let i = 0; i < 4; i++) {
			const a = (i * Math.PI) / 2;
			ctx.beginPath();
			ctx.arc(sx, sy, r, a, a + 0.45);
			ctx.stroke();
		}
	}

	/** Pijl aan de rand van het scherm als de drenkeling buiten beeld is. */
	private drawOffscreen(mob: Vec) {
		const { ctx, C, VW, VH } = this;
		const [sx, sy] = this.w2s(mob.x, mob.y);
		const m = 26;
		if (sx > m && sx < VW - m && sy > m && sy < VH - m) return;
		const cx = VW / 2;
		const cy = this.CY();
		const dx = sx - cx;
		const dy = sy - cy;
		const k = Math.min((VW / 2 - m) / Math.abs(dx || 1e-6), (VH / 2 - m) / Math.abs(dy || 1e-6));
		const ex = cx + dx * k;
		const ey = cy + dy * k;
		ctx.save();
		ctx.translate(ex, ey);
		ctx.rotate(Math.atan2(dy, dx));
		ctx.fillStyle = C.buoy;
		ctx.beginPath();
		ctx.moveTo(12, 0);
		ctx.lineTo(-8, -9);
		ctx.lineTo(-8, 9);
		ctx.fill();
		ctx.restore();
	}
}
