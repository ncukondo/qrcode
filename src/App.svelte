<script>
  import Router from "svelte-spa-router";
  import { push } from "svelte-spa-router";
  import active from "svelte-spa-router/active";
  import routes, { params$ } from "./routes.js";
  import Tabpager from "./components/Tabpager.svelte";

  const tabs = {
    "/": "make",
    "/camera": "camera",
    "/capture": "capture"
  };
  let currentTab = "/";
  $: push(currentTab);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js");
  }

  params$.subscribe(params => console.log(params));
</script>

<div class="flex justify-center">
  <div class="contents m-5 w-10/12 sm:w-64">

    <main class="overflow-hidden p-1">
      <h1>QRCode</h1>
      <Tabpager bind:value={currentTab} options={tabs} />
      <Router {routes} />
    </main>
  </div>
</div>
