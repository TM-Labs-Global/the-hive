export interface CompetitorDetail {
  name: string
  coverage: string
  serviceAnalysis: string
  edge: string
  differentiation: string
}

export interface AspirationalNeighbourDetail {
  name: string
  coverage: string
  sectors: string
  edge: string
  shareOfVoice: string
}

export interface TargetSegmentDetail {
  segment: string
  whoTheyAre: string
  howTheyComeIn: string
  whatWeOffer: string
}

export interface CustomerJourneyStages {
  awareness: string[]
  consideration: string[]
  conversion: string[]
  retention: string[]
}

export interface CustomerJourneyDetail {
  segment: string
  stages: CustomerJourneyStages
}

export interface ArchetypeDetail {
  name: string
  percentage: number
  overview: string
  coreDesire: string
  philosophy: string
  traits: string[]
  behaviour: string
}

export interface BrandDNA {
  // Part 1: The Business
  findings: string[]
  competitors: CompetitorDetail[]
  aspirationalNeighbours: AspirationalNeighbourDetail[]
  differentiators: { title: string; description: string }[]
  targetSegments: TargetSegmentDetail[]
  customerJourney: CustomerJourneyDetail[]
  brandOutlook: string[]
  strategicSteps: string[]

  // Part 2: The Brand
  oneThing: string
  brandPurpose: string
  brandPromise: {
    msmes: string
    intermediaries: string
    investors: string
  }
  brandVision: string
  brandMission: string
  positioningStatement: string
  brandArchetype: {
    primary: ArchetypeDetail
    secondary: ArchetypeDetail
  }
  taglineOptions: { tagline: string; rationale: string }[]
  brandPersonality: { trait: string; description: string }[]
  brandVoice: { attribute: string; description: string }[]
  brandCulture: { value: string; description: string }[]
  
  // Backwards compatibility / Shared
  tagline: string              // Derived/primary tagline
  brandVoiceText: string        // 2-3 sentences overview (formerly brandVoice)
  toneAttributes: string[]
  visualDirection: string
  doNotSay: string[]
}

export type BrandDNASetupPath = "import" | "manual" | "questionnaire"
