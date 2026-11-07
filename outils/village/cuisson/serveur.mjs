// Petit serveur de fichiers pour la cuisson : /mp/ = le dépôt Millepoques, /cuisson/ = ce dossier,
// /ville.json = la sauvegarde choisie. Rien d'autre.
// Quelques retouches, en mémoire seulement (le dépôt Millepoques n'est jamais modifié) :
//   - les fonctions qui dessinent les toits et les cheminées préviennent la cuisson (globalThis.__toit) avant de
//     dessiner : le bas de chaque toit donne la hauteur des murs du volume, les cheminées deviennent des blocs 3D ;
//   - la tête d'un habitant prévient (globalThis.__tete : sa place, son apparence) et peut se dessiner sans
//     chapeau (globalThis.__sansChapeau) : le chapeau est modelé en 3D ;
//   - les ponts peints du sol peuvent être omis (globalThis.__sansPonts) : ils sont modelés en 3D.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const TOITS = {
  'js/render/art/hd/tuffeau.js': ['hipRoof', 'gableRoof', 'mansard', 'chimney'],
  'js/render/art/hd/buildings.js': ['roofHD', 'coneHD', 'shedRoofHD'],
  'js/render/art/hd/antiquity.js': ['thatchQuad', 'thatchCone', 'tileRoof'],
  'js/render/art/hd/prehistory.js': ['thatchQuad'],
  'js/render/art/hd/comptoir.js': ['shingleRoof'],
  'js/render/art/hd/medieval2.js': ['hallRoof'],
  'js/render/art/hd/industrial-works.js': ['longRoof'],
};
// remplacements de texte (avant, après), qui doivent tous se trouver dans le fichier
const RETOUCHES = {
  'js/render/art/hd/people.js': [
    ['function drawHead(ctx, j, L, view, hx, hy, id, time, moving, ph, idle, grit, pb) {', 'function drawHead(ctx, j, L, view, hx, hy, id, time, moving, ph, idle, grit, pb) {\n  globalThis.__tete?.(ctx, j, L, view, hx, hy);'],
    ['  const hat = L.hat;\n  if (!hat) return;', '  const hat = globalThis.__sansChapeau ? null : L.hat;\n  if (!hat) return;'],
  ],
  'js/render/renderer.js': [
    ['    drawBridges(ctx, g, v, this.time);', '    if (!globalThis.__sansPonts) drawBridges(ctx, g, v, this.time);'],
  ],
};
function espionner(rel, src) {
  for (const [avant, apres] of RETOUCHES[rel] || []) {
    if (!src.includes(avant)) { console.warn('[serveur] retouche introuvable', rel, avant.slice(0, 50)); continue; }
    src = src.replace(avant, apres);
  }
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
    if (rel && (TOITS[rel] || RETOUCHES[rel])) res.end(espionner(rel, fs.readFileSync(fichier, 'utf8')));
    else fs.createReadStream(fichier).pipe(res);
  });
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok({ srv, port: srv.address().port })));
}
