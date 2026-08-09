<script lang="ts">
  import { EXPERIMENTS } from "$lib/data/meta";
  import Section from "$lib/components/ui/Section.svelte";
  import Card from "$lib/components/ui/Card.svelte";
</script>

<Section>
  <h2 class="text-2xl font-bold text-white mb-4">Experiments</h2>
  <p class="text-slate-400 mb-8 leading-relaxed">
    Seven experiments, each runnable with a single command. Understand each
    assurance concept by observing it in action — no theory required.
  </p>

  <div class="space-y-4">
    {#each EXPERIMENTS as exp}
      <Card>
        <div class="flex items-start gap-4">
          <span class="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center text-xs font-bold text-indigo-400">
            {exp.num}
          </span>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-semibold text-white mb-1">{exp.title}</h3>
            <p class="text-sm text-slate-400 leading-relaxed mb-2">{exp.insight}</p>
            <div class="flex flex-wrap gap-1.5">
              {#each exp.commands as cmd}
                <code class="px-2 py-0.5 bg-black text-slate-400 rounded text-xs font-mono">{cmd}</code>
              {/each}
            </div>
          </div>
        </div>
      </Card>
    {/each}
  </div>
</Section>
