const qrsvg = require('qrcode-svg');

async function doFunction(req, res) {
  try {
    const {
      query: { target }
    } = req
    if (!target) throw new Error('must specify target');
    const svg = new qrsvg(target).svg();
    res.setHeader('content-type', 'image/svg+xml')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(200).send(svg);
  } catch (e) {
    console.log(e)
    res.status(500).send(e);
  }
}

module.exports = doFunction;
console.log(new qrsvg('text').svg())
