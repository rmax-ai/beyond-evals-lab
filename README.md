# Beyond Evals Lab

What does it mean to know that an agent is safe, correct, and useful?

Running an eval suite is only one part of the answer.

This repository implements the same refund-agent scenario using **tests,
controls, verification, validation, trajectory evaluation, monitoring, and
offline evals** so that the differences can be observed directly.

It is an executable proof-of-concept, not a production framework.

## Quick Start

```bash
git clone https://github.com/rmax-ai/beyond-evals-lab.git
cd beyond-evals-lab
pnpm install
pnpm test
```

No API keys required. The default agent is rule-based and fully deterministic.

## Experiments

Each experiment below can be run with a single command.

### Experiment 1 — Tests are not the opposite of evals

```bash
pnpm test
pnpm eval
```

Vitest deterministically establishes properties of implementation components.
The eval harness runs tasks sampled from an empirical task distribution. Some
eval graders are deterministic. **Determinism does not distinguish tests from
evals.**

### Experiment 2 — Verify one run

```bash
pnpm demo:success
```

`verifyRefundOutcome()` establishes evidence for a specific execution. This is
**verification** — claims about what happened in one run.

### Experiment 3 — Evaluate many runs

```bash
pnpm eval
```

The same verifier now contributes to `verified_outcome_rate`. This is
**evaluation** — an empirical estimate across a task distribution. Same
function, different epistemic role.

### Experiment 4 — Correct outcome, unacceptable path

```bash
pnpm demo:trajectory-failure
```

```
Outcome       PASS
Trajectory    FAIL
Overall       NOT ACCEPTABLE
```

The agent produced the correct refund but attempted a prohibited action first.
Outcome-only evaluation would have missed this.

### Experiment 5 — Verification is not validation

```bash
pnpm demo:validation-failure
```

```
Verification  PASS
Validation    FAIL
```

The system correctly executed a refund it should never have chosen. Verification
asks "was this executed correctly?" Validation asks "should this have been done
at all?"

### Experiment 6 — Guardrails are not verification

```bash
pnpm demo:control-block
```

A control asks: *May this action execute?*

A verifier asks: *What actually happened?*

Neither replaces the other.

### Experiment 7 — Production creates future evals

```bash
pnpm demo:feedback-loop
```

```
monitoring → evidence → candidate cases → curation → evaluation → regression protection
```

Production traces become the empirical task distribution for future evaluations.
The human curation step is preserved deliberately — observed behavior is not
automatically expected behavior.

### Trace storage

Every demo run is persisted locally in SQLite at `traces/assurance.db` (which is
gitignored). Mine the persisted history and render an assurance report for a
stored run with:

```bash
pnpm traces:mine
pnpm assurance:report <run-id>
```

Use `--database <path>` with either command to inspect another SQLite database.

Add `--markdown` for an LLM-generated, human-friendly explanation of the same
report. Markdown starts with a deterministic verdict, claim checklist,
evidence references, controls, trajectory, and residual risk. The AI narrative
appears last and is explicitly non-authoritative, making unsupported prose easy
to compare against the deterministic sections. This is the only rendering that
needs a key; the console and JSON formats stay keyless and deterministic.

```bash
OPENAI_API_KEY=... pnpm assurance:report --markdown
```

`ASSURANCE_REPORT_MODEL` overrides the default model (`gpt-5.6-luna`).

## Eve Agent Wiring

Eve hosts a real framework agent whose tools still run through the lab's
governed runtime. Eve's scenario evals provide a capability lens; the lab's
assurance report provides the governance lens over the same session.

```bash
pnpm eve:info
pnpm eve:eval
pnpm demo:eve
```

Run evals with `EVE_MOCK=1` for the keyless mock path. A live model is opt-in:

```bash
# Live evals (real model; requires an OpenAI key on PATH/env)
EVE_DIRECT_OPENAI=1 OPENAI_API_KEY=... npx eve eval
# Live assurance demo over a real model session
EVE_DIRECT_OPENAI=1 OPENAI_API_KEY=... pnpm demo:eve
```

`EVE_MODEL` selects the model for the default Vercel AI Gateway path, which
requires `AI_GATEWAY_API_KEY` or `eve link` (OIDC). `EVE_DIRECT_OPENAI=1`
instead wires the OpenAI SDK to `gpt-5.6-luna` and bypasses the gateway — only
`OPENAI_API_KEY` is needed. Direct mode takes precedence over `EVE_MOCK=1`, so
it cannot silently fall back to the scenario model; keyless mock stays the
default when direct mode is not enabled.

### Historical live-run results (Milestone 9)

The results below were recorded with `gpt-5.4-mini`; they are not a performance
claim for the current direct OpenAI default, `gpt-5.6-luna`.

| Suite | Mock (`EVE_MOCK=1`) | Live (`EVE_DIRECT_OPENAI=1`, gpt-5.4-mini) |
|---|---|---|
| Scenario evals | 4/4 (19/19 gates) | 3/4 (17/19 gates) |
| `demo:eve` assurance | ACCEPTABLE | ACCEPTABLE |

The one live eval gap is `refund-audit-gate`: its `get-transactions` and
`AUDIT_GATE_HELD` gates encode the mock's probe sequence (lookup attempt
*after* refund creation, which the audit gate blocks). The live model refuses
to skip the initial lookup, never triggers the gate, and honestly reports
`REFUND_PERSISTED` — more compliant behavior, but the gates don't credit it.
The evals are left unchanged; they calibrate the deterministic mock.

## Architecture

```
                        ┌── controls
                        │
request → agent → runtime → world state
               │           │
               │           ├── execution trace
               │           └── runtime verification
               │
               └── trajectory
                        │
                        v
                 assurance evidence
                        │
        ┌───────────────┼───────────────┐
        v               v               v
   validation       monitoring      eval harness
                                        │
                                        v
                              population statistics
```

## Conceptual Map

| Mechanism | Primary Question | Scope |
|-----------|-----------------|-------|
| Test | Does this software property hold? | implementation |
| Control | Is this proposed action permitted? | pre-action |
| Verification | What can we establish about this execution? | one run |
| Trajectory | Was the path acceptable? | one run |
| Validation | Was this behavior appropriate? | scenario/system |
| Monitoring | What is happening in deployed executions? | production |
| Eval | How does behavior vary across a task distribution? | population |
| Assurance | What evidence supports the claims we care about? | system-level |

**Deterministic/probabilistic** describes the evidence mechanism.
**Tests/verification/evals/monitoring/controls** describe how the evidence is
being used. These are different axes.

## Repository Structure

```
src/
├── domain/          # Pure types, world state, fixtures, invariants
├── agent/           # Agent interface + rule-based implementation
├── tools/           # Tool contracts + implementations (only mutation path)
├── controls/        # Pre-action guardrails (auth, limits, schema, forbidden)
├── runtime/         # Execute runs, mediate agent↔tools, collect traces
├── verification/    # Post-execution claim-level evidence
├── trajectory/      # Path analysis, blocked-action detection
├── validation/      # Business-intent rules
├── assurance/       # Combine evidence → structured report
├── eval/            # Dataset runner, graders, aggregation
├── traces/          # SQLite persistence, mining, fixture generation
├── telemetry/       # OpenTelemetry spans (optional)
└── cli/             # Commander CLI entry points
```

## Key Design Decisions

1. **Same verifier function, two roles.** `verifyRefundOutcome()` is used both
   for runtime assurance (one run) and eval grading (population estimate).
2. **Claim-oriented verification.** Returns structured evidence per claim, not
   a boolean. A refund might be correct but missing an audit record — that's two
   separate claims, not one pass/fail.
3. **No aggregate quality score.** Outcome, verification, validation,
   trajectory, controls, and efficiency are reported separately. Composite
   scores are explicitly experimental if they exist.
4. **Controls + verification are complementary.** Controls prevent, verifiers
   detect. Neither replaces the other.
5. **Human curation in the feedback loop.** Production anomalies become
   candidate fixtures, not automatic eval cases. Expected behavior requires
   human interpretation.

## Development

```bash
pnpm install          # Install dependencies
pnpm test             # Run all tests
pnpm eval             # Run eval harness on core dataset
```

## License

MIT — see [LICENSE](LICENSE)

## Documentation

- [SPEC.md](SPEC.md) — Full project specification (authoritative reference)
- [AGENTS.md](AGENTS.md) — Codex conventions and architecture non-negotiables
- [docs/](docs/) — Architecture, decisions, and roadmap
