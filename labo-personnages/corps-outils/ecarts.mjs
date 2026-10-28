// sommets loin de la surface du champ (|sdf| grand), et les plus en arrière du pied gauche
const { construireCorps } = await import(process.argv[2]);
const { geo, meta } = construireCorps(process.argv[3] || "garcon", "plein"), P = geo.attributes.position.array, R = geo.attributes.region.array, f = meta.sdf, n = P.length / 3;
const fin = geo.userData.oreilles ? Math.min(...Array.from(geo.index.array.slice(geo.userData.oreilles[0]))) : n;
const l = []; for (let i = 0; i < fin; i++) l.push([Math.abs(f(P[i*3], P[i*3+1], P[i*3+2])), i]);
l.sort((a, b) => b[0] - a[0]); console.log("pires |sdf| :"); for (const [d, i] of l.slice(0, 12)) console.log(d.toFixed(4), "r" + R[i], [P[i*3], P[i*3+1], P[i*3+2]].map(v => v.toFixed(3)).join(" "));
const h = []; for (let i = 0; i < fin; i++) if (P[i*3] > .1 && P[i*3+1] < .15) h.push([P[i*3+2], i]); h.sort((a, b) => a[0] - b[0]);
console.log("pied gauche, les plus en arrière :"); for (const [z, i] of h.slice(0, 8)) console.log("r" + R[i], [P[i*3], P[i*3+1], P[i*3+2]].map(v => v.toFixed(3)).join(" "), "sdf", f(P[i*3], P[i*3+1], P[i*3+2]).toFixed(4));
