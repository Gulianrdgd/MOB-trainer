import type { Attachment } from 'svelte/attachments';

/** Focus op dit element zodra het verschijnt, zodat toetsenbordgebruikers in het venster beginnen. */
export const focusOnMount: Attachment<HTMLElement> = (el) => {
	el.focus({ preventScroll: true });
};
