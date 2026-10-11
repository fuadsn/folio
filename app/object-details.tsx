"use client";
import type { ObjectDetails, WorldObject } from "../lib/world";
export default function ObjectDetailsEditor({
  object,
  onChange,
  onPieces,
}: {
  object: WorldObject;
  onChange: (details: ObjectDetails) => void;
  onPieces: () => void;
}) {
  const d = object.details,
    tree = ["tree", "pine", "palm"].includes(object.kind);
  const roof = ["house", "tower", "lamp", "mailbox"].includes(object.kind);
  const materials: Array<"body" | "trim" | "wood"> = tree
    ? ["wood"]
    : object.kind === "house" || object.kind === "cafe"
      ? ["body", "trim", "wood"]
      : [
            "gallery",
            "tower",
            "observatory",
            "car",
            "driftcar",
            "boat",
            "plane",
          ].includes(object.kind)
        ? ["body", "trim"]
        : object.kind === "arch"
          ? ["body"]
          : object.kind === "sign"
            ? ["body", "wood"]
            : object.kind === "mailbox"
              ? ["trim", "wood"]
              : object.kind === "flag"
                ? ["wood"]
                : ["bench", "lamp"].includes(object.kind)
                  ? ["trim"]
                  : [];
  return (
    <details className="editor-details" open>
      <summary>{tree ? "Tree shape & style" : "Shape & materials"}</summary>
      <div className="field-stack">
        {materials.map((key) => (
          <label key={key} className="color-field">
            {key === "wood"
              ? tree
                ? "Trunk color"
                : "Wood color"
              : key === "body"
                ? "Wall / body color"
                : "Trim color"}
            <input
              aria-label={`${key} color`}
              type="color"
              value={
                d[key] ??
                (key === "body"
                  ? "#f2e8d6"
                  : key === "trim"
                    ? "#354a4b"
                    : "#a77c5e")
              }
              onChange={(e) => onChange({ ...d, [key]: e.target.value })}
            />
          </label>
        ))}
        {roof && (
          <>
            <label>
              Roof style
              <select
                value={d.roofStyle}
                onChange={(e) =>
                  onChange({
                    ...d,
                    roofStyle: e.target.value as ObjectDetails["roofStyle"],
                  })
                }
              >
                <option value="hip">Pitched roof</option>
                <option value="flat">Flat roof</option>
                <option value="spire">Round spire</option>
              </select>
            </label>
            <label>
              Roof height <span>{d.roofHeight.toFixed(1)}×</span>
              <input
                aria-label="Roof height"
                type="range"
                min=".3"
                max="2"
                step=".1"
                value={d.roofHeight}
                onChange={(e) =>
                  onChange({ ...d, roofHeight: +e.target.value })
                }
              />
            </label>
          </>
        )}
        {tree && (
          <>
            {(["trunkHeight", "foliage"] as const).map((key) => (
              <label key={key}>
                {key === "trunkHeight" ? "Trunk height" : "Canopy size"}
                <input
                  aria-label={
                    key === "trunkHeight" ? "Trunk height" : "Canopy size"
                  }
                  type="range"
                  min={key === "foliage" ? ".4" : ".5"}
                  max={key === "foliage" ? "1.8" : "2.2"}
                  step=".1"
                  value={d[key]}
                  onChange={(e) => onChange({ ...d, [key]: +e.target.value })}
                />
              </label>
            ))}
            <label>
              Snow cover
              <select
                value={d.snow === undefined ? "auto" : String(d.snow)}
                onChange={(e) =>
                  onChange({
                    ...d,
                    snow:
                      e.target.value === "auto" ? undefined : +e.target.value,
                  })
                }
              >
                <option value="auto">Match biome</option>
                <option value="0">No snow</option>
                <option value="0.5">Light dusting</option>
                <option value="1">Snow covered</option>
              </select>
            </label>
          </>
        )}
        <button className="button full" onClick={onPieces}>
          Edit individual pieces
        </button>
        <p className="fineprint">
          Unlock every primitive: move windows, resize branches, add or remove
          pieces. Undo restores these quick controls.
        </p>
      </div>
    </details>
  );
}
