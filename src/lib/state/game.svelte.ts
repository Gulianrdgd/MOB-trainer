import { fmt, fmtTime } from '$lib/format';
import { Renderer } from '$lib/render/canvas';
import { BUOY_IN_TIME, KN, SIGHT_R, STRENGTH } from '$lib/sim/constants';
import { angDiff, courseName } from '$lib/sim/geometry';
import { createSim, localWind, optBoom, step, throwBuoy, triggerMob } from '$lib/sim/physics';
import { mulberry32, randomSeed } from '$lib/sim/rng';
import { createHintTracker, currentHint, type HintTracker } from '$lib/sim/hints';
import { createScenario } from '$lib/sim/scenario';
import { score, type Result } from '$lib/sim/scoring';
import type { SharedScenario } from '$lib/share';
import type {
	Input,
	ReplayData,
	Method,
	Scenario,
	SimEvent,
	SimState,
	Wind,
	WindStrength
} from '$lib/sim/types';
import { attemptFrom } from '$lib/history';
import { history } from './history.svelte';
import { settings } from './settings.svelte';

/** Welk venster over het canvas ligt. 'track' = resultaat verborgen om het spoor te bekijken. */
export type Overlay = 'setup' | 'result' | 'track' | 'history' | 'none';

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
	/** Reddingsboei: '-', 'gooi nu (B)', 'gegooid' of 'nog niet'. */
	buoy: string;
	/** Drenkeling in zicht: '-', 'in zicht' of 'uit zicht'. */
	sight: string;
	/** Waarschuwing tonen bij boei of zicht. */
	buoyWarn: boolean;
	sightWarn: boolean;
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
	buoy: '-',
	sight: '-',
	buoyWarn: false,
	sightWarn: false,
	koers: '-',
	trimOpt: 0,
	trimCur: 0,
	luff: ''
};

const TUTORIAL_KEY = 'mob-tutorial-done';

function tutorialDone(): boolean {
	try {
		return localStorage.getItem(TUTORIAL_KEY) === '1';
	} catch {
		return false;
	}
}

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
	hasBuoy = $state(false);
	/** Vastgehouden schermknoppen. */
	hold = $state<Input>({ left: false, right: false, in: false, out: false, loose: false });
	hud = $state<HudView>({ ...INITIAL_HUD });
	toast = $state({ msg: '', alarm: false, show: false });
	result = $state.raw<Result | null>(null);
	/** Gegevens om de afgelopen run terug te kijken. */
	replay = $state.raw<ReplayData | null>(null);
	/** Wind van de huidige run, voor het windkompas. Null voor de eerste start. */
	wind = $state.raw<Wind | null>(null);
	/** Instellingen waarmee de huidige run gestart is. */
	runManualMob = $state(false);
	runAutoTrim = $state(false);

	/** Stap in de rondleiding voor nieuwe gebruikers, null als die niet loopt. */
	tutorialStep = $state<number | null>(null);
	/** Hint van de leerstand, null als die uit staat of er niets te zeggen is. */
	hint = $state<string | null>(null);

	showPaused = $derived(this.paused && this.overlay === 'none' && this.tutorialStep === null);

	/** Situatie uit een gedeelde link; geldt voor de eerstvolgende start. */
	shared = $state.raw<SharedScenario | null>(null);

	private sim: SimState = idleSim();
	private hintTracker: HintTracker = createHintTracker();
	private scenario: Scenario | null = null;
	/** Seed, windkracht en methode van de huidige run, om de situatie te kunnen delen. */
	private run: {
		seed: number;
		windStrength: WindStrength;
		method: Method;
		variableWind: boolean;
	} | null = null;
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
			this.hint = settings.values.hints === 'on' ? currentHint(this.hintTracker, s) : null;
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
		const s = this.sim;
		if (this.run)
			history.add(
				attemptFrom(s.run, {
					at: Date.now(),
					time: this.result.time,
					method: s.config.method,
					windDir: s.wind.dir,
					windStrength: this.run.windStrength,
					side: this.result.side
				})
			);
		this.replay = {
			samples: s.replay,
			marks: s.marks,
			ideal: s.mob!.ideal.pts,
			windDir: s.wind.dir
		};
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
		if (!repeat || !this.scenario || !this.run) {
			const seed = this.shared?.seed ?? randomSeed();
			this.shared = null;
			this.scenario = createScenario(v, mulberry32(seed));
			this.run = {
				seed,
				windStrength: v.windStrength,
				method: v.method,
				variableWind: v.variableWind === 'on'
			};
		}
		const scn = this.scenario;
		this.sim = createSim(scn, kn, {
			autoTrim: v.autoTrim === 'true',
			method: v.method,
			variableWind: v.variableWind === 'on'
		});
		this.hintTracker = createHintTracker();
		this.hint = null;
		this.renderer?.resetCamera();
		this.wind = { dir: scn.dir, kn };
		this.runManualMob = v.mobMode === 'manual';
		this.runAutoTrim = v.autoTrim === 'true';
		this.result = null;
		this.replay = null;
		this.hasMob = false;
		this.hasBuoy = false;
		this.finished = false;
		this.paused = false;
		this.running = true;
		this.overlay = 'none';
		clearTimeout(this.resultTimer);
		// direct vullen: bij de rondleiding staat de simulatie meteen stil
		this.updateHud();
		if (!tutorialDone()) this.startTutorial();
	}

	/** Rondleiding tonen; de simulatie staat zolang stil. */
	startTutorial() {
		this.tutorialStep = 0;
		this.paused = true;
	}

	endTutorial() {
		this.tutorialStep = null;
		this.paused = false;
		try {
			localStorage.setItem(TUTORIAL_KEY, '1');
		} catch {
			// opslag geblokkeerd: de rondleiding komt dan bij de volgende start terug
		}
	}

	/** Neemt een gedeelde situatie over in de instellingen; de volgende start gebruikt de seed. */
	loadShared(sh: SharedScenario) {
		settings.set('windDir', String(sh.windDir));
		settings.set('windStrength', sh.windStrength);
		settings.set('startCourse', String(sh.startCourse));
		settings.set('method', sh.method);
		settings.set('variableWind', sh.variableWind ? 'on' : 'off');
		this.shared = sh;
	}

	/** De situatie van de huidige run, om te delen. */
	currentScenario(): SharedScenario | null {
		if (!this.scenario || !this.run) return null;
		return {
			windDir: this.scenario.dir,
			startCourse: Math.round(Math.abs(angDiff(this.scenario.h, this.scenario.dir))),
			...this.run
		};
	}

	triggerMob() {
		if (this.tutorialStep !== null) return;
		if (!this.running || this.finished || this.hasMob || this.paused) return;
		if (triggerMob(this.sim)) this.onMob();
	}

	throwBuoy() {
		if (!this.running || this.finished || this.paused || !this.hasMob) return;
		if (throwBuoy(this.sim)) {
			this.hasBuoy = true;
			this.showToast('Reddingsboei gegooid');
		}
	}

	openSetup() {
		this.tutorialStep = null;
		this.paused = true;
		this.overlay = 'setup';
	}

	togglePause() {
		if (!this.running || this.finished || this.overlay === 'setup' || this.tutorialStep !== null)
			return;
		this.paused = !this.paused;
	}

	private updateHud() {
		const { boat, mob, t } = this.sim;
		const wind = localWind(this.sim);
		if (this.sim.windField) {
			// kompas volgt de wind op de boot, alleen bijwerken als het afgeronde getal verandert
			const dir = Math.round(wind.dir);
			const kn = Math.round(wind.kn);
			if (this.wind?.dir !== dir || this.wind?.kn !== kn) this.wind = { dir, kn };
		}
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
			const since = t - mob.t0;
			h.buoy = this.sim.buoy ? 'gegooid' : since <= BUOY_IN_TIME ? 'gooi nu (B)' : 'nog niet';
			h.buoyWarn = !this.sim.buoy;
			h.sight = dist > SIGHT_R ? 'uit zicht' : 'in zicht';
			h.sightWarn = dist > SIGHT_R;
		} else {
			h.status = this.runManualMob ? 'Druk op MOB als je klaar bent' : 'Vrij varen, blijf alert';
			h.alarm = false;
			h.dist = h.brg = h.time = h.buoy = h.sight = '-';
			h.buoyWarn = h.sightWarn = false;
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
		if (k === 'b') this.throwBuoy();
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
