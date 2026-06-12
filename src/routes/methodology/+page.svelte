<svelte:head>
	<title>Methodology — Local Ad Reckoner</title>
	<meta name="description" content="How Local Ad Reckoner compares Google Search, Meta and outdoor advertising benchmarks for UK small businesses." />
</svelte:head>

<div class="site-shell">
	<header class="topbar">
		<a class="brand" href="/">Local Ad Reckoner</a>
		<nav class="nav" aria-label="Site navigation">
			<a href="/methodology">Methodology</a>
			<a href="/about">About</a>
		</nav>
	</header>

	<main class="page-main">
		<article class="content-card">
			<p class="eyebrow">How we calculated this</p>
			<h1>Ranges first. Claims second.</h1>
			<p>Local Ad Reckoner uses static benchmark ranges, not live bidding data. That is deliberate for v1: the tool is a second opinion before a small business signs anything, not a media-buying dashboard.</p>

			<h2>Benchmark sources</h2>
			<ul>
				<li><strong>Google Search Ads:</strong> Google Keyword Planner public UK ranges by business category. Last verified: 2026-03-01. Human verification required before custom-domain launch.</li>
				<li><strong>Meta:</strong> Meta Audience Estimator public UK ranges plus industry benchmark ranges by category. Last verified: 2026-03-01. Human verification required before custom-domain launch.</li>
				<li><strong>Outdoor:</strong> Outsmart Route UK OOH ranges by format and region. Last verified: 2026-03-01. Human verification required before custom-domain launch.</li>
			</ul>

			<h2>Why we store ranges</h2>
			<p>No ad quote should be judged from a single magic number. CPC, CPM and lead cost move by category, area, creative quality, landing page quality, season and competition. The tool stores low, mid and high ranges so it can be useful without pretending to know tomorrow's auction.</p>

			<h2>How the verdict works</h2>
			<p>The first pass uses only place and monthly budget. If one answer is clear, it shows the postcard immediately. If the top options are within roughly 20%, or outdoor could plausibly matter, the tool asks for time horizon and business type.</p>
			<p>Outdoor is not a default choice. I only put it in the reckoning when the business is footfall-dependent, the time horizon is long-term, the monthly budget is above the v1 threshold, and the location is treated as urban or high-footfall.</p>

			<h2>What this page protects</h2>
			<p>This methodology is the first protected surface after deploy. Once live, do not edit or remove the how-we-calculated-this section without explicitly logging the change and the reason.</p>
		</article>
	</main>
</div>
