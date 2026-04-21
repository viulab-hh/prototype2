<script>
	let { title = 'Legend', items = [], width = 900, height = 520, padding = 24 } = $props();

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
	const twoColumnThreshold = 10;
	const columnGap = 10;

	const usesTwoColumns = $derived(items.length > twoColumnThreshold);
	const columnCount = $derived(usesTwoColumns ? 2 : 1);
	const rowsPerColumn = $derived(Math.ceil(items.length / columnCount));

	const columnWidth = $derived.by(() => {
		if (!items.length) return 0;

		const longestLabel = items.reduce((maxLength, item) => {
			return Math.max(maxLength, (item.label || '').length);
		}, 0);

		return legendLabelOffset + longestLabel * legendLabelCharWidth - legendRightTrim;
	});

	const legendWidth = $derived.by(() => {
		if (!items.length) {
			return 0;
		}

		const titleWidth = title.length * legendTitleCharWidth;
		const contentWidth = columnCount * columnWidth + Math.max(0, columnCount - 1) * columnGap;

		return Math.max(titleWidth, contentWidth) + legendPaddingX * 2;
	});

	const legendHeight = $derived.by(() => {
		if (!items.length) {
			return 0;
		}

		const rowsHeight =
			rowsPerColumn * legendItemHeight + Math.max(0, rowsPerColumn - 1) * legendItemGap;

		return legendPaddingY * 2 + legendTitleLineHeight + legendTitleGap + rowsHeight;
	});

	const legendBandStartY = $derived(legendPaddingY + legendTitleLineHeight + legendTitleGap);
	const legendX = $derived(padding);
	const legendY = $derived(height - padding - legendHeight);

	const itemX = (index) => {
		const col = Math.floor(index / rowsPerColumn);
		return col * (columnWidth + columnGap);
	};

	const itemY = (index) => {
		const row = index % rowsPerColumn;
		return legendBandStartY + row * (legendItemHeight + legendItemGap);
	};
</script>

{#if items.length}
	<g transform={`translate(${legendX}, ${legendY})`}>
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
			{title}
		</text>
		{#each items as item, index (item.id)}
			<g transform={`translate(${legendPaddingX + itemX(index)}, ${itemY(index)})`}>
				<rect
					width={legendSwatchWidth}
					height={legendItemHeight}
					fill={item.color}
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
					{item.label}
				</text>
			</g>
		{/each}
	</g>
{/if}
