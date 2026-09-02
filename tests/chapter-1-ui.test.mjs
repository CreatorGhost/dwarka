import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const runtimeSource = new URL("../../game/client-scripts/chapter-1.js", import.meta.url);
const chapterSourceFiles = [runtimeSource, ...["combat/targeting.js", "character/animation.js", "net/session.js", "scene/assets.js", "sim/shared.ts", "ui/content.js"].map((path) => new URL(`../../game/client-scripts/${path}`, import.meta.url))];
const readRuntime = async () => (await Promise.all(chapterSourceFiles.map((url) => readFile(url, "utf8")))).join("\n");

test("Chapter 0 uses the five required panels in order with keyboard controls", async () => {
  const [home, localization] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/game/chapter-1/localization.ts", root), "utf8"),
  ]);
  const positions = ["01-battlefield.webp", "02-karna-looses.webp", "03-wheel-sinks.webp", "04-karna-lifts.webp", "05-ash.webp"].map((name) => home.indexOf(name));
  assert.ok(positions.every((value) => value >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.match(home, /ArrowLeft/); assert.match(home, /ArrowRight/); assert.match(home, /skipConfirm/); assert.match(localization, /Adapted from the Jaiminiya Ashvamedha Parva/);
});

test("homepage localization covers five languages, phases, settings, and contextual controls", async () => {
  const [home, localization, progress, gameClient] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/game/chapter-1/localization.ts", root), "utf8"),
    readFile(new URL("app/game/chapter-1/progress.ts", root), "utf8"),
    readFile(new URL("app/game/chapter-1/ChapterGameClient.tsx", root), "utf8"),
  ]);
  assert.match(localization, /\["en", "hi", "ta", "kn", "te"\]/);
  for (const locale of ["en", "hi", "ta", "kn", "te"]) assert.match(localization, new RegExp(`\\n  ${locale}: \\{`));
  for (const phase of ["arrival", "courtyard", "market", "doorway", "ending", "complete"]) assert.match(localization, new RegExp(`${phase}:`));
  for (const setting of ["locale", "voiceLocale", "master", "music", "effects", "dialogue", "muteAll", "captions", "speakerNames", "cameraShake", "tutorials"]) assert.match(progress, new RegExp(`${setting}:`));
  assert.match(home, /language-chooser/); assert.match(home, /settings-language/); assert.match(home, /settings-audio/); assert.match(home, /settings-accessibility/); assert.match(home, /settings-controls/); assert.match(home, /settings-progress/);
  assert.match(home, /keyboard-map/); assert.match(home, /leftMouse/); assert.match(home, /rightMouse/);
  assert.match(home, /document\.documentElement\.lang = profile\?\.settings\.locale \?\? "en"/, "the localized page must expose its active language to assistive technology");
  assert.match(gameClient, /document\.documentElement\.lang = locale/, "the localized game shell must expose its active language to assistive technology");
});

test("Chapter 1 keeps directional signs, input cleanup, collision, and exact ending text", async () => {
  const runtime = await readRuntime();
  assert.match(runtime, /KeyD.*\? 1 : 0.*KeyA/);
  assert.match(runtime, /KeyW.*\? 1 : 0.*KeyS/);
  assert.match(runtime, /Math\.hypot\(x, z\)/);
  assert.match(runtime, /pointerlockchange/); assert.match(runtime, /visibilitychange/); assert.match(runtime, /clearInput/);
  assert.match(runtime, /WORLD_COLLIDERS/); assert.match(runtime, /segmentCameraDistance/);
  assert.match(runtime, /enteringPhase \|\| \(!state\.playing && !state\.qaAimPreview\)/, "live snapshots must not overwrite active mouse yaw or the QA aim preview");
  assert.match(runtime, /setEulerAngles\(0, -state\.visualYaw \* 180 \/ Math\.PI, 0\)/, "the visual character must face its travel direction rather than being welded to the orbit camera");
  assert.match(runtime, /arrow\.setEulerAngles\(90 - state\.pitch \* 180 \/ Math\.PI, -state\.yaw \* 180 \/ Math\.PI, 0\)/, "visible arrow must use the same PlayCanvas yaw convention");
  assert.match(runtime, /visualNow - entity\.dwarkaDeadAt < 800/, "dead enemies must remain visible long enough to play their down animation");
  assert.match(runtime, /const authoritativeAction = \["down", "hit", "dodge", "interact"\]/, "authoritative reactions must override predicted attacks");
  assert.match(runtime, /let distance = 22[\s\S]*step <= 22/, "visible arrows must cover the authoritative bow range");
  assert.match(runtime, /They asked for you by name\./);
  const order = ["06-kunti-reveals.webp", "07-raid.webp", "08-chitra-dies.webp", "09-horse-loosed.webp", "10-oath.webp"].map((name) => runtime.indexOf(name));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test("production connection wiring is environment-configured and explains free-tier wakeups", async () => {
  const [page, shell, runtime, html, i18n] = await Promise.all([
    readFile(new URL("app/game/chapter-1/page.tsx", root), "utf8"),
    readFile(new URL("app/game/chapter-1/ChapterGameClient.tsx", root), "utf8"),
    readRuntime(),
    readFile(new URL("public/playcanvas/chapter-1/index.html", root), "utf8"),
    readFile(new URL("public/playcanvas/chapter-1/game-i18n.js", root), "utf8"),
  ]);
  assert.match(page, /process\.env\.DWARKA_WS_URL/);
  assert.match(page, /url\.protocol === "wss:"/);
  assert.match(shell, /encodeURIComponent\(websocketUrl\)/);
  assert.doesNotMatch(runtime, /location\.hostname}:3210/);
  assert.match(runtime, /safeWebSocketEndpoint/);
  assert.match(html, /Waking the game server/);
  assert.match(i18n, /Free hosting can take up to a minute to wake/);
});

test("every character variant uses one face-safe skeleton and all blades stay hand-rigged", async () => {
  const [runtime, combatGlb, variantReport] = await Promise.all([
    readRuntime(),
    readFile(new URL("public/playcanvas/chapter-1/assets/animations/Dwarka_Combat.glb", root)),
    readFile(new URL("../../game/assets/work/character-variants-report.json", import.meta.url), "utf8"),
  ]);
  for (const variant of ["Vrishaketu_Composite", "Raider_Archer_Composite", "Brute_Composite", "Male_Peasant_Composite", "Female_Peasant_Composite"]) assert.match(runtime, new RegExp(`${variant}\\.glb`));
  assert.doesNotMatch(runtime, /function syncCharacterRig|dwarkaBaseModel|dwarkaHairModel/, "separate runtime face skeletons can drift during combat animation");
  const report = JSON.parse(variantReport);
  assert.equal(report.variants.length, 5);
  for (const variant of report.variants) {
    assert.equal(variant.bones, 65);
    assert.equal(variant.singleSkeleton, true);
    assert.ok(variant.meshes.some((name) => /Head/.test(name)), `${variant.name} needs a visible head mesh`);
  }
  assert.match(runtime, /else if \(root\.name === "brute"\) attachSword\(root, "heavy bronze blade", 1\.15\)/);
  assert.doesNotMatch(runtime, /attachGada\(root\)|Gada iron head|Gada forged lobe/);
  assert.match(runtime, /aim: "Bow_Aim_Loop"/);
  assert.match(runtime, /fire: "Bow_Release"/);
  assert.match(runtime, /bruteWarn: "Heavy_Overhead"/);
  assert.doesNotMatch(runtime, /aim: "Pistol_Idle_Loop"|fire: "Pistol_Shoot"/);
  assert.match(runtime, /findByName\("hand_l"\)[\s\S]*findByName\("hand_r"\)/);
  assert.match(runtime, /Bow string upper/);
  assert.match(runtime, /root\.addChild\(bow\)/, "bow socket should not inherit an unstable wrist rotation");
  assert.match(runtime, /function mountApprovedSword\(root\)/, "a late sword asset must replace the loading fallback instead of leaving a wrist-bound placeholder");
  assert.match(runtime, /root\.dwarkaSwordFallback\.forEach\(\(part\) => part\.destroy\(\)\)/, "approved sword mounting must remove every fallback part");
  assert.match(runtime, /Visible bronze blade", \[0, \.43, 0\]/, "fallback blade must extend away from the grip along the approved sword's positive-Y pivot");
  assert.match(runtime, /bowDrawHandDistance/, "the visual QA surface must measure whether the drawn string remains attached to the right hand");
  assert.match(runtime, /pull\.copy\(localHand\)/, "the nock and both string halves must follow the actual draw-hand socket without a visible gap");
  assert.doesNotMatch(runtime, /pc\.math\.clamp\(localHand\.x/, "a placeholder axis clamp can detach the drawn string from the animated hand");
  assert.match(runtime, /swordGripDistance/, "the visual QA surface must measure whether the sword remains attached to the right hand");
  assert.match(runtime, /Coral arrow line/);
  assert.match(runtime, /dwarkaWarningActive/);
  assert.match(runtime, /dwarkaImpactUntil/);
  assert.match(runtime, /enemy\.kind === "archer" \? "fire" : enemy\.kind === "brute" \? "bruteWarn" : "melee"/);
  assert.doesNotMatch(runtime, /entity\.lookAt\(player\.x, 0, player\.z\)/, "enemy roots must never pitch toward a ground-level look target");
  assert.match(runtime, /smoothEnemyFacing\(entity, player\.x, player\.z, dt\)/, "enemy facing must remain yaw-only, upright, and smoothed");
  const jsonLength = combatGlb.readUInt32LE(12);
  const combatJson = JSON.parse(combatGlb.subarray(20, 20 + jsonLength).toString().replace(/\0+$/, ""));
  assert.deepEqual(combatJson.animations.map((animation) => animation.name), ["Bow_Aim_Loop", "Bow_Release", "Heavy_Overhead"]);
  assert.equal(combatJson.skins[0].joints.length, 65);
});

test("bow aim uses a stable automatic target lock and an edge-aware objective waypoint", async () => {
  const [runtime, gameHtml, gameCss, gameI18n] = await Promise.all([
    readRuntime(),
    readFile(new URL("public/playcanvas/chapter-1/index.html", root), "utf8"),
    readFile(new URL("public/playcanvas/chapter-1/chapter-1.css", root), "utf8"),
    readFile(new URL("public/playcanvas/chapter-1/game-i18n.js", root), "utf8"),
  ]);
  assert.match(runtime, /angularError \* 5/, "target choice must prioritize reticle angle over a nearer off-axis enemy");
  assert.match(runtime, /previous\.score <= target\.score \+ \.22/, "target lock needs hysteresis so it cannot jump every frame");
  assert.match(runtime, /targetLineBlocked/); assert.match(runtime, /distance > 22/);
  assert.match(runtime, /TARGET|targetAcquired/); assert.match(runtime, /Math\.round\(target\.distance\).* m/);
  assert.match(gameHtml, /id="waypoint-indicator"/); assert.match(runtime, /function updateObjectiveGuidance/); assert.match(runtime, /worldToScreen/);
  assert.match(gameCss, /#reticle\{left:50%\}/, "the reticle must match the camera ray, not an arbitrary screen offset");
  assert.match(gameCss, /#waypoint-indicator\.edge/);
  for (const locale of ["en", "hi", "ta", "kn", "te"]) assert.match(gameI18n, new RegExp(`DWARKA_GAME_I18N\\.${locale}|\\n  ${locale}:`));
  assert.match(gameI18n, /TARGET LOCKED/);
  assert.match(runtime, /new pc\.Vec3\(-\.055, \.86, -\.45\)/, "the over-shoulder bow must have a visible recurve instead of reading as a rigid pole");
  assert.match(runtime, /new pc\.Vec3\(points\[index\]\.x, points\[index\]\.y \* sign, points\[index\]\.z\)/, "the authored bow curvature must reach the rendered limb segments");
});

test("locomotion, camera, and grounded props share one visual frame of reference", async () => {
  const [runtime, collision, layoutText] = await Promise.all([
    readRuntime(),
    readFile(new URL("../../game/server/src/chapter-1/collision.ts", import.meta.url), "utf8"),
    readFile(new URL("public/playcanvas/chapter-1/world-layout.json", root), "utf8"),
  ]);
  const layout = JSON.parse(layoutText);
  assert.match(runtime, /visualYaw/, "the player mesh needs a facing direction independent from the orbit camera");
  assert.match(runtime, /lookYaw/, "mouse input needs a smoothed view target rather than rotating the camera and mesh in one raw step");
  assert.match(runtime, /networkSnapshots/, "20 Hz enemy snapshots need a bounded interpolation buffer");
  assert.match(runtime, /performance\.now\(\) - CHAPTER_CONFIG\.network\.enemyInterpolationMs/, "enemy rendering must use the shared interpolation delay");
  assert.match(runtime, /const planarSpeed = Math\.hypot\(playerVelocity\.x, playerVelocity\.z\)/, "locomotion state must come from simulated displacement, not held keys");
  assert.match(runtime, /function locomotionPlaybackSpeed/, "walk and sprint clips must be retimed from real travel speed so planted feet do not slide");
  assert.match(runtime, /setCharacterAnimation\(state\.playerEntity, playerAnim, planarSpeed\)/, "the measured speed must drive the active locomotion clip every frame");
  assert.match(runtime, /planarSpeed > \.65/, "blocked movement must settle to idle and stop footsteps");
  assert.match(runtime, /config\.feel\.dodgeClipSeconds \/ config\.feel\.dodgeActionSeconds/, "the roll clip must finish with the 0.65 second authoritative dodge");
  assert.match(runtime, /aimBlend/, "aim camera distance, shoulder, height, and FOV must blend instead of popping between booleans");
  assert.match(runtime, /Jog_Fwd_Loop/, "4.5 m/s locomotion must use the authored forward jog rather than the slow walk cycle");
  assert.match(runtime, /GROUND_ALIGNED_MODELS/, "road props need an explicit ground-alignment pass");
  assert.match(runtime, /function groundAnimatedCharacter/, "animated feet need a measured contact correction rather than a fixed root height");
  assert.match(runtime, /STREET_SURFACE_Y - uncorrectedMinimum/, "character ground correction must use the same authored street surface as props");
  assert.match(runtime, /packed-sand-v1\.webp/, "the road needs an authored sand texture rather than flat floor slabs");
  assert.match(runtime, /mats\.roadSand\.diffuseMap = texture/, "the sand texture must be applied to the canonical street material");
  assert.match(runtime, /entity\.render\.castShadows = Boolean\(value\)/, "decorative shadow flags must reach PlayCanvas render components instead of becoming unused entity fields");
  assert.match(runtime, /road\.receiveShadows = false/, "the broad sand receiver must not show directional shadow-map striping");
  assert.doesNotMatch(runtime, /Math\.sin\(performance\.now\(\) \* \.009\).*snapshot\.player\.state === "locomotion"/, "synthetic whole-body bob must not push the feet through the road");
  assert.match(runtime, /world-layout\.json/, "the browser must load the canonical placement and collision manifest");
  assert.match(runtime, /assets\.find\("world-layout\.json"\)/, "PlayCanvas Launch must use its preloaded manifest instead of requesting the launch-site root");
  assert.match(runtime, /document\.currentScript\?\.src/, "the static export fallback must resolve the manifest beside the runtime script");
  assert.match(collision, /world-layout\.json/, "the server must consume the same canonical placement and collision manifest");
  assert.match(runtime, /collider\.visual/, "the shared manifest must identify colliders backed by approved visual prefabs");
  assert.match(runtime, /if \(visual \|\|/, "a renamed prop collider must never become a rendered debug box");
  assert.equal(layout.colliders.find(({ id }) => id === "courtyard-cart-body")?.maxZ, 2.85);
  assert.deepEqual(layout.placements.Prop_Wagon[0], [2.6, 0, 2.6, 24, 0.86]);
});

test("A0 night rendering exposes the skyline and lets practical fire lights breathe", async () => {
  const [runtime, servedBundle] = await Promise.all([
    readRuntime(),
    readFile(new URL("public/playcanvas/chapter-1/chapter-1.js", root), "utf8"),
  ]);
  assert.ok(servedBundle.length > 80_000, "the served runtime must contain the Vite-built Chapter 1 bundle");
  assert.match(servedBundle, /Offline play/, "the served bundle must be generated from the readable runtime source");
  assert.doesNotMatch(runtime, /primitive\("sphere", "Indigo night sky"/, "an opaque sky mesh must not hide distant scenery");
  assert.match(runtime, /ambientLight = new pc\.Color\(\.065, \.072, \.12\)/);
  assert.match(runtime, /scene\.exposure = 1\.12/);
  assert.doesNotMatch(runtime, /new pc\.Entity\("Camera soft fill"\)/, "the camera must not carry a flattening headlight");
  assert.match(runtime, /texture\.addressU = texture\.addressV = pc\.ADDRESS_REPEAT/);
  assert.doesNotMatch(runtime, /ADDRESS_MIRRORED_REPEAT/);
  assert.match(runtime, /diffuseMapTiling = new pc\.Vec2\(7, 4\)/, "each 13 by 8 metre centre-road slab needs an approximately two-metre texture repeat");
  assert.match(runtime, /function flickerFireLight/);
  assert.match(runtime, /state\.fireLights.*flickerFireLight/, "every cached practical light must animate each frame");
  assert.match(runtime, /renderingSummary/, "visual QA must expose the A0 lighting contract in the running scene");
});

test("A1 uses the ledgered HDR, physical materials, post effects, and production shadows", async () => {
  const [runtime, html, css, hdr, sourceHdr] = await Promise.all([
    readRuntime(),
    readFile(new URL("public/playcanvas/chapter-1/index.html", root), "utf8"),
    readFile(new URL("public/playcanvas/chapter-1/chapter-1.css", root), "utf8"),
    readFile(new URL("public/playcanvas/chapter-1/assets/environment/moonless_golf_2k.hdr", root)),
    readFile(new URL("../../game/assets/raw/polyhaven/moonless_golf_2k.hdr", import.meta.url)),
  ]);
  assert.deepEqual(hdr, sourceHdr, "the runtime HDR must be the exact ledgered CC0 source");
  assert.match(runtime, /EnvLighting\.generateSkyboxCubemap/);
  assert.match(runtime, /EnvLighting\.generateAtlas/);
  assert.match(runtime, /scene\.skybox = state\.skyboxCubemap/);
  assert.match(runtime, /scene\.envAtlas = state\.environmentAtlas/);
  assert.match(runtime, /new pc\.CameraFrame/);
  assert.match(runtime, /frame\.bloom\.intensity = \.035/);
  assert.match(runtime, /frame\.ssao\.type = "lighting"/);
  assert.match(runtime, /frame\.vignette\.intensity = \.22/);
  assert.match(runtime, /value\.useMetalness = true/);
  assert.match(runtime, /mats\.gold\.metalness = \.76/);
  assert.match(runtime, /shadowResolution: 2048, shadowBias: \.05, normalOffsetBias: \.02, numCascades: 2/);
  assert.doesNotMatch(html, /id="vignette"/, "the general vignette belongs to CameraFrame, not a CSS overlay");
  assert.match(html, /id="damage-flash"/);
  assert.match(css, /#damage-flash\.damaged/);
});

test("A2 builds the street from unit-scale plaster bays and terraced roof modules", async () => {
  const [runtime, layoutText] = await Promise.all([
    readRuntime(),
    readFile(new URL("public/playcanvas/chapter-1/world-layout.json", root), "utf8"),
  ]);
  const layout = JSON.parse(layoutText);
  assert.deepEqual(layout.streetHouseBays.slice(0, 4), [22, 18, 14, 10]);
  assert.ok(layout.streetHouseBays.every((z, index, bays) => index === 0 || bays[index - 1] - z === 4), "house bays must stay on the four-metre grid");
  assert.doesNotMatch(runtime, /primitive\("box", "Left house"/, "the old box-house corridor must be gone");
  assert.doesNotMatch(runtime, /primitive\("cylinder", "Awning support"/, "awnings must use authored wooden posts");
  assert.doesNotMatch(runtime, /primitive\("box", "Carved turn-wall pilaster"/, "turn walls must use authored columns");
  assert.match(runtime, /Kenney_roof_flat_square/);
  assert.match(runtime, /Wall_Plaster_Door_Flat/);
  assert.match(runtime, /tintStreetHouse/);
  assert.match(runtime, /placements\.push\(\[x, 0, centreZ \+ offset, yaw, 1\]\)/, "street wall modules must remain at source scale");
  for (const key of ["Kenney_column", "Prop_ExteriorBorder_Straight1", "Kenney_pillar_wood"]) {
    assert.ok(layout.placements[key].every((placement) => placement[4] === 1), `${key} must remain at source scale`);
  }
});

test("A3 uses cached particle VFX, textured bunting, road slabs, and late GLB batching", async () => {
  const [runtime, fireAtlas, smokeAtlas, fabric] = await Promise.all([
    readRuntime(),
    readFile(new URL("public/playcanvas/chapter-1/assets/textures/kenney-explosion-fire-atlas.webp", root)),
    readFile(new URL("public/playcanvas/chapter-1/assets/textures/kenney-black-smoke-atlas.webp", root)),
    readFile(new URL("public/playcanvas/chapter-1/assets/textures/fabric_pattern_07_col_1_512.webp", root)),
  ]);
  assert.ok(fireAtlas.length > 1000 && smokeAtlas.length > 1000 && fabric.length > 1000);
  assert.match(runtime, /addComponent\("particlesystem"/);
  assert.match(runtime, /animTilesX: 3, animTilesY: 3, animNumFrames: 9/);
  assert.match(runtime, /animTilesX: 5, animTilesY: 5, animNumFrames: 25/);
  assert.doesNotMatch(runtime, /primitive\("sphere", "Smoke plume"/);
  assert.doesNotMatch(runtime, /state\.app\.root\.findByTag\("fire"\)/, "the frame loop must use the cached emitter list");
  assert.doesNotMatch(runtime, /state\.app\.root\.findByTag\("smoke"\)/, "GPU smoke must not need per-frame scene scans");
  assert.match(runtime, /new pc\.Entity\("Triangular festival pennant"/);
  assert.match(runtime, /fabric_pattern_07_col_1_512\.webp/);
  assert.match(runtime, /"Packed earth street slab"/);
  assert.match(runtime, /"Wet ash fire decal"/);
  assert.match(runtime, /assignStaticModelToBatch\(entity\)/, "late-loaded GLBs must join the active static batch group");
});

test("A7 gives the street distinct houses, Indian set dressing, real L-turns, and vista landmarks", async () => {
  const [runtime, layoutText, moonlit] = await Promise.all([
    readRuntime(),
    readFile(new URL("public/playcanvas/chapter-1/world-layout.json", root), "utf8"),
    readFile(new URL("public/playcanvas/chapter-1/assets/environment/moonlit_golf_2k.hdr", root)),
  ]);
  const layout = JSON.parse(layoutText);
  assert.ok(moonlit.length > 100000, "the visible-moon CC0 HDR must ship in the standalone export");
  assert.equal(layout.tallHouseBays.length, 2);
  assert.equal(layout.setbackHouseBays.length, 2);
  assert.equal(layout.colliders.filter(({ label }) => /L-turn/.test(label)).length, 2);
  assert.ok(!layout.colliders.some(({ minX, maxX, minZ, maxZ }) => 2 >= minX && 2 <= maxX && -9 >= minZ && -9 <= maxZ), "the market L-turn must not trap the unchanged enemy spawn");
  assert.equal(layout.placements.brass_diya_lantern.length, 24);
  assert.ok(layout.placements.Kenney_fountain_round.length >= 3, "the arrival vista needs a built stone well");
  assert.ok(layout.placements.Kenney_cart.length && layout.placements.Kenney_wheel.length === 2, "the gate needs a two-wheel rath");
  assert.match(runtime, /mats\.roadSand = material\(\[\.40, \.38, \.35\]\)/);
  assert.match(runtime, /const tones = \["lime", "ochre", "rose", "turquoise"\]/);
  assert.match(runtime, /"Household shrine niche"/);
  assert.match(runtime, /"Cool moon rim"/);
  assert.match(runtime, /"Palace horizon glow"/);
  assert.match(runtime, /"Triangular festival pennant"/);
  assert.match(runtime, /if \(!target\) \{ state\.targetEnemyId = null;/, "occluded or defeated enemies must clear the target lock");
  assert.doesNotMatch(runtime, /primitive\("sphere", "Moon disc"/);
  assert.doesNotMatch(runtime, /primitive\("sphere", `Night star/);
  assert.match(runtime, /setDressingSummary/);
});

test("A4 shares the authoritative simulation and remains playable without a socket", async () => {
  const [runtime, simulation, packageJson, viteConfig, html] = await Promise.all([
    readRuntime(),
    readFile(new URL("../../game/server/src/chapter-1/simulation.ts", import.meta.url), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("vite.chapter-1.config.mjs", root), "utf8"),
    readFile(new URL("public/playcanvas/chapter-1/index.html", root), "utf8"),
  ]);
  assert.match(runtime, /import \{ ChapterSimulation, CHAPTER_CONFIG \}/);
  assert.match(runtime, /tickLocalSimulation\(simulationDt\)/, "the shared simulation must run from the browser frame loop with real dt");
  assert.match(runtime, /state\.networkSnapshots\.push/);
  assert.match(runtime, /startLocalSession\(\)/, "a missing WebSocket URL must start local play instead of blocking");
  assert.match(runtime, /progress will save when reconnected/);
  assert.match(simulation, /\.\.\.this\.input\.pressed, \.\.\.sanitized\.pressed/, "presses must survive two packets in one server tick");
  assert.match(packageJson, /build:chapter-1/);
  assert.match(viteConfig, /game\/client-scripts\/chapter-1\.js/);
  assert.match(html, /type="module" src="\.\/chapter-1\.js/);
});

test("A5 layers responsive aim, blended locomotion, impact feel, and camera spring", async () => {
  const runtime = await readRuntime();
  assert.match(runtime, /state\.yaw = state\.lookYaw/, "mouse yaw must reach aiming in the input frame");
  assert.match(runtime, /type: "1D", parameter: "locomotionSpeed"/);
  for (const point of ["idle", "walk", "jog", "sprint"]) assert.match(runtime, new RegExp(`name: "${point}", point:`));
  assert.match(runtime, /name: "Upper body aim"/);
  assert.match(runtime, /upperBody\.mask = \{ \[spine\.path\]: \{ children: true \} \}/);
  assert.match(runtime, /state\.hitStopUntil/);
  assert.match(runtime, /entity\.dwarkaHitUntil/);
  assert.match(runtime, /function smoothEnemyFacing/);
  assert.match(runtime, /function springCameraAxis/);
});

test("A6 builds the served export from focused source modules and content revisions", async () => {
  const [runtime, simulation, viteConfig, prettierConfig] = await Promise.all([
    readRuntime(),
    readFile(new URL("../../game/server/src/chapter-1/simulation.ts", import.meta.url), "utf8"),
    readFile(new URL("vite.chapter-1.config.mjs", root), "utf8"),
    readFile(new URL(".prettierrc.json", root), "utf8"),
  ]);
  for (const boundary of ["scene/assets.js", "character/animation.js", "net/session.js", "sim/shared.ts", "ui/content.js", "combat/targeting.js"]) assert.match(runtime, new RegExp(boundary.replace(".", "\\.")));
  assert.match(runtime, /CHAPTER_CONFIG/);
  assert.match(simulation, /config\/chapter-1\.json/);
  assert.match(viteConfig, /hashAssetTree/);
  assert.match(viteConfig, /__CHAPTER_ASSET_REVISION__/);
  assert.match(runtime, /assetUrl\(url\)/);
  assert.equal(JSON.parse(prettierConfig).printWidth, 100);
});

test("profile bridge ranks progress monotonically and reset preserves preferences", async () => {
  const progress = await readFile(new URL("app/game/chapter-1/progress.ts", root), "utf8");
  assert.match(progress, /incoming\.nextPhase.*existing\.nextPhase/);
  assert.match(progress, /existing\?\.chapterComplete/);
  assert.match(progress, /progressSummary: progressToken \? parsed\.progressSummary \?\? null : null/, "an unsigned stale summary must not block the first fresh checkpoint");
  assert.match(progress, /localStorage\.removeItem\(PROFILE_KEY\)/);
  assert.match(progress, /PREFERENCES_KEY/);
  assert.match(progress, /BroadcastChannel/);
});
