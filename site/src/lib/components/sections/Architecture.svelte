<script lang="ts">
  import { base } from "$app/paths";
  import Section from "$lib/components/ui/Section.svelte";
</script>

<Section>
  <h2 class="text-2xl font-bold text-white mb-4">Architecture</h2>
  <p class="text-slate-400 mb-6 leading-relaxed">
    The runtime pipeline separates concerns that most frameworks conflate.
    Controls run before mutation, verification after, and the eval harness
    reuses the same verifiers — just with a different question.
  </p>

  <img
    src="{base}/architecture.svg"
    alt="Beyond Evals Lab architecture — control, verification, trajectory, validation, monitoring, and eval pipelines"
    class="w-full h-auto max-w-2xl mx-auto"
  />

  <div class="mt-8 grid gap-3 sm:grid-cols-2">
    <div class="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
      <h3 class="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Runtime Pipeline</h3>
      <code class="text-xs text-slate-400 font-mono leading-relaxed block">
        parse → control → execute → mutate → trace
      </code>
      <p class="text-xs text-slate-500 mt-2">Agent never calls tools directly. Runtime mediates every interaction.</p>
    </div>
    <div class="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
      <h3 class="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Offline Eval</h3>
      <code class="text-xs text-slate-400 font-mono leading-relaxed block">
        dataset → run → verify → grade → aggregate
      </code>
      <p class="text-xs text-slate-500 mt-2">Same verifyRefundOutcome() used in runtime and offline eval.</p>
    </div>
  </div>
</Section>
