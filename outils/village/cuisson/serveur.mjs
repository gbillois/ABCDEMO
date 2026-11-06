// Petit serveur de fichiers pour la cuisson : /mp/ = le dépôt Millepoques, /cuisson/ = ce dossier,
// /ville.json = la sauvegarde choisie. Rien d'autre.
// Une seule retouche, en mémoire (le dépôt Millepoques n'est jamais modifié) : les fonctions qui dessinent les toits
// préviennent la cuisson (globalThis.__toit) avant de dessiner, pour qu'elle connaisse le bas de chaque toit (la
// hauteur des murs du volume).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const TOITS = {
  'js/render/art/hd/tuffeau.js': ['hipRoof', 'gableRoof', 'mansard'],
  'js/render/art/hd/buildings.js': ['roofHD', 'coneHD', 'shedRoofHD'],
  'js/render/art/hd/antiquity.js': ['thatchQuad', 'thatchCone', 'tileRoof'],
  'js/render/art/hd/prehistory.js': ['thatchQuad'],
  'js/render/art/hd/comptoir.js': ['shingleRoof'],
  'js/render/art/hd/medieval2.js': ['hallRoof'],
  'js/render/art/hd/industrial-works.js': ['longRoof'],
};
function espionner(rel, src) {
  for (const nom of TOITS[rel] || []) {
    const re = new RegExp(`(^|\\n)(export )?function ${nom}\\(`);
    if (!re.test(src)) { console.warn('[serveur] toit introuvable', rel, nom); continue; }
    src = src.replace(re, (m, debut, exp) => `${debut}${exp || ''}function ${nom}(...__a) { globalThis.__toit?.('${nom}', __a); return ${nom}__(...__a); }\nfunction ${nom}__(`);
  }
  return src;
}

export function serveur({ millepoques, ici, ville, port = 0 }) {
  const racines = { '/mp/': millepoques, '/cuisson/': ici };
  const srv = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let fichier = null, rel = null;
    if (url === '/ville.json') fichier = ville;
    else for (const [p, r] of Object.entries(racines)) if (url.startsWith(p)) { fichier = path.join(r, url.slice(p.length)); rel = p === '/mp/' ? url.slice(p.length) : null; if (!fichier.startsWith(r)) fichier = null; }
    if (!fichier || !fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(fichier)] || 'application/octet-stream', 'cache-control': 'no-store' });
    if (rel && TOITS[rel]) res.end(espionner(rel, fs.readFileSync(fichier, 'utf8')));
    else fs.createReadStream(fichier).pipe(res);
  });
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok({ srv, port: srv.address().port })));
}
