// integrer.js — recopie les modules du labo (perso/*.js) dans le script du jeu.
// Chaque module devient une fonction qui renvoie ses exports (portées séparées, pas de noms en double) ;
// les imports de "three", des addons et de "../jeu.js" disparaissent (le jeu a déjà THREE, mergeGeometries, SUITS…).
// Usage : node integrer.js <jeu.html> <sortie.html>    (remplace la section « Personnages » et l'ancien putGlasses)
//         node integrer.js --bloc <sortie.js>          (seulement le bloc généré, pour le lire)
const fs = require("fs"), path = require("path");
const DIR = path.join(__dirname, "perso"), JEU_ADDONS = ["mergeGeometries"];
const lire = n => fs.readFileSync(path.join(DIR, n + ".js"), "utf8");

// imports et exports d'un module (lus avec acorn, puis remplacés en place)
const acorn = require("/opt/node-tools/node_modules/acorn");
function analyser(nom) {
  const src = lire(nom), deps = [], jeu = [], exports = new Set(), rempl = [];
  const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" });
  const nomsDe = specs => specs.map(sp => ({ a: (sp.imported || sp.local).name, b: (sp.exported || sp.local).name }));
  const destruct = (noms, dep) => `const { ${noms.map(n => n.a === n.b ? n.a : `${n.a}: ${n.b}`).join(", ")} } = M_${dep};`;
  for (const n of ast.body) {
    if (n.type === "ImportDeclaration") { const de = n.source.value;
      if (de === "three") { if (n.specifiers[0]?.type !== "ImportNamespaceSpecifier" || n.specifiers[0].local.name !== "THREE") throw new Error(nom + " : import de three attendu en « * as THREE »"); rempl.push([n.start, n.end, ""]); }
      else if (de.startsWith("three/addons/")) { for (const sp of n.specifiers) if (!JEU_ADDONS.includes(sp.imported?.name)) throw new Error(nom + " : addon non disponible dans le jeu : " + sp.imported?.name); rempl.push([n.start, n.end, ""]); }
      else if (de === "../jeu.js") { for (const sp of n.specifiers) { if (sp.imported.name !== sp.local.name) throw new Error(nom + " : renommage d'un nom du jeu interdit"); jeu.push(sp.local.name); } rempl.push([n.start, n.end, ""]); }
      else { const dep = path.basename(de, ".js"); deps.push(dep);
        if (n.specifiers.length === 1 && n.specifiers[0].type === "ImportNamespaceSpecifier") { rempl.push([n.start, n.end, `const ${n.specifiers[0].local.name} = M_${dep};`]); continue; }
        if (n.specifiers.some(sp => sp.type !== "ImportSpecifier")) throw new Error(nom + " : import par défaut interdit : " + de);
        rempl.push([n.start, n.end, destruct(n.specifiers.map(sp => ({ a: sp.imported.name, b: sp.local.name })), dep)]); } }
    else if (n.type === "ExportNamedDeclaration") {
      if (n.source) { const dep = path.basename(n.source.value, ".js"); deps.push(dep); const noms = nomsDe(n.specifiers); noms.forEach(x => exports.add(x.b)); rempl.push([n.start, n.end, destruct(noms, dep) + " // ré-export"]); }
      else if (n.declaration) { const d = n.declaration; if (d.id) exports.add(d.id.name); else for (const v of d.declarations) { if (v.id.type !== "Identifier") throw new Error(nom + " : export déstructuré non géré"); exports.add(v.id.name); }
        rempl.push([n.start, d.start, ""]); }
      else { for (const sp of n.specifiers) { if (sp.local.name !== sp.exported.name) throw new Error(nom + " : export renommé non géré"); exports.add(sp.exported.name); } rempl.push([n.start, n.end, ""]); } }
    else if (n.type === "ExportDefaultDeclaration" || n.type === "ExportAllDeclaration") throw new Error(nom + " : export par défaut / * interdit");
  }
  let corps = src; for (const [x, y, t] of rempl.sort((p, q) => q[0] - p[0])) corps = corps.slice(0, x) + t + corps.slice(y);
  if (/\bawait\b/.test(corps.replace(/async[\s\S]*?\{/g, "")) && /^\s*await\b/m.test(corps)) throw new Error(nom + " : await au premier niveau interdit");
  return { nom, deps, jeu, exports: [...exports], corps };
}

function bloc() {
  const tous = fs.readdirSync(DIR).filter(f => f.endsWith(".js") && !/\.tmp\.js$|^mannequin\.js$/.test(f)).map(f => path.basename(f, ".js"));
  const mods = Object.fromEntries(tous.map(n => [n, analyser(n)])), ordre = [], vu = new Set();
  const visiter = (n, pile = []) => { if (vu.has(n)) return; if (pile.includes(n)) throw new Error("import circulaire : " + [...pile, n].join(" → ")); if (!mods[n]) throw new Error("module manquant : " + n);
    for (const d of mods[n].deps) visiter(d, [...pile, n]); vu.add(n); ordre.push(n); };
  visiter("index");
  const jeu = [...new Set(ordre.flatMap(n => mods[n].jeu))].sort();
  let s = `/* ================= Personnages ================= */
// Les personnages sont fabriqués en code au lancement (rien n'est téléchargé) : un squelette de 24 os, une peau d'un
// seul tenant (cage → Catmull-Clark → posée sur un champ de distance), le visage dessiné, les cheveux, les habits
// et les maillots, et l'animation (marche, course, nage, vélo, poney…). Recopié depuis les modules du labo :
// ${ordre.join(", ")}. Chaque module garde ses noms pour lui ; seuls les noms renvoyés à la fin sont visibles du jeu.
// Noms du jeu utilisés : ${jeu.join(", ")}.
const ATELIER_PERSOS = (() => {\n`;
  for (const n of ordre) s += `// ---------- ${n}.js ----------\nconst M_${n} = (() => {\n${mods[n].corps.replace(/^\n+|\n+$/g, "")}\nreturn { ${mods[n].exports.join(", ")} };\n})();\n`;
  s += `return M_index;\n})();\nconst { ${mods.index.exports.join(", ")} } = ATELIER_PERSOS;\n`;
  return { s, ordre, jeu, exports: mods.index.exports };
}

const a = process.argv.slice(2);
const { s, ordre, jeu, exports: exp } = bloc();
console.log("modules :", ordre.join(" → ")); console.log("noms du jeu :", jeu.join(", ")); console.log("exports :", exp.join(", "));
if (a[0] === "--bloc") { fs.writeFileSync(a[1], s); console.log("bloc :", a[1], (s.length / 1024).toFixed(1) + " Ko"); }
else if (a.length === 2) {
  let html = fs.readFileSync(a[0], "utf8");
  const debut = html.indexOf("/* ================= Personnages ================= */"), fin = html.indexOf("let player = person(");
  if (debut < 0 || fin < 0) throw new Error("section Personnages introuvable");
  // l'ancien putGlasses du jeu est remplacé par celui des modules (GLASSES reste dans le jeu) : on l'enlève AVANT d'insérer le bloc
  const avant = html.length; html = html.replace(/\nfunction putGlasses\(g, i\) \{\n[\s\S]*?\n  h\.add\(gl\); g\.userData\.glasses = gl;\n\}\n/, "\n");
  if (html.length === avant) console.log("(ancien putGlasses déjà absent)"); else if (avant - html.length > 2000) throw new Error("putGlasses : trop de texte enlevé");
  html = html.slice(0, debut) + s + html.slice(fin);
  fs.writeFileSync(a[1], html); console.log("jeu :", a[1], (html.length / 1024).toFixed(1) + " Ko");
}
