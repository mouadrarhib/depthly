# Footer & Legal Pages

Phase 12 launch work: the landing footer's Product/Company/Legal links
were previously static text with no real destinations (Changelog and
About were `#`, Terms and Privacy were `#`, Contact wasn't a mailto).
This closed that out — Features/Pricing now smooth-scroll, Contact opens
a real mail client, and Terms/Privacy are standalone pages with the full
policy content.

---

## File map

```
src/components/legal/
  LegalLayout.tsx          Shared standalone layout for /terms and /privacy
src/pages/
  TermsPage.tsx            Terms of Service — 28 numbered sections + TOC
  PrivacyPage.tsx          Privacy Policy — 15 numbered sections + TOC
src/components/landing/
  LandingFooter.tsx         Product/Company/Legal columns, section-scroll +
                            mailto + route links
src/pages/LandingPage.tsx   Owns the cross-page scroll-to-section effect
src/routes/paths.ts         PATHS.terms = '/terms', PATHS.privacy = '/privacy'
src/routes/index.tsx        Both registered as public top-level routes
```

---

## Footer (`LandingFooter.tsx`)

Three columns, each entry typed as one of three link kinds so the render
loop can branch cleanly:

```ts
type FooterLink =
  | { label: string; kind: 'section'; sectionId: string }  // Features, Pricing
  | { label: string; kind: 'route'; to: string }            // Terms, Privacy
  | { label: string; kind: 'mailto'; email: string }        // Contact
```

- **Product** — Features (`#features`), Pricing (`#pricing`). Changelog was
  removed (no page for it yet); column is 2 items, no leftover gap.
- **Company** — Contact only, `mailto:contact@getdepthly.com`. About was
  removed for the same reason as Changelog.
- **Legal** — Terms → `PATHS.terms`, Privacy → `PATHS.privacy`, real
  `<Link>` routes (client-side nav, no full reload).

**Section-scroll behavior** (`handleSectionClick`): the anchor's default
jump is prevented, then:
- Already on `/` → `document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })`.
- On any other route → `navigate(PATHS.home, { state: { scrollTo: id } })`.
  `LandingPage.tsx` has a matching effect that reads `location.state.scrollTo`
  once mounted, scrolls to that section, then clears the state via
  `navigate(location.pathname, { replace: true, state: null })` so
  back/forward doesn't re-trigger it.

`CONTACT_EMAIL` is a plain constant at the top of the file — swap it there
if `contact@getdepthly.com` isn't the final inbox.

---

## `LegalLayout.tsx`

Minimal standalone shell for `/terms` and `/privacy` — deliberately **not**
`AppLayout` (no sidebar/topbar) since these are public, unauthenticated
pages. Structure: sticky-free header with the `Logo` (links back to
`PATHS.home`) → page `<h1>` → "Last updated" line → a single `#141417`
surface card (`0.5px #2E2E38` border) holding all body content, max-width
`720px` for readable prose line length.

Also scrolls the window to top on mount (`useEffect(() => window.scrollTo(0, 0), [])`)
— these pages are reached by client-side `<Link>` navigation (e.g. from
the footer while scrolled down elsewhere on the landing page), which
doesn't reset scroll position on its own.

---

## `TermsPage.tsx` / `PrivacyPage.tsx`

Both pages are self-contained (each defines its own `Section`/`SubHeading`
helpers and style constants locally — no shared content-rendering
abstraction, since there are only two consumers and they don't share
data shape). Common pattern:

- A `Section` component renders `<h2 id={id}>{number}. {title}</h2>` with a
  `0.5px #2E2E38` top divider and consistent spacing, so all numbered
  sections read as clearly separated blocks.
- A `TOC_ITEMS` array drives a responsive anchor-link grid
  (`repeat(auto-fill, minmax(240px, 1fr))`) at the top of the page —
  collapses to one column on narrow screens for free, no media query
  needed.
- Bullet lists render as real `<ul>`/`<li>` (Prohibited Activities,
  User Generated Contributions warranties, payment methods, etc.) rather
  than run-together paragraph text.
- All body text and headings use the same dark-theme literals as the rest
  of the landing page (`#0D0D10` bg, `#141417` card, `#2E2E38` border,
  `#E8E6F0` headings, `#7A7890` body, `#4B9EFF` links) — no `font-data`,
  since neither document has numeric/data values to format.

**Source content:** Terms was parsed from a raw Termly HTML export (all
`<bdt>` editor tags, `mso-*` inline styles, the Termly logo, and the
generator attribution line stripped out); Privacy was parsed from a
plain-markdown draft. Both were then sanitized before being committed:

- **No personal name, phone, or street address anywhere.** Every
  `MOUAD RARHIB` reference became `Depthly`; the phone number and mailing
  address were dropped rather than kept and re-attributed.
- **No country named.** Governing-law/arbitration/data-hosting clauses
  that originally named Morocco were reworded to stay legally coherent
  without asserting a specific jurisdiction (e.g. "governed by applicable
  law" / "the applicable courts" instead of "the laws of Morocco").
- **One shared contact email**, `contact@getdepthly.com`, used consistently
  across Terms, Privacy, and the footer's Contact link (all three used to
  disagree — Terms/Privacy had the real personal inbox, the footer had a
  different placeholder — now unified).
- Privacy's Cookie Policy line is a clearly marked italic placeholder
  ("A dedicated Cookie Policy page will be linked here once available.")
  rather than a dead link, since that page doesn't exist yet.

---

## Routing

```ts
// paths.ts
terms:   '/terms',
privacy: '/privacy',

// routes/index.tsx — public, top-level, outside AppLayout/ProtectedRoute
{ path: '/terms',   element: <TermsPage /> },
{ path: '/privacy', element: <PrivacyPage /> },
```

---

## Known limitations

- `LandingFooter` only renders on `LandingPage` (`/`) — it doesn't appear
  on `/login`, `/signup`, or any authenticated route. "Footer links work
  from every page" is trivially true today since there's only one page it
  appears on; revisit if the footer should also show on auth pages.
- `contact@getdepthly.com` is a best-guess placeholder, not a confirmed
  real inbox — double-check before launch.
- Both Terms and Privacy are launch-ready in structure/content-fidelity
  but have **not** had a legal review — flagged personal/location details
  were removed for privacy, not because they were legally reviewed.
- Cookie Policy is referenced but not yet built.

## Verification

Type-checked (`npx tsc --noEmit`) and production-built (`npx vite build`)
clean after every change in this pass. No browser/Playwright verification
was performed — skipped per explicit instruction each time this work was
done; re-verify the footer scroll behavior and both legal pages in a real
browser before launch.

Committed as `efa09bb` — "feat: functional footer with working legal
pages" (pushed to `main`).
