# Depthly — Style System Reference

Reference document describing the styling system as it actually exists in the codebase today. This is a snapshot for onboarding/auditing purposes — it is not a spec to build toward, and nothing here should be inferred as "intended future state" unless explicitly noted under Inconsistencies.

Source files read: `src/styles/globals.css`, `tailwind.config.ts`, and a sample of ~25 files across `src/components/{ui,layout,timer,projects,tasks,landing}`.

---

## 1. Design tokens

Everything lives in `src/styles/globals.css`, inside a single `@layer base` block. There are **two separate, coexisting token systems**.

### 1a. shadcn/ui tokens (HSL triplets, no `hsl()` wrapper)

Defined identically on both `:root` and `.dark` — the app is dark-mode-only, so `.dark` is a byte-for-byte duplicate kept only so shadcn's `dark:` variant machinery doesn't break if ever toggled.

| Variable | Value | Used for |
|---|---|---|
| `--background` | `240 4% 5%` | Page background (shadcn scope) |
| `--foreground` | `240 11% 92%` | Default text (shadcn scope) |
| `--card` | `240 5% 8%` | Card/panel background |
| `--card-foreground` | `240 11% 92%` | Text on cards |
| `--popover` | `240 5% 8%` | Popover/dropdown background |
| `--popover-foreground` | `240 11% 92%` | Text in popovers |
| `--primary` | `213 100% 65%` | Primary actions/buttons (≈ `#4B9EFF`) |
| `--primary-foreground` | `0 0% 100%` | Text on primary |
| `--secondary` | `240 4% 13%` | Secondary buttons/surfaces |
| `--secondary-foreground` | `240 11% 92%` | Text on secondary |
| `--muted` | `240 4% 13%` | Muted backgrounds |
| `--muted-foreground` | `240 5% 49%` | Muted text |
| `--accent` | `240 4% 13%` | Hover/accent backgrounds |
| `--accent-foreground` | `240 11% 92%` | Text on accent |
| `--destructive` | `0 68% 65%` | Destructive actions (≈ `#E07878`) |
| `--destructive-foreground` | `0 0% 100%` | Text on destructive |
| `--border` | `240 4% 18%` | Default borders |
| `--input` | `240 4% 18%` | Input borders |
| `--ring` | `213 100% 65%` | Focus rings |
| `--radius` | `0.625rem` | Base radius shadcn scales derive from |

These are consumed in `tailwind.config.ts` via `hsl(var(--x))` and surfaced as Tailwind utilities: `bg-background`, `text-foreground`, `bg-card`, `bg-primary`, `border-border`, etc. This is the token set shadcn/ui primitives (`Button`, `Card`, `Badge`, `Dialog`, `Tabs`, `dropdown-menu`, `select`, `sheet`, `switch`, `tooltip`, `separator`) are built on.

### 1b. Legacy Depthly hex tokens

A second, independent block, `--color-*`, in hex/rgba format:

| Variable | Value | Used for |
|---|---|---|
| `--color-brand` | `#4B9EFF` | CTAs, active states, links |
| `--color-brand-hover` | `#6BAFFF` | Brand hover state |
| `--color-brand-subtle` | `rgba(75, 158, 255, 0.12)` | Subtle brand backgrounds (active nav row, etc.) |
| `--color-surface-base` | `#0D0D10` | App background |
| `--color-surface-raised` | `#141417` | Cards, panels, modals |
| `--color-surface-overlay` | `#222228` | Hover states, nested panels |
| `--color-border` | `#2E2E38` | Dividers, input borders |
| `--color-border-subtle` | `rgba(255, 255, 255, 0.04)` | Faint inset borders |
| `--color-text` | `#E8E6F0` | Headline/body text |
| `--color-text-muted` | `#7A7890` | Captions, timestamps |
| `--color-text-faint` | `#3D3B4E` | Placeholders, disabled |
| `--color-streak` | `#C8FF64` | Streak display only |
| `--color-success` | `#3DD68C` | Success feedback |
| `--color-warning` | `#F5A623` | Warning feedback |
| `--color-error` | `#F25C5C` | Error feedback |
| `--color-info` | `#4B9EFF` | Info feedback (same as brand) |

These map to Tailwind color groups in `tailwind.config.ts`: `surface.{base,raised,overlay}`, `text.{DEFAULT,muted,faint}`, `feedback.{success,warning,error,info}` — plus flat aliases `depth-bg`, `depth-surface`, `depth-raised`, `depth-border`, `brand`, `streak`, `ink-primary`, `ink-secondary`, `ink-muted` which hardcode the same hex values a second time directly in the Tailwind config (not wired to the CSS variables at all).

### How the two systems relate

They are **parallel, not layered** — same visual palette expressed twice, with no single source of truth:

- Both target the same design (`#0D0D10` background / `#4B9EFF` brand / `#E8E6F0` text), and the values line up almost exactly (e.g. `--background: 240 4% 5%` ≈ `--color-surface-base: #0D0D10`).
- shadcn tokens back the imported/customized shadcn primitives (`Button`, `Card`, `Badge`, `Dialog`, etc.) via `bg-primary`, `text-muted-foreground`, `border-border`.
- Legacy hex tokens back hand-built Depthly components (`Input`, `Spinner`, `StreakBadge`, `ProgressRing`, `Sidebar`, `Topbar`, etc.) via Tailwind classes like `bg-surface-overlay`, `text-text-muted`, or direct `var(--color-brand)` in inline styles.
- The Tailwind config also defines a **third** flat copy of the brand palette (`depth-bg`, `ink-primary`, etc.) as literal hex strings, so `bg-depth-raised` and `bg-surface-overlay` currently resolve to the same color via two independent definitions.
- There is no automatic sync between the three: if the brand blue ever changes, it must be edited in `--primary` (HSL), `--color-brand` (hex), and the `depth-*`/`brand`/`ink-*` hex literals in `tailwind.config.ts` — three places, three formats.

---

## 2. Tailwind config (`tailwind.config.ts`)

```ts
darkMode: ['class'],
content: ['./index.html', './src/**/*.{ts,tsx}'],
```

**Colors** — see §1 above for the two systems; both are registered under `theme.extend.colors`.

**Border radius:**
```ts
borderRadius: {
  lg:  'var(--radius)',            // 0.625rem = 10px
  md:  'calc(var(--radius) - 2px)', // 8px
  sm:  'calc(var(--radius) - 4px)', // 6px
  xl:  '1.25rem',                   // 20px, not derived from --radius
  '2xl': '1.5rem',                  // 24px, not derived from --radius
}
```
`sm`/`md`/`lg` scale off the `--radius` CSS variable; `xl`/`2xl` are separate fixed rem values with no variable backing.

**Font families:**
```ts
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}
```

**Box shadows:**
```ts
boxShadow: {
  card:  '0 2px 8px -2px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.04) inset',
  modal: '0 24px 64px -16px rgba(0,0,0,0.6)',
  glow:  '0 0 24px -4px #4B9EFF',
}
```

**Animations + keyframes:**
```ts
animation: {
  'timer-pulse':  'timer-pulse 2s ease-in-out infinite',
  'streak-pop':   'streak-pop 0.3s cubic-bezier(.34,1.56,.64,1)',
  'ring-breathe': 'ring-breathe 3s ease-in-out infinite',
}
keyframes: {
  'timer-pulse':  { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
  'streak-pop':   { '0%': { transform: 'scale(0.8)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
  'ring-breathe': { '0%, 100%': { transform: 'scale(1)', opacity: '1' }, '50%': { transform: 'scale(1.04)', opacity: '0.8' } },
}
```

Plugin: `tailwindcss-animate` (backs shadcn's `data-[state=open]:animate-in` etc. utilities used in `dialog.tsx`, `sheet.tsx`, `dropdown-menu.tsx`).

---

## 3. Color usage patterns

Three distinct patterns coexist. A repo-wide scan for hex literals (`#[0-9A-Fa-f]{6}`) inside `src/components` found **503 occurrences across 46 of ~70 component files** — hardcoded hex is not the exception, it's the majority pattern in hand-built (non-shadcn) components.

**Pattern A — Tailwind utility classes** (token-driven, mostly in shadcn-derived `ui/` primitives and some newer components):
```tsx
// src/components/ui/button.tsx
"bg-primary text-primary-foreground hover:bg-primary/90"

// src/components/ui/StreakBadge.tsx
'bg-streak/10 text-streak'

// src/components/projects/ProjectCard.tsx
className="text-ink-secondary" // alongside inline styles in the same file
```

**Pattern B — inline `style` referencing a CSS variable** (rarer; mostly in shared/reusable pieces):
```tsx
// src/components/ui/ProgressRing.tsx
color = 'var(--color-brand)'

// src/components/timer/TimerDisplay.tsx
color: 'var(--color-text)'
color: 'var(--color-text-muted)'
```

**Pattern C — inline `style` with hardcoded hex** (dominant pattern; used throughout layout, analytics, tasks, timer, landing):
```tsx
// src/components/layout/Sidebar.tsx
background: '#141417',
borderRight: '1px solid #2E2E38',
color: '#7A7890',

// src/components/layout/Topbar.tsx
<Flame size={14} style={{ color: '#C8FF64', flexShrink: 0 }} />

// src/components/tasks/KanbanCard.tsx
border: showHover ? '1px solid rgba(75, 158, 255, 0.3)' : '1px solid #2E2E38',
```

**Flagged hardcoded-hex findings:**
- `src/components/layout/Sidebar.tsx` and `src/components/layout/Topbar.tsx` — both entirely hand-styled with inline hex; zero use of the Tailwind token classes (`bg-depth-surface`, `text-ink-secondary`, etc.) that exist specifically to cover this.
- `src/components/layout/Topbar.tsx:74-76` — renders the streak flame icon/count using `#C8FF64` directly in an inline style. CLAUDE.md's design-system rule states the streak color must **never** be used outside `StreakBadge.tsx`; this is a direct violation of that rule found in the audited sample.
- `src/lib/utils/tasks.ts` (`PRIORITY_CONFIG`, `STATUS_CONFIG`) — priority/status colors (`#7A7890`, `#4B9EFF`, `#F5A623`, `#F25C5C`, `#3DD68C`) are hardcoded hex constants consumed by `PriorityBadge.tsx` via inline `style`, bypassing both token systems entirely even though matching `feedback-*` and `text-*` Tailwind tokens already exist.
- `src/components/projects/ProjectCard.tsx` — mixes Tailwind token classes (`text-ink-primary`, `text-ink-secondary`) with inline hardcoded hex (`#141417`, `#2E2E38`, `#7A7890`) for conceptually identical properties (surface/border/text colors) within the same component.

---

## 4. Typography

- **Inter** — the default UI sans-serif, set globally on `body` in `globals.css` (`font-family: 'Inter', system-ui, sans-serif`) and registered as `fontFamily.sans` in Tailwind. Used for all standard UI text (labels, nav, buttons, headings).
- **JetBrains Mono** — registered as `fontFamily.mono`, but in practice components don't reach for the `font-mono` Tailwind utility; they use the dedicated `.font-data` class instead (see below).
- **`.font-data` utility** (defined directly in `globals.css`, not via Tailwind):
  ```css
  .font-data {
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.02em;
  }
  ```
  Applied per CLAUDE.md's rule ("all data/numbers/times use `font-data`"), and the sampled files follow it consistently: `TimerDisplay.tsx` (countdown text), `Topbar.tsx` (streak/focus/session stat numbers), `ProjectCard.tsx` (total focus hours), `KanbanCard.tsx` (pomodoro count, session time).
- **Numeric values found *without* `.font-data`:** `Sidebar.tsx`'s plan label and display name are plain text (correct — not numeric data), but `Topbar.tsx`'s dropdown plan badge (`{planLabel}`, a text string) and `ProjectCard.tsx`'s `({pct}%)` completion percentage (`src/components/projects/ProjectCard.tsx:131`) render as plain `<span>` text without `.font-data`, despite being a numeric stat — a minor inconsistency against the stated rule.
- **Letter-spacing conventions:**
  - `h1`: `-0.04em`, `h2`: `-0.03em`, `h3`: `-0.01em` (globals.css, all weight 500)
  - `.font-data`: `+0.02em` (mono figures read better slightly loosened)
  - Uppercase eyebrow/label text uses wider tracking, e.g. `letterSpacing: '0.14em'` in `landing/primitives.tsx`'s `Eyebrow`, and `0.15em` uppercase session-type label in `TimerDisplay.tsx`.
- **Font-weight patterns:** headings and emphasized UI text sit at 500 (not 600/700) per the CLAUDE.md rule ("UI text: Inter, weight 500"); numeric displays (timer countdown, focus stat) bump to 600 for visual weight, e.g. `TimerDisplay.tsx`'s countdown (`fontWeight: 600`) vs. its "FOCUS/BREAK" label (`fontWeight: 500`). Badges/pills often go semibold (`font-semibold` in `badge.tsx`, `fontWeight: 600` for the plan pill in `Topbar.tsx`).

---

## 5. Radius scale

Tailwind's registered scale (`tailwind.config.ts`): `sm` = 6px, `md` = 8px, `lg` = 10px, `xl` = 20px, `2xl` = 24px, plus Tailwind's built-in `rounded-full`.

Actual usage is split between this scale (mostly in shadcn-derived components, via `rounded-md`/`rounded-lg`/`rounded-full` classes — 69 occurrences across 31 files) and **raw pixel values passed to inline `borderRadius`** in hand-built components (over 100 occurrences across 40+ files). The inline values loosely track the scale but frequently miss it:

- Values matching the scale: `6`, `8`, `10` (as px, matching `sm`/`md`/`lg`) — e.g. `Sidebar.tsx` (`6`, `8`), `KanbanCard.tsx` (`10`, `6`).
- Values *not* on the scale at all: `12` (`ProjectCard.tsx`, `UpgradeModal.tsx`, settings section cards), `14` (extremely common — nearly every analytics view: `DailyView`, `WeeklyView`, `MonthlyView`, `YearlyView`, `OverviewView`, plus `ExportPanel`, `KanbanColumn`, landing mockups), `4` (`ExportPanel.tsx`), `3` (`TimerSettings.tsx` slider thumb).
- Pill/circular shapes use `999`/`9999` as a "fully round" magic number (`ProjectCard.tsx`, `WeeklyView.tsx`, `UserProfileModal.tsx`, `LeaderboardRow.tsx`, `TimerMockup.tsx`) rather than Tailwind's `rounded-full` (`border-radius: 9999px`), even though the visual result is identical.

Net effect: `14px` has become a de-facto fifth radius step used consistently across analytics/card-heavy UI, but it exists only as a repeated magic number, not as a token — it isn't in `tailwind.config.ts` at all.

---

## 6. Scroll and layout patterns

**Root shell** (`src/components/layout/AppLayout.tsx`):
```tsx
<div className="flex h-dvh overflow-hidden" style={{ background: 'var(--color-surface-base)' }}>
  <Sidebar />
  <div className={cn('flex flex-1 flex-col overflow-hidden ...', sidebarOpen ? 'md:ml-60' : 'md:ml-16')}>
    <Topbar />
    <main ref={mainRef} className="flex-1 overflow-y-auto p-3 sm:p-6">
      <Outlet />
    </main>
  </div>
</div>
```
- Full-viewport (`h-dvh`) flex row; both the outer shell and the content column are `overflow-hidden` — only `<main>` scrolls (`overflow-y-auto`), which is the single scrollable region for all routed pages.
- `Sidebar` is `fixed` and offset via `md:ml-60`/`md:ml-16` margin on the content column rather than normal flex flow, so it can overlay on mobile (`translate-x-0` / `-translate-x-full md:translate-x-0`) without affecting layout width.
- On route change, `mainRef.current?.scrollTo({ top: 0, behavior: 'instant' })` resets scroll position (`useEffect` keyed on `pathname`) since `<main>` persists across route transitions.
- Responsive padding on `<main>`: `p-3 sm:p-6`.

**Global custom scrollbar** (`globals.css`, applies to `*` — every scrollable element inherits it, including `<main>` and nested panels like the timer's notes/todo side panels):
```css
* {
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}
*::-webkit-scrollbar { width: 10px; height: 10px; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-thumb { background-color: var(--color-border); border-radius: 8px; }
*::-webkit-scrollbar-thumb:hover { background-color: var(--color-text-faint); }
```

**Other global layout/reset rules in `globals.css`:**
- `html`: `scroll-behavior: smooth`, `overflow-x: hidden` (prevents horizontal scroll app-wide).
- `body`: `overflow-x: hidden`, `min-height: 100dvh`, antialiased font smoothing.
- `* { box-sizing: border-box }`.
- `:focus-visible`: `outline: 2px solid #4B9EFF` (hardcoded hex, not `var(--color-brand)`) with `2px` offset and `4px` radius — this is a global focus ring applied everywhere, independent of shadcn's `ring-*` utility classes used inside individual components.

**Sidebar/Topbar-specific conventions:**
- `Sidebar.tsx` is a `fixed` `<aside>` that animates `width` (240px ↔ 60px) and `transform` on collapse/expand (`transition: width 200ms ease, transform 200ms ease`), entirely via inline styles — no Tailwind width/transition utilities.
- `Topbar.tsx` mixes Tailwind classes for structure/tokens (`flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface-raised px-4 sm:px-6`) with inline styles for the stat row and dropdown content — the one component in the sample that blends both approaches most visibly in a single file.

---

## 7. Component styling conventions (shadcn customization)

shadcn primitives under `src/components/ui/` follow the standard shadcn pattern: a `cva()` variant map plus a `className` merge via `cn()`, with Radix `data-state` attributes driving conditional styling instead of JS conditionals.

```tsx
// src/components/ui/tabs.tsx — TabsTrigger
"data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
```

```tsx
// src/components/ui/dialog.tsx — DialogOverlay / DialogContent
"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
```

Depthly adds "legacy aliases" onto shadcn's variant maps rather than introducing parallel components — e.g. `button.tsx`'s `buttonVariants` includes shadcn's stock `default | destructive | outline | secondary | ghost | link` plus two Depthly-named aliases, `primary` (identical to `default`) and `danger` (a distinct soft/outlined destructive treatment), matching the `primary`/`ghost`/`danger` vocabulary CLAUDE.md specifies:
```tsx
primary: "bg-primary text-primary-foreground hover:bg-primary/90",
danger:  "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20",
```

Non-shadcn Depthly components (`Badge` consumers like `PriorityBadge`) override shadcn's `outline` variant by passing a `style` prop straight through `cn(badgeVariants({variant}), className)`, layering per-instance inline colors on top of a shadcn variant class:
```tsx
// src/components/ui/PriorityBadge.tsx
<Badge variant="outline" style={{ backgroundColor: `${color}26`, color, borderColor: `${color}66` }}>
```

There are two `cn()` implementations, functionally identical (`clsx` + `twMerge`), living at `src/lib/utils.ts` (imported as `@/lib/utils`, used by shadcn-derived `ui/` primitives) and `src/lib/utils/cn.ts` (imported as `@/lib/utils/cn`, used by hand-built Depthly components like `Input`, `Spinner`, `StreakBadge`). Functionally redundant — see §8.

---

## 8. Inconsistencies and drift

- **Duplicate `cn()` utility.** `src/lib/utils.ts` and `src/lib/utils/cn.ts` are byte-identical in behavior (`twMerge(clsx(inputs))`). shadcn-derived `ui/` files import the former, hand-built Depthly components import the latter. No functional difference, but it's two modules to keep in sync and a source of import-path confusion.
- **Three parallel color definitions for one palette.** The same brand palette exists as (1) shadcn HSL variables, (2) legacy `--color-*` hex variables, and (3) a third set of hardcoded hex literals directly in `tailwind.config.ts` (`depth-bg`, `brand`, `ink-primary`, etc., not wired to any CSS variable). A palette change requires touching three places in three formats.
- **Streak-color rule violated in the sampled code.** CLAUDE.md is explicit: "Never use the streak color (#C8FF64) outside of `StreakBadge.tsx`." `Topbar.tsx` renders the streak stat using `#C8FF64` directly (line ~74), outside `StreakBadge.tsx`.
- **Hardcoded hex is the majority pattern, not the exception.** 503 hex-literal occurrences across 46 of ~70 component files, despite a full token system (CSS variables + Tailwind color classes) existing to cover nearly all of these values. `Sidebar.tsx` and `Topbar.tsx` in particular use zero token-backed Tailwind color classes for their custom-styled elements.
- **Mixed Tailwind-classes vs. inline-style for the same property within a single file.** `ProjectCard.tsx` uses `text-ink-primary`/`text-ink-secondary` (Tailwind token classes) in some spans and raw hex (`#141417`, `#2E2E38`, `#7A7890`) in inline styles elsewhere in the same component, for the same category of property (surface/border/text color).
- **Radius scale not actually followed.** Tailwind defines `sm/md/lg/xl/2xl` = `6/8/10/20/24`px, but inline `borderRadius` values across components regularly use `12`, `14`, `4`, and `3` — none of which exist in the scale. `14` in particular recurs dozens of times (nearly every analytics view, several modals) as a de-facto unlisted radius step.
- **"Fully round" expressed three different ways.** `rounded-full` (Tailwind), `borderRadius: 999`, and `borderRadius: 9999` all appear across the sampled files for the identical visual result (pill/circle shapes), with no consistent choice.
- **Config-level colors not derived from `--radius`.** `xl` (20px) and `2xl` (24px) in the radius scale are hardcoded rem values, unlike `sm`/`md`/`lg` which derive from the `--radius` CSS variable via `calc()` — so changing `--radius` only partially rescales the app.
- **Global `:focus-visible` outline color is hardcoded hex** (`#4B9EFF` in `globals.css`) rather than `var(--color-brand)`, even though that variable is defined two rules above it in the same file.
- **Priority/status color config bypasses both token systems.** `src/lib/utils/tasks.ts`'s `PRIORITY_CONFIG`/`STATUS_CONFIG` hardcode hex values that duplicate existing `feedback-*`/`text-*` tokens, and are consumed via inline `style` in `PriorityBadge.tsx` rather than Tailwind classes.
- **Numeric stat not wrapped in `.font-data`.** `ProjectCard.tsx`'s task-completion percentage (`({pct}%)`) and `Topbar.tsx`'s plan-badge text render as plain text; per CLAUDE.md's typography rule, numeric/stat values should use `.font-data` — the percentage figure is a minor miss (the plan badge is a text label, not numeric data, so arguably correct as-is).
