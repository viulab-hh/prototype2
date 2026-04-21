<script>
	import { geoDistance, geoGraticule10, geoNaturalEarth1, geoPath } from 'd3';
	import { onMount } from 'svelte';
	import HeatMap from './HeatMap.svelte';

	let {
		features = [],
		boundaryFeatures = [],
		points = [],
		width = 900,
		height = 520,
		padding = 24
	} = $props();

	let showHeatMap = $state(false);
	let showAnimation = $state(false);
	let currentDayIndex = $state(0);
	let animationRunning = $state(false);
	let animationInterval = $state(null);

	const sphere = { type: 'Sphere' };
	const graticule = geoGraticule10();

	const pointFeatures = $derived(
		points.map((point, index) => ({
			type: 'Feature',
			id: point.id ?? `point-feature-${index}`,
			properties: {
				name: point.name ?? point.location ?? `Point ${index + 1}`
			},
			geometry: {
				type: 'Point',
				coordinates: [point.longitude, point.latitude]
			}
		}))
	);

	const projection = $derived.by(() => {
		const currentProjection = geoNaturalEarth1();
		const targetFeatures = [...features, ...pointFeatures];
		const targetGeometry = targetFeatures.length
			? { type: 'FeatureCollection', features: targetFeatures }
			: sphere;

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
	const earthRadiusKm = 6371;

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
					y: projected[1],
					label: point.name ?? point.location ?? `Point ${index + 1}`,
					timestamp: point.timestamp,
					originalIndex: index
				};
			})
			.filter(Boolean)
	);

	const displayedPointMarkers = $derived.by(() => {
		if (!showAnimation || !uniqueDays.length) {
			return pointMarkers;
		}

		const currentGroup = uniqueDays[currentDayIndex];
		if (!currentGroup) return pointMarkers;

		const startMs = currentGroup.start.getTime();
		const endMs = currentGroup.end.getTime() + 86400000;

		return pointMarkers.filter((marker) => {
			if (!marker.timestamp) return false;
			const timestamp =
				typeof marker.timestamp === 'string' ? parseInt(marker.timestamp, 10) : marker.timestamp;
			const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
			return ms >= startMs && ms <= endMs;
		});
	});

	const northArrow = $derived.by(() => {
		const size = Math.max(34, Math.min(48, width * 0.052));

		return {
			size,
			x: width - padding - size * 0.72,
			y: padding + size * 0.95
		};
	});

	const scaleBar = $derived.by(() => {
		const targetWidth = Math.max(72, Math.min(140, width * 0.18));
		const sampleY = Math.min(height - padding - 24, height * 0.72);
		const sampleEndX = width - padding - 18;
		const sampleStartX = sampleEndX - targetWidth;
		const startCoords = projection.invert([sampleStartX, sampleY]);
		const endCoords = projection.invert([sampleEndX, sampleY]);

		if (!startCoords || !endCoords) {
			return null;
		}

		const sampledDistanceKm = geoDistance(startCoords, endCoords) * earthRadiusKm;

		if (!Number.isFinite(sampledDistanceKm) || sampledDistanceKm <= 0) {
			return null;
		}

		const magnitude = 10 ** Math.floor(Math.log10(sampledDistanceKm));
		const normalizedDistance = sampledDistanceKm / magnitude;
		const roundedDistance =
			(normalizedDistance >= 7.5 && 10) ||
			(normalizedDistance >= 3.5 && 5) ||
			(normalizedDistance >= 1.5 && 2) ||
			1;
		const distanceKm = roundedDistance * magnitude;
		const widthPerKm = targetWidth / sampledDistanceKm;
		const barWidth = distanceKm * widthPerKm;

		return {
			distanceKm,
			x: width - padding - barWidth - 18,
			y: height - padding - 22,
			width: barWidth,
			height: 8
		};
	});

	const formatDistance = (value) => {
		if (value >= 1000) {
			return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k km`;
		}

		return `${value.toFixed(0)} km`;
	};

	let uniqueDays = $state([]);
	const dateGroups = [
		{ label: 'Jan 1 - Feb 23', start: new Date('2022-01-01'), end: new Date('2022-02-23') },
		{ label: 'Feb 24 - Mar 14', start: new Date('2022-02-24'), end: new Date('2022-03-14') },
		{ label: 'Mar 15 - Apr 1', start: new Date('2022-03-15'), end: new Date('2022-04-01') },
		{ label: 'Apr 2 - Apr 14', start: new Date('2022-04-02'), end: new Date('2022-04-14') },
		{ label: 'Apr 15 - Apr 30', start: new Date('2022-04-15'), end: new Date('2022-04-30') },
		{ label: 'May 1 - Jun 3', start: new Date('2022-05-01'), end: new Date('2022-06-03') }
	];

	$effect(() => {
		if (!showAnimation) return;
		uniqueDays = dateGroups.map((g, i) => ({
			id: i,
			label: g.label,
			start: g.start,
			end: g.end
		}));
	});

	function startAnimation() {
		if (animationRunning || !showAnimation || !uniqueDays.length) return;

		if (animationInterval !== null) {
			clearInterval(animationInterval);
		}

		animationRunning = true;
		currentDayIndex = 0;

		const interval = setInterval(() => {
			currentDayIndex += 1;

			if (currentDayIndex >= uniqueDays.length) {
				clearInterval(interval);
				animationRunning = false;
				showAnimation = false;
				animationInterval = null;
			}
		}, 2000);

		animationInterval = interval;
	}

	onMount(() => {
		return () => {
			if (animationInterval !== null) {
				clearInterval(animationInterval);
			}
			animationRunning = false;
		};
	});
</script>

<div class="map-wrap">
	<div class="map-controls">
		<button
			class="heat-toggle"
			type="button"
			role="switch"
			aria-checked={showHeatMap}
			aria-label="Toggle heat map"
			onclick={() => (showHeatMap = !showHeatMap)}
		>
			<span class="heat-toggle__label">Heat map</span>
			<span class="heat-toggle__track" aria-hidden="true">
				<span class="heat-toggle__thumb"></span>
			</span>
		</button>
		{#if showHeatMap}
			<button
				type="button"
				onclick={() => {
					showAnimation = !showAnimation;
					if (showAnimation && !animationRunning) {
						currentDayIndex = 0;
					}
				}}
				class="animation-toggle"
				aria-pressed={showAnimation}
			>
				{showAnimation ? 'Stop animation' : 'Animate by day'}
			</button>
			{#if showAnimation && uniqueDays.length > 0}
				<button
					type="button"
					onclick={startAnimation}
					disabled={animationRunning}
					class="animation-play"
				>
					{animationRunning ? 'Playing...' : 'Play'}
				</button>
				<span class="animation-info">
					Period {currentDayIndex + 1} of {uniqueDays.length}
					{#if uniqueDays[currentDayIndex]}
						({uniqueDays[currentDayIndex].label})
					{/if}
				</span>
			{/if}
		{/if}
	</div>

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
		{#each displayedPointMarkers as point (point.id)}
			<circle cx={point.x} cy={point.y} r="1.4" fill="currentColor" fill-opacity="0.9">
				<title>{point.label}</title>
			</circle>
		{/each}
		{#if showHeatMap}
			<HeatMap
				{pointMarkers}
				{width}
				{height}
				{padding}
				{points}
				{showAnimation}
				{currentDayIndex}
				{uniqueDays}
			/>
		{/if}
		{#if scaleBar}
			<g transform={`translate(${scaleBar.x}, ${scaleBar.y})`}>
				<rect
					width={scaleBar.width / 2}
					height={scaleBar.height}
					fill="currentColor"
					fill-opacity="0.88"
				/>
				<rect
					x={scaleBar.width / 2}
					width={scaleBar.width / 2}
					height={scaleBar.height}
					fill="white"
					stroke="currentColor"
					stroke-opacity="0.7"
					stroke-width="0.8"
				/>
				<line x1="0" y1="0" x2="0" y2="12" stroke="currentColor" stroke-width="0.9" />
				<line
					x1={scaleBar.width / 2}
					y1="0"
					x2={scaleBar.width / 2}
					y2="12"
					stroke="currentColor"
					stroke-width="0.9"
				/>
				<line
					x1={scaleBar.width}
					y1="0"
					x2={scaleBar.width}
					y2="12"
					stroke="currentColor"
					stroke-width="0.9"
				/>
				<text x="0" y="21" fill="currentColor" font-size="10">0</text>
				<text x={scaleBar.width / 2} y="21" fill="currentColor" font-size="10" text-anchor="middle">
					{formatDistance(scaleBar.distanceKm / 2)}
				</text>
				<text x={scaleBar.width} y="21" fill="currentColor" font-size="10" text-anchor="end">
					{formatDistance(scaleBar.distanceKm)}
				</text>
			</g>
		{/if}
		{#if northArrow}
			<g transform={`translate(${northArrow.x}, ${northArrow.y})`}>
				<line
					x1="0"
					y1={northArrow.size * 0.32}
					x2="0"
					y2={-northArrow.size * 0.18}
					stroke="currentColor"
					stroke-width="1.2"
				/>
				<path
					d={`M 0 ${-northArrow.size * 0.54} L ${northArrow.size * 0.16} ${-northArrow.size * 0.16} L 0 ${-northArrow.size * 0.25} L ${-northArrow.size * 0.16} ${-northArrow.size * 0.16} Z`}
					fill="currentColor"
					fill-opacity="0.92"
				/>
			</g>
		{/if}
	</svg>
</div>

<style>
	.map-wrap {
		display: grid;
		gap: 0.75rem;
	}

	.heat-toggle {
		width: fit-content;
		display: inline-flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: 0.95rem;
		cursor: pointer;
	}

	.heat-toggle__label {
		font-size: 0.95rem;
	}

	.heat-toggle__track {
		position: relative;
		width: 2.75rem;
		height: 1.55rem;
		border: 1px solid currentColor;
		border-radius: 999px;
		background: color-mix(in srgb, currentColor 10%, transparent);
		transition: background-color 120ms ease;
	}

	.heat-toggle__thumb {
		position: absolute;
		top: 50%;
		left: 0.18rem;
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		background: currentColor;
		transform: translateY(-50%);
		transition: transform 120ms ease;
	}

	.heat-toggle[aria-checked='true'] .heat-toggle__track {
		background: color-mix(in srgb, currentColor 22%, transparent);
	}

	.heat-toggle[aria-checked='true'] .heat-toggle__thumb {
		transform: translate(1.17rem, -50%);
	}

	.heat-toggle:focus-visible .heat-toggle__track {
		outline: 2px solid currentColor;
		outline-offset: 2px;
	}

	.map-controls {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.animation-toggle {
		padding: 0.4rem 0.7rem;
		border: 1px solid currentColor;
		border-radius: 4px;
		background: transparent;
		color: inherit;
		cursor: pointer;
		font-size: 0.9rem;
	}

	.animation-toggle:hover {
		background: color-mix(in srgb, currentColor 8%, transparent);
	}

	.animation-play {
		padding: 0.4rem 0.7rem;
		border: 1px solid currentColor;
		border-radius: 4px;
		background: transparent;
		color: inherit;
		cursor: pointer;
		font-size: 0.9rem;
	}

	.animation-play:hover:not(:disabled) {
		background: color-mix(in srgb, currentColor 8%, transparent);
	}

	.animation-play:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.animation-info {
		font-size: 0.85rem;
		color: inherit;
		opacity: 0.8;
	}

	svg {
		width: 100%;
		height: auto;
		display: block;
		border: 1px solid currentColor;
		border-radius: 0.5rem;
	}
</style>
