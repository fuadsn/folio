"use client";
import { useEffect, useRef, useState } from "react";
import type { World, WorldObject, Kind } from "../lib/world";
import type { WorldScene } from "../lib/scene";
export default function WorldCanvas({
  world,
  selected,
  playing,
  tool,
  snap,
  onSelect,
  onTransform,
  onOpen,
  onNear,
  onDrop,
  onReady,
  frozen = false,
}: {
  world: World;
  selected: string | null;
  playing: boolean;
  tool: "translate" | "rotate" | "scale";
  snap: boolean;
  onSelect: (id: string | null) => void;
  onTransform: (id: string, patch: Partial<WorldObject>) => void;
  onOpen: (id: string) => void;
  onNear: (id: string | null) => void;
  onDrop?: (kind: Kind, position: [number, number, number]) => void;
  onReady?: (scene: WorldScene) => void;
  frozen?: boolean;
}) {
  const mount = useRef<HTMLDivElement>(null),
    engine = useRef<WorldScene | null>(null);
  const [error, setError] = useState("");
  const callbacks = useRef({ onSelect, onTransform, onOpen, onNear, onReady });
  callbacks.current = { onSelect, onTransform, onOpen, onNear, onReady };
  const current = useRef({ world, selected, playing, tool, snap, frozen });
  current.current = { world, selected, playing, tool, snap, frozen };
  useEffect(() => {
    let cancelled = false;
    import("../lib/scene")
      .then(({ WorldScene }) => {
        if (cancelled || !mount.current) return;
        try {
          const e = new WorldScene(mount.current, {
            select: (id) => callbacks.current.onSelect(id),
            transform: (id, p) => callbacks.current.onTransform(id, p),
            open: (id) => callbacks.current.onOpen(id),
            near: (id) => callbacks.current.onNear(id),
            error: setError,
          });
          engine.current = e;
          const latest = current.current;
          e.setWorld(latest.world);
          e.setPlay(latest.playing);
          e.select(latest.selected);
          e.setTool(latest.tool);
          e.setSnap(latest.snap);
          e.frozen = latest.frozen;
          callbacks.current.onReady?.(e);
        } catch {
          setError(
            "3D rendering is unavailable in this browser. Enable hardware acceleration, or use the portfolio list.",
          );
        }
      })
      .catch(() => setError("Unable to load the 3D engine. Refresh to retry."));
    return () => {
      cancelled = true;
      engine.current?.destroy();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    engine.current?.setWorld(world);
  }, [world]);
  useEffect(() => {
    engine.current?.select(selected);
  }, [selected]);
  useEffect(() => {
    engine.current?.setPlay(playing);
  }, [playing]);
  useEffect(() => {
    engine.current?.setTool(tool);
  }, [tool]);
  useEffect(() => {
    engine.current?.setSnap(snap);
  }, [snap]);
  useEffect(() => {
    if (engine.current) {
      engine.current.frozen = frozen;
      engine.current.clearKeys();
    }
  }, [frozen]);
  return (
    <div
      className="canvas-mount"
      ref={mount}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const kind = e.dataTransfer.getData("worldfolio/kind") as Kind;
        if (kind && engine.current)
          onDrop?.(kind, engine.current.groundAt(e.clientX, e.clientY));
      }}
    >
      {error && (
        <div role="alert" className="canvas-error">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss model error">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
