<script lang="ts">
  let { text, variant = "default" }: { text: string; variant?: "default" | "pass" | "fail" | "warn" | "info" } = $props();

  const colors: Record<string, string> = {
    default: "bg-slate-800 text-slate-300 border-slate-700",
    pass: "bg-emerald-950/50 text-emerald-400 border-emerald-800",
    fail: "bg-red-950/50 text-red-400 border-red-800",
    warn: "bg-amber-950/50 text-amber-400 border-amber-800",
    info: "bg-indigo-950/50 text-indigo-400 border-indigo-800",
  };
</script>

<span class="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border {colors[variant]}">
  {text}
</span>
