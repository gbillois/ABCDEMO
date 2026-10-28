// résolution de "three" vers la copie locale du CDN (essais de corps.js sous node)
const T = "file:///tmp/claude-0/-home-user-ABCDEMO/947ae848-9dfc-5c86-a9ad-2e9ae79ab6cd/scratchpad/lab/cdn/three@0.170.0/";
export async function resolve(spec, ctx, next) {
  if (spec === "three") return { url: T + "build/three.module.js", shortCircuit: true };
  if (spec.startsWith("three/addons/")) return { url: T + "examples/jsm/" + spec.slice(13), shortCircuit: true };
  return next(spec, ctx);
}
