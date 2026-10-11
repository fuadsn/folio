import { z } from "zod";
import { terrainHeight, type Terrain } from "./terrain";
import type { World, WorldObject } from "./world";
import { travelLimit } from "./world-size";

export const vehicleKinds = ["car", "driftcar", "boat", "plane"] as const;
export type VehicleKind = (typeof vehicleKinds)[number];
export const vehicleSchema = z.object({
  enabled: z.boolean().default(true),
  speed: z.number().min(0.5).max(2).default(1),
  handling: z.number().min(0.5).max(2).default(1),
  grip: z.number().min(0.35).max(1.5).default(1),
});
export function isVehicle(kind: string): kind is VehicleKind {
  return (vehicleKinds as readonly string[]).includes(kind);
}
export function isCar(kind: string) {
  return kind === "car" || kind === "driftcar";
}
export type VehicleState = {
  id: string;
  kind: VehicleKind;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  pitch: number;
  roll: number;
  airborne: boolean;
  travelYaw: number;
  drifting: boolean;
  driftAngle: number;
  driftScore: number;
  driftChain: number;
  bestDrift: number;
};
export type VehicleHUD = {
  active: {
    id: string;
    name: string;
    kind: VehicleKind;
    speed: number;
    altitude: number;
    airborne: boolean;
    drifting: boolean;
    driftAngle: number;
    driftScore: number;
    driftChain: number;
    bestDrift: number;
  } | null;
  nearby: { id: string; name: string; kind: VehicleKind } | null;
  message: string;
};
export const emptyVehicleHUD: VehicleHUD = {
  active: null,
  nearby: null,
  message: "",
};
export const TRAVEL_LIMIT = 58;
export const MAX_FLIGHT_HEIGHT = 96;

export function landHeight(t: Terrain, x: number, z: number): number | null {
  return Math.abs(x) <= t.width / 2 && Math.abs(z) <= t.depth / 2
    ? terrainHeight(t, x, z)
    : null;
}
export function surfaceHeight(t: Terrain, x: number, z: number) {
  return Math.max(landHeight(t, x, z) ?? t.waterLevel, t.waterLevel);
}
export function isWater(t: Terrain, x: number, z: number, radius = 0) {
  return [
    [0, 0],
    [radius, 0],
    [-radius, 0],
    [0, radius],
    [0, -radius],
  ].every(([dx, dz]) => {
    const height = landHeight(t, x + dx, z + dz);
    return height === null || height < t.waterLevel - 0.12;
  });
}
export function isLand(t: Terrain, x: number, z: number, radius = 0) {
  return [
    [0, 0],
    [radius, 0],
    [-radius, 0],
    [0, radius],
    [0, -radius],
  ].every(([dx, dz]) => {
    const height = landHeight(t, x + dx, z + dz);
    return height !== null && height >= t.waterLevel + 0.02;
  });
}
export function objectGround(
  t: Terrain,
  object: WorldObject,
  x = object.position[0],
  z = object.position[2],
) {
  return object.kind === "boat"
    ? surfaceHeight(t, x, z)
    : (landHeight(t, x, z) ?? t.waterLevel);
}
export function initialVehicle(
  object: WorldObject,
  terrain: Terrain,
): VehicleState {
  if (!isVehicle(object.kind)) throw new Error("Not a vehicle");
  return {
    id: object.id,
    kind: object.kind,
    x: object.position[0],
    y: objectGround(terrain, object),
    z: object.position[2],
    yaw: (object.rotation * Math.PI) / 180,
    speed: 0,
    pitch: 0,
    roll: 0,
    airborne: false,
    travelYaw: (object.rotation * Math.PI) / 180,
    drifting: false,
    driftAngle: 0,
    driftScore: 0,
    driftChain: 0,
    bestDrift: 0,
  };
}

/** Find a sensible editor placement without changing any other objects. */
export function vehiclePlacement(
  world: World,
  kind: VehicleKind,
): [number, number, number] {
  const t = world.terrain;
  const free = (x: number, z: number) =>
    !world.objects.some(
      (o) =>
        Math.hypot(o.position[0] - x, o.position[2] - z) <
        (kind === "plane" ? 3 : 2.4),
    );
  const candidates: [number, number, number][] = [];
  const limit = travelLimit(t) - 4;
  const step = Math.max(1, Math.floor(Math.max(t.width, t.depth) / 64));
  for (let z = -limit; z <= limit; z += step)
    for (let x = -limit; x <= limit; x += step) {
      if (
        kind === "boat"
          ? !isWater(t, x, z, 1.8)
          : !isLand(t, x, z, kind === "plane" ? 1.8 : 1)
      )
        continue;
      if (!free(x, z)) continue;
      candidates.push([x, 0, z]);
    }
  const [sx, sz] = world.character.spawn;
  candidates.sort(
    (a, b) =>
      Math.hypot(a[0] - sx, a[2] - sz) - Math.hypot(b[0] - sx, b[2] - sz),
  );
  return candidates[0] ?? [0, 0, 0];
}

export type VehicleInput = {
  throttle: number;
  steer: number;
  climb: number;
  boost: boolean;
  brake: boolean;
  handbrake?: boolean;
};
export type VehicleObstacle = (
  x: number,
  z: number,
  y: number,
  radius: number,
  ignore: string,
) => boolean;
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const approach = (n: number, target: number, amount: number) =>
  n < target ? Math.min(target, n + amount) : Math.max(target, n - amount);
const angleDifference = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** Pure arcade simulation. Runtime positions never mutate the saved world. */
export function stepVehicle(
  current: VehicleState,
  object: WorldObject,
  t: Terrain,
  input: VehicleInput,
  elapsed: number,
  blocked: VehicleObstacle = () => false,
): { state: VehicleState; message: string; reset: boolean } {
  const s = { ...current },
    dt = clamp(elapsed, 0, 0.05),
    settings = vehicleSchema.parse(object.vehicle ?? {});
  const plane = s.kind === "plane",
    boat = s.kind === "boat",
    car = isCar(s.kind);
  const maxSpeed =
    (plane ? 18 : boat ? 9 : s.kind === "driftcar" ? 16 : 12) *
    settings.speed *
    (input.boost ? 1.35 : 1);
  const accel = plane ? 6 : boat ? 4 : s.kind === "driftcar" ? 10 : 8;
  if (input.brake) s.speed = approach(s.speed, 0, dt * 18);
  else if (input.throttle > 0) s.speed += accel * dt;
  else if (input.throttle < 0) s.speed -= (s.speed > 0 ? 12 : accel * 0.6) * dt;
  else
    s.speed = approach(
      s.speed,
      0,
      dt * (plane && s.airborne ? 0.04 : boat ? 0.65 : 2.5),
    );
  s.speed = clamp(s.speed, plane ? 0 : -maxSpeed * 0.33, maxSpeed);
  const handbrake = car && !!input.handbrake && !input.brake && s.speed > 3;
  if (car && input.handbrake)
    s.speed = approach(s.speed, 0, dt * (handbrake ? 1.8 : 8));
  const turning = clamp(Math.abs(s.speed) / 3, boat ? 0.15 : 0, 1);
  s.yaw +=
    input.steer *
    (plane ? 1.1 : boat ? 1.3 : handbrake ? 2.4 : 1.8) *
    settings.handling *
    turning *
    dt *
    (s.speed < 0 ? -1 : 1);
  s.yaw = Math.atan2(Math.sin(s.yaw), Math.cos(s.yaw));
  // Body heading and travel heading are independent: reduced rear grip keeps
  // momentum going sideways while steering rotates the car into the corner.
  if (car && Math.abs(s.speed) > 0.5) {
    const grip = (input.brake ? 18 : handbrake ? 0.95 : 14) * settings.grip;
    s.travelYaw +=
      angleDifference(s.yaw, s.travelYaw) * (1 - Math.exp(-grip * dt));
    s.travelYaw = s.yaw - clamp(angleDifference(s.yaw, s.travelYaw), -1.1, 1.1);
  } else s.travelYaw = s.yaw;
  s.driftAngle = car ? angleDifference(s.yaw, s.travelYaw) : 0;
  const radius = clamp(
    (boat ? 0.7 : 0.75) * Math.max(object.scale[0], object.scale[2]),
    0.3,
    3.5,
  );
  let message = "",
    reset = false;
  if (plane && input.climb > 0 && s.speed >= 4) s.airborne = true;
  const dy =
    plane && s.airborne ? (s.speed < 4 ? -3 : input.climb * 4.5) * dt : 0;
  const steps = Math.max(1, Math.ceil(Math.abs(s.speed * dt) / 0.2));
  for (let i = 0; i < steps; i++) {
    const x = s.x + (Math.sin(s.travelYaw) * s.speed * dt) / steps;
    const z = s.z + (Math.cos(s.travelYaw) * s.speed * dt) / steps;
    let y = s.y + dy / steps;
    if (Math.abs(x) > travelLimit(t) || Math.abs(z) > travelLimit(t)) {
      s.speed = 0;
      message = "World boundary — turn back toward your island.";
      break;
    }
    if (boat) {
      if (!isWater(t, x, z, 1.8 * Math.max(object.scale[0], object.scale[2]))) {
        s.speed = 0;
        message = "Shallow water — steer away from the shore.";
        break;
      }
      y = t.waterLevel;
    } else if (!plane || !s.airborne) {
      if (!isLand(t, x, z, radius)) {
        s.speed = 0;
        message = "Stay on dry land.";
        break;
      }
      y = landHeight(t, x, z)!;
      // Roads are decorative. Cars can cross any dry biome and climb sculpted
      // hills, but not sheer cliffs. A distance-based limit also prevents slow
      // throttle from inching up a cliff one frame at a time.
      const maxRise = car
        ? Math.abs((s.speed * dt) / steps) * 2.5 + 0.0001
        : Math.abs((s.speed * dt) / steps) * 1.4 + 0.08;
      if (Math.abs(y - s.y) > maxRise) {
        s.speed = 0;
        message = "Too steep — try a gentler route.";
        break;
      }
    } else {
      const surface = surfaceHeight(t, x, z);
      if (y <= surface) {
        if (!isLand(t, x, z, radius) || s.speed > 10) {
          reset = true;
          message = "Rough landing! Your plane is back at its starting spot.";
          break;
        }
        y = surface;
        s.airborne = false;
      }
      y = Math.min(MAX_FLIGHT_HEIGHT, y);
    }
    if (blocked(x, z, y, radius, s.id)) {
      if (plane && s.airborne) {
        reset = true;
        message = "Bumpy flight! Your plane is back at its starting spot.";
      } else {
        s.speed = 0;
        message = "Something is in the way. Reverse and steer around it.";
      }
      break;
    }
    s.x = x;
    s.y = y;
    s.z = z;
  }
  if (plane) {
    s.pitch = s.airborne ? -input.climb * 0.18 : 0;
    s.roll = s.airborne ? -input.steer * 0.3 * turning : 0;
  } else if (!boat) {
    const halfLength = 1.2 * object.scale[2],
      halfWidth = 0.8 * object.scale[0],
      forwardX = Math.sin(s.yaw),
      forwardZ = Math.cos(s.yaw);
    const front =
      landHeight(t, s.x + forwardX * halfLength, s.z + forwardZ * halfLength) ??
      s.y;
    const rear =
      landHeight(t, s.x - forwardX * halfLength, s.z - forwardZ * halfLength) ??
      s.y;
    const right =
      landHeight(t, s.x + forwardZ * halfWidth, s.z - forwardX * halfWidth) ??
      s.y;
    const left =
      landHeight(t, s.x - forwardZ * halfWidth, s.z + forwardX * halfWidth) ??
      s.y;
    s.pitch = clamp(-Math.atan2(front - rear, halfLength * 2), -1.2, 1.2);
    s.roll = clamp(
      Math.atan2(right - left, halfWidth * 2) - s.driftAngle * 0.08,
      -1.2,
      1.2,
    );
  }
  const distance = Math.hypot(s.x - current.x, s.z - current.z);
  s.drifting =
    car &&
    !input.brake &&
    s.speed > 3 &&
    Math.abs(s.driftAngle) > 0.24 &&
    distance > 0.001;
  if (s.drifting) {
    const points = distance * Math.abs(s.driftAngle) * 20;
    s.driftChain += points;
    s.driftScore += points;
    s.bestDrift = Math.max(s.bestDrift, s.driftChain);
  } else s.driftChain = 0;
  if (!s.speed) {
    s.travelYaw = s.yaw;
    s.driftAngle = 0;
  }
  return { state: reset ? initialVehicle(object, t) : s, message, reset };
}

export function exitVehiclePosition(
  state: VehicleState,
  terrain: Terrain,
  blocked: (x: number, z: number) => boolean,
): [number, number, number] | null {
  if (Math.abs(state.speed) > 0.8 || state.airborne) return null;
  for (const radius of [2.3, 3, 4, 5, 6])
    for (let i = 0; i < 24; i++) {
      const angle = state.yaw + Math.PI / 2 + (i * Math.PI) / 12;
      const x = state.x + Math.sin(angle) * radius,
        z = state.z + Math.cos(angle) * radius;
      if (isLand(terrain, x, z, 0.35) && !blocked(x, z))
        return [x, terrainHeight(terrain, x, z), z];
    }
  return null;
}
