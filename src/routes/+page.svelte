<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { categories, cleanBudget, reckon, timeHorizons, type Inputs } from '$lib/reckoner';

	let place = $state('Stirling');
	let budget = $state(1200);
	let category = $state('');
	let timeHorizon = $state('');
	let hydrated = $state(false);

	$effect(() => {
		if (!browser || hydrated) return;
		const params = page.url.searchParams;
		place = params.get('place') || 'Stirling';
		budget = cleanBudget(params.get('budget') || 1200);
		category = params.get('category') || '';
		timeHorizon = params.get('time') || '';
		hydrated = true;
	});

	const inputs = $derived<Inputs>({
		place,
		budget: cleanBudget(budget),
		category: category ? (category as Inputs['category']) : undefined,
		timeHorizon: timeHorizon ? (timeHorizon as Inputs['timeHorizon']) : undefined
	});
	const result = $derived(reckon(inputs));
	const showStepTwo = $derived(result.requiresStepTwo || Boolean(category || timeHorizon));

	function updateUrl() {
		const params = new URLSearchParams();
		params.set('place', place);
		params.set('budget', String(cleanBudget(budget)));
		if (category) params.set('category', category);
		if (timeHorizon) params.set('time', timeHorizon);
		goto(`/?${params.toString()}`, { replaceState: false, noScroll: true, keepFocus: true });
	}
</script>

<svelte:head>
	<title>Local Ad Reckoner — stick your numbers in before you sign anything</title>
	<meta name="description" content="A free UK-first advertising second-opinion tool for small business owners. Put in your postcode and budget before you sign anything." />
</svelte:head>

<div class="site-shell">
	<header class="topbar">
		<a class="brand" href="/">Local Ad Reckoner</a>
		<nav class="nav" aria-label="Site navigation">
			<a href="/methodology">Methodology</a>
			<a href="/about">About</a>
		</nav>
	</header>

	<main class="hero">
		<section aria-labelledby="hero-title">
			<p class="eyebrow">UK small-business ad sanity check</p>
			<h1 id="hero-title">Where should you spend your ad budget?</h1>
			<p class="trust-line">We'll tell you to skip it if skipping it is the right answer.</p>
			<p class="lede">Tell us your town and how much you've got. We'll tell you what works, what doesn't, and what to skip.</p>
			<div class="promise-grid" aria-label="What this tool does">
				<div class="promise"><strong>The real verb is not get had.</strong> This is willing to say no when paid media is the wrong move.</div>
				<div class="promise"><strong>No signup. No sales trap.</strong> Your result is a screenshot-friendly postcard with questions to ask your rep.</div>
				<div class="promise"><strong>Outdoor is gated.</strong> It only appears when budget, horizon, business type and place genuinely warrant it.</div>
			</div>
		</section>

		<section class="tool-card" aria-labelledby="tool-title">
			<h2 id="tool-title">Get the postcard</h2>
			<div class="form-grid">
				<div class="field">
					<label for="place">Postcode, town or city</label>
					<input id="place" bind:value={place} placeholder="FK8, Stirling, Aberdeen..." oninput={updateUrl} />
				</div>

				<div class="field">
					<label for="budget">Monthly budget</label>
					<div class="budget-row">
						<input id="budget" type="range" min="200" max="50000" step="50" bind:value={budget} oninput={updateUrl} />
						<input aria-label="Monthly budget in pounds" type="number" min="200" max="50000" bind:value={budget} oninput={updateUrl} />
					</div>
				</div>

				{#if showStepTwo}
					<div class="step-two">
						<p class="reveal-note">This one is close enough that the extra context matters. Two more answers will stop it hedging.</p>
						<div class="field">
							<label for="time">Time horizon</label>
							<select id="time" bind:value={timeHorizon} onchange={updateUrl}>
								<option value="">Choose one</option>
								{#each timeHorizons as horizon}
									<option value={horizon.value}>{horizon.label}</option>
								{/each}
							</select>
						</div>
						<div class="field">
							<label for="category">What you sell</label>
							<select id="category" bind:value={category} onchange={updateUrl}>
								<option value="">Choose one</option>
								{#each categories as item}
									<option value={item.value}>{item.label}</option>
								{/each}
							</select>
						</div>
					</div>
				{/if}

				<button class="primary" type="button" onclick={updateUrl}>Make this URL shareable</button>
			</div>
		</section>
	</main>

	<section class="results" aria-label="Advertising verdict">
		<article class="postcard" aria-label="Five-line postcard output">
			<h2>{result.verdictLine}</h2>
			{#each result.postcardLines as line}
				<p class="postcard-line"><strong>{line.label}:</strong> {line.text}</p>
			{/each}
			<p class="caveat">{result.caveat}</p>
		</article>

		<section class="panel" aria-labelledby="rep-title">
			<h3 id="rep-title">If someone tries to sell you this</h3>
			<p class="rep-intro">You might not need this now — but if anyone quotes you numbers for this channel, here's what a confident person would ask.</p>
			<ol class="questions">
				{#each result.repQuestions as question}
					<li>{question}</li>
				{/each}
			</ol>
		</section>

		<details class="panel">
			<summary>Show your working</summary>
			<div class="inside">
				{#each result.working as item}
					<p>{item}</p>
				{/each}
				{#each result.benchmarksUsed as bench}
					<div class="benchmark">
						<strong>{bench.label}</strong>
						<p>{bench.detail}</p>
						<p class="muted">Source: {bench.source}. Last verified: {bench.last_verified}.</p>
					</div>
				{/each}
				<p><strong>What would change the answer:</strong> {result.whatWouldChange}</p>
				<p><a href="/methodology">Read the full methodology.</a></p>
			</div>
		</details>
	</section>

	<footer class="footer">
		<div class="footer-inner">
			<span>No login. No cookies. Just the reckoning.</span>
			<span><a href="/methodology">Methodology</a> · <a href="/about">About</a></span>
		</div>
	</footer>
</div>
