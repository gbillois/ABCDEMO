import{Eo as e,Fi as t,Mr as n,Oo as r,Qa as i,Wi as a,Zr as o,_o as s,ai as c,ao as l,bi as u,co as d,ii as f,jr as p,ma as m,ra as h}from"./LevelStorage-C_bJYT5y.js";import{_ as g}from"./Trees-fTuW5H_M.js";import{t as _}from"./GlobalUniforms-Hkw9cp0_.js";var v=3e5,y=4e5,b=5e5,x=256,ee=128,te=96,ne=768,S=1536,re=e=>!!e&&typeof e==`object`&&!Array.isArray(e);function C(e,t,n,r){return Math.min(r,Math.max(n,typeof e==`number`&&Number.isFinite(e)?e:t))}function w(e,t){let n=typeof e==`string`&&/^#[0-9a-fA-F]{6}$/.test(e)?e:t;return new o().setStyle(n,l)}function T(e){let t=re(e?.clouds)?e.clouds:{};return{y:C(t.y,-26,-200,100),cover:C(t.cover,.6,0,1),speed:C(t.speed,1,0,20),color:w(t.color,`#ffffff`),shade:w(t.shade,`#aebde0`),haze:C(e?.haze,.45,0,2)}}function E(e,t,r,i){let a=x/r,o=Math.floor(e/a),s=Math.floor(t/a),c=0;for(let l=-1;l<=1;l++)for(let u=-1;u<=1;u++){let d=o+u,f=s+l,p=(d%r+r)%r,m=(f%r+r)%r,h=(d+.15+.7*n(p,m,i))*a,g=(f+.15+.7*n(p,m,i+1))*a,_=a*(.58+.4*n(p,m,i+2)),v=e+.5-h,y=t+.5-g,b=1-(v*v+y*y)/(_*_);if(b>0){let e=b**1.4*(.62+.38*n(p,m,i+3));e>c&&(c=e)}}return c}function D(e,t,n,r){let i=E(e,t,n[0],r),a=E(e,t,n[1],r+17)*.8,o=E(e,t,n[2],r+31),s=E(e,t,n[3],r+47),c=Math.max(i,a);return c+(.26*o+.07*s)*(.3+.7*c)}function O(e){let t=Float32Array.from(e).sort(),n=t.length,r=Math.max(t[n-1],1e-6);for(let i=0;i<n;i++){let a=0,o=n,s=e[i];for(;a<o;){let e=a+o>>1;t[e]<s?a=e+1:o=e}e[i]=.5*(a/(n-1))+s/r*.5}}var k=null;function*ie(){if(k)return k;let e=x,n=new Float32Array(e*e),r=new Float32Array(e*e),a=new Float32Array(e*e),o=new Float32Array(e*e);for(let t=0;t<e;t++){for(let i=0;i<e;i++){let s=t*e+i;n[s]=D(i,t,[6,13,29,58],101),r[s]=D(i,t,[5,11,24,51],211),a[s]=p(i/(e/4),t/(e/4),{octaves:4,seed:307,period:4}),o[s]=p(i/(e/8),t/(e/8),{octaves:3,seed:401,period:8})}(t&7)==7&&(yield)}O(n),yield,O(r),yield;let s=new Uint16Array(e*e*4),l=c.toHalfFloat;for(let t=0;t<e*e;t++)s[t*4]=l(n[t]),s[t*4+1]=l(a[t]),s[t*4+2]=l(r[t]),s[t*4+3]=l(o[t]);if(yield,k)return k;let d=new f(s,e,e,m,u);return d.name=`luminati:sky-cloud-noise`,d.wrapS=i,d.wrapT=i,d.magFilter=t,d.minFilter=t,d.generateMipmaps=!1,d.colorSpace=``,d.needsUpdate=!0,k=d,d}function ae({settings:t,noise:n,mask:i,maskRect:a,maskY:o,thick:c=8}){return{...s.clone(g.fog),uFogStart:_.uFogStart,uTime:_.uTime,uNight:_.uNight,uSunDirection:_.uSunDirection,uSunColor:_.uSunColor,uFogColor:_.uFogColor,uHaze:{value:t.haze},uCloudColor:{value:t.color.clone()},uCloudShade:{value:t.shade.clone()},uNoise:{value:n},uMask:{value:i},uMaskRect:{value:new r(...a)},uMaskY:{value:o},uMaskK:{value:.4},uSeaY:{value:t.y},uThick:{value:c},uCover:{value:t.cover},uDriftA:{value:new e},uDriftB:{value:new e(37,11)}}}var A=`
uniform float uTime;
uniform float uNight;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uFogColor;
uniform vec2 uFogStart;
uniform float fogDensity;
uniform float uHaze;
uniform vec3 uCloudColor;
uniform vec3 uCloudShade;
uniform sampler2D uMask;
uniform vec4 uMaskRect;
uniform float uMaskY;
uniform float uMaskK;

float skLuma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float skBayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float skBayer4(vec2 a) { return skBayer2(0.5 * a) * 0.25 + skBayer2(a); }
float skHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec3 skSkyLight() {
  return mix(vec3(skLuma(uFogColor)), uFogColor, 0.55);
}
// the sun's (or moon's) light on clouds: a white-gold day sun near white, a strongly coloured one
// (sunrise, golden hour, the moon) keeps its hue; soft-capped so a strong sun gilds without burning
vec3 skSunLight() {
  vec3 c = uSunColor;
  float mx = max(c.r, max(c.g, c.b));
  float mn = min(c.r, min(c.g, c.b));
  float sat = (mx - mn) / max(mx, 1e-4);
  vec3 s = mix(vec3(skLuma(c)), c, mix(0.18, 0.75, smoothstep(0.35, 0.8, sat)));
  float m = max(s.r, max(s.g, s.b));
  // (by night the moon silvers the cloud tops: they catch more of its light than the ground does)
  return s / max(1.0, m * 0.95) * mix(1.0, 1.55, uNight);
}
float skBand(float x, float dither) {
  return clamp(floor(x + (dither - 0.5) * 0.32 + 0.5), 0.0, 5.0);
}
// the light a cloud point receives (→ ×4.6 a band): the sky's and the sun's (dirL: its incidence,
// wrapped a little; vis: not shadowed), both dimmer and bluer deeper in the cloud (ao: 0 the floor
// of the sea or a bank's foot … 1 the tops) — white heads over lavender hollows; the floors keep
// most of the shade bands light (a high-key sea: its hollows lavender, not slate)
float skCloudLight(float ao, float dirL, float vis) {
  return (0.32 + 0.72 * dirL * vis) * mix(0.42, 1.0, pow(ao, 0.8));
}
// the six bands' colours, the painting's ramp: the level's shade under the sky's light (0 … 2) —
// by day mostly the shade's own hue (a lavender-mauve; the sky's blue a fifth of it), its hollows
// deeper —, the half light (3) the shade turning rose toward the lit (the sunlight scattered
// through a cloud's edge, the pink between the lavender shade and the white tops), the lit whites
// (4) — the level's colour, brighter by day (the sea is the frame's largest white mass), a warm
// peach white (warmer in linear light than it shows: the sky grade's cool lift of the highlights,
// SkyLook's SKY_POST, takes back its blue) — and the sun-facing rim (5), a near-neutral white.
// By day the shade is warmed (× (1.06, 1, 0.92): the painting's shade is a rose-lavender, the sky's
// light left it a lilac-blue), its bands lighter — the shade band (2) × 1.37 and the dark shade (1)
// × 0.92 (× 1.25 and × 0.8 put a fifth of the clouds in L 190–210 and a sixth in 210–225, the
// painting's a seventh and a quarter; the far sea of the establishing views went a grey-mauve under
// the opened views' trimmed exposure) — the clouds' tone bands ΔE 3.2 → 2.7, their shares' mismatch
// 0.19 → 0.11 —, and the sunlit tops held at a luminance of 0.9 (1.0 lifted the opened views'
// clouds over the painting's tones; 0.95 with the sky grade's stronger highlight lift — SkyLook's
// SKY_POST — put 44 % of the clouds at L ≥ 240 against the painting's 30 %: their mismatch .16, .13
// at 0.9). The sunlit tops are held under
// the bloom's knee (luminance ≤ 1.0, the rim ≤ 1.03 linear: the threshold is 1.05), so the display's
// white — ≈ 252–254 on the rim by day — comes from the tone curve and the exposure, never from a
// glow. The sky argument (0 … 1): how far a cloud stands in the open sky — a towering cumulus
// high over the sea, lit by the whole dome —: by day under a high sun its shade takes the sky's
// periwinkle, a little brighter, its half light and whites a cleaner white (the painting's
// blue-shaded heaps over its mauve sea). By night every band is as before the painting's pass:
// the night's own blue
vec3 skCloudBand(float k, float sky) {
  vec3 A = skSkyLight();
  vec3 S = skSunLight();
  float sk = sky * (1.0 - uNight) * smoothstep(0.34, 0.64, normalize(uSunDirection).y);
  // (by night the shade takes the sky's deep blue — a pale shade colour would go grey — and the
  // moonlit whites lean cool again: silver, not grey)
  vec3 sh = uCloudShade * mix(vec3(1.06, 1.0, 0.92), vec3(1.0), uNight) * mix(vec3(skLuma(A)), A, mix(0.2, 0.8, uNight));
  sh = mix(vec3(skLuma(sh)), sh, mix(0.84, 1.0, uNight));
  sh = mix(sh, vec3(skLuma(sh)) * vec3(0.904, 1.001, 1.273), sk);
  vec3 cc = uCloudColor * mix(vec3(1.3, 1.28, 1.22), vec3(1.0), uNight);
  vec3 tint = mix(vec3(1.0, 0.968, 0.898), vec3(0.96, 0.99, 1.04), uNight);
  vec3 lit = cc * (A * 0.38 + S * 0.6) * tint * mix(1.08, 1.0, uNight);
  lit *= min(1.0, mix(0.9, 1.0, uNight) / max(skLuma(lit), 1e-4));
  lit = mix(lit, vec3(skLuma(lit)), 0.5 * sk);
  vec3 c2 = sh * mix(1.37, 1.14, uNight) * (1.0 + 0.12 * sk);
  if (k < 0.5) return sh * mix(0.68, 0.8, uNight);
  if (k < 1.5) return sh * mix(0.92, 0.95, uNight) * (1.0 + 0.1 * sk);
  if (k < 2.5) return c2;
  if (k < 3.5) return mix(c2, lit * mix(vec3(1.04, 0.96, 0.94), vec3(1.0), max(uNight, sk)), mix(0.6, 0.55, uNight));
  if (k < 4.5) return lit;
  vec3 rim = cc * (A * 0.3 + S * 0.74) * mix(vec3(1.01, 0.973, 0.907), vec3(0.96, 0.99, 1.04), uNight);
  return rim * min(mix(1.06, 1.0, uNight), 1.03 / max(skLuma(rim), 1e-4));
}
vec3 skCloudBand(float k) { return skCloudBand(k, 0.0); }
// the sky's haze on a cloud of band k: the sunlit tops (bands 4, 5) carry their white farther
// through the air (the far fade into the horizon is the same for every band)
float skBandHaze(float k) {
  return mix(1.0, 0.7, smoothstep(3.5, 4.5, k));
}
float skIslandShadow(vec3 p) {
  vec3 L = normalize(uSunDirection);
  vec2 q = p.xz + L.xz * ((uMaskY - p.y) / max(L.y, 0.12));
  return textureLod(uMask, (q - uMaskRect.xy) * uMaskRect.zw, 0.0).r * uMaskK * mix(1.0, 0.6, uNight);
}
vec3 skHaze(vec3 col, float viewZ, float k) {
  float d = max(0.0, viewZ - uFogStart.x);
  float r = fogDensity * uHaze * k * d;
  float f = 1.0 - exp(-r * r);
  f = max(f, smoothstep(300.0, 390.0, viewZ));
  return mix(col, uFogColor, f);
}
`,j=`
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`,oe=`
uniform float uSeaY;
varying vec3 vWorld;
void main() {
  // the plane follows the camera (the field is in world space: nothing swims)
  vec3 wp = vec3(position.x + cameraPosition.x, uSeaY, position.z + cameraPosition.z);
  vWorld = wp;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`,se=`
${A}
uniform sampler2D uNoise;
uniform vec2 uDriftA;
uniform vec2 uDriftB;
uniform float uSeaY;
uniform float uThick;
uniform float uCover;
varying vec3 vWorld;

// the cumulus field (0 … 1, evenly spread) at world xz: one field of heads, a second one stirred in
// (it drifts a little apart, so the heads churn as they go, and it hides the first one's repeat)
float seaField(vec2 p) {
  float a = textureLod(uNoise, (p + uDriftA) * ${(1/ee).toFixed(8)}, 0.0).r;
  float b = textureLod(uNoise, (p + uDriftB) * ${(1/te).toFixed(8)} + vec2(0.31, 0.67), 0.0).b;
  return a * 0.8 + b * 0.2;
}
// the cloud surface's world y at xz; lo: the field's level of the slab's floor (1 − coverage)
float seaSurface(vec2 p, float lo) {
  float h = seaField(p);
  float s = clamp((h - lo) / (1.0 - lo), 0.0, 1.0);
  return uSeaY - uThick + uThick * (0.16 * h + 0.84 * pow(s, 0.8));
}

void main() {
  vec3 p0 = vWorld;
  vec3 rd = normalize(p0 - cameraPosition);
  float viewZ0 = -(viewMatrix * vec4(p0, 1.0)).z;
  // past the far fade nothing of it shows: the fog colour, no march
  if (viewZ0 > 392.0) {
    gl_FragColor = vec4(uFogColor, 1.0);
${j}
    return;
  }
  // coverage varies slowly over the sea (fields of heads, lanes of deeper cloud)
  float g = textureLod(uNoise, (p0.xz + uDriftA * 0.5) * ${(1/ne).toFixed(8)} + vec2(0.17, 0.43), 0.0).g;
  float cov = clamp(uCover + (g - 0.5) * 0.6, 0.04, 0.98);
  float lo = 1.0 - cov;

  // march down through the slab to the first point under the surface (then the secant); the
  // steps lengthen with distance, where the haze and the depth of field keep no fine detail
  float down = max(-rd.y, 0.05);
  float tMax = uThick / down;
  float n = clamp(ceil(tMax / (1.3 + viewZ0 * 0.006)), 5.0, 20.0);
  float dt = tMax / n;
  float dPrev = p0.y - seaSurface(p0.xz, lo);
  float hitT = tMax;
  for (int i = 1; i <= 20; i++) {
    if (float(i) > n) break;
    float ti = dt * float(i);
    vec3 q = p0 + rd * ti;
    float d = q.y - seaSurface(q.xz, lo);
    if (d <= 0.0) {
      hitT = ti - dt + dt * dPrev / max(dPrev - d, 1e-4);
      break;
    }
    dPrev = d;
  }
  vec3 hp = p0 + rd * hitT;

  // the surface's normal and height in the slab
  float e = 0.5;
  float h0 = seaSurface(hp.xz, lo);
  float hx = seaSurface(hp.xz + vec2(e, 0.0), lo);
  float hz = seaSurface(hp.xz + vec2(0.0, e), lo);
  vec3 nrm = normalize(vec3(h0 - hx, e, h0 - hz));
  float hs = clamp((h0 - (uSeaY - uThick)) / uThick, 0.0, 1.0);
  vec3 sp = vec3(hp.x, h0, hp.z);

  // soft self-shadow: the heads toward the light (a near and a far sample)
  vec3 L = normalize(uSunDirection);
  float occ = 0.0;
  vec3 q1 = sp + L * 1.8;
  if (q1.y < uSeaY) occ = (seaSurface(q1.xz, lo) - q1.y) / 1.1;
  vec3 q2 = sp + L * 6.5;
  if (q2.y < uSeaY) occ = max(occ, (seaSurface(q2.xz, lo) - q2.y) / 2.1);
  float sunVis = 1.0 - clamp(occ, 0.0, 1.0);

  float dirL = clamp((dot(nrm, L) + 0.12) / 1.12, 0.0, 1.0);
  float isl = skIslandShadow(sp);
  float l = skCloudLight(smoothstep(0.05, 0.95, hs), dirL, sunVis * (1.0 - isl));
  float band = skBand(l * 4.6, skBayer4(floor(sp.xz * 4.0)));
  vec3 col = skCloudBand(band);
  float viewZ = -(viewMatrix * vec4(sp, 1.0)).z;
  col = skHaze(col, viewZ, skBandHaze(band));
  gl_FragColor = vec4(col, 1.0);
${j}
}
`;function ce(e,{speed:t=1}={}){let n=new h(900,900,1,1);n.rotateX(-Math.PI/2);let r=new d({name:`luminati:sky-cloud-sea`,uniforms:e,vertexShader:oe,fragmentShader:se,fog:!0,side:0}),i=new a(n,r);i.name=`CloudSea`,i.frustumCulled=!1,i.castShadow=!1,i.receiveShadow=!1,i.renderOrder=b,i.matrixAutoUpdate=!1;let o=e.uDriftA.value,s=e.uDriftB.value,c=e=>e-Math.floor(e/S)*S;return{mesh:i,update(e){if(!(e>0))return;let n=Math.min(e,.25),r=_.uWind.value,i=.32*t*n;o.x=c(o.x-r.x*i),o.y=c(o.y-r.y*i),s.x=c(s.x-(r.x*.78-r.y*.2)*i),s.y=c(s.y-(r.y*.78+r.x*.2)*i)},dispose(){n.dispose(),r.dispose()}}}var le=`
attribute float aAO;
varying vec3 vWorld;
varying vec3 vNrm;
varying float vAO;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNrm = normalize(mat3(modelMatrix) * normal);
  vAO = aAO;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,ue=`
${A}
uniform float uSeaY;
varying vec3 vWorld;
varying vec3 vNrm;
varying float vAO;
void main() {
  vec3 n = normalize(vNrm);
  vec3 L = normalize(uSunDirection);
  float dirL = clamp((dot(n, L) + 0.12) / 1.12, 0.0, 1.0);
  float isl = skIslandShadow(vWorld);
  // (a great heap's vertices carry aAO + 2: luminous in its shade — the sky's light scattered
  // through a towering cloud —, its side away from the sun lavender-white, never a grey wall)
  float heap = step(1.5, vAO);
  float l = skCloudLight(vAO - 2.0 * heap, dirL, 1.0 - isl);
  l = mix(l, max(l, mix(l, 0.55, 0.5)), heap);
  vec3 c = floor(vWorld * 4.0);
  float band = skBand(l * 4.6, skBayer4(c.xz + c.y));
  // (a bank's crown high over the sea stands in the open sky: the sky's shade, skCloudBand)
  vec3 col = skCloudBand(band, smoothstep(uSeaY + 14.0, uSeaY + 60.0, vWorld.y));
  float viewZ = -(viewMatrix * vec4(vWorld, 1.0)).z;
  col = skHaze(col, viewZ, skBandHaze(band));
  gl_FragColor = vec4(col, 1.0);
${j}
}
`;function de(e){return new d({name:`luminati:sky-cloud-bank`,uniforms:e,vertexShader:le,fragmentShader:ue,fog:!0})}var fe=`
uniform float uTime;
attribute vec4 aWisp;   // the lane's centre (xyz), seed
attribute vec4 aShape;  // width, height, opacity, the lane's length
attribute vec3 aDrift;  // the lane's direction (x, z; unit), speed (u/s)
varying vec2 vUv;
varying float vAlpha;
varying float vSeed;
varying vec3 vWorld;
void main() {
  float ph = fract(aWisp.w * 0.618 + uTime * aDrift.z / max(aShape.w, 1.0));
  vec3 c = aWisp.xyz + vec3(aDrift.x, 0.0, aDrift.y) * ((ph - 0.5) * aShape.w);
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 wp = c + right * (position.x * aShape.x) + up * (position.y * aShape.y);
  vUv = position.xy;
  // in and out softly at the lane's ends
  vAlpha = aShape.z * smoothstep(0.0, 0.22, ph) * (1.0 - smoothstep(0.78, 1.0, ph));
  vSeed = aWisp.w;
  vWorld = wp;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`,pe=`
${A}
uniform sampler2D uNoise;
uniform float uSeaY;
varying vec2 vUv;
varying float vAlpha;
varying float vSeed;
varying vec3 vWorld;
void main() {
  float u = vUv.x;
  float v = vUv.y + 0.5;
  vec2 nuv = vec2(u * 0.55 + vSeed * 0.37, vSeed * 0.61);
  float top = 0.52 + 0.42 * textureLod(uNoise, nuv, 0.0).r;
  float bot = 0.1 + 0.24 * textureLod(uNoise, vec2(u * 1.6 + vSeed * 0.53, vSeed * 0.29 + 0.5), 0.0).b;
  float ends = 1.0 - smoothstep(0.22, 0.5, abs(u) + 0.14 * (1.0 - textureLod(uNoise, nuv * 0.9 + 0.2, 0.0).b));
  float dens = smoothstep(bot, bot + 0.16, v) * (1.0 - smoothstep(top - 0.2, top, v)) * ends;
  float a = floor(dens * 3.0 + 0.35) / 3.0 * vAlpha;
  if (a < 0.01) discard;
  // sunlit above, a lavender underside (a wisp in the island's shadow keeps its shade)
  float l = (0.66 + 0.42 * smoothstep(bot, top, v)) * (1.0 - 0.6 * skIslandShadow(vWorld));
  vec3 col = skCloudBand(skBand(l * 4.6, 0.5), smoothstep(uSeaY + 14.0, uSeaY + 60.0, vWorld.y));
  float viewZ = -(viewMatrix * vec4(vWorld, 1.0)).z;
  col = skHaze(col, viewZ, 1.0);
  gl_FragColor = vec4(col, a);
${j}
}
`;function me(e){return new d({name:`luminati:sky-cloud-wisp`,uniforms:e,vertexShader:fe,fragmentShader:pe,fog:!0,transparent:!0,depthWrite:!1,side:2})}var he=`
attribute vec2 aFx;     // x: 1 a thread of falling water, −1 rock; y: a gold glint
varying vec3 vColor;
varying vec2 vFx;
varying vec3 vWorld;
varying vec3 vNrm;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNrm = normalize(mat3(modelMatrix) * normal);
  vColor = color;
  vFx = aFx;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,ge=`
${A}
uniform float uSeaY;
varying vec3 vColor;
varying vec2 vFx;
varying vec3 vWorld;
varying vec3 vNrm;
void main() {
  vec3 n = normalize(vNrm);
  vec3 L = normalize(uSunDirection);
  vec3 A = skSkyLight();
  vec3 S = skSunLight();
  float ndl = max(dot(n, L), 0.0);
  vec3 base = vColor;
  // rock (aFx.x −1): upright shards — value noise in tall cells across each facet (along its level
  // tangent, in square steps), a darker fracture between them: the far rock keeps the near rock's
  // grain instead of reading as flat low-poly facets
  bool rock = vFx.x < -0.5;
  if (rock) {
    vec2 tg = vec2(-n.z, n.x);
    float tl = length(tg);
    float u = (tl > 0.2 ? dot(vWorld.xz, tg / tl) : vWorld.x) * 0.75;
    float cu = floor(u);
    float cv = floor(vWorld.y * 0.2 + skHash(vec2(cu, 7.0)) * 3.0);
    base *= (0.8 + 0.38 * skHash(vec2(cu, cv))) * (1.0 - 0.28 * step(fract(u), 0.16));
  }
  // warm where the sun falls, a lavender shade (the sky's light, half neutral), and on the
  // undersides the white bounce of the clouds below — far rock reads like the near rock
  vec3 sky = mix(vec3(skLuma(A)), A, 0.35) * vec3(1.0, 0.95, 1.06);
  vec3 bounce = skCloudBand(3.0) * 0.5 * max(-n.y, 0.0);
  vec3 col = base * (S * ndl * 0.9 * vec3(1.05, 1.0, 0.92) + sky * (0.6 + 0.14 * n.y) + bounce);
  if (rock) {
    // a warm rim light on the facets that turn away from the eye on the sun's side (most where the
    // sun only grazes them: a lit facet is bright enough, and the rock stays under the bloom's knee)
    vec3 V = normalize(cameraPosition - vWorld);
    float rim = smoothstep(0.4, 0.9, 1.0 - abs(dot(n, V))) * smoothstep(-0.2, 0.4, dot(n, L)) * (1.0 - 0.7 * ndl);
    col += base * S * vec3(1.0, 0.8, 0.58) * rim * 0.7;
  }
  if (vFx.x > 0.5) {
    // a thread of falling water: columns of pale streaks running down at their own pace, a little
    // of the sky through it, lost in spray over the clouds
    float lane = floor((vWorld.x + vWorld.z) * 3.0);
    float s = fract(vWorld.y * 0.32 + uTime * (0.7 + 0.4 * skHash(vec2(lane, 7.0))) + skHash(vec2(lane, 3.0)));
    // (white water: by day a white, a touch warm, never cyan — as the near falls, SkyFall.js)
    vec3 water = mix(vec3(1.0, 0.98, 0.97), vec3(0.92, 0.96, 1.0), uNight) * (A * 0.5 + S * 0.58);
    col = water * (0.78 + 0.22 * step(0.42, s));
    col = mix(col, A, 0.18);
    col = mix(col, skCloudBand(4.0), smoothstep(uSeaY + 14.0, uSeaY + 1.0, vWorld.y));
  }
  if (vFx.y > 0.5) {
    float tw = 0.55 + 0.45 * sin(uTime * 2.1 + vWorld.x * 1.3 + vWorld.z * 0.7);
    col = mix(col, vec3(1.32, 0.86, 0.34) * mix(1.0, 0.7, uNight), tw);
  }
  // the air of distance, deeper far off (the far islands and the peaks recede into it): by day a
  // lavender white — the sky's light part neutral, a touch rose and violet, as the painting's far
  // mountains (never the sky's blue) —, by night the night's blue; then the haze
  float viewZ = -(viewMatrix * vec4(vWorld, 1.0)).z;
  vec3 air = mix(mix(vec3(skLuma(A)), A, 0.35) * vec3(1.07, 1.03, 1.04), A * vec3(0.92, 0.97, 1.06) * 1.08, uNight);
  col = mix(col, air, 0.06 + 0.4 * smoothstep(120.0, 340.0, viewZ));
  col = skHaze(col, viewZ, 1.0);
  gl_FragColor = vec4(col, 1.0);
${j}
}
`;function _e(e){return new d({name:`luminati:sky-distant`,uniforms:e,vertexShader:he,fragmentShader:ge,fog:!0,vertexColors:!0})}var ve=`luminati:sky-sheen`,M=Object.freeze({keep:.2,amber:.5,key:.5,keyN:90,studio:Object.freeze([.23,.36,.3,.81]),lamps:1,glints:.05,sub:Object.freeze([1,1.4,.45,.32]),f0:Object.freeze([1,.85,.64]),tint:Object.freeze([1,.9025,1.032]),own:.3,rim:.4,zenith:1.25,sunSide:.8,polish:Object.freeze([.35,.75]),low:Object.freeze([-.46,-.32]),subUp:Object.freeze([.35,.7]),lobes:Object.freeze([.08,.3,.15,2.2]),profile:Object.freeze([.4,.3,2.5]),shoulder:Object.freeze([.55,.78]),glintT:.5,rimK:Object.freeze([2.5,5]),band:Object.freeze([.5,.65,.05,.4])}),N=Object.freeze([.45,0,0,0]),ye=Object.freeze([1,.95,.86]),P=Object.freeze([99,100,1,0]),F=Object.freeze([0,0,1]),I=Object.freeze([.08,.3,0,.7]),L=Object.freeze([0,0,0]),R=Object.freeze([.35,.3,.9]),z=Object.freeze({rough:.3,skyShare:.3}),B=Object.freeze({gold:Object.freeze({f0:.04,metal:1,gloss:120,spec:.8,env:1,rough:.3,keep:M.keep,hue:0,skyShare:0,polish:0,wrap:0,floor:0,key:M.key,keyN:M.keyN,amber:M.amber,shade:.3,studio:M.studio,lamps:M.lamps,glints:M.glints,sub:M.sub,lit:F,lobes:M.lobes,profile:M.profile}),glow:Object.freeze({f0:.04,metal:1,gloss:120,spec:.5,env:.75,rough:.3,keep:.35,hue:0,skyShare:0,polish:0,wrap:0,floor:0,key:.4,keyN:M.keyN,amber:M.amber,shade:.3,studio:M.studio,lamps:M.lamps,glints:0,sub:M.sub,lit:F,lobes:M.lobes,profile:Object.freeze([M.profile[0],M.profile[1],0])}),marble:Object.freeze({f0:.04,metal:0,gloss:10,spec:.7,env:.35,rough:.8,keep:.4,hue:1,skyShare:.2,polish:0,wrap:.08,floor:0,key:M.key,keyN:M.keyN,amber:M.amber,shade:.5,studio:N,lamps:0,glints:0,sub:P,lit:R,lobes:I,profile:L}),polished:Object.freeze({f0:.04,metal:0,gloss:16,spec:.9,env:.4,rough:.7,keep:.4,hue:1,skyShare:.2,polish:0,wrap:.1,floor:0,key:M.key,keyN:M.keyN,amber:M.amber,shade:.5,studio:N,lamps:0,glints:0,sub:P,lit:R,lobes:I,profile:L}),floor:Object.freeze({f0:.15,metal:0,gloss:60,spec:.35,env:1,rough:z.rough,keep:.5,hue:1,skyShare:z.skyShare,polish:0,wrap:0,floor:1,key:M.key,keyN:M.keyN,amber:M.amber,shade:.6,studio:N,lamps:0,glints:0,sub:P,lit:F,lobes:I,profile:L})}),V={uTop:{value:new o(3833568)},uHorizon:{value:new o(12902642)}},H=new o(1,1,1),U=Object.freeze([1,.99,.94]);function W(e,t){let n=.2126*e.r+.7152*e.g+.0722*e.b;return n>t&&e.multiplyScalar(t/n),e}var G=new o,K=new o,q=Object.freeze({uShTop:{get value(){return V.uTop.value}},uShHorizon:{get value(){return V.uHorizon.value}},uShCloud:{value:H},uShSun:_.uSunColor,uShSunDir:_.uSunDirection,uShNight:_.uNight,uShCity:{get value(){let e=_.uSunColor.value,t=V.uHorizon.value;return G.setRGB(e.r*.72+t.r*.42,(e.g*.72+t.g*.42)*.97,(e.b*.72+t.b*.42)*.93),W(G,.95)}},uShCloudSea:{get value(){let e=_.uSunColor.value,t=V.uHorizon.value,n=H;return K.setRGB(n.r*(t.r*.42+e.r*.7)*U[0],n.g*(t.g*.42+e.g*.7)*U[1],n.b*(t.b*.42+e.b*.7)*U[2]),W(K,.92)}}}),J={value:0};function be(e){let t=e?.uniforms;t?.uTop?.value?.isColor&&t?.uHorizon?.value?.isColor&&(V=t)}var Y=.62,X=e=>`vec3(${e.map(e=>e.toFixed(3)).join(`, `)})`,Z=`
uniform vec3 uShTop;
uniform vec3 uShHorizon;
uniform vec3 uShCloud;
uniform vec3 uShSun;
uniform vec3 uShSunDir;
uniform float uShNight;
uniform vec3 uShCity;
uniform vec3 uShCloudSea;
float shLuma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 shCap(vec3 c, float l) { return c * min(1.0, l / max(shLuma(c), 1e-4)); }
vec3 shCity() { return uShCity; }
vec3 shCloudSea() { return uShCloudSea; }
vec3 shSkyY(float y, float rough) {
  if (y < 0.0) return mix(uShHorizon, uShCloudSea, smoothstep(0.0, mix(0.12, 0.3, rough), -y));
  float up = smoothstep(0.0, 1.0, pow(min(y, 1.0), mix(0.35, 0.7, rough)));
  return mix(mix(uShHorizon, uShTop, up), uShCity, exp(-abs(y - 0.06) * mix(9.0, 4.0, rough)) * 0.55);
}
vec3 shSky(vec3 r, float rough) { return shSkyY(r.y, rough); }
// mix(the city × ${Y.toFixed(2)}, shSkyY(y, rough), skyShare), summed as the four colours' weights
vec3 shEnvDielectricY(float y, float rough, float skyShare) {
  float wC = ${Y.toFixed(3)} * (1.0 - skyShare);
  float wH;
  float wT = 0.0;
  float wS = 0.0;
  if (y < 0.0) {
    float c = smoothstep(0.0, mix(0.12, 0.3, rough), -y);
    wH = skyShare * (1.0 - c);
    wS = skyShare * c;
  } else {
    float up = smoothstep(0.0, 1.0, pow(min(y, 1.0), mix(0.35, 0.7, rough)));
    float b = exp(-abs(y - 0.06) * mix(9.0, 4.0, rough)) * 0.55;
    wC += skyShare * b;
    wH = skyShare * (1.0 - b) * (1.0 - up);
    wT = skyShare * (1.0 - b) * up;
  }
  return uShCity * wC + uShHorizon * wH + uShTop * wT + uShCloudSea * wS;
}
vec3 shEnvDielectric(vec3 r, float rough, float skyShare) { return shEnvDielectricY(r.y, rough, skyShare); }
vec3 shFloorEnvY(float y) {
  return shEnvDielectricY(y, ${z.rough.toFixed(3)}, ${z.skyShare.toFixed(3)});
}
vec3 shFloorEnv(vec3 r) { return shFloorEnvY(r.y); }
float shStudioY(float y, float sun, vec4 lv, float soft) {
  float hi = smoothstep(-0.03 - soft, 0.03 + soft, y) * (1.0 - smoothstep(0.12, 0.3 + soft, y));
  float lo = smoothstep(${M.low[0].toFixed(2)} - soft, ${M.low[1].toFixed(2)}, y) * (1.0 - smoothstep(-0.1 - soft, -0.03 + soft, y));
  float k = mix(lv.x * (1.0 + ${M.zenith.toFixed(2)} * smoothstep(0.35, 0.95, y)), lv.w, 1.0 - smoothstep(${M.low[0].toFixed(2)}, 0.05, y));
  k = mix(k, lv.y, hi);
  k = mix(k, lv.z, lo);
  // the world brightest on the sun's side: a face whose reflection turns toward the sun sees the
  // sunlit city and sky, one turned away their shade (the gold's light and dark sides)
  float s = max(sun, 0.0);
  return k * (${(1-M.sunSide/2).toFixed(3)} + ${M.sunSide.toFixed(3)} * s * s);
}
vec3 shStudio(vec3 r, vec4 lv) { return uShCity * ${X(M.tint)} * shStudioY(r.y, dot(r, uShSunDir), lv, 0.0); }
`,xe=.01,Se=.2,Ce=`
${Z}
uniform vec4 uShA; // x F0 (dielectric), y metal, z sun lobe exponent, w sun lobe strength
uniform vec4 uShB; // x environment strength, y its roughness, z a metal's diffuse kept, w hue mask (1: on)
uniform vec4 uShC; // x the dielectric's sky share, y polish, z wrap, w floor (1: writes the mask)
uniform vec4 uShD; // x key light strength, y key exponent, z amber, w the share a cast shadow takes away
uniform vec4 uShE; // the metal's studio levels (× the city's white): above, band, dark, below
uniform vec4 uShF; // xy the normal map's size (texels; the metal's footprint), z the lamps' sheen, w the painted glints
uniform vec4 uShG; // the metal's sub-pixel fallback (x, y its footprint ramp, z the diffuse kept, w the studio's level); the stone's lit sheen (x strength, y, z its N·L ramp)
uniform vec4 uShH; // the metal's GGX lobes: x the coat's α, y the body's α, z the body's weight, w the rims' glints' cap (linear luminance)
uniform vec4 uShI; // the metal's rims: x the crown's lift, y the lip's, z the rims' glints, w unused
uniform float uShMask;
// the gold's mark in the mask (GOLD_MARK)
#define SH_GOLD_MARK ${5 .toFixed(1)}
// the gold's own reflectance (half of its F0), the studio's tint, a glint's white-gold
#define SH_GOLD_F0 ${X(M.f0)}
#define SH_TINT ${X(M.tint)}
#define SH_WHITE_GOLD vec3(1.06, 0.98, 0.78)
#define SH_INLAY_TINT ${X(ye)}
// GGX (Trowbridge–Reitz) D × the height-correlated Smith visibility (Heitz 2014), from α²: D·V, F apart
float shDV(float nh, float nv, float nl, float a2) {
  float d = (nh * a2 - nh) * nh + 1.0;
  float gv = nl * sqrt(nv * nv * (1.0 - a2) + a2);
  float gl = nv * sqrt(nl * nl * (1.0 - a2) + a2);
  return a2 / (PI * d * d) * 0.5 / max(gv + gl, 1e-5);
}
// a luminance knee: unchanged up to a, then rolled off toward m (never above)
vec3 shKnee(vec3 c, float a, float m) {
  float l = shLuma(c);
  float k = l <= a ? l : a + (l - a) / (1.0 + (l - a) / max(m - a, 1e-3));
  return c * (k / max(l, 1e-5));
}
`,we=`
// sheen:begin
{
  vec3 shN = normal;
  vec3 shV = geometryViewDir;
  vec3 shAlb = diffuseColor.rgb;
  // R (view space) and its world height: world up in view space is viewMatrix[1].xyz, and every
  // environment reads R's height alone (the gold's also R · the sun)
  vec3 shRv = reflect(-shV, shN);
  float shRy = dot(shRv, viewMatrix[1].xyz);
  float shX = 1.0 - clamp(dot(shN, shV), 0.0, 1.0);
  float shX2 = shX * shX;
  float shFw = shX2 * shX2 * shX;
  // the baked occlusion (the vertex colours' green: their tints are near grey)
  #if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
    float shAO = clamp(vColor.g, 0.0, 1.0);
  #else
    float shAO = 1.0;
  #endif
  // the sun: its light here (after the shadow), its direction, how much of it the shadow lets through
  // (the shadow scales the light's colour evenly: one channel's ratio is it)
  vec3 shSunC = vec3(0.0);
  vec3 shSunL = vec3(0.0, 1.0, 0.0);
  float shVis = 1.0;
  #if NUM_DIR_LIGHTS > 0
    shSunC = directLight.color;
    shSunL = directLight.direction;
    shVis = clamp(directLight.color.g / max(directionalLights[ NUM_DIR_LIGHTS - 1 ].color.g, 1e-4), 0.0, 1.0);
  #endif
  // the environment's strength here: the kind's, the baked occlusion, a cast shadow's share of it
  float shEs = uShB.x * shAO * (1.0 - uShD.w * (1.0 - shVis));
  float shNL = dot(shN, shSunL);
  float shRL = max(dot(shRv, shSunL), 0.0);
#ifdef SH_METAL
  // the footprint: σ² of the normals one pixel covers (0 where a texel of the normal map is a pixel or more)
  #if defined( USE_NORMALMAP )
    vec2 shTx = vNormalMapUv * uShF.xy;
  #else
    vec2 shTx = vec2(0.0);
  #endif
  vec2 shDx = dFdx(shTx);
  vec2 shDy = dFdy(shTx);
  float shFp = max(dot(shDx, shDx), dot(shDy, shDy));
  float shSig = min(max(shFp - 1.0, 0.0) * ${xe.toFixed(4)}, ${Se.toFixed(3)});
  // the sub-pixel fallback: where a texel is smaller than a pixel (a far or thin trim, a reduced render
  // scale) the normal map's relief is filtered away and the studio's dark band and the dark metal
  // alias against the marble — the studio flattens to one level and more of the painted gold is kept;
  // not where R climbs into the zenith's broad light (roofs and crowns: nothing there to alias)
  float shSub = smoothstep(uShG.x, uShG.y, sqrt(shFp)) * (1.0 - smoothstep(${M.subUp[0].toFixed(2)}, ${M.subUp[1].toFixed(2)}, shRy));
  // the mesh without the relief: its interpolated normal (GoldTrim's rims tilt it across a band), the
  // facet's own (the view position's derivatives), their change over a pixel and over a unit (a rim
  // curves at 5–15 radians per unit, a dome or a smooth roof under 1)
  vec3 shNg = nonPerturbedNormal;
  vec3 shPx = dFdx(vViewPosition);
  vec3 shPy = dFdy(vViewPosition);
  vec3 shNf = normalize(cross(shPx, shPy));
  vec3 shGx = dFdx(shNg);
  vec3 shGy = dFdy(shNg);
  float shGx2 = dot(shGx, shGx);
  float shGy2 = dot(shGy, shGy);
  float shCv = 0.5 * (shGx2 + shGy2);
  float shRim = smoothstep(${M.rimK[0].toFixed(2)}, ${M.rimK[1].toFixed(2)}, sqrt(max(shGx2 / max(dot(shPx, shPx), 1e-10), shGy2 / max(dot(shPy, shPy), 1e-10))));
  // the gold: F0 the albedo's (pushed toward amber) and its own; the grazing rise toward white damped
  float shMetal = uShA.y;
  vec3 shGold = mix(shAlb, shAlb * vec3(1.0, 0.86, 0.62), uShD.z);
  vec3 shF0 = mix(vec3(uShA.x), clamp(mix(shGold * 1.25, SH_GOLD_F0, ${M.own.toFixed(2)}), 0.0, 1.0), shMetal);
  vec3 shF = shF0 + (vec3(1.0) - shF0) * (shFw * ${M.rim.toFixed(2)});
  // the polish: the ramp's bright rows (rims, ribs) take the sun's coat and the key light, its mid gold less
  float shPol = smoothstep(${M.polish[0].toFixed(2)}, ${M.polish[1].toFixed(2)}, shLuma(shAlb));
  // the studio along R (its bands as soft as the footprint; one level where a texel is sub-pixel, × the
  // sun-side factor)
  float shSide = ${(1-M.sunSide/2).toFixed(3)} + ${M.sunSide.toFixed(3)} * shRL * shRL;
  float shStu = mix(shStudioY(shRy, shRL, uShE, 0.5 * sqrt(shSig)), uShG.w * shSide, shSub);
  // the band's profile: a rim's crown (its normal tilted up from the facet's) lit from above, its lip
  // (tilted down) by the floors and clouds below — on rims 2.5 px wide or more (the tilt's change over a
  // pixel: a narrower band would alias)
  float shTu = dot(shNg - shNf, viewMatrix[1].xyz);
  float shPw = shRim * (1.0 - smoothstep(${M.band[0].toFixed(2)}, ${M.band[1].toFixed(2)}, fwidth(shTu)));
  shStu *= 1.0 + (uShI.x * smoothstep(${M.band[2].toFixed(2)}, ${M.band[3].toFixed(2)}, shTu) + uShI.y * smoothstep(${M.band[2].toFixed(2)}, ${M.band[3].toFixed(2)}, -shTu)) * shPw;
  vec3 shEnv = uShCity * SH_TINT * (shStu * shEs) * shF;
  // the sun: two GGX lobes, Schlick on L·H, α² widened by the footprint (2σ²) and the curvature over the
  // pixel — a sharp coat, a broad body over all of the gold (its sheen in the sun)
  float shK = 2.0 * shSig + min(shCv, 0.18);
  float shNV = clamp(dot(shN, shV), 1e-3, 1.0);
  vec3 shH = normalize(shSunL + shV);
  float shNH = clamp(dot(shN, shH), 0.0, 1.0);
  float shNLc = clamp(shNL, 0.0, 1.0);
  float shLH = 1.0 - clamp(dot(shSunL, shH), 0.0, 1.0);
  float shLH2 = shLH * shLH;
  vec3 shSunF = shSunC * (shF0 + (vec3(1.0) - shF0) * (shLH2 * shLH2 * shLH)) * (shNLc * uShA.w * shMetal);
  vec3 shCoat = shSunF * shDV(shNH, shNV, shNLc, min(uShH.x * uShH.x + shK, 1.0));
  vec3 shBody = shSunF * (shDV(shNH, shNV, shNLc, min(uShH.y * uShH.y + shK, 1.0)) * uShH.z);
  // the light the surface gets (its painted albedo's share): the key light's and the glints' scale
  float shLit = clamp(dot(reflectedLight.directDiffuse + reflectedLight.indirectDiffuse, vec3(0.3333)) / max(dot(shAlb, vec3(0.3333)), 0.05), 0.0, 1.5);
  // the coat on the ramp's bright rows; the key light, fixed to the view (upper left)
  vec3 shSpec = shCoat * shPol;
  float shKN = uShD.y / (1.0 + uShD.y * shSig);
  shSpec += shF0 * (pow(max(dot(shRv, vec3(-0.4511, 0.7018, 0.5514)), 0.0), 0.25 * shKN) * uShD.x * shLit * shMetal * shPol);
  // the lamps in the gold: their light on it (Lambert's, less the sun's) reflected as the metal's sheen
  vec3 shLamp = max(reflectedLight.directDiffuse - shSunC * (shNLc * RECIPROCAL_PI) * shAlb, vec3(0.0)) / max(shAlb, vec3(0.04));
  shSpec += shF0 * shLamp * (uShF.z * shMetal);
  // the ramp's white-gold texels: painted glints, lit as the surface is, where a texel spans 1.4 pixels
  // or more (none where one is a pixel or less: a far trim's glints would twinkle)
  shSpec += SH_WHITE_GOLD * (smoothstep(0.62, 0.8, shLuma(shAlb)) * (1.0 - smoothstep(0.5, 1.0, shFp)) * shLit * uShF.w * shMetal);
  // a glint: white-gold at its core and held at a luminance of 0.7 (the painting's (255, 242, 205)),
  // so the sun in polished gold is a few hot texels, never a bloom over the whole dome; the body under
  // the bloom's knee
  float shGl = shLuma(shSpec);
  shSpec = mix(shSpec, vec3(shGl) * SH_WHITE_GOLD, smoothstep(0.35, 1.6, shGl)) * min(1.0, 0.7 / max(shGl, 1e-4));
  shSpec += shKnee(shBody, 0.45, 0.8);
  // the rims' glints: the peaks of the sun's coat on the rims (its part over glintT; from 2 px: under that
  // the curvature over a pixel widens it away anyway), white-gold at their core, kneed to the cap — over
  // the bloom's threshold
  vec3 shGlint = shCoat * (shRim * (1.0 - smoothstep(0.12, 0.25, shCv)));
  float shGh = shLuma(shGlint);
  shGlint *= max(shGh - ${M.glintT.toFixed(2)}, 0.0) / max(shGh, 1e-5) * uShI.z;
  shGh = shLuma(shGlint);
  shGlint = shKnee(mix(shGlint, vec3(shGh) * SH_WHITE_GOLD, smoothstep(0.35, 1.6, shGh)), 0.6 * uShH.w, uShH.w);
  // a metal keeps part of its painted diffuse (more where sub-pixel; half of it by night: under the
  // dark sky its studio alone turns it black)
  float shKeep = mix(uShB.z, uShG.z, shSub);
  float shKd = mix(1.0 - uShB.x * max(shF.g - 0.04, 0.0), mix(shKeep, max(shKeep, 0.5), uShNight), shMetal);
  // the gold's shoulder: its colour, all but the rims' glints, kneed in luminance (sunlit gold stays gold)
  reflectedLight.directDiffuse = shKnee((reflectedLight.directDiffuse + reflectedLight.indirectDiffuse) * shKd + shSpec + shEnv, ${M.shoulder[0].toFixed(2)}, ${M.shoulder[1].toFixed(2)}) + shGlint;
#else
  // the stone: the hue mask makes the gold texels inside the marble and the floors metal — blue
  // under 0.55 of red by 0.05 (linear; a chroma (r − b) / r over ≈ 0.5, the darker the more), the
  // marble's and the floors' ramps never (≤ 0.29) — (the inlay: the gold's own F0, the city's warm
  // white at the kind's inlay level, studio[0])
  float shMetal = uShB.w * clamp((0.55 * shAlb.r - shAlb.b) * 20.0, 0.0, 1.0);
  float shFd = uShA.x + (1.0 - uShA.x) * shFw;
  // the stone's reflectivity (the floors' mask is exactly it)
  float shKs = min(shFd + uShC.y, 1.0) * shEs;
  vec3 shEnv = shEnvDielectricY(shRy, uShB.y, uShC.x) * ((1.0 - shMetal) * shKs) + uShCity * ((SH_INLAY_TINT * SH_GOLD_F0) * (uShE.x * shMetal * shEs));
  // the sun lobe: Phong on R·L at a quarter of the Blinn exponent (x^n as x · e^((n − 1)(x − 1)):
  // one transcendental), normalized as Blinn's, at F0 (the stone's lobes are broad and faint; the
  // inlay's the gold's F0); a glint held at the white-gold of luminance 0.7
  float shLobeS = shRL * exp2((0.25 * uShA.z - 1.0) * 1.4427 * (shRL - 1.0));
  vec3 shSpec = min(shSunC * (clamp(shNL, 0.0, 1.0) * shLobeS * (uShA.z + 8.0) * 0.0397887 * uShA.w) * mix(vec3(uShA.x), SH_GOLD_F0, shMetal), SH_WHITE_GOLD * 0.7);
  // marble's soft terminator: a rosy wrap of the sun round it (0 on the floors)
  float shW = clamp((shNL + uShC.z) / (1.0 + uShC.z), 0.0, 1.0) - clamp(shNL, 0.0, 1.0);
  reflectedLight.directDiffuse += shSunC * shAlb * vec3(0.3183, 0.2961, 0.2928) * shW;
  // polished marble's sunlit faces: a broad sheen of the sun over its lit side, × the lobe's strength
  // (the lit whites; never in shade, by night, on the gold inlay or the floors)
  reflectedLight.directDiffuse += shSunC * shAlb * (RECIPROCAL_PI * uShG.x * uShA.w * smoothstep(uShG.y, uShG.z, shNL) * (1.0 - shMetal) * (1.0 - uShNight));
  // a dielectric loses what it reflects over the bare marble's (F0 0.04: its painted albedo is the
  // unpolished stone's); the inlay keeps the metal's share of its painted gold
  float shKd = mix(1.0 - uShB.x * (max(shFd - 0.04, 0.0) + uShC.y), mix(uShB.z, max(uShB.z, 0.5), uShNight), shMetal);
  // the floors' reflectivity, where they face up (the mask): exactly the factor on their environment
  // (the face's normal read again from its varying: nothing held through the light loop for it)
  #ifdef FLAT_SHADED
    float shUpN = dot(nonPerturbedNormal, viewMatrix[1].xyz);
  #else
    float shUpN = dot(vNormal, viewMatrix[1].xyz) * inversesqrt(dot(vNormal, vNormal));
  #endif
  shRefl = uShC.w * (1.0 - shMetal) * shKs * clamp((shUpN - 0.92) * 14.3, 0.0, 1.0);
  // the gold's mark (MASK): a gold texel (the hue mask's half and over) off the floors' faces — a lip's gold
  // line —; a floor's gold seam keeps the floor's 1 − k (its k 0)
  shGoldMk = step(0.5, shMetal) * step(uShC.w * clamp((shUpN - 0.92) * 14.3, 0.0, 1.0), 0.5);
  // (Lambert's two terms summed here: three adds them right after)
  reflectedLight.directDiffuse = (reflectedLight.directDiffuse + reflectedLight.indirectDiffuse) * shKd + shSpec + shEnv;
#endif
  reflectedLight.indirectDiffuse = vec3(0.0);
}
// sheen:end
`,Te=`
if (uShMask > 0.5) gl_FragColor.a = 1.0 - min(shRefl, 0.98);
#if defined( OPAQUE ) && !defined( PREMULTIPLIED_ALPHA )
if (uShMask > 0.5 && shGoldMk > 0.5) gl_FragColor.a = SH_GOLD_MARK;
#endif
`,Ee=`
#if defined( OPAQUE ) && !defined( PREMULTIPLIED_ALPHA )
if (uShMask > 0.5) gl_FragColor.a = SH_GOLD_MARK;
#endif
`,Q=new WeakMap;function De(e,t){e.uShA.value.set(t.f0,t.metal,t.gloss,t.spec),e.uShB.value.set(t.env,t.rough,t.keep,t.hue),e.uShC.value.set(t.skyShare,t.polish,t.wrap,t.floor),e.uShD.value.set(t.key,t.keyN,t.amber,t.shade),e.uShE.value.set(t.studio[0],t.studio[1],t.studio[2],t.studio[3]),e.uShF.value.z=t.lamps,e.uShF.value.w=t.glints,t.metal>.5?e.uShG.value.set(t.sub[0],t.sub[1],t.sub[2],t.sub[3]):e.uShG.value.set(t.lit[0],t.lit[1],t.lit[2],0),e.uShH.value.set(t.lobes[0],t.lobes[1],t.lobes[2],t.lobes[3]),e.uShI.value.set(t.profile[0],t.profile[1],t.profile[2],0)}function $(e,t){if(!e||!e.isMeshLambertMaterial||Q.has(e)||e.userData.luminatiSnow)return!1;let n=Object.hasOwn(B,t)?B[t]:B.marble,i=e.normalMap?.image,a={kind:t,uShA:{value:new r},uShB:{value:new r},uShC:{value:new r},uShD:{value:new r},uShE:{value:new r},uShF:{value:new r(i?.width??0,i?.height??0,0,0)},uShG:{value:new r},uShH:{value:new r},uShI:{value:new r}};De(a,n),Q.set(e,a);let o=e.onBeforeCompile,s=e.customProgramCacheKey(),c=n.metal>.5;return e.onBeforeCompile=function(e,t){o.call(this,e,t),Object.assign(e.uniforms,q,{uShA:a.uShA,uShB:a.uShB,uShC:a.uShC,uShD:a.uShD,uShE:a.uShE,uShF:a.uShF,uShG:a.uShG,uShH:a.uShH,uShI:a.uShI,uShMask:J});let n=e.fragmentShader.replace(`#include <common>`,`#include <common>\n${c?`#define SH_METAL
`:``}${Ce}`).replace(`#include <aomap_fragment>`,`#include <aomap_fragment>\n${we}`);n=c?n.replace(`#include <opaque_fragment>`,`#include <opaque_fragment>\n${Ee}`):n.replace(`void main() {`,`void main() {
	float shRefl = 0.0;
	float shGoldMk = 0.0;`).replace(`#include <opaque_fragment>`,`#include <opaque_fragment>\n${Te}`),e.fragmentShader=n},e.customProgramCacheKey=()=>`${s}|${ve}${c?`:metal`:``}`,e.needsUpdate=!0,!0}var Oe=new Map([[`TileMap:sky_paving`,`floor`],[`TileMap:sky_plaza`,`floor`],[`TileMap:sky_inlay`,`floor`],[`TileMap:sky_marble`,`marble`],[`TileMap:sky_marble_lip`,`marble`]]);function ke(e,{dome:t=null,sky:n}={}){t&&be(t),n!==void 0&&q.uShCloud.value.copy(T(n).color),e?.object.traverse(e=>{let t=e.isMesh?e.material:null;if(!t||Array.isArray(t))return;let n=Oe.get(t.name);n&&$(t,n)})}export{ke as a,ie as c,ce as d,_e as f,C as h,$ as i,T as l,me as m,q as n,y as o,ae as p,J as r,v as s,Z as t,de as u};