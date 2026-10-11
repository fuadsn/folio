import * as T from "three";
import { landHeight, type VehicleState } from "./vehicles";
import type { Terrain } from "./terrain";

/** Small, bounded pools: no particles or GPU allocations per animation frame. */
export class DriftEffects {
  group = new T.Group();
  smokeGeometry = new T.IcosahedronGeometry(1, 1);
  smoke = Array.from({ length: 40 }, () => {
    const mesh = new T.Mesh(
      this.smokeGeometry,
      new T.MeshBasicMaterial({
        color: "#e9dfcc",
        transparent: true,
        depthWrite: false,
        opacity: 0,
      }),
    );
    mesh.visible = false;
    this.group.add(mesh);
    return { mesh, age: 2, vx: 0, vz: 0 };
  });
  positions = new Float32Array(256 * 6);
  markAges = new Float32Array(256).fill(15);
  marks = new T.LineSegments(
    new T.BufferGeometry(),
    new T.LineBasicMaterial({
      color: "#342d28",
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    }),
  );
  previous: T.Vector3[] | null = null;
  smokeIndex = 0;
  markIndex = 0;
  clock = 0;
  constructor(private scene: T.Scene) {
    this.marks.geometry.setAttribute(
      "position",
      new T.BufferAttribute(this.positions, 3).setUsage(T.DynamicDrawUsage),
    );
    this.marks.frustumCulled = false;
    this.group.add(this.marks);
    scene.add(this.group);
  }
  tick(
    dt: number,
    state: VehicleState | null,
    terrain: Terrain,
    scale: [number, number, number] = [1, 1, 1],
  ) {
    let dirty = false;
    for (const p of this.smoke) {
      p.age += dt;
      p.mesh.visible = p.age < 1.35;
      if (!p.mesh.visible) continue;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.position.y += 0.5 * dt;
      p.mesh.scale.setScalar(0.1 + p.age * 0.5);
      p.mesh.material.opacity = (1 - p.age / 1.35) * 0.34;
    }
    for (let i = 0; i < this.markAges.length; i++) {
      const age = this.markAges[i];
      this.markAges[i] += dt;
      if (age < 14 && this.markAges[i] >= 14) {
        this.positions.fill(0, i * 6, i * 6 + 6);
        dirty = true;
      }
    }
    this.clock += dt;
    if (state?.drifting && this.clock >= 0.045) {
      this.clock = 0;
      const wheels = [-0.84, 0.84].map((side) => {
        const x =
          state.x +
          Math.cos(state.yaw) * side * scale[0] -
          Math.sin(state.yaw) * scale[2];
        const z =
          state.z -
          Math.sin(state.yaw) * side * scale[0] -
          Math.cos(state.yaw) * scale[2];
        const ground = landHeight(terrain, x, z);
        return ground === null || ground < terrain.waterLevel
          ? null
          : new T.Vector3(x, ground + 0.045, z);
      });
      wheels.forEach((wheel, i) => {
        if (!wheel) return;
        const puff = this.smoke[this.smokeIndex++ % this.smoke.length];
        puff.age = 0;
        puff.mesh.position.copy(wheel);
        puff.mesh.visible = true;
        puff.mesh.scale.setScalar(0.1);
        puff.mesh.material.opacity = 0.34;
        puff.vx = -Math.sin(state.travelYaw) * 0.6;
        puff.vz = -Math.cos(state.travelYaw) * 0.6;
        const prev = this.previous?.[i];
        if (prev && prev.distanceTo(wheel) < 3) {
          const idx = this.markIndex++ % this.markAges.length;
          this.positions.set([...prev.toArray(), ...wheel.toArray()], idx * 6);
          this.markAges[idx] = 0;
          dirty = true;
        }
      });
      this.previous = wheels.every(Boolean) ? (wheels as T.Vector3[]) : null;
    } else if (!state?.drifting) this.previous = null;
    if (dirty) this.marks.geometry.attributes.position.needsUpdate = true;
  }
  reset() {
    this.previous = null;
    this.clock = 0;
    this.positions.fill(0);
    this.markAges.fill(15);
    this.marks.geometry.attributes.position.needsUpdate = true;
    for (const p of this.smoke) {
      p.age = 2;
      p.mesh.visible = false;
    }
  }
  dispose() {
    this.scene.remove(this.group);
    this.smokeGeometry.dispose();
    this.smoke.forEach((p) => p.mesh.material.dispose());
    this.marks.geometry.dispose();
    this.marks.material.dispose();
  }
}
