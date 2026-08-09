<script lang="ts">
  import Header from "$lib/components/sections/Header.svelte";
  import Hero from "$lib/components/sections/Hero.svelte";
  import Thesis from "$lib/components/sections/Thesis.svelte";
  import Experiments from "$lib/components/sections/Experiments.svelte";
  import Architecture from "$lib/components/sections/Architecture.svelte";
  import Metrics from "$lib/components/sections/Metrics.svelte";
  import Quickstart from "$lib/components/sections/Quickstart.svelte";
  import Footer from "$lib/components/sections/Footer.svelte";
</script>

<Header />
<main>
  <Hero />
  <Thesis />
  <Experiments />
  <Architecture />
  <Metrics />
  <Quickstart />
  <Footer />
</main>
