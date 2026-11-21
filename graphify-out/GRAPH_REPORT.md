# Graph Report - uzhack Hamshifo Uz  (2026-11-22)

## Corpus Check
- 132 files · ~65,977 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .example 1, (none) 1, .css 1)

## Summary
- 755 nodes · 2192 edges · 39 communities (34 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `13f300a6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- explainer-chat.tsx
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
- time.ts
- downloadIcs
- lib/seed.ts
- cn
- booking-flow.tsx
- doctor/page.tsx
- Badge
- schemas.ts
- text-shimmer.tsx
- motion
- next.config.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 49 edges
2. `BookingFlow()` - 43 edges
3. `getI18n()` - 42 edges
4. `next` - 36 edges
5. `getCurrentUser` - 33 edges
6. `useI18n()` - 32 edges
7. `explain()` - 25 edges
8. `lucide-react` - 25 edges
9. `react` - 25 edges
10. `Badge()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `book()` --calls--> `withRls()`  [EXTRACTED]
  tests/db/booking-concurrency.test.ts → src/lib/db.ts
- `scoreFresh()` --calls--> `detectEmergency()`  [EXTRACTED]
  tests/ai-eval/score.ts → src/lib/ai/emergency.ts
- `scoreOffline()` --calls--> `detectEmergency()`  [EXTRACTED]
  tests/ai-eval/score.ts → src/lib/ai/emergency.ts
- `scoreRound2()` --calls--> `detectEmergency()`  [EXTRACTED]
  tests/ai-eval/score.ts → src/lib/ai/emergency.ts
- `scoreFresh()` --calls--> `keywordRoute()`  [EXTRACTED]
  tests/ai-eval/score.ts → src/lib/ai/keyword-router.ts

## Import Cycles
- None detected.

## Communities (39 total, 5 thin omitted)

### Community 0 - "explainer-chat.tsx"
Cohesion: 0.12
Nodes (28): react, ErrorPage(), EmergencyBanner(), DoctorContact, ExplainerChat(), onFile(), Image, Msg (+20 more)

### Community 1 - "getI18n"
Cohesion: 0.09
Nodes (35): next, AboutDemoPage(), Block(), generateMetadata(), BookPage(), generateMetadata(), generateMetadata(), ExplainPage() (+27 more)

### Community 2 - "session.ts"
Cohesion: 0.07
Nodes (73): server-only, zod, maxDuration, POST(), maxDuration, POST(), POST(), POST() (+65 more)

### Community 3 - "lib/seed.ts"
Cohesion: 0.11
Nodes (21): City, CITY_LIST, cityNames(), en, dictionaries, ru, Dict, uz (+13 more)

### Community 4 - "liquid-glass-button.tsx"
Cohesion: 0.22
Nodes (12): Button, ButtonProps, buttonVariants, ColorVariant, colorVariants, GlassFilter(), LiquidButton(), liquidbuttonVariants (+4 more)

### Community 5 - "validation.ts"
Cohesion: 0.12
Nodes (20): submit(), bookingRequestSchema, MAX_NOTE, MAX_PRESCRIPTION, MAX_QUESTION, MAX_SYMPTOMS, normalizePhone(), explainRequestSchema (+12 more)

### Community 6 - "Hamshifo UZ — sog'liq sari yo'lda yo'ldoshingiz"
Cohesion: 0.09
Nodes (21): 1. Fresh visitor (incognito window), 2. Patient flow (demo patient), 3. Post-visit explainer, 4. Doctor flow (demo doctor), 5. Security spot checks, 6. Phone, slow network, accessibility, 7. AI failure modes, Manual QA checklist (+13 more)

### Community 7 - "router.ts"
Cohesion: 0.19
Nodes (18): @anthropic-ai/sdk, TtlCache, aiConfigured(), aiEffort(), aiMock(), aiModel(), aiProvider(), getAnthropic() (+10 more)

### Community 8 - "emergency.ts"
Cohesion: 0.10
Nodes (20): ANAPHYLAXIS, ANY_BLEED, BITE, BLEEDING, BREATH, BREATH_SEVERE, CHEST, CHEST_AGGRAVATORS (+12 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 11 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, ai:eval, build, db:local, db:migrate, db:reset, db:seed, dev (+7 more)

### Community 12 - "explainer.ts"
Cohesion: 0.11
Nodes (24): AiProvider, buildMessages(), cache, chunked(), ExplainEvent, ExplainInput, geminiRequest(), MOCK (+16 more)

### Community 13 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, @anthropic-ai/sdk@^1.8.0, class-variance-authority@^0.7.1, jose@^6.2.17, lucide-react@^1.73.0, next@^16.4.6, pg@^8.23.1, @radix-ui/react-slot@^1.5.0 (+8 more)

### Community 14 - "package.json"
Cohesion: 0.10
Nodes (27): devDependencies, dotenv@^18.0.10, embedded-postgres@^18.6.0-beta.19, tailwindcss@^4.3.5, @tailwindcss/postcss@^4.3.5, tsx@^4.23.15, @types/node@^24.19.2, @types/pg@^8.23.1 (+19 more)

### Community 15 - "Dropdown"
Cohesion: 0.60
Nodes (6): Dropdown(), close(), onButtonKey(), onListKey(), pick(), show()

### Community 16 - "score.ts"
Cohesion: 0.15
Nodes (27): main(), report(), Specialty, SPECIALTY_SCOPE, EMERGENCY_NO, EMERGENCY_NO_FRESH, EMERGENCY_NO_ROUND2, EMERGENCY_YES (+19 more)

### Community 17 - "smoke-concurrency.ts"
Cohesion: 0.20
Nodes (8): after, BASE, doctors, headers, N, { slots }, stillListed, tally

### Community 18 - "hamdard-brain.test.ts"
Cohesion: 0.13
Nodes (23): base(), CYR_TO_LAT, LAT_DIGRAPHS, LAT_TO_CYR, matchText(), normalizeText(), uzCyrillicToLatin(), uzLatinToCyrillic() (+15 more)

### Community 19 - "anthropic-wire.test.ts"
Cohesion: 0.20
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
Nodes (20): AGE, CHILD_WORDS, CLARIFY_OPTIONS, CLARIFY_Q, Concept, CONCEPTS, HOW_LONG, isChild() (+12 more)

### Community 27 - "proxy.ts"
Cohesion: 0.50
Nodes (4): config, MUTATING, originAllowed(), proxy()

### Community 28 - "time.ts"
Cohesion: 0.12
Nodes (33): AppointmentsPage(), generateMetadata(), Row(), statusTone(), CancelButton(), Calendar(), monthOf(), shiftMonth() (+25 more)

### Community 29 - "downloadIcs"
Cohesion: 0.83
Nodes (3): downloadIcs(), esc(), stamp()

### Community 30 - "lib/seed.ts"
Cohesion: 0.11
Nodes (15): pg, args, dir, pg, pool, Db, getPool(), sslConfig() (+7 more)

### Community 31 - "cn"
Cohesion: 0.17
Nodes (18): lucide-react, LandingPage(), SectionHead(), STEP_ICONS, HamdardAvatar(), HamdardThinking(), DemoButtons(), StepIndicator() (+10 more)

### Community 32 - "booking-flow.tsx"
Cohesion: 0.13
Nodes (20): go(), demoLogin(), BookingFlow(), analyze(), answerClarify(), chooseDoctor(), chooseSpecialty(), reset() (+12 more)

### Community 33 - "doctor/page.tsx"
Cohesion: 0.27
Nodes (14): AppointmentPage(), generateMetadata(), DoctorAppointmentPage(), NotDoctor(), ApptCard(), DoctorPage(), generateMetadata(), statusTone (+6 more)

### Community 34 - "Badge"
Cohesion: 0.37
Nodes (9): Header(), LABELS, LanguageSwitcher(), MobileNav(), HeaderUser, initials(), SignOutButton(), UserMenu() (+1 more)

### Community 35 - "schemas.ts"
Cohesion: 0.29
Nodes (5): ALTERNATIVES, RouterApiSchema, RouterOutput, RouterOutputSchema, SPECIALTIES

### Community 36 - "text-shimmer.tsx"
Cohesion: 0.47
Nodes (5): ensureBaseStyles(), ensureDelayKeyframes(), registeredDelays, TextShimmer(), TextShimmerProps

### Community 37 - "motion"
Cohesion: 0.60
Nodes (3): motion@^14.14.0, motion, loadFeatures()

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `getI18n` to `explainer-chat.tsx`, `doctor/page.tsx`, `session.ts`, `booking-flow.tsx`, `Badge`, `next.config.ts`, `dependencies`, `package.json`, `proxy.ts`, `time.ts`, `cn`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Should `explainer-chat.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1173054587688734 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `anthropic-wire.test.ts` to `validation.ts`, `router.ts`, `emergency.ts`, `explainer.ts`, `package.json`, `hamdard-brain.test.ts`, `lib/seed.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `getI18n` be split into smaller, more focused modules?**
  _Cohesion score 0.09411764705882353 - nodes in this community are weakly interconnected._
- **Why does `react` connect `explainer-chat.tsx` to `booking-flow.tsx`, `getI18n`, `Badge`, `session.ts`, `liquid-glass-button.tsx`, `text-shimmer.tsx`, `dependencies`, `package.json`, `time.ts`, `cn`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07234042553191489 - nodes in this community are weakly interconnected._
- **Should `lib/seed.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11375661375661375 - nodes in this community are weakly interconnected._