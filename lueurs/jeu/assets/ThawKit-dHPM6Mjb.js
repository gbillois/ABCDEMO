import{Oo as e}from"./LevelStorage-C_bJYT5y.js";import{t}from"./GlobalUniforms-Hkw9cp0_.js";import{E as n,W as r,b as i,x as a}from"./WeatherLook-ChxdG-yb.js";import{n as o}from"./ThawField-DUWC1gaN.js";import{t as s}from"./ThawFx-DFkPXVLH.js";var c=Object.freeze({uThawRing:{value:[0,1,2,3].map(()=>new e(0,0,-1,0))},uThawFrost:{value:new e(0,1,0,0)}});function l(e,t,n){let r=e.rings,i=c.uThawRing.value;for(let e=0;e<4;e++)i[e].set(r[e*4],r[e*4+1],r[e*4+2],0);c.uThawFrost.value.set(t,n,0,0)}var u=`
uniform vec4 uThawRing[4];
uniform vec4 uThawFrost;
float thH(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float thN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(thH(i),thH(i+vec2(1.,0.)),f.x),mix(thH(i+vec2(0.,1.)),thH(i+1.),f.x),f.y);}
float thB2(vec2 a){a=floor(a);return fract(dot(a,vec2(.5,a.y*.75)));}
float thB4(vec2 a){return thB2(.5*a)*.25+thB2(a);}
float thS(vec2 p,float lead){
  float s=(1.-uThawFrost.x)*8.75;
  float w=(thN(p*.21)*.65+thN(p*.53+7.1)*.35-.5)*2.4;
  for(int i=0;i<4;i++){vec4 R=uThawRing[i];if(R.z>=0.)s=max(s,(R.z+lead+w-distance(p,R.xy))*clamp(11.67/max(R.z,.01),1.,6.));}
  return s;
}
float thFrozen(float s,vec2 px){return s<.75?step(s/.75,thB4(px)):0.;}
`,d=(e,t)=>`
  if(uThawFrost.x>0.){
    float thSn=thS(thW.xz,0.);
    float thF=thFrozen(thSn,thPx);
    float thWet=(1.-thF)*(1.-smoothstep(4.75,8.75,thSn));
    diffuseColor.rgb=mix(diffuseColor.rgb,snowL*vec3(.9,.96,1.12),${e}*max(thF,thWet));
    diffuseColor.rgb=diffuseColor.rgb*mix(vec3(1.),vec3(.74,.78,.86),thWet)+vec3(0.,.004,.012)*thWet;
    snowK=max(snowK,thF*uThawFrost.y*${t});
  }
`,f=d(`.35`,`1.`),p=`vec3 thW=(vec4(-vViewPosition,0.)*viewMatrix).xyz+cameraPosition;`,m=`mix(vec3(.46,.55,.72),vec3(.72,.78,.88),smoothstep(.02,.25,snowL))`,h=`
{
  ${p}
  vec3 snowN=inverseTransformDirection(normal,viewMatrix);
  float snowUp=smoothstep(.5,.86,snowN.y);
  float snowL=dot(diffuseColor.rgb,vec3(.299,.587,.114));
  float snowK=uSnowCover;
  vec3 thA=abs(snowN);
  vec2 thPx=floor((thA.y>.5?thW.xz:thA.x>thA.z?thW.zy:thW.xy)*16.);
  ${f}
  snowK*=snowUp*(.7+.25*smoothstep(.02,.2,snowL));
  diffuseColor.rgb=mix(diffuseColor.rgb,${m},snowK);
}
`,g=`
{
  ${p}
  vec3 snowN=inverseTransformDirection(normal,viewMatrix);
  float snowL=dot(diffuseColor.rgb,vec3(.299,.587,.114));
  float snowUp=smoothstep(.1,.62,snowN.y)*smoothstep(.04,.18,snowL);
  float snowK=uSnowCover;
  vec2 thPx=floor(thW.xy*16.);
  ${f}
  snowK*=snowUp*.92;
  diffuseColor.rgb=mix(diffuseColor.rgb,${m},snowK);
}
`,_=`
{
  ${p}
  float snowL=dot(diffuseColor.rgb,vec3(.299,.587,.114));
  float snowK=uSnowCover*smoothstep(.2,.95,vQuadUv.y)*.72;
  vec2 thPx=floor(vec2(thW.x+thW.z,thW.y)*16.);
  ${d(`.55`,`smoothstep(-.1,.7,vQuadUv.y)*.86`)}
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.72,.78,.88)*(.72+.5*sqrt(snowL)),snowK);
}
`,v=`
#ifdef FOLIAGE_BILLBOARD
{
  vec4 thR=uThawRing[0];
  vec3 thC=(modelMatrix*vec4(aCenter,1.)).xyz;
  float thSn=thR.z-distance(thC.xz,thR.xy);
  if(thR.z>=0.&&thSn>0.&&thSn<7.){
    vec2 thD=normalize(thC.xz-thR.xy+vec2(1e-3,0.));
    float thK=sin(thSn*1.7)*exp(-thSn*.45)*aSway*.16;
    mat3 thM=mat3(modelMatrix);
    transformed+=(vec3(thD.x,.35,thD.y)*thK*thM)/max(dot(thM[0],thM[0]),1e-6);
  }
}
#endif
#include <project_vertex>
`,y=`
  if(uThawFrost.x>0.){
    bool thSide=vWorldNormal.y<.5;
    vec2 thIp=thSide?vec2(dot(vWorldPos.xz,vec2(-vWorldNormal.z,vWorldNormal.x)),vWorldPos.y):vWorldPos.xz;
    vec2 thPx=floor(thIp*16.);
    float thSn=thS(vWorldPos.xz,3.);
    float thIce=thFrozen(thSn,thPx);
    if(thIce>0.){
      vec2 thC=(thPx+.5)/16.;
      float thDep=thSide?1.:texture2D(uShore,(thC-uShoreRect.xy)*uShoreRect.zw).g*uMaxDepth;
      float thQ=floor(clamp((thN(thC*.55)*.55+thN(thC*1.7+3.7)*.3+clamp(thDep/.5,0.,1.)*.45)*2.6-.3+(thB4(thPx)-.5)*.5,0.,2.));
      vec3 thA=thQ<.5?vec3(.624,.807,.871):thQ<1.5?vec3(.262,.527,.672):vec3(.068,.246,.392);
      float thCr=abs(thN(thC*1.15+11.)-.5);
      thA=mix(thA,thQ>1.5?vec3(.013,.068,.133):vec3(.068,.246,.392),step(thCr,.018)*step(.4,thN(thC*.5+5.)));
      thA=mix(thA,vec3(.855,.905,.939),step(.955,thH(thPx+17.))*step(thQ,1.5));
      if(thSide)thA=mix(vec3(.068,.246,.392),vec3(.262,.527,.672),step(.5,fract(thPx.y*.25+thH(vec2(thPx.x,3.))*.5)));
      vec3 thCol=thA*irrUp*(thSide?.8:1.);
      thCol=mix(thCol,sky,.1+.15*pow(1.-clamp(V.y,0.,1.),3.));
      col=mix(col,thCol,thIce);
      alpha=mix(alpha,1.,thIce);
    } else col*=mix(vec3(.55,.62,.72),vec3(1.),smoothstep(.75,6.,thSn));
  }
`,b=`col = lmSaturate(col, mix(uSaturation, 1.0, night));`;function x(e,t){if(!e||e.userData.luminatiThaw)return;e.userData.luminatiThaw=t;let r=e.userData.luminatiSnow===`foliage`?i:e.userData.luminatiSnow?a:null;e.userData.luminatiSnow=`thaw-${t}`;let o=e.onBeforeCompile,s=e.customProgramCacheKey(),l=t===`foliage`?_:t===`canopy`?g:h;e.onBeforeCompile=function(e,i){o.call(this,e,i),e.uniforms.uSnowCover=n,e.uniforms.uThawRing=c.uThawRing,e.uniforms.uThawFrost=c.uThawFrost;let a=e.fragmentShader;a=a.replace(`#include <common>`,`#include <common>\n${a.includes(`uniform float uSnowCover;`)?``:`uniform float uSnowCover;
`}${u}`),a=r&&a.includes(r)?a.replace(r,l):a.replace(`#include <emissivemap_fragment>`,`${l}\n#include <emissivemap_fragment>`),e.fragmentShader=a,t===`canopy`&&(e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
uniform vec4 uThawRing[4];`).replace(`#include <project_vertex>`,v))},e.customProgramCacheKey=()=>`${s}|luminati-thaw-${t}`,e.needsUpdate=!0}function S(e){let t=e?.material;if(!t||t.userData.luminatiThaw)return;t.userData.luminatiThaw=`water`;let n=t.onBeforeCompile,r=t.customProgramCacheKey();t.onBeforeCompile=function(e,t){n.call(this,e,t),e.uniforms.uThawRing=c.uThawRing,e.uniforms.uThawFrost=c.uThawFrost,e.fragmentShader=e.fragmentShader.replace(`void main() {`,`${u}\nvoid main() {`).replace(b,`${y}\n  ${b}`)},t.customProgramCacheKey=()=>`${r}|luminati-ice`,t.needsUpdate=!0}function C(e){let t=new Set(e.textures._materials.values()),n=new Set(e.emissiveEntries.map(e=>e.material));e.glassMaterial&&n.add(e.glassMaterial);let r=new Set(e.groundDetail?.fields.map(e=>e.material)??[]),i=new Map;e.root.traverse(a=>{let o=a.isMesh?a.material:null;if(!o||Array.isArray(o)||!o.isMeshLambertMaterial||!o.colorWrite||n.has(o))return;let s=r.has(o)?`foliage`:o.userData.billboard?`canopy`:`ground`;if(!t.has(o)){x(o,s);return}let c=i.get(o);c||(c=o.clone(),c.onBeforeCompile=o.onBeforeCompile,c.customProgramCacheKey=o.customProgramCacheKey,c.userData={...o.userData},x(c,s),i.set(o,c),e.factory._ownMaterials.add(c)),a.material=c}),S(e.water)}function w(e){let t=e.width,n=e.depth,r=new Float32Array(t*n).fill(NaN);e.forEachTile((e,n,i)=>{i.water&&(r[n*t+e]=i.waterSurface)});let i=new Uint8Array(t*n),a=(e,a,o)=>e<t&&a<n&&!i[a*t+e]&&r[a*t+e]===o,o=[];for(let e=0;e<n;e++)for(let n=0;n<t;n++){let s=r[e*t+n];if(s!==s||i[e*t+n])continue;let c=1;for(;c<8&&a(n+c,e,s);)c++;let l=1;for(;l<8;){let t=!0;for(let r=0;r<c&&t;r++)t=a(n+r,e+l,s);if(!t)break;l++}for(let r=0;r<l;r++)for(let a=0;a<c;a++)i[(e+r)*t+n+a]=1;o.push({rect:{minX:n,maxX:n+c,minZ:e,maxZ:e+l,y:s+.02},on:!1})}return o}var T=[[.624,.807,.871],[.262,.527,.672],[.068,.246,.392],[.013,.068,.133],[.855,.905,.939]],E={sheet:{uC0:1,uC1:2,uC2:3,uC3:0,uFoam:4},pool:{uFoam:4,uC0:0}};function D(e){let t=[];return e.traverse(e=>{let n=e.isMesh?e.material:null;n?.name===`Luminati:Waterfall`?t.push({m:n,kind:`sheet`}):n?.name===`Luminati:WaterfallPool`&&t.push({m:n,kind:`pool`})}),t}function O(e,n,r,i=-1){let a=[],o=t.uTime.value;if(e.falls.forEach((s,c)=>{if(i>=0&&c!==i)return;let l=s,u=e.waterfalls[c];if(!u)return;l.thaw??={frozen:!1,splash:s.splash,at:o,mist:e.propEmitters.filter(e=>e.config?.preset===`mist`&&Math.hypot(e.position.x-s.anchor.x,e.position.z-s.anchor.z)<2.5)};let d=l.thaw;for(let e of d.mist)r?n.frozenMist.add(e):n.frozenMist.delete(e);if(d.frozen===r)return;d.frozen=r,a.push(c);for(let{m:e,kind:t}of D(u.object)){let n=e.uniforms,i=e.userData.thawSaved??=Object.fromEntries(Object.keys(E[t]).map(e=>[e,n[e].value.clone()]));for(let[e,a]of Object.entries(E[t]))r?n[e].value.setRGB(T[a][0],T[a][1],T[a][2]):n[e].value.copy(i[e])}r&&(d.at=o);let f=o-d.at,p=r?{value:d.at}:{get value(){return t.uTime.value-f}};for(let{m:e}of D(u.object))e.uniforms.uTime=p;s.splash=!r&&d.splash}),a.length){e.fallAnchors.length=0;for(let t of e.falls)t.splash&&!t.hidden&&e.fallAnchors.push(t.anchor)}return a}function k(e){let t={x:0,y:-1e3,z:0},n={life:[.05,.05],size:[.1,.1]};for(let r of[`smoke`,`sparkle`,`snow`,`petals`,`leaves`,`splash`])e.burst(r,t,1,n);e.burst(`splash`,t,1,{...n,...s})}function A(e){let t=r(e.env);if(!t)return;C(e);let n={unless:t.until},i=!e.story||!!e.story.present(n);if(t.ice&&e.water){let t=w(e.tileMap);for(let n of t)n.on=i,i&&e.tileMap.addWalkSurface(n.rect);e.thawIce={chunks:t,test:n,at:null}}e._defer(()=>k(e.particles))}function j(e,t){e&&t>0&&S(e);for(let e of c.uThawRing.value)e.set(0,0,-1,0);c.uThawFrost.value.set(t,1,0,0);let n=t>0;(o.active!==n||o.frozen!==n)&&o.reset(n,n)}export{c as THAW_UNIFORMS,O as freezeFalls,w as iceChunks,x as patchMaterial,S as patchWater,A as prepareWorld,j as previewFrost,k as primeThawPools,l as syncUniforms};