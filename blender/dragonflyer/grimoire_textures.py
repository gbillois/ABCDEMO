# Textures du grimoire, raccordables : parchemin (fibres, taches) et cuir grainé (relief éclairé).
import sys, numpy as np
from PIL import Image
out = sys.argv[1]; rng = np.random.default_rng(7)
def bruit(n, f0, f1, p=1.0):
    F = np.fft.fftfreq(n)[:, None] ** 2 + np.fft.fftfreq(n)[None, :] ** 2; r = np.sqrt(F) * n
    filt = ((r >= f0) & (r <= f1)) / np.maximum(r, 1) ** p
    z = np.real(np.fft.ifft2(np.fft.fft2(rng.standard_normal((n, n))) * filt)); return (z - z.mean()) / z.std()
def ani(n, fx, fy):   # bruit étiré (fibres)
    kx, ky = np.fft.fftfreq(n)[None, :] * n, np.fft.fftfreq(n)[:, None] * n
    filt = np.exp(-(kx / fx) ** 2 - (ky / fy) ** 2)
    z = np.real(np.fft.ifft2(np.fft.fft2(rng.standard_normal((n, n))) * filt)); return (z - z.mean()) / z.std()
N = 512
v = .55 * bruit(N, 1, 6, .5) + .3 * bruit(N, 6, 40, .8) + .12 * bruit(N, 40, 256, .3) + .14 * ani(N, 90, 6) + .08 * ani(N, 5, 70)
b_ = bruit(N, 2, 10, 1); tache = np.clip((b_ - 1.0) / 1.6, 0, 1) ** 1.5 * .35
c1, c2, c3 = np.array([250, 242, 220]), np.array([233, 214, 172]), np.array([196, 160, 104])
t = np.clip(.4 + .16 * v + tache, 0, 1)[..., None]
col = np.where(t < .5, c1 + (c2 - c1) * (t / .5), c2 + (c3 - c2) * ((t - .5) / .5))
Image.fromarray(col.astype(np.uint8)).save(f"{out}/ui-parchemin.webp", quality=82)
# cuir : grain (petites bosses) + plis, éclairé par le gradient
M = 384
g = .6 * bruit(M, 30, 80, .2) + .25 * bruit(M, 80, 192, .1) + .25 * bruit(M, 2, 12, 1) + .25 * ani(M, 40, 6)
gx = (np.roll(g, -1, 1) - np.roll(g, 1, 1)); gy = (np.roll(g, -1, 0) - np.roll(g, 1, 0))
lum = np.clip(.62 + .3 * (-gx * .7 - gy * .7) / 1.2 + .03 * bruit(M, 1, 5, 1), 0, 1)[..., None]
base = np.array([92, 52, 26]) * (1 + .06 * bruit(M, 2, 8, 1))[..., None]
cuir = np.clip(base * lum * 1.45, 0, 255)
Image.fromarray(cuir.astype(np.uint8)).save(f"{out}/ui-cuir.webp", quality=82)
