import * as T from "three";
import type { Kind, Blueprint } from "./world";

const cream = "#f2e8d6",
  dark = "#354a4b",
  wood = "#a77c5e";
export function model(kind: Kind, color: string): T.Group {
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
    const m = mesh(new T.ConeGeometry(w, h, 4), c, 0, y, 0);
    m.rotation.y = Math.PI / 4;
    m.scale.z = d / w;
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
  return g;
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
        geometry = new T.CylinderGeometry(0.5, 0.5, 1, 12);
        break;
      case "cone":
        geometry = new T.ConeGeometry(0.5, 1, 12);
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
