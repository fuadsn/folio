import * as T from "three";
import type { Character } from "./terrain";

export function avatar(c: Character) {
  const group = new T.Group();
  const add = (
    geo: T.BufferGeometry,
    color: string,
    x: number,
    y: number,
    z = 0,
    parent: T.Object3D = group,
  ) => {
    const mesh = new T.Mesh(
      geo,
      new T.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true }),
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  add(new T.CapsuleGeometry(0.25, 0.35, 4, 8), c.coat, 0, 0.84);
  add(new T.SphereGeometry(0.25, 12, 10), c.skin, 0, 1.4);
  for (const x of [-0.085, 0.085])
    add(new T.SphereGeometry(0.026, 8, 6), "#2a1a0e", x, 1.44, 0.23);
  add(new T.BoxGeometry(0.3, 0.38, 0.18), "#786047", 0, 0.9, -0.25);
  if (c.hatStyle !== "none") {
    add(
      new T.SphereGeometry(0.265, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      c.hat,
      0,
      1.46,
    );
    add(new T.CylinderGeometry(0.27, 0.27, 0.1, 12), c.hat, 0, 1.49);
    if (c.hatStyle === "beanie")
      add(new T.IcosahedronGeometry(0.1, 1), c.hat, 0, 1.77);
    else add(new T.BoxGeometry(0.42, 0.05, 0.25), c.hat, 0, 1.49, 0.24);
  }
  const limbs: T.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.position.set(side * 0.14, 0.55, 0);
    add(new T.CapsuleGeometry(0.1, 0.25, 3, 6), "#4e4036", 0, -0.2, 0, leg);
    add(new T.BoxGeometry(0.22, 0.15, 0.34), "#2a1a0e", 0, -0.47, 0.055, leg);
    group.add(leg);
    limbs.push(leg);
    const arm = new T.Group();
    arm.position.set(side * 0.31, 1.08, 0);
    add(new T.CapsuleGeometry(0.09, 0.25, 3, 6), c.coat, 0, -0.2, 0, arm);
    add(new T.SphereGeometry(0.095, 8, 6), c.skin, 0, -0.4, 0, arm);
    group.add(arm);
    limbs.push(arm);
  }
  group.userData.limbs = limbs;
  return group;
}

export function animateAvatar(group: T.Group, moving: boolean, time: number) {
  const limbs = group.userData.limbs as T.Group[] | undefined;
  limbs?.forEach((limb, i) => {
    limb.rotation.x = moving
      ? Math.sin(time * 11) * 0.55 * ([0, 3].includes(i) ? 1 : -1)
      : 0;
  });
}
