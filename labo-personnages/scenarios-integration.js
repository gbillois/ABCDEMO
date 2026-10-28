// scènes de l'orchestrateur : vérifications du squelette
import * as THREE from "three";
import { squelette, TYPES, NOMS_OS, poserLiaison } from "./perso/squelette.js";
export const SCENES = {
  // les 4 squelettes en pose zéro (et en pose A si &liaison), avec des billes aux articulations, à côté de l'ancien personnage
  os: Q => ({ custom: async ({ THREE }) => {
    const out = [], A = await import("./ancien/ancien.js");
    ["garcon", "fille", "femme", "homme"].forEach((ty, i) => {
      const { os, liste } = squelette(ty); if (Q.get("liaison")) poserLiaison(os);
      const g = new THREE.Group(); g.add(os.corps); g.scale.setScalar(ty.length > 5 || ty === "femme" || ty === "homme" ? .76 : .6); g.position.x = i * .7 - .7; g.updateMatrixWorld(true);
      const m = new THREE.MeshStandardMaterial({ color: 0xc0392b }), lm = new THREE.LineBasicMaterial({ color: 0x1b2631 });
      for (const b of liste) { const s = new THREE.Mesh(new THREE.SphereGeometry(.025, 10, 8), m); b.add(s);
        if (b.parent && b.parent.isBone) { const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), b.position.clone().negate()]); b.add(new THREE.Line(geo, lm)); } }
      const h = new THREE.Mesh(new THREE.BoxGeometry(.02, TYPES[ty].H, .02), new THREE.MeshStandardMaterial({ color: 0x2e86de })); h.position.set(.32, TYPES[ty].H / 2, 0); g.add(h);
      out.push({ g });
    });
    const old = A.person({ shirt: 0x2e86de, pants: 0xf39c12, shorts: true, scale: .6 }); old.position.x = -1.4; out.push({ g: old });
    return out; } }),
};
