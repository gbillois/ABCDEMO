const T = await import("../perso/tete.js");
for (const t of ["garcon", "femme", "homme"]) { const r = T.reperesTete(t), f = (x, y, z) => T.sdfTete(x, y, z, t);
  // boîte de la tête : balayage grossier
  let b = [1, 1, 1, -1, -1, -1]; for (let x = -.3; x <= .3; x += .005) for (let y = -.05; y <= .45; y += .005) for (let z = -.3; z <= .3; z += .01) if (f(x, y, z) < 0) { b = [Math.min(b[0], x), Math.min(b[1], y), Math.min(b[2], z), Math.max(b[3], x), Math.max(b[4], y), Math.max(b[5], z)]; }
  const o = T.oreilles(t, "plein"), ol = T.oreilles(t, "leger");
  console.log(t, "centre", r.centre.toArray().map(v => v.toFixed(3)), "menton", r.menton.toArray().map(v => v.toFixed(3)), "haut", r.haut.toArray().map(v => v.toFixed(3)), "dl", r.demiLargeur.toFixed(3), "boite(y>-.05)", b.map(v => v.toFixed(3)), "oreilles tri", (o.index ? o.index.count : o.attributes.position.count) / 3, (ol.index ? ol.index.count : ol.attributes.position.count) / 3);
}
