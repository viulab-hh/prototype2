<script>
	import { onMount } from 'svelte';
	import { feature } from 'topojson-client';
	import countries10m from 'world-atlas/countries-10m.json';
	import GeoMap from '$lib/components/GeoMap.svelte';

	const UKRAINE_ID = '804';

	const countries = feature(countries10m, countries10m.objects.countries);
	const ukraine = countries.features.filter((entry) => entry.id === UKRAINE_ID);

	let features = $state(ukraine);
	let boundaryFeatures = $state([]);
	let error = $state('');

	onMount(async () => {
		try {
			const response = await fetch('/api/ukraine-oblasts');
			if (!response.ok) {
				return;
			}

			const data = await response.json();
			boundaryFeatures = data.features ?? [];
		} catch (caughtError) {
			error =
				caughtError instanceof Error ? caughtError.message : 'Unable to load oblast boundaries';
		}
	});
</script>

<main>
	<h1>Ukraine</h1>
	<p>
		Boundary data from <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener"
			>Natural Earth</a
		> via world-atlas.
	</p>

	{#if features.length === 0}
		<p>Unable to load Ukraine boundary data.</p>
	{:else}
		<GeoMap {features} {boundaryFeatures} padding={10} />
	{/if}

	{#if error}
		<p>{error}</p>
	{/if}
</main>

<style>
	main {
		max-width: 980px;
		margin: 2rem auto;
		padding: 0 1rem;
	}

	h1 {
		margin-bottom: 0.25rem;
	}

	p {
		margin-bottom: 1rem;
	}
</style>
