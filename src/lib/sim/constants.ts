/** Meter per seconde in één knoop. */
export const KN = 0.514444;
export const RAD = Math.PI / 180;

/** Oppakken: langzamer dan 1,5 kn binnen 4,5 m van de drenkeling. */
export const PICK_V = 1.5 * KN;
export const PICK_R = 4.5;

/** Snelheidspolar: [windhoek in graden, fractie van de maximale snelheid]. */
export const POLAR: readonly (readonly [number, number])[] = [
	[0, 0],
	[28, 0],
	[40, 0.55],
	[50, 0.8],
	[70, 0.95],
	[95, 1],
	[120, 0.95],
	[150, 0.82],
	[180, 0.72]
];

/** Windsterkte in knopen. */
export const STRENGTH = { licht: 8, matig: 12, stevig: 18 } as const;

/** Maximale bootsnelheid als fractie van de windsnelheid. */
export const SPEED_FACTOR = 0.42;

/** Draaisnelheid bij vol roer, graden per seconde. */
export const TURN_RATE = 38;

export const DIRS = [
	'N',
	'NNO',
	'NO',
	'ONO',
	'O',
	'OZO',
	'ZO',
	'ZZO',
	'Z',
	'ZZW',
	'ZW',
	'WZW',
	'W',
	'WNW',
	'NW',
	'NNW'
] as const;
