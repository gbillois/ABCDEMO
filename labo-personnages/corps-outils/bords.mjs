const { construireCorps } = await import(process.argv[2]);
const { geo } = construireCorps(process.argv[3] || "garcon", process.argv[4] || "plein");
const P = geo.attributes.position.array, R = geo.attributes.region.array, idx = geo.index.array, n = P.length / 3;
const key = i => [P[i*3], P[i*3+1], P[i*3+2]].map(v => Math.round(v * 1e5)).join(","), id = new Map(), w = new Int32Array(n), rep = [];
for (let i = 0; i < n; i++) { const k = key(i); if (!id.has(k)) { id.set(k, id.size); rep.push(i); } w[i] = id.get(k); }
const E = new Map(); for (let i = 0; i < idx.length; i += 3) for (let k = 0; k < 3; k++) { const a = w[idx[i+k]], b = w[idx[i+(k+1)%3]], kk = a < b ? a+"_"+b : b+"_"+a; if (!E.has(kk)) E.set(kk, []); E.get(kk).push(R[idx[i]]); }
const out = { 1: [], 3: [] };
for (const [k, l] of E) { const c = l.length; if (c === 1 || c > 2) { const [a, b] = k.split("_").map(Number), i = rep[a], j = rep[b]; (out[c === 1 ? 1 : 3]).push(`r${l.join("/")} (${[P[i*3],P[i*3+1],P[i*3+2]].map(v=>v.toFixed(3))}) — (${[P[j*3],P[j*3+1],P[j*3+2]].map(v=>v.toFixed(3))})`); } }
console.log("bords:", out[1].length); console.log(out[1].slice(0, 12).join("\n")); console.log("non-variétés:", out[3].length); console.log(out[3].slice(0, 12).join("\n"));
