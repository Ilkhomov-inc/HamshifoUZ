# Graph Report - uzhack Hamshifo Uz  (2026-11-16)

## Corpus Check
- 123 files · ~58,273 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .example 1, (none) 1, .css 1)

## Summary
- 683 nodes · 1993 edges · 27 communities (22 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- booking-flow.tsx
- time.ts
- session.ts
- getI18n
- harness.ts
- validation.ts
- Hamshifo UZ — sog'liq sari yo'lda yo'ldoshingiz
- router.ts
- emergency.ts
- compilerOptions
- explainer.ts
- scripts
- prompts.ts
- dependencies
- devDependencies
- keyword-router.ts
- score.ts
- smoke-concurrency.ts
- hamdard-brain.test.ts
- anthropic-wire.test.ts
- engines
- allowScripts
- vercel.json
- SUBMISSION.md
- motion

## God Nodes (most connected - your core abstractions)
1. `getI18n()` - 42 edges
2. `BookingFlow()` - 41 edges
3. `cn()` - 36 edges
4. `next` - 34 edges
5. `getCurrentUser` - 33 edges
6. `useI18n()` - 30 edges
7. `buttonClass()` - 24 edges
8. `Badge()` - 24 edges
9. `Card()` - 24 edges
10. `apiError()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `book()` --calls--> `withRls()`  [EXTRACTED]
  tests/db/booking-concurrency.test.ts → src/lib/db.ts
- `as()` --calls--> `withRls()`  [EXTRACTED]
  tests/db/rls.test.ts → src/lib/db.ts
- `scoreFresh()` --calls--> `detectEmergency()`  [EXTRACTED]
  tests/ai-eval/score.ts → src/lib/ai/emergency.ts
- `scoreOffline()` --calls--> `detectEmergency()`  [EXTRACTED]
  tests/ai-eval/score.ts → src/lib/ai/emergency.ts
- `scoreRound2()` --calls--> `detectEmergency()`  [EXTRACTED]
  tests/ai-eval/score.ts → src/lib/ai/emergency.ts

## Import Cycles
- None detected.

## Communities (27 total, 5 thin omitted)

### Community 0 - "booking-flow.tsx"
Cohesion: 0.06
Nodes (77): lucide-react, react, ErrorPage(), LandingPage(), SectionHead(), STEP_ICONS, HamdardAvatar(), TypingDots() (+69 more)

### Community 1 - "time.ts"
Cohesion: 0.07
Nodes (58): AboutDemoPage(), Block(), GET(), query, AppointmentPage(), generateMetadata(), AppointmentsPage(), generateMetadata() (+50 more)

### Community 2 - "session.ts"
Cohesion: 0.07
Nodes (68): zod, args, maxDuration, POST(), maxDuration, POST(), POST(), POST() (+60 more)

### Community 3 - "getI18n"
Cohesion: 0.08
Nodes (35): nextConfig, securityHeaders, next, generateMetadata(), BookPage(), generateMetadata(), ExplainPage(), generateMetadata() (+27 more)

### Community 4 - "harness.ts"
Cohesion: 0.14
Nodes (14): embedded-postgres@^18.6.0-beta.19, embedded-postgres, pg, dir, pg, pool, Db, applyMigrations() (+6 more)

### Community 5 - "validation.ts"
Cohesion: 0.13
Nodes (19): bookingRequestSchema, MAX_NOTE, MAX_PRESCRIPTION, MAX_QUESTION, MAX_SYMPTOMS, normalizePhone(), explainRequestSchema, IMAGE_TYPES (+11 more)

### Community 6 - "Hamshifo UZ — sog'liq sari yo'lda yo'ldoshingiz"
Cohesion: 0.09
Nodes (21): 1. Fresh visitor (incognito window), 2. Patient flow (demo patient), 3. Post-visit explainer, 4. Doctor flow (demo doctor), 5. Security spot checks, 6. Phone, slow network, accessibility, 7. AI failure modes, Manual QA checklist (+13 more)

### Community 7 - "router.ts"
Cohesion: 0.15
Nodes (20): @anthropic-ai/sdk, aiConfigured(), aiMock(), aiModel(), getAnthropic(), isTransportError(), isChild(), keywordRoute() (+12 more)

### Community 8 - "emergency.ts"
Cohesion: 0.09
Nodes (22): vitest@^5.1.0, vitest, ANAPHYLAXIS, ANY_BLEED, BITE, BLEEDING, BREATH, BREATH_SEVERE (+14 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 10 - "explainer.ts"
Cohesion: 0.14
Nodes (13): TtlCache, buildMessages(), cache, chunked(), explain(), ExplainEvent, ExplainInput, MOCK (+5 more)

### Community 11 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, ai:eval, build, db:local, db:migrate, db:reset, db:seed, dev (+7 more)

### Community 12 - "prompts.ts"
Cohesion: 0.29
Nodes (9): partialSuffix(), Clarification, DOCTOR_MARKER, EXPLAINER_SYSTEM, explainerUserText(), fenceUserText(), languageName(), ROUTER_SYSTEM (+1 more)

### Community 13 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, @anthropic-ai/sdk@^1.8.0, jose@^6.2.17, lucide-react@^1.73.0, next@^16.4.6, pg@^8.23.1, react@^19.3.1, react-dom@^19.3.1 (+5 more)

### Community 14 - "devDependencies"
Cohesion: 0.12
Nodes (23): devDependencies, dotenv@^18.0.10, tailwindcss@^4.3.5, @tailwindcss/postcss@^4.3.5, tsx@^4.23.15, @types/node@^24.19.2, @types/pg@^8.23.1, @types/react@^19.3.0 (+15 more)

### Community 15 - "keyword-router.ts"
Cohesion: 0.11
Nodes (18): AGE, CHILD_WORDS, CLARIFY_Q, Concept, CONCEPTS, HOW_LONG, joinList(), L3 (+10 more)

### Community 16 - "score.ts"
Cohesion: 0.10
Nodes (36): main(), report(), Specialty, SPECIALTY_SCOPE, CLINICS, DEMO_DOCTOR_EMAIL, DEMO_DOCTOR_SLUG, DEMO_PRESCRIPTION (+28 more)

### Community 17 - "smoke-concurrency.ts"
Cohesion: 0.20
Nodes (8): after, BASE, doctors, headers, N, { slots }, stillListed, tally

### Community 18 - "hamdard-brain.test.ts"
Cohesion: 0.11
Nodes (28): CLARIFY_OPTIONS, base(), CYR_TO_LAT, LAT_DIGRAPHS, LAT_TO_CYR, matchText(), normalizeText(), uzCyrillicToLatin() (+20 more)

### Community 19 - "anthropic-wire.test.ts"
Cohesion: 0.29
Nodes (3): Captured, captured, validRoute

### Community 21 - "allowScripts"
Cohesion: 0.67
Nodes (3): allowScripts, @embedded-postgres/darwin-arm64@18.6.0-beta.19, esbuild@0.28.2

### Community 27 - "motion"
Cohesion: 0.60
Nodes (3): motion@^14.14.0, motion, loadFeatures()

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `getI18n` to `booking-flow.tsx`, `time.ts`, `session.ts`, `dependencies`, `devDependencies`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Should `booking-flow.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.062385321100917435 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `emergency.ts` to `harness.ts`, `validation.ts`, `router.ts`, `prompts.ts`, `devDependencies`, `hamdard-brain.test.ts`, `anthropic-wire.test.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `time.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06925418569254185 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `scripts` to `devDependencies`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07429526994744386 - nodes in this community are weakly interconnected._
- **Should `getI18n` be split into smaller, more focused modules?**
  _Cohesion score 0.083710407239819 - nodes in this community are weakly interconnected._