<script lang="ts">
	import { isSet, site } from '$lib/config';

	const website = isSet(site.websiteUrl) ? site.websiteUrl : null;
	const email = isSet(site.contactEmail) ? site.contactEmail : null;
	const issues = isSet(site.repoUrl) ? site.repoUrl.replace(/\/+$/, '') + '/issues' : null;
</script>

<footer class="mt-4 border-t border-panel-edge pt-3 text-sm leading-snug text-muted">
	<p>
		Gemaakt door
		{#if website}
			<a class="font-semibold text-ink underline underline-offset-2" rel="external" href={website}
				>{site.author}</a
			>
		{:else}
			<span class="font-semibold text-ink">{site.author}</span>
		{/if}
	</p>
	{#if email || issues}
		<p class="mt-1">
			Tips of verbeteringen?
			{#if email}
				<a
					class="font-semibold text-ink underline underline-offset-2"
					rel="external"
					href="mailto:{email}">Laat het me weten</a
				>{#if issues}&nbsp;of open een
					<a
						class="font-semibold text-ink underline underline-offset-2"
						rel="external"
						href={issues}>issue op GitHub</a
					>{/if}.
			{:else if issues}
				<a class="font-semibold text-ink underline underline-offset-2" rel="external" href={issues}
					>Laat het me weten op GitHub</a
				>.
			{/if}
		</p>
	{/if}
	<p class="mt-1">
		Vereenvoudigd model. Oefen het echt op het water met een instructeur. Geen tracking, geen
		cookies.
	</p>
</footer>
