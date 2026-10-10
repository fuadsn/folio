import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { model, labelSprite, disposeObject, blueprintModel } from "./models";
import type { World, WorldObject } from "./world";

type Callbacks = {
  select: (id: string | null) => void;
  transform: (id: string, patch: Partial<WorldObject>) => void;
  open: (id: string) => void;
  near: (id: string | null) => void;
  error: (message: string) => void;
};
export class WorldScene {
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(38, 1, 0.1, 160);
  renderer: T.WebGLRenderer;
  orbit: OrbitControls;
  gizmo: TransformControls;
  objects = new T.Group();
  land = new T.Group();
  selection = new T.BoxHelper(new T.Group(), 0x8a70be);
  player = new T.Group();
  ray = new T.Raycaster();
  pointer = new T.Vector2();
  previousFrame = performance.now();
  keys = new Set<string>();
  world: World | null = null;
  selected: string | null = null;
  playing = false;
  snapping = true;
  nearId: string | null = null;
  disposed = false;
  frozen = false;
  sun = new T.DirectionalLight("#fff4dd", 3);
  ambient = new T.HemisphereLight("#f8f7f0", "#859480", 2.5);
  modelCache = new Map<string, T.Group>();
  pendingModels = new Set<string>();
  observer: ResizeObserver;
  frame = 0;
  down = [0, 0];
  grid: T.GridHelper;
  constructor(
    public mount: HTMLDivElement,
    public cb: Callbacks,
  ) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    mount.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Interactive 3D portfolio world",
    );
    this.renderer.domElement.tabIndex = 0;
    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enableDamping = true;
    this.orbit.minDistance = 9;
    this.orbit.maxDistance = 80;
    this.orbit.maxPolarAngle = Math.PI / 2.25;
    this.orbit.mouseButtons = {
      LEFT: T.MOUSE.ROTATE,
      MIDDLE: T.MOUSE.DOLLY,
      RIGHT: T.MOUSE.PAN,
    };
    this.camera.position.set(28, 30, 36);
    this.orbit.target.set(0, 0, 0);
    this.orbit.update();
    this.sun.position.set(-15, 28, 15);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -26;
    this.sun.shadow.camera.right = 26;
    this.sun.shadow.camera.top = 26;
    this.sun.shadow.camera.bottom = -26;
    this.sun.shadow.normalBias = 0.045;
    this.scene.add(this.ambient, this.sun, this.objects, this.land);
    this.selection.visible = false;
    this.scene.add(this.selection);
    this.gizmo = new TransformControls(this.camera, this.renderer.domElement);
    this.gizmo.setSize(0.78);
    this.scene.add(this.gizmo.getHelper());
    this.gizmo.addEventListener("dragging-changed", (e) => {
      this.orbit.enabled = !e.value && !this.playing;
    });
    this.gizmo.addEventListener("objectChange", () => this.selection.update());
    this.gizmo.addEventListener("mouseUp", () => {
      const o = this.gizmo.object;
      if (!o || !this.selected) return;
      const clamp = T.MathUtils.clamp;
      this.cb.transform(this.selected, {
        position: [
          clamp(o.position.x, -24, 24),
          clamp(o.position.y, 0, 15),
          clamp(o.position.z, -24, 24),
        ],
        rotation: ((T.MathUtils.radToDeg(o.rotation.y) % 360) + 360) % 360,
        scale: [
          clamp(o.scale.x, 0.2, 5),
          clamp(o.scale.y, 0.2, 5),
          clamp(o.scale.z, 0.2, 5),
        ],
      });
    });
    this.grid = new T.GridHelper(48, 48, "#a7b199", "#a7b199");
    this.grid.position.y = 0.012;
    (this.grid.material as T.Material).transparent = true;
    (this.grid.material as T.Material).opacity = 0.14;
    this.scene.add(this.grid);
    const body = new T.Mesh(
      new T.CapsuleGeometry(0.23, 0.38, 4, 8),
      new T.MeshStandardMaterial({ color: "#8a78b8" }),
    );
    body.position.y = 0.65;
    body.castShadow = true;
    this.player.add(body);
    const head = new T.Mesh(
      new T.SphereGeometry(0.23, 12, 8),
      new T.MeshStandardMaterial({ color: "#edc5a2" }),
    );
    head.position.y = 1.18;
    head.castShadow = true;
    this.player.add(head);
    const hat = new T.Mesh(
      new T.CylinderGeometry(0.24, 0.28, 0.17, 12),
      new T.MeshStandardMaterial({ color: "#66527f" }),
    );
    hat.position.y = 1.37;
    this.player.add(hat);
    for (const x of [-0.14, 0.14]) {
      const foot = new T.Mesh(
        new T.BoxGeometry(0.16, 0.18, 0.28),
        new T.MeshStandardMaterial({ color: "#3d3b4b" }),
      );
      foot.position.set(x, 0.12, 0);
      this.player.add(foot);
    }
    this.player.position.set(0, 0, 6);
    this.player.visible = false;
    this.scene.add(this.player);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(mount);
    this.resize();
    this.renderer.domElement.addEventListener("pointerdown", this.onDown);
    this.renderer.domElement.addEventListener("pointerup", this.onUp);
    window.addEventListener("keydown", this.keyDown);
    window.addEventListener("keyup", this.keyUp);
    window.addEventListener("blur", this.clearKeys);
    this.animate();
  }
  resize() {
    const w = this.mount.clientWidth,
      h = this.mount.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  onDown = (e: PointerEvent) => {
    this.down = [e.clientX, e.clientY];
  };
  onUp = (e: PointerEvent) => {
    if (
      e.button !== 0 ||
      Math.hypot(e.clientX - this.down[0], e.clientY - this.down[1]) > 5 ||
      this.gizmo.axis
    )
      return;
    this.setPointer(e.clientX, e.clientY);
    const hits = this.ray.intersectObjects(this.objects.children, true);
    let o: T.Object3D | undefined = hits[0]?.object;
    while (o && !o.userData.objectId) o = o.parent ?? undefined;
    if (this.playing) {
      if (
        o &&
        this.world?.objects.find((x) => x.id === o!.userData.objectId)?.role !==
          "none"
      )
        this.cb.open(o.userData.objectId);
    } else this.cb.select(o?.userData.objectId ?? null);
  };
  setPointer(x: number, y: number) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((x - r.left) / r.width) * 2 - 1,
      (-(y - r.top) / r.height) * 2 + 1,
    );
    this.ray.setFromCamera(this.pointer, this.camera);
  }
  groundAt(x: number, y: number): [number, number, number] {
    this.setPointer(x, y);
    const point = new T.Vector3();
    this.ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), point);
    return [
      T.MathUtils.clamp(Math.round(point.x), -23, 23),
      0,
      T.MathUtils.clamp(Math.round(point.z), -23, 23),
    ];
  }
  keyDown = (e: KeyboardEvent) => {
    if (
      !this.playing ||
      this.frozen ||
      /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)
    )
      return;
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
    )
      e.preventDefault();
    this.keys.add(e.key.toLowerCase());
    if ((e.key === "e" || e.key === "Enter") && this.nearId)
      this.cb.open(this.nearId);
  };
  keyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
  clearKeys = () => this.keys.clear();
  setWorld(world: World) {
    this.world = world;
    const sky =
      world.lighting === "night"
        ? "#242c40"
        : world.lighting === "sunset"
          ? "#f2cebd"
          : world.sky;
    this.scene.background = new T.Color(sky);
    this.scene.fog = new T.Fog(sky, 65, 125);
    this.sun.intensity =
      world.lighting === "night" ? 0.5 : world.lighting === "sunset" ? 2.4 : 3;
    this.ambient.intensity = world.lighting === "night" ? 1 : 2.5;
    this.sun.color.set(world.lighting === "sunset" ? "#ffae79" : "#fff4dd");
    this.gizmo.detach();
    while (this.land.children.length) {
      const c = this.land.children[0];
      disposeObject(c);
      this.land.remove(c);
    }
    const terrain = (geo: T.BufferGeometry, color: string, y: number) => {
      const m = new T.Mesh(
        geo,
        new T.MeshStandardMaterial({ color, roughness: 0.95 }),
      );
      m.position.y = y;
      m.receiveShadow = true;
      this.land.add(m);
      return m;
    };
    terrain(new T.BoxGeometry(31, 0.7, 28), "#d6c2a1", -0.5);
    terrain(new T.BoxGeometry(30.8, 0.16, 27.8), world.ground, -0.08);
    const sea = terrain(new T.PlaneGeometry(240, 240), world.water, -1.6);
    sea.rotation.x = -Math.PI / 2;
    const p1 = terrain(new T.BoxGeometry(2.4, 0.05, 25), "#e4dbc4", 0.024);
    const p2 = terrain(new T.BoxGeometry(20, 0.05, 2.3), "#e4dbc4", 0.025);
    p2.position.z = 0.3;
    const square = terrain(
      new T.CylinderGeometry(3, 3, 0.06, 32),
      "#e9dfc9",
      0.028,
    );
    square.position.z = 0.3;
    while (this.objects.children.length) {
      const c = this.objects.children[0];
      if (!c.userData.imported) disposeObject(c);
      else
        c.children
          .filter((child) => child instanceof T.Sprite)
          .forEach(disposeObject);
      this.objects.remove(c);
    }
    for (const object of world.objects) {
      const group = new T.Group();
      group.userData.objectId = object.id;
      group.position.fromArray(object.position);
      group.rotation.y = T.MathUtils.degToRad(object.rotation);
      group.scale.fromArray(object.scale);
      if (object.parts?.length) {
        group.add(blueprintModel(object.parts));
      } else if (
        object.kind === "custom" &&
        object.asset &&
        this.modelCache.has(object.asset)
      ) {
        group.add(this.modelCache.get(object.asset)!.clone(true));
        group.userData.imported = true;
      } else {
        group.add(model(object.kind, object.color));
        if (object.kind === "custom" && object.asset)
          this.loadModel(object.asset);
      }
      if (object.role !== "none") {
        const bounds = new T.Box3().setFromObject(group.children[0]);
        const label = labelSprite(object.name);
        label.position.set(0, bounds.max.y + 0.65, 0);
        group.add(label);
      }
      this.objects.add(group);
    }
    this.select(this.selected);
  }
  async loadModel(id: string) {
    if (this.pendingModels.has(id) || this.disposed) return;
    this.pendingModels.add(id);
    try {
      const gltf = await new GLTFLoader().loadAsync(`/api/assets/${id}`);
      if (this.disposed) {
        disposeObject(gltf.scene);
        return;
      }
      const bounds = new T.Box3().setFromObject(gltf.scene);
      const size = bounds.getSize(new T.Vector3());
      const scale = 3 / Math.max(size.x, size.y, size.z, 0.01);
      gltf.scene.position.sub(bounds.getCenter(new T.Vector3()));
      gltf.scene.position.y -=
        bounds.min.y - bounds.getCenter(new T.Vector3()).y;
      const wrapper = new T.Group();
      wrapper.add(gltf.scene);
      wrapper.scale.setScalar(scale);
      wrapper.traverse((c) => {
        if (c instanceof T.Mesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      this.modelCache.set(id, wrapper);
      if (this.world) this.setWorld(this.world);
    } catch {
      this.cb.error(
        "A custom model could not load. Its placeholder stays in the world; re-upload it to retry.",
      );
    }
  }
  select(id: string | null) {
    this.selected = id;
    const target = this.objects.children.find(
      (o) => o.userData.objectId === id,
    );
    this.gizmo.detach();
    this.selection.visible = !!target && !this.playing;
    if (target && !this.playing) {
      this.selection.setFromObject(target);
      this.gizmo.attach(target);
    }
    this.setSnap(this.snapping);
  }
  setTool(mode: "translate" | "rotate" | "scale") {
    this.gizmo.setMode(mode);
    this.gizmo.showX = mode !== "rotate";
    this.gizmo.showY = true;
    this.gizmo.showZ = mode !== "rotate";
  }
  setSnap(on: boolean) {
    this.snapping = on;
    this.gizmo.setTranslationSnap(on ? 0.5 : null);
    this.gizmo.setRotationSnap(on ? Math.PI / 12 : null);
    this.gizmo.setScaleSnap(on ? 0.1 : null);
  }
  setPlay(play: boolean) {
    this.playing = play;
    this.keys.clear();
    this.player.visible = play;
    this.orbit.enabled = !play;
    this.grid.visible = !play;
    if (play) {
      this.gizmo.detach();
      this.selection.visible = false;
      this.player.position.set(0, 0, 6);
    } else {
      this.reset();
      this.select(this.selected);
    }
  }
  reset(top = false) {
    this.camera.position.set(top ? 0 : 28, top ? 48 : 30, top ? 0.01 : 36);
    this.orbit.target.set(0, 0, 0);
    this.orbit.update();
  }
  zoom(factor: number) {
    this.camera.position
      .sub(this.orbit.target)
      .multiplyScalar(factor)
      .add(this.orbit.target);
    this.orbit.update();
  }
  collides(x: number, z: number) {
    return this.world?.objects.some((o) => {
      if (
        ![
          "house",
          "gallery",
          "cafe",
          "tower",
          "observatory",
          "tree",
          "pine",
          "custom",
        ].includes(o.kind)
      )
        return false;
      const radius = ["tree", "pine"].includes(o.kind) ? 0.4 : 1.25;
      return (
        Math.abs(x - o.position[0]) < radius * o.scale[0] + 0.2 &&
        Math.abs(z - o.position[2]) < radius * o.scale[2] + 0.2
      );
    });
  }
  animate = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    const now = performance.now();
    const dt = Math.min((now - this.previousFrame) / 1000, 0.05);
    this.previousFrame = now;
    if (this.playing) {
      const k = this.keys;
      let x = 0,
        z = 0;
      if (!this.frozen) {
        if (k.has("w") || k.has("arrowup")) z--;
        if (k.has("s") || k.has("arrowdown")) z++;
        if (k.has("a") || k.has("arrowleft")) x--;
        if (k.has("d") || k.has("arrowright")) x++;
      }
      const delta = new T.Vector3(x, 0, z)
        .normalize()
        .multiplyScalar(dt * (k.has("shift") ? 8 : 4.5));
      const p = this.player.position;
      if (!this.collides(p.x + delta.x, p.z))
        p.x = T.MathUtils.clamp(p.x + delta.x, -14.8, 14.8);
      if (!this.collides(p.x, p.z + delta.z))
        p.z = T.MathUtils.clamp(p.z + delta.z, -13.3, 13.3);
      if (x || z) this.player.rotation.y = Math.atan2(x, z);
      this.player.children[0].position.y =
        0.65 + (x || z ? Math.sin(performance.now() * 0.016) * 0.055 : 0);
      const desired = p.clone().add(new T.Vector3(9, 11, 14));
      this.camera.position.lerp(desired, 1 - Math.exp(-dt * 4));
      this.camera.lookAt(p.x, p.y + 1, p.z);
      let nearest: string | null = null,
        min = 4.5;
      for (const o of this.world?.objects ?? []) {
        if (o.role === "none") continue;
        const distance = Math.hypot(o.position[0] - p.x, o.position[2] - p.z);
        if (distance < min) {
          min = distance;
          nearest = o.id;
        }
      }
      if (nearest !== this.nearId) {
        this.nearId = nearest;
        this.cb.near(nearest);
      }
    } else this.orbit.update();
    this.renderer.render(this.scene, this.camera);
  };
  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.orbit.dispose();
    this.gizmo.dispose();
    this.renderer.domElement.removeEventListener("pointerdown", this.onDown);
    this.renderer.domElement.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("keydown", this.keyDown);
    window.removeEventListener("keyup", this.keyUp);
    window.removeEventListener("blur", this.clearKeys);
    disposeObject(this.scene);
    for (const m of this.modelCache.values()) disposeObject(m);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
