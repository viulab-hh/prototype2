<script>
	import { onMount } from 'svelte';
	import { autoType, csvParse, geoContains } from 'd3';
	import { feature } from 'topojson-client';
	import countries10m from 'world-atlas/countries-10m.json';
	import GeoMap from '$lib/components/GeoMap.svelte';

	const UKRAINE_ID = '804';

	const countries = feature(countries10m, countries10m.objects.countries);
	const ukraine = countries.features.filter((entry) => entry.id === UKRAINE_ID);
	const ukraineFeature = ukraine[0];

	let features = $state(ukraine);
	let boundaryFeatures = $state([]);
	let pointFeatures = $state([]);
	let error = $state('');

	function buildPoints(rows, swapCoordinates = false) {
		return rows
			.map((row, index) => {
				const longitude = Number(swapCoordinates ? row.latitude : row.longitude);
				const latitude = Number(swapCoordinates ? row.longitude : row.latitude);

				if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
					return null;
				}

				return {
					id: `${row.id ?? 'point'}-${index}`,
					longitude,
					latitude,
					timestamp: row.timestamp
				};
			})
			.filter(Boolean);
	}

	onMount(async () => {
		try {
			const csvResponse = await fetch('/data/ukr0602final.csv');
			if (!csvResponse.ok) {
				throw new Error(`Failed to load local CSV (${csvResponse.status})`);
			}

			const csvText = await csvResponse.text();
			const rows = csvParse(csvText, autoType);

			const normalPoints = buildPoints(rows, false);
			const swappedPoints = buildPoints(rows, true);

			const normalInside = normalPoints.filter((point) =>
				geoContains(ukraineFeature, [point.longitude, point.latitude])
			);
			const swappedInside = swappedPoints.filter((point) =>
				geoContains(ukraineFeature, [point.longitude, point.latitude])
			);

			pointFeatures = normalInside.length >= swappedInside.length ? normalInside : swappedInside;

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
	<h1>Kampfhandlungen und Truppenbewegungen in der Ukraine</h1>

	{#if features.length === 0}
		<p>Unable to load Ukraine boundary data.</p>
	{:else}
		<GeoMap {features} {boundaryFeatures} points={pointFeatures} padding={10} />
		<p>
			Boundary data from <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener"
				>Natural Earth</a
			> via world-atlas.
		</p>
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
