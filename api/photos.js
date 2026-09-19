// GET /api/photos?p=/carpicture07/pic4197/41976944_001.jpg
// Liste les photos qui existent chez Encar pour ce véhicule (_001, _002, ... avec des trous possibles).
const ORIGIN = 'https://ci.encar.com';
const PATH_RE = /^(\/carpicture\d+\/pic\d+\/\d+)_\d+(\.jpe?g)$/i;
const MAX_INDEX = 40;

async function exists(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(6000) });
    return r.ok;
  } catch {
    return false;
  }
}

module.exports = async (req, res) => {
  const p = new URL(req.url, 'http://localhost').searchParams.get('p') || '';
  const m = PATH_RE.exec(p);
  if (!m) {
    res.statusCode = 400;
    res.end('bad path');
    return;
  }
  const paths = Array.from(
    { length: MAX_INDEX },
    (_, i) => `${m[1]}_${String(i + 1).padStart(3, '0')}${m[2]}`,
  );
  const found = await Promise.all(paths.map((path) => exists(ORIGIN + path)));
  const photos = paths.filter((_, i) => found[i]);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.end(JSON.stringify({ photos: photos.length ? photos : [p] }));
};
