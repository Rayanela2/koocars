// GET /api/photo?p=/carpicture08/pic4198/41980887_001.jpg
// Récupère la photo Encar, retire les marques Encar et renvoie l'image nettoyée.
const { cleanPhoto } = require('./_kc');

const ORIGIN = 'https://ci.encar.com';
const PATH_RE = /^\/carpicture\d+\/pic\d+\/\d+_\d+\.jpe?g$/i;
const MAX_BYTES = 5 * 1024 * 1024;

module.exports = async (req, res) => {
  const p = new URL(req.url, 'http://localhost').searchParams.get('p') || '';
  if (!PATH_RE.test(p)) {
    res.statusCode = 400;
    res.end('bad path');
    return;
  }

  try {
    const upstream = await fetch(ORIGIN + p, { signal: AbortSignal.timeout(8000) });
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    const source = Buffer.from(await upstream.arrayBuffer());
    if (source.length > MAX_BYTES) throw new Error('too large');

    const out = await cleanPhoto(source);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/jpeg');
    // les photos d'une annonce ne changent pas : cache CDN long
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, immutable');
    res.end(out);
  } catch (e) {
    console.error('photo error', p, e.message);
    res.statusCode = 502;
    res.end('photo unavailable');
  }
};
