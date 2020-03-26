<script>
  import {
    toggleCapture,
    isReading$,
    qrdata$,
    stop,
    reset
  } from "../libs/QRfromMedia.js";
  import { derived } from "svelte/store";
  import { copyToClip } from "../libs/clip.js";
  import { onDestroy } from "svelte";
  onDestroy(() => {
    stop();
    reset();
  });
  const reg = new RegExp(
    "((https?|ftp)(://[-_.!~*'()a-zA-Z0-9;/?:@&=+$,%#]+))"
  );
  const isUrl$ = derived(qrdata$, $qrdata$ => reg.test($qrdata$));
</script>

<div>
  <section>
    <button
      class="{$isReading$ ? 'bg-red-500 hover:bg-red-700' : 'bg-blue-500 hover:bg-blue-700'}
      text-white font-bold py-2 px-4 rounded-full m-auto block"
      on:click={() => toggleCapture()}>
      {#if $isReading$}Stop capture{:else}Start capture{/if}
    </button>
  </section>
  {#if $qrdata$}
    <section
      class="rounded border-r border-b border-l border-gray-400 m-1 p-2 mt-3
      bg-blue-100">
      {#if $isUrl$}
        <a href={$qrdata$} target="_blank">{$qrdata$}</a>
      {:else}{$qrdata$}{/if}
      <a
        href="_"
        on:click|preventDefault={() => copyToClip($qrdata$)}
        class="bg-blue-300 hover:bg-blue-400 text-white rounded-full px-3 py-1">
        clip
      </a>
    </section>
  {/if}
</div>
