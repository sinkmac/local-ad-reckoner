import benchmarks from '$lib/data/benchmarks.json';

type CategoryKey =
	| 'emergency_callout'
	| 'appointment_service'
	| 'food_drink'
	| 'retail'
	| 'trades_home'
	| 'health_fitness'
	| 'beauty'
	| 'events'
	| 'professional_services'
	| 'childcare_education'
	| 'property'
	| 'other';

type TimeHorizon = 'event' | 'season' | 'long_term';
type PlatformKey = 'google_search' | 'meta' | 'outdoor';
type VerdictType = 'google' | 'meta' | 'outdoor' | 'reject' | 'borderline';

export type Inputs = {
	place: string;
	budget: number;
	timeHorizon?: TimeHorizon;
	category?: CategoryKey;
};

export type Result = {
	verdictType: VerdictType;
	requiresStepTwo: boolean;
	placeLabel: string;
	budgetLabel: string;
	categoryLabel: string;
	timeLabel: string;
	verdictLine: string;
	postcardLines: { label: string; text: string; platform?: PlatformKey }[];
	caveat: string;
	working: string[];
	benchmarksUsed: { label: string; source: string; last_verified: string; detail: string }[];
	repQuestions: string[];
	whatWouldChange: string;
};

export const categories: { value: CategoryKey; label: string; short: string; footfall: boolean }[] = [
	{ value: 'emergency_callout', label: 'Emergency / call-out service', short: 'call-out service', footfall: false },
	{ value: 'appointment_service', label: 'Appointment service', short: 'appointment service', footfall: false },
	{ value: 'food_drink', label: 'Food and drink', short: 'food and drink business', footfall: true },
	{ value: 'retail', label: 'Retail', short: 'retailer', footfall: true },
	{ value: 'trades_home', label: 'Trades and home', short: 'trades business', footfall: false },
	{ value: 'health_fitness', label: 'Health and fitness', short: 'health and fitness business', footfall: true },
	{ value: 'beauty', label: 'Beauty and personal care', short: 'beauty business', footfall: true },
	{ value: 'events', label: 'Events and entertainment', short: 'events business', footfall: true },
	{ value: 'professional_services', label: 'Professional services', short: 'professional services firm', footfall: false },
	{ value: 'childcare_education', label: 'Childcare and education', short: 'childcare or education provider', footfall: false },
	{ value: 'property', label: 'Property', short: 'property business', footfall: true },
	{ value: 'other', label: 'Other', short: 'local business', footfall: false }
];

export const timeHorizons: { value: TimeHorizon; label: string; short: string }[] = [
	{ value: 'event', label: 'One campaign or event', short: 'one short campaign' },
	{ value: 'season', label: 'Building over a season', short: 'one to three months' },
	{ value: 'long_term', label: 'Long-term presence', short: 'a long-term presence' }
];

const urbanPlaces = new Set([
	'aberdeen', 'dundee', 'edinburgh', 'glasgow', 'stirling', 'inverness', 'perth', 'paisley', 'falkirk',
	'london', 'manchester', 'birmingham', 'leeds', 'liverpool', 'bristol', 'newcastle', 'cardiff', 'sheffield', 'nottingham', 'leicester'
]);

const scotlandPlaces = new Set(['aberdeen', 'dundee', 'edinburgh', 'glasgow', 'stirling', 'inverness', 'perth', 'paisley', 'falkirk', 'galashiels']);

const postcodeAreaHints: Record<string, string> = {
	fk: 'Stirling', eh: 'Edinburgh', g: 'Glasgow', ab: 'Aberdeen', dd: 'Dundee', iv: 'Inverness', ph: 'Perth', pa: 'Paisley', td: 'Galashiels',
	m: 'Manchester', b: 'Birmingham', ls: 'Leeds', l: 'Liverpool', bs: 'Bristol', ne: 'Newcastle', cf: 'Cardiff', s: 'Sheffield', ng: 'Nottingham', le: 'Leicester', sw: 'London', se: 'London', e: 'London', n: 'London', w: 'London'
};

function categoryMeta(category?: CategoryKey) {
	return categories.find((item) => item.value === category) ?? categories.find((item) => item.value === 'other')!;
}

function timeMeta(time?: TimeHorizon) {
	return timeHorizons.find((item) => item.value === time) ?? { value: 'season' as TimeHorizon, label: 'Building over a season', short: 'one month' };
}

export function cleanBudget(value: number | string | undefined): number {
	const numeric = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
	if (!Number.isFinite(numeric)) return 1200;
	return Math.min(50000, Math.max(200, Math.round(numeric)));
}

export function placeFromInput(place: string): string {
	const trimmed = place.trim();
	if (!trimmed) return 'your area';
	const compact = trimmed.toLowerCase().replace(/\s+/g, '');
	const area = compact.match(/^[a-z]{1,2}/)?.[0] ?? '';
	return postcodeAreaHints[area] ?? titleCase(trimmed.replace(/\d.*/, '').trim() || trimmed);
}

function titleCase(text: string): string {
	return text
		.split(/\s+/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');
}

function isUrban(place: string): boolean {
	const lower = placeFromInput(place).toLowerCase();
	return urbanPlaces.has(lower);
}

function isScotland(place: string): boolean {
	const lower = placeFromInput(place).toLowerCase();
	return scotlandPlaces.has(lower);
}

function googleBench(category: CategoryKey) {
	return benchmarks.platforms.google_search.categories[category] ?? benchmarks.platforms.google_search.categories.other;
}

function metaBench(category: CategoryKey) {
	return benchmarks.platforms.meta.categories[category] ?? benchmarks.platforms.meta.categories.other;
}

function outdoorRegion(place: string) {
	return isScotland(place) ? benchmarks.platforms.outdoor.regions.scotland_urban : benchmarks.platforms.outdoor.regions.uk_urban;
}

function estimatedClicks(budget: number, category: CategoryKey) {
	const bench = googleBench(category);
	return {
		low: Math.max(1, Math.round(budget / bench.cpc_high)),
		mid: Math.max(1, Math.round(budget / bench.cpc_mid)),
		high: Math.max(1, Math.round(budget / bench.cpc_low))
	};
}

function estimatedImpressions(budget: number, category: CategoryKey) {
	const bench = metaBench(category);
	return {
		low: Math.max(100, Math.round((budget / bench.cpm_high) * 1000)),
		mid: Math.max(100, Math.round((budget / bench.cpm_mid) * 1000)),
		high: Math.max(100, Math.round((budget / bench.cpm_low) * 1000))
	};
}

function fmt(n: number): string {
	return new Intl.NumberFormat('en-GB').format(n);
}

function money(n: number): string {
	return `£${fmt(n)}`;
}

function articleFor(phrase: string): string {
	return /^[aeiou]/i.test(phrase.trim()) ? 'an' : 'a';
}

function businessPhrase(categoryInfo: { short: string }): string {
	return `${articleFor(categoryInfo.short)} ${categoryInfo.short}`;
}

function googleScore(budget: number, category: CategoryKey, time?: TimeHorizon): number {
	let score = 50;
	if (['emergency_callout', 'trades_home', 'appointment_service', 'professional_services', 'property'].includes(category)) score += 22;
	if (['food_drink', 'events', 'retail', 'beauty'].includes(category)) score -= 4;
	if (budget < 600 && ['emergency_callout', 'trades_home', 'professional_services', 'property'].includes(category)) score -= 20;
	if (budget > 1500) score += 8;
	if (time === 'event') score += 5;
	if (time === 'long_term') score -= 3;
	return score;
}

function metaScore(budget: number, category: CategoryKey, time?: TimeHorizon): number {
	let score = 48;
	if (['food_drink', 'retail', 'beauty', 'events', 'health_fitness'].includes(category)) score += 22;
	if (['emergency_callout', 'professional_services'].includes(category)) score -= 14;
	if (budget < 500) score -= 8;
	if (budget >= 800 && budget <= 4000) score += 8;
	if (time === 'season') score += 6;
	if (time === 'long_term') score += 4;
	return score;
}

function outdoorEligible(inputs: Inputs): boolean {
	const category = inputs.category ?? 'other';
	return Boolean(
		inputs.timeHorizon === 'long_term' &&
		benchmarks.platforms.outdoor.eligible_business_types.includes(category) &&
		inputs.budget >= benchmarks.platforms.outdoor.min_budget_monthly &&
		isUrban(inputs.place)
	);
}

function shouldRevealStepTwo(inputs: Inputs): boolean {
	if (inputs.category && inputs.timeHorizon) return false;
	const category: CategoryKey = 'other';
	const g = googleScore(inputs.budget, category);
	const m = metaScore(inputs.budget, category);
	const close = Math.abs(g - m) <= Math.max(g, m) * 0.2;
	const possibleOutdoor = inputs.budget >= 2000 && isUrban(inputs.place);
	return close || possibleOutdoor || (inputs.budget >= 700 && inputs.budget <= 2500);
}

function rejectionAdvice(category: CategoryKey): string {
	const advice: Record<CategoryKey, string> = {
		emergency_callout: 'Honestly? Spend it on your Google Business Profile, call tracking, reviews, and making the phone number impossible to miss. That will beat a thin paid campaign.',
		appointment_service: 'Honestly? Spend it on better photos, proof-led service pages, and asking your best customers for specific reviews. Trust will move the needle before more impressions do.',
		food_drink: 'Honestly? Spend it on fresh photography, a simple offer people can repeat, and making your Google listing spotless. That gives paid ads something real to amplify later.',
		retail: 'Honestly? Spend it on window, stock and product photography, then push one clear offer through your own channels first. Do not pay to advertise a vague shop message.',
		trades_home: 'Honestly? Spend it on before-and-after proof, reviews, and a landing page that explains your patch, prices and response time. That makes every future click less wasteful.',
		health_fitness: 'Honestly? Spend it on a starter offer, member proof, and a simple referral push. A colder paid campaign needs those trust signals before it converts.',
		beauty: 'Honestly? Spend it on strong treatment photos, review capture, and a booking page that removes friction. Then advertise the best-selling service, not the whole salon.',
		events: 'Honestly? Spend it on one sharp creative idea, partner posts, and a landing page with date, price and booking above the fold. Paid reach cannot rescue a fuzzy event.',
		professional_services: 'Honestly? Spend it on a stronger case-study page and direct outreach to a narrow list. Broad local paid ads are usually too blunt for this budget.',
		childcare_education: 'Honestly? Spend it on parent testimonials, open-day material and local community distribution. People need reassurance before they need another advert.',
		property: 'Honestly? Spend it on valuation proof, local sold stories, and better photography. Paid media works better once the trust evidence is already visible.',
		other: 'Honestly? Spend it on proof first: better photos, clearer offer, recent reviews and one page that explains why someone local should trust you. Then come back to paid media.'
	};
	return advice[category];
}

function repQuestions(platforms: PlatformKey[]): string[] {
	const questions: Record<PlatformKey, string[]> = {
		google_search: [
			'What are the current CPC ranges for my top three keywords, and can you show the Keyword Planner screenshot?',
			'What conversion rate are you assuming for my landing page?',
			'What is your management fee, and how does it change as spend scales?'
		],
		meta: [
			'What CPM are you quoting, and is it based on my specific audience or a platform average?',
			'What is a realistic cost per lead for my category in the UK right now?',
			'What happens to targeting when iOS users opt out?'
		],
		outdoor: [
			'Can you show the Route audience figure specifically for this postcode area, not the regional number?',
			'What is the average dwell time on this format, and how was it measured?',
			'Has a business like mine used this site before? What did they see?'
		]
	};
	const ordered = platforms.includes('outdoor') ? ['outdoor', ...platforms.filter((platform) => platform !== 'outdoor')] as PlatformKey[] : platforms;
	return [...new Set(ordered.flatMap((platform) => questions[platform]))].slice(0, 4);
}

export function reckon(inputs: Inputs): Result {
	const budget = cleanBudget(inputs.budget);
	const placeLabel = placeFromInput(inputs.place);
	const category = inputs.category ?? 'other';
	const categoryInfo = categoryMeta(category);
	const timeInfo = timeMeta(inputs.timeHorizon);
	const budgetLabel = money(budget);
	const hasStepTwo = Boolean(inputs.category && inputs.timeHorizon);
	const requiresStepTwo = shouldRevealStepTwo({ ...inputs, budget });
	const gScore = googleScore(budget, category, inputs.timeHorizon);
	const mScore = metaScore(budget, category, inputs.timeHorizon);
	const outdoor = outdoorEligible({ ...inputs, budget, category });
	const clicks = estimatedClicks(budget, category);
	const impressions = estimatedImpressions(budget, category);
	const google = googleBench(category);
	const meta = metaBench(category);
	const ooh = outdoorRegion(inputs.place);
	const lowValue = budget < 900 && ['emergency_callout', 'trades_home', 'professional_services', 'property', 'appointment_service'].includes(category) && inputs.timeHorizon !== 'long_term';
	const noClearWinner = Math.abs(gScore - mScore) < 8 && budget < 700;
	let verdictType: VerdictType = gScore >= mScore ? 'google' : 'meta';
	if (lowValue || noClearWinner) verdictType = 'reject';
	if (outdoor && hasStepTwo) verdictType = 'outdoor';
	if (requiresStepTwo && !hasStepTwo) verdictType = 'borderline';

	const activePlatforms: PlatformKey[] = verdictType === 'outdoor' ? ['google_search', 'meta', 'outdoor'] : ['google_search', 'meta'];
	let verdictLine = '';
	const lines: Result['postcardLines'] = [];
	let caveat = 'These are ranges, not guarantees. Creative quality, landing page trust and the offer will move the number more than anything else.';

	if (verdictType === 'reject') {
		verdictLine = `For ${businessPhrase(categoryInfo)} in ${placeLabel} with ${budgetLabel} over ${timeInfo.short}, none of these give you your money's worth.`;
		lines.push({ label: 'Google Search', platform: 'google_search', text: `Likely around ${fmt(clicks.low)}–${fmt(clicks.mid)} serious clicks; in this category that is not enough room to learn cheaply.` });
		lines.push({ label: 'Meta', platform: 'meta', text: `Possible reach of ${fmt(impressions.low)}–${fmt(impressions.high)} impressions, but attention is not the same as trust or booked work.` });
		caveat = rejectionAdvice(category);
	} else if (verdictType === 'outdoor') {
		verdictLine = `For ${businessPhrase(categoryInfo)} in ${placeLabel} with ${budgetLabel} and a long-term presence, outdoor is worth investigating — not signing blind.`;
		lines.push({ label: 'Google Search', platform: 'google_search', text: `Around ${fmt(clicks.low)}–${fmt(clicks.high)} clicks if people are already searching near you.` });
		lines.push({ label: 'Meta', platform: 'meta', text: `Around ${fmt(impressions.low)}–${fmt(impressions.high)} local impressions; useful support if the creative is strong.` });
		lines.push({ label: 'Outdoor', platform: 'outdoor', text: `Urban inventory could fit this budget; ask for site-level Route figures before believing any reach claim.` });
	} else if (verdictType === 'google') {
		verdictLine = `For ${businessPhrase(categoryInfo)} in ${placeLabel} with ${budgetLabel}, Google Search is your best shot.`;
		lines.push({ label: 'Google Search', platform: 'google_search', text: `Around ${fmt(clicks.low)}–${fmt(clicks.high)} clicks from people already looking for something like this.` });
		lines.push({ label: 'Meta', platform: 'meta', text: `Around ${fmt(impressions.low)}–${fmt(impressions.high)} local impressions; better for reminding people than catching urgent intent.` });
	} else if (verdictType === 'meta') {
		verdictLine = `For ${businessPhrase(categoryInfo)} in ${placeLabel} with ${budgetLabel}, Meta is probably the cleaner first test.`;
		lines.push({ label: 'Meta', platform: 'meta', text: `Around ${fmt(impressions.low)}–${fmt(impressions.high)} local impressions if the audience and creative are tight.` });
		lines.push({ label: 'Google Search', platform: 'google_search', text: `Around ${fmt(clicks.low)}–${fmt(clicks.high)} clicks, but likely less efficient unless search intent is already obvious.` });
	} else {
		verdictLine = `For ${placeLabel} with ${budgetLabel}, this is close enough that two more details matter before you sign anything.`;
		lines.push({ label: 'Google Search', platform: 'google_search', text: `Could buy roughly ${fmt(clicks.low)}–${fmt(clicks.high)} clicks, depending on what you sell.` });
		lines.push({ label: 'Meta', platform: 'meta', text: `Could buy roughly ${fmt(impressions.low)}–${fmt(impressions.high)} local impressions, depending on the campaign horizon.` });
		caveat = 'Add the time horizon and business type below. If the answer stays weak, the tool will say so.';
	}

	const benchmarksUsed = [
		{ label: benchmarks.platforms.google_search.name, source: google.source, last_verified: google.last_verified, detail: `CPC range ${money(google.cpc_low)}–${money(google.cpc_high)}; midpoint ${money(google.cpc_mid)}.` },
		{ label: benchmarks.platforms.meta.name, source: meta.source, last_verified: meta.last_verified, detail: `CPM range ${money(meta.cpm_low)}–${money(meta.cpm_high)}; CPL midpoint ${money(meta.cpl_mid)}.` }
	];
	if (outdoor || verdictType === 'borderline') {
		benchmarksUsed.push({ label: benchmarks.platforms.outdoor.name, source: ooh.source, last_verified: ooh.last_verified, detail: `OOH CPM range ${money(ooh.cpm_low)}–${money(ooh.cpm_high)}. ${ooh.format_note}` });
	}

	return {
		verdictType,
		requiresStepTwo,
		placeLabel,
		budgetLabel,
		categoryLabel: categoryInfo.label,
		timeLabel: timeInfo.label,
		verdictLine,
		postcardLines: lines,
		caveat,
		working: [
			`We treated ${placeLabel} as ${isUrban(inputs.place) ? 'an urban/high-footfall area' : 'a local area without assumed outdoor inventory'}.`,
			`We compared likely Search clicks against likely Meta impressions using the ${categoryInfo.label.toLowerCase()} benchmark range.`,
			outdoor ? 'Outdoor surfaced because the budget, business type, time horizon and town all passed the outdoor gate.' : 'Outdoor did not surface because one or more outdoor gates did not pass.'
		],
		benchmarksUsed,
		repQuestions: repQuestions(activePlatforms),
		whatWouldChange: outdoor
			? 'A shorter time horizon or weaker footfall case would push outdoor back out of the recommendation.'
			: 'A longer time horizon, stronger reviews, better creative, or a higher monthly budget could change the answer.'
	};
}
