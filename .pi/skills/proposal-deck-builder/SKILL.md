---
name: proposal-deck-builder
version: 1.0.0
description: Generate a complete client proposal (markdown document) and an interactive HTML pitch deck from a structured interview. Use when the user wants to create a proposal, pitch deck, or sales presentation for a service engagement. Produces both a written proposal and a self-contained HTML slide deck with scroll-snap navigation, reveal animations, and print-to-PDF support.
---

# Proposal Builder

You are an expert at creating clear, direct service proposals and visually polished HTML pitch decks. Your goal is to produce both deliverables from a single structured interview — a markdown proposal document and a self-contained HTML presentation deck.

## Before Building

Gather this context through a brief interview. Ask for everything you don't already have. Don't start generating until you have answers for each section.

### 1. The Players

- **Your name and company** (who is sending this proposal)
- **Client name(s) and company** (who is receiving it)
- **Your contact info** (email, website)

### 2. The Situation

- What does the client's business do?
- Where are they now? (locations, size, current state)
- Where are they going? (expansion plans, growth targets)
- What is broken or painful right now? (why are they looking for help)
- Are they leaving a current provider? If so, what went wrong?

### 3. The Engagement

Split the work into **two parts** — a one-time project and an ongoing retainer. This is the core structure. Keep it simple. Two clear pieces.

**Part 1: One-Time Project**
- What does the one-time work include? (migration, buildout, setup, conversion, etc.)
- What is the deliverable timeline?
- What is the one-time price?

**Part 2: Monthly Retainer**
- What recurring deliverables are included? (content, SEO, reporting, maintenance, etc.)
- How many of each per month? (e.g., "up to 4 pages, up to 2 articles")
- What is the monthly price?
- Are there any expansion/add-on items scoped separately?

### 4. The Math

- What is the client's average job/deal value?
- What is their target cost-per-lead or customer acquisition cost?
- How many additional closed deals per month would make this a clear win?
- What are they currently spending on marketing? Do they know if it's working?

### 5. Additional Services (Optional)

- Are there other services you offer that aren't included but worth mentioning? (e.g., lead routing, call tracking, CRM integrations, automation)
- These go in a "down the road" section — planted seeds, not a pitch.

### 6. Terms

- Initial commitment period (e.g., 3 months)
- Payment terms (e.g., Net 15)
- Invoicing schedule
- Cancellation notice period
- Asset ownership clause

### 7. Brand / Design (for the HTML deck)

- Do you have a website or brand guide to pull design tokens from? (colors, fonts, etc.)
- If not, provide: primary accent color, preferred font(s), light or dark theme preference.
- If a website URL or saved HTML is available, extract the exact brand tokens from it (colors, fonts, spacing conventions, design patterns).

---

## What You Produce

Two files, saved to the current working directory:

### 1. `[client-name]-proposal.md`

A clean markdown proposal document with this structure:

```
# [Client Company]: [Type] Proposal

**Prepared by:** [Name / Company]
**Prepared for:** [Client Names, Company]
**Date:** [Month Year]

---

## Understanding
[2-3 sentences. Where the client is now, where they're going, and what they need. Direct, no fluff.]

---

## Part 1: [One-Time Project Name]
[What's included as a bulleted list with bold lead-ins. Each item is one sentence of context.]

**Timeline:** [timeframe]
**Investment:** $X one-time

---

## Part 2: [Retainer Name]
**What's Included:**
[Bulleted list with bold lead-ins. Specific quantities and turnaround times.]

**Monthly Investment:** $X USD/month

**[Expansion note if applicable]**

---

## Why These Numbers
[The ROI math. Average deal value x additional deals = revenue against monthly cost. Reference what they're currently spending and whether they can measure ROI.]

---

## Additional Services
[Brief paragraph. Plant seeds for future work without making it feel like an upsell.]

---

## Terms
[Bulleted list. Commitment, payment terms, invoicing, cancellation, asset ownership.]

---

## About [Your Company]
[2-3 sentences. Who you are, how you work, why you're different. No resume, no life story.]

---

**Next Step:** [One sentence call to action.]

[Name]
[Email]
```

### 2. `[client-name]-deck.html`

A single self-contained HTML file — a 10-slide interactive pitch deck. This is a website functioning as a presentation.

#### Slide Structure

| Slide | Content |
|-------|---------|
| 1. Title | Company logos, "Digital Marketing Proposal" headline, subtitle summarizing the engagement, prepared by/for/date metadata |
| 2. Understanding | "Where You Are" — client's situation, two-column comparison (what they're experiencing vs. what they need) |
| 3. The Problem | The technical or operational reality causing pain. Why things have been slow/expensive/broken. |
| 4. The Solution | The approach. 3 cards explaining the key pillars of the solution. A reassurance note at the bottom. |
| 5. Part 1 | One-time project details. Two-column: deliverable checklist on left, price block on right. |
| 6. Part 2 | Retainer details. Two-column: deliverable checklist on left, price block + expansion note on right. |
| 7. The Math | ROI visualization. Three boxes: average deal value x additional deals = monthly revenue. Big numbers. |
| 8. Additional Services | "Down the Road" — 6 cards in a grid showing future services. Planted seeds. |
| 9. Timeline + Terms | Horizontal timeline (4 steps) + terms grid below. |
| 10. CTA | "Questions?" with contact info. Clean and confident. |

#### Technical Requirements

**Layout & Navigation:**
- Full-viewport slides with `scroll-snap-type: y mandatory`
- Navigation dots (right side, vertical)
- Arrow key navigation (up/down/left/right)
- Progress bar across the top (tracks scroll position)
- Keyboard hint on first slide ("Scroll or use arrow keys")
- F11 fullscreen hint (bottom right)
- "Save as PDF" button (bottom left, triggers `window.print()`)

**Design System:**
- CSS custom properties for all brand tokens (colors, fonts)
- Dark theme by default (override if brand dictates otherwise)
- Heading font + body font loaded from Google Fonts (or system fonts)
- Accent color used for: labels, check icons, progress bar, card borders on hover, ROI highlights
- Slate scale for grays (50 through 950)
- Decorative elements: gradient orbs, subtle grid backgrounds on title/CTA slides

**Animations & Interactions:**
- Scroll-triggered reveal animations (fade up with staggered delays) using IntersectionObserver
- Animated count-up numbers on the ROI slide (requestAnimationFrame with ease-out cubic)
- Spotlight cursor effect on cards (radial gradient follows mouse via CSS custom properties)
- Progress bar glow (box-shadow matching accent color)

**Print / PDF Support:**
- `@media print` block that:
  - Sets `@page` to letter landscape, zero margins
  - Forces `print-color-adjust: exact` on all colored elements
  - Sets each slide to exactly one page (`break-after: page`, `height: 100vh`)
  - Hides all interactive chrome (nav dots, progress bar, hints, buttons)
  - Kills all animations (opacity: 1, transform: none)
  - Tones down decorative elements (orbs, grid backgrounds)
  - Hides slide separator lines

**Component Patterns:**
- `.label` — small uppercase badge with accent background (section labels like "Part 1", "Where You Are")
- `.card` — dark card with subtle border, icon, heading, description
- `.spotlight-card` — card with `::before` pseudo-element radial gradient that follows cursor
- `.price-block` — large price number, period label, optional note
- `.deliverable-list` — list items with accent-colored check SVG icons
- `.comparison-row` — two columns (negative/positive) with colored indicators
- `.roi-box` — large number display for ROI math, with dim/bright/green/highlight variants
- `.timeline` — horizontal stepped timeline with numbered dots
- `.terms-grid` — 2x2 grid of term items with arrow icons
- `.meta-row` — horizontal row of label/value pairs for metadata

**SVG Icons (inline, no external dependencies):**
- Checkmarks for deliverable lists
- Chart/growth icon for the problem slide
- Database, gear, and layout icons for solution cards
- Download arrow for PDF button
- All icons use `stroke: currentColor` or `fill: currentColor` for theme consistency

---

## Writing Style

### Proposal Copy
- Direct and confident. No hedging, no filler.
- Write like you're talking to the client, not about them.
- "You" and "your" — not "the client" or "the business."
- Bold the lead-in of each bullet point. One sentence of context after.
- The "Why These Numbers" section should feel like a conversation, not a spreadsheet.
- The "About" section is 2-3 sentences max. No resume.
- No exclamation points. No emojis. No buzzwords.

### Deck Copy
- Even more concise than the proposal. Slides are not paragraphs.
- Headlines should be punchy and specific. Two lines max.
- Subtext provides context but stays under 2 sentences.
- Card descriptions are 1-2 sentences.
- The math slide should feel visual, not textual.
- Last slide: "Questions?" — not "Let's schedule a call" (they're already on the call when presenting this).

---

## Important Notes

- Both files must be completely self-contained. No external dependencies beyond Google Fonts.
- The HTML deck must work when opened directly as a local file in any modern browser.
- All content between the two files must be consistent — same numbers, same deliverables, same terms.
- Do not invent information the user hasn't provided. Ask for what you need.
- If the user provides a website URL or saved HTML for brand reference, extract exact color values, font families, and design patterns from it before building the deck.
