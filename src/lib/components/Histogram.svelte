<script>
	import { scaleQuantize, schemeYlOrRd } from 'd3';

	let { pointMarkers = [], width = 900, height = 520, padding = 24 } = $props();

	const SQRT_3 = Math.sqrt(3);
	const hexRadius = 14;

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

	const gridCells = $derived.by(() => {
		const innerWidth = width - padding * 2;
		const innerHeight = height - padding * 2;

		if (innerWidth <= 0 || innerHeight <= 0) {
			return [];
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
			return [];
		}

		const maxCount = Math.max(...cells.map((cell) => cell.count));
		const colorScale = scaleQuantize(schemeYlOrRd[9]).domain([0, Math.max(1, maxCount)]);

		return cells.map((cell) => ({
			...cell,
			d: hexPath(cell.cx, cell.cy, hexRadius),
			fill: colorScale(cell.count),
			opacity:
				cell.count === 0 ? 0.06 : Math.min(0.72, 0.2 + (cell.count / Math.max(1, maxCount)) * 0.52)
		}));
	});
</script>

{#each gridCells as cell (cell.id)}
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
