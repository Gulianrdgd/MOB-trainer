import { fmt, fmtTime } from '$lib/format';
import { Renderer } from '$lib/render/canvas';
import { KN, STRENGTH } from '$lib/sim/constants';
import { angDiff, courseName } from '$lib/sim/geometry';
import { createSim, optBoom, step, triggerMob } from '$lib/sim/physics';
import { mulberry32, randomSeed } from '$lib/sim/rng';
import { createScenario } from '$lib/sim/scenario';
import { score, type Result } from '$lib/sim/scoring';
import type { Input, Scenario, SimEvent, SimState, Wind } from '$lib/sim/types';
import { settings } from './settings.svelte';

/** Welk venster over het canvas ligt. 'track' = resultaat verborgen om het spoor te bekijken. */
export type Overlay = 'setup' | 'result' | 'track' | 'none';

export type HoldKey = keyof Input;

export interface HudView {
	status: string;
	alarm: boolean;
	speed: string;
	course: string;
	twa: string;
	dist: string;
	brg: string;
	time: string;
	koers: string;
	/** Posities op de schootbalk in procent. */
	trimOpt: number;
	trimCur: number;
	luff: string;
}

const INITIAL_HUD: HudView = {
	status: 'Vrij varen',
	alarm: false,
	speed: '0,0 kn',
	course: '000°',
	twa: '0°',
	dist: '-',
	brg: '-',
	time: '-',
	koers: '-',
	trimOpt: 0,
	trimCur: 0,
	luff: ''
};

/** Stilliggende boot als achtergrond voor de eerste start. */
function idleSim(): SimState {
	const s = createSim({ dir: 225, h: 315, at: Infinity }, 12, { autoTrim: false, method: 'mobje' });
	Object.assign(s.boat, { v: 0, boom: 20, disp: 20 });
	return s;
}

class Game {
	overlay = $state<Overlay>('setup');
	paused = $state(false);
	running = $state(false);
	finished = $state(false);
	hasMob = $state(false);
	/** Vastgehouden schermknoppen. */
	hold = $state<Input>({ left: false, right: false, in: false, out: false, loose: false });
	hud = $state<HudView>({ ...INITIAL_HUD });
	toast = $state({ msg: '', alarm: false, show: false });
	result = $state.raw<Result | null>(null);
	/** Wind van de huidige run, voor het windkompas. Null voor de eerste start. */
	wind = $state.raw<Wind | null>(null);
	/** Instellingen waarmee de huidige run gestart is. */
	runManualMob = $state(false);
	runAutoTrim = $state(false);

	showPaused = $derived(this.paused && this.overlay !== 'setup');

	private sim: SimState = idleSim();
	private scenario: Scenario | null = null;
	private keys: Record<string, boolean> = {};
	private renderer: Renderer | null = null;
	private reducedMotion = false;
	private animT = 0;
	private toastTimer: ReturnType<typeof setTimeout> | undefined;
	private resultTimer: ReturnType<typeof setTimeout> | undefined;

	/** Koppelt het canvas en start de game loop. Geeft een opruimfunctie terug. */
	attach(canvas: HTMLCanvasElement): () => void {
		const renderer = new Renderer(canvas);
		this.renderer = renderer;
		const detach = renderer.attach();
		renderer.resetCamera();

		const mq = matchMedia('(prefers-reduced-motion: reduce)');
		const onMotion = () => (this.reducedMotion = mq.matches);
		onMotion();
		mq.addEventListener('change', onMotion);

		let raf = 0;
		let last = performance.now();
		const frame = (now: number) => {
			const dt = Math.min(0.05, (now - last) / 1000);
			last = now;
			this.frame(dt);
			raf = requestAnimationFrame(frame);
		};
		raf = requestAnimationFrame(frame);

		return () => {
			cancelAnimationFrame(raf);
			mq.removeEventListener('change', onMotion);
			detach();
			clearTimeout(this.toastTimer);
			clearTimeout(this.resultTimer);
			this.renderer = null;
		};
	}

	private frame(dt: number) {
		const r = this.renderer;
		if (!r) return;
		const s = this.sim;
		const showIdeal = settings.values.showIdeal;
		if (this.running && !this.paused) {
			for (let i = 0; i < settings.values.timeScale; i++)
				for (const ev of step(s, this.input(), dt)) this.onEvent(ev);
			if (!this.reducedMotion) this.animT += dt;
			r.updateCam(s, dt, showIdeal);
			this.updateHud();
		}
		r.draw(s, { showIdeal, animT: this.animT, reducedMotion: this.reducedMotion });
	}

	private input(): Input {
		const k = this.keys;
		const h = this.hold;
		return {
			left: !!(k.arrowleft || k.a || h.left),
			right: !!(k.arrowright || k.d || h.right),
			in: !!(k.arrowup || k.w || h.in),
			out: !!(k.arrowdown || k.s || h.out),
			loose: !!(k[' '] || h.loose)
		};
	}

	private onEvent(ev: SimEvent) {
		switch (ev.type) {
			case 'tack':
				return this.showToast('Overstag');
			case 'gybe':
				return this.showToast('Gijp');
			case 'crash':
				return this.showToast('Klapgijp! Haal de schoot in voor je gijpt.', true, 2400);
			case 'flyby':
				return this.showToast(`Te hard: ${fmt(ev.speed)} kn. Rond opnieuw.`, true, 2000);
			case 'mob':
				return this.onMob();
			case 'finish':
				return this.onFinish();
		}
	}

	private onMob() {
		this.hasMob = true;
		this.showToast('Man over boord!', true, 2200);
	}

	private onFinish() {
		const v = settings.values;
		this.finished = true;
		this.result = score(this.sim, v.showIdeal, v.method);
		clearTimeout(this.resultTimer);
		this.resultTimer = setTimeout(() => {
			if (this.finished) this.overlay = 'result';
		}, 700);
	}

	showToast(msg: string, alarm = false, ms = 1600) {
		this.toast = { msg, alarm, show: true };
		clearTimeout(this.toastTimer);
		this.toastTimer = setTimeout(() => (this.toast.show = false), ms);
	}

	/** Nieuwe run. Met repeat dezelfde wind, koers en alarmtijd als de vorige. */
	newRun(repeat: boolean) {
		const v = settings.values;
		const kn = STRENGTH[v.windStrength] ?? 12;
		const scn =
			repeat && this.scenario ? this.scenario : createScenario(v, mulberry32(randomSeed()));
		this.scenario = scn;
		this.sim = createSim(scn, kn, { autoTrim: v.autoTrim === 'true', method: v.method });
		this.renderer?.resetCamera();
		this.wind = { dir: scn.dir, kn };
		this.runManualMob = v.mobMode === 'manual';
		this.runAutoTrim = v.autoTrim === 'true';
		this.result = null;
		this.hasMob = false;
		this.finished = false;
		this.paused = false;
		this.running = true;
		this.overlay = 'none';
		clearTimeout(this.resultTimer);
	}

	triggerMob() {
		if (!this.running || this.finished || this.hasMob || this.paused) return;
		if (triggerMob(this.sim)) this.onMob();
	}

	openSetup() {
		this.paused = true;
		this.overlay = 'setup';
	}

	togglePause() {
		if (!this.running || this.finished || this.overlay === 'setup') return;
		this.paused = !this.paused;
	}

	private updateHud() {
		const { boat, wind, mob, t } = this.sim;
		const d = angDiff(wind.dir, boat.h);
		const th = Math.abs(d);
		const h = this.hud;
		h.speed = fmt(boat.v / KN) + ' kn';
		h.course = String(Math.round(boat.h) % 360).padStart(3, '0') + '°';
		h.twa = Math.round(th) + '°';
		h.koers = th < 30 ? 'In de wind' : `${courseName(th)}, ${d >= 0 ? 'SB' : 'BB'}-boeg`;
		h.trimOpt = (optBoom(th) / 90) * 100;
		h.trimCur = (boat.boom / 90) * 100;
		h.luff = th < 28 ? 'staat in de wind' : boat.luff > 0.35 ? 'klappert' : '';
		if (mob) {
			const dist = Math.hypot(mob.x - boat.x, mob.y - boat.y);
			h.status = this.finished ? 'Aan boord' : 'Man over boord!';
			h.alarm = !this.finished;
			h.dist = Math.round(dist) + ' m';
			const rb = angDiff(Math.atan2(mob.x - boat.x, -(mob.y - boat.y)) / (Math.PI / 180), boat.h);
			const ab = Math.abs(rb);
			h.brg =
				ab < 12
					? 'recht vooruit'
					: ab > 168
						? 'recht achter'
						: (Math.abs(ab - 90) < 12 ? 'dwars ' : Math.round(ab) + '° ') + (rb > 0 ? 'SB' : 'BB');
			h.time = fmtTime(t - mob.t0);
		} else {
			h.status = this.runManualMob ? 'Druk op MOB als je klaar bent' : 'Vrij varen, blijf alert';
			h.alarm = false;
			h.dist = h.brg = h.time = '-';
		}
	}

	/* ---------- toetsenbord ---------- */

	onKeyDown(e: KeyboardEvent) {
		if (e.metaKey || e.ctrlKey || e.altKey) return;
		const k = e.key.toLowerCase();
		const inCard = e.target instanceof Element && e.target.closest('[data-card]');
		if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k) && !inCard)
			e.preventDefault();
		this.keys[k] = true;
		if (e.repeat) return;
		if (k === 'm') this.triggerMob();
		if (k === 'p') this.togglePause();
		if (k === 'r') this.openSetup();
	}

	onKeyUp(e: KeyboardEvent) {
		this.keys[e.key.toLowerCase()] = false;
	}

	/** Venster verliest focus: alles loslaten, anders blijft een toets hangen. */
	releaseAll() {
		for (const k in this.keys) this.keys[k] = false;
		for (const k of Object.keys(this.hold) as HoldKey[]) this.hold[k] = false;
	}
}

export const game = new Game();
