# Transforme le rendu Blender en gravure à l'encre brune (traits + hachures), fond transparent.
import sys, numpy as np
from PIL import Image
src, dst, W = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src).convert("RGBA"); im = im.crop(im.getbbox())
im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
a = np.asarray(im).astype(np.float32) / 255
lum, al = a[..., :3].mean(-1), a[..., 3]
y, x = np.mgrid[:lum.shape[0], :lum.shape[1]]
trait = np.clip((0.32 - lum) / 0.22, 0, 1)                # lignes Freestyle
ombre = np.clip((0.78 - lum) / 0.45, 0, 1)               # zones sombres
h1 = (((x + y) % 4) < 1.2).astype(np.float32)           # hachures
h2 = (((x - y) % 4) < 1.2).astype(np.float32)           # contre-hachures
hach = np.clip(h1 * np.clip(ombre * 1.6, 0, 1) + h2 * np.clip(ombre * 2 - 1, 0, 1), 0, 1) * .75
encre = np.clip(np.maximum(trait, hach), 0, 1) * al
# léger lavis de sépia pour donner du volume
lavis = al * (.12 + .22 * ombre)
alpha = np.clip(encre + lavis * (1 - encre), 0, 1)
col = np.zeros(a.shape, np.float32)
t = encre / np.maximum(alpha, 1e-3)
for i, (c1, c2) in enumerate(zip((74, 42, 16), (160, 112, 60))): col[..., i] = (c1 * t + c2 * (1 - t)) / 255
col[..., 3] = alpha
Image.fromarray((col * 255).astype(np.uint8)).save(dst, lossless=False, quality=88)
print(Image.open(dst).size)
