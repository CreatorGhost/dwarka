import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

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
  const runtime = await readFile(new URL("public/playcanvas/chapter-1/chapter-1.js", root), "utf8");
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
    readFile(new URL("public/playcanvas/chapter-1/chapter-1.js", root), "utf8"),
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
    readFile(new URL("public/playcanvas/chapter-1/chapter-1.js", root), "utf8"),
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
  assert.match(runtime, /entity\.lookAt\(player\.x, entity\.getPosition\(\)\.y, player\.z\)/, "enemy facing must remain yaw-only and upright");
  const jsonLength = combatGlb.readUInt32LE(12);
  const combatJson = JSON.parse(combatGlb.subarray(20, 20 + jsonLength).toString().replace(/\0+$/, ""));
  assert.deepEqual(combatJson.animations.map((animation) => animation.name), ["Bow_Aim_Loop", "Bow_Release", "Heavy_Overhead"]);
  assert.equal(combatJson.skins[0].joints.length, 65);
});

test("bow aim uses a stable automatic target lock and an edge-aware objective waypoint", async () => {
  const [runtime, gameHtml, gameCss, gameI18n] = await Promise.all([
    readFile(new URL("public/playcanvas/chapter-1/chapter-1.js", root), "utf8"),
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
    readFile(new URL("public/playcanvas/chapter-1/chapter-1.js", root), "utf8"),
    readFile(new URL("../../game/server/src/chapter-1/collision.ts", import.meta.url), "utf8"),
    readFile(new URL("public/playcanvas/chapter-1/world-layout.json", root), "utf8"),
  ]);
  const layout = JSON.parse(layoutText);
  assert.match(runtime, /visualYaw/, "the player mesh needs a facing direction independent from the orbit camera");
  assert.match(runtime, /lookYaw/, "mouse input needs a smoothed view target rather than rotating the camera and mesh in one raw step");
  assert.match(runtime, /snapshotVelocity/, "20 Hz snapshots need visual extrapolation instead of stop-start interpolation");
  assert.match(runtime, /const planarSpeed = Math\.hypot\(state\.snapshotVelocity\.x, state\.snapshotVelocity\.z\)/, "locomotion state must come from actual authoritative displacement, not held keys");
  assert.match(runtime, /function locomotionPlaybackSpeed/, "walk and sprint clips must be retimed from real travel speed so planted feet do not slide");
  assert.match(runtime, /setCharacterAnimation\(state\.playerEntity, playerAnim, planarSpeed\)/, "the measured speed must drive the active locomotion clip every frame");
  assert.match(runtime, /planarSpeed > \.65/, "blocked movement must settle to idle and stop footsteps");
  assert.match(runtime, /dodge: 2\.25/, "the 1.47 second roll clip must finish with the 0.65 second authoritative dodge");
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
  const [runtime, readableSource] = await Promise.all([
    readFile(new URL("public/playcanvas/chapter-1/chapter-1.js", root), "utf8"),
    readFile(new URL("../../game/client-scripts/chapter-1.js", import.meta.url), "utf8"),
  ]);
  assert.equal(runtime, readableSource, "the readable source and served runtime must remain byte-identical");
  assert.doesNotMatch(runtime, /primitive\("sphere", "Indigo night sky"/, "an opaque sky mesh must not hide distant scenery");
  assert.match(runtime, /ambientLight = new pc\.Color\(\.03, \.04, \.09\)/);
  assert.match(runtime, /scene\.exposure = 1\.0/);
  assert.doesNotMatch(runtime, /new pc\.Entity\("Camera soft fill"\)/, "the camera must not carry a flattening headlight");
  assert.match(runtime, /texture\.addressU = texture\.addressV = pc\.ADDRESS_REPEAT/);
  assert.doesNotMatch(runtime, /ADDRESS_MIRRORED_REPEAT/);
  assert.match(runtime, /diffuseMapTiling = new pc\.Vec2\(11, 41\)/, "the 22 by 82 metre road needs an approximately two-metre texture repeat");
  assert.match(runtime, /function flickerFireLight/);
  assert.match(runtime, /findByTag\("fire-light"\).*flickerFireLight/, "every registered practical light must animate each frame");
  assert.match(runtime, /renderingSummary/, "visual QA must expose the A0 lighting contract in the running scene");
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
