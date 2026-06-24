# The Hive — Brand DNA Waitlist MVP Documentation

Welcome to the documentation for **The Hive's Brand DNA Waitlist MVP**. This document provides an exhaustive, end-to-end technical explanation of how the platform is structured, how data flows through the system, and how the various frontend and backend components interact.

---

## 1. Overview & Purpose

The **Brand DNA Waitlist MVP** is a standalone validation platform designed to run A/B funnel tests. The objective is to validate user demand for The Hive’s core concept—*"provide a link or description, receive a structured Brand DNA guidelines profile"*—before committing to building a multi-tenant, fully integrated workspace.

### Key Characteristics
* **Zero Authentication**: No sign-in or session management (no NextAuth). Anyone can enter their email and submit a brand to get a report.
* **Full-Stack in Next.js**: Front-end UI components and server-side API endpoints are bundled together inside this single Next.js codebase.
* **Local Storage & Offline Delivery**: Reports are generated in Markdown format (`.md`), written to the server's public file directory, and served to the user for instant download.
* **External Integrations**: Incorporates LLM generation (DeepSeek API) and online booking (Microsoft Bookings) for strategic consultation.

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
│   │   │   │   └── route.ts          # GET - Streams custom named markdown file
│   │   │   └── generate/
│   │   │   │   └── route.ts          # POST - Runs extractor & LLM pipeline
│   │   └── waitlist/
│   │       └── route.ts              # POST - Stores initial waitlist signup
│   ├── globals.css                   # Custom global Tailwind configuration & fonts
│   └── layout.tsx                    # Root HTML layout & font definitions
├── components/                       # Interactive React components
│   ├── pages/                        # Component sets scoped by route page
│   │   ├── landing/
│   │   │   └── landing-page.tsx      # Main landing layout with client logos marquee
│   │   └── waitlist-brand-dna/       # Interactive stages of DNA creation
│   │       ├── components/
│   │       │   ├── dna-summary-card.tsx # Displays generated DNA in clean grid structure
│   │       │   ├── generating-step.tsx  # Animated multi-stage loading interface
│   │       │   ├── input-step.tsx       # Intake form for email & website/text
│   │       │   └── result-step.tsx      # Success layout containing CTAs
│   │       └── page-ui.tsx           # Multi-step state machine orchestrator
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
│   │   └── website-extractor.ts      # Fetcher using JSDOM & Readability
│   ├── llm/
│   │   ├── brand-dna-prompt.ts       # System instruction definitions for the model
│   │   └── deepseek-client.ts        # Client wrapping OpenAI SDK pointing to DeepSeek
│   ├── render/
│   │   └── brand-dna-markdown.ts     # String renderer parsing DNA JSON -> Markdown
│   ├── motion-trail.ts               # GSAP animations helper library
│   └── utils.ts                      # Class merging utility for Tailwind
├── prisma/
│   └── schema.prisma                 # Schema definitions mapping database structure
├── types/                            # Domain and payload types
│   ├── brand-dna.ts                  # Target BrandDNA payload schemas
│   └── social-media.ts               # Selection templates for social integrations
```

---

## 3. Database Schema

The platform relies on a single relational table inside a Postgres database managed through Prisma:

```prisma
model WaitlistSignup {
  id                    Int        @id @default(autoincrement())
  email                 String
  sourceInput           String?    // Website URL or description input text
  inputType             InputType
  status                JobStatus  @default(PENDING)
  rawExtractedText      String?    @db.Text
  dnaJson               Json?      // Distilled BrandDNA fields
  mdFileUrl             String?    // Path on disk: /generated-dna/{id}.md
  isLikelyBusinessEmail Boolean    @default(false)
  faviconUrl            String?    // Google Favicon API output URL
  errorMessage          String?    // Error traceback details if pipeline fails
  createdAt             DateTime   @default(now())
  completedAt           DateTime?
}

enum InputType {
  WEBSITE
  MANUAL
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
    participant API_G as POST /api/brand-dna/generate
    participant Ext as Extractors
    participant LLM as DeepSeek Chat
    participant Disk as Public Disk Store

    Visitor->>Page: Enters Email & URL (or manual description)
    Page->>API_W: Submit email, input, and type
    API_W->>DB: Create waitlist record (status: PENDING)
    DB-->>API_W: Return Record ID
    API_W-->>Page: Return JSON: { success: true, id }
    
    Note over Page: Component transitions to Step 2 (GeneratingStep UI)<br/>and fires background generator fetch

    Page->>API_G: Request generation { id }
    API_G->>DB: Update status to EXTRACTING
    
    alt is Website Input
        API_G->>Ext: website-extractor.extract(URL)
        Ext->>Ext: Fetch DOM & extract main content text
        Ext-->>API_G: Return clean text
    else is Manual Input
        API_G->>Ext: manual-extractor.extract(text)
        Ext-->>API_G: Return verified text
    end
    
    API_G->>DB: Save rawExtractedText & update status to GENERATING
    
    API_G->>LLM: generateBrandDNA(extractedText)
    Note over LLM: Evaluates text against System Prompt<br/>and returns structured JSON object
    LLM-->>API_G: Return BrandDNA JSON object
    
    API_G->>API_G: Render Markdown document string
    API_G->>Disk: Write file to "public/generated-dna/{id}.md"
    
    API_G->>DB: Save dnaJson, mdFileUrl, set status to DONE
    API_G-->>Page: Return JSON: { success: true, data, fileUrl, brandName }
    
    Note over Page: Component transitions to Step 3 (ResultStep UI)<br/>and renders generated details
    Visitor->>Page: Clicks "Download Brand DNA (.md)"
    Page->>Visitor: Redirects/Streams file download
```

---

## 5. UI Stage Breakdown

The page [WaitlistBrandDNAPage](file:///Users/user/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/hive-frontend-main/components/pages/waitlist-brand-dna/page-ui.tsx) serves as the core state-machine orchestrator, rendering one of three distinct component states based on step state:

### Step 1: Input (`input-step.tsx`)
* Renders a form requesting **Email Address** and a toggle tab:
  * **"I have a website"**: Accepts a site URL (e.g. `google.com`).
  * **"Describe your brand"**: Textarea requiring at least 10 characters.
* Client-side email validation checks for basic format `@`.
* If a previous generation attempts website extraction and fails with `FALLBACK_TO_MANUAL` (HTTP 422), it renders a warn banner alerting the user and auto-focuses the manual tab prefilled with whatever they tried to parse.

### Step 2: Generating (`generating-step.tsx`)
* A fullscreen card that blocks actions during generation (~10–20 seconds).
* Displays a spinning indicator along with text updates that rotate sequentially to reduce perceived wait times:
  1. *Reading and fetching brand details...*
  2. *Extracting voice and positioning attributes...*
  3. *Writing your structured Brand DNA profile...*
  4. *Finalizing visual guidelines and guardrails...*

### Step 3: Results & Preview (`result-step.tsx`)
* Shows the user a success layout with two primary call-to-actions (CTAs):
  1. **Download Brand DNA (.md)**: Redirects browser requests to the download handler.
  2. **Book a Strategy Session**: Links to an external scheduler page.
* Embedded inside this view is the [DNASummaryCard](file:///Users/user/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/hive-frontend-main/components/pages/waitlist-brand-dna/components/dna-summary-card.tsx) which lists a read-only preview of the generated elements.

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
* Loads raw HTML text into **JSDOM** to generate a virtual document tree.
* Feeds JSDOM window document to **Mozilla Readability** parser.
* **Fallback Strategy**: If Readability fails to parse an article layout, the extractor falls back to manual paragraph and heading text aggregation:
  ```typescript
  const textElements = Array.from(doc.querySelectorAll("p, h1, h2, h3, h4, li"))
    .map((el) => el.textContent?.trim() ?? "")
    .filter((t) => t.length > 0)
  ```
* Enforces a minimum content length of 100 non-whitespace characters to prevent feeding empty pages into the LLM.

### 2. Manual Extractor (`manual-extractor.ts`)
* Cleans up spaces and asserts input has at least 10 characters.
* Returns the text back to the pipeline instantly.

---

## 7. Deep Dive: LLM Engine (DeepSeek)

Once text is extracted, the pipeline triggers the `generateBrandDNA` method in [deepseek-client.ts](file:///Users/user/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/hive-frontend-main/lib/llm/deepseek-client.ts):

* Uses the official `openai` npm package configured with DeepSeek's base URL (`https://api.deepseek.com`) and model (`deepseek-chat`).
* System instructions [BRAND_DNA_SYSTEM_PROMPT](file:///Users/user/Desktop/El-Roy/Professional%20Career/Frontend%20Development/Projects/hive-frontend-main/lib/llm/brand-dna-prompt.ts) enforce returning raw JSON matching the canonical `BrandDNA` shape.
* Generates utilizing `response_format: { type: "json_object" }` to ensure structural validity.
* An explicit schema validator checks the model's output for all required keys. If any key is missing, it raises an error to fail loud rather than let UI states degrade:

```typescript
// Canonical Interface Schema
export interface BrandDNA {
  brandVoice: string;          // 2-3 sentences describing overall voice/tone
  tagline: string;             // Slogan derived from text or generated
  targetAudience: string;      // Clear ideal customer profile
  coreValues: string[];        // Array of up to 4 values
  toneAttributes: string[];    // Array of 3-5 tone descriptor words
  visualDirection: string;     // Color/typography description paragraph
  doNotSay: string[];          // Array of 3-5 editorial phrases to avoid
}
```

---

## 8. Generation & Streaming APIs

The platform defines three Next.js route handlers matching the backend functionality:

### 1. Waitlist Registration (`POST /api/waitlist`)
* Evaluates if the signup email is a business email rather than a common consumer provider (e.g. Gmail/Yahoo).
* Resolves the target domain from the website input and constructs a high-resolution Google Favicon URL `https://www.google.com/s2/favicons?domain={domain}&sz=128`.
* Inserts a record into the Postgres database with status `PENDING` and returns `{ success: true, id }`.

### 2. Generator Pipeline (`POST /api/brand-dna/generate`)
* Handles orchestration of extraction, LLM generation, document rendering, and persistence:
* Reads record -> updates status to `EXTRACTING` -> runs resolved extractor -> updates status to `GENERATING` -> runs DeepSeek parser.
* Derives a clean name from the URL or email domain (e.g. `example.com` becomes `Example`).
* Converts JSON details into markdown via the `renderBrandDNAMarkdown` generator.
* Creates `public/generated-dna` if it does not exist and saves the file directly to server disk under `${id}.md`.
* Updates db record to status `DONE` and returns the file payload.
* *Error Failover*: If website extraction fails, updates DB row status to `FAILED` and yields an HTTP 422 containing `{ code: "FALLBACK_TO_MANUAL" }`, alerting the UI to redirect users.

### 3. File Downloader (`GET /api/brand-dna/download`)
* Accepts an `id` parameter.
* Resolves the clean name to output a custom filename (e.g., `takeout-brand-dna.md` instead of a generic ID sequence).
* Reads file from server disk buffer and streams it using HTTP content headers:
  ```typescript
  return new Response(fileBuffer, {
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
# Database connection string to Postgres
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"

# LLM API Authentication Key
DEEPSEEK_API_KEY="sk-..."

# Next.js Server Env
NODE_ENV="development"
```
