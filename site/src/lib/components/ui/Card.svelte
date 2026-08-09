<script lang="ts">
  let { children }: { children?: import("svelte").Snippet } = $props();
</script>

<div class="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
  {@render children?.()}
</div>
