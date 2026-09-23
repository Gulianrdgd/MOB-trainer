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
	timeScale: 1
};

class SettingsStore {
	values = $state<Settings>({ ...defaults });

	/** Pas na hydratie aanroepen, zodat de voorgerenderde HTML met de standaardwaarden klopt. */
	load() {
		try {
			Object.assign(this.values, JSON.parse(localStorage.getItem(KEY) || '{}'));
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
