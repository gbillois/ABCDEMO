import{Ci as e,Do as t,Dr as n,Ei as r,Gr as i,Ir as a,Ji as o,Ki as s,Kr as c,Mr as l,Nr as u,Oo as d,Ui as f,Wi as p,Xi as m,dr as h,fo as g,fr as _,ii as v,ko as y,ma as b,mi as x,pa as ee,ui as S,yo as te}from"./LevelStorage-wrhu45Nl.js";import{t as C}from"./GlobalUniforms-buKaLVOd.js";import"./game-qwpQ9WHU.js";import{t as w}from"./glowSpots-DmXt8jmm.js";import{a as T,i as E,n as D,r as O,t as ne}from"./CombatSystem-C3p1_Kwj.js";var k=4,A=4,j=32,M=64,re=[{part:0,sides:6,rings:[[-.06,1],[.24,.92],[.66,.56]],tip:1},{part:1,sides:5,rings:[[-.15,1],[.52,.64]],tip:1},{part:2,sides:5,rings:[[-.15,1],[.52,.64]],tip:1}],N={part:3,sides:12,rings:[[0,.8],[0,2.3]]},ie=`
attribute vec4 aIce;    // part, ring (= tip ring for the tip), facet k, side (0: corner k, 1: corner k + 1)
attribute vec4 iShape;  // height, radius, seed, rise
attribute vec4 iFx;     // crack, glint, glow, -

float iceHash( vec3 p ) {
	p = fract( p * vec3( 0.1031, 0.1030, 0.0973 ) );
	p += dot( p, p.yxz + 33.33 );
	return fract( ( p.x + p.y ) * p.z );
}

float iceSides( float part ) { return part < 0.5 ? 6.0 : part < 2.5 ? 5.0 : 12.0; }
float iceTipRing( float part ) { return part < 0.5 ? 3.0 : 2.0; }

// a ring of a part: ( y, radius ) in part units
vec2 iceRing( float part, float ring ) {
	if ( part < 0.5 ) return ring < 0.5 ? vec2( -0.06, 1.0 ) : ring < 1.5 ? vec2( 0.24, 0.92 ) : vec2( 0.66, 0.56 );
	if ( part < 2.5 ) return ring < 0.5 ? vec2( -0.15, 1.0 ) : vec2( 0.52, 0.64 );
	return ring < 0.5 ? vec2( 0.0, 0.8 ) : vec2( 0.0, 2.3 );
}

// a corner in part units, jittered by the seed (facet widths, radii); the skirt is regular
vec3 iceCorner( float part, float ring, float k, float seed ) {
	float n = iceSides( part );
	float kk = mod( k, n );
	float sk = part > 2.5 ? 0.0 : 1.0;
	float jit = ( iceHash( vec3( seed, part * 13.0 + 1.0, kk ) ) - 0.5 ) * 0.55 * sk;
	float a = ( k + jit ) * 6.2831853 / n + iceHash( vec3( seed, part + 3.0, 91.0 ) ) * 6.2831853 * sk;
	vec2 yr = iceRing( part, ring );
	float rj = 1.0 + ( iceHash( vec3( seed, part * 7.0 + ring, kk + 17.0 ) ) - 0.5 ) * 0.24 * sk;
	return vec3( cos( a ) * yr.y * rj, yr.x, sin( a ) * yr.y * rj );
}

// thinner while it shoots up and when it overshoots (squash and stretch)
float iceWidth( float rise ) {
	return mix( 0.5, 1.0, smoothstep( 0.0, 0.85, rise ) ) * inversesqrt( max( rise, 1.0 ) );
}

// one side shard (part 1 or 2) of a crystal: on (0 / 1), length, radius (world), angle, lean, foot height (world)
void iceSub( float part, float seed, float h, float r, out float on, out float len, out float rad, out float phi, out float lean, out float hb ) {
	float j = part - 1.0;
	on = step( iceHash( vec3( seed, 5.0 + j, 2.0 ) ), j < 0.5 ? 0.72 : 0.42 );
	len = h * mix( j < 0.5 ? 0.3 : 0.2, j < 0.5 ? 0.48 : 0.34, iceHash( vec3( seed, 6.0 + j, 3.0 ) ) );
	rad = r * mix( 0.5, 0.7, iceHash( vec3( seed, 7.0 + j, 4.0 ) ) );
	float p0 = iceHash( vec3( seed, 8.0, 5.0 ) ) * 6.2831853;
	phi = j < 0.5 ? p0 : p0 + 3.14159 * mix( 0.6, 1.4, iceHash( vec3( seed, 9.0, 6.0 ) ) );
	lean = mix( 0.42, 0.78, iceHash( vec3( seed, 10.0 + j, 7.0 ) ) );
	hb = h * mix( 0.0, 0.12, iceHash( vec3( seed, 11.0 + j, 8.0 ) ) );
}

// part units → crystal-local world units (relative to the foot, before the instance matrix)
vec3 icePlace( float part, vec3 q, float seed, float h, float r, float rise ) {
	if ( part < 0.5 ) {
		float w = r * iceWidth( rise );
		return vec3( q.x * w, q.y * h * rise, q.z * w );
	}
	if ( part > 2.5 ) {
		float s = r * smoothstep( 0.0, 0.6, rise );
		return vec3( q.x * s, 0.05, q.z * s );
	}
	float on, len, rad, phi, lean, hb;
	iceSub( part, seed, h, r, on, len, rad, phi, lean, hb );
	float g = clamp( ( rise - 0.2 ) / 0.8, 0.0, 1.2 ) * on;
	float w = rad * iceWidth( g ) * step( 0.001, g );
	vec3 s = vec3( q.x * w, q.y * len * g, q.z * w );
	float cl = cos( lean ), sl = sin( lean );
	s = vec3( s.x * cl + s.y * sl, - s.x * sl + s.y * cl, s.z );
	float cp = cos( phi ), sp = sin( phi );
	s = vec3( s.x * cp - s.z * sp, s.y, s.x * sp + s.z * cp );
	float wm = r * iceWidth( rise );
	return s + vec3( cp * 0.5 * wm, hb * min( rise, 1.0 ), sp * 0.5 * wm );
}

vec3 iceTip( float part, float seed ) {
	vec2 o = vec2( iceHash( vec3( seed, part, 31.0 ) ), iceHash( vec3( seed, part, 37.0 ) ) ) - 0.5;
	return vec3( o.x * 0.35, 1.0, o.y * 0.35 );
}
`,ae=`
#ifdef ICE_COLOR
varying vec2 vIceTc;     // texel coordinates (16 per world unit)
varying vec2 vIceEdge;   // distance to the facet's left / right seam (world)
varying vec2 vIceY;      // height above the part's foot in texels (pre-rise), the part's height in texels
varying vec4 vIceFx;     // crack, glint, glow, seed
varying float vIcePart;
varying vec3 vIceW;      // world position
varying vec3 vIceA;      // the part's foot (world)
varying vec3 vIceU;      // the part's axis (world, unit)
varying float vIceR;     // the crystal's radius (world)
#endif

vec3 iceVertex() {
	float part = aIce.x, ring = aIce.y, k = aIce.z, side = aIce.w;
	float h = iShape.x, r = iShape.y, seed = iShape.z, rise = iShape.w;
	float tipRing = iceTipRing( part );
	bool tip = part < 2.5 && ring > tipRing - 0.5;
	vec3 qL = iceCorner( part, ring, k, seed );
	vec3 qR = iceCorner( part, ring, k + 1.0, seed );
	vec3 q = tip ? iceTip( part, seed ) : ( side > 0.5 ? qR : qL );
	vec3 p = icePlace( part, q, seed, h, r, rise );
#ifdef ICE_DEPTH
	if ( part > 2.5 ) p = vec3( 0.0 );  // the skirt casts no shadow
#endif
#ifdef ICE_COLOR
	vec3 pL = icePlace( part, qL, seed, h, r, rise );
	vec3 pR = icePlace( part, qR, seed, h, r, rise );
	float w = tip ? 0.0 : length( pR - pL );
	float d = tip ? 0.0 : side * w;
	vIceEdge = vec2( d, w - d );
	// the part's own height (pre-rise) and this vertex's height along it, in texels
	float ph = h;
	if ( part > 0.5 && part < 2.5 ) {
		float on, len, rad, phi, lean, hb;
		iceSub( part, seed, h, r, on, len, rad, phi, lean, hb );
		ph = len;
	}
	float yq = clamp( q.y, 0.0, 1.0 );
	vIceY = vec2( yq * ph * 16.0, ph * 16.0 );
	// u: the seam distance plus a facet offset (neighbouring facets show other texels)
	float u0 = k * 9.0 + floor( iceHash( vec3( seed, part, 41.0 ) ) * 32.0 );
	vIceTc = vec2( u0 + ( tip ? 0.0 : d * 16.0 ), q.y * ph * 16.0 + part * 23.0 );
	vIceFx = vec4( iFx.xyz, seed );
	vIcePart = part;
	mat4 iceM = modelMatrix * instanceMatrix;
	vIceW = ( iceM * vec4( p, 1.0 ) ).xyz;
	vec3 a0 = icePlace( part, vec3( 0.0 ), seed, h, r, rise );
	vec3 a1 = icePlace( part, vec3( 0.0, 1.0, 0.0 ), seed, h, r, rise );
	vIceA = ( iceM * vec4( part > 2.5 ? vec3( 0.0 ) : a0, 1.0 ) ).xyz;
	vec3 ax = ( iceM * vec4( a1, 1.0 ) ).xyz - ( iceM * vec4( a0, 1.0 ) ).xyz;
	vIceU = length( ax ) > 1e-5 ? normalize( ax ) : vec3( 0.0, 1.0, 0.0 );
	vIceR = r;
#endif
	return p;
}
`,oe=`
uniform sampler2D uIceMap;
uniform vec2 uIceMapSize;
uniform float uIceTime;
uniform float uIceNight;
uniform vec4 uIceLook;   // core, rim, seams, glint strengths
varying vec2 vIceTc;
varying vec2 vIceEdge;
varying vec2 vIceY;
varying vec4 vIceFx;
varying float vIcePart;
varying vec3 vIceW;
varying vec3 vIceA;
varying vec3 vIceU;
varying float vIceR;

float iceBayer( vec2 p ) {
	ivec2 q = ivec2( mod( floor( p ), 4.0 ) );
	const float M[ 16 ] = float[ 16 ]( 0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0 );
	return ( M[ q.y * 4 + q.x ] + 0.5 ) / 16.0;
}
float iceHash2( vec2 p ) {
	vec3 q = fract( vec3( p.xyx ) * 0.1031 );
	q += dot( q, q.yzx + 33.33 );
	return fract( ( q.x + q.y ) * q.z );
}

// the ice ramp (linear): albedo, the light's hue shift, the HDR glow terms
const vec3 ICE_DEEP = vec3( 0.05, 0.11, 0.30 );
const vec3 ICE_PALE = vec3( 0.22, 0.42, 0.68 );
const vec3 ICE_FROST = vec3( 0.52, 0.66, 0.84 );
const vec3 ICE_HIGH = vec3( 0.42, 0.70, 0.86 );
const vec3 ICE_SHADE = vec3( 0.66, 0.56, 1.16 );   // shadowed facets lean blue-violet
const vec3 ICE_LIT = vec3( 0.90, 1.04, 1.10 );     // lit facets lean cyan
const vec3 ICE_CORE = vec3( 0.04, 0.22, 0.62 );
const vec3 ICE_RIM = vec3( 0.30, 0.90, 1.40 );
const vec3 ICE_SEAM = vec3( 0.40, 1.00, 1.50 );
const vec3 ICE_GLINT = vec3( 0.80, 1.60, 2.00 );
const vec3 ICE_CRACK = vec3( 0.55, 1.35, 1.95 );
const vec3 ICE_SHADOW = vec3( 0.05, 0.055, 0.12 );
const vec3 ICE_LUMA = vec3( 0.2126, 0.7152, 0.0722 );
`,se=`
	vec3 iceEd = reflectedLight.directDiffuse;
	vec3 iceEt = iceEd + reflectedLight.indirectDiffuse;
	// the light's strength by its brightest channel (a blue night light does not inflate the blue)
	float iceIt = max( max( iceEt.r, max( iceEt.g, iceEt.b ) ), 1e-5 );
	// the shade ramp: 4 steps from shadowed (ambient only) to fully sunlit
	float iceSh = floor( clamp( max( iceEd.r, max( iceEd.g, iceEd.b ) ) / iceIt, 0.0, 1.0 ) * 4.0 + 0.5 ) / 4.0;
	// the light in half-stop bands, its hue kept in part
	float iceIq = exp2( floor( log2( iceIt ) * 2.0 + 0.5 ) * 0.5 );
	// a soft knee: a strong light (the spell's flash, a lamp at arm's length) pales the ice toward
	// cyan instead of burning it white
	if ( iceIq > 0.7 ) iceIq = 0.7 + ( iceIq - 0.7 ) / ( 1.0 + ( iceIq - 0.7 ) * 1.3 );
	vec3 iceHue = mix( vec3( 1.0 ), iceEt / iceIt, 0.6 );
	vec3 iceL = iceIq * iceHue * mix( ICE_SHADE, ICE_LIT, iceSh );
	float iceGlow = vIceFx.z;
	vec3 outgoingLight;
	if ( vIcePart > 2.5 ) {
		// the skirt: frost rubble texels, then a dithered contact shadow (world texel grid)
		vec2 g = floor( vIceW.xz * 16.0 ) + 0.5;
		float dr = length( g / 16.0 - vIceA.xz ) / max( vIceR, 1e-3 );
		float hr = iceHash2( g + vIceFx.w * 7.13 );
		float rubble = ( 1.0 - smoothstep( 0.8, 1.35, dr ) ) * 0.7;
		float shade = 1.0 - smoothstep( 1.1, 1.75, dr );
		if ( hr < rubble ) {
			vec3 alb = mix( ICE_PALE, ICE_FROST, step( 0.5, iceHash2( g * 1.7 ) ) );
			outgoingLight = alb * iceL + ICE_CORE * 0.12 * iceGlow;
		} else if ( iceBayer( g ) < shade ) {
			outgoingLight = ICE_SHADOW * iceL;
		} else discard;
	} else {
		vec2 tc = floor( vIceTc ) + 0.5;
		vec4 tx = texture2D( uIceMap, tc / uIceMapSize );
		float bay = iceBayer( tc );
		float crack = vIceFx.x;
		float yT = floor( vIceY.x ) + 0.5;               // texel row above the part's foot
		float yF = yT / max( vIceY.y, 1.0 );             // 0 foot … 1 tip
		float yW = yT / 16.0;                            // world units above the foot (pre-rise)
		// albedo: tone streaks, a frosted foot, darker at the very foot (contact), darker when cracked
		vec3 alb = mix( ICE_DEEP, ICE_PALE, tx.r );
		// facets turned to the light pale toward cyan (the ramp's highlight hue)
		alb = mix( alb, ICE_HIGH, 0.45 * smoothstep( 0.5, 1.0, iceSh ) );
		float frost = 1.0 - smoothstep( 0.03, 0.4, yW );
		if ( iceHash2( tc + 3.1 ) < frost * 0.9 ) alb = ICE_FROST;
		alb *= mix( 0.55, 1.0, smoothstep( 0.0, 0.18, yW ) );
		// fractured ice clouds over and dims (greyer, darker) as it is about to shatter, so the
		// bright crack lines stand out
		alb = mix( alb, vec3( dot( alb, ICE_LUMA ) ) * vec3( 0.8, 0.92, 1.12 ), 0.55 * crack ) * ( 1.0 - 0.35 * crack );
		vec3 col = alb * iceL;
		// view terms (flat facet normal)
		vec3 nw = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
		vec3 vd = normalize( vIceW - cameraPosition );
		float ndv = clamp( abs( dot( nw, vd ) ), 0.0, 1.0 );
		float rim = 1.0 - ndv;
		rim = rim > 0.82 ? 1.0 : rim > 0.66 ? 0.45 : 0.0;
		// the core: how close the view ray passes to the shard's axis here
		vec3 w = vIceW - vIceA;
		float along = dot( w, vIceU );
		float radial = length( w - along * vIceU );
		vec3 nn = cross( vd, vIceU );
		float nl = length( nn );
		float dist = nl > 1e-3 ? abs( dot( w, nn ) ) / nl : radial;
		float core = clamp( 1.0 - dist / max( radial, 1e-3 ), 0.0, 1.0 ) + ( bay - 0.5 ) * 0.22;
		float coreQ = core > 0.64 ? 1.0 : core > 0.32 ? 0.5 : 0.16;
		coreQ *= smoothstep( 0.0, 0.18, yF ) * mix( 1.0, 0.4, yF ) * ( 1.0 - 0.55 * crack );
		vec3 emis = ICE_CORE * coreQ * iceGlow * uIceLook.x;
		emis += ICE_RIM * rim * ( 0.5 + 0.5 * iceGlow ) * uIceLook.y;
		// inner fracture lines (seen through the core) and sparkle texels
		if ( abs( tx.g - 0.5 ) < 0.12 ) emis += ICE_CORE * 0.55 * clamp( core, 0.0, 1.0 ) * iceGlow;
		if ( tx.g > 0.9 ) emis += ICE_GLINT * 0.6 * iceGlow * step( 0.55, fract( uIceTime * 0.9 + tx.b * 7.0 + vIceFx.w * 0.013 ) );
		// seams: the facet edges as 1-texel lines (the lit side brighter), the tip's last texels
		float eL = floor( vIceEdge.x * 16.0 ), eR = floor( vIceEdge.y * 16.0 );
		float seam = eL < 0.5 ? 0.15 + 0.85 * iceSh * iceSh : eR < 0.5 ? 0.08 : 0.0;
		// a facet under 3 texels wide is all seam: only its lit edge then, and softer
		if ( ( vIceEdge.x + vIceEdge.y ) * 16.0 < 3.0 ) seam *= eL < 0.5 ? 0.6 : 0.0;
		if ( yF > 0.93 ) seam = max( seam, 0.8 );
		emis += ICE_SEAM * seam * ( 0.55 + 0.45 * iceGlow ) * uIceLook.z;
		// the shadowed side's edge as a dark line (the facet's turn, as a pixel artist draws it)
		if ( eR < 0.5 && eL >= 0.5 && iceSh < 0.5 && ( vIceEdge.x + vIceEdge.y ) * 16.0 >= 3.0 ) col *= 0.6;
		// the glint: a diagonal band sliding from the tip down to the foot
		float across = vIceEdge.x / max( vIceEdge.x + vIceEdge.y, 1e-3 );
		float gb = abs( yT - ( mix( 1.12, -0.12, vIceFx.y ) + ( across - 0.5 ) * 0.14 ) * vIceY.y );
		float gl = gb < 1.0 ? 1.0 : gb < 2.5 ? 0.3 : 0.0;
		emis += ICE_GLINT * gl * uIceLook.w;
		// cracks: lines lighting up in their reveal order
		if ( tx.b < crack ) {
			// the crack's newest texels flare, older ones settle to a cold line
			float fresh = 1.0 - smoothstep( 0.0, 0.18, crack - tx.b );
			col *= 0.35;
			emis = emis * 0.4 + ICE_CRACK * ( 0.45 + 0.9 * fresh );
		}
		// the exposure rises at night: the self-glow holds back so the facets keep their shape
		outgoingLight = col + emis * mix( 1.0, 0.7, uIceNight );
	}
`;function ce(){let e=new h(j,M),t=new n(7397),r=new Float32Array(2048),i=new Float32Array(2048),a=new Float32Array(2048).fill(1),o=(e,t)=>(t%M+M)%M*j+(e%j+j)%j;for(let e=0;e<j;e++)for(let t=0;t<M;t++)r[o(e,t)]=.42+.16*l(e>>2,t>>3,11)+.05*l(e,t>>2,12);for(let e=0;e<12;e++){let e=t.int(0,31),n=t.int(0,63),i=t.int(9,22),a=t.chance(.5)?1:-1,s=t.int(3,5);for(let t=0;t<i;t++)r[o(e,n+t)]=.95,t%s===s-1&&(e+=a)}for(let e=0;e<7;e++){let e=t.int(0,31),n=t.int(0,63),i=t.int(3,8);for(let t=0;t<i;t++)r[o(e+ +(t>i/2),n+t)]=.1}for(let e=0;e<5;e++){let e=t.int(0,31),n=t.int(0,63),r=t.chance(.5)?1:-1,a=t.int(8,18),s=t.range(.4,1.6);for(let t=0;t<a;t++)i[o(Math.round(e),Math.round(n))]=.5,e+=r*(s<1?1:1/s),n+=s<1?s:1}for(let e=0;e<22;e++)i[o(t.int(0,31),t.int(0,63))]=1;let s=(e,n,r,i,c,l,u)=>{for(let d=0;d<l;d++){let f=o(e,n);a[f]=Math.min(a[f],Math.max(.03,i+d/l*(c-i))),n+=1,t.chance(.7)&&(e+=r),t.chance(.14)&&(r=-r),u<2&&t.chance(.08)&&s(e-r,n,-r,i+d/l*(c-i),c,Math.floor((l-d)*.5),u+1)}};for(let e=0;e<7;e++)s(Math.floor(e*j/7+t.int(0,2)),t.int(0,8),t.chance(.5)?1:-1,t.range(.02,.14),t.range(.5,.8),t.int(34,60),0);for(let t=0;t<M;t++)for(let n=0;n<j;n++){let s=o(n,t);e.set(n,t,[Math.round(Math.min(1,Math.max(0,r[s]))*255),Math.round(i[s]*255),Math.round(a[s]*255),255])}return e}function le(){let e=[],t=[],n=(e,t,n,r,i)=>{if(i)return[0,1,0];let[a,o]=e.rings[t],s=(n+r)*Math.PI*2/e.sides;return[Math.cos(s)*o,e.part===3?0:a,Math.sin(s)*o]},r=(r,i)=>{let a=r.map(e=>n(e[0],e[1],e[2],e[3],e[4])),o=[a[1][0]-a[0][0],a[1][1]-a[0][1],a[1][2]-a[0][2]],s=[a[2][0]-a[0][0],a[2][1]-a[0][1],a[2][2]-a[0][2]],c=[o[1]*s[2]-o[2]*s[1],o[2]*s[0]-o[0]*s[2],o[0]*s[1]-o[1]*s[0]],l=c[0]*i[0]+c[1]*i[1]+c[2]*i[2]<0?[0,2,1]:[0,1,2];for(let n of l){e.push(...a[n]);let i=r[n];t.push(i[0].part,i[4]?i[0].rings.length:i[1],i[2],i[3])}};for(let e of re)for(let t=0;t<e.sides;t++){let n=(t+.5)*Math.PI*2/e.sides,i=[Math.cos(n),.25,Math.sin(n)];for(let n=0;n<e.rings.length-1;n++)r([[e,n,t,0,!1],[e,n,t,1,!1],[e,n+1,t,0,!1]],i),r([[e,n,t,1,!1],[e,n+1,t,1,!1],[e,n+1,t,0,!1]],i);let a=e.rings.length-1;r([[e,a,t,0,!1],[e,a,t,1,!1],[e,a,t,0,!0]],[i[0],.6,i[2]])}for(let e=0;e<N.sides;e++)r([[N,0,e,0,!1],[N,0,e,1,!1],[N,1,e,0,!1]],[0,1,0]),r([[N,0,e,1,!1],[N,1,e,1,!1],[N,1,e,0,!1]],[0,1,0]);let i=new c;return i.setAttribute(`position`,new x(e,3)),i.setAttribute(`aIce`,new x(t,4)),i.computeVertexNormals(),i}var P=class{constructor({capacity:n=64}={}){this.capacity=n;let i=le();this._shape=new e(new Float32Array(n*k),k),this._fx=new e(new Float32Array(n*A),A),this._shape.setUsage(S),this._fx.setUsage(S),i.setAttribute(`iShape`,this._shape),i.setAttribute(`iFx`,this._fx),this.texture=_(ce().toCanvas(),{wrap:`repeat`,srgb:!1,name:`fx:iceCrystals`}),this.uniforms={uIceMap:{value:this.texture},uIceMapSize:{value:new t(j,M)},uIceTime:C.uTime,uIceNight:C.uNight,uIceLook:{value:new y(1,1,1,1)}};let a=this.uniforms;this.material=new o({color:16777215,flatShading:!0}),this.material.onBeforeCompile=e=>{Object.assign(e.uniforms,a),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>\n#define ICE_COLOR\n${ie}\n${ae}`).replace(`#include <begin_vertex>`,`vec3 transformed = iceVertex();`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>\n${oe}`).replace(`vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;`,se)},this.material.customProgramCacheKey=()=>`luminati-icecrystals-v1`,this.depthMaterial=new s({depthPacking:ee}),this.depthMaterial.onBeforeCompile=e=>{e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>\n#define ICE_DEPTH\n${ie}\n${ae}`).replace(`#include <begin_vertex>`,`vec3 transformed = iceVertex();`)},this.depthMaterial.customProgramCacheKey=()=>`luminati-icecrystals-depth-v1`,this.object=new r(i,this.material,n),this.object.name=`fx:iceCrystals`,this.object.count=0,this.object.visible=!1,this.object.frustumCulled=!1,this.object.castShadow=!0,this.object.receiveShadow=!0,this.object.customDepthMaterial=this.depthMaterial,this.object.instanceMatrix.setUsage(S),this._items=Array(n).fill(null),this._live=0,this._m=new f,this._warm=-1}spawn(e){let t=this._items.indexOf(null);return t<0?-1:(this._items[t]={x:e.x,y:e.y,z:e.z,height:Math.max(.05,e.height??1.6),radius:Math.max(.02,e.radius??.25),yaw:e.yaw??0,tiltX:e.tiltX??0,tiltZ:e.tiltZ??0,seed:((e.seed??t)>>>0)%8192,rise:0,crack:0,glint:0,glow:1},this._live++,t)}set(e,t){let n=this._items[e];n&&(t.rise!==void 0&&(n.rise=t.rise),t.crack!==void 0&&(n.crack=t.crack),t.glint!==void 0&&(n.glint=t.glint),t.glow!==void 0&&(n.glow=t.glow))}free(e){e>=0&&e<this.capacity&&this._items[e]&&(this._items[e]=null,this._live--)}get count(){return this._live}warm(){this._warm<0&&(this._warm=this.spawn({x:0,y:-500,z:0,seed:1}),this.set(this._warm,{rise:1}),this.update(0))}unwarm(){this._warm>=0&&(this.free(this._warm),this._warm=-1,this.update(0))}update(e){let t=this._shape.array,n=this._fx.array,r=this._m.elements,i=0;for(let e of this._items){if(!e||e.rise<=.001)continue;let a=Math.cos(e.yaw),o=Math.sin(e.yaw);r[0]=a,r[1]=0,r[2]=-o,r[3]=0,r[4]=e.tiltX/e.height,r[5]=1,r[6]=e.tiltZ/e.height,r[7]=0,r[8]=o,r[9]=0,r[10]=a,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this.object.setMatrixAt(i,this._m),t[i*k]=e.height,t[i*k+1]=e.radius,t[i*k+2]=e.seed,t[i*k+3]=e.rise,n[i*A]=e.crack,n[i*A+1]=e.glint,n[i*A+2]=e.glow,n[i*A+3]=0,i++}this.object.count=i,this.object.visible=i>0,i>0&&(this.object.instanceMatrix.needsUpdate=!0,this._shape.needsUpdate=!0,this._fx.needsUpdate=!0)}dispose(){this.object.removeFromParent(),this.object.geometry.dispose(),this.material.dispose(),this.depthMaterial.dispose(),this.texture.dispose(),this.object.dispose?.()}},F=16,I=256,ue=4,de=I/ue,L=2048,fe=384,R=2432,z=8,B=12,pe=16,V=16,me=.34,he=.012,ge=.12,_e=255,H=Object.freeze({main:.42,ring:.82,spoke:.12,splinter:.06,star0:.8,star1:1}),ve=16711935,ye=Object.freeze([1,.82,.55,.3,.16,.08,.05]),be=Object.freeze([-1,-1,0,-1,1,-1,-1,0,1,0,-1,1,0,1,1,1,-2,0,2,0,0,-2,0,2]),xe=()=>typeof performance<`u`?performance.now():0,Se=`
attribute float aFrostSlot;
attribute vec4 aTuft; // a tuft's corner: across (±0.5), up (0 / 1), threshold, 1 + variant (0: a ground cell)
uniform vec4 uFrostA[ GF_CAP ]; // spread, fade, cracks, glow
uniform vec4 uFrostB[ GF_CAP ]; // origin texel x, z, slot row, 0
uniform float uCameraYaw;
varying vec2 vFrostXZ;
varying vec2 vTuftUV;
flat varying vec2 vTuftInfo; // variant (−1: ground), threshold
flat varying vec4 vFrostA;
flat varying vec4 vFrostB;
`,Ce=`
	{
		int gfSlot = int( aFrostSlot + 0.5 );
		vFrostA = uFrostA[ gfSlot ];
		vFrostB = uFrostB[ gfSlot ];
		vTuftInfo = vec2( - 1.0, 0.0 );
		vTuftUV = vec2( 0.0 );
		if ( aTuft.w > 0.5 ) {
			// a frozen tuft: upright, turned to the camera yaw, rising out of the ground as the
			// spread passes its threshold (its texels stay put on the quad: no squash)
			float grow = clamp( ( vFrostA.x - aTuft.z ) * ( 1.0 / 0.14 ), 0.0, 1.0 );
			vec3 across = vec3( cos( uCameraYaw ), 0.0, - sin( uCameraYaw ) );
			transformed += across * ( aTuft.x * ${(z/F).toFixed(4)} ) + vec3( 0.0, ( aTuft.y - 1.0 + grow ) * ${(B/F).toFixed(4)}, 0.0 );
			vTuftUV = vec2( ( aTuft.x + 0.5 ) * ${z.toFixed(1)}, aTuft.y * ${B.toFixed(1)} );
			vTuftInfo = vec2( aTuft.w - 1.0, aTuft.z );
		}
		vFrostXZ = ( modelMatrix * vec4( transformed, 1.0 ) ).xz;
	}
`,we=`
uniform sampler2D uFrostTex;
uniform float uTime;
varying vec2 vFrostXZ;
varying vec2 vTuftUV;
flat varying vec2 vTuftInfo;
flat varying vec4 vFrostA;
flat varying vec4 vFrostB;

float gfBayer4( vec2 p ) {
	ivec2 q = ivec2( mod( p, 4.0 ) );
	const float M[ 16 ] = float[ 16 ]( 0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0 );
	return ( M[ q.y * 4 + q.x ] + 0.5 ) / 16.0;
}
float gfHash( vec2 p ) {
	return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 );
}
`,U=`
	vec3 gfEmissive = vec3( 0.0 );
	{
		bool tuft = vTuftInfo.x >= 0.0;
		vec2 tw;
		ivec2 at;
		if ( tuft ) {
			// a tuft's texel in the sprite strip
			tw = floor( vTuftUV );
			if ( tw.x < 0.0 || tw.y < 0.0 || tw.x >= ${z.toFixed(1)} || tw.y >= ${B.toFixed(1)} ) discard;
			at = ivec2( tw ) + ivec2( int( vTuftInfo.x + 0.5 ) * ${z}, GF_STRIP );
		} else {
			tw = floor( vFrostXZ * ${F.toFixed(1)} );
			ivec2 tl = ivec2( tw - vFrostB.xy );
			if ( tl.x < 0 || tl.y < 0 || tl.x >= ${I} || tl.y >= ${I} ) discard;
			at = ivec2( tl.x, tl.y + int( vFrostB.z ) );
		}
		ivec4 v = ivec4( texelFetch( uFrostTex, at, 0 ) * 255.0 + 0.5 );
		float spread = vFrostA.x;
		float fade = vFrostA.y;
		float cracks = vFrostA.z;
		float glow = vFrostA.w;
		float bay = gfBayer4( tw );
		float th = tuft ? vTuftInfo.y : float( v.r ) / 254.0;
		float arr = float( v.b ) / 254.0;
		int cls = v.a;

		// frost: frozen once the spread passes the texel's threshold; the newest band dithers in
		// (a tuft rises instead)
		bool frost = v.r < ${_e} && spread > 0.0 && th <= spread;
		float behind = spread - th;
		if ( frost && ! tuft && behind < 0.07 && behind * ( 1.0 / 0.07 ) <= bay ) frost = false;
		// cracks: the cleft and its lit lip as the run passes; the rime a moment later, dithered
		bool crack = cls > 0 && v.b < ${_e} && cracks > 0.0 && arr <= cracks;
		if ( crack && cls == 3 && ( cracks - arr ) * ( 1.0 / 0.08 ) <= bay ) crack = false;
		// fade: the edge (late threshold) first, in Bayer steps; the veins and the clefts last
		if ( fade > 0.0 ) {
			float k = frost ? 1.0 - th : 1.0 - arr * 0.5;
			if ( fade >= 0.999 || 0.5 * bay + 0.5 * k < fade ) { frost = false; crack = false; }
		}
		if ( ! frost && ! crack ) discard;

		int tone = v.g & 3;
		bool sparkle = ( v.g & 4 ) != 0;
		float phase = float( v.g >> 3 ) * ( 6.2831853 / 32.0 );
		vec3 alb;
		if ( crack && cls == 1 ) {
			// the cleft: dark, lit from inside — a cold blue core, a bright tip racing ahead
			alb = vec3( 0.03, 0.04, 0.1 );
			float pulse = 0.7 + 0.3 * sin( uTime * 3.1 + arr * 23.0 );
			gfEmissive = vec3( 0.05, 0.19, 0.5 ) * pulse;
			float tip = ( 1.0 - smoothstep( 0.0, 0.06, cracks - arr ) ) * step( cracks, 0.999 );
			gfEmissive += vec3( 0.55, 1.7, 3.2 ) * tip;
		} else if ( crack && cls == 2 ) {
			// the lit lip: pale ice catching the light
			alb = vec3( 0.48, 0.66, 0.92 );
			float tip = ( 1.0 - smoothstep( 0.0, 0.06, cracks - arr ) ) * step( cracks, 0.999 );
			gfEmissive = vec3( 0.04, 0.1, 0.22 ) + vec3( 0.3, 0.8, 1.4 ) * tip;
		} else {
			// frost (or rime): four tones from deep blue-violet to the pale cyan of a vein
			alb = tone == 0 ? vec3( 0.15, 0.19, 0.44 ) : tone == 1 ? vec3( 0.33, 0.44, 0.63 ) : tone == 2 ? vec3( 0.45, 0.6, 0.79 ) : vec3( 0.58, 0.8, 0.93 );
			if ( ! frost ) alb = vec3( 0.45, 0.6, 0.79 );
			// a tuft: frozen grass — dark teal-blue blades, rimed pale-cyan tips
			if ( tuft ) alb = tone == 0 ? vec3( 0.06, 0.1, 0.16 ) : tone == 1 ? vec3( 0.14, 0.24, 0.36 ) : tone == 2 ? vec3( 0.3, 0.46, 0.64 ) : vec3( 0.55, 0.78, 0.93 );
			gfEmissive = alb * ( tone == 3 ? vec3( 0.2, 0.36, 0.5 ) : vec3( 0.09, 0.13, 0.2 ) );
			if ( frost && sparkle ) {
				float s = max( 0.0, sin( uTime * 2.2 + phase * 3.0 + gfHash( tw + vTuftInfo.y * 917.0 ) * 6.2831853 ) );
				s *= s; s *= s; s *= s;
				gfEmissive += vec3( 1.5, 2.3, 3.1 ) * ( 0.12 + s );
			}
			// the moving front glows faintly
			if ( frost && ! tuft && spread < 0.999 && behind < 0.035 ) gfEmissive += vec3( 0.3, 0.62, 1.0 ) * ( 1.0 - behind * ( 1.0 / 0.035 ) );
		}
		gfEmissive *= glow;
		diffuseColor.rgb = alb;
	}
`;function Te(e,t,n,r,i){let a=Math.max(1,Math.ceil(Math.max(Math.abs(n-e),Math.abs(r-t))*2)),o=Math.floor(e),s=Math.floor(t);i(o,s,0);for(let c=1;c<=a;c++){let l=c/a,u=Math.floor(e+(n-e)*l),d=Math.floor(t+(r-t)*l);(u!==o||d!==s)&&(u!==o&&d!==s&&i(u,s,l),i(u,d,l),o=u,s=d)}}function W(e,t){for(let n=t*I*4,r=(t+V)*I*4;n<r;n+=4)e[n]=_e,e[n+1]=0,e[n+2]=_e,e[n+3]=0;let r=(n,r,i,a,o,s)=>{if(r<0||r>=z||i<0||i>=B)return;let c=((t+i)*I+n*z+r)*4;e[c]===0&&(e[c+1]&3)>a||(e[c]=0,e[c+1]=a|(o?4:0)|s<<3)};for(let e=0;e<pe;e++){let t=new n(2135587861+e*977),i=4+t.int(0,2);for(let n=0;n<i;n++){let n=1+t.next()*5,i=Math.min(11,Math.round(4+t.next()*7)),a=(t.next()-.5)*3+(n-z/2+.5)*.6,o=(t.next()-.5)*2.5,s=Math.round(i*(.35+t.next()*.25)),c=t.int(0,31);for(let l=0;l<=i;l++){let u=l/i,d=Math.floor(n+a*u+o*u*u);if(l<2){r(e,d,l,0,!1,c),r(e,d+1,l,0,!1,c);continue}if(l===i){r(e,d,l,3,t.next()<.5,c);continue}r(e,d,l,l>i-3?3:2,!1,c),l<s&&r(e,d+1,l,1,!1,c)}}}}function Ee(e,t,n,r,i,a,o,s,c,u){e.fill(0,0,t*n);let d=1,f=0;for(let p=0;p<s;p++){let s=o*(1<<p),m=Math.floor(r*s),h=Math.floor(i*s),g=Math.floor((r+(t-1)*a)*s)-m+2,_=Math.floor((i+(n-1)*a)*s)-h+2;if(g*_>u.length)continue;let v=c+p*101;for(let e=0;e<_;e++)for(let t=0;t<g;t++)u[e*g+t]=l(m+t,h+e,v);for(let o=0;o<n;o++){let n=(i+o*a)*s-h,c=Math.floor(n),l=n-c;l=l*l*(3-2*l);for(let n=0;n<t;n++){let i=(r+n*a)*s-m,f=Math.floor(i),p=i-f;p=p*p*(3-2*p);let h=c*g+f,_=u[h]+(u[h+1]-u[h])*p,v=u[h+g]+(u[h+g+1]-u[h+g])*p;e[o*t+n]+=d*(_+(v-_)*l)}}f+=d,d*=.5}if(f>0)for(let r=0,i=t*n;r<i;r++)e[r]/=f}function De(e,t,n,r,i,a,o){let s=[t,n,r,i],c=a;for(let t=0;t<o;t++){let t=[s[0],s[1]];for(let n=0;n+3<s.length;n+=2){let r=s[n],i=s[n+1],a=s[n+2],o=s[n+3],l=Math.hypot(a-r,o-i),u=(e.next()*2-1)*c*l,d=l>1e-6?-(o-i)/l:0,f=l>1e-6?(a-r)/l:0;t.push((r+a)/2+d*u,(i+o)/2+f*u,a,o)}s=t,c*=.6}return s}var Oe=class{constructor({heightField:e=null,capacity:t=8,tufts:n=!0}={}){this.heightField=e,this.capacity=Math.max(1,t|0),this.tufts=n;let r=this.capacity;this.paintMs=0,this.sliceMs=0,this._data=new Uint8Array(I*(I*r+V)*4),this.texture=new v(this._data,I,I*r+V,b,te),W(this._data,I*r),this.texture.name=`fx:groundFrost`,this.texture.magFilter=m,this.texture.minFilter=m,this.texture.generateMipmaps=!1,this.texture.colorSpace=``,this.texture.needsUpdate=!0;let a=r*R*4,s=new c;this._pos=new i(new Float32Array(a*3),3),this._nrm=new i(new Float32Array(a*3),3),this._tuft=new i(new Float32Array(a*4),4);for(let e of[this._pos,this._nrm,this._tuft])e.setUsage(S);let l=new Float32Array(a);for(let e=0;e<r;e++)l.fill(e,e*R*4,(e+1)*R*4);let u=new Uint32Array(r*R*6);for(let e=0,t=r*R;e<t;e++){let t=e*4;u.set([t,t+2,t+1,t+1,t+2,t+3],e*6)}s.setIndex(new i(u,1)),s.setAttribute(`position`,this._pos),s.setAttribute(`normal`,this._nrm),s.setAttribute(`aTuft`,this._tuft),s.setAttribute(`aFrostSlot`,new i(l,1)),s.setDrawRange(0,0),s.boundingSphere=new g(new d,1e6),this.geometry=s,this._uA=Array.from({length:r},()=>new y(0,0,0,1)),this._uB=Array.from({length:r},(e,t)=>new y(0,0,t*I,0));let f=new o({color:16777215,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-4});f.name=`GroundFrost`;let h={uFrostTex:{value:this.texture},uFrostA:{value:this._uA},uFrostB:{value:this._uB},uTime:C.uTime,uCameraYaw:C.uCameraYaw};f.onBeforeCompile=e=>{Object.assign(e.uniforms,h),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>\n#define GF_CAP ${r}\n${Se}`).replace(`#include <begin_vertex>`,`#include <begin_vertex>\n${Ce}`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>\n#define GF_STRIP ${I*r}\n${we}`).replace(`#include <map_fragment>`,U).replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>
	totalEmissiveRadiance += gfEmissive;`)},f.customProgramCacheKey=()=>`luminati-groundfrost-v1-${r}`,this.material=f,this.object=new p(s,f),this.object.name=`fx:groundFrost`,this.object.visible=!1,this.object.frustumCulled=!1,this.object.castShadow=!1,this.object.receiveShadow=!0,this.object.matrixAutoUpdate=!1,this._items=Array(r).fill(null),this._warm=-1,this._rangeDirty=!1,this._warnedCells=!1,this._data32=new Uint32Array(this._data.buffer),this._vein=new Uint8Array(I*I),this._used=new Uint8Array(4096),this._noise=new Float32Array(16641),this._clump=new Float32Array(16641),this._lattice=new Float32Array(25600),this._clefts=new Int32Array(16384)}get count(){return this._items.reduce((e,t)=>e+ +!!t,0)}add(e){let t=this._items.indexOf(null);return t<0?-1:(this._items[t]={x:e.x,z:e.z,radius:Math.max(.25,Math.min(7,e.radius??3)),seed:(e.seed??1)|0,from:null,cells:0,tufts:0,dirty:!0,warm:!1,paths:[],painter:null},this._uA[t].set(0,0,0,1),this._rangeDirty=!0,t)}set(e,t){let n=e>=0&&e<this.capacity?this._items[e]:null;if(!n)return;let r=this._uA[e];if(t.spread!==void 0&&(r.x=Math.max(0,Math.min(1,t.spread))),t.fade!==void 0&&(r.y=Math.max(0,Math.min(1,t.fade))),t.cracks!==void 0&&(r.z=Math.max(0,Math.min(1,t.cracks))),t.glow!==void 0&&(r.w=Math.max(0,t.glow)),t.crackFrom!==void 0){let e=t.crackFrom,r=n.from;(e?!r||Math.abs(e.x-r.x)>1/F||Math.abs(e.z-r.z)>1/F:r)&&(n.from=e?{x:e.x,z:e.z}:null,n.dirty=!0,n.painter=null)}}crackTips(e,t){let n=e>=0&&e<this.capacity?this._items[e]:null;if(!n||n.dirty)return 0;let r=this._uA[e].z,i=0;for(let e=0;e<n.paths.length&&i<t.length;e++){let a=n.paths[e];for(let e=0;e<a.length;e++){let o=a[e];if(r<o[4]||r>=o[5])continue;let s=o[5]>o[4]?(r-o[4])/(o[5]-o[4]):0,c=t[i++];c.x=o[0]+(o[2]-o[0])*s,c.z=o[1]+(o[3]-o[1])*s,c.y=this._height(n,c.x,c.z);break}}return i}free(e){let t=e>=0&&e<this.capacity?this._items[e]:null;t&&(this._clearQuads(e,0,t.cells),this._clearQuads(e,L,L+t.tufts),this._items[e]=null,this._uA[e].set(0,0,0,1),this._rangeDirty=!0)}warm(){if(this._warm>=0)return;let e=this.add({x:0,z:0,radius:3.5,seed:1});if(e<0)return;let t=this._items[e];t.warm=!0,t.from={x:0,z:7},this._uA[e].set(1,0,1,1),this._warm=e;for(let n=0;n<3;n++)t.seed=1+n,this._paint(e);this._applyRange()}unwarm(){this._warm<0||(this.free(this._warm),this._warm=-1,this._applyRange())}update(e){for(let e=0;e<this.capacity;e++){let t=this._items[e];if(t&&t.dirty){t.painter??=this._painter(e),t.painter.next().done&&(t.painter=null);break}}this._rangeDirty&&this._applyRange()}painting(){return this._items.some(e=>!!e&&e.dirty)}ready(e){let t=e>=0&&e<this.capacity?this._items[e]:null;return!!t&&!t.dirty}dispose(){this.object.removeFromParent(),this.geometry.dispose(),this.material.dispose(),this.texture.dispose()}_applyRange(){this._rangeDirty=!1;let e=-1;for(let t=0;t<this.capacity;t++)this._items[t]&&this._items[t].cells>0&&(e=t);let t=this._items.some(Boolean);if(e<0){this.geometry.setDrawRange(0,0),this.object.visible=!1;return}let n=this._items[e];this.geometry.setDrawRange(0,(e*R+(n.tufts>0?L+n.tufts:n.cells))*6),this.object.visible=t}_clearQuads(e,t,n){if(n<=t)return;let r=e*R+t,i=e*R+n;this._pos.array.fill(0,r*12,i*12),this._nrm.array.fill(0,r*12,i*12),this._tuft.array.fill(0,r*16,i*16),this._mark(r,i-r)}_mark(e,t){if(!(t<=0))for(let n of[this._pos,this._nrm,this._tuft])n.addUpdateRange(e*n.itemSize*4,t*n.itemSize*4),n.needsUpdate=!0}_height(e,t,n){if(e.warm)return-500;let r=this.heightField;if(!r)return 0;let i=r.surface?r.surface(t,n):r.sample(t,n);return Number.isFinite(i)?i:0}_paint(e){let t=this._items[e];if(!t)return;t.painter=null;let n=this._painter(e);for(;!n.next().done;);}*_painter(e){let t=xe(),r=0,i=0,o=()=>{let e=xe();r+=e-t,i=Math.max(i,e-t),t=e},s=this._items[e];this._clearQuads(e,0,s.cells),this._clearQuads(e,L,L+s.tufts),s.cells=0,s.tufts=0,s.paths=[],this._rangeDirty=!0;let c=s.radius,u=s.seed|0,d=new n((u*2654435761^5369127)>>>0),f=s.from;if(f){let e=I/F-c-2,t=f.x-s.x,n=f.z-s.z,r=Math.max(Math.abs(t),Math.abs(n));r>e&&(f={x:s.x+t*e/r,z:s.z+n*e/r})}let p=s.x-c-1,m=s.z-c-1,h=s.x+c+1,g=s.z+c+1;f&&(p=Math.min(p,f.x-.5),m=Math.min(m,f.z-.5),h=Math.max(h,f.x+.5),g=Math.max(g,f.z+.5));let _=Math.floor((p+h)/2*F)-I/2,v=Math.floor((m+g)/2*F)-I/2;this._uB[e].set(_,v,e*I,0);let y=this._data,b=e*I*I*4;this._data32.fill(ve,e*I*I,(e+1)*I*I);let x=this._used;x.fill(0);let ee=(e,t)=>e>=0&&t>=0&&e<I&&t<I,S=s.x*F-_,te=s.z*F-v,C=(c*1.15+.1)*F,w=Math.max(0,Math.floor(S-C)),T=Math.min(255,Math.ceil(S+C)),E=Math.max(0,Math.floor(te-C)),D=Math.min(255,Math.ceil(te+C)),O=this._vein;for(let e=E;e<=D;e++)O.fill(6,e*I+w,e*I+T+1);let ne=(e,t)=>e>=w&&t>=E&&e<=T&&t<=D,k=(e,t,n,r,i)=>{let a=e,o=t,s=n,c=Math.floor(r*2),l=4+d.next()*7,u=d.next()<.5?1:-1;for(let e=0;e<c;e++){s+=(d.next()-.5)*.2,a+=Math.cos(s)*.5,o+=Math.sin(s)*.5;let t=Math.floor(a),n=Math.floor(o);ne(t,n)&&(O[n*I+t]=0),i<2&&e*.5>=l&&(l=e*.5+(i?3:4)+d.next()*(i?4:6),k(a,o,s+Math.PI/3*u*(.85+d.next()*.3),(r-e*.5)*(.3+d.next()*.25),i+1),u=-u)}};{let e=7+d.int(0,3),t=d.next()*Math.PI*2;for(let n=0;n<e;n++)k(S,te,t+n/e*Math.PI*2+(d.next()-.5)*.4,c*F*(.75+d.next()*.35),0)}for(let e=E;e<=D;e++)for(let t=w;t<=T;t++){let n=e*I+t,r=O[n];r!==0&&(t>w&&(r=Math.min(r,O[n-1]+1)),e>E&&(r=Math.min(r,O[n-I]+1),t>w&&(r=Math.min(r,O[n-I-1]+1)),t<T&&(r=Math.min(r,O[n-I+1]+1))),O[n]=r)}for(let e=D;e>=E;e--)for(let t=T;t>=w;t--){let n=e*I+t,r=O[n];r!==0&&(t<T&&(r=Math.min(r,O[n+1]+1)),e<D&&(r=Math.min(r,O[n+I]+1),t<T&&(r=Math.min(r,O[n+I+1]+1)),t>w&&(r=Math.min(r,O[n+I-1]+1))),O[n]=r)}let A=(T-w>>1)+1,j=(D-E>>1)+1,M=this._noise,re=this._clump,N=(_+w+1)/F,ie=(v+E+1)/F;Ee(M,A,j,N,ie,2/F,.9,3,u*31+7,this._lattice),Ee(re,A,j,N,ie,2/F,3.2,2,u*31+19,this._lattice);for(let e=0,t=A*j;e<t;e++)re[e]=Math.min(1,Math.max(0,(re[e]-.5)*1.9+.5));o(),yield,t=xe();let ae=1/(c*F),oe=Math.ceil((D-E+1)/3);for(let e=E;e<=D;e++){e>E&&(e-E)%oe===0&&(o(),yield,t=xe());let n=(e+.5-te)*ae;for(let t=w;t<=T;t++){let r=(t+.5-S)*ae,i=Math.sqrt(r*r+n*n);if(i>1.15)continue;let o=e*I+t,s=O[o],c=(e-E>>1)*A+(t-w>>1),d=M[c],f=l(_+t,v+e,u)*4294967296>>>0,p=(f&255)/256,m=(f>>>8&255)/256,h=(f>>>16&255)/256,g=1-a(.2,.6,i),ee=ye[s]*(1-a(.92,1.12,i)),te=Math.max(g,ee)+(d-.5)*.3;if(s>0&&.65*re[c]+.35*m>te)continue;let C=i*.85+(d-.5)*.3+(p-.5)*.05-(s<=1?.1:0);if(C>.995)continue;C<0&&(C=0);let T;T=s===0?3:t>0&&e>0&&O[o-I-1]===0&&O[o-I]!==0?0:s===1?h<.75?2:1:i>.7&&s>2&&h<.4?0:d>.57?2:1;let D=s===0?h<.1:h>.975,ne=b+o*4;y[ne]=Math.round(C*254),y[ne+1]=T|(D?4:0)|f>>>27<<3,x[(e>>2)*de+(t>>2)]=1}}o(),yield,t=xe();let se=[],ce=[[],[],[]],le=(e,t)=>{for(let n=t;n<se.length;n++)e.push(se[n])},P=(e,t,n)=>{let r=0;for(let t=0;t+3<e.length;t+=2)r+=Math.hypot(e[t+2]-e[t],e[t+3]-e[t+1]);let i=0;for(let a=0;a+3<e.length;a+=2){let o=Math.hypot(e[a+2]-e[a],e[a+3]-e[a+1]),s=t+(n-t)*i/(r||1);i+=o,se.push([e[a],e[a+1],e[a+2],e[a+3],s,t+(n-t)*i/(r||1)])}},z=new n((u*2246822507^739982445)>>>0),B;if(f){B=Math.atan2(f.z-s.z,f.x-s.x);let e=s.x+Math.cos(B)*c*.97,t=s.z+Math.sin(B)*c*.97,n=De(z,f.x,f.z,e,t,.16,4);P(n,0,H.main),le(ce[0],0);for(let r=0;r<3;r++){let r=2*Math.floor((.2+.6*z.next())*(n.length/2-1)),i=n[r],a=n[r+1],o=Math.atan2(t-f.z,e-f.x)+(z.next()<.5?1:-1)*(.6+z.next()*.5),s=.3+z.next()*.5,c=H.main*r/Math.max(1,n.length-2);P(De(z,i,a,i+Math.cos(o)*s,a+Math.sin(o)*s,.2,2),c,c+H.splinter)}}else B=z.next()*Math.PI*2,P(De(z,s.x,s.z,s.x+Math.cos(B)*c*.97,s.z+Math.sin(B)*c*.97,.16,3),0,H.main),le(ce[0],0);let V=Math.ceil(Math.PI/.2);for(let e of[1,-1]){let t=ce[e>0?1:2],n=s.x+Math.cos(B)*c*.97,r=s.z+Math.sin(B)*c*.97;for(let i=1;i<=V;i++){let a=B+i/V*e*Math.PI,o=c*(.97+(i===V?0:(z.next()-.5)*.06)),l=s.x+Math.cos(a)*o,u=s.z+Math.sin(a)*o,d=H.main+(H.ring-H.main)*(i-1)/V,f=H.main+(H.ring-H.main)*i/V,p=se.length;if(P(De(z,n,r,l,u,.12,1),d,f),le(t,p),i<V&&z.next()<.42){if(z.next()<.7){let e=c*(.22+z.next()*.33),t=a+(z.next()-.5)*.5;P(De(z,l,u,l-Math.cos(t)*e,u-Math.sin(t)*e,.18,2),f,Math.min(1,f+H.spoke))}else{let e=.2+z.next()*.3;P(De(z,l,u,l+Math.cos(a)*e,u+Math.sin(a)*e,.2,1),f,Math.min(1,f+H.splinter))}}n=l,r=u}}let Se=4+z.int(0,2);for(let e=0;e<Se;e++){let e=z.next()*Math.PI*2,t=c*(.15+z.next()*.22);P(De(z,s.x,s.z,s.x+Math.cos(e)*t,s.z+Math.sin(e)*t,.2,2),H.star0,H.star1)}let Ce=this._clefts,we=0;for(let[e,t,n,r,i,a]of se)Te(e*F-_,t*F-v,n*F-_,r*F-v,(e,t,n)=>{if(!ee(e,t))return;let r=t*I+e,o=b+r*4,s=Math.min(253,Math.round((i+(a-i)*n)*254));y[o+3]===1?s<y[o+2]&&(y[o+2]=s):(y[o+3]=1,y[o+2]=s,we<Ce.length&&(Ce[we++]=r),x[(t>>2)*de+(e>>2)]=1)});for(let e=0;e<we;e++){let t=Ce[e],n=t%I,r=(t-n)/I,i=b+t*4,a=y[i+2],o=r+1<I?i+I*4:-1,s=n+1<I?i+4:-1,c=o>=0&&y[o+3]!==1?o:s>=0&&y[s+3]!==1?s:-1;if(c>=0&&(y[c+3]!==2||a<y[c+2])){y[c+2]=a,y[c+3]=2;let e=c-b>>2;x[(e/I>>2)*de+(e%I>>2)]=1}for(let e=0;e<be.length;e+=2){let t=n+be[e],i=r+be[e+1];if(!ee(t,i))continue;let o=b+(i*I+t)*4;y[o+3]!==0||l(_+t,v+i,u+404)>=.24||(y[o+2]=Math.min(253,a+6),y[o+3]=3,x[(i>>2)*de+(t>>2)]=1)}}o(),yield,t=xe();let U=this._pos.array,W=this._nrm.array,Oe=this._tuft.array,G=e*R,K=0;for(let e=0;e<4096;e++){if(!x[e])continue;if(K>=L){this._warnedCells||(this._warnedCells=!0,console.warn(`[GroundFrost] a patch needs more than ${L} cells: the rest is dropped`));break}let t=e%de,n=(e-t)/de,r=(_+t*ue)/F,i=(v+n*ue)/F,a=r+ue/F,o=i+ue/F,c=this._height(s,(r+a)/2,(i+o)/2),l=1e-4,u=this._height(s,r+l,i+l),d=this._height(s,a-l,i+l),f=this._height(s,r+l,o-l),p=this._height(s,a-l,o-l);Math.abs(u-c)>ge&&(u=c),Math.abs(d-c)>ge&&(d=c),Math.abs(f-c)>ge&&(f=c),Math.abs(p-c)>ge&&(p=c);let m=(G+K)*12;U[m]=r,U[m+1]=u+he,U[m+2]=i,U[m+3]=a,U[m+4]=d+he,U[m+5]=i,U[m+6]=r,U[m+7]=f+he,U[m+8]=o,U[m+9]=a,U[m+10]=p+he,U[m+11]=o;let h=(d+p-u-f)/(2*(a-r)),g=(f+p-u-d)/(2*(o-i)),y=Math.hypot(h,1,g);for(let e=0;e<12;e+=3)W[m+e]=-h/y,W[m+e+1]=1/y,W[m+e+2]=-g/y;Oe.fill(0,(G+K)*16,(G+K+1)*16),K++}let ke=K,q=0;if(this.tufts){let e=Math.floor((_+w)/F/me),t=Math.ceil((_+T)/F/me),n=Math.floor((v+E)/F/me),r=Math.ceil((v+D)/F/me);for(let i=n;i<=r&&q<fe;i++)for(let n=e;n<=t&&q<fe;n++){let e=l(n,i,u+505)*4294967296>>>0;if((e&255)/256>.24)continue;let t=(n+.15+(e>>>8&255)/256*.7)*me,r=(i+.15+(e>>>16&255)/256*.7)*me,a=Math.floor(t*F)-_,o=Math.floor(r*F)-v;if(!ee(a,o))continue;let c=b+(o*I+a)*4;if(y[c]===_e||y[c]>190.5||y[c+3]===1)continue;let d=Math.min(.995,y[c]/254+.03),f=this._height(s,t,r),p=G+L+q,m=p*12,h=p*16,g=1+(e>>>24)%pe;for(let e=0;e<4;e++)U[m+e*3]=t,U[m+e*3+1]=f,U[m+e*3+2]=r,W[m+e*3]=0,W[m+e*3+1]=.55,W[m+e*3+2]=.835,Oe[h+e*4]=e&1?-.5:.5,Oe[h+e*4+1]=e>>1,Oe[h+e*4+2]=d,Oe[h+e*4+3]=g;q++}}this._mark(G,ke),this._mark(G+L,q),s.cells=ke,s.tufts=q,s.paths=ce,s.dirty=!1,this.texture.needsUpdate=!0,this._rangeDirty=!0,o(),this.paintMs=Math.round(r*100)/100,this.sliceMs=Math.round(i*100)/100}},G=Object.freeze({lance:Object.freeze([.34,.36,.88]),lanceLit:Object.freeze([.62,1.4,1.85]),burst:Object.freeze([.55,1.2,1.8]),glyph:Object.freeze([.26,.54,.9]),swirl:Object.freeze([.6,.78,1]),flake:Object.freeze([.6,1.25,1.75]),flakeNear:Object.freeze([.22,.5,.85]),shard:Object.freeze([.26,.3,.78]),shardLit:Object.freeze([.3,.62,.95]),shell:Object.freeze([.3,.34,.8]),shellLit:Object.freeze([.38,.74,1.02]),mist:Object.freeze([.5,.6,.85]),ring:Object.freeze([.42,.74,1.15]),star:Object.freeze([.45,.85,1.7]),starFlash:Object.freeze([.5,.95,1.8])}),K=.6,ke=Object.freeze({rgb:Object.freeze([.2,.45,.88]),alpha:.55,soft:.85}),q=Object.freeze([.55,.85,1]),Ae=Object.freeze({frostLance:Object.freeze({peak:1.1,flash:1.8}),blizzard:Object.freeze({peak:1.4,flash:2.2}),glacialTomb:Object.freeze({peak:1.5,flash:2.4}),tau:.12}),J=Object.freeze({tombColor:[.15,.4,1.8],tombDistance:10.5,tombLift:3,charge:5,chargeLift:.6,chargeDistance:4.5,flash:12,flashTau:.1,hold:2.5,holdDecay:2,shatter:12,stormColor:[.16,.4,1.6],stormDistance:11,stormLift:3,storm:7,impactColor:[.25,.6,1.8],impactDistance:3.5,impact:6,impactT:.16,cap:6}),Y=Object.freeze({light:.55,glow:.5,crystal:.75,flash:.25}),X=e=>e+(1-e)*C.uNight.value,je=.012,Me=-.03,Ne=64,Pe=16,Fe=3,Ie=.25,Z=Object.freeze({size:1.3,nearLow:.62,innerLow:.72,screenLow:.5,screenDepth:2.6,screenSide:.75,sink:.02,centreBack:.8,crackLead:.22,rise:.13,peakAt:.55,overshoot:1.15,outer:.25,sweep:.11,inner:.14,innerSweep:.05,crackT:.32,glintT:.38,discOut:.16,shardLife:[.9,1.3],dissolve:.3,recede:1.1}),Q=Object.freeze({gust:1.2,gustFire:.5,gustRise:.4,gustFall:.7,recede:1,flakes:18,near:4});function Le(){return{on:!1,kind:`blizzard`,x:0,y:0,z:0,t:0,n:0,m:-1,a:0,tag:0,flake:0,near:0,hail:0,mist:0,fx:[],spikes:[],gf:-1,light:null,disc:null,discRgb:[0,0,0],fromX:0,fromZ:0,tipFx:[null,null,null],ready:-1,fade:0,lph:0,lt:0}}var $=e=>{let t=Math.max(0,Math.min(1,e));return t*t*(3-2*t)},Re=e=>e<=0?0:e>=1?1:e;function ze(e,t,n,r){e.x=t.x,e.y=t.y,e.z=t.z,e.rot+=t.spin*n,e.alpha=r}function Be(e,t,n){e.x=t.x,e.y=t.y+n,e.z=t.z,e.dirX=t.dx,e.dirZ=t.dz}var Ve=e=>{let t=Math.PI*2;return e=(e%t+t)%t,e>Math.PI?e-t:e};function He(e){if(e<=0)return 0;let t=Z.peakAt;if(e<t){let n=1-e/t;return Z.overshoot*(1-n*n*n)}return e<1?Z.overshoot-(Z.overshoot-1)*$((e-t)/(1-t)):1}var Ue=class{constructor(e){this.sys=e;let t=e.tileMap;this.crystals=new P({capacity:48}),this.frost=new Oe({capacity:4,heightField:{sample:(e,n)=>t.getHeight(e,n),surface:(e,n)=>t._surface(e,n),minX:0,minZ:0,maxX:t.width,maxZ:t.depth}}),e.scene?.add(this.crystals.object),e.scene?.add(this.frost.object),e.quads?.enableHalo(),this.directors=[],this._gust=0,this.gustMax=e.world?.flames?Q.gustFire:Q.gust,this._warmQuad=-1}director(e){let t=new We(this,e);return this.directors.push(t),t}drop(e){let t=this.directors.indexOf(e);t>=0&&this.directors.splice(t,1)}warmup(e){this.crystals.warm(),this.frost.warm(),this.crystals.update(0),this.frost.update(0);let t=this.sys.quads;this._warmQuad=t.alloc(),this._warmQuad>=0&&t.set(this._warmQuad,{x:e.x,y:e.y,z:e.z,frame:`partyIceGlow`,index:0,scale:1,mode:`billboard`,r:2,g:2,b:2,a:1,halo:1}),t.update()}endWarmup(){this.crystals.unwarm(),this.frost.unwarm(),this.crystals.update(0),this.frost.update(0),this._warmQuad>=0&&this.sys.quads.free(this._warmQuad),this._warmQuad=-1}update(e,t=!0,n=0,r=!1){let i=!t&&!this.sys.game?.photoMode,a=0;for(let e of this.directors)e._frameDt=n,r?(e.hush(),e.settle(n)):i?e.hush():(t&&e.resume(n),a=Math.max(a,e.gust));this._setGust(Math.round(Math.min(a,this.gustMax)*100)/100),this.crystals.update(e),this.frost.update(e)}_setGust(e){if(e===0&&this._gust===0)return;let t=this.sys.game?.weather;t&&`gust`in t&&(t.gust=e),this._gust=e}dropLights(){for(let e of this.directors)e.dropLights()}dispose(){for(let e of[...this.directors])e.dispose();this.directors.length=0,this._setGust(0),this.crystals.dispose(),this.frost.dispose()}info(){return{directors:this.directors.length,crystals:this.crystals.count,frost:this.frost.count,gust:this._gust,halo:!!this.sys.quads?.halo}}},We=class{constructor(e,t){this.stage=e,this.mc=t,this.sys=t.sys,this.fx=new E(this.sys,{halo:0}),this._lances=[],this._fields=Array.from({length:Fe},Le),this._flakes=[],this._drifts=[],this._shards=[],this._shells=new Map,this._sparks=[],this._crystal=w(t.member.sprite?.sheet),this._crys={x:0,y:0,z:0},this._wind={x:1,z:0},this._crysP={rise:0,crack:0,glint:0,glow:1},this._frostP={spread:0,fade:0,cracks:0,crackFrom:{x:0,z:0},glow:1},this._riseP={rise:0},this._fadeP={fade:0},this._lightP={color:J.tombColor,intensity:0,distance:8,decay:1},this._frameDt=0,this._tips=[{x:0,y:0,z:0},{x:0,y:0,z:0},{x:0,y:0,z:0}],this.gust=0,this._snap=new Map,this.clear()}get count(){return this.fx.count}clear(){this._lances.length=0;for(let e of this._fields)e.on&&this._closeField(e);this._flakes.length=0,this._drifts.length=0,this._shards.length=0;for(let e of this._shells.keys())e.iceShell=!1;this._shells.clear();for(let e of this._sparks)e.light.release();this._sparks.length=0,this.fx.clear(),this.gust=0,this._star=null,this.glow=0,this._kick=0,this._glowShown=-1,this.lights={acquired:0,refused:0},this._settling=!1,this._settleT=0,this._settled=!1,this._back=1,this._backT=0,this._snap.clear(),this.rng=new n((u(`ice:${this.mc.id}`)^Number(this.sys.seedValue)>>>0)>>>0),this._writeGlow(0)}hush(){for(let e of this._fields)e.on&&e.light&&e.light.off();for(let e of this._sparks)e.light.off()}settle(e){if(!this._settling){this._settling=!0,this._settleT=0,this._settled=!1,this._snap.clear();for(let e=0;e<this.fx.live.length;e++)this._snap.set(this.fx.live[e],this.fx.live[e].alpha)}if(this._settled)return;this._settleT+=e;let t=Re(this._settleT/Ie);this._back=1-t;for(let e=0;e<this.fx.live.length;e++){let n=this.fx.live[e];n.alpha=(this._snap.get(n)??0)*(1-t)}let{crystals:n,frost:r}=this.stage,i=this._riseP,a=this._fadeP;for(let e of this._fields)if(e.on){for(let r of e.spikes)r.h<0||(i.rise=r.r*(1-t),n.set(r.h,i));e.gf>=0&&(a.fade=Math.max(e.fade,t),r.set(e.gf,a))}this.glow!==0&&(this.glow=0,this._writeGlow(0)),t>=1&&this._endOneShots();let o=this.sys.fx;this.fx.write(o?o.viewX:0,o?o.viewZ:-1,1-K*C.uNight.value)}_endOneShots(){for(let e of this._lances)this.fx.kill(e.body),this.fx.kill(e.lit);this._lances.length=0;for(let e of this._fields)e.on&&this._closeField(e);for(let e of this._flakes)this.fx.kill(e.rec);this._flakes.length=0;for(let e of this._drifts)this.fx.kill(e.rec);this._drifts.length=0;for(let e of this._shards)this.fx.kill(e.body),this.fx.kill(e.lit);this._shards.length=0;for(let e of this._sparks)e.light.release();this._sparks.length=0,this._star&&this.fx.kill(this._star),this._star=null,this.gust=0,this._back=0,this._settled=!0}resume(e){this._settling&&(this._settled||this._endOneShots(),this._settling=!1,this._settled=!1,this._backT=0),this._back<1&&(this._backT+=e,this._back=Re(this._backT/Ie))}dropLights(){for(let e of this._fields)e.light&&=(e.light.release(),null);for(let e of this._sparks)e.light.release();this._sparks.length=0}dispose(){this.clear(),this.stage.drop(this)}_acquireLight(e){let t=this.sys.world,n=t&&typeof t.acquireSpellLight==`function`?t.acquireSpellLight(e):null;return n?this.lights.acquired++:this.lights.refused++,n}gather(e=3){let t=this._crystalAt();this.sys.burst(`partyFrostGlint`,t.x,t.y,t.z,e)}released(e){this._kick=Ae[e].flash;let t=this._crystalAt();this.fx.add({frame:`partySunburst`,mode:`billboard`,x:t.x,y:t.y,z:t.z,scale:.55,color:G.starFlash,life:.16,fadeOut:.14,frames:[1],back:-.25,halo:1}),this.sys.burst(`partyFrostGlint`,t.x,t.y,t.z,4)}launch(e){let t={frame:`partyIceLance`,mode:`flat`,x:e.x,y:e.y,z:e.z,dirX:e.dx,dirZ:e.dz,rot:Math.PI/2,scale:1.6,color:G.lance,life:1/0,loop:!0},n=this.fx.add(t),r=this.fx.add({...t,frame:`partyIceLanceLit`,y:e.y+je,color:G.lanceLit,halo:1});this._lances.push({ms:e,body:n,lit:r})}lanceEnd(e,t){let n=this._lances.findIndex(t=>t.ms===e);if(n>=0){let e=this._lances[n];this.fx.kill(e.body),this.fx.kill(e.lit),this._lances.splice(n,1)}let r=this.sys;if(!t){r.burst(`partyFrostGlint`,e.x,e.y,e.z,3);return}this.fx.add({frame:`partySunburst`,mode:`billboard`,x:e.x,y:e.y-.1,z:e.z,scale:.9,color:G.burst,life:.24,back:.2,halo:1}),r.burst(`partyFrostShards`,e.x,e.y,e.z,8);let i=r.groundAt(e.x,e.z);for(let t=0;t<3;t++){let t=Math.atan2(-e.dz,-e.dx)+(this.rng.next()-.5)*2.2,n=1.4+1.6*this.rng.next();this._shard(e.x,e.y,e.z,Math.cos(t)*n,1.5+2*this.rng.next(),Math.sin(t)*n,.45+.15*this.rng.next(),.7)}if(this._mist(e.x,i,e.z,1.1,.7),this._sparks.length<2){let t=this._acquireLight({minor:!0});t&&this._sparks.push({light:t,x:e.x,y:e.y+.6,z:e.z,t:0})}}open(e){let t=e.kind===`blizzard`?`blizzard`:`glacialTomb`,n=this._fields.find(e=>!e.on);if(!n){n=this._fields[0];for(let e of this._fields)e.t>n.t&&(n=e);this._closeField(n)}let r=this.mc.kit;n.on=!0,n.kind=t,n.x=e.x,n.z=e.z,n.y=e.y,n.t=0,n.n=0,n.m=-1,n.flake=0,n.near=.15,n.hail=.05,n.mist=.1,n.a=e.a,n.tag=e.tag,n.fx.length=0,n.spikes.length=0,n.disc=null,n.ready=-1,n.lph=0,n.lt=0,n.fade=0;let i=this._crystalAt();n.fromX=i.x,n.fromZ=i.z;let a=this.rng.next()*2147483647|0,{x:o,z:s}=n,c=n.y+ne,l=this.fx,u=e=>(e&&n.fx.push(e),e),d=this.stage.frost;if(t===`blizzard`){let e=r.skill;n.gf=d.add({x:o,z:s,radius:e.r*1.1,seed:a}),u(l.add({frame:`partyGlyphFrost`,mode:`flat`,x:o,y:c,z:s,size:2,sizeTo:e.r*2,grow:.35,rot:n.a,spin:.5,color:G.glyph,life:e.duration+.3,fadeIn:.2,fadeOut:.4,alpha:D})),u(l.add({frame:`partySwirl`,mode:`flat`,x:o,y:c+2,z:s,size:2,sizeTo:e.r*1.7,grow:.6,rot:n.a+1.7,spin:2.4,color:G.swirl,life:e.duration,fadeIn:.4,fadeOut:.6,fps:6,loop:!0,alpha:.75,soft:.6})),u(l.add({frame:`partySwirl`,mode:`flat`,x:o,y:c+1.1,z:s,size:1.5,sizeTo:e.r*1.05,grow:.5,rot:n.a-.6,spin:3.6,color:G.swirl,life:e.duration-.1,fadeIn:.35,fadeOut:.5,fps:6,loop:!0,alpha:.8,soft:.5}))}else{let e=r.skill2;n.gf=d.add({x:o,z:s,radius:e.r*1.15,seed:a}),n.disc=u(l.add({frame:`partyIceGlow`,mode:`flat`,x:o,y:c-.03,z:s,size:e.r*.4,sizeTo:e.r*1,grow:e.delay,rot:n.a,color:n.discRgb,life:e.delay+e.hold+.4,alpha:0,soft:ke.soft})),u(l.add({frame:`partyGlyphFrost`,mode:`flat`,x:o,y:c,z:s,size:1.2,sizeTo:e.r*2,grow:e.delay,rot:n.a,spin:1.6,color:G.glyph,life:e.delay+e.hold+.2,fadeIn:.1,fadeOut:.3,alpha:D})),this._planTomb(n,e),this._mist(o,n.y,s,1.6,.9)}let f=this._fields.find(e=>e!==n&&e.on&&e.light);f?(n.light=f.light,f.light=null):n.light=this._acquireLight()}_planTomb(e,t){let n=this.sys,r=this.rng,i=Math.ceil(t.spikes*.6),a=t.spikes-i,o=Math.atan2(e.fromZ-e.z,e.fromX-e.x),s=e=>Math.abs(Ve(e-o))/Math.PI,c=n.fx,l=c?c.viewX:0,u=c?c.viewZ:-1,d=e=>Z.size*(1-Z.nearLow*Math.max(0,-(Math.cos(e)*l+Math.sin(e)*u))),f=[];for(let r of n.enemies)r.alive&&Math.hypot(r.position.x-e.x,r.position.z-e.z)<t.r+1&&f.push(r.position);let p=(e,t)=>f.some(n=>{let r=n.x-e,i=n.z-t,a=r*l+i*u;return a>-.3&&a<Z.screenDepth&&Math.abs(r*u-i*l)<Z.screenSide}),m=(t,i,a,o,s,c,l,u)=>{let d=t-e.x,f=i-e.z,m=Math.hypot(d,f);if(m>.001)d/=m,f/=m;else{let e=r.next()*Math.PI*2;d=Math.cos(e),f=Math.sin(e)}let h=(r.next()-.5)*.24;e.spikes.push({x:t,y:n.groundAt(t,i)-Z.sink,z:i,height:p(t,i)?a*Z.screenLow:a,radius:o,yaw:r.next()*Math.PI*2,tiltX:d*s-f*h,tiltZ:f*s+d*h,seed:r.next()*2147483647|0,start:c,h:-1,order:l,small:u,dx:d,dz:f,r:0})};for(let n=0;n<i;n++){let a=e.a+n*Math.PI*2/i+(r.next()-.5)*.2,o=t.r*(.78+.08*r.next()),c=s(a),l=t.delay-Z.outer+Z.sweep*c,u=d(a);m(e.x+Math.cos(a)*o,e.z+Math.sin(a)*o,(1.15+.45*r.next())*u,.24+.08*r.next(),.3+.2*r.next(),l,c,!1);let f=a+(r.next()<.5?-1:1)*(.15+.08*r.next()),p=o*(.9+.14*r.next());m(e.x+Math.cos(f)*p,e.z+Math.sin(f)*p,(.55+.25*r.next())*u,.14+.05*r.next(),.35+.25*r.next(),l+.03,c,!0)}for(let n=0;n<a;n++){let i=e.a+(n+.5)*Math.PI*2/a+(r.next()-.5)*.25,o=t.r*(.38+.08*r.next()),c=s(i);m(e.x+Math.cos(i)*o,e.z+Math.sin(i)*o,(1.5+.4*r.next())*d(i)*Z.innerLow,.28+.08*r.next(),.16+.12*r.next(),t.delay-Z.inner+Z.innerSweep*c,c,!1)}m(e.x+l*Z.centreBack+(r.next()-.5)*.2,e.z+u*Z.centreBack+(r.next()-.5)*.2,2.2*Z.size,.45,.06,t.delay-Z.rise*Z.peakAt,.5,!1)}_closeField(e){for(let t of e.fx)this.fx.kill(t);e.fx.length=0,e.disc=null;for(let t=0;t<e.tipFx.length;t++)e.tipFx[t]&&this.fx.kill(e.tipFx[t]),e.tipFx[t]=null;let{crystals:t,frost:n}=this.stage;for(let n of e.spikes)n.h>=0&&t.free(n.h),n.h=-1;e.spikes.length=0,e.gf>=0&&n.free(e.gf),e.gf=-1,e.light&&(e.light.off(),e.light.release()),e.light=null,e.on=!1}_stepBlizzard(e,t){let n=this.mc.kit.skill,r=this.sys,i=this.rng,a=e.t<n.duration,o=Math.floor(e.t*10);if(o!==e.m&&a){e.m=o;let t=e.a+o*2.39996,i=n.r*(.25+.6*(o*7%10/10)),a=e.x+Math.cos(t)*i,s=e.z+Math.sin(t)*i,c=r.groundAt(a,s);r.burst(`partySnowStreak`,e.x-1.2,e.y+4.6,e.z-.4,10),r.burst(`partySnowfall`,a,c+2.8,s,9),o%2==0&&r.burst(`partyFrostShards`,a,c+.9,s,2),o%3==0&&r.burst(`partyFrostGlint`,a,c+1.2,s,3)}if(e.t>=n.duration+Q.recede+.2){this._closeField(e);return}if(a){if(e.flake-=t,e.t<n.duration-.3&&e.flake<=0&&this._flakes.length<Q.flakes){e.flake+=.07;let t=this.fx.add({frame:`partyIceFlake`,mode:`billboard`,x:e.x,y:e.y,z:e.z,scale:.55+.25*i.next(),color:G.flake,life:1/0,frames:[i.next()<.5?0:1],rot:i.next()*6.3,spin:2+2*i.next(),alpha:0,halo:1});if(t){let r=n.r*(.45+.5*i.next());this._flakes.push({rec:t,fl:e,a:i.next()*Math.PI*2,r,y:.7+2*i.next(),w:2.6*(n.r/(r+1)),vy:-.45-.4*i.next(),age:0,life:1.1+.5*i.next()})}}if(e.near-=t,e.near<=0&&e.t<n.duration-.6){e.near+=.2+.15*i.next();let t=0;for(let e of this._drifts)e.rec.frame===`partyIceBokeh`&&t++;t<Q.near&&this._nearFlake(e)}if(e.hail-=t,e.hail<=0&&e.t<n.duration-.4){e.hail+=.11;let t=this._windDir(),a=i.next()*Math.PI*2,o=n.r*Math.sqrt(i.next())*.9,s=e.x+Math.cos(a)*o,c=e.z+Math.sin(a)*o,l=.42,u=t.x*3.2,d=t.z*3.2,f=r.groundAt(s,c);this._shard(s-u*l,f+2.9,c-d*l,u,-5.5,d,.32+.14*i.next(),.9)}if(e.mist-=t,e.mist<=0&&e.t<n.duration-.5){e.mist+=.4;let t=i.next()*Math.PI*2,a=n.r*(.7+.35*i.next()),o=e.x+Math.cos(t)*a,s=e.z+Math.sin(t)*a;this._mist(o,r.groundAt(o,s),s,1.7+.8*i.next(),1.5)}}}_stepTomb(e){let t=this.mc.kit.skill2,n=this.sys,r=1e-6;if(e.n<2){for(let t of e.spikes)if(!(t.h!==-1||e.t<t.start-r)){if(t.h=this.stage.crystals.spawn(t),t.h<0){t.h=-2;continue}t.small||(n.burst(`partyIceChunks`,t.x,t.y+.2,t.z,2),n.burst(`partyFrostShards`,t.x,t.y+.5,t.z,2),e.m<0&&(e.m=1,n.sfxAt(`iceSpike`,e.x,e.z,{volume:.6,pitch:1.25})))}}if(e.n===0&&e.t>=t.delay-r){e.n=1;let r=this.fx.add({frame:`partyRing`,mode:`flat`,x:e.x,y:e.y+ne+.03,z:e.z,size:2,sizeTo:t.r*2.3,grow:.3,color:G.ring,life:.4,fadeOut:.2,fps:0,alpha:O,soft:.3});r&&e.fx.push(r),n.burst(`partyFrostShards`,e.x,e.y+.6,e.z,10),n.burst(`partyIceChunks`,e.x,e.y+.3,e.z,8),n.burst(`partyFrostGlint`,e.x,e.y+1.4,e.z,6)}e.n===1&&e.t>=t.delay+t.hold-r&&(e.n=2,this._shatterTomb(e),n.burst(`partyIceChunks`,e.x,e.y+.6,e.z,10),n.burst(`partyFrostGlint`,e.x,e.y+1,e.z,6)),e.t>=t.delay+t.hold+Z.recede+.1&&this._closeField(e)}_shatterTomb(e){let t=this.rng,n=this.sys;for(let r of e.spikes){if(r.h<0)continue;this.stage.crystals.free(r.h),r.h=-1;let e=r.small?1:r.height>2?4:2;for(let n=0;n<e;n++){let e=.25+.55*t.next(),n=r.x+r.tiltX*e,i=r.z+r.tiltZ*e,a=r.y+r.height*e,o=1.2+2.2*t.next(),s=(t.next()-.5)*2,c=r.dx*o-r.dz*s,l=r.dz*o+r.dx*s,u=r.small?.5+.15*t.next():.7+.35*t.next();this._shard(n,a,i,c,2.2+2.6*t.next(),l,u,Z.shardLife[0]+(Z.shardLife[1]-Z.shardLife[0])*t.next())}!r.small&&t.next()<.5&&n.burst(`partyIcePuff`,r.x,r.y+.3,r.z,2)}this._mist(e.x,e.y,e.z,2.4,1.2)}_nearFlake(e){let t=this.rng,n=C.uCameraPosition.value,r=.45+.17*t.next(),i=this.sys.fx,a=i?i.viewX:0,o=i?i.viewZ:-1,s=(t.next()<.5?-1:1)*(2.2+3*t.next()),c=e.x-o*s,l=e.z+a*s,u=e.y+1.2+1.5*t.next(),d=c+(n.x-c)*r,f=u+(n.y-u)*r,p=l+(n.z-l)*r,m=this.fx.add({frame:`partyIceBokeh`,mode:`billboard`,x:d,y:f,z:p,scale:.24+.16*t.next(),color:G.flakeNear,life:1/0,alpha:0});if(!m)return;let h=this._windDir();this._drifts.push({rec:m,vx:h.x*1.4,vy:-1.1,vz:h.z*1.4,age:0,life:1.1+.4*t.next()})}_mist(e,t,n,r,i){let a=this.rng,o=this.fx.add({frame:`partyIceMist`,mode:`billboard`,x:e,y:t+r*.16,z:n,size:r,color:G.mist,life:1/0,frames:[Math.floor(a.next()*3)],alpha:0,soft:.85});if(!o)return;let s=this._windDir();this._drifts.push({rec:o,vx:s.x*.45,vy:.08,vz:s.z*.45,age:0,life:i})}_windDir(){let e=C.uWind.value,t=Math.hypot(e.x,e.y)||1,n=this._wind;return n.x=e.x/t,n.z=e.y/t,n}_shard(e,t,n,r,i,a,o,s){if(this._shards.length>=Ne)return;let c=this.rng,l=Math.floor(c.next()*4),u=c.next()*Math.PI*2,d=this.fx.add({frame:`partyIceShard`,mode:`billboard`,x:e,y:t,z:n,scale:o,rot:u,color:G.shard,life:1/0,frames:[l]});if(!d)return;let f=this.fx.add({frame:`partyIceShardLit`,mode:`billboard`,x:e,y:t,z:n,scale:o,rot:u,color:G.shardLit,life:1/0,frames:[l],back:Me,halo:1});this._shards.push({body:d,lit:f,x:e,y:t,z:n,vx:r,vy:i,vz:a,spin:(c.next()-.5)*14,age:0,life:s,bounced:!1,half:.2*o})}step(e){for(let t of this._fields)t.on&&(t.t+=e,t.kind===`blizzard`?this._stepBlizzard(t,e):this._stepTomb(t));this._stepFlakes(e),this._stepDrifts(e),this._stepShards(e),this.fx.step(e)}_stepFlakes(e){let t=this._flakes;for(let n=t.length-1;n>=0;n--){let r=t[n];if(r.age+=e,r.age>=r.life){this.fx.kill(r.rec),t[n]=t[t.length-1],t.pop();continue}r.a+=r.w*e,r.r*=Math.exp(-.15*e),r.y=Math.max(.15,r.y+r.vy*e);let i=r.rec;i.x=r.fl.x+Math.cos(r.a)*r.r,i.z=r.fl.z+Math.sin(r.a)*r.r,i.y=r.fl.y+r.y,i.alpha=Re(Math.min(r.age/.15,(r.life-r.age)/.3))}}_stepDrifts(e){let t=this._drifts;for(let n=t.length-1;n>=0;n--){let r=t[n];if(r.age+=e,r.age>=r.life){this.fx.kill(r.rec),t[n]=t[t.length-1],t.pop();continue}let i=r.rec;i.x+=r.vx*e,i.y+=r.vy*e,i.z+=r.vz*e;let a=i.frame===`partyIceMist`;i.alpha=Re(Math.min(r.age/(a?.3:.2),(r.life-r.age)/(a?.55:.35)))*(a?.85:1)}}_stepShards(e){let t=this.sys,n=this._shards;for(let r=n.length-1;r>=0;r--){let i=n[r];if(i.age+=e,i.age>=i.life){this.fx.kill(i.body),this.fx.kill(i.lit),n[r]=n[n.length-1],n.pop();continue}i.vy-=Pe*e,i.x+=i.vx*e,i.y+=i.vy*e,i.z+=i.vz*e;let a=t.groundAt(i.x,i.z);if(i.y-i.half<=a&&i.vy<=0){if(i.y=a+i.half,!i.bounced)i.bounced=!0,i.vy=-i.vy*.3,i.vx*=.45,i.vz*=.45,i.spin*=.4,t.burst(`partyIcePuff`,i.x,a+.08,i.z,2);else{i.vy=0;let t=Math.exp(-10*e);i.vx*=t,i.vz*=t,i.spin*=t}}let o=Re((i.life-i.age)/Z.dissolve);ze(i.body,i,e,o),i.lit&&ze(i.lit,i,e,o)}}visuals(e){for(let e of this._lances)e.body&&Be(e.body,e.ms,0),e.lit&&Be(e.lit,e.ms,je);let t=0;for(let e of this._fields)e.on&&(e.kind===`blizzard`?t=Math.max(t,this._stormLook(e)):this._tombLook(e));if(this.gust=this._settling?0:t,this._shellsLook(),this._sparksLook(e),this._settling)return;let n=this.mc,r=n.move,i=r===`frostLance`||r===`blizzard`||r===`glacialTomb`?Ae[r]:null,a=n.kit,o=r===`frostLance`?a.basic.release:r===`blizzard`?a.skill.at:r===`glacialTomb`?a.skill2.at:0,s=!!i&&!n.down&&n.frame<o,c=0,l=0;if(s&&(l=$(n.t/T(o)),c=i.peak*l*(1+.08*Math.sin(Math.PI*2*9*n.t))),this._kick>0&&(this.glow=Math.max(this.glow,this._kick),this._kick=0),this.glow=n.down?0:c>=this.glow?c:c+(this.glow-c)*Math.exp(-e/Ae.tau),this.glow<.01&&(this.glow=0),this._writeGlow(this.glow),s){let e=this._crystalAt();this._star||=this.fx.add({frame:`partySunburst`,mode:`billboard`,x:e.x,y:e.y,z:e.z,scale:.3,color:G.star,life:1/0,frames:[0],spin:2,back:-.25,halo:1});let t=this._star;t&&(t.x=e.x,t.y=e.y,t.z=e.z,t.s0=t.s1=.3+.25*l,t.alpha=Math.min(1,.25+l))}else this._star&&=(this.fx.kill(this._star),null);let u=this.sys.fx;this.fx.write(u?u.viewX:0,u?u.viewZ:-1,1-K*C.uNight.value)}_tombLook(e){let t=this.mc.kit.skill2,{crystals:n,frost:r}=this.stage,i=e.t,a=t.delay,o=t.delay+t.hold,s=$((i-(o-Z.crackT))/Z.crackT),c=i>=a?Math.exp(-(i-a)/.15):0,l=this._crysP,u=X(Y.crystal);for(let t of e.spikes){if(t.h<0)continue;let e=a+.08+.3*t.order,r=e+.42;l.rise=He((i-t.start)/Z.rise),l.crack=s,l.glint=Re(i<r?(i-e)/Z.glintT:(i-r)/Z.glintT);let o=Math.max(0,i-t.start-Z.rise*Z.peakAt);l.glow=(1+.35*Math.exp(-o/.1)+.2*c+.5*s)*u,n.set(t.h,l),t.r=l.rise}if(e.gf>=0){let t=a-Z.outer,n=this._frostP;e.ready<0&&r.ready(e.gf)&&(e.ready=i);let s=e.ready;n.spread=i<t?.12*$(i/t):.12+.88*$((i-t)/(Z.outer+.25)),n.fade=$((i-o)/Z.recede),n.cracks=s<0?0:$((i-s)/Math.max(.05,a-Z.crackLead-s)),n.glow=(1+.8*c)*X(Y.glow),n.crackFrom.x=e.fromX,n.crackFrom.z=e.fromZ,r.set(e.gf,n),e.fade=n.fade}let d=e.disc;if(d){let t=$(i/a),n=1-$((i-a)/Z.discOut),r=.35+.65*t;for(let t=0;t<3;t++)e.discRgb[t]=ke.rgb[t]*r;d.alpha=ke.alpha*t*n}let f=i<a&&e.gf>=0?r.crackTips(e.gf,this._tips):0;for(let t=0;t<e.tipFx.length;t++){let n=e.tipFx[t];if(!n)continue;if(t>=f){this.fx.kill(n),e.tipFx[t]=null;continue}let r=this._tips[t];n.x=r.x,n.y=r.y+.3,n.z=r.z}for(let t=0;t<f;t++){if(e.tipFx[t])continue;let n=this._tips[t];e.tipFx[t]=this.fx.add({frame:`partySunburst`,mode:`billboard`,x:n.x,y:n.y+.3,z:n.z,scale:.42,color:G.star,life:1/0,frames:[0],spin:5,back:-.3,halo:1})}let p=e.light;if(p){let t=this._lightP,n=X(Y.light);if(t.color=J.tombColor,t.decay=1,i<a){let r=f>0?this._tips[0]:null;t.intensity=Math.min(J.cap,J.charge*(.3+.7*$(i/a))*n),t.distance=J.chargeDistance,r?p.set(r.x,r.y+J.chargeLift,r.z,t):p.set(e.x,e.y+J.chargeLift*2,e.z,t)}else if(e.n>=2&&i>o+.5)p.off(),p.release(),e.light=null;else{let r=e.n<2?1:2;e.lph===r?e.lt+=this._frameDt:(e.lph=r,e.lt=0);let a,s;r===1?(s=Math.exp(-e.lt/J.flashTau),a=J.hold*n+(J.flash-J.hold)*s*X(Y.flash)):(s=Math.exp(-e.lt/.1),a=J.shatter*s*X(Y.flash)+J.hold*(1-$((i-o)/.4))*(1-s)*n),t.decay=J.holdDecay+(1-J.holdDecay)*s,t.intensity=Math.min(J.cap,a),t.distance=J.tombDistance,p.set(e.x,e.y+J.tombLift,e.z,t)}}}_stormLook(e){let t=this.mc.kit.skill,n=e.t,r=$(n/.35)*(1-$((n-t.duration)/.5));if(e.gf>=0){let r=this._frostP;r.spread=.1+.9*$(n/t.duration),r.fade=$((n-t.duration)/Q.recede),r.cracks=0,r.glow=X(Y.glow),r.crackFrom.x=e.x,r.crackFrom.z=e.z,this.stage.frost.set(e.gf,r),e.fade=r.fade}let i=e.light;if(i){if(n>t.duration+.6)i.off(),i.release(),e.light=null;else{let t=.78+.22*(.6*Math.sin(n*23.1)+.4*Math.sin(n*37.7+1.3)),a=l(Math.floor(n*6),e.tag,77)>.8?1.5:1,o=this._lightP;o.color=J.stormColor,o.decay=1,o.intensity=Math.min(J.cap,J.storm*r*t*a*X(Y.light)),o.distance=J.stormDistance,i.set(e.x+Math.cos(n*2.4)*.9,e.y+J.stormLift,e.z+Math.sin(n*2.4)*.9,o)}}return Q.gust*$(n/Q.gustRise)*(1-$((n-t.duration)/Q.gustFall))*(.85+.15*Math.sin(n*4.3))}_shellsLook(){let e=this.sys,t=this.mc.kit.skill2,n=!1;for(let e of this._fields)e.on&&e.kind===`glacialTomb`&&e.n>=1&&(n=!0);if(n&&!this._settling){let n=e.enemies;for(let r=0;r<n.length;r++){let i=n[r];if(!i.alive||!i.frozen||!i.sprite.visible||i.iceShell||this._shells.has(i))continue;let a=i.position,o=!1;for(let e of this._fields)e.on&&e.kind===`glacialTomb`&&e.n>=1&&Math.hypot(a.x-e.x,a.z-e.z)<=t.r+i.radius+.25&&(o=!0);if(!o)continue;let s=i.def.body,c=Math.max(.6,s[1]-s[0])+.2,l=c/(38/16),d=e.bodyBase(i)+s[0]+c/2-.12,f=-(i.radius*.6+.12),p=u(String(i.uid))&1,m=this.fx.add({frame:`partyIceShell`,mode:`billboard`,x:a.x,y:d,z:a.z,scale:l*1.15,scaleTo:l,grow:.09,color:G.shell,life:1/0,frames:[p],back:f,follow:a});if(!m)continue;let h=[...G.shellLit],g=this.fx.add({frame:`partyIceShellLit`,mode:`billboard`,x:a.x,y:d,z:a.z,scale:l*1.15,scaleTo:l,grow:.09,color:h,life:1/0,frames:[p],back:f+Me,follow:a,halo:1});i.iceShell=!0,this._shells.set(i,{e:i,body:m,lit:g,rgb:h,ph:this.rng.next()})}}let r=e.clock;for(let e of this._shells.values()){let t=e.e;if(t.alive&&t.frozen&&t.sprite.visible){let t=(r/.9+e.ph)%1,n=1+.55*Math.max(0,1-Math.abs(t-.5)/.08);for(let t=0;t<3;t++)e.rgb[t]=G.shellLit[t]*n;e.body.alpha=this._back,e.lit&&(e.lit.alpha=this._back);continue}this._shatterShell(e),this._shells.delete(t)}}_shatterShell(e){e.e.iceShell=!1;let t=this.rng,n=this.sys,r=e.body,i=n.fx,a=r.x+(i?i.viewX:0)*r.back,o=r.z+(i?i.viewZ:-1)*r.back,s=r.s1*(38/16);this.fx.kill(e.body),this.fx.kill(e.lit);for(let e=0;e<6;e++){let e=t.next()*Math.PI*2,n=1.3+1.6*t.next();this._shard(a+Math.cos(e)*.25,r.y+(t.next()-.5)*s*.6,o+Math.sin(e)*.25,Math.cos(e)*n,1.8+1.8*t.next(),Math.sin(e)*n,.45+.25*t.next(),.8+.3*t.next())}n.burst(`partyIcePuff`,a,r.y,o,3)}_sparksLook(e){let t=this._sparks,n=this._lightP;for(let r=t.length-1;r>=0;r--){let i=t[r];if(i.t+=e,i.t>=J.impactT||!i.light.held){i.light.off(),i.light.release(),t[r]=t[t.length-1],t.pop();continue}let a=1-i.t/J.impactT;n.color=J.impactColor,n.decay=1,n.intensity=J.impact*a*a*X(Y.light),n.distance=J.impactDistance,i.light.set(i.x,i.y,i.z,n)}}_writeGlow(e){let t=Math.round(e*100)/100;t!==this._glowShown&&(this._glowShown=t,this.mc.member.sprite?.setGlow(q[0],q[1],q[2],t))}_crystalAt(){let e=this.mc,t=e.member.position,n=this._crys,r=this._crystal?.[e._lastRow]?.[e._lastCol]??null,i=r?r.right:.3,a=r?r.up:1.7,o=C.uCameraYaw.value;return n.x=t.x+Math.cos(o)*i,n.y=t.y+a,n.z=t.z-Math.sin(o)*i,n}info(){return{effects:this.fx.count,glow:+this.glow.toFixed(3),star:!!this._star,lances:this._lances.length,fields:this._fields.filter(e=>e.on).map(e=>e.kind),flakes:this._flakes.length,drifts:this._drifts.length,shards:this._shards.length,shells:this._shells.size,crystals:this._fields.reduce((e,t)=>e+t.spikes.filter(e=>e.h>=0).length,0),frost:this._fields.filter(e=>e.on&&e.gf>=0).length,gust:+this.gust.toFixed(2),lights:{...this.lights,held:this._fields.filter(e=>e.on&&e.light?.held).length+this._sparks.filter(e=>e.light.held).length}}}};export{We as IceSpellFx,Ue as IceStage};