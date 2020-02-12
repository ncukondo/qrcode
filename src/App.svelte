<script>
  import QRGenerator from "./components/QRGenerator.svelte";

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js");
  }
</script>

<main class="overflow-hidden">
  <QRGenerator />
</main>
