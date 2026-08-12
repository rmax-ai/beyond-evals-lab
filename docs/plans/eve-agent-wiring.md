# Plan — Wire Eve Agents into Beyond-Evals Lab

**Date:** 2026-08-12
**Status:** Complete
**Realizes:** ROADMAP Milestone 8 (swap-in model agent) — via Eve instead of a hand-rolled adapter.

## Why

Milestones 1–7 prove the assurance stack (controls → verification → trajectory →
validation → assurance report) against a hand-rolled rule agent. The open question:
does the machinery hold against a *real framework agent*? Wiring Eve (Vercel's
filesystem-first agent framework) answers it. Bonus: Eve ships its own eval
harness — so the repo demonstrates the core thesis concretely: **Eve's evals
(capability lens) vs. the lab's assurance stack (governance lens), two distinct
lenses on the same agent.**

## Architecture

```
beyond-evals-lab/           (app root = repo root; package.json name = beyond-evals-lab)
├── agent/                  Eve agent — filesystem-discovered
│   ├── agent.ts            defineAgent({ model: EVE_MODEL ?? 'openai/gpt-5.4-mini' })
│   ├── instructions.md     Refund-agent system prompt
│   └── tools/              5 wrappers, each delegating to runtime.executeTool()
├── evals/                  Eve's native eval lens (app root, NOT inside agent/)
│   ├── evals.config.ts     defineEvalConfig({})
│   └── *.eval.ts           mockModel — deterministic, no API key
├── src/eve/                Lab-side bridge (imported by agent/tools/)
│   ├── session-runtime.ts  Per-session runtime: executeTool + trace + AgentRun export
│   └── session-store.ts    Map<sessionId, EveSessionRuntime>
└── src/cli/eve.ts          `pnpm demo:eve` — assurance report over an Eve session
```

## Invariants preserved (from AGENTS.md)

1. **Runtime mediates everything.** Eve tool `execute()` never touches `WorldState`
   directly — it calls `executeTool()`, so controls run before mutation and every
   event lands in the trace.
2. **Keyless by default.** Tests/evals use `mockModel`. Live model is opt-in
   (`EVE_MODEL` + `OPENAI_API_KEY` via `.envrc` + pass).
3. **No zod imports in `agent/`.** Eve v0.27.7 + zod@3 crashes `eve info`.
   Eve tool input schemas are plain JSON Schema objects; real validation happens
   inside `executeTool` (SchemaValidationControl + zod safeParse).
4. **Assurance stack stays framework-free.** Eve is the agent-under-test, not the
   assurance implementation. `src/verification`, `src/validation`,
   `src/trajectory`, `src/assurance` remain untouched.

## Eve version pitfalls (verified on this machine / movement-lab)

- Pin `eve@0.27.7` exactly (installed). 0.27.8+ has a compile crash regression.
- `defineTool<any, any>` to bypass `PublicToolInputSchema` typing.
- Eve tool files import internal modules with `.js` extensions (jiti loader).
- `evals/` must be at app root (repo root here), sibling of `agent/`.
- `evals.config.ts` required even if empty.
- `.eve/` cache dir → gitignored.
- Subagent `agent.ts` needs `description` (not used in Phase A–D).

## Phases (Codex batches, ≤4 files each)

| Phase | Deliverable | Files |
|-------|-------------|-------|
| [x] A | Bridge + agent scaffold | `src/eve/session-runtime.ts`, `src/eve/session-store.ts`, `agent/agent.ts`, `agent/instructions.md` |
| [x] B1 | Read tool wrappers | `agent/tools/get-transactions.ts`, `agent/tools/get-transaction.ts`, `test/eve/session-runtime.test.ts` |
| [x] B2 | Write tool wrappers | `agent/tools/create-refund.ts`, `agent/tools/get-refund.ts`, `agent/tools/write-audit-record.ts` |
| [x] C | Eve evals + scripts | `evals/evals.config.ts`, 4× `evals/*.eval.ts`, package.json scripts (`eve:info`, `eve:eval`) |
| [x] D | Assurance bridge + docs | `src/cli/eve.ts` (`demo:eve`), `docs/` updates (DECISIONS, AGENTS, ROADMAP), README |

## Verification gates (run by orchestrator after each phase)

```bash
pnpm test              # 96 tests — all green
pnpm typecheck         # tsc --noEmit clean
npx eve info           # Compile: ready, 0 errors
npx eve eval           # all pass, keyless (mockModel)
```

## Environment notes

- pnpm 11.21.0 via corepack (mise Node 24): `export PATH="$HOME/.local/share/mise/installs/node/24.13.0/bin:$PATH"`
- Codex binary via mise shims. Sandbox: workspace-write. Git/verification handled by orchestrator.
- Push access fixed: repo is `rmax-ai/beyond-evals-lab`, viewerPermission=ADMIN.

## Verification Results

- Vitest: 96 tests passing
- Eve evals: 4/4 passing
- `pnpm demo:eve`: `ACCEPTABLE` assurance report
- Typecheck: clean

## Out of scope (future)

- Live chat UI (would need Next.js + `eve/react` — the lab is CLI-first by Decision 10)
- Real model live demo (`demo:eve:live`) — needs OPENAI_API_KEY in env
- Subagents (e.g., verifier subagent) — only after the base wiring is proven
