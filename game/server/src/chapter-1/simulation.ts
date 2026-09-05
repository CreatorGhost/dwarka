import {
  CHECKPOINTS,
  FAMILY_POSITIONS,
  nextPhase,
  PHASE_LABEL,
  ROSTERS,
  type CombatPhase,
  type EnemyKind,
  type PhaseId,
} from "./phases.ts";
import {
  collides,
  DOORS,
  floorHeightAt,
  moveWithCollision,
  segmentBlocked,
  type Point,
} from "./collision.ts";
import chapterConfig from "../../../config/chapter-1.json" with { type: "json" };

const ENEMY_STATS = chapterConfig.enemyStats satisfies Record<
  EnemyKind,
  {
    health: number;
    damage: number;
    speed: number;
    range: number;
    windup: number;
  }
>;
const SPAWNS = chapterConfig.spawns satisfies Record<
  CombatPhase,
  Array<Required<Point>>
>;

export type InputFrame = {
  seq: number;
  move: [number, number];
  aimYaw: number;
  aimPitch: number;
  held: string[];
  pressed: string[];
  position?: Required<Point>;
};

export type EnemyState = {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
  z: number;
  yaw: number;
  health: number;
  maxHealth: number;
  warning: number;
  attackCooldown: number;
  dead: boolean;
};

export type SimulationEvent =
  | { type: "phase.completed"; completedPhase: PhaseId; nextPhase: PhaseId }
  | { type: "phase.restarted"; phase: PhaseId; reason: "down" | "family" }
  | { type: "story.ready"; phase: "ending" };

export type DoorState = {
  id: string;
  progress: number;
  open: boolean;
};

type PendingPlayerAttack = {
  mode: "bow" | "melee";
  targetId: string;
  damage: number;
  remaining: number;
  originX: number;
  originZ: number;
  aimYaw: number;
  aimPitch: number;
};

type EnemyBrain = {
  skirmisherMode: "approach" | "circle" | "strike";
  circleRemaining: number;
  circleSign: -1 | 1;
  archerMode: "hold" | "advance" | "retreat";
  playerAggro: boolean;
  blockedFor: number;
  slideRemaining: number;
  slideSign: -1 | 1;
};

type LoadPhaseOptions = {
  resetPlayer?: boolean;
  activateEncounter?: boolean;
};

const INITIAL_PLAYER_GRACE = 1.5;
const ENEMY_SEPARATION_DISTANCE = 1.35;
const PLAYER_AGGRO_DISTANCE = 25;
const FAMILY_THREAT_PLAYER_DISTANCE = 6;
const SKIRMISHER_CIRCLE_DISTANCE = 3;
const SKIRMISHER_CIRCLE_SECONDS = 0.5;
const ARCHER_RETREAT_START = 4;
const ARCHER_RETREAT_STOP = 5.5;
const ARCHER_ADVANCE_STOP = 7.75;
const ENEMY_TURN_RATE_DEGREES = {
  skirmisher: 200,
  archer: 160,
  brute: 120,
} satisfies Record<EnemyKind, number>;
const ATTACK_START_ARC = (60 * Math.PI) / 180;
const ATTACK_IMPACT_ARC = (75 * Math.PI) / 180;
const PHASE_ORDER: PhaseId[] = [
  "arrival",
  "courtyard",
  "market",
  "doorway",
  "ending",
  "complete",
];

const allowedHeld = new Set(["sprint", "aim"]);
const allowedPressed = new Set(["fire", "melee", "dodge", "interact"]);

function finite(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function angleDifference(target: number, current: number): number {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

function yawToward(from: Point, target: Point, fallback: number): number {
  const dx = target.x - from.x;
  const dz = target.z - from.z;
  return Math.hypot(dx, dz) > 0.0001 ? Math.atan2(dx, -dz) : fallback;
}

export function sanitizeInput(
  value: unknown,
  lastSeq: number,
): InputFrame | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const seq = Number.isSafeInteger(raw.seq) ? Number(raw.seq) : -1;
  if (seq <= lastSeq || seq > lastSeq + 100000) return null;
  const moveRaw = Array.isArray(raw.move) ? raw.move : [0, 0];
  let x = Math.max(-1, Math.min(1, finite(moveRaw[0])));
  let z = Math.max(-1, Math.min(1, finite(moveRaw[1])));
  const magnitude = Math.hypot(x, z);
  if (magnitude > 1) {
    x /= magnitude;
    z /= magnitude;
  }
  const held = Array.isArray(raw.held)
    ? raw.held
        .filter(
          (item): item is string =>
            typeof item === "string" && allowedHeld.has(item),
        )
        .slice(0, 2)
    : [];
  const pressed = Array.isArray(raw.pressed)
    ? raw.pressed
        .filter(
          (item): item is string =>
            typeof item === "string" && allowedPressed.has(item),
        )
        .slice(0, 4)
    : [];
  let position: Required<Point> | undefined;
  if ("position" in raw) {
    if (
      !raw.position ||
      typeof raw.position !== "object" ||
      Array.isArray(raw.position)
    )
      return null;
    const candidate = raw.position as Record<string, unknown>;
    if (
      ![candidate.x, candidate.y, candidate.z].every(
        (item) => typeof item === "number" && Number.isFinite(item),
      )
    )
      return null;
    position = {
      x: Number(candidate.x),
      y: Number(candidate.y),
      z: Number(candidate.z),
    };
  }
  return {
    seq,
    move: [x, z],
    aimYaw: Math.max(-Math.PI * 8, Math.min(Math.PI * 8, finite(raw.aimYaw))),
    aimPitch: Math.max(-0.85, Math.min(0.65, finite(raw.aimPitch))),
    held,
    pressed: [...new Set(pressed)],
    position,
  };
}

export class ChapterSimulation {
  readonly sessionId = globalThis.crypto.randomUUID();
  readonly playerId: string;
  readonly movementOnly: boolean;
  phase: PhaseId;
  phaseEpoch = 1;
  tickNumber = 0;
  paused = false;
  player = {
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    health: 100,
    state: "idle",
    invulnerable: 0,
  };
  enemies: EnemyState[] = [];
  family = { active: false, safe: false, dangerStarted: false, remaining: 20 };
  lastSeq = -1;
  input: InputFrame = {
    seq: 0,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: [],
    pressed: [],
  };
  attackCooldown = 0;
  comboStep = 0;
  comboRemaining = 0;
  dodgeRemaining = 0;
  dodgeRecoveryRemaining = 0;
  dodgeQueued = false;
  hitReactionRemaining = 0;
  downRemaining = 0;
  encounterCompleteRemaining = 0;
  combatGraceRemaining = 0;
  pendingAttacks: PendingPlayerAttack[] = [];
  dodgeDirection: Point = { x: 0, z: -1 };
  restartReason: "down" | "family" | null = null;
  events: SimulationEvent[] = [];
  positionCorrection = false;
  doorProgress: Record<string, number> = Object.fromEntries(
    DOORS.map((door) => [door.id, 0]),
  );
  readonly openDoorIds = new Set<string>();
  private doorsExternallyDriven = false;
  private clientPositionMode = false;
  private enemyBrains = new Map<string, EnemyBrain>();
  private encounterActive = false;
  private familyThreatId: string | null = null;

  constructor(
    playerId: string,
    phase: PhaseId,
    movementOnly = false,
  ) {
    this.movementOnly = movementOnly;
    this.playerId = playerId;
    this.phase = phase === "complete" ? "complete" : phase;
    this.loadPhase(this.phase);
  }

  loadPhase(
    phase: PhaseId,
    { resetPlayer = true, activateEncounter = true }: LoadPhaseOptions = {},
  ): void {
    this.phase = phase;
    this.phaseEpoch += 1;
    const checkpoint = CHECKPOINTS[phase];
    const position = resetPlayer ? checkpoint : this.player;
    this.player = {
      x: position.x,
      y: position.y,
      z: position.z,
      yaw: resetPlayer ? checkpoint.yaw : position.yaw,
      health: 100,
      state: phase === "ending" || phase === "complete" ? "locked" : "idle",
      invulnerable: 0,
    };
    this.enemies = [];
    this.family = {
      active: false,
      safe: false,
      dangerStarted: false,
      remaining: 20,
    };
    this.attackCooldown = 0;
    this.comboStep = 0;
    this.comboRemaining = 0;
    this.dodgeRemaining = 0;
    this.dodgeRecoveryRemaining = 0;
    this.dodgeQueued = false;
    this.hitReactionRemaining = 0;
    this.downRemaining = 0;
    this.encounterCompleteRemaining = 0;
    this.combatGraceRemaining =
      phase === "courtyard" || phase === "market" || phase === "doorway"
        ? INITIAL_PLAYER_GRACE
        : 0;
    this.pendingAttacks = [];
    this.enemyBrains.clear();
    this.familyThreatId = null;
    this.restartReason = null;
    this.lastSeq = -1;
    this.input = {
      seq: 0,
      move: [0, 0],
      aimYaw: this.player.yaw,
      aimPitch: 0,
      held: [],
      pressed: [],
    };
    this.clientPositionMode = false;
    this.positionCorrection = false;
    const combatPhase =
      phase === "courtyard" || phase === "market" || phase === "doorway";
    this.encounterActive = !combatPhase || activateEncounter;
    this.resetDoors(activateEncounter);
    if (!this.movementOnly && combatPhase) {
      this.family.active = this.encounterActive;
      this.family.dangerStarted = this.encounterActive;
      this.enemies = ROSTERS[phase].map((kind, index) => ({
        id: `${phase}-${this.phaseEpoch}-${index}`,
        kind,
        x: SPAWNS[phase][index].x,
        y: SPAWNS[phase][index].y,
        z: SPAWNS[phase][index].z,
        yaw: 0,
        health: ENEMY_STATS[kind].health,
        maxHealth: ENEMY_STATS[kind].health,
        warning: 0,
        attackCooldown: 0.5 + index * 0.28,
        dead: false,
      }));
      this.familyThreatId = this.enemies
        .filter((enemy) => enemy.kind === "skirmisher")
        .at(-1)?.id ?? null;
      this.enemies.forEach((enemy, index) => {
        this.enemyBrains.set(enemy.id, {
          skirmisherMode: "approach",
          circleRemaining: 0,
          circleSign: index % 2 === 0 ? 1 : -1,
          archerMode: "hold",
          playerAggro: false,
          blockedFor: 0,
          slideRemaining: 0,
          slideSign: index % 2 === 0 ? 1 : -1,
        });
      });
    }
    if (phase === "ending")
      this.events.push({ type: "story.ready", phase: "ending" });
  }

  acceptInput(value: unknown): boolean {
    const sanitized = sanitizeInput(value, this.lastSeq);
    if (!sanitized) return false;
    const sequenceGap = Math.max(1, Math.min(4, sanitized.seq - this.lastSeq));
    this.lastSeq = sanitized.seq;
    if (
      sanitized.position &&
      !this.acceptClientPosition(sanitized.position, sequenceGap, sanitized)
    ) {
      this.positionCorrection = true;
      this.input = { ...sanitized, move: [0, 0], held: [], pressed: [] };
      return false;
    }
    if (sanitized.position) {
      this.positionCorrection = false;
      this.clientPositionMode = true;
    }
    // Input packets can arrive more often than the fixed simulation tick. Keep
    // edge-triggered actions until updatePlayer consumes them so a later move-
    // only packet cannot erase a press that arrived in the same tick window.
    this.input = {
      ...sanitized,
      pressed: [...new Set([...this.input.pressed, ...sanitized.pressed])],
    };
    return true;
  }

  private acceptClientPosition(
    position: Required<Point>,
    sequenceGap: number,
    input: InputFrame,
  ): boolean {
    const floor = floorHeightAt(position);
    if (
      floor === null ||
      Math.abs(floor - position.y) > 0.08 ||
      collides(position, 0.55, this.openDoorIds, this.doorProgress)
    )
      return false;
    const locked =
      this.player.health <= 0 ||
      this.hitReactionRemaining > 0 ||
      this.phase === "ending" ||
      this.phase === "complete";
    const speed = locked
      ? 0
      : this.dodgeRemaining > 0 || input.pressed.includes("dodge")
        ? 8.5
        : input.held.includes("aim")
          ? 3.2
          : input.held.includes("sprint")
            ? 6.5
            : 4.5;
    const maximumDistance = speed * 0.05 * sequenceGap + 0.12;
    if (
      Math.hypot(position.x - this.player.x, position.z - this.player.z) >
      maximumDistance
    )
      return false;
    this.player.x = position.x;
    this.player.y = floor;
    this.player.z = position.z;
    return true;
  }

  private resetDoors(activateEncounter: boolean): void {
    this.openDoorIds.clear();
    const phaseIndex = PHASE_ORDER.indexOf(this.phase);
    for (const door of DOORS) {
      const openPhaseIndex = door.openFromPhase
        ? PHASE_ORDER.indexOf(door.openFromPhase as PhaseId)
        : -1;
      const open =
        openPhaseIndex >= 0 &&
        (phaseIndex > openPhaseIndex ||
          (phaseIndex === openPhaseIndex && activateEncounter));
      this.doorProgress[door.id] = open ? 1 : 0;
      if (open) this.openDoorIds.add(door.id);
    }
  }

  private updateDoors(dt: number): void {
    const phaseIndex = PHASE_ORDER.indexOf(this.phase);
    for (const door of DOORS) {
      if (!door.openFromPhase || this.doorProgress[door.id] >= 1) continue;
      const openPhaseIndex = PHASE_ORDER.indexOf(door.openFromPhase as PhaseId);
      if (openPhaseIndex < 0 || phaseIndex < openPhaseIndex) continue;
      const [x, , z] = door.position;
      const approached = Math.hypot(this.player.x - x, this.player.z - z) <= 5;
      if (phaseIndex === openPhaseIndex && !this.encounterActive && !approached)
        continue;
      const duration = Math.max(0.1, door.swingSeconds ?? 0.45);
      this.doorProgress[door.id] = Math.min(
        1,
        this.doorProgress[door.id] + dt / duration,
      );
      if (this.doorProgress[door.id] >= 1) this.openDoorIds.add(door.id);
    }
  }

  adoptDoorState(doors: readonly DoorState[]): void {
    const doorsById = new Map(doors.map((door) => [door.id, door]));
    this.doorsExternallyDriven = true;
    this.openDoorIds.clear();
    for (const door of DOORS) {
      const authoritative = doorsById.get(door.id);
      const open = authoritative?.open === true;
      const progress = Number(authoritative?.progress);
      this.doorProgress[door.id] = open
        ? 1
        : Number.isFinite(progress)
          ? Math.max(0, Math.min(1, progress))
          : 0;
      if (open) this.openDoorIds.add(door.id);
    }
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused)
      this.input = { ...this.input, move: [0, 0], held: [], pressed: [] };
  }

  completeEnding(): void {
    if (this.phase !== "ending") return;
    this.advancePhase();
  }

  private forward(yaw = this.player.yaw): Point {
    return { x: Math.sin(yaw), z: -Math.cos(yaw) };
  }

  private updatePlayer(dt: number): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.comboRemaining = Math.max(0, this.comboRemaining - dt);
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    this.dodgeRecoveryRemaining = Math.max(0, this.dodgeRecoveryRemaining - dt);
    this.hitReactionRemaining = Math.max(0, this.hitReactionRemaining - dt);
    if (this.dodgeRecoveryRemaining < 0.000001) this.dodgeRecoveryRemaining = 0;
    if (this.hitReactionRemaining < 0.000001) this.hitReactionRemaining = 0;
    const pressed = new Set(this.input.pressed);
    const held = new Set(this.input.held);
    if (pressed.has("dodge")) this.dodgeQueued = true;
    this.player.yaw = this.input.aimYaw;

    const resolvedAttacks: PendingPlayerAttack[] = [];
    for (const pending of this.pendingAttacks) {
      pending.remaining = Math.max(0, pending.remaining - dt);
      if (pending.remaining === 0) resolvedAttacks.push(pending);
    }
    if (resolvedAttacks.length > 0) {
      this.pendingAttacks = this.pendingAttacks.filter(
        (pending) => pending.remaining > 0,
      );
      for (const pending of resolvedAttacks) this.resolvePendingAttack(pending);
    }

    if (this.hitReactionRemaining > 0) {
      this.player.state = "hit";
      this.input = {
        ...this.input,
        move: [0, 0],
        held: [],
        pressed: this.dodgeQueued ? ["dodge"] : [],
      };
      return;
    }

    if (this.dodgeRemaining > 0) {
      this.dodgeRemaining = Math.max(0, this.dodgeRemaining - dt);
      if (this.dodgeRemaining < 0.000001) {
        this.dodgeRemaining = 0;
        this.dodgeRecoveryRemaining = 0.25;
      }
      this.player.state = "dodge";
      const dodgeElapsed =
        chapterConfig.feel.dodgeActionSeconds - this.dodgeRemaining;
      if (
        dodgeElapsed + Number.EPSILON * 8 >=
          chapterConfig.feel.dodgeInvulnerabilityStartSeconds &&
        dodgeElapsed < chapterConfig.feel.dodgeInvulnerabilityEndSeconds
      ) {
        this.player.invulnerable = Math.max(
          this.player.invulnerable,
          chapterConfig.feel.dodgeInvulnerabilityEndSeconds - dodgeElapsed,
        );
      } else {
        this.player.invulnerable = 0;
      }
      if (!this.clientPositionMode) {
        const moved = moveWithCollision(
          this.player,
          {
            x: this.dodgeDirection.x * 8.5 * dt,
            z: this.dodgeDirection.z * 8.5 * dt,
          },
          0.55,
          this.openDoorIds,
          this.doorProgress,
        );
        this.player.x = moved.x;
        this.player.y = moved.y ?? this.player.y;
        this.player.z = moved.z;
      }
      this.input.pressed = this.dodgeQueued ? ["dodge"] : [];
      return;
    }

    const [inputX, inputZ] = this.input.move;
    const forward = this.forward(this.input.aimYaw);
    const right = {
      x: Math.cos(this.input.aimYaw),
      z: Math.sin(this.input.aimYaw),
    };
    let move = {
      x: right.x * inputX + forward.x * inputZ,
      z: right.z * inputX + forward.z * inputZ,
    };
    const magnitude = Math.hypot(move.x, move.z);
    if (magnitude > 1) move = { x: move.x / magnitude, z: move.z / magnitude };

    if (this.dodgeQueued && this.dodgeRecoveryRemaining <= 0) {
      this.pendingAttacks = this.pendingAttacks.filter(
        (pending) => pending.mode === "bow",
      );
      this.dodgeDirection = magnitude > 0.05 ? move : forward;
      this.dodgeRemaining = chapterConfig.feel.dodgeActionSeconds;
      this.dodgeQueued = false;
      this.player.state = "dodge";
      this.input.pressed = [];
      return;
    }

    if (this.dodgeRecoveryRemaining > 0) {
      pressed.delete("fire");
      pressed.delete("melee");
    }

    if (
      !this.movementOnly &&
      pressed.has("interact") &&
      this.phase === "arrival"
    ) {
      const distance = Math.hypot(this.player.x, this.player.z - 14);
      if (
        distance <= 3.2 &&
        !segmentBlocked(
          this.player,
          { x: 0, z: 14 },
          this.openDoorIds,
          this.doorProgress,
        )
      ) {
        this.player.state = "interact";
        this.advancePhase();
        this.input.pressed = [];
        return;
      }
    }

    if (
      !this.movementOnly &&
      (this.phase === "courtyard" ||
        this.phase === "market" ||
        this.phase === "doorway")
    ) {
      if (pressed.has("fire") && held.has("aim")) this.attack("bow");
      else if (
        pressed.has("melee") ||
        (pressed.has("fire") && !held.has("aim"))
      )
        this.attack("melee");
    }

    const speed = held.has("aim") ? 3.2 : held.has("sprint") ? 6.5 : 4.5;
    if (!this.clientPositionMode) {
      const moved = moveWithCollision(
        this.player,
        { x: move.x * speed * dt, z: move.z * speed * dt },
        0.55,
        this.openDoorIds,
        this.doorProgress,
      );
      this.player.x = moved.x;
      this.player.y = moved.y ?? this.player.y;
      this.player.z = moved.z;
    }
    if (this.attackCooldown > 0) {
      if (this.player.state !== "fire" && this.player.state !== "melee")
        this.player.state = held.has("aim") ? "aim" : "attack";
    } else if (magnitude > 0.05)
      this.player.state = held.has("aim") ? "aim" : "locomotion";
    else this.player.state = held.has("aim") ? "aim" : "idle";
    this.input.pressed = [];
  }

  private attack(mode: "bow" | "melee"): void {
    if (this.attackCooldown > 0) return;
    const forward = this.forward();
    let target: EnemyState | undefined;
    let bestScore = Number.POSITIVE_INFINITY;
    let bestDistance = 0;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const dx = enemy.x - this.player.x;
      const dz = enemy.z - this.player.z;
      const distance = Math.hypot(dx, dz);
      const dot =
        distance > 0 ? (dx * forward.x + dz * forward.z) / distance : 1;
      // Match the visible client ray: arrows leave the bow at 1.42 m and
      // aimPitch describes its angle above the horizontal ground distance.
      const arrowHeightAtTarget =
        1.42 + Math.tan(this.input.aimPitch) * distance;
      const eligible =
        mode === "bow"
          ? distance <= 22 &&
            dot > 0.83 &&
            Math.abs(arrowHeightAtTarget - 1.1) <= 0.85
          : distance <= 2.8 && dot > 0.2;
      if (
        !eligible ||
        segmentBlocked(
          this.player,
          enemy,
          this.openDoorIds,
          this.doorProgress,
        )
      )
        continue;
      // Mirror the visible target-acquisition score. The server remains
      // authoritative, but a locked bracket must never describe one raider
      // while a nearer off-axis raider receives the hit.
      const angularError = Math.acos(Math.max(-1, Math.min(1, dot)));
      const heightError = Math.abs(arrowHeightAtTarget - 1.1);
      const score =
        mode === "bow"
          ? angularError * 5 + heightError * 0.42 + distance * 0.006
          : distance + (1 - dot) * 4;
      if (score < bestScore) {
        bestScore = score;
        bestDistance = distance;
        target = enemy;
      }
    }
    this.player.state = mode === "bow" ? "fire" : "melee";
    this.attackCooldown = mode === "bow" ? 0.75 : 0.42;
    let damage = 30;
    if (mode === "melee") {
      this.comboStep = this.comboRemaining > 0 ? 1 - this.comboStep : 0;
      damage = this.comboStep === 0 ? 24 : 32;
    }
    if (!target) return;
    this.pendingAttacks.push({
      mode,
      targetId: target.id,
      damage,
      remaining: mode === "bow" ? Math.max(0.08, bestDistance / 24) : 0.18,
      originX: this.player.x,
      originZ: this.player.z,
      aimYaw: this.player.yaw,
      aimPitch: this.input.aimPitch,
    });
  }

  private resolvePendingAttack(pending: PendingPlayerAttack): void {
    const target = this.enemies.find(
      (enemy) => enemy.id === pending.targetId && !enemy.dead,
    );
    if (!target) return;
    this.brainFor(target).playerAggro = true;
    if (pending.mode === "melee") {
      const origin = { x: pending.originX, z: pending.originZ };
      const dx = target.x - origin.x;
      const dz = target.z - origin.z;
      const distance = Math.hypot(dx, dz);
      const forward = this.forward(pending.aimYaw);
      const dot =
        distance > 0 ? (dx * forward.x + dz * forward.z) / distance : 1;
      if (
        distance > 2.8 ||
        dot <= 0.2 ||
        segmentBlocked(
          origin,
          target,
          this.openDoorIds,
          this.doorProgress,
        )
      )
        return;
    }
    target.health = Math.max(0, target.health - pending.damage);
    if (target.health === 0) target.dead = true;
    if (pending.mode === "melee") {
      if (pending.damage === 24) this.comboRemaining = 0.45;
      else {
        this.comboRemaining = 0;
        this.comboStep = 0;
      }
    }
  }

  private brainFor(enemy: EnemyState): EnemyBrain {
    const existing = this.enemyBrains.get(enemy.id);
    if (existing) return existing;
    const numericSuffix = Number(enemy.id.split("-").at(-1));
    const brain: EnemyBrain = {
      skirmisherMode: "approach",
      circleRemaining: 0,
      circleSign:
        Number.isFinite(numericSuffix) && numericSuffix % 2 === 1 ? -1 : 1,
      archerMode: "hold",
      playerAggro: false,
      blockedFor: 0,
      slideRemaining: 0,
      slideSign:
        Number.isFinite(numericSuffix) && numericSuffix % 2 === 1 ? -1 : 1,
    };
    this.enemyBrains.set(enemy.id, brain);
    return brain;
  }

  private separationSteering(enemy: EnemyState): Point {
    let x = 0;
    let z = 0;
    for (const other of this.enemies) {
      if (other === enemy || other.dead) continue;
      if (enemy.kind === "brute" && other.kind === "skirmisher") continue;
      const dx = enemy.x - other.x;
      const dz = enemy.z - other.z;
      const distance = Math.hypot(dx, dz);
      if (distance >= ENEMY_SEPARATION_DISTANCE) continue;
      const priority = other.kind === "brute" ? 1.5 : 1;
      const strength =
        ((ENEMY_SEPARATION_DISTANCE - distance) /
          ENEMY_SEPARATION_DISTANCE) *
        priority;
      if (distance > 0.0001) {
        x += (dx / distance) * strength;
        z += (dz / distance) * strength;
      } else {
        const first = enemy.id < other.id ? enemy.id : other.id;
        const second = enemy.id < other.id ? other.id : enemy.id;
        let hash = 0;
        for (const character of `${first}:${second}`)
          hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
        const angle = ((hash % 360) * Math.PI) / 180;
        const sign = enemy.id < other.id ? 1 : -1;
        x += Math.cos(angle) * strength * sign;
        z += Math.sin(angle) * strength * sign;
      }
    }
    return { x, z };
  }

  private turnEnemyToward(
    enemy: EnemyState,
    target: Point,
    dt: number,
  ): number {
    const desiredYaw = yawToward(enemy, target, enemy.yaw);
    const difference = angleDifference(desiredYaw, enemy.yaw);
    const maxTurn =
      (ENEMY_TURN_RATE_DEGREES[enemy.kind] * Math.PI * dt) / 180;
    const applied = Math.max(-maxTurn, Math.min(maxTurn, difference));
    enemy.yaw = angleDifference(enemy.yaw + applied, 0);
    return Math.abs(angleDifference(desiredYaw, enemy.yaw));
  }

  private enemyPlayerFacingError(enemy: EnemyState): number {
    return Math.abs(
      angleDifference(yawToward(enemy, this.player, enemy.yaw), enemy.yaw),
    );
  }

  private moveEnemy(
    enemy: EnemyState,
    desired: Point,
    dt: number,
    speed: number,
  ): void {
    const desiredMagnitude = Math.hypot(desired.x, desired.z);
    const brain = this.brainFor(enemy);
    let base =
      desiredMagnitude > 0.0001
        ? { x: desired.x / desiredMagnitude, z: desired.z / desiredMagnitude }
        : { x: 0, z: 0 };
    if (brain.slideRemaining > 0 && desiredMagnitude > 0.0001) {
      brain.slideRemaining = Math.max(0, brain.slideRemaining - dt);
      const tangent = {
        x: -base.z * brain.slideSign,
        z: base.x * brain.slideSign,
      };
      const slide = {
        x: base.x * 0.2 + tangent.x,
        z: base.z * 0.2 + tangent.z,
      };
      const slideMagnitude = Math.max(0.0001, Math.hypot(slide.x, slide.z));
      base = {
        x: slide.x / slideMagnitude,
        z: slide.z / slideMagnitude,
      };
    }
    const separation = this.separationSteering(enemy);
    let steer = {
      x: base.x + separation.x * 1.15,
      z: base.z + separation.z * 1.15,
    };
    const magnitude = Math.hypot(steer.x, steer.z);
    if (magnitude > 1)
      steer = { x: steer.x / magnitude, z: steer.z / magnitude };
    const step = speed * dt;
    let moved = moveWithCollision(
      enemy,
      { x: steer.x * step, z: steer.z * step },
      0.46,
      this.openDoorIds,
      this.doorProgress,
    );
    const progress = Math.hypot(moved.x - enemy.x, moved.z - enemy.z);
    if (desiredMagnitude > 0.0001 && progress < step * 0.2) {
      brain.blockedFor += dt;
      if (brain.blockedFor >= 0.5) {
        const target = { x: enemy.x + desired.x, z: enemy.z + desired.z };
        const detours = ([brain.slideSign, -brain.slideSign] as Array<
          -1 | 1
        >).map((sign) => {
          const tangent = { x: -base.z * sign, z: base.x * sign };
          const direction = {
            x: base.x * 0.2 + tangent.x,
            z: base.z * 0.2 + tangent.z,
          };
          const length = Math.max(0.0001, Math.hypot(direction.x, direction.z));
          const candidate = moveWithCollision(
            enemy,
            {
              x: (direction.x / length) * step,
              z: (direction.z / length) * step,
            },
            0.46,
            this.openDoorIds,
            this.doorProgress,
          );
          return {
            sign,
            candidate,
            progress: Math.hypot(candidate.x - enemy.x, candidate.z - enemy.z),
            remaining: Math.hypot(
              target.x - candidate.x,
              target.z - candidate.z,
            ),
          };
        });
        detours.sort(
          (a, b) => b.progress - a.progress || a.remaining - b.remaining,
        );
        if (detours[0].progress > progress) {
          brain.slideSign = detours[0].sign;
          brain.slideRemaining = 0.75;
          brain.blockedFor = 0;
          moved = detours[0].candidate;
        }
      }
    } else brain.blockedFor = 0;
    for (const other of this.enemies) {
      if (other === enemy || other.dead) continue;
      if (enemy.kind === "brute" && other.kind === "skirmisher") continue;
      let dx = moved.x - other.x;
      let dz = moved.z - other.z;
      let distance = Math.hypot(dx, dz);
      if (distance >= ENEMY_SEPARATION_DISTANCE) continue;
      if (distance < 0.0001) {
        dx = enemy.id < other.id ? -1 : 1;
        dz = 0;
        distance = 1;
      }
      const correction = ENEMY_SEPARATION_DISTANCE - distance;
      const separated = moveWithCollision(
        moved,
        {
          x: (dx / distance) * correction,
          z: (dz / distance) * correction,
        },
        0.46,
        this.openDoorIds,
        this.doorProgress,
      );
      if (
        Math.hypot(separated.x - other.x, separated.z - other.z) >
        Math.hypot(moved.x - other.x, moved.z - other.z)
      )
        moved = separated;
    }
    enemy.x = moved.x;
    enemy.y = moved.y ?? enemy.y;
    enemy.z = moved.z;
  }

  private familyApproachTarget(enemy: EnemyState, family: Point): Point {
    if (this.phase !== "doorway") return family;
    if (enemy.kind === "brute") return { x: family.x, z: family.z + 1.3 };
    if (enemy.kind !== "skirmisher") return family;
    const suffix = Number(enemy.id.split("-").at(-1));
    const side = Number.isFinite(suffix) && suffix % 2 === 0 ? -1 : 1;
    return { x: family.x + side * 1.8, z: family.z + 1.8 };
  }

  private moveSkirmisher(
    enemy: EnemyState,
    target: Point,
    playerTargeted: boolean,
    dt: number,
  ): void {
    const brain = this.brainFor(enemy);
    const dx = target.x - enemy.x;
    const dz = target.z - enemy.z;
    const distance = Math.max(0.001, Math.hypot(dx, dz));
    if (!playerTargeted) {
      brain.skirmisherMode = "approach";
      brain.circleRemaining = 0;
      if (distance > 1.2)
        this.moveEnemy(
          enemy,
          { x: dx, z: dz },
          dt,
          ENEMY_STATS.skirmisher.speed,
        );
      else
        this.moveEnemy(enemy, { x: 0, z: 0 }, dt, ENEMY_STATS.skirmisher.speed);
      return;
    }

    if (
      brain.skirmisherMode === "approach" &&
      distance <= SKIRMISHER_CIRCLE_DISTANCE
    ) {
      brain.skirmisherMode = "circle";
      brain.circleRemaining = SKIRMISHER_CIRCLE_SECONDS;
    }
    if (brain.skirmisherMode === "circle") {
      brain.circleRemaining = Math.max(0, brain.circleRemaining - dt);
      const inwardCorrection = Math.max(
        -0.7,
        Math.min(0.7, (distance - 2.15) * 0.9),
      );
      const toward = { x: dx / distance, z: dz / distance };
      const tangent = {
        x: -toward.z * brain.circleSign,
        z: toward.x * brain.circleSign,
      };
      this.moveEnemy(
        enemy,
        {
          x: tangent.x + toward.x * inwardCorrection,
          z: tangent.z + toward.z * inwardCorrection,
        },
        dt,
        ENEMY_STATS.skirmisher.speed,
      );
      if (brain.circleRemaining < 0.000001) {
        brain.circleRemaining = 0;
        brain.skirmisherMode = "strike";
      }
      return;
    }
    if (
      brain.skirmisherMode === "strike" &&
      distance <= ENEMY_STATS.skirmisher.range
    ) {
      this.moveEnemy(enemy, { x: 0, z: 0 }, dt, ENEMY_STATS.skirmisher.speed);
      return;
    }
    this.moveEnemy(enemy, { x: dx, z: dz }, dt, ENEMY_STATS.skirmisher.speed);
  }

  private moveArcher(
    enemy: EnemyState,
    playerDistance: number,
    blocked: boolean,
    dt: number,
  ): void {
    const brain = this.brainFor(enemy);
    if (playerDistance < ARCHER_RETREAT_START) brain.archerMode = "retreat";
    else if (
      brain.archerMode === "retreat" &&
      playerDistance >= ARCHER_RETREAT_STOP
    )
      brain.archerMode = "hold";
    else if (
      brain.archerMode !== "retreat" &&
      (playerDistance > Math.min(ENEMY_STATS.archer.range, 8.5) || blocked)
    )
      brain.archerMode = "advance";
    else if (
      brain.archerMode === "advance" &&
      playerDistance <= ARCHER_ADVANCE_STOP &&
      !blocked
    )
      brain.archerMode = "hold";

    if (brain.archerMode === "hold") {
      this.moveEnemy(enemy, { x: 0, z: 0 }, dt, ENEMY_STATS.archer.speed);
      return;
    }
    const direction = brain.archerMode === "retreat" ? -1 : 1;
    const dx = (this.player.x - enemy.x) * direction;
    const dz = (this.player.z - enemy.z) * direction;
    this.moveEnemy(enemy, { x: dx, z: dz }, dt, ENEMY_STATS.archer.speed);
  }

  private updateEnemies(dt: number): void {
    if (
      !this.encounterActive ||
      !(
        this.phase === "courtyard" ||
        this.phase === "market" ||
        this.phase === "doorway"
      )
    )
      return;
    const graceBeforeTick = this.combatGraceRemaining;
    this.combatGraceRemaining = Math.max(0, this.combatGraceRemaining - dt);
    if (this.combatGraceRemaining < 0.000001) this.combatGraceRemaining = 0;
    const familyPosition = FAMILY_POSITIONS[this.phase];
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const stats = ENEMY_STATS[enemy.kind];
      const warningBeforeTick = enemy.warning;
      if (graceBeforeTick <= 0)
        enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
      enemy.warning = Math.max(0, warningBeforeTick - dt);
      if (enemy.warning < 0.000001) enemy.warning = 0;
      const playerDistance = Math.hypot(
        this.player.x - enemy.x,
        this.player.z - enemy.z,
      );
      const familyDistance = Math.hypot(
        familyPosition.x - enemy.x,
        familyPosition.z - enemy.z,
      );
      if (
        graceBeforeTick <= 0 &&
        familyDistance < chapterConfig.feel.familyDangerRadius
      )
        this.family.dangerStarted = true;
      const brain = this.brainFor(enemy);
      const familyThreat = enemy.id === this.familyThreatId;
      if (
        (!familyThreat && playerDistance <= PLAYER_AGGRO_DISTANCE) ||
        (familyThreat && playerDistance <= FAMILY_THREAT_PLAYER_DISTANCE)
      )
        brain.playerAggro = true;
      const playerTargeted = brain.playerAggro;
      const target = playerTargeted
        ? this.player
        : this.familyApproachTarget(enemy, familyPosition);
      this.turnEnemyToward(
        enemy,
        warningBeforeTick > 0 ? this.player : target,
        dt,
      );
      const attackRange =
        enemy.kind === "archer" ? Math.min(stats.range, 8.5) : stats.range;
      const blocked = segmentBlocked(
        enemy,
        this.player,
        this.openDoorIds,
        this.doorProgress,
      );
      if (warningBeforeTick <= 0) {
        if (enemy.kind === "archer")
          this.moveArcher(enemy, playerDistance, blocked, dt);
        else if (enemy.kind === "skirmisher")
          this.moveSkirmisher(enemy, target, playerTargeted, dt);
        else {
          const targetDistance = Math.hypot(
            target.x - enemy.x,
            target.z - enemy.z,
          );
          if (playerDistance > attackRange || blocked) {
            this.moveEnemy(
              enemy,
              targetDistance > 1.2
                ? { x: target.x - enemy.x, z: target.z - enemy.z }
                : { x: 0, z: 0 },
              dt,
              stats.speed,
            );
          } else this.moveEnemy(enemy, { x: 0, z: 0 }, dt, stats.speed);
        }
        const distanceAfterMove = Math.hypot(
          this.player.x - enemy.x,
          this.player.z - enemy.z,
        );
        const blockedAfterMove = segmentBlocked(
          enemy,
          this.player,
          this.openDoorIds,
          this.doorProgress,
        );
        if (
          distanceAfterMove <= attackRange &&
          !blockedAfterMove &&
          this.enemyPlayerFacingError(enemy) <= ATTACK_START_ARC &&
          enemy.attackCooldown <= 0 &&
          this.combatGraceRemaining <= 0
        ) {
          enemy.warning = stats.windup;
          enemy.attackCooldown =
            stats.windup + (enemy.kind === "brute" ? 1.9 : 1.35);
          if (enemy.kind === "skirmisher") {
            brain.skirmisherMode = "strike";
            brain.circleRemaining = 0;
          }
        }
      }
      const warningFinished = warningBeforeTick > 0 && enemy.warning === 0;
      const impactDistance = Math.hypot(
        this.player.x - enemy.x,
        this.player.z - enemy.z,
      );
      if (
        warningFinished &&
        impactDistance <= attackRange + 0.4 &&
        !segmentBlocked(
          enemy,
          this.player,
          this.openDoorIds,
          this.doorProgress,
        ) &&
        this.enemyPlayerFacingError(enemy) <= ATTACK_IMPACT_ARC &&
        this.player.invulnerable <= 0
      ) {
        this.player.health = Math.max(0, this.player.health - stats.damage);
        this.pendingAttacks = this.pendingAttacks.filter(
          (pending) => pending.mode === "bow",
        );
        this.hitReactionRemaining = 0.25;
        this.player.state = this.player.health === 0 ? "down" : "hit";
        if (this.player.health === 0) this.downRemaining = 0.85;
      }
    }

    if (this.enemies.length > 0 && this.enemies.every((enemy) => enemy.dead)) {
      this.family.safe = true;
      if (this.encounterCompleteRemaining <= 0)
        this.encounterCompleteRemaining = 0.85;
      else {
        this.encounterCompleteRemaining = Math.max(
          0,
          this.encounterCompleteRemaining - dt,
        );
        if (this.encounterCompleteRemaining < 0.000001) {
          this.encounterCompleteRemaining = 0;
          this.advancePhase();
        }
      }
      return;
    }
    if (this.family.dangerStarted && graceBeforeTick <= 0) {
      this.family.remaining = Math.max(0, this.family.remaining - dt);
      if (this.family.remaining === 0) this.restart("family");
    }
    if (this.player.health === 0 && this.downRemaining <= 0)
      this.downRemaining = 0.85;
  }

  private restart(reason: "down" | "family"): void {
    if (this.restartReason) return;
    const phase = this.phase;
    this.restartReason = reason;
    this.loadPhase(phase);
    this.events.push({ type: "phase.restarted", phase, reason });
  }

  private advancePhase(): void {
    const completedPhase = this.phase;
    const following = nextPhase(completedPhase);
    if (following === completedPhase) return;
    this.events.push({
      type: "phase.completed",
      completedPhase,
      nextPhase: following,
    });
    this.loadPhase(following, {
      resetPlayer: false,
      activateEncounter: false,
    });
  }

  private activateEncounterAtRegionEntry(): void {
    if (
      this.encounterActive ||
      !(
        this.phase === "courtyard" ||
        this.phase === "market" ||
        this.phase === "doorway"
      )
    )
      return;
    const checkpoint = CHECKPOINTS[this.phase];
    if (
      Math.abs(this.player.x - checkpoint.x) > 6 ||
      Math.abs(this.player.z - checkpoint.z) > 6
    )
      return;
    this.encounterActive = true;
    this.family.active = true;
    this.family.dangerStarted = true;
    this.combatGraceRemaining = INITIAL_PLAYER_GRACE;
  }

  tick(dt = 0.05): void {
    if (this.paused || this.phase === "complete" || this.phase === "ending")
      return;
    const safeDt = Math.min(0.05, Math.max(0, dt));
    this.tickNumber += 1;
    if (!this.doorsExternallyDriven) this.updateDoors(safeDt);
    if (this.player.health === 0 || this.downRemaining > 0) {
      if (this.downRemaining <= 0) this.downRemaining = 0.85;
      this.downRemaining = Math.max(0, this.downRemaining - safeDt);
      this.player.state = "down";
      this.pendingAttacks = [];
      this.input = { ...this.input, move: [0, 0], held: [], pressed: [] };
      if (this.downRemaining < 0.000001) {
        this.downRemaining = 0;
        this.restart("down");
      }
      return;
    }
    this.updatePlayer(safeDt);
    if (!this.movementOnly) {
      this.activateEncounterAtRegionEntry();
      this.updateEnemies(safeDt);
    }
  }

  drainEvents(): SimulationEvent[] {
    return this.events.splice(0);
  }

  snapshot() {
    return {
      type: "snapshot",
      serverTick: this.tickNumber,
      phase: this.phase,
      phaseLabel: PHASE_LABEL[this.phase],
      phaseEpoch: this.phaseEpoch,
      paused: this.paused,
      player: { ...this.player },
      enemies: this.enemies.map((enemy) => ({ ...enemy })),
      family: { ...this.family },
      doors: DOORS.map((door) => ({
        id: door.id,
        progress: this.doorProgress[door.id] ?? 0,
        open: this.openDoorIds.has(door.id),
      })),
      positionCorrection: this.positionCorrection,
    };
  }
}
