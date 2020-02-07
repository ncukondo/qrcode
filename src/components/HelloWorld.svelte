<script>
  import QRCode from "qrcode";
  let text = "";
  let url = "";
  let option = { type: "svg" };

  const debounce = (fn, time) => {
    let timeout;

    return function() {
      const functionCall = () => fn.apply(this, arguments);
      clearTimeout(timeout);
      timeout = setTimeout(functionCall, time);
    };
  };

  const getDataURLFromSVG = svg =>
    "data:image/svg+xml," + encodeURIComponent(svg);

  const textToDataUrl = async (source, opt) =>
    opt && opt.type === "svg"
      ? getDataURLFromSVG(await QRCode.toString(source, opt))
      : await QRCode.toDataURL(source, opt);

  $: debounce(async () => {
    url = text ? await textToDataUrl(text, option) : "";
  }, 500)();
</script>

<style lang="css">
  .qrframe {
    width: 12em;
    height: 12em;
  }

  input {
    border: solid 1px;
  }
  .contents {
    margin: 1em;
  }
</style>

<div class="contents">
  <h1>QRCode generater</h1>
  <div>
    <div>
      <input bind:value={text} />
    </div>
    {#if url}
      <div class="qrframe">
        <img alt={text} src={url} />
      </div>
    {/if}
  </div>
</div>
