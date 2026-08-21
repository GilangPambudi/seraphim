# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SERAPHIM is a phone brand/model search app (Next.js 15, App Router, React 19, Tailwind CSS v4, shadcn/ui). All data is scraped live from the public GitHub repo [KHwang9883/MobileModels](https://github.com/KHwang9883/MobileModels) — markdown files per brand, parsed into models/variants. There is no database; data lives in the browser cache.

## Commands

- `npm run dev` — dev server (turbopack)
- `npm run build` — production build
- `npm start` — serve production build
- `npm run lint` — ESLint (Next.js config)
- No test runner is configured.

## Setup

Requires a GitHub Personal Access Token in `.env.local`:

```
GITHUB_TOKEN=your_token_here
```

Without it, the app renders a configuration-error screen. The token is used only by the `/api/github-proxy` route to call the GitHub API (directory listing); raw file content is fetched unauthenticated.

## Architecture

### Data flow

```
GitHub (KHwang9883/MobileModels)
  → /api/github-proxy (server route, owns GITHUB_TOKEN, proxies API + raw fetches)
    → lib/api-client.ts (browser fetcher hitting the proxy)
      → lib/data-parser.ts (parses brand filenames + markdown → PhoneModel[])
        → lib/cache-manager.ts (singleton: memory + localStorage, 24h TTL)
          → app pages (search/filter/display)
```

### Key modules

- **`app/api/github-proxy/route.ts`** — server-side proxy. `type=directory` calls `GET /contents/brands` (authed); `type=content&path=brands/<file>` fetches raw content (unauthed). Source of the GITHUB_TOKEN requirement and rate-limit/404 error mapping.
- **`lib/api-client.ts`** — the **only** client fetch layer in use (`fetchBrandFiles`, `fetchBrandMarkdown`). Both call the proxy.
- **`lib/github-api.ts`** — **dead code**. A duplicate, earlier implementation of the same two fetch functions that hits GitHub directly (no proxy, no token). Not imported anywhere; do not revive it.
- **`lib/data-parser.ts`** — `parseBrandName` (handles `_cn`/`_en`/`_global_en`/`_all` filename suffixes), `parseMarkdownContent` (series via `##`, models via `**[CODENAME] NAME:**`, variants via `` `MODEL_NUMBER`: NAME ``), `searchModels`.
- **`lib/cache-manager.ts`** — singleton `CacheManager`. Backs memory with localStorage under `seraphim_cache_*` keys. Distinct cache keys: `all_models_global_data` (full dataset), `all_brands_metadata` (brand list only), `brand_<slug>` (per-brand models). `getForSearch()` ignores expiry for instant search. `handleRefreshData` deletes these keys to force a refetch.
- **`app/page.tsx`** — home page. Two-phase load: shows brand list immediately, then fetches all brand markdown in background (`Promise.allSettled`) with a progress row (`Loading models in background: N/total`). Global search over brands + models; model results expand each variant into a row.
- **`app/[brandSlug]/page.tsx`** — brand detail. Uses React `use()` to unwrap the async `params`. Reads `brand_<slug>` cache first; falls back to fetch+parse. Groups models into an Accordion by `series` (`"Other Models"` fallback). Refresh clears only that brand's cache then `window.location.reload()`.
- **`types/phone-models.ts`** — shared types: `PhoneModel` (`mainModelName`, optional `codename`, `variants`, optional `series`), `PhoneVariant` (`modelNumber`, `variantName`), `Brand`, `SearchResult`, `GitHubFile`.
- **`lib/utils.ts`** — `cn()` (clsx + tailwind-merge), standard shadcn helper.

### Theme & styling

- Tailwind v4 with `@theme inline` mapping shadcn semantic tokens (`--background`, `--border`, etc.) to `oklch` values in `app/globals.css`. `--radius: 0.375rem`.
- Dark mode is class-based via `next-themes` (`ThemeProvider` in `app/layout.tsx`, `ThemeToggle` component). `suppressHydrationWarning` on `<html>` is required for next-themes.
- Figtree is the global font, loaded via `next/font/google` into `--font-figtree`.

## Design System

**`DESIGN.md` is the authoritative design spec** and should be followed for any UI work. `example.html` is the visual reference (copy its visual language, not its layout). Key rules:

- OpenCode-inspired: monochrome, compact, technical, border-driven, low decoration.
- **Figtree globally** (UI and technical data alike); 400 body / 500 labels / 600 headings; small uppercase labels.
- Semantic shadcn tokens only — no hardcoded colors. Color only when it has meaning (red=error, green=success, amber=warn, blue=info).
- Dark mode is required (follow system, allow override, persist).
- Radius split by role: `rounded-full` on interactive controls (buttons, inputs, badges), `rounded-2xl` on main panels (search card, list containers, accordion), inner rows stay flat. Typography is one step larger than the compact baseline (text-xs=14px … text-lg=20px, remapped in `@theme`). 1px borders as primary structure, no shadows except floating UI, no hover scaling.
- **Do not use `Card` as a generic wrapper** — prefer flat sections with bordered rows.
- Compact rows/tiles for brand lists; tables for tabular data; quiet status rows (`87 brands · 3,421 models · updated 4m ago`) instead of big colored alerts.
- Progressive loading preferred over blocking skeletons.

The current pages still use the old design (large hero, card grids, hover scaling, colored status alerts) — `DESIGN.md` §24 describes the intended migration to the compact layout, which is the direction of ongoing work.

## Gotchas

- Both `/api/github-proxy` (raw fetch, `master` branch) and the dead `lib/github-api.ts` (`main` branch) hardcode branch names — keep them in sync with the upstream repo's default branch if raw fetches start 404ing.
- `app/loading.tsx` renders `null` on purpose; the real loading UI is the `<LoadingAnimation>` component, driven by page-level state, not route-level Suspense.
- `npm run lint` uses `next lint`, which is deprecated in Next 15 — migration to ESLint CLI may be needed at some point.
- `.env.local` exists locally but is gitignored; `GITHUB_TOKEN` must be re-provided in fresh clones.
