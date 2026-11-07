import{Br as e,Ci as t,Do as n,Dr as r,Eo as i,Fi as a,Ir as o,Ji as s,Mr as c,Nr as l,Or as u,Tr as d,Wi as f,Zr as p,_o as m,_t as h,br as g,co as _,dr as v,dt as ee,fo as y,fr as b,gr as x,jr as S,kr as C,mr as te,pr as w,ra as T,ui as E,ur as D,wi as O,xr as ne,yi as k}from"./LevelStorage-C_bJYT5y.js";import{_ as A}from"./Trees-fTuW5H_M.js";import{t as j}from"./GlobalUniforms-Hkw9cp0_.js";import{_ as re,g as M,h as ie,m as ae,p as N}from"./SmallProps-jKLn0VlM.js";var P={dust:{mode:`area`,motion:`drift`,texture:`glow`,blending:`additive`,count:90,life:[5,10],size:[.06,.12],sizeEnd:1,velocity:[0,.05,0],velocityVariance:[.07,.04,.07],windInfluence:.12,turbulence:[.3,.35],color:`#ffe0a0`,hdr:2.4,alpha:.85,fade:[.25,.3],twinkle:1,nightVisibility:-.85,bounds:[14,4,14]},fireflies:{mode:`area`,motion:`drift`,texture:`glow`,blending:`additive`,count:36,life:[8,14],size:[.2,.3],sizeEnd:1,velocity:[0,0,0],velocityVariance:[.1,.04,.1],windInfluence:.04,turbulence:[.8,.3],color:`#b6ff3c`,colorEnd:`#ffd23c`,hdr:2.4,alpha:1,fade:[.15,.2],blink:1,nightVisibility:1,bounds:[10,2.2,10]},embers:{mode:`point`,motion:`emit`,texture:`square`,blending:`additive`,count:34,life:[.9,2.2],size:[.07,.11],sizeEnd:.35,spawnSize:[.6,.15,.6],velocity:[0,1.5,0],velocityVariance:[.3,.55,.3],radial:.12,gravity:.5,drag:.7,windInfluence:.35,turbulence:[.3,5],color:`#ff8a2a`,colorEnd:`#ff3a12`,hdr:2.4,alpha:1,fade:[.04,.35],twinkle:.35},smoke:{mode:`point`,motion:`emit`,texture:`smoke`,blending:`normal`,count:22,life:[3.5,6],size:[.45,.7],sizeEnd:4.2,spawnSize:[.25,.1,.25],velocity:[0,.8,0],velocityVariance:[.1,.15,.1],gravity:.06,drag:.3,windInfluence:.22,turbulence:[.25,1.2],spin:[.1,.4],color:`#d2cdc8`,colorEnd:`#8d8b92`,alpha:.5,fade:[.12,.55],lit:1},leaves:{mode:`area`,motion:`fall`,texture:`leaf`,blending:`cutout`,count:24,size:[.46,.54],velocity:[0,-.75,0],velocityVariance:[0,.3,0],windInfluence:.45,turbulence:[.55,1.6],spin:[1.2,3],tumble:1,colors:[`#e0752f`,`#f2b04a`,`#b8462a`,`#86ad48`],alpha:1,fade:[.06,.12],lit:1,bounds:[10,6,10]},petals:{mode:`area`,motion:`fall`,texture:`petal`,blending:`cutout`,count:40,size:[.3,.36],velocity:[0,-.5,0],velocityVariance:[0,.3,0],windInfluence:.8,turbulence:[.75,1.3],spin:[1,2.6],tumble:1,colors:[`#f7b3c7`,`#ffd8e3`,`#fff4f6`,`#f28fb0`],alpha:1,fade:[.06,.12],lit:1,bounds:[10,5,10]},rain:{mode:`area`,motion:`precip`,texture:`streak`,blending:`normal`,followCamera:!0,count:1600,size:[.035,.05],aspect:12,streak:.03,velocity:[0,-15,0],velocityVariance:[0,.12,0],windInfluence:.9,color:`#c4d8f6`,alpha:.5,lit:.6,bounds:[36,16,36]},snow:{mode:`area`,motion:`precip`,texture:`snow`,blending:`normal`,followCamera:!0,count:1100,size:[.08,.13],velocity:[0,-1,0],velocityVariance:[0,.35,0],windInfluence:.45,turbulence:[.35,1.1],spin:[.5,.5],color:`#ffffff`,alpha:.95,lit:.75,bounds:[34,14,34]},mist:{mode:`point`,motion:`emit`,texture:`smoke`,blending:`normal`,count:34,life:[1.6,3],size:[.6,.9],sizeEnd:3.2,spawnSize:[2,.3,.4],velocity:[0,.35,.45],velocityVariance:[.45,.3,.35],radial:.5,gravity:.05,drag:1,windInfluence:.2,turbulence:[.2,1.5],spin:[.1,.5],color:`#eef8ff`,colorEnd:`#d2e6f4`,alpha:.28,fade:[.15,.6],lit:.9},footstep:{mode:`burst`,motion:`emit`,texture:`smoke`,blending:`normal`,count:8,life:[.35,.65],size:[.14,.22],sizeEnd:2.2,spawnSize:[.3,.02,.14],burstSpeed:[.5,1.1],burstUp:[.15,.45],gravity:-.3,drag:5,windInfluence:.1,spin:[.5,2],color:`#d6bf98`,alpha:.7,fade:[.05,.6],lit:1},splash:{mode:`burst`,motion:`emit`,texture:`square`,blending:`normal`,count:16,life:[.45,.8],size:[.07,.12],sizeEnd:.6,spawnSize:[.3,.02,.3],burstSpeed:[.8,2.2],burstUp:[2.2,4.2],gravity:-9.8,drag:.4,ballistic:!0,color:`#e8f6ff`,hdr:1.4,alpha:.95,fade:[0,.3],lit:.5},sparkle:{mode:`burst`,motion:`emit`,texture:`star`,blending:`additive`,count:10,life:[.45,1],size:[.28,.5],sizeEnd:.9,pulse:1,spawnSize:[.8,.8,.8],burstSpeed:[.2,.8],burstUp:[.2,.8],velocity:[0,.12,0],gravity:.2,drag:2,spin:[.5,2],color:`#fff6d0`,hdr:6,alpha:1,fade:[.05,.3],bounds:[4,1,4]},hitSpark:{mode:`burst`,motion:`emit`,texture:`streak`,blending:`additive`,variants:1,lit:0,pulse:0,tumble:0,aspect:4,streak:.04,fade:[0,.3],twinkle:0,blink:0,nightVisibility:0,count:8,life:[.12,.25],size:[.05,.08],sizeEnd:.6,spawnSize:[.1,.1,.1],burstSpeed:[3,7],burstUp:[.5,2],gravity:-8,drag:4,color:`#fff2c0`,colorEnd:`#ff9a3c`,hdr:4,alpha:1},emberBurst:{mode:`burst`,motion:`emit`,texture:`streak`,blending:`additive`,variants:1,lit:0,pulse:0,tumble:0,aspect:4,streak:.04,fade:[0,.3],twinkle:0,blink:0,nightVisibility:0,count:10,life:[.4,.9],size:[.05,.09],sizeEnd:.5,spawnSize:[.4,.2,.4],burstSpeed:[1,3],burstUp:[1,3],gravity:1.5,drag:1,colors:[`#ff8a2a`,`#ff3a12`,`#ffd27a`],hdr:3,alpha:1},deathPoof:{mode:`burst`,motion:`emit`,texture:`smoke`,blending:`normal`,variants:1,lit:1,pulse:0,tumble:0,aspect:1,streak:0,fade:[.05,.6],twinkle:0,blink:0,nightVisibility:0,count:10,life:[.4,.8],size:[.5,.5],sizeEnd:2.2,spawnSize:[.5,.3,.5],burstSpeed:[.6,1.4],burstUp:[.3,.8],drag:4,spin:[.5,2],color:`#d8d0c0`,alpha:.7},gooPoof:{mode:`burst`,motion:`emit`,texture:`smoke`,blending:`normal`,variants:1,lit:1,pulse:0,tumble:0,aspect:1,streak:0,fade:[.05,.6],twinkle:0,blink:0,nightVisibility:0,count:10,life:[.4,.8],size:[.5,.5],sizeEnd:2.2,spawnSize:[.5,.3,.5],burstSpeed:[.6,1.4],burstUp:[.3,.8],drag:4,spin:[.5,2],color:`#5fc7b0`,alpha:.7},healGlow:{mode:`burst`,motion:`emit`,texture:`star`,blending:`additive`,variants:1,lit:0,pulse:1,tumble:0,aspect:1,streak:0,fade:[.05,.3],twinkle:0,blink:0,nightVisibility:0,count:8,life:[.5,1],size:[.2,.35],sizeEnd:.8,spawnSize:[.6,.8,.6],velocity:[0,1.2,0],burstSpeed:[.2,.6],burstUp:[0,.3],drag:1,color:`#bfe58f`,hdr:2.4,alpha:1},magicBurst:{mode:`burst`,motion:`emit`,texture:`star`,blending:`additive`,variants:1,lit:0,pulse:1,tumble:0,aspect:1,streak:0,fade:[.05,.3],twinkle:0,blink:0,nightVisibility:0,count:12,life:[.4,.8],size:[.25,.45],sizeEnd:.7,spawnSize:[.3,.3,.3],burstSpeed:[2,5],burstUp:[-.5,.5],drag:3,colors:[`#8fd0ff`,`#f3cf7a`],hdr:3.5,alpha:1},victoryEmbers:{mode:`burst`,motion:`emit`,texture:`streak`,blending:`additive`,variants:1,lit:0,pulse:0,tumble:0,aspect:4,streak:.04,fade:[0,.3],twinkle:0,blink:0,nightVisibility:0,count:12,life:[.7,1.3],size:[.05,.08],sizeEnd:.5,spawnSize:[1,.8,.6],burstSpeed:[.3,1.1],burstUp:[1.6,3.2],gravity:1.2,drag:1.4,colors:[`#ff8a2a`,`#ff3a12`,`#ffd27a`],hdr:1.5,alpha:1},victorySparkle:{mode:`burst`,motion:`emit`,texture:`star`,blending:`additive`,variants:1,lit:0,pulse:1,tumble:0,aspect:1,streak:0,fade:[.05,.3],twinkle:0,blink:0,nightVisibility:0,count:12,life:[.6,1.1],size:[.16,.3],sizeEnd:.8,spawnSize:[1.4,1,.8],velocity:[0,.5,0],burstSpeed:[.15,.6],burstUp:[.2,.8],gravity:.2,drag:2,spin:[.5,2],color:`#fff0c8`,hdr:1.15,alpha:1},levelSparkle:{mode:`burst`,motion:`emit`,texture:`star`,blending:`additive`,variants:1,lit:0,pulse:1,tumble:0,aspect:1,streak:0,fade:[.05,.3],twinkle:0,blink:0,nightVisibility:0,count:14,life:[.6,1.1],size:[.14,.26],sizeEnd:.8,spawnSize:[1.3,.5,1.3],velocity:[0,.9,0],burstSpeed:[.3,.8],burstUp:[.1,.5],gravity:.2,drag:1.5,spin:[.5,2],color:`#fff0c8`,hdr:1.15,alpha:1}};function F(e){let t=P;for(let[n,r]of Object.entries(e)){if(Object.hasOwn(t,n)){if(t[n]===r)continue;throw Error(`Particles: the preset "${n}" is defined twice`)}t[n]=r}}var I={mode:`point`,motion:`emit`,texture:`glow`,blending:`additive`,count:32,life:[1,2],size:[.1,.1],sizeEnd:1,aspect:1,streak:0,velocity:[0,0,0],velocityVariance:[0,0,0],radial:0,gravity:0,drag:0,windInfluence:0,turbulence:[0,1],spin:[0,0],tumble:0,color:`#ffffff`,colorEnd:null,colors:null,hdr:1,alpha:1,fade:[.1,.3],twinkle:0,blink:0,nightVisibility:0,lit:0,pulse:0,bounds:[6,3,6],spawnSize:[.2,.2,.2],followCamera:!1,followDistance:20,burstSpeed:[.5,1.5],burstUp:[.5,1.5],ballistic:!1,map:null,variants:1},L=`
float lpBayer4( vec2 p ) {
	ivec2 q = ivec2( mod( floor( p ), 4.0 ) );
	const float M[ 16 ] = float[ 16 ]( 0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0 );
	return ( M[ q.y * 4 + q.x ] + 0.5 ) / 16.0;
}
`,R=`
#include <common>
#include <fog_pars_vertex>

uniform float uTime;
uniform float uNight;
uniform vec2 uWind;
uniform float uWindStrength;
uniform vec3 uSunColor;

uniform vec3 uOrigin;
uniform vec3 uBox;
uniform float uSeed;
uniform float uCount;
uniform float uIntensity;
uniform vec2 uLife;
uniform vec2 uSize;
uniform float uSizeEnd;
uniform vec2 uStretch;
uniform vec3 uVel;
uniform vec3 uVelVar;
uniform float uRadial;
uniform float uGravity;
uniform float uDrag;
uniform float uWindInfluence;
uniform vec2 uTurb;
uniform vec2 uSpin;
uniform float uTumble;
uniform vec3 uColor0;
uniform vec3 uColor1;
uniform vec3 uPalette[ 4 ];
uniform float uPaletteSize;
uniform float uAlpha;
uniform vec2 uFade;
uniform float uVariants;
uniform float uTwinkle;
uniform float uBlink;
uniform float uNightVis;
uniform float uLit;
uniform float uPulse;

#ifdef BURST
attribute vec4 aOrigin; // xyz spawn, w birth time
attribute vec4 aVel;    // xyz initial velocity, w life
attribute vec4 aSize;   // x size, y end multiplier, z rotation, w spin
attribute vec4 aColor;  // rgb (linear, HDR), a alpha
attribute vec4 aPhys;   // x gravity, y drag, z wind influence, w seed
#endif

varying vec2 vUv;
varying vec4 vColor;
varying float vVariant;

uvec4 lpPcg4( uvec4 v ) {
	v = v * 1664525u + 1013904223u;
	v.x += v.y * v.w; v.y += v.z * v.x; v.z += v.x * v.y; v.w += v.y * v.z;
	v ^= v >> 16u;
	v.x += v.y * v.w; v.y += v.z * v.x; v.z += v.x * v.y; v.w += v.y * v.z;
	return v;
}

vec4 lpHash( float a, float b, float c ) {
	uvec4 h = lpPcg4( uvec4( uint( a ), uint( b ), uint( c ), 2654435769u ) );
	return vec4( h >> 8u ) / 16777216.0;
}

void main() {

	vec3 wind3 = vec3( uWind.x, 0.0, uWind.y ) * uWindStrength;
	vec3 wpos = vec3( 0.0 );
	vec3 vel = vec3( 0.0, - 1.0, 0.0 );
	float t = 0.5;
	float age = 0.0;
	float size = 0.1;
	float angle = 0.0;
	float tumble = 1.0;
	float gate = 1.0;
	vec3 col = uColor0;
	float alpha = uAlpha;
	vec4 s = vec4( 0.5 );

#ifdef BURST

	age = uTime - aOrigin.w;
	float life = max( aVel.w, 1e-3 );
	t = age / life;
	gate = ( age >= 0.0 && t < 1.0 ) ? 1.0 : 0.0;
	s = fract( vec4( aPhys.w, aPhys.w * 7.31, aPhys.w * 13.17, aPhys.w * 3.73 ) );
	float k = max( aPhys.y, 1e-3 );
	vec3 g = vec3( 0.0, aPhys.x, 0.0 ) + wind3 * aPhys.z;
	float ek = exp( - k * max( age, 0.0 ) );
	float E = ( 1.0 - ek ) / k;
	wpos = aOrigin.xyz + aVel.xyz * E + g / k * ( age - E );
	vel = aVel.xyz * ek + g / k * ( 1.0 - ek );
	size = aSize.x * mix( 1.0, aSize.y, clamp( t, 0.0, 1.0 ) );
	angle = aSize.z + aSize.w * age;
	col = aColor.rgb;
	alpha = aColor.a;
	tumble = mix( 1.0, cos( age * aSize.w * 1.3 + s.y * 6.2831 ), uTumble );

#else

	float id = float( gl_InstanceID );
	s = lpHash( id, 0.0, uSeed );
	gate = clamp( uIntensity * uCount - id, 0.0, 1.0 ) * clamp( uIntensity * 3.0, 0.0, 1.0 );

	#ifdef MOTION_PRECIP

		vec4 r = lpHash( id, 1.0, uSeed );
		vec3 box = max( uBox, vec3( 1e-3 ) );
		float speed = abs( uVel.y ) * mix( 1.0 - uVelVar.y, 1.0 + uVelVar.y, r.w );
		vel = vec3( uVel.x, - speed, uVel.z ) + wind3 * uWindInfluence;
		vec3 p = r.xyz * box + vel * uTime;
		p.x += sin( uTime * uTurb.y + r.x * 43.0 ) * uTurb.x;
		p.z += cos( uTime * uTurb.y * 0.83 + r.z * 37.0 ) * uTurb.x;
		vec3 bmin = uOrigin - box * 0.5;
		vec3 rel = mod( p - bmin, box );
		wpos = bmin + rel;
		vec3 rn = rel / box;
		alpha *= smoothstep( 0.0, 0.05, rn.y ) * ( 1.0 - smoothstep( 0.8, 1.0, rn.y ) )
			* smoothstep( 0.0, 0.12, rn.x ) * ( 1.0 - smoothstep( 0.88, 1.0, rn.x ) )
			* smoothstep( 0.0, 0.12, rn.z ) * ( 1.0 - smoothstep( 0.88, 1.0, rn.z ) );
		size = mix( uSize.x, uSize.y, s.y );
		angle = s.w * 6.2831 + uSpin.x * uTime * ( s.x < 0.5 ? - 1.0 : 1.0 );
		age = uTime;
		t = 0.5;

	#else

		float life = max( mix( uLife.x, uLife.y, s.y ), 0.05 );
		#ifdef MOTION_FALL
			float fallSpeed = max( abs( uVel.y ) * mix( 1.0 - uVelVar.y, 1.0 + uVelVar.y, s.y ), 0.05 );
			life = max( uBox.y / fallSpeed, 0.05 );
		#endif
		float tt = uTime + s.z * life;
		float cycle = floor( tt / life );
		age = tt - cycle * life;
		t = age / life;
		vec4 r = lpHash( id, cycle + 2.0, uSeed + 17.0 );
		vec4 r2 = lpHash( id, cycle + 2.0, uSeed + 91.0 );
		vec3 spawn = uOrigin + ( r.xyz - 0.5 ) * uBox;

		#if defined( MOTION_DRIFT )

			float f = uTurb.y;
			vec3 wob = vec3(
				sin( uTime * f * ( 0.7 + r.w * 0.6 ) + r.x * 6.2831 ),
				sin( uTime * f * ( 0.5 + r2.x * 0.5 ) + r.y * 6.2831 ) * 0.5,
				cos( uTime * f * ( 0.6 + r2.y * 0.5 ) + r.z * 6.2831 ) ) * uTurb.x;
			vel = uVel + ( r2.xyz - 0.5 ) * 2.0 * uVelVar + wind3 * uWindInfluence;
			wpos = spawn + vel * age + wob;

		#elif defined( MOTION_FALL )

			spawn.y = uOrigin.y + uBox.y * 0.5;
			float sf = uTurb.y * ( 0.7 + 0.6 * r.w );
			wpos = spawn + vec3( 0.0, - fallSpeed * age, 0.0 ) + wind3 * uWindInfluence * age
				+ vec3( sin( age * sf + r.x * 6.2831 ), 0.0, cos( age * sf * 0.7 + r.z * 6.2831 ) * 0.6 ) * uTurb.x;
			vel = vec3( 0.0, - fallSpeed, 0.0 );
			tumble = mix( 1.0, cos( age * mix( uSpin.x, uSpin.y, r2.x ) * 1.3 + r2.y * 6.2831 ), uTumble );

		#else

			float ang = r.w * 6.2831;
			vec3 v0 = uVel + ( r2.xyz - 0.5 ) * 2.0 * uVelVar + vec3( cos( ang ), 0.0, sin( ang ) ) * uRadial * ( 0.4 + 0.6 * r2.w );
			float k = max( uDrag, 1e-3 );
			vec3 g = vec3( 0.0, uGravity, 0.0 ) + wind3 * uWindInfluence;
			float ek = exp( - k * age );
			float E = ( 1.0 - ek ) / k;
			wpos = spawn + v0 * E + g / k * ( age - E );
			vel = v0 * ek + g / k * ( 1.0 - ek );
			wpos += vec3( sin( age * uTurb.y + r.x * 6.2831 ), 0.0, cos( age * uTurb.y * 1.3 + r.y * 6.2831 ) ) * uTurb.x * t;
			tumble = mix( 1.0, cos( age * uSpin.y * 1.3 + r2.y * 6.2831 ), uTumble );

		#endif

		size = mix( uSize.x, uSize.y, r2.z ) * mix( 1.0, uSizeEnd, t );
		angle = r2.w * 6.2831 + mix( uSpin.x, uSpin.y, r.w ) * age * ( r2.x < 0.5 ? - 1.0 : 1.0 );
		col = mix( uColor0, uColor1, t );
		if ( uPaletteSize > 0.5 ) {
			int pIdx = int( min( floor( r2.z * uPaletteSize ), uPaletteSize - 1.0 ) );
			col = uPalette[ pIdx ];
		}
		s = r;

	#endif

#endif

	// life envelope
	float fadeIn = smoothstep( 0.0, max( uFade.x, 1e-4 ), t );
	float fadeOut = 1.0 - smoothstep( 1.0 - max( uFade.y, 1e-4 ), 1.0, t );
	alpha *= fadeIn * fadeOut;
	size *= mix( 1.0, sin( PI * clamp( t, 0.0, 1.0 ) ), uPulse );

	if ( uTwinkle > 0.0 ) {
		// max(): GPU sin() may overshoot -1 slightly; pow() of a negative base is NaN, and a NaN in the
		// HDR target spreads through bloom as black/white blocks
		float tw = pow( max( 0.5 + 0.5 * sin( uTime * ( 1.1 + s.x * 2.3 ) + s.z * 6.2831 ), 0.0 ), 14.0 );
		col *= 1.0 + uTwinkle * tw * 3.0;
		size *= 1.0 + uTwinkle * tw * 0.5;
	}
	if ( uBlink > 0.0 ) {
		float bl = smoothstep( 0.1, 0.95, sin( uTime * ( 0.8 + s.y * 1.3 ) + s.w * 6.2831 ) );
		alpha *= mix( 1.0, bl, uBlink );
		size *= mix( 1.0, 0.55 + 0.45 * bl, uBlink );
	}
	if ( uNightVis > 0.0 ) alpha *= smoothstep( 0.3, 0.85, uNight ) * uNightVis;
	else if ( uNightVis < 0.0 ) alpha *= 1.0 - uNight * ( - uNightVis );
	if ( uLit > 0.0 ) {
		vec3 amb = mix( vec3( 0.42, 0.45, 0.52 ), vec3( 0.06, 0.08, 0.15 ), uNight );
		col *= mix( vec3( 1.0 ), amb + uSunColor * 0.75, uLit );
	}
	if ( tumble < 0.0 ) col *= 0.78; // back side of a tumbling leaf
	alpha *= gate;

	vec4 mv = viewMatrix * vec4( wpos, 1.0 );
	vec2 corner = position.xy;
	vUv = uv;

#ifdef STREAK
	vec3 vv = ( viewMatrix * vec4( vel, 0.0 ) ).xyz;
	float vl = length( vv.xy );
	vec2 dir = vl > 1e-4 ? vv.xy / vl : vec2( 0.0, - 1.0 );
	vec2 side = vec2( - dir.y, dir.x );
	float len = size * uStretch.x + vl * uStretch.y;
	mv.xy += side * corner.x * size + dir * corner.y * len;
#else
	float tf = ( tumble >= 0.0 ? 1.0 : - 1.0 ) * max( abs( tumble ), 0.18 );
	corner.x *= tf;
	corner.y *= uStretch.x;
	float ca = cos( angle );
	float sa = sin( angle );
	mv.xy += vec2( corner.x * ca - corner.y * sa, corner.x * sa + corner.y * ca ) * size;
#endif

	gl_Position = projectionMatrix * mv;
	if ( alpha <= 0.002 ) gl_Position = vec4( 0.0, 0.0, 2.0, 1.0 ); // cull dead / hidden particles

	vColor = vec4( col, alpha );
	vVariant = floor( s.x * uVariants );

	#ifdef USE_FOG
		// the standard chunk (vFogDepth = -mvPosition.z), so a game that patches it — e.g. to start
		// the fog some distance in front of the camera — fogs particles like every other material
		vec4 mvPosition = mv;
		#include <fog_vertex>
	#endif
}
`,oe=`
#include <common>
#include <fog_pars_fragment>

uniform sampler2D uMap;
uniform float uVariants;

varying vec2 vUv;
varying vec4 vColor;
varying float vVariant;

${L}

void main() {

#ifdef USE_PMAP
	vec4 tex = texture2D( uMap, vec2( ( min( vVariant, uVariants - 1.0 ) + vUv.x ) / uVariants, vUv.y ) );
#else
	float across = 1.0 - abs( vUv.x * 2.0 - 1.0 );
	vec4 tex = vec4( 1.0, 1.0, 1.0, smoothstep( 0.0, 1.0, vUv.y ) * smoothstep( 0.0, 0.7, across ) );
#endif

	vec4 outColor = vec4( vColor.rgb * tex.rgb, vColor.a * tex.a );

#ifdef CUTOUT
	if ( tex.a < 0.5 ) discard;
	if ( vColor.a < 0.999 && vColor.a <= lpBayer4( gl_FragCoord.xy ) ) discard;
	outColor.a = 1.0;
#else
	if ( outColor.a < 0.004 ) discard;
#endif

	gl_FragColor = outColor;

	#include <tonemapping_fragment>
	#include <colorspace_fragment>

	#ifdef USE_FOG
		#ifdef FOG_EXP2
			float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
		#else
			float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
		#endif
		#ifdef ADDITIVE
			gl_FragColor.rgb *= 1.0 - fogFactor;
		#else
			gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
		#endif
	#endif
}
`;function z(e,t,n,r,i){for(let a=0;a<r.length;a++){let o=r[a];for(let r=0;r<o.length;r++){let s=i[o[r]];s&&e.set(t+r,n+a,[s[0]*255,s[0]*255,s[0]*255,s[1]*255])}}}function B(e,t,n,{angle:r,a:i,b:a,midrib:o,shades:s,stem:c}){let l=n/2-.5,u=n/2-.5,d=Math.cos(r),f=Math.sin(r),p=new v(n,n);for(let e=0;e<n;e++)for(let t=0;t<n;t++){let n=t-l,r=e-u,c=n*d+r*f,m=-n*f+r*d,h=a*(1-Math.max(0,c/i)*.35),g=c*c/(i*i)+m*m/(h*h);if(g>1)continue;let _=m<-.35?s.light:s.mid;g>.62&&m>.2&&(_=s.dark),o&&Math.abs(m)<.45&&c>-i*.8&&c<i*.75&&(_=s.rib),p.set(t,e,[_*255,_*255,_*255,255])}if(c){let e=Math.round(l-d*(i+.6)),t=Math.round(u-f*(i+.6));p.set(e,t,[s.outline*255,s.outline*255,s.outline*255,255])}let m=s.outline*255;p.outline([m,m,m,255]),e.blit(p,t,0)}function se(e){switch(e){case`glow`:{let e=new v(32,32);for(let t=0;t<32;t++)for(let n=0;n<32;n++){let r=Math.hypot(n+.5-16,t+.5-16)/16,i=C(.8*Math.exp(-r*r*4.5)+.2*Math.exp(-r*r*40)-.009*r,0,1);e.set(n,t,[255,255,255,i*255])}let t=b(e.toCanvas(),{wrap:`clamp`,mipmaps:!0,srgb:!0,name:`particle_glow`});return t.magFilter=a,{texture:t,variants:1}}case`square`:{let e=new v(8,4),t={b:[1,.55],d:[1,1]};return z(e,0,0,[`.bb.`,`bddb`,`bddb`,`.bb.`],t),z(e,4,0,[`....`,`.dd.`,`.dd.`,`....`],t),{texture:b(e.toCanvas(),{wrap:`clamp`,name:`particle_square`}),variants:2}}case`snow`:{let e=new v(8,4),t={a:[1,.4],b:[1,.8],d:[1,1]};return z(e,0,0,[`.aa.`,`abba`,`abda`,`.aa.`],t),z(e,4,0,[`....`,`.bd.`,`.db.`,`....`],t),{texture:b(e.toCanvas(),{wrap:`clamp`,name:`particle_snow`}),variants:2}}case`star`:{let e=new v(18,9),t={a:[1,.3],b:[1,.6],c:[1,.85],d:[1,1]};return z(e,0,0,[`....a....`,`....b....`,`....c....`,`...bdb...`,`abcdddcba`,`...bdb...`,`....c....`,`....b....`,`....a....`],t),z(e,9,0,[`.........`,`.........`,`..a...a..`,`...bcb...`,`...cdc...`,`...bcb...`,`..a...a..`,`.........`,`.........`],t),{texture:b(e.toCanvas(),{wrap:`clamp`,name:`particle_star`}),variants:2}}case`leaf`:{let e=new v(32,8),t={light:1,mid:.8,dark:.62,rib:.66,outline:.3};return B(e,0,8,{angle:-.75,a:3.1,b:1.55,midrib:!0,shades:t,stem:!0}),B(e,8,8,{angle:.6,a:2.7,b:1.7,midrib:!0,shades:t,stem:!0}),B(e,16,8,{angle:-1.35,a:3,b:1.35,midrib:!1,shades:t,stem:!0}),B(e,24,8,{angle:2.3,a:2.6,b:1.9,midrib:!0,shades:t,stem:!1}),{texture:b(e.toCanvas(),{wrap:`clamp`,name:`particle_leaf`}),variants:4}}case`petal`:{let e=new v(32,8),t={light:1,mid:.92,dark:.8,rib:.9,outline:.66};return B(e,0,8,{angle:-.5,a:2.2,b:1.6,midrib:!1,shades:t,stem:!1}),B(e,8,8,{angle:.9,a:2,b:1.4,midrib:!1,shades:t,stem:!1}),B(e,16,8,{angle:2,a:2.4,b:1.3,midrib:!1,shades:t,stem:!1}),B(e,24,8,{angle:-1.8,a:1.8,b:1.5,midrib:!1,shades:t,stem:!1}),{texture:b(e.toCanvas(),{wrap:`clamp`,name:`particle_petal`}),variants:4}}case`smoke`:{let e=new v(128,32);for(let t=0;t<4;t++){let n=t*32;for(let r=0;r<32;r++)for(let i=0;i<32;i++){let a=(i+.5-16)/16,o=(r+.5-16)/16,s=S(i/9+t*7.3,r/9+t*3.1,{octaves:3,seed:71+t}),c=Math.hypot(a,o)*1.08+(s-.5)*.55,l=C((.95-c)/.55,0,1);l=l*l*(3-2*l);let d=C(Math.floor(l*5+u(i,r)-.25),0,5)/5;if(d<=0)continue;let f=C(.5-o*.35-a*.15+(s-.5)*.5,0,1),p=.74+Math.round(f*3)/3*.26;e.set(n+i,r,[p*255,p*255,Math.min(1,p*1.03)*255,d*255])}}return{texture:b(e.toCanvas(),{wrap:`clamp`,mipmaps:!0,name:`particle_smoke`}),variants:4}}default:return null}}function V(e,t){return e==null?t:Array.isArray(e)?[e[0],e.length>1?e[1]:e[0]]:[e,e]}function H(e,t){return e==null?new n().fromArray(t):e.isVector3?e.clone():Array.isArray(e)?new n(e[0],e[1],e[2]):new n(e,e,e)}function U(e,t=1,n=new p){return n.set(g(e,p.NAMES)).multiplyScalar(t)}var W=(e,t)=>t[0]+(t[1]-t[0])*e.next();function ce(e,t){let n=ne(P,e);if(!n)throw Error(`Particles: unknown preset "${e}"`);let r={...I,...n,...t,preset:e};return Array.isArray(t.color)&&t.color.length===2&&typeof t.color[0]!=`number`?(r.color=t.color[0],r.colorEnd=t.color[1]):t.color!=null&&t.colorEnd===void 0&&(r.colorEnd=null,t.colors===void 0&&(r.colors=null)),r.size=V(r.size,[.1,.1]),r.life=V(r.life,[1,2]),r.spin=V(r.spin,[0,0]),r.fade=V(r.fade,[.1,.3]),r.turbulence=V(r.turbulence,[0,1]),r.burstSpeed=V(r.burstSpeed,[.5,1.5]),r.burstUp=V(r.burstUp,[.5,1.5]),r}function G(e,t){let r=[new p,new p,new p,new p],a=0;if(Array.isArray(e.colors)&&e.colors.length){a=Math.min(4,e.colors.length);for(let t=0;t<4;t++)U(e.colors[Math.min(t,a-1)],e.hdr,r[t])}let o=U(e.color,e.hdr),s=e.colorEnd==null?o.clone():U(e.colorEnd,e.hdr);return{uTime:j.uTime,uNight:j.uNight,uWind:j.uWind,uWindStrength:j.uWindStrength,uSunColor:j.uSunColor,...m.clone(A.fog),uFogStart:j.uFogStart,uMap:{value:t?t.texture:null},uVariants:{value:t?t.variants:1},uOrigin:{value:new n},uBox:{value:new n(1,1,1)},uSeed:{value:1},uCount:{value:1},uIntensity:{value:1},uLife:{value:new i(e.life[0],e.life[1])},uSize:{value:new i(e.size[0],e.size[1])},uSizeEnd:{value:e.sizeEnd},uStretch:{value:new i(e.aspect,e.streak)},uVel:{value:H(e.velocity,[0,0,0])},uVelVar:{value:H(e.velocityVariance,[0,0,0])},uRadial:{value:e.radial},uGravity:{value:e.gravity},uDrag:{value:e.drag},uWindInfluence:{value:e.windInfluence},uTurb:{value:new i(e.turbulence[0],e.turbulence[1])},uSpin:{value:new i(e.spin[0],e.spin[1])},uTumble:{value:e.tumble},uColor0:{value:o},uColor1:{value:s},uPalette:{value:r},uPaletteSize:{value:a},uAlpha:{value:e.alpha},uFade:{value:new i(e.fade[0],e.fade[1])},uTwinkle:{value:e.twinkle},uBlink:{value:e.blink},uNightVis:{value:e.nightVisibility},uLit:{value:typeof e.lit==`boolean`?+!!e.lit:e.lit},uPulse:{value:e.pulse}}}function le(e,t,n){let r={};r[`MOTION_${String(n?`emit`:e.motion).toUpperCase()}`]=``,n&&(r.BURST=``),e.texture===`streak`&&!e.map?r.STREAK=``:r.USE_PMAP=``,e.blending===`additive`&&(r.ADDITIVE=``),e.blending===`cutout`&&(r.CUTOUT=``);let i=e.blending===`cutout`;return new _({name:`Particles.${e.preset}${n?`.burst`:``}`,uniforms:t,defines:r,vertexShader:R,fragmentShader:oe,transparent:!i,depthWrite:i,blending:e.blending===`additive`?2:1,side:2,fog:!0})}function K(){let e=new O,t=new T(1,1);return e.setIndex(t.index),e.setAttribute(`position`,t.getAttribute(`position`)),e.setAttribute(`uv`,t.getAttribute(`uv`)),t.dispose(),e}var q=class{constructor(t,r){let i=ce(r.preset,r);this.system=t,this.config=i,this.preset=i.preset,this.followCamera=!!i.followCamera,this.followDistance=i.followDistance;let a=!!r.bounds||i.mode===`area`||i.motion===`precip`;this.mode=a?`area`:`point`;let o=r.bounds?.center??r.position??new n;this.position=o.isVector3?o.clone():Array.isArray(o)?new n().fromArray(o):new n(o.x??0,o.y??0,o.z??0);let s=a?r.bounds?.size??i.bounds:i.spawnSize;this.boxSize=H(s,[1,1,1]);let c=!!r.bounds?.center,l=this.position.y;a&&!c&&r.position&&i.motion!==`precip`&&(this.position.y+=this.boxSize.y*.5),this.followBaseY=c?l-this.boxSize.y*.5:r.position?l:0;let u=i.count;r.rate!=null&&i.motion!==`precip`&&(u=Math.ceil(r.rate*(i.life[0]+i.life[1])*.5)),this.count=Math.max(1,Math.round(u));let d=null;i.map?d={texture:i.map,variants:i.variants||1}:i.texture!==`streak`&&(d=t._texture(i.texture)),this.uniforms=G(i,d),this.uniforms.uOrigin.value=this.position,this.uniforms.uBox.value.copy(this.boxSize),this.uniforms.uSeed.value=r.seed??t._nextSeed(i.preset),this.uniforms.uCount.value=this.count,this.geometry=K(),this.geometry.instanceCount=this.count,this.material=le(i,this.uniforms,!1),this.object=new f(this.geometry,this.material),this.object.name=`Emitter.${i.preset}`,this.object.renderOrder=e.PARTICLES+(i.blending===`additive`?2:0),this.object.matrixAutoUpdate=!1,this.object.castShadow=!1,this.object.receiveShadow=!1,this.object.frustumCulled=!this.followCamera,this._windKey=this._windStrength(),this.geometry.boundingSphere=new y(this.position.clone(),this._estimateRadius()),this.geometry.boundingBox=null,this._enabled=!0,this._intensity=1,this.enabled=r.enabled??!0,this.intensity=r.intensity??1}_windStrength(){return j.uWind.value.length()*Math.max(1,j.uWindStrength.value)}_estimateRadius(){let e=this.config,t=e.life[1],n=this.uniforms,r=n.uVel.value.length()+n.uVelVar.value.length()+e.radial,i=Math.max(e.drag,.001),a=j.uWind.value.length()*Math.max(1,j.uWindStrength.value)*e.windInfluence,o=Math.abs(e.gravity)+a,s=Math.min(r*t,r/i)+Math.min(.5*o*t*t,o/i*t);this.config.motion===`fall`&&(s=a*(this.boxSize.y/Math.max(.05,Math.abs(n.uVel.value.y)))+e.turbulence[0]),this.config.motion===`drift`&&(s=(r+a)*t+e.turbulence[0]);let c=e.size[1]*Math.max(1,e.sizeEnd)*Math.max(1,e.aspect);return this.boxSize.length()*.5+s+c+.5}get enabled(){return this._enabled}set enabled(e){this._enabled=!!e,this._refresh()}get intensity(){return this._intensity}set intensity(e){this._intensity=Math.max(0,+e||0),this.uniforms.uIntensity.value=this._intensity,this._refresh()}_refresh(){let e=Math.min(this.count,Math.ceil(this.count*Math.min(1,this._intensity)));this.geometry.instanceCount=e,this.object.visible=this._enabled&&e>0}_update(e,t){if(this.followCamera&&e){let e=this.followBaseY,n=this.followDistance;t.fy<-.05&&(n=C((e-t.py)/t.fy,2,120)),this.position.set(t.px+t.fx*n,e+this.boxSize.y*.5,t.pz+t.fz*n)}let n=this.geometry.boundingSphere;if(n.center.copy(this.position),this.object.frustumCulled){let e=this._windStrength();Math.abs(e-this._windKey)>.02*Math.max(1,this._windKey)&&(this._windKey=e,n.radius=this._estimateRadius())}}dispose(){this.object.parent&&this.object.parent.remove(this.object),this.geometry.dispose(),this.material.dispose();let e=this.system.emitters,t=e.indexOf(this);t>=0&&e.splice(t,1)}},ue=class{constructor(n,r,i=512){this.capacity=i,this.head=0,this.used=0,this.aliveUntil=-1/0;let a=null;r.map?a={texture:r.map,variants:r.variants||1}:r.texture!==`streak`&&(a=n._texture(r.texture)),this.uniforms=G(r,a);let o=K(),s=()=>{let e=new t(new Float32Array(i*4),4);return e.setUsage(E),e};this.aOrigin=s(),this.aVel=s(),this.aSize=s(),this.aColor=s(),this.aPhys=s();for(let e=0;e<i;e++)this.aOrigin.array[e*4+3]=-1e6;o.setAttribute(`aOrigin`,this.aOrigin),o.setAttribute(`aVel`,this.aVel),o.setAttribute(`aSize`,this.aSize),o.setAttribute(`aColor`,this.aColor),o.setAttribute(`aPhys`,this.aPhys),o.instanceCount=0,this.geometry=o,this.material=le(r,this.uniforms,!0),this.object=new f(o,this.material),this.object.name=`Particles.burst.${r.texture}.${r.blending}`,this.object.frustumCulled=!1,this.object.matrixAutoUpdate=!1,this.object.renderOrder=e.PARTICLES+(r.blending===`additive`?3:1),this.object.visible=!1,this._dirtyStart=1/0,this._dirtyEnd=-1}write(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h,g,_,v,ee){let y=this.head,b=y*4,x=this.aOrigin.array;x[b]=e,x[b+1]=t,x[b+2]=n,x[b+3]=r,x=this.aVel.array,x[b]=i,x[b+1]=a,x[b+2]=o,x[b+3]=s,x=this.aSize.array,x[b]=c,x[b+1]=l,x[b+2]=u,x[b+3]=d,x=this.aColor.array,x[b]=f,x[b+1]=p,x[b+2]=m,x[b+3]=h,x=this.aPhys.array,x[b]=g,x[b+1]=_,x[b+2]=v,x[b+3]=ee,y<this._dirtyStart&&(this._dirtyStart=y),y+1>this._dirtyEnd&&(this._dirtyEnd=y+1),this.head=(y+1)%this.capacity,this.used=Math.max(this.used,y+1),r+s>this.aliveUntil&&(this.aliveUntil=r+s)}flush(){if(this._dirtyEnd<0)return;let e=this._dirtyStart*4,t=(this._dirtyEnd-this._dirtyStart)*4;for(let n of[this.aOrigin,this.aVel,this.aSize,this.aColor,this.aPhys])n.addUpdateRange(e,t),n.needsUpdate=!0;this._dirtyStart=1/0,this._dirtyEnd=-1,this.geometry.instanceCount=this.used,this.object.visible=!0}dispose(){this.object.parent&&this.object.parent.remove(this.object),this.geometry.dispose(),this.material.dispose()}},de=class{constructor(e){this.scene=e,this.object=new k,this.object.name=`Particles`,e&&e.add(this.object),this.emitters=[],this._pools=new Map,this._poolList=[],this._burstConfigs=new Map,this._textures=new Map,this._rng=new r(20903),this._emitterCounter=0,this._cam={px:0,py:0,pz:0,fx:0,fy:-1,fz:0}}_texture(e){let t=this._textures.get(e);return t===void 0&&(t=se(e),this._textures.set(e,t)),t}_nextSeed(e){return this._emitterCounter++,(l(e)+this._emitterCounter*7919)%1000003}createEmitter(e){let t=new q(this,e);return this.emitters.push(t),this.object.add(t.object),t}_pool(e){let t=`${e.map?e.map.uuid:e.texture}|${e.variants}|${e.blending}|${+e.lit}|${e.pulse}|${e.tumble}|${e.aspect}|${e.streak}|${e.fade[0]}|${e.fade[1]}|${e.twinkle}|${e.blink}|${e.nightVisibility}`,n=this._pools.get(t);return n||(n=new ue(this,e),this._pools.set(t,n),this._poolList.push(n),this.object.add(n.object)),n}_burstConfig(e,t){let n=!1;for(let e in t){n=!0;break}if(!n){let t=this._burstConfigs.get(e);if(t)return t}let r=ce(e,t);return r._spawn=H(r.spawnSize,[.2,.2,.2]),r._vel=H(r.velocity,[0,0,0]),r._velVar=H(r.velocityVariance,[0,0,0]),r._color=U(r.color,r.hdr),r._palette=Array.isArray(r.colors)&&r.colors.length?r.colors.map(e=>U(e,r.hdr)):null,r._lit=typeof r.lit==`boolean`?+!!r.lit:r.lit,r._pool=this._pool(r),n||this._burstConfigs.set(e,r),r}burst(e,t,n=12,r={}){let i=this._burstConfig(e,r),a=i._pool,o=this._rng,s=j.uTime.value,c=i._vel,l=i._velVar,u=i._spawn,d=i._palette,f=i._color,p=Math.max(0,Math.min(a.capacity,n|0));for(let e=0;e<p;e++){let e=o.next()*Math.PI*2,n=W(o,i.burstSpeed),r=W(o,i.burstUp),p=Math.cos(e)*n+c.x+(o.next()*2-1)*l.x,m=r+c.y+(o.next()*2-1)*l.y,h=Math.sin(e)*n+c.z+(o.next()*2-1)*l.z,g=W(o,i.life);i.ballistic&&i.gravity<0&&m>0&&(g=Math.min(g,2*m/-i.gravity*.95));let _=d?d[Math.floor(o.next()*d.length)]:f,v=W(o,i.spin)*(o.next()<.5?-1:1);a.write(t.x+(o.next()-.5)*u.x,t.y+(o.next()-.5)*u.y,t.z+(o.next()-.5)*u.z,s,p,m,h,g,W(o,i.size),i.sizeEnd,o.next()*Math.PI*2,v,_.r,_.g,_.b,i.alpha,i.gravity,i.drag,i.windInfluence,o.next())}a.flush()}burstPools(){return this._poolList.slice()}releaseBurstPools(e){let t=new Set(e);if(t.size){for(let[e,n]of this._pools)t.has(n)&&this._pools.delete(e);for(let[e,n]of this._burstConfigs)t.has(n._pool)&&this._burstConfigs.delete(e);for(let e=this._poolList.length-1;e>=0;e--)t.has(this._poolList[e])&&this._poolList.splice(e,1);for(let e of t)e.dispose()}}update(e,t){let n=this._cam;if(t){let e=t.matrixWorld.elements;n.px=e[12],n.py=e[13],n.pz=e[14],n.fx=-e[8],n.fy=-e[9],n.fz=-e[10]}for(let e=0;e<this.emitters.length;e++)this.emitters[e]._update(t,n);let r=j.uTime.value,i=this._poolList;for(let e=0;e<i.length;e++){let t=i[e];t.object.visible&&r>t.aliveUntil+.05&&(t.object.visible=!1)}}dispose(){for(let e of this.emitters.slice())e.dispose();this.emitters.length=0;for(let e of this._poolList)e.dispose();this._pools.clear(),this._poolList.length=0,this._burstConfigs.clear();for(let e of this._textures.values())e&&e.texture.dispose();this._textures.clear(),this.object.parent&&this.object.parent.remove(this.object)}},fe=D.outline;function J(e,t,{alpha:n=!1,normalStrength:r=2,wrap:i=!0}={}){let a=e.width,o=e.height,s=b(e.toCanvas(),{wrap:`repeat`,mipmaps:!0,anisotropy:4}),c=te(a,o,(e,n)=>t[n*a+e],{strength:r,wrap:i});return{map:s,normal:b(c.toCanvas(),{wrap:`repeat`,mipmaps:!0,srgb:!1,anisotropy:4}),units:[a/16,o/16],alpha:n}}function pe(e){let t=new r(e),n=new v(16,32);n.wrap=!0;let i=new Float32Array(512).fill(.6),a=[`#9c9a9a`,`#c4c1bb`,`#dedad2`,`#eeebe3`,`#f8f6ef`];for(let t=0;t<32;t++)for(let r=0;r<16;r++){let o=c(r,t>>1,e)*.5+c(r>>1,t>>2,e+3)*.5,s=C(Math.floor(o*3.2+1),0,4);n.set(r,t,a[s]),i[t*16+r]=.55+o*.1}for(let e=0;e<16;e++){let e=t.int(0,31),r=t.int(0,15),a=t.int(2,6);for(let t=0;t<a;t++)n.set(r+t,e,t===0||t===a-1?`#56555f`:`#2b2a33`),n.set(r+t,e+1,`#fbfaf5`),i[(e%32+32)%32*16+(r+t)%16]=.3}for(let e=0;e<2;e++){let e=t.int(0,15),r=t.int(0,31);for(let[t,a]of[[0,0],[1,0],[-1,0],[0,1],[2,1],[-2,1],[1,1],[-1,1],[0,-1]])n.set(e+t,r+a,a===-1?`#3d3c47`:fe),i[((r+a)%32+32)%32*16+((e+t)%16+16)%16]=.2}return J(n,i,{normalStrength:2.2})}function me(e){let t=new v(64,16,`#1d1311`),n=new Float32Array(1024).fill(.1);return[{ramp:[`#3a0c14`,`#7a1a22`,`#b8302e`,`#e0584a`,`#f7a37e`],r:2.2,step:4},{ramp:[`#4a1d0c`,`#9c4414`,`#dd7a1f`,`#f5a93a`,`#ffe08a`],r:2.2,step:4},{ramp:[`#0f261c`,`#1f4a2a`,`#3c7a36`,`#68a845`,`#a8d466`],r:3.1,step:6},{ramp:[`#170c24`,`#34194a`,`#5a2d78`,`#8a4aa8`,`#c08ad6`],r:1.3,step:3}].forEach((i,a)=>{let o=new r(e+a*97),s=a*16,l=[];for(let e=-1;e*i.step<16+i.step;e++)for(let t=-1;t*i.step<16+i.step;t++)l.push([t*i.step+(e&1?i.step/2:0)+o.range(-.7,.7)+1.5,e*i.step+o.range(-.7,.7)+1.5]);l.sort((e,t)=>e[1]-t[1]);for(let[r,u]of l){let l=i.r*o.range(.9,1.1);for(let o=Math.floor(u-l-1);o<=Math.ceil(u+l+1);o++)for(let d=Math.floor(r-l-1);d<=Math.ceil(r+l+1);d++){if(d<0||o<0||d>=16||o>=16)continue;let f=d+.5-r,p=o+.5-u,m=Math.hypot(f,p)/(l+.35);if(m>1)continue;let h=C(.62-f*.12-p*.16-m*.35+(a===2?(c(d,o,e)-.5)*.3:0),0,.999),g=i.ramp[Math.floor(h*i.ramp.length)];m>.84&&(g=i.ramp[0]),t.set(s+d,o,g),n[o*64+s+d]=.4+(1-m*m)*.6}let d=Math.round(r-l*.45-.5),f=Math.round(u-l*.45-.5);if(a!==2&&d>=0&&f>=0&&d<16&&f<16&&t.set(s+d,f,i.ramp[4]),a===0&&o.chance(.5)){let e=Math.round(r-.5),n=Math.round(u-l+.2);e>=0&&n>=0&&e<16&&n<16&&t.set(s+e,n,`#4a2a18`)}}}),J(t,n,{normalStrength:2.5,wrap:!1})}function he(e){let t=new r(e),n=new v(16,48),i=new Float32Array(768).fill(0),a=D.wood,o=[`#8f8170`,`#b8a88e`,`#d6c8aa`,`#ebe1c9`,`#f6efdd`];for(let t=0;t<39;t++)for(let r=1;r<15;r++){let a=Math.sin(r/14*Math.PI*2.2+.4)*.5+.5,s=c(r,t,e),l=C(Math.floor(1+a*2.2+s*.9-(t>34?.8:0)),0,4);n.set(r,t,o[l]),i[t*16+r]=.35+a*.15}let s=t.int(6,24),l=t.int(3,9);n.rect(l,s,3,3,`#c9a77a`),n.strokeRect(l,s,3,3,`#9a7a55`);let u=(e,t,r,a=.9)=>{n.set(e,t,r),e>=0&&t>=0&&e<16&&t<48&&(i[t*16+e]=a)};for(let e=0;e<48;e++)u(0,e,a[1]),u(15,e,a[2]),e>=39&&u(8,e,a[3]);for(let e=0;e<48;e+=5){for(let t=0;t<16;t++)u(t,e,t===0?a[1]:a[3],.85);for(let t=0;t<16;t++)e+1<48&&n.getAlpha(t,e+1)>0&&n.set(t,e+1,x(n.get(t,e+1),-.25))}for(let e=0;e<16;e++)u(e,47,a[2]);return J(n,i,{alpha:!0,normalStrength:2,wrap:!1})}function Y(e){let t=new r(e),n=new v(32,32),i=new Float32Array(1024).fill(0),a=D.leavesAutumn;for(let e=0;e<70;e++){let e=t.next()*Math.PI*2,r=Math.sqrt(t.next())*14,o=Math.round(16+Math.cos(e)*r),s=Math.round(16+Math.sin(e)*r*.9),c=a[t.int(1,4)],l=a[Math.min(5,t.int(3,5))];n.set(o,s,c),n.set(o+1,s,t.chance(.5)?c:l),t.chance(.6)&&n.set(o,s+1,x(c,-.2)),t.chance(.3)&&n.set(o-1,s,l),i[C(s,0,31)*32+C(o,0,31)]=1}return J(n,i,{alpha:!0,normalStrength:1,wrap:!1})}function ge(e){let t=new v(16,16),n=new Float32Array(256),r=[`#141116`,`#221c20`,`#352c2c`,`#4a3f3b`,`#6b5f58`];for(let i=0;i<16;i++)for(let a=0;a<16;a++){let o=c(a,i,e)*.6+c(a>>1,i>>1,e+1)*.4;t.set(a,i,r[C(Math.floor(o*5),0,4)]),n[i*16+a]=o,c(a,i,e+9)>.93&&t.set(a,i,w(`#ff7a2a`,`#5a1208`,c(i,a,e)))}return J(t,n,{normalStrength:1.5})}function X(e,t=!1){let n=new r(e),i=new v(32,32);i.wrap=!0;let a=new Float32Array(1024),o=[`#3d4053`,`#4f5468`,`#626a7c`,`#767e8d`,`#8e97a3`],s=[`#1c2f25`,`#2e4a31`,`#4b6b3a`,`#6f8d45`,`#93ad55`];for(let t=0;t<32;t++)for(let n=0;n<32;n++){let r=S(n/8,t/8,{octaves:3,seed:e,period:4}),s=(u(n,t)-.5)*.35,c=C((r-.5)*1.35+.55+s*.5,0,.999);i.set(n,t,o[Math.floor(c*o.length)]),a[t*32+n]=.45+r*.3}for(let e=0;e<3;e++){let e=n.int(0,31),t=n.int(0,31),r=n.int(4,8),o=n.chance(.5)?1:-1;for(let s=0;s<r;s++)i.set(e,t,`#2a2b3a`),i.set(e,t+1,`#9aa3ad`),a[(t%32+32)%32*32+(e%32+32)%32]=.15,e+=o,n.chance(.45)&&(t+=n.chance(.5)?1:-1),n.chance(.15)&&(o=-o)}for(let e=0;e<10;e++){let e=n.int(0,31),t=n.int(0,31);i.set(e,t,n.chance(.5)?`#a9a86a`:`#c8b77a`)}if(t){for(let t=0;t<32;t++)for(let n=0;n<32;n++){let r=S(n/8+11.3,t/8+7.1,{octaves:3,seed:e+5,period:4});if(r<.4)continue;let o=C((r-.4)*3.6+(u(n,t)-.5)*.4,0,.999);i.set(n,t,s[Math.min(4,1+Math.floor(o*4))]),a[t*32+n]=.7+o*.25}let t=i.clone();for(let e=0;e<32;e++)for(let n=0;n<32;n++){let r=t.get(n,e);r[1]>r[2]+8||t.get(n,e-1)[1]>t.get(n,e-1)[2]+8&&i.set(n,e,`#2e3b30`)}}return J(i,a,{normalStrength:2.2})}var _e={birch:pe,produce:me,sail:he,leaf_litter:Y,ash:ge,boulder:e=>X(e,!1),boulder_moss:e=>X(e,!0)};function ve(e){let t=_e;for(let[n,r]of Object.entries(e)){if(Object.hasOwn(t,n)){if(t[n]===r)continue;throw Error(`PropTextureSet: the texture "${n}" is defined twice`)}t[n]=r}}var ye=Object.freeze({finish:J,OUTLINE:fe}),be=class{constructor(e=42){this.seed=e>>>0,this._tex=new Map,this._mats=new Map}textures(e){let t=this._tex.get(e);if(!t){let n=Object.hasOwn(_e,e)?_e[e]:null;if(!n)throw Error(`PropTextureSet: unknown texture "${e}" (the arid trees' are the set-piece kit's: src/engine/world/SetPieceKit.js)`);t=n(this.seed+(e===`boulder_moss`?`boulder`:e).length*7919),this._tex.set(e,t)}return t}material(e,t={}){let n=`${e}|${JSON.stringify(t)}`,r=this._mats.get(n);if(r)return r;let a=this.textures(e);return r=new s({map:a.map,normalMap:a.normal,normalScale:new i(.6,.6),vertexColors:!0,...a.alpha?{alphaTest:.5,side:2}:{},...t}),r.name=`luminati:prop:${e}`,r.userData.units=a.units,r.userData.texture=null,a.alpha&&(r.userData.alpha=!0),this._mats.set(n,r),r}dispose(){for(let e of this._tex.values())e.map.dispose(),e.normal.dispose();for(let e of this._mats.values())e.dispose();this._tex.clear(),this._mats.clear()}},xe={front:{n:[0,1],yaw:0},back:{n:[0,-1],yaw:Math.PI},right:{n:[1,0],yaw:Math.PI/2},left:{n:[-1,0],yaw:-Math.PI/2}},Se={front:`right`,back:`left`,left:`front`,right:`back`},Ce=[[.62,.78,1],[.7,.95,.65],[1,.72,.62],[1,1,1]],we=new Set([`adobe`,`whitewash`]),Te=new Set([`sandstone_brick`,`charred_wall`]),Ee=[.3,.26,.25],De=[.46,.4,.38],Oe=[.07,.055,.05];function Z(e,t,n,r,i={}){let a={width:4,depth:3,stories:1,roof:`roof_red`,wall:`timber_frame`,rotation:0,chimney:!0,door:`front`,...i},s=e.textures,c=e.rng(`house`,t,r,a.seed),l=Number.isFinite(a.ruin)?C(Math.round(a.ruin),0,2):0,u=Number.isFinite(a.burning)?C(a.burning,0,1):0,f=a.flatRoof===!0,p=l>0||u>0,m=p||f?e.rng(`house:siege`,t,r,a.seed):null,g=p||f?h(`a damaged, burning or flat-roofed house`):null,_=!!a.gableFront,v=_?a.depth:a.width,y=_?a.width:a.depth,b=C(Math.round(a.stories),1,2),x=a.plinthHeight??.5,S=a.storyHeight??3,te=b>1?a.upperHeight??2:0,w=b>1?a.jetty??(f||l===2?0:.25):0,T=a.wall,E=a.upperWall??T,D=a.plinth??(T===`charred_wall`?`charred_wall`:we.has(T)||Te.has(T)?`sandstone_brick`:`stone_brick`),O=x+S+te,k=v/2,A=y/2,j=A+w,M=(a.pitch??c.range(38,45))*d,P=a.overhang??.35,F=j*Math.tan(M),I=a.roofThickness??.22,L=.1,R=e.builder((e,t)=>{let n=.62+.38*o(-.05,1.1,t);return t>x&&t<O+.01&&(n*=1-.2*o(O-.9,O,t)),n});_&&R.matrix.makeRotationY(-Math.PI/2);let oe=e.windowMaterial(),z=e.glassMaterial(),B=[],se=[],V=[{material:oe,day:0,night:1.6}],H={},U=p?g.siegeDecalMaterial(e):null,W=u>0?g.fireWindowMaterial(e):null;W&&V.push({material:W,...g.FIRE_WINDOW_GLOW});let ce=u>0?new g.FlameSet:null,G=[],le=s.meta(D).units[0];R.box(D,[v+2*L,x,y+2*L],{at:[0,x/2,0],faces:{...ie(v+2*L,y+2*L,le),ny:!1},cutsT:[x*.5]});let K=null,q=x+S;if(l===2)K=g.brokenWalls(R,s,m,{W:v,D:y,P:x,H1:S,E:O,wall:T,upperWall:E,stories:b,door:ke(a,_)});else{let e=s.meta(T).units[0];if(R.box(T,[v,S,y],{at:[0,x+S/2,0],faces:{...ie(v,y,e),py:!1,ny:!1},cutsT:[.5,S-.9]}),Ae(R,s,T,v,y,x,S,c,{top:b===1&&!f,bottom:!0}),b>1){let e=s.meta(E).units[0];R.box(E,[v,te,y+2*w],{at:[0,q+te/2,0],faces:{...ie(v,y+2*w,e),py:!1,ny:!1},cutsT:[te-.9]}),R.box(N,[v+.14,.24,y+2*w+.14],{at:[0,q+.04,0]});let t=Math.max(2,Math.round(v/.55));for(let e=0;e<t;e++){let n=-k+.25+e*(v-.5)/(t-1);for(let e of[-1,1])R.box(N,[.13,.13,w+.08],{at:[n,q-.13,e*(A+w/2)],faces:{nz:!(e>0),pz:!(e<0)}})}Ae(R,s,E,v,y+2*w,q+.16,te-.16,c,{top:!f,bottom:!1})}}let ue=a.gable??(E===`brick`||E===`stone_brick`?`wood_planks`:E),de=b>1?q:x;if(!f){let e=s.meta(ue).units,t=ue===`wood_planks`||ue===`wood_planks_dark`,n=ae(2*j,e[0]);for(let e of[1,-1]){if(K&&e===K.collapseEnd)continue;let r=e*k,i=e>0?[[r,O,j],[r,O,-j],[r,O+F+.02,0]]:[[r,O,-j],[r,O,j],[r,O+F+.02,0]],a=e>0?[0,0,-1]:[0,0,1],o=p?{color:l?De:[.8,.74,.72]}:{};R.poly(ue,i,t?{uAxis:[0,1,0],vAxis:a,origin:[r,de,e*j],off:[0,n],...o}:{uAxis:a,vAxis:[0,1,0],origin:[r,de,e*j],off:[n,0],...o}),l&&R.poly(N,[i[1],i[0],i[2]].map(t=>[t[0]-e*.03,t[1],t[2]]),{uAxis:a,vAxis:[0,1,0],color:Ee}),R.box(N,[.1,.16,2*j+.1],{at:[r+e*.05,O+.02,0]}),t||R.box(N,[.1,F*.8,.16],{at:[r+e*.04,O+F*.4,0],rotUV:!0})}}let fe=a.roof,J=O+F,pe=Math.cos(M),me=Math.sin(M),he=J+I/pe,Y=[];if(f)g.flatRoofGeom(R,s,m,{W:v,D:y,E:O,wall:T,ruin:l,stories:b,chimney:a.chimney,anchors:H,roofFires:Y,decal:U});else if(l>0)g.ruinedRoof(R,s,m,{W:v,hw:k,hs:j,E:O,R:F,O:P,Ts:I,pitch:M,roof:fe,ruin:l,collapseEnd:K?.collapseEnd??0,roofFires:Y});else{let e=s.meta(fe).units[0],t=Math.tan(M),n=v+2*P,r=(j+P)/pe+I*t,i=((j+P)/pe-I*t)/2;for(let t of[1,-1]){let a=[0,J-me*i+pe*I/2,t*(pe*i+me*I/2)];R.push(a,t>0?[M,0,0]:[M,Math.PI,0,`YXZ`]),R.box(fe,[n,I,r],{faces:{py:{off:[ae(n,e),0]},ny:{mat:N,color:[.8,.78,.8]},pz:{mat:N},nz:!1,px:{mat:N},nx:{mat:N}}}),R.box(N,[n+.1,I+.16,.09],{at:[0,-.06,r/2+.03],faces:{nz:!1}});for(let e of[-1,1])R.box(N,[.09,I+.16,r+.02],{at:[e*(n/2+.035),-.06,.005],faces:{nz:!1}});R.pop()}if(R.box(a.ridge??fe,[n+.14,.3,.3],{at:[0,he-.05,0],rot:[Math.PI/4,0,0],faces:{px:N,nx:N},color:[.82,.8,.82]}),u>0){let e=1+Math.round(u*2.5);for(let t=0;t<e;t++)Y.push({x:(t-(e-1)/2)*(v/Math.max(1,e))+m.range(-.3,.3),y:J-.25,z:m.range(-.3,.3),size:1})}}if(a.chimney&&!f){let e=(a.chimneySide??(c.chance(.5)?1:-1))*Math.max(.2,k-.8),t=c.chance(.6)?-j*.42:j*.3,n=l===2?O+F*.45:he+.75,r=O-.2,i=.74,o=s.meta(`chimney_stone`).units;K&&Math.sign(e)===K.collapseEnd||(R.box(`chimney_stone`,[i,n-r,i],{at:[e,(n+r)/2,t],faces:{...ie(i,i,o[0],{vOff:r-O}),ny:!1,py:!1},color:p?De:void 0}),l<2?(R.box(D,[.94,.16,.94],{at:[e,n+.08,t]}),R.box(`chimney_stone`,[.64,.12,.64],{at:[e,n+.2,t],faces:{py:!1}}),R.box(`chimney_stone`,[.48,.02,.48],{at:[e,n+.255,t],faces:{ny:!1},color:[.1,.08,.08]})):R.box(`chimney_stone`,[.58,.02,.58],{at:[e,n+.005,t],faces:{ny:!1},color:[.1,.08,.08]}),p||(H.smoke=R.point(e,n+.45,t)))}let ge=(e,t)=>{let n=xe[e],r=e===`front`||e===`back`,i=t?A+w:A;return{L:r?v:t?y+2*w:y,cx:n.n[0]*k,cz:n.n[1]*i,yaw:n.yaw,long:r}},X=e=>R.push([e.cx,0,e.cz],e.yaw),_e=a.door===`none`||a.door===!1?null:a.door||`front`,ve=_e?_?ne(Se,_e):_e:null,ye=a.shutters??c.chance(.6),be=Ce[c.int(0,Ce.length-1)],Oe=a.flowerboxes??!p,Z=0,Ie=()=>W??(l?null:oe),Le=(e,t,n,r)=>!K||K.minTop(e,t,n)>=r;for(let e of[`front`,`back`,`right`,`left`]){let t=ge(e,!1);X(t);let n=e===ve;if(n){let e=t.L/2-1.15,n=t.L>=4&&(t.L<5.5||c.chance(.5));Z=a.doorOffset??(n?c.chance(.5)?-e:e:0)}if(n&&Le(e,Z-.75,Z+.75,x+2.3)){Me(R,s,Z,x,L,D,c,a,p),G.push({side:e,upper:!1,x:Z,y:x,w:1,h:2.1,door:!0}),H.door=R.point(Z,0,1),H.leafA=R.point(Z-.5,x+1,.02),H.leafB=R.point(Z+.5,x+1,.02);let n=t.L/2-(Z+.7)>=Z-.7+t.L/2?1:-1,r=Z+n*.98;if((a.lantern??!p)&&Math.abs(r)<t.L/2-.15){let e=x+1.95;R.box(`metal`,[.05,.05,.46],{at:[r,e+.36,.23]}),R.box(`metal`,[.04,.04,.32],{at:[r,e+.25,.12],rot:[-.75,0,0]}),R.box(`metal`,[.1,.14,.03],{at:[r,e+.3,.015]}),re(R,z,r,e,.44,{w:.22,h:.28}),V.push({material:z,day:0,night:2.4}),H.lantern=R.point(r,e,.6)}if(a.sign){let e=Z-n*1;Math.abs(e)<t.L/2+.2&&(R.push([e,0,0],-n*Math.PI/4),Pe(R,s,0,x+2.35),R.pop())}}let r=x+1,i=je(t.L,n?Z:null,t.long);for(let a of i){if(!n&&!t.long&&c.chance(.25))continue;let i=Oe&&(e===`front`||c.chance(.3))&&c.chance(.75),o=Math.min(t.L/2-Math.abs(a),n?Math.abs(a-Z)-.75:9),s=c.range(0,1);Le(e,a-.7,a+.7,r+1.15)&&(Ne(R,Ie(),a,r,{shutters:ye&&o>1.12,shutterTint:be,flowerbox:i,uShift:s,ruin:l,sr:m}),G.push({side:e,upper:!1,x:a,y:r,w:1,h:1}))}if(R.pop(),b>1){let t=ge(e,!0);X(t);let n=je(t.L,null,t.long);for(let r of n){if(!t.long&&c.chance(.3))continue;let n=t.L/2-Math.abs(r),i=Oe&&e===`front`&&c.chance(.5),a=c.range(0,1);Le(e,r-.7,r+.7,q+1.65)&&(Ne(R,Ie(),r,q+.5,{shutters:ye&&n>1.12,shutterTint:be,flowerbox:i,uShift:a,ruin:l,sr:m}),G.push({side:e,upper:!0,x:r,y:q+.5,w:1,h:1}))}f&&e===`front`&&!p&&m.chance(.75)&&g.balconyGeom(R,m,t.L,q),R.pop()}}if(a.woodpile??c.chance(.55)){let e=c.chance(.5)?`right`:`left`,t=ge(e,!1);X(t),Le(e,-t.L/2,t.L/2,x+1.5)&&Fe(R,c.range(-.4,.4)*(t.L-2),.38,p?Ee:null),R.pop()}if(p&&g.siegeDetails(R,s,m,{W:v,D:y,P:x,E:O,hw:k,hd:A,J:w,stories:b,ruin:l,burning:u,flat:f,gableR:F,broken:K,decal:U,openings:G,faceInfo:ge,pushFace:X,wall:T}),ce){g.burnFlames(R,m,ce,{burning:u,ruin:l,flat:f,openings:G,faceInfo:ge,pushFace:X,roofFires:Y,P:x,E:O,W:v,D:y,broken:K});let e=Y.length?Y.reduce((e,t)=>e+t.x,0)/Y.length:0,t=Y.length?Y.reduce((e,t)=>e+t.z,0)/Y.length:0,n=f?O+.6:l===2?O+.5:he;H.fireSmoke=R.point(e,n+1.4,t),H.fireLight=R.point(e*.5,Math.max(O+.6,n-.6),t*.5+(_?0:A*.3))}let Q=e.finish(R,`house`,t,n,r,a.rotation);if(ce){let t=ce.build(e);t&&(Q.add(t),Q.updateMatrixWorld(!0))}let $=t=>e.world(Q,t);H.lantern&&B.push({position:$(H.lantern),color:16757867,intensity:6,distance:7,flicker:.25,nightOnly:!0}),a.windowLights&&H.door&&B.push({position:$(H.door).setY(n+1.6),color:16754266,intensity:3,distance:6,flicker:.1,nightOnly:!0}),H.smoke&&se.push({preset:`smoke`,position:$(H.smoke),rate:3}),H.fireLight&&(B.push({position:$(H.fireLight),color:16742958,intensity:8+12*u,distance:9+5*u,flicker:.65,nightOnly:!1,fire:!0}),se.push({preset:`smokeDark`,position:$(H.fireSmoke),rate:1.2+2.4*u}));let Re=e.result(Q,{colliders:_?e.boxColliders(Q,-A-L,A+L,-k-L,k+L):e.boxColliders(Q,-k-L,k+L,-A-L,A+L),lights:B,emissives:V,emitters:se});return H.door&&(Re.interact={position:$(H.door),radius:1.1,id:a.id??`house`,lookSpan:{a:$(H.leafA),b:$(H.leafB)}}),a.icicles===!0&&!f&&!l&&(Re.update=ee(`icicles`).houseIcicles(e,Q,{W:v,hs:j,O:P,Ts:I,pitch:M,ridgeY:J,gf:_,x:t,z:r,seed:a.seed})),Re}function ke(e,t){let n=e.door===`none`||e.door===!1?null:e.door||`front`;return n?t?ne(Se,n):n:null}function Ae(e,t,n,r,i,a,o,s,{top:c=!0,bottom:l=!0}={}){let u=r/2,d=i/2;if(n===`timber_frame`||n===`plaster`){for(let t of[-1,1])for(let n of[-1,1])e.box(N,[.2,o,.2],{at:[t*(u-.06),a+o/2,n*(d-.06)],rotUV:!0,faces:{py:!1,ny:!1}});l&&e.box(N,[r+.08,.16,i+.08],{at:[0,a+.08,0],faces:{ny:!1}})}else if(n===`brick`){let t=Math.floor(o/.5);for(let n=0;n<t;n++){let t=n%2==0;for(let r of[-1,1])for(let i of[-1,1]){let o=t?.62:.34,c=t?.34:.62;e.box(`stone_brick`,[o,.46,c],{at:[r*(u-o/2+.04),a+n*.5+.25,i*(d-c/2+.04)],faces:{ny:!1},off:[s.range(0,1),0]})}}l&&e.box(`stone_brick`,[r+.1,.18,i+.1],{at:[0,a+.09,0],faces:{ny:!1}})}else if(n===`log_wall`){let t=Math.round(o/.5);for(let n=0;n<t;n++){let t=a+n*.5+.25,r=n%2==0;for(let n of[-1,1])for(let i of[-1,1]){let a=n*(u-.05),o=i*(d-.05);r?e.tube(`bark`,[a-n*.12,t,o],[a+n*.32,t,o],.2,.19,{segments:6,capTop:`wood_planks`,twist:.3}):e.tube(`bark`,[a,t,o-i*.12],[a,t,o+i*.32],.2,.19,{segments:6,capTop:`wood_planks`,twist:.3})}}}else if(we.has(n)){for(let t of[-1,1])for(let r of[-1,1])e.box(n,[.34,o,.34],{at:[t*(u-.1),a+o/2,r*(d-.1)],faces:{ny:!1,py:!1},off:[t*.3,0]}),e.box(n,[.42,.5,.42],{at:[t*(u-.12),a+.25,r*(d-.12)],faces:{ny:!1},color:[.82,.78,.74]});l&&e.box(n,[r+.04,.42,i+.04],{at:[0,a+.21,0],faces:{ny:!1,py:!1},color:[.8,.76,.72]})}else if(Te.has(n)){let t=Math.floor(o/.5);for(let r=0;r<t;r++){let t=r%2==0;for(let i of[-1,1])for(let o of[-1,1]){let c=t?.66:.36,l=t?.36:.66;e.box(n,[c,.46,l],{at:[i*(u-c/2+.04),a+r*.5+.25,o*(d-l/2+.04)],faces:{ny:!1},off:[s.range(0,1),0],color:[1.06,1.04,1.02]})}}}c&&e.box(N,[r+.12,.2,i+.12],{at:[0,a+o-.1,0],faces:{py:!1}})}function je(e,t,n){let r=-e/2+.85,i=e/2-.85,a=[];t==null?a.push([r,i]):(t-1.38>=r&&a.push([r,t-1.38]),t+1.38<=i&&a.push([t+1.38,i]));let o=[];for(let[e,t]of a){let r=t-e;if(r<0)continue;let i=Math.floor(r/(n?1.9:2.4))+1;if(n||(i=Math.min(i,1)),i===1)o.push((e+t)/2);else for(let t=0;t<i;t++)o.push(e+t*r/(i-1))}return o}function Me(e,t,n,r,i,a,o,s,c=!1){e.quad(`door`,[[n-.5,r,.02],[n+.5,r,.02],[n+.5,r+2,.02],[n-.5,r+2,.02]],[[0,0],[1,0],[1,1],[0,1]],c?{color:De}:{});for(let t of[-1,1])e.box(N,[.15,2.16,.18],{at:[n+t*.575,r+1.08,.07],rotUV:!0});if(e.box(N,[1.46,.2,.22],{at:[n,r+2.1,.09]}),e.box(N,[1.2,.05,.16],{at:[n,r+.02,.08],faces:{ny:!1}}),e.box(a,[1.5,.25,.5],{at:[n,.125,i+.25],faces:{ny:!1},off:[.3,0]}),s.doorHood??o.chance(.55)){let t=r+2.45;e.box(s.roof,[1.8,.1,.78],{at:[n,t,.36],rot:[.32,0,0],faces:{ny:N,px:N,nx:N,pz:N}});for(let r of[-1,1])e.box(N,[.08,.08,.62],{at:[n+r*.7,t-.26,.26],rot:[-.7,0,0]})}}function Ne(e,t,n,r,{shutters:i,shutterTint:a,flowerbox:o,uShift:s=0,ruin:c=0,sr:l=null}){t?e.quad(t,[[n-.5,r,.02],[n+.5,r,.02],[n+.5,r+1,.02],[n-.5,r+1,.02]],[[0,0],[1,0],[1,1],[0,1]]):(e.quad(N,[[n-.5,r,0],[n+.5,r,0],[n+.5,r+1,0],[n-.5,r+1,0]],[[0,0],[1,0],[1,1],[0,1]],{color:Oe}),e.tri(`window`,[n-.5,r+1,.02],[n-.5,r+.55,.02],[n-.22,r+1,.02],[0,1],[0,.55],[.28,1],{color:[.5,.5,.55]}),e.tri(`window`,[n+.5,r,.02],[n+.5,r+.32,.02],[n+.18,r,.02],[1,0],[1,.32],[.68,0],{color:[.5,.5,.55]})),e.box(N,[1.16,.08,.1],{at:[n,r+1,.05]});for(let t of[-1,1])e.box(N,[.08,1.02,.1],{at:[n+t*.54,r+.5,.05],rotUV:!0});if(e.box(N,[1.36,.09,.24],{at:[n,r-.045,.11]}),e.box(N,[1.3,.13,.15],{at:[n,r+1.1,.07]}),i)for(let t of[-1,1]){if(c&&l){if(l.chance(.45))continue;if(l.chance(.6)){e.push([n+t*.83,r+.95,.06],[.08,t*.35,t*(.35+l.range(0,.4))]),e.box(`wood_planks`,[.46,1.04,.05],{at:[0,-.5,0],rotUV:!0,color:a.map(e=>e*.55)}),e.pop();continue}}e.box(`wood_planks`,[.46,1.04,.05],{at:[n+t*.83,r+.5,.035],rotUV:!0,color:c?a.map(e=>e*.55):a}),e.box(N,[.4,.06,.02],{at:[n+t*.83,r+.8,.07]}),e.box(N,[.4,.06,.02],{at:[n+t*.83,r+.2,.07]})}o&&M(e,n,r-.09-7/16,.36,1.1,.26,s)}function Pe(e,t,n,r){e.box(`metal`,[.05,.05,1.05],{at:[n,r,.52]}),e.box(`metal`,[.04,.04,.6],{at:[n,r-.2,.25],rot:[.62,0,0]});for(let t of[.3,.9])e.box(`metal`,[.02,.14,.02],{at:[n,r-.08,t]});let i=.52;e.box(`sign_board`,[.06,i,.95],{at:[n,r-.15-i/2,.6],faces:{px:{off:[1.05/2,.48/2]},nx:{off:[1.05/2,.48/2]},py:N,ny:N,pz:N,nz:N}})}function Fe(e,t,n,r=null){for(let[i,a]of[[4,0],[3,.5],[2,1]])for(let o=0;o<i;o++){let s=t+(o-(i-1)/2)*.36,c=.17+a*.62;e.tube(N,[s,c,n+.3],[s,c,n-.25],.17,.17,{segments:6,capTop:`wood_planks`,capBottom:`wood_planks`,twist:o*.7+a,uRepeat:1,...r?{color:r}:{}})}e.box(N,[1.6,.08,.7],{at:[t,.04,n+.02]})}export{Oe as a,ye as c,de as d,F as f,De as i,ve as l,Ee as n,Z as o,xe as r,be as s,Te as t,P as u};