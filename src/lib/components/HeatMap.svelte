<script>
	import { contourDensity, geoPath, scaleQuantize, schemeYlOrRd } from 'd3';
	import MapLegend from './MapLegend.svelte';

	let { pointMarkers = [], width = 900, height = 520, padding = 24 } = $props();

	const contourPath = geoPath();
	const legendTitle = 'Density bands';

	const computeContours = (dataPoints) => {
		if (!dataPoints.length) return [];

		const densityContours = contourDensity()
			.x((point) => point.x)
			.y((point) => point.y)
			.size([width, height])
			.bandwidth(Math.max(30, Math.min(width, height) * 0.05))
			.thresholds(8)(dataPoints);

		if (!densityContours.length) return [];

		const maxDensity = densityContours[densityContours.length - 1].value || 1;
		const heatColor = scaleQuantize(schemeYlOrRd[9]).domain([0, maxDensity]);

		return densityContours.map((contour, index) => ({
			value: contour.value,
			id: `density-${index}`,
			d: contourPath(contour),
			fill: heatColor(contour.value),
			opacity: Math.max(0.12, 0.08 + Math.pow(contour.value / maxDensity, 0.55) * 0.42),
			strokeOpacity: 0.05 + Math.pow(contour.value / maxDensity, 0.45) * 0.16,
			strokeWidth: 0.18 + (contour.value / maxDensity) * 0.32
		}));
	};

	const heatContours = $derived(computeContours(pointMarkers));

	const legendBands = $derived.by(() => {
		if (!heatContours.length) {
			return [];
		}

		const maxDensity = heatContours[heatContours.length - 1].value || 1;
		const heatColor = scaleQuantize(schemeYlOrRd[9]).domain([0, maxDensity]);

		return heatColor.range().map((color, index) => {
			const [fromRaw, toRaw] = heatColor.invertExtent(color);
			const from = fromRaw ?? 0;
			const to = toRaw ?? maxDensity;

			return {
				id: `legend-band-${index}`,
				color,
				from,
				to
			};
		});
	});

	const formatDensity = (value) => {
		if (value >= 100) {
			return value.toFixed(0);
		}

		if (value >= 10) {
			return value.toFixed(1);
		}

		return value.toFixed(2);
	};

	const legendItems = $derived.by(() => {
		return legendBands.map((band) => ({
			id: band.id,
			color: band.color,
			label: `${formatDensity(band.from)} - ${formatDensity(band.to)}`
		}));
	});
</script>

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
<MapLegend title={legendTitle} items={legendItems} {width} {height} {padding} />
