// Serveur local pour /api/* pendant `ng serve` : fait tourner les mêmes fonctions
// que Cloudflare Pages en production (dossier functions/api).
const http = require('http');

const routes = {
  '/api/photos': () => import('../functions/api/photos.js'),
  '/api/raw': () => import('../functions/api/raw.js'),
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost:3001');
    const route = routes[url.pathname];
    if (!route) {
      res.statusCode = 404;
      return res.end();
    }
    try {
      const { onRequestGet } = await route();
      const response = await onRequestGet({ request: new Request(url) });
      res.statusCode = response.status;
      response.headers.forEach((v, k) => res.setHeader(k, v));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (e) {
      console.error(req.url, e);
      res.statusCode = 500;
      res.end('error');
    }
  })
  .listen(3001, () => console.log('API photos : http://localhost:3001'));
