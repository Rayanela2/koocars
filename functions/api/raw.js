// Cloudflare Pages Function — GET /api/raw?p=/carpicture08/pic4198/41980887_001.jpg
// Relaie la photo Encar telle quelle depuis notre domaine : Encar n'envoie pas d'en-tête CORS,
// le navigateur ne pourrait donc pas lire ses pixels pour la nettoyer (voir src/app/photo).
const ORIGIN = 'https://ci.encar.com';
const PATH_RE = /^\/carpicture\d+\/pic\d+\/\d+_\d+\.jpe?g$/i;

export async function onRequestGet({ request }) {
  const p = new URL(request.url).searchParams.get('p') || '';
  if (!PATH_RE.test(p)) return new Response('bad path', { status: 400 });

  // les photos d'une annonce ne changent pas : cache Cloudflare long
  const upstream = await fetch(ORIGIN + p, { cf: { cacheEverything: true, cacheTtl: 31536000 } });
  if (!upstream.ok) return new Response('photo unavailable', { status: 502 });

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}
