---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics.
license: Complete terms in LICENSE.txt
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

## Context-Aware Layout Patterns

**IMPORTANT**: Select layout patterns based on the page's PURPOSE, not arbitrary versioning. Match structure to user needs.

### 1. Cornell Notes Layout (25% insight + 75% data)
**Best for:** Analytical dashboards, performance tracking, risk analysis
**User needs:** "What does this data mean? What should I do?"
**Pattern:**
- 25% sticky left column with AI-powered contextual insights
- 75% right column with charts, tables, or metrics
- Insights remain visible while scrolling through data
**Use when:** Users need to understand implications and make decisions based on data
**Examples:** Analytics page, Risk dashboard, Fund performance, Portfolio analysis

### 2. Full-Width Data Table
**Best for:** Operational tables, document management, transaction logs
**User needs:** "Show me all the data, let me filter/search efficiently"
**Pattern:**
- Minimal header with key stats
- Full-width table with sorting, filtering, pagination
- No sticky insights - focus on data density and operations
**Use when:** Primary task is finding, viewing, or managing records
**Examples:** Document library, Transaction history, User management

### 3. Centered Hero + CTAs
**Best for:** Action pages, onboarding, upload flows
**User needs:** "Help me complete this specific task"
**Pattern:**
- Centered content with clear hierarchy
- Prominent call-to-action buttons
- Step-by-step guidance or instructions
**Use when:** Guiding users through a specific workflow or action
**Examples:** Upload page, Settings, Onboarding wizard

### 4. Grid Dashboard
**Best for:** Overview pages, monitoring, executive summaries
**User needs:** "Give me the high-level picture at a glance"
**Pattern:**
- Multiple cards in responsive grid
- Real-time metrics and status indicators
- Quick-scan visual hierarchy
**Use when:** Users need to monitor multiple metrics simultaneously
**Examples:** Executive dashboard, System status, Overview pages

### 5. Sidebar Detail View
**Best for:** Single-entity deep dives, detailed records
**User needs:** "Show me everything about this one thing"
**Pattern:**
- Left navigation or sidebar
- Detailed content area with tabs or sections
- Related items and actions
**Use when:** Users are focused on understanding one specific entity
**Examples:** Company detail page, Fund detail, User profile

**Default approach when uncertain:** If the page involves data analysis and decision-making, use Cornell Notes layout. Otherwise, choose the pattern that best matches the primary user task.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font. **If the Zetafonts library is available** (`~/.agents/assets/fonts/zetafonts/` — 85 premium families, 1,060 woff2 files), prefer it over Google Fonts. See the `font-library` skill for the full catalog with recommended pairings by context (SaaS → Codec Pro, luxury → Arsenica, editorial → Blacker, etc.).
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

## AI Tells — Banned Patterns

These are the specific patterns that make AI-generated UIs instantly recognizable as machine-made. Avoid all of them unless the user explicitly requests one.

### Visual & CSS
- **No neon/outer glows** — No default `box-shadow` glows or auto-glows. Use inner borders or subtle tinted shadows instead.
- **No pure black** — Never use `#000000`. Use off-black (`#0a0a0a`), Zinc-950, or charcoal.
- **No oversaturated accents** — Keep saturation below 80%. Desaturate accents to blend with neutrals.
- **No excessive gradient text** — Do not use text-fill gradients on large headers.
- **No purple/blue "AI aesthetic"** — The neon purple gradient glow is the #1 AI design fingerprint. Banned. Use neutral bases with high-contrast singular accents.
- **Max 1 accent color** — Pick one. Remove the rest. Consistency beats variety.

### Typography
- **No Inter font** — It's the default AI font. Use `Geist`, `Outfit`, `Cabinet Grotesk`, `Satoshi`, or something with character.
- **No oversized screaming H1s** — Control hierarchy with weight and color, not just massive scale.
- **Serif constraints** — Use serif fonts only for editorial/creative contexts. Never in dashboards or software UIs.

### Layout
- **No 3-column equal card layouts** — The generic "3 equal cards horizontally" feature row is the most common AI layout. Use 2-column zig-zag, asymmetric grid, horizontal scroll, or masonry instead.
- **No centered hero when variance is desired** — Force split-screen, left-aligned, or asymmetric whitespace structures.
- **No `h-screen`** — Always use `min-h-[100dvh]` to prevent iOS Safari viewport jumping.
- **Grid over flex-math** — Never use `w-[calc(33%-1rem)]`. Use CSS Grid.

### Content & Placeholder Data
- **No generic names** — "John Doe", "Sarah Chan", "Jane Smith" are banned. Use creative, realistic-sounding names.
- **No fake round numbers** — `99.99%`, `50%`, `$100.00` are banned. Use organic data: `47.2%`, `$99.00`, `+1 (312) 847-1928`.
- **No startup slop names** — "Acme", "Nexus", "SmartFlow" are banned. Invent premium, contextual brand names.
- **No AI copywriting clichés** — "Elevate", "Seamless", "Unleash", "Next-Gen", "Game-changer", "Delve", "Tapestry" are all banned. Write plain, specific language.
- **No Lorem Ipsum** — Write real draft copy, always.
- **No broken Unsplash links** — Use `https://picsum.photos/seed/{context}/800/600` or SVG avatars.

### Components
- **No generic avatars** — No standard SVG "egg" icons. Use creative photo placeholders or distinctive styling.
- **No default shadcn/ui** — If using shadcn, customize radii, colors, and shadows to match the project aesthetic.
- **No generic card overuse** — Use cards only when elevation communicates hierarchy. For high-density layouts, use `border-t`, `divide-y`, or negative space instead.
- **No emojis** — Replace with high-quality icons (Phosphor, Radix) or clean SVG primitives.

### Interactive States (Often Forgotten)
- **Loading:** Skeletal loaders matching layout sizes, not generic circular spinners.
- **Empty states:** Composed compositions indicating how to populate data.
- **Error states:** Clear, inline error reporting. No `window.alert()`. No "Oops!".
- **Active/pressed feedback:** Subtle `scale(0.98)` or `translateY(1px)` on press.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.
