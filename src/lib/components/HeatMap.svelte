<script>
	import { contourDensity, geoPath, scaleQuantize, schemeYlOrRd } from 'd3';

	let { pointMarkers = [], width = 900, height = 520, padding = 24 } = $props();

	const contourPath = geoPath();
	const legendItemHeight = 14;
	const legendItemGap = 3;

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
			opacity: Math.max(0.12, 0.08 + Math.pow(contour.value / maxDensity, 0.55) * 0.42),
			strokeOpacity: 0.05 + Math.pow(contour.value / maxDensity, 0.45) * 0.16,
			strokeWidth: 0.18 + (contour.value / maxDensity) * 0.32
		}));
	});

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
{#if legendBands.length}
	<g
		transform={`translate(${padding}, ${height - padding - (38 + legendBands.length * (legendItemHeight + legendItemGap))})`}
	>
		<rect
			width="158"
			height={38 + legendBands.length * (legendItemHeight + legendItemGap)}
			rx="8"
			fill="white"
			fill-opacity="0.86"
			stroke="currentColor"
			stroke-opacity="0.45"
			stroke-width="0.7"
		/>
		<text x="10" y="16" fill="currentColor" font-size="11" font-weight="600">Density bands</text>
		{#each legendBands as band, index (band.id)}
			<g transform={`translate(10, ${24 + index * (legendItemHeight + legendItemGap)})`}>
				<rect
					width="20"
					height={legendItemHeight}
					fill={band.color}
					stroke="currentColor"
					stroke-opacity="0.2"
					stroke-width="0.5"
				/>
				<text x="28" y="10.5" fill="currentColor" font-size="10" dominant-baseline="middle">
					{formatDensity(band.from)} - {formatDensity(band.to)}
				</text>
			</g>
		{/each}
	</g>
{/if}