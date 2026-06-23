export interface BrandDNA {
  brandVoice: string;          // 2-3 sentence description of tone/personality
  tagline: string;
  targetAudience: string;
  coreValues: string[];
  toneAttributes: string[];    // e.g. ["confident", "playful", "direct"]
  visualDirection: string;     // free-text description of colors/typography matching the brand
  doNotSay: string[];          // phrases/tones to avoid
}

export type BrandDNASetupPath = "import" | "manual"
