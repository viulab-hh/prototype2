<script>
	import { onMount } from 'svelte';
	import GeoMap from '$lib/components/GeoMap.svelte';

	let features = $state([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const response = await fetch('/data/sample-regions.geojson');
			if (!response.ok) {
				throw new Error(`Failed to load data (${response.status})`);
			}

			const geojson = await response.json();
			features = geojson.features ?? [];
		} catch (caughtError) {
			error =
				caughtError instanceof Error ? caughtError.message : 'Unknown error while loading map data';
		} finally {
			loading = false;
		}
	});
</script>

<main>
	<h1>Conflict Zones Map Prototype</h1>
	<p>Minimal D3 + Svelte map setup with a GeoJSON layer.</p>

	{#if loading}
		<p>Loading map data…</p>
	{:else if error}
		<p>{error}</p>
	{:else}
		<GeoMap {features} />
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
