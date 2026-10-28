// profils du champ : pour chaque hauteur, l'arrière (z min), l'avant (z max) et le côté (x max) du corps à x donné
const { construireCorps } = await import(process.argv[2]);
const type = process.argv[3] || "garcon", { meta } = construireCorps(type, "plein"), f = meta.sdf;
const xs = Number(process.argv[4] || .06), y0 = Number(process.argv[5] || .85), y1 = Number(process.argv[6] || 1.75), pas = Number(process.argv[7] || .025);
const bord = (ox, oy, oz, dx, dy, dz) => { let t = 0; if (f(ox, oy, oz) > 0) return NaN; while (t < .5 && f(ox + dx * t, oy + dy * t, oz + dz * t) <= 0) t += .001; return t; };
for (let y = y0; y <= y1 + 1e-9; y += pas) { const zb = -bord(xs, y, 0, 0, 0, -1), zf = bord(xs, y, 0, 0, 0, 1), xm = bord(0, y, 0, 1, 0, 0);
  console.log(`y ${y.toFixed(3)}  arrière ${zb.toFixed(3)}  avant ${zf.toFixed(3)}  côté(x=0→) ${xm.toFixed(3)}`); }
