import{Br as e,Ci as t,Do as n,Ir as r,Pr as i,Ui as a,Ur as o,Wi as s,Zr as c,_o as l,co as u,fo as d,kr as f,ra as p,sa as m,wi as h,yi as g,yr as _}from"./LevelStorage-C_bJYT5y.js";import{_ as v,o as y,s as b,u as x}from"./Trees-fTuW5H_M.js";import{t as S}from"./GlobalUniforms-Hkw9cp0_.js";import{f as C,t as w}from"./SmallProps-jKLn0VlM.js";import{n as T}from"./ThawField-DUWC1gaN.js";var E=(e=.5,t=.62)=>(n,i)=>t+(1-t)*r(-.05,e,i),D=(e,t,n,r)=>f(Number.isFinite(e)?e:t,n,r),O=[`spire`,`mesa`,`arch`,`pillar`,`boulders`,`hoodoo`];function k(e,t,n,r,i,a){let o=r.length,s=e.mat(t.side),c=e.mat(t.top),l=e.units(s),u=e.units(c);for(let t=0;t<n.length;t++){let d=n[t],f=n[t+1],p=d.taper??1,m=r.map(e=>e*(1+(a()-.5)*.08)),h=(e,t)=>m.map((n,r)=>{let i=r/o*Math.PI*2;return[d.cx+Math.cos(i)*d.rx*n*t,e,d.cz+Math.sin(i)*d.rz*n*t]}),g=h(d.y0,1),_=h(d.y1,p),v=f&&f.rx>d.rx*p*1.02,y=d.dark??1,b=0;for(let t=0;t<o;t++){let n=(t+1)%o,r=g[t],c=g[n],u=_[n],f=_[t],p=Math.hypot(c[0]-r[0],c[2]-r[2]),m=(.9+.14*a())*y,h=m*(v?.72:1);e.quad(s,[r,f,u,c],[[b/l[0],(i+d.y0)/l[1]],[b/l[0],(i+d.y1)/l[1]],[(b+p)/l[0],(i+d.y1)/l[1]],[(b+p)/l[0],(i+d.y0)/l[1]]],{colors:[[m,m,m],[h,h,h],[h,h,h],[m,m,m]]}),b+=p}if(d.cap!==!1){let t=[d.cx,d.y1,d.cz],n=e=>[e[0]/u[0],-e[2]/u[1]],r=1.06*y;for(let i=0;i<o;i++){let a=(i+1)%o;e.tri(c,t,_[a],_[i],n(t),n(_[a]),n(_[i]),{normal:[0,1,0],color:[r,r,r]})}}if(d.under){let t=[d.cx,d.y0,d.cz],n=e=>[e[0]/u[0],e[2]/u[1]];for(let r=0;r<o;r++){let i=(r+1)%o;e.tri(c,t,g[r],g[i],n(t),n(g[r]),n(g[i]),{normal:[0,-1,0],color:[.55,.55,.55]})}}}}function A(e,t,n){let r=Array.from({length:t},()=>1+e.range(-n,n));return r.map((e,n)=>(r[(n+t-1)%t]+e*2+r[(n+1)%t])/4)}function j(e,t,n){let r=t.slice();for(let t=0;t<n;t++)r[e.int(0,r.length-1)]*=e.range(.62,.75);return r}function M(e,t,{thin:n=.45,unit:r=1}={}){let i=[0],a=0;for(;a<t-.01;){let o=e.chance(n)?.5*r:r;a=Math.min(t,a+o),t-a<.3&&(a=t),i.push(a)}return i}function N(e,t,r,a,o={}){let s=O.includes(o.kind)?o.kind:`spire`,c=o.stone===`ice`,l=c?I(e):w[_(w,o.stone)?o.stone:`sandstone`],u=D(o.height,6,1,24),d=D(o.width,2.5,.8,14),p=e.rng(`crag`,t,a,o.seed),m=()=>p.next(),h=e.builder(E(f(u*.25,.5,2.2),.66)),g=[];switch(s){case`mesa`:{let e=A(p,f(Math.round(8+d*.9),9,18),.16),t=p.range(.72,1),n=d/2,i=M(p,u,c?{thin:.35,unit:2}:{thin:.35}),a=[{y0:-.2,y1:Math.min(.5,u*.2),cx:0,cz:0,rx:n*1.12,rz:n*1.12*t,taper:.93}];for(let e=0;e<i.length-1;e++){if(i[e+1]<=a[0].y1)continue;let r=p.chance(.4),o=n*(r?1.02:p.range(.9,.97))*(1-.06*(i[e]/u));a.push({y0:Math.max(i[e],a[0].y1),y1:i[e+1],cx:0,cz:0,rx:o,rz:o*t,taper:r?1:.97})}if(u>3&&d>4&&p.chance(.45)){let e=n*p.range(.32,.45),r=p.range(-.25,.25)*n,i=p.range(-.25,.25)*n*t,o=f(u*p.range(.25,.4),1,4),s=u;for(let n of M(p,o))n>0&&(a.push({y0:s,y1:u+n,cx:r,cz:i,rx:e*(1-n/o*.1),rz:e*t*(1-n/o*.1),taper:.97}),s=u+n)}k(h,l,a,e,r,m);let o=n*t,s=n-o,_=s>.25?Math.max(2,Math.ceil(s/Math.max(.5,o*.8))+1):1;for(let e=0;e<_;e++)g.push([_===1?0:-s+2*s*e/(_-1),0,o*1.1]);let v=p.int(2,4);for(let e=0;e<v;e++){let e=p.range(0,Math.PI*2),r=p.range(.28,.5)*Math.min(1.6,d/4);C(h,Math.cos(e)*n*1.12,0,Math.sin(e)*n*1.12*t,[r,r*.7,r*.9],p,{top:l.top,side:l.side,detail:0,yaw:e})}break}case`arch`:P(h,l,d,u,r,p,g);break;case`boulders`:{let e=p.int(4,6),t=d/2;for(let n=0;n<e;n++){let r=n===0,i=n/e*Math.PI*2+p.range(-.4,.4),a=r?p.range(0,.15)*t:t*p.range(.45,.7),o=(r?.5:p.range(.24,.36))*d*.6,s=Math.min(r?u*.95:u*p.range(.35,.6),o*2.4),c=Math.cos(i)*a,f=Math.sin(i)*a;C(h,c,r?0:p.range(0,.15),f,[o,s/1.22,o*p.range(.8,1)],p,{top:l.top,side:l.side,detail:1,yaw:p.range(0,6.28),flatTop:p.range(.1,.3),rough:.25}),g.push([c,f,o*.92])}for(let e=0;e<4;e++){let e=p.range(0,Math.PI*2),n=p.range(.12,.22)*Math.min(2,d/2.5);C(h,Math.cos(e)*t*1.05,0,Math.sin(e)*t*1.05,[n,n*.7,n*.9],p,{top:l.top,side:l.side,detail:0})}break}case`hoodoo`:{let e=j(p,A(p,9,.2),1),t=f(u*.16,.5,1.6),n=u-t,a=M(p,n,{thin:.75}),o=[],s=d*.27,c=p.range(2.2,3.4),_=p.range(0,6.28),v=0,y=0;for(let e=0;e<a.length-1;e++){let t=a[e]/n,r=1+.16*Math.sin(t*Math.PI*c+_),l=1+.45*(1-t)**4,u=s*i(1.05,.62,t)*r*l;o.push({y0:e===0?-.2:a[e],y1:a[e+1],cx:v,cz:y,rx:u,rz:u*p.range(.88,1),taper:.95}),v+=p.range(-.05,.05)*s,y+=p.range(-.05,.05)*s}let b=d*p.range(.4,.5),x=A(p,9,.24),S=v+p.range(-.1,.1)*b,C=y+p.range(-.1,.1)*b;k(h,l,o,e,r,m),k(h,l,[{y0:n,y1:n+t*.55,cx:S,cz:C,rx:b,rz:b*p.range(.82,1),taper:1.02,under:!0,dark:.78},{y0:n+t*.55,y1:u,cx:S+p.range(-.08,.08),cz:C,rx:b*.92,rz:b*.8,taper:.8,dark:.82}],x,r,m),g.push([0,0,s*1.25]);break}case`pillar`:{let e=l.side===`basalt_cliff`,t=A(p,e?6:10,e?.04:.12),n=M(p,u,c?{thin:.4,unit:2}:{thin:.4}),i=d*.42,a=n.slice(0,-1).map((e,t)=>{let r=p.chance(.35),a=i*(r?1.04:p.range(.92,.98))*(1-e/u*.08);return{y0:e,y1:n[t+1],cx:0,cz:0,rx:a,rz:a,taper:r?1:.97}});a[0].y0=-.2,k(h,l,a,t,r,m),g.push([0,0,i*1]);break}default:{let e=j(p,A(p,c?f(Math.round(5+d*.5),6,8):f(Math.round(7+d),8,12),c?.3:.24),p.int(1,2)),t=M(p,u,c?{thin:.15,unit:2.4}:{thin:.55}),n=d/2,i=[p.range(-.05,.05),p.range(-.05,.05)],a=p.range(1.5,2.6),o=p.range(0,6.28),s=[],_=0,v=0,y=p.int(1,3);for(let e=0;e<t.length-1;e++){let r=t[e]/u,l=e===y;l&&(y+=p.int(2,4));let d=n*(1-(c?.8:.74)*r)**(c?1.1:.85)*(1+.1*Math.sin(r*Math.PI*a+o))*(l?c?1.04:1.1:p.range(.9,.97));s.push({y0:e===0?-.2:t[e],y1:t[e+1],cx:_,cz:v,rx:d,rz:d*p.range(.86,1),taper:l?.97:c?.84:.92}),_+=(i[0]+p.range(-.04,.04))*Math.min(1,t[e+1]-t[e])*n,v+=(i[1]+p.range(-.04,.04))*Math.min(1,t[e+1]-t[e])*n}let b=s[s.length-1],x=c?f(u*.22,.8,3.2):f(u*.1,.4,1.2);s.push({y0:u,y1:u+x,cx:b.cx+p.range(-.15,.15)*n,cz:b.cz+p.range(-.15,.15)*n,rx:b.rx*(c?.9:.62),rz:b.rz*(c?.8:.5),taper:c?.08:.5}),k(h,l,s,e,r,m);let S=p.range(0,6.28),w=b.rx*.3;C(h,b.cx+Math.cos(S)*b.rx*.6,u-.05,b.cz+Math.sin(S)*b.rx*.6,[w,w*.8,w*.9],p,{top:l.top,side:l.side,detail:0,sink:.1}),g.push([0,0,n*.95])}}c&&s!==`arch`&&L(h,l,p,d*.55,4);let v=e.finish(h,`crag:${s}`,t,r,a,Number.isFinite(o.rotation)?o.rotation:p.range(0,Math.PI*2)),y=g.map(([t,r,i])=>{let a=e.world(v,new n(t,0,r));return{type:`circle`,x:a.x,z:a.z,r:i}});return e.result(v,{colliders:y})}function P(e,t,n,a,o,s,c){let l=e.mat(t.side),u=e.mat(t.top),d=e.units(l),p=e.units(u),m=n/2,h=f(n*.19,.5,2.6),g=m-h,_=a*s.range(.32,.42),v=a*s.range(.66,.74),y=[];for(let e=0;e<=18;e++){let t=-m+e/18*n,o=Math.abs(t)/m,c=Math.abs(t)<g,l=c?_+(v-_)*Math.sqrt(Math.max(0,1-(t/g)**2)):0,u=a*(1-.1*o*o)+s.range(-.1,.1),d=c?0:r(g,m,Math.abs(t))**.5,f=(c?i(h*.95,h*1.35,Math.abs(t)/g):h*(1.4+.25*d))*s.range(.92,1.08),p=s.range(-.06,.06);y.push({x:t,bottom:l,top:u,zf:p+f/2,zb:p-f/2,ch:Math.min(.32,f*.22,(u-l)*.2)})}let b=e=>{let{zf:t,zb:n,top:r,bottom:i,ch:a}=e;return[[t,i+a],[t,r-a],[t-a,r],[n+a,r],[n,r-a],[n,i+a],[n+a,i],[t-a,i]]},x=[`f`,`c`,`t`,`c`,`k`,`c`,`u`,`c`],S=[.98,1.02,1.06,.96,.9,.72,.6,.72],w=e=>(o+e)/d[1];for(let t=0;t<18;t++){let n=y[t],r=y[t+1],i=b(n),a=b(r),o=.92+.12*s.next();for(let t=0;t<8;t++){let s=x[t];if(s===`u`&&n.bottom<.01&&r.bottom<.01)continue;let c=(t+1)%8,f=[n.x,i[t][1],i[t][0]],m=[[n.x,i[c][1],i[c][0]],f,[r.x,a[t][1],a[t][0]],[r.x,a[c][1],a[c][0]]],h=o*S[t],g=[h,h,h];if(s===`t`)e.quad(u,m,m.map(e=>[e[0]/p[0],-e[2]/p[1]]),{color:g});else if(s===`u`)e.quad(l,m,m.map(e=>[e[0]/d[0],e[2]/d[1]]),{color:g});else{let n=s===`k`||s===`c`&&t>=3&&t<=5?-1:1;e.quad(l,m,m.map(e=>[n*e[0]/d[0],w(e[1])]),{color:g})}}}for(let t of[-1,1]){let n=y[t<0?0:18],r=b(n),i=[n.x,(n.top+n.bottom)/2,(n.zf+n.zb)/2];for(let a=0;a<8;a++){let o=[n.x,r[a][1],r[a][0]],s=[n.x,r[(a+1)%8][1],r[(a+1)%8][0]],c=t<0?[i,o,s]:[i,s,o];e.tri(l,c[0],c[1],c[2],...c.map(e=>[e[2]/d[0],w(e[1])]),{normal:[t,0,0],color:[.94,.94,.94]})}}for(let n of[-1,1]){c.push([n*(m-h/2),0,h*.7]);for(let r=0;r<3;r++){let r=s.range(.16,.3)*Math.min(1.8,h*1.5);C(e,n*(m+s.range(-.3,.35)),0,s.range(-1,1)*h*.8,[r,r*.7,r*.9],s,{top:t.top,side:t.side,detail:0,yaw:s.range(0,6.28)})}}}var F=`#5fd8f0`;function I(e){return{top:e.textures.material(`ice_crag_top`,{vertexColors:!0}),side:e.textures.material(`ice_crag`,{vertexColors:!0,emissive:new c(F),emissiveIntensity:1})}}function L(e,t,r,i,a){let o=new n(0,1,0);for(let s=0;s<a;s++){let a=r.range(0,Math.PI*2),s=i*r.range(.85,1.15),c=r.range(.6,1.5),l=r.range(.1,.22),u=new n(Math.cos(a)*r.range(.2,.5),1,Math.sin(a)*r.range(.2,.5)).normalize();e.push([Math.cos(a)*s,-.1,Math.sin(a)*s],new m().setFromUnitVectors(o,u)),e.lathe(t.side,[{y:0,r:l},{y:c*.7,r:l*.85},{y:c,r:.01}],{segments:5,phase:r.range(0,3),smooth:!1}),e.pop()}}var R=(e=.4,t=.8)=>(n,i)=>t+(1-t)*r(-.05,e,i);function z(e,t,n,r,i={}){let a=f(Number.isFinite(i.size)?Number(i.size):1,.3,2.5),o=Number.isFinite(i.rotation)?Number(i.rotation):null;if(i.stone===`snow`){let s=e.rng(`rock:snow`,t,r,i.seed),c=e.builder(R()),l=e.textures.material(`snow_drift`,{vertexColors:!0}),u=1.25*a*s.range(.85,1.15),d=.38*a*s.range(.8,1.15),f=.9*a*s.range(.85,1.15);C(c,0,0,0,[u,d,f],s,{top:l,side:l,detail:2,rough:.1,flatTop:.25,sink:.35,tint:[.96,.97,1]}),C(c,u*.7,0,f*s.range(-.4,.4),[u*.55,d*.7,f*.6],s,{top:l,side:l,detail:1,rough:.1,flatTop:.2,sink:.35});let p=c.build(`rock:snow`,{castShadow:!1});e.track(p.geometries);let m=p.group;m.userData.dynamic=!0,m.rotation.y=o??s.range(0,Math.PI*2);let h=new g;h.name=`rock:snow`,h.position.set(t,n,r),h.add(m),h.updateMatrixWorld(!0);let _=-1;return e.result(h,{update:e=>{let n=T.at(t,r)>=.5?0:1;_<0?_=n:_!==n&&(_=n>_?Math.min(1,_+e/2):Math.max(0,_-e/2.5));let i=_*_*(3-2*_);m.visible=i>.002,m.scale.set(.8+.2*i,i,.8+.2*i)}})}let s=e.rng(`rock:ice`,t,r,i.seed),c=I(e),l=e.builder(R(.4*a,.7)),u=.72*a*s.range(.85,1.15),d=.66*a*s.range(.85,1.15),p=.62*a*s.range(.85,1.15);C(l,0,0,0,[u,d,p],s,{top:c.top,side:c.side,detail:+(a>.55),rough:.4,flatTop:i.flat?.3:.05}),a>=.8&&L(l,c,s,Math.max(u,p)*.9,2);let m=e.finish(l,`rock:ice`,t,n,r,o??s.range(0,Math.PI*2)),h=[{type:`circle`,x:t,z:r,r:Math.max(u,p)*.95}];return e.result(m,{colliders:h})}var B=new p(1,1).translate(0,.5,0),V=new p(1,1),H=`
uniform float uCameraYaw;
attribute vec3 iCenter;
attribute vec2 iSize;
attribute vec4 iParam;
varying vec2 vUv;
flat varying float vSeed;
flat varying float vIntensity;
flat varying float vSpeed;
flat varying vec2 vPx;
#include <common>
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vSeed = iParam.x;
  vIntensity = iParam.y;
  vSpeed = iParam.z;
  // the pixel grid of the quad (Flame.js createFlameMaterial: max(4, round(size * PPU)))
  vPx = max( vec2( 4.0 ), floor( iSize * ${16 .toFixed(1)} + 0.5 ) );
  vec3 wCenter = ( modelMatrix * vec4( iCenter, 1.0 ) ).xyz;
  vec3 right = vec3( cos( uCameraYaw ), 0.0, - sin( uCameraYaw ) );
  vec3 toCam = vec3( sin( uCameraYaw ), 0.0, cos( uCameraYaw ) );
  vec3 wPos = wCenter + right * position.x * iSize.x + vec3( 0.0, 1.0, 0.0 ) * position.y * iSize.y + toCam * iParam.w;
  vec4 mvPosition = viewMatrix * vec4( wPos, 1.0 );
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`,U=`
uniform float uTime;
uniform vec3 uFire[ 6 ];
varying vec2 vUv;
flat varying float vSeed;
flat varying float vIntensity;
flat varying float vSpeed;
flat varying vec2 vPx;
#define uSeed vSeed
#define uIntensity vIntensity
#define uSpeed vSpeed
#define uPx vPx
${y}`,W=`
uniform float uCameraYaw;
attribute vec3 iCenter;
attribute vec2 iSize;
attribute vec4 iParam;
varying vec2 vUv;
flat varying float vSeed;
flat varying float vIntensity;
flat varying float vBaseV;
#include <common>
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vSeed = iParam.x;
  vIntensity = iParam.y;
  // iSize: (card size, flame height); the card is centred 0.4 of the flame up (Flame.js createFlame)
  float gs = max( iSize.x, 1e-3 );
  vBaseV = 0.5 - ( iSize.y * 0.4 ) / gs;
  vec3 wCenter = ( modelMatrix * vec4( iCenter + vec3( 0.0, iSize.y * 0.4, 0.0 ), 1.0 ) ).xyz;
  vec3 right = vec3( cos( uCameraYaw ), 0.0, - sin( uCameraYaw ) );
  vec3 toCam = vec3( sin( uCameraYaw ), 0.0, cos( uCameraYaw ) );
  vec3 wPos = wCenter + ( right * position.x + vec3( 0.0, 1.0, 0.0 ) * position.y ) * iSize.x - toCam * 0.05;
  vec4 mvPosition = viewMatrix * vec4( wPos, 1.0 );
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`,G=`
uniform float uTime;
uniform float uNight;
uniform float uDay;
uniform vec3 uColor;
varying vec2 vUv;
flat varying float vSeed;
flat varying float vIntensity;
flat varying float vBaseV;
#define uSeed vSeed
#define uIntensity vIntensity
#define uBaseV vBaseV
${b}`,K=`
uniform float uTime;
uniform vec2 uWind;
uniform float uWindStrength;
attribute vec3 iCenter;
attribute vec2 iSize;
attribute vec4 iParam;
varying float vHeat;
flat varying float vTw;
#include <common>
#include <fog_pars_vertex>
float sh( float n ) { return fract( sin( n * 12.9898 + 4.1414 ) * 43758.5453 ); }
void main() {
  float seed = fract( iParam.x * 0.0137 ) * 97.0;
  // (time wrapped: the hash and the phase keep their precision in a long session)
  float t = fract( mod( uTime, 600.0 ) * iParam.y * ( 0.65 + 0.7 * sh( seed + 0.3 ) ) + sh( seed ) );
  float a = sh( seed + 1.7 ) * 6.2831853;
  float r = sqrt( sh( seed + 3.1 ) ) * iSize.x;
  vec3 p = iCenter + vec3( cos( a ) * r, 0.0, sin( a ) * r );
  float rise = iSize.y * ( 0.55 + 0.45 * sh( seed + 5.3 ) );
  p.y += rise * ( t + 0.4 * t * t );
  p.xz += uWind * uWindStrength * ( 0.35 * t * rise );
  p.x += sin( t * 9.0 + seed * 3.0 ) * 0.2 * t;
  p.z += cos( t * 7.0 + seed * 5.0 ) * 0.2 * t;
  float size = iParam.z * ( 1.0 - 0.5 * t ) * step( 1e-4, iSize.y );
  vec4 mvPosition = viewMatrix * ( modelMatrix * vec4( p, 1.0 ) );
  mvPosition.xy += position.xy * size;
  gl_Position = projectionMatrix * mvPosition;
  vHeat = 1.0 - t;
  vTw = sh( seed + 9.1 );
  #include <fog_vertex>
}
`,q=`
uniform float uTime;
uniform vec3 uFire[ 6 ];
varying float vHeat;
flat varying float vTw;
#include <common>
#include <fog_pars_fragment>
void main() {
  // cooling: white-gold, gold, orange, red; fading out at the end; a twinkle
  vec3 col = vHeat > 0.8 ? uFire[ 4 ] * 1.6 : vHeat > 0.5 ? uFire[ 3 ] * 1.9 : vHeat > 0.22 ? uFire[ 2 ] * 2.0 : uFire[ 1 ] * 2.0;
  float tw = 0.7 + 0.3 * step( 0.5, fract( uTime * 7.0 + vTw * 13.0 ) );
  float k = smoothstep( 0.0, 0.18, vHeat ) * tw;
  if ( k < 0.01 ) discard;
  gl_FragColor = vec4( col * k, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #ifdef USE_FOG
    // additive: fade the contribution out with fog instead of tinting toward the fog colour
    #ifdef FOG_EXP2
      float fogF = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
    #else
      float fogF = smoothstep( fogNear, fogFar, vFogDepth );
    #endif
    gl_FragColor.rgb *= 1.0 - fogF;
  #endif
}
`,J={flame:{base:B,reach:.6,order:0},glow:{base:V,reach:.6,order:e.PARTICLES+5},spark:{base:V,reach:1.2,order:e.PARTICLES+4}};function Y(e){return{flame:e._cachedMaterial(`siege:flame`,()=>{let e=l.merge([v.fog,{uFire:{value:x()}}]);return e.uTime=S.uTime,e.uCameraYaw=S.uCameraYaw,e.uFogStart=S.uFogStart,new u({name:`luminati:flameBatch`,uniforms:e,vertexShader:H,fragmentShader:U,fog:!0,side:2})}),glow:e._cachedMaterial(`siege:glow`,()=>{let e=l.merge([v.fog,{uDay:{value:.25},uColor:{value:new c(16747066)}}]);return e.uTime=S.uTime,e.uCameraYaw=S.uCameraYaw,e.uNight=S.uNight,e.uFogStart=S.uFogStart,new u({name:`luminati:flameBatchGlow`,uniforms:e,vertexShader:W,fragmentShader:G,fog:!0,transparent:!0,depthWrite:!1,blending:2,side:2})}),spark:e._cachedMaterial(`siege:spark`,()=>{let e=l.merge([v.fog,{uFire:{value:x()}}]);return e.uTime=S.uTime,e.uWind=S.uWind,e.uWindStrength=S.uWindStrength,e.uFogStart=S.uFogStart,new u({name:`luminati:flameBatchSparks`,uniforms:e,vertexShader:K,fragmentShader:q,fog:!0,transparent:!0,depthWrite:!1,blending:2,side:2})})}}function X(e,r,i,a,s,c){let l=new h;l.setIndex(e.index.clone()),l.setAttribute(`position`,e.attributes.position.clone()),l.setAttribute(`uv`,e.attributes.uv.clone()),l.setAttribute(`iCenter`,new t(r,3)),l.setAttribute(`iSize`,new t(i,2)),l.setAttribute(`iParam`,new t(a,4)),l.instanceCount=s;let u=new o,f=new n;for(let e=0;e<s;e++){let t=Math.max(i[e*2],i[e*2+1])*c;f.fromArray(r,e*3),u.expandByPoint(f.set(f.x-t,f.y-.1,f.z-t)),f.fromArray(r,e*3),u.expandByPoint(f.set(f.x+t,f.y+t*2,f.z+t))}return l.boundingBox=u,l.boundingSphere=u.getBoundingSphere(new d),l}function Z(e,t,n,r,i,a,o){let c=J[e],l=new s(X(c.base,n,r,i,a,c.reach),t);return l.name=o,l.userData.flameBatch=e,l.renderOrder=c.order,l.castShadow=!1,l.receiveShadow=!1,l}var Q=class{constructor(){this.flames=[],this.sparks=[]}add(e){return this.flames.push(e),this}spark(e){return e.count>0&&this.sparks.push(e),this}get count(){return this.flames.length}build(e){let t=this.flames.filter(e=>(e.glow??0)>0),n=0;for(let e of this.sparks)n+=Math.round(e.count);if(!this.flames.length&&!n)return null;let r=Y(e),i=new g;i.name=`flames`;let a=[],o=e=>{i.add(e),a.push(e.geometry)};if(this.flames.length){let e=this.flames.length,t=new Float32Array(e*3),n=new Float32Array(e*2),i=new Float32Array(e*4);this.flames.forEach((e,r)=>{t.set([e.x,e.y,e.z],r*3),n.set([e.width,e.height],r*2),i.set([e.seed??0,e.intensity??1,e.speed??1,.02],r*4)}),o(Z(`flame`,r.flame,t,n,i,e,`flames:body`))}if(t.length){let e=t.length,n=new Float32Array(e*3),i=new Float32Array(e*2),a=new Float32Array(e*4);t.forEach((e,t)=>{n.set([e.x,e.y,e.z],t*3),i.set([Math.max(e.width,e.height)*(e.glow??0),e.height],t*2),a.set([e.seed??0,e.glowIntensity??.55,0,0],t*4)}),o(Z(`glow`,r.glow,n,i,a,e,`flames:glow`))}if(n){let e=new Float32Array(n*3),t=new Float32Array(n*2),i=new Float32Array(n*4),a=0;for(let n of this.sparks){let r=Math.max(.3,n.life??2.2);for(let o=0;o<Math.round(n.count);o++,a++)e.set([n.x,n.y,n.z],a*3),t.set([n.spread,n.height],a*2),i.set([(n.seed??0)*31.7+o*7.13,1/r,n.size??.08,0],a*4)}o(Z(`spark`,r.spark,e,t,i,n,`flames:sparks`))}return e.track(a),i}},$=new a,ee=new n;function te(e,t,{name:n=`flames:merged`}={}){let r=new Map;for(let e of t){let t=e?.object??e;if(!t?.isObject3D)continue;let n=null;t.traverse(e=>{let i=e;if(!i.isMesh||!i.userData.flameBatch)return;n||=(t.updateWorldMatrix(!0,!0),t.parent?new a().copy(t.parent.matrixWorld).invert():null);let o=i.material,s=r.get(o);s||r.set(o,s={kind:i.userData.flameBatch,src:[]}),s.src.push({mesh:i,owner:t,rel:n})})}if(!r.size)return null;let i=new g;i.name=n;let o=[],s=[],c=new Map,l=0,u=0;for(let[t,a]of r){let r=0;for(let e of a.src)r+=e.mesh.geometry.instanceCount;let d=new Float32Array(r*3),f=new Float32Array(r*2),p=new Float32Array(r*4),m=[],h=0;for(let t of a.src){let n=t.mesh.geometry,r=n.getAttribute(`iCenter`).array,i=n.getAttribute(`iSize`).array,a=n.getAttribute(`iParam`).array;$.copy(t.mesh.matrixWorld),t.rel&&$.premultiply(t.rel);for(let e=0;e<n.instanceCount;e++){ee.fromArray(r,e*3).applyMatrix4($).toArray(d,(h+e)*3),f[(h+e)*2]=i[e*2],f[(h+e)*2+1]=i[e*2+1];for(let t=0;t<4;t++)p[(h+e)*4+t]=a[e*4+t]}m.push({owner:t.owner,start:h,count:n.instanceCount}),h+=n.instanceCount,t.mesh.removeFromParent(),n.dispose(),e._geometries.delete(n)}let g=Z(a.kind,t,d,f,p,r,`${n}:${a.kind}`);g.matrixAutoUpdate=!1,delete g.userData.flameBatch,a.kind===`flame`?l+=r:a.kind===`spark`&&(u+=r);let _=g.geometry.getAttribute(`iSize`);for(let e of m){let t=c.get(e.owner);t||(t={owner:e.owner,visible:!0,ranges:[]},c.set(e.owner,t),s.push(t)),t.ranges.push({attr:_,start:e.start,count:e.count,sizes:f.slice(e.start*2,(e.start+e.count)*2)})}o.push(g),i.add(g)}let d=()=>{for(let e of s){let t=e.owner.visible;if(t!==e.visible){e.visible=t;for(let n of e.ranges){let e=n.attr.array;t?e.set(n.sizes,n.start*2):e.fill(0,n.start*2,(n.start+n.count)*2),n.attr.addUpdateRange(n.start*2,n.count*2),n.attr.needsUpdate=!0}}}};d();for(let e of o)e.onBeforeRender=d;return{object:i,meshes:o,count:l,sparks:u,dispose:()=>{for(let e of o)e.geometry.dispose();i.removeFromParent()}}}export{z as a,N as i,Y as n,te as r,Q as t};