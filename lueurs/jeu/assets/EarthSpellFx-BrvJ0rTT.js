import{Ci as e,Do as t,Dr as n,Ei as r,Eo as i,Ji as a,Ki as o,Kr as s,Mr as c,Nr as l,Ui as u,Wi as d,_o as f,co as p,dr as m,fr as h,mi as g,pa as ee,po as te,ui as _}from"./LevelStorage-C_bJYT5y.js";import{_ as ne}from"./Trees-fTuW5H_M.js";import{t as v}from"./GlobalUniforms-Hkw9cp0_.js";import"./game-d9F3g8c8.js";import{t as re}from"./glowSpots-DmXt8jmm.js";import{a as y,i as b,n as x,r as S,t as C}from"./CombatSystem-BX7eHxwb.js";var w=4,T=4,E=32,D=64,O={part:0,sides:5,rings:[[-.06,1],[.3,.88],[.6,.62],[.84,.36]]},k={part:1,sides:12,rings:[[0,.8],[0,2.2]]},A=`
attribute vec4 aRock;   // part, ring (4 = the tip), facet k, side (0: corner k, 1: corner k + 1)
attribute vec4 iShape;  // height, radius, seed, rise
attribute vec4 iFx;     // crack, aspect, -, -

float rockHash( vec3 p ) {
	p = fract( p * vec3( 0.1031, 0.1030, 0.0973 ) );
	p += dot( p, p.yxz + 33.33 );
	return fract( ( p.x + p.y ) * p.z );
}

// a ring of a part: ( y, radius ) in part units
vec2 rockRing( float part, float ring ) {
	if ( part < 0.5 ) return ring < 0.5 ? vec2( -0.06, 1.0 ) : ring < 1.5 ? vec2( 0.3, 0.88 ) : ring < 2.5 ? vec2( 0.6, 0.62 ) : vec2( 0.84, 0.36 );
	return ring < 0.5 ? vec2( 0.0, 0.8 ) : vec2( 0.0, 2.2 );
}

// a corner in part units: the spike's jittered by the seed (facet widths, a twist per ring, radii,
// ring heights) so its faces break into planes; the skirt is regular
vec3 rockCorner( float part, float ring, float k, float seed ) {
	float n = part < 0.5 ? 5.0 : 12.0;
	float kk = mod( k, n );
	float sk = part < 0.5 ? 1.0 : 0.0;
	float jit = ( rockHash( vec3( seed, 1.0, kk ) ) - 0.5 ) * 0.62 * sk;
	float twist = ( rockHash( vec3( seed, 5.0 + ring, kk ) ) - 0.5 ) * 0.34 * sk;
	float a = ( k + jit + twist ) * 6.2831853 / n + rockHash( vec3( seed, 3.0, 91.0 ) ) * 6.2831853 * sk;
	vec2 yr = rockRing( part, ring );
	float rj = 1.0 + ( rockHash( vec3( seed, 7.0 + ring, kk + 17.0 ) ) - 0.5 ) * 0.42 * sk;
	float yj = ring > 0.5 ? ( rockHash( vec3( seed, ring + 40.0, kk ) ) - 0.5 ) * 0.1 * sk : 0.0;
	return vec3( cos( a ) * yr.y * rj, yr.x + yj, sin( a ) * yr.y * rj );
}

// the blunt tip, off the axis by seed
vec3 rockTip( float seed ) {
	vec2 o = vec2( rockHash( vec3( seed, 9.0, 31.0 ) ), rockHash( vec3( seed, 9.0, 37.0 ) ) ) - 0.5;
	return vec3( o.x * 0.36, 1.0, o.y * 0.36 );
}

// thinner while it shoots up and when it overshoots (squash and stretch; stone gives less than ice)
float rockWidth( float rise ) {
	return mix( 0.6, 1.0, smoothstep( 0.0, 0.85, rise ) ) * inversesqrt( max( rise, 1.0 ) );
}

// part units → spike-local world units (relative to the foot, before the instance matrix)
vec3 rockPlace( float part, vec3 q, float h, float r, float rise, float aspect ) {
	if ( part > 0.5 ) {
		float s = r * smoothstep( 0.0, 0.6, rise );
		return vec3( q.x * s, 0.05, q.z * s );
	}
	float w = r * rockWidth( rise );
	return vec3( q.x * w, q.y * h * rise, q.z * w * aspect );
}
`,j=`
#ifdef ROCK_COLOR
varying vec2 vRockTc;    // texel coordinates (16 per world unit)
varying vec2 vRockEdge;  // distance to the facet's left / right seam (world)
varying vec2 vRockY;     // height above the foot in texels (pre-rise), the spike's height in texels
varying vec2 vRockFx;    // crack, seed
varying float vRockPart;
varying vec3 vRockW;     // world position
varying vec3 vRockA;     // the foot (world)
varying float vRockR;    // the spike's radius (world)
#endif

vec3 rockVertex() {
	float part = aRock.x, ring = aRock.y, k = aRock.z, side = aRock.w;
	float h = iShape.x, r = iShape.y, seed = iShape.z, rise = iShape.w;
	float aspect = iFx.y;
	bool tip = part < 0.5 && ring > 3.5;
	vec3 qL = rockCorner( part, ring, k, seed );
	vec3 qR = rockCorner( part, ring, k + 1.0, seed );
	vec3 q = tip ? rockTip( seed ) : ( side > 0.5 ? qR : qL );
	vec3 p = rockPlace( part, q, h, r, rise, aspect );
#ifdef ROCK_DEPTH
	if ( part > 0.5 ) p = vec3( 0.0 );  // the skirt casts no shadow
#endif
#ifdef ROCK_COLOR
	vec3 pL = rockPlace( part, qL, h, r, rise, aspect );
	vec3 pR = rockPlace( part, qR, h, r, rise, aspect );
	float w = tip ? 0.0 : length( pR - pL );
	float d = tip ? 0.0 : side * w;
	vRockEdge = vec2( d, w - d );
	float yq = clamp( q.y, 0.0, 1.0 );
	vRockY = vec2( yq * h * 16.0, h * 16.0 );
	// u: the seam distance plus a facet offset (neighbouring facets show other texels)
	float u0 = k * 9.0 + floor( rockHash( vec3( seed, 0.0, 41.0 ) ) * 32.0 );
	vRockTc = vec2( u0 + ( tip ? 0.0 : d * 16.0 ), q.y * h * 16.0 );
	vRockFx = vec2( iFx.x, seed );
	vRockPart = part;
	mat4 rockM = modelMatrix * instanceMatrix;
	vRockW = ( rockM * vec4( p, 1.0 ) ).xyz;
	vRockA = ( rockM * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
	vRockR = r;
#endif
	return p;
}
`,ie=`
uniform sampler2D uRockMap;
uniform vec2 uRockMapSize;
uniform vec3 uRockSun;
uniform vec3 uRockSunDir;
varying vec2 vRockTc;
varying vec2 vRockEdge;
varying vec2 vRockY;
varying vec2 vRockFx;
varying float vRockPart;
varying vec3 vRockW;
varying vec3 vRockA;
varying float vRockR;

float rockBayer( vec2 p ) {
	ivec2 q = ivec2( mod( floor( p ), 4.0 ) );
	const float M[ 16 ] = float[ 16 ]( 0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0 );
	return ( M[ q.y * 4 + q.x ] + 0.5 ) / 16.0;
}
float rockHash2( vec2 p ) {
	vec3 q = fract( vec3( p.xyx ) * 0.1031 );
	q += dot( q, q.yzx + 33.33 );
	return fract( ( q.x + q.y ) * q.z );
}

// the stone ramp (linear): albedo and the light's hue shift; nothing emissive
const vec3 ROCK_DEEP = vec3( 0.12, 0.075, 0.05 );
const vec3 ROCK_PALE = vec3( 0.55, 0.38, 0.23 );
const vec3 ROCK_FLECK = vec3( 0.66, 0.52, 0.34 );
const vec3 ROCK_DUST = vec3( 0.52, 0.40, 0.27 );
const vec3 ROCK_EDGE = vec3( 0.58, 0.46, 0.32 );
const vec3 ROCK_SHADE = vec3( 0.62, 0.54, 0.72 );  // shadowed faces lean violet-brown
const vec3 ROCK_LIT = vec3( 1.08, 0.98, 0.82 );    // lit faces lean warm
const vec3 ROCK_SHADOW = vec3( 0.05, 0.045, 0.04 );
const vec3 ROCK_BOUNCE = vec3( 1.0, 0.82, 0.62 );  // the sun thrown back off the ground: warm
`,ae=`
	vec3 rkEd = reflectedLight.directDiffuse;
	vec3 rkEt = rkEd + reflectedLight.indirectDiffuse;
	// the light's strength by its brightest channel
	float rkIt = max( max( rkEt.r, max( rkEt.g, rkEt.b ) ), 1e-5 );
	// the shade ramp: 4 steps from shadowed (ambient only) to fully sunlit
	float rkSh = floor( clamp( max( rkEd.r, max( rkEd.g, rkEd.b ) ) / rkIt, 0.0, 1.0 ) * 4.0 + 0.5 ) / 4.0;
	// the light in half-stop bands, its hue kept in part, with the ice's soft knee: a strong light
	// (the slam's flash, the noon sun) pales the stone, never burns it white
	float rkIq = exp2( floor( log2( rkIt ) * 2.0 + 0.5 ) * 0.5 );
	if ( rkIq > 0.7 ) rkIq = 0.7 + ( rkIq - 0.7 ) / ( 1.0 + ( rkIq - 0.7 ) * 1.3 );
	vec3 rkHue = mix( vec3( 1.0 ), rkEt / rkIt, 0.6 );
	vec3 rkL = rkIq * rkHue * mix( ROCK_SHADE, ROCK_LIT, rkSh );
	// the faces turned from the sun catch its bounce off the ground (stone in shade is never black),
	// as strong as the ground is lit — the sun's colour × its height: a low sun (golden hour) throws
	// little back, so the shaded side stays dark and the silhouette reads against the sunlit ground
	rkL += uRockSun * ( 0.33 * max( uRockSunDir.y, 0.0 ) ) * ROCK_BOUNCE * ( 1.0 - rkSh );
	vec3 outgoingLight;
	if ( vRockPart > 0.5 ) {
		// the skirt: torn-earth rubble texels, then a dithered contact shadow (world texel grid)
		vec2 g = floor( vRockW.xz * 16.0 ) + 0.5;
		float dr = length( g / 16.0 - vRockA.xz ) / max( vRockR, 1e-3 );
		float hr = rockHash2( g + vRockFx.y * 7.13 );
		float rubble = ( 1.0 - smoothstep( 0.8, 1.4, dr ) ) * 0.75;
		float shade = 1.0 - smoothstep( 1.05, 1.8, dr );
		if ( hr < rubble ) {
			vec3 alb = mix( ROCK_DEEP * 1.8, ROCK_DUST, step( 0.45, rockHash2( g * 1.7 ) ) );
			outgoingLight = alb * rkL;
		} else if ( rockBayer( g ) < shade * 0.85 ) {
			outgoingLight = ROCK_SHADOW * rkL;
		} else discard;
	} else {
		vec2 tc = floor( vRockTc ) + 0.5;
		vec4 tx = texture2D( uRockMap, tc / uRockMapSize );
		float crack = vRockFx.x;
		float yW = ( floor( vRockY.x ) + 0.5 ) / 16.0;   // world units above the foot (pre-rise)
		// albedo: tone blocks, strata, pits, flecks; each spike a little lighter or darker
		vec3 alb = mix( ROCK_DEEP, ROCK_PALE, tx.r ) * ( 0.94 + 0.12 * rockHash2( vec2( vRockFx.y, 5.0 ) ) );
		float feat = tx.g;
		if ( feat > 0.2 && feat < 0.45 ) alb *= 0.72;
		else if ( feat > 0.55 && feat < 0.8 ) alb *= 0.5;
		else if ( feat > 0.9 ) alb = ROCK_FLECK;
		// torn earth over the lowest 0.25 u, the very foot darker (the contact)
		float dust = 1.0 - smoothstep( 0.05, 0.25, yW );
		if ( rockHash2( tc + 3.1 ) < dust * 0.95 ) alb = ROCK_DUST * mix( 0.78, 1.0, rockHash2( tc * 1.3 + 0.7 ) );
		alb *= mix( 0.55, 1.0, smoothstep( 0.0, 0.18, yW ) );
		vec3 col = alb * rkL;
		// the facets' edges as a pixel artist draws them: a lit seam on the lit side, a dark line
		// where the face turns away (only on facets at least 3 texels wide)
		float eL = floor( vRockEdge.x * 16.0 ), eR = floor( vRockEdge.y * 16.0 );
		bool wide = ( vRockEdge.x + vRockEdge.y ) * 16.0 >= 3.0;
		if ( eL < 0.5 && wide ) col *= mix( 1.0, 1.3, rkSh );
		else if ( eR < 0.5 && wide && rkSh < 0.5 ) col *= 0.6;
		// cracks: dark lines in their reveal order, a 1-texel pale dust edge beside them
		if ( tx.b < crack ) col *= 0.35;
		else if ( crack > 0.0 ) {
			float nb = min( min( texture2D( uRockMap, ( tc + vec2( 1.0, 0.0 ) ) / uRockMapSize ).b, texture2D( uRockMap, ( tc - vec2( 1.0, 0.0 ) ) / uRockMapSize ).b ),
				texture2D( uRockMap, ( tc + vec2( 0.0, 1.0 ) ) / uRockMapSize ).b );
			if ( nb < crack ) col = ROCK_EDGE * rkL;
		}
		outgoingLight = col;
	}
`;function M(){let e=new m(E,D),t=new n(356414),r=2048,i=new Float32Array(r),a=new Float32Array(r),o=new Float32Array(r).fill(1),s=(e,t)=>(t%D+D)%D*E+(e%E+E)%E;for(let e=0;e<E;e++)for(let t=0;t<D;t++)i[s(e,t)]=.38+.3*c(e>>3,t>>3,21)+.08*c(e>>1,t,22);let l=t.int(1,4);for(;l<D;){let e=t.range(0,Math.PI*2),n=t.range(.6,1.4);for(let t=0;t<E;t++)c(t>>2,l,23)<.18||(a[s(t,l+Math.round(Math.sin(t*.39+e)*n))]=1/3);l+=t.int(5,7)}for(let e=0;e<16;e++){let e=t.int(0,31),n=t.int(0,63);a[s(e,n)]=2/3,t.chance(.5)&&(a[s(e+1,n)]=2/3)}for(let e=0;e<26;e++)a[s(t.int(0,31),t.int(0,63))]=1;let u=(e,n,r,i,a,c,l)=>{for(let d=0;d<c;d++){let f=s(e,n);o[f]=Math.min(o[f],Math.max(.03,i+d/c*(a-i))),n+=1,t.chance(.35)&&(e+=r),t.chance(.12)&&(r=-r),l<1&&t.chance(.06)&&u(e-r,n,-r,i+d/c*(a-i),a,Math.floor((c-d)*.5),l+1)}};for(let e=0;e<4;e++)u(Math.floor(e*E/4+t.int(0,3)),t.int(0,6),t.chance(.5)?1:-1,t.range(.03,.2),t.range(.6,.95),t.int(24,44),0);for(let t=0;t<D;t++)for(let n=0;n<E;n++){let r=s(n,t);e.set(n,t,[Math.round(Math.min(1,Math.max(0,i[r]))*255),Math.round(a[r]*255),Math.round(o[r]*255),255])}return e}function N(){let e=[],t=[],n=(e,t,n,r,i)=>{if(i)return[0,1,0];let[a,o]=e.rings[t],s=(n+r)*Math.PI*2/e.sides;return[Math.cos(s)*o,e.part===1?0:a,Math.sin(s)*o]},r=(r,i)=>{let a=r.map(e=>n(e[0],e[1],e[2],e[3],e[4])),o=[a[1][0]-a[0][0],a[1][1]-a[0][1],a[1][2]-a[0][2]],s=[a[2][0]-a[0][0],a[2][1]-a[0][1],a[2][2]-a[0][2]],c=[o[1]*s[2]-o[2]*s[1],o[2]*s[0]-o[0]*s[2],o[0]*s[1]-o[1]*s[0]],l=c[0]*i[0]+c[1]*i[1]+c[2]*i[2]<0?[0,2,1]:[0,1,2];for(let n of l){e.push(...a[n]);let i=r[n];t.push(i[0].part,i[4]?i[0].rings.length:i[1],i[2],i[3])}},i=O;for(let e=0;e<i.sides;e++){let t=(e+.5)*Math.PI*2/i.sides,n=[Math.cos(t),.3,Math.sin(t)];for(let t=0;t<i.rings.length-1;t++)r([[i,t,e,0,!1],[i,t,e,1,!1],[i,t+1,e,0,!1]],n),r([[i,t,e,1,!1],[i,t+1,e,1,!1],[i,t+1,e,0,!1]],n);let a=i.rings.length-1;r([[i,a,e,0,!1],[i,a,e,1,!1],[i,a,e,0,!0]],[n[0],.7,n[2]])}for(let e=0;e<k.sides;e++)r([[k,0,e,0,!1],[k,0,e,1,!1],[k,1,e,0,!1]],[0,1,0]),r([[k,0,e,1,!1],[k,1,e,1,!1],[k,1,e,0,!1]],[0,1,0]);let a=new s;return a.setAttribute(`position`,new g(e,3)),a.setAttribute(`aRock`,new g(t,4)),a.computeVertexNormals(),a}var P=class{constructor({capacity:t=24}={}){this.capacity=t;let n=N();this._shape=new e(new Float32Array(t*w),w),this._fx=new e(new Float32Array(t*T),T),this._shape.setUsage(_),this._fx.setUsage(_),n.setAttribute(`iShape`,this._shape),n.setAttribute(`iFx`,this._fx),this.texture=h(M().toCanvas(),{wrap:`repeat`,srgb:!1,name:`fx:rockSpikes`}),this.texture.flipY=!1,this.uniforms={uRockMap:{value:this.texture},uRockMapSize:{value:new i(E,D)},uRockSun:v.uSunColor,uRockSunDir:v.uSunDirection};let s=this.uniforms;this.material=new a({color:16777215,flatShading:!0}),this.material.onBeforeCompile=e=>{Object.assign(e.uniforms,s),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>\n#define ROCK_COLOR\n${A}\n${j}`).replace(`#include <begin_vertex>`,`vec3 transformed = rockVertex();`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>\n${ie}`).replace(`vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;`,ae)},this.material.customProgramCacheKey=()=>`luminati-rockspikes-v1`,this.depthMaterial=new o({depthPacking:ee}),this.depthMaterial.onBeforeCompile=e=>{e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>\n#define ROCK_DEPTH\n${A}\n${j}`).replace(`#include <begin_vertex>`,`vec3 transformed = rockVertex();`)},this.depthMaterial.customProgramCacheKey=()=>`luminati-rockspikes-depth-v1`,this.object=new r(n,this.material,t),this.object.name=`fx:rockSpikes`,this.object.count=0,this.object.visible=!1,this.object.frustumCulled=!1,this.object.castShadow=!0,this.object.receiveShadow=!0,this.object.customDepthMaterial=this.depthMaterial,this.object.instanceMatrix.setUsage(_),this._items=Array(t).fill(null),this._live=0,this._m=new u,this._warm=-1}spawn(e){let t=this._items.indexOf(null);if(t<0)return-1;let n=Math.max(.05,e.height??1.2);return this._items[t]={x:e.x,y:e.y,z:e.z,height:n,radius:Math.max(.02,e.radius??.35),yaw:e.yaw??0,leanX:(e.tiltX??0)/n,leanZ:(e.tiltZ??0)/n,seed:((e.seed??t)>>>0)%8192,aspect:Math.min(1,Math.max(.3,e.aspect??1)),rise:0,crack:0},this._live++,t}set(e,t){let n=this._items[e];n&&(t.rise!==void 0&&(n.rise=t.rise),t.crack!==void 0&&(n.crack=t.crack),t.height!==void 0&&(n.height=Math.max(.05,t.height)),t.radius!==void 0&&(n.radius=Math.max(.02,t.radius)))}free(e){e>=0&&e<this.capacity&&this._items[e]&&(this._items[e]=null,this._live--)}get count(){return this._live}warm(){this._warm<0&&(this._warm=this.spawn({x:0,y:-500,z:0,seed:1}),this.set(this._warm,{rise:1}),this.update(0))}unwarm(){this._warm>=0&&(this.free(this._warm),this._warm=-1,this.update(0))}update(e){let t=this._shape.array,n=this._fx.array,r=this._m.elements,i=0;for(let e of this._items){if(!e||e.rise<=.001)continue;let a=Math.cos(e.yaw),o=Math.sin(e.yaw);r[0]=a,r[1]=0,r[2]=-o,r[3]=0,r[4]=e.leanX,r[5]=1,r[6]=e.leanZ,r[7]=0,r[8]=o,r[9]=0,r[10]=a,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this.object.setMatrixAt(i,this._m),t[i*w]=e.height,t[i*w+1]=e.radius,t[i*w+2]=e.seed,t[i*w+3]=e.rise,n[i*T]=e.crack,n[i*T+1]=e.aspect,n[i*T+2]=0,n[i*T+3]=0,i++}this.object.count=i,this.object.visible=i>0,i>0&&(this.object.instanceMatrix.needsUpdate=!0,this._shape.needsUpdate=!0,this._fx.needsUpdate=!0)}dispose(){this.object.removeFromParent(),this.object.geometry.dispose(),this.material.dispose(),this.depthMaterial.dispose(),this.texture.dispose(),this.object.dispose?.()}},F=16,I=.6,L=.8,R=`
#include <common>
#include <fog_pars_vertex>

varying vec3 vWd;   // world position
varying vec3 vNd;   // world normal (the ellipsoid's)
varying vec3 vPd;   // unit-hemisphere position

void main() {
	vec4 wp = modelMatrix * vec4( position, 1.0 );
	vWd = wp.xyz;
	vPd = position;
	vNd = normalize( normal * vec3( 1.0, 1.0 / ${L.toFixed(2)}, 1.0 ) );
	vec4 mvPosition = viewMatrix * wp;
	gl_Position = projectionMatrix * mvPosition;
	#include <fog_vertex>
}
`,z=`
#include <common>
#include <fog_pars_fragment>

uniform float uRadius;
uniform vec2 uCell;      // the cell's width in texels (fitted round the base), the meridian's texels per radian
uniform float uCells;    // cells round the base (a whole number)
uniform float uRise;
uniform float uDissolve;
uniform vec2 uSweep;     // two highlight bands' heights (0 … 1; < 0 none)
uniform float uArtPx;
uniform float uNight;
uniform vec3 uCentre;

varying vec3 vWd;
varying vec3 vNd;
varying vec3 vPd;

const vec3 WARD_BODY = vec3( 0.06, 0.18, 0.55 );
const vec3 WARD_LIT = vec3( 0.15, 0.40, 1.25 );

float wdBayer( vec2 p ) {
	ivec2 q = ivec2( mod( floor( p ), 4.0 ) );
	const float M[ 16 ] = float[ 16 ]( 0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0 );
	return ( M[ q.y * 4 + q.x ] + 0.5 ) / 16.0;
}

// the distance (cell units) from a point to its nearest hex cell's edge (flat sides left / right);
// cell: that cell's id (whole numbers: twice its centre's x, its row)
float wdHexEdge( vec2 uv, out vec2 cell ) {
	const vec2 r = vec2( 1.0, 1.7320508 );
	const vec2 hh = r * 0.5;
	vec2 a = mod( uv, r ) - hh;
	vec2 b = mod( uv - hh, r ) - hh;
	vec2 g = dot( a, a ) < dot( b, b ) ? a : b;
	vec2 c = uv - g;
	cell = floor( vec2( c.x * 2.0, c.y / 0.8660254 ) + 0.5 );
	float d = max( dot( abs( g ), normalize( r ) ), abs( g.x ) );
	return 0.5 - d;
}

float wdHash( vec2 id ) {
	return fract( sin( dot( id, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
}

void main() {
	// surface texels: along the base's arc (the azimuth × the radius) and up the meridian
	float az = atan( vPd.z, vPd.x );
	float el = asin( clamp( vPd.y, 0.0, 1.0 ) );
	vec2 s = vec2( az * uRadius * 16.0, el * uCell.y );
	vec2 tc = floor( s ) + 0.5;
	float h = vWd.y - uCentre.y;                 // height above the base (u)
	float top = uRadius * ${L.toFixed(2)};
	float hn = h / top;
	// the rise: nothing above it; its leading row lit
	float riseH = uRise * top;
	if ( h > riseH ) discard;
	bool lead = uRise < 0.999 && riseH - h < 1.5 / 16.0;
	// the view's angle to the surface
	vec3 vd = normalize( cameraPosition - vWd );
	float f = 1.0 - abs( dot( vNd, vd ) );
	// texels per screen pixel here (world derivative: no seam), the lines' width in texels
	float tp = length( fwidth( vWd ) ) * 16.0;
	float lineW = max( 2.0, uArtPx * tp );
	vec2 cell;
	float edge = wdHexEdge( tc / uCell.x, cell ) * uCell.x;
	bool line = edge < 0.5 * lineW;
	// (round the base the ids wrap: the cells on the azimuth's seam are one)
	cell.x = mod( cell.x, 2.0 * uCells );
	bool base = h * 16.0 < 2.0;
	float bay = wdBayer( tc );
	// the sweeps: lines inside a band light up, and the band shows a little further in
	float band = min( abs( hn - uSweep.x ), abs( hn - uSweep.y ) ) * top * 16.0;
	bool swept = band < 1.6;
	vec3 col;
	if ( base ) col = WARD_BODY;
	else if ( lead && f > 0.35 ) col = WARD_LIT;
	else if ( f > 0.78 ) {
		if ( line ) col = WARD_LIT;
		else if ( h > 1.4 && bay < 0.25 ) col = WARD_BODY;
		else discard;
	} else if ( f > 0.5 || ( swept && f > 0.4 ) ) {
		if ( !line ) discard;
		col = swept ? WARD_LIT : WARD_BODY;
	} else discard;
	// the camera's half of the dome: whole cells left out by a hash, so whole hexes stay
	vec2 toCam = cameraPosition.xz - uCentre.xz;
	if ( dot( vNd.xz, toCam ) > 0.0 && wdHash( cell ) >= ${I.toFixed(2)} ) discard;
	// the dissolve, top-down
	float gone = clamp( ( hn - ( 1.0 - uDissolve * 1.35 ) ) / 0.3, 0.0, 1.0 );
	if ( gone > 0.0 && bay < gone ) discard;
	col *= mix( 1.0, 0.55, uNight );
	gl_FragColor = vec4( col, 1.0 );

	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}
`,B=class{constructor(){let e=new te(1,32,12,0,Math.PI*2,0,Math.PI/2);this.uniforms={...f.clone(ne.fog),uFogStart:v.uFogStart,uNight:v.uNight,uRadius:{value:3},uCell:{value:new i(F,43.2)},uCells:{value:18},uRise:{value:0},uDissolve:{value:0},uSweep:{value:new i(-9,-9)},uArtPx:{value:2},uCentre:{value:new t}},this.material=new p({name:`WardDome`,uniforms:this.uniforms,vertexShader:R,fragmentShader:z,side:2,transparent:!1,depthWrite:!0,fog:!0}),this.material.customProgramCacheKey=()=>`luminati-warddome-v1`,this.object=new d(e,this.material),this.object.name=`fx:wardDome`,this.object.visible=!1,this.object.frustumCulled=!1,this.object.castShadow=!1,this.object.receiveShadow=!1,this._warm=!1}get shown(){return this.object.visible}get artPx(){return this.uniforms.uArtPx.value}set artPx(e){this.uniforms.uArtPx.value=Math.max(1,e|0)}show(e){let t=Math.max(.5,e.radius),n=this.uniforms;n.uRadius.value=t;let r=Math.PI*2*t*16,i=Math.max(6,Math.round(r/F));n.uCell.value.set(r/i,16*t*.9),n.uCells.value=i,n.uCentre.value.set(e.x,e.y,e.z),n.uRise.value=0,n.uDissolve.value=0,n.uSweep.value.set(-9,-9),this.object.position.set(e.x,e.y,e.z),this.object.scale.set(t,t*L,t),this.object.updateMatrix(),this.object.updateMatrixWorld(!0),this.object.visible=!0}set(e){let t=this.uniforms;e.rise!==void 0&&(t.uRise.value=Math.max(0,Math.min(1,e.rise))),e.dissolve!==void 0&&(t.uDissolve.value=Math.max(0,Math.min(1,e.dissolve))),e.sweepA!==void 0&&(t.uSweep.value.x=e.sweepA),e.sweepB!==void 0&&(t.uSweep.value.y=e.sweepB)}hide(){this.object.visible=!1}warm(){this.show({x:0,y:-500,z:0,radius:3}),this.set({rise:1}),this._warm=!0}unwarm(){this._warm&&(this._warm=!1,this.hide())}dispose(){this.object.removeFromParent(),this.object.geometry.dispose(),this.material.dispose()}},V=Object.freeze({crackBody:Object.freeze([.12,.08,.06]),crackFlash:Object.freeze([1.25,.62,.16]),clang:Object.freeze([1.25,.62,.16]),steel:Object.freeze([.8,.55,.25]),shock:Object.freeze([.55,.4,.26]),amber:Object.freeze([.75,.42,.1]),seed:Object.freeze([.08,.2,.6]),wardGlyph:Object.freeze([.1,.28,.8]),wardRing:Object.freeze([.1,.3,.95]),wardGlint:Object.freeze([.2,.5,1.45])}),H=Object.freeze({magic:.6,matter:.72,flash:.5,glint:.35}),U=Object.freeze({warm:.4,cool:.55,flash:.25}),W=e=>e+(1-e)*v.uNight.value,G=Object.freeze({slamColor:[1.5,.9,.4],cryColor:[1.4,.8,.3],wardColor:[.3,.55,1.4],sparkColor:[1.4,.9,.45],charge:3,chargeLift:1.2,chargeDistance:4,chargeFrom:14,chargeFrames:8,slam:6,slamTau:.1,slamLift:2.6,slamDistance:9,hold:2.5,kick:3,kickTau:.08,fadeFrom:.6,fadeT:.4,quakeEnd:1,cry:6,cryTau:.07,cryLift:2.2,cryDistance:7,ward:2.5,wardLift:2.4,wardDistance:7.5,wardDecay:1.5,blend:.15,wardOut:.8,wardOutT:.3,wardEnd:1.1,bash:4,mace:3.5,block:3,sparkLift:.9,sparkDistance:3,blockDistance:2.5,sparkT:.12,blockT:.1,blockGlintEvery:.15,blockLightEvery:.3}),K=Object.freeze({crackSize:1.9,crackGrow:.1,crackAlpha:1,crackLife:1.6,crackFade:.7,heatTau:.12,ring:Object.freeze([1.6,8]),ringGrow:.25,ringLife:.4,ringFade:.2,start:.07,sweep:.05,rise:.09,peakAt:.5,overshoot:1.12,height:Object.freeze([1.15,.4]),radius:Object.freeze([.36,.46]),lean:Object.freeze([.12,.22]),aspect:Object.freeze([.62,1]),compA:.16,compR:.92,compH:.45,compStart:.02,sink:.02,moveStep:.15,moveSteps:10,moveIn:1.2,moveOut:3.6,nearLow:.5,clearGone:.1,clearStub:.5,stubH:.45,stubR:.7,screenDepth:2.6,screenSide:.75,screenLow:.5,ease:.05,crackFrom:.42,crackTo:.62,sinkAt:.62,sinkT:.12,end:1.65}),oe=Object.freeze([.45,-.2,.15]),q=.25,J=Object.freeze({rise:.3,sweeps:Object.freeze([.3,.45]),sweepT:.35,hold:.8,dissolve:.3,rPad:1.4,rMin:2.6,rMax:3.4,apart:6,seedSize:Object.freeze([1,1.6]),seedAlpha:.35,roar:Object.freeze([1.6,12.6]),roarGrow:.4,roarLife:.5,roarFade:.25,glyphLife:1.1,glyphFade:.35,glintAt:.3,glintStagger:.06,glintLife:.18,ringScale:1.05,ringScaleMember:.95,ringAlpha:.45,ringPulseHz:.8,ringPulse:.15,expiry:1.2,expiryHz:2.5,expiryLow:.15,ringFade:.4,tauntLife:.9,tauntGrow:.25,tauntPad:.4,tauntAt:.03}),Y=Object.freeze({rgb:Object.freeze([1,.72,.3]),bash:1.4,block:1.4,bulwarkCharge:1.1,bulwarkFlash:2.2,bulwarkHold:.5,wardPulse:Object.freeze([.25,.4]),quakeCharge:.8,quakeFlash:1.6,max:2.5,tau:.12}),se=Object.freeze({burstSpeed:[3,5]}),ce=Object.freeze({spawnSize:[.6,.3,.6]}),X=e=>{let t=e<=0?0:e>=1?1:e;return t*t*(3-2*t)},Z=e=>e<=0?0:e>=1?1:e,le=e=>{let t=Math.PI*2;return e=(e%t+t)%t,e>Math.PI?e-t:e};function ue(e){if(e<=0)return 0;let t=K.peakAt;if(e<t){let n=1-e/t;return K.overshoot*(1-n*n*n)}return e<1?K.overshoot-(K.overshoot-1)*X((e-t)/(1-t)):1}function Q(){return{on:!1,fl:null,x:0,y:0,z:0,a:0,t:0,crack:null,crackRgb:[0,0,0],ring:null,spikes:[],born:0,flash:0,kick:0,sunk:!1}}var de=class{constructor(e){this.sys=e,this.spikes=new P({capacity:24}),this.dome=new B,e.scene?.add(this.spikes.object),e.scene?.add(this.dome.object),e.quads?.enableHalo(),this.directors=[],this.domeOwner=null,this._warmQuad=-1}director(e){let t=new $(this,e);return this.directors.push(t),t}drop(e){let t=this.directors.indexOf(e);t>=0&&this.directors.splice(t,1),this.domeOwner===e&&(this.domeOwner=null,this.dome.hide())}warmup(e){this.spikes.warm(),this.dome.warm();let t=this.sys.quads;t&&(this._warmQuad=t.alloc(),this._warmQuad>=0&&t.set(this._warmQuad,{x:e.x,y:e.y,z:e.z,frame:`partySunburst`,index:1,scale:1,mode:`billboard`,r:2,g:2,b:2,a:1,halo:1}),t.update())}endWarmup(){this.spikes.unwarm(),this.dome.unwarm(),this._warmQuad>=0&&this.sys.quads.free(this._warmQuad),this._warmQuad=-1}update(e,t=!0,n=0,r=!1){let i=!t&&!this.sys.game?.photoMode;for(let e=0;e<this.directors.length;e++){let a=this.directors[e];r?a.settle(n):i?a.hush():t&&a.light(n)}this.spikes.update(e)}dropLights(){for(let e of this.directors)e.dropLights()}dispose(){for(let e of[...this.directors])e.dispose();this.directors.length=0,this.domeOwner=null,this.spikes.dispose(),this.dome.dispose()}info(){return{directors:this.directors.length,spikes:this.spikes.count,dome:this.dome.shown,halo:!!this.sys.quads?.halo}}},$=class{constructor(e,t){this.stage=e,this.mc=t,this.sys=t.sys,this.fx=new b(this.sys,{halo:0}),this.mfx=new b(this.sys,{halo:0}),this.gfx=new b(this.sys,{halo:0}),this._quakes=[Q(),Q()],this._bul={on:!1,t:0,x:0,y:0,z:0,cx:0,cy:0,cz:0,R:3,born:0,flash:0,heroes:[],cued:!1,glints:0,motes:!1},this._rings=[],this._cues=[],this._crest=re(t.member.sprite?.sheet),this._crestP={x:0,y:0,z:0},this._spikeP={rise:0,crack:0,height:1,radius:.3},this._lightP={color:[1,1,1],intensity:0,distance:8,decay:1},this._lightC=[1,1,1],this._kf={k:1,kr:1},this._domeP={rise:0,dissolve:0,sweepA:-9,sweepB:-9},this._snap=new Map,this.clear()}get count(){return this.fx.count+this.mfx.count+this.gfx.count}clear(){for(let e of this._quakes)e.on&&this._endQuake(e);this._endBulwark(),this._rings.length=0,this._cues.length=0,this.fx.clear(),this.mfx.clear(),this.gfx.clear(),this._field&&(this._field.off(),this._field.release()),this._field=null,this._spark&&(this._spark.light.off(),this._spark.light.release()),this._spark=null,this._serial=0,this._askedUpTo=0,this._clock=0,this._glintAt=-1/0,this._blockLightAt=-1/0,this._move=null,this._moveT=0,this._beats=0,this._chargeBorn=0,this._slammed=!1,this._seed=null,this._hits=this.mc.counts.hits,this._sparkSwing=-1,this.glow=0,this._kick=0,this._glowShown=-1,this.lights={acquired:0,refused:0},this._settling=!1,this._settleT=0,this._settled=!1,this._back=1,this._backT=0,this._skipMove=!1,this._snap.clear(),this.rng=new n((l(`earth:${this.mc.id}`)^Number(this.sys.seedValue)>>>0)>>>0),this._writeGlow(0)}hush(){this._field?.off(),this._spark?.light.off()}settle(e){if(this._settling||(this._settling=!0,this._settleT=0,this._settled=!1,this._skipMove=!0,this._releaseLights(),this._snap.clear(),this._snapOf(this.fx),this._snapOf(this.mfx),this._snapOf(this.gfx)),this._settled)return;this._settleT+=e;let t=Z(this._settleT/q);this._back=1-t,this._fadeTo(this.fx,1-t),this._fadeTo(this.mfx,1-t),this._fadeTo(this.gfx,1-t);let n=this.stage,r=this._spikeP;for(let e of this._quakes)if(e.on)for(let i of e.spikes)i.h<0||(r.rise=i.r*(1-t),r.crack=0,r.height=i.height*Math.max(.05,i.k),r.radius=i.radius*i.kr,n.spikes.set(i.h,r));this._bul.on&&n.domeOwner===this&&n.dome.set({dissolve:Math.max(this._domeP.dissolve,t)}),this.glow!==0&&(this.glow=0,this._writeGlow(0)),t>=1&&this._endOneShots(),this._write()}_endOneShots(){for(let e of this._quakes)e.on&&this._endQuake(e);this._endBulwark();for(let e of this._cues)this.fx.kill(e.rec);this._cues.length=0,this._seed&&this.fx.kill(this._seed),this._seed=null,this._killAllBut(this.fx),this.mfx.clear(),this.gfx.clear(),this._back=0,this._settled=!0}_snapOf(e){for(let t=0;t<e.live.length;t++)this._snap.set(e.live[t],e.live[t].alpha)}_fadeTo(e,t){for(let n=0;n<e.live.length;n++){let r=e.live[n];r.alpha=(this._snap.get(r)??0)*t}}_killAllBut(e){for(let t=e.live.length-1;t>=0;t--){let n=e.live[t],r=!1;for(let e of this._rings)e.rec===n&&(r=!0);r||e.kill(n)}}_releaseLights(){this._field&&(this._field.off(),this._field.release()),this._field=null,this._spark&&(this._spark.light.off(),this._spark.light.release()),this._spark=null,this._askedUpTo=this._serial}light(e){this._settling&&(this._settled||this._endOneShots(),this._settling=!1,this._settled=!1,this._backT=0),this._back<1&&(this._backT+=e,this._back=Z(this._backT/q));let t=Math.exp(-e/G.slamTau),n=Math.exp(-e/G.kickTau);for(let e of this._quakes)e.flash*=t,e.kick*=n;this._bul.flash*=Math.exp(-e/G.cryTau),this._fieldLight(),this._sparkLook(e)}_write(){let e=this.sys.fx,t=e?e.viewX:0,n=e?e.viewZ:-1,r=v.uNight.value;this.fx.write(t,n,1-H.magic*r),this.mfx.write(t,n,1-H.matter*r),this.gfx.write(t,n,1-H.glint*r)}dropLights(){this._field&&this._field.release(),this._field=null,this._spark&&this._spark.light.release(),this._spark=null,this._askedUpTo=this._serial}dispose(){this.clear(),this.stage.drop(this)}_acquireLight(e){let t=this.sys.world,n=t&&typeof t.acquireSpellLight==`function`?t.acquireSpellLight(e):null;return n?this.lights.acquired++:this.lights.refused++,n}melee(e,t){let n=this.sys,r=this.mc.member.position,i=this.mc.member.facing;if(e===0){let e=r.x+i.x*.75,t=r.z+i.z*.75;this.gfx.add({frame:`partySunburst`,mode:`billboard`,x:e,y:r.y+.95,z:t,frames:[2],scale:.45,scaleTo:.75,grow:.1,color:V.clang,life:.12,fadeOut:.04,back:-.2,halo:1}),n.burst(`earthShieldSpark`,e,r.y+.95,t,6),n.burst(`footstep`,r.x+i.x*.4,r.y+.05,r.z+i.z*.4,4),this._kick=Math.max(this._kick,Y.bash)}else this.fx.add({frame:`slashBig`,mode:`flat`,x:r.x+i.x*.85,y:r.y+.8,z:r.z+i.z*.85,dirX:i.x,dirZ:i.z,scale:.85,fps:30,color:V.steel,life:4/30,fadeOut:.05,alpha:.9}),n.burst(`partyDust`,r.x+i.x*.9,r.y+.15,r.z+i.z*.9,3)}block(e,t){let n=this.sys,r=this.mc.member.position,i=r.x-e*.35,a=r.z-t*.35;n.burst(`earthShieldSpark`,i,r.y+.95,a,5);let o=this._clock;o-this._glintAt>=G.blockGlintEvery&&(this._glintAt=o,this.gfx.add({frame:`partySunburst`,mode:`billboard`,x:i,y:r.y+.95,z:a,frames:[1],scale:.45,color:V.clang,life:.1,fadeOut:.04,back:-.2,halo:1}),this._kick=Math.max(this._kick,Y.block)),o-this._blockLightAt>=G.blockLightEvery&&!this._spark&&(this._blockLightAt=o,this._sparkAt(i,r.y+G.sparkLift,a,G.block,G.blockT,G.blockDistance))}windup(e,t){let n=this.mc.member.position;t===6&&this.sys.burst(`footstep`,n.x,n.y+.05,n.z,4)}bulwark(e,t,n){let r=this.sys,i=this.mc.member.position,a=r.player.position,o=r.groundAt(i.x,i.z),s=Math.hypot(i.x-a.x,i.z-a.z),c=t,l=n;s>J.apart&&(c=i.x,l=i.z);let u=Math.max(J.rMin,Math.min(J.rMax,s/2+J.rPad)),d=r.groundAt(c,l);this._endBulwark(),this._seed&&this.fx.kill(this._seed),this._seed=null;let f=this._crestAt();f&&this.gfx.add({frame:`partySunburst`,mode:`billboard`,x:f.x,y:f.y,z:f.z,frames:[1],scale:.5,color:V.clang,life:.14,fadeOut:.06,back:-.25,halo:1}),this.fx.add({frame:`partyRing`,mode:`flat`,x:i.x,y:o+C+.03,z:i.z,frames:[0],size:J.roar[0],sizeTo:J.roar[1],grow:J.roarGrow,color:V.amber,life:J.roarLife,fadeOut:J.roarFade,alpha:S,soft:.3}),r.burst(`earthDustRing`,i.x,o+.1,i.z,10,se),r.burst(`earthCrySpark`,i.x,o+1.2,i.z,8),this.fx.add({frame:`partyGlyphWard`,mode:`flat`,x:c,y:d+C,z:l,size:2,sizeTo:u*2,grow:J.rise,spin:.7,color:V.wardGlyph,life:J.glyphLife,fadeIn:.05,fadeOut:J.glyphFade,alpha:x});let p=this.stage,m=r.engine?.renderer?.getContext?.(),h=m?m.drawingBufferWidth:1280;p.dome.artPx=h>=2560?4:h>=1920?3:2,p.dome.show({x:c,y:d,z:l,radius:u}),p.domeOwner=this;let g=this._bul;g.on=!0,g.t=0,g.x=i.x,g.y=o,g.z=i.z,g.cx=c,g.cy=d,g.cz=l,g.R=u,g.born=++this._serial,g.flash=1,g.cued=!1,g.glints=0,g.motes=!1,g.heroes.length=0;for(let e of this._rings)this.fx.kill(e.rec);this._rings.length=0,this._wardRing(a,null,J.ringScale,e.wardFor),g.heroes.push(a);for(let t of r.allies)t.present&&(this._wardRing(t.position,t,J.ringScaleMember,e.wardFor),g.heroes.push(t.position));this._kick=Math.max(this._kick,Y.bulwarkFlash)}slam(e,t){let n=this.sys,r=this._quakes.find(e=>!e.on);if(!r){r=this._quakes[0];for(let e of this._quakes)e.t>r.t&&(r=e);this._endQuake(r)}r.on=!0,r.fl=e,r.x=e.x,r.y=e.y,r.z=e.z,r.a=e.a,r.t=0,r.flash=1,r.kick=0,r.sunk=!1,r.born=++this._serial,this._slammed=!0;let i=e.y+C;this._crackTint(r),r.crack=this.mfx.add({frame:`partyCrack`,mode:`flat`,x:e.x,y:i,z:e.z,size:2.4,sizeTo:t.r*K.crackSize,grow:K.crackGrow,rot:e.a,color:r.crackRgb,life:1/0,alpha:K.crackAlpha}),r.ring=this.mfx.add({frame:`partyRing`,mode:`flat`,x:e.x,y:i+.03,z:e.z,frames:[0],size:K.ring[0],sizeTo:K.ring[1],grow:K.ringGrow,color:V.shock,life:1/0,alpha:S,soft:.3}),n.burst(`earthDustRing`,e.x,e.y+.15,e.z,12),n.burst(`partyRubble`,e.x,e.y+.2,e.z,10),this._planSpikes(r,this.mc.kit.skill2.spikes),this._kick=Math.max(this._kick,Y.quakeFlash)}erupt(e,t){for(let t of this._quakes)t.on&&t.fl===e&&(t.kick=1)}closed(e){for(let t of this._quakes)t.on&&t.fl===e&&this._endQuake(t)}_planSpikes(e,t){let n=this.sys,r=this.rng,i=this.mc.member.position,a=Math.atan2(i.z-e.z,i.x-e.x),o=n.fx,s=o?o.viewX:0,c=o?o.viewZ:-1;e.spikes.length=0;let l=(t.rInner+t.r)/2;for(let n=0;n<t.n;n++){let i=e.a+n*Math.PI*2/t.n+(n%2?.18:-.12),o=l+oe[n%3],u=Math.abs(le(i-a))/Math.PI,d=K.start+K.sweep*u,f=Math.cos(i),p=Math.sin(i),m=f*s+p*c,h=1-K.nearLow*Math.max(0,-m),g=K.height[0]+K.height[1]*r.next();if(this._pushSpike(e,e.x+f*o,e.z+p*o,f,p,g,K.radius[0]+(K.radius[1]-K.radius[0])*r.next(),d,u,!1,h),m>=0){let t=i+(r.next()<.5?-1:1)*K.compA,n=o*K.compR,a=Math.cos(t),s=Math.sin(t);this._pushSpike(e,e.x+a*n,e.z+s*n,a,s,g*K.compH,.18+.06*r.next(),d+K.compStart,u,!0,h)}}}_pushSpike(e,t,n,r,i,a,o,s,c,l,u){let d=this.rng,f=a*(K.lean[0]+(K.lean[1]-K.lean[0])*d.next()),p=(d.next()-.5)*.2*a;e.spikes.push({x:t,y:this.sys.groundAt(t,n)-K.sink,z:n,height:a,radius:o,yaw:d.next()*Math.PI*2,tiltX:r*f-i*p,tiltZ:i*f+r*p,seed:d.next()*2147483647|0,aspect:K.aspect[0]+(K.aspect[1]-K.aspect[0])*d.next(),start:s,h:-1,order:c,small:l,near:u,k:u,kr:1,r:0})}_readable(e){let t=this.sys,n=t.fx,r=n?n.viewX:0,i=n?n.viewZ:-1,a=!1,o=!1,s=!1,c=t.enemies;for(let t=0;t<c.length&&!a;t++){let n=c[t];if(!n.alive||!n.sprite?.visible)continue;let l=n.position.x-e.x,u=n.position.z-e.z,d=Math.hypot(l,u)-n.radius;d<K.clearGone?a=!0:d<K.clearStub&&(o=!0);let f=l*r+u*i;f>-.3&&f<K.screenDepth&&Math.abs(l*i-u*r)<K.screenSide&&(s=!0)}let l=t.player.position;{let n=l.x-e.x,c=l.z-e.z,u=Math.hypot(n,c)-(t.pc?.radius??.3);u<K.clearGone?a=!0:u<K.clearStub&&(o=!0);let d=n*r+c*i;d>-.3&&d<K.screenDepth&&Math.abs(n*i-c*r)<K.screenSide&&(s=!0)}let u=t.allies;for(let t=0;t<u.length&&!a;t++){let n=u[t];if(!n.present)continue;let c=n.position,l=c.x-e.x,d=c.z-e.z,f=Math.hypot(l,d)-n.radius;f<K.clearGone?a=!0:f<K.clearStub&&(o=!0);let p=l*r+d*i;p>-.3&&p<K.screenDepth&&Math.abs(l*i-d*r)<K.screenSide&&(s=!0)}let d=this._kf;return a?(d.k=0,d.kr=K.stubR,d):(d.k=e.near*(o?K.stubH:1)*(s?K.screenLow:1),d.kr=o?K.stubR:1,d)}_clearAt(e,t){let n=this.sys,r=1/0;for(let i of n.enemies)i.alive&&i.sprite?.visible&&(r=Math.min(r,Math.hypot(i.position.x-e,i.position.z-t)-i.radius));let i=n.player.position;r=Math.min(r,Math.hypot(i.x-e,i.z-t)-(n.pc?.radius??.3));for(let i of n.allies)i.present&&(r=Math.min(r,Math.hypot(i.position.x-e,i.position.z-t)-i.radius));return r}_freeFoot(e,t,n){if(this._clearAt(t.x,t.z)>=K.clearStub)return;let r=t.x-e.x,i=t.z-e.z,a=Math.hypot(r,i)||1,o=r/a,s=i/a;for(let r=1;r<=2*K.moveSteps;r++){let i=a+(r%2?1:-1)*Math.ceil(r/2)*K.moveStep;if(i<K.moveIn||i>K.moveOut)continue;let c=e.x+o*i,l=e.z+s*i;if(this._clearAt(c,l)<K.clearStub)continue;let u=!1;for(let r=0;r<n;r++){let n=e.spikes[r];n.h>=0&&Math.hypot(n.x-c,n.z-l)<n.radius+t.radius+.1&&(u=!0)}if(!u){t.x=c,t.z=l,t.y=this.sys.groundAt(c,l)-K.sink;return}}}_stepQuake(e){let t=this.sys,n=this.stage.spikes,r=e.t;if(!e.sunk)for(let i=0;i<e.spikes.length;i++){let a=e.spikes[i];if(a.h!==-1||r<a.start)continue;if(this._freeFoot(e,a,i),a.h=n.spawn(a),a.h<0){a.h=-2;continue}let o=this._readable(a);a.k=o.k,a.kr=o.kr,!a.small&&(t.burst(`partyRubble`,a.x,a.y+.25,a.z,2),i%4==0&&t.burst(`earthChipPuff`,a.x,a.y+.1,a.z,1))}if(!e.sunk&&r>=K.sinkAt){e.sunk=!0;for(let n of e.spikes)n.h<0||n.small||n.k<.05||(t.burst(`earthChips`,n.x,n.y+.3+.4*n.height*n.k,n.z,3),t.burst(`earthChipPuff`,n.x,n.y+.1,n.z,1))}if(r>=K.sinkAt+K.sinkT)for(let t of e.spikes)t.h>=0&&n.free(t.h),t.h!==-2&&(t.h=-3);e.ring&&r>=K.ringLife&&(this.mfx.kill(e.ring),e.ring=null),e.crack&&r>=K.crackLife&&(this.mfx.kill(e.crack),e.crack=null),r>=K.end&&this._endQuake(e)}_crackTint(e){let t=v.uNight.value,n=Math.exp(-e.t/K.heatTau),r=(1-H.flash*t)/Math.max(.05,1-H.matter*t);for(let t=0;t<3;t++)e.crackRgb[t]=V.crackBody[t]*(1-n)+V.crackFlash[t]*r*n}_quakeLook(e,t){this._crackTint(e),e.crack&&(e.crack.alpha=K.crackAlpha*Z((K.crackLife-e.t)/K.crackFade)),e.ring&&(e.ring.alpha=S*Z((K.ringLife-e.t)/K.ringFade));let n=this.stage.spikes,r=e.t,i=X((r-K.crackFrom)/(K.crackTo-K.crackFrom)),a=t>0?1-Math.exp(-t/K.ease):0,o=this._spikeP;for(let t of e.spikes){if(t.h<0)continue;let e;if(r<K.sinkAt)e=ue((r-t.start)/K.rise);else{let t=Z((r-K.sinkAt)/K.sinkT);e=1-t*t}if(a>0){let e=this._readable(t);t.k+=(e.k-t.k)*a,t.kr+=(e.kr-t.kr)*a}o.rise=t.k>.03?e:0,t.r=o.rise,o.crack=i,o.height=t.height*Math.max(.05,t.k),o.radius=t.radius*t.kr,n.set(t.h,o)}}_endQuake(e){let t=this.stage.spikes;for(let n of e.spikes)n.h>=0&&t.free(n.h);e.spikes.length=0,this.mfx.kill(e.crack),this.mfx.kill(e.ring),e.crack=null,e.ring=null,e.fl=null,e.on=!1}_wardRing(e,t,n,r){let i=this.fx.add({frame:`partyWardRing`,mode:`flat`,x:e.x,y:e.y+C,z:e.z,follow:e,scale:n,spin:1.2,color:V.wardRing,life:1/0,fadeIn:.2,alpha:J.ringAlpha});i&&this._rings.push({rec:i,owner:t,base:n,t:0,life:r})}_stepBulwark(){let e=this._bul;if(!e.on)return;let t=this.sys;if(!e.cued&&e.t>=J.tauntAt){e.cued=!0;for(let e of t.enemies){if(!e.alive||e.target!==this.mc||!(e.tauntT>4.9)||!e.sprite?.visible)continue;let t=(e.radius+J.tauntPad)/.75,n=this.fx.add({frame:`partyWardRing`,mode:`flat`,x:e.position.x,y:e.position.y+C,z:e.position.z,follow:e.position,scale:t*1.3,scaleTo:t,grow:J.tauntGrow,color:V.amber,life:1/0,alpha:S});n&&this._cues.push({rec:n,e,t:0})}}for(;e.glints<e.heroes.length&&e.t>=J.glintAt+e.glints*J.glintStagger;){let t=e.heroes[e.glints++];this.fx.add({frame:`partySunburst`,mode:`billboard`,x:t.x,y:t.y+1.1,z:t.z,follow:t,frames:[0,1],scale:.4,color:V.wardGlint,life:J.glintLife,fadeOut:.06,back:-.3,halo:1})}!e.motes&&e.t>=J.hold&&(e.motes=!0,t.burst(`earthWardMote`,e.cx,e.cy+e.R*.45,e.cz,8)),e.t>=G.wardEnd&&e.t>=J.hold+J.dissolve&&this._endBulwark()}_endBulwark(){let e=this._bul;e.on=!1,e.heroes.length=0;let t=this.stage;t.domeOwner===this&&(t.domeOwner=null,t.dome.hide())}step(e){this._clock+=e;for(let t of this._quakes)t.on&&(t.t=t.fl&&t.fl.on?t.fl.t:t.t+e,this._stepQuake(t));this._bul.on&&(this._bul.t+=e,this._stepBulwark());let t=this._rings;for(let n=t.length-1;n>=0;n--){let r=t[n];r.t+=e;let i=r.owner!==null&&r.owner.gone;if(r.t<r.life&&!i)continue;let a=r.rec;i||this.sys.burst(`earthWardMote`,a.x,a.y+.2,a.z,2,ce),this.fx.kill(a),t[n]=t[t.length-1],t.pop()}let n=this._cues;for(let t=n.length-1;t>=0;t--){let r=n[t];r.t+=e,!(r.t<J.tauntLife)&&(this.fx.kill(r.rec),n[t]=n[n.length-1],n.pop())}this.fx.step(e),this.mfx.step(e),this.gfx.step(e)}visuals(e){this._settling||(this._beatsLook(),this._landedLook());for(let t of this._quakes)t.on&&this._quakeLook(t,e);this._bulwarkLook(),this._ringsLook(),this._settling||this._glowLook(e),this._write()}_beatsLook(){let e=this.mc,t=this.sys,n=e.down?null:e.move;if((n!==this._move||e.t<this._moveT)&&(this._move=n,this._beats=0,this._chargeBorn=0,this._slammed=!1,this._skipMove=!1),this._moveT=e.t,this._skipMove)return;let r=e.frame,i=e.member.position,a=e.member.facing;if(n===`bash`&&r>=4&&!(this._beats&1)&&(this._beats|=1,t.burst(`footstep`,i.x-a.x*.3,i.y+.05,i.z-a.z*.3,3)),n===`earthshatter`&&!this._slammed){for(let e=0;e<3;e++){let n=2<<e;if(r<8+6*e||this._beats&n)continue;this._beats|=n;let o=i.x+a.x*.9,s=i.z+a.z*.9;t.burst(`earthGrit`,o,t.groundAt(o,s)+.05,s,5)}r>=G.chargeFrom&&this._chargeBorn===0&&(this._chargeBorn=++this._serial)}if(n===`bulwark`&&r<16){let t=X(e.t/y(16));this._seed||=this.fx.add({frame:`partyGlyphWard`,mode:`flat`,x:i.x,y:i.y+C,z:i.z,follow:i,size:J.seedSize[0],sizeTo:J.seedSize[1],grow:y(16),spin:1.5,color:V.seed,life:1/0,alpha:0}),this._seed&&(this._seed.alpha=J.seedAlpha*t)}else this._seed&&=(this.fx.kill(this._seed),null)}_landedLook(){let e=this.mc,t=e.counts.hits;if(t<this._hits&&(this._hits=t),t===this._hits)return;this._hits=t;let n=e.move;if(n!==`bash`&&n!==`mace`||this._sparkSwing===e.swings)return;this._sparkSwing=e.swings;let r=e.member.position,i=e.member.facing,a=r.x+i.x*1.2,o=r.z+i.z*1.2;n===`mace`&&this.sys.burst(`earthShieldSpark`,a,r.y+.8,o,4),this._spark||this._sparkAt(a,r.y+G.sparkLift,o,n===`bash`?G.bash:G.mace,G.sparkT,G.sparkDistance)}_sparkAt(e,t,n,r,i,a){let o=this._acquireLight({minor:!0});o&&(this._spark={light:o,x:e,y:t,z:n,t:0,dur:i,peak:r,dist:a})}_sparkLook(e){let t=this._spark;if(!t)return;if(t.t+=e,t.t>=t.dur||!t.light.held){t.light.off(),t.light.release(),this._spark=null;return}let n=1-t.t/t.dur,r=this._lightP;r.color=G.sparkColor,r.decay=1,r.intensity=t.peak*n*n*W(U.warm),r.distance=t.dist,t.light.set(t.x,t.y,t.z,r)}_bulwarkLook(){let e=this._bul;if(!e.on||this.stage.domeOwner!==this)return;let t=e.t,n=Z(t/J.rise),r=this._domeP;r.rise=1-(1-n)*(1-n)*(1-n),r.dissolve=X((t-J.hold)/J.dissolve);let i=J.sweeps[0],a=J.sweeps[1];r.sweepA=t>=i&&t<i+J.sweepT?(t-i)/J.sweepT:-9,r.sweepB=t>=a&&t<a+J.sweepT?(t-a)/J.sweepT:-9,this.stage.dome.set(r)}_ringsLook(){for(let e of this._rings){let t=e.rec;t.s0=t.s1=e.base*(1+J.ringPulse*(.5-.5*Math.cos(Math.PI*2*J.ringPulseHz*e.t)));let n=e.life-e.t,r=J.ringAlpha;if(n<J.expiry){let e=J.expiryLow;r=e+(J.ringAlpha-e)*(.5+.5*Math.cos(Math.PI*2*J.expiryHz*(J.expiry-n)))}t.alpha=r*Z(n/J.ringFade)*this._back}for(let e=this._cues.length-1;e>=0;e--){let t=this._cues[e];if(t.e.alive&&t.e.sprite?.visible){t.rec.alpha=S*Z(1-t.t/J.tauntLife);continue}this.fx.kill(t.rec),this._cues[e]=this._cues[this._cues.length-1],this._cues.pop()}}_fieldLight(){let e=this.mc,t=0,n=0,r=null;this._chargeBorn>0&&!this._slammed&&e.move===`earthshatter`&&!e.down&&e.frame<22&&(t=this._chargeBorn,n=1);for(let e of this._quakes)e.on&&e.t<G.quakeEnd&&e.born>t&&(t=e.born,n=2,r=e);let i=this._bul;if(i.on&&i.t<G.wardEnd&&i.born>t&&(t=i.born,n=3),n===0){this._field&&=(this._field.off(),this._field.release(),null);return}if(this._field&&!this._field.held&&(this._field=null),!this._field&&(t<=this._askedUpTo||(this._askedUpTo=t,this._field=this._acquireLight(),!this._field)))return;let a=this._field,o=this._lightP;if(n===1){let t=e.member.position,n=e.member.facing,r=t.x+n.x*.9,i=t.z+n.z*.9;o.color=G.slamColor,o.intensity=G.charge*X((e.t-y(G.chargeFrom))/y(G.chargeFrames))*W(U.warm),o.distance=G.chargeDistance,o.decay=1,a.set(r,this.sys.groundAt(r,i)+G.chargeLift,i,o)}else if(n===2&&r){let e=r.t,t=G.hold*W(U.warm)+((G.slam-G.hold)*r.flash+G.kick*r.kick)*W(U.flash);o.color=G.slamColor,o.intensity=t*(1-X((e-G.fadeFrom)/G.fadeT)),o.distance=G.slamDistance,o.decay=1+X((e-.1)/.3),a.set(r.x,r.y+G.slamLift,r.z,o)}else{let e=i.t,t=X(e/G.blend),n=G.cry*i.flash*W(U.flash),r=G.ward*W(U.cool)*(1-X((e-G.wardOut)/G.wardOutT)),s=this._lightC;for(let e=0;e<3;e++)s[e]=G.cryColor[e]+(G.wardColor[e]-G.cryColor[e])*t;o.color=s,o.intensity=n+r*t,o.distance=G.cryDistance+(G.wardDistance-G.cryDistance)*t,o.decay=1+(G.wardDecay-1)*t,a.set(i.x+(i.cx-i.x)*t,i.y+G.cryLift+(i.cy+G.wardLift-i.y-G.cryLift)*t,i.z+(i.cz-i.z)*t,o)}}_glowLook(e){if(!this._crest)return;let t=this.mc,n=0;t.move===`earthshatter`&&t.frame<22?n=Y.quakeCharge*X(t.t/y(22)):t.move===`bulwark`&&t.frame<16?n=Y.bulwarkCharge*X(t.t/y(16)):this._bul.on&&this._bul.t<J.hold?n=Y.bulwarkHold:this._rings.length&&(n=Y.wardPulse[0]+(Y.wardPulse[1]-Y.wardPulse[0])*(.5+.5*Math.sin(this._clock*Math.PI*2*.8))),this._kick>0&&(this.glow=Math.max(this.glow,this._kick),this._kick=0),this.glow=t.down?0:n>=this.glow?n:n+(this.glow-n)*Math.exp(-e/Y.tau),this.glow=Math.min(Y.max,this.glow),this.glow<.01&&(this.glow=0),this._writeGlow(this.glow)}_writeGlow(e){if(!this._crest)return;let t=Math.round(e*100)/100;t!==this._glowShown&&(this._glowShown=t,this.mc.member.sprite?.setGlow(Y.rgb[0],Y.rgb[1],Y.rgb[2],t))}_crestAt(){let e=this.mc,t=this._crest?.[e._lastRow]?.[e._lastCol]??null;if(!t)return null;let n=e.member.position,r=this._crestP,i=v.uCameraYaw.value;return r.x=n.x+Math.cos(i)*t.right,r.y=n.y+t.up,r.z=n.z-Math.sin(i)*t.right,r}info(){let e=0;for(let t of this._quakes)for(let n of t.spikes)n.h>=0&&e++;return{effects:this.count,quakes:this._quakes.filter(e=>e.on).length,spikes:e,bulwark:this._bul.on,dome:this.stage.domeOwner===this&&this.stage.dome.shown,wardRings:this._rings.length,taunts:this._cues.length,glow:+this.glow.toFixed(3),crest:!!this._crest,settling:this._settling,settled:this._settled,back:+this._back.toFixed(3),lights:{...this.lights,held:+!!this._field?.held+ +!!this._spark?.light.held,field:!!this._field?.held,spark:!!this._spark?.light.held}}}};export{de as EarthStage,$ as GreatshieldFx};