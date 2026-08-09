<script lang="ts">
  import { REPO_URL } from "$lib/data/meta";
  import Section from "$lib/components/ui/Section.svelte";
</script>

<Section>
  <h2 class="text-2xl font-bold text-white mb-4">Quick Start</h2>

  <div class="bg-black border border-slate-800 rounded-lg p-4 font-mono text-sm text-slate-300 leading-relaxed overflow-x-auto">
    <div><span class="text-slate-500">$</span> git clone {REPO_URL}.git</div>
    <div><span class="text-slate-500">$</span> cd beyond-evals-lab</div>
    <div><span class="text-slate-500">$</span> pnpm install</div>
    <div><span class="text-slate-500">$</span> pnpm test</div>
    <div class="mt-2 text-slate-500"># Output: 91 tests passed in 22 files</div>
    <div class="mt-3"><span class="text-slate-500">$</span> pnpm demo:success</div>
    <div><span class="text-slate-500">$</span> pnpm demo:trajectory-failure</div>
    <div><span class="text-slate-500">$</span> pnpm demo:validation-failure</div>
    <div class="mt-2 text-slate-500"># Run all demos to see each assurance concept in action</div>
    <div class="mt-3"><span class="text-slate-500">$</span> pnpm eval</div>
    <div class="text-slate-500"># Eval harness across 20 cases, multi-dimensional report</div>
  </div>

  <p class="mt-4 text-sm text-slate-500">
    No API keys required. The default agent is rule-based and fully deterministic.
  </p>
</Section>
