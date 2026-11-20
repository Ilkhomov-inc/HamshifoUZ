# Graph Report - uzhack Hamshifo Uz  (2026-11-20)

## Corpus Check
- 127 files · ~60,596 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .example 1, (none) 1, .css 1)

## Summary
- 715 nodes · 2069 edges · 31 communities (25 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `89156230`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- booking-flow.tsx
- time.ts
- session.ts
- layout.tsx
- db.ts
- validation.ts
- Hamshifo UZ — sog'liq sari yo'lda yo'ldoshingiz
- router.ts
- emergency.ts
- compilerOptions
- AGENTS.md
- scripts
- explainer.ts
- dependencies
- devDependencies
- tsx@^4.23.15
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
- package.json
- next.config.ts
- lib/seed.ts

## God Nodes (most connected - your core abstractions)
1. `getI18n()` - 42 edges
2. `BookingFlow()` - 40 edges
3. `cn()` - 36 edges
4. `next` - 34 edges
5. `getCurrentUser` - 33 edges
6. `useI18n()` - 30 edges
7. `Badge()` - 24 edges
8. `buttonClass()` - 24 edges
9. `Card()` - 24 edges
10. `explain()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `book()` --calls--> `withRls()`  [EXTRACTED]
  tests/db/booking-concurrency.test.ts → src/lib/db.ts
- `scoreOffline()` --calls--> `detectSeriousQuestion()`  [EXTRACTED]
  tests/ai-eval/score.ts → src/lib/ai/serious.ts
- `as()` --calls--> `withRls()`  [EXTRACTED]
  tests/db/rls.test.ts → src/lib/db.ts
- `main()` --calls--> `scoreFresh()`  [EXTRACTED]
  scripts/ai-eval.ts → tests/ai-eval/score.ts
- `main()` --calls--> `scoreOffline()`  [EXTRACTED]
  scripts/ai-eval.ts → tests/ai-eval/score.ts

## Import Cycles
- None detected.

## Communities (31 total, 6 thin omitted)

### Community 0 - "booking-flow.tsx"
Cohesion: 0.06
Nodes (83): lucide-react, next, react, ErrorPage(), LandingPage(), SectionHead(), STEP_ICONS, generateMetadata() (+75 more)

### Community 1 - "time.ts"
Cohesion: 0.06
Nodes (72): AboutDemoPage(), Block(), generateMetadata(), AppointmentPage(), generateMetadata(), AppointmentsPage(), generateMetadata(), Row() (+64 more)

### Community 2 - "session.ts"
Cohesion: 0.10
Nodes (56): zod, maxDuration, POST(), maxDuration, POST(), POST(), POST(), body (+48 more)

### Community 3 - "layout.tsx"
Cohesion: 0.18
Nodes (12): motion@^14.14.0, motion, generateMetadata(), HTML_LANG, inter, RootLayout(), viewport, DemoBanner() (+4 more)

### Community 4 - "db.ts"
Cohesion: 0.12
Nodes (17): pg, args, dir, pg, pool, Db, getPool(), inTransaction() (+9 more)

### Community 5 - "validation.ts"
Cohesion: 0.12
Nodes (21): submit(), bookingRequestSchema, MAX_NOTE, MAX_PRESCRIPTION, MAX_QUESTION, MAX_SYMPTOMS, normalizePhone(), dateKeySchema (+13 more)

### Community 6 - "Hamshifo UZ — sog'liq sari yo'lda yo'ldoshingiz"
Cohesion: 0.09
Nodes (21): 1. Fresh visitor (incognito window), 2. Patient flow (demo patient), 3. Post-visit explainer, 4. Doctor flow (demo doctor), 5. Security spot checks, 6. Phone, slow network, accessibility, 7. AI failure modes, Manual QA checklist (+13 more)

### Community 7 - "router.ts"
Cohesion: 0.12
Nodes (22): @anthropic-ai/sdk, TtlCache, aiConfigured(), aiMock(), aiModel(), AiProvider, aiProvider(), getAnthropic() (+14 more)

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
Cohesion: 0.13
Nodes (23): buildMessages(), cache, chunked(), explain(), ExplainEvent, ExplainInput, geminiRequest(), MOCK (+15 more)

### Community 13 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, @anthropic-ai/sdk@^1.8.0, jose@^6.2.17, lucide-react@^1.73.0, next@^16.4.6, pg@^8.23.1, react@^19.3.1, react-dom@^19.3.1 (+5 more)

### Community 14 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, dotenv@^18.0.10, embedded-postgres@^18.6.0-beta.19, tailwindcss@^4.3.5, @types/node@^24.19.2, @types/react@^19.3.0, @types/react-dom@^19.3.0, typescript@^6.0.3 (+7 more)

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
Cohesion: 0.18
Nodes (5): vitest@^5.1.0, vitest, Captured, captured, validRoute

### Community 20 - "gemini.ts"
Cohesion: 0.22
Nodes (13): Chunk, FAILOVER, GeminiError, GeminiFinal, geminiJson(), GeminiPart, geminiStream(), GeminiTimeoutError (+5 more)

### Community 21 - "allowScripts"
Cohesion: 0.67
Nodes (3): allowScripts, @embedded-postgres/darwin-arm64@18.6.0-beta.19, esbuild@0.28.2

### Community 22 - "vercel.json"
Cohesion: 0.50
Nodes (3): crons, regions, $schema

### Community 24 - "keyword-router.ts"
Cohesion: 0.11
Nodes (18): AGE, CHILD_WORDS, CLARIFY_Q, Concept, CONCEPTS, HOW_LONG, isChild(), joinList() (+10 more)

### Community 27 - "proxy.ts"
Cohesion: 0.50
Nodes (4): config, MUTATING, originAllowed(), proxy()

### Community 28 - "package.json"
Cohesion: 0.18
Nodes (10): @tailwindcss/postcss@^4.3.5, @types/pg@^8.23.1, engines, node, name, private, type, version (+2 more)

### Community 30 - "lib/seed.ts"
Cohesion: 0.11
Nodes (22): CITIES, City, CITY_LIST, cityNames(), en, dictionaries, ru, Dict (+14 more)

## Knowledge Gaps
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `booking-flow.tsx` to `time.ts`, `session.ts`, `layout.tsx`, `dependencies`, `proxy.ts`, `package.json`, `next.config.ts`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Should `booking-flow.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.057710249233639876 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `anthropic-wire.test.ts` to `db.ts`, `validation.ts`, `router.ts`, `explainer.ts`, `hamdard-brain.test.ts`, `package.json`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `time.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06165099268547544 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09513513513513513 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12121212121212122 - nodes in this community are weakly interconnected._