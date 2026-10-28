// profil d'une coupe : pour chaque hauteur y, bords le long de ±z depuis (x, y, z0), avec le champ complet
const { construireCorps } = await import(process.argv[2]);
const { meta } = construireCorps(process.argv[3] || "garcon", "plein"), f = meta.sdf;
const [x, z0, y0, y1, pas] = process.argv.slice(4).map(Number);
const bord = (oy, dz) => { if (f(x, oy, z0) > 0) return NaN; let t = 0; while (t < .5 && f(x, oy, z0 + dz * t) <= 0) t += .001; return z0 + dz * t; };
let ligne = ""; for (let y = y0; y <= y1 + 1e-9; y += pas) ligne += `y ${y.toFixed(3)} : ${bord(y, -1).toFixed(3)} … ${bord(y, 1).toFixed(3)}\n`; console.log(ligne);
