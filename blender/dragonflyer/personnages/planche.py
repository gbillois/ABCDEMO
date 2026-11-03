# Assemble des rendus en une planche de contrôle (python3 + PIL, hors Blender).
# python3 planche.py <manifeste.json> <sortie.png>
# manifeste : {"titre": "...", "colonnes": 4, "cases": [{"image": "chemin.png", "legende": "..."}, ...]}
import json, sys
from PIL import Image, ImageDraw, ImageFont

def police(t):
    for f in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        try: return ImageFont.truetype(f, t)
        except OSError: pass
    return ImageFont.load_default()

m = json.load(open(sys.argv[1])); cases = m["cases"]; nc = m.get("colonnes", 4)
ims = [Image.open(c["image"]).convert("RGB") for c in cases]
w, h = ims[0].size; bande = 26; haut = 40; nl = (len(ims) + nc - 1) // nc
P = Image.new("RGB", (nc * w, haut + nl * (h + bande)), (246, 240, 228)); d = ImageDraw.Draw(P)
d.text((10, 8), m["titre"], fill=(60, 40, 25), font=police(22))
for k, (im, c) in enumerate(zip(ims, cases)):
    x, y = (k % nc) * w, haut + (k // nc) * (h + bande)
    P.paste(im, (x, y + bande)); d.text((x + 6, y + 4), f"{k + 1}. {c['legende']}", fill=(60, 40, 25), font=police(15))
    d.rectangle([x, y, x + w - 1, y + h + bande - 1], outline=(200, 185, 160))
P.save(sys.argv[2]); print(sys.argv[2], P.size)
