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
    <div class="mt-2 text-slate-500"># Output: 96 tests passed in 23 files</div>
    <div class="mt-3"><span class="text-slate-500">$</span> pnpm demo:success</div>
    <div><span class="text-slate-500">$</span> pnpm demo:trajectory-failure</div>
    <div><span class="text-slate-500">$</span> pnpm demo:validation-failure</div>
    <div class="mt-2 text-slate-500"># Run all demos to see each assurance concept in action</div>
    <div class="mt-3"><span class="text-slate-500">$</span> pnpm eval</div>
    <div class="text-slate-500"># Eval harness across 20 cases, multi-dimensional report</div>
    <div class="mt-3"><span class="text-slate-500">$</span> pnpm demo:eve</div>
    <div class="text-slate-500"># Real framework agent (Eve) through the same governed runtime — keyless</div>
  </div>

  <p class="mt-4 text-sm text-slate-500">
    No API keys required. The default agent is rule-based and fully
    deterministic. A live model for the Eve agent is opt-in:
    <code class="font-mono text-slate-400">EVE_DIRECT_OPENAI=1</code> +
    <code class="font-mono text-slate-400">OPENAI_API_KEY</code>.
  </p>

  <p class="mt-3 text-sm text-slate-500">
    Eve uses the scenario model only when direct mode is absent. Direct mode
    uses the real OpenAI GPT-5.6 Luna model and takes precedence over an inherited mock
    setting. The refund tools intentionally remain local, fixture-backed lab
    tools. Each completed Eve session is stored in local SQLite for
    <code class="font-mono text-slate-400">traces:mine</code> and
    run-ID assurance reports.
  </p>
</Section>
