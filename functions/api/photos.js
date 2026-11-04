// Cloudflare Pages Function — GET /api/photos?p=/carpicture07/pic4197/41976944_001.jpg&from=1&to=40
// Liste les photos qui existent chez Encar pour ce véhicule (_001, _002, ... avec des trous possibles).
// Les annonces vont couramment au-delà de _050 : le site interroge 1-40 puis 41-80 en parallèle,
// car une fonction Cloudflare (offre gratuite) est limitée à 50 requêtes sortantes.
const ORIGIN = 'https://ci.encar.com';
const PATH_RE = /^(\/carpicture\d+\/pic\d+\/\d+)_\d+(\.jpe?g)$/i;
const MAX_INDEX = 80;
const MAX_PER_CALL = 40;

async function exists(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(6000) });
    return r.ok;
  } catch {
    return false;
  }
}

export async function onRequestGet({ request }) {
  const params = new URL(request.url).searchParams;
  const m = PATH_RE.exec(params.get('p') || '');
  if (!m) return new Response('bad path', { status: 400 });

  const from = Math.max(1, parseInt(params.get('from') || '1', 10) || 1);
  const to = Math.min(MAX_INDEX, from + MAX_PER_CALL - 1, parseInt(params.get('to') || '40', 10) || 40);
  const paths = [];
  for (let i = from; i <= to; i++) paths.push(`${m[1]}_${String(i).padStart(3, '0')}${m[2]}`);
  const found = await Promise.all(paths.map((path) => exists(ORIGIN + path)));

  return Response.json(
    { photos: paths.filter((_, i) => found[i]) },
    { headers: { 'Cache-Control': 'public, max-age=3600' } }
  );
}
