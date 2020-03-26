<script>
  import { createEventDispatcher } from "svelte";
  import { crossfade } from "svelte/transition";
  export let options;
  export let value;

  const dispatch = createEventDispatcher();

  const isObject = obj =>
    Object.prototype.toString.call(obj) === "[object Object]";

  let dictOptions = [];

  function onChange(event) {
    dispatch("change", {
      ...event,
      srcElement: event.srcElement,
      value: event.srcElement.value
    });
  }

  const [send, receive] = crossfade({
    duration: d => Math.sqrt(d * 200),

    fallback(node, params) {
      const style = getComputedStyle(node);
      const transform = style.transform === "none" ? "" : style.transform;

      return {
        duration: 600,
        easing: quintOut,
        css: t => `
					transform: ${transform} scale(${t});
					opacity: ${t}
				`
      };
    }
  });

  $: {
    if (Array.isArray(options)) {
      dictOptions = options.map(value =>
        isObject(value) ? { ...value } : { value, label: value }
      );
    } else if (isObject(options)) {
      dictOptions = Object.entries(options).map(([key, value]) => ({
        value: key,
        label: value
      }));
    }
    value = value.toString();
  }
</script>

<style>
  .tabmenu {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: space-around;
    margin: 1rem 0 1rem 0;
  }

  .tabmenu input[type="radio"] {
    display: none;
  }
  .tabmenu label {
    width: 100%;
    display: block;
    flex-grow: 1;
  }
  .tabmenu input[type="radio"] + .label {
    position: relative;
    width: 100%;
    display: block;
    padding: 0.5rem 0 0.2rem 0;
    color: #000;
    border-bottom: 0.1rem solid;
    border-color: #ddd;
    text-align: center;
    cursor: pointer;
  }

  .tabmenu input[type="radio"]:checked + .label {
    color: #0ae;
  }
  .active_tab {
    width: 100%;
    height: 0.3rem;
    background-color: #0ae;
    position: absolute;
    bottom: -0.1rem;
  }
</style>

<div class="tabmenu {$$props.class}">
  {#each dictOptions as item}
    <label>
      <input
        type="radio"
        bind:group={value}
        value={item.value}
        on:change={event => onChange(event)} />
      <div class="label">
        {item.label}
        {#if value == item.value}
          <div
            class="active_tab"
            in:receive={{ key: 'tabmarker' }}
            out:send={{ key: 'tabmarker' }} />
        {/if}
      </div>
    </label>
  {/each}
</div>
