import{Ci as e,Gi as t,Ii as n,Kr as r,Wi as i,ao as a,co as o,ho as s,mi as c,ra as l,wi as u,yi as d}from"./LevelStorage-wrhu45Nl.js";var f=Math.PI/180,p=17.2/40,m=1.05,h=`
attribute vec3 aAncre;
attribute vec4 aRect;
attribute vec4 aUV;
attribute vec2 aAnim;
uniform float uTemps;
uniform float uHaut;
varying vec2 vUv;
void main() {
  // position.xy dans [0, 1] (y = 1 en haut) ; aRect : coin haut gauche (x, y vers le bas) et taille, en cases
  float dx = aRect.x + position.x * aRect.z;
  float dy = aRect.y + (1.0 - position.y) * aRect.w; // < 0 au-dessus de la ligne de profondeur
  vec3 p = aAncre;
  // balancement des arbres : rien sous le tronc, de plus en plus vers la cime
  if (aAnim.x > 0.0) {
    float h = max(0.0, -dy - aAnim.y);
    dx += h * aAnim.x * (sin(uTemps * 1.3 + aAncre.x * 0.7 + aAncre.z * 0.3) * 0.03 + sin(uTemps * 2.9 + aAncre.x) * 0.008);
  } else if (aAnim.x < 0.0) {
    // bateaux : ils dansent sur l'eau
    dy += sin(uTemps * 1.6 + aAncre.x * 3.1) * 0.035;
  }
  p.x += dx;
  p.y -= dy * uHaut;
  vUv = mix(aUV.xy, aUV.zw, vec2(position.x, 1.0 - position.y));
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`,g=`
uniform sampler2D uPlanche;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(uPlanche, vUv);
  if (c.a < 0.03) discard;
  gl_FragColor = c;
  #include <colorspace_fragment>
}
`,_=`
uniform sampler2D uPlanche;
varying vec2 vUv;
void main() {
  float a = texture2D(uPlanche, vUv).a;
  if (a < 0.5) discard;
  gl_FragColor = vec4(1.0, 0.95, 0.78, 0.55);
}
`,v=`
attribute float aOmbre;
uniform float uHaut;
varying vec2 vUv;
varying float vOmbre;
void main() {
  vUv = uv; vOmbre = aOmbre;
  gl_Position = projectionMatrix * viewMatrix * vec4(position.x, -position.y * uHaut, position.z, 1.0);
}
`,y=`
uniform sampler2D uPlanche;
varying vec2 vUv;
varying float vOmbre;
void main() {
  vec4 c = texture2D(uPlanche, vUv);
  vec3 rgb = c.a > 0.02 ? c.rgb / c.a : vec3(0.23, 0.14, 0.06);
  gl_FragColor = vec4(rgb * vOmbre, 1.0);
  #include <colorspace_fragment>
}
`;function b(e,t,n){let r=(e,t,n)=>{let r=[];for(let i=0;i<e.length;i++){let a=e[i],o=e[(i+1)%e.length],s=t(a),c=t(o);s&&r.push(a),s!==c&&r.push(n(a,o))}return r},i=(e,t,n)=>[n,e[1]+(t[1]-e[1])*(n-e[0])/(t[0]-e[0])],a=r(e,e=>e[0]>=t,(e,n)=>i(e,n,t));return a=r(a,e=>e[0]<=n,(e,t)=>i(e,t,n)),a}var x=class{constructor(t,n,r,a,s=!1){let l=new u;l.setAttribute(`position`,new c([0,0,0,1,0,0,1,1,0,0,1,0],3)),l.setIndex([0,1,2,0,2,3]),this.ancre=new e(new Float32Array(n*3),3),this.rect=new e(new Float32Array(n*4),4),this.uv=new e(new Float32Array(n*4),4),this.anim=new e(new Float32Array(n*2),2),l.setAttribute(`aAncre`,this.ancre),l.setAttribute(`aRect`,this.rect),l.setAttribute(`aUV`,this.uv),l.setAttribute(`aAnim`,this.anim),l.instanceCount=0;let d=s?new o({uniforms:{...r,uPlanche:{value:t}},vertexShader:h,fragmentShader:_,transparent:!0,depthWrite:!1,depthTest:!0,depthFunc:6,toneMapped:!1,fog:!1,side:2}):new o({uniforms:{...r,uPlanche:{value:t}},vertexShader:h,fragmentShader:g,alphaToCoverage:!0,transparent:!1,depthWrite:!0,depthTest:!0,premultipliedAlpha:!0,toneMapped:!1,fog:!1,side:2});this.mesh=new i(l,d),this.mesh.frustumCulled=!1,this.mesh.renderOrder=a,this.mesh.name=`Balade.panneaux`,this.geometry=l,this.n=0}poser(e,t,n,r,i,a=1,o=0,s=0,c=this.n++){let[,l,u,d,f]=r.r;return this.ancre.array.set([e,t,n],c*3),this.rect.array.set([r.ox*a/40,r.oy*a/40,r.sw*a/40,r.sh*a/40],c*4),this.uv.array.set([l/i.w,1-u/i.h,(l+d)/i.w,1-(u+f)/i.h],c*4),this.anim.array.set([o,s],c*2),c}fini(e=this.n){this.geometry.instanceCount=e;for(let t of[this.ancre,this.rect,this.uv,this.anim])t.needsUpdate=!0,t.addUpdateRange?.(0,e*t.itemSize)}};function S(e,t){return new Promise((n,r)=>t.load(e,n,void 0,()=>r(Error(`image introuvable : ${e}`))))}async function C(e){let t=(e.level?.environment??{}).millepoques;if(!t)return null;let n=new URL(t.ville||`ville/ville.json`,document.baseURI),r=new w(e,await(await fetch(n)).json(),n,t);return await r.construire(),r}var w=class{constructor(e,t,n,r){this.game=e,this.V=t,this.base=n,this.reglage=r,this.temps=0,this.uniforms={uTemps:{value:0},uHaut:{value:1}},this.groupe=new d,this.groupe.name=`Balade`}async construire(){let{game:e,V:u}=this,{engine:d}=e,f=d.renderer,p=new s,m=Math.min(8,f.capabilities.getMaxAnisotropy?.()??1),h=e=>new URL(e,this.base).href,g=await Promise.all(u.sol.morceaux.map(e=>S(h(e.f),p)));u.sol.morceaux.forEach((e,r)=>{let o=g[r];o.colorSpace=a,o.anisotropy=m,o.minFilter=n,o.generateMipmaps=!0;let s=new t({map:o,toneMapped:!1,fog:!1,depthWrite:!1,depthTest:!1}),c=new l(e.w,e.h);c.rotateX(-Math.PI/2);let u=new i(c,s);u.position.set(e.x+e.w/2,0,e.y+e.h/2),u.renderOrder=-100,u.name=`Balade.sol`,this.groupe.add(u)});let _=await Promise.all(u.planches.map(e=>S(h(e.f),p)));for(let e of _)e.colorSpace=a,e.anisotropy=m,e.premultiplyAlpha=!0,e.minFilter=n,e.generateMipmaps=!0;this.planches=_;let C=u.objets.slice().sort((e,t)=>e.y-t.y||e.x-t.x),w=_.map(()=>[]);for(let e of C){let t=u.images[e.i];t&&w[t.r[0]].push(e)}this.fixes=w.map((e,t)=>{let n=new x(_[t],Math.max(1,e.length),this.uniforms,0);return e.forEach((e,r)=>{let i=u.images[e.i],a=e.k===`arbre`&&e.sorte!==`cactus`&&e.sorte!==`deadtree`&&e.s!==1,o={oak:20,birch:30,pine:12,palm:44}[e.sorte]??18;n.poser(e.ax,0,e.y+r*1e-5+t*1e-6,i,u.planches[t],e.s,a?1:e.k===`bateau`?-1:0,o*e.s/40)}),n.fini(),this.groupe.add(n.mesh),n});let T=_.map(()=>({pos:[],uv:[],ombre:[]})),E=this.reglage.profondeur??.6;for(let e of C){let t=u.images[e.i];if(e.k!==`batiment`||!t?.vol||!e.bh)continue;let n=t.r[0],r=u.planches[n],[,i,a]=t.r,o=T[n],s=Math.min(e.bh,E),c=e.y-.004,l=c-s,d=e.bw/2*40-3,f=(e,n)=>[(i+(e-t.ox)*2)/r.w,1-(a+(n-t.oy)*2)/r.h];for(let n of t.vol){let t=b(n,-d,d);if(t.length<3)continue;let r=0;for(let e=0;e<t.length;e++){let n=t[e],i=t[(e+1)%t.length];r+=n[0]*i[1]-i[0]*n[1]}let i=r>0?1:-1,a=t.map((e,n)=>{let r=t[(n-1+t.length)%t.length],a=t[(n+1)%t.length],o=[e[1]-r[1],-(e[0]-r[0])],s=[a[1]-e[1],-(a[0]-e[0])],c=Math.hypot(...o)||1,l=Math.hypot(...s)||1,u=o[0]/c+s[0]/l,d=o[1]/c+s[1]/l,p=Math.hypot(u,d)||1;return u/=p,d/=p,f(e[0]-u*3.5*i,e[1]-d*3.5*i)});for(let n=0;n<t.length;n++){let r=(n+1)%t.length,s=t[n],u=t[r],d=u[0]-s[0],f=u[1]-s[1],p=Math.hypot(d,f);if(p<.01)continue;let m=f/p*i,h=-d/p*i,g=h<-.45?1:h>.45?.62:m>0?.8:.9,_=t=>e.ax+t[0]/40,v=e=>e[1]/40,y=[_(s),v(s),c],b=[_(u),v(u),c],x=[_(u),v(u),l],S=[_(s),v(s),l];o.pos.push(...y,...b,...x,...y,...x,...S),o.uv.push(...a[n],...a[r],...a[r],...a[n],...a[r],...a[n]);for(let e=0;e<6;e++)o.ombre.push(g)}}}T.forEach((e,t)=>{if(!e.pos.length)return;let n=new r;n.setAttribute(`position`,new c(e.pos,3)),n.setAttribute(`uv`,new c(e.uv,2)),n.setAttribute(`aOmbre`,new c(e.ombre,1));let a=new o({uniforms:{uHaut:this.uniforms.uHaut,uPlanche:{value:_[t]}},vertexShader:v,fragmentShader:y,side:2,toneMapped:!1,fog:!1}),s=new i(n,a);s.frustumCulled=!1,s.name=`Balade.volumes`,this.groupe.add(s)});let D=u.habitants;this.looks=D.map(e=>e.vues);let O=u.routes||[],k=Math.min(this.reglage.passants??16,O.length);this.persos=new Map,this.silhouettes=new Map;let A=k+1;_.forEach((e,t)=>{let n=new x(e,A,this.uniforms,1);this.persos.set(t,n),this.groupe.add(n.mesh);let r=new x(e,1,this.uniforms,50,!0);this.silhouettes.set(t,r),this.groupe.add(r.mesh)}),this.joueur={look:this.looks[this.reglage.joueur??0]??this.looks[0],dist:0,vue:`face`,bouge:!1},this.routes=O.map(e=>e.map(([e,t])=>[e+.5,t+.5])),this.parBout=new Map,this.routes.forEach((e,t)=>{for(let n of[e[0],e[e.length-1]]){let e=n.join(`,`);this.parBout.has(e)||this.parBout.set(e,[]),this.parBout.get(e).push(t)}});let j=7;this.hasard=()=>(j=j*16807%2147483647)/2147483647,this.passants=[];for(let e=0;e<k;e++){let t=Math.floor(this.hasard()*this.routes.length),n=this.routes[t];this.passants.push({look:this.looks[1+e%Math.max(1,this.looks.length-1)]??this.looks[0],route:n,sens:this.hasard()<.5?1:-1,s:this.hasard()*(n.length-1),cote:(this.hasard()-.5)*.22,dist:this.hasard()*10,vue:`face`,pause:0})}e.world.root.visible=!1,e.player.sprite.visible=!1,e.player.speedMul=this.reglage.vitesse??.55,d.scene.add(this.groupe),f.shadowMap.enabled=!1;let M=e.rig;M.yawLimit=0,M.yawTarget=M.yawCenter,M.yaw=M.yawCenter,M.minDistance=this.reglage.zoomMin??7,M.maxDistance=this.reglage.zoomMax??26,M.targetOffsetY=.4,M.lookAhead=.8,this.reglerImage(),this.brancherCarte(h);for(let e of[...g,..._])f.initTexture?.(e)}brancherCarte(e){let t=this.game.ui?.worldMap;if(!t||!this.V.carte||typeof t._drawBase!=`function`)return;let n=new Image;n.src=e(this.V.carte);let r=new Map,i=(e,t)=>{let i=e+`x`+t;if(!r.has(i)){let a=document.createElement(`canvas`);a.width=e,a.height=t;let o=a.getContext(`2d`);o.imageSmoothingEnabled=!0,o.imageSmoothingQuality=`high`,o.drawImage(n,0,0,e,t),r.set(i,a)}return r.get(i)},a=t._drawBase.bind(t);t._drawBase=()=>{t._base&&n.complete&&n.naturalWidth&&(t._base=i(t._base.width,t._base.height)),a()}}reglerImage(){let{game:e}=this,t=e.postfx?.settings;t&&(t.enabled=!0,t.dof.enabled=!1,t.bloom.enabled=!1,t.cinematic&&(t.cinematic.enabled=!1),t.grade.enabled=!1);let n=e.engine.renderer;n.toneMapping!==0&&(n.toneMapping=0)}update(e){this.temps+=e,this.uniforms.uTemps.value=this.temps;let t=this.game.rig;this.uniforms.uHaut.value=Math.min(2.2,Math.tan(Math.max(20*f,t.pitch??50*f))),this.reglerImage();for(let e of this.persos.values())e.n=0;for(let e of this.silhouettes.values())e.n=0;let n=this.game.player,r=this.joueur,i=n.speed||0;r.dist+=i*e;let a=n.facing;i>.05&&(r.vue=Math.abs(a.z)>Math.abs(a.x)*.9?a.z>0?`face`:`dos`:a.x>0?`droite`:`gauche`),this.dessinerPerso(r.look,r.vue,i>.05,r.dist,n.position.x,n.position.z,!0);for(let t of this.passants){if(t.pause>0){t.pause-=e,this.dessinerPerso(t.look,`face`,!1,0,t.x,t.z);continue}let n=t.route;if(t.s+=t.sens*m*e,t.dist+=m*e,t.s<=0||t.s>=n.length-1){let e=t.s<=0?n[0]:n[n.length-1],r=(this.parBout.get(e.join(`,`))||[]).map(e=>this.routes[e]).filter(e=>e!==n);if(r.length&&this.hasard()<.85){let n=r[Math.floor(this.hasard()*r.length)];t.route=n;let i=n[0][0]===e[0]&&n[0][1]===e[1];t.sens=i?1:-1,t.s=i?0:n.length-1}else t.sens=-t.sens,t.s=Math.max(0,Math.min(n.length-1,t.s));this.hasard()<.15&&(t.pause=1+this.hasard()*2.5)}let r=t.route,i=Math.max(0,Math.min(r.length-2,Math.floor(t.s))),a=Math.max(0,Math.min(1,t.s-i)),o=r[i],s=r[i+1],c=(s[0]-o[0])*t.sens,l=(s[1]-o[1])*t.sens,u=Math.hypot(c,l)||1;t.x=o[0]+(s[0]-o[0])*a-l/u*t.cote,t.z=o[1]+(s[1]-o[1])*a+c/u*t.cote,t.vue=Math.abs(l)>Math.abs(c)?l>0?`face`:`dos`:c>0?`droite`:`gauche`,this.dessinerPerso(t.look,t.vue,!0,t.dist,t.x,t.z)}for(let e of this.persos.values())e.fini();for(let e of this.silhouettes.values())e.fini()}dessinerPerso(e,t,n,r,i,a,o=!1){let s=this.V,c=n?e[t]:e.debout,l=n?Math.floor(r/p*c.length)%c.length:0,u=s.images[c[l]];u&&(this.persos.get(u.r[0]).poser(i,0,a,u,s.planches[u.r[0]]),o&&this.silhouettes.get(u.r[0]).poser(i,0,a,u,s.planches[u.r[0]]))}};export{C as createBalade};