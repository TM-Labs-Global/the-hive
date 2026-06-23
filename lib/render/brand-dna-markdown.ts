import { BrandDNA } from "@/types/brand-dna"

export function renderBrandDNAMarkdown(dna: BrandDNA, brandName: string): string {
  return `# Brand DNA Profile — ${brandName}
Generated on: ${new Date().toLocaleDateString()}
Powered by The Hive

---

## 1. Brand Essence

### Tagline / Slogan
> **${dna.tagline}**

### Brand Voice & Personality
${dna.brandVoice}

---

## 2. Target Audience & Market Positioning

### Ideal Customer Profile
${dna.targetAudience}

### Tone Attributes
${dna.toneAttributes.map((attr) => `- **${attr.charAt(0).toUpperCase() + attr.slice(1)}**`).join("\n")}

---

## 3. Core Values
${dna.coreValues.map((val) => `- **${val}**`).join("\n")}

---

## 4. Visual Identity Guidelines

### Creative & Visual Direction
${dna.visualDirection}

---

## 5. Editorial Guardrails

### What NOT to Say / Avoid
${dna.doNotSay.map((topic) => `- Avoid ${topic}`).join("\n")}

---
© ${new Date().getFullYear()} The Hive. All rights reserved.
`
}
