<script>
	import { contourDensity, geoPath, scaleQuantize, schemeYlOrRd } from 'd3';
	import MapLegend from './MapLegend.svelte';

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

	const buildIndexLookup = (startDay, endDay) => {
		const lookup = Object.create(null);

		for (let day = startDay; day <= endDay; day++) {
			if (pointTimestampMap[day]) {
				pointTimestampMap[day].forEach((i) => {
					lookup[i] = true;
				});
			}
		}

		return lookup;
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
			const indicesLookup = buildIndexLookup(startDay, endDay);
			const filtered = pointMarkers.filter((_, i) => indicesLookup[i]);
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

	const legendItems = $derived.by(() => {
		return legendBands.map((band) => ({
			id: band.id,
			color: band.color,
			label: `${formatDensity(band.from)} - ${formatDensity(band.to)}`
		}));
	});

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
		const indicesLookup = buildIndexLookup(startDay, endDay);

		return pointMarkers.filter((_, i) => indicesLookup[i]);
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
