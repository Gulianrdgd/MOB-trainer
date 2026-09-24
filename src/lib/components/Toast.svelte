<script lang="ts">
	let { msg, alarm, show }: { msg: string; alarm: boolean; show: boolean } = $props();
</script>

<div
	role="status"
	class={[
		'pointer-events-none absolute top-[22%] left-1/2 z-30 max-w-[90%] -translate-1/2 rounded-[10px] px-[18px] py-2.5 text-center text-[20px] font-bold transition-opacity duration-250 motion-reduce:transition-none',
		alarm ? 'bg-buoy text-white' : 'bg-ink text-sea',
		show ? 'opacity-100' : 'opacity-0'
	]}
>
	{msg}
</div>
