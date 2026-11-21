# Graph Report - uzhack Hamshifo Uz  (2026-11-22)

## Corpus Check
- 131 files · ~65,349 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .example 1, (none) 1, .css 1)

## Summary
- 751 nodes · 2162 edges · 30 communities (26 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `963fa1d0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- booking-flow.tsx
- getI18n
- session.ts
- lib/seed.ts
- liquid-glass-button.tsx
- validation.ts
- Hamshifo UZ — sog'liq sari yo'lda yo'ldoshingiz
- router.ts
- emergency.ts
- compilerOptions
- AGENTS.md
- scripts
- explainer.ts
- dependencies
- package.json
- Dropdown
- score.ts
- smoke-concurrency.ts
- hamdard-brain.test.ts
- anthropic-wire.test.ts
- gemini.ts
- allowScripts
- vercel.json
- SUBMISSION.md
- keyword-router.ts
- proxy.ts
- downloadIcs
- lib/seed.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 47 edges
2. `BookingFlow()` - 43 edges
3. `getI18n()` - 42 edges
4. `next` - 35 edges
5. `getCurrentUser` - 33 edges
6. `useI18n()` - 30 edges
7. `explain()` - 25 edges
8. `Badge()` - 24 edges
9. `buttonClass()` - 24 edges
10. `Card()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `book()` --calls--> `withRls()`  [EXTRACTED]
  tests/db/booking-concurrency.test.ts → src/lib/db.ts
- `scoreOffline()` --calls--> `detectSeriousQuestion()`  [EXTRACTED]
  tests/ai-eval/score.ts → src/lib/ai/serious.ts
- `startTestDb()` --calls--> `withServer()`  [EXTRACTED]
  tests/db/harness.ts → src/lib/db.ts
- `as()` --calls--> `withRls()`  [EXTRACTED]
  tests/db/rls.test.ts → src/lib/db.ts
- `main()` --calls--> `scoreFresh()`  [EXTRACTED]
  scripts/ai-eval.ts → tests/ai-eval/score.ts

## Import Cycles
- None detected.

## Communities (30 total, 4 thin omitted)

### Community 0 - "booking-flow.tsx"
Cohesion: 0.05
Nodes (106): lucide-react, motion, react, AppointmentPage(), AppointmentsPage(), Row(), statusTone(), DoctorAppointmentPage() (+98 more)

### Community 1 - "getI18n"
Cohesion: 0.07
Nodes (45): nextConfig, securityHeaders, next, AboutDemoPage(), Block(), generateMetadata(), generateMetadata(), generateMetadata() (+37 more)

### Community 2 - "session.ts"
Cohesion: 0.09
Nodes (58): server-only@^0.0.1, server-only, zod, maxDuration, POST(), maxDuration, POST(), POST() (+50 more)

### Community 3 - "lib/seed.ts"
Cohesion: 0.11
Nodes (22): CITIES, City, CITY_LIST, cityNames(), en, dictionaries, ru, Dict (+14 more)

### Community 4 - "liquid-glass-button.tsx"
Cohesion: 0.22
Nodes (12): Button, ButtonProps, buttonVariants, ColorVariant, colorVariants, GlassFilter(), LiquidButton(), liquidbuttonVariants (+4 more)

### Community 5 - "validation.ts"
Cohesion: 0.09
Nodes (26): go(), demoLogin(), chooseDoctor(), chooseSpecialty(), reset(), submit(), bookingRequestSchema, MAX_NOTE (+18 more)

### Community 6 - "Hamshifo UZ — sog'liq sari yo'lda yo'ldoshingiz"
Cohesion: 0.09
Nodes (21): 1. Fresh visitor (incognito window), 2. Patient flow (demo patient), 3. Post-visit explainer, 4. Doctor flow (demo doctor), 5. Security spot checks, 6. Phone, slow network, accessibility, 7. AI failure modes, Manual QA checklist (+13 more)

### Community 7 - "router.ts"
Cohesion: 0.12
Nodes (23): @anthropic-ai/sdk, TtlCache, aiConfigured(), aiEffort(), aiMock(), aiModel(), AiProvider, aiProvider() (+15 more)

### Community 8 - "emergency.ts"
Cohesion: 0.11
Nodes (18): ANAPHYLAXIS, ANY_BLEED, BITE, BLEEDING, BREATH, BREATH_SEVERE, CHEST, CHEST_AGGRAVATORS (+10 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 11 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, ai:eval, build, db:local, db:migrate, db:reset, db:seed, dev (+7 more)

### Community 12 - "explainer.ts"
Cohesion: 0.12
Nodes (24): buildMessages(), cache, chunked(), explain(), ExplainEvent, ExplainInput, geminiRequest(), MOCK (+16 more)

### Community 13 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, @anthropic-ai/sdk@^1.8.0, class-variance-authority@^0.7.1, jose@^6.2.17, lucide-react@^1.73.0, motion@^14.14.0, next@^16.4.6, pg@^8.23.1 (+8 more)

### Community 14 - "package.json"
Cohesion: 0.11
Nodes (25): devDependencies, dotenv@^18.0.10, embedded-postgres@^18.6.0-beta.19, tailwindcss@^4.3.5, @tailwindcss/postcss@^4.3.5, tsx@^4.23.15, @types/node@^24.19.2, @types/pg@^8.23.1 (+17 more)

### Community 15 - "Dropdown"
Cohesion: 0.60
Nodes (6): Dropdown(), close(), onButtonKey(), onListKey(), pick(), show()

### Community 16 - "score.ts"
Cohesion: 0.16
Nodes (27): main(), report(), detectEmergency(), keywordRoute(), Specialty, EMERGENCY_NO, EMERGENCY_NO_FRESH, EMERGENCY_NO_ROUND2 (+19 more)

### Community 17 - "smoke-concurrency.ts"
Cohesion: 0.20
Nodes (8): after, BASE, doctors, headers, N, { slots }, stillListed, tally

### Community 18 - "hamdard-brain.test.ts"
Cohesion: 0.10
Nodes (30): CLARIFY_OPTIONS, anyMatch(), base(), CYR_TO_LAT, LAT_DIGRAPHS, LAT_TO_CYR, matchText(), normalizeText() (+22 more)

### Community 19 - "anthropic-wire.test.ts"
Cohesion: 0.29
Nodes (3): Captured, captured, validRoute

### Community 20 - "gemini.ts"
Cohesion: 0.26
Nodes (11): Chunk, FAILOVER, GeminiError, geminiJson(), geminiStream(), GeminiTimeoutError, post(), postOne() (+3 more)

### Community 21 - "allowScripts"
Cohesion: 0.30
Nodes (5): allowScripts, @embedded-postgres/darwin-arm64@18.6.0-beta.19, esbuild@0.28.2, engines, node

### Community 22 - "vercel.json"
Cohesion: 0.50
Nodes (3): crons, regions, $schema

### Community 24 - "keyword-router.ts"
Cohesion: 0.11
Nodes (19): AGE, CHILD_WORDS, CLARIFY_Q, Concept, CONCEPTS, HOW_LONG, isChild(), joinList() (+11 more)

### Community 27 - "proxy.ts"
Cohesion: 0.50
Nodes (4): config, MUTATING, originAllowed(), proxy()

### Community 29 - "downloadIcs"
Cohesion: 0.83
Nodes (3): downloadIcs(), esc(), stamp()

### Community 30 - "lib/seed.ts"
Cohesion: 0.07
Nodes (36): vitest@^5.1.0, pg, vitest, args, dir, pg, pool, bookAppointment() (+28 more)

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `getI18n` to `booking-flow.tsx`, `session.ts`, `dependencies`, `package.json`, `proxy.ts`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Should `booking-flow.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.050468836183121896 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `lib/seed.ts` to `validation.ts`, `router.ts`, `explainer.ts`, `package.json`, `hamdard-brain.test.ts`, `anthropic-wire.test.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `getI18n` be split into smaller, more focused modules?**
  _Cohesion score 0.07163461538461538 - nodes in this community are weakly interconnected._
- **Why does `react` connect `booking-flow.tsx` to `getI18n`, `session.ts`, `liquid-glass-button.tsx`, `dependencies`, `package.json`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09227614490772386 - nodes in this community are weakly interconnected._
- **Should `lib/seed.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10837438423645321 - nodes in this community are weakly interconnected._