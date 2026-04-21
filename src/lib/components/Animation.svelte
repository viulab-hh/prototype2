<script>
	import { onMount } from 'svelte';

	let {
		showAnimation = $bindable(false),
		currentDayIndex = $bindable(0),
		animationRunning = $bindable(false),
		uniqueDays = $bindable([])
	} = $props();

	let animationInterval = $state(null);
	let lastShowAnimation = $state(showAnimation);

	const dateGroups = [
		{ label: 'Jan 1 - Feb 23', start: new Date('2022-01-01'), end: new Date('2022-02-23') },
		{ label: 'Feb 24 - Mar 14', start: new Date('2022-02-24'), end: new Date('2022-03-14') },
		{ label: 'Mar 15 - Apr 1', start: new Date('2022-03-15'), end: new Date('2022-04-01') },
		{ label: 'Apr 2 - Apr 14', start: new Date('2022-04-02'), end: new Date('2022-04-14') },
		{ label: 'Apr 15 - Apr 30', start: new Date('2022-04-15'), end: new Date('2022-04-30') },
		{ label: 'May 1 - Jun 3', start: new Date('2022-05-01'), end: new Date('2022-06-03') }
	];

	const allUniqueDays = dateGroups.map((g, i) => ({
		id: i,
		label: g.label,
		start: g.start,
		end: g.end
	}));

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

	$effect(() => {
		if (showAnimation === lastShowAnimation) {
			return;
		}

		lastShowAnimation = showAnimation;

		if (!showAnimation) {
			pauseAnimation();
			uniqueDays = [];
			return;
		}

		uniqueDays = allUniqueDays;

		if (currentDayIndex >= uniqueDays.length) {
			currentDayIndex = 0;
		}
	});

	function startAnimation() {
		if (!showAnimation || !uniqueDays.length) return;

		if (animationInterval !== null) {
			clearInterval(animationInterval);
		}

		animationRunning = true;

		const interval = setInterval(() => {
			currentDayIndex = (currentDayIndex + 1) % uniqueDays.length;
		}, 1000);

		animationInterval = interval;
	}

	function pauseAnimation() {
		if (animationInterval !== null) {
			clearInterval(animationInterval);
			animationInterval = null;
		}
		animationRunning = false;
	}

	function toggleAnimation() {
		if (showAnimation) {
			pauseAnimation();
			showAnimation = false;
			return;
		}

		showAnimation = true;
		currentDayIndex = 0;
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
			onclick={animationRunning ? pauseAnimation : startAnimation}
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
		padding: 0 0.5rem;
		height: 1.55rem;
		border: 1px solid currentColor;
		border-radius: 4px;
		background: transparent;
		color: inherit;
		cursor: pointer;
		font-size: 0.8rem;
		line-height: 1;
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
		gap: 0;
		flex: 1;
		min-width: 150px;
	}

	.time-slider {
		width: 100%;
		height: 4px;
		border-radius: 2px;
		background: color-mix(in srgb, currentColor 15%, transparent);
		appearance: none;
		outline: none;
		-webkit-appearance: none;
		cursor: pointer;
		margin: 0;
	}

	.time-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: currentColor;
		cursor: pointer;
	}

	.time-slider::-moz-range-thumb {
		width: 12px;
		height: 12px;
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
		font-size: 0.65rem;
		line-height: 1;
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
