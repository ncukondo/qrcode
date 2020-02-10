<script>
  import QRGenerator from "./components/QRGenerator.svelte";
  import Router from "./components/Router.svelte";

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js");
  }
</script>

<main class="overflow-hidden">
  <Router />
  <QRGenerator />
</main>
