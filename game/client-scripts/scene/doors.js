export function doorVisualPose(door, progress, assetDimensions = {}) {
  const asset = assetDimensions[door.entity] || {};
  const width = (door.width ?? asset.width ?? 0) * (door.scale ?? 1);
  const closedYaw = door.yaw || 0;
  const clamped = Math.max(0, Math.min(1, Number(progress) || 0));
  const openYaw = closedYaw + clamped * 92 * (door.swingDirection || 1);
  const closedRadians = (closedYaw * Math.PI) / 180;
  const openRadians = (openYaw * Math.PI) / 180;
  const halfWidth = width / 2;
  const [x, y, z] = door.position;
  const hingeX = x - Math.cos(closedRadians) * halfWidth;
  const hingeZ = z + Math.sin(closedRadians) * halfWidth;
  return {
    x: hingeX + Math.cos(openRadians) * halfWidth,
    y,
    z: hingeZ - Math.sin(openRadians) * halfWidth,
    yaw: openYaw,
  };
}

function authoritativeDoorProgress(doorState) {
  if (doorState?.open === true) return 1;
  const progress = Number(doorState?.progress);
  return Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
}

export function installDoors(rt) {
  const { state } = rt;
  const doors = rt.DOORS;
  const assets = rt.WORLD_LAYOUT.doorAssets || {};

  function findDoor(entityName, position) {
    return doors.find(
      (door) =>
        door.entity === entityName &&
        Math.hypot(
          door.position[0] - position[0],
          door.position[1] - position[1],
          door.position[2] - position[2],
        ) < 0.08,
    );
  }

  function registerDoorEntity(entity, entityName, position) {
    const door = findDoor(entityName, position);
    if (!door) return false;
    entity.dwarkaDoorId = door.id;
    entity.dwarkaDynamicDoor = Boolean(door.openFromPhase);
    state.doorEntities.set(door.id, {
      door,
      entity,
      progress: 0,
      opening: false,
    });
    if (!door.openFromPhase) return true;
    const snapshotState = state.snapshot?.doors?.find(
      ({ id }) => id === door.id,
    );
    if (snapshotState) {
      const record = state.doorEntities.get(door.id);
      record.progress = authoritativeDoorProgress(snapshotState);
      record.opening = record.progress > 0 && record.progress < 1;
      const pose = doorVisualPose(door, record.progress, assets);
      entity.setPosition(pose.x, entity.getPosition().y, pose.z);
      entity.setEulerAngles(0, pose.yaw, 0);
    }
    return true;
  }

  function unregisterDoorEntity(entity) {
    if (!entity?.dwarkaDoorId) return;
    const current = state.doorEntities.get(entity.dwarkaDoorId);
    if (current?.entity === entity)
      state.doorEntities.delete(entity.dwarkaDoorId);
  }

  function updateDoorPresentation(snapshot) {
    const doorStates = new Map(
      (snapshot?.doors || []).map((door) => [door.id, door]),
    );
    for (const [id, record] of state.doorEntities) {
      if (!record.entity?.parent) {
        state.doorEntities.delete(id);
        continue;
      }
      const authoritative = doorStates.get(id);
      record.progress = authoritativeDoorProgress(authoritative);
      record.opening = record.progress > 0 && record.progress < 1;
      const pose = doorVisualPose(record.door, record.progress, assets);
      const currentY = record.entity.getPosition().y;
      record.entity.setPosition(pose.x, currentY, pose.z);
      record.entity.setEulerAngles(0, pose.yaw, 0);
    }
  }

  rt.registerDoorEntity = registerDoorEntity;
  rt.unregisterDoorEntity = unregisterDoorEntity;
  rt.updateDoorPresentation = updateDoorPresentation;
  rt.doorVisualPose = doorVisualPose;
}
