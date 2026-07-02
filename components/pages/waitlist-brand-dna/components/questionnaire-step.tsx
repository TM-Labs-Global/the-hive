"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, ArrowLeft, Check, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const PERSONALITY_WORDS = [
  "Determined", "Bold", "Commanding", "Visionary", "Authoritative", "Transformative",
  "Approachable", "Courageous", "Knowledgeable", "Analytical", "Resilient", "Disruptive",
  "Thoughtful", "Charismatic", "Organized"
]

const VOICE_WORDS = [
  "Wise", "Confident", "Responsible", "Powerful", "Honest", "Persuasive", "Fearless",
  "Structured", "Informed", "Defiant", "Provocative", "Genuine", "Unconventional", "Reflective"
]

const ARCHETYPES = [
  { name: "Hero", description: "Wants to prove worth through courage and difficult action. Helps others achieve mastery." },
  { name: "Everyman", description: "Believes everyone deserves a fair shot. Accessible, down-to-earth, genuine, and inclusive." },
  { name: "Creator", description: "Driven by the desire to build something new, beautiful, and of enduring value." },
  { name: "Ruler", description: "Stands for control, leadership, and order. Creates order out of chaos." },
  { name: "Innocent", description: "Exudes optimism, trust, safety, and simplicity. Focuses on pure goodness." },
  { name: "Sage", description: "Seeks truth, knowledge, and wisdom. Guided by understanding and teaching." },
  { name: "Explorer", description: "Values freedom, self-discovery, and autonomy. Pushes boundary limits." },
  { name: "Outlaw / Rebel", description: "Disrupts standard rules and fights against conforming. Drives revolution." },
  { name: "Magician", description: "Wants to make dreams come true and create transformation. Acts as a catalyst." },
  { name: "Lover", description: "Focuses on building intimate connections and appreciation. Inspires passion." },
  { name: "Jester", description: "Strives to bring joy, playfulness, and humor. Breaks rules lightly." },
  { name: "Caregiver", description: "Dedicated to protecting and caring for others. Warm, nurturing, and supportive." }
]

const CULTURE_WORDS = [
  "Excellence", "Innovation", "Discipline", "Achievement", "Inclusivity", "Leadership",
  "Learning", "Nonconformity", "Teamwork", "Responsibility", "Truthful", "Freedom",
  "Disruption", "Order", "Empowerment"
]

interface Question {
  id: string
  label: string
  type: "text" | "textarea" | "select" | "personality-chips" | "voice-chips" | "archetype-select" | "culture-chips"
  placeholder?: string
  options?: string[]
  description?: string
}

interface ActData {
  title: string
  subtitle: string
  questions: Question[]
}

interface QuestionnaireStepProps {
  onSubmit: (answers: Record<string, any>) => void
  isLoading: boolean
  prefilledContext?: {
    rawScrapedText?: string
    inferredBrandName?: string
    inferredDescription?: string
    prefilledAnswers?: Record<string, any>
  }
}

export function QuestionnaireStep({ onSubmit, isLoading, prefilledContext }: QuestionnaireStepProps) {
  const [act, setAct] = React.useState<1 | 2 | 3 | 4 | 5>(1)
  const [slide, setSlide] = React.useState(0)

  // Questionnaire responses state
  const [answers, setAnswers] = React.useState<Record<string, any>>({
    businessName: "",
    foundingProblem: "",
    businessStage: "Early Growth / Seeded",
    targetAudience: "",
    aspirationalNeighboursText: "Apple, Stripe (known for simplicity and premium design)",
    competitorsText: "Traditional alternatives and legacy solutions in our space.",
    coreOfferings: "",
    differentiationText: "",
    proposedJourney: "Customers discover us online, select our service for its transparency, and stay because of our reliable support.",
    selectedPersonalityWords: ["Visionary", "Bold", "Approachable"],
    selectedVoiceWords: ["Confident", "Genuine", "Wise"],
    dominantArchetype: "Hero",
    selectedCultureWords: ["Innovation", "Empowerment", "Truthful"],
    futureOutlook: "To become the leading and most trusted solution in our industry globally.",
    strategicSteps: "Launch product iterations, expand marketing campaigns, and sign key strategic partnerships.",
    brandPromiseText: ""
  })

  // Prefill when context is available
  React.useEffect(() => {
    if (prefilledContext) {
      setAnswers((prev) => {
        const prefilled = prefilledContext.prefilledAnswers || {}
        return {
          ...prev,
          businessName: prefilled.businessName || prefilledContext.inferredBrandName || prev.businessName,
          foundingProblem: prefilled.foundingProblem || prefilledContext.inferredDescription || prev.foundingProblem,
          businessStage: prefilled.businessStage || prev.businessStage,
          targetAudience: prefilled.targetAudience || prev.targetAudience,
          aspirationalNeighboursText: prefilled.aspirationalNeighboursText || prev.aspirationalNeighboursText,
          competitorsText: prefilled.competitorsText || prev.competitorsText,
          coreOfferings: prefilled.coreOfferings || prev.coreOfferings,
          differentiationText: prefilled.differentiationText || prev.differentiationText,
          proposedJourney: prefilled.proposedJourney || prev.proposedJourney,
          selectedPersonalityWords: prefilled.selectedPersonalityWords || prev.selectedPersonalityWords,
          selectedVoiceWords: prefilled.selectedVoiceWords || prev.selectedVoiceWords,
          dominantArchetype: prefilled.dominantArchetype || prev.dominantArchetype,
          selectedCultureWords: prefilled.selectedCultureWords || prev.selectedCultureWords,
          futureOutlook: prefilled.futureOutlook || prev.futureOutlook,
          strategicSteps: prefilled.strategicSteps || prev.strategicSteps,
          brandPromiseText: prefilled.brandPromiseText || prev.brandPromiseText,
        }
      })
    }
  }, [prefilledContext])

  const updateAnswer = (key: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  const handleChipSelect = (key: "selectedPersonalityWords" | "selectedVoiceWords" | "selectedCultureWords", word: string) => {
    const list = [...(answers[key] as string[])]
    const idx = list.indexOf(word)
    if (idx > -1) {
      list.splice(idx, 1)
    } else {
      if (list.length < 3) {
        list.push(word)
      }
    }
    updateAnswer(key, list)
  }

  // Questions configuration by Act
  const acts: ActData[] = [
    {
      title: "Act 1: The Origin (Why)",
      subtitle: "Let's capture the founding spark of your initiative",
      questions: [
        {
          id: "businessName",
          label: "What is the name of your brand or business?",
          placeholder: "e.g. YEIB Investment Fund",
          type: "text"
        },
        {
          id: "foundingProblem",
          label: "What frustrations, signals, or market gaps led to the creation of this brand?",
          placeholder: "Describe the moment someone said 'this needs to exist.' What were they seeing that was missing or broken?",
          type: "textarea"
        },
        {
          id: "businessStage",
          label: "What stage is your business currently in?",
          type: "select",
          options: ["Pre-revenue / Idea Stage", "Early Growth / Seeded", "Established / Scaling"]
        }
      ]
    },
    {
      title: "Act 2: The People (Who)",
      subtitle: "Understand who you built this for and who challenges you",
      questions: [
        {
          id: "targetAudience",
          label: "Describe the primary customer persona you built this for.",
          placeholder: "Give them a name or a clear profile. What is their main frustration and what does success look like for them?",
          type: "textarea"
        },
        {
          id: "aspirationalNeighboursText",
          label: "Who are your aspirational neighbours?",
          placeholder: "Name 2-3 brands inside or outside finance/business that you admire. What specifically do you like about them?",
          type: "textarea",
          description: "Aspirational neighbors are brands (in any industry) whose styling, design language, tone of voice, or overall customer experience you admire and want to emulate. For example, if you want your product to feel as simple and premium as Apple or Stripe."
        },
        {
          id: "competitorsText",
          label: "Who are your direct competitors or alternatives?",
          placeholder: "Who else is serving your target market? What are they doing well, and where are they failing or missing the mark?",
          type: "textarea"
        }
      ]
    },
    {
      title: "Act 3: The Offer (What)",
      subtitle: "Outline your core offerings and your unique differentiator",
      questions: [
        {
          id: "coreOfferings",
          label: "What are you offering the market?",
          placeholder: "List your core products, services, or structural instruments (e.g. direct equity, guarantees, mentorship).",
          type: "textarea"
        },
        {
          id: "differentiationText",
          label: "What is your core differentiator or 'unfair advantage'?",
          placeholder: "What structural features or experience do you offer that competitors cannot easily copy?",
          type: "textarea"
        },
        {
          id: "proposedJourney",
          label: "Describe your customer's proposed journey.",
          placeholder: "How do customers first hear about you, decide to choose you, and stay engaged long-term?",
          type: "textarea"
        }
      ]
    },
    {
      title: "Act 4: The Character (Who Are You)",
      subtitle: "Define your personality, voice, archetype, and culture",
      questions: [
        {
          id: "selectedPersonalityWords",
          label: "Select exactly 3 words that best describe your brand's personality:",
          type: "personality-chips"
        },
        {
          id: "selectedVoiceWords",
          label: "Select exactly 3 words that best describe your brand's tone of voice:",
          type: "voice-chips"
        },
        {
          id: "dominantArchetype",
          label: "Which brand archetype resonates most with your mission?",
          type: "archetype-select"
        },
        {
          id: "selectedCultureWords",
          label: "Select exactly 3 words that reflect your internal company culture:",
          type: "culture-chips"
        }
      ]
    },
    {
      title: "Act 5: The Future (Vision)",
      subtitle: "Define what success looks like in the years ahead",
      questions: [
        {
          id: "futureOutlook",
          label: "What is your future-state outlook (5-10 years)?",
          placeholder: "What permanent changes do you want to establish in your industry or for your customers?",
          type: "textarea"
        },
        {
          id: "strategicSteps",
          label: "What concrete steps will you take in the next 12 months to prove progress?",
          placeholder: "E.g., Deploy cohorts, launch narrative campaigns, secure key institutional partnerships.",
          type: "textarea"
        },
        {
          id: "brandPromiseText",
          label: "What is your core brand promise in a single sentence?",
          placeholder: "e.g., Unlocking Pathways for Investable Businesses.",
          type: "textarea"
        }
      ]
    }
  ]

  const currentActData = acts[act - 1]
  const currentQuestion = currentActData.questions[slide]
  const totalSlidesInAct = currentActData.questions.length

  const handleNext = () => {
    // Validate selections for chips
    if (currentQuestion.type === "personality-chips" && answers.selectedPersonalityWords.length < 3) {
      alert("Please select exactly 3 personality words.")
      return
    }
    if (currentQuestion.type === "voice-chips" && answers.selectedVoiceWords.length < 3) {
      alert("Please select exactly 3 tone of voice words.")
      return
    }
    if (currentQuestion.type === "culture-chips" && answers.selectedCultureWords.length < 3) {
      alert("Please select exactly 3 culture words.")
      return
    }

    if (slide < totalSlidesInAct - 1) {
      setSlide((s) => s + 1)
    } else if (act < 5) {
      setAct((a) => (a + 1) as any)
      setSlide(0)
    } else {
      onSubmit(answers)
    }
  }

  const handleBack = () => {
    if (slide > 0) {
      setSlide((s) => s - 1)
    } else if (act > 1) {
      setAct((a) => (a - 1) as any)
      setSlide(acts[act - 2].questions.length - 1)
    }
  }

  // Calculate cumulative progress
  const getProgressPercentage = () => {
    let completedQuestions = 0
    for (let i = 0; i < act - 1; i++) {
      completedQuestions += acts[i].questions.length
    }
    completedQuestions += slide
    const totalQuestions = acts.reduce((sum, item) => sum + item.questions.length, 0)
    return Math.round((completedQuestions / totalQuestions) * 100)
  }

  return (
    <Card className="bg-white rounded-[2rem] p-8 md:p-12 shadow-2xl shadow-black/5 border-none w-full max-w-2xl mx-auto text-left relative overflow-hidden">
      {/* Top Banner Indicator */}
      <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
        <div>
          <span className="text-[10px] font-black text-brand uppercase tracking-widest block mb-1">
            {currentActData.title}
          </span>
          <h3 className="font-display text-sm font-bold text-muted-foreground">
            {currentActData.subtitle}
          </h3>
        </div>
        <div className="text-right">
          <span className="text-xs font-black text-brand font-mono">
            {getProgressPercentage()}% Complete
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted/40 h-2 rounded-full mb-8 overflow-hidden">
        <div
          className="bg-brand h-full transition-all duration-300 rounded-full"
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>

      {/* Question Slider Container */}
      <div className="min-h-[220px] flex flex-col justify-between mb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${act}-${slide}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <label className="text-base font-black text-foreground block leading-tight">
              {currentQuestion.label}
            </label>
            {currentQuestion.description && (
              <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                {currentQuestion.description}
              </p>
            )}

            {/* Render input types dynamically */}
            {currentQuestion.type === "text" && (
              <input
                type="text"
                className="w-full bg-muted/30 border-2 border-border rounded-2xl px-4 py-3 text-sm focus:border-brand outline-none transition-all text-foreground font-medium"
                placeholder={currentQuestion.placeholder}
                value={answers[currentQuestion.id] || ""}
                onChange={(e) => updateAnswer(currentQuestion.id, e.target.value)}
              />
            )}

            {currentQuestion.type === "textarea" && (
              <textarea
                className="w-full bg-muted/30 border-2 border-border rounded-2xl px-4 py-3 text-sm focus:border-brand outline-none transition-all resize-none text-foreground font-medium"
                placeholder={currentQuestion.placeholder}
                rows={5}
                value={answers[currentQuestion.id] || ""}
                onChange={(e) => updateAnswer(currentQuestion.id, e.target.value)}
              />
            )}

            {currentQuestion.type === "select" && (
              <div className="space-y-2">
                {currentQuestion.options?.map((opt: string) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => updateAnswer(currentQuestion.id, opt)}
                    className={cn(
                      "w-full border-2 p-4 rounded-2xl text-left text-sm font-bold transition-all flex items-center justify-between",
                      answers[currentQuestion.id] === opt
                        ? "border-brand bg-brand/5 text-brand"
                        : "border-border bg-muted/20 text-foreground hover:bg-muted/40"
                    )}
                  >
                    {opt}
                    {answers[currentQuestion.id] === opt && <Check size={16} />}
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === "personality-chips" && (
              <div className="space-y-3">
                <span className="text-xs text-muted-foreground font-bold block">
                  Select {3 - answers.selectedPersonalityWords.length} more words:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {PERSONALITY_WORDS.map((word) => {
                    const isSelected = answers.selectedPersonalityWords.includes(word)
                    return (
                      <button
                        key={word}
                        type="button"
                        onClick={() => handleChipSelect("selectedPersonalityWords", word)}
                        className={cn(
                          "py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-center whitespace-nowrap",
                          isSelected
                            ? "bg-brand border-brand text-white shadow-sm"
                            : "bg-muted/20 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        {word}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {currentQuestion.type === "voice-chips" && (
              <div className="space-y-3">
                <span className="text-xs text-muted-foreground font-bold block">
                  Select {3 - answers.selectedVoiceWords.length} more words:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {VOICE_WORDS.map((word) => {
                    const isSelected = answers.selectedVoiceWords.includes(word)
                    return (
                      <button
                        key={word}
                        type="button"
                        onClick={() => handleChipSelect("selectedVoiceWords", word)}
                        className={cn(
                          "py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-center whitespace-nowrap",
                          isSelected
                            ? "bg-brand border-brand text-white shadow-sm"
                            : "bg-muted/20 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        {word}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {currentQuestion.type === "culture-chips" && (
              <div className="space-y-3">
                <span className="text-xs text-muted-foreground font-bold block">
                  Select {3 - answers.selectedCultureWords.length} more words:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {CULTURE_WORDS.map((word) => {
                    const isSelected = answers.selectedCultureWords.includes(word)
                    return (
                      <button
                        key={word}
                        type="button"
                        onClick={() => handleChipSelect("selectedCultureWords", word)}
                        className={cn(
                          "py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-center whitespace-nowrap",
                          isSelected
                            ? "bg-brand border-brand text-white shadow-sm"
                            : "bg-muted/20 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        {word}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {currentQuestion.type === "archetype-select" && (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {ARCHETYPES.map((arch) => (
                  <button
                    key={arch.name}
                    type="button"
                    onClick={() => updateAnswer("dominantArchetype", arch.name)}
                    className={cn(
                      "w-full border-2 p-4 rounded-2xl text-left transition-all flex flex-col gap-1",
                      answers.dominantArchetype === arch.name
                        ? "border-brand bg-brand/5 text-brand"
                        : "border-border bg-muted/20 text-foreground hover:bg-muted/40"
                    )}
                  >
                    <span className="text-sm font-black flex items-center justify-between w-full">
                      {arch.name}
                      {answers.dominantArchetype === arch.name && <Check size={16} />}
                    </span>
                    <span className="text-xs text-muted-foreground leading-normal font-medium">
                      {arch.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between border-t border-border pt-6">
        <Button
          type="button"
          variant="secondary"
          onClick={handleBack}
          disabled={act === 1 && slide === 0}
          className="h-12 border-border text-muted-foreground hover:text-foreground rounded-xl flex items-center gap-1.5 font-bold transition-all disabled:opacity-50"
        >
          <ArrowLeft size={16} /> Back
        </Button>

        <Button
          type="button"
          disabled={isLoading}
          onClick={handleNext}
          className="h-12 bg-brand hover:bg-brand-dark text-white rounded-xl flex items-center gap-1.5 font-black transition-all shadow-md shadow-brand/10 disabled:opacity-50"
        >
          {act === 5 && slide === totalSlidesInAct - 1 ? (
            <>
              Generate Brand Strategy <Sparkles size={16} />
            </>
          ) : (
            <>
              Next <ArrowRight size={16} />
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
