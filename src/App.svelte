<script>
  import Router, { location } from "svelte-spa-router";
  import { push } from "svelte-spa-router";
  import active from "svelte-spa-router/active";
  import routes, { params$ } from "./routes.js";
  import Tabpager from "./components/Tabpager.svelte";

  const isMobile = () =>
    ["iPhone", "iPad", "Android"].some(mobile =>
      navigator.userAgent.includes(mobile)
    );

  const tabs = {
    "/": "make"
  };
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    tabs["/camera"] = "camera";
  if (
    navigator.mediaDevices &&
    navigator.mediaDevices.getDisplayMedia &&
    !isMobile()
  )
    tabs["/capture"] = "capture";

  function onChange(event) {
    push(event.detail.value);
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js");
  }
</script>

<div class="flex justify-center">
  <div class="contents m-5 w-10/12 sm:w-64">

    <main class="overflow-hidden p-1">
      <h1>QRCode</h1>
      <Tabpager
        value={$location}
        options={tabs}
        on:change={event => onChange(event)} />
      <Router {routes} />
    </main>
  </div>
</div>
