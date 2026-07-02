# Generative Mockup Compositing — Architecture Pivot (Option 3)

**For:** Antigravity (execution agent)
**Codebase:** `hive-frontend-main`
**Supersedes:** The deterministic quad-warp/blend-mode compositing approach in `Mockup_Template_Authoring_Pipeline.md` and Part 1 of `Brand_Book_Layout_Redesign_Implementation.md`.
**Scope:** `lib/visualIdentity/mockup-compositor.ts` (replaced, not extended), `prisma/schema.prisma` (`MockupTemplate`, new `GeneratedMockup` table), new job queue for async generation, `app/api/brand-dna/*` routes that trigger mockup generation.

---

## 0. Explicit reversal note

Part 1.1 of the brand book MD gave three concrete reasons to move *away* from per-user generative compositing: cost, ~1-2 min latency, and run-to-run inconsistency. This document reverses that decision on purpose, in exchange for matching the visual quality shown in the ChatGPT Images reference screenshots. Nothing below is a bug fix to the old approach — it's a replacement. Flagging this so it isn't read as a continuation of Track A from the prior scope handoff.

The old deterministic pipeline (quad authoring, `sharp` warp, blend modes) should be kept in the codebase as a fallback path (see §5), not deleted — it's cheap, fast, and still useful when the generative call fails or is rate-limited.

---

## 1. What generation actually does now

Per mockup, per brand:
1. Load the base template scene (same curated library as before — this part of Part 1 is unchanged: base scenes are still authored once, not generated per-user).
2. Load the canonical transparent logo asset from `BrandVisualIdentity.logoUrl` (Part 2's pipeline is **still required** — the generative call needs a clean logo reference image, not a re-generation of the logo itself).
3. Call an image-editing model (`gpt-image-2` via OpenAI's API `images.edit` endpoint, or the Responses API image tool) with both images plus a per-template placement prompt.
4. Persist the result. Do **not** regenerate on every page load — see caching in §3.

This replaces `logoZoneJson`, `blendMode`, `layerOpacity`, and `layerFill` as the placement mechanism. The model figures out perspective, lighting, and fabric behavior from the prompt and reference images instead of from authored coordinates.

---

## 2. Schema changes

### 2.1 `MockupTemplate` — simplify

Quad/blend fields become unnecessary for the generative path. Recommend **keeping them, not removing them**, since they're still used by the fallback compositor (§5):

```prisma
model MockupTemplate {
  id                String   @id @default(cuid())
  templateId        String   @unique
  category          String
  baseImageUrl      String
  compositePrompt   String   // NEW — describes how the logo should sit on this surface
  // Existing quad/blend fields (logoZoneJson, blendMode, layerOpacity, layerFill,
  // overlayImageUrl, requiresDisplacement) are retained for fallback use only.
  active            Boolean  @default(true)
  createdAt         DateTime @default(now())
}
```

`compositePrompt` is new and required for the generative path — example: *"Place this logo centered on the tote bag's fabric front panel, following the bag's folds, shadow, and fabric texture. Do not alter the bag, the background, or the lighting."* This is authored once per template, same cadence as the old quad data, just written as natural language instead of coordinates.

### 2.2 New `GeneratedMockup` table (cache)

```prisma
model GeneratedMockup {
  id            String   @id @default(cuid())
  waitlistId    String
  templateId    String
  logoVersion   String   // hash or version stamp of BrandVisualIdentity.logoUrl content
  resultUrl     String?  // Blob URL once generation succeeds
  status        String   @default("pending") // "pending" | "generating" | "ready" | "failed" | "fallback"
  errorMessage  String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([waitlistId, templateId, logoVersion])
}
```

`logoVersion` is the cache-busting key — if `BrandVisualIdentity.logoUrl` changes (brand re-generates their logo), old `GeneratedMockup` rows for that brand become stale and a new one gets generated on next request. Recommend a simple content hash of the logo file rather than a timestamp, so identical logos don't trigger unnecessary regeneration.

---

## 3. Caching strategy

**Never regenerate an already-generated (brand, template) pair.** On request:
1. Compute current `logoVersion` for the brand.
2. Look up `GeneratedMockup` by `(waitlistId, templateId, logoVersion)`.
3. If `status: "ready"` → serve `resultUrl` directly.
4. If `status: "pending"` or `"generating"` → the request already triggered generation; return current status for polling (see §4).
5. If no row exists → create one with `status: "pending"`, enqueue generation, return status for polling.

This means each brand pays the generation cost once per (template, logo-version) pair, not once per page view — this is the minimum caching bar to make Option 3 viable at all, not an optional optimization.

---

## 4. Async generation flow

1-2 minute latency per generation is too long for a synchronous request/response cycle. Structure this as a background job:

- API route triggers generation, writes `GeneratedMockup` row as `"pending"`, returns immediately with the row id.
- A worker (queue job, or a simple polling cron if no queue infra exists yet — confirm which the codebase already has before building a new one) picks up `"pending"` rows, calls the image-edit API, uploads the result to Blob, updates the row to `"ready"` + `resultUrl`, or `"failed"` + `errorMessage` on error.
- Frontend polls the row status (or subscribes via whatever real-time mechanism the app already uses) and shows a generating state, then swaps in the image once `"ready"`.

Do not block the brand book page render on this — the page should render with placeholder/skeleton states for any mockup still `"pending"` or `"generating"`, exactly like the existing `1.0 Logo Showcase` async-generation pattern already handles other slow AI steps.

---

## 5. Fallback behavior

If a `GeneratedMockup` row moves to `"failed"` (API error, timeout, content-policy rejection, rate limit):
- Retry once automatically.
- On second failure, fall back to the existing deterministic `sharp` compositor (quad-warp + blend mode) against the same `MockupTemplate` row, and mark the `GeneratedMockup` row `"fallback"` with `resultUrl` pointing at the deterministic output.
- This is why the old `logoZoneJson`/`blendMode` fields and compositor logic should stay in the codebase rather than being removed — it's now a safety net, not the primary path. Its output quality only needs to be "acceptable," not "matches ChatGPT," since it's the exception case.

---

## 6. Cost, quota, and provider setup — needs confirmation before build

Not filling these in with assumptions:

- **API key / provider account**: this requires an OpenAI API key (`OPENAI_API_KEY` or similar), which is a new dependency — confirm whether one already exists for this project or needs provisioning, and confirm org verification is complete (OpenAI requires this for GPT Image model access).
- **Pricing**: OpenAI's current image-edit pricing should be confirmed directly against their live billing page at implementation time rather than assumed — pricing structures for image models have changed more than once recently (per-image tiers vs. per-token), and this plan shouldn't hardcode a stale number as a cost estimate.
- **Rate limits**: confirm request-per-minute limits on whatever tier the org account is on, since a brand-book generation with several mockup categories per brand could burst several image-edit calls at once. May need to serialize per-brand generation rather than firing all mockup categories in parallel.
- **Content policy**: image-edit calls are subject to OpenAI's moderation; a logo or base template could theoretically get rejected. `"failed"` status + fallback (§5) covers this, but worth knowing it's a real failure mode, not hypothetical.

---

## 7. What this makes obsolete from prior scope

- `Mockup_Template_Authoring_Pipeline.md` §3–5 (manifest format, seed script requirements for quad/blend data, compositor perspective-warp work) — no longer the primary path. Manifest data is now only needed for the fallback compositor, so the earlier push to get every row Photopea-verified is lower priority, not urgent-blocking, since a wrong fallback composite is a rare-case degradation rather than the default experience.
- The three open category-enum questions (`paper-bag-pavement-active`, `coffee-drip-pouch-active`, `street-sign-outdoor-active`) and the sleeveless-shirt displacement deferral still apply if the fallback path is ever hit for those templates, but are no longer blocking Track B work the way they were under the deterministic-only plan.
- 3.6 and 3.7 in the brand book layout redesign are **no longer blocked** on Photopea-verified quads, since the generative path doesn't consume `logoZoneJson` at all. They're now blocked only on this document's build (§2–5) landing.

---

## Priority / Sequencing

| # | Item | Depends on |
|---|---|---|
| 1 | Confirm provider setup + current pricing (§6) | — |
| 2 | Schema migration: `MockupTemplate.compositePrompt`, new `GeneratedMockup` table | #1 |
| 3 | Write `compositePrompt` per existing template (human-authored, one-time, same cadence as old quad authoring) | #2 |
| 4 | Generation service: image-edit API call + Blob upload | #1, #2 |
| 5 | Caching lookup logic (§3) | #2 |
| 6 | Async job/worker + frontend polling (§4) | #4, #5 |
| 7 | Fallback wiring to existing deterministic compositor (§5) | #4, existing compositor (unchanged) |
| 8 | Re-point 3.6/3.7 brand book sections at this pipeline instead of the deterministic one | #1–#7 |

**Recommended order:** 1 → 2 → 3 → 4 → 5 → 6 → 7, then unblock 8. Steps 3 and 6/7 can run in parallel with 4/5 once the schema lands.
