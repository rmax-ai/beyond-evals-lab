# Design Decisions — Beyond Evals Lab

## Decision 1: TypeScript + Node.js (not Python)

**Chosen:** TypeScript on Node.js 22+ with strict mode.

**Rejected:** Python (Typer + Pydantic). The project targets a JS/TS audience
for its eval and agent patterns. Node.js native ESM + Vitest + zod provides
strong typing with minimal ceremony. better-sqlite3 gives synchronous SQLite
access without async overhead — suitable for a single-threaded PoC.

## Decision 2: Rule-based agent as default (no LLM dependency)

**Chosen:** `RuleBasedRefundAgent` with configurable defect modes. No API key
required for demos or tests.

**Rejected:** LLM-only agent. Would make experiments non-deterministic and
require API keys. A thin `ModelAgent` adapter is optional (Milestone 8), not
default.

**Why:** The assurance architecture is independent of agent implementation.
A rule-based agent makes the mechanisms more visible — you can see exactly
why a trajectory fails.

## Decision 3: SQLite via better-sqlite3 (not async SQLite)

**Chosen:** `better-sqlite3` — synchronous API, native bindings.

**Rejected:** `sql.js` (WASM, slower), `bun:sqlite` (Bun-only), async wrappers
(unnecessary for single-threaded PoC).

**Why:** Synchronous is simpler for a CLI tool. No connection pooling needed.
Trace writes are append-only and fast.

## Decision 4: Claim-oriented verification (not boolean)

**Chosen:** `VerificationEvidence[]` with per-claim status, evidence references,
and confidence.

**Rejected:** Simple `boolean` pass/fail. A refund might have the correct amount
but missing audit record — that's two separate claims, not one opaque failure.

**Why:** Assurance is evidence accumulation, not binary labeling. Partial
verification visibility is the point.

## Decision 5: No aggregate "agent quality" score

**Chosen:** Outcome, verification, validation, trajectory, controls, and
efficiency reported separately.

**Rejected:** Weighted composite scores (e.g., `agent_score: 87`). These hide
disagreements that are more informative than any single number.

**Why:** The project exists to demonstrate that these dimensions are distinct.
Collapsing them into one number would undermine the thesis.

## Decision 6: Controls + verification as complementary mechanisms

**Chosen:** Controls run pre-action (prevent), verifiers run post-action (detect).

**Rejected:** Relying on controls alone (assumes all risks are known a priori)
or verification alone (detects but doesn't prevent).

**Why:** Production systems need both. The PoC demonstrates the complementarity
through Demo E (control-block) and Demo C (verification-failure).

## Decision 7: Human curation gate in monitoring → eval loop

**Chosen:** Production anomalies → candidate fixtures → human curation →
accepted regression cases.

**Rejected:** Auto-converting production traces into eval cases. Observed
behavior is not automatically expected behavior.

**Why:** Without curation, monitoring anomalies risk becoming incorrect
evaluation labels. The human interpretation step is deliberate and documented.

## Decision 8: Verifier/Grader composition (not inheritance)

**Chosen:** `VerificationGrader implements Grader { constructor(private verifier: Verifier) {} }`

**Rejected:** `Verifier extends Grader`. They overlap mechanically but answer
different questions. A verifier evaluates claims about a concrete execution;
a grader interprets evidence relative to an eval task.

## Decision 9: Immutable state snapshots

**Chosen:** Tools return new `WorldState` snapshots, runtime applies mutations.

**Rejected:** Direct state mutation by tools. Would make testing and
verification harder — no way to inspect pre/post state diffs.

## Decision 10: CLIs as primary interface (not HTTP)

**Chosen:** Commander-based CLI with `pnpm` scripts.

**Rejected:** Fastify HTTP server as primary interface. HTTP adds deployment
complexity without strengthening the experiment. Fastify is optional for those
who want it.

## Known Limitations

- Single-threaded execution — no concurrent agent runs
- No persistence beyond SQLite — traces live in one file
- Rule-based agent handles ~5 patterns — not a general refund system
- No streaming or real-time monitoring
- OpenTelemetry spans are observational only — SQLite remains authoritative
