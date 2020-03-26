<script>
  import QRSvg from "qrcode-svg";
  let text = "";
  let option = { type: "svg" };
  let color = "#000000";
  let background = "#ffffff";
  let ecl = "M";
  let urlSvg = blankRectangleSVG(background);
  const API_BASE = "./api/";

  const debounce = (fn, time) => {
    let timeout;

    return function() {
      const functionCall = () => fn.apply(this, arguments);
      clearTimeout(timeout);
      timeout = setTimeout(functionCall, time);
    };
  };

  function getDataURLFromSVG(svg) {
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  function blankRectangleSVG(color = "#ffffff", size = 100) {
    return getDataURLFromSVG(`<?xml version="1.0" standalone="yes"?>
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${size}" height="${size}">
    <rect x="0" y="0" width="${size}" height="${size}"  style="fill:${color};" />
    </svg>`);
  }

  const textToDataUrlSvg = (source, opt) => {
    return getDataURLFromSVG(
      new QRSvg({
        ...opt,
        content: source,
        join: true,
        container: "svg-viewbox"
      }).svg()
    );
  };

  $: debounce(async () => {
    urlSvg = text
      ? textToDataUrlSvg(text, { color, background, ecl })
      : blankRectangleSVG(background);
  }, 500)();
</script>

<style lang="css">
  .download {
    display: block;
    margin: 1rem 0 1rem 0rem;
  }
</style>

<div>
  <div>
    <input
      bind:value={text}
      placeholder="input url or text"
      class="shadow appearance-none border rounded w-full py-2 px-3
      text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
  </div>
  <div class="qrframe border rounded w-full h-auto sm:w-64 sm:h-64 my-4">
    {#if urlSvg}
      <img class="qrcode w-full h-full" alt={text} title={text} src={urlSvg} />
    {/if}
  </div>
  {#if text}
    <div>
      <a
        class="download"
        download="qrcode.png"
        href={API_BASE + 'makeqrpng.js?target=' + text}>
        Download PNG
      </a>
      <a
        class="download"
        download="qrcode.svg"
        href={API_BASE + 'makeqrsvg.js?target=' + text}>
        Download SVG
      </a>
    </div>
  {/if}
</div>
