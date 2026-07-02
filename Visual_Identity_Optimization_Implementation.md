# Visual Identity & Mockup Pipeline — Optimization Implementation Plan

**For:** Antigravity (execution agent)
**Codebase:** `hive-frontend-main` (Brand DNA Waitlist MVP)
**Scope:** `lib/llm/openai-client.ts`, `lib/visualIdentity/mockup-compositor.ts`, `app/api/brand-dna/process-guideline/route.ts`, `prisma/schema.prisma` (`MockupTemplate`), frontend polling in the visual-identity result view.
**Context:** This plan follows a live pipeline run (waitlistId 57, "Nexus Coffee") that surfaced concrete, reproducible defects — a monochrome brand color, generic stock imagery unrelated to the business, a broken mockup category (dead Unsplash URL), a logo overlapping a model's face, and a 3.1-minute sequential generation time. Each fix below is tied to one of those observed defects.

---

## How This Plan Is Structured

- **Track 1 — Immediate fixes.** No new vendor, no infra change. Ships on top of the current `gpt-image-2` / OpenAI SDK setup. Do this first.
- **Track 2 — Runware migration.** Introduces Runware as a model-agnostic image inference layer, unlocking capabilities (ControlNet, IP-Adapters, true negative prompts, vector-native models) that OpenAI's image API does not expose at all. Do this second, once Track 1 is validated.

Track 1 is deliberately designed so nothing in it needs to be undone if/when Track 2 ships — it fixes prompt logic and orchestration that will carry over regardless of which model vendor generates the pixels.

---

## Track 1: Immediate Fixes (Current Architecture)

### 1.1 Chromatic color constraint + validator

**Problem observed:** Log shows `Color generated: #0A0A0A -> contrast adjusted: #0A0A0A` for a `premium_luxury` archetype that should land on champagne gold / dark emerald / rich plum territory. The model defaulted to near-black because the prompt gave it no numeric guardrail.

**Fix:**
- Update the color-generation prompt (wherever it lives inside `openai-client.ts` / the archetype→color mapping logic) to require the model to return an explicit `{ hex, hue, saturation, lightness }` object, not just a hex string.
- Add a **per-archetype hue range** as a hard constraint in the prompt:
  - `agro_earth` → hue 20–45° (terracotta/olive), saturation ≥ 30%
  - `corporate_trust` → hue 195–230° (blue/teal), saturation ≥ 25%
  - `bold_consumer` → hue 0–20° or 280–320° (red/purple), saturation ≥ 50%
  - `premium_luxury` → hue 35–50° (gold) or 140–160° (emerald) or 280–300° (plum), saturation ≥ 25%
  - `tech_minimal` → hue 200–220° (cool blue-gray), saturation 10–25% (this is the *only* cluster where low saturation is intentional)
- Add a post-generation validator (parallel to the existing WCAG contrast check): if `saturation < 15%` and the archetype is not `tech_minimal`, reject the response and either retry once with an explicit correction message ("the previous response was too desaturated, return a color with saturation ≥ 25%") or fall back to a curated hex per archetype instead of accepting a near-grayscale value.
- Log a warning (not silent) whenever the fallback path fires, so this failure mode is visible in monitoring instead of quietly shipping monochrome brand kits.

### 1.2 Grounded imagery prompts (fix generic stock photography)

**Problem observed:** Value images for "Innovation / Empowerment / Truthful" showed a man soldering electronics, a woman in a generic office, and a man in glasses — none referencing coffee, cafés, or the actual business.

**Fix:**
- Locate the prompt template used for value imagery generation. It currently appears to lead with the abstract value label and archetype ("Innovation, premium luxury archetype, professional photography").
- Rebuild the template so **concrete business nouns come first**, abstract style/mood terms come last:
  ```
  {concreteSubject} — {valueWord} in the context of {businessCategory},
  {settingDescriptor}, {lightingMood}, editorial photography, {archetypeStyleModifier}
  ```
- Source `{concreteSubject}` and `{businessCategory}` from the already-generated `BrandDNA` JSON (`coreOfferings`, `businessName`, `differentiationText`) — this data already exists in `dnaJson`, it just isn't being passed into the imagery prompt today.
- Example for Nexus Coffee, value = "Innovation":
  - Before: `Innovation, premium luxury archetype, professional photography`
  - After: `A barista's hands precisely dialing in an espresso shot on a professional machine, steam rising, specialty coffee bar, warm amber lighting, shallow depth of field, editorial photography, premium and refined mood`
- Build a small lookup table mapping common `businessCategory` keywords → visual anchor phrases (coffee/café → espresso machine, pour-over, roastery; SaaS → laptop/dashboard UI; fashion → garment/fabric detail; etc.) as a fallback when `coreOfferings` text is too vague to extract a clean noun phrase directly.

### 1.3 Negative-prompt workaround (interim, until Track 2)

**Problem:** OpenAI's image API has no native negative-prompt parameter, so there's currently no way to suppress "watermark," "generic office backdrop," "stock photo border," etc.

**Interim fix (Track 1 only):** Since true negative prompts aren't available yet, fold exclusions into the positive prompt as explicit style directives: append a fixed suffix to every imagery prompt —
```
..., no visible text or watermarks, no generic corporate office backgrounds, natural editorial photography only
```
This is a weaker substitute than a real negative prompt but costs nothing and should reduce some of the genericness. Track 2 replaces this with a proper negative-prompt parameter.

### 1.4 Parallelize image generation

**Problem observed:** `POST /api/brand-dna/process-guideline 200 in 3.1min` — logo, and 3 value images are generated sequentially, each a 20–40s `gpt-image-2` call.

**Fix:**
- In `process-guideline/route.ts`, identify the point after `archetypeCluster` and `brandColorHex` are resolved (both are prerequisites for every image call, nothing else is).
- Replace the sequential `await` chain for logo + value image 1/2/3 with:
  ```ts
  const [logoResult, value1, value2, value3] = await Promise.all([
    generateLogo(brandContext),
    generateValueImage(brandContext, values[0]),
    generateValueImage(brandContext, values[1]),
    generateValueImage(brandContext, values[2]),
  ]);
  ```
- Confirm `maxDuration = 60` is still sufficient once calls run in parallel (it should comfortably be, since parallel time ≈ slowest single call, not the sum).
- Expected impact: ~3.1 min → likely 45–90s for this stage.

### 1.5 Client polling backoff

**Problem observed:** `GET /api/brand-dna/57/visual-identity` fires dozens of times during the ~3 minute job, often every 300–900ms, hammering Postgres with SELECTs while the generation job is also writing — a plausible contributor to the connection drop seen later in the same session (`Can't reach database server`, `terminating connection due to administrator command`).

**Fix:**
- In the visual-identity result view's polling hook, replace the fixed-interval poll with exponential backoff: start at 2s, double up to a cap of ~10s, reset on status change.
- Alternatively (bigger lift, not required for this pass): move to a single push notification via SSE or a lightweight websocket when status flips to `DONE`, eliminating polling entirely.

### 1.6 Fix dead mockup base images

**Problem observed:**
```
Failed to fetch image from URL: https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?q=80&w=800 (HTTP 404)
Billboard composition failed
```

**Fix:**
- Audit every `MockupTemplate.baseImageUrl` in the database. Any pointing at `images.unsplash.com` (or any third-party hotlink) should be downloaded once and re-uploaded to Vercel Blob (`BLOB_READ_WRITE_TOKEN` is already configured per the environment doc), with `baseImageUrl` updated to the blob URL.
- Add a scheduled health-check (cron or a manual admin script) that HEAD-requests every active `MockupTemplate.baseImageUrl` and flags/deactivates (`active: false`) any that return non-200, so a dead template degrades gracefully instead of throwing mid-pipeline for a live user.

### 1.7 Fix logo placement zone overlapping subject's face

**Problem observed:** In the portrait mockup template, the logo composite lands directly over the model's eye — visibly broken.

**Fix:**
- Locate the `MockupTemplate.logoZoneJson` (`xPct`, `yPct`, `widthPct`) for the portrait template and manually reposition the zone to a safe area (lower-left or lower-right corner, away from the face).
- Add a lightweight guard when authoring new templates: require `logoZoneJson` to be reviewed against the base image before `active: true` is set — this is a content-authoring gap, not something worth automating with face-detection for an MVP.

### 1.8 Real data in business card mockup

**Problem observed:** Card mockup shows placeholder "Jane Doe," `hello@example.com`, `123 Brand Street`, `example.com` instead of the actual signup email or brand name.

**Fix:**
- Update the card-mockup compositor call to pull `email` from `WaitlistSignup` and `businessName` / tagline from `dnaJson` where available, falling back to placeholder text only when a field is genuinely absent (e.g. no physical address was ever collected, so that field can reasonably stay a placeholder/omitted).

### 1.9 Database connection resilience

**Problem observed:**
```
prisma:error Can't reach database server at ep-little-thunder-ai56x0q0...
prisma:error terminating connection due to administrator command
```
This is consistent with Neon's free-tier compute auto-suspend/connection-limit behavior under load.

**Fix:**
- Confirm Prisma's `DATABASE_URL` is using Neon's **pooled** connection string (via PgBouncer, typically the `-pooler` host variant) rather than the direct connection, since the app makes many short-lived queries from serverless function instances.
- Wrap the highest-frequency read (`visual-identity` status poll) in a simple retry-once-on-connection-error pattern, since 1.5 (polling backoff) will already reduce the volume of these calls significantly.

---

## Track 2: Runware Migration

Track 2 introduces [Runware](https://runware.ai/docs/learn) as the image-generation provider, replacing or supplementing direct `gpt-image-2` calls. Runware is a model-agnostic inference API — same general request/response shape, but with structural conditioning (ControlNet), reference-based consistency (IP-Adapters), true negative prompts, and access to models specialized per asset type instead of one generalist model.

### 2.1 Provider abstraction layer

- Introduce `lib/llm/image-provider.ts` as a thin interface:
  ```ts
  interface ImageProvider {
    generateLogo(input: LogoInput): Promise<ImageResult>;
    generateValueImage(input: ValueImageInput): Promise<ImageResult>;
    generateMockupComposite(input: MockupInput): Promise<ImageResult>;
  }
  ```
- Keep the existing OpenAI implementation as `OpenAIImageProvider` (Track 1 fixes still apply to it as a fallback path) and add `RunwareImageProvider` alongside it, selected via an environment flag (`IMAGE_PROVIDER=runware|openai`) so the migration can be toggled and rolled back without a code change.
- This preserves the existing **Programmatic Vector Fallback** (SVG + `sharp`) as the final fallback regardless of which provider is primary — that guarantee ("the pipeline never crashes") should not be lost in the migration.

### 2.2 Model routing per asset type

Replace the single `gpt-image-2` call for everything with per-asset model selection inside `RunwareImageProvider`:

| Asset | Model family | Why |
|---|---|---|
| Logo mark | `Recraft V4 Vector` / `Recraft Vectorize` | Native vector output — solves logo vectorization (previously scoped as a separate `potrace` integration) in the generation step itself, no post-processing needed |
| Value/editorial photography | FLUX-class model | Stronger photorealism and detail preservation (faces, hands, fine structure) than a generalist model |
| Mockup base scenes | ControlNet-conditioned generation | See 2.3 below |

### 2.3 Mockup compositing via ControlNet + inpainting (replaces flat `sharp.composite()`)

**Problem this solves:** the current pipeline generates a mockup photo, then pastes a flat rectangular logo on top via `sharp.composite()` with no awareness of the photo's structure — hence the logo landing on a model's eye, and the general "pasted sticker" look across all mockups.

**New approach:**
- For garment/product mockups, use ControlNet with a depth or Canny edge map derived from the existing base mockup photo, conditioning the generation so the logo is painted *into* the scene (respecting fabric folds, surface curvature, and lighting) rather than composited after the fact.
- Per Runware's own guidance, apply ControlNet only during the first 30–50% of diffusion steps to lock in composition/structure, then let the prompt drive the texture/rendering of the logo itself.
- This categorically eliminates the "logo over the eye" failure mode, because the model is reasoning about the photo's actual content (a face) rather than blindly targeting stored `xPct`/`yPct` coordinates.
- `MockupTemplate.logoZoneJson` doesn't disappear — it still defines the *approximate* target region to seed the inpainting mask — but the final placement is content-aware rather than a hard-coded rectangle.

### 2.4 Cross-asset visual consistency via IP-Adapters

**Problem this solves:** the logo, the 3 value images, and the mockups currently have no visual relationship to each other beyond sharing a hex code — they read as four unrelated images rather than one identity system.

**Fix:**
- Once the logo mark is generated, use it (or a locked style/color reference derived from it) as an IP-Adapter reference input for the subsequent value-image and mockup generations.
- This should measurably tighten the "does this look like one brand" quality of the final output — the explicit ask that opened this whole optimization pass.

### 2.5 Standing negative prompt library

Replace the Track 1 workaround (folding exclusions into the positive prompt) with a real `negativePrompt` parameter, applied as a base layer across all generations and extended per asset type:

- Base (all assets): `blurry, distorted, low quality, watermark, text artifacts`
- Value photography: `+ generic office background, stock photo border, corporate clipart`
- Logo: `+ photorealistic, gradient, drop shadow, complex detail` (logos should stay flat/vector-appropriate)
- Mockups: `+ visible seams, floating logo, flat sticker look, misaligned perspective`

### 2.6 Batched generation requests

Runware's request format accepts an array of task objects in a single API call, each independently addressable via `taskUUID`. Combine this with the Track 1.4 parallelization: submit the logo + 3 value image tasks as one batched Runware request instead of 4 separate HTTP round-trips. Where latency matters more than final polish (e.g. a future "preview" step before final generation), route disposable/iterative calls to a fast/cheap architecture (e.g. FLUX schnell-class model) and reserve the higher-fidelity model for the final committed asset.

### 2.7 Migration sequencing

1. Ship the provider abstraction (2.1) with `RunwareImageProvider` initially only handling **logo generation** (lowest risk, highest visible win via Recraft's native vector output).
2. Expand to value imagery once logo output is validated in production.
3. Move mockup compositing to the ControlNet/inpainting approach last — it's the highest-effort, highest-payoff piece, and should be built once the team has hands-on comfort with the Runware API from steps 1–2.
4. Add IP-Adapter consistency pass (2.4) once all three asset types are on Runware.

---

## Priority / Sequencing Summary

| # | Item | Track | Effort | Impact |
|---|---|---|---|---|
| 1 | Chromatic color constraint + validator | 1 | Small | Fixes root cause of monochrome output |
| 2 | Grounded imagery prompts | 1 | Small | Fixes irrelevant stock photography |
| 3 | Parallelize image generation | 1 | Small | ~2 min faster per user |
| 4 | Client polling backoff | 1 | Small | Reduces DB load / connection drops |
| 5 | Self-host mockup base images | 1 | Medium | Prevents dead mockup categories |
| 6 | Fix face-overlap logo zone | 1 | Small | Immediate visible fix |
| 7 | Real business card data | 1 | Small | Polish |
| 8 | DB pooled connection + retry | 1 | Small | Reliability |
| 9 | Negative-prompt workaround | 1 | Small | Partial quality floor, interim only |
| 10 | Provider abstraction layer | 2 | Medium | Enables everything below, reversible |
| 11 | Recraft vector logos | 2 | Medium | Solves logo vectorization natively |
| 12 | FLUX photography routing | 2 | Medium | Higher photorealism for value images |
| 13 | ControlNet mockup compositing | 2 | Large | Eliminates flat-paste/eye-overlap class of bugs |
| 14 | IP-Adapter consistency | 2 | Medium | Makes the identity feel like one system |
| 15 | Standing negative prompt library | 2 | Small | Real quality floor, replaces #9 |
| 16 | Batched task requests | 2 | Small | Further latency reduction |

**Recommended execution order:** items 1–9 (Track 1) first, as a single deployable pass — none of it requires a new vendor relationship or API key, and it directly fixes every defect observed in the Nexus Coffee test run. Track 2 (10–16) should follow once Track 1 is validated against a second live test run.
