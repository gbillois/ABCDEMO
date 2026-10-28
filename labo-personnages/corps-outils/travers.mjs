// triangles « de travers » : normale géométrique presque perpendiculaire (ou opposée) à la normale du champ
const { construireCorps } = await import(process.argv[2]);
const { geo } = construireCorps(process.argv[3] || "garcon", process.argv[4] || "plein", process.argv[5] || "");
const P = geo.attributes.position.array, N = geo.attributes.normal.array, R = geo.attributes.region.array, I = geo.index.array, fin = geo.userData.oreilles ? geo.userData.oreilles[0] : I.length;
const l = [];
for (let t = 0; t < fin; t += 3) { const [a, b, c] = [I[t], I[t+1], I[t+2]].map(i => i * 3);
  const ux = P[b]-P[a], uy = P[b+1]-P[a+1], uz = P[b+2]-P[a+2], vx = P[c]-P[a], vy = P[c+1]-P[a+1], vz = P[c+2]-P[a+2];
  let nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx; const ln = Math.hypot(nx, ny, nz); if (ln < 1e-12) { l.push([-2, t]); continue; } nx /= ln; ny /= ln; nz /= ln;
  const mx = N[a]+N[b]+N[c], my = N[a+1]+N[b+1]+N[c+1], mz = N[a+2]+N[b+2]+N[c+2], ml = Math.hypot(mx, my, mz) || 1, d = (nx*mx+ny*my+nz*mz)/ml; if (d < .35) l.push([d, t]); }
const par = {}; for (const [, t] of l) { const r = R[I[t]]; par[r] = (par[r] || 0) + 1; }
console.log("triangles de travers :", l.length, JSON.stringify(par));
l.sort((x, y) => x[0] - y[0]); for (const [d, t] of l.filter(([, t]) => !process.argv[6] || R[I[t]] == process.argv[6]).slice(0, 12)) { const a = I[t] * 3; console.log(d.toFixed(2), "r" + R[I[t]], [P[a], P[a+1], P[a+2]].map(v => v.toFixed(3)).join(" ")); }
