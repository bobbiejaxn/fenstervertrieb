# Design Principles — Universal Anti-Slop Design Rules for All Agents

Universal design principles extracted from [huashu-design](https://github.com/alchaincyf/huashu-design) by 花叔 (Huasheng). Loaded by any agent that writes or reviews UI code. Prevents AI design slop and enforces brand fidelity.

## When to load

- Any agent writing frontend code (implementer, frontend-lead, test-writer)
- Any agent reviewing UI (reviewer, ui-reviewer, adversarial-tester)
- When the user asks to "make it look good", "improve the design", or "fix the UI"
- Triggers: "design principles", "anti slop", "brand spec", "design review"

---

## Principle #0 — Fact Verification Before Assumptions

When the task mentions a specific product/technology/event, the first action **must** be a web search to confirm existence, release status, version, and specs. No claims from training memory.

- Cost of a search: ~10 seconds
- Cost of a wrong assumption: 1-2 hours of rework

**Forbidden phrases** (stop and search instead):
- ❌ "I remember X hasn't been released yet"
- ❌ "X is currently version N" (unverified)
- ❌ "X might not exist"

---

## Principle #1 — Start From Existing Context, Not Blank Canvas

Good hi-fi design grows from existing context. Always ask: does this project have a design system? UI kit? Existing components? Brand guidelines? Codebase patterns?

**If no design context exists**, don't default to generic — offer 3 differentiated directions.

### Core Asset Protocol (mandatory when touching a specific brand)

When the task involves a specific brand (company/product/client):

**Asset hierarchy (by recognizability)**:

| Priority | Asset | Required? |
|----------|-------|-----------|
| 1 | Logo | Any brand — mandatory |
| 2 | Product images | Physical products — mandatory |
| 3 | UI screenshots | Digital products — mandatory |
| 4 | Color values | Auxiliary |
| 5 | Fonts | Auxiliary |

**5-step process**:
1. **Ask** — checklist of 6 asset types (logo, product shots, UI screenshots, color palette, fonts, brand guidelines)
2. **Search** official channels — `<brand>.com/brand`, `<brand>.com/press`, product pages, press kits
3. **Download** — with fallback paths per asset type (SVG → inline SVG → social avatar for logos)
4. **Verify** — check fidelity, resolution, freshness. Grep hex colors from real assets, never guess
5. **Freeze** — write `brand-spec.md` with all asset paths, CSS variables, temperament keywords

**Hard rules**:
- Never use CSS silhouettes/SVG hand-drawn substitutes for real product images
- Never skip this protocol and fill with generic content
- Missing logo → stop and ask user, don't proceed without it
- "5-10-2-8" quality gate: search 5 rounds, find 10 candidates, select 2 good ones, each must score ≥8/10

---

## Principle #2 — Show Assumptions Early, Iterate Fast (Junior Designer Mode)

Never dive into a big implementation without showing progress:
1. Write assumptions + reasoning + placeholders in comments
2. Show early (even gray blocks are fine)
3. Fill in real content → show again
4. Iterate on details

**Wrong understanding caught early costs 100× less than caught late.**

---

## Principle #3 — Give Variations, Not "The Final Answer"

Give 3+ variants across different dimensions (visual/interaction/color/layout), from by-the-book to novel, progressively. Let the user mix and match.

---

## Principle #4 — Honest Placeholders Over Bad Implementation

- No icon? Gray block + text label. Don't draw bad SVG.
- No data? `<!-- Awaiting real data -->` comment. Don't fabricate realistic-looking fake data.
- An honest placeholder is 10× better than a拙劣 (botched) real attempt.

---

## Principle #5 — System First, No Filler

Every element must earn its place. White space is a design problem solved with composition, not by fabricating content.

**One thousand no's for every yes.**

Watch for:
- **Data slop** — meaningless numbers, decorative stats
- **Iconography slop** — every heading gets an icon
- **Gradient slop** — every background gets a gradient

---

## Anti AI-Slop Ban List

These are the visual common denominators of AI output. They carry zero brand information and make everything look the same.

### Banned (unless brand itself uses it)

| Element | Why it's slop | When it's OK |
|---------|--------------|-------------|
| Purple/blue gradients | AI's universal "tech feel" formula | Brand itself uses purple gradients (Linear) |
| Emoji as icons | Training data puts emoji on every bullet | Brand itself uses emoji (Notion), or children/casual product |
| Rounded cards + left colored border accent | 2020-2024 Material/Tailwind cliché | User explicitly requests it, or it's in the brand spec |
| SVG-drawn imagery (faces, scenes, products) | AI-drawn SVG humans always have wrong proportions | Almost never — use real images or AI-generated photos |
| CSS silhouettes replacing real product photos | Produces generic "tech animation" — black bg + orange accent, no brand identity | Never — use Core Asset Protocol |
| Inter/Roboto/Arial as display font | Too common, can't tell if it's designed or a demo | Brand spec explicitly uses these (Stripe uses tuned Inter) |
| Cyber neon / dark `#0D1117` backgrounds | GitHub dark mode aesthetic, overused cliché | Developer tools product matching that direction |
| Generic tech circles/orbs/constellations | Every AI company landing page uses these | N/A |

### Required (what to do instead)

- ✅ `text-wrap: pretty` + CSS Grid + advanced CSS — these are the "taste tax" AI can't fake
- ✅ Use `oklch()` colors or colors from the brand spec — never invent new colors on the fly
- ✅ Serif display faces for premium feel, carefully chosen
- ✅ Real images (Unsplash, Wikimedia, AI-generated) over SVG hand-drawn
- ✅ One detail at 120%, everything else at 80% — taste = precision in the right places, not uniform effort
- ✅ `8pt grid system` for spacing (8, 16, 24, 32, 48, 64px only)
- ✅ Maximum 2 font families (1 display + 1 body), use weight and size for variation
- ✅ Maximum 3-4 colors (1 primary + 1 secondary + 1 accent + grayscale)

---

## 5-Dimension Design Critique Rubric

For agents reviewing UI output. Score each dimension 0-10:

| Dimension | What it measures | 9-10 | 5-6 | 1-2 |
|-----------|-----------------|------|-----|-----|
| **Philosophy Alignment** | Does it embody the chosen design direction? | Every detail has philosophical basis | Intent visible but impure elements mixed in | Unrelated to chosen direction |
| **Visual Hierarchy** | Does the eye flow where intended? | Zero friction information access | Headings and body distinguishable | Flat, no entry point |
| **Craft Quality** | Pixel-level execution | Unified spacing system, precise alignment | Mostly aligned, some inconsistencies | Rough, draft-like |
| **Functionality** | Does every element serve the goal? | Zero redundancy | Mostly functional, some decorative | Form over function |
| **Originality** | Is it memorable or template-grade? | Surprising yet perfectly fitting | Competent but template-like | Stock clichés |

### Quick review checklist

- [ ] Title vs body size ratio ≥ 2.5× (ideally 3×)
- [ ] ≤ 4 colors total
- [ ] ≤ 2 font families
- [ ] Consistent alignment (pick one: left/center/right, stick to it)
- [ ] Whitespace ≥ 40% of total area
- [ ] No banned AI slop elements
- [ ] "Squint test" — hierarchy still clear when blurred?
- [ ] Every element passes "would removing it make it worse?" test

### Output format

```
## Design Critique

Overall: X.X/10 [Excellent(8+)/Good(6-7.9)/Needs Work(4-5.9)/Fail(<4)]

Scores:
  Philosophy:    X/10 — [one line]
  Hierarchy:     X/10 — [one line]
  Craft:         X/10 — [one line]
  Functionality: X/10 — [one line]
  Originality:   X/10 — [one line]

Keep:
  - [what's working]

Fix:
  1. [issue] — ⚠️ critical / ⚡ important / 💡 polish
     Current: [what's wrong]
     Fix: [specific action with values]

Quick Wins (if 5 minutes):
  - [ ] [highest-impact fix]
  - [ ] [second]
  - [ ] [third]
```

---

## Design Direction Fallback

When the brief is too vague to execute, don't run on generic intuition:

1. Recommend 3 differentiated directions from these 5 schools:

| School | Visual temperament | Good for |
|--------|-------------------|----------|
| Information Architecture | Rational, data-driven, restrained | Professional/corporate |
| Motion Poetics | Dynamic, immersive, technical aesthetics | Bold/avant-garde |
| Minimalism | Order, whitespace, refined | Safe/premium |
| Experimental Avant-garde | Pioneering, generative art, visual impact | Innovative/creative |
| Eastern Philosophy | Warm, poetic, contemplative | Differentiated/unique |

2. Each direction must include a named designer/agency reference
3. Generate 3 quick demos if possible, let user pick
4. Once chosen, continue into Junior Designer workflow

---

## 20 Design Philosophy Quick Reference

| # | Name | Key visual trait | Color profile |
|---|------|-----------------|--------------|
| 01 | Pentagram / Michael Bierut | Swiss grid, typography as language | B&W + 1 accent |
| 02 | Stamen Design | Cartographic data, organic patterns | Warm (terracotta, sage, deep blue) |
| 03 | Information Architects | Content-first, system fonts, blue links | Minimal, content-driven |
| 04 | Fathom | Data sculpture, precise geometry | Muted scientific palette |
| 05 | Locomotive | Immersive scroll, cinematic | Rich, atmospheric |
| 06 | Active Theory | Generative, WebGL | Dark + neon accents |
| 07 | Field.io | Motion poetry, kinetic | Experimental, high contrast |
| 08 | Resn | Playful distortion, surreal | Bold, unexpected |
| 09 | Experimental Jetset | Strict grid, anti-decoration | Red/blue/black only |
| 10 | Müller-Brockmann | Classic Swiss, mathematical grid | Primary colors, structured |
| 11 | Build | Crafted detail, editorial | Refined, considered |
| 12 | Sagmeister & Walsh | Provocative, hand-crafted | Bold, rule-breaking |
| 13 | Zach Lieberman | Creative coding, particle systems | Experimental light |
| 14 | Raven Kwok | Algorithmic, generative | Computational aesthetics |
| 15 | Ash Thorp | Cinematic UI, HUD design | Dark + holographic |
| 16 | Territory Studio | Film UI, futuristic displays | Dark + data-driven |
| 17 | Takram | Japanese precision, biomorphic | Subtle, organic |
| 18 | Kenya Hara | Eastern minimal, empty-center | White + natural tones |
| 19 | Irma Boom | Book architecture, extreme typography | Bold color blocks |
| 20 | Neo Shen | Contemporary Chinese, cultural remix | Traditional + modern fusion |

Full details: see `huashu-design/references/design-styles.md`

---

## Integration with pi_launchpad Agents

| Agent | How to use this skill |
|-------|----------------------|
| implementer | Apply anti-slop rules and brand protocol when writing UI components |
| frontend-lead | Use design direction fallback when brief is vague |
| reviewer | Use 5-dimension critique rubric for UI diffs |
| ui-reviewer | Use full ban list + quick checklist for frontend review |
| adversarial-tester | Probe: empty state, overflow, missing images, brand inconsistency |
| gate-skeptic | Check: does the UI follow the brand spec? Any AI slop elements? |

---

*Principles extracted from [huashu-design](https://github.com/alchaincyf/huashu-design) by 花叔 (CC BY-NC, personal use free). Design philosophy ideas are not copyrightable — this skill contains principles, not code.*
