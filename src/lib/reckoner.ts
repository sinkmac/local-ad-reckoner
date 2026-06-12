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
	verdictContext: string;
	postcardOpening: string;
	postcardLines: { label: string; text: string; platform?: PlatformKey }[];
	caveat: string;
	skipAdvice: string[];
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

function roundToTwoSignificantFigures(n: number): number {
	if (!Number.isFinite(n) || n === 0) return n;
	const power = Math.floor(Math.log10(Math.abs(n)));
	const factor = 10 ** (power - 1);
	return Math.round(n / factor) * factor;
}

function roughNumber(n: number): string {
	const rounded = roundToTwoSignificantFigures(n);
	if (rounded >= 10000) return `${fmt(Math.round(rounded / 1000))}k`;
	return fmt(rounded);
}

function roughRange(low: number, high: number): string {
	return `roughly ${roughNumber(low)}–${roughNumber(high)}`;
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

const universalSkipAdvice = [
	({ budgetLabel, placeLabel }: { budgetLabel: string; placeLabel: string }) => `Sort your Google Business Profile first. It's the highest-traffic page you own and most businesses leave it half-finished. Photos taken this year, opening hours that are actually true, and a reply to every review — including the bad one. This outranks anything ${budgetLabel} of ads would buy you in ${placeLabel}.`,
	() => `Ask for reviews like it's part of the job. The gap between 12 reviews and 60 reviews is worth more than this budget. Ask at the moment the customer is happiest — job done, plates cleared, problem solved. A text with a direct link, sent that day. That's the whole system.`,
	() => `Mine the customers you already have. A message to past customers costs nothing and converts better than any ad ever will, because they already trust you. One honest email or text — what's new, what's on, why now. If you don't have their details, start collecting them today. That list is the asset.`,
	({ categoryShort }: { categoryShort: string }) => `Be useful in the local groups, not promotional. Every town has the Facebook groups where people ask "anyone know a good ${categoryShort}?" The businesses that win there are the ones already answering questions for free. Show up helpful for a month before you ever mention yourself.`
];

function businessTypeSkipAdvice(category: CategoryKey, placeLabel: string): string {
	const advice: Record<CategoryKey, string> = {
		emergency_callout: 'Own the 2am search. Nobody plans to need you, so the win is being findable in a panic: Google profile flawless, phone number tappable everywhere, "24 hour" in the business name field if it\'s true. Speed of answer beats spend.',
		appointment_service: 'Kill the booking friction. Every "call to enquire" loses you the customer who was browsing at 11pm. A free booking link in your Google profile and Instagram bio does more than ads pointing at a phone number.',
		food_drink: 'Photograph what you actually serve. Your next hundred customers will judge you on six photos. Make them this month\'s dishes in real light, not the 2022 launch shoot. Free, and it compounds.',
		retail: "Make the window and the doorstep work. You're paying rent for the best ad site you'll ever own. A reason to come in this week, written so it can be read from across the street.",
		trades_home: `Turn finished jobs into proof. Before-and-after photos with a one-line story, posted where ${placeLabel} can see them. Ten of those beat any ad, because trades are bought on evidence.`,
		health_fitness: 'Let results recruit. A referral offer your current members can hand to a friend costs you a free session and earns you a customer who arrives pre-sold.',
		beauty: "Fill the gaps, don't chase strangers. Last-minute cancellation slots posted to your existing followers fill faster than ads find new faces. The empty chair is the problem; your phone already holds the solution.",
		events: 'Make attending shareable. One moment people will photograph anyway — name it, sign it, light it. Your audience becomes the campaign.',
		professional_services: "Answer the questions people are afraid to ask. One plain-English page per question your clients always ask in the first meeting. That's what they're searching at midnight, and almost none of your competitors have written it down.",
		childcare_education: 'Word of mouth is the channel — engineer it. Parents trust parents and nothing else. Make it easy for your happiest families to recommend you: an open morning they can bring a friend to beats any ad.',
		property: "Your last ten listings are the pitch. Sellers choose the agent who clearly worked hardest on someone else's house. Make the evidence impossible to miss.",
		other: 'Find where your customers already gather and be visible there for free. Every trade has a room — a group, a noticeboard, a market, a forum. Spend the month earning a name in it before spending a pound interrupting strangers.'
	};
	return advice[category];
}

function skipAdvice(category: CategoryKey, budgetLabel: string, placeLabel: string, categoryInfo: { short: string }): string[] {
	return [
		universalSkipAdvice[0]({ budgetLabel, placeLabel, categoryShort: categoryInfo.short }),
		universalSkipAdvice[1]({ budgetLabel, placeLabel, categoryShort: categoryInfo.short }),
		businessTypeSkipAdvice(category, placeLabel)
	];
}

function outdoorWorkingLine(inputs: Inputs, budget: number, category: CategoryKey, outdoor: boolean): string {
	if (outdoor) return 'Outdoor is in the reckoning because the budget, business type, time horizon and town all point to repeated local presence.';
	if (budget < benchmarks.platforms.outdoor.min_budget_monthly) return 'Outdoor ads need either a bigger monthly budget or a longer run to make sense here.';
	if (inputs.timeHorizon !== 'long_term') return 'Outdoor ads usually need a longer run than this before they earn their keep.';
	if (!benchmarks.platforms.outdoor.eligible_business_types.includes(category)) return 'Outdoor ads usually need passing trade or a physical destination; this business type is harder to justify on posters alone.';
	if (!isUrban(inputs.place)) return 'Outdoor ads need a stronger footfall case here before I would put them in front of Search or Meta.';
	return 'Outdoor ads need either a bigger budget, a clearer footfall case, or a longer run to make sense here.';
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
	let verdictContext = '';
	let postcardOpening = '';
	const lines: Result['postcardLines'] = [];
	let caveat = 'These are ranges, not guarantees. I would treat the numbers as a smell test, not a promise.';
	let skipItems: string[] = [];
	const googleTestBudget = money(Math.max(200, Math.round(budget * 0.8 / 50) * 50));
	const supportBudget = money(Math.max(100, budget - Number(googleTestBudget.replace(/[^0-9]/g, ''))));
	const metaTestBudget = money(Math.max(200, Math.round(budget * 0.85 / 50) * 50));
	const searchSupportBudget = money(Math.max(100, budget - Number(metaTestBudget.replace(/[^0-9]/g, ''))));

	if (verdictType === 'reject') {
		verdictLine = `Keep your ${budgetLabel}. — The Reckoner's verdict for ${placeLabel}`;
		verdictContext = `For ${businessPhrase(categoryInfo)} in ${placeLabel} with ${budgetLabel} over ${timeInfo.short}, I would skip paid ads for now.`;
		postcardOpening = `I looked at ${placeLabel}, ${budgetLabel} a month, and ${categoryInfo.short}. The honest answer is that none of these channels earns its keep at this budget. Here's what I'd do instead.`;
		lines.push({ label: 'Google Search', platform: 'google_search', text: `I would not put ${budgetLabel} here: it likely buys ${roughRange(clicks.low, clicks.mid)} serious clicks, and I do not think that is enough room to learn cheaply.` });
		lines.push({ label: 'Meta', platform: 'meta', text: `I would not put ${budgetLabel} here either: it could buy ${roughRange(impressions.low, impressions.high)} local impressions, but attention is not the same as trust or booked work.` });
		caveat = `I just told you to keep ${budgetLabel} in your pocket, so here's what I'd actually do. None of it costs money. All of it works harder than ads at this budget.`;
		skipItems = [...skipAdvice(category, budgetLabel, placeLabel, categoryInfo), `Do these for ninety days, then come back with the same budget. The answer might be different — and you'll be in better shape to spend it.`];
	} else if (verdictType === 'outdoor') {
		verdictLine = `Spend it — but spend it here. — The Reckoner's verdict for ${placeLabel}`;
		verdictContext = `For ${businessPhrase(categoryInfo)} in ${placeLabel} with ${budgetLabel} a month and a long-term presence, I would consider outdoor — carefully.`;
		postcardOpening = `I looked at ${placeLabel}, ${budgetLabel} a month, and ${categoryInfo.short}. Outdoor is the one that holds up. Here's the working, and here's what to ask before you sign.`;
		lines.push({ label: 'Outdoor', platform: 'outdoor', text: `I would use ${budgetLabel} to ask about real local sites, but I would not sign anything without site-level Route figures.` });
		lines.push({ label: 'Meta', platform: 'meta', text: `I would keep Meta in the mix: that same budget could buy ${roughRange(impressions.low, impressions.high)} local impressions if the creative is strong.` });
		lines.push({ label: 'Google Search', platform: 'google_search', text: `I would use Search only where people are already looking nearby; ${budgetLabel} points to ${roughRange(clicks.low, clicks.high)} clicks.` });
		caveat = 'This is not fame money. It is presence money — useful only if the site, offer and repetition all line up.';
	} else if (verdictType === 'google') {
		verdictLine = `Spend it — but spend it here. — The Reckoner's verdict for ${placeLabel}`;
		verdictContext = `For ${businessPhrase(categoryInfo)} in ${placeLabel} with ${budgetLabel} a month, I would put the first test on Google Search.`;
		postcardOpening = `I looked at ${placeLabel}, ${budgetLabel} a month, and ${categoryInfo.short}. Google Search is the one that holds up. Here's the working, and here's what to ask before you sign.`;
		lines.push({ label: 'Google Search', platform: 'google_search', text: `I would put about ${googleTestBudget} into high-intent local searches; that points to ${roughRange(clicks.low, clicks.high)} clicks from people already looking.` });
		lines.push({ label: 'Meta', platform: 'meta', text: `I would keep roughly ${supportBudget} for remarketing or proof-led posts, not broad awareness for its own sake.` });
		caveat = 'I would skip outdoor here — the pot is better spent catching demand that already exists.';
	} else if (verdictType === 'meta') {
		verdictLine = `Spend it — but spend it here. — The Reckoner's verdict for ${placeLabel}`;
		verdictContext = `For ${businessPhrase(categoryInfo)} in ${placeLabel} with ${budgetLabel} a month, I would start with Meta.`;
		postcardOpening = `I looked at ${placeLabel}, ${budgetLabel} a month, and ${categoryInfo.short}. Meta is the one that holds up. Here's the working, and here's what to ask before you sign.`;
		lines.push({ label: 'Meta', platform: 'meta', text: `I would put about ${metaTestBudget} behind one clear local offer; that points to ${roughRange(impressions.low, impressions.high)} impressions if the creative is tight.` });
		lines.push({ label: 'Google Search', platform: 'google_search', text: `I would keep roughly ${searchSupportBudget} for the few searches that show real intent, not loose curiosity.` });
		caveat = 'I would skip outdoor here — this will not shake the town, but it can put the right offer in front of the right locals.';
	} else {
		verdictLine = `Not so fast. — The Reckoner's verdict for ${placeLabel}`;
		verdictContext = `For ${placeLabel} with ${budgetLabel} a month, I'm not ready to give you a straight answer — here's why.`;
		postcardOpening = `I looked at ${placeLabel} and ${budgetLabel} a month, but I'm missing what you sell and how long you're running. I don't guess. Answer two more questions and I'll give it to you straight.`;
		lines.push({ label: 'Google Search', platform: 'google_search', text: `I can see ${roughRange(clicks.low, clicks.high)} possible clicks for ${budgetLabel}, but what you sell changes whether that matters.` });
		lines.push({ label: 'Meta', platform: 'meta', text: `I can see ${roughRange(impressions.low, impressions.high)} possible local impressions for ${budgetLabel}, but the campaign length changes the answer.` });
		caveat = 'Add the time horizon and business type below. If the answer is still weak, I will say so.';
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
		verdictContext,
		postcardOpening,
		postcardLines: lines,
		caveat,
		skipAdvice: skipItems,
		working: [
			`I treated ${placeLabel} as ${isUrban(inputs.place) ? 'an urban/high-footfall area' : 'a local area without assumed outdoor inventory'}.`,
			`I compared likely Search clicks against likely Meta impressions using the ${categoryInfo.label.toLowerCase()} benchmark range.`,
			outdoorWorkingLine(inputs, budget, category, outdoor)
		],
		benchmarksUsed,
		repQuestions: repQuestions(activePlatforms),
		whatWouldChange: outdoor
			? 'A shorter time horizon or weaker footfall case would push outdoor back out of the recommendation.'
			: 'A longer time horizon, stronger reviews, better creative, or a higher monthly budget could change the answer.'
	};
}
