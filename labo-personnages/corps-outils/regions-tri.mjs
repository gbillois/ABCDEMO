// triangles par région (et oreilles) : node --import ./enregistrer.mjs regions-tri.mjs [fichier] [type] [qualite] [variante]
const { construireCorps } = await import(process.argv[2] || "../perso/corps.js");
const t = process.argv[3] || "garcon", q = process.argv[4] || "plein", v = process.argv[5] || "";
const t0 = performance.now(); const { geo, meta } = construireCorps(t, q, v); const ms = performance.now() - t0;
const R = geo.attributes.region.array, idx = geo.index.array, c = new Array(10).fill(0), fin = geo.userData.oreilles ? geo.userData.oreilles[0] : idx.length;
for (let i = 0; i < fin; i += 3) c[R[idx[i]]]++;
const N = ["tronc", "cou", "tete", "bras", "avbras", "main", "cuisse", "jambe", "pied"];
console.log(`${t}/${q}/${v || "-"} ${ms.toFixed(0)} ms, ${idx.length / 3} tri (oreilles ${(idx.length - fin) / 3}) :`, N.map((n, i) => n + " " + c[i]).join(", "), JSON.stringify(meta.stats.etapes));
