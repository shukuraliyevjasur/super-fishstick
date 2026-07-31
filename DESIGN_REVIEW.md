# replie — Design Review

**Date:** 2026-07-31
**Scope:** Landing page, pricing page, dashboard shell, design token system
**Grade: C+** — structurally sound, visually generic. The problems are systemic (missing scales) rather than cosmetic, which is good news: fixing the token layer fixes most symptoms at once.

---

## Summary

The codebase is disciplined. Semantic tokens are respected almost everywhere — the only raw-color violations are in dead files (`seo-page-shell.tsx`, `template-visual.tsx`) and one stray amber in `campaigns/page.tsx:444`. Accessibility basics are present: focus-visible rings, `aria-current` on nav, `prefers-reduced-motion` honored, real `aria-label`s.

What's missing is **differentiation**. The design system defines colors and nothing else — no type scale, no spacing scale, no radius scale, no elevation scale. Without those, every component improvises, and the result reads as template output rather than a product with a point of view.

---

## P0 — Fix first

### 1. The typeface is the single biggest "generic" tell

`app/globals.css:26`
```css
--font-sans: system-ui, -apple-system, "Segoe UI", sans-serif;
```

System-ui is the default of every unstyled site on the internet. It costs nothing to change and changes everything.

Compounding this: **`font-black` (900) is used on every major heading** — landing h1, all section h2s, pricing figures (12 occurrences). Segoe UI on Windows ships no 900 weight, so the browser synthesizes it by smearing the 700. On the primary market's most common OS, every headline renders slightly muddy.

**Fix:** adopt one real typeface via `next/font`. Inter is the safe default and has full Latin-Ext coverage for Uzbek diacritics. Then drop `font-black` → `font-bold` (700), which real fonts actually ship.

```ts
// app/layout.tsx
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-sans" });
```

### 2. Six radii, no rule

| Class | Count |
|---|---|
| `rounded-lg` | 81 |
| `rounded` (4px) | 51 |
| `rounded-full` | 33 |
| `rounded-xl` | 12 |
| `rounded-md` | 7 |
| `rounded-sm` | 6 |
| `rounded-2xl` | 6 |

Concrete bug this causes: `components/stat-card.tsx:16` uses `rounded` (4px), but the loading skeleton that stands in for it (`app/(dashboard)/dashboard/page.tsx:67`) uses `rounded-lg` (8px). **The corners visibly pop when data loads.**

**Fix:** pick three and enforce. Suggested — `rounded-lg` for cards/panels, `rounded-md` for controls/buttons, `rounded-full` for pills/avatars only. Delete the rest.

### 3. 88% of all text is one of two sizes

216 × `text-sm` + 116 × `text-xs` out of ~380 total type declarations. Then it leaps straight to `text-4xl` for headlines with almost nothing between.

That gap is why the UI feels flat — there's no mid-tier to establish hierarchy inside a card. Everything within a panel is 14px, so nothing leads.

Also present: `text-[9px]` (×3), `text-[10px]` (×5), `text-[11px]` (×3) — three off-scale sizes, and **9px is below the legibility floor** for body text on any display.

**Fix:** define a real scale in `@theme` and delete the arbitrary values. Raise 9px/10px labels to 11px minimum.

---

## P1 — High-value

### 4. Language is half-translated, and it shows in the worst place

```
Campaign     59×      Kampaniya     1×
Campaigns     9×
Campaignni    2×   ← English root + Uzbek accusative suffix
Campaignlarga 2×   ← English root + Uzbek dative plural
Campaignlarni 1×
```

`Campaignlarga` is not a word in either language. The sidebar reads "Bosh sahifa / Statistika / Xabarlar / **Campaigns** / DM Jurnali / Sozlamalar" — one English item in a Uzbek list.

For a product charging Uzbek SMBs 19 000 so'm/oy, half-finished localization directly undercuts the trust the pricing depends on. This is a credibility issue, not a polish issue.

**Fix:** commit to **Kampaniya / Kampaniyalar** everywhere, with correct suffixes (`Kampaniyani`, `Kampaniyalarga`). Single find-and-replace pass across `components/sidebar.tsx`, `components/top-bar.tsx`, and the campaigns routes.

### 5. Six identical stat cards = no entry point

`app/(dashboard)/dashboard/page.tsx:152-159` renders six equal-weight cards at `xl:grid-cols-6`. At 1280px that's ~190px each. "O'tkazib yuborildi" wraps at `text-sm`.

More importantly: all six look the same, so the eye has nowhere to land. Which number is the business? DM Yuborildi and CTR are the ones that matter; Skipped and Failed are diagnostics.

**Fix:** promote 2 primary metrics to a larger card, demote the other 4 to a compact row beneath. Hierarchy, not uniformity.

### 6. `StatCard` ships a `trend` prop nothing uses

`components/stat-card.tsx:10-11` — `trend` and `trendUp` are never passed by any caller. Dead API surface, and the hardcoded English strings `"Up"` / `"Down"` at line 21 would break the Uzbek UI if it were ever wired up.

**Fix:** either wire it to real week-over-week deltas (this is the missing hierarchy from #5) or delete the prop.

### 7. Header and footer change shape between pages

| | Landing (`public-site-header.tsx`) | Pricing (`pricing/page.tsx:51`) |
|---|---|---|
| Header height | `h-16` | `h-14` |
| Container | `max-w-6xl` | `max-w-5xl` |
| Nav | Narxlar + Kirish + Boshlash | Kirish only |

Navigating home → pricing shifts the header 8px and narrows content by 64px. The pricing page also hand-rolls its own footer instead of sharing one.

**Fix:** use `PublicSiteHeader` on the pricing page and extract a shared `PublicSiteFooter`.

### 8. Pricing page is `noindex` but is in the sitemap

`app/pricing/page.tsx:7` sets `robots: { index: false, follow: false }`, while `app/robots.ts:7` explicitly allows `/pricing` and `app/sitemap.ts:7` lists it with priority 0.8.

The page metadata wins — pricing will never be indexed. For a self-serve SaaS the pricing page is usually the second-highest-intent landing surface.

**Fix:** remove the `robots` block from the pricing metadata (assuming the noindex was a leftover from pre-launch).

---

## P2 — Polish

### 9. Empty states are bare sentences

Eight empty states across the dashboard, all shaped like `<p className="text-sm text-muted">Hali faoliyat yo'q</p>` (`dashboard/page.tsx:185,203`).

A new user's first dashboard is almost entirely empty states — that IS the first impression of the product. Each should say what will appear here and link to the action that fills it.

### 10. Landing page uses the recognizable AI-template vocabulary

- `border-accent/20 bg-accent/5` rounded-full eyebrow pill above the h1 (`page.tsx:170`)
- `01 / 02 / 03` numbered steps with eyebrow + title + description (`page.tsx:12-34`)
- 9 features as identical checkmark rows in a uniform 3-col grid (`page.tsx:249-263`)
- Closing CTA repeating the hero's two buttons verbatim, same labels, no new information (`page.tsx:276-291`)

Each is individually fine. All four together is the pattern people recognize.

The `DashboardPreview` mockup (`page.tsx:96-142`) is the strongest asset on the page — real-looking numbers, real chart, the floating `MatchedCommentCard` telling the actual story. It's rendered at the same visual weight as everything else. **Lead with it harder.** Give the feature grid weighting instead of uniformity: the 3 features that sell (follow gate, tracked links, DM logs) deserve real estate; the other 6 can be a plain list.

### 11. Chart has no axis, gridline, or hover

`dashboard/page.tsx:166-177` — bare divs with a count label on top. It reads as decoration rather than data. Add a baseline and a subtle gridline at the midpoint; that alone makes it look measured.

### 12. Only two neutral tones exist

`--color-foreground: #1A1A1A` and `--color-muted: #6B7280`. Every secondary thing in the product — labels, timestamps, placeholder text, disabled states, table headers — is the same grey. There's no third step to separate "supporting" from "de-emphasized", which is the other half of why the UI reads flat.

**Fix:** add `--color-subtle` around `#9AA3AF` for tertiary text.

---

## What's already good

- Token discipline is genuinely strong — near-zero violations in live code
- `aria-current="page"` on active nav, real `aria-label`s on icon buttons
- `prefers-reduced-motion` block present and correct
- Focus rings defined globally with a tighter offset for inputs
- Onboarding checklist that self-hides at completion (`dashboard/page.tsx:108-149`) is a genuinely good pattern
- Loading skeleton exists at all — most projects skip it
- The dashboard preview mockup on the landing page is well-observed and specific

---

## Suggested order

1. Real typeface + drop `font-black` → the largest visual delta for the least work
2. Radius scale: 6 → 3
3. Type scale + kill `text-[9px]`/`[10px]`/`[11px]`
4. Kampaniya translation pass
5. Stat card hierarchy (2 primary + 4 secondary), wire or delete `trend`
6. Shared header/footer, remove pricing `noindex`
7. Empty states with CTAs
8. Landing page: weight the feature grid, differentiate the closing CTA

Items 1–3 are edits to `globals.css` plus mechanical find-and-replace. They'd move this from C+ to solid B on their own.
