<script>
	import { scaleQuantize, schemeYlOrRd } from 'd3';

	let { pointMarkers = [], width = 900, height = 520, padding = 24 } = $props();

	const SQRT_3 = Math.sqrt(3);
	const hexRadius = 10;
	const classStep = 5;
	const upperClassLimit = 50;
	const palette = schemeYlOrRd[9];
	const legendBands = Array.from({ length: upperClassLimit / classStep + 1 }, (_, index) => {
		if (index === upperClassLimit / classStep) {
			return {
				id: `hist-legend-${index}`,
				from: upperClassLimit + 1,
				to: null,
				openEnded: true
			};
		}

		const from = index === 0 ? 0 : index * classStep + 1;
		const to = (index + 1) * classStep;

		return {
			id: `hist-legend-${index}`,
			from,
			to,
			openEnded: false
		};
	});

	const toAxial = (x, y, radius) => {
		const q = ((SQRT_3 / 3) * x - (1 / 3) * y) / radius;
		const r = ((2 / 3) * y) / radius;
		return { q, r };
	};

	const roundAxial = (q, r) => {
		let x = q;
		let z = r;
		let y = -x - z;

		let rx = Math.round(x);
		let ry = Math.round(y);
		let rz = Math.round(z);

		const xDiff = Math.abs(rx - x);
		const yDiff = Math.abs(ry - y);
		const zDiff = Math.abs(rz - z);

		if (xDiff > yDiff && xDiff > zDiff) {
			rx = -ry - rz;
		} else if (yDiff > zDiff) {
			ry = -rx - rz;
		} else {
			rz = -rx - ry;
		}

		return { q: rx, r: rz };
	};

	const axialToPixel = (q, r, radius) => {
		return {
			x: radius * SQRT_3 * (q + r / 2),
			y: radius * 1.5 * r
		};
	};

	const hexPath = (cx, cy, radius) => {
		const points = [];
		for (let i = 0; i < 6; i++) {
			const angle = (Math.PI / 180) * (60 * i - 30);
			points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
		}
		return `M ${points.map((point) => `${point[0]} ${point[1]}`).join(' L ')} Z`;
	};

	const getBandIndex = (count) => {
		if (count > upperClassLimit) {
			return legendBands.length - 1;
		}

		if (count <= classStep) {
			return 0;
		}

		return Math.ceil(count / classStep) - 1;
	};

	const getBandColor = (bandIndex) => {
		const paletteIndex = Math.round(
			(bandIndex / Math.max(1, legendBands.length - 1)) * (palette.length - 1)
		);
		return palette[paletteIndex];
	};

	const histogramData = $derived.by(() => {
		const innerWidth = width - padding * 2;
		const innerHeight = height - padding * 2;

		if (innerWidth <= 0 || innerHeight <= 0) {
			return { cells: [], maxCount: 0 };
		}

		const counts = Object.create(null);

		pointMarkers.forEach((point) => {
			const localX = point.x - padding;
			const localY = point.y - padding;

			if (localX < 0 || localY < 0 || localX > innerWidth || localY > innerHeight) {
				return;
			}

			const axial = toAxial(localX, localY, hexRadius);
			const rounded = roundAxial(axial.q, axial.r);
			const key = `${rounded.q},${rounded.r}`;
			counts[key] = (counts[key] || 0) + 1;
		});

		const corners = [
			toAxial(0, 0, hexRadius),
			toAxial(innerWidth, 0, hexRadius),
			toAxial(0, innerHeight, hexRadius),
			toAxial(innerWidth, innerHeight, hexRadius)
		];

		const minQ = Math.floor(Math.min(...corners.map((corner) => corner.q))) - 2;
		const maxQ = Math.ceil(Math.max(...corners.map((corner) => corner.q))) + 2;
		const minR = Math.floor(Math.min(...corners.map((corner) => corner.r))) - 2;
		const maxR = Math.ceil(Math.max(...corners.map((corner) => corner.r))) + 2;

		const cells = [];

		for (let r = minR; r <= maxR; r++) {
			for (let q = minQ; q <= maxQ; q++) {
				const localCenter = axialToPixel(q, r, hexRadius);

				if (
					localCenter.x < -hexRadius ||
					localCenter.y < -hexRadius ||
					localCenter.x > innerWidth + hexRadius ||
					localCenter.y > innerHeight + hexRadius
				) {
					continue;
				}

				const id = `${q},${r}`;
				const count = counts[id] || 0;

				cells.push({
					id,
					count,
					cx: localCenter.x + padding,
					cy: localCenter.y + padding
				});
			}
		}

		if (!cells.length) {
			return { cells: [], maxCount: 0 };
		}

		const maxCount = Math.max(...cells.map((cell) => cell.count));
		const scaleLimit = Math.max(1, upperClassLimit);

		const coloredCells = cells.map((cell) => {
			const cappedCount = Math.min(cell.count, upperClassLimit);
			const bandIndex = getBandIndex(cell.count);

			return {
				...cell,
				d: hexPath(cell.cx, cell.cy, hexRadius),
				fill: getBandColor(bandIndex),
				opacity: cell.count === 0 ? 0.06 : Math.min(0.72, 0.2 + (cappedCount / scaleLimit) * 0.52)
			};
		});

		return { cells: coloredCells, maxCount };
	});

	const legendTitle = 'Events per hex';
	const legendViewBands = $derived.by(() => {
		if (!histogramData.cells.length) {
			return [];
		}

		return legendBands.map((band, index) => ({
			...band,
			color: getBandColor(index)
		}));
	});

	const legendWidth = 124;
	const legendPaddingX = 10;
	const legendPaddingY = 10;
	const legendRowHeight = 12;
	const legendGap = 2;
	const legendHeight = $derived(
		legendPaddingY * 2 + 12 + 8 + legendViewBands.length * (legendRowHeight + legendGap)
	);

	const formatBand = (from, to, openEnded) => {
		if (openEnded) {
			return '> 50';
		}
		return from === to ? `${from}` : `${from} - ${to}`;
	};
</script>

{#each histogramData.cells as cell (cell.id)}
	<path
		d={cell.d}
		fill={cell.fill}
		fill-opacity={cell.opacity}
		stroke={cell.fill}
		stroke-opacity="0.35"
		stroke-width="0.7"
	>
		<title>{cell.count} events</title>
	</path>
{/each}

{#if legendViewBands.length}
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
			y={legendPaddingY + 10}
			fill="currentColor"
			font-size="11"
			font-weight="600"
		>
			{legendTitle}
		</text>
		{#each legendViewBands as band, index (band.id)}
			<g
				transform={`translate(${legendPaddingX}, ${legendPaddingY + 20 + index * (legendRowHeight + legendGap)})`}
			>
				<rect
					width="18"
					height={legendRowHeight}
					fill={band.color}
					stroke="currentColor"
					stroke-opacity="0.18"
					stroke-width="0.4"
				/>
				<text x="24" y="9" fill="currentColor" font-size="9.5" dominant-baseline="middle">
					{formatBand(band.from, band.to, band.openEnded)}
				</text>
			</g>
		{/each}
	</g>
{/if}
