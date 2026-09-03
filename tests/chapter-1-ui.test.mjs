import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const clientSourceRoot = new URL("../../game/client-scripts/", import.meta.url);

async function clientSourceFiles(directory = clientSourceRoot) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const url = new URL(entry.name, directory);
      if (entry.isDirectory()) return clientSourceFiles(new URL(`${entry.name}/`, directory));
      return /\.(?:js|ts)$/.test(entry.name) ? [url] : [];
    }),
  );
  return files.flat();
}

const readRuntime = async () => {
  const files = await clientSourceFiles();
  return (await Promise.all(files.map((url) => readFile(url, "utf8")))).join("\n");
};

test("the Chapter 0 opening narrates eight beats and hands off on the night lane", async () => {
  const { BEATS } = await import(new URL("app/chapter-zero-beats.ts", root).href);
  const { dictionaries, locales } = await import(new URL("app/game/chapter-1/localization.ts", root).href);
  const manifest = JSON.parse(await readFile(new URL("public/audio/chapter-1/voice-manifest.json", root), "utf8"));

  // The opening covers Karna's death and the raid, then stops. Panels 08-10 are
  // Chapter 1's ending (Chitra, the horse, the oath) and must never spoil it here.
  assert.equal(BEATS.length, 8);
  assert.equal(BEATS[0].image, "/story-a/01-battlefield.webp");
  assert.equal(BEATS[0].hero, true);
  assert.equal(BEATS.at(-1).image, "/story-a/11-lane-mouth.webp");
  assert.equal(BEATS.at(-1).mission, true);
  for (const forbidden of ["08-chitra-dies", "09-horse-loosed", "10-oath"]) {
    assert.ok(!BEATS.some((beat) => beat.image.includes(forbidden)), `${forbidden} belongs to the ending`);
  }
  // The hero frame holds longest, so panel 01 reads as a title shot.
  assert.ok(BEATS[0].hold > Math.max(...BEATS.slice(1, -1).map((beat) => beat.hold)));

  for (const beat of BEATS) {
    await readFile(new URL(`public${beat.image}`, root));
    for (const locale of locales) {
      const entry = manifest.entries.find((item) => item.sourceLineId === beat.voice && item.locale === locale);
      assert.ok(entry, `missing voice entry ${beat.voice} / ${locale}`);
      assert.equal(entry.status, "validated", `${beat.voice} / ${locale} is not validated`);
      for (const asset of entry.assets) await readFile(new URL(`public${asset.runtimePath}`, root));
    }
  }

  // Every beat is captioned in every language, so the opening reads fully muted,
  // and each caption is the text that was actually sent to the voice engine.
  for (const locale of locales) {
    const panels = dictionaries[locale].chapter0.panels;
    assert.equal(panels.length, BEATS.length, `${locale} is missing captions`);
    for (const [index, beat] of BEATS.entries()) {
      const spoken = manifest.entries.find((item) => item.sourceLineId === beat.voice && item.locale === locale).text;
      assert.equal(panels[index].text.replace(/\s+/g, " ").trim(), spoken.replace(/\s+/g, " ").trim(),
        `caption ${index + 1} does not match the ${locale} voice line`);
      assert.ok(panels[index].title.length > 0);
    }
  }

  // Regression: the caption used to fade at a fixed percentage of the frame, so it
  // cleared while the line was still being spoken. The fade is now armed off the end
  // of the audio, and the frame always outlasts the audio by BEAT_TAIL_MS.
  const { BEAT_TAIL_MS, CAPTION_FADE_MS, CAPTION_HOLD_AFTER_VOICE_MS } =
    await import(new URL("app/chapter-zero-beats.ts", root).href);
  assert.ok(CAPTION_HOLD_AFTER_VOICE_MS > 0, "caption must keep holding after the voice stops");
  assert.ok(
    CAPTION_HOLD_AFTER_VOICE_MS + CAPTION_FADE_MS < BEAT_TAIL_MS,
    "the caption must start fading after the line ends and finish before the crossfade",
  );
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  assert.doesNotMatch(css, /cinematic-caption-life/, "percentage-of-frame caption timing is the bug");
  assert.match(css, /cinematic-caption-out var\(--caption-fade/);
  // For a real line, the fade must start strictly after the audio has finished.
  for (const beat of BEATS) {
    const spoken = 8_600; // longest measured en narration line, ms
    const frame = Math.max(beat.hold, spoken + BEAT_TAIL_MS);
    const captionOut = frame - BEAT_TAIL_MS + CAPTION_HOLD_AFTER_VOICE_MS;
    assert.ok(captionOut > spoken, `caption on ${beat.voice} fades before the line ends`);
    assert.ok(captionOut + CAPTION_FADE_MS <= frame, `caption on ${beat.voice} outlives its frame`);
  }

  // Both music beds ship, and the darker one takes over at the raid.
  await readFile(new URL("public/audio/chapter-0/music-bed.ogg", root));
  await readFile(new URL("public/audio/chapter-0/music-raid.ogg", root));
  const licence = await readFile(new URL("public/audio/chapter-0/LICENSE.txt", root), "utf8");
  for (const file of ["ambience.ogg", "music-bed.ogg", "music-raid.ogg"]) {
    assert.match(licence, new RegExp(file.replace(".", "\\.")), `${file} is not in the audio licence file`);
  }

  // The sequence is hands-free and the game owns the only click-to-enter prompt.
  const cinematic = await readFile(new URL("app/ChapterZeroCinematic.tsx", root), "utf8");
  const home = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.doesNotMatch(cinematic, /cinematic-entry|ArrowLeft|ArrowRight/);
  assert.match(home, /entry=cinematic/);
  assert.match(dictionaries.en.chapter0.attribution, /Jaiminiya Ashvamedha Parva/);
  // CC-BY assets must stay credited on the title screen.
  assert.match(home, /Tri-Tachyon/);
});

test("the served Chapter 1 world layout is emitted from the game source", async () => {
  const [sourceLayout, servedLayout, sourceI18n, servedI18n] = await Promise.all([
    readFile(new URL("../../game/client-scripts/world-layout.json", import.meta.url)),
    readFile(new URL("public/playcanvas/chapter-1/world-layout.json", root)),
    readFile(new URL("../../game/client-scripts/game-i18n.js", import.meta.url)),
    readFile(new URL("public/playcanvas/chapter-1/game-i18n.js", root)),
  ]);
  assert.deepEqual(servedLayout, sourceLayout);
  assert.deepEqual(servedI18n, sourceI18n);
  const layout = JSON.parse(sourceLayout);
  assert.deepEqual(
    layout.qaVistas.find(({ id }) => id === "alley-climb"),
    { id: "alley-climb", phase: "courtyard", x: -8, y: 6, z: -16, yaw: 1.57 },
  );
  assert.deepEqual(
    layout.placements.Stairs_Exterior_Straight.slice(-6).map((item) => item.slice(0, 3)),
    [
      [3, 0, -16],
      [1, 1, -16],
      [-1, 2, -16],
      [-3, 3, -16],
      [-5, 4, -16],
      [-7, 5, -16],
    ],
  );
});

test("homepage localization covers five languages, phases, settings, and contextual controls", async () => {
  const [home, localization, progress, gameClient] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/game/chapter-1/localization.ts", root), "utf8"),
    readFile(new URL("app/game/chapter-1/progress.ts", root), "utf8"),
    readFile(new URL("app/game/chapter-1/ChapterGameClient.tsx", root), "utf8"),
  ]);
  assert.match(localization, /\["en", "hi", "ta", "kn", "te"\]/);
  for (const locale of ["en", "hi", "ta", "kn", "te"])
    assert.match(localization, new RegExp(`\\n  ${locale}: \\{`));
  for (const phase of ["arrival", "courtyard", "market", "doorway", "ending", "complete"])
    assert.match(localization, new RegExp(`${phase}:`));
  for (const setting of [
    "locale",
    "voiceLocale",
    "master",
    "music",
    "effects",
    "dialogue",
    "muteAll",
    "captions",
    "speakerNames",
    "cameraShake",
    "tutorials",
  ])
    assert.match(progress, new RegExp(`${setting}:`));
  assert.match(home, /language-chooser/);
  assert.match(home, /settings-language/);
  assert.match(home, /settings-audio/);
  assert.match(home, /settings-accessibility/);
  assert.match(home, /settings-controls/);
  assert.match(home, /settings-progress/);
  assert.match(home, /keyboard-map/);
  assert.match(home, /leftMouse/);
  assert.match(home, /rightMouse/);
  assert.match(home, /title-key-art\.jpeg/);
  assert.match(home, /title-primary/);
  assert.match(home, /title-archive/);
  assert.doesNotMatch(home, /<section className="premise"/);
  assert.doesNotMatch(home, /<section className="story-grid"/);
  assert.doesNotMatch(home, /<section className="decision"/);
  for (const label of ["Language", "भाषा", "மொழி", "ಭಾಷೆ", "భాష"])
    assert.match(home, new RegExp(label));
  assert.match(
    home,
    /document\.documentElement\.lang = profile\?\.settings\.locale \?\? "en"/,
    "the localized page must expose its active language to assistive technology",
  );
  assert.match(
    gameClient,
    /document\.documentElement\.lang = locale/,
    "the localized game shell must expose its active language to assistive technology",
  );
});

test("Chapter 1 keeps directional signs, input cleanup, collision, and exact ending text", async () => {
  const runtime = await readRuntime();
  assert.match(runtime, /KeyD.*\? 1 : 0.*KeyA/);
  assert.match(runtime, /KeyW.*\? 1 : 0.*KeyS/);
  assert.match(runtime, /Math\.hypot\(x, z\)/);
  assert.match(runtime, /pointerlockchange/);
  assert.match(runtime, /visibilitychange/);
  assert.match(runtime, /clearInput/);
  assert.match(runtime, /WORLD_COLLIDERS/);
  assert.match(runtime, /segmentCameraDistance/);
  assert.match(
    runtime,
    /forceVisualSnap \|\|[\s\S]{0,40}enteringPhase \|\|[\s\S]{0,40}\(!state\.playing && !state\.qaAimPreview\)/,
    "live snapshots must only overwrite active mouse yaw for an explicit reconnect correction",
  );
  assert.match(
    runtime,
    /setEulerAngles\([\s\S]{0,40}-state\.visualYaw \* 180\) \/ Math\.PI[\s\S]{0,20}\)/,
    "the visual character must face its travel direction rather than being welded to the orbit camera",
  );
  assert.match(
    runtime,
    /visualNow - entity\.dwarkaDeadAt < 800/,
    "dead enemies must remain visible long enough to play their down animation",
  );
  assert.match(
    runtime,
    /const authoritativeAction = \["down", "hit", "dodge", "interact"\]/,
    "authoritative reactions must override predicted attacks",
  );
  assert.match(
    runtime,
    /let distance = 22[\s\S]*step <= 22/,
    "visible arrows must cover the authoritative bow range",
  );
  assert.match(runtime, /They asked for you by name\./);
  const order = [
    "06-kunti-reveals.webp",
    "07-raid.webp",
    "08-chitra-dies.webp",
    "09-horse-loosed.webp",
    "10-oath.webp",
  ].map((name) => runtime.indexOf(name));
  assert.deepEqual(
    [...order].sort((a, b) => a - b),
    order,
  );
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
  assert.match(shell, /event\.data\.type === "dwarka:ready"\) sendResume\(\)/);
  assert.match(shell, /onLoad=\{sendResume\}/);
  assert.doesNotMatch(runtime, /location\.hostname}:3210/);
  assert.match(runtime, /safeWebSocketEndpoint/);
  assert.match(runtime, /startEmbeddedHandshake/);
  assert.match(runtime, /3_000/);
  assert.match(runtime, /loadingRetryAvailable/);
  assert.match(html, /Waking the game server/);
  assert.match(i18n, /Free hosting can take up to a minute to wake/);
});

test("every character variant uses one face-safe skeleton and all blades stay hand-rigged", async () => {
  const [runtime, combatGlb, variantReport] = await Promise.all([
    readRuntime(),
    readFile(new URL("public/playcanvas/chapter-1/assets/animations/Dwarka_Combat.glb", root)),
    readFile(
      new URL("../../game/assets/work/character-variants-report.json", import.meta.url),
      "utf8",
    ),
  ]);
  for (const variant of [
    "Vrishaketu_Composite",
    "Raider_Archer_Composite",
    "Brute_Composite",
    "Male_Peasant_Composite",
    "Female_Peasant_Composite",
  ])
    assert.match(runtime, new RegExp(`${variant}\\.glb`));
  assert.doesNotMatch(
    runtime,
    /function syncCharacterRig|dwarkaBaseModel|dwarkaHairModel/,
    "separate runtime face skeletons can drift during combat animation",
  );
  const report = JSON.parse(variantReport);
  assert.equal(report.variants.length, 5);
  for (const variant of report.variants) {
    assert.equal(variant.bones, 65);
    assert.equal(variant.singleSkeleton, true);
    assert.ok(
      variant.meshes.some((name) => /Head/.test(name)),
      `${variant.name} needs a visible head mesh`,
    );
  }
  assert.match(
    runtime,
    /else if \(root\.name === "brute"\) attachSword\(root, "heavy bronze blade", 1\.15\)/,
  );
  assert.doesNotMatch(runtime, /attachGada\(root\)|Gada iron head|Gada forged lobe/);
  assert.match(runtime, /aim: "Bow_Aim_Loop"/);
  assert.match(runtime, /fire: "Bow_Release"/);
  assert.match(runtime, /bruteWarn: "Heavy_Overhead"/);
  assert.doesNotMatch(runtime, /aim: "Pistol_Idle_Loop"|fire: "Pistol_Shoot"/);
  assert.match(runtime, /findByName\("hand_l"\)[\s\S]*findByName\("hand_r"\)/);
  assert.match(runtime, /Bow string upper/);
  assert.match(
    runtime,
    /root\.addChild\(bow\)/,
    "bow socket should not inherit an unstable wrist rotation",
  );
  assert.match(
    runtime,
    /function mountApprovedSword\(root\)/,
    "a late sword asset must replace the loading fallback instead of leaving a wrist-bound placeholder",
  );
  assert.match(
    runtime,
    /root\.dwarkaSwordFallback\.forEach\(\(part\) => part\.destroy\(\)\)/,
    "approved sword mounting must remove every fallback part",
  );
  assert.match(
    runtime,
    /Visible bronze blade",[\s\S]{0,40}\[0, 0\.43, 0\]/,
    "fallback blade must extend away from the grip along the approved sword's positive-Y pivot",
  );
  assert.match(
    runtime,
    /bowDrawHandDistance/,
    "the visual QA surface must measure whether the drawn string remains attached to the right hand",
  );
  assert.match(
    runtime,
    /pull\.copy\(localHand\)/,
    "the nock and both string halves must follow the actual draw-hand socket without a visible gap",
  );
  assert.doesNotMatch(
    runtime,
    /pc\.math\.clamp\(localHand\.x/,
    "a placeholder axis clamp can detach the drawn string from the animated hand",
  );
  assert.match(
    runtime,
    /swordGripDistance/,
    "the visual QA surface must measure whether the sword remains attached to the right hand",
  );
  assert.match(runtime, /Archer dashed tracer/);
  assert.match(runtime, /dwarkaWarningActive/);
  assert.match(runtime, /dwarkaImpactUntil/);
  assert.doesNotMatch(
    runtime,
    /entity\.lookAt\(player\.x, 0, player\.z\)/,
    "enemy roots must never pitch toward a ground-level look target",
  );
  assert.match(
    runtime,
    /smoothEnemyYaw\(entity, enemy\.yaw, dt\)/,
    "enemy facing must use the server yaw directly with one smoothed path",
  );
  assert.doesNotMatch(
    runtime,
    /smoothEnemyFacing|entity\.getPosition\(\)\.x \+ velocity\.x/,
    "enemy facing must not switch back to a velocity-derived target",
  );
  const jsonLength = combatGlb.readUInt32LE(12);
  const combatJson = JSON.parse(
    combatGlb
      .subarray(20, 20 + jsonLength)
      .toString()
      .replace(/\0+$/, ""),
  );
  assert.deepEqual(
    combatJson.animations.map((animation) => animation.name),
    ["Bow_Aim_Loop", "Bow_Release", "Heavy_Overhead"],
  );
  assert.equal(combatJson.skins[0].joints.length, 65);
});

test("bow aim uses a stable automatic target lock and an edge-aware objective waypoint", async () => {
  const [runtime, gameHtml, gameCss, gameI18n] = await Promise.all([
    readRuntime(),
    readFile(new URL("public/playcanvas/chapter-1/index.html", root), "utf8"),
    readFile(new URL("public/playcanvas/chapter-1/chapter-1.css", root), "utf8"),
    readFile(new URL("public/playcanvas/chapter-1/game-i18n.js", root), "utf8"),
  ]);
  assert.match(
    runtime,
    /angularError \* 5/,
    "target choice must prioritize reticle angle over a nearer off-axis enemy",
  );
  assert.match(
    runtime,
    /previous\.score <= target\.score \+ 0\.22/,
    "target lock needs hysteresis so it cannot jump every frame",
  );
  assert.match(runtime, /targetLineBlocked/);
  assert.match(runtime, /distance > 22/);
  assert.match(runtime, /TARGET|targetAcquired/);
  assert.match(runtime, /Math\.round\(target\.distance\).* m/);
  assert.match(gameHtml, /id="waypoint-indicator"/);
  assert.match(runtime, /function updateObjectiveGuidance/);
  assert.match(runtime, /worldToScreen/);
  assert.match(
    gameCss,
    /#reticle\{left:50%\}/,
    "the reticle must match the camera ray, not an arbitrary screen offset",
  );
  assert.match(gameCss, /#waypoint-indicator\.edge/);
  for (const locale of ["en", "hi", "ta", "kn", "te"])
    assert.match(gameI18n, new RegExp(`DWARKA_GAME_I18N\\.${locale}|\\n  ${locale}:`));
  assert.match(gameI18n, /TARGET LOCKED/);
  assert.match(
    runtime,
    /new pc\.Vec3\(-0\.055, 0\.86, -0\.45\)/,
    "the over-shoulder bow must have a visible recurve instead of reading as a rigid pole",
  );
  assert.match(
    runtime,
    /new pc\.Vec3\(points\[index\]\.x, points\[index\]\.y \* sign, points\[index\]\.z\)/,
    "the authored bow curvature must reach the rendered limb segments",
  );
});

test("locomotion, camera, and grounded props share one visual frame of reference", async () => {
  const [runtime, collision, layoutText] = await Promise.all([
    readRuntime(),
    readFile(new URL("../../game/server/src/chapter-1/collision.ts", import.meta.url), "utf8"),
    readFile(new URL("public/playcanvas/chapter-1/world-layout.json", root), "utf8"),
  ]);
  const layout = JSON.parse(layoutText);
  assert.match(
    runtime,
    /visualYaw/,
    "the player mesh needs a facing direction independent from the orbit camera",
  );
  assert.match(
    runtime,
    /lookYaw/,
    "mouse input needs a smoothed view target rather than rotating the camera and mesh in one raw step",
  );
  assert.match(
    runtime,
    /networkSnapshots/,
    "20 Hz enemy snapshots need a bounded interpolation buffer",
  );
  assert.match(
    runtime,
    /interpolationClockMs - CHAPTER_CONFIG\.network\.enemyInterpolationMs/,
    "enemy rendering must use the shared interpolation delay and freeze it during hit-stop",
  );
  assert.match(
    runtime,
    /const planarSpeed = Math\.hypot\(playerVelocity\.x, playerVelocity\.z\)/,
    "locomotion state must come from simulated displacement, not held keys",
  );
  assert.match(
    runtime,
    /function locomotionPlaybackSpeed/,
    "walk and sprint clips must be retimed from real travel speed so planted feet do not slide",
  );
  assert.match(
    runtime,
    /setCharacterAnimation\(state\.playerEntity, playerAnim, planarSpeed\)/,
    "the measured speed must drive the active locomotion clip every frame",
  );
  assert.match(
    runtime,
    /planarSpeed > 0\.65/,
    "blocked movement must settle to idle and stop footsteps",
  );
  assert.match(
    runtime,
    /config\.feel\.dodgeClipSeconds \/ config\.feel\.dodgeActionSeconds/,
    "the roll clip must finish with the 0.65 second authoritative dodge",
  );
  assert.match(
    runtime,
    /aimBlend/,
    "aim camera distance, shoulder, height, and FOV must blend instead of popping between booleans",
  );
  assert.match(
    runtime,
    /Jog_Fwd_Loop/,
    "4.5 m/s locomotion must use the authored forward jog rather than the slow walk cycle",
  );
  assert.match(
    runtime,
    /GROUND_ALIGNED_MODELS/,
    "road props need an explicit ground-alignment pass",
  );
  assert.match(
    runtime,
    /function groundAnimatedCharacter/,
    "animated feet need a measured contact correction rather than a fixed root height",
  );
  assert.match(
    runtime,
    /STREET_SURFACE_Y - uncorrectedMinimum/,
    "character ground correction must use the same authored street surface as props",
  );
  assert.match(
    runtime,
    /packed-sand-v1\.webp/,
    "the road needs an authored sand texture rather than flat floor slabs",
  );
  assert.match(
    runtime,
    /mats\.roadSand\.diffuseMap = texture/,
    "the sand texture must be applied to the canonical street material",
  );
  assert.match(
    runtime,
    /entity\.render\.castShadows = Boolean\(value\)/,
    "decorative shadow flags must reach PlayCanvas render components instead of becoming unused entity fields",
  );
  assert.match(
    runtime,
    /road\.receiveShadows = true/,
    "the route ground must receive the authored moon contact shadow",
  );
  assert.doesNotMatch(
    runtime,
    /Math\.sin\(performance\.now\(\) \* \.009\).*snapshot\.player\.state === "locomotion"/,
    "synthetic whole-body bob must not push the feet through the road",
  );
  assert.match(
    runtime,
    /world-layout\.json/,
    "the browser must load the canonical placement and collision manifest",
  );
  assert.match(
    runtime,
    /assets\.find\("world-layout\.json"\)/,
    "PlayCanvas Launch must use its preloaded manifest instead of requesting the launch-site root",
  );
  assert.match(
    runtime,
    /document\.currentScript\?\.src/,
    "the static export fallback must resolve the manifest beside the runtime script",
  );
  assert.match(
    collision,
    /world-layout\.json/,
    "the server must consume the same canonical placement and collision manifest",
  );
  assert.match(
    runtime,
    /collider\.visual/,
    "the shared manifest must identify colliders backed by approved visual prefabs",
  );
  assert.match(
    runtime,
    /if \([\s\S]{0,40}visual \|\|/,
    "a renamed prop collider must never become a rendered debug box",
  );
  if (layout.version === 1) {
    assert.equal(layout.colliders.find(({ id }) => id === "courtyard-cart-body")?.maxZ, 2.85);
    assert.deepEqual(layout.placements.Prop_Wagon[0], [2.6, 0, 2.6, 24, 0.86]);
  } else
    assert.ok(
      layout.colliders.some(({ id }) => id === "gate-rath"),
      "the recut must keep the gate rath authoritative",
    );
});

test("A0 night rendering exposes the skyline and lets practical fire lights breathe", async () => {
  const [runtime, servedBundle] = await Promise.all([
    readRuntime(),
    readFile(new URL("public/playcanvas/chapter-1/chapter-1.js", root), "utf8"),
  ]);
  assert.ok(
    servedBundle.length > 80_000,
    "the served runtime must contain the Vite-built Chapter 1 bundle",
  );
  assert.match(
    servedBundle,
    /Offline play/,
    "the served bundle must be generated from the readable runtime source",
  );
  assert.doesNotMatch(
    runtime,
    /primitive\("sphere", "Indigo night sky"/,
    "an opaque sky mesh must not hide distant scenery",
  );
  assert.match(runtime, /ambientLight = new pc\.Color\(0\.055, 0\.075, 0\.15\)/);
  assert.match(runtime, /scene\.exposure = 0\.64/);
  assert.doesNotMatch(
    runtime,
    /new pc\.Entity\("Camera soft fill"\)/,
    "the camera must not carry a flattening headlight",
  );
  assert.match(runtime, /texture\.addressU = texture\.addressV = pc\.ADDRESS_REPEAT/);
  assert.doesNotMatch(runtime, /ADDRESS_MIRRORED_REPEAT/);
  assert.match(
    runtime,
    /diffuseMapTiling = new pc\.Vec2\(7, 4\)/,
    "each 13 by 8 metre centre-road slab needs an approximately two-metre texture repeat",
  );
  assert.match(runtime, /function flickerFireLight/);
  assert.match(
    runtime,
    /state\.fireLights[\s\S]{0,160}flickerFireLight/,
    "every cached practical light must animate each frame",
  );
  assert.match(
    runtime,
    /renderingSummary/,
    "visual QA must expose the A0 lighting contract in the running scene",
  );
});

test("A1 uses the ledgered HDR, physical materials, native grading, and production shadows", async () => {
  const [runtime, html, css, hdr, sourceHdr] = await Promise.all([
    readRuntime(),
    readFile(new URL("public/playcanvas/chapter-1/index.html", root), "utf8"),
    readFile(new URL("public/playcanvas/chapter-1/chapter-1.css", root), "utf8"),
    readFile(new URL("public/playcanvas/chapter-1/assets/environment/moonlit_golf_2k.hdr", root)),
    readFile(new URL("../../game/assets/raw/polyhaven/moonlit_golf_2k.hdr", import.meta.url)),
  ]);
  assert.deepEqual(hdr, sourceHdr, "the runtime HDR must be the exact ledgered CC0 source");
  assert.match(runtime, /EnvLighting\.generateSkyboxCubemap/);
  assert.match(runtime, /EnvLighting\.generateAtlas/);
  assert.match(runtime, /scene\.skybox = state\.skyboxCubemap/);
  assert.match(runtime, /scene\.envAtlas = state\.environmentAtlas/);
  assert.match(runtime, /toneMapping = pc\.TONEMAP_ACES/);
  assert.match(
    runtime,
    /new pc\.CameraFrame/,
    "desktop rendering should use the engine-native grading frame",
  );
  assert.match(runtime, /maxPixelRatio = Math\.min\(\s*1,\s*window\.devicePixelRatio,?\s*\)/);
  assert.match(runtime, /function enforceNativeResolution/);
  assert.doesNotMatch(runtime, /nextScale = 0\.[89]/);
  assert.match(runtime, /value\.useMetalness = true/);
  assert.match(
    runtime,
    /shadowResolution: 1024,[\s\S]{0,120}shadowBias: 0\.05,[\s\S]{0,120}normalOffsetBias: 0\.02,[\s\S]{0,120}numCascades: 1/,
  );
  assert.doesNotMatch(
    html,
    /id="vignette"/,
    "the general vignette belongs to CameraFrame, not a CSS overlay",
  );
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
  assert.ok(
    layout.streetHouseBays.every((z, index, bays) => index === 0 || bays[index - 1] - z === 4),
    "house bays must stay on the four-metre grid",
  );
  assert.doesNotMatch(
    runtime,
    /primitive\("box", "Left house"/,
    "the old box-house corridor must be gone",
  );
  assert.doesNotMatch(
    runtime,
    /primitive\("cylinder", "Awning support"/,
    "awnings must use authored wooden posts",
  );
  assert.doesNotMatch(
    runtime,
    /primitive\("box", "Carved turn-wall pilaster"/,
    "turn walls must use authored columns",
  );
  assert.match(runtime, /Kenney_roof_flat_square/);
  assert.match(runtime, /Wall_Plaster_Door_Flat/);
  assert.match(runtime, /tintStreetHouse/);
  assert.match(
    runtime,
    /placements\.push\(\[x, 0, centreZ \+ offset, yaw, 1\]\)/,
    "street wall modules must remain at source scale",
  );
  for (const key of ["Kenney_column", "Prop_ExteriorBorder_Straight1", "Kenney_pillar_wood"]) {
    assert.ok(
      layout.placements[key].every((placement) => placement[4] === 1),
      `${key} must remain at source scale`,
    );
  }
});

test("A3 uses cached particle VFX, textured bunting, road slabs, and late GLB batching", async () => {
  const [runtime, fireAtlas, smokeAtlas, fabric] = await Promise.all([
    readRuntime(),
    readFile(
      new URL("public/playcanvas/chapter-1/assets/textures/kenney-explosion-fire-atlas.webp", root),
    ),
    readFile(
      new URL("public/playcanvas/chapter-1/assets/textures/kenney-black-smoke-atlas.webp", root),
    ),
    readFile(
      new URL("public/playcanvas/chapter-1/assets/textures/fabric_pattern_07_col_1_512.webp", root),
    ),
  ]);
  assert.ok(fireAtlas.length > 1000 && smokeAtlas.length > 1000 && fabric.length > 1000);
  assert.match(runtime, /addComponent\("particlesystem"/);
  assert.match(runtime, /animTilesX: 3,[\s\S]{0,60}animTilesY: 3,[\s\S]{0,60}animNumFrames: 9/);
  assert.match(runtime, /animTilesX: 5,[\s\S]{0,60}animTilesY: 5,[\s\S]{0,60}animNumFrames: 25/);
  assert.doesNotMatch(runtime, /primitive\("sphere", "Smoke plume"/);
  assert.doesNotMatch(
    runtime,
    /state\.app\.root\.findByTag\("fire"\)/,
    "the frame loop must use the cached emitter list",
  );
  assert.doesNotMatch(
    runtime,
    /state\.app\.root\.findByTag\("smoke"\)/,
    "GPU smoke must not need per-frame scene scans",
  );
  assert.match(runtime, /new pc\.Entity\("Triangular festival pennant"/);
  assert.match(runtime, /fabric_pattern_07_col_1_512\.webp/);
  assert.match(runtime, /"Packed earth street slab"/);
  assert.match(runtime, /"Wet ash fire patch"/);
  assert.match(
    runtime,
    /assignStaticModelToBatch\(entity\)/,
    "late-loaded GLBs must join the active static batch group",
  );
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
  assert.ok(
    layout.version >= 2
      ? layout.routeSegments.length >= 10
      : layout.colliders.filter(({ label }) => /L-turn/.test(label)).length === 2,
  );
  assert.ok(
    !layout.colliders.some(
      ({ minX, maxX, minZ, maxZ }) => 2 >= minX && 2 <= maxX && -9 >= minZ && -9 <= maxZ,
    ),
    "the market L-turn must not trap the unchanged enemy spawn",
  );
  assert.ok(layout.placements.brass_diya_lantern.length >= 24);
  assert.ok(
    layout.placements.Kenney_fountain_round.length >= 3,
    "the arrival vista needs a built stone well",
  );
  assert.ok(
    layout.placements.Kenney_cart.length && layout.placements.Kenney_wheel.length >= 2,
    "the gate needs a two-wheel rath",
  );
  assert.match(runtime, /mats\.roadSand = material\(\[0\.58, 0\.56, 0\.52\]\)/);
  assert.match(runtime, /const tones = \["lime", "ochre", "rose"\]/);
  assert.doesNotMatch(
    runtime,
    /turquoise: new pc\.Color\([^)]*\)[\s\S]{0,80}const color = colors\[tone\]/,
  );
  assert.match(runtime, /"Household shrine niche"/);
  assert.match(runtime, /"Cool moon rim"/);
  assert.match(runtime, /"Palace horizon glow"/);
  assert.match(runtime, /"Triangular festival pennant"/);
  assert.match(
    runtime,
    /if \(!target\) \{[\s\S]{0,40}state\.targetEnemyId = null;/,
    "occluded or defeated enemies must clear the target lock",
  );
  assert.doesNotMatch(runtime, /primitive\("sphere", "Moon disc"/);
  assert.doesNotMatch(runtime, /primitive\("sphere", `Night star/);
  assert.match(runtime, /setDressingSummary/);
});

test("A4 shares the authoritative simulation and remains playable without a socket", async () => {
  const [runtime, simulation, server, progressStore, packageJson, viteConfig, html] =
    await Promise.all([
      readRuntime(),
      readFile(new URL("../../game/server/src/chapter-1/simulation.ts", import.meta.url), "utf8"),
      readFile(new URL("../../game/server/src/index.ts", import.meta.url), "utf8"),
      readFile(new URL("../../game/server/src/progress-store.ts", import.meta.url), "utf8"),
      readFile(new URL("package.json", root), "utf8"),
      readFile(new URL("vite.chapter-1.config.mjs", root), "utf8"),
      readFile(new URL("public/playcanvas/chapter-1/index.html", root), "utf8"),
    ]);
  assert.match(runtime, /import \{ ChapterSimulation, CHAPTER_CONFIG \}/);
  assert.match(
    runtime,
    /tickLocalSimulation\(simulationDt\)/,
    "the shared simulation must run from the browser frame loop with real dt",
  );
  assert.match(runtime, /state\.networkSnapshots\.push/);
  assert.match(
    runtime,
    /startLocalSession\(\)/,
    "a missing WebSocket URL must start local play instead of blocking",
  );
  assert.match(runtime, /progress will save when reconnected/);
  assert.match(
    runtime,
    /if \(state\.localMode\) processLocalEvents\(\)/,
    "connected prediction cannot drive outcome UI",
  );
  assert.match(runtime, /else state\.localSimulation\.drainEvents\(\)/);
  assert.match(
    runtime,
    /window\.setTimeout\(\(\) => connect\(true\), delay\)/,
    "offline fallback must keep retrying the server",
  );
  assert.match(
    runtime,
    /const position = player[\s\S]{0,160}x: player\.x,[\s\S]{0,100}y:[\s\S]{0,300}position,/,
    "the movement-owning client must send its validated position",
  );
  assert.doesNotMatch(
    runtime,
    /local\.x \* \.82 \+ authoritativePlayer\.x \* \.18/,
    "the removed blend reconciliation path must not return",
  );
  assert.match(
    simulation,
    /\.\.\.this\.input\.pressed, \.\.\.sanitized\.pressed/,
    "presses must survive two packets in one server tick",
  );
  assert.match(simulation, /acceptClientPosition/);
  assert.match(simulation, /readonly movementOnly = false/);
  assert.match(server, /!parsed \|\| typeof parsed !== "object" \|\| Array\.isArray\(parsed\)/);
  assert.match(server, /new BoundedProgressStore/);
  assert.match(progressStore, /capacity = 10_000/);
  assert.match(progressStore, /ttlMs = 24 \* 60 \* 60 \* 1_000/);
  assert.match(packageJson, /build:chapter-1/);
  assert.match(viteConfig, /game\/client-scripts\/chapter-1\.js/);
  assert.match(html, /type="module" src="\.\/chapter-1\.js/);
});

test("A5 layers responsive aim, blended locomotion, impact feel, and camera spring", async () => {
  const runtime = await readRuntime();
  assert.match(
    runtime,
    /state\.yaw = state\.lookYaw/,
    "mouse yaw must reach aiming in the input frame",
  );
  assert.match(runtime, /type: "1D",[\s\S]{0,60}parameter: "locomotionSpeed"/);
  for (const point of ["idle", "walk", "jog", "sprint"])
    assert.match(runtime, new RegExp(`name: "${point}", point:`));
  assert.match(runtime, /name: "Upper body aim"/);
  assert.match(runtime, /upperBody\.mask = \{ \[spine\.path\]: \{ children: true \} \}/);
  assert.match(runtime, /state\.hitStopUntil/);
  assert.match(runtime, /entity\.dwarkaHitUntil/);
  assert.match(runtime, /function smoothEnemyYaw/);
  assert.match(runtime, /function springCameraAxis/);
});

test("A6 builds the served export from focused source modules and content revisions", async () => {
  const [runtime, simulation, viteConfig, prettierConfig] = await Promise.all([
    readRuntime(),
    readFile(new URL("../../game/server/src/chapter-1/simulation.ts", import.meta.url), "utf8"),
    readFile(new URL("vite.chapter-1.config.mjs", root), "utf8"),
    readFile(new URL(".prettierrc.json", root), "utf8"),
  ]);
  for (const boundary of [
    "scene/build.js",
    "scene/materials.js",
    "scene/dressing.js",
    "character/animation.js",
    "character/equipment.js",
    "combat/targeting.js",
    "combat/effects.js",
    "net/session.js",
    "sim/shared.ts",
    "ui/hud.js",
    "ui/modals.js",
  ])
    assert.match(runtime, new RegExp(boundary.replaceAll(".", "\\.")));
  assert.match(runtime, /CHAPTER_CONFIG/);
  assert.match(simulation, /config\/chapter-1\.json/);
  assert.match(viteConfig, /hashAssetTree/);
  assert.match(viteConfig, /__CHAPTER_ASSET_REVISION__/);
  assert.match(runtime, /assetUrl\(url\)/);
  assert.equal(JSON.parse(prettierConfig).printWidth, 100);
});

test("Tranche B recuts Chapter 1 into seven connected regions with stepped height", async () => {
  const [runtime, layoutText, configText, levelSpec] = await Promise.all([
    readRuntime(),
    readFile(new URL("public/playcanvas/chapter-1/world-layout.json", root), "utf8"),
    readFile(new URL("../../game/config/chapter-1.json", import.meta.url), "utf8"),
    readFile(
      "/Users/adityapratapsingh/.traycer/epics/a360cb19-6f3d-4de2-bc83-1ec2b4c7091f/artifacts/chapter-1-quality-audit/tranche-b-level-recut/level-spec.md",
      "utf8",
    ),
  ]);
  const layout = JSON.parse(layoutText);
  const config = JSON.parse(configText);
  assert.equal(layout.version, 2);
  assert.deepEqual(layout.worldBounds, { minX: -28, maxX: 28, minZ: -58, maxZ: 34 });
  assert.equal(layout.routeSegments.length, 10);
  assert.deepEqual(
    layout.floorRegions.filter(({ id }) => id.startsWith("stair-")).map(({ y }) => y),
    [1, 2, 3, 4, 5],
  );
  assert.equal(config.checkpoints.market.y, 6);
  assert.equal(config.checkpoints.doorway.y, 6);
  assert.match(runtime, /buildSevenRegionRoute/);
  assert.match(runtime, /painted_plaster_wall_diff_512\.webp/);
  assert.match(runtime, /dwarkaFloorY/);
  assert.match(levelSpec, /Centreline length: 186 m/);
});

test("profile bridge ranks progress monotonically and reset preserves preferences", async () => {
  const progress = await readFile(new URL("app/game/chapter-1/progress.ts", root), "utf8");
  assert.match(progress, /incoming\.nextPhase.*existing\.nextPhase/);
  assert.match(progress, /existing\?\.chapterComplete/);
  assert.match(
    progress,
    /progressSummary: progressToken \? parsed\.progressSummary \?\? null : null/,
    "an unsigned stale summary must not block the first fresh checkpoint",
  );
  assert.match(progress, /localStorage\.removeItem\(PROFILE_KEY\)/);
  assert.match(progress, /PREFERENCES_KEY/);
  assert.match(progress, /BroadcastChannel/);
});
