# AGENTS.md — Williamsburg (Lexington Themes)

**Williamsburg** (`@lexington/williamsburg`) is an Astro theme for a **product storefront and content site**: digital goods (`store` collection), **blog**, **help center**, **legal** pages, **membership / affiliate** flows, and **sign-in / sign-up** shells—aimed at SaaS-style marketing and e-commerce presentation rather than a headless API backend.

## Tech stack

| Area | Source of truth |
|------|-----------------|
| **Astro** | `^6.0.0` (`package.json`) |
| **Tailwind CSS** | `^4.1.18` via Vite plugin `@tailwindcss/vite` (`astro.config.mjs`) |
| **MDX** | `@astrojs/mdx` `^5.0.0` |
| **RSS** | `@astrojs/rss` `^4.0.17` (`src/pages/rss.xml.js`) |
| **Sitemap** | `@astrojs/sitemap` `^3.7.1` |
| **Lexington** | `@lexingtonthemes/seo` `^0.1.0` (used in `src/components/fundations/head/Seo.astro`) |
| **Tailwind plugins (CSS)** | `@tailwindcss/forms`, `@tailwindcss/typography`, `tailwind-scrollbar-hide` (`src/styles/global.css`) |

**Markdown:** `astro.config.mjs` enables `drafts: true` and Shiki with theme `css-variables` / `wrap: true`.

**Path alias:** `@/*` → `src/*` (`tsconfig.json`).

## Folder map

| Path | Role |
|------|------|
| `src/pages/` | File-based routes (see Routing below). Includes `src/pages/rss.xml.js` for `/rss.xml`. |
| `src/layouts/` | `BaseLayout`, `BlogLayout`, `StoreLayout`, `HelpcenterLayout`, `LegalLayout`. |
| `src/components/` | Feature UI (`blog/`, `store/`, `global/`, etc.) and **`src/components/fundations/`** (design-system primitives: `head/`, `elements/`, `containers/`, `icons/`, `scripts/`). |
| `src/content/` | Markdown/MDX per collection (`store/`, `posts/`, `helpcenter/`, `legal/`). |
| `src/styles/` | `global.css` — Tailwind entry, `@theme` tokens, code-block CSS variables. |
| `public/` | **Not present in this repo** (add if you need static files at URL root). |

## Content collections (`src/content.config.ts`)

All collections use the `glob` loader; schemas are Zod via `astro/zod`. Use `image()` only where noted—paths must resolve for Astro’s asset pipeline.

### `store`

- **Folder:** `src/content/store/` — `**/*.md`
- **Required fields:** `title`, `category`, `price`, `checkout`, `license`, `description`, `highlights` (string array), `thumbnail` `{ url: image(), alt }`, `tags` (string array)
- **Optional:** `returns`, `shipping`, `images` (array of `{ url: image(), alt? }`), `testimonials` (`name`, `date`, `text`, `img` — **`img` is a plain string in the schema, not `image()`**)
- **Template:** copy from `src/content/store/1.md`

### `helpcenter`

- **Folder:** `src/content/helpcenter/` — `**/*.md`
- **Required:** `title`, `intro`
- **Images:** none in schema
- **Template:** `src/content/helpcenter/1.md`

### `legal`

- **Folder:** `src/content/legal/` — `**/*.md`
- **Required:** `page` (string), `pubDate` (date)
- **Images:** none in schema
- **Template:** `src/content/legal/terms.md`

### `posts` (blog)

- **Folder:** `src/content/posts/` — `**/*.{md,mdx}`
- **Required:** `title`, `pubDate`, `description`, `author`, `image` `{ url: image(), alt }`, `tags` (string array)
- **Template:** `src/content/posts/1.md`

## Routing conventions

| URL pattern | Source |
|-------------|--------|
| `/` | `src/pages/index.astro` |
| `/blog` | `src/pages/blog/index.astro` |
| `/blog/posts/[...slug]` | `posts` collection; **slug param = each entry’s `id`** from `getCollection('posts')` |
| `/blog/tags`, `/blog/tags/[tag]` | Tag listing and filter |
| `/all-products`, `/store/checkout` | Store listing / checkout page |
| `/store/products/[...slug]` | `store` collection; **slug = entry `id`** |
| `/store/tags`, `/store/tags/[tag]` | Store tags |
| `/helpcenter`, `/helpcenter/[...slug]` | `helpcenter` collection; slug = entry `id` |
| `/legal/[...slug]` | `legal` collection; slug = entry `id` |
| `/membership`, `/affiliates`, `/contact`, `/sign-in`, `/sign-up` | Static marketing/auth-style pages |
| `/system/overview`, `colors`, `typography`, `buttons`, `links` | In-theme design system / reference pages |
| `/404` | `src/pages/404.astro` |
| `/rss.xml` | `src/pages/rss.xml.js` — uses `@astrojs/rss` and `pagesGlobToRssItems(import.meta.glob('./blog/*.{md,mdx}'))` (no such files under `src/pages/blog/` today; **not wired to `posts` collection**). |

**In-repo changelog collection:** not present — product changelog link is external (README).

## Customization guide

- **Site URL / canonical domain:** `site: 'https://yourdomain.com'` in `astro.config.mjs` (sitemap, RSS `context.site`, etc.). Align placeholders in `src/components/fundations/head/Seo.astro` with your real URLs/handles.
- **Brand colors & typography:** `src/styles/global.css` — `@theme { --font-sans`, `--font-serif`, `--color-accent-*`, `--color-base-* }`; `:root` Shiki / code colors.
- **Global chrome:** `src/components/global/Navigation.astro`, `Footer.astro`; shell in `src/layouts/BaseLayout.astro` (`hideNav` / `hideFooter` props).
- **Document head:** `src/components/fundations/head/BaseHead.astro` (includes `Seo`, `Meta`, `Fonts`, `Favicons`, plus `FuseJS`, `TabsScript`, `KeenSlider`).

## Commands

From README:

| Command | Action |
|---------|--------|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server |
| `npm run build` | Production build → `./dist/` |
| `npm run preview` | Preview production build |
| `npm run astro ...` | Astro CLI |
| `npm run astro --help` | Astro CLI help |

**Requirements:** Node.js 18 or 20 (LTS), npm.

## Guardrails

- **Do not rename** `src/components/fundations/` — the spelling `fundations` is intentional and referenced throughout imports.
- **Content schemas:** changing Zod fields in `src/content.config.ts` requires updating every layout/page that reads `entry.data` (e.g. `StoreLayout`, `BlogLayout`, `HelpcenterLayout`, `LegalLayout`, tag pages, entries).
- **Minimal diffs:** follow existing patterns (`@/` imports, `Wrapper` + `Text` + `Button` composition).
- **Images:** for fields using `image()`, keep valid resolvable paths; do not break `getImage` / `Image` usage in layouts without updating those components.

## Lexington links (from README)

- Theme: https://lexingtonthemes.com/templates/williamsburg  
- Documentation: https://lexingtonthemes.com/documentation  
- Changelog: https://lexingtonthemes.com/changelog/williamsburg  
- Support: https://lexingtonthemes.com/legal/support/  
- Bundle: https://lexingtonthemes.com  

Publisher: https://lexingtonthemes.com/
