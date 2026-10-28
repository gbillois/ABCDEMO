// essai de corps.js sous node : temps, triangles, étanchéité, NaN, poids
const f = process.argv[2] || "../perso/corps.js";
const { construireCorps } = await import(f);
const types = (process.argv[3] || "garcon,fille,femme,homme").split(","), quals = (process.argv[4] || "plein,leger").split(",");
for (const q of quals) for (const t of types) {
  const t0 = performance.now(); const { geo, meta } = construireCorps(t, q, process.argv[5] || ""); const ms = performance.now() - t0;
  const P = geo.attributes.position.array, idx = geo.index.array, n = P.length / 3;
  let nan = 0; for (const v of P) if (!Number.isFinite(v)) nan++;
  // étanchéité : souder par position puis compter les arêtes
  const key = i => [P[i*3], P[i*3+1], P[i*3+2]].map(v => Math.round(v * 1e5)).join(","), id = new Map(), w = new Int32Array(n);
  for (let i = 0; i < n; i++) { const k = key(i); if (!id.has(k)) id.set(k, id.size); w[i] = id.get(k); }
  const fin = geo.userData.oreilles ? geo.userData.oreilles[0] : idx.length;
  const E = new Map(); for (let i = 0; i < fin; i += 3) for (let k = 0; k < 3; k++) { const a = w[idx[i+k]], b = w[idx[i+(k+1)%3]], kk = a < b ? a+"_"+b : b+"_"+a; E.set(kk, (E.get(kk)||0) + 1); }
  let b1 = 0, b3 = 0; for (const c of E.values()) { if (c === 1) b1++; if (c > 2) b3++; }
  const sw = geo.attributes.skinWeight.array; let wbad = 0; for (let i = 0; i < n; i++) { const s = sw[i*4]+sw[i*4+1]+sw[i*4+2]+sw[i*4+3]; if (Math.abs(s-1) > 1e-3) wbad++; }
  const bb = geo.boundingBox;
  console.log(JSON.stringify(meta.stats)); console.log(`${t}/${q}: ${ms.toFixed(0)} ms (meta ${meta.stats.ms}), ${idx.length/3} tri, ${n} sommets, NaN ${nan}, bords ${b1}, non-variétés ${b3}, poids faux ${wbad}, boîte x[${bb.min.x.toFixed(3)},${bb.max.x.toFixed(3)}] y[${bb.min.y.toFixed(3)},${bb.max.y.toFixed(3)}] z[${bb.min.z.toFixed(3)},${bb.max.z.toFixed(3)}]`);
}
