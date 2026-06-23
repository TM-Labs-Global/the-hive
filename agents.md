# Hive - Agent Contribution Guide

This guide is prescriptive. Follow these rules when contributing code.

## 1) Mandatory Project Layout

Use this top-level structure and do not move responsibilities across folders.

```
app/                    Next.js route entries only
components/             UI and feature components only
hooks/                  shared transport/util hooks only (no feature API hooks)
lib/                    shared pure helpers and constants
types/                  domain and shared TypeScript types
public/                 static assets only
```

### Route Groups

- app/(auth): login/register/password/verification routes.
- app/(dashboard): authenticated application routes.
- app/kyc: KYC-only flow routes.
- app/api: route handlers.

### Component Folders

- components/ui: reusable base UI primitives.
- components/pages/<feature>: feature UI composition.
- components/contexts: cross-feature state providers.
- components/guards: access and flow guards.

### Hook Folders

- components/pages/auth/hooks/index.ts: auth hooks.
- components/pages/dashboard/<feature>/hooks/index.ts: dashboard feature hooks.
- components/pages/kyc/hooks/index.ts: KYC hooks.
- hooks/use-fetch.ts: shared requestApi transport.

## 2) Feature Scaffold (Exact)

For each new dashboard feature named <feature>, create files in this order.

1. Route entry
- app/(dashboard)/<feature>/page.tsx
- Must only render feature page component.

2. Feature UI
- components/pages/<feature>/<feature>-page.tsx
- Contains UI composition and hook consumption.

3. Feature data hooks
- components/pages/<feature>/hooks/index.ts
- Contains fetcher functions and exported React Query hooks.

4. Feature types
- types/<feature>.ts
- Request/response/domain types for the feature.

5. Optional context (only if state is shared across multiple routes/components)
- components/contexts/<feature>-context.tsx

Do not skip this order unless the feature is strictly UI-only.

## 3) Route File Rules (Exact)

Route page files are thin wrappers only.

Allowed in app/*/page.tsx:
- Import of one feature page component.
- Export default function that returns that component.

Not allowed in app/*/page.tsx:
- API calls.
- useQuery/useMutation logic.
- Large business logic blocks.
- Form validation schemas unless route-specific and tiny.

## 4) Hook Authoring Standard (Exact)

All remote data hooks must follow this structure.

File location:
- components/pages/<feature>/hooks/index.ts
- Example: auth/hooks/index.ts

Required parts in each hook file:
1. Type imports from types/*
2. requestApi import from hooks/use-fetch
3. Internal async fetcher/mutator functions
4. Exported useQuery/useMutation hooks
5. Explicit response normalization and error throwing

Naming:
- Internal fetchers/mutators: getX, listX, createX, updateX, deleteX
- Exported query hooks: useX, useXList
- Exported mutation hooks: useCreateX, useUpdateX, useDeleteX

Query key format:
- ["<feature>"] for singleton data
- ["<feature>", id] for entity data
- ["<feature>", params] for filtered lists

Auth mode:
- Use auth: required for protected business data
- Use auth: omit only for public endpoints

Error handling:
- If API response status is error, throw Error with message
- If response shape is unexpected, throw Error("Unexpected response")
- Never return partial invalid shapes silently

Return shape:
- Hook return must be stable and typed
- Do not return any when a domain type exists

## 5) How Hooks Are Called (Exact)

Components call hooks. Components do not call requestApi directly.

Allowed call chain:
1. components/pages/<feature>/<feature>-page.tsx
2. calls components/pages/<feature>/hooks/index.ts exports
3. hook uses requestApi from hooks/use-fetch.ts
4. hook normalizes and returns typed result

Not allowed:
- requestApi usage inside components/pages/*
- fetch calls directly inside page components
- Duplicating endpoint logic across multiple components

## 6) Function Authoring Standard (Exact)

Use these function categories and keep boundaries strict.

1. Pure helpers
- Location: lib/*
- Rules: deterministic, no side effects, reusable across features

2. Data access functions
- Location: components/pages/<feature>/hooks/index.ts
- Rules: async, call requestApi, normalize API data, throw on failure

3. UI event handlers
- Location: components/pages/<feature>/*
- Rules: orchestrate UI state and call hook mutate/query methods only

Function style requirements:
- Explicit input and output types for exported functions
- Single responsibility per function
- Early return for invalid input
- Keep functions short; extract repeated logic

## 7) Types Rules (Exact)

- Put domain types in types/<feature>.ts
- Reuse shared API response contract from types/index.d.ts where applicable
- Avoid duplicating equivalent interfaces across features
- Prefer named interfaces/types over inline object types in exported APIs

Minimum type set for each data feature:
- Request payload type(s)
- Response payload type(s)
- Domain model type(s)

## 8) Import Rules (Exact)

- Internal imports must use @/ aliases
- Remove unused imports before finalizing
- Import order should be consistent in each file
- Do not introduce circular dependencies between feature folders

## 9) Context Rules (Exact)

Create context only when state must be shared across multiple distant components.

Context file requirements:
- Location: components/contexts/<name>-context.tsx
- Expose Provider and use<Name>Context hook
- Throw a clear error when hook is used outside provider
- Keep context value typed and minimal

Do not create context for local single-component state.

## 10) Standard Implementation Flow (Required)

For every new feature or endpoint integration, execute in this order:

1. Define types in types/<feature>.ts
2. Implement data access functions in components/pages/<feature>/hooks/index.ts
3. Export React Query hook(s) from the same hook file
4. Build feature UI in components/pages/<feature>/*
5. Wire route page in app/*/<feature>/page.tsx
6. Add/extend context only if cross-feature state is needed
7. Validate loading, success, empty, and error UI states

## 11) Change Boundaries (Required)

- Do not refactor unrelated modules in the same PR.
- Do not replace shared patterns (requestApi, contexts, base UI) without a clear requirement.
- Keep public signatures stable unless task explicitly requires breaking changes.
- Prefer additive, scoped changes over large rewrites.

## 12) Review Checklist (Required)

Before completing work, confirm all are true:

- Feature files are in the mandated folders.
- Route page is thin and has no business logic.
- Components do not call requestApi directly.
- Hook file owns endpoint calls and response normalization.
- Types are explicit and colocated in types/<feature>.ts or existing domain type file.
- Error paths throw explicit errors and are handled in UI.
- Shared utilities/components are reused instead of duplicated.

## 13) Agent Decision Priority

When two implementations are possible, choose in this order:

1. Existing local feature pattern
2. Shared project primitive (requestApi, shared hooks, ui primitives, context)
3. Smaller change surface
4. Stronger type safety and clearer failure handling

## 14) Division of Labor (UI vs. Logic)

The AI Agent is responsible for **UI/UX and Visual Flow** only.
The Logic Engineer is responsible for **Data Fetching, Hooks, and API Integration**.

Agent Rules:
- Focus on high-fidelity UI implementation using established design system primitives.
- Build complete interaction flows (modals, sidebars, page transitions) using mock data or static states.
- Leave clear "logic placeholders" (comments or stub functions) for where API hooks should be integrated.
- Do NOT implement actual `useQuery` or `useMutation` logic unless specifically instructed for a demo/prototype.
- Ensure all components are "logic-ready" by exposing the necessary props for data and events.
