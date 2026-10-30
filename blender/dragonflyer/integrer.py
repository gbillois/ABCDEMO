# Intègre le dragon et le héros à pied (GLB compressés) et le relief (WebP sans perte) dans dragonflyer/index.html,
# en base64, pour que le jeu reste un seul fichier qui s'ouvre sans serveur.
# Lancer : python3 integrer.py <dragon.glb> <pieton.glb> <relief.webp> [dragonflyer/index.html]
import base64, re, sys, os

glb, pieton, relief = sys.argv[1], sys.argv[2], sys.argv[3]
page = sys.argv[4] if len(sys.argv) > 4 else os.path.join(os.path.dirname(__file__), "..", "..", "dragonflyer", "index.html")
html = open(page, encoding="utf-8").read()
for ident, fichier in (("data-dragon", glb), ("data-pieton", pieton), ("data-relief", relief)):
    b64 = base64.b64encode(open(fichier, "rb").read()).decode()
    lignes = "\n".join(b64[i:i + 4000] for i in range(0, len(b64), 4000))
    motif = re.compile(r'(<script type="application/octet-stream" id="%s">)(.*?)(</script>)' % ident, re.S)
    assert motif.search(html), ident
    html = motif.sub(lambda m: m.group(1) + "\n" + lignes + "\n" + m.group(3), html, count=1)
open(page, "w", encoding="utf-8").write(html)
print(page, os.path.getsize(page) // 1024, "Ko")
