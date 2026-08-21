# DESIGN.md

## 1. Direction

Use `example.html` as the main visual reference.

The design language is:

* OpenCode-inspired
* monochrome
* technical
* compact
* utilitarian
* clean
* minimal
* border-driven
* low decoration
* casual-friendly (modern-style)

`modern-style` keeps the OpenCode layout and structure of `opencode-style`, with intentional deviations toward a more casual, friendly feel:

```text
font   → Figtree (global), typography one step larger
radius → rounded-full on controls, rounded-2xl on main panels
space  → generous padding and gaps (roomier than opencode)
```

Do not copy the exact layout of `example.html`. Copy its **visual language**.

Different applications may use different layouts.

---

## 2. Stack

Use:

* Tailwind CSS v4
* shadcn/ui
* Lucide icons
* Figtree
* semantic CSS variables from shadcn

Prefer Tailwind utilities over custom CSS.

Custom CSS is only for:

* theme variables
* font variables
* global browser behavior
* unavoidable third-party overrides

Do not create custom classes when Tailwind already covers the requirement.

---

## 3. Typography

Use **Figtree globally** — for UI text and technical data (model numbers, codenames) alike.

Figtree weights:

```text
400 → body
500 → labels / controls
600 → headings / primary actions
700 → rare emphasis
```

Recommended sizing (one step larger than the compact opencode baseline):

```text
14px → metadata / utility labels
16px → normal UI
18px → section subtext / secondary
20px → section heading
24px → page heading
```

Avoid oversized typography for application interfaces.

Use uppercase + letter spacing mainly for small labels, tabs, and metadata.

---

## 4. Colors

Default brand direction is **black and white**.

In `modern-style`, the base background is a subtle cool gray (`--background: oklch(0.975 0.002 240)` light, `oklch(0.16 0.005 240)` dark) with a matching cool tint on `--border`/`--muted`/`--accent`. Panels and text stay white/black.

Use semantic shadcn tokens:

```text
background
foreground
card
popover
primary
secondary
muted
accent
destructive
border
input
ring
```

Prefer:

```tsx
bg-background
text-foreground
border-border
text-muted-foreground
bg-primary
text-primary-foreground
```

Avoid hardcoded colors inside components.

### Semantic colors

Color is allowed when it has meaning:

```text
red    → destructive / error
green  → success / added
amber  → warning
blue   → information
```

Do not use colors only as decoration.

---

## 5. Dark Mode

Dark mode is required.

Behavior:

1. first visit follows system preference
2. user can override it
3. choice is persisted

For Next.js, prefer `next-themes`.

Dark mode should use intentional semantic tokens, not manually invert every component.

---

## 6. Radius

Use Tailwind radius utilities.

Radius is split by role:

```text
rounded-2xl → main panels / sections: search card, list containers, accordion
rounded-full → interactive controls: buttons, inputs, search, badges, tags
rounded-lg   → floating UI: dialogs, popovers, dropdowns
rounded-md   → compact secondary surfaces
rounded-none → inner rows, tables, divided rows
```

Main panels get `rounded-2xl` for a casual, friendly feel; interactive controls get `rounded-full`; inner rows stay flat so the border-driven structure keeps its precision.

Do **not** apply `rounded-full` to large structural panes (accordion, cards, search section, rows) — `rounded-2xl` is the ceiling for panels, full radius would read as gimmicky.

Keep the global shadcn radius small as the fallback:

```css
--radius: 0.375rem;
```

---

## 7. Borders and Shadows

Borders are the primary structural element.

Default:

```tsx
border border-border
```

Prefer 1px borders.

Use:

```text
border-b
border-r
divide-y
divide-x
```

to separate content.

### Shadows

No shadow by default.

Avoid:

```text
shadow-md
shadow-lg
shadow-xl
```

Subtle shadows are acceptable only for floating UI such as:

* dialogs
* popovers
* dropdowns
* command palettes

---

## 8. Layout Width

Use Tailwind's spacing and width scale first.

For wide application interfaces:

```tsx
mx-auto w-full max-w-screen-2xl
```

Do not force every page to use the same width.

Examples:

```text
workspace/tool → max-w-screen-2xl or full width
search/browse  → max-w-screen-xl / 2xl
reading page   → max-w-3xl
```

Use arbitrary values only when Tailwind's scale does not represent the required layout well.

---

## 9. Layout Modes

There are two main application layouts.

### A. Workspace

For applications such as Klip-Klop.

Desktop:

```text
100dvh
├── header
└── workspace
    ├── main area
    └── controls
```

Recommended shell:

```tsx
<div className="flex h-dvh flex-col overflow-hidden">
  <header className="shrink-0" />

  <main className="min-h-0 flex-1 overflow-hidden">
    ...
  </main>
</div>
```

Use internal scrolling for panels.

Important:

```text
min-h-0
min-w-0
```

must be used where flex/grid children need to shrink.

Do not use arbitrary minimum heights such as:

```text
lg:min-h-[600px]
```

when they can push the application beyond the viewport.

### B. Browse / Content

For applications such as Seraphim.

Use normal vertical page scrolling:

```tsx
<div className="min-h-dvh">
  <header />
  <main />
  <footer />
</div>
```

Do not force `overflow-hidden` on content-heavy pages.

---

## 10. Responsive

Design mobile-first.

Base styles are mobile.

Use responsive modifiers progressively:

```text
sm:
md:
lg:
xl:
2xl:
```

For complex layouts, `lg` is the preferred breakpoint for desktop-style split views.

Desktop:

```text
┌────────────────────┬──────────────┐
│ workspace          │ controls     │
└────────────────────┴──────────────┘
```

Mobile:

```text
┌────────────────────┐
│ workspace          │
├────────────────────┤
│ controls           │
└────────────────────┘
```

Avoid horizontal page scrolling.

Use when necessary:

```text
min-w-0
truncate
break-words
break-all
overflow-x-auto
```

---

## 11. Mobile Interaction

Compact visual design must not create tiny touch targets.

Interactive elements on mobile should generally have an effective target around:

```text
40–44px
```

A small icon may still sit inside:

```tsx
size-10
```

Avoid desktop-sized sidebars on mobile.

Prefer stacking or shadcn `Sheet` / `Drawer`.

---

## 12. Buttons

### Primary

Use monochrome solid:

```text
black → light mode
near-white → dark mode
```

### Secondary

Use outline style.

### Ghost

Use for low-priority actions such as:

* reset
* refresh
* toolbar icons

### Destructive

Use only for genuinely destructive actions.

Avoid:

```text
hover:scale-105
large shadows
bounce animation
large translate effects
```

Preferred interaction:

```text
background change
text change
border change
```

---

## 13. Inputs

Inputs should be compact and precise.

Preferred characteristics:

```text
thin border
full radius (rounded-full)
no shadow
neutral background
visible focus
```

Example:

```tsx
<Input className="h-9 rounded-full shadow-none" />
```

Important fields must have labels.

Do not use placeholders as the only label when accessibility or clarity requires a real label.

---

## 14. Tabs

Tabs should feel integrated into their surrounding panel.

Preferred:

```text
┌────────────┬────────────┐
│ ACTIVE     │ inactive   │
└────────────┴────────────┘
```

Active:

```text
primary background
primary foreground
```

Inactive:

```text
surface
border
muted foreground
```

Pill-style tabs are fine as compact controls, but keep them small and monochrome — do not scale them up into large segmented buttons.

---

## 15. Cards

Do **not** use `Card` as the default container.

Bad:

```text
Card
└── Card
    └── Card
```

Prefer:

```text
Section
├── Header
├── bordered rows
└── actions
```

Use `<Card>` only when the content is truly an independent card.

---

## 16. Data Lists

For directories, search results, models, logs, or structured information, prefer rows.

Example:

```text
Samsung                         312 models   →
Apple                           124 models   →
Google                           72 models   →
```

Instead of large cards with buttons and hover scaling.

For model data:

```text
Galaxy S23 Ultra
Samsung · dm3q
SM-S918B                       Galaxy S23 Ultra
```

Use tables when the data is naturally tabular.

---

## 17. Accordion

Accordion is appropriate for grouped information.

Example:

```text
Galaxy S Series                             42
──────────────────────────────────────────────
Galaxy S24 Ultra
Galaxy S23 Ultra
...
```

Prefer flat sections separated by borders.

Avoid accordion → card → nested card structures.

---

## 18. Status UI

Status information should be quiet.

Preferred:

```text
87 brands · 3,421 models · updated 4m ago     Refresh
```

Instead of large colored alert cards.

Use:

* small status dot
* icon
* muted text
* subtle semantic color

---

## 19. Loading

Prefer progressive loading.

Example:

```text
87 brands · loading models 34/87
```

Do not block the entire interface if useful data is already available.

Skeletons are allowed but should stay subtle and monochrome.

---

## 20. Empty and Error States

Keep states concise.

### Empty

```text
No models found for "SM-S918B"

Try another search.
```

### Error

```text
Unable to load phone data.

GitHub returned an API error.

[ Retry ]
```

Do not turn every empty/error state into a giant illustration.

---

## 21. Icons

Use **Lucide**.

Typical sizes:

```text
14–16px → compact control
16–18px → normal UI
20px    → prominent action
```

Icons should support recognition, not decorate every label.

Use tooltips for icon-only actions when necessary.

---

## 22. Motion

Keep animation subtle.

Typical duration:

```text
150–200ms
```

Preferred:

```tsx
transition-colors
```

Allowed:

* fade
* opacity
* accordion transition
* loading state
* dialog entrance
* route slide transition (see below)

Avoid:

* hover scaling
* decorative bouncing
* long animations
* constant movement

### Route slide transition

Page navigation slides horizontally, driven by the slide-deck in `components/route-transition.tsx`:

* forward (`/` → `/brandSlug`) → slides left-to-right, new page enters from the right
* back (`/brandSlug` → `/`) → slides right-to-left, previous page enters from the left
* duration **300ms** ease-out
* respect `prefers-reduced-motion` — disable the slide (`motion-reduce:transition-none`) and swap instantly
* the header stays anchored; only content slides

---

## 23. shadcn Customization

shadcn components are a foundation, not a visual requirement.

When needed:

1. keep accessibility behavior
2. remove unnecessary shadow
3. reduce radius
4. reduce padding
5. keep semantic tokens
6. simplify hover states

Suggested defaults:

```text
Button    → h-9, rounded-full, shadow-none
Input     → h-9, rounded-full, shadow-none
Textarea  → rounded-full, shadow-none
Badge     → rounded-full
Alert     → rounded-md, shadow-none
Card      → rounded-md, shadow-none
Accordion → rounded-md container, flat divided content
```

---

## 24. Seraphim Direction

Preserve application behavior:

* GitHub data source
* parser
* cache
* global search
* brand search
* background loading
* brand route
* model grouping
* refresh behavior

Visual migration:

```text
IBM Plex Mono
→ Figtree (global)

large centered hero
→ compact application header

large brand cards
→ compact rows / tiles

hover scale + shadow
→ subtle border/background hover

nested cards
→ flat sections

small radius everywhere
→ rounded-full on controls, rounded-2xl on main panels

sharp square boxes
→ rounded panels with breathing room

colorful status alerts
→ quiet status row

oversized typography
→ compact hierarchy
```

Suggested home structure:

```text
┌─────────────────────────────────────────────────────────────┐
│ SERAPHIM                                         theme     │
├─────────────────────────────────────────────────────────────┤
│ Search brands, models, codenames...              Search   │
├─────────────────────────────────────────────────────────────┤
│ 87 brands · 3,421 models · updated 4m ago       Refresh   │
├─────────────────────────────────────────────────────────────┤
│ Samsung                               312 models       →   │
│ Apple                                 124 models       →   │
│ Xiaomi                                487 models       →   │
│ Google                                 72 models       →   │
└─────────────────────────────────────────────────────────────┘
```

---

## 25. Anti-Patterns

Avoid:

```text
Card soup
Large shadows
Hover scaling
rounded-full on structural panes (accordion, cards, rows)
Decorative gradients
Random accent colors
Huge utility-page headings
Nested scroll containers on mobile
Fixed sidebar widths on mobile
Arbitrary min-height causing viewport overflow
overflow-hidden on normal browse pages
Hardcoded colors inside components
Duplicate Tailwind/theme configuration
```

---

## 26. Final Checklist

Before considering UI complete:

* [ ] Figtree is the global font.
* [ ] Tailwind is used for component styling.
* [ ] shadcn primitives are used where appropriate.
* [ ] Semantic theme tokens are used.
* [ ] Light mode works.
* [ ] Dark mode works.
* [ ] Borders are mostly 1px.
* [ ] Interactive controls are rounded-full; main panels are rounded-2xl; inner rows stay flat.
* [ ] Shadows are absent unless necessary.
* [ ] No unnecessary hover scaling.
* [ ] Color is semantic, not decorative.
* [ ] Mobile layout is intentionally restructured.
* [ ] No accidental horizontal scrolling.
* [ ] Workspace apps fit the viewport correctly.
* [ ] Browse apps scroll naturally.
* [ ] `min-h-0` and `min-w-0` are used correctly.
* [ ] Focus states remain visible.
* [ ] Touch targets are usable.
* [ ] `Card` is not used as a generic wrapper.
* [ ] Tailwind scale is preferred over arbitrary values.
* [ ] The result visually belongs to the same family as `example.html`.

---

## 27. Priority

When rules conflict, prioritize:

```text
1. usability
2. clarity
3. responsive correctness
4. accessibility
5. consistency with example.html layout
6. visual polish
```

`example.html` is a **design reference**, not a layout prison. The `modern-style` deviations — Figtree font, `rounded-full` on controls — are intentional and take precedence over strict `example.html` fidelity.