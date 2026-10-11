import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { model, labelSprite, disposeObject, blueprintModel } from "./models";
import type { World, WorldObject } from "./world";
import {
  terrainHeight,
  sculptTerrain,
  type Terrain,
  type TerrainBrush,
} from "./terrain";
import { landscape, updateLandscape } from "./landscape";
import { Atmosphere } from "./atmosphere";
import { avatar, animateAvatar } from "./character";
import {
  isVehicle,
  isCar,
  initialVehicle,
  objectGround,
  landHeight,
  stepVehicle,
  exitVehiclePosition,
  emptyVehicleHUD,
  type VehicleState,
  type VehicleHUD,
} from "./vehicles";
import { DriftEffects } from "./drift-effects";
import { portalPosition, travelPortal } from "./travel-portal";
import { WORLD_POSITION_LIMIT } from "./world-size";

type Callbacks = {
  select: (id: string | null) => void;
  transform: (id: string, patch: Partial<WorldObject>) => void;
  open: (id: string) => void;
  near: (id: string | null) => void;
  error: (message: string) => void;
  terrain: (terrain: Terrain) => void;
  vehicle: (hud: VehicleHUD) => void;
  travel?: () => void;
};
export class WorldScene {
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(38, 1, 0.1, 160);
  renderer: T.WebGLRenderer;
  orbit: OrbitControls;
  gizmo: TransformControls;
  objects = new T.Group();
  npcActors: { object: WorldObject; group: T.Group }[] = [];
  portal = travelPortal();
  land = new T.Group();
  selection = new T.BoxHelper(new T.Group(), 0xd4621a);
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
  ground: T.Mesh | null = null;
  skirt: T.Mesh | null = null;
  atmosphere = new Atmosphere(this.scene);
  driftEffects = new DriftEffects(this.scene);
  brush: TerrainBrush | null = null;
  stroke: Terrain | null = null;
  brushRing = new T.LineLoop(
    new T.BufferGeometry(),
    new T.LineBasicMaterial({ color: "#f4ae52", depthTest: false }),
  );
  jumpOffset = 0;
  jumpVelocity = 0;
  avatarSignature = "";
  weatherSignature = "";
  occluded = new Set<string>();
  nextOcclusionCheck = 0;
  vehicles = new Map<string, VehicleState>();
  obstacles = new Map<string, T.Box3>();
  riding: string | null = null;
  nearbyVehicle: string | null = null;
  vehicleMessage = "";
  vehicleMessageUntil = 0;
  hudSignature = "";
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
    this.portal.visible = false;
    this.scene.add(
      this.ambient,
      this.sun,
      this.objects,
      this.land,
      this.portal,
    );
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
          clamp(o.position.x, -WORLD_POSITION_LIMIT, WORLD_POSITION_LIMIT),
          clamp(
            o.position.y -
              (this.world
                ? objectGround(
                    this.world.terrain,
                    this.world.objects.find(
                      (item) => item.id === this.selected,
                    )!,
                    o.position.x,
                    o.position.z,
                  )
                : 0),
            0,
            15,
          ),
          clamp(o.position.z, -WORLD_POSITION_LIMIT, WORLD_POSITION_LIMIT),
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
    this.player.position.set(0, 0, 6);
    this.player.visible = false;
    this.scene.add(this.player);
    this.brushRing.visible = false;
    this.brushRing.renderOrder = 200;
    this.scene.add(this.brushRing);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(mount);
    this.resize();
    this.renderer.domElement.addEventListener("pointerdown", this.onDown);
    this.renderer.domElement.addEventListener("pointerup", this.onUp);
    this.renderer.domElement.addEventListener("pointermove", this.onMove);
    this.renderer.domElement.addEventListener(
      "pointercancel",
      this.finishStroke,
    );
    this.renderer.domElement.addEventListener("pointerleave", this.hideBrush);
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
    if (
      e.button === 0 &&
      this.brush &&
      !this.playing &&
      !this.frozen &&
      this.world
    ) {
      const point = this.terrainPoint(e.clientX, e.clientY);
      if (!point) return;
      this.stroke = this.world.terrain;
      this.orbit.enabled = false;
      this.renderer.domElement.setPointerCapture(e.pointerId);
      this.paint(point);
    }
  };
  terrainPoint(x: number, y: number) {
    this.setPointer(x, y);
    return this.ground
      ? this.ray.intersectObject(this.ground)[0]?.point
      : undefined;
  }
  hideBrush = () => {
    if (!this.stroke) this.brushRing.visible = false;
  };
  onMove = (e: PointerEvent) => {
    if (!this.brush || this.playing || this.frozen) return;
    const p = this.terrainPoint(e.clientX, e.clientY);
    this.brushRing.visible = !!p;
    if (!p) return;
    if (this.stroke) this.paint(p);
    const t = this.stroke ?? this.world!.terrain;
    const ring: number[] = [];
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2,
        x = p.x + Math.cos(a) * this.brush.radius,
        z = p.z + Math.sin(a) * this.brush.radius;
      ring.push(x, terrainHeight(t, x, z) + 0.08, z);
    }
    this.brushRing.geometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(ring, 3),
    );
    this.brushRing.geometry.computeBoundingSphere();
  };
  paint(p: T.Vector3) {
    if (
      !this.stroke ||
      !this.brush ||
      !this.ground ||
      !this.skirt ||
      !this.world
    )
      return;
    this.stroke = sculptTerrain(this.stroke, p.x, p.z, this.brush);
    updateLandscape(this.ground, this.skirt, this.stroke, this.world.ground);
    this.objects.children.forEach((group) => {
      const object = this.world!.objects.find(
        (o) => o.id === group.userData.objectId,
      );
      if (object)
        group.position.y =
          object.position[1] + objectGround(this.stroke!, object);
    });
  }
  finishStroke = () => {
    if (!this.stroke) return;
    const terrain = this.stroke;
    this.stroke = null;
    this.orbit.enabled = !this.playing;
    this.cb.terrain(terrain);
  };
  setBrush(brush: TerrainBrush | null) {
    this.finishStroke();
    this.brush = brush;
    this.brushRing.visible = false;
    this.orbit.mouseButtons.LEFT = brush ? undefined : T.MOUSE.ROTATE;
    this.orbit.mouseButtons.RIGHT = brush ? T.MOUSE.ROTATE : T.MOUSE.PAN;
    this.renderer.domElement.style.cursor = brush ? "crosshair" : "grab";
    this.select(this.selected);
  }
  onUp = (e: PointerEvent) => {
    if (this.frozen) return;
    if (this.stroke) {
      this.finishStroke();
      return;
    }
    if (this.brush && !this.playing) return;
    if (
      e.button !== 0 ||
      Math.hypot(e.clientX - this.down[0], e.clientY - this.down[1]) > 5 ||
      this.gizmo.axis
    )
      return;
    this.setPointer(e.clientX, e.clientY);
    if (
      this.playing &&
      this.portal.visible &&
      this.ray.intersectObject(this.portal, true).length
    ) {
      this.clearKeys();
      this.cb.travel?.();
      return;
    }
    const hits = this.ray.intersectObjects(this.objects.children, true);
    let o: T.Object3D | undefined = hits[0]?.object;
    while (o && !o.userData.objectId) o = o.parent ?? undefined;
    if (this.playing) {
      const item = this.world?.objects.find(
        (x) => x.id === o?.userData.objectId,
      );
      if (item && isVehicle(item.kind) && !this.riding) {
        this.enterVehicle(item.id);
        return;
      }
      if (item && (item.kind === "npc" || item.role !== "none"))
        this.cb.open(item.id);
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
    const ground = this.terrainPoint(x, y);
    const water = this.ray.ray.intersectPlane(
      new T.Plane(
        new T.Vector3(0, 1, 0),
        -(this.world?.terrain.waterLevel ?? 0),
      ),
      new T.Vector3(),
    );
    const point =
      ground && (!water || ground.y >= (this.world?.terrain.waterLevel ?? 0))
        ? ground
        : (water ?? ground ?? new T.Vector3());
    return [
      T.MathUtils.clamp(
        Math.round(point.x),
        -WORLD_POSITION_LIMIT,
        WORLD_POSITION_LIMIT,
      ),
      0,
      T.MathUtils.clamp(
        Math.round(point.z),
        -WORLD_POSITION_LIMIT,
        WORLD_POSITION_LIMIT,
      ),
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
    if (e.key.toLowerCase() === "p" && !e.repeat && this.cb.travel) {
      this.clearKeys();
      this.cb.travel();
      return;
    }
    if (e.key === " " && !e.repeat && !this.riding) {
      this.jump();
      this.keys.delete(" ");
    }
    if ((e.key === "e" || e.key === "Enter") && this.nearId)
      this.cb.open(this.nearId);
    if (e.key.toLowerCase() === "f" && !e.repeat) this.toggleVehicle();
  };
  keyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
  clearKeys = () => {
    this.keys.clear();
    this.finishStroke();
  };
  setWorld(world: World) {
    this.occluded.clear();
    this.world = world;
    const size = Math.max(world.terrain.width, world.terrain.depth);
    this.camera.far = Math.max(240, size * 5);
    this.camera.updateProjectionMatrix();
    this.orbit.maxDistance = Math.max(80, size * 2.5);
    this.grid.scale.set(
      Math.max(48, world.terrain.width) / 48,
      1,
      Math.max(48, world.terrain.depth) / 48,
    );
    this.renderer.domElement.dataset.worldSize = `${world.terrain.width},${world.terrain.depth}`;
    const sky =
      world.lighting === "night"
        ? "#172335"
        : world.lighting === "sunset"
          ? "#f2cebd"
          : world.sky;
    this.scene.background = new T.Color(sky);
    const fog = world.weather.type === "fog";
    this.scene.fog = new T.Fog(
      sky,
      fog ? 10 + (1 - world.weather.intensity) * 20 : Math.max(65, size * 0.65),
      fog ? 58 + (1 - world.weather.intensity) * 55 : Math.max(125, size * 3),
    );
    this.sun.intensity =
      world.lighting === "night" ? 0.5 : world.lighting === "sunset" ? 2.4 : 3;
    this.ambient.intensity = world.lighting === "night" ? 0.85 : 2.5;
    this.sun.color.set(world.lighting === "sunset" ? "#ffae79" : "#fff4dd");
    const weatherSignature = JSON.stringify(world.weather);
    if (weatherSignature !== this.weatherSignature) {
      this.atmosphere.set(world.weather);
      this.weatherSignature = weatherSignature;
    }
    const avatarSignature = JSON.stringify(world.character);
    if (avatarSignature !== this.avatarSignature) {
      disposeObject(this.player);
      this.player.clear();
      const a = avatar(world.character);
      this.player.add(a);
      this.avatarSignature = avatarSignature;
    }
    this.renderer.domElement.dataset.weather = world.weather.type;
    this.renderer.domElement.dataset.lighting = world.lighting;
    this.renderer.domElement.dataset.biome = world.terrain.biome;
    this.gizmo.detach();
    while (this.land.children.length) {
      const c = this.land.children[0];
      disposeObject(c);
      this.land.remove(c);
    }
    const land = landscape(world);
    this.land.add(land.group);
    this.ground = land.ground;
    this.skirt = land.skirt;
    while (this.objects.children.length) {
      const c = this.objects.children[0];
      if (!c.userData.imported) disposeObject(c);
      else
        c.children
          .filter((child) => child instanceof T.Sprite)
          .forEach(disposeObject);
      this.objects.remove(c);
    }
    this.npcActors = [];
    for (const object of world.objects) {
      const group = new T.Group();
      group.userData.objectId = object.id;
      group.position.fromArray(object.position);
      group.position.y += objectGround(world.terrain, object);
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
        group.add(
          model(object.kind, object.color, {
            ...object.details,
            snow:
              object.details.snow ??
              (world.terrain.biome === "tundra" ? 0.72 : 0),
          }, object.npc),
        );
        if (object.kind === "npc")
          this.npcActors.push({ object, group: group.children[0] as T.Group });
        if (object.kind === "custom" && object.asset)
          this.loadModel(object.asset);
      }
      if (object.role !== "none" || object.kind === "npc") {
        const bounds = new T.Box3().setFromObject(group.children[0]);
        const label = labelSprite(object.kind === "npc" ? `${object.name} · TALK` : object.name);
        label.position.set(0, bounds.max.y + 0.65, 0);
        group.add(label);
      }
      this.objects.add(group);
    }
    this.renderer.domElement.dataset.npcCount = String(world.objects.filter((o) => o.kind === "npc").length);
    this.resetVehicles();
    this.placePortal();
    if (this.playing) this.respawn();
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
    this.selection.visible = !!target && !this.playing && !this.brush;
    if (target && !this.playing && !this.brush) {
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
    this.finishStroke();
    this.fadeOccluders(new Set());
    this.playing = play;
    this.placePortal();
    this.keys.clear();
    this.player.visible = play;
    this.orbit.enabled = !play;
    this.grid.visible = !play;
    if (play) {
      this.gizmo.detach();
      this.selection.visible = false;
      this.respawn();
    } else {
      this.resetVehicles();
      this.reset();
      this.select(this.selected);
    }
  }
  placePortal() {
    const position =
      this.world && this.cb.travel
        ? portalPosition(this.world, (x, z) => !!this.collides(x, z))
        : null;
    this.portal.visible = !!position && this.playing;
    if (position) this.portal.position.set(...position);
    if (this.portal.visible)
      this.renderer.domElement.dataset.travelPortal = position!.join(",");
    else delete this.renderer.domElement.dataset.travelPortal;
  }
  respawn() {
    if (!this.world) return;
    this.resetVehicles();
    this.keys.clear();
    const t = this.world.terrain,
      c = this.world.character;
    let x = T.MathUtils.clamp(
      c.spawn[0],
      -t.width / 2 + 0.5,
      t.width / 2 - 0.5,
    );
    let z = T.MathUtils.clamp(
      c.spawn[1],
      -t.depth / 2 + 0.5,
      t.depth / 2 - 0.5,
    );
    if (this.collides(x, z)) {
      let found = false;
      for (let radius = 1; radius < 50 && !found; radius++)
        for (let i = 0; i < 32; i++) {
          const a = (i * Math.PI) / 16,
            nx = x + Math.cos(a) * radius,
            nz = z + Math.sin(a) * radius;
          if (
            Math.abs(nx) < t.width / 2 - 0.5 &&
            Math.abs(nz) < t.depth / 2 - 0.5 &&
            !this.collides(nx, nz)
          ) {
            x = nx;
            z = nz;
            found = true;
            break;
          }
        }
    }
    this.jumpOffset = this.jumpVelocity = 0;
    this.player.position.set(x, terrainHeight(t, x, z), z);
    this.camera.position
      .copy(this.player.position)
      .add(new T.Vector3(9, 11, 14));
  }
  jump() {
    if (this.playing && !this.riding && !this.frozen && this.jumpOffset === 0)
      this.jumpVelocity = 6;
  }
  reset(top = false) {
    const size = Math.max(
      this.world?.terrain.width ?? 31,
      this.world?.terrain.depth ?? 28,
    );
    this.camera.position.set(
      top ? 0 : 28,
      top ? Math.max(48, size * 1.65) : 30,
      top ? 0.01 : 36,
    );
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
  resetVehicles() {
    if (!this.world) return;
    this.riding = this.nearbyVehicle = null;
    this.vehicles.clear();
    this.obstacles.clear();
    this.vehicleMessage = "";
    this.driftEffects.reset();
    this.player.visible = this.playing;
    for (const object of this.world.objects) {
      const group = this.objects.children.find(
        (g) => g.userData.objectId === object.id,
      );
      if (!group) continue;
      group.position.fromArray(object.position);
      group.position.y += objectGround(this.world.terrain, object);
      group.rotation.set(0, T.MathUtils.degToRad(object.rotation), 0);
      if (isVehicle(object.kind))
        this.vehicles.set(
          object.id,
          initialVehicle(object, this.world.terrain),
        );
      group.updateWorldMatrix(true, true);
      if (group.children[0])
        this.obstacles.set(
          object.id,
          new T.Box3().setFromObject(group.children[0]),
        );
    }
    this.hudSignature = "";
    this.cb.vehicle(emptyVehicleHUD);
    delete this.renderer.domElement.dataset.vehicle;
    delete this.renderer.domElement.dataset.vehiclePosition;
    delete this.renderer.domElement.dataset.drifting;
    delete this.renderer.domElement.dataset.driftAngle;
    delete this.renderer.domElement.dataset.driftScore;
  }
  tellDriver(message: string) {
    this.vehicleMessage = message;
    this.vehicleMessageUntil = performance.now() + 4200;
  }
  enterVehicle(id: string, preview = false) {
    if (!this.playing || this.frozen || !this.world || this.riding) return;
    const object = this.world.objects.find((o) => o.id === id),
      state = this.vehicles.get(id);
    if (!object || !state || object.vehicle?.enabled === false) return;
    if (
      !preview &&
      (Math.hypot(
        state.x - this.player.position.x,
        state.z - this.player.position.z,
      ) > 6 ||
        Math.abs(state.y - this.player.position.y) > 6)
    ) {
      this.tellDriver("Walk closer to get in (within 6 metres).");
      return;
    }
    this.riding = id;
    this.nearbyVehicle = null;
    this.jumpOffset = this.jumpVelocity = 0;
    this.keys.clear();
    this.player.visible = false;
    this.applyVehicle(state, 0, performance.now());
    this.tellDriver(
      state.kind === "plane"
        ? "Hold W to accelerate, then Space to take off."
        : state.kind === "boat"
          ? "W to cruise. Stop near the shore to get out."
          : "",
    );
  }
  toggleVehicle() {
    if (!this.playing || this.frozen || !this.world) return;
    if (!this.riding) {
      if (this.nearbyVehicle) this.enterVehicle(this.nearbyVehicle);
      return;
    }
    const state = this.vehicles.get(this.riding)!;
    const exit = exitVehiclePosition(
      state,
      this.world.terrain,
      (x, z) => !!this.collides(x, z),
    );
    if (!exit) {
      this.tellDriver(
        state.airborne
          ? "Land your plane before getting out."
          : Math.abs(state.speed) > 0.8
            ? "Hold B to stop before getting out."
            : "Move closer to dry land to get out, or return to spawn.",
      );
      return;
    }
    state.speed = 0;
    this.riding = null;
    this.player.visible = true;
    this.player.position.fromArray(exit);
    this.keys.clear();
    this.vehicleMessage = "";
    delete this.renderer.domElement.dataset.vehicle;
    delete this.renderer.domElement.dataset.vehiclePosition;
    delete this.renderer.domElement.dataset.drifting;
    delete this.renderer.domElement.dataset.driftAngle;
    delete this.renderer.domElement.dataset.driftScore;
    this.updateVehicleHUD(performance.now());
  }
  vehicleBlocked = (
    x: number,
    z: number,
    y: number,
    radius: number,
    ignore: string,
  ) => {
    return (
      this.world?.objects.some((o) => {
        if (o.id === ignore || !o.collidable) return false;
        const b = this.obstacles.get(o.id);
        if (!b || y > b.max.y + 0.15 || y + 0.9 < b.min.y) return false;
        const dx = Math.max(b.min.x - x, 0, x - b.max.x),
          dz = Math.max(b.min.z - z, 0, z - b.max.z);
        return dx * dx + dz * dz < radius * radius;
      }) ?? false
    );
  };
  applyVehicle(state: VehicleState, dt: number, now: number) {
    const group = this.objects.children.find(
      (g) => g.userData.objectId === state.id,
    );
    if (!group) return;
    group.position.set(
      state.x,
      state.y + (state.kind === "boat" ? Math.sin(now / 600) * 0.035 : 0),
      state.z,
    );
    group.rotation.set(state.pitch, state.yaw, state.roll, "YXZ");
    group.traverse((child) => {
      if (child.userData.wheel) child.rotation.x += state.speed * dt * 2;
      if (child.userData.propeller)
        child.rotation.z += dt * (Math.abs(state.speed) * 3 + 8);
    });
    group.updateWorldMatrix(true, true);
    if (group.children[0])
      this.obstacles.set(
        state.id,
        new T.Box3().setFromObject(group.children[0]),
      );
    this.player.position.set(state.x, state.y, state.z);
    this.renderer.domElement.dataset.vehicle = state.kind;
    this.renderer.domElement.dataset.vehiclePosition = `${state.x.toFixed(2)},${state.y.toFixed(2)},${state.z.toFixed(2)}`;
    this.renderer.domElement.dataset.drifting = String(state.drifting);
    this.renderer.domElement.dataset.driftAngle = T.MathUtils.radToDeg(
      state.driftAngle,
    ).toFixed(1);
    this.renderer.domElement.dataset.driftScore = Math.floor(
      state.driftScore,
    ).toString();
  }
  updateVehicleHUD(now: number) {
    if (!this.world) return;
    const state = this.riding ? this.vehicles.get(this.riding) : null;
    let nearest: string | null = null,
      distance = 6;
    if (!state)
      for (const [id, v] of this.vehicles) {
        const object = this.world.objects.find((o) => o.id === id);
        if (
          object?.vehicle?.enabled === false ||
          Math.abs(v.y - this.player.position.y) > 6
        )
          continue;
        const d = Math.hypot(
          v.x - this.player.position.x,
          v.z - this.player.position.z,
        );
        if (d < distance) {
          distance = d;
          nearest = id;
        }
      }
    this.nearbyVehicle = nearest;
    const object = this.world.objects.find(
      (o) => o.id === (state?.id ?? nearest),
    );
    const hud: VehicleHUD = {
      active:
        state && object
          ? {
              id: state.id,
              name: object.name,
              kind: state.kind,
              speed: Math.round(Math.abs(state.speed) * 3.6),
              altitude: Math.max(
                0,
                Math.round(state.y - this.world.terrain.waterLevel),
              ),
              airborne: state.airborne,
              drifting: state.drifting,
              driftAngle: Math.round(
                Math.abs(T.MathUtils.radToDeg(state.driftAngle)),
              ),
              driftScore: Math.floor(state.driftScore),
              driftChain: Math.floor(state.driftChain),
              bestDrift: Math.floor(state.bestDrift),
            }
          : null,
      nearby:
        !state && nearest && object && isVehicle(object.kind)
          ? { id: nearest, name: object.name, kind: object.kind }
          : null,
      message: now < this.vehicleMessageUntil ? this.vehicleMessage : "",
    };
    const signature = JSON.stringify(hud);
    if (signature !== this.hudSignature) {
      this.hudSignature = signature;
      this.cb.vehicle(hud);
    }
  }
  collides(x: number, z: number) {
    if (
      this.world &&
      (landHeight(this.world.terrain, x, z) ?? -Infinity) <
        this.world.terrain.waterLevel + 0.02
    )
      return true;
    return this.world?.objects.some((o) => {
      if (!o.collidable || o.position[1] > 2) return false;
      if (isVehicle(o.kind)) {
        const bounds = this.obstacles.get(o.id);
        return (
          !!bounds &&
          x > bounds.min.x - 0.2 &&
          x < bounds.max.x + 0.2 &&
          z > bounds.min.z - 0.2 &&
          z < bounds.max.z + 0.2
        );
      }
      const angle = T.MathUtils.degToRad(o.rotation),
        dx = x - o.position[0],
        dz = z - o.position[2];
      const lx = (dx * Math.cos(angle) - dz * Math.sin(angle)) / o.scale[0];
      const lz = (dx * Math.sin(angle) + dz * Math.cos(angle)) / o.scale[2];
      if (o.kind === "arch" && !o.parts)
        return (
          Math.abs(Math.abs(lx) - 1.35) < 0.24 + 0.2 / o.scale[0] &&
          Math.abs(lz) < 0.28 + 0.2 / o.scale[2]
        );
      if (o.kind === "garage" && !o.parts)
        return Math.abs(lx) < 2.6 + 0.2 / o.scale[0] && Math.abs(lz) < 2.15 + 0.2 / o.scale[2];
      const radius = [
        "tree",
        "pine",
        "palm",
        "lamp",
        "flag",
        "mailbox",
        "npc",
      ].includes(o.kind)
        ? 0.35
        : [
              "house",
              "gallery",
              "cafe",
              "tower",
              "observatory",
              "custom",
              "platform",
            ].includes(o.kind)
          ? 1.25
          : 0.7;
      return (
        Math.abs(lx) < radius + 0.2 / o.scale[0] &&
        Math.abs(lz) < radius + 0.2 / o.scale[2]
      );
    });
  }
  fadeOccluders(ids: Set<string>) {
    for (const group of this.objects.children) {
      if (group.userData.imported) continue;
      const id = group.userData.objectId as string,
        fade = ids.has(id);
      if (fade === this.occluded.has(id)) continue;
      group.traverse((child) => {
        if (!(child instanceof T.Mesh)) return;
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        for (const material of materials) {
          material.transparent = fade;
          material.opacity = fade ? 0.22 : 1;
          material.depthWrite = !fade;
          material.needsUpdate = true;
        }
      });
    }
    this.occluded = ids;
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
        .multiplyScalar(
          dt *
            (this.world?.character.speed ?? 4.5) *
            (k.has("shift") ? 1.75 : 1),
        );
      const p = this.player.position;
      const terrain = this.world?.terrain;
      if (this.riding && this.world) {
        const object = this.world.objects.find((o) => o.id === this.riding)!;
        let state = this.vehicles.get(this.riding)!;
        if (!this.frozen) {
          const result = stepVehicle(
            state,
            object,
            this.world.terrain,
            {
              throttle: -z,
              steer: -x,
              climb: Number(k.has(" ")) - Number(k.has("c")),
              boost: k.has("shift"),
              brake: k.has("b") || (state.kind === "boat" && k.has(" ")),
              handbrake: isCar(state.kind) && k.has(" "),
            },
            dt,
            this.vehicleBlocked,
          );
          state = result.state;
          this.vehicles.set(state.id, state);
          if (result.message) this.tellDriver(result.message);
          if (result.reset) this.keys.clear();
          this.applyVehicle(state, dt, now);
        }
      } else {
        if (!this.collides(p.x + delta.x, p.z))
          p.x = T.MathUtils.clamp(
            p.x + delta.x,
            -(terrain?.width ?? 31) / 2 + 0.4,
            (terrain?.width ?? 31) / 2 - 0.4,
          );
        if (!this.collides(p.x, p.z + delta.z))
          p.z = T.MathUtils.clamp(
            p.z + delta.z,
            -(terrain?.depth ?? 28) / 2 + 0.4,
            (terrain?.depth ?? 28) / 2 - 0.4,
          );
        if (x || z) this.player.rotation.y = Math.atan2(x, z);
        if (!this.frozen && k.has(" ")) {
          this.jump();
          this.keys.delete(" ");
        }
        if (!this.frozen) {
          this.jumpVelocity -= dt * 15;
          this.jumpOffset = Math.max(
            0,
            this.jumpOffset + this.jumpVelocity * dt,
          );
          if (!this.jumpOffset) this.jumpVelocity = 0;
        }
        p.y =
          (terrain ? terrainHeight(terrain, p.x, p.z) : 0) + this.jumpOffset;
        if (this.player.children[0])
          animateAvatar(
            this.player.children[0] as T.Group,
            !!(x || z),
            now / 1000,
          );
      }
      this.renderer.domElement.dataset.player = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`;
      this.renderer.domElement.dataset.jump = this.jumpOffset.toFixed(2);
      const ride = this.riding ? this.vehicles.get(this.riding) : null;
      const desired = p
        .clone()
        .add(
          ride
            ? new T.Vector3(
                -Math.sin(ride.yaw) * (ride.kind === "boat" ? 7 : 11),
                ride.kind === "boat" ? 10 : ride.kind === "plane" ? 7 : 6,
                -Math.cos(ride.yaw) * (ride.kind === "boat" ? 7 : 11),
              ).multiplyScalar(
                isCar(ride.kind) && this.camera.aspect < 0.85 ? 1.2 : 1,
              )
            : new T.Vector3(9, 11, 14),
        );
      if (terrain)
        desired.y = Math.max(
          desired.y,
          (landHeight(terrain, desired.x, desired.z) ?? terrain.waterLevel) + 3,
        );
      this.camera.position.lerp(desired, 1 - Math.exp(-dt * 4));
      this.camera.lookAt(p.x, p.y + 1, p.z);
      if (now > this.nextOcclusionCheck) {
        this.nextOcclusionCheck = now + 150;
        const target = p.clone().add(new T.Vector3(0, 0.9, 0)),
          direction = target.sub(this.camera.position);
        const ray = new T.Raycaster(
          this.camera.position,
          direction.clone().normalize(),
          0,
          direction.length() - 0.3,
        );
        ray.camera = this.camera;
        const ids = new Set<string>();
        for (const hit of ray.intersectObjects(this.objects.children, true)) {
          if (!(hit.object instanceof T.Mesh)) continue;
          let parent: T.Object3D | null = hit.object;
          while (parent && !parent.userData.objectId) parent = parent.parent;
          if (parent && parent.userData.objectId !== this.riding)
            ids.add(parent.userData.objectId);
        }
        this.fadeOccluders(ids);
      }
      let nearest: string | null = null,
        min = 4.5;
      for (const o of this.world?.objects ?? []) {
        if (o.role === "none" && o.kind !== "npc") continue;
        const vehicle = this.vehicles.get(o.id);
        const distance = Math.hypot(
          (vehicle?.x ?? o.position[0]) - p.x,
          (vehicle?.z ?? o.position[2]) - p.z,
          (vehicle?.y ?? objectGround(this.world!.terrain, o)) - p.y,
        );
        if (distance < min) {
          min = distance;
          nearest = o.id;
        }
      }
      if (nearest !== this.nearId) {
        this.nearId = nearest;
        this.cb.near(nearest);
      }
      this.renderer.domElement.dataset.nearNpc =
        this.world?.objects.find((o) => o.id === nearest)?.kind === "npc" ? nearest! : "";
      this.updateVehicleHUD(now);
      if (!this.frozen && this.world) {
        const state = this.riding
          ? (this.vehicles.get(this.riding) ?? null)
          : null;
        const object = this.world.objects.find((o) => o.id === this.riding);
        this.driftEffects.tick(dt, state, this.world.terrain, object?.scale);
      }
    } else this.orbit.update();
    if (this.playing && !this.frozen) {
      for (const { object, group } of this.npcActors) {
        if (object.npc?.motion === "still") continue;
        const dx = this.player.position.x - object.position[0];
        const dz = this.player.position.z - object.position[2];
        const nearby = Math.hypot(dx, dz) < 12;
        group.rotation.y = nearby
          ? Math.atan2(dx, dz) - T.MathUtils.degToRad(object.rotation) : 0;
        const angle = nearby ? 2.2 + Math.sin(now / 240) * 0.3 : 0;
        for (const part of group.children) {
          const offset = part.userData.waveOffset;
          if (typeof offset !== "number") continue;
          part.rotation.z = angle;
          part.position.set(0.36 - offset * Math.sin(angle), 1.11 + offset * Math.cos(angle), 0);
        }
      }
    }
    const center = this.playing ? this.player.position : this.orbit.target;
    // Keep the fixed-size particle/shadow budgets around the visitor, not the origin.
    if (this.atmosphere.object) this.atmosphere.object.position.copy(center);
    this.sun.position.set(center.x - 15, center.y + 28, center.z + 15);
    this.sun.target.position.copy(center);
    this.sun.target.updateMatrixWorld();
    if (this.scene.fog instanceof T.Fog && this.world) {
      const size = Math.max(this.world.terrain.width, this.world.terrain.depth);
      this.scene.fog.far =
        this.playing && this.world.weather.type === "fog"
          ? 58 + (1 - this.world.weather.intensity) * 55
          : Math.max(125, size * 3);
    }
    this.atmosphere.tick(dt, now / 1000);
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
    this.renderer.domElement.removeEventListener("pointermove", this.onMove);
    this.renderer.domElement.removeEventListener(
      "pointercancel",
      this.finishStroke,
    );
    this.renderer.domElement.removeEventListener(
      "pointerleave",
      this.hideBrush,
    );
    window.removeEventListener("keydown", this.keyDown);
    window.removeEventListener("keyup", this.keyUp);
    window.removeEventListener("blur", this.clearKeys);
    this.atmosphere.dispose();
    this.driftEffects.dispose();
    this.grid.geometry.dispose();
    (this.grid.material as T.Material).dispose();
    this.selection.geometry.dispose();
    (this.selection.material as T.Material).dispose();
    this.brushRing.geometry.dispose();
    this.brushRing.material.dispose();
    disposeObject(this.scene);
    for (const m of this.modelCache.values()) disposeObject(m);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
