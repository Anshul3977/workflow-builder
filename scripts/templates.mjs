// Seed templates. Steps use the same shape the builder stores: { id, type, position, config: { type, parameters } }.
const s = (type, parameters = {}, i = 0) => ({ id: `${type}-${i}`, type, position: i, config: { type, parameters } })
const steps = (...list) => list.map(([t, p], i) => s(t, p, i))

export const templates = [
  {
    slug: 'support-ticket-triage', name: 'Support ticket triage', category: 'Support',
    description: 'Tidy a messy customer email, read the mood, then tag topic and urgency.',
    steps: steps(['clean'], ['sentiment'], ['categorize', { categories: 'topic, urgency (low/medium/high), team to route to' }]),
    sample_input: "hi team,,, my order #48213 was supposed to arrive monday and its now thursday. tracking hasnt updated in 3 days!! i paid for express shipping. this is the second time this month. if it doesnt come by tomorrow i want a full refund   thanks, Priya",
  },
  {
    slug: 'meeting-notes-to-actions', name: 'Meeting notes → action items', category: 'Productivity',
    description: 'Summarize rough notes, then pull out who does what by when.',
    steps: steps(['summarize', { length: 'short' }], ['extract', { topics: 'action items with owner and deadline' }]),
    sample_input: "Sprint sync, Tue. Rahul: payments API is done but webhooks still flaky on retries, needs 2 more days. Meera will own the retry fix. Design review for onboarding moved to Friday, Ana to send Figma link by Thursday. We agreed to cut the dark-mode ticket from this sprint. QA found 3 blockers in checkout, Dev to triage today. Next release target is the 28th if blockers are cleared by Monday.",
  },
  {
    slug: 'review-to-hindi-brief', name: 'Product review → Hindi brief', category: 'Localization',
    description: 'Condense an English review and translate the summary to Hindi.',
    steps: steps(['summarize', { length: 'short' }], ['translate', { targetLanguage: 'Hindi' }]),
    sample_input: "I've used these earbuds for about six weeks. Battery easily lasts a full workday and the case charges fast over USB-C. Sound is warm with decent bass, though highs get a bit harsh at max volume. Noise cancelling is fine on a bus but not great on flights. The fit was loose until I switched to the smallest tips. For the price, I'd still recommend them.",
  },
  {
    slug: 'article-key-facts', name: 'News article → key facts', category: 'Research',
    description: 'Clean pasted article text, summarize it, and list the hard facts.',
    steps: steps(['clean'], ['summarize', { length: 'medium' }], ['extract', { topics: 'numbers, dates, names and places' }]),
    sample_input: "Nagpur, 12 Nov: The city's new metro extension   opened to the public on Wednesday, adding 11 km and 9 stations to the network. Officials said about 45,000 riders used the line on day one. The extension cost roughly Rs 1,600 crore and was completed four months behind schedule. The next phase, toward the airport, is planned for 2028.",
  },
  {
    slug: 'feedback-sentiment', name: 'App feedback → sentiment + themes', category: 'Product',
    description: 'Score the mood of user feedback and group it into themes.',
    steps: steps(['sentiment'], ['categorize', { categories: 'feature area, bug vs request, severity' }]),
    sample_input: "Love the new dashboard, it's so much faster. But the export to CSV button disappeared after the update and I need it every Friday for reports. Also dark mode resets every time I log in. Please fix, otherwise great app.",
  },
]
