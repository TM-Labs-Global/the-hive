import { BrandDNA } from "@/types/brand-dna"

export function renderBrandDNAMarkdown(dna: BrandDNA, brandName: string): string {
  const findingsList = dna.findings.map((f) => `* ${f}`).join("\n")
  const competitorsRows = dna.competitors
    .map(
      (c) =>
        `| **${c.name}** | ${c.coverage} | ${c.serviceAnalysis} | ${c.edge} | ${c.differentiation} |`
    )
    .join("\n")
  const neighboursRows = dna.aspirationalNeighbours
    .map(
      (n) =>
        `| **${n.name}** | ${n.coverage} | ${n.sectors} | ${n.edge} | ${n.shareOfVoice} |`
    )
    .join("\n")
  const diffs = dna.differentiators
    .map((d) => `### ${d.title}\n${d.description}`)
    .join("\n\n")
  const targetSegmentsRows = dna.targetSegments
    .map(
      (s) =>
        `| **${s.segment}** | ${s.whoTheyAre} | ${s.howTheyComeIn} | ${s.whatWeOffer} |`
    )
    .join("\n")

  const journeys = dna.customerJourney
    .map(
      (j) => `### ${j.segment}
* **Awareness:** ${j.stages.awareness.join(", ")}
* **Consideration:** ${j.stages.consideration.join(", ")}
* **Conversion:** ${j.stages.conversion.join(", ")}
* **Retention:** ${j.stages.retention.join(", ")}`
    )
    .join("\n\n")

  const outlook = dna.brandOutlook.map((o) => `* ${o}`).join("\n")
  const steps = dna.strategicSteps.map((s) => `* ${s}`).join("\n")
  const taglines = dna.taglineOptions
    .map((t) => `* **"${t.tagline}"** — ${t.rationale}`)
    .join("\n")
  const personality = dna.brandPersonality
    .map((p) => `* **${p.trait}:** ${p.description}`)
    .join("\n")
  const voice = dna.brandVoice
    .map((v) => `* **${v.attribute}:** ${v.description}`)
    .join("\n")
  const culture = dna.brandCulture
    .map((c) => `* **${c.value}:** ${c.description}`)
    .join("\n")
  const guardrails = dna.doNotSay.map((g) => `- Avoid ${g}`).join("\n")

  return `# BRAND STRATEGY DOCUMENT — ${brandName.toUpperCase()}

Generated on: ${new Date().toLocaleDateString()}
Prepared by: The Hive Brand Strategist AI

---

## Methodology

This strategy document was compiled based on our interactive brand discovery framework. The discovery analyzes the core drivers of your company, synthesizing them into:
1. **The Business Strategy:** Outlining target customer journeys, competitor positioning, and long-term milestones.
2. **The Brand Strategy:** Defining core values, voice, archetypes, and narrative guardrails.

---

# Part 1: The Business Strategy

## 1. Our Findings & Ecosystem Context
${findingsList}

---

## 2. Competitor Analysis

| Competitor | Geographical Coverage | Service Analysis | Market Edge | Differentiation |
| :--- | :--- | :--- | :--- | :--- |
${competitorsRows}

---

## 3. Aspirational Neighbours

| Brand | Geographical Coverage | Sectors Invested In | Market Edge | Share of Voice |
| :--- | :--- | :--- | :--- | :--- |
${neighboursRows}

---

## 4. Brand Differentiation & USPs
${diffs}

---

## 5. Target Market Segmentation

| Stakeholder / Segment | Who They Are | How They Come In | What We Offer |
| :--- | :--- | :--- | :--- |
${targetSegmentsRows}

---

## 6. Proposed Customer Journey
${journeys}

---

## 7. Brand Outlook & Long-Term Milestones (5 – 10 Years)
${outlook}

---

## 8. Strategic Steps to Achieve Success
${steps}

---

# Part 2: The Brand Strategy

## 1. The One Thing
The brand's singular defining idea is: **"${dna.oneThing}"**

${dna.brandVoiceText}

---

## 2. Brand Purpose
${dna.brandPurpose}

---

## 3. Brand Promise
* **For Customers / MSMEs / Users:** ${dna.brandPromise.msmes}
* **For Intermediaries & Channels:** ${dna.brandPromise.intermediaries}
* **For Backers, Investors & Partners:** ${dna.brandPromise.investors}

---

## 4. Brand Vision
${dna.brandVision}

---

## 5. Brand Mission
${dna.brandMission}

---

## 6. Brand Positioning Statement
> **${dna.positioningStatement}**

---

## 7. Brand Archetype Framework

### Primary Archetype: ${dna.brandArchetype.primary.name} (70%)
* **Overview:** ${dna.brandArchetype.primary.overview}
* **Core Desire:** ${dna.brandArchetype.primary.coreDesire}
* **Philosophy:** ${dna.brandArchetype.primary.philosophy}
* **Traits:** ${dna.brandArchetype.primary.traits.join(", ")}
* **Behaviour:** ${dna.brandArchetype.primary.behaviour}

### Supporting Archetype: ${dna.brandArchetype.secondary.name} (30%)
* **Overview:** ${dna.brandArchetype.secondary.overview}
* **Core Desire:** ${dna.brandArchetype.secondary.coreDesire}
* **Philosophy:** ${dna.brandArchetype.secondary.philosophy}
* **Traits:** ${dna.brandArchetype.secondary.traits.join(", ")}
* **Behaviour:** ${dna.brandArchetype.secondary.behaviour}

---

## 8. Brand Personality
${personality}

---

## 9. Brand Voice & Tone
${voice}

---

## 10. Brand Culture
${culture}

---

## 11. Tagline Options
${taglines}

---

## 12. Visual Identity & Creative Direction
${dna.visualDirection}

---

## 13. Editorial Guardrails (What NOT to Say)
${guardrails}

---
© ${new Date().getFullYear()} The Hive. All rights reserved.
`
}

