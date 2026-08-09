<script lang="ts">
  import { REPO_URL, PROJECT_VERSION, KEY_DECISIONS } from "$lib/data/meta";
  import Section from "$lib/components/ui/Section.svelte";
  import Card from "$lib/components/ui/Card.svelte";
</script>

<Section>
  <h2 class="text-2xl font-bold text-white mb-4">Key Design Decisions</h2>
  <div class="space-y-3">
    {#each KEY_DECISIONS as d, i}
      <Card>
        <div class="flex items-start gap-3">
          <span class="flex-shrink-0 text-xs font-bold text-indigo-500 mt-0.5">{i + 1}.</span>
          <p class="text-sm text-slate-300 leading-relaxed">{d}</p>
        </div>
      </Card>
    {/each}
  </div>
</Section>

<Section>
  <h2 class="text-2xl font-bold text-white mb-4">Conceptual Map</h2>
  <p class="text-slate-400 mb-6 leading-relaxed">
    Deterministic/probabilistic describes the evidence mechanism.
    Tests/verification/evals/monitoring/controls describe how the evidence is
    being used. These are different axes.
  </p>

  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-slate-800 text-left">
          <th class="py-2 pr-4 text-slate-500 font-medium">Mechanism</th>
          <th class="py-2 pr-4 text-slate-500 font-medium hidden sm:table-cell">Primary Question</th>
          <th class="py-2 text-slate-500 font-medium">Scope</th>
        </tr>
      </thead>
      <tbody>
        {#each [{ mechanism: "Test", question: "Does this software property hold?", scope: "implementation" }, { mechanism: "Control", question: "Is this proposed action permitted?", scope: "pre-action" }, { mechanism: "Verification", question: "What can we establish about this execution?", scope: "one run" }, { mechanism: "Trajectory", question: "Was the path acceptable?", scope: "one run" }, { mechanism: "Validation", question: "Was this behavior appropriate?", scope: "scenario/system" }, { mechanism: "Monitoring", question: "What is happening in deployed executions?", scope: "production" }, { mechanism: "Eval", question: "How does behavior vary across a task distribution?", scope: "population" }, { mechanism: "Assurance", question: "What evidence supports the claims we care about?", scope: "system-level" }] as m}
          <tr class="border-b border-slate-800/50">
            <td class="py-2 pr-4 text-white font-medium">{m.mechanism}</td>
            <td class="py-2 pr-4 text-slate-400 hidden sm:table-cell">{m.question}</td>
            <td class="py-2">
              <span class="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-400">{m.scope}</span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</Section>

<footer class="border-t border-slate-800 py-8 px-4 sm:px-6 max-w-4xl mx-auto">
  <div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
    <div class="flex items-center gap-4">
      <a href={REPO_URL} class="hover:text-slate-400 transition-colors">GitHub</a>
      <a href={REPO_URL + "/blob/main/SPEC.md"} class="hover:text-slate-400 transition-colors">SPEC</a>
      <a href={REPO_URL + "/blob/main/LICENSE"} class="hover:text-slate-400 transition-colors">MIT</a>
    </div>
    <div>
      Beyond Evals Lab {PROJECT_VERSION} — A research proof-of-concept
    </div>
  </div>
</footer>
