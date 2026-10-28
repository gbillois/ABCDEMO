const { construireCorps } = await import(process.argv[2]);
for (const q of ["plein", "leger"]) { const { geo, meta } = construireCorps(process.argv[3] || "garcon", q), R = geo.attributes.region.array, I = geo.index.array, c = {};
  const o = geo.userData.oreilles || [I.length, 0]; for (let t = 0; t < o[0]; t += 3) { const r = meta.regions[R[I[t]]]; c[r] = (c[r] || 0) + 1; } c.oreilles = o[1] / 3;
  console.log(q, I.length / 3, JSON.stringify(c)); }
