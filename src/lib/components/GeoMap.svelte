<script>
	import {
		contourDensity,
		geoGraticule10,
		geoNaturalEarth1,
		geoPath,
		scaleQuantize,
		schemeYlOrRd
	} from 'd3';

	let {
		features = [],
		boundaryFeatures = [],
		points = [],
		width = 900,
		height = 520,
		padding = 24
	} = $props();

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
	const contourPath = geoPath();

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

	const pointMarkers = $derived(
		points
			.map((point, index) => {
				const projected = projection([point.longitude, point.latitude]);
				if (!projected) {
					return null;
				}

				return {
					id: point.id ?? `point-${index}`,
					x: projected[0],
					y: projected[1]
				};
			})
			.filter(Boolean)
	);

	const heatContours = $derived.by(() => {
		if (!pointMarkers.length) {
			return [];
		}

		const densityContours = contourDensity()
			.x((point) => point.x)
			.y((point) => point.y)
			.size([width, height])
			.bandwidth(Math.max(9, Math.min(width, height) * 0.022))
			.thresholds(32)(pointMarkers);

		if (!densityContours.length) {
			return [];
		}

		const maxDensity = densityContours[densityContours.length - 1].value || 1;
		const heatColor = scaleQuantize(schemeYlOrRd[9]).domain([0, maxDensity]);

		return densityContours.map((contour, index) => ({
			value: contour.value,
			id: `density-${index}`,
			d: contourPath(contour),
			fill: heatColor(contour.value),
			opacity: Math.max(0.2, 0.14 + Math.pow(contour.value / maxDensity, 0.55) * 0.68),
			strokeOpacity: 0.08 + Math.pow(contour.value / maxDensity, 0.45) * 0.24,
			strokeWidth: 0.18 + (contour.value / maxDensity) * 0.32
		}));
	});
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
	{#each heatContours as contour (contour.id)}
		<path
			d={contour.d}
			fill={contour.fill}
			fill-opacity={contour.opacity}
			stroke={contour.fill}
			stroke-opacity={contour.strokeOpacity}
			stroke-width={contour.strokeWidth}
		/>
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
