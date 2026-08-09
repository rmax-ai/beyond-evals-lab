<script lang="ts">
  import { METRICS } from "$lib/data/meta";
  import Section from "$lib/components/ui/Section.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
</script>

<Section>
  <h2 class="text-2xl font-bold text-white mb-4">Current Metrics</h2>
  <p class="text-slate-400 mb-8 leading-relaxed">
    From <code class="px-1.5 py-0.5 bg-slate-900 rounded text-xs font-mono">pnpm eval</code>
    across 20 cases in the core dataset. No single aggregate score — each dimension
    is reported independently.
  </p>

  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each METRICS as m}
      <div class="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-slate-500">{m.label}</span>
          <Badge text={m.status} variant={m.status as "pass" | "fail" | "warn" | "info"} />
        </div>
        <span class="text-2xl font-bold text-white">{m.value}</span>
        <p class="text-xs text-slate-500 mt-1">{m.desc}</p>
      </div>
    {/each}
  </div>

  <div class="mt-6 bg-slate-900/50 border border-slate-800 rounded-lg p-4">
    <p class="text-sm text-slate-400">
      <span class="text-indigo-400 font-semibold">Important:</span>
      The disagreements are more informative than any aggregate pass rate.
      <span class="text-amber-400">8 cases</span> where outcome passes but trajectory fails,
      <span class="text-amber-400">3 cases</span> where verification passes but validation fails.
      These are the cases that demonstrate why outcome-only evaluation is insufficient.
    </p>
  </div>
</Section>
