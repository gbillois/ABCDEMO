// scenarios.js — les scènes du labo. Chaque scène renvoie une liste d'acteurs :
//   { nom, look: [13 numéros comme dans le créateur] + sexe, ou o: {options de person()},
//     tenue: id de maillot (SUITS) ou null, lunettes: 1..5, bain: { bonnet: couleur, lunettes: couleur },
//     anim: { mode, t, v, apres(g) }, x, z, ry, rx }
// look = [peau, couleur des cheveux, coupe, yeux, visage, taille, accessoire, couleur de l'accessoire,
//         couleur du haut, couleur du bas, chaussures, sorte de haut, sorte de bas]
const rang = (l, dx = 1.0) => l.map((a, i) => ({ x: (i - (l.length - 1) / 2) * dx, ...a }));

// Photo 1 (enfants au bord du lac) et les deux autres enfants de la capture du jeu
const HABITS = [
  { nom: "Garçon rayé", sexe: "g", look: [1, 2, 0, 0, 1, 2, 0, 0, 13, 2, 1, 1, 1] },
  { nom: "Garçon roux", sexe: "g", look: [0, 6, 0, 3, 1, 1, 0, 0, 2, 3, 1, 0, 1] },
  { nom: "Fille au sweat", sexe: "f", look: [1, 4, 1, 0, 1, 1, 0, 0, 12, 10, 1, 3, 2] },
  { nom: "Fille bouclée", sexe: "f", look: [2, 1, 8, 0, 1, 0, 0, 0, 10, 4, 6, 2, 3] },
  { nom: "Fille aux lunettes", sexe: "f", look: [1, 4, 1, 1, 1, 1, 8, 0, 8, 2, 1, 4, 0] },
  { nom: "Garçon bleu", sexe: "g", look: [2, 1, 0, 0, 1, 1, 0, 0, 5, 2, 2, 0, 0] },
];
// Photo 3 (à la piscine) : maillots, bonnets et lunettes de natation
const PISCINE = [
  { nom: "Fille bonnet rouge", sexe: "f", look: [1, 4, 2, 1, 1, 2, 0, 0, 4, 1, 1, 0, 0], tenue: "palmiers", bain: { bonnet: 0xe8534a, lunettes: 0x2e86de } },
  { nom: "Garçon roux", sexe: "g", look: [0, 6, 0, 3, 1, 1, 0, 0, 2, 3, 1, 0, 1], tenue: "palmiers", bain: { lunettes: 0x2e6fd8 } },
  { nom: "Fille bonnet noir", sexe: "f", look: [0, 2, 1, 3, 1, 2, 0, 0, 10, 1, 1, 0, 0], tenue: "raye", bain: { bonnet: 0x1b1b1b, lunettes: 0xf06292 } },
  { nom: "Petite fille", sexe: "f", look: [1, 1, 8, 0, 1, 0, 0, 0, 5, 1, 1, 0, 0], tenue: "rouge" },
  { nom: "Fille bonnet rose", sexe: "f", look: [1, 1, 1, 0, 1, 0, 0, 0, 7, 1, 1, 0, 0], tenue: "or", bain: { bonnet: 0xd81b60 } },
  { nom: "Petit garçon", sexe: "g", look: [0, 2, 7, 1, 1, 0, 0, 0, 5, 1, 1, 0, 0], tenue: "arcenciel", bain: { bonnet: 0x22304a, lunettes: 0x29b6f6 } },
  { nom: "Combinaison", sexe: "g", look: [2, 1, 0, 0, 1, 1, 0, 0, 5, 1, 1, 0, 0], tenue: "surf" },
];
// Photo 4 (la grand-mère et les enfants devant le mur d'escalade) et des adultes du jeu
const ADULTES = [
  { nom: "Grand-mère", o: { long: true, adulte: true, scale: .72, coiffure: 7, hair: 0xe4e4e2, skin: 0xf1c6a0, shirt: 0xa9e3ea, pants: 0x1f2a44, shoe: 0x9aa0a6, eyes: 0x5b5b6b }, lunettes: 1 },
  { nom: "Garçon roux", sexe: "g", look: [0, 6, 0, 3, 1, 1, 0, 0, 0, 0, 0, 2, 0] },
  { nom: "Fille aux lunettes", sexe: "f", look: [1, 4, 2, 1, 1, 2, 8, 0, 8, 2, 6, 4, 0] },
  { nom: "Garçon bleu", sexe: "g", look: [2, 1, 0, 0, 1, 1, 0, 0, 5, 2, 2, 2, 0] },
  { nom: "Fille au chignon", sexe: "f", look: [2, 1, 6, 0, 1, 0, 0, 0, 8, 2, 1, 2, 0] },
  { nom: "Marco", o: { shirt: 0xff5a4e, hair: 0xd4a017, skin: 0xd9a27a } },
  { nom: "Sophie", o: { shirt: 0x16a085, hair: 0x222222, long: true } },
  { nom: "Gérard", o: { shirt: 0x2e5e8c, pants: 0x3b5998, hair: 0x9a9a9a, cap: 0x6d4c2a, skin: 0xe0ac85 } },
  { nom: "Inès", o: { shirt: 0x27ae60, pants: 0x2d3436, hair: 0x2d2018, long: true, skin: 0x8d5a3b } },
];
const MODES = ["idle", "walk", "swim", "tread", "climb", "pedal", "ride", "bike", "kart", "saddle", "sit", "buoy"];

export const SCENES = {
  habits: () => rang(HABITS, .62),
  piscine: () => rang(PISCINE, .62),
  adultes: () => rang(ADULTES, .7),
  // les 9 coiffures, fille devant puis garçon
  coiffures: Q => rang([...Array(9)].map((_, c) => ({ nom: "coupe " + c, sexe: Q.get("sexe") || "f", look: [1, Number(Q.get("cheveux") || 3), c, 0, 1, 1, 0, 0, 8, 2, 1, 0, 0] })), .55),
  // les sortes de hauts × les sortes de bas
  tenues: () => rang([...Array(5)].flatMap((_, h) => [0, 1, 2, 3].map(b => ({ nom: `haut ${h} bas ${b}`, sexe: (h + b) % 2 ? "f" : "g", look: [h % 8, 2, (h + b) % 2 ? 1 : 0, 0, 1, 1, 0, 0, [5, 13, 10, 12, 8][h], [2, 2, 10, 4][b], 1, h, b] }))), .5),
  maillots: Q => rang(["rouge", "raye", "palmiers", "requin", "arcenciel", "surf", "or"].flatMap((id, i) => ["g", "f"].map(sx => ({ nom: id + " " + sx, sexe: sx, look: [i % 8, 2, sx === "f" ? 1 : 0, 0, 1, 1, 0, 0, 5, 1, 1, 0, 0], tenue: id }))), .5),
  // visages : différentes peaux, yeux, cheveux, lunettes (à voir avec &vue=visage)
  visages: () => rang([[0, 6, 0, 1, 1, 1, 0], [1, 2, 1, 0, 1, 1, 1], [3, 1, 5, 3, 1, 1, 0], [5, 0, 3, 0, 1, 1, 2], [7, 0, 7, 0, 1, 1, 0], [2, 7, 2, 2, 1, 1, 3]].map((l, i) => ({ nom: "visage " + i, sexe: i % 2 ? "f" : "g", look: [...l, 0, 8, 2, 1, 0, 0] })), .42),
  // une seule personne, d'après ?look=1,2,0,…&sexe=g&tenue=rouge&mode=walk&t=0&vit=1.3
  un: Q => [{ nom: "un", sexe: Q.get("sexe") || "g", look: (Q.get("look") || "1,2,0,0,1,1,0,0,5,2,1,0,0").split(",").map(Number), tenue: Q.get("tenue") || undefined, anim: { mode: Q.get("mode") || "idle", t: Number(Q.get("t") || 0), v: Q.get("vit") ? Number(Q.get("vit")) : undefined } }],
  // n images d'un cycle d'animation (de profil par défaut : &vue=profil), pour ?mode=walk&vit=1.3&n=8
  anim: Q => { const n = Number(Q.get("n") || 8), mode = Q.get("mode") || "walk", v = Q.get("vit") ? Number(Q.get("vit")) : undefined, per = Number(Q.get("periode") || Math.PI * 2);
    return [...Array(n)].map((_, i) => ({ nom: mode + " " + i, sexe: Q.get("sexe") || "g", look: (Q.get("look") || "1,2,0,0,1,1,0,0,5,2,1,0,1").split(",").map(Number), tenue: Q.get("tenue") || undefined, x: i * .75, anim: { mode, t: i / n * per + Number(Q.get("t") || 0), v } })); },
  // un personnage dans chaque mode du jeu
  modes: Q => rang(MODES.map(m => ({ nom: m, sexe: Q.get("sexe") || "g", look: [1, 2, 0, 0, 1, 1, 0, 0, 5, 2, 1, 0, 0], tenue: ["swim", "tread", "climb", "ride", "buoy"].includes(m) ? "rouge" : undefined, anim: { mode: m, t: .7 } })), .9),
  // la foule (version légère) : baigneurs et promeneurs
  foule: () => rang([...Array(10)].map((_, i) => ({ nom: "foule " + i, o: { lite: true, long: i % 2 === 1, shirt: [0xe74c3c, 0x9b59b6, 0x27ae60, 0xf1c40f, 0x2e86de][i % 5], pants: 0x34495e, shorts: i % 3 > 0, skin: [0xf1c6a0, 0xe0ac85, 0xc68e6a, 0x8d5a3b, 0xf5d0b5, 0x6b4430][i % 6], hair: [0x2d2018, 0x5a3a22, 0xd4a017, 0x8b4513, 0x111111][i % 5], scale: i < 5 ? .55 : .74, seed: 100 + i }, tenue: i >= 5 && i % 2 ? "raye" : undefined })), .7),
};
