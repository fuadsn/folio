import * as T from "three";
import { npcSchema, type Npc } from "./npc";
import {
  objectDetailsSchema,
  type Kind,
  type Blueprint,
  type ObjectDetails,
} from "./world";

export function model(
  kind: Kind,
  color: string,
  details: ObjectDetails = objectDetailsSchema.parse({}),
  npc: Npc = npcSchema.parse({}),
): T.Group {
  const cream = details.body ?? "#f2e8d6",
    dark = details.trim ?? "#354a4b",
    wood = details.wood ?? "#a77c5e";
  const g = new T.Group();
  const material = (c: string) =>
    new T.MeshStandardMaterial({
      color: c,
      roughness: 0.86,
      flatShading: true,
    });
  const mesh = (geo: T.BufferGeometry, c: string, x = 0, y = 0, z = 0) => {
    const m = new T.Mesh(geo, material(c));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  const box = (
    w: number,
    h: number,
    d: number,
    c: string,
    x = 0,
    y = 0,
    z = 0,
  ) => mesh(new T.BoxGeometry(w, h, d), c, x, y, z);
  const sphere = (r: number, c: string, x = 0, y = 0, z = 0) =>
    mesh(new T.IcosahedronGeometry(r, 1), c, x, y, z);
  const cyl = (
    rt: number,
    rb: number,
    h: number,
    c: string,
    x = 0,
    y = 0,
    z = 0,
    n = 10,
  ) => mesh(new T.CylinderGeometry(rt, rb, h, n), c, x, y, z);
  const roof = (w: number, h: number, d: number, c: string, y: number) => {
    const height = details.roofStyle === "flat" ? 0.22 : h * details.roofHeight;
    const m =
      details.roofStyle === "flat"
        ? box(w * 1.42, height, d * 1.42, c, 0, y - h / 2 + height / 2)
        : mesh(
            new T.ConeGeometry(
              w,
              height,
              details.roofStyle === "spire" ? 12 : 4,
            ),
            c,
            0,
            y - h / 2 + height / 2,
            0,
          );
    if (details.roofStyle !== "flat") {
      m.rotation.y = Math.PI / 4;
      m.scale.z = d / w;
    }
    return m;
  };
  const window = (x: number, y: number, z: number, w = 0.52, h = 0.62) => {
    box(w + 0.13, h + 0.13, 0.13, cream, x, y, z);
    box(w, h, 0.15, "#769a9e", x, y, z + 0.02);
    box(0.055, h, 0.16, cream, x, y, z + 0.03);
  };
  const door = (z: number) => {
    box(0.72, 1.32, 0.16, dark, 0, 0.7, z);
    sphere(0.055, "#e5bc73", 0.2, 0.65, z + 0.11);
  };
  const planter = (x: number, z: number) => {
    box(0.5, 0.34, 0.48, "#b88465", x, 0.17, z);
    sphere(0.36, "#668665", x, 0.46, z);
  };
  switch (kind) {
    case "npc": {
      box(0.5, 0.64, 0.35, color, 0, 0.91);
      sphere(0.26, npc.skin, 0, 1.49);
      for (const x of [-0.09, 0.09]) sphere(0.027, "#2a1a0e", x, 1.53, 0.23);
      for (const x of [-0.14, 0.14]) {
        box(0.19, 0.46, 0.22, dark, x, 0.37);
        box(0.23, 0.15, 0.35, "#2a1a0e", x, 0.075, 0.05);
      }
      for (const x of [-0.36, 0.36]) {
        const arm = box(0.16, 0.5, 0.2, color, x, 0.86);
        const hand = sphere(0.105, npc.skin, x, 0.57);
        if (x > 0) {
          arm.userData.waveOffset = -0.25;
          hand.userData.waveOffset = -0.54;
        }
      }
      if (npc.hatStyle !== "none") {
        cyl(0.23, 0.28, 0.22, npc.hat, 0, 1.74, 0, 12);
        if (npc.hatStyle === "cap") box(0.4, 0.05, 0.24, npc.hat, 0, 1.65, 0.23);
        else sphere(0.09, npc.hat, 0, 1.91);
      }
      break;
    }
    case "kiosk": {
      box(1.4, 0.15, 0.9, dark, 0, 0.075);
      box(0.3, 1.05, 0.35, color, 0, 0.6);
      box(1.8, 1.2, 0.22, color, 0, 1.6);
      box(1.56, 0.97, 0.03, "#243f46", 0, 1.6, 0.13);
      box(0.5, 0.58, 0.03, "#f4ae52", -0.41, 1.65, 0.16);
      for (let i = 0; i < 3; i++) box(0.65 - i * 0.1, 0.06, 0.03, cream, 0.27, 1.86 - i * 0.21, 0.16);
      box(0.48, 0.1, 0.03, "#87c6b0", 0.22, 1.28, 0.16);
      break;
    }
    case "garage": {
      box(5.4, 0.18, 4.4, dark, 0, 0.09);
      box(5, 2.8, 4, cream, 0, 1.58);
      box(5.5, 0.25, 4.5, color, 0, 3.1);
      box(3.7, 2.25, 0.08, dark, 0, 1.34, 2.04);
      for (let i = 0; i < 7; i++) box(3.5, 0.2, 0.08, "#829190", 0, 0.44 + i * 0.27, 2.1);
      box(2.3, 0.3, 0.12, color, 0, 2.73, 2.09);
      for (const x of [-2.25, 2.25]) box(0.18, 0.42, 0.15, "#f4ae52", x, 2.4, 2.09);
      break;
    }
    case "picnic": {
      box(2.4, 0.14, 1.1, color, 0, 0.95);
      for (const z of [-0.9, 0.9]) box(2.5, 0.12, 0.35, color, 0, 0.52, z);
      for (const x of [-0.8, 0.8]) {
        for (const z of [-0.75, 0.75]) box(0.13, 0.48, 0.13, dark, x, 0.24, z);
        box(0.16, 0.85, 0.16, dark, x, 0.44);
      }
      break;
    }
    case "campfire": {
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        sphere(0.2, "#827e74", Math.cos(a) * 0.7, 0.2, Math.sin(a) * 0.7);
      }
      box(0.25, 0.2, 1.1, wood, 0, 0.2).rotation.y = 0.65;
      box(0.25, 0.2, 1.1, wood, 0, 0.32).rotation.y = -0.65;
      cyl(0, 0.35, 0.85, "#d4621a", 0, 0.7, 0, 6);
      cyl(0, 0.22, 0.65, color, 0, 0.67, 0.1, 5);
      break;
    }
    case "crate": {
      box(1.1, 1.1, 1.1, color, 0, 0.55);
      for (const x of [-0.43, 0.43]) box(0.12, 1.16, 1.16, wood, x, 0.58);
      for (const y of [0.12, 1.02]) box(1.16, 0.12, 1.16, dark, 0, y);
      break;
    }
    case "driftcar": {
      const trim = details.trim ?? "#292323",
        glass = "#47636a",
        rim = details.body ?? "#e7d4b3";
      box(1.8, 0.38, 3.35, color, 0, 0.55);
      box(1.92, 0.15, 3.55, trim, 0, 0.32);
      box(1.64, 0.09, 1.15, trim, 0, 0.78, 1.05).rotation.x = -0.06;
      box(1.4, 0.37, 1.26, color, 0, 0.93, -0.25);
      box(1.26, 0.32, 0.05, glass, 0, 0.96, 0.39).rotation.x = -0.4;
      box(1.27, 0.29, 0.05, glass, 0, 0.93, -0.89).rotation.x = 0.35;
      box(1.44, 0.07, 0.9, trim, 0, 1.14, -0.24);
      for (const x of [-0.73, 0.73]) {
        box(0.045, 0.26, 0.91, glass, x, 0.96, -0.23);
        box(0.03, 0.3, 0.07, trim, x * 1.01, 0.94, -0.31);
        box(0.28, 0.09, 0.16, trim, x * 1.2, 0.86, 0.3);
        box(0.06, 0.17, 2.5, trim, x * 1.24, 0.5);
        box(0.055, 0.12, 0.8, color, x * 1.3, 0.61, -0.85).rotation.x = 0.17;
      }
      for (const x of [-0.92, 0.92])
        for (const z of [-1.08, 1.08]) {
          box(0.25, 0.1, 0.92, color, x * 0.91, 0.74, z);
          const wheel = cyl(0.31, 0.31, 0.27, trim, x, 0.31, z, 16);
          wheel.rotation.z = Math.PI / 2;
          wheel.userData.wheel = true;
          const hub = cyl(0.22, 0.22, 0.29, rim, x * 1.01, 0.31, z, 8);
          hub.rotation.z = Math.PI / 2;
          hub.userData.wheel = true;
          box(0.29, 0.04, 0.4, trim, x * 1.02, 0.31, z);
        }
      for (const x of [-0.61, 0.61]) {
        box(0.4, 0.11, 0.06, "#fff1cc", x, 0.63, 1.71);
        box(0.46, 0.1, 0.05, "#f05436", x, 0.62, -1.71);
        box(0.08, 0.37, 0.11, trim, x, 0.93, -1.48);
      }
      box(2.08, 0.1, 0.38, trim, 0, 1.15, -1.5);
      for (const x of [-1, 1]) box(0.06, 0.2, 0.4, color, x, 1.19, -1.5);
      box(0.83, 0.16, 0.05, trim, 0, 0.49, 1.75);
      box(0.5, 0.14, 0.05, rim, 0, 0.49, -1.76);
      const exhaust = cyl(0.09, 0.09, 0.28, "#96989a", -0.65, 0.3, -1.77, 12);
      exhaust.rotation.x = Math.PI / 2;
      break;
    }
    case "car": {
      box(1.55, 0.48, 2.65, color, 0, 0.7);
      box(1.38, 0.62, 1.25, cream, 0, 1.22, -0.15);
      box(1.2, 0.4, 0.04, "#7ba7ae", 0, 1.25, 0.49).rotation.x = -0.12;
      box(1.2, 0.36, 0.04, "#7ba7ae", 0, 1.25, -0.8);
      for (const x of [-0.7, 0.7])
        box(0.03, 0.4, 0.94, "#7ba7ae", x, 1.25, -0.15);
      box(1.5, 0.12, 0.13, cream, 0, 0.54, 1.38);
      box(1.5, 0.12, 0.13, dark, 0, 0.54, -1.38);
      for (const x of [-0.53, 0.53]) {
        box(0.3, 0.19, 0.05, "#ffe3a5", x, 0.8, 1.35);
        box(0.25, 0.14, 0.05, "#b74b37", x, 0.8, -1.35);
        for (const z of [-0.83, 0.83]) {
          const wheel = cyl(
            0.36,
            0.36,
            0.24,
            dark,
            x < 0 ? -0.82 : 0.82,
            0.36,
            z,
            12,
          );
          wheel.rotation.z = Math.PI / 2;
          wheel.userData.wheel = true;
          const hub = cyl(
            0.17,
            0.17,
            0.26,
            cream,
            x < 0 ? -0.83 : 0.83,
            0.36,
            z,
            12,
          );
          hub.rotation.z = Math.PI / 2;
          hub.userData.wheel = true;
        }
      }
      box(1.45, 0.1, 1.1, color, 0, 1.58, -0.15);
      break;
    }
    case "boat": {
      const hull = cyl(0.63, 1, 0.48, color, 0, 0.24, 0, 6);
      hull.rotation.x = Math.PI;
      hull.scale.set(0.83, 1, 1.75);
      box(1.22, 0.14, 2.25, cream, 0, 0.48);
      box(0.12, 0.3, 2.15, color, -0.65, 0.64);
      box(0.12, 0.3, 2.15, color, 0.65, 0.64);
      box(1.22, 0.22, 0.42, cream, 0, 0.64, -0.5);
      box(1.1, 0.5, 0.09, "#7ba7ae", 0, 0.85, 0.5).rotation.x = -0.22;
      box(1.14, 0.05, 0.1, dark, 0, 1.1, 0.44);
      box(0.42, 0.63, 0.42, dark, 0, 0.43, -1.37);
      const prop = box(0.68, 0.09, 0.06, cream, 0, 0.2, -1.62);
      prop.userData.propeller = true;
      break;
    }
    case "plane": {
      const fuselage = cyl(0.17, 0.4, 3.3, color, 0, 0.94, -0.1, 10);
      fuselage.rotation.x = -Math.PI / 2;
      const cockpit = sphere(0.48, "#7ba7ae", 0, 1.18, 0.25);
      cockpit.scale.set(0.7, 0.7, 1.1);
      box(4.6, 0.12, 0.87, color, 0, 0.94, 0.15);
      for (const x of [-2, 2]) box(0.25, 0.13, 0.9, cream, x, 0.94, 0.15);
      box(1.7, 0.1, 0.62, cream, 0, 0.98, -1.4);
      box(0.12, 0.65, 0.62, color, 0, 1.26, -1.4);
      const nose = cyl(0.4, 0.4, 0.2, cream, 0, 0.94, 1.6);
      nose.rotation.x = Math.PI / 2;
      const prop = box(0.12, 1.55, 0.08, dark, 0, 0.94, 1.76);
      prop.userData.propeller = true;
      for (const x of [-0.65, 0.65]) {
        box(0.08, 0.65, 0.08, dark, x, 0.59, 0.4);
        const wheel = cyl(0.28, 0.28, 0.18, dark, x, 0.28, 0.4, 12);
        wheel.rotation.z = Math.PI / 2;
        wheel.userData.wheel = true;
      }
      box(0.07, 0.55, 0.07, dark, 0, 0.55, -1.4);
      sphere(0.16, dark, 0, 0.3, -1.4);
      break;
    }
    case "house": {
      box(3.2, 0.22, 2.9, "#ddcfb7", 0, 0.11);
      box(2.8, 2.15, 2.4, cream, 0, 1.25);
      roof(2.35, 1.5, 1.95, color, 2.98);
      box(0.42, 0.9, 0.48, wood, 0.8, 3.25, -0.4);
      door(1.24);
      window(-0.92, 1.65, 1.25);
      window(0.93, 1.65, 1.25);
      box(1.25, 0.16, 0.6, "#bca78b", 0, 0.12, 1.48);
      planter(-1.15, 1.6);
      planter(1.15, 1.6);
      break;
    }
    case "gallery": {
      box(4, 0.25, 3, "#e5d8c5", 0, 0.125);
      box(3.7, 2.25, 2.65, cream, 0, 1.36);
      box(4.1, 0.3, 3, color, 0, 2.55);
      box(3.6, 0.12, 2.5, "#e5d8c5", 0, 2.74);
      door(1.35);
      for (const x of [-1.3, 1.3]) {
        box(0.13, 2.15, 0.17, color, x, 1.2, 1.4);
        window(x * 0.74, 1.45, 1.35, 0.63, 0.95);
      }
      box(2.4, 0.42, 0.13, "#fff9ec", 0, 2.12, 1.39);
      box(4.3, 0.13, 0.7, "#ccbda5", 0, 0.14, 1.63);
      break;
    }
    case "tower": {
      cyl(1.15, 1.3, 0.3, "#d1c5af", 0, 0.15);
      cyl(0.86, 1.0, 4.2, cream, 0, 2.3, 0, 8);
      cyl(1.15, 1.15, 0.28, color, 0, 4.4, 0, 8);
      cyl(1.04, 1.04, 1, color, 0, 4.99, 0, 8);
      roof(1.45, 1.5, 1.45, dark, 6.1);
      door(1);
      window(0, 3, 0.91, 0.35, 0.7);
      break;
    }
    case "observatory": {
      cyl(1.75, 1.9, 0.28, "#c3c8ba", 0, 0.14);
      cyl(1.5, 1.5, 2, cream, 0, 1.26, 0, 16);
      mesh(
        new T.SphereGeometry(1.6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        color,
        0,
        2.22,
      );
      door(1.53);
      const telescope = cyl(0.18, 0.22, 1.6, dark, 0.6, 3.6, 0.35);
      telescope.rotation.z = -0.8;
      window(-0.88, 1.5, 1.26, 0.4, 0.55);
      break;
    }
    case "cafe": {
      box(3.3, 0.2, 2.6, "#ddd0b9", 0, 0.1);
      box(3, 2, 2.3, cream, 0, 1.2);
      box(3.4, 0.24, 2.6, color, 0, 2.32);
      door(1.18);
      for (let i = 0; i < 7; i++) {
        const m = box(
          0.46,
          0.12,
          0.9,
          i % 2 ? cream : color,
          -1.38 + i * 0.46,
          1.98,
          1.55,
        );
        m.rotation.x = 0.18;
      }
      window(-0.95, 1.2, 1.2, 0.63, 0.75);
      window(0.95, 1.2, 1.2, 0.63, 0.75);
      cyl(0.55, 0.55, 0.1, wood, 2.2, 0.9, 1.25);
      cyl(0.08, 0.08, 0.9, dark, 2.2, 0.45, 1.25);
      cyl(0.28, 0.28, 0.12, color, 2.9, 0.5, 1.25);
      cyl(0.06, 0.06, 0.5, dark, 2.9, 0.25, 1.25);
      break;
    }
    case "arch": {
      for (const x of [-1.35, 1.35]) {
        box(0.48, 2.7, 0.55, cream, x, 1.35);
        box(0.7, 0.2, 0.75, color, x, 0.1);
        box(0.7, 0.18, 0.75, color, x, 2.6);
      }
      box(3.3, 0.5, 0.6, color, 0, 2.95);
      box(3.55, 0.15, 0.8, cream, 0, 3.24);
      break;
    }
    case "tree": {
      cyl(0.15, 0.24, 1.7, wood, 0, 0.85);
      sphere(1.1, color, 0, 2.2);
      sphere(0.65, color, 0.62, 2.5, 0.1);
      sphere(0.65, "#91b58c", -0.45, 2.35, 0.25);
      break;
    }
    case "pine": {
      cyl(0.13, 0.2, 1.2, wood, 0, 0.6);
      cyl(0, 1.1, 1.9, color, 0, 1.8, 0, 7);
      cyl(0, 0.86, 1.8, color, 0, 2.7, 0, 7);
      cyl(0, 0.56, 1.4, "#699c83", 0, 3.45, 0, 7);
      break;
    }
    case "palm": {
      const trunk = cyl(0.12, 0.23, 2.6, wood, 0, 1.3);
      trunk.rotation.z = 0.12;
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const leaf = sphere(
          0.65,
          color,
          Math.cos(a) * 0.65,
          2.9,
          Math.sin(a) * 0.65,
        );
        leaf.scale.set(1.8, 0.22, 0.7);
        leaf.rotation.y = -a;
        leaf.rotation.z = -0.2;
      }
      break;
    }
    case "rock":
      sphere(0.65, color, 0, 0.4);
      sphere(0.37, "#c5c6b8", 0.65, 0.25, 0.28);
      sphere(0.27, color, -0.6, 0.15, 0.3);
      break;
    case "flowers":
      for (let i = 0; i < 9; i++) {
        const x = Math.sin(i * 2.4) * 0.7,
          z = Math.cos(i * 2.4) * 0.6;
        cyl(0.025, 0.025, 0.3, "#719173", x, 0.15, z, 4);
        sphere(0.13, i % 3 ? color : "#f5d58b", x, 0.4, z);
      }
      break;
    case "pond": {
      const p = cyl(1.45, 1.65, 0.14, "#cecbb5", 0, 0.07, 0, 16);
      p.scale.z = 0.72;
      const water = cyl(1.35, 1.35, 0.08, color, 0, 0.16, 0, 20);
      water.scale.z = 0.7;
      sphere(0.3, "#a2aca0", 1.05, 0.3, 0.5);
      break;
    }
    case "bench": {
      for (const x of [-0.75, 0.75]) {
        box(0.14, 0.65, 0.6, dark, x, 0.325);
        box(0.12, 1.25, 0.1, dark, x, 0.625, -0.25);
      }
      for (let i = 0; i < 3; i++)
        box(1.95, 0.13, 0.17, color, 0, 0.69, -0.17 + i * 0.2);
      box(1.95, 0.25, 0.12, color, 0, 1.1, -0.25);
      break;
    }
    case "lamp":
      cyl(0.18, 0.25, 0.16, dark, 0, 0.08);
      cyl(0.055, 0.08, 2.45, dark, 0, 1.28);
      box(0.45, 0.6, 0.45, color, 0, 2.65);
      roof(0.48, 0.35, 0.48, dark, 3.08);
      break;
    case "sign": {
      for (const x of [-0.73, 0.73]) box(0.14, 1.7, 0.15, wood, x, 0.85);
      box(1.9, 1.2, 0.2, color, 0, 1.7);
      box(1.68, 0.94, 0.05, cream, 0, 1.7, 0.13);
      for (let i = 0; i < 3; i++)
        box(
          1.15 - i * 0.15,
          0.05,
          0.06,
          "#958e7e",
          -0.05,
          1.95 - i * 0.21,
          0.17,
        );
      break;
    }
    case "mailbox":
      box(0.16, 1.2, 0.18, wood, 0, 0.6);
      box(0.72, 0.6, 0.65, color, 0, 1.5);
      roof(0.61, 0.38, 0.61, color, 1.96);
      box(0.43, 0.07, 0.04, dark, 0, 1.59, 0.345);
      box(0.1, 0.4, 0.04, "#e7b674", 0.41, 1.62, 0.1);
      break;
    case "flag":
      cyl(0.06, 0.06, 2.8, wood, 0, 1.4);
      box(0.85, 0.58, 0.06, color, 0.46, 2.36);
      cyl(0.25, 0.3, 0.15, "#d1c5af", 0, 0.075);
      break;
    case "cube":
      box(1.7, 1.7, 1.7, color, 0, 0.85);
      break;
    case "sphere":
      sphere(1, color, 0, 1);
      break;
    case "cone":
      cyl(0, 1.2, 2.4, color, 0, 1.2);
      break;
    case "platform":
      box(3, 0.3, 3, color, 0, 0.15);
      break;
    case "custom": {
      const wire = box(1.6, 1.6, 1.6, color, 0, 0.8);
      (wire.material as T.MeshStandardMaterial).wireframe = true;
      break;
    }
  }
  if (["tree", "pine", "palm"].includes(kind)) {
    const trunk = g.children[0];
    const trunkBaseHeight = kind === "tree" ? 1.7 : kind === "pine" ? 1.2 : 2.6;
    trunk.scale.y *= details.trunkHeight;
    trunk.position.y *= details.trunkHeight;
    const snow = details.snow ?? 0;
    g.children.slice(1).forEach((child) => {
      child.position.y += trunkBaseHeight * (details.trunkHeight - 1);
      child.scale.multiplyScalar(details.foliage);
      if (child instanceof T.Mesh)
        (child.material as T.MeshStandardMaterial).color.lerp(
          new T.Color("#eef5fb"),
          snow,
        );
    });
  }
  return g;
}

/** Turn the built-in geometry into editable, serializable primitives. */
export function modelParts(
  kind: Kind,
  color: string,
  details: ObjectDetails,
  npc?: Npc,
): Blueprint["parts"] {
  const group = model(kind, color, details, npc);
  const parts: Blueprint["parts"] = [];
  group.children.forEach((child, index) => {
    if (!(child instanceof T.Mesh)) return;
    const geo = child.geometry;
    let shape: Blueprint["parts"][number]["shape"] = "box";
    let size: [number, number, number] = [1, 1, 1];
    let taper: number | undefined, segments: number | undefined;
    if (geo instanceof T.BoxGeometry)
      size = [
        geo.parameters.width,
        geo.parameters.height,
        geo.parameters.depth,
      ];
    else if (geo instanceof T.ConeGeometry) {
      shape = "cone";
      size = [
        geo.parameters.radius * 2,
        geo.parameters.height,
        geo.parameters.radius * 2,
      ];
      segments = geo.parameters.radialSegments;
    } else if (geo instanceof T.CylinderGeometry) {
      shape = geo.parameters.radiusTop === 0 ? "cone" : "cylinder";
      const p = geo.parameters;
      size = [p.radiusBottom * 2, p.height, p.radiusBottom * 2];
      taper = p.radiusTop / p.radiusBottom;
      segments = p.radialSegments;
    } else if (geo instanceof T.IcosahedronGeometry) {
      shape = "icosahedron";
      size = [
        geo.parameters.radius * 2,
        geo.parameters.radius * 2,
        geo.parameters.radius * 2,
      ];
    } else if (geo instanceof T.SphereGeometry) {
      shape = geo.parameters.thetaLength < Math.PI ? "dome" : "sphere";
      size = [
        geo.parameters.radius * 2,
        geo.parameters.radius * 2,
        geo.parameters.radius * 2,
      ];
    }
    parts.push({
      name: `Piece ${index + 1}`,
      shape,
      size: size.map(
        (n, i) => +Math.max(0.02, n * child.scale.getComponent(i)).toFixed(4),
      ) as [number, number, number],
      position: child.position.toArray(),
      rotation: [child.rotation.x, child.rotation.y, child.rotation.z].map(
        (n) => +T.MathUtils.radToDeg(n).toFixed(3),
      ) as [number, number, number],
      color: `#${(child.material as T.MeshStandardMaterial).color.getHexString()}`,
      taper,
      segments,
    });
  });
  disposeObject(group);
  return parts;
}

export function labelSprite(text: string, color = "#334944") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 104;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fffdf7";
  ctx.beginPath();
  ctx.roundRect(4, 4, 504, 96, 28);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = "600 46px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.slice(0, 28), 256, 52, 465);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const sprite = new T.Sprite(
    new T.SpriteMaterial({ map: texture, depthTest: false }),
  );
  sprite.scale.set(3.8, 0.78, 1);
  sprite.renderOrder = 100;
  return sprite;
}

export function disposeObject(object: T.Object3D) {
  object.traverse((child) => {
    if (child instanceof T.Mesh) {
      child.geometry?.dispose();
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const mat of mats) mat.dispose();
    } else if (child instanceof T.Sprite) {
      child.material.map?.dispose();
      child.material.dispose();
    }
  });
}

export function blueprintModel(parts: Blueprint["parts"]) {
  const group = new T.Group();
  for (const p of parts) {
    let geometry: T.BufferGeometry;
    switch (p.shape) {
      case "sphere":
        geometry = new T.SphereGeometry(0.5, 14, 10);
        break;
      case "cylinder":
        geometry = new T.CylinderGeometry(
          0.5 * (p.taper ?? 1),
          0.5,
          1,
          p.segments ?? 12,
        );
        break;
      case "cone":
        geometry = new T.ConeGeometry(0.5, 1, p.segments ?? 12);
        break;
      case "dome":
        geometry = new T.SphereGeometry(
          0.5,
          20,
          12,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2,
        );
        break;
      case "icosahedron":
        geometry = new T.IcosahedronGeometry(0.5, 1);
        break;
      case "roof":
        geometry = new T.ConeGeometry(0.71, 1, 4);
        geometry.rotateY(Math.PI / 4);
        break;
      case "torus":
        geometry = new T.TorusGeometry(0.4, 0.1, 8, 20);
        break;
      default:
        geometry = new T.BoxGeometry(1, 1, 1);
    }
    const mesh = new T.Mesh(
      geometry,
      new T.MeshStandardMaterial({
        color: p.color,
        flatShading: true,
        roughness: 0.8,
      }),
    );
    mesh.position.fromArray(p.position);
    mesh.scale.fromArray(p.size);
    mesh.rotation.set(
      ...(p.rotation.map(T.MathUtils.degToRad) as [number, number, number]),
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
