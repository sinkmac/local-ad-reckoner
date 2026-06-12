<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { categories, cleanBudget, reckon, timeHorizons, type Inputs } from '$lib/reckoner';

	const baseUrl = 'https://local-ad-reckoner.netlify.app';

	let place = $state(page.url.searchParams.get('place') || 'Stirling');
	let budget = $state(cleanBudget(page.url.searchParams.get('budget') || 1200));
	let category = $state(page.url.searchParams.get('category') || '');
	let timeHorizon = $state(page.url.searchParams.get('time') || '');

	const inputs = $derived<Inputs>({
		place,
		budget: cleanBudget(budget),
		category: category ? (category as Inputs['category']) : undefined,
		timeHorizon: timeHorizon ? (timeHorizon as Inputs['timeHorizon']) : undefined
	});
	const result = $derived(reckon(inputs));
	const showStepTwo = $derived(result.requiresStepTwo || Boolean(category || timeHorizon));
	const shareUrl = $derived(`${baseUrl}/?${new URLSearchParams({
		place,
		budget: String(cleanBudget(budget)),
		...(category ? { category } : {}),
		...(timeHorizon ? { time: timeHorizon } : {})
	}).toString()}`);
	const shareTitle = $derived(`The Reckoner's verdict: ${result.placeLabel}, ${result.budgetLabel}/month`);
	const shareDescription = $derived(
		result.verdictType === 'reject'
			? `It said keep the money. Here's why.`
			: result.verdictType === 'borderline'
				? `It wants two more answers before it'll commit. Fair enough.`
				: `It said spend — on one channel only. Here's the working.`
	);

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
	<title>{shareTitle}</title>
	<meta name="description" content={shareDescription} />
	<meta property="og:title" content={shareTitle} />
	<meta property="og:description" content={shareDescription} />
	<meta property="og:url" content={shareUrl} />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={shareTitle} />
	<meta name="twitter:description" content={shareDescription} />
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
			<p class="trust-line">I'll tell you to skip it if skipping it is the right answer.</p>
			<p class="lede">Tell me your town and how much you've got. I'll tell you what works, what doesn't, and what to skip.</p>
		</section>

		<section class="tool-card" aria-labelledby="tool-title">
			<h2 id="tool-title">Get the postcard</h2>
			<p class="tool-support">A one-page verdict you can send to whoever's quoting you. They'll know you've done your homework before they've finished their pitch.</p>
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
		<article class="postcard" aria-label="Shareable postcard verdict">
			<div class="postcard-front">
				<p class="postcard-kicker">Front</p>
				<h2>{result.verdictLine}</h2>
				<p class="verdict-context">{result.verdictContext}</p>
			</div>
			<div class="postcard-back">
				<p class="postcard-kicker">Back</p>
				<p class="postcard-opening">{result.postcardOpening}</p>
				{#each result.postcardLines as line}
					<p class="postcard-line"><strong>{line.label}:</strong> {line.text}</p>
				{/each}
				<p class="caveat">{result.caveat}</p>
				{#if result.skipAdvice.length}
					<ul class="skip-advice">
						{#each result.skipAdvice as item}
							<li>{item}</li>
						{/each}
					</ul>
				{/if}
				<p class="provenance">Free second opinion from Local Ad Reckoner. No login, no cookies, no commission. Just the reckoning.</p>
			</div>
		</article>

		<section class="panel" aria-labelledby="rep-title">
			<h3 id="rep-title">If someone tries to sell you this</h3>
			<p class="rep-intro">If anyone quotes you numbers for this, these are the questions a confident buyer asks. Read them out. Watch what happens.</p>
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
