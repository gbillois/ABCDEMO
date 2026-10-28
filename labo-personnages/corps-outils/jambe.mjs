// largeur et profondeur de la jambe gauche (pose de liaison) en fonction de la hauteur
const { construireCorps } = await import(process.argv[2]);
const { meta } = construireCorps(process.argv[3] || "garcon", "plein"), f = meta.sdf, J = meta.joints, H = J.cuisse_g, A = J.pied_g;
for (let y = Number(process.argv[4] || .2); y <= Number(process.argv[5] || 1.0) + 1e-9; y += .025) {
  const t = (H.y - y) / (H.y - A.y), cx = H.x + (A.x - H.x) * t + .0, cz = H.z + (A.z - H.z) * t;
  const b = (dx, dz) => { let s = 0; while (s < .3 && f(cx + dx * s, y, cz + dz * s) <= 0) s += .0005; return s; };
  const ext = b(1, 0), int = b(-1, 0), av = b(0, 1), ar = b(0, -1);
  console.log(`y ${y.toFixed(3)}  largeur ${(ext + int).toFixed(3)} (ext ${ext.toFixed(3)} int ${int.toFixed(3)})  profondeur ${(av + ar).toFixed(3)} (av ${av.toFixed(3)} ar ${ar.toFixed(3)})`); }
