<script>
	let {
		showAnimation = $bindable(false),
		currentDayIndex = $bindable(0),
		animationRunning = false,
		uniqueDays = [],
		onStartAnimation = () => {},
		onPauseAnimation = () => {}
	} = $props();

	const germanDateFormatter = new Intl.DateTimeFormat('de-DE', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	const germanShortDateFormatter = new Intl.DateTimeFormat('de-DE', {
		day: 'numeric',
		month: 'short'
	});

	const formatGermanDateRange = (start, end) => {
		if (!(start instanceof Date) || !(end instanceof Date)) {
			return '';
		}

		return `${germanDateFormatter.format(start)} - ${germanDateFormatter.format(end)}`;
	};

	const formatGermanShortDate = (date) => {
		if (!(date instanceof Date)) {
			return '';
		}

		return germanShortDateFormatter.format(date);
	};

	function toggleAnimation() {
		if (showAnimation) {
			if (animationRunning) {
				onPauseAnimation();
			}
			showAnimation = false;
			return;
		}

		showAnimation = true;
		currentDayIndex = 0;
	}
</script>

<button
	type="button"
	onclick={toggleAnimation}
	class="animation-toggle"
	aria-pressed={showAnimation}
>
	{showAnimation ? 'Stop animation' : 'Animate by day'}
</button>

{#if showAnimation && uniqueDays.length > 0}
	<div class="animation-controls-extended">
		<div class="slider-container">
			<input
				type="range"
				min="0"
				max={uniqueDays.length - 1}
				bind:value={currentDayIndex}
				class="time-slider"
				disabled={animationRunning}
			/>
			<div class="slider-labels">
				<span class="slider-label">{formatGermanShortDate(uniqueDays[0]?.start)}</span>
				<span class="slider-label"
					>{formatGermanShortDate(uniqueDays[uniqueDays.length - 1]?.end)}</span
				>
			</div>
		</div>
		<button
			type="button"
			onclick={animationRunning ? onPauseAnimation : onStartAnimation}
			class="animation-button"
			title={animationRunning ? 'Pause' : 'Play'}
		>
			{#if animationRunning}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
					<rect x="6" y="4" width="4" height="16" />
					<rect x="14" y="4" width="4" height="16" />
				</svg>
			{:else}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
					<polygon points="5 3 19 12 5 21" />
				</svg>
			{/if}
		</button>
		<span class="animation-info">
			{#if uniqueDays[currentDayIndex]}
				{formatGermanDateRange(uniqueDays[currentDayIndex].start, uniqueDays[currentDayIndex].end)}
			{/if}
		</span>
	</div>
{/if}

<style>
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

	.animation-info {
		font-size: 0.85rem;
		color: inherit;
		opacity: 0.8;
	}

	.animation-controls-extended {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.slider-container {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		min-width: 150px;
	}

	.time-slider {
		width: 100%;
		height: 6px;
		border-radius: 3px;
		background: color-mix(in srgb, currentColor 15%, transparent);
		outline: none;
		-webkit-appearance: none;
		cursor: pointer;
	}

	.time-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: currentColor;
		cursor: pointer;
	}

	.time-slider::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: currentColor;
		cursor: pointer;
		border: none;
	}

	.time-slider:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.slider-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		opacity: 0.7;
		width: 100%;
	}

	.slider-label {
		text-align: center;
		flex: 0 0 auto;
	}

	.slider-label:last-child {
		text-align: right;
	}

	.animation-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: auto;
		height: auto;
		padding: 0;
		border: none;
		background: transparent;
		color: inherit;
		cursor: pointer;
		transition: opacity 120ms ease;
		align-self: flex-start;
		margin-top: -5px;
	}

	.animation-button:hover {
		opacity: 0.8;
	}

	.animation-button:active {
		opacity: 0.6;
	}
</style>
