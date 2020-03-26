<script>
  import {
    toggleCamera,
    isReading$,
    qrdata$,
    setVideoElement,
    stop,
    reset,
    startCamera
  } from "../libs/QRfromMedia.js";
  import { copyToClip } from "../libs/clip.js";
  import { derived } from "svelte/store";
  import { onDestroy, onMount } from "svelte";
  onMount(() => {
    startCamera();
  });
  onDestroy(() => {
    stop();
    reset();
  });

  let width = 500;
  let height = 500;
  setVideoElement("video");
  const reg = new RegExp(
    "((https?|ftp)(://[-_.!~*'()a-zA-Z0-9;/?:@&=+$,%#]+))"
  );
  const isUrl$ = derived(qrdata$, $qrdata$ => reg.test($qrdata$));
</script>

<div>
  <section>
    <button
      class="{$isReading$ ? 'bg-red-500 hover:bg-red-700' : 'bg-blue-500 hover:bg-blue-700'}
      text-white font-bold py-2 px-4 rounded-full"
      on:click={() => toggleCamera()}>
      {#if $isReading$}Stop Camera{:else}Start Camera{/if}
    </button>
  </section>
  {#if $qrdata$}
    <section
      class="rounded border-r border-b border-l border-gray-400 m-1 p-2 mt-3
      bg-blue-100">
      {#if $isUrl$}
        <a href={$qrdata$} target="_blank">{$qrdata$}</a>
      {:else}{$qrdata$}{/if}
      [
      <a href="_" on:click|preventDefault={() => copyToClip($qrdata$)}>clip</a>
      ]
    </section>
  {/if}
  <div class="border rounded w-full h-auto sm:w-64 sm:h-64 my-4">
    <video {width} {height} autoplay />
  </div>
</div>
