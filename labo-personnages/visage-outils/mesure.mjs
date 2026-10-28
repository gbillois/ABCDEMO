// mesures de la tête (sdfTete) : hauteur, largeur, profondeur, repères, temps
const f = process.argv[2] || "../perso/tete.js";
const T = await import(f);
for (const type of ["garcon", "femme", "homme"]) {
  const F = (x, y, z) => T.sdfTete(x, y, z, type); let x0 = 1, x1 = -1, y0 = 1, y1 = -1, z0 = 1, z1 = -1;
  // boîte de la tête (sans le cou : y > -.06 au-dessus du menton, z > -.0 devant le cou pour le bas)
  for (let x = -.2; x <= .2; x += .004) for (let y = -.08; y <= .36; y += .004) for (let z = -.22; z <= .24; z += .004) if (F(x, y, z) < 0) {
    const cou = y < .02 && z < .06; if (cou) continue; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const R = T.reperesTete(type), v = p => p.toArray().map(a => a.toFixed(3)).join(",");
  let t0 = performance.now(), s = 0; for (let i = 0; i < 2e5; i++) s += F(Math.sin(i) * .15, .14 + Math.cos(i * 1.3) * .17, Math.sin(i * .7) * .17); const us = (performance.now() - t0) / 2e5 * 1e6;
  console.log(type, `l ${(x1 - x0).toFixed(3)} h ${(y1 - y0).toFixed(3)} [${y0.toFixed(3)}, ${y1.toFixed(3)}] p ${(z1 - z0).toFixed(3)} [${z0.toFixed(3)}, ${z1.toFixed(3)}]  ${us.toFixed(0)} ns/appel`);
  console.log("  yeux", v(R.yeux[1].centre), R.yeux[1].rayon.toFixed(3), "peau", v(R.yeuxPeau[1]), "nez", v(R.nez), "bouche", v(R.bouche), "menton", v(R.menton), "centre", v(R.centre), "dl", R.demiLargeur.toFixed(3), "oreille", v(R.oreilles[1]));
  const o = T.oreilles(type, "plein"), ol = T.oreilles(type, "leger"); console.log("  oreilles", o.index.count / 3, "tri (léger", ol.index.count / 3, ")");
}
