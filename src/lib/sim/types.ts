import type { WindField } from './wind';

export type Method = 'mobje' | 'halvewind';
export type WindStrength = 'licht' | 'matig' | 'stevig';

export interface Vec {
	x: number;
	y: number;
}

/** Wind uit richting dir (graden, 0 = noord), sterkte in knopen. */
export interface Wind {
	dir: number;
	kn: number;
}

/**
 * Wereldcoördinaten in meters, x naar oost, y naar zuid (schermrichting).
 * h is de koers in graden, v de snelheid in m/s, boom de gevraagde giekhoek,
 * disp de werkelijke giekhoek (begrensd door de wind), luff 0..1 hoeveel het zeil klappert.
 */
export interface Boat {
	x: number;
	y: number;
	h: number;
	v: number;
	boom: number;
	rudder: number;
	luff: number;
	disp: number;
}

export interface PathLabel {
	p: Vec;
	text: string;
}

/** Vanaf punt `from` van het ideale pad geldt deze hint. */
export interface PathPhase {
	from: number;
	hint: string;
}

/** Ideaal pad, relatief ten opzichte van de drenkeling. */
export interface IdealPath {
	pts: Vec[];
	labels: PathLabel[];
	/** Fasen voor de leerstand, oplopend op `from`. */
	phases: PathPhase[];
}

export interface Mob extends Vec {
	/** Simulatietijd waarop de drenkeling te water ging. */
	t0: number;
	ideal: IdealPath;
}

export interface RunStats {
	flybys: number;
	tacks: number;
	gybes: number;
	crash: number;
	maxDist: number;
	armed: boolean;
	inPass: boolean;
	approachTh: number | null;
	approachFar: boolean;
	startTh: number;
	/** Seconden na het alarm dat de reddingsboei gegooid werd, null als dat niet gebeurde. */
	buoyAt: number | null;
	/** Seconden dat de drenkeling verder dan SIGHT_R weg was. */
	outOfSight: number;
}

export interface SimConfig {
	autoTrim: boolean;
	method: Method;
	/** Vlagen en windschiftingen. */
	variableWind?: boolean;
	/**
	 * Rekenen zoals het prototype: harder afremmen en een ideaal pad dat op de drenkeling
	 * eindigt. Alleen voor de pariteitstest.
	 */
	prototype?: boolean;
}

/** Beginsituatie van een run: windrichting, koers en moment van het alarm. */
export interface Scenario {
	dir: number;
	h: number;
	/** Simulatietijd van het alarm, Infinity bij zelf starten. */
	at: number;
	/** Seed voor vlagen en windschiftingen. */
	windSeed?: number;
}

/** Moment op het spoor na het alarm, voor terugkijken. */
export interface ReplaySample {
	t: number;
	x: number;
	y: number;
	h: number;
	v: number;
	/** Positie van de drenkeling, die langzaam met de wind meedrijft. */
	mx: number;
	my: number;
}

export interface TrackMark {
	t: number;
	x: number;
	y: number;
	type: 'tack' | 'gybe' | 'crash';
}

/** Alles wat nodig is om een afgeronde run terug te kijken. */
export interface ReplayData {
	samples: ReplaySample[];
	marks: TrackMark[];
	/** Ideaal pad relatief ten opzichte van de drenkeling. */
	ideal: Vec[];
	windDir: number;
}

export interface SimState {
	config: SimConfig;
	/** Basiswind; bij variabele wind komen daar vlagen en schiftingen bij. */
	wind: Wind;
	windField: WindField | null;
	boat: Boat;
	mob: Mob | null;
	/** Gegooide reddingsboei; drijft net als de drenkeling met de wind mee. */
	buoy: Vec | null;
	t: number;
	mobAt: number;
	track: Vec[];
	/** Index in track waar het alarm viel, -1 zolang er geen drenkeling is. */
	mobIdx: number;
	trackTimer: number;
	run: RunStats;
	/** Monsters vanaf het alarm, elke 0,2 s en bij oppakken. */
	replay: ReplaySample[];
	/** Overstag- en gijpmomenten. */
	marks: TrackMark[];
	prevTh: number;
	prevSide: number;
	finished: boolean;
}

export interface Input {
	left: boolean;
	right: boolean;
	in: boolean;
	out: boolean;
	loose: boolean;
}

export type SimEvent =
	| { type: 'tack' }
	| { type: 'gybe' }
	| { type: 'crash' }
	| { type: 'flyby'; speed: number }
	| { type: 'mob' }
	| { type: 'finish' };
