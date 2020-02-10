<script>
  import QRCode from "qrcode";
  import QRSvg from "qrcode-svg";
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
    `data:image/svg+xml,${encodeURIComponent(svg)}`;

  const textToDataUrl = async (source, opt) =>
    opt && opt.type === "svg"
      ? getDataURLFromSVG(new QRSvg(source).svg())
      : await QRCode.toDataURL(source, opt);

  $: debounce(async () => {
    url = text ? await textToDataUrl(text, option) : "";
  }, 500)();
</script>

<style lang="css">
  .qrframe {
    margin-top: 1rem;
    width: 12em;
    height: 12em;
  }

  .contents {
    margin: 1em;
  }
</style>

<div
  class="contents container w-1/2 sm:w-auto md:w-full lg:w-64 xl:w-64 center">
  <h1>QRCode generater</h1>
  <div>
    <div>
      <input
        bind:value={text}
        class="shadow appearance-none border rounded w-full py-2 px-3
        text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
    </div>
    <div class="qrframe border rounded object-center">
      {#if url}
        <img id="qrcode" alt={text} src={url} />
      {/if}
    </div>
  </div>

</div>
