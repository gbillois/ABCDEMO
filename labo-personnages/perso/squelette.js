// squelette.js — LE CONTRAT COMMUN : le squelette de tous les personnages (enfants et adultes).
// Tous les modules (corps, habits, cheveux, visage, animation) s'appuient sur ce fichier. Ne pas changer
// les noms, l'ordre, les parents ni les conventions sans mettre à jour SPEC.md.
//
// Repère : y vers le haut, le personnage regarde vers +z, ses pieds sont en y = 0 (pose zéro).
// Côté « _d » = x < 0 (la droite du personnage) = index 0 des tableaux legs/arms/knees/elbows du jeu ;
// côté « _g » = x > 0 (sa gauche) = index 1.
// Unités : unités du modèle. Le jeu réduit ensuite tout le personnage avec g.scale
// (≈ 0,6 pour un enfant → 1,28 m ; ≈ 0,76 pour un adulte → 1,67 m).
//
// Pose zéro (toutes les rotations à 0) : debout, droit, bras le long du corps (légèrement écartés pour ne pas
// toucher les hanches), paumes vers les cuisses, jambes droites. C'est la pose que le jeu suppose quand il écrit
// directement arms[i].rotation.x = …, legs[i].rotation.x = … (mêmes conventions que l'ancien personnage) :
//   cuisse.rotation.x > 0 : la jambe part en arrière ; < 0 : en avant (assis = −1,5)
//   jambe.rotation.x  > 0 : le genou plie (le talon monte derrière)
//   bras.rotation.x   < 0 : le bras part en avant / en haut (−2,6 = bras levés au-dessus de la tête)
//   avantbras.rotation.x < 0 : le coude plie (la main vient vers l'avant)
//   bras_d.rotation.z < 0 et bras_g.rotation.z > 0 : les bras s'écartent sur les côtés (idem cuisses)
//   pied.rotation.x  > 0 : la pointe du pied descend (extension) ; < 0 : elle remonte
// Les os sont orientés comme le monde en pose zéro (rotation identité, enfants décalés vers le bas pour les
// membres), l'ordre d'Euler est celui de three.js par défaut (« XYZ »).
//
// Pose de liaison (« bind », celle dans laquelle les maillages sont construits) : pose A, les bras levés à ~45°
// du corps, les jambes à peine écartées. Le maillage du corps, des habits et des cheveux est construit dans cette
// pose ; les matrices inverses de liaison sont calculées dans cette pose, puis les os reviennent en pose zéro.
import * as THREE from "three";

export const NOMS_OS = [
  "corps", "bassin", "colonne", "poitrine", "cou", "tete",
  "clavicule_d", "bras_d", "avantbras_d", "main_d", "doigts_d",
  "clavicule_g", "bras_g", "avantbras_g", "main_g", "doigts_g",
  "cuisse_d", "jambe_d", "pied_d", "orteils_d",
  "cuisse_g", "jambe_g", "pied_g", "orteils_g",
];
export const INDEX_OS = Object.fromEntries(NOMS_OS.map((n, i) => [n, i]));
const PARENT = {
  bassin: "corps", colonne: "bassin", poitrine: "colonne", cou: "poitrine", tete: "cou",
  clavicule_d: "poitrine", bras_d: "clavicule_d", avantbras_d: "bras_d", main_d: "avantbras_d", doigts_d: "main_d",
  clavicule_g: "poitrine", bras_g: "clavicule_g", avantbras_g: "bras_g", main_g: "avantbras_g", doigts_g: "main_g",
  cuisse_d: "bassin", jambe_d: "cuisse_d", pied_d: "jambe_d", orteils_d: "pied_d",
  cuisse_g: "bassin", jambe_g: "cuisse_g", pied_g: "jambe_g", orteils_g: "pied_g",
};
export const PARENT_OS = PARENT;

// Positions des articulations en pose zéro (coordonnées du personnage, unités du modèle).
// Pour les os doubles, on donne le côté droit (x < 0) ; le côté gauche est le miroir (x → −x).
//   bassin  : centre des hanches (articulations coxo-fémorales)   colonne : lombaires (taille)
//   poitrine: thorax (bas des côtes)                              cou     : base du cou (7e cervicale)
//   tete    : haut du cou (atlas), pivot de la tête, juste derrière/au-dessus du menton
//   clavicule : articulation sterno-claviculaire                 bras    : centre de l'épaule (gléno-humérale)
//   avantbras : coude          main : poignet          doigts : jointures (métacarpo-phalangiennes)
//   cuisse : hanche            jambe : genou           pied : cheville        orteils : base des orteils
// H = sommet du crâne. Autres repères utiles pour le corps : menton, largeurs (voir SPEC.md).
export const TYPES = {
  // garçon de 8 ans (≈ 1,28 m à l'échelle 0,6) : tête ≈ 1/6,4 de la taille, épaules étroites, jambes ≈ la moitié
  garcon: { age: "enfant", sexe: "g", H: 2.13, menton: 1.80, J: {
    bassin: [0, 1.065, 0], colonne: [0, 1.235, -.02], poitrine: [0, 1.46, -.025], cou: [0, 1.70, -.035], tete: [0, 1.835, -.015],
    clavicule: [-.035, 1.685, .025], bras: [-.18, 1.655, -.015], avantbras: [-.20, 1.295, -.035], main: [-.22, .985, -.01], doigts: [-.226, .885, 0],
    cuisse: [-.13, 1.065, 0], jambe: [-.135, .607, .012], pied: [-.137, .10, -.02], orteils: [-.14, .03, .155] } },
  // fille de 8 ans : presque comme le garçon (à cet âge les corps se ressemblent), épaules à peine plus étroites
  fille: { age: "enfant", sexe: "f", H: 2.13, menton: 1.80, J: {
    bassin: [0, 1.065, 0], colonne: [0, 1.235, -.02], poitrine: [0, 1.46, -.025], cou: [0, 1.70, -.035], tete: [0, 1.835, -.015],
    clavicule: [-.034, 1.685, .025], bras: [-.175, 1.655, -.015], avantbras: [-.195, 1.295, -.035], main: [-.214, .985, -.01], doigts: [-.22, .885, 0],
    cuisse: [-.133, 1.065, 0], jambe: [-.133, .607, .012], pied: [-.135, .10, -.02], orteils: [-.138, .03, .155] } },
  // femme adulte (≈ 1,63 m à l'échelle 0,74) : tête ≈ 1/7,3 de la taille
  femme: { age: "adulte", sexe: "f", H: 2.2, menton: 1.90, J: {
    bassin: [0, 1.115, 0], colonne: [0, 1.30, -.02], poitrine: [0, 1.53, -.03], cou: [0, 1.80, -.04], tete: [0, 1.925, -.02],
    clavicule: [-.035, 1.785, .03], bras: [-.20, 1.745, -.02], avantbras: [-.225, 1.39, -.04], main: [-.245, 1.07, -.015], doigts: [-.25, .96, 0],
    cuisse: [-.118, 1.115, 0], jambe: [-.12, .627, .012], pied: [-.125, .099, -.025], orteils: [-.13, .03, .19] } },
  // homme adulte (≈ 1,75 m à l'échelle 0,8) : épaules plus larges, bassin plus étroit
  homme: { age: "adulte", sexe: "g", H: 2.2, menton: 1.91, J: {
    bassin: [0, 1.12, 0], colonne: [0, 1.31, -.02], poitrine: [0, 1.545, -.03], cou: [0, 1.81, -.045], tete: [0, 1.94, -.025],
    clavicule: [-.035, 1.80, .03], bras: [-.215, 1.755, -.025], avantbras: [-.24, 1.395, -.045], main: [-.26, 1.075, -.02], doigts: [-.265, .965, 0],
    cuisse: [-.108, 1.12, 0], jambe: [-.11, .627, .012], pied: [-.115, .095, -.025], orteils: [-.12, .03, .195] } },
};
// Ancienne hauteur des hanches (ancien personnage) : le jeu a réglé les sièges, vélos, karts, poney, bouées…
// pour elle. Les poses assises abaissent l'os « corps » de (HANCHES_ANCIEN − hauteur des hanches) pour que le
// bassin reste au même endroit.
export const HANCHES_ANCIEN = .94;

// Type de corps d'après les options du personnage : adulte si o.adulte, sinon d'après la taille (g.scale ≥ 0,66).
export function typeDe(o) {
  const adulte = o.adulte ?? ((o.scale ?? .76) >= .66);
  return adulte ? (o.long ? "femme" : "homme") : (o.long ? "fille" : "garcon");
}

// Rotations de la pose de liaison (pose A), en radians, ordre XYZ. Les os non cités restent à 0.
export const POSE_LIAISON = {
  bras_d: [0, 0, -.70], bras_g: [0, 0, .70],
  cuisse_d: [0, 0, -.05], cuisse_g: [0, 0, .05],
};

// Position (pose zéro) d'une articulation : nom complet (« bras_d », « cou »…) → [x, y, z]
export function articulation(type, nom) {
  const T = TYPES[type], base = nom.replace(/_[dg]$/, ""), p = nom === "corps" ? [0, 0, 0] : T.J[base];
  if (!p) throw new Error("articulation inconnue : " + nom);
  return nom.endsWith("_g") ? [-p[0], p[1], p[2]] : p.slice();
}

// Construit les os d'un personnage (pose zéro). Retourne { os (nom → Bone), liste (dans l'ordre NOMS_OS), type }.
export function fabriquerOs(type) {
  const os = {}, liste = NOMS_OS.map(n => { const b = new THREE.Bone(); b.name = n; os[n] = b; return b; });
  for (const n of NOMS_OS) {
    const p = articulation(type, n);
    if (n === "corps") { os[n].position.set(0, 0, 0); continue; }
    const q = articulation(type, PARENT[n]); os[n].position.set(p[0] - q[0], p[1] - q[1], p[2] - q[2]); os[PARENT[n]].add(os[n]);
  }
  return { os, liste, type };
}
export function poserLiaison(os) { for (const [n, r] of Object.entries(POSE_LIAISON)) os[n].rotation.set(r[0], r[1], r[2]); }
export function poserZero(os) { for (const b of Object.values(os)) { b.rotation.set(0, 0, 0); b.quaternion.identity(); } }

// Matrices du monde de chaque os en pose de liaison (personnage à l'origine, sans échelle), et leurs inverses.
// Mises en cache par type : tous les personnages d'un même type partagent les mêmes inverses de liaison.
const CACHE_LIAISON = new Map();
export function liaison(type) {
  if (CACHE_LIAISON.has(type)) return CACHE_LIAISON.get(type);
  const { os, liste } = fabriquerOs(type); poserLiaison(os); os.corps.updateMatrixWorld(true);
  const monde = liste.map(b => b.matrixWorld.clone()), inverses = monde.map(m => m.clone().invert());
  const positions = Object.fromEntries(liste.map((b, i) => [b.name, new THREE.Vector3().setFromMatrixPosition(monde[i])]));
  const r = { monde, inverses, positions }; CACHE_LIAISON.set(type, r); return r;
}
// Position d'une articulation en pose de liaison (celle du maillage) : THREE.Vector3
export function articulationLiaison(type, nom) { return liaison(type).positions[nom].clone(); }

// Squelette three.js prêt à l'emploi pour un nouveau personnage (os en pose zéro, inverses de liaison partagées).
export function squelette(type) {
  const r = fabriquerOs(type), L = liaison(type);
  r.skeleton = new THREE.Skeleton(r.liste, L.inverses);
  return r;
}
