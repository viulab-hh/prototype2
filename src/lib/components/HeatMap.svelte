<script>
	import { contourDensity, geoPath, scaleQuantize, schemeYlOrRd } from 'd3';

	let {
		pointMarkers = [],
		width = 900,
		height = 520,
		padding = 24,
		points = [],
		showAnimation = false,
		currentDayIndex = 0,
		uniqueDays = []
	} = $props();

	const contourPath = geoPath();
	const legendTitle = 'Density bands';
	const legendPaddingX = 10;
	const legendPaddingY = 10;
	const legendSwatchWidth = 20;
	const legendLabelOffset = 28;
	const legendTitleLineHeight = 11;
	const legendTitleGap = 8;
	const legendItemHeight = 14;
	const legendItemGap = 3;
	const legendTitleCharWidth = 5.2;
	const legendLabelCharWidth = 4.9;
	const legendRightTrim = 3;

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

	const contourCache = $derived.by(() => {
		if (!showAnimation || !uniqueDays.length) {
			return null;
		}
		const cache = [];
		uniqueDays.forEach((group) => {
			const startMs = group.start.getTime();
			const endMs = group.end.getTime() + 86400000;
			const startDay = Math.floor(startMs / 86400000);
			const endDay = Math.floor(endMs / 86400000);
			const indices = new Set();
			for (let day = startDay; day <= endDay; day++) {
				if (pointTimestampMap[day]) {
					pointTimestampMap[day].forEach((i) => indices.add(i));
				}
			}
			const filtered = pointMarkers.filter((_, i) => indices.has(i));
			cache.push(computeContours(filtered));
		});
		return cache;
	});

	const heatContours = $derived.by(() => {
		if (!contourCache) return computeContours(showAnimation ? filteredPointMarkers : pointMarkers);
		return contourCache[currentDayIndex] || [];
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

	const legendWidth = $derived.by(() => {
		if (!legendBands.length) {
			return 0;
		}

		const longestBandLabel = legendBands.reduce((maxLength, band) => {
			const label = `${formatDensity(band.from)} - ${formatDensity(band.to)}`;
			return Math.max(maxLength, label.length);
		}, 0);
		const titleWidth = legendTitle.length * legendTitleCharWidth;
		const labelWidth = legendLabelOffset + longestBandLabel * legendLabelCharWidth;

		return Math.max(titleWidth, labelWidth) + legendPaddingX * 2 - legendRightTrim;
	});

	const legendHeight = $derived.by(() => {
		if (!legendBands.length) {
			return 0;
		}

		const bandRowsHeight =
			legendBands.length * legendItemHeight + Math.max(0, legendBands.length - 1) * legendItemGap;

		return legendPaddingY * 2 + legendTitleLineHeight + legendTitleGap + bandRowsHeight;
	});

	const legendBandStartY = $derived(legendPaddingY + legendTitleLineHeight + legendTitleGap);

	const pointTimestampMap = $derived.by(() => {
		const map = {};
		points.forEach((p, i) => {
			if (p.timestamp) {
				const timestamp = typeof p.timestamp === 'string' ? parseInt(p.timestamp, 10) : p.timestamp;
				const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
				const day = Math.floor(ms / 86400000);
				if (!map[day]) map[day] = [];
				map[day].push(i);
			}
		});
		return map;
	});

	const filteredPointMarkers = $derived.by(() => {
		if (!showAnimation || uniqueDays.length === 0) {
			return pointMarkers;
		}

		const currentGroup = uniqueDays[currentDayIndex];
		if (!currentGroup) return pointMarkers;

		const startMs = currentGroup.start.getTime();
		const endMs = currentGroup.end.getTime() + 86400000;
		const startDay = Math.floor(startMs / 86400000);
		const endDay = Math.floor(endMs / 86400000);

		const indices = new Set();
		for (let day = startDay; day <= endDay; day++) {
			if (pointTimestampMap[day]) {
				pointTimestampMap[day].forEach((i) => indices.add(i));
			}
		}

		return pointMarkers.filter((_, i) => indices.has(i));
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
{#if legendBands.length}
	<g transform={`translate(${padding}, ${height - padding - legendHeight})`}>
		<rect
			width={legendWidth}
			height={legendHeight}
			rx="8"
			fill="white"
			fill-opacity="0.86"
			stroke="currentColor"
			stroke-opacity="0.45"
			stroke-width="0.7"
		/>
		<text
			x={legendPaddingX}
			y={legendPaddingY + legendTitleLineHeight}
			fill="currentColor"
			font-size="11"
			font-weight="600"
		>
			{legendTitle}
		</text>
		{#each legendBands as band, index (band.id)}
			<g
				transform={`translate(${legendPaddingX}, ${legendBandStartY + index * (legendItemHeight + legendItemGap)})`}
			>
				<rect
					width={legendSwatchWidth}
					height={legendItemHeight}
					fill={band.color}
					stroke="currentColor"
					stroke-opacity="0.2"
					stroke-width="0.5"
				/>
				<text
					x={legendLabelOffset}
					y="10.5"
					fill="currentColor"
					font-size="10"
					dominant-baseline="middle"
				>
					{formatDensity(band.from)} - {formatDensity(band.to)}
				</text>
			</g>
		{/each}
	</g>
{/if}
