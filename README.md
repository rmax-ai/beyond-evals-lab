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
