// Fixed eval inputs: each template's own sample plus two held-out inputs written for the eval.
// Expectations are facts a correct run must keep (step index is 0-based) and, where clear, the sentiment label.
import type { Expect } from './rubric'

export interface Case {
  id: string
  template: string
  input: string
  expect: Expect
}

export const cases: Case[] = [
  // support-ticket-triage: clean → sentiment → categorize
  {
    id: 'triage-sample',
    template: 'support-ticket-triage',
    input: 'sample',
    expect: { sentiment: 'negative', mustInclude: [{ step: 0, any: ['48213'] }, { step: 2, any: ['high'] }] },
  },
  {
    id: 'triage-billing',
    template: 'support-ticket-triage',
    input: "Hello,   I was charged TWICE for my annual plan (Rs 4,999 each) on 3 Nov. invoice numbers INV-7731 and INV-7732.  please refund the duplicate , i only have one account.  Regards Arjun",
    expect: { sentiment: ['negative', 'neutral', 'mixed'], mustInclude: [{ step: 0, any: ['INV-7731'] }, { step: 2, any: ['billing', 'payment', 'refund'] }] },
  },
  {
    id: 'triage-praise',
    template: 'support-ticket-triage',
    input: "just wanted to say ur support agent Kavya fixed my login issue in 5 minutes!!! super helpful , no further action needed. cheers",
    expect: { sentiment: 'positive', mustInclude: [{ step: 0, any: ['Kavya'] }, { step: 2, any: ['low'] }] },
  },
  // meeting-notes-to-actions: summarize(short) → extract(action items)
  {
    id: 'meeting-sample',
    template: 'meeting-notes-to-actions',
    input: 'sample',
    expect: { mustInclude: [{ step: 1, any: ['Meera'] }, { step: 1, any: ['Ana'] }] },
  },
  {
    id: 'meeting-infra',
    template: 'meeting-notes-to-actions',
    input: "Infra weekly. Postgres disk at 82%, Sanjay to add a retention job by Wednesday. Staging deploys failing since Friday because of an expired cert; Leela renews it today. Budget review with finance on the 20th, Omar prepares the cost sheet. Decided to move logs to cheaper storage after the review.",
    expect: { mustInclude: [{ step: 1, any: ['Sanjay'] }, { step: 1, any: ['Leela'] }, { step: 1, any: ['Omar'] }] },
  },
  {
    id: 'meeting-hiring',
    template: 'meeting-notes-to-actions',
    input: "Hiring sync. Two backend offers out, one accepted (joins Dec 2). Priyanka to schedule the remaining onsite for the ML role next week. Vikram will update the JD for the data engineer opening by Monday. Referral bonus raised to Rs 50k, HR to announce it Friday.",
    expect: { mustInclude: [{ step: 1, any: ['Priyanka'] }, { step: 1, any: ['Vikram'] }] },
  },
  // review-to-hindi-brief: summarize(short) → translate(Hindi)
  { id: 'hindi-sample', template: 'review-to-hindi-brief', input: 'sample', expect: {} },
  {
    id: 'hindi-laptop',
    template: 'review-to-hindi-brief',
    input: "Bought this laptop for college. It boots in seconds, the keyboard is comfortable for long typing sessions, and it weighs only 1.3 kg. The fan gets loud when I run games, and the webcam is grainy in low light. Battery lasts around eight hours of browsing. Good value overall.",
    expect: { mustInclude: [{ step: 1, any: ['1.3', '१.३'] }] },
  },
  {
    id: 'hindi-blender',
    template: 'review-to-hindi-brief',
    input: "The blender is powerful and crushes ice easily, but it is very noisy and the lid leaks if you fill it past the 1 litre mark. Cleaning is simple since the blades come out. Customer service replaced a cracked jar within a week. Three stars.",
    expect: {},
  },
  // article-key-facts: clean → summarize(medium) → extract(numbers, dates, names, places)
  {
    id: 'article-sample',
    template: 'article-key-facts',
    input: 'sample',
    expect: { mustInclude: [{ step: 2, any: ['11 km', '11-km', '11 kilometres', '11 kilometers'] }, { step: 2, any: ['45,000', '45000'] }, { step: 2, any: ['1,600', '1600'] }, { step: 2, any: ['2028'] }] },
  },
  {
    id: 'article-heat',
    template: 'article-key-facts',
    input: "Pune, 3 June:   Temperatures touched 41.2 C on Monday, the highest June reading since 2019, the IMD said.  Power demand hit a record 5,800 MW. The civic body opened 120 cooling centres and advised people to avoid going out between noon and 4 pm. Monsoon showers are expected by 10 June.",
    expect: { mustInclude: [{ step: 2, any: ['41.2'] }, { step: 2, any: ['5,800', '5800'] }, { step: 2, any: ['120'] }, { step: 2, any: ['Pune'] }] },
  },
  {
    id: 'article-startup',
    template: 'article-key-facts',
    input: "Bengaluru-based Kisaan AI raised $12 million in a Series A led by Lightbox, the company said on 18 March. Founded in 2021 by Neha Rao and Amit Shah, it serves 300,000 farmers across 9 states with crop-disease detection from phone photos. The funds will go to expanding into Bangladesh.",
    expect: { mustInclude: [{ step: 2, any: ['12 million', '$12'] }, { step: 2, any: ['Neha Rao'] }, { step: 2, any: ['300,000', '300000'] }, { step: 2, any: ['Bangladesh'] }] },
  },
  // feedback-sentiment: sentiment → categorize
  {
    id: 'feedback-sample',
    template: 'feedback-sentiment',
    input: 'sample',
    expect: { sentiment: ['mixed', 'positive'], mustInclude: [{ step: 1, any: ['export', 'csv'] }] },
  },
  {
    id: 'feedback-crash',
    template: 'feedback-sentiment',
    input: "App crashes every time I try to upload a photo from the gallery on my Pixel 7. Reinstalled twice, same thing. I've lost two drafts already. Useless until this is fixed.",
    expect: { sentiment: 'negative', mustInclude: [{ step: 1, any: ['bug'] }, { step: 1, any: ['high', 'critical'] }] },
  },
  {
    id: 'feedback-request',
    template: 'feedback-sentiment',
    input: "Really enjoying the app so far. Would be great if I could schedule posts for later and pick a custom accent colour. Keep it up!",
    expect: { sentiment: 'positive', mustInclude: [{ step: 1, any: ['request', 'feature'] }] },
  },
]
