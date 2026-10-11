"use client";
import { useState, useRef } from "react";
import { Box, Menu, ArrowUpRight, Pencil, Globe } from "lucide-react";
import type { World } from "../lib/world";
import type { WorldScene } from "../lib/scene";
import WorldCanvas from "./world-canvas";
import { Story, PortfolioList, Modal } from "./ui";
import WorldDirectory from "./world-directory";
import PlayControls from "./play-controls";
import { emptyVehicleHUD } from "../lib/vehicles";
export default function Viewer({
  world,
  draft = false,
  worldId,
}: {
  world: World;
  draft?: boolean;
  worldId?: string;
}) {
  const [story, setStory] = useState<string | null>(null),
    [list, setList] = useState(false),
    [near, setNear] = useState<string | null>(null);
  const engine = useRef<WorldScene | null>(null);
  const [vehicle, setVehicle] = useState(emptyVehicleHUD);
  const [travel, setTravel] = useState(false);
  const object = world.objects.find((o) => o.id === story),
    nearest = world.objects.find((o) => o.id === near);
  return (
    <main
      className="published-world"
      data-theme={world.lighting === "night" ? "dark" : "light"}
    >
      <WorldCanvas
        world={world}
        selected={null}
        playing
        tool="translate"
        snap
        onSelect={() => {}}
        onTransform={() => {}}
        onOpen={setStory}
        onNear={setNear}
        onVehicle={setVehicle}
        onReady={(e) => (engine.current = e)}
        frozen={!!story || list || travel}
        onTravel={() => setTravel(true)}
      />
      <header className="visitor-header">
        <div>
          <span className="eyebrow">Welcome to the world of</span>
          <h1>{world.ownerName}</h1>
        </div>
        <div className="visitor-actions">
          <button className="button" onClick={() => setTravel(true)}>
            <Globe size={16} /> Worlds
          </button>
          {draft && (
            <a className="button primary" href="/editor">
              <Pencil size={16} /> Open editor
            </a>
          )}
          <button className="button" onClick={() => setList(true)}>
            <Menu size={16} />
            View portfolio
          </button>
        </div>
      </header>
      <div className="visitor-caption">
        <span className="small-dot" /> {world.name}
        <p>{world.tagline}</p>
        {draft && (
          <small>
            LOCAL DRAFT · {world.terrain.biome} · {world.weather.type} ·{" "}
            {world.lighting}
          </small>
        )}
      </div>
      {!vehicle.active && (
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
              <kbd>D</kbd> move · Shift run · Space jump · click a building for
              its story
            </span>
          )}
        </div>
      )}
      <PlayControls engine={engine} vehicle={vehicle} />
      <a className="made-with" href="/">
        {" "}
        <Box size={14} />
        Made with Worldfolio
        <ArrowUpRight size={13} />
      </a>
      {object && <Story object={object} onClose={() => setStory(null)} />}{" "}
      {list && <PortfolioList world={world} onClose={() => setList(false)} />}
      {travel && (
        <Modal
          title="Travel to another world"
          onClose={() => setTravel(false)}
          wide
        >
          <WorldDirectory currentId={worldId} />
        </Modal>
      )}
    </main>
  );
}
