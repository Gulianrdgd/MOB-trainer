<script lang="ts">
	import { isSet, site } from '$lib/config';

	const github = isSet(site.githubUrl) ? site.githubUrl : null;
	const email = isSet(site.contactEmail) ? site.contactEmail : null;
</script>

<!-- Vaste strook onder de simulatie, nooit over het canvas. -->
<footer
	class="shrink-0 border-t border-panel-edge bg-panel px-4 py-1.5 text-center text-[13px] leading-snug text-muted"
>
	<p>
		Gemaakt door
		{#if github}
			<a class="font-semibold text-ink underline underline-offset-2" rel="external" href={github}
				>{site.author}</a
			>.
		{:else}
			<span class="font-semibold text-ink">{site.author}</span>.
		{/if}
		Vereenvoudigd model.
		{#if email}
			Idee voor een nieuwe functie of een bug gevonden? Mail
			<a
				class="font-semibold text-ink underline underline-offset-2"
				rel="external"
				href="mailto:{email}">{email}</a
			>.
		{/if}
	</p>
</footer>
