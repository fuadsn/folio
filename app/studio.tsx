"use client";
import PartsEditor from "./parts-editor";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Blocks,
  TreePine,
  Layers,
  Sparkles,
  Globe,
  Search,
  ChevronRight,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Minus,
  Move,
  RotateCw,
  Scaling,
  Undo2,
  Redo2,
  Play,
  Check,
  Cloud,
  Upload,
  Download,
  Copy,
  Trash2,
  MousePointer2,
  Magnet,
  Sun,
  Compass,
  HelpCircle,
  X,
  Menu,
  Save,
  Loader2,
  FileText,
  User,
  Briefcase,
  Mail,
  ExternalLink,
} from "lucide-react";
import {
  CATALOG,
  newObject,
  worldSchema,
  essentialStatus,
  ROLES,
  roleNames,
  type Kind,
  type World,
  type WorldObject,
  type Role,
} from "../lib/world";
import type { WorldScene } from "../lib/scene";
import WorldCanvas from "./world-canvas";
import AssetArt from "./asset-art";
import { Modal, Story, PortfolioList, TouchControls } from "./ui";
import Forge from "./forge";

async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || "The server did not respond.");
  }
  if (!res.ok) throw new Error(data.error || "Unable to complete the request.");
  return data;
}
const roleIcons = {
  about: User,
  project: Briefcase,
  resume: FileText,
  contact: Mail,
  none: Box,
};
export default function Studio() {
  const [world, setWorld] = useState<World | null>(null),
    [loadError, setLoadError] = useState(""),
    [savedJson, setSavedJson] = useState(""),
    [status, setStatus] = useState("Saved");
  const [tab, setTab] = useState("library"),
    [category, setCategory] = useState("All"),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<string | null>(null);
  const [tool, setTool] = useState<"translate" | "rotate" | "scale">(
      "translate",
    ),
    [snap, setSnap] = useState(true),
    [playing, setPlaying] = useState(false),
    [near, setNear] = useState<string | null>(null);
  const [story, setStory] = useState<string | null>(null),
    [showList, setShowList] = useState(false),
    [modal, setModal] = useState(""),
    [toast, setToast] = useState(""),
    [publishPath, setPublishPath] = useState(""),
    [publishedAt, setPublishedAt] = useState<string | null>(null),
    [publishing, setPublishing] = useState(false),
    [uploading, setUploading] = useState(false);
  const [, historyTick] = useState(0);
  const history = useRef<World[]>([]),
    future = useRef<World[]>([]),
    worldRef = useRef<World | null>(null),
    revision = useRef(0),
    worldId = useRef(""),
    savedRef = useRef(""),
    savePending = useRef<Promise<number> | null>(null),
    engine = useRef<WorldScene | null>(null),
    uploadRef = useRef<HTMLInputElement>(null),
    importRef = useRef<HTMLInputElement>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4200);
  }, []);
  const load = useCallback(() => {
    setLoadError("");
    api("/api/world")
      .then((data) => {
        const parsed = worldSchema.parse(data.world);
        worldRef.current = parsed;
        setWorld(parsed);
        revision.current = data.revision;
        worldId.current = data.id;
        savedRef.current = JSON.stringify(parsed);
        setSavedJson(savedRef.current);
        setPublishedAt(data.publishedAt);
        setPublishPath(data.publishedAt ? `/w/${data.id}` : "");
      })
      .catch((e) => setLoadError(e.message));
  }, []);
  useEffect(() => {
    load();
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [load]);
  const commit = useCallback((next: World) => {
    if (worldRef.current) {
      history.current = [...history.current.slice(-49), worldRef.current];
      future.current = [];
    }
    worldRef.current = next;
    setWorld(next);
    historyTick((x) => x + 1);
  }, []);
  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (prev && worldRef.current) {
      future.current.push(worldRef.current);
      worldRef.current = prev;
      setWorld(prev);
      historyTick((x) => x + 1);
    }
  }, []);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (next && worldRef.current) {
      history.current.push(worldRef.current);
      worldRef.current = next;
      setWorld(next);
      historyTick((x) => x + 1);
    }
  }, []);
  const save = useCallback(async function persist(): Promise<number> {
    if (savePending.current) {
      await savePending.current;
      return persist();
    }
    const current = worldRef.current;
    if (!current) return 0;
    const json = JSON.stringify(current);
    if (json === savedRef.current) return revision.current;
    setStatus("Saving…");
    const task = api("/api/world", {
      method: "PUT",
      body: JSON.stringify({ world: current, revision: revision.current }),
    })
      .then((data) => {
        revision.current = data.revision;
        savedRef.current = json;
        setSavedJson(json);
        setStatus("Saved");
        return data.revision;
      })
      .catch((e) => {
        setStatus("Save failed");
        throw e;
      })
      .finally(() => (savePending.current = null));
    savePending.current = task;
    return task;
  }, []);
  useEffect(() => {
    if (!world || JSON.stringify(world) === savedRef.current) return;
    setStatus("Unsaved");
    const timer = setTimeout(
      () => save().catch((e) => notify(e.message)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [world, savedJson, save, notify]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (
        worldRef.current &&
        JSON.stringify(worldRef.current) !== savedRef.current
      )
        e.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, []);
  const updateObject = useCallback(
    (id: string, patch: Partial<WorldObject>) => {
      if (worldRef.current)
        commit({
          ...worldRef.current,
          objects: worldRef.current.objects.map((o) =>
            o.id === id ? { ...o, ...patch } : o,
          ),
        });
    },
    [commit],
  );
  const add = useCallback(
    (
      kind: Kind,
      pos?: [number, number, number],
      extra: Partial<WorldObject> = {},
    ) => {
      if (!worldRef.current) return;
      if (worldRef.current.objects.length >= 150)
        return notify("This world has reached the demo limit of 150 objects.");
      const object = { ...newObject(kind, pos ?? [0, 0, 0]), ...extra };
      commit({
        ...worldRef.current,
        objects: [...worldRef.current.objects, object],
      });
      setSelected(object.id);
      notify(`${object.name} added. Drag the arrows to place it.`);
    },
    [commit, notify],
  );
  function remove() {
    if (!worldRef.current || !selected) return;
    commit({
      ...worldRef.current,
      objects: worldRef.current.objects.filter((o) => o.id !== selected),
    });
    setSelected(null);
    notify("Object removed. Undo brings it back.");
  }
  function duplicate() {
    const o = worldRef.current?.objects.find((o) => o.id === selected);
    if (!o) return;
    add(
      o.kind,
      [Math.min(23, o.position[0] + 2), o.position[1], o.position[2]],
      {
        ...o,
        id: crypto.randomUUID(),
        name: `${o.name.slice(0, 70)} copy`,
        position: [
          Math.min(23, o.position[0] + 2),
          o.position[1],
          o.position[2],
        ],
      },
    );
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName) ||
        modal ||
        story ||
        showList
      )
        return;
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save()
          .then(() => notify("World saved."))
          .catch((err) => notify(err.message));
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if (playing) {
        if (e.key === "Escape") setPlaying(false);
        return;
      }
      if (e.key === "v") setTool("translate");
      if (e.key === "r") setTool("rotate");
      if (e.key === "s" && !e.metaKey && !e.ctrlKey) setTool("scale");
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [save, undo, redo, playing, modal, story, showList, notify]);
  async function publish() {
    setPublishing(true);
    try {
      await save();
      const data = await api("/api/publish", {
        method: "POST",
        body: JSON.stringify({ revision: revision.current }),
      });
      setPublishPath(data.path);
      setPublishedAt(data.publishedAt);
      notify("Your portfolio snapshot is published.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setPublishing(false);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const data = await api("/api/assets", { method: "POST", body: form });
      add("custom", undefined, {
        asset: data.id,
        name: data.name.replace(/\.glb$/i, "").slice(0, 80),
      });
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }
  function exportWorld() {
    if (!world) return;
    const blob = new Blob([JSON.stringify(world, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "my-world.worldfolio.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("World backup downloaded. Uploaded GLBs stay on this server.");
  }
  async function importWorld(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000)
        throw new Error("World backups must be under 2 MB.");
      const next = worldSchema.parse(JSON.parse(await file.text()));
      commit(next);
      setSelected(null);
      notify("World imported. Undo returns to your previous world.");
    } catch {
      notify("That file is not a valid Worldfolio backup.");
    }
    if (importRef.current) importRef.current.value = "";
  }
  if (loadError)
    return (
      <main className="loading-screen">
        <Box size={36} />
        <h1>Let’s get your world ready.</h1>
        <p role="alert">{loadError}</p>
        <button className="button primary" onClick={load}>
          Try again
        </button>
      </main>
    );
  if (!world)
    return (
      <main className="loading-screen">
        <Box className="float" size={42} />
        <h1>A little world is waiting.</h1>
        <p>Opening your studio…</p>
      </main>
    );
  const object = world.objects.find((o) => o.id === selected),
    openStory = world.objects.find((o) => o.id === story),
    nearest = world.objects.find((o) => o.id === near),
    essentials = essentialStatus(world),
    complete = essentials.filter((x) => x.done).length;
  const filtered = CATALOG.filter(
    (x) =>
      (category === "All" || x.category === category) &&
      x.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <main className={`studio ${playing ? "is-playing" : ""}`}>
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-icon">
            <Box size={22} strokeWidth={1.6} />
          </span>
          worldfolio<span className="beta">STUDIO</span>
        </a>
        <div className="project-name">
          <span className="project-dot" />
          <span>{world.name}</span>
          <span className="draft-pill">
            {publishedAt ? "Published" : "Draft"}
          </span>
        </div>
        <div className="top-actions">
          <button
            className={`save-status ${status === "Save failed" ? "failed" : ""}`}
            onClick={() => save().catch((e) => notify(e.message))}
            title="Save world"
          >
            {status === "Saving…" ? (
              <Loader2 size={14} className="spin" />
            ) : status === "Saved" ? (
              <Cloud size={15} />
            ) : (
              <Save size={14} />
            )}
            <span>{status}</span>
          </button>
          <button
            className="button preview"
            onClick={() => setPlaying(!playing)}
          >
            {playing ? <X size={15} /> : <Play size={15} />}{" "}
            {playing ? "Back to editor" : "Play preview"}
          </button>
          <button
            className="button primary"
            onClick={() => setModal("publish")}
          >
            Publish world
            <ArrowUpRight size={15} />
          </button>
        </div>
      </header>
      {!playing && (
        <>
          <nav className="rail" aria-label="Studio sections">
            {[
              ["library", Blocks, "Build"],
              ["world", Globe, "World"],
              ["layers", Layers, "Objects"],
              ["forge", Sparkles, "Create"],
            ].map(([id, Icon, label]) => {
              const I = Icon as typeof Box;
              return (
                <button
                  key={String(id)}
                  className={tab === id ? "active" : ""}
                  onClick={() => setTab(String(id))}
                  aria-label={String(label)}
                >
                  <I size={21} strokeWidth={1.6} />
                  <span>{String(label)}</span>
                </button>
              );
            })}
            <button
              className="rail-help"
              onClick={() => setModal("help")}
              aria-label="Help and controls"
            >
              <HelpCircle size={21} />
            </button>
          </nav>
          <aside className="library-panel">
            {tab === "library" && (
              <>
                <div className="panel-title">
                  <div className="eyebrow">YOUR WORLD, YOUR RULES</div>
                  <h1>
                    Make room for
                    <br />
                    your imagination.
                  </h1>
                  <p>Little pieces. Endless possibilities.</p>
                </div>
                <div className="searchbox">
                  <Search size={15} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Find something for your world"
                    aria-label="Search objects"
                  />
                </div>
                <div className="categories">
                  {["All", "Buildings", "Nature", "Objects", "Shapes"].map(
                    (c) => (
                      <button
                        key={c}
                        onClick={() => setCategory(c)}
                        className={category === c ? "active" : ""}
                      >
                        {c}
                      </button>
                    ),
                  )}
                </div>
                <div className="library-subhead">
                  <span>
                    {category === "All"
                      ? "THE COLLECTION"
                      : category.toUpperCase()}
                  </span>
                  <small>{filtered.length} objects</small>
                </div>
                <div className="asset-grid">
                  {filtered.map((asset) => (
                    <button
                      className="asset-card"
                      key={asset.kind}
                      onClick={() => add(asset.kind)}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("worldfolio/kind", asset.kind)
                      }
                      title={`${asset.description}. Click to add or drag into the world.`}
                    >
                      <div className="asset-image">
                        <AssetArt kind={asset.kind} color={asset.color} />
                        <span className="asset-add">
                          <Plus size={13} />
                        </span>
                      </div>
                      <span>{asset.name}</span>
                      <small>{asset.category}</small>
                    </button>
                  ))}
                </div>
                <button
                  className="custom-promo"
                  onClick={() => setTab("forge")}
                >
                  <span className="promo-icon">
                    <Sparkles size={19} />
                  </span>
                  <span>
                    <b>Can’t find it? Dream it.</b>
                    <small>Create something entirely yours</small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
                <button
                  className="upload-link"
                  onClick={() => uploadRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload size={14} />
                  {uploading ? "Uploading model…" : "Bring your own 3D model"}
                  <span>.GLB</span>
                </button>
              </>
            )}
            {tab === "layers" && (
              <>
                <div className="panel-title">
                  <div className="eyebrow">EVERY LITTLE DETAIL</div>
                  <h1>Inside your world.</h1>
                  <p>{world.objects.length} objects, one story: yours.</p>
                </div>
                <div className="object-list">
                  {world.objects.map((o) => (
                    <button
                      key={o.id}
                      className={selected === o.id ? "selected" : ""}
                      onClick={() => setSelected(o.id)}
                    >
                      <span style={{ background: o.color }} />
                      <div>
                        <b>{o.name}</b>
                        <small>{roleNames[o.role]}</small>
                      </div>
                      <ChevronRight size={14} />
                    </button>
                  ))}
                </div>
              </>
            )}
            {tab === "world" && (
              <>
                <div className="panel-title">
                  <div className="eyebrow">SET THE SCENE</div>
                  <h1>
                    A world with
                    <br />
                    your personality.
                  </h1>
                  <p>The details make it yours.</p>
                </div>
                <div className="field-stack">
                  <label>
                    World name
                    <input
                      value={world.name}
                      maxLength={80}
                      onChange={(e) =>
                        commit({ ...world, name: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Your name
                    <input
                      value={world.ownerName}
                      maxLength={80}
                      onChange={(e) =>
                        commit({ ...world, ownerName: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    A little introduction
                    <textarea
                      value={world.tagline}
                      maxLength={200}
                      onChange={(e) =>
                        commit({ ...world, tagline: e.target.value })
                      }
                    />
                  </label>
                  <div className="section-label">ATMOSPHERE</div>
                  <label>
                    Time of day
                    <select
                      value={world.lighting}
                      onChange={(e) =>
                        commit({
                          ...world,
                          lighting: e.target.value as World["lighting"],
                        })
                      }
                    >
                      <option value="day">Soft daylight</option>
                      <option value="sunset">Golden hour</option>
                      <option value="night">After dark</option>
                    </select>
                  </label>
                  {[
                    ["sky", "Sky"],
                    ["ground", "Grass"],
                    ["water", "Water"],
                  ].map(([key, label]) => (
                    <label className="color-field" key={key}>
                      {label}
                      <input
                        type="color"
                        value={world[key as "sky"]}
                        onChange={(e) =>
                          commit({ ...world, [key]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                  <div className="section-label">TAKE YOUR WORLD WITH YOU</div>
                  <button
                    className="button full"
                    onClick={() => setModal("clear")}
                  >
                    Start with an empty landscape
                  </button>
                  <button className="button full" onClick={exportWorld}>
                    <Download size={15} />
                    Export world backup
                  </button>
                  <button
                    className="button full"
                    onClick={() => importRef.current?.click()}
                  >
                    <Upload size={15} />
                    Import world backup
                  </button>
                  <p className="fineprint">
                    Backups include your layout and stories. Uploaded models
                    stay in your account on this server.
                  </p>
                </div>
              </>
            )}
            {tab === "forge" && (
              <Forge
                onAdd={(blueprint) =>
                  add("custom", undefined, {
                    name: blueprint.name,
                    parts: blueprint.parts,
                  })
                }
                notify={notify}
              />
            )}
          </aside>
        </>
      )}
      <section className="world-stage">
        <WorldCanvas
          world={world}
          selected={selected}
          playing={playing}
          tool={tool}
          snap={snap}
          onSelect={setSelected}
          onTransform={updateObject}
          onOpen={setStory}
          onNear={setNear}
          onDrop={(kind, pos) => add(kind, pos)}
          onReady={(e) => (engine.current = e)}
          frozen={!!story || showList || !!modal}
        />
        {!playing ? (
          <>
            <div className="stage-heading">
              <span className="small-dot" /> THE CANVAS IS YOURS{" "}
              <p>
                {selected
                  ? "Make it feel like you."
                  : "Start small. Build something that feels like you."}
              </p>
            </div>
            <div className="stage-badge">
              <Globe size={13} /> Your own corner of the internet
            </div>
            <div className="canvas-toolbar">
              <button
                title="Move (V)"
                aria-label="Move object"
                onClick={() => setTool("translate")}
                className={tool === "translate" ? "active" : ""}
              >
                <Move size={18} />
              </button>
              <button
                title="Rotate (R)"
                aria-label="Rotate object"
                onClick={() => setTool("rotate")}
                className={tool === "rotate" ? "active" : ""}
              >
                <RotateCw size={18} />
              </button>
              <button
                title="Scale (S)"
                aria-label="Scale object"
                onClick={() => setTool("scale")}
                className={tool === "scale" ? "active" : ""}
              >
                <Scaling size={18} />
              </button>
              <i />
              <button
                title="Snap to grid"
                aria-label="Snap to grid"
                aria-pressed={snap}
                className={snap ? "active" : ""}
                onClick={() => setSnap(!snap)}
              >
                <Magnet size={17} />
              </button>
              <i />
              <button
                title="Undo (⌘Z)"
                aria-label="Undo"
                disabled={!history.current.length}
                onClick={undo}
              >
                <Undo2 size={17} />
              </button>
              <button
                title="Redo (⌘⇧Z)"
                aria-label="Redo"
                disabled={!future.current.length}
                onClick={redo}
              >
                <Redo2 size={17} />
              </button>
            </div>
            <div className="camera-tools">
              <button
                aria-label="Zoom in"
                onClick={() => engine.current?.zoom(0.85)}
              >
                <Plus size={17} />
              </button>
              <button
                aria-label="Zoom out"
                onClick={() => engine.current?.zoom(1.15)}
              >
                <Minus size={17} />
              </button>
              <i />
              <button
                aria-label="Reset camera"
                title="Reset view"
                onClick={() => engine.current?.reset()}
              >
                <Compass size={18} />
              </button>
              <button
                aria-label="Top view"
                title="Top view"
                onClick={() => engine.current?.reset(true)}
              >
                <Layers size={17} />
              </button>
            </div>
            <div className="stage-bottom">
              <span>
                <MousePointer2 size={12} /> Drag to orbit · Right-drag to pan ·
                Scroll to zoom
              </span>
              <span>{world.objects.length} objects</span>
            </div>
          </>
        ) : (
          <>
            <div className="preview-label">
              <span className="small-dot" /> PLAYING YOUR WORLD{" "}
              <button onClick={() => setShowList(true)}>
                <Menu size={14} />
                Portfolio view
              </button>
            </div>
            <div className="play-hint">
              {nearest ? (
                <button onClick={() => setStory(nearest.id)}>
                  <kbd>E</kbd> Explore {nearest.name}
                </button>
              ) : (
                <span>
                  <kbd>W</kbd>
                  <kbd>A</kbd>
                  <kbd>S</kbd>
                  <kbd>D</kbd> to move · click a building to discover its story
                </span>
              )}
            </div>
            <TouchControls
              press={(k) => engine.current?.keys.add(k)}
              release={(k) => engine.current?.keys.delete(k)}
            />
          </>
        )}
      </section>
      {!playing && (
        <aside className="inspector">
          {object ? (
            <>
              <div className="inspector-title">
                <span className="eyebrow">SELECTED OBJECT</span>
                <button
                  className="icon-button"
                  aria-label="Deselect object"
                  onClick={() => setSelected(null)}
                >
                  <X size={15} />
                </button>
              </div>
              <div className="selected-heading">
                <div className="selected-art">
                  <AssetArt kind={object.kind} color={object.color} />
                </div>
                <h2>{object.name}</h2>
                <span>
                  {object.kind === "custom"
                    ? "Your custom creation"
                    : CATALOG.find((x) => x.kind === object.kind)?.category}
                </span>
              </div>
              <div className="field-stack">
                <label>
                  Object name
                  <input
                    aria-label="Object name"
                    value={object.name}
                    maxLength={80}
                    onChange={(e) =>
                      updateObject(object.id, { name: e.target.value })
                    }
                  />
                </label>
                {!object.parts && !object.asset && (
                  <label className="color-field">
                    Color
                    <input
                      aria-label="Object color"
                      type="color"
                      value={object.color}
                      onChange={(e) =>
                        updateObject(object.id, { color: e.target.value })
                      }
                    />
                  </label>
                )}
                <div className="section-label">MAKE IT INTERACTIVE</div>
                <label>
                  This object opens
                  <select
                    value={object.role}
                    onChange={(e) =>
                      updateObject(object.id, { role: e.target.value as Role })
                    }
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {roleNames[role]}
                      </option>
                    ))}
                  </select>
                </label>
                {object.role !== "none" && (
                  <>
                    <label>
                      Story title
                      <input
                        value={object.title}
                        maxLength={120}
                        onChange={(e) =>
                          updateObject(object.id, { title: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Your story
                      <textarea
                        rows={4}
                        value={object.text}
                        maxLength={5000}
                        placeholder="What would you like visitors to discover?"
                        onChange={(e) =>
                          updateObject(object.id, { text: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      {object.role === "contact"
                        ? "Email or contact link"
                        : object.role === "resume"
                          ? "Résumé link"
                          : "Project link"}
                      <input
                        value={object.url}
                        placeholder={
                          object.role === "contact"
                            ? "mailto:you@example.com"
                            : "https://…"
                        }
                        onChange={(e) =>
                          updateObject(object.id, {
                            url: e.target.value.startsWith("@")
                              ? e.target.value
                              : e.target.value,
                          })
                        }
                      />
                    </label>
                    <button
                      className="button full"
                      onClick={() => setStory(object.id)}
                    >
                      <Play size={13} />
                      Preview story
                    </button>
                  </>
                )}
                <div className="section-label">POSITION & SIZE</div>
                <div className="triple-fields">
                  {["X", "Y", "Z"].map((axis, i) => (
                    <label key={axis}>
                      {axis}
                      <input
                        aria-label={`Position ${axis}`}
                        type="number"
                        min={i === 1 ? 0 : -24}
                        max={i === 1 ? 15 : 24}
                        step="0.5"
                        value={object.position[i]}
                        onChange={(e) => {
                          const p = [...object.position] as [
                            number,
                            number,
                            number,
                          ];
                          p[i] = Math.max(
                            i === 1 ? 0 : -24,
                            Math.min(i === 1 ? 15 : 24, Number(e.target.value)),
                          );
                          updateObject(object.id, { position: p });
                        }}
                      />
                    </label>
                  ))}
                </div>
                <label>
                  Rotation <span>{Math.round(object.rotation)}°</span>
                  <input
                    aria-label="Object rotation"
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={object.rotation}
                    onChange={(e) =>
                      updateObject(object.id, {
                        rotation: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Scale <span>{object.scale[0].toFixed(1)}×</span>
                  <input
                    aria-label="Object scale"
                    type="range"
                    min="0.2"
                    max="5"
                    step="0.1"
                    value={object.scale[0]}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      updateObject(object.id, { scale: [n, n, n] });
                    }}
                  />
                </label>
                {object.parts && (
                  <PartsEditor
                    parts={object.parts}
                    onChange={(parts) => updateObject(object.id, { parts })}
                  />
                )}
                <div className="row-buttons">
                  <button className="button" onClick={duplicate}>
                    <Copy size={14} />
                    Duplicate
                  </button>
                  <button
                    className="button danger"
                    onClick={remove}
                    aria-label="Delete object"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="inspector-title">
                <span className="eyebrow">A WORLD WORTH EXPLORING</span>
                <span className="tiny-star">✳</span>
              </div>
              <h2 className="welcome-title">
                Your work.
                <br />A whole new world.
              </h2>
              <p className="welcome-copy">
                A few stories make a portfolio. How you tell them is up to you.
              </p>
              <div className="essentials-head">
                <span>YOUR FOUR CORNERSTONES</span>
                <b>{complete}/4</b>
              </div>
              <div className="progress-track">
                <span style={{ width: `${(complete / 4) * 100}%` }} />
              </div>
              <div className="essentials">
                {essentials.map((e) => {
                  const I = roleIcons[e.role];
                  return (
                    <button
                      key={e.role}
                      onClick={() => {
                        const o = world.objects.find((o) => o.role === e.role);
                        if (o) setSelected(o.id);
                        else
                          add(
                            e.role === "about"
                              ? "house"
                              : e.role === "project"
                                ? "gallery"
                                : e.role === "resume"
                                  ? "sign"
                                  : "mailbox",
                          );
                      }}
                    >
                      <span className="essential-icon">
                        <I size={17} />
                      </span>
                      <span>
                        <b>{e.label}</b>
                        <small>
                          {e.role === "about"
                            ? "The person behind the work"
                            : e.role === "project"
                              ? "Things you’ve put into the world"
                              : e.role === "resume"
                                ? "Where your journey has taken you"
                                : "A way to say hello"}
                        </small>
                      </span>
                      {e.done ? (
                        <Check size={15} className="check-icon" />
                      ) : (
                        <ChevronRight size={15} />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="inspector-tip">
                <span>✦</span>
                <b>There’s no right way to build.</b>
                <p>
                  A tree can tell your story. A castle can hold your projects.
                  Select anything and give it a purpose.
                </p>
              </div>
              <button
                className="button full portfolio-button"
                onClick={() => setShowList(true)}
              >
                <FileText size={14} />
                See portfolio view
                <ArrowUpRight size={14} />
              </button>
              <div className="small-notes">
                <span>
                  <Check size={12} />
                  Your world saves automatically
                </span>
                <span>
                  <Check size={12} />
                  Play before you publish
                </span>
              </div>
            </>
          )}
        </aside>
      )}
      <input
        hidden
        ref={uploadRef}
        type="file"
        accept=".glb"
        onChange={(e) => upload(e.target.files?.[0])}
      />
      <input
        hidden
        ref={importRef}
        type="file"
        accept=".json"
        onChange={(e) => importWorld(e.target.files?.[0])}
      />
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {modal === "publish" && (
        <Modal
          title="Invite people into your world."
          onClose={() => setModal("")}
        >
          <div className="publish-content">
            <div className="publish-illustration">
              <AssetArt kind="house" color="#af9acb" />
              <span>YOUR OWN LITTLE CORNER OF THE INTERNET</span>
            </div>
            <p>
              Publishing captures your current world and stories. Keep
              experimenting in your draft, then publish again when you’re ready.
            </p>
            <div className="publish-checks">
              {essentials.map((e) => (
                <div key={e.role}>
                  <span className={e.done ? "check-icon" : "missing"}>
                    {e.done ? <Check size={16} /> : <Plus size={16} />}
                  </span>
                  {e.label}
                  <small>{e.done ? "Story ready" : "Add your story"}</small>
                </div>
              ))}
            </div>
            {publishPath && (
              <div className="published-link">
                <a href={publishPath} target="_blank" rel="noopener noreferrer">
                  Open published world
                  <ExternalLink size={14} />
                </a>
                <button
                  className="button"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(location.origin + publishPath)
                      .then(() => notify("World link copied."))
                      .catch(() =>
                        notify(
                          "Open the published world and copy its address.",
                        ),
                      )
                  }
                >
                  <Copy size={13} />
                  Copy link
                </button>
              </div>
            )}
            <button
              className="button primary full"
              disabled={complete < 4 || publishing}
              onClick={publish}
            >
              {publishing ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <Globe size={16} />
              )}{" "}
              {publishing
                ? "Publishing your world…"
                : publishedAt
                  ? "Publish latest changes"
                  : "Publish my world"}
              <ArrowUpRight size={16} />
            </button>
            {publishedAt && (
              <button
                className="text-button danger"
                onClick={async () => {
                  try {
                    await api("/api/publish", { method: "DELETE" });
                    setPublishedAt(null);
                    setPublishPath("");
                    notify("Published link removed. Your draft is saved.");
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              >
                Unpublish this world
              </button>
            )}
            <p className="fineprint">
              Link access follows this site’s sharing settings.
            </p>
          </div>
        </Modal>
      )}
      {modal === "clear" && (
        <Modal title="A clean canvas?" onClose={() => setModal("")}>
          <div className="help-content">
            <p>
              This removes the objects in your draft, but keeps your world
              settings and published version. You can undo it. Add your four
              portfolio stories again before publishing.
            </p>
            <button
              className="button primary full"
              onClick={() => {
                commit({ ...world, objects: [] });
                setSelected(null);
                setModal("");
                notify("A fresh start. Undo restores your landscape.");
              }}
            >
              Clear draft objects
            </button>
          </div>
        </Modal>
      )}
      {modal === "help" && (
        <Modal
          title="A little guide to worldbuilding."
          onClose={() => setModal("")}
        >
          <div className="help-content">
            <p>
              Click a piece in the library to add it, or drag it straight into
              your world. Select any object to change its story, appearance, and
              position.
            </p>
            <dl>
              <dt>Look around</dt>
              <dd>Drag to orbit · Right-drag to pan · Scroll to zoom</dd>
              <dt>Move / Rotate / Scale</dt>
              <dd>
                <kbd>V</kbd> / <kbd>R</kbd> / <kbd>S</kbd>, then drag the
                colored handles
              </dd>
              <dt>Undo / Redo</dt>
              <dd>
                <kbd>⌘ Z</kbd> / <kbd>⌘ ⇧ Z</kbd> (Ctrl on Windows)
              </dd>
              <dt>Play your world</dt>
              <dd>
                <kbd>W A S D</kbd> or arrows · <kbd>E</kbd> to interact ·{" "}
                <kbd>Shift</kbd> to run
              </dd>
              <dt>Your own models</dt>
              <dd>
                Upload a self-contained .GLB under 15 MB. It becomes an object
                you can place and give a story.
              </dd>
            </dl>
          </div>
        </Modal>
      )}
      {openStory && <Story object={openStory} onClose={() => setStory(null)} />}{" "}
      {showList && (
        <PortfolioList world={world} onClose={() => setShowList(false)} />
      )}
    </main>
  );
}
