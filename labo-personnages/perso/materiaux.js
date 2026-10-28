// materiaux.js — les matières des personnages : peau, tissus, cheveux, yeux, plastique, silicone, caoutchouc,
// et le matériau unique de la foule (un seul appel de dessin par personne).
// MeshStandardMaterial + petites retouches du shader (onBeforeCompile), réglées pour la lumière du jeu
// (ACES 0,85, soleil 3, ciel 0,7, environnement 0,75, brouillard). Style doux façon dessin animé (STYLE) : rampe douce,
// couleur qui reste vive dans l'ombre, contre-jour léger ; peau chaude (jamais grise) ; rien qui fasse « sale ».
// Par défaut : aucune texture (shaders simples pour l'iPad) ; les tuiles (maille, mèches, grain) sont sur demande.
//
// Conventions pour les autres équipes :
// - Peau : matPeau(couleur) rend un matériau NEUF (un par personnage) ; le programme est partagé. Mains, pieds, genoux
//   et coudes rosissent d'après les poids des os (skinIndex / skinWeight, ordre de squelette.js) : rien à fournir.
//   Variable GLSL globale « peauK » (1 = peau) : un code qui peint autre chose sur la peau fait « peauK *= 1. - hab; »
//   (la partie peinte est alors éclairée comme un tissu). Décalques du visage : matDecalPeau(map).
// - Occlusion douce facultative : attribut « occl » (0..1) par sommet, calculé une fois par occlusion(geo, sdf).
// - Tissus : matTissu(c, { sorte, map }) ; uv en unités du modèle (u autour, v le long) si opts.detail (maille, sergé).
// - Cheveux : matCheveux(c) n'a besoin d'aucune uv (reflet en anneau, mèches « vers le bas de la tête ») ;
//   avec opts.meches / opts.bords : uv.x en travers (unités du modèle), uv.y le long de la mèche (0 racine → 1 pointe).
// - Foule : geoLegere({ sk: geo, sh: geo, … }) + matLegere(peau) ; parties PARTIES_LEGER ; partie(m, "sh", { c, vis }).
import * as THREE from "three";
import { mergeGeometries, mulberry, LOWQ } from "../jeu.js";
import { INDEX_OS } from "./squelette.js";

const PART = o => { o.userData.partage = true; return o; };
const ANISO = LOWQ ? 2 : 8;
const lin = c => new THREE.Color(c); // couleur du jeu (sRGB) → linéaire
const fus = (a, b) => { const r = { ...a }; for (const k in b) if (b[k] !== undefined) r[k] = b[k]; return r; }; // options : les « undefined » ne comptent pas

// ---------------- petites textures calculées (tuiles qui se répètent, mipmaps) ----------------
function tex(w, h, f, rep) { // f(x, y) → [r, g, b] (0..1) ; a = 1
  const d = new Uint8Array(w * h * 4), q = v => Math.max(0, Math.min(255, Math.round(v * 255)));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = f(x, y), i = (y * w + x) * 4; d[i] = q(c[0]); d[i + 1] = q(c[1]); d[i + 2] = q(c[2]); d[i + 3] = 255; }
  const t = new THREE.DataTexture(d, w, h); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = ANISO; if (rep) t.repeat.set(rep[0], rep[1]); t.needsUpdate = true; return PART(t);
}
// bruit de valeur périodique : fx × fy cellules à la 1re octave, puis ×2 ; résultat dans [0, 1]
function bruit(w, h, fx, fy, oct, graine, gain = .5) {
  const R = mulberry(graine), out = new Float32Array(w * h); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++, fx *= 2, fy *= 2, amp *= gain) { tot += amp; const g = new Float32Array(fx * fy).map(() => R());
    for (let y = 0; y < h; y++) { const v = y / h * fy, iy = Math.floor(v), ty = v - iy, sy = ty * ty * (3 - 2 * ty), y0 = iy % fy * fx, y1 = (iy + 1) % fy * fx;
      for (let x = 0; x < w; x++) { const u = x / w * fx, ix = Math.floor(u), tx = u - ix, sx = tx * tx * (3 - 2 * tx), x0 = ix % fx, x1 = (ix + 1) % fx;
        const a = g[y0 + x0], b = g[y0 + x1], c = g[y1 + x0], e = g[y1 + x1]; out[y * w + x] += amp * (a + (b - a) * sx + (c - a + (a - b - c + e) * sx) * sy); } } }
  for (let i = 0; i < w * h; i++) out[i] /= tot; return out;
}
// relief H (w × h, périodique) → carte de normales (r, g) ; b = canal libre B (0..1), ou la vraie normale z si B = null
function normales(H, w, h, k, B, rep) {
  return tex(w, h, (x, y) => { const dx = (H[y * w + (x + 1) % w] - H[y * w + (x - 1 + w) % w]) * k, dy = (H[(y + 1) % h * w + x] - H[(y - 1 + h) % h * w + x]) * k, l = Math.hypot(dx, dy, 1);
    return [-dx / l * .5 + .5, -dy / l * .5 + .5, B ? B[y * w + x] : 1 / l * .5 + .5]; }, rep);
}
const CACHE_TEX = new Map(), memo = (k, f) => { if (!CACHE_TEX.has(k)) CACHE_TEX.set(k, f()); return CACHE_TEX.get(k); };

// grain de la peau (r : relief fin, pores), lu en projection triple sur la position de liaison
export const texGrainPeau = () => memo("peau", () => { const n = 128, a = bruit(n, n, 8, 8, 3, 7, .5), b = bruit(n, n, 32, 32, 2, 9, .45), H = new Float32Array(n * n), R = mulberry(31);
  // peau d'enfant : presque lisse ; pores minuscules et grain très fin, à peine de bosses
  for (let i = 0; i < n * n; i++) H[i] = a[i] * .25 + b[i] * .6;
  for (let p = 0; p < 420; p++) { const cx = Math.floor(R() * n), cy = Math.floor(R() * n), r = .6 + R() * .7, d = .08 + R() * .1;
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) H[(cy + y + n) % n * n + (cx + x + n) % n] -= d * Math.exp(-(x * x + y * y) / (r * r)); }
  return tex(n, n, (x, y) => { const v = H[y * n + x]; return [v * .8 + .15, a[y * n + x], b[y * n + x]]; }); });

// tissus : tuile fine (maille, sergé…) en normales (r, g) + variation des fils (b)
const TEX_FIN = {
  coton: () => { const n = 64, H = new Float32Array(n * n), B = new Float32Array(n * n), z = bruit(n, n, 16, 16, 2, 3);
    // jersey : colonnes de petites boucles en V (8 colonnes × 10 rangs par tuile)
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const cx = x / n * 8 % 1, cy = y / n * 10 % 1, j = Math.floor(x / n * 8), dc = cx < .5 ? cx - .25 + (cy - .5) * .35 : cx - .75 - (cy - .5) * .35;
      H[y * n + x] = Math.exp(-dc * dc / .018) * (.75 + .25 * Math.sin(cy * Math.PI)) + z[y * n + x] * .25; B[y * n + x] = .5 + (z[y * n + x] - .5) * .8 + (j % 3 === 0 ? .04 : 0); }
    return normales(H, n, n, 1.6, B); },
  jean: () => { const n = 64, H = new Float32Array(n * n), B = new Float32Array(n * n), z = bruit(n, n, 8, 32, 2, 5), s = bruit(n, n, 64, 4, 1, 6);
    // sergé : côtes fines en diagonale (fils bleus dessus) ; fils de trame plus clairs, irréguliers (fils flammés, le long de v)
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const t = (x + y) / n * 16 % 1, c = .5 + .5 * Math.cos(t * 2 * Math.PI);
      H[y * n + x] = c * .7 + z[y * n + x] * .3; B[y * n + x] = .5 + (s[y * n + x] - .5) * .3 + (c - .5) * .25; }
    return normales(H, n, n, 1.2, B); },
  lycra: () => { const n = 64, z = bruit(n, n, 32, 32, 1, 8), H = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) H[y * n + x] = .5 + .5 * Math.sin(x / n * 16 * 2 * Math.PI) * .3 + z[y * n + x] * .35;
    return normales(H, n, n, .9, z.map(v => .5 + (v - .5) * .3)); },
  molleton: () => { const n = 64, z = bruit(n, n, 16, 16, 3, 11, .7), c = bruit(n, n, 32, 32, 1, 12);
    // molleton chiné : poils fins (bruit), petits points clairs et foncés
    return normales(z, n, n, 1.1, c.map(v => v > .72 ? .95 : v < .25 ? .1 : .5 + (v - .5) * .4)); },
  maille: () => { const n = 64, H = new Float32Array(n * n), z = bruit(n, n, 16, 16, 2, 13);
    // côtes (bords de manches, bonnets) : 4 côtes verticales par tuile, boucles visibles
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const cx = x / n * 4 % 1, cy = y / n * 6 % 1; H[y * n + x] = Math.pow(Math.sin(cx * Math.PI), .7) * (.8 + .2 * Math.cos(cy * 2 * Math.PI)) + z[y * n + x] * .2; }
    return normales(H, n, n, 2.2, z); },
};
export const texTissu = sorte => memo("t-" + sorte, TEX_FIN[sorte] || TEX_FIN.coton);
// tuile grosse (≈ 25 cm) : bosses douces et nuances d'un tissu porté ; le jean a ses traînées verticales
export const texIrreg = (jean = false) => memo("irr" + jean, () => { const n = 128, a = bruit(n, n, 4, 4, 4, jean ? 21 : 17, .5);
  if (!jean) return normales(a, n, n, 2.4, bruit(n, n, 6, 6, 3, 19, .55));
  // jean : fils de chaîne plus ou moins bleus (traînées fines le long de v), délavé par grandes plages
  const R = mulberry(23), col = Array.from({ length: 64 }, () => R()), f = bruit(n, n, 64, 3, 2, 24), g = bruit(n, n, 3, 2, 3, 25), B = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = y * n + x, c = col[Math.floor(x / n * 64)]; B[i] = Math.min(1, Math.max(0, .5 + (c - .5) * .45 + (f[i] - .5) * .5 + (g[i] - .5) * .5)); }
  return normales(a, n, n, 2.4, B); });

// cheveux : u en travers (≈ 45 mèches par tuile), v le long (0 racine → 1 pointe)
// r : clair / foncé de chaque mèche ; g : couverture (pointes inégales) ; b : décalage du reflet, d'une mèche à l'autre
export const ECH_CHEVEUX = 14; // tuiles par unité du modèle en travers (une tuile ≈ 4 cm d'un enfant)
export const texCheveux = () => memo("ch", () => { const w = 128, h = 256, R = mulberry(41), N = 46, M = [];
  for (let i = 0; i < N; i++) M.push({ x: R(), l: .86 + R() * .14, f: .86 + R() * .14, d: R(), w: .5 + R() * .9 });
  const fin = bruit(w, h, 64, 4, 2, 43), lent = bruit(w, h, 8, 3, 2, 44), meche = bruit(w, h, 9, 2, 2, 45);
  // mèches (≈ 9 par tuile) plus ou moins claires, cheveux fins dedans, nuances lentes le long
  const t = tex(w, h, (x, y) => { const u = x / w, v = y / h; let best = 1, m = M[0];
    for (const q of M) { let d = Math.abs(u - q.x); d = Math.min(d, 1 - d) * N / q.w; if (d < best) { best = d; m = q; } }
    const bout = v < m.f ? 1 : Math.max(0, 1 - (v - m.f) / (1 - m.f) * 1.6 - (best > .5 ? .5 : 0)), i = y * w + x;
    const lum = (m.l * .8 + fin[i] * .2) * (.72 + .28 * meche[i]) * (.92 + .08 * lent[i]);
    return [lum, Math.min(1, bout * 1.3), meche[i] * .6 + m.d * .25 + fin[i] * .15]; }, [ECH_CHEVEUX, 1]);
  return t; });

// ---------------- l'éclairage retouché (commun à toutes les matières) ----------------
// pOmbre : ombre du soleil gardée à part ; eW : la lumière « s'enroule » (par canal) ; ePen : pénombre colorée ;
// eSpec : force des reflets ; eChaud : lumière du ciel réchauffée (peau) ; eVel, eVelC : velours des tissus (bords).
const F_COMMUN = `
float pOmbre = 1.;
float peauK = 0.;
float pOcc = 1.;
float eSatH = 0.;
float eDessin = 0.;
float eLift = 0.;
float eRim = 0.;
uniform vec3 uDessin;
varying float vPOcc;
vec3 eW = vec3( 0. );
vec3 ePen = vec3( 1. );
float eSpec = 1.;
float eChaud = 0.;
float eVel = 0.;
vec3 eVelC = vec3( 1. );
float pLum( const in vec3 c ) { return dot( c, vec3( .2126, .7152, .0722 ) ); }
vec3 pIndir( const in vec3 e ) { return mix( e, pLum( e ) * vec3( 1.06, 1., .94 ), eChaud ); }
vec3 pAlb( const in vec3 a ) { return a * mix( vec3( 1. ), vec3( 1.03, .98, .97 ), eChaud ); }
vec3 pBosse( vec3 p, vec3 n, vec2 dh ) { vec3 sx = dFdx( p ), sy = dFdy( p ), r1 = cross( sy, n ), r2 = cross( n, sx ); float det = dot( sx, r1 );
	vec3 gr = sign( det ) * ( dh.x * r1 + dh.y * r2 ); return normalize( abs( det ) * n - gr ); }
#ifdef P_CHEVEUX
	vec3 cT1 = vec3( 0., 1., 0. );
	vec3 cT2 = vec3( 0., 1., 0. );
	float cMeche = .5;
	uniform vec3 uChC1;
	uniform vec3 uChC2;
	uniform vec4 uChE;
	float pKK( vec3 T, vec3 H, float e ) { float th = dot( T, H ); return smoothstep( -1., 0., th ) * pow( max( 1e-4, 1. - th * th ), e * .5 ); }
#endif
`;
function remplace(s, a, b) { if (!s.includes(a)) { console.warn("materiaux : ancre introuvable : " + a.slice(0, 60)); return s; } return s.replace(a, b); }
const LP = [
  ["float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n\tvec3 irradiance = dotNL * directLight.color;",
    `float nl = dot( geometryNormal, directLight.direction ), dotNL = saturate( nl );
	vec3 irradiance = dotNL * directLight.color * pOmbre;
	vec3 pDif = saturate( ( nl + eW ) / ( 1. + eW ) );
	pDif = mix( pDif, smoothstep( vec3( -.04 ) - eW * .4, vec3( .3 ), vec3( nl ) ), eDessin ) * pow( vec3( pOmbre ), ePen ) * directLight.color;`],
  ["vec3 ccIrradiance = dotNLcc * directLight.color;", "vec3 ccIrradiance = dotNLcc * directLight.color * pOmbre;"],
  ["reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );\n\treflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );",
    `reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material ) * eSpec * ( 1. - .45 * eDessin );
	reflectedLight.directDiffuse += pDif * BRDF_Lambert( material.diffuseColor );
	float pNV = saturate( dot( geometryNormal, geometryViewDir ) );
	reflectedLight.directSpecular += eVel * eVelC * pow( 1. - pNV, 4. ) * saturate( nl + .35 ) * directLight.color * pOmbre;
	#ifdef P_CHEVEUX
		vec3 pH = normalize( directLight.direction + geometryViewDir );
		reflectedLight.directSpecular += ( uChC1 * pKK( cT1, pH, uChE.x ) + uChC2 * pKK( cT2, pH, uChE.y ) * ( .4 + cMeche ) ) * directLight.color * pOmbre * smoothstep( -.25, .3, nl );
	#endif`],
  ["reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );",
    `reflectedLight.indirectDiffuse += pIndir( irradiance ) * BRDF_Lambert( pAlb( material.diffuseColor ) );
	reflectedLight.indirectSpecular += eVel * eVelC * pow( 1. - saturate( dot( geometryNormal, geometryViewDir ) ), 4. ) * irradiance * RECIPROCAL_PI;`],
  ["reflectedLight.indirectSpecular += radiance * singleScattering;\n\treflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;\n\treflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;",
    `reflectedLight.indirectSpecular += ( radiance * singleScattering + multiScattering * cosineWeightedIrradiance ) * eSpec * ( 1. - .35 * peauK );
	reflectedLight.indirectDiffuse += pAlb( diffuse ) * pIndir( cosineWeightedIrradiance );
	reflectedLight.indirectSpecular += eVel * eVelC * pow( 1. - saturate( dot( geometryNormal, geometryViewDir ) ), 4. ) * cosineWeightedIrradiance;
	#ifdef P_CHEVEUX
		vec3 pUp = normalize( ( viewMatrix * vec4( 0., 1., 0., 0. ) ).xyz ), pHs = normalize( pUp + geometryViewDir );
		reflectedLight.indirectSpecular += uChC1 * pKK( cT1, pHs, uChE.x * .4 ) * cosineWeightedIrradiance * uChE.z;
	#endif`],
].reduce((s, [a, b]) => remplace(s, a, b), THREE.ShaderChunk.lights_physical_pars_fragment);
const LB = [
  ["getDirectionalLightInfo( directionalLight, directLight );", "getDirectionalLightInfo( directionalLight, directLight );\n\t\tpOmbre = 1.;"],
  ["directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]", "pOmbre = ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]"],
].reduce((s, [a, b]) => remplace(s, a, b), THREE.ShaderChunk.lights_fragment_begin);

// occlusion douce (facultative) : attribut « occl » par sommet (1 = à l'air libre, 0 = au fond d'un creux), voir occlusion()
// elle assombrit la lumière du ciel et les reflets ; sur la peau, l'ombre des creux tire sur le rouge
const V_OCC = ["#include <common>", "attribute float occl;\nvarying float vPOcc;"], V_OCC2 = ["#include <begin_vertex>", "vPOcc = occl;"];
const F_OCC = ["#include <aomap_fragment>", `{ pOcc = clamp( vPOcc, 0., 1. ); vec3 pAo = pow( vec3( pOcc ), mix( vec3( 1. ), vec3( .55, 1., 1.15 ), peauK ) );
  reflectedLight.indirectDiffuse *= pAo; reflectedLight.indirectSpecular *= pOcc * pOcc; reflectedLight.directDiffuse *= mix( 1., pOcc, .35 );
  float pBord = 1. - saturate( dot( normal, normalize( vViewPosition ) ) );
  totalEmissiveRadiance += pAlb( material.diffuseColor ) * ( eLift + eRim * pBord * pBord * pBord ) * pAo; }`];
// couleurs vives au soleil : ACES délave les couleurs claires ; on rend un peu de saturation là où c'est lumineux
const F_SAT = ["#include <opaque_fragment>", "{ float L = pLum( outgoingLight ); outgoingLight = max( mix( vec3( L ), outgoingLight, 1. + eSatH * smoothstep( .15, 1.1, L ) ), 0. ); }", "avant"];
// style : dessin = rampe douce façon dessin animé (0 = éclairage réaliste, 1 = aplats doux comme l'ancien toon) ;
// lift = la couleur reste vive dans l'ombre ; rim = contre-jour doux sur les bords. Réglage commun (à changer avant de créer
// les matériaux) ; chaque fonction accepte aussi opts.dessin / opts.lift / opts.rim.
export const STYLE = { dessin: .75, lift: .12, rim: .28 };
const style = (opts, d = {}) => new THREE.Vector3(opts.dessin ?? d.dessin ?? STYLE.dessin, opts.lift ?? (d.lift ?? 1) * STYLE.lift, opts.rim ?? (d.rim ?? 1) * STYLE.rim);
// pose les retouches sur un matériau : cfg = { cle, defines, unif, style, vert: [[ancre, code, "avant"|"apres"|"remplace"]], frag: [...] }
function retoucher(m, cfg) {
  const pose = (s, l) => { for (const [a, c, o = "apres"] of l || []) s = remplace(s, a, o === "avant" ? c + "\n" + a : o === "remplace" ? c : a + "\n" + c); return s; };
  m.userData.unif = { uDessin: { value: cfg.style || style({}) }, ...(cfg.unif || {}) }; m.defaultAttributeValues = { ...(m.defaultAttributeValues || {}), occl: [1] };
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, m.userData.unif);
    sh.vertexShader = pose(sh.vertexShader, [V_OCC, V_OCC2, ...(cfg.vert || [])]);
    let f = remplace(sh.fragmentShader, "#include <common>", "#include <common>\n" + F_COMMUN);
    f = remplace(remplace(f, "#include <lights_physical_pars_fragment>", LP), "#include <lights_fragment_begin>", LB);
    sh.fragmentShader = pose(f, [["#include <lights_physical_fragment>", "eDessin = uDessin.x; eLift = uDessin.y; eRim = uDessin.z;"], ...(cfg.frag || []), F_OCC, F_SAT]); };
  m.customProgramCacheKey = () => cfg.cle;
  if (cfg.defines) m.defines = Object.assign(m.defines || {}, cfg.defines);
  return m;
}

// occlusion par sommet d'après un champ de distance (même repère que la géométrie, < 0 dedans) : on sonde le long de la
// normale ; renvoie geo (attribut « occl » ajouté). Coût : sommets × pas appels au champ (à faire une fois, géométrie partagée).
export function occlusion(geo, sdf, { pas = [.015, .035, .07, .12], force = .9, min = .5 } = {}) {
  const P = geo.attributes.position, N = geo.attributes.normal, n = P.count, o = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i); let a = 0, w = .5;
    for (const d of pas) { a += w * Math.max(0, d - sdf(x + nx * d, y + ny * d, z + nz * d)) / d; w *= .6; }
    o[i] = Math.max(min, Math.min(1, 1 - a * force)); }
  geo.setAttribute("occl", new THREE.BufferAttribute(o, 1)); return geo;
}

// ---------------- PEAU ----------------
// la lumière entre dans la peau et ressort plus loin, surtout le rouge : bord de l'ombre chaud, pénombre rosée,
// lumière du ciel moins verte ; reflets doux (peau ≈ 0,028) ; mains, pieds, genoux et coudes un peu plus roses.
const os = n => INDEX_OS[n].toFixed(1);
const V_PEAU_PARS = `varying vec3 vPPos;
varying vec3 vPNor;
varying float vPRouge;
#ifdef USE_SKINNING
	float pOs( float i ) { return dot( skinWeight, vec4( equal( skinIndex, vec4( i ) ) ) ); }
#endif`;
const V_PEAU = `vPPos = position; vPNor = normal; vPRouge = 0.;
#ifdef USE_SKINNING
{ float mains = pOs( ${os("main_d")} ) + pOs( ${os("doigts_d")} ) + pOs( ${os("main_g")} ) + pOs( ${os("doigts_g")} );
  float pieds = pOs( ${os("pied_d")} ) + pOs( ${os("orteils_d")} ) + pOs( ${os("pied_g")} ) + pOs( ${os("orteils_g")} );
  float genou = min( pOs( ${os("cuisse_d")} ) + pOs( ${os("cuisse_g")} ), pOs( ${os("jambe_d")} ) + pOs( ${os("jambe_g")} ) ) * 2. * smoothstep( -.2, .7, normal.z );
  float coude = min( pOs( ${os("bras_d")} ) + pOs( ${os("bras_g")} ), pOs( ${os("avantbras_d")} ) + pOs( ${os("avantbras_g")} ) ) * 2. * smoothstep( .1, -.7, normal.z );
  vPRouge = clamp( mains * .75 + pieds * .85 + genou * .8 + coude * .55, 0., 1. ); }
#endif`;
const F_PEAU_PARS = `uniform vec3 uPW;
uniform vec3 uPPen;
uniform vec4 uPReg;
uniform vec3 uPRouge;
uniform sampler2D tPGrain;
uniform vec2 uPGrain;
varying vec3 vPPos;
varying vec3 vPNor;
varying float vPRouge;`;
const F_PEAU_GRAIN = `#ifdef P_GRAIN
{ vec3 q = vPPos * uPGrain.x, a = abs( normalize( vPNor ) ); a *= a; a *= a; a /= a.x + a.y + a.z + 1e-4;
  float h = texture2D( tPGrain, q.yz ).r * a.x + texture2D( tPGrain, q.zx ).r * a.y + texture2D( tPGrain, q.xy ).r * a.z;
  normal = pBosse( - vViewPosition, normal, vec2( dFdx( h ), dFdy( h ) ) * uPGrain.y ); }
#endif`;
// réglages par défaut de la peau (exportés pour les essais)
export const PEAU = { rough: .56, w: [.46, .23, .15], pen: [.6, 1, 1.2], spec: .6, chaud: .9, rouge: [1, .88, .86], forceRouge: .5, grain: 55, relief: .00011 };
export function matPeau(color = 0xf1c6a0, opts = {}) {
  const P = fus(PEAU, opts), grain = !!opts.grain && !LOWQ && P.relief > 0; // grain : seulement sur demande (style lisse, façon Mii)
  const m = new THREE.MeshStandardMaterial({ color, roughness: P.rough, map: opts.map || null, ...(opts.extra || {}) });
  retoucher(m, { cle: "pmat-peau-1" + (grain ? "g" : ""), defines: grain ? { P_GRAIN: "" } : null, style: style(opts),
    unif: { uPW: { value: new THREE.Vector3(...P.w) }, uPPen: { value: new THREE.Vector3(...P.pen) }, uPReg: { value: new THREE.Vector4(P.spec, P.chaud, P.forceRouge, 0) },
      uPRouge: { value: new THREE.Vector3(...P.rouge) }, tPGrain: { value: texGrainPeau() }, uPGrain: { value: new THREE.Vector2(typeof P.grain === "number" ? P.grain : PEAU.grain, P.relief) } },
    vert: [["#include <common>", V_PEAU_PARS], ["#include <begin_vertex>", V_PEAU]],
    frag: [["#include <common>", F_PEAU_PARS], ["vec4 diffuseColor = vec4( diffuse, opacity );", "peauK = 1.;"],
      ["#include <color_fragment>", "diffuseColor.rgb *= mix( vec3( 1. ), uPRouge, vPRouge * uPReg.z );"],
      ["#include <normal_fragment_maps>", F_PEAU_GRAIN],
      ["#include <lights_physical_fragment>", `float pFonce = .55 + .45 * saturate( pLum( material.diffuseColor ) * 2.2 ); eW = mix( vec3( .14 ), uPW * pFonce, peauK ); ePen = mix( vec3( 1. ), uPPen, peauK * pFonce );
eSpec = mix( .45, uPReg.x, peauK ); eChaud = mix( .5, uPReg.y, peauK ); eVel = .5 * ( 1. - peauK ); eVelC = mix( diffuseColor.rgb, vec3( pLum( diffuseColor.rgb ) ), .35 ) * .7 + .035; eSatH = .32 * ( 1. - peauK );`]] });
  m.userData.sorte = "peau"; return m;
}

// décalque collé sur la peau (lèvres, joues, sourcils peints…) : même lumière que la peau, sinon il paraît sale ou gris
export const matDecalPeau = (map, opts = {}) => matPeau(0xffffff, { relief: 0, forceRouge: 0, ...opts, map,
  extra: { transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, ...(opts.extra || {}) } });

// ---------------- TISSUS ----------------
// velours : reflet doux sur les bords (fibres) ; w : enroulement (tissu épais, ombres douces) ; spec : reflets ;
// fin / gros : force du relief (maille) et des bosses ; vf / vg : nuances des fils / du tissu porté ; fil : fils blancs (jean)
export const TISSUS = {
  coton: { rough: .9, vel: .55, w: .14, spec: .45, fin: .45, gros: .1, vf: .1, vg: .07, fil: 0, sat: 1.06, ech: [44, 44], echG: [2.6, 2.6] },
  jean: { rough: .86, vel: .3, w: .1, spec: .4, fin: .45, gros: .14, vf: .14, vg: .34, fil: 0, sat: 1.04, ech: [52, 52], echG: [2.2, 2.2] },
  lycra: { rough: .5, vel: .12, w: .06, spec: .9, fin: .18, gros: .06, vf: .04, vg: .05, fil: 0, sat: 1.08, ech: [70, 70], echG: [3, 3] },
  molleton: { rough: .96, vel: .75, w: .2, spec: .25, fin: .35, gros: .12, vf: .22, vg: .08, fil: 0, sat: 1.03, ech: [40, 40], echG: [2.4, 2.4] },
  maille: { rough: .92, vel: .5, w: .16, spec: .35, fin: .7, gros: .1, vf: .1, vg: .06, fil: 0, sat: 1.05, ech: [24, 24], echG: [2.4, 2.4] },
  // tissu doré (maillot « or ») : lycra à demi métallique, reflets chauds
  or: { rough: .3, metal: .55, vel: .1, w: .04, spec: 1, fin: .25, gros: .1, vf: .05, vg: .08, fil: 0, sat: 1.1, ech: [70, 70], echG: [3, 3], tex: "lycra" },
};
const F_TISSU_PARS = `uniform vec4 uTEch;
uniform vec4 uTVar;
uniform vec4 uTLum;
uniform vec3 uTFil;
#ifdef USE_NORMALMAP_TANGENTSPACE
	uniform sampler2D tTGros;
#endif`;
const F_TISSU_MAPS = `#ifdef USE_NORMALMAP_TANGENTSPACE
{ vec3 tF = texture2D( normalMap, vNormalMapUv * uTEch.xy ).xyz, tG = texture2D( tTGros, vNormalMapUv * uTEch.zw ).xyz;
  vec2 dn = ( tF.xy * 2. - 1. ) * normalScale + ( tG.xy * 2. - 1. ) * uTVar.w;
  normal = normalize( tbn * vec3( dn, 1. ) );
  diffuseColor.rgb *= ( 1. + ( tF.z - .5 ) * uTVar.x ) * ( 1. + ( tG.z - .5 ) * uTVar.y );
  diffuseColor.rgb = mix( diffuseColor.rgb, uTFil, smoothstep( .45, .9, tF.z ) * uTVar.z ); }
#endif
diffuseColor.rgb = max( mix( vec3( pLum( diffuseColor.rgb ) ), diffuseColor.rgb, uTLum.w ), 0. );`;
export function matTissu(color = 0xffffff, opts = {}) {
  const sorte = TISSUS[opts.sorte] ? opts.sorte : "coton", P = fus(TISSUS[sorte], opts), e = typeof P.echelle === "number" ? [P.echelle, P.echelle] : P.echelle || [1, 1];
  const fin = typeof opts.bump === "number" ? P.fin * opts.bump : P.fin, detail = !!opts.detail && !LOWQ;
  const m = new THREE.MeshStandardMaterial({ color, roughness: P.rough, metalness: P.metal ?? 0, map: opts.map || null, normalMap: detail ? texTissu(P.tex || sorte) : null, normalScale: new THREE.Vector2(fin, fin), ...(opts.extra || {}) });
  const fil = lin(sorte === "jean" ? 0xd9dde4 : 0xffffff);
  retoucher(m, { cle: "pmat-tissu-1", style: style(opts, { lift: .85, rim: .85 }),
    unif: { uTEch: { value: new THREE.Vector4(P.ech[0] * e[0], P.ech[1] * e[1], P.echG[0] * e[0], P.echG[1] * e[1]) }, uTVar: { value: new THREE.Vector4(P.vf, P.vg, P.fil, P.gros) },
      uTLum: { value: new THREE.Vector4(P.vel, P.spec, P.w, P.sat) }, uTFil: { value: new THREE.Vector3(fil.r, fil.g, fil.b) }, ...(detail ? { tTGros: { value: texIrreg(sorte === "jean") } } : {}) },
    frag: [["#include <common>", F_TISSU_PARS], ["#include <normal_fragment_maps>", F_TISSU_MAPS, "remplace"],
      ["#include <lights_physical_fragment>", "eW = vec3( uTLum.z ); eSpec = uTLum.y; eVel = uTLum.x; eChaud = .5; eSatH = .32; eVelC = mix( diffuseColor.rgb, vec3( pLum( diffuseColor.rgb ) ), .35 ) * .7 + .035;"]] });
  m.userData.sorte = sorte; return m;
}
// semelles, tongs, caoutchouc : mat, un peu de reflet ; plastique (lunettes, montures) ; silicone (bonnets de bain)
function matSimple(color, rough, { vel = 0, w = 0, spec = 1, metal = 0, cle = "simple", extra = {}, opts = {} } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
  retoucher(m, { cle: "pmat-simple-1", style: style(opts, { dessin: .45, lift: .5, rim: .45 }), unif: { uSLum: { value: new THREE.Vector3(vel, spec, w) } }, frag: [["#include <common>", "uniform vec3 uSLum;"],
    ["#include <lights_physical_fragment>", "eW = vec3( uSLum.z ); eSpec = uSLum.y; eVel = uSLum.x; eSatH = .25; eVelC = diffuseColor.rgb * .6 + .05;"]] });
  m.userData.sorte = cle; return m;
}
export const matCaoutchouc = (color = 0x2b2b2b, opts = {}) => matSimple(color, opts.rough ?? .82, { vel: .12, w: .05, spec: .6, cle: "caoutchouc", extra: opts.extra, opts });
export const matSemelle = (color = 0xf2f0ea, opts = {}) => matSimple(color, opts.rough ?? .78, { vel: .1, w: .08, spec: .55, cle: "semelle", extra: opts.extra, opts });
export const matPlastique = (color = 0x2e6fd8, opts = {}) => matSimple(color, opts.rough ?? .3, { vel: 0, w: .02, spec: 1, metal: opts.metal ?? 0, cle: "plastique", extra: opts.extra, opts });
export const matSilicone = (color = 0xe8534a, opts = {}) => matSimple(color, opts.rough ?? .4, { vel: .18, w: .22, spec: .9, cle: "silicone", extra: opts.extra, opts });
// verres de lunettes : transparents, reflet du ciel
export const matVerre = (color = 0xcfeefa, opacity = .25) => new THREE.MeshStandardMaterial({ color, roughness: .05, metalness: 0, transparent: true, opacity, depthWrite: false, envMapIntensity: 1.4 });

// ---------------- CHEVEUX ----------------
// style simple et doux (façon Mii) : diffus doux + deux reflets étirés en travers des mèches (Kajiya-Kay) : le 1er presque
// blanc, vers la racine ; le 2e teinté par la couleur, plus large ; + un reflet du ciel. Le sens des mèches est, par défaut,
// « vers le bas de la tête » (aucune uv nécessaire : anneau de lumière autour du crâne). Avec opts.meches (ou opts.bords),
// la tuile des mèches (nuances, pointes) est posée et le sens vient de uv.y (0 racine → 1 pointe).
const V_CH = [["#include <common>", "varying vec3 vPBas;"], ["#include <skinning_vertex>", `{ vec3 b = vec3( 0., -1., 0. );
#ifdef USE_SKINNING
	b = ( skinMatrix * vec4( b, 0. ) ).xyz;
#endif
vPBas = normalize( ( modelViewMatrix * vec4( b, 0. ) ).xyz ); }`]];
const F_CH_ALPHA = `#ifdef USE_ALPHAMAP
{ vec4 tM = texture2D( alphaMap, vAlphaMapUv ); diffuseColor.a *= tM.g; diffuseColor.rgb *= mix( 1., tM.r * 1.18, uChV.x ); cMeche = tM.b; }
#endif`;
const F_CH_T = `{ vec3 T = vPBas;
#ifdef P_CH_UV
	vec3 q0 = dFdx( - vViewPosition ), q1 = dFdy( - vViewPosition ); vec2 s0 = dFdx( vAlphaMapUv ), s1 = dFdy( vAlphaMapUv );
	vec3 B = cross( q1, normal ) * s0.y + cross( normal, q0 ) * s1.y; if ( dot( B, B ) > 1e-14 ) T = normalize( B );
#endif
  T = normalize( T - normal * dot( T, normal ) + 1e-5 );
  cT1 = normalize( T + normal * ( uChD.x + ( cMeche - .5 ) * uChE.w ) ); cT2 = normalize( T + normal * ( uChD.y + ( cMeche - .5 ) * uChE.w ) ); }`;
export const CHEVEUX_R = { rough: .6, e1: 60, e2: 14, s1: .11, s2: .12, ciel: .32, d1: -.08, d2: .1, alea: .14, w: .35, var: .5 };
export function matCheveux(color = 0x5a3a22, opts = {}) {
  const P = fus(CHEVEUX_R, opts), c = lin(color), L = c.r * .2126 + c.g * .7152 + c.b * .0722, mx = Math.max(c.r, c.g, c.b, 1e-4), clair = Math.min(1, L * 2.2);
  // reflet 1 : presque blanc ; plus discret sur les cheveux clairs (déjà lumineux) ; reflet 2 : la couleur, saturée
  const t1 = new THREE.Color(c.r / mx, c.g / mx, c.b / mx).lerp(new THREE.Color(1, 1, 1), .7).multiplyScalar(P.s1 * (1 - .45 * clair));
  const t2 = new THREE.Color(Math.sqrt(c.r * c.r / mx), Math.sqrt(c.g * c.g / mx), Math.sqrt(c.b * c.b / mx)).multiplyScalar(P.s2 * (.35 + .65 * Math.sqrt(mx)));
  const bords = !!opts.bords, meches = bords || !!opts.meches;
  const m = new THREE.MeshStandardMaterial({ color, roughness: P.rough, alphaMap: meches ? texCheveux() : null, alphaTest: bords ? .5 : 0, alphaToCoverage: bords && !LOWQ,
    side: opts.side ?? (bords ? THREE.DoubleSide : THREE.FrontSide), ...(opts.extra || {}) });
  retoucher(m, { cle: "pmat-cheveux-2", style: style(opts, { dessin: .6, lift: .7, rim: .7 }), defines: meches ? { P_CHEVEUX: "", P_CH_UV: "" } : { P_CHEVEUX: "" },
    unif: { uChC1: { value: new THREE.Vector3(t1.r, t1.g, t1.b) }, uChC2: { value: new THREE.Vector3(t2.r, t2.g, t2.b) }, uChE: { value: new THREE.Vector4(P.e1, P.e2, P.ciel, meches ? P.alea : 0) },
      uChD: { value: new THREE.Vector2(P.d1, P.d2) }, uChV: { value: new THREE.Vector3(P.var, P.w, .3) } },
    vert: V_CH, frag: [["#include <common>", "uniform vec2 uChD;\nuniform vec3 uChV;\nvarying vec3 vPBas;"], ["#include <alphamap_fragment>", F_CH_ALPHA, "remplace"], ["#include <normal_fragment_maps>", F_CH_T],
      ["#include <lights_physical_fragment>", "eW = vec3( uChV.y ); eSpec = uChV.z; eChaud = .6; eSatH = .15;"]] });
  m.userData.sorte = "cheveux"; return m;
}

// ---------------- YEUX (aides pour l'équipe visage) ----------------
// blanc de l'œil : pas tout à fait blanc, un peu de diffusion ; cornée : couche brillante additive (reflets seuls)
export const matYeux = (opts = {}) => matPeau(opts.color ?? 0xf3eee8, { rough: .32, w: [.25, .18, .16], pen: [.85, 1, 1.05], spec: 1.3, chaud: .3, forceRouge: 0, relief: 0, dessin: .3, rim: 0, extra: opts.extra });
export const matCornee = () => PART(new THREE.MeshStandardMaterial({ color: 0x000000, roughness: .04, metalness: 0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, envMapIntensity: 1.6 }));

// ---------------- FOULE : un maillage, un matériau ----------------
// chaque sommet porte le numéro de sa partie (attribut « pk ») ; le shader choisit couleur, rugosité, visibilité.
export const PARTIES_LEGER = ["sk", "sh", "pa", "so", "sole", "hr", "cap", "sw", "tongs", "yeux", "deco", "lun", "bonnet"];
export const IDX_LEGER = Object.fromEntries(PARTIES_LEGER.map((n, i) => [n, i]));
const NL = 16;
// par partie : rugosité, métal, velours, enroulement, reflets (sk = peau)
const PRM_LEGER = { sk: [.5, 0, 0, 0, .75], sh: [.9, 0, .55, .14, .45], pa: [.88, 0, .4, .12, .4], so: [.6, 0, .15, .05, .7], sole: [.8, 0, .1, .05, .55], hr: [.55, 0, .1, .3, .6],
  cap: [.8, 0, .4, .12, .5], sw: [.45, 0, .12, .06, .9], tongs: [.6, 0, .1, .05, .7], yeux: [.3, 0, 0, 0, 1], deco: [.5, 0, 0, .05, .8], lun: [.3, 0, 0, .02, 1], bonnet: [.4, 0, .18, .22, .9] };
const COUL_LEGER = { sk: 0xf1c6a0, sh: 0x2e86de, pa: 0x3a4a63, so: 0xf5f5f5, sole: 0x2b2b2b, hr: 0x5a3a22, cap: 0xff5a4e, sw: 0xe74c3c, tongs: 0x2e86de, yeux: 0xffffff, deco: 0xffffff, lun: 0x2e6fd8, bonnet: 0xe8534a };
const glArr = (k, i) => PARTIES_LEGER.map(n => PRM_LEGER[n][i].toFixed(3)).concat(Array(NL - PARTIES_LEGER.length).fill("0.")).join(", ");
const V_LEG = `attribute float pk;
uniform float vis[ ${NL} ];
flat varying float vPk;
varying vec2 vPUv;`;
const F_LEG = `uniform vec3 pal[ ${NL} ];
uniform float rough[ ${NL} ];
uniform float metal[ ${NL} ];
uniform float texK;
uniform float texK2;
uniform vec4 texRep;
uniform sampler2D suitMap;
uniform sampler2D motifMap;
flat varying float vPk;
varying vec2 vPUv;
const float L_VEL[ ${NL} ] = float[ ${NL} ]( ${glArr("vel", 2)} );
const float L_W[ ${NL} ] = float[ ${NL} ]( ${glArr("w", 3)} );
const float L_SPEC[ ${NL} ] = float[ ${NL} ]( ${glArr("spec", 4)} );`;
const F_LEG_COUL = `int pI = int( vPk + .5 );
vec3 pc = pal[ pI ];
if ( abs( vPk - texK ) < .5 ) pc *= texture2D( suitMap, vPUv * texRep.xy ).rgb;
if ( abs( vPk - texK2 ) < .5 ) pc *= texture2D( motifMap, vPUv * texRep.zw ).rgb;
vec4 diffuseColor = vec4( diffuse * pc, opacity );
peauK = pI == 0 ? 1. : 0.;`;
const BLANC1 = PART((() => { const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); t.needsUpdate = true; return t; })());
export function matLegere(peau = COUL_LEGER.sk, opts = {}) {
  const pal = Array.from({ length: NL }, (_, i) => lin(COUL_LEGER[PARTIES_LEGER[i]] ?? 0xffffff)); pal[0] = lin(peau);
  const u = { pal: { value: pal }, vis: { value: new Float32Array(NL).fill(1) }, rough: { value: new Float32Array(NL).map((_, i) => PRM_LEGER[PARTIES_LEGER[i]]?.[0] ?? .8) },
    metal: { value: new Float32Array(NL) }, texK: { value: -1 }, texK2: { value: -1 }, texRep: { value: new THREE.Vector4(1, 1, 1, 1) }, suitMap: { value: BLANC1 }, motifMap: { value: BLANC1 } };
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, ...(opts.extra || {}) });
  m.defaultAttributeValues = { color: [1, 1, 1], pk: [0], uv: [0, 0] }; // géométrie sans ces attributs : tout en peau, sans teinte
  retoucher(m, { cle: "pmat-legere-1", unif: u, style: style(opts),
    vert: [["#include <common>", V_LEG], ["#include <begin_vertex>", "vPk = pk; vPUv = uv; if ( vis[ int( pk + .5 ) ] < .5 ) transformed = vec3( 0. );"]],
    frag: [["#include <common>", F_LEG], ["vec4 diffuseColor = vec4( diffuse, opacity );", F_LEG_COUL, "remplace"],
      ["#include <roughnessmap_fragment>", "roughnessFactor = rough[ pI ];"], ["#include <metalnessmap_fragment>", "metalnessFactor = metal[ pI ];"],
      ["#include <lights_physical_fragment>", `eW = mix( vec3( L_W[ pI ] ), vec3( ${PEAU.w.join(", ")} ), peauK ); ePen = mix( vec3( 1. ), vec3( ${PEAU.pen.join(", ")} ), peauK );
eSpec = L_SPEC[ pI ]; eChaud = ${PEAU.chaud} * peauK; eVel = L_VEL[ pI ]; eSatH = .3 * ( 1. - peauK ); eVelC = mix( diffuseColor.rgb, vec3( pLum( diffuseColor.rgb ) ), .35 ) * .7 + .035;`]] });
  m.userData.u = u; m.userData.sorte = "legere"; return m;
}
// règle une partie : partie(m ou m.userData.u, "sh", { c: couleur, vis: bool, rough, metal })
export function partie(m, nom, { c, vis, rough, metal } = {}) {
  const u = m.userData?.u || m, i = IDX_LEGER[nom]; if (i === undefined) return;
  if (c !== undefined && c !== null) u.pal.value[i].set(c); if (vis !== undefined) u.vis.value[i] = vis ? 1 : 0;
  if (rough !== undefined) u.rough.value[i] = rough; if (metal !== undefined) u.metal.value[i] = metal;
}
// texture d'une partie (maillot : texK/suitMap ; motif du haut : texK2/motifMap) ; t = null l'enlève
export function texturePartie(m, nom, t, rep = [1, 1], second = false) {
  const u = m.userData?.u || m, i = t ? IDX_LEGER[nom] ?? -1 : -1;
  if (second) { u.texK2.value = i; u.motifMap.value = t || BLANC1; u.texRep.value.z = rep[0]; u.texRep.value.w = rep[1]; }
  else { u.texK.value = i; u.suitMap.value = t || BLANC1; u.texRep.value.x = rep[0]; u.texRep.value.y = rep[1]; }
}
// ombre portée de la foule (facultatif) : mesh.customDepthMaterial = matLegereOmbre(m) (respecte « vis »)
export function matLegereOmbre(m) {
  const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), u = m.userData.u;
  d.onBeforeCompile = sh => { sh.uniforms.vis = u.vis; sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float pk;\nuniform float vis[ " + NL + " ];")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nif ( vis[ int( pk + .5 ) ] < .5 ) transformed = vec3( 0. );"); };
  d.customProgramCacheKey = () => "pmat-legere-ombre-1"; d.defaultAttributeValues = { pk: [0] }; return d;
}
// fusionne { partie: géométrie } en une géométrie (attribut pk) ; mêmes attributs partout (manquants : valeurs neutres)
const GEO_LEGER = new Map();
export function geoLegere(parties, cle) {
  if (cle && GEO_LEGER.has(cle)) return GEO_LEGER.get(cle);
  const l = [], noms = ["position", "normal", "uv", "skinIndex", "skinWeight", "color", "occl", "region", "lng"], taille = { position: 3, normal: 3, uv: 2, skinIndex: 4, skinWeight: 4, color: 3, occl: 1, region: 1, lng: 1 };
  const present = new Set(); for (const g of Object.values(parties)) if (g) for (const n of noms) if (g.attributes[n]) present.add(n);
  present.add("color");
  for (const [k, g0] of Object.entries(parties)) { if (!g0 || IDX_LEGER[k] === undefined) continue;
    const g = g0, n = g.attributes.position.count, out = new THREE.BufferGeometry();
    for (const a of noms) { if (!present.has(a)) continue; const s = taille[a], src = g.attributes[a], T = a === "skinIndex" ? Uint16Array : Float32Array, arr = new T(n * s);
      if (src) for (let i = 0; i < n; i++) for (let c = 0; c < s; c++) arr[i * s + c] = c < src.itemSize ? src.getComponent(i, c) : 0;
      else if (a === "color" || a === "occl") arr.fill(1); else if (a === "skinWeight") for (let i = 0; i < n; i++) arr[i * 4] = 1;
      out.setAttribute(a, new THREE.BufferAttribute(arr, s)); }
    out.setAttribute("pk", new THREE.BufferAttribute(new Float32Array(n).fill(IDX_LEGER[k]), 1));
    if (g.index) out.setIndex(Array.from(g.index.array)); else { const ix = new Uint32Array(n); for (let i = 0; i < n; i++) ix[i] = i; out.setIndex(new THREE.BufferAttribute(ix, 1)); }
    l.push(out); }
  const m = mergeGeometries(l); l.forEach(x => x.dispose()); PART(m); if (cle) GEO_LEGER.set(cle, m); return m;
}
