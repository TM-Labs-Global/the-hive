# Mockup Template Authoring Pipeline

**For:** Antigravity (execution agent)
**Codebase:** `hive-frontend-main`
**Scope:** `prisma/schema.prisma` (`MockupTemplate`), a new one-time seed script, `lib/visualIdentity/mockup-compositor.ts`.
**Precondition:** El-Roy has already exported empty base-scene PNGs (and overlay PNGs where applicable) from PSD mockup packs via Photopea, staged locally in the codebase under a `mockup-source/` folder. This MD defines the schema, the manifest format that describes each exported file, the seed script that uploads/registers them, and the compositor logic that uses this data to place a logo correctly.

---

## 1. Why this exists

A flat rectangle (`xPct/yPct/widthPct`) cannot reproduce what real PSD mockups do — inspecting five actual template packs showed each design placeholder carries up to three independent pieces of placement data:

1. **A quad** (four corner points), not a rectangle — needed for perspective/rotation (e.g. the tote bag's slightly angled panel).
2. **A blend mode + opacity/fill** on the design layer itself — some templates (hoodie label, tote-on-person) bake their "looks printed on the fabric" effect directly into the design layer's blend settings (`Linear Burn, 80%, 90%` was observed on one), not into a separate overlay.
3. **A separate overlay layer** (shadow/reflection) that sits *above* the composited logo — observed on the tote bag and street sign templates as distinct `Shadow`/`Reflection` layers.

Templates vary in which of these three they use. The schema and compositor must support all three independently per template, not assume one universal pattern.

A fourth pattern — **displacement-map warping** (observed on the sleeveless shirt template, via a `Displace` Smart Filter) — is explicitly **out of scope for this pass**. `sharp` has no native displacement-filter equivalent; building one is a separate, larger piece of work. Templates that require it are flagged and deferred, not approximated.

---

## 2. Schema changes

Update `MockupTemplate` in `prisma/schema.prisma`:

```prisma
model MockupTemplate {
  id              String   @id @default(cuid())
  templateId      String   @unique
  category        String   // "apparel" | "stationery" | "digital" | "physical" | "environment"
  baseImageUrl    String   // Blob URL — the empty scene
  overlayImageUrl String?  // Blob URL — optional shadow/reflection layer, composited AFTER the logo
  garmentMaskUrl  String?  // existing field, unchanged
  tintEnabled     Boolean  @default(false)

  // Perspective quad — four corners in pixel coordinates, relative to baseImageUrl's actual dimensions
  logoZoneJson    Json     // { topLeft: {x,y}, topRight: {x,y}, bottomRight: {x,y}, bottomLeft: {x,y} }

  // Design-layer blend settings, read directly off the Photopea/PSD layer
  blendMode       String   @default("normal") // "normal" | "multiply" | "linear-burn" | "screen" | "overlay"
  layerOpacity    Int      @default(100)       // 0-100, maps to Photopea "Opacity"
  layerFill       Int      @default(100)       // 0-100, maps to Photopea "Fill"

  requiresDisplacement Boolean @default(false) // true = deferred, compositor skips this template for now
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
}
```

Notes:
- `logoZoneJson` stores **pixel coordinates**, not percentages — Photopea's Info panel (used during authoring) reads out pixel positions directly, and pixel coordinates avoid rounding drift when the compositor scales the quad against the actual base image dimensions at runtime.
- `requiresDisplacement: true` templates should be seeded with `active: false` until displacement support is built — they should not be silently composited with a flat quad and shipped looking wrong.

---

## 3. Manifest format

El-Roy's local `mockup-source/` folder pairs each exported PNG with a manifest entry describing the data extracted from Photopea (quad corners, blend mode, opacity, fill — per the process already walked through manually). Expected local structure:

```
mockup-source/
  manifest.json
  apparel/
    tote-bag-01-base.png
    tote-bag-01-overlay.png
    tote-bag-person-01-base.png
    hoodie-label-01-base.png
  environment/
    street-sign-01-base.png
    street-sign-01-overlay.png
  deferred/
    sleeveless-shirt-01-base.png
```

`manifest.json` — one entry per template:

```json
[
  {
    "templateId": "tote-bag-01",
    "category": "apparel",
    "baseFile": "apparel/tote-bag-01-base.png",
    "overlayFile": "apparel/tote-bag-01-overlay.png",
    "logoZone": {
      "topLeft": { "x": 604, "y": 862 },
      "topRight": { "x": 1252, "y": 862 },
      "bottomRight": { "x": 1252, "y": 1471 },
      "bottomLeft": { "x": 604, "y": 1471 }
    },
    "blendMode": "normal",
    "layerOpacity": 100,
    "layerFill": 100,
    "requiresDisplacement": false
  },
  {
    "templateId": "tote-bag-person-01",
    "category": "apparel",
    "baseFile": "apparel/tote-bag-person-01-base.png",
    "overlayFile": null,
    "logoZone": {
      "topLeft": { "x": 610, "y": 900 },
      "topRight": { "x": 1180, "y": 870 },
      "bottomRight": { "x": 1190, "y": 1450 },
      "bottomLeft": { "x": 600, "y": 1470 }
    },
    "blendMode": "linear-burn",
    "layerOpacity": 80,
    "layerFill": 90,
    "requiresDisplacement": false
  },
  {
    "templateId": "sleeveless-shirt-01",
    "category": "apparel",
    "baseFile": "deferred/sleeveless-shirt-01-base.png",
    "overlayFile": null,
    "logoZone": null,
    "blendMode": "normal",
    "layerOpacity": 100,
    "layerFill": 100,
    "requiresDisplacement": true
  }
]
```

El-Roy fills this out per template using the values already extracted via Photopea's Free Transform (`Cmd+T`) corner readout and the layer panel's blend mode/Opacity/Fill fields, exactly as walked through per-template. `logoZone` is `null` for `requiresDisplacement: true` entries since they're not being placed yet.

---

## 4. Seed script

Create `scripts/seed-mockup-templates.ts`:

- Read `mockup-source/manifest.json`.
- For each entry:
  - Upload `baseFile` (and `overlayFile`, if present) to Vercel Blob under `mockup-templates/{category}/{filename}` using `@vercel/blob`'s `put()`.
  - Upsert a `MockupTemplate` row keyed on `templateId`, with `baseImageUrl`/`overlayImageUrl` set to the returned Blob URLs, and the rest of the fields copied directly from the manifest entry.
  - If `requiresDisplacement: true`, force `active: false` regardless of what's in the manifest, as a safety net.
- Run via `npx tsx scripts/seed-mockup-templates.ts` (or the project's existing script runner convention) — one-time / re-run-on-demand as new templates are added to the manifest, not part of the request-time pipeline.
- Log a summary at the end: how many templates seeded, how many skipped/deferred, so a bad manifest entry doesn't fail silently.

---

## 5. Compositor logic (`mockup-compositor.ts`)

Update the composite function to, per active `MockupTemplate`:

1. Load `baseImageUrl`.
2. Load the canonical transparent logo PNG (from the logo asset pipeline established previously).
3. **Perspective-warp the logo** to fit `logoZoneJson`'s four corners. `sharp` doesn't do arbitrary quad warps natively — use a homography/perspective-transform step ahead of `sharp` (a small dependency such as a WASM-based image-warping library, or shelling out to a transform matrix computed from the four source/destination point pairs) to pre-warp the logo image into the quad's exact shape, then composite the warped result onto the base at the quad's bounding box.
4. **Apply `blendMode` and `layerOpacity`/`layerFill`** when compositing the warped logo onto the base — `sharp`'s `composite()` accepts a `blend` option that maps directly to CSS/Porter-Duff-style blend modes (`multiply`, `screen`, `overlay`, etc.); map `linear-burn` to the closest supported mode if `sharp` doesn't have an exact match, and apply `layerOpacity`/`layerFill` as alpha-multiplied compositing before the blend step.
5. If `overlayImageUrl` is present, composite it on top of the result, unmodified (`normal` blend, full opacity) — this reproduces the `Shadow`/`Reflection` layers sitting above the design layer in the original PSDs.
6. Skip any template where `active: false` (covers both manually deactivated templates and anything with `requiresDisplacement: true`).

---

## 6. What's explicitly deferred

- **Displacement-map templates** (e.g. the sleeveless shirt) — seeded but inactive. Revisit once there's a concrete plan for warping the logo against a displacement map, which is a meaningfully different (and heavier) technique than the quad+blend approach covering everything else.
- **Manual manifest authoring remains manual for now** — El-Roy extracts quad/blend values from Photopea by hand per template. A dedicated in-app authoring tool (upload an image, click 4 points, read blend mode automatically) is a nice-to-have follow-up, not a blocker — the manifest format above is deliberately simple enough to hand-write for a template library of ~15-20 entries.

---

## Priority / Sequencing

| # | Item | Depends on |
|---|---|---|
| 1 | Schema migration (`MockupTemplate` fields) | — |
| 2 | `manifest.json` filled out for currently-exported templates | El-Roy's Photopea extraction |
| 3 | Seed script built + run | #1, #2 |
| 4 | Compositor perspective-warp + blend-mode support | #1 |
| 5 | Compositor overlay-layer support | #4 |
| 6 | Re-composite existing merch/mockup sections through the new pipeline | #3, #4, #5 |
| 7 | Displacement-map support (deferred) | none of the above — separate future work |
