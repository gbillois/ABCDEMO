# Rebuilding the characters of "Le Domaine des Pins" — shared spec

LAB = `/tmp/claude-0/-home-user-ABCDEMO/947ae848-9dfc-5c86-a9ad-2e9ae79ab6cd/scratchpad/lab`
GAME = `/home/user/ABCDEMO/pins/index.html` (one 480 KB HTML file; the characters live in the section
`/* ================= Personnages ================= */`, lines ~2627–2940, plus `putGlasses` ~line 3992).
A verbatim copy of the OLD character code is in `LAB/ancien/ancien.js` (read it to understand the API we must keep).

## 1. The request (from the owner, a parent; the game is for his child Théo)

> "Here are the game characters and a photo of the children they are meant to represent. Drastically improve the
> realism, especially the body, the shoulders (they are not bodybuilders!) and the animation. Try the face too.
> Rebuild all the modelling from zero if needed."

He then added a pool photo ("realistic, with accessories too": swim caps, swim goggles, one-piece swimsuits, tight
swim boxers, bare feet) and a photo with an adult (a grandmother).

Reference photos (open them with the Read tool, they are images):
- `LAB/ref/photo1-enfants-habits.jpg` — 4 real kids (~7–9 y.o.) by a lake: striped tee + navy pants, red-haired boy
  in yellow tee + burgundy joggers, girl in grey zip hoodie with rainbow stripes + cherry leggings, curly-haired girl
  in black printed tee + jeans. Slim bodies, NARROW SLOPING shoulders, long thin limbs, relaxed natural stance.
- `LAB/ref/photo2-jeu-actuel.jpg` — the CURRENT game characters (what we replace): huge square shoulders, block torso,
  thick stiff arms, short tube legs, big cartoon head with a painted face decal.
- `LAB/ref/photo3-piscine.jpg` — kids at an indoor water park: real child anatomy visible (collarbones, thin arms,
  slight belly, knobbly knees, bare feet with toes), one-piece swimsuits with thin straps, tight boxer trunks,
  silicone swim caps (red, black, pink, navy) and swim goggles (blue, pink, yellow straps).
- `LAB/ref/photo4-adulte-enfants.jpg` — a grandmother (short white hair, glasses, light-blue tee, navy capri pants,
  grey sneakers) with kids in tees + shorts. Kids' heads reach her shoulder/chin.
- `LAB/out/ancien-*.png` — lab renders of the OLD characters (baseline).

Target look: **realistic proportions and anatomy, natural motion**, rendered with PBR-ish materials that sit well in
the game's lighting. Friendly, child-appropriate, not uncanny: think "high-quality stylised-realistic family game"
(proportions of real kids, soft believable faces), NOT toon/chibi, NO dark outline, NO bodybuilder shapes.
Children are slim. Shoulders slope down from the neck; the deltoid is small and round; arms are thin.

## 2. Hard constraints (from the repo's CLAUDE.md)

- Everything is **drawn in code** at runtime: geometry generated procedurally, textures painted on canvases.
  No downloaded models, images or fonts. (Embedding self-generated data is allowed but avoid it; prefer code.)
- three.js **0.170.0** from the CDN (import map `three`, `three/addons/`). Only addons already cached by the game's
  service worker are free to use: `utils/BufferGeometryUtils.js` (mergeGeometries), `geometries/RoundedBoxGeometry.js`,
  `objects/Sky.js`, `objects/Water.js`. Adding another addon means adding it to `pins/sw.js` FICHIERS — avoid it.
- No network at runtime, no `alert/confirm/prompt`, `localStorage` only inside try/catch.
- Must run on **iPads/phones** (the child plays on an iPad): see budgets in §7.
- All comments in **French**, short, in the style of the game (dense code, one idea per line, terse names mixing
  French and English like the game). User-visible text in French, simple, for a child.

## 3. Files and how the code will be integrated

All new code goes in `LAB/perso/*.js` as ES modules. They may import only from: `"three"`, `"three/addons/..."`
(the 4 cached addons), `"../jeu.js"` (shim of game globals: `mergeGeometries, mulberry, rnd, indexe, SUITS,
suitCanvas, suitTex, GLASSES, LOWQ, mat, PEAUX, CHEVEUX, ...`) and sibling `./*.js` files.
At integration the modules are concatenated into the game's inline script inside one IIFE
(`const PERSOS = (() => { ... return { person, animPerson, liveFace, setOutfit, putGlasses, putSwimGear }; })();`),
import/export lines are stripped, and `jeu.js` names resolve to the game's own globals. So:
- no top-level name may depend on being unique across the whole game except the public API;
- do not use top-level `await`; do not touch `document` except to create canvases;
- module-level caches (Map) are fine and expected.

| file | owner | content |
|---|---|---|
| `squelette.js` | DONE (shared contract) | bone names/hierarchy/joint positions per body type, bind pose, `squelette(type)` |
| `corps.js` | body agent | skin mesh generator: cage → Catmull-Clark → projection on an SDF, skin weights, UVs, regions |
| `tete.js` | face agent | head SDF (skull, jaw, nose, lips, sockets, cheeks), ears geometry, landmarks (eyes, mouth, nose tip) |
| `visage.js` | face agent | eyeballs, eyelids (blink), brows, lashes, face/skin detail texture, small expressions |
| `materiaux.js` | materials agent | skin / fabric / hair / eye materials; the one-material "lite" crowd shader |
| `anim.js` | animation agent | `animPerson(g, mode, t, v)` all modes, `liveFace(g, dt)` (blink via visage.js, breathing) |
| `habits.js` | clothes agent (wave 2) | tee, striped/printed/rainbow tee, hoodie (zip, hood), shorts, pants, leggings, jeans, sneakers, swim boxers, one-piece swimsuit, wetsuit |
| `cheveux.js` | hair agent (wave 2) | the 9 haircuts (+ variations), cap / bow / headband, glasses, swim cap, swim goggles |
| `index.js` | assembly (body agent first, then everyone) | `person(o)`, `setOutfit`, `putGlasses`, `putSwimGear`, re-exports `animPerson`, `liveFace` |
| `mannequin.js` | animation agent (optional) | a quick proxy body to preview animations before the real body exists |

Write ONLY your own files. If you need something from another module that does not exist yet, write a tiny clearly
marked fallback inside your own file (`// provisoire`), never edit someone else's file. If a contract in this SPEC
must change, say so in your final report instead of silently diverging.

## 4. Skeleton contract (`perso/squelette.js` — read it)

24 bones: `corps` (root, at the feet) → `bassin` (hips) → `colonne` → `poitrine` → `cou` → `tete`;
`poitrine` → `clavicule_d/g` → `bras_d/g` (shoulder joint) → `avantbras_d/g` (elbow) → `main_d/g` (wrist) → `doigts_d/g`;
`bassin` → `cuisse_d/g` (hip joint) → `jambe_d/g` (knee) → `pied_d/g` (ankle) → `orteils_d/g`.
`_d` = x<0 = index 0 in the game arrays, `_g` = x>0 = index 1. Character faces +z.

Four body types: `garcon`, `fille` (8-year-olds, model height 2.13 → 1.28 m at the usual scale 0.6) and
`homme`, `femme` (adults, model height 2.2 → ~1.67 m at scale 0.76). `typeDe(o)` picks the type
(`o.adulte`, else adult when `o.scale >= 0.66`; `o.long` = female). Player and other players are kids (scale .56–.64);
most NPCs are adults (.76); the crowd mixes kids (.5–.6) and adults (.68–.78).

- **Zero pose** (all rotations 0) = standing straight, arms hanging relaxed (a few degrees out), palms toward thighs.
  Rotation conventions (same as the old rig, the game writes them directly): `cuisse.rotation.x > 0` leg backward
  (sitting = −1.5), `jambe.rotation.x > 0` knee bends, `bras.rotation.x < 0` arm forward/up (−2.6 = arms overhead),
  `avantbras.rotation.x < 0` elbow bends, `bras_d.rotation.z < 0` / `bras_g.rotation.z > 0` arms out sideways
  (same for thighs), `pied.rotation.x > 0` toes point down.
- **Bind pose** (`POSE_LIAISON`): A-pose, arms ~45° out, legs barely apart. **Every skinned geometry is built in the
  bind pose** (use `articulationLiaison(type, nom)` for joint positions in bind pose). `squelette(type)` returns bones
  in zero pose + a `THREE.Skeleton` whose inverse bind matrices are shared per type. ALWAYS bind with
  `mesh.bind(skeleton, new THREE.Matrix4())` (with no matrix, three.js recomputes and would corrupt the shared inverses).
- Seated modes keep the pelvis where the old rig had it: lower `corps` by `HANCHES_ANCIEN − hip height`.
- `tete.scale` is set to `o.tete` (0.92 / 1 / 1.1, the "Visage" choice) after binding; head-attached things are children
  of the `tete` bone or skinned to it, so they scale with it.

## 5. Module contracts

### corps.js
`construireCorps(type, qualite)` → cached object `{ geo, meta }`; `qualite` = `"plein"` (player, NPCs, other players)
or `"leger"` (crowd). `geo`: indexed `BufferGeometry` in bind pose, `userData.partage = true`, attributes:
`position`, `normal`, `uv` (cylindrical per region, seams split so textures don't smear), `skinIndex` (Uint16×4),
`skinWeight` (Float32×4, sum 1, smooth across joints — no rigid parts), `region` (Float32: 0 torso, 1 neck, 2 head,
3 upper arm, 4 forearm, 5 hand, 6 thigh, 7 shin, 8 foot; arms/legs of both sides share the id, side is sign(x)),
`lng` (Float32: a length parameter along the region's bone chain, in model units, 0 at the region's proximal joint —
garments use it to cut sleeves / legs at exact heights).
`meta`: `{ type, H, sdf(x,y,z) (bind pose, ≈ signed distance, negative inside), joints (bind-pose Vector3 by bone name),
tete: landmarks from tete.js transformed into bind pose, stats: { triangles, ms } }`.
Requirements: one continuous watertight skin from head to toes (no visible joint spheres, no cracks), real fillets at
armpits, shoulders, neck, crotch; hands with a separate thumb and (at least on "plein") fingers distinguishable;
bare feet with toes (big toe distinct); knees, elbows, collarbones, shoulder blades, belly, buttocks subtly present.
The face region must be dense enough for tete.js features (target ≥ 80 segments around the head on "plein").
Generation time: "plein" < 120 ms, "leger" < 40 ms per type on a desktop (SwiftShader in the lab is ~3–5× slower).

### tete.js (face agent)
`sdfTete(x, y, z, type)` in **head-local zero-pose coordinates** (origin at the `tete` joint, i.e. the atlas,
axes like the world; the head is not rotated between zero and bind pose, so head-local = bind − joint).
`reperesTete(type)` → `{ yeux: [{ centre: Vector3, rayon }]×2 (right eye first, x<0), nez, bouche, menton,
haut (top of skull), centre, demiLargeur, oreilles: [...], front (forehead y) }` all head-local.
`oreilles(type, qualite)` → BufferGeometry (both ears, head-local, to be skinned 100% to `tete`).

### visage.js (face agent)
`construireVisage(g, os, type, o, qualite)` adds eyes (eyeballs with iris colour `o.eyes`, pupil, catch-light,
moist cornea), eyelids that can blink, brows (colour from hair), lashes (at least drawn), lips tint, subtle cheeks;
returns a controller stored in `g.userData.visage` with `animer(dt)` (blink, small saccades) used by `liveFace`.
Also gives `g.userData.lids` something meaningful (the game only passes it back to `liveFace`).

### materiaux.js
`matPeau(color)`, `matTissu(color, { map, bump })`, `matCheveux(color)`, `matYeux(...)`… — MeshStandardMaterial
(or Physical where it pays) with small `onBeforeCompile` tweaks (soft wrap lighting / fake subsurface for skin, fabric
sheen, anisotropic-looking hair highlight). Must look right under the game's ACES tonemapping (exposure 0.85), sun 3.0,
hemisphere 0.7, PMREM env 0.75, fog. Shared resources flagged `userData.partage = true`.
**Lite crowd**: one SkinnedMesh + ONE material per person: merged geometry carries a part id attribute and the material
has uniforms `pal` (colour per part) and `vis` (visibility per part) + a texture slot for the swimsuit — port of
`toonUne/geoUne/PARTIES` from the old code (see `LAB/ancien/ancien.js`), physically based instead of toon.

### anim.js
`animPerson(g, mode, t, v)` — modes used by the game (and where): `idle` (standing; also creator screen; also
"lying on a sun lounger" when the game then sets `g.rotation.x = -1.5`), `walk` (t = phase in radians; NEW optional
`v` = ground speed in m/s: < 2 walk, 2–4 jog, > 4 run; player moves at 6.5 m/s (11 m/s sprinting) with t advancing
9 rad/s (13.5 sprinting); NPC walkers ~1.2–1.8 m/s with t advancing ~6 rad/s), `swim` (front crawl, body horizontal: the
function sets `g.rotation.x = 1.35` like before), `tread` (treading water, upright, head out), `climb` (ladder, facing it),
`pedal` (pedal boat, seated pedalling), `ride` (sitting on a water slide / jumping / trampoline: legs forward, arms up),
`bike` (t = crank angle), `kart` (seated, hands on the wheel), `saddle` (on a pony, legs apart), `sit` (chair; the game
then raises the right arm to eat), `buoy` (sitting in a river ring). Every call must fully set every bone it owns
(modes switch abruptly), must set `g.rotation.x = 0` except for `swim`, and should blend smoothly between modes
(keep state in `g.userData.anim`, compute dt from `performance.now()`; if `g.userData.sansTransition` is true, snap).
The game sometimes overrides `arms[i].rotation.x` / `elbows[i].rotation.x` right after calling it — don't read bone
values back as state. `liveFace(g, dt)`: blink (delegates to `g.userData.visage.animer` if present), breathing,
micro-motion. Natural motion is a primary goal: pelvis bob/sway/rotation, spine counter-rotation, arm swing with elbow
lag, knee flexion in swing, heel strike / toe-off ankle motion, head stabilisation, weight shifts in idle.

### habits.js / cheveux.js (wave 2) — contracts defined later, built on `construireCorps` output.

### index.js — public API the game relies on (do not break)
`person(o)` → `THREE.Group` (scale `o.scale ?? .76`, `rotation.order = "YXZ"`). Options: `long` (female), `lite`, `seed`,
`coiffure` (0 short, 1 long, 2 ponytail, 3 pigtails, 4 bob, 5 curly, 6 bun, 7 very short, 8 mid-length curly),
`acc` ("casquette" | "noeud" | "bandeau" | null), `cap` (colour ⇒ casquette), `accCol`, `skin`, `hair`, `eyes`, `shirt`,
`pants`, `shoe`, `shorts` (bool), `manches` + `capuche` (hoodie), `motifHaut` ("rayures" | "etoiles" | "arcenciel"),
`motifBas` ("cerises" | "jean"), `tete` (head scale), `scale`, NEW `adulte` (bool). `g.userData` must contain:
`female, legs[2], arms[2], knees[2], elbows[2], head, lids, blink, skinColor, hairColor, capColor, clothes` and whatever
`setOutfit` needs; for lite: `une` (uniforms). `setOutfit(g, id)` (null = clothes; a `SUITS` id = swimsuit: boys get
tight swim boxers, girls a one-piece; `full` = wetsuit; texture `suitTex(su)`), `putGlasses(g, i)` (0 removes; 1..5 =
`GLASSES`), NEW `putSwimGear(g, { bonnet: colour|null, lunettes: colour|null })` (swim cap hides the hair; goggles on the
eyes). Geometries and materials shared between characters must carry `userData.partage = true` (the game's
`libererPersonnage` disposes everything else). Labels are added by the game at y ≈ 2.7–2.95 (model units).

## 6. Proportions (real 8-year-old ≈ 1.28 m; adult values in squelette.js)
Model units, kid at scale 0.6 (1 unit = 0.6 m): head height (chin→vertex) ≈ .33, head width ≈ .245, head depth ≈ .30;
neck radius ≈ .066 (short neck, ~.07 visible in front); shoulder joints at x = ±.18 (outer deltoid ≈ ±.235);
chest width ≈ .35, depth ≈ .26; waist width ≈ .32 (kids have little waist, a soft round belly), depth ≈ .25;
hip width ≈ .37, buttocks modest; upper arm radius ≈ .048, forearm ≈ .042, wrist ≈ .031, hand length ≈ .225;
thigh radius at top ≈ .085, knee ≈ .058, calf ≈ .065, ankle ≈ .037; foot length ≈ .317, width ≈ .12.
Girls and boys of 8 are nearly identical in body shape. Adults: women narrower shoulders, wider hips, bust; men broader
shoulders and chest, narrower hips; the grandmother type is a normal `femme` (soft, slightly fuller waist is fine).

## 7. Budgets
- Full character ("plein"): ≤ 26 k triangles total (body ≤ 13 k), ≤ 10 draw calls (+ shadow pass), shared geometry per
  variant, per-character construction < 4 ms once geometry is cached.
- Crowd ("leger"): ≤ 6 k triangles, exactly 1 draw call, geometry shared per variant.
- iPad: everything must also work with `LOWQ` (fewer segments allowed). No per-frame allocations in animation code.

## 8. The lab (how to see your work)
`node LAB/shot.js "<query>" <out.png> [width] [height] ["js to eval"]` renders `LAB/index.html?<query>` headless
(~6–15 s) and prints build stats + page errors. Batch: `node LAB/shot.js --lot file.json` with
`[[query, out, w, h], ...]`. Query keys: `scene=` (habits | piscine | adultes | coiffures | tenues | maillots | visages |
un | anim | modes | foule — see `scenarios.js`; you may ADD scenes there), `v=neuf|ancien|deux`, `vue=face|34|profil|dos|
visage|haut`, `mode=`, `t=`, `vit=`, `n=`, `look=`, `sexe=`, `tenue=`, `fov=`, `marge=`, `sol=herbe`, `lowq`.
`window.lab` exposes `{ THREE, scene, camera, renderer, MODS, groupes, animer, cadrer, rendre, J }` for custom evals.
Put your renders in `LAB/out/<your-prefix>-*.png`. LOOK at your renders (Read the png) and compare with the photos;
iterate until it really looks right. Check front, 3/4, profile, back and close-ups.

Shared lab files (`lab.js`, `shot.js`, `scenarios.js`, `index.html`, `jeu.js`, `squelette.js`) are read-only for teams.
Each team adds scenes in its OWN file `LAB/scenarios-<team>.js` (teams: `corps`, `visage`, `anim`, `mat`, `habits`,
`cheveux`, `integration`), exporting `export const SCENES = { name: (Q, J) => ... }`. A scene returns an actor list
(see `scenarios.js`), or `{ module: "./perso/mannequin.js", acteurs: [...] }` to render with another module that
exports `person/animPerson/...`, or `{ custom: async ({ THREE, scene, J, Q, renderer, camera }) => [{ g }] }` to build
anything yourself (e.g. a lone head). Render several views per change; keep each render ≤ 1600×900.

## 9. Feet and footwear (owner's later message)
"In the photos the feet are cut off, but of course I want feet and shoes / flip-flops."
- Bare feet must be real feet: arch, heel, ankle bones, five toes (big toe distinct, small toes grouped), subtle nails.
- With clothes: sneakers (baskets: sole with side wall, toe cap, laces/velcro, heel tab) in `o.shoe` colour; adults the
  same or plainer shoes (the grandmother wears grey sneakers).
- With a swimsuit: flip-flops (tongs: thin sole + Y strap between big toe and second toe) in the shoe colour, worn on
  land; hidden while in the water (`swim`, `tread`, `buoy`; anim.js hides them via `g.userData.tongs` meshes, or via the
  lite `vis` uniform part `tongs`). Wetsuit: barefoot or flip-flops, same rule.

## 10. Current state of the files (orchestrator)
`tete.js`, `visage.js`, `materiaux.js`, `anim.js`, `index.js` currently contain small PROVISIONAL stubs (marked
`PROVISOIRE`) so every import resolves and the lab renders a capsule mannequin on the real skeleton
(`LAB/out/stub-habits.png`). Each owner REPLACES its stub; keep the exported names working at all times (other teams
render with your module while you work — never leave a file syntactically broken for long; write to a temp name and
move it into place when it parses). Observed: plain MeshStandardMaterial skin looks grey/desaturated under the game's
ACES 0.85 lighting — the old toon materials added an emissive lift; the new skin must look like healthy skin.

## 11. Modesty rule (owner's feedback on the capsule mannequin — ABSOLUTE)
The owner saw the provisional capsule mannequin and worried ("buttocks in front? genitals visible? strange bumps?").
- NO genital anatomy, ever: the groin is smooth and neutral like a doll/shop mannequin, for all four types.
- Children have no sexual characteristics. Only `femme` has a bust, modest, always under clothes or a swimsuit.
- Buttocks are behind (−z), modest; no bulges in front of the pelvis; no odd bumps anywhere (check the profile view).
- Every render and every in-game state shows children in clothes or a swimsuit (boys: boxer trunks; girls: one-piece).
Critics must check this first; any violation is "bloquant".

## 12. NOTE FOR THE WORKFLOW (orchestrator, 07:50)
The ANIMATION and MATERIALS first passes were started separately (outside the workflow) because the workflow only runs
2 agents at a time. If you are a workflow agent labelled "build:anim" or "build:mat" AND your prompt does NOT contain the
words "YOU ARE CONTINUING", do NOT modify any file: return immediately a report with summary "skipped (done by a
separate agent)" and empty lists. Everyone else ignores this section.

## 13. Orchestrator review of work in progress (07:55) — critics and refiners: check these
Seen on `out/corps-v2-maillotface.png` (good progress: slim kids, narrow shoulders, real legs and feet):
- The `femme` one-piece shows a fold/crease at the crotch: the groin must be perfectly smooth (section 11). Same check
  for every type, in front, profile and from below.
- The `fille` chest shows a slight bump: 8-year-olds have a flat chest (only `femme` has a modest bust).
- White specks at the navel / lower belly: remove (no navel detail that renders as a hole or highlight).
- Skin looks grey-green and the face has dark green/brown smudges around the eyes and mouth (face decal / AO too dark,
  tinted): faces must look clean, warm and friendly — very subtle shading only.
- The `homme` looks gaunt and slightly sinister (sunken cheeks, dark eye areas): adults must look friendly and healthy.
- Upper eyelid/lash area of the eye close-up (`out/visage-v13-oeil.png`) has jagged green-grey fringes: lashes and lid
  edges must be clean, dark brown, thin.

## 14. STYLE DIRECTION FROM THE OWNER (08:00) — OVERRIDES the "realism" wording above
"Careful: it must stay childlike and CUTE, a bit like Nintendo's Mii. And don't kill performance with too many polygons."
Target = **Nintendo Switch Sports Miis**: believable body proportions and natural motion (that was the complaint:
bodybuilder shoulders, stiff animation), but a CUTE, simple, friendly, toy-like look:
- Head: round and a bit bigger than real (≈ +15–20 % vs. section 6), soft rounded skull, smooth chubby cheeks.
- Face: SIMPLE and cute: friendly eyes slightly larger than real with big dark irises and a clear catch-light (simple
  3D eyes are fine, but no photoreal iris fibres, veins or wet detail; no eyelash fringes; eyelids only as needed to
  blink), small simple nose (a soft bump), a simple happy mouth (soft smile line / slight open smile with no teeth
  detail), simple solid brows (smooth shapes, not hair strokes), light rosy cheeks. NO wrinkles, no dark shading around
  eyes or mouth, no sunken cheeks, no realistic lips. Adults: same cute simplicity, adult proportions (the grandmother:
  white short hair, glasses, kind smile).
- Body: smooth and simplified like a toy/figurine: right proportions and soft forms (slim kids, narrow sloping
  shoulders, small round deltoids), but NO anatomical minutiae (no collarbone ridges, no rib/navel/knee details, no
  veins, no muscle definition). Hands: simple (mitten with a separate thumb; fingers optional and only on "plein"); feet:
  simple soft feet with a hint of toes (bare feet at the pool), shoes/flip-flops simple and clean.
- Materials: smooth, clean, slightly soft (matte-satin), warm healthy skin, vivid true clothing colours; subtle soft
  shading, no grime, no noise that looks dirty.
- PERFORMANCE (new, stricter budgets, replace section 7): full character ("plein") ≤ 12 k triangles TOTAL (body+head
  ≤ 6 k, clothes ≤ 3 k, hair ≤ 2 k, face/eyes ≤ 600), ≤ 8 draw calls; crowd ("leger") ≤ 3 k triangles, 1 draw call;
  generation "plein" ≤ 60 ms per type on desktop. Prefer fewer, well-placed polygons + smooth normals over density.

## 15. OWNER CLARIFICATION (08:50) — the final direction, overrides 14 where they differ
"The previous ones [the ORIGINAL game characters, LAB/out/ancien-*.png, LAB/ref/photo2-jeu-actuel.jpg] weren't that
bad, it was mostly the SHOULDERS that were the problem." (His first message also said about the face: "try the face too,
but it's OK".) So:
- KEEP the original characters' charm: big round cute head (≈ 85–90 % of the old head size: kid head height ≈ .40,
  width ≈ .38 model units; adults ≈ .35 high), the old painted cartoon face (big eyes with iris + highlights, girls'
  lashes, brows, small open smile, rosy cheeks; see atlasVisage/matVisage in LAB/ancien/ancien.js) with blinking —
  re-used/refined and conforming to the new head, not replaced by a realistic face.
- FIX what was wrong: the shoulders (no yoke/caps/bulk: narrow, sloping, small round deltoids), a slim natural kid body
  (the new body is good), arms and legs slimmer and natural, natural animation (walk/run/idle/all modes).
- Look: cute and toy-like (Mii), soft and colourful; a gentle cartoon shading like the old one is welcome (no grey skin).
- Budgets of section 14 stay (≤ 12 k triangles per full character, ≤ 3 k for the crowd).

## 16. HEAD SIZE (owner, 08:55) — overrides the head size of 14 and 15
"Careful not to make a disproportionate head in terms of size." And: "They were all bodybuilders" (= the old bodies).
Head = only slightly bigger than real, about +10 %: kid head height (chin→vertex) ≈ .36, width ≈ .30, depth ≈ .33
model units (≈ 1/6 of the height); adults ≈ .32 high (≈ 1/7). Clearly smaller than the old head (.46 high). The old
painted cartoon face style (section 15) stays, scaled to this head.
