# Brand Book Layout Redesign & Mockup Pipeline Overhaul

**For:** Antigravity (execution agent)
**Codebase:** `hive-frontend-main` (Brand DNA Waitlist MVP)
**Scope:** `lib/visualIdentity/mockup-compositor.ts`, `prisma/schema.prisma` (`MockupTemplate`, `BrandVisualIdentity`), `app/api/brand-dna/process-guideline/route.ts`, `components/pages/waitlist-brand-dna/components/` (visual identity / brand book views), new PDF export utility.
**Goal:** Replace per-user AI-generated mockup scenes with a curated, self-hosted template library; fix the missing transparent logo asset; and rebuild the brand book's page architecture to match the six reference layouts supplied, with PDF export as the shipped output format.

---

## Part 1: Mockup Template Library (Self-Hosted, Reusable)

### 1.1 Core principle: generate the scene once, not per-user

Today, every user generation re-invents mockup scenes from scratch via the image model, which is why output is inconsistent, slow, and occasionally broken (dead Unsplash links, logos landing on faces). The fix: **base scenes are curated once and reused for every brand.** Only the logo placed on top is dynamic per-user.

### 1.2 Sourcing the base scenes

Two acceptable sources, either is fine to start:
- **AI-generated once, human-reviewed:** Generate ~3-5 candidate "blank surface" scenes per category (empty tee front, empty tote, empty business card on a flatlay, blank browser chrome frame, blank phone home screen, blank pin/badge on concrete), have El-Roy pick the best one per category, and permanently store that single winner. This is a one-time curation pass, not a recurring cost.
- **Licensed/self-shot stock:** for categories where realism matters most (apparel, merch), a small paid stock pack or actual product photography will outperform AI-generated blanks and is worth the one-time cost given these images get reused indefinitely.

Either way — **never hotlink a third-party URL at request time** (this was the Unsplash 404 cause). Every base scene is downloaded/generated once and re-uploaded to storage you control.

### 1.3 Hosting

- Use Vercel Blob (`BLOB_READ_WRITE_TOKEN` is already configured per the existing environment doc) — no new vendor needed.
- Organize by category as a flat, predictable path structure:
  ```
  mockup-templates/apparel/tee-front-01.png
  mockup-templates/apparel/tote-bag-01.png
  mockup-templates/apparel/polo-01.png
  mockup-templates/stationery/business-card-flatlay-01.png
  mockup-templates/stationery/letterhead-01.png
  mockup-templates/digital/browser-chrome-01.png
  mockup-templates/digital/phone-homescreen-01.png
  mockup-templates/digital/phone-homescreen-angled-01.png
  mockup-templates/physical/pin-badge-concrete-01.png
  mockup-templates/environment/signage-01.png
  ```
- `MockupTemplate.baseImageUrl` points at these Blob URLs exclusively going forward. Migrate/re-host any existing Unsplash-linked rows as part of this work (this closes the loop on the dead-link bug flagged previously).

### 1.4 Logo zone authoring (upgrade from rectangle to perspective quad)

The current `logoZoneJson` (`xPct`, `yPct`, `widthPct`) only supports a flat, unrotated rectangle — which is exactly why the logo looks pasted-on and why it landed on a model's face in the portrait template. Upgrade the schema to a **4-point quad**, authored once per template by a human:

```json
{
  "topLeft": { "xPct": 32, "yPct": 41 },
  "topRight": { "xPct": 58, "yPct": 39 },
  "bottomRight": { "xPct": 59, "yPct": 63 },
  "bottomLeft": { "xPct": 31, "yPct": 65 }
}
```

- `sharp` (or a small perspective-transform step ahead of it) uses these four points to warp the logo to match the surface angle before compositing — this is what makes the tote bag / polo / badge look properly placed instead of a flat sticker (compare the reference tote/polo mockups vs. the current output).
- Build a minimal internal authoring tool: a single page that loads a base scene image and lets someone click 4 points to define the quad, then writes the result to `MockupTemplate.logoZoneJson`. This does not need to be pretty — it just needs to replace "eyeballing JSON," which is the actual root cause of the face-overlap bug.
- As part of this work, re-author the zone for every existing template, and specifically fix the portrait template that currently overlaps the subject's eye.

### 1.5 Result

`MockupTemplate` becomes a small (~15-20 row), fully-vetted, permanently-hosted library. Generation time per user drops because the pipeline is no longer generating scenes — it's only generating a logo and compositing it onto pre-approved photography.

---

## Part 2: Logo Asset Pipeline (Isolation → Background Removal → Universal Reuse)

This is the flow to add immediately after logo generation, before any compositing happens anywhere else in the app.

### 2.1 Step order

1. **Generate the logo mark** on a plain, known solid-color background (not transparent, not a busy scene) — solid backgrounds key out far more reliably than asking a model to output alpha directly.
2. **Remove the background** to produce a true transparent PNG. Two viable approaches, pick one:
   - Chroma-key removal via `sharp`, since the background color is known and controlled (fast, free, no extra dependency).
   - A dedicated background-removal step (self-hosted `rembg`-style model, or an API call) if the chroma-key approach leaves fringing on complex logo shapes.
3. **Persist exactly one canonical transparent asset**: `BrandVisualIdentity.logoUrl` becomes this transparent PNG, uploaded to Blob under `logo-assets/{waitlistId}/logo-transparent.png`. This is the single source of truth every other step reads from — nothing downstream should ever re-generate or re-derive the logo independently.
4. **Derive secondary formats from the one canonical asset** (deterministic image ops, not new AI calls):
   - On-dark variant: invert or recolor the transparent PNG for dark-background placements (existing "1.2 Secondary Logo / On Dark" slot).
   - Mono treatment: desaturate/flatten to single color for the "1.3 Monochromatic Logo" slot.
   - App icon: pad the transparent logo onto a rounded-square tile filled with the brand color — this is a fixed deterministic composite (via `sharp`), not a new generation, since a raw cutout logo isn't itself an app-icon shape.

### 2.2 Universal placement

Every consumer of the logo — merch mockups, digital touchpoint mockups, business cards, social templates, the logo showcase grid itself — reads from `BrandVisualIdentity.logoUrl` (the one transparent PNG) and composites/warps it per Part 1's quad system. No mockup step should call the image-generation model for the logo a second time.

---

## Part 3: Brand Book Page Architecture Redesign

The six reference images map to specific fixes/additions below. Each becomes its own fixed-dimension "slide" component (same pattern as the existing cover card), so the whole book can be paginated for PDF export (see Part 4).

### 3.1 Cover (existing — keep as-is)
No change; current cover card (brand name, archetype, tagline on dark background) is working well.

### 3.2 NEW — Full-Bleed Brand Personality Page
Insert immediately after the cover. A single full-bleed image (sourced from the already-generated value imagery, once Part 2's grounding fixes are in place) with a short manifesto-style line overlaid — no card padding, no surrounding UI chrome, image fills the entire slide. This directly answers the "the slides are boring" note — it's meant to be a single emotional beat before the reference material starts.

### 3.3 Logo Showcase — Checkerboard Grid (replaces current 3-card row)
Reference: the YEIB logo grid (alternating navy/blue/white cells, each showing a different lockup — full wordmark, icon-only, stacked, reversed).
- Rebuild `1.0 Logo Showcase` as a grid of equal cells, each with a different background color drawn from the brand palette (not just white/black/mono), each showing a different lockup variant of the *same* canonical transparent logo from Part 2.
- This uses the derived on-dark/mono variants from 2.1(4) directly — no new generation required, just a richer grid of an asset that already exists.

### 3.4 Color System — Narrative + Asymmetric Pills (replaces current equal-card swatches)
Reference: "Our Colour System" layout — title, a left-column paragraph explaining what the palette *means* for this brand, and a right-column grid of pill-shaped swatches in varied heights (one tall primary pill, a column of smaller supporting pills), on a soft brand-tinted background rather than plain white.
- Requires the DeepSeek color-generation step (already being fixed per the chromatic-constraint work) to also output a 2-3 sentence rationale per palette — e.g. "why these hues fit this brand" — since the reference layout is explicitly copy-driven, not just hex chips.
- Swatch shapes become rounded pill/capsule elements of varying height (primary color tallest, supporting colors shorter), not uniform square cards.
- Section background should sample a very light tint of the brand's own palette rather than the generic off-white used everywhere else, so this page feels distinct from the surrounding sections.

### 3.5 Typography — Add a Specimen Tile
Reference: the "General Sans" dark-navy tile with the full alphabet rendered in a brand accent color, sitting alongside the merch mockups.
- Keep the existing heading/body pairing card, but add one additional tile: a solid brand-color (or near-black) block with the primary typeface name large, and the full alphabet set beneath it in an accent color. This becomes a reusable component that can also appear inside the merch/collateral section (3.7), matching the reference exactly.

### 3.6 NEW — Digital & Physical Touchpoints Page
Reference: browser-chrome mockup showing the site name/favicon in a tab, plus a phone home-screen mockup shown at a realistic angle, plus a small object mockup (pin/badge on a textured surface).
- New `MockupTemplate` category: `digital` and `physical`, using the new template library from Part 1.
- Browser chrome: a self-hosted static browser-frame template with the derived favicon/wordmark composited into the tab position.
- Phone home screen: replace the current flat/broken app-icon slide with a properly angled, self-hosted phone-mockup template (see reference image 5) — the app-icon tile from 2.1(4) gets composited onto the home screen template at the correct perspective quad, exactly like any other mockup in Part 1.
- Pin/badge (or another small "brand object"): one more self-hosted template showing the logo on a physical object, reinforcing the "this is a real brand" feeling the current merch section is missing.

### 3.7 Merch / Apparel — Masonry Grid (replaces current uniform 3-square grid)
Reference: the YEIB collateral moodboard — stationery flatlay, tote bag, polo shirt, two logo-lockup tiles, and the typography specimen tile, arranged in a **varied-size grid** (not all cells equal), all using real photographed-style mockups rather than AI-improvised scenes.
- Rebuild `Merch, Apparel & Physical Environments` as a CSS grid with mixed cell spans (large hero cell for the stationery flatlay or tote, smaller cells for polo/pin/logo swatches), matching the reference's visual rhythm rather than a uniform 3-column repeat.
- Every mockup in this grid is now a Part 1 template + Part 2 canonical logo composite — this section should have zero AI-improvised scenes left in it once Parts 1 and 2 are live.

### 3.8 Section background & framing (applies globally)
Reference images consistently avoid the "card floating on gray page" look the current book has — sections are either full-bleed color blocks or edge-to-edge photography. Apply this globally: retire the padded-white-card-on-gray-background pattern in favor of full-bleed slide backgrounds (brand-tinted or photographic) per section, matching the cover card's existing full-bleed treatment.

---

## Part 4: PDF Export Architecture

Current implementation is a scrolling webpage; the reference layouts are paginated slides, and the shipped output needs to be a downloadable PDF. This requires an architectural shift:

- Convert each section (3.1–3.7) into a fixed-dimension slide component (e.g. 1920×1080 or A4 landscape), the same way the existing cover card already behaves as a self-contained block.
- Add a server-side PDF export route that renders each slide component at a fixed viewport (headless browser rendering — Puppeteer/Playwright is the standard approach for pixel-accurate CSS/gradient/font fidelity) and stitches the captures into a single multi-page PDF.
- This is a genuinely separate piece of work from the layout redesign itself — sequence it *after* Part 3 is visually finalized, since re-rendering a moving design target through a PDF pipeline repeatedly is wasted effort. Land the new page designs first, confirm they look right in-browser, then wire up export.

---

## Priority / Sequencing Summary

| # | Item | Effort | Depends on |
|---|---|---|---|
| 1 | Canonical transparent logo asset (Part 2) | Medium | — |
| 2 | Self-hosted mockup template library, sourcing + hosting (Part 1.2–1.3) | Medium | — |
| 3 | Perspective-quad logo zones + authoring tool (Part 1.4) | Medium | #2 |
| 4 | Re-composite all existing mockup categories through #1 + #3 | Small | #1, #3 |
| 5 | Logo showcase checkerboard grid (3.3) | Small | #1 |
| 6 | Color system narrative + pill layout (3.4) | Medium | chromatic color-gen fix (prior MD) |
| 7 | Typography specimen tile (3.5) | Small | — |
| 8 | Full-bleed personality page (3.2) | Small | grounded imagery fix (prior MD) |
| 9 | Digital/physical touchpoints page (3.6) | Medium | #2, #3 |
| 10 | Merch masonry grid (3.7) | Medium | #1–#4 |
| 11 | Global section framing pass (3.8) | Small | 3.2–3.7 landed |
| 12 | PDF export pipeline (Part 4) | Large | all of Part 3 finalized |

**Recommended order:** 1 → 2 → 3 → 4 first (this is the infrastructure everything else sits on and immediately fixes the visible "slop" from the last two test runs), then 5–11 as the visual redesign pass, then 12 last once the design is stable.
