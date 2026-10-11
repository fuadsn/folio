"use client";
import {
  Mountain,
  Snowflake,
  Sun,
  CloudRain,
  CloudFog,
  MousePointer2,
  ArrowUp,
  ArrowDown,
  Waves,
  Paintbrush,
  Minus,
} from "lucide-react";
import type { World } from "../lib/world";
import {
  BIOMES,
  createTerrain,
  resizeTerrain,
  type TerrainBrush,
  type Weather,
} from "../lib/terrain";
import { DRIVING_WORLD_SIZE, MAX_WORLD_SIZE } from "../lib/world-size";

export function EnvironmentEditor({
  world,
  onChange,
  brush,
  setBrush,
}: {
  world: World;
  onChange: (world: World) => void;
  brush: TerrainBrush | null;
  setBrush: (brush: TerrainBrush | null) => void;
}) {
  const defaults: TerrainBrush = {
    tool: "raise",
    radius: 2.5,
    strength: 0.3,
    color: "#f4ae52",
    level: 0,
  };
  const b = brush ?? defaults;
  const terrain = world.terrain;
  return (
    <>
      <div className="panel-title">
        <div className="eyebrow">FROM THE GROUND UP</div>
        <h1>
          A landscape.
          <br />
          Entirely yours.
        </h1>
        <p>Sculpt, paint, and change the atmosphere.</p>
      </div>
      <div className="field-stack environment-fields">
        <div className="tool-note">
          <b>
            {terrain.width} × {terrain.depth} m
          </b>{" "}
          · {(terrain.width * terrain.depth).toLocaleString()} m² to explore
          <p>
            Keep your village in place and add open land around it for longer
            drives.
          </p>
          <button
            className="button primary full"
            disabled={
              terrain.width >= DRIVING_WORLD_SIZE &&
              terrain.depth >= DRIVING_WORLD_SIZE
            }
            onClick={() => {
              setBrush(null);
              onChange({
                ...world,
                terrain: resizeTerrain(
                  terrain,
                  Math.max(DRIVING_WORLD_SIZE, terrain.width),
                  Math.max(DRIVING_WORLD_SIZE, terrain.depth),
                ),
              });
            }}
          >
            Expand for driving · 256 m
          </button>
        </div>
        <div className="section-label">01 / CHOOSE A STARTING POINT</div>
        <div className="biome-grid">
          {BIOMES.map((biome) => (
            <button
              key={biome.id}
              className={`biome-card ${terrain.biome === biome.id ? "active" : ""}`}
              aria-pressed={terrain.biome === biome.id}
              onClick={() => {
                setBrush(null);
                onChange({
                  ...world,
                  terrain: createTerrain(
                    biome.id,
                    terrain.width,
                    terrain.depth,
                  ),
                  ground: biome.ground,
                  sky: biome.sky,
                  water: biome.water,
                  weather: { ...world.weather, type: biome.weather },
                });
              }}
            >
              <span
                className={`biome-art biome-${biome.id}`}
                style={{ background: biome.sky, color: biome.ground }}
              >
                <Mountain size={40} fill="currentColor" strokeWidth={1} />
                {biome.id === "tundra" && <Snowflake size={15} />}
              </span>
              <b>{biome.name}</b>
              <small>{biome.subtitle}</small>
            </button>
          ))}
        </div>
        <p className="fineprint">
          Presets replace terrain sculpting and paint. Buildings and stories
          stay. Undo brings your previous landscape back.
        </p>
        <div className="section-label">02 / SHAPE THE LAND</div>
        <div className="brush-tools">
          {(
            [
              ["raise", ArrowUp, "Raise"],
              ["lower", ArrowDown, "Lower"],
              ["smooth", Waves, "Smooth"],
              ["flatten", Minus, "Flatten"],
              ["paint", Paintbrush, "Paint"],
            ] as const
          ).map(([tool, Icon, title]) => (
            <button
              key={tool}
              className={brush?.tool === tool ? "active" : ""}
              aria-pressed={brush?.tool === tool}
              onClick={() => setBrush({ ...b, tool })}
            >
              <Icon size={17} />
              {title}
            </button>
          ))}
          <button
            className={!brush ? "active" : ""}
            onClick={() => setBrush(null)}
          >
            <MousePointer2 size={17} />
            Select
          </button>
        </div>
        {brush && (
          <div className="brush-settings">
            <label>
              Brush radius <span>{b.radius.toFixed(1)} m</span>
              <input
                aria-label="Brush radius"
                type="range"
                min="1"
                max={Math.max(
                  6,
                  Math.min(40, Math.max(terrain.width, terrain.depth) / 8),
                )}
                step=".25"
                value={b.radius}
                onChange={(e) => setBrush({ ...b, radius: +e.target.value })}
              />
            </label>
            <label>
              Brush strength <span>{Math.round(b.strength * 100)}%</span>
              <input
                aria-label="Brush strength"
                type="range"
                min=".05"
                max=".8"
                step=".05"
                value={b.strength}
                onChange={(e) => setBrush({ ...b, strength: +e.target.value })}
              />
            </label>
            {b.tool === "paint" && (
              <>
                <label className="color-field">
                  Paint color
                  <input
                    aria-label="Terrain paint color"
                    type="color"
                    value={b.color}
                    onChange={(e) => setBrush({ ...b, color: e.target.value })}
                  />
                </label>
                <div className="paint-swatches">
                  {[
                    "#fef3e2",
                    "#f4ae52",
                    "#d4621a",
                    "#2a1a0e",
                    "#98b487",
                    "#e5eef5",
                    "#b3a296",
                  ].map((color) => (
                    <button
                      key={color}
                      aria-label={`Paint ${color}`}
                      style={{ background: color }}
                      onClick={() => setBrush({ ...b, color })}
                    />
                  ))}
                </div>
              </>
            )}
            {b.tool === "flatten" && (
              <label>
                Target height
                <input
                  aria-label="Flatten height"
                  type="number"
                  min="-3"
                  max="10"
                  step=".25"
                  value={b.level}
                  onChange={(e) =>
                    setBrush({
                      ...b,
                      level: Math.max(-3, Math.min(10, +e.target.value)),
                    })
                  }
                />
              </label>
            )}
            <p className="tool-note">
              Drag on the ground to {b.tool}. Right-drag to orbit. One stroke =
              one undo.
            </p>
          </div>
        )}
        <details className="editor-details">
          <summary>Island dimensions & paths</summary>
          <div className="field-stack">
            {(["width", "depth"] as const).map((key) => (
              <label key={key}>
                Island {key} <span>{terrain[key]} m</span>
                <input
                  aria-label={`Island ${key}`}
                  type="range"
                  min="16"
                  max={MAX_WORLD_SIZE}
                  step="1"
                  value={terrain[key]}
                  onChange={(e) =>
                    onChange({
                      ...world,
                      terrain: resizeTerrain(
                        terrain,
                        key === "width" ? +e.target.value : terrain.width,
                        key === "depth" ? +e.target.value : terrain.depth,
                      ),
                    })
                  }
                />
              </label>
            ))}
            <p className="fineprint">
              Up to 512 × 512 m. Resizing resamples terrain and paint without
              moving objects. Shrinking crops terrain, so export a backup first;
              Undo restores the previous grid.
            </p>
            <label>
              Water level <span>{terrain.waterLevel.toFixed(1)} m</span>
              <input
                aria-label="Water level"
                type="range"
                min="-3"
                max="2"
                step=".1"
                value={terrain.waterLevel}
                onChange={(e) =>
                  onChange({
                    ...world,
                    terrain: { ...terrain, waterLevel: +e.target.value },
                  })
                }
              />
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={terrain.paths}
                onChange={(e) =>
                  onChange({
                    ...world,
                    terrain: { ...terrain, paths: e.target.checked },
                  })
                }
              />
              Show central paths
            </label>
          </div>
        </details>
        <div className="section-label">03 / WEATHER, YOUR WAY</div>
        <div className="weather-options">
          {(
            [
              ["clear", Sun],
              ["snow", Snowflake],
              ["rain", CloudRain],
              ["fog", CloudFog],
            ] as const
          ).map(([type, Icon]) => (
            <button
              key={type}
              className={world.weather.type === type ? "active" : ""}
              aria-label={`${type} weather`}
              aria-pressed={world.weather.type === type}
              onClick={() =>
                onChange({
                  ...world,
                  weather: { ...world.weather, type: type as Weather["type"] },
                })
              }
            >
              <Icon size={18} />
              {type}
            </button>
          ))}
        </div>
        {world.weather.type !== "clear" && (
          <label>
            Weather intensity{" "}
            <span>{Math.round(world.weather.intensity * 100)}%</span>
            <input
              aria-label="Weather intensity"
              type="range"
              min=".1"
              max="1"
              step=".1"
              value={world.weather.intensity}
              onChange={(e) =>
                onChange({
                  ...world,
                  weather: { ...world.weather, intensity: +e.target.value },
                })
              }
            />
          </label>
        )}
        {["rain", "snow"].includes(world.weather.type) && (
          <label>
            Wind direction & speed
            <input
              aria-label="Wind"
              type="range"
              min="-1"
              max="1"
              step=".1"
              value={world.weather.wind}
              onChange={(e) =>
                onChange({
                  ...world,
                  weather: { ...world.weather, wind: +e.target.value },
                })
              }
            />
          </label>
        )}
        <p className="fineprint">
          Weather works with every biome. Switch Day / Night above to change the
          light and editor theme together.
        </p>
      </div>
    </>
  );
}

export function CharacterEditor({
  world,
  onChange,
  onPlay,
}: {
  world: World;
  onChange: (world: World) => void;
  onPlay: () => void;
}) {
  const c = world.character;
  return (
    <>
      <div className="panel-title">
        <div className="eyebrow">MEET YOUR EXPLORER</div>
        <h1>
          A little you.
          <br />A big adventure.
        </h1>
        <p>Your visitors can walk, run, and jump through your world.</p>
      </div>
      <div className="field-stack">
        <div
          className="character-portrait"
          style={
            {
              "--coat": c.coat,
              "--skin": c.skin,
              "--hat": c.hat,
            } as React.CSSProperties
          }
        >
          <span
            className="portrait-hat"
            style={{ visibility: c.hatStyle === "none" ? "hidden" : "visible" }}
          />
          <span className="portrait-head">••</span>
          <span className="portrait-body" />
          <span className="portrait-legs" />
        </div>
        {(["coat", "skin", "hat"] as const).map((key) => (
          <label className="color-field" key={key}>
            {key === "coat" ? "Jacket" : key === "skin" ? "Skin" : "Hat"} color
            <input
              aria-label={`Character ${key} color`}
              type="color"
              value={c[key]}
              onChange={(e) =>
                onChange({
                  ...world,
                  character: { ...c, [key]: e.target.value },
                })
              }
            />
          </label>
        ))}
        <label>
          Hat style
          <select
            value={c.hatStyle}
            onChange={(e) =>
              onChange({
                ...world,
                character: {
                  ...c,
                  hatStyle: e.target.value as typeof c.hatStyle,
                },
              })
            }
          >
            <option value="beanie">Cozy beanie</option>
            <option value="cap">Adventure cap</option>
            <option value="none">No hat</option>
          </select>
        </label>
        <label>
          Walking speed <span>{c.speed.toFixed(1)} m/s</span>
          <input
            aria-label="Walking speed"
            type="range"
            min="2"
            max="7"
            step=".5"
            value={c.speed}
            onChange={(e) =>
              onChange({
                ...world,
                character: { ...c, speed: +e.target.value },
              })
            }
          />
        </label>
        <div className="section-label">STARTING POSITION</div>
        <div className="row-buttons">
          {["X", "Z"].map((axis, i) => (
            <label key={axis}>
              Spawn {axis}
              <input
                aria-label={`Spawn ${axis}`}
                type="number"
                min={
                  -(i === 0 ? world.terrain.width : world.terrain.depth) / 2 + 1
                }
                max={
                  (i === 0 ? world.terrain.width : world.terrain.depth) / 2 - 1
                }
                step=".5"
                value={c.spawn[i]}
                onChange={(e) => {
                  const spawn = [...c.spawn] as [number, number];
                  const bound =
                    (i === 0 ? world.terrain.width : world.terrain.depth) / 2 -
                    1;
                  spawn[i] = Math.max(-bound, Math.min(bound, +e.target.value));
                  onChange({ ...world, character: { ...c, spawn } });
                }}
              />
            </label>
          ))}
        </div>
        <p className="fineprint">
          If the spawn is blocked or underwater, your explorer starts at the
          nearest available spot.
        </p>
        <button className="button primary full" onClick={onPlay}>
          Take a walk →
        </button>
        <div className="tool-note">
          <b>WASD / arrows</b> to move
          <br />
          <b>Shift</b> to run · <b>Space</b> to jump
          <br />
          <b>E</b> to open a nearby story
          <br />
          Touch controls are available too.
        </div>
      </div>
    </>
  );
}
