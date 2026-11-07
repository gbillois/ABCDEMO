import{Ao as e,Do as t,Eo as n,Fi as r,Oo as i,Ui as a,Wi as o,Xa as s,bi as c,co as l,ma as u,vo as d}from"./LevelStorage-C_bJYT5y.js";import{t as f}from"./GlobalUniforms-Hkw9cp0_.js";import{Ft as p,It as m,Lt as h}from"./WeatherLook-ChxdG-yb.js";import{n as g,r as _,t as v}from"./Sheen-D8KqxQI8.js";var y=`
float bnShare(float a) {
  return clamp((a - 1.0) * ${(1/4).toFixed(6)}, 0.0, 1.0) * (1.0 - smoothstep(6.5, 8.0, a));
}
float bnGold(float a) {
  return bnShare(a) * smoothstep(2.05, 2.3, a);
}
`,b=`
uniform highp sampler2D tColor;
uniform vec2 uRes;
varying vec2 vUv;
${y}
void main() {
  ivec2 b = ivec2(gl_FragCoord.xy) * 2;
  ivec2 hi = ivec2(uRes) - 1;
  float k = 0.0;
  for (int j = 0; j < 2; j++) {
    for (int i = 0; i < 2; i++) {
      vec4 c = texelFetch(tColor, min(b + ivec2(i, j), hi), 0);
      // (a warm pixel only — red over 1.25 × blue, linear: the gold, its glints and its edges on the marble —, so
      // no other pile of alphas keys: a fall over a pool, additive glows stacked over the sky, the clouds, the rock)
      if (c.r > 1.25 * c.b) k += bnGold(c.a);
    }
  }
  gl_FragColor = vec4(k * ${(1/4).toFixed(6)}, 0.0, 0.0, 1.0);
}
`,x=`
uniform sampler2D tKey;
uniform vec2 uSize;
uniform vec2 uDir;
uniform vec3 uW;   // the kernel's weights at 0, ±1, ±2 (key px), summing to 1
varying vec2 vUv;
float bnTap(ivec2 q) { return texelFetch(tKey, clamp(q, ivec2(0), ivec2(uSize) - 1), 0).r; }
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  ivec2 d = ivec2(uDir);
  float k = uW.x * bnTap(p) + uW.y * (bnTap(p - d) + bnTap(p + d)) + uW.z * (bnTap(p - 2 * d) + bnTap(p + 2 * d));
  gl_FragColor = vec4(k, 0.0, 0.0, 1.0);
}
`;function S(t,n){return new e(t,n,{type:d,format:s,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1,minFilter:r,magFilter:r})}function C(e,t,n){return new l({name:e,uniforms:n,vertexShader:p,fragmentShader:t,depthTest:!1,depthWrite:!1,blending:0,toneMapped:!1})}var w=class{constructor(e){this._key=C(`luminati:sky-bounce-key`,b,{tColor:{value:null},uRes:e.uRes}),this._blur=C(`luminati:sky-bounce-blur`,x,{tKey:{value:null},uSize:{value:new n(1,1)},uDir:{value:new n(1,0)},uW:{value:new t(1,0,0)}}),this._a=null,this._b=null,this._quad=new h(null),this._sigma=-1}setSize(e,t){let n=Math.max(1,Math.ceil(e/2)),r=Math.max(1,Math.ceil(t/2));for(let e of[`_a`,`_b`]){let t=this[e];t?(t.width!==n||t.height!==r)&&t.setSize(n,r):this[e]=S(n,r)}this._blur.uniforms.uSize.value.set(n,r)}get size(){return this._a?{width:this._a.width,height:this._a.height}:{width:1,height:1}}render(e,t,n){let{width:r,height:i}=t;if(this.setSize(r,i),n!==this._sigma){let e=Math.max(.05,n/2),t=Math.exp(-1/(2*e*e)),r=Math.exp(-4/(2*e*e)),i=1+2*(t+r);this._blur.uniforms.uW.value.set(1/i,t/i,r/i),this._sigma=n}let a=this._a,o=this._b;this._key.uniforms.tColor.value=t.texture,this._quad.material=this._key,e.setRenderTarget(a),this._quad.render(e);let s=this._blur.uniforms;return this._quad.material=this._blur,s.tKey.value=a.texture,s.uDir.value.set(1,0),e.setRenderTarget(o),this._quad.render(e),s.tKey.value=o.texture,s.uDir.value.set(0,1),e.setRenderTarget(a),this._quad.render(e),a.texture}warmup(e,t){this.render(e,t.sceneTarget,Math.max(.05,this._sigma))}release(){this._a?.dispose(),this._b?.dispose(),this._a=null,this._b=null}dispose(){this.release(),this._key.dispose(),this._blur.dispose()}},T=Object.freeze({steps:48,farStep:16,maxDistance:72,thickness:.45,thicknessStep:1.6,edgeFade:.06,endFade:.7,strength:2,steep:2.5,steepFrom:14,steepTo:26,darken:.4,snap:!0,debug:0,footprint:1,soft:.12,softMax:2.5,poolStrength:1,along:.5,across:.5,farTexel:3,steepWidth:2,crease:Object.freeze({strength:.2,r:2,to:1.5,jump:.4,far:Object.freeze([.05,.1]),coherence:.5}),upFacing:.7,bounce:Object.freeze({strength:.9,tint:Object.freeze([1,.78,.68]),gain:5,sigma:.75,sun:Object.freeze([.35,.75]),white:Object.freeze([.55,.85])})});function E(){let e=T;return{...e,crease:{...e.crease,far:[...e.crease.far]},bounce:{...e.bounce,tint:[...e.bounce.tint],sun:[...e.bounce.sun],white:[...e.bounce.white]}}}var D=180/Math.PI;function O(e,t,n){let r=Math.min(1,Math.max(0,(n-e)/Math.max(1e-6,t-e)));return r*r*(3-2*r)}var k=48,A=32,j=`
${m}
uniform highp sampler2D tColor;
uniform highp sampler2D tDepth;
uniform mat4 uViewProj;
uniform mat4 uInvViewProj;
uniform vec3 uCamPos;
uniform vec2 uRes;
uniform vec2 uClip;
varying vec2 vUv;

// the view depth (positive, in u) of a depth-buffer value
float frLinZ(float d) {
  float z = d * 2.0 - 1.0;
  return 2.0 * uClip.x * uClip.y / (uClip.y + uClip.x - z * (uClip.y - uClip.x));
}
// the world point of a screen position and depth-buffer value
vec3 frWorld(vec2 uv, float d) {
  vec4 w = uInvViewProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  return w.xyz / w.w;
}
ivec2 frPixel(vec2 uv) {
  return clamp(ivec2(uv * uRes), ivec2(0), ivec2(uRes) - 1);
}
// a floor's reflectivity, from the alpha it wrote (1 − k; 0 at 1 and over it: nothing, a glow, the gold's mark)
float frFloorK(float a) {
  return clamp(1.0 - a, 0.0, 1.0);
}
// how much of a pool a pixel is (the pools' mask lifts the water's alpha by ${A}; 0: none — a
// glow's alpha, the gold's mark (${5 .toFixed(0)}) and a glow over it never reach 9; less than
// 1: a transparent layer over the pool, or its edge)
float frPool(float a) {
  return clamp((a - ${9 .toFixed(1)}) / ${24 .toFixed(1)}, 0.0, 1.0);
}
`,M=`
${j}
uniform vec4 uMarch;   // steps (most), max distance (u), thickness (u), thickness per step length
uniform vec4 uFade;    // edge fade (share of the screen), end fade (share of the max distance), snap, the far step (½-res px; 0: always uMarch.x steps)
uniform vec4 uSoft;    // the hit's footprint: px per u of the ray, its most (px), × the texel's own size on screen; w the far floor's texel size (px)

// the largest t (≤ tMax) at which o + R·t is still inside the screen's four sides: clip space is
// linear along the ray, so each side is one inequality a + b·t ≤ 0 (a ≤ 0 at the start)
float frExit(vec4 c0, vec4 cd, float tMax) {
  float t = tMax;
  float b = cd.x - cd.w;
  if (b > 1e-6) t = min(t, (c0.w - c0.x) / b);
  b = -cd.x - cd.w;
  if (b > 1e-6) t = min(t, (c0.w + c0.x) / b);
  b = cd.y - cd.w;
  if (b > 1e-6) t = min(t, (c0.w - c0.y) / b);
  b = -cd.y - cd.w;
  if (b > 1e-6) t = min(t, (c0.w + c0.y) / b);
  return max(t, 0.0);
}

void main() {
  ivec2 hp = ivec2(gl_FragCoord.xy);
  ivec2 fp = min(hp * 2, ivec2(uRes) - 1);
  float a0 = texelFetch(tColor, fp, 0).a;
  float k = max(frFloorK(a0), frPool(a0));
  float d = texelFetch(tDepth, fp, 0).x;
  if (k < 0.004 || d >= 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, -1.0);
    return;
  }
  vec3 P = frWorld((vec2(fp) + 0.5) / uRes, d);
  // the floor under this ½-res pixel's centre (on the level plane through P): its texel is the one
  // whose centre the composite finds in this pixel
  vec2 uc = vec2(hp * 2 + 1) / uRes;
  vec3 n0 = frWorld(uc, 0.0);
  vec3 dv = frWorld(uc, 1.0) - n0;
  if (abs(dv.y) > 1e-4) {
    float s = (P.y - n0.y) / dv.y;
    if (s > 0.0 && s < 1.0) P.xz = n0.xz + dv.xz * s;
  }
  // one ray per floor texel (1/16 u), from its centre: the reflection holds still in the world — where
  // the texel is at least uSoft.w px on screen (its smaller side). A smaller one's ray leaves this
  // pixel's own point (the far floor, which the composite reads smoothly: a texel there is less than a
  // ½-res pixel high, so a ray per texel would leave texels without one and step as the camera moves)
  vec2 cell = floor(P.xz * 16.0);
  vec3 o = P;
  if (uFade.z > 0.5) {
    vec4 p0 = uViewProj * vec4(P, 1.0);
    vec4 p1 = uViewProj * vec4(P + vec3(0.0625, 0.0, 0.0), 1.0);
    vec4 p2 = uViewProj * vec4(P + vec3(0.0, 0.0, 0.0625), 1.0);
    vec2 q = p0.xy / p0.w;
    vec2 ts = max(abs(p1.xy / p1.w - q), abs(p2.xy / p2.w - q)) * uRes * 0.5;
    if (min(ts.x, ts.y) >= uSoft.w) o = vec3((cell.x + 0.5) / 16.0, P.y, (cell.y + 0.5) / 16.0);
  }
  vec3 V = normalize(o - uCamPos);
  vec3 R = vec3(V.x, -V.y, V.z);
  o.y += 0.02;
  vec4 c0 = uViewProj * vec4(o, 1.0);
  vec4 cd = uViewProj * vec4(R, 0.0);
  float tEnd = frExit(c0, cd, uMarch.y);
  float wEnd = c0.w + cd.w * tEnd;
  // the texel's size on screen (full-res px): its reflection is the average over as much of the hit
  vec4 cx = uViewProj * vec4(o + vec3(0.0625, 0.0, 0.0), 1.0);
  vec4 cz = uViewProj * vec4(o + vec3(0.0, 0.0, 0.0625), 1.0);
  vec2 q0 = c0.xy / c0.w;
  vec2 tpx = max(abs(cx.xy / cx.w - q0), abs(cz.xy / cz.w - q0)) * uRes * 0.5;
  // as many steps as the ray is long on screen: the last (the longest) about uFade.w ½-res px
  vec4 c1 = c0 + cd * tEnd;
  float len = length((c1.xy / c1.w - c0.xy / c0.w) * uRes) * 0.25;
  int steps = uFade.w > 0.0 ? int(clamp(ceil(2.0 * len / uFade.w), 8.0, uMarch.x)) : int(uMarch.x);
  float prevT = 0.0;
  bool front = true;
  float hitT = -1.0;
  vec2 hitUv = vec2(0.0);
  for (int i = 0; i < ${k}; i++) {
    if (i >= steps) break;
    // the steps are even in the square of the way across the screen (fine at the contact, where a
    // villager's reflection is, coarse far out): f, that share, as the ray's own t (perspective);
    // the same for every ray, so neighbouring texels find the same things (no jitter: no speckle)
    float f = (float(i) + 0.5) / float(steps);
    f *= f;
    float t = f * tEnd * c0.w / ((1.0 - f) * wEnd + f * c0.w) + 0.03;
    vec4 cq = c0 + cd * t;
    if (cq.w <= uClip.x) break;
    vec2 suv = cq.xy / cq.w * 0.5 + 0.5;
    ivec2 sp = frPixel(suv);
    float sd = texelFetch(tDepth, sp, 0).x;
    float sz = frLinZ(sd);
    float thick = max(uMarch.z, uMarch.w * (t - prevT));
    if (sd < 1.0 && cq.w - sz > 0.02) {
      // behind what the screen shows here. A surface at or under the ray's start is the floor seen
      // again (the resolved depth is one MSAA sample's, off the plane at grazing angles) or what lies
      // on it (the rune's lines): a rising ray never meets it
      vec3 S = frWorld(suv, sd);
      bool under = S.y < o.y + 0.04 || (texelFetch(tColor, sp, 0).a < 0.999 && abs(S.y - o.y) < 0.3);
      if (!under && S.y < o.y + 0.3) {
        // nor a flat thing lying on the floor (a rune circle's lift, a slab, a step's top): it faces up,
        // so the floor beside it would mirror only its edge — a thin bright outline round every glyph
        vec3 S0 = frWorld((vec2(sp) + 0.5) / uRes, sd);
        vec3 Sx = frWorld((vec2(sp) + vec2(1.5, 0.5)) / uRes, texelFetch(tDepth, frPixel((vec2(sp) + vec2(1.5, 0.5)) / uRes), 0).x);
        vec3 Sy = frWorld((vec2(sp) + vec2(0.5, 1.5)) / uRes, texelFetch(tDepth, frPixel((vec2(sp) + vec2(0.5, 1.5)) / uRes), 0).x);
        vec3 nrm = cross(Sx - S0, Sy - S0);
        under = abs(nrm.y) > 0.9 * length(nrm);
      }
      if (!under) {
        if (front) {
          // the ray crossed a surface since the last step: bisect to it; it is the surface's if the
          // ray is just behind it there (a ray passing behind a thin thing ends on its outline, far
          // behind it: no hit, the ray goes on)
          float a = prevT;
          float b = t;
          for (int r = 0; r < 5; r++) {
            float m = 0.5 * (a + b);
            vec4 cm = c0 + cd * m;
            float mz = frLinZ(texelFetch(tDepth, frPixel(cm.xy / cm.w * 0.5 + 0.5), 0).x);
            if (cm.w - mz > 0.02) b = m;
            else a = m;
          }
          vec4 cb = c0 + cd * b;
          vec2 bu = cb.xy / cb.w * 0.5 + 0.5;
          if (cb.w - frLinZ(texelFetch(tDepth, frPixel(bu), 0).x) < thick) {
            hitUv = bu;
            hitT = b;
            break;
          }
        } else if (cq.w - sz < thick) {
          // behind a thin thing at the last step and now just behind another surface: the ray met
          // that one since (the wall behind a villager it passed)
          hitUv = suv;
          hitT = t;
          break;
        }
        front = false;
      }
    } else front = true;
    prevT = t;
  }
  vec3 hit = vec3(0.0);
  float w = 0.0;
  if (hitT >= 0.0) {
    // the hit's colour, averaged over what the texel sees of it: four bilinear taps round the hit,
    // as far apart as the texel is large on screen — at least this ½-res pixel's 2 px, on the far
    // floor — (× uSoft.z) or as the ray's own blur (uSoft.x px per u of the ray, at most uSoft.y):
    // the floor texel stays one crisp block, and its colour no longer flickers between the reflected
    // image's pixels as the camera moves
    vec2 fr = max(max(tpx, vec2(2.0)) * uSoft.z, vec2(min(hitT * uSoft.x, uSoft.y))) * 0.5 / uRes;
    hit = pfxSafe(texture2D(tColor, hitUv + vec2(-fr.x, -fr.y)).rgb)
      + pfxSafe(texture2D(tColor, hitUv + vec2(fr.x, -fr.y)).rgb)
      + pfxSafe(texture2D(tColor, hitUv + vec2(-fr.x, fr.y)).rgb)
      + pfxSafe(texture2D(tColor, hitUv + vec2(fr.x, fr.y)).rgb);
    hit = min(hit * 0.25, vec3(4.0));
    vec2 e = min(hitUv, 1.0 - hitUv);
    w = smoothstep(0.0, uFade.x, min(e.x, e.y)) * (1.0 - smoothstep(uFade.y * uMarch.y, uMarch.y, hitT));
  }
  gl_FragColor = vec4(hit, w);
}
`,N=`
${j}
${v}

uniform vec4 uCity;
uniform vec2 uCityY;
// 1 inside the city's box, fading out over 2 u past its sides and uCityY.y under its floor
float frCity(vec3 w) {
  vec2 lo = smoothstep(uCity.xz - 2.0, uCity.xz, w.xz);
  vec2 hi = 1.0 - smoothstep(uCity.yw, uCity.yw + 2.0, w.xz);
  return lo.x * lo.y * hi.x * hi.y * smoothstep(uCityY.x - uCityY.y, uCityY.x, w.y);
}

#if FR_BOUNCE
${y}
uniform sampler2D tBounce;
uniform vec2 uBnSize;   // the bounce key's size
uniform vec2 uBounce;   // strength, gain (× the blurred key)
uniform vec3 uBnTint;   // the warm factor at full strength
#endif
#if FR_CREASE
uniform vec4 uCrease;    // strength, r (full-res px), the change of slope for the full crease (× r × a pixel's world size), the silhouette jump (u)
uniform vec3 uCreaseFar; // a pixel's world size (u) where the crease starts to fade, and where it is gone; the coherence
uniform float uP00;      // the projection's x scale: a pixel's world size at a depth
// the crease at a pixel of view depth z (0 … 1): 1/z is linear in screen space on a plane, so its second
// difference across the pixel, taken on the OUTER taps (±r … ±2r: each on its own face), is 0 on a plane and
// on a step (a decal, the rune's strokes: the same slope either side), > 0 in a concave junction (a ∨ in
// depth), < 0 on a convex arris. A direction whose taps leave the frame counts for nothing, one whose taps
// jump over half the silhouette's step fades out by it, and one reading a convex arris sharper than the
// coherence drops the crease (depth noise: foliage, thin posts). (No early return: HLSL's X4000.)
float frCrease(ivec2 fp, float z) {
  int r = int(uCrease.y);
  ivec2 lim = ivec2(uRes) - 1;
  float pxu = 2.0 * z / (uP00 * uRes.x);
  float nrm = max(uCrease.z * pxu * float(r), 1e-4);
  float cs = 0.0, cn = 0.0, qmin = 1e9;
  for (int t = 0; t < 4; t++) {
    ivec2 o = t == 0 ? ivec2(r, 0) : t == 1 ? ivec2(0, r) : t == 2 ? ivec2(r, r) : ivec2(r, -r);
    ivec2 a2 = fp - 2 * o, b2 = fp + 2 * o;
    float inside = all(greaterThanEqual(min(a2, b2), ivec2(0))) && all(lessThanEqual(max(a2, b2), lim)) ? 1.0 : 0.0;
    float zl = frLinZ(texelFetch(tDepth, clamp(fp - o, ivec2(0), lim), 0).x), zl2 = frLinZ(texelFetch(tDepth, clamp(a2, ivec2(0), lim), 0).x);
    float zr = frLinZ(texelFetch(tDepth, clamp(fp + o, ivec2(0), lim), 0).x), zr2 = frLinZ(texelFetch(tDepth, clamp(b2, ivec2(0), lim), 0).x);
    float dmax = max(max(abs(zl - z), abs(zr - z)), max(abs(zl2 - z), abs(zr2 - z)));
    float wt = inside * (1.0 - smoothstep(0.5 * uCrease.w, uCrease.w, dmax));
    float qi = ((1.0 / zr2 - 1.0 / zr) - (1.0 / zl - 1.0 / zl2)) * z * z / nrm;
    cs += qi * wt;
    cn += wt;
    qmin = wt > 0.0 ? min(qmin, qi) : qmin;
  }
  float keep = (cn > 0.05 ? 1.0 : 0.0) * (qmin < -uCreaseFar.z ? 0.0 : 1.0);
  return keep * min(1.0, cn) * smoothstep(0.0, 1.0, cs / max(cn, 1e-4)) * (1.0 - smoothstep(uCreaseFar.x, uCreaseFar.y, pxu));
}
#endif
uniform sampler2D tRefl;
uniform vec2 uHalf;   // the march's size
uniform vec4 uMix;    // strength, darken, snap, debug
uniform float uSteep; // the darker reflections' strength × (the steep play camera's; 1 at the vistas)
uniform vec3 uFogColor; // the pools' own sky (Water.js reflects the fog colour)
uniform float uPools;   // the pools' strength (1: the water's own reflectivity)
uniform vec2 uPoolK;    // the water's reflect and its (deep) opacity: its sky share, as Water.js mixes it in
uniform float uFogDensity;
uniform vec2 uFogStart;
uniform vec4 uFilt;     // the filter's weights a texel along the ray and across it (the texel's own 1), the far floor's texel size (px), the steep boost's width test (texels)
uniform float uUpFacing; // a normal's |y| over this share of its length faces up: neither the crease nor the bounce

// where a world point falls in the march's target (½-res px)
vec2 frHalf(vec3 w) {
  vec4 cc = uViewProj * vec4(w, 1.0);
  return (cc.xy / cc.w * 0.5 + 0.5) * uHalf;
}
vec4 frRefl(vec2 h) {
  return texelFetch(tRefl, clamp(ivec2(floor(h)), ivec2(0), ivec2(uHalf) - 1), 0);
}
// a march result: a hit (1 / 0); a floor's at all (1; 0: no floor there, alpha −1); weighted (w · hit, w)
float frHit(vec4 r) { return r.a > 1e-4 ? 1.0 : 0.0; }
float frIsFloor(vec4 r) { return r.a >= 0.0 ? 1.0 : 0.0; }
vec4 frPre(vec4 r) { return vec4(r.rgb, 1.0) * max(r.a, 0.0); }
// the march read smoothly at a ½-res position: bilinear over the floor's ½-res pixels around it (alpha
// −1: no floor there)
vec4 frSmooth(vec2 h) {
  vec2 hq = h - 0.5;
  vec2 hf = fract(hq);
  ivec2 hi = ivec2(floor(hq));
  ivec2 hm = ivec2(uHalf) - 1;
  vec4 q00 = texelFetch(tRefl, clamp(hi, ivec2(0), hm), 0);
  vec4 q10 = texelFetch(tRefl, clamp(hi + ivec2(1, 0), ivec2(0), hm), 0);
  vec4 q01 = texelFetch(tRefl, clamp(hi + ivec2(0, 1), ivec2(0), hm), 0);
  vec4 q11 = texelFetch(tRefl, clamp(hi + ivec2(1, 1), ivec2(0), hm), 0);
  vec4 wq = vec4((1.0 - hf.x) * (1.0 - hf.y), hf.x * (1.0 - hf.y), (1.0 - hf.x) * hf.y, hf.x * hf.y)
    * vec4(frIsFloor(q00), frIsFloor(q10), frIsFloor(q01), frIsFloor(q11));
  float ws = dot(wq, vec4(1.0));
  if (ws < 1e-4) return vec4(0.0, 0.0, 0.0, -1.0);
  vec4 acc = wq.x * frPre(q00) + wq.y * frPre(q10) + wq.z * frPre(q01) + wq.w * frPre(q11);
  return acc.w > 1e-5 ? vec4(acc.rgb / acc.w, acc.w / ws) : vec4(0.0);
}
// the march read through its target's own bilinear filter at a ½-res position: one fetch where frSmooth takes four
// (the steep boost's width test on the far floor, KNOWN_ISSUES SKY-36). A miss reads dark there and a non-floor
// pixel's −1 pulls the weight down: the test only ever weighs the boost less
vec4 frLin(vec2 h) {
  return texture2D(tRefl, h / uHalf);
}

void main() {
  ivec2 fp = ivec2(gl_FragCoord.xy);
  vec4 c = texelFetch(tColor, fp, 0);
  vec3 col = pfxSafe(c.rgb);
  float k = frFloorK(c.a);
  float pw = frPool(c.a);
  bool pool = pw > 0.0;
  float d = texelFetch(tDepth, fp, 0).x;
  if (k > 0.004 || pool) {
    ivec2 hsz = ivec2(uHalf);
    vec3 P = frWorld((vec2(fp) + 0.5) / uRes, d);
    if (pool) {
      // a pool's reflectivity: the sky share Water.js mixes in (reflect × its Fresnel, at most 0.6, ×
      // its opacity) at the water's surface (it writes depth), × how much of a pool the pixel is
      float x = 1.0 - clamp(normalize(uCamPos - P).y, 0.0, 1.0);
      k = clamp(uPoolK.x * (0.35 + 1.2 * x * x * x), 0.0, 0.6) * uPoolK.y * pw;
    }
    vec4 r = texelFetch(tRefl, min(fp / 2, hsz - 1), 0);
    // (the neighbours a texel along the ray and across it, and where they are read from)
    vec4 a1 = vec4(0.0, 0.0, 0.0, -1.0), b1 = a1, cl = a1, cr = a1;
    vec2 hc = vec2(0.0), da = vec2(0.0), dc = vec2(0.0);
    bool nb = false;
    bool far = false;
    if (uMix.z > 0.5) {
      // this pixel's floor texel: its reflection is read where the texel's centre is on screen
      vec3 T = vec3((floor(P.x * 16.0) + 0.5) / 16.0, P.y, (floor(P.z * 16.0) + 0.5) / 16.0);
      vec2 h0 = frHalf(T);
      vec4 rt = frRefl(h0);
      if (rt.a >= 0.0) {
        r = rt;
        nb = true;
        // a texel along the ray's way across the floor (the view's, mirrored) and across it, on
        // screen (½-res px); the texel's smaller side decides the far floor (no texel snap there: the
        // march's rays leave the pixels' own points)
        vec2 dv = (T - uCamPos).xz;
        dv /= max(length(dv), 1e-4);
        da = frHalf(T + vec3(dv.x, 0.0, dv.y) * 0.0625) - h0;
        dc = frHalf(T + vec3(-dv.y, 0.0, dv.x) * 0.0625) - h0;
        far = 2.0 * min(length(da), length(dc)) < uFilt.z;
        // (a neighbour at least a ½-res px away: another ray)
        da *= max(1.0, 1.0 / max(length(da), 1e-3));
        dc *= max(1.0, 1.0 / max(length(dc), 1e-3));
        if (far) {
          // the far floor: the march read smoothly at this pixel, so its reflection glides as the
          // camera moves instead of stepping a texel at a time
          hc = (vec2(fp) + 0.5) * 0.5;
          r = frSmooth(hc);
          T = P;
        } else {
          hc = h0;
          a1 = frRefl(h0 - da);
          b1 = frRefl(h0 + da);
          cl = frRefl(h0 - dc);
          cr = frRefl(h0 + dc);
          // the coherence filter: a hit none of the four neighbours shares is noise (dropped); a miss
          // between two hits — across, or along the ray within two texels each way (a gap of two) —
          // a hole (filled with them)
          float hA = frHit(a1), hB = frHit(b1), hL = frHit(cl), hR = frHit(cr);
          if (r.a > 1e-4) {
            if (hA + hB + hL + hR < 0.5 && frIsFloor(a1) + frIsFloor(b1) + frIsFloor(cl) + frIsFloor(cr) > 0.5) r = vec4(0.0);
          } else {
            vec4 fill = vec4(0.0);
            float nf = 0.0;
            if (hL * hR > 0.5) { fill += cl + cr; nf += 2.0; }
            vec4 s1 = a1, s2 = b1;
            if (hA < 0.5) s1 = frRefl(h0 - 2.0 * da);
            if (hB < 0.5) s2 = frRefl(h0 + 2.0 * da);
            if (frHit(s1) * frHit(s2) > 0.5) { fill += s1 + s2; nf += 2.0; }
            if (nf > 0.5) r = fill / nf;
          }
          // then a tent over the texel and its four neighbours, along the ray and across it (their
          // weighted hits: a hit's edge fades over a texel, so the comb of rows a mirrored edge leaves,
          // and a thin bright hit stepping a texel at a time as the camera moves, are halved)
          vec4 acc = frPre(r);
          float ws = 1.0;
          float f = uFilt.x * frIsFloor(a1); acc += f * frPre(a1); ws += f;
          f = uFilt.x * frIsFloor(b1); acc += f * frPre(b1); ws += f;
          f = uFilt.y * frIsFloor(cl); acc += f * frPre(cl); ws += f;
          f = uFilt.y * frIsFloor(cr); acc += f * frPre(cr); ws += f;
          r = acc.w > 1e-5 ? vec4(acc.rgb / acc.w, acc.w / ws) : vec4(0.0);
        }
      }
      P = T;
    }
    float wbs = 0.0;
    if (r.a > 0.0) {
      vec3 V = normalize(P - uCamPos);
      // (the floor's own fog, FogExp2 from the fog's start — three's, the game's start: the sheen's
      // environment was fogged with the floor)
      float fz = uFogDensity * max(0.0, frLinZ(d) - uFogStart.x);
      // (a floor's environment is the sheen's; a pool's, the sky Water.js mixes into it)
      vec3 env = pool ? uFogColor : shFloorEnv(vec3(V.x, -V.y, V.z));
      vec3 dr = r.rgb - env;
      // (the darker reflections — robes, cypresses, doorways, shaded façades — the stronger under the
      // steep play camera, where Fresnel leaves the floor little reflectivity: uSteep; only as far as
      // the reflection uFilt.w texels along the ray and across it, both ways, is dark too — a mirror
      // image five texels wide —, so a thin line's or a small figure's edge is not strengthened into a
      // flicker as the camera moves)
      float lr = dot(dr, vec3(0.2126, 0.7152, 0.0722));
      float sb = 1.0;
      if (lr < 0.0 && uSteep > 1.0) {
        float wb = 1.0;
        if (nb) {
          vec2 sa = da * uFilt.w, sc = dc * uFilt.w;
          a1 = far ? frLin(hc - sa) : frRefl(hc - sa);
          b1 = far ? frLin(hc + sa) : frRefl(hc + sa);
          cl = far ? frLin(hc - sc) : frRefl(hc - sc);
          cr = far ? frLin(hc + sc) : frRefl(hc + sc);
          vec3 Y = vec3(0.2126, 0.7152, 0.0722);
          vec4 nd = vec4(dot(a1.rgb - env, Y), dot(b1.rgb - env, Y), dot(cl.rgb - env, Y), dot(cr.rgb - env, Y));
          nd = clamp(-nd * 4.0, 0.0, 1.0) * clamp(vec4(a1.a, b1.a, cl.a, cr.a), 0.0, 1.0);
          wb = min(nd.x + nd.y, nd.z + nd.w) * 0.5;
        }
        sb = 1.0 + (uSteep - 1.0) * wb;
        wbs = wb;
      }
      vec3 o = col + dr * (k * r.a * (pool ? uPools : uMix.x) * sb * exp(-fz * fz));
      // (a darker reflection takes at most uMix.y of the floor's light: the change scaled back as a
      // whole, so a blue robe's reflection stays blue)
      float lc = dot(col, vec3(0.2126, 0.7152, 0.0722));
      float lo = dot(o, vec3(0.2126, 0.7152, 0.0722));
      float lm = lc * (1.0 - uMix.y);
      col = max(lo < lm ? col + (o - col) * ((lc - lm) / max(lc - lo, 1e-5)) : o, vec3(0.0));
    }
    if (uMix.w > 4.5) {}
    else if (uMix.w > 3.5) col = vec3(far ? 1.0 : 0.0, wbs, 0.0);
    else if (uMix.w > 2.5) col = vec3(1.0, 0.0, 1.0);
    else if (uMix.w > 1.5) col = vec3(k, max(r.a, 0.0), 0.0);
    else if (uMix.w > 0.5) col = r.a > 0.0 ? r.rgb : col * 0.15;
  } else if (uMix.w > 2.5 && uMix.w < 4.5) col = vec3(0.0);
  // the crease and the gold's bounce: inside the city's box, off the sky
  float crz = 0.0;
  float bn = 0.0;
  float own = 0.0;
  float bk = 0.0;
#if FR_CREASE || FR_BOUNCE
  // (a floor or a pool takes neither: skipped, but for debug view 6's key)
  bool onFloor = k > 0.004 || pool;
  if (d < 1.0 && (!onFloor || uMix.w > 5.5)) {
    vec3 W0 = frWorld((vec2(fp) + 0.5) / uRes, d);
    float gate = frCity(W0);
    if (gate > 0.0) {
      float z = frLinZ(d);
      // (the fog takes them with it: the scene's colour was fogged)
      float fz = uFogDensity * max(0.0, z - uFogStart.x);
      float fog = exp(-fz * fz) * gate;
      // a wall, not a floor, a pool or a surface facing up (its normal from the depth 2 px across and down:
      // the rune circles' discs, steps, cornice tops) — the crease's and the bounce's
      float wall = 0.0;
      if (!onFloor) {
        ivec2 lim = ivec2(uRes) - 1;
        ivec2 px2 = min(fp + ivec2(2, 0), lim), py2 = min(fp + ivec2(0, 2), lim);
        vec3 nn = cross(frWorld((vec2(px2) + 0.5) / uRes, texelFetch(tDepth, px2, 0).x) - W0,
          frWorld((vec2(py2) + 0.5) / uRes, texelFetch(tDepth, py2, 0).x) - W0);
        wall = abs(nn.y) > uUpFacing * length(nn) ? 0.0 : fog;
      }
#if FR_CREASE
      if (wall > 0.0) crz = uCrease.x * wall * frCrease(fp, z);
#endif
#if FR_BOUNCE
      bk = texture2D(tBounce, (vec2(fp) + 0.5) * ${(1/2).toFixed(6)} / uBnSize).r;
      // (the gold keeps its own colour, and so does its MSAA edge — a pixel half gold or more takes none, a
      // quarter half: the glow starts on the marble beside it; tinting the edge's pixels, whose share changes
      // as the gold moves across them, flickered under the walking play camera)
      own = bnShare(c.a);
      bn = uBounce.x * wall * clamp(bk * uBounce.y, 0.0, 1.0) * (1.0 - smoothstep(0.0, 0.5, own));
#endif
    }
  }
#endif
  if (uMix.w > 5.5) col = vec3(own, bk, bn);
  else if (uMix.w > 4.5) col = vec3(1.0 - crz);
  else if (uMix.w < 0.5) {
    col *= 1.0 - crz;
#if FR_BOUNCE
    col *= mix(vec3(1.0), uBnTint, bn);
#endif
  }
  gl_FragColor = vec4(col, 1.0);
}
`,P=`
varying float vUp;
void main() {
  vUp = normalize(mat3(modelMatrix) * normal).y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,F=`
uniform float uShMask;
varying float vUp;
void main() {
  gl_FragColor = vec4(0.0, 0.0, 0.0, vUp > 0.5 ? uShMask * ${A.toFixed(1)} : 0.0);
}
`;function I(){return new l({name:`luminati:sky-reflect-pools`,uniforms:{uShMask:_},vertexShader:P,fragmentShader:F,transparent:!0,depthWrite:!1,blending:5,blendEquation:100,blendSrc:200,blendDst:201,blendEquationAlpha:100,blendSrcAlpha:201,blendDstAlpha:201,polygonOffset:!0,polygonOffsetFactor:-1,polygonOffsetUnits:-1,toneMapped:!1})}function L(t,n,r){return new e(t,n,{type:c,format:u,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1,minFilter:r,magFilter:r})}function R(e,t,n){return new l({name:e,uniforms:n,vertexShader:p,fragmentShader:t,depthTest:!1,depthWrite:!1,blending:0,toneMapped:!1})}function z(){return{tColor:{value:null},tDepth:{value:null},uViewProj:{value:new a},uInvViewProj:{value:new a},uCamPos:{value:new t},uRes:{value:new n(1,1)},uClip:{value:new n(.5,400)}}}var B=class{constructor(){this.name=`reflect`,this.settings=E(),this._march=R(`luminati:sky-reflect-march`,M,{...z(),uMarch:{value:new i},uFade:{value:new i},uSoft:{value:new i}});let e=z();this._composite=R(`luminati:sky-reflect-composite`,N,{...e,...g,uCity:{value:new i(-1e5,1e5,-1e5,1e5)},uCityY:{value:new n(-1e5,4)},tRefl:{value:null},uHalf:{value:new n(1,1)},uMix:{value:new i},uSteep:{value:1},uFogColor:f.uFogColor,uPools:{value:1},uPoolK:{value:new n(0,0)},uFilt:{value:new i},uFogDensity:{value:0},uFogStart:f.uFogStart,uCrease:{value:new i},uCreaseFar:{value:new t(.05,.1,.5)},uUpFacing:{value:.7},uP00:{value:1},tBounce:{value:null},uBnSize:{value:new n(1,1)},uBounce:{value:new n},uBnTint:{value:new t(1,1,1)}}),this._composite.defines={FR_CREASE:1,FR_BOUNCE:1},this._bounce=new w({uRes:e.uRes}),this._half=null,this._out=null,this._quad=new h(null),this._poolMat=null,this._pool=null,this._water=null,this._vp=new a,this._ivp=new a,this._cam=new t}setWater(e){if(this._pool?.removeFromParent(),this._pool=null,this._water=e?.object??null,!e)return;this._poolMat??=I(),this._composite.uniforms.uPoolK.value.set(e.uniforms.uReflect.value,e.uniforms.uOpacity.value);let t=new o(e.object.geometry,this._poolMat);t.name=`luminati:sky-reflect-pools`,t.matrixAutoUpdate=!1,t.castShadow=!1,t.receiveShadow=!1,t.frustumCulled=e.object.frustumCulled,t.renderOrder=e.object.renderOrder+.5,t.visible=!1,e.object.add(t),this._pool=t}setCity(e){let t=this._composite.uniforms;t.uCity.value.set(e.x0,e.x1,e.z0,e.z1),t.uCityY.value.set(e.yMin,4)}strip(e={}){let t=this._composite.defines,n=+!e.crease,r=+!e.bounce;(t.FR_CREASE!==n||t.FR_BOUNCE!==r)&&(t.FR_CREASE=n,t.FR_BOUNCE=r,this._composite.needsUpdate=!0)}beforeScene(){_.value=1,this._pool&&this._water&&(this._pool.geometry=this._water.geometry,this._pool.visible=!0)}render(e){_.value=0,this._pool&&(this._pool.visible=!1);let{width:t,height:n}=e.size;this._size(t,n),this._uniforms(e,t,n);let r=e.renderer;this._quad.material=this._march,r.setRenderTarget(this._half),this._quad.render(r);let i=this._composite.uniforms;if(this._composite.defines.FR_BOUNCE&&i.uBounce.value.x>0){i.tBounce.value=this._bounce.render(r,e.sceneTarget,Math.max(.05,this.settings.bounce.sigma));let t=this._bounce.size;i.uBnSize.value.set(t.width,t.height)}return this._quad.material=this._composite,r.setRenderTarget(this._out),this._quad.render(r),this._out}warmup(e){this._bounce.warmup(e.renderer,e),this.render(e)}release(){this.setWater(null),this._half?.dispose(),this._out?.dispose(),this._half=null,this._out=null,this._bounce.release(),this._composite.uniforms.tBounce.value=null}dispose(){this.release(),this._march.dispose(),this._composite.dispose(),this._bounce.dispose(),this._poolMat?.dispose()}_size(e,t){let n=Math.max(1,Math.ceil(e/2)),i=Math.max(1,Math.ceil(t/2));this._half?(this._half.width!==n||this._half.height!==i)&&this._half.setSize(n,i):this._half=L(n,i,r),this._out?(this._out.width!==e||this._out.height!==t)&&this._out.setSize(e,t):this._out=L(e,t,r)}_uniforms(e,t,n){let r=this.settings,i=e.camera;this._vp.multiplyMatrices(i.projectionMatrix,i.matrixWorldInverse),this._ivp.multiplyMatrices(i.matrixWorld,i.projectionMatrixInverse),this._cam.setFromMatrixPosition(i.matrixWorld);for(let r of[this._march,this._composite]){let a=r.uniforms;a.tColor.value=e.sceneTarget.texture,a.tDepth.value=e.depthTexture,a.uViewProj.value.copy(this._vp),a.uInvViewProj.value.copy(this._ivp),a.uCamPos.value.copy(this._cam),a.uRes.value.set(t,n),a.uClip.value.set(i.near,i.far)}let a=+!!r.snap,o=this._march.uniforms;o.uMarch.value.set(Math.min(k,Math.max(1,Math.round(r.steps))),Math.max(1,r.maxDistance),Math.max(.01,r.thickness),Math.max(0,r.thicknessStep)),o.uFade.value.set(Math.max(.001,r.edgeFade),Math.min(.999,Math.max(0,r.endFade)),a,Math.max(0,r.farStep));let s=r.snap?Math.max(0,r.farTexel):0;o.uSoft.value.set(Math.max(0,r.soft),Math.max(0,r.softMax),Math.max(0,r.footprint),s);let c=this._composite.uniforms;c.tRefl.value=this._half.texture,c.uHalf.value.set(this._half.width,this._half.height),c.uMix.value.set(Math.max(0,r.strength),Math.min(1,Math.max(0,r.darken)),a,r.debug|0);let l=i.matrixWorld.elements,u=Math.asin(Math.min(1,Math.max(-1,l[9]/Math.max(1e-6,Math.hypot(l[8],l[9],l[10])))))*D,d=Math.min(1,Math.max(0,(u-r.steepFrom)/Math.max(.001,r.steepTo-r.steepFrom)));c.uSteep.value=1+(Math.max(1,r.steep)-1)*d*d*(3-2*d),c.uPools.value=Math.max(0,r.poolStrength),c.uFilt.value.set(Math.max(0,r.along),Math.max(0,r.across),s,Math.max(1,r.steepWidth));let p=e.scene.fog;c.uFogDensity.value=p&&p.isFogExp2?p.density:0;let m=r.crease;c.uCrease.value.set(Math.min(1,Math.max(0,m.strength)),Math.min(8,Math.max(1,Math.round(m.r))),Math.max(.001,m.to),Math.max(0,m.jump)),c.uCreaseFar.value.set(m.far[0],Math.max(m.far[0]+1e-4,m.far[1]),Math.max(0,m.coherence)),c.uUpFacing.value=Math.min(1,Math.max(0,r.upFacing)),c.uP00.value=i.projectionMatrix.elements[0];let h=r.bounce,g=f.uSunColor.value,_=O(h.sun[0],h.sun[1],Math.max(g.r,g.g,g.b))*O(h.white[0],h.white[1],Math.min(1,g.b/Math.max(g.r,1e-4)))*(1-Math.min(1,Math.max(0,f.uNight.value)));c.uBounce.value.set(Math.min(1,Math.max(0,h.strength))*_,Math.max(0,h.gain)),c.uBnTint.value.set(h.tint[0],h.tint[1],h.tint[2])}};export{B as FloorReflections,T as REFLECT_DEFAULTS};