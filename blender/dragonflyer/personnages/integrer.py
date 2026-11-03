# Met le héros à pied (pieton.glb compressé meshopt) dans dragonflyer/index.html (bloc data-pieton), sans toucher au
# dragon ni au relief (contrairement à ../integrer.py qui remplace les trois).
# Lancer : python3 integrer.py <pieton_opt.glb> [dragonflyer/index.html]
#   (avant : blender -b -P heros.py -- sortie/ ; gltf-transform meshopt sortie/pieton.glb sortie/pieton_opt.glb)
import base64, os, re, sys
glb = sys.argv[1]
page = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "dragonflyer", "index.html")
html = open(page, encoding="utf-8").read()
b64 = base64.b64encode(open(glb, "rb").read()).decode()
lignes = "\n".join(b64[i:i + 4000] for i in range(0, len(b64), 4000))
motif = re.compile(r'(<script type="application/octet-stream" id="data-pieton">)(.*?)(</script>)', re.S)
assert len(motif.findall(html)) == 1, "bloc data-pieton introuvable"
html = motif.sub(lambda m: m.group(1) + "\n" + lignes + "\n" + m.group(3), html, count=1)
open(page, "w", encoding="utf-8").write(html)
print(page, os.path.getsize(page) // 1024, "Ko")
