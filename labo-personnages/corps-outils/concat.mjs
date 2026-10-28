// imite l'intégration : modules collés dans une seule fonction, lignes import/export retirées ; signale les noms en double
import fs from "node:fs";
const dir = "../perso/", ordre = (process.argv[2] || "squelette,materiaux,tete,visage,anim,corps,index").split(",");
let code = ""; const decl = new Map();
for (const m of ordre) { const f = dir + m + (m === "corps" && process.argv[3] ? process.argv[3] : "") + ".js"; if (!fs.existsSync(f)) continue;
  let src = fs.readFileSync(f, "utf8").split("\n").filter(l => !/^\s*import\s/.test(l) && !/^\s*export\s*\{/.test(l)).map(l => l.replace(/^export\s+/, "")).join("\n");
  for (const mm of src.matchAll(/^(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm)) { (decl.get(mm[1]) || decl.set(mm[1], []).get(mm[1])).push(m); }
  for (const mm of src.matchAll(/^const\s+\{([^}]*)\}\s*=/gm)) for (const n of mm[1].split(",").map(x => x.trim().split(":").pop().trim()).filter(Boolean)) (decl.get(n) || decl.set(n, []).get(n)).push(m);
  code += "\n// ---- " + m + "\n" + src; }
const dbl = [...decl].filter(([, l]) => l.length > 1); console.log("noms en double :", dbl.map(([n, l]) => n + " (" + l.join(", ") + ")").join(" ; ") || "aucun");
try { new Function("THREE", "mergeGeometries", "SUITS", "suitTex", "GLASSES", "mulberry", "rnd", code + "\nreturn { person, setOutfit, putGlasses, putSwimGear, animPerson, liveFace };"); console.log("analyse : OK"); } catch (e) { console.log("analyse : ERREUR", e.message); }
