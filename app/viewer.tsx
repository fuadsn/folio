"use client";
import { useState, useRef } from "react";
import { Box, Menu, ArrowUpRight } from "lucide-react";
import type { World } from "../lib/world";
import type { WorldScene } from "../lib/scene";
import WorldCanvas from "./world-canvas";
import { Story, PortfolioList, TouchControls } from "./ui";
export default function Viewer({ world }: { world: World }) {
  const [story, setStory] = useState<string | null>(null),
    [list, setList] = useState(false),
    [near, setNear] = useState<string | null>(null);
  const engine = useRef<WorldScene | null>(null);
  const object = world.objects.find((o) => o.id === story),
    nearest = world.objects.find((o) => o.id === near);
  return (
    <main className="published-world">
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
        onReady={(e) => (engine.current = e)}
        frozen={!!story || list}
      />
      <header className="visitor-header">
        <div>
          <span className="eyebrow">Welcome to the world of</span>
          <h1>{world.ownerName}</h1>
        </div>
        <button className="button" onClick={() => setList(true)}>
          <Menu size={16} />
          View portfolio
        </button>
      </header>
      <div className="visitor-caption">
        <span className="small-dot" /> {world.name}
        <p>{world.tagline}</p>
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
            <kbd>D</kbd> to explore · click a building to discover its story
          </span>
        )}
      </div>
      <TouchControls
        press={(k) => engine.current?.keys.add(k)}
        release={(k) => engine.current?.keys.delete(k)}
      />
      <a className="made-with" href="/">
        {" "}
        <Box size={14} />
        Made with Worldfolio
        <ArrowUpRight size={13} />
      </a>
      {object && <Story object={object} onClose={() => setStory(null)} />}{" "}
      {list && <PortfolioList world={world} onClose={() => setList(false)} />}
    </main>
  );
}
