import { addAttempt, parseAttempts, type Attempt } from '$lib/history';

const KEY = 'mob-history';

class HistoryStore {
	attempts = $state.raw<Attempt[]>([]);

	/** Pas na hydratie aanroepen. */
	load() {
		try {
			this.attempts = parseAttempts(JSON.parse(localStorage.getItem(KEY) || '[]'));
		} catch {
			this.attempts = [];
		}
	}

	add(a: Attempt) {
		this.attempts = addAttempt(this.attempts, a);
		try {
			localStorage.setItem(KEY, JSON.stringify(this.attempts));
		} catch {
			// opslag geblokkeerd: geschiedenis geldt alleen deze sessie
		}
	}
}

export const history = new HistoryStore();
