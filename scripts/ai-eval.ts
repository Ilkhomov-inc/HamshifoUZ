import "./_env";
import { pct, scoreFresh, scoreOffline, scoreRound2, scoreRouting, type Score } from "../tests/ai-eval/score";

/**
 * Scores Hamdard AI against the labelled set in tests/ai-eval/cases.ts.
 *
 *   npm run ai:eval            offline layer only (free, no network)
 *   npm run ai:eval -- --live  also asks the real model (needs ANTHROPIC_API_KEY; costs a few cents)
 */

function report(title: string, s: Score, showMisses = true) {
  const langs = (Object.entries(s.byLang) as Array<[string, { total: number; correct: number }]>)
    .filter(([, v]) => v.total)
    .map(([k, v]) => `${k} ${v.correct}/${v.total}`)
    .join("  ");
  console.log(`\n${title}: ${pct(s)}   [${langs}]`);
  if (showMisses) for (const m of s.misses) console.log(`   ✗ (${m.lang}) "${m.text}" → ${m.got}, expected ${m.want}`);
}

async function main() {
  const o = scoreOffline();
  console.log("── Offline layer (no model) ─────────────────────────────");
  report("Specialist suggestion (keyword fallback)", o.routing);
  report("Emergencies caught", o.emergencyCaught);
  report("Ordinary complaints left alone", o.emergencyQuiet);
  report("Serious questions sent to the doctor", o.seriousCaught);
  report("Plain questions answered", o.seriousQuiet);

  const h = scoreRound2();
  console.log("\n── Round 2 (second development set) ─────────────────────");
  report("Specialist suggestion", h.routing);
  report("Emergencies caught", h.emergencyCaught);
  report("Ordinary complaints left alone", h.emergencyQuiet);

  const f = scoreFresh();
  console.log("\n── Held-out phrases (never used for tuning) ─────────────");
  report("Specialist suggestion", f.routing);
  report("Emergencies caught", f.emergencyCaught);
  report("Ordinary complaints left alone", f.emergencyQuiet);

  if (!process.argv.includes("--live")) return;
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("\n--live needs ANTHROPIC_API_KEY in .env.local");
    process.exitCode = 1;
    return;
  }
  const { routeSymptoms } = await import("../src/lib/ai/router");
  const { ROUTING } = await import("../tests/ai-eval/cases");
  console.log(`\n── Live model (${ROUTING.length} requests) ──────────────────────────────`);
  const answers = new Map<string, string>();
  const sources: Record<string, number> = {};
  for (let i = 0; i < ROUTING.length; i += 6) {
    await Promise.all(
      ROUTING.slice(i, i + 6).map(async ([lang, text]) => {
        const r = await routeSymptoms(text, lang === "uzc" ? "uz" : lang, { useCache: false, forceModel: true });
        answers.set(text, r.result.specialty);
        sources[r.source] = (sources[r.source] ?? 0) + 1;
      }),
    );
  }
  report("Specialist suggestion (live)", scoreRouting((text) => answers.get(text) as never));
  console.log("   answered by:", sources);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
