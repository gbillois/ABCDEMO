// jeu.js — imitation des outils du jeu (pins/index.html) dont le personnage a besoin.
// À l'intégration, ces noms existent déjà dans le script du jeu : ce fichier n'est PAS recopié.
import * as THREE from "three";
export { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
export const LOWQ = /lowq/.test(location.search); // ?lowq imite une tablette / un téléphone
export function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export let seed = 11; export const rnd = () => (seed = (seed * 16807) % 2147483647, (seed - 1) / 2147483646);
export const mat = (c, r = 0.8, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r }, extra));
export function indexe(g) { if (!g.index) { const n = g.attributes.position.count, a = n > 65535 ? new Uint32Array(n) : new Uint16Array(n); for (let i = 0; i < n; i++) a[i] = i; g.setIndex(new THREE.BufferAttribute(a, 1)); } return g; }
export const SUITS = [
  { id: "rouge", name: "Short de bain rouge", price: 0, a: "#e74c3c" },
  { id: "raye", name: "Short rayé marin", price: 450, a: "#1f4e8c", b: "#ffffff", k: "stripes" },
  { id: "palmiers", name: "Short palmiers", price: 600, a: "#16a085", b: "#ffd23f", k: "dots" },
  { id: "requin", name: "Short requin", price: 850, a: "#5d6d7e", b: "#ffffff", k: "teeth" },
  { id: "arcenciel", name: "Short arc-en-ciel", price: 1200, k: "rainbow" },
  { id: "surf", name: "Combinaison de surf", price: 1800, a: "#17202a", b: "#00b894", k: "stripes", full: true },
  { id: "or", name: "Short en or", price: 2900, a: "#d4a017", b: "#ffe680", k: "dots", gold: true },
];
export function suitCanvas(su, W = 128, H = 128) {
  const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
  if (su.k === "rainbow") ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6"].forEach((col, i) => { x.fillStyle = col; x.fillRect(0, i * H / 6, W, H / 6 + 1); });
  else { x.fillStyle = su.a; x.fillRect(0, 0, W, H); x.fillStyle = su.b || su.a;
    if (su.k === "stripes") for (let i = 0; i < 8; i += 2) x.fillRect(0, i * H / 8, W, H / 16);
    if (su.k === "dots") for (let i = 0; i < 18; i++) { x.beginPath(); x.arc((i * 37) % W, (i * 53) % H, 6 + (i % 3) * 2, 0, 7); x.fill(); }
    if (su.k === "teeth") for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(i * W / 8, H * .55); x.lineTo(i * W / 8 + W / 16, H * .75); x.lineTo((i + 1) * W / 8, H * .55); x.fill(); } }
  return c;
}
export const suitTexCache = {};
export function suitTex(su) { if (!suitTexCache[su.id]) { const t = new THREE.CanvasTexture(suitCanvas(su)); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; suitTexCache[su.id] = t; } return suitTexCache[su.id]; }
export const GLASSES = [null, ["Lunettes rouges", 0xd62d20, 0xcfeefa], ["Lunettes bleues", 0x2e6fd8, 0xcfeefa], ["Lunettes de soleil", 0x1b1b1b, 0x1b1b1b], ["Lunettes en or", 0xd4af37, 0xfff2c0], ["Lunettes roses", 0xf2b8c6, 0xf6e9ee]];
export const PEAUX = [0xf6d6c0, 0xf1c6a0, 0xe0ac85, 0xc68e6a, 0xa86f4c, 0x8d5a3b, 0x6b4430, 0x4a2f22];
export const CHEVEUX = [0x111111, 0x2d2018, 0x5a3a22, 0x8b4513, 0xa67b4f, 0xa8693d, 0xb5651d, 0xd4a017, 0xe8d2a0, 0xc0392b, 0x8e44ad, 0x2e86de];
export const COUPES = ["Courts", "Longs", "Queue de cheval", "Couettes", "Carré", "Bouclés", "Chignon", "Très courts", "Mi-longs bouclés"];
export const YEUX = [0x6b4424, 0x3a78b5, 0x4f8a3a, 0x8a5a2b, 0x5b5b6b, 0x8e44ad];
export const TETES = [.92, 1, 1.1], TAILLES = [.56, .6, .64], TROIS = ["Petit", "Moyen", "Grand"];
export const ACCS = ["Rien", "Lunettes rouges", "Lunettes bleues", "Lunettes de soleil", "Lunettes en or", "Casquette", "Nœud", "Bandeau", "Lunettes roses"];
export const COULS = [0xff5a4e, 0xff8a2b, 0xffc93c, 0x27ae60, 0x16a085, 0x2e86de, 0x8e44ad, 0xe84393, 0xffffff, 0x34495e, 0x2d3436, 0xf78fb3, 0xc4c7cc, 0x5f8f6a];
export const HAUTS = ["T-shirt", "T-shirt rayé", "T-shirt imprimé", "Sweat à capuche", "T-shirt arc-en-ciel"], BAS = ["Short", "Pantalon", "Legging à cerises", "Jean"];
export const ACC_COULS = COULS.slice(0, 8), TSHIRTS = COULS, SHORTS = [0xf39c12, 0x3a4a63, 0x1f2a44, 0x7b1e2b, 0x3b5b8c, 0x2d3436, 0x6c5ce7, 0x1f9e8f, 0xe84393, 0xffffff, 0xc0392b, 0x7f8c99], CHAUSS = [0xff5a4e, 0xffffff, 0x2d3436, 0x2e86de, 0xffc93c, 0x27ae60, 0xe84393, 0x8b4513];
// ordre des choix : peau, couleur des cheveux, coupe, yeux, visage, taille, accessoire, couleur de l'accessoire,
// couleur du haut, couleur du bas, chaussures, sorte de haut, sorte de bas
export const LOOK_MAX = [8, 12, 9, 6, 3, 3, 9, 8, 14, 12, 8, 5, 4];
export const lookValide = l => Array.isArray(l) && l.length === LOOK_MAX.length && l.every((v, i) => Number.isInteger(v) && v >= 0 && v < LOOK_MAX[i]);
export function optsDePerso(p, extra = {}) {
  const l = p.look, a = l[6];
  return { long: p.sexe === "f", skin: PEAUX[l[0]], hair: CHEVEUX[l[1]], coiffure: l[2], eyes: YEUX[l[3]], tete: TETES[l[4]], scale: TAILLES[l[5]],
    acc: a === 5 ? "casquette" : a === 6 ? "noeud" : a === 7 ? "bandeau" : null, accCol: ACC_COULS[l[7]], shirt: TSHIRTS[l[8]], pants: SHORTS[l[9]], shoe: CHAUSS[l[10]], lunettes: a >= 1 && a <= 4 ? a : a === 8 ? 5 : 0,
    shorts: l[12] === 0, motifHaut: [null, "rayures", "etoiles", null, "arcenciel"][l[11]], manches: l[11] === 3, capuche: l[11] === 3, motifBas: [null, null, "cerises", "jean"][l[12]], ...extra };
}
