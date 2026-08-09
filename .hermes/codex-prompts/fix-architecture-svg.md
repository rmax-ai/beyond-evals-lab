Fix the architecture diagram SVG at site/static/architecture.svg for the beyond-evals-lab website.

Current path: site/static/architecture.svg
Build output: docs/architecture.svg (must match after rebuild)

## Problems with the current SVG

1. The layout is cramped — elements overlap and spacing is tight. The right column (Monitoring, Eval Datasets, Eval Harness, Population Statistics) is squashed into a narrow band while the left side has empty space.

2. The Controls → BLOCKED flow shows a red dashed line going straight down, but conceptually controls should be shown intercepting between the agent and runtime — not as a side path.

3. The "Agent" box at (170, 60) has text at (220, 83) — text is right-aligned and nearly overflows the box boundary.

4. Eval Harness at x=610 and Population Statistics at x=610 overlap vertically with Eval Datasets. Need more vertical space.

5. The bottom section ("deterministic / probabilistic" and "tests / verification / evals") feels disconnected from the rest of the diagram.

## What the diagram should represent (from the project README)

The architecture has two main pipelines:

**Runtime pipeline:**
```
request → agent → runtime → world state
               ↑          │
           controls        ├── execution trace
                           └── runtime verification
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

**Offline eval pipeline:**
```
EvalDataset → EvalRunner → execute agent → collect trajectory → verification → grading → aggregate report
```

The key design insight: `verifyRefundOutcome()` is the SAME function used in both pipelines — once for runtime assurance (per-run evidence) and once for offline eval (population statistics).

## Requirements for the new SVG

1. **Wider canvas** — use 900×600 or similar to give room
2. **Clear flow** — Runtime pipeline flows left-to-right top, then feeds down into evidence production, then splits three ways at the bottom
3. **Controls shown intercepting between agent and runtime** — controls are pre-action, they sit between agent's tool proposals and the runtime's execution
4. **Two clear lanes**: left = runtime (agent → controls → runtime → state → verification), right = offline eval (datasets → harness → aggregate). Show `verifyRefundOutcome()` bridging both.
5. **Monitoring feeds eval datasets** — green dashed arrow from monitoring (production traces) to eval datasets (candidate fixtures → human curation → regression tests)
6. **Dark theme colors** (matching the site's slate-950 background):
   - Background: `#0f172a` (slate-900)
   - Regular nodes: `#1e293b` fill, `#334155` stroke
   - Runtime/active nodes: `#312e81` fill, `#4338ca` stroke (indigo)
   - Text: `#e2e8f0` (slate-200)
   - Accent arrows: `#6366f1` (indigo-500)
   - Red/fail path: `#ef4444` dashed
   - Green/monitoring: `#22c55e` dashed
7. **Readable font sizes** — minimum 11px for labels, 12px for node text
8. **Clean spacing** — nodes should have consistent padding, no overlapping text

## Technical notes

- File must be valid SVG, placed at site/static/architecture.svg
- After writing, run: `cd site && pnpm build && touch ../docs/.nojekyll`
- The build outputs to ../docs/ so the SVG will appear at docs/architecture.svg
- Verify the build succeeds with `pnpm build` before committing

## Reference: project README architecture ascii diagram

```
                        ┌── controls
                        │
request -> agent -> runtime -> world state
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

Write the new SVG now. Make it clean, spacious, and visually polished. Do NOT change any other files — only site/static/architecture.svg.
