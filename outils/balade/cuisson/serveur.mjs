// Petit serveur de fichiers pour la cuisson : /mp/ = le dépôt Millepoques, /cuisson/ = ce dossier,
// /ville.json = la sauvegarde choisie. Rien d'autre.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

export function serveur({ millepoques, ici, ville, port = 0 }) {
  const racines = { '/mp/': millepoques, '/cuisson/': ici };
  const srv = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let fichier = null;
    if (url === '/ville.json') fichier = ville;
    else for (const [p, r] of Object.entries(racines)) if (url.startsWith(p)) { fichier = path.join(r, url.slice(p.length)); if (!fichier.startsWith(r)) fichier = null; }
    if (!fichier || !fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(fichier)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(fichier).pipe(res);
  });
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok({ srv, port: srv.address().port })));
}
