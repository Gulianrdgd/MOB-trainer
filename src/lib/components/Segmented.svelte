<script lang="ts" module>
	export interface Option<V> {
		value: V;
		label: string;
		title?: string;
	}
</script>

<script lang="ts" generics="T extends string">
	let {
		label,
		options,
		value,
		onchange,
		compass = false
	}: {
		label: string;
		options: Option<T>[];
		value: T;
		onchange: (value: T) => void;
		/** 3x3-raster voor windrichtingen. */
		compass?: boolean;
	} = $props();

	const id = $props.id();
</script>

<h2 {id} class="mt-3.5 mb-1.5 text-[17px] font-semibold">{label}</h2>
<div
	role="group"
	aria-labelledby={id}
	class={compass ? 'grid grid-cols-[repeat(3,54px)] gap-1.5' : 'flex flex-wrap gap-1.5'}
>
	{#each options as o (o.value)}
		{@const on = o.value === value}
		<button
			type="button"
			title={o.title}
			aria-label={o.title}
			aria-pressed={on}
			class={[
				'rounded-lg border font-semibold',
				compass ? 'h-10 p-0' : 'px-[11px] py-[7px]',
				on ? 'border-ink bg-ink text-sea' : 'border-panel-edge bg-transparent'
			]}
			onclick={() => onchange(o.value)}
		>
			{o.label}
		</button>
	{/each}
</div>
