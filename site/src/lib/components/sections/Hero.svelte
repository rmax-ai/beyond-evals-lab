<script lang="ts">
  import { REPO_URL } from "$lib/data/meta";
  import Section from "$lib/components/ui/Section.svelte";
</script>

<Section tag="header">
  <div class="text-center space-y-6">
    <h1 class="text-4xl sm:text-5xl font-bold text-white tracking-tight">
      Beyond Evals Lab
    </h1>
    <p class="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
      An executable proof-of-concept for practical assurance of agentic systems.
      Tests, controls, verification, validation, trajectory analysis, monitoring,
      and offline evals — as separate, composable mechanisms.
    </p>
    <div class="flex items-center justify-center gap-3 pt-2">
      <a
        href={REPO_URL}
        class="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm transition-colors"
      >
        View on GitHub
      </a>
      <code class="px-3 py-2.5 bg-slate-900 text-slate-400 rounded-lg text-sm font-mono border border-slate-800">
        pnpm install && pnpm test
      </code>
    </div>
    <p class="text-xs text-slate-600 pt-1">No API keys required. Rule-based agent, fully deterministic.</p>
  </div>
</Section>
