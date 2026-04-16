<script>
	import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3';

	let { features = [], boundaryFeatures = [], width = 900, height = 520, padding = 24 } = $props();

	const sphere = { type: 'Sphere' };
	const graticule = geoGraticule10();

	const projection = $derived.by(() => {
		const currentProjection = geoNaturalEarth1();
		const targetGeometry = features.length ? { type: 'FeatureCollection', features } : sphere;

		currentProjection.fitExtent(
			[
				[padding, padding],
				[width - padding, height - padding]
			],
			targetGeometry
		);

		return currentProjection;
	});

	const path = $derived(geoPath(projection));

	const featurePaths = $derived(
		features.map((feature, index) => ({
			id: feature.id ?? feature.properties?.name ?? `feature-${index}`,
			name: feature.properties?.name ?? `Feature ${index + 1}`,
			d: path(feature)
		}))
	);

	const boundaryPaths = $derived(
		boundaryFeatures.map((feature, index) => ({
			id: feature.id ?? feature.properties?.shapeName ?? `boundary-${index}`,
			name: feature.properties?.shapeName ?? `Boundary ${index + 1}`,
			d: path(feature)
		}))
	);
</script>

<svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Map visualization">
	<path d={path(sphere)} fill="currentColor" fill-opacity="0.06" />
	<path
		d={path(graticule)}
		fill="none"
		stroke="currentColor"
		stroke-opacity="0.18"
		stroke-width="0.7"
	/>
	{#each featurePaths as feature (feature.id)}
		<path
			d={feature.d}
			fill="currentColor"
			fill-opacity="0.24"
			stroke="currentColor"
			stroke-opacity="0.45"
			stroke-width="0.9"
		>
			<title>{feature.name}</title>
		</path>
	{/each}
	{#each boundaryPaths as boundary (boundary.id)}
		<path
			d={boundary.d}
			fill="none"
			stroke="currentColor"
			stroke-opacity="0.65"
			stroke-width="0.55"
		>
			<title>{boundary.name}</title>
		</path>
	{/each}
</svg>

<style>
	svg {
		width: 100%;
		height: auto;
		display: block;
		border: 1px solid currentColor;
		border-radius: 0.5rem;
	}
</style>
