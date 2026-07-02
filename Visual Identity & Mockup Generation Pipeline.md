# The Hive — Brand DNA Waitlist MVP Documentation

Welcome to the documentation for **The Hive's Brand DNA Waitlist MVP**. This document provides an exhaustive, end-to-end technical explanation of how the platform is structured, how data flows through the system, and how the various frontend and backend components interact.

---

## 1. Overview & Purpose

The **Brand DNA Waitlist MVP** is a standalone validation platform designed to run A/B funnel tests. The objective is to validate user demand for The Hive’s core concept—*"provide a link or description, receive a structured Brand DNA guidelines profile"*—before committing to building a multi-tenant, fully integrated workspace.

### Key Characteristics & Recent Architecture Upgrades
* **AI-Powered Discovery Workbook Pre-fill**: The MVP has been upgraded to a 4-stage funnel. Instead of going directly from input to generation, users are presented with a **16-question, 5-act brand discovery questionnaire**. To minimize form friction, a background extraction step scrapes the provided website (or analyzes the manual description) and uses an LLM to pre-fill draft responses for the workbook, allowing the user to review, edit, and tailor their answers.
* **Zero Authentication**: No sign-in or session management (no NextAuth). Anyone can enter their email and submit a brand to get a strategy document.
* **Full-Stack in Next.js**: Front-end UI components and server-side API endpoints are bundled together inside this single Next.js codebase.
* **Database-Backed Strategy Storage**: Strategy files are now saved directly in the database (`rawMarkdown` and `dnaJson` columns in Postgres). The downloader endpoint dynamically generates and streams the strategy document from the database (falling back to local disk only for legacy files). This ensures compatibility with ephemeral cloud filesystems like Vercel.
* **External Integrations**: Incorporates LLM generation (DeepSeek API) and online booking (Microsoft Bookings) for strategic consultation.
* **Timeout & Cold Start Optimizations**: Heavy node modules like JSDOM and Mozilla Readability have been pruned to prevent ESM/CommonJS Vercel compilation crashes. Endpoints configure a 60-second execution time limits to prevent Vercel Hobby tier 10s timeout errors.

---

## 2. Directory Structure

The project strictly follows the structure defined in [agents.md](file:///Users/user/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/hive-frontend-main/agents.md):

```
├── app/                              # Next.js App Router route entries
│   ├── (waitlist)/                   # Route group for the public funnel
│   │   ├── brand-dna/
│   │   │   └── page.tsx              # Renders the generate flow container page
│   │   ├── layout.tsx                # General layout containing header/footer
│   │   └── page.tsx                  # Landing / A/B flyer page
│   ├── api/                          # Serverless Next.js API endpoints
│   │   ├── brand-dna/
│   │   │   ├── download/
│   │   │   │   └── route.ts          # GET - Streams strategy markdown file from database
│   │   │   ├── generate/
│   │   │   │   └── route.ts          # POST - Compiles workbook answers, runs LLM pipeline
│   │   │   └── scrape/
│   │   │       └── route.ts          # POST - [NEW] Scrapes input and pre-fills workbook answers via LLM
│   │   └── waitlist/
│   │       └── route.ts              # POST - Stores/updates waitlist signup & workbook answers
│   ├── globals.css                   # Custom global CSS configuration & fonts
│   └── layout.tsx                    # Root HTML layout & font definitions
├── components/                       # Interactive React components
│   ├── pages/                        # Component sets scoped by route page
│   │   ├── landing/
│   │   │   └── landing-page.tsx      # Main landing layout with client logos marquee
│   │   └── waitlist-brand-dna/       # Interactive stages of DNA creation
│   │       ├── components/
│   │       │   ├── dna-summary-card.tsx # Displays generated DNA with Business & Brand strategy tabs
│   │       │   ├── generating-step.tsx  # Animated multi-stage loading interface
│   │       │   ├── input-step.tsx       # Intake form for email & website/text
│   │       │   ├── questionnaire-step.tsx # [NEW] 16-question, 5-act brand discovery workbook
│   │       │   └── result-step.tsx      # Success layout containing download & booking CTAs
│   │       └── page-ui.tsx           # Multi-step state machine orchestrator (Steps 1-4)
│   ├── ui/                           # Reusable UI primitives (buttons, cards, etc.)
│   └── theme-provider.tsx            # Theme provider wrapping children
├── hooks/                            # General utility hooks
│   ├── use-fetch.ts                  # Shared requestApi wrapper
│   └── use-mobile.ts                 # Window width check hook
├── lib/                              # Logic utilities & services
│   ├── db/
│   │   └── client.ts                 # Global PrismaClient instantiator
│   ├── extractors/                   # Scrapers mapping input to clean text
│   │   ├── manual-extractor.ts       # Validates and wraps user input texts
│   │   ├── resolve-extractor.ts      # Instantiates the correct Extractor
│   │   ├── types.ts                  # Type definitions for extractors
│   │   └── website-extractor.ts      # Lightweight regex-based clean HTML parser (No JSDOM/Readability)
│   ├── llm/
│   │   ├── brand-dna-prefill-prompt.ts # [NEW] Prompt for workbook questionnaire pre-fill
│   │   ├── brand-dna-prompt.ts       # Deep 2-part brand strategy generation prompt
│   │   └── deepseek-client.ts        # Client wrapping OpenAI SDK pointing to DeepSeek
│   ├── render/
│   │   └── brand-dna-markdown.ts     # String renderer parsing DNA JSON -> Markdown
│   ├── motion-trail.ts               # GSAP animations helper library
│   └── utils.ts                      # Class merging utility for Tailwind/shadcn
├── prisma/
│   └── schema.prisma                 # Schema definitions mapping database structure
├── types/                            # Domain and payload types
│   ├── brand-dna.ts                  # Target BrandDNA and Workbook payload interfaces
│   └── social-media.ts               # Selection templates for social integrations
```

---

## 3. Database Schema

The platform relies on a single relational table inside a Postgres database managed through Prisma in [schema.prisma](file:///Users/user/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/hive-frontend-main/prisma/schema.prisma):

```prisma
model WaitlistSignup {
  id                Int       @id @default(autoincrement())
  email             String
  sourceInput       String?   // Website URL or null for manual
  inputType         InputType
  status            JobStatus @default(PENDING)
  rawExtractedText  String?   @db.Text
  dnaJson           Json?     // Holds completed BrandDNA payload
  answersJson       Json?     // Interactive Discovery Workbook answers
  rawMarkdown       String?   @db.Text  // Rendered strategy Markdown document
  mdFileUrl         String?   // Relative downloader path: /api/brand-dna/download?id={id}
  isLikelyBusinessEmail Boolean   @default(false)
  faviconUrl        String?   // Inferred Google Favicon API URL
  errorMessage      String?   // Error traceback details if pipeline fails
  createdAt         DateTime  @default(now())
  completedAt       DateTime?
}

enum InputType {
  WEBSITE
  MANUAL
  QUESTIONNAIRE
}

enum JobStatus {
  PENDING
  EXTRACTING
  GENERATING
  DONE
  FAILED
}
```

---

## 4. End-to-End Pipeline & Data Flow

When a user triggers the generation process, data traverses through the following interactive pipeline:

```mermaid
sequenceDiagram
    autonumber
    actor Visitor as Web User
    participant Page as WaitlistBrandDNAPage
    participant API_W as POST /api/waitlist
    participant DB as Postgres (Prisma)
    participant API_S as POST /api/brand-dna/scrape
    participant Ext as website-extractor
    participant LLM as DeepSeek API
    participant API_G as POST /api/brand-dna/generate
    
    Visitor->>Page: Enters Email & website URL (or description)
    Page->>API_W: Submit email, input, and type
    API_W->>DB: Create waitlist record (status: PENDING, inputType: QUESTIONNAIRE)
    DB-->>API_W: Return Record ID
    API_W-->>Page: Return JSON: { success: true, id }
    
    Note over Page: Component transitions to Step 2 Loading state<br/>and triggers background pre-fill scrape
    
    Page->>API_S: Request scrape and pre-fill { inputType, sourceInput, signupId }
    alt is Website Input
        API_S->>Ext: extract(URL)
        Ext->>Ext: Fetch html and clean via regex
        Ext-->>API_S: Return clean text
    else is Manual Input
        API_S->>API_S: Use raw text input
    end
    
    API_S->>LLM: generatePrefillData(rawText)
    Note over LLM: Analyzes context and returns<br/>Workbook answers JSON
    LLM-->>API_S: Return answersJson
    API_S->>DB: Save rawExtractedText, answersJson (prefill)
    API_S-->>Page: Return JSON: { success: true, prefilledAnswers }
    
    Note over Page: Component transitions to Step 2 (QuestionnaireStep UI)<br/>pre-populated with answers. User completes/edits answers.
    
    Visitor->>Page: Clicks "Generate Brand Strategy"
    Page->>API_W: Save updated answersJson (id, email, answersJson)
    API_W->>DB: Update answersJson
    API_W-->>Page: Return success
    
    Note over Page: Component transitions to Step 3 (GeneratingStep UI)<br/>and fires generator API request
    
    Page->>API_G: Request strategy generation { id }
    API_G->>DB: Update status to GENERATING
    API_G->>API_G: Compile workbook responses + scraped text into context
    
    API_G->>LLM: generateBrandDNA(context)
    Note over LLM: Runs brand-dna-prompt and returns<br/>full 2-part Strategy JSON
    LLM-->>API_G: Return BrandDNA JSON object
    
    API_G->>API_G: Render Markdown document string
    API_G->>DB: Save dnaJson, rawMarkdown, set status to DONE
    API_G-->>Page: Return JSON: { success: true, data, fileUrl, brandName }
    
    Note over Page: Component transitions to Step 4 (ResultStep UI)<br/>and renders generated details in DNASummaryCard
    Visitor->>Page: Clicks "Download Brand DNA"
    Page->>Visitor: Redirects/Streams file download via GET /api/brand-dna/download
```

---

## 5. UI Stage Breakdown

The page [WaitlistBrandDNAPage](file:///Users/user/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/hive-frontend-main/components/pages/waitlist-brand-dna/page-ui.tsx) serves as the core state-machine orchestrator, rendering one of four distinct component states based on step state:

### Step 1: Input Intake (`input-step.tsx`)
* Renders a form requesting **Email Address** and a toggle tab:
  * **"I have a website"**: Accepts a site URL (e.g. `google.com`).
  * **"Describe your brand"**: Textarea requiring at least 10 characters.
* Client-side email validation checks for basic format `@`.
* If a previous generation attempts website extraction and fails with `FALLBACK_TO_MANUAL` (HTTP 422), it renders a warning banner alerting the user and auto-focuses the manual tab prefilled with whatever they tried to parse.

### Step 2: Discovery Workbook (`questionnaire-step.tsx`)
* A multi-act questionnaire wizard consisting of 16 questions divided into 5 distinct narrative acts:
  * **Act 1: The Origin (Why)**: Brand/business name, founding problem (pre-filled), and current business stage selection.
  * **Act 2: The People (Who)**: Target customer profile, aspirational neighbors (pre-filled), and direct competitors (pre-filled).
  * **Act 3: The Offer (What)**: Core offerings, core differentiator/advantage, and proposed customer journey.
  * **Act 4: The Character (Who Are You)**: Brand personality (exactly 3 keywords), tone of voice (exactly 3 keywords), dominant archetype selection (detailed list of 12 archetypes), and company culture (exactly 3 keywords).
  * **Act 5: The Future (Vision)**: 5-10 year future outlook, concrete 12-month strategic steps, and a core single-sentence brand promise.
* Prompts are pre-populated with AI-drafted responses received from the scraper API (`prefilledContext.prefilledAnswers`) to drastically reduce user typing friction.
* Tracks cumulative progress across slides and blocks navigation if requirements are not met (e.g. selecting exactly 3 chips).

### Step 3: Generating Loading (`generating-step.tsx`)
* A fullscreen card that blocks action during final strategy generation (~10–20 seconds).
* Displays a spinning indicator along with text updates that rotate sequentially to reduce perceived wait times:
  1. *Reading and fetching brand details...*
  2. *Extracting voice and positioning attributes...*
  3. *Writing your structured Brand DNA profile...*
  4. *Finalizing visual guidelines and guardrails...*

### Step 4: Results & Preview (`result-step.tsx`)
* Shows the user a success layout with two primary call-to-actions (CTAs):
  1. **Download Brand DNA (.md)**: Redirects browser requests to the download handler.
  2. **Book a Strategy Session**: Links to an external Microsoft Bookings scheduler page.
* Embedded inside this view is the [DNASummaryCard](file:///Users/user/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/hive-frontend-main/components/pages/waitlist-brand-dna/components/dna-summary-card.tsx) which lists a read-only preview of the generated strategy. It features a tab toggle allowing users to switch between:
  * **1. Business Strategy**: Insights, competitor matrices, aspirational neighbors, differentiators, target segments, customer journeys, brand outlook, and strategic milestones.
  * **2. Brand Strategy**: Brand purpose, promises, vision, mission, positioning statements, primary/secondary archetypes, personality traits, voice descriptors, culture values, taglines, visual direction, and editorial guardrails.

---

## 6. Deep Dive: Extraction Layer

All extractors conform to a standard Interface defined in [types.ts](file:///Users/user/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/hive-frontend-main/lib/extractors/types.ts):

```typescript
export interface ExtractorResult {
  rawText: string;
  sourceType: InputType;
  sourceUrl: string | null;
}

export interface Extractor {
  canHandle(input: string): boolean;
  extract(input: string): Promise<ExtractorResult>;
}
```

### 1. Website Extractor (`website-extractor.ts`)
* Automatically appends `https://` if not present.
* Dispatches a serverless `fetch` with standard browser headers to bypass base bot blockers.
* **Lightweight Custom Parsing**: Heavyweight node libraries (JSDOM and Readability) were removed to resolve Vercel CommonJS ESM interop compilation crashes and reduce cold start times. Instead, a custom `cleanHtml` regex utility is utilized to:
  * Strip `<script>` and `<style>` tags and their contents.
  * Remove HTML comments.
  * Replace block elements (`</p>`, `</div>`, `</h1>`, etc.) with newlines to preserve spacing.
  * Strip all other HTML tags.
  * Decode common HTML entities (e.g. `&nbsp;`, `&amp;`, `&quot;`).
  * Collapse multiple consecutive whitespaces and double newlines.
* Enforces a minimum content length of 100 non-whitespace characters to prevent feeding empty pages into the LLM.

### 2. Manual Extractor (`manual-extractor.ts`)
* Cleans up spaces and asserts input has at least 10 characters.
* Returns the text back to the pipeline instantly.

---

## 7. Deep Dive: LLM Engine (DeepSeek)

LLM interactions are managed through [deepseek-client.ts](file:///Users/user/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/hive-frontend-main/lib/llm/deepseek-client.ts):

* Uses the official `openai` npm package configured with DeepSeek's base URL (`https://api.deepseek.com`) and model (`deepseek-chat`).
* **Workbook Pre-fill Generation (`generatePrefillData`)**:
  * Utilizes [BRAND_DNA_PREFILL_SYSTEM_PROMPT](file:///Users/user/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/hive-frontend-main/lib/llm/brand-dna-prefill-prompt.ts) to extract and format workbook values.
  * Enforces a concise response format (1-2 sentences) matching fields: `businessName`, `foundingProblem`, `targetAudience`, `coreOfferings`, `differentiationText`, `brandPromiseText`.
* **Brand Strategy Generation (`generateBrandDNA`)**:
  * System instructions [BRAND_DNA_SYSTEM_PROMPT](file:///Users/user/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/hive-frontend-main/lib/llm/brand-dna-prompt.ts) enforce returning raw JSON matching the expanded `BrandDNA` interface.
  * Generates utilizing `response_format: { type: "json_object" }` to ensure structural validity.
  * An explicit schema validator checks the model's output for 25 required keys (e.g. `findings`, `competitors`, `brandArchetype`, etc.). If any key is missing, it raises an error to fail loud rather than let UI states degrade.

---

## 8. Generation, Scraping & Streaming APIs

The platform defines route handlers matching the backend functionality:

### 1. Waitlist Registration (`POST /api/waitlist`)
* Evaluates if the signup email is a business email rather than a common consumer provider (e.g. Gmail/Yahoo).
* Resolves the target domain from the website input and constructs a Google Favicon URL `https://www.google.com/s2/favicons?domain={domain}&sz=128`.
* Inserts a record into the Postgres database with status `PENDING`. If `id` is provided, it updates the existing record with the discovery workbook's `answersJson`.

### 2. Intake Extraction (`POST /api/brand-dna/scrape`)
* Triggered in Step 2 Loading state.
* Resolves and runs the website or manual extractor to collect source text.
* Calls `generatePrefillData` to obtain AI-powered prefill workbook responses.
* Updates the Postgres waitlist record with `rawExtractedText` and `answersJson`.

### 3. Generator Pipeline (`POST /api/brand-dna/generate`)
* Handles orchestration of compilation, LLM generation, document rendering, and persistence:
* Reads record -> updates status to `GENERATING` -> compiles questionnaire responses and background scraped text into a single prompt context.
* Calls DeepSeek strategy engine to generate the 2-part strategy profile.
* Derives a clean name from the workbook answers, website URL, or email domain.
* Converts JSON details into markdown via [brand-dna-markdown.ts](file:///Users/user/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/hive-frontend-main/lib/render/brand-dna-markdown.ts).
* Updates the DB record to status `DONE`, storing the strategy JSON in `dnaJson` and the markdown text in `rawMarkdown`.
* Configures `export const maxDuration = 60` to handle long-running LLM generation and scrape requests on Vercel without throwing 10-second timeout limits.

### 4. File Downloader (`GET /api/brand-dna/download`)
* Accepts an `id` parameter.
* Resolves the clean name to output a custom filename (e.g., `brandname-brand-strategy.md` instead of a generic ID sequence).
* Reads markdown strategy directly from the database `rawMarkdown` field (falls back to checking local disk under `public/generated-dna/{id}.md` for dev backwards compatibility).
* Streams the payload using HTTP content headers:
  ```typescript
  return new Response(Buffer.from(markdown, "utf-8"), {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/markdown; charset=utf-8",
    },
  })
  ```

---

## 9. Environment Configuration

To run the application locally or in production, configure the following keys in your `.env` file:

```env
# Database connection string to Postgres (Neon or Vercel Postgres)
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?sslmode=require&connect_timeout=60&pool_timeout=60"

# LLM API Authentication Keys
DEEPSEEK_API_KEY="sk-..."
OPENAI_API_KEY="sk-..."
GOOGLE_API_KEY="AI..." # Optional - fallback to OpenAI if omitted

# Email Notifications Configuration
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="The Hive <hello@takeoutmedia.xyz>"

# Asset Upload Storage
BLOB_READ_WRITE_TOKEN="..." # Optional - falls back to local disk in dev

# Upstash QStash Webhook Queue
QSTASH_TOKEN="..." # Optional - executes synchronously in dev if omitted
```

---

## 10. Deep Dive: Visual Identity & Mockup Generation Pipeline

The **Brand Visual Identity & Mockup Pipeline** is an automated design system that processes the generated Brand DNA, infers an accessible design language, generates custom logo marks and Stock-Style value illustrations, and composites those assets onto real-world photographic mockup scenes.

### 1. Database Schema Additions
Two new tables are introduced in Prisma to manage templates and client asset results:
* **`BrandVisualIdentity`**: Stores color palettes, typography specs, primary logo marks, editorial values illustrations, and composited mockups for a specific waitlist user.
* **`MockupTemplate`**: Stores base image URLs (e.g. Unsplash stock photos), layout overlays (`xPct`, `yPct`, `widthPct` logo zones), and color tint settings.

### 2. Information Flow & Mapping from Brand DNA
The generation process maps abstract brand traits into concrete styling tokens in [process-guideline/route.ts](file:///Users/user/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/hive-frontend-main/app/api/brand-dna/process-guideline/route.ts):

```mermaid
graph TD
    DNA[Brand DNA JSON] --> Classify[DeepSeek Archetype Classifier]
    Classify --> Archetype[Archetype Cluster key]
    Archetype --> Color[DeepSeek Primary Color generation]
    Color --> WCAG[WCAG 2.1 Contrast validation]
    WCAG --> AdjustedColor[Accessible Brand Color Hex]
    Archetype --> Font[Typography pairing lookup]
    AdjustedColor --> LogoPrompt[Imagen/DALL-E Prompt compiler]
    Font --> Typography[Heading/Body Google Fonts]
```

#### Archetype Cluster Classification
DeepSeek analyzes the brand tagline, personality traits, and tone words, classifying it into one of 5 distinct visual directions:
1. `agro_earth`: Organic, rustic (warm earthy tones, green, terracotta).
2. `corporate_trust`: Stable, professional (deep blues, teals, dark slate).
3. `bold_consumer`: Energetic, modern (vibrant red, orange, hot purple).
4. `premium_luxury`: Elegant, elite (champagne gold, dark emerald, rich plum, black).
5. `tech_minimal`: Futuristic, clean (cool gray, electric blue, monochrome).

#### Color & Typography Presets
* **Color Generation**: DeepSeek generates a primary brand color. The code converts the hex code to RGB relative luminance and checks WCAG 2.1 contrast ratios against black (`#000000`) and white (`#ffffff`). If the contrast ratio is under 4.5:1 (a mid-tone), the code darkens it to pass contrast.
* **Font Pairings**: Selects a Google Fonts pair based on the cluster:
  * `tech_minimal` -> Space Grotesk (Heading) & Inter (Body).
  * `premium_luxury` -> Fraunces (Heading) & Inter (Body).
  * `agro_earth` -> DM Serif Display (Heading) & DM Sans (Body).

### 3. Asset Generation & Fallback (OpenAI `gpt-image-2`)
All visual assets are generated via [openai-client.ts](file:///Users/user/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/hive-frontend-main/lib/llm/openai-client.ts):
* **Logo Mark Generation**: Prompt compiled from brand core values. Renders a minimalist flat vector app icon.
* **Values Stock Imagery**: 3 photographic illustrations representing each of the brand culture values.
* **Direct Base64 Response**: Calls the `gpt-image-2` endpoint. Reads the direct `b64_json` base64 image data payload returned in the response directly in-memory, bypassing external network fetches.
* **Programmatic Vector Fallback**: If the OpenAI key is missing or restricted, the system programmatically compiles a custom SVG vector image containing the brand initials and color block, converts it to a PNG buffer via `sharp`, and saves it locally. This guarantees the pipeline **never crashes**.

### 4. Compositing Pipeline (Sharp)
Mockups are constructed dynamically in [mockup-compositor.ts](file:///Users/user/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/hive-frontend-main/lib/visualIdentity/mockup-compositor.ts):
* Loads the base mockup image (from the database `MockupTemplate` records).
* If `tintEnabled` is true, applies the brand color tint to the base image using `sharp.tint()`.
* Resizes the logo PNG to match the target template's width parameters (`widthPct`).
* Overlays the logo at the template's specified offsets (`xPct`, `yPct`) using `sharp.composite()` and outputs the compiled PNG.

### 5. Potential Engineering Optimization & Improvement Areas
To scale and optimize the visual identity output quality, engineers can investigate:
1. **Logo Vectorization**: Trace the generated PNG logo marks to true SVG curves (using libraries like `potrace`) to allow infinite scaling.
2. **Mockup Masking**: Use alpha channels/PSD transparency masks in the compositing process instead of simple flat coordinate overlays to create 3D texture wrapping (folds on clothing, reflections on plastic).
3. **Asset Caching**: Move generated local assets to a global CDN/Edge cache to reduce load on Postgres/disk storage.
4. **QStash Retries**: Set up dead-letter-queues in Upstash for handling transient LLM/Image generation rate limits.

