<script>
  import QRCode from "qrcode";
  import QRSvg from "qrcode-svg";
  const blank_rectanble = `data:image/svg+xml,${encodeURIComponent(
    `<?xml version="1.0" standalone="yes"?>
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="100" height="100">
    <rect x="0" y="0" width="100" height="100"  style="fill:#ffffff;" />
    </svg>`
  )}`;
  let text = "";
  let url = blank_rectanble;
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
    url = text ? await textToDataUrl(text, option) : blank_rectanble;
  }, 500)();
</script>

<style lang="css">

</style>

<div class="flex justify-center">
  <div class="contents m-5 w-10/12 sm:w-64">
    <h1>QRCode generater</h1>
    <div>
      <div>
        <input
          bind:value={text}
          class="shadow appearance-none border rounded w-full py-2 px-3
          text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
      </div>
      <div class="qrframe border rounded w-full h-auto sm:w-64 sm:h-64 my-4">
        {#if url}
          <img class="qrcode w-full h-full" alt={text} src={url} />
        {/if}
      </div>
    </div>

  </div>
</div>
