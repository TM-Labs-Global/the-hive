# Brand DNA Waitlist — Landing Page Copy

**Source:** Adapted from The Hive Website Copy (approved messaging)
**Use:** Final copy for `app/(waitlist)/page.tsx` — implement as written, do not invent alternative copy.

---

## 1. Hero Section

**Eyebrow / badge** (small label above headline, matches existing "WAITLIST MVP" badge style already in the app):
```
BRAND DNA · FREE PREVIEW
```

**Headline:**
```
The tools to move faster.
The team to go further.
```

**Subhead:**
```
Import your brand in one click — via URL or a quick description —
and get a Brand DNA that keeps your voice, visuals, and identity
consistent everywhere you show up.
```

**CTA button:**
```
Generate Your Brand DNA →
```
*(routes to the existing `/brand-dna` import form)*

**Microcopy under the button** (small, muted text — sets expectation + low friction):
```
Free. Takes under a minute. No credit card required.
```

---

## 2. What You'll Get (output preview section)

**Section heading:**
```
Here's what's inside your Brand DNA
```

Short subhead:
```
One scan. A complete profile of how your brand sounds, who it speaks to,
and what it stands for.
```

Six-item grid (matches the actual generated output — use icons already established in the result card, e.g. sparkle/target/heart/eye/shield):

| Label | Description |
|---|---|
| **Brand Essence** | A clear, confident statement of who you are |
| **Target Audience** | Who you're really speaking to |
| **Core Values** | What your brand stands for, distilled |
| **Tone Attributes** | The personality behind every word you write |
| **Visual Direction** | The look and feel that should carry across your brand |
| **Editorial Guardrails** | What to avoid, so your voice stays consistent |

---

## 3. What's Coming to The Hive (roadmap / full platform preview)

**Section heading:**
```
This is just the beginning.
```

**Section subhead:**
```
Brand DNA is the first piece of The Hive — a full platform built to take
you from idea to live campaign, without switching tools or losing your team.
```

**Three roadmap cards** (clearly marked as upcoming — see implementation note below):

> **Run Multi-Channel Ads**
> Reach the right audience across Meta, Google, and LinkedIn with AI-assisted campaign execution. No more managing multiple platforms.

> **AI Creative Studio**
> Turn simple prompts into briefs, copy, designs, content, and campaigns — ready to launch.

> **Takeout Media On-Demand**
> Some things need an expert's touch. Work directly with an experienced creative team on campaigns, custom productions, and bespoke strategy.

**Supporting paragraph** (sits below the three cards, ties it together):
```
Good marketing takes people. Great marketing takes the right people and
the right tools. The Hive pairs experienced creatives with AI systems
built for speed, scale, and execution — so you can create campaigns,
reach the right audience, and grow your brand with a team invested in
your success.
```

**IMPLEMENTATION NOTE for this section specifically:**
Each of the three cards must carry a visible "Coming Soon" or "Up Next" tag/badge — these features are not live in this build. Only Brand DNA is functional today. Do not let this section's styling make these cards look clickable or available; visually de-emphasize them slightly versus the hero CTA (e.g. muted border, no hover-as-button state, small upcoming badge in the corner).

---

## 4. Closing CTA

**Headline:**
```
Your next campaign starts here.
```

**Subhead:**
```
Build a brand your audience can't forget. Start with your free Brand DNA —
the first step in moving faster and going further with The Hive.
```

**CTA button:**
```
Get Started Today →
```
*(same destination as hero CTA — routes to `/brand-dna`)*

---

## Tone & Visual Notes

- Keep all copy as written — this has been approved, don't paraphrase or "improve" it
- Visual system: dark background (`#0D0D0D`), primary accent `#E84210`, headline font Bricolage Grotesque, body font DM Sans — consistent with the rest of the app
- The hero and closing CTA should look identical in visual weight (same button style) — they're the only two real conversion points on the page
- Section 3 (roadmap) should read as exciting but clearly not-yet-available — the goal is to build anticipation for The Hive, not confuse visitors about what they can use right now
