import type { Method, WindStrength } from '$lib/sim/types';

export type ShowIdeal = 'live' | 'after' | 'off';

/**
 * Instellingen zoals in het prototype, met dezelfde localStorage-sleutel en waarden
 * zodat eerder opgeslagen instellingen blijven werken.
 */
export interface Settings {
	/** Graden als string, of 'random'. */
	windDir: string;
	windStrength: WindStrength;
	/** Windhoek als string, of 'random'. */
	startCourse: string;
	mobMode: 'auto' | 'manual';
	autoTrim: 'true' | 'false';
	showIdeal: ShowIdeal;
	method: Method;
	timeScale: 1 | 2;
	/** Leerstand: hints tonen tijdens de manoeuvre. */
	hints: 'on' | 'off';
	/** Vlagen en windschiftingen. */
	variableWind: 'on' | 'off';
}

const KEY = 'mob-settings';

const defaults: Settings = {
	windDir: 'random',
	windStrength: 'matig',
	startCourse: 'random',
	mobMode: 'auto',
	autoTrim: 'false',
	showIdeal: 'live',
	method: 'mobje',
	timeScale: 1,
	hints: 'off',
	variableWind: 'off'
};

const ALLOWED: { [K in keyof Settings]: readonly Settings[K][] } = {
	windDir: [],
	windStrength: ['licht', 'matig', 'stevig'],
	startCourse: [],
	mobMode: ['auto', 'manual'],
	autoTrim: ['true', 'false'],
	showIdeal: ['live', 'after', 'off'],
	method: ['mobje', 'halvewind'],
	timeScale: [1, 2],
	hints: ['on', 'off'],
	variableWind: ['on', 'off']
};

/** 'random' of een getal in [min, max] als string, zoals in een gedeelde link. */
const degrees = (v: unknown, min: number, max: number) =>
	v === 'random' || (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v) && +v >= min && +v <= max);

/** Alleen geldige instellingen uit onbetrouwbare opslag overnemen. */
export function parseSettings(raw: unknown): Partial<Settings> {
	if (!raw || typeof raw !== 'object') return {};
	const r = raw as Record<string, unknown>;
	const out: Record<string, unknown> = {};
	for (const key of Object.keys(ALLOWED) as (keyof Settings)[]) {
		const v = r[key];
		const ok =
			key === 'windDir'
				? degrees(v, 0, 359.99)
				: key === 'startCourse'
					? degrees(v, 30, 180)
					: (ALLOWED[key] as readonly unknown[]).includes(v);
		if (ok) out[key] = v;
	}
	return out as Partial<Settings>;
}

class SettingsStore {
	values = $state<Settings>({ ...defaults });

	/** Pas na hydratie aanroepen, zodat de voorgerenderde HTML met de standaardwaarden klopt. */
	load() {
		try {
			Object.assign(this.values, parseSettings(JSON.parse(localStorage.getItem(KEY) || '{}')));
		} catch {
			// geen of ongeldige opslag: standaardwaarden houden
		}
	}

	set<K extends keyof Settings>(key: K, value: Settings[K]) {
		this.values[key] = value;
		this.save();
	}

	private save() {
		try {
			localStorage.setItem(KEY, JSON.stringify(this.values));
		} catch {
			// opslag geblokkeerd (privémodus): instellingen gelden alleen deze sessie
		}
	}
}

export const settings = new SettingsStore();
