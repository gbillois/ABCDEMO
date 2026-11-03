# Le Domaine des Pins : fabrique les fichiers du jeu à partir des modèles validés (sans rendus de contrôle).
#   blender -b -P blender/pins/exporter.py -- pins/assets
#   puis : gltf-transform meshopt <dossier>/cottage_brut.glb pins/assets/cottage.glb   (le script le fait s'il trouve gltf-transform)
import sys, os, subprocess, shutil; sys.path[:0] = [os.path.dirname(os.path.abspath(__file__)), os.path.join(os.path.dirname(os.path.abspath(__file__)), "batiments")]
import bpy
from apercu import nettoyer_depart, cuire_occlusion, exporter, sortie
import cottage

dossier = sortie()
nettoyer_depart()
R, E, T, D, VR, VE, toit, JE, JT = cottage.construire()
props = {"porte": list(cottage.PORTE), "haut_rdc": cottage.Z_RDC, "haut_etage": cottage.Z_ETAGE}
objs = [R.objet(props), E.objet(), T.objet(lieu=(0, 0, cottage.Z_ETAGE)), D.objet(), VR.objet(), VE.objet()]
cuire_occlusion(objs[:4] + [JE.objet(), JT.objet(lieu=(0, 0, cottage.Z_ETAGE))])
brut = os.path.join(dossier, "cottage_brut.glb"); exporter(objs, brut)
gt = shutil.which("gltf-transform")
if gt:
    subprocess.run([gt, "meshopt", brut, os.path.join(dossier, "cottage.glb")], check=True); os.remove(brut)
    print("cottage.glb :", os.path.getsize(os.path.join(dossier, "cottage.glb")) // 1024, "Ko")
