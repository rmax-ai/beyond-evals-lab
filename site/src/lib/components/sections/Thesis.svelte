<script lang="ts">
  import Section from "$lib/components/ui/Section.svelte";
  import Card from "$lib/components/ui/Card.svelte";
</script>

<Section>
  <h2 class="text-2xl font-bold text-white mb-4">The Thesis</h2>
  <p class="text-slate-400 mb-8 leading-relaxed">
    Agent assurance is not equivalent to agent evaluation.
    A production agent needs several distinct mechanisms — tests, controls,
    verification, validation, trajectory analysis, and monitoring — and
    assurance combines these pieces without pretending they are interchangeable.
  </p>

  <div class="grid gap-4 sm:grid-cols-2">
    <Card>
      <h3 class="text-sm font-semibold text-indigo-400 mb-2">Deterministic ≠ Test</h3>
      <p class="text-sm text-slate-400 leading-relaxed">
        Deterministic code can be an eval grader. Probabilistic code can be a
        test. The distinction is about what question is being answered, not the
        nature of the code.
      </p>
    </Card>
    <Card>
      <h3 class="text-sm font-semibold text-indigo-400 mb-2">Probabilistic ≠ Eval</h3>
      <p class="text-sm text-slate-400 leading-relaxed">
        A model-based grader is probabilistic but its output is still evidence
        about one run — not a population estimate. The context determines the
        epistemic role.
      </p>
    </Card>
    <Card>
      <h3 class="text-sm font-semibold text-indigo-400 mb-2">Verification is per-execution</h3>
      <p class="text-sm text-slate-400 leading-relaxed">
        Given run-123, verification returns claims about that specific
        execution. Evaluation estimates behavior across a distribution.
        Same checker, different question.
      </p>
    </Card>
    <Card>
      <h3 class="text-sm font-semibold text-indigo-400 mb-2">No single quality score</h3>
      <p class="text-sm text-slate-400 leading-relaxed">
        Outcome, verification, validation, trajectory, controls, and efficiency
        are reported separately. Composite scores are explicitly experimental
        if they exist at all.
      </p>
    </Card>
  </div>
</Section>
