import{Ci as e,Gi as t,Ii as n,Wi as r,ao as i,co as a,ho as o,mi as s,ra as c,wi as l,yi as u}from"./LevelStorage-wrhu45Nl.js";var d=Math.PI/180,f=17.2/40,p=1.05,m=`
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
`,h=`
uniform sampler2D uPlanche;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(uPlanche, vUv);
  if (c.a < 0.03) discard;
  gl_FragColor = c;
  #include <colorspace_fragment>
}
`,g=`
uniform sampler2D uPlanche;
varying vec2 vUv;
void main() {
  float a = texture2D(uPlanche, vUv).a;
  if (a < 0.5) discard;
  gl_FragColor = vec4(1.0, 0.95, 0.78, 0.55);
}
`,_=class{constructor(t,n,i,o,c=!1){let u=new l;u.setAttribute(`position`,new s([0,0,0,1,0,0,1,1,0,0,1,0],3)),u.setIndex([0,1,2,0,2,3]),this.ancre=new e(new Float32Array(n*3),3),this.rect=new e(new Float32Array(n*4),4),this.uv=new e(new Float32Array(n*4),4),this.anim=new e(new Float32Array(n*2),2),u.setAttribute(`aAncre`,this.ancre),u.setAttribute(`aRect`,this.rect),u.setAttribute(`aUV`,this.uv),u.setAttribute(`aAnim`,this.anim),u.instanceCount=0;let d=c?new a({uniforms:{...i,uPlanche:{value:t}},vertexShader:m,fragmentShader:g,transparent:!0,depthWrite:!1,depthTest:!0,depthFunc:6,toneMapped:!1,fog:!1,side:2}):new a({uniforms:{...i,uPlanche:{value:t}},vertexShader:m,fragmentShader:h,alphaToCoverage:!0,transparent:!1,depthWrite:!0,depthTest:!0,premultipliedAlpha:!0,toneMapped:!1,fog:!1,side:2});this.mesh=new r(u,d),this.mesh.frustumCulled=!1,this.mesh.renderOrder=o,this.mesh.name=`Balade.panneaux`,this.geometry=u,this.n=0}poser(e,t,n,r,i,a=1,o=0,s=0,c=this.n++){let[,l,u,d,f]=r.r;return this.ancre.array.set([e,t,n],c*3),this.rect.array.set([r.ox*a/40,r.oy*a/40,r.sw*a/40,r.sh*a/40],c*4),this.uv.array.set([l/i.w,1-u/i.h,(l+d)/i.w,1-(u+f)/i.h],c*4),this.anim.array.set([o,s],c*2),c}fini(e=this.n){this.geometry.instanceCount=e;for(let t of[this.ancre,this.rect,this.uv,this.anim])t.needsUpdate=!0,t.addUpdateRange?.(0,e*t.itemSize)}};function v(e,t){return new Promise((n,r)=>t.load(e,n,void 0,()=>r(Error(`image introuvable : ${e}`))))}async function y(e){let t=(e.level?.environment??{}).millepoques;if(!t)return null;let n=new URL(t.ville||`ville/ville.json`,document.baseURI),r=new b(e,await(await fetch(n)).json(),n,t);return await r.construire(),r}var b=class{constructor(e,t,n,r){this.game=e,this.V=t,this.base=n,this.reglage=r,this.temps=0,this.uniforms={uTemps:{value:0},uHaut:{value:1}},this.groupe=new u,this.groupe.name=`Balade`}async construire(){let{game:e,V:a}=this,{engine:s}=e,l=s.renderer,u=new o,d=Math.min(8,l.capabilities.getMaxAnisotropy?.()??1),f=e=>new URL(e,this.base).href,p=await Promise.all(a.sol.morceaux.map(e=>v(f(e.f),u)));a.sol.morceaux.forEach((e,a)=>{let o=p[a];o.colorSpace=i,o.anisotropy=d,o.minFilter=n,o.generateMipmaps=!0;let s=new t({map:o,toneMapped:!1,fog:!1,depthWrite:!1,depthTest:!1}),l=new c(e.w,e.h);l.rotateX(-Math.PI/2);let u=new r(l,s);u.position.set(e.x+e.w/2,0,e.y+e.h/2),u.renderOrder=-100,u.name=`Balade.sol`,this.groupe.add(u)});let m=await Promise.all(a.planches.map(e=>v(f(e.f),u)));for(let e of m)e.colorSpace=i,e.anisotropy=d,e.premultiplyAlpha=!0,e.minFilter=n,e.generateMipmaps=!0;this.planches=m;let h=a.objets.slice().sort((e,t)=>e.y-t.y||e.x-t.x),g=m.map(()=>[]);for(let e of h){let t=a.images[e.i];t&&g[t.r[0]].push(e)}this.fixes=g.map((e,t)=>{let n=new _(m[t],Math.max(1,e.length),this.uniforms,0);return e.forEach((e,r)=>{let i=a.images[e.i],o=e.k===`arbre`&&e.sorte!==`cactus`&&e.sorte!==`deadtree`&&e.s!==1,s={oak:20,birch:30,pine:12,palm:44}[e.sorte]??18;n.poser(e.ax,0,e.y+r*1e-5+t*1e-6,i,a.planches[t],e.s,o?1:e.k===`bateau`?-1:0,s*e.s/40)}),n.fini(),this.groupe.add(n.mesh),n});let y=a.habitants;this.looks=y.map(e=>e.vues);let b=a.routes||[],x=Math.min(this.reglage.passants??16,b.length);this.persos=new Map,this.silhouettes=new Map;let S=x+1;m.forEach((e,t)=>{let n=new _(e,S,this.uniforms,1);this.persos.set(t,n),this.groupe.add(n.mesh);let r=new _(e,1,this.uniforms,50,!0);this.silhouettes.set(t,r),this.groupe.add(r.mesh)}),this.joueur={look:this.looks[this.reglage.joueur??0]??this.looks[0],dist:0,vue:`face`,bouge:!1},this.routes=b.map(e=>e.map(([e,t])=>[e+.5,t+.5])),this.parBout=new Map,this.routes.forEach((e,t)=>{for(let n of[e[0],e[e.length-1]]){let e=n.join(`,`);this.parBout.has(e)||this.parBout.set(e,[]),this.parBout.get(e).push(t)}});let C=7;this.hasard=()=>(C=C*16807%2147483647)/2147483647,this.passants=[];for(let e=0;e<x;e++){let t=Math.floor(this.hasard()*this.routes.length),n=this.routes[t];this.passants.push({look:this.looks[(e+1)%this.looks.length],route:n,sens:this.hasard()<.5?1:-1,s:this.hasard()*(n.length-1),cote:(this.hasard()-.5)*.22,dist:this.hasard()*10,vue:`face`,pause:0})}e.world.root.visible=!1,e.player.sprite.visible=!1,e.player.speedMul=this.reglage.vitesse??.55,s.scene.add(this.groupe),l.shadowMap.enabled=!1;let w=e.rig;w.yawLimit=0,w.yawTarget=w.yawCenter,w.yaw=w.yawCenter,w.minDistance=this.reglage.zoomMin??7,w.maxDistance=this.reglage.zoomMax??26,w.targetOffsetY=.4,w.lookAhead=.8,this.reglerImage(),this.brancherCarte(f);for(let e of[...p,...m])l.initTexture?.(e)}brancherCarte(e){let t=this.game.ui?.worldMap;if(!t||!this.V.carte||typeof t._drawBase!=`function`)return;let n=new Image;n.src=e(this.V.carte);let r=new Map,i=(e,t)=>{let i=e+`x`+t;if(!r.has(i)){let a=document.createElement(`canvas`);a.width=e,a.height=t;let o=a.getContext(`2d`);o.imageSmoothingEnabled=!0,o.imageSmoothingQuality=`high`,o.drawImage(n,0,0,e,t),r.set(i,a)}return r.get(i)},a=t._drawBase.bind(t);t._drawBase=()=>{t._base&&n.complete&&n.naturalWidth&&(t._base=i(t._base.width,t._base.height)),a()}}reglerImage(){let{game:e}=this,t=e.postfx?.settings;t&&(t.enabled=!0,t.dof.enabled=!1,t.bloom.enabled=!1,t.cinematic&&(t.cinematic.enabled=!1),t.grade.enabled=!1);let n=e.engine.renderer;n.toneMapping!==0&&(n.toneMapping=0)}update(e){this.temps+=e,this.uniforms.uTemps.value=this.temps;let t=this.game.rig;this.uniforms.uHaut.value=Math.min(2.2,Math.tan(Math.max(20*d,t.pitch??50*d))),this.reglerImage();for(let e of this.persos.values())e.n=0;for(let e of this.silhouettes.values())e.n=0;let n=this.game.player,r=this.joueur,i=n.speed||0;r.dist+=i*e;let a=n.facing;i>.05&&(r.vue=Math.abs(a.z)>Math.abs(a.x)*.9?a.z>0?`face`:`dos`:a.x>0?`droite`:`gauche`),this.dessinerPerso(r.look,r.vue,i>.05,r.dist,n.position.x,n.position.z,!0);for(let t of this.passants){if(t.pause>0){t.pause-=e,this.dessinerPerso(t.look,`face`,!1,0,t.x,t.z);continue}let n=t.route;if(t.s+=t.sens*p*e,t.dist+=p*e,t.s<=0||t.s>=n.length-1){let e=t.s<=0?n[0]:n[n.length-1],r=(this.parBout.get(e.join(`,`))||[]).map(e=>this.routes[e]).filter(e=>e!==n);if(r.length&&this.hasard()<.85){let n=r[Math.floor(this.hasard()*r.length)];t.route=n;let i=n[0][0]===e[0]&&n[0][1]===e[1];t.sens=i?1:-1,t.s=i?0:n.length-1}else t.sens=-t.sens,t.s=Math.max(0,Math.min(n.length-1,t.s));this.hasard()<.15&&(t.pause=1+this.hasard()*2.5)}let r=t.route,i=Math.max(0,Math.min(r.length-2,Math.floor(t.s))),a=Math.max(0,Math.min(1,t.s-i)),o=r[i],s=r[i+1],c=(s[0]-o[0])*t.sens,l=(s[1]-o[1])*t.sens,u=Math.hypot(c,l)||1;t.x=o[0]+(s[0]-o[0])*a-l/u*t.cote,t.z=o[1]+(s[1]-o[1])*a+c/u*t.cote,t.vue=Math.abs(l)>Math.abs(c)?l>0?`face`:`dos`:c>0?`droite`:`gauche`,this.dessinerPerso(t.look,t.vue,!0,t.dist,t.x,t.z)}for(let e of this.persos.values())e.fini();for(let e of this.silhouettes.values())e.fini()}dessinerPerso(e,t,n,r,i,a,o=!1){let s=this.V,c=n?e[t]:e.debout,l=n?Math.floor(r/f*c.length)%c.length:0,u=s.images[c[l]];u&&(this.persos.get(u.r[0]).poser(i,0,a,u,s.planches[u.r[0]]),o&&this.silhouettes.get(u.r[0]).poser(i,0,a,u,s.planches[u.r[0]]))}};export{y as createBalade};