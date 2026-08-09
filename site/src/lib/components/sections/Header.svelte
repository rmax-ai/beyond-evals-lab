<script lang="ts">
  import { REPO_URL, PROJECT_VERSION } from "$lib/data/meta";
  import { base } from "$app/paths";
</script>

<header class="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
  <div class="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
    <a href={base + "/"} class="flex items-center gap-2 text-white font-semibold text-sm">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="18" height="18" rx="4" stroke="#6366f1" stroke-width="1.5" />
        <path d="M6 10h3m2-3v6m2-4v2" stroke="#818cf8" stroke-width="1.5" stroke-linecap="round" />
      </svg>
      Beyond Evals Lab
    </a>
    <div class="flex items-center gap-4">
      <a href={REPO_URL} class="text-slate-400 hover:text-slate-200 text-sm transition-colors">GitHub</a>
      <span class="text-xs text-slate-600">{PROJECT_VERSION}</span>
    </div>
  </div>
</header>
