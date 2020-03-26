const QRCode = require('qrcode');

async function makeQRBlob(text) {
  const res = await QRCode.toDataURL(text, { type: 'image/png' });
  const data = Buffer.from(res.split(',')[1], 'base64');
  return data;

}


async function doFunction(req, res) {
  try {
    const {
      query: { target }
    } = req
    if (!target) throw new Error('must specify target');
    const png = await makeQRBlob(target);
    res.setHeader('content-type', 'image/png')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(200).send(png);
  } catch (e) {
    console.log(e)
    res.status(500).send(e);
  }
}

module.exports = doFunction;
//console.log(makeQRBlob('hoo'))