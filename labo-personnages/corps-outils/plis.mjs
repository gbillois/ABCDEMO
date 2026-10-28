// plis : arêtes parcourues deux fois dans le même sens (triangles retournés l'un par rapport à l'autre), après soudure
const { construireCorps } = await import(process.argv[2]);
const { geo } = construireCorps(process.argv[3] || "garcon", process.argv[4] || "plein", process.argv[5] || "");
const P = geo.attributes.position.array, R = geo.attributes.region.array, I = geo.index.array, n = P.length / 3, fin = geo.userData.oreilles ? geo.userData.oreilles[0] : I.length;
const key = i => [P[i*3], P[i*3+1], P[i*3+2]].map(v => Math.round(v * 1e5)).join(","), id = new Map(), w = new Int32Array(n);
for (let i = 0; i < n; i++) { const k = key(i); if (!id.has(k)) id.set(k, i); w[i] = id.get(k); }
const E = new Map(); for (let t = 0; t < fin; t += 3) for (let k = 0; k < 3; k++) { const a = w[I[t+k]], b = w[I[t+(k+1)%3]], kk = a + "_" + b; E.set(kk, (E.get(kk) || 0) + 1); }
const pl = []; for (const [k, c] of E) if (c > 1) { const [a, b] = k.split("_").map(Number); pl.push([a, b]); }
const par = {}; for (const [a] of pl) { const r = R[a]; par[r] = (par[r] || 0) + 1; }
console.log("arêtes de pli :", pl.length, "par région :", JSON.stringify(par));
for (const [a, b] of pl.filter(([a]) => !process.argv[6] || R[a] == process.argv[6]).slice(0, Number(process.argv[7] || 15))) console.log("r" + R[a], [P[a*3], P[a*3+1], P[a*3+2]].map(v => v.toFixed(3)).join(" "), "→", [P[b*3], P[b*3+1], P[b*3+2]].map(v => v.toFixed(3)).join(" "));
