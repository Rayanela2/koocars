// Serveur local pour /api/photo pendant `ng serve` (Vercel fait ce travail en production).
const http = require('http');
const photo = require('./photo');

http
  .createServer((req, res) => {
    if (req.url.startsWith('/api/photo')) {
      // en local, jamais de cache : on voit toujours le dernier traitement
      const setHeader = res.setHeader.bind(res);
      res.setHeader = (k, v) => setHeader(k, k === 'Cache-Control' ? 'no-store' : v);
      return photo(req, res);
    }
    res.statusCode = 404;
    res.end();
  })
  .listen(3001, () => console.log('API photos : http://localhost:3001'));
