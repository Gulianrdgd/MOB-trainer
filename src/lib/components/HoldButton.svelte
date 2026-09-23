<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		held = $bindable(false),
		disabled = false,
		children
	}: { held?: boolean; disabled?: boolean; children: Snippet } = $props();

	function down(e: PointerEvent) {
		e.preventDefault();
		held = true;
		try {
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		} catch {
			// sommige browsers weigeren capture bij synthetische events
		}
	}
	const up = () => (held = false);
</script>

<button
	type="button"
	{disabled}
	class={[
		'flex h-[58px] min-w-[62px] touch-none flex-col items-center justify-center rounded-xl border-0 px-3 text-[15px] leading-[1.05] font-bold disabled:opacity-35 max-[520px]:h-[54px] max-[520px]:min-w-[52px] max-[520px]:px-2 max-[520px]:text-[14px]',
		held ? 'bg-btn-on text-white' : 'bg-btn text-btn-ink'
	]}
	onpointerdown={down}
	onpointerup={up}
	onpointercancel={up}
	onlostpointercapture={up}
	oncontextmenu={(e) => e.preventDefault()}
>
	{@render children()}
</button>
