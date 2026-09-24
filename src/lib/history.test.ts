import { describe, expect, it } from 'vitest';
import {
	addAttempt,
	MAX_ATTEMPTS,
	mistakes,
	parseAttempts,
	summarize,
	type Attempt
} from './history';

const attempt = (o: Partial<Attempt> = {}): Attempt => ({
	at: 0,
	time: 60,
	method: 'mobje',
	windDir: 225,
	windStrength: 'matig',
	startTh: 90,
	flybys: 0,
	crash: 0,
	buoyAt: 2,
	outOfSight: 0,
	...o
});

describe('geschiedenis', () => {
	it('bewaart de nieuwste 50', () => {
		let list: Attempt[] = [];
		for (let i = 0; i < 60; i++) list = addAttempt(list, attempt({ at: i }));
		expect(list).toHaveLength(MAX_ATTEMPTS);
		expect(list[0].at).toBe(59);
		expect(list.at(-1)!.at).toBe(10);
	});

	it('benoemt de fouten', () => {
		expect(mistakes(attempt())).toEqual([]);
		expect(mistakes(attempt({ flybys: 2, crash: 1, buoyAt: null, outOfSight: 3 }))).toEqual([
			'2× te hard',
			'1× klapgijp',
			'geen boei',
			'uit zicht'
		]);
		expect(mistakes(attempt({ buoyAt: 9 }))).toEqual(['boei te laat']);
		expect(mistakes(attempt({ side: 'lij' }))).toEqual(['verkeerde kant']);
		expect(mistakes(attempt({ side: 'loef' }))).toEqual([]);
	});

	it('vindt de beste tijd per windkracht en de zwakste startkoers', () => {
		const s = summarize([
			attempt({ time: 80, windStrength: 'licht' }),
			attempt({ time: 70, windStrength: 'licht' }),
			attempt({ time: 50, windStrength: 'stevig', startTh: 135, flybys: 1 }),
			attempt({ time: 90, windStrength: 'stevig', startTh: 135, crash: 1 }),
			attempt({ time: 40, startTh: 45, buoyAt: null })
		]);
		expect(s.best.licht!.time).toBe(70);
		expect(s.best.matig!.time).toBe(40);
		expect(s.best.stevig!.time).toBe(50);
		expect(s.weakest).toEqual({ course: 'Ruime wind', flawed: 2, total: 2 });
	});

	it('heeft geen zwakste koers als alles goed ging', () => {
		expect(summarize([attempt()]).weakest).toBeNull();
		expect(summarize([]).best).toEqual({ licht: null, matig: null, stevig: null });
	});

	it('negeert ongeldige opslag', () => {
		expect(parseAttempts('onzin')).toEqual([]);
		expect(
			parseAttempts([attempt(), { time: 'x' }, null, attempt({ method: 'x' as never })])
		).toEqual([attempt()]);
	});
});
