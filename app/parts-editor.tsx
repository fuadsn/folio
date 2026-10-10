"use client";
import type { Blueprint } from "../lib/world";
type Part = Blueprint["parts"][number];

export default function PartsEditor({
  parts,
  onChange,
}: {
  parts: Part[];
  onChange: (parts: Part[]) => void;
}) {
  function update(index: number, patch: Partial<Part>) {
    onChange(
      parts.map((part, i) => (i === index ? { ...part, ...patch } : part)),
    );
  }
  return (
    <div className="parts-editor">
      <div className="section-label">
        CUSTOM BUILDING · {parts.length} PIECES
      </div>
      <p className="fineprint">Make it yours, one piece at a time.</p>
      {parts.map((part, index) => (
        <details key={index}>
          <summary>
            <i style={{ background: part.color }} />
            {part.name || `Piece ${index + 1}`}
          </summary>
          <div className="part-fields">
            <label>
              Name
              <input
                value={part.name}
                maxLength={60}
                onChange={(e) => update(index, { name: e.target.value })}
              />
            </label>
            <label>
              Shape
              <select
                value={part.shape}
                onChange={(e) =>
                  update(index, { shape: e.target.value as Part["shape"] })
                }
              >
                {["box", "sphere", "cylinder", "cone", "roof", "torus"].map(
                  (shape) => (
                    <option key={shape}>{shape}</option>
                  ),
                )}
              </select>
            </label>
            <label className="color-field">
              Piece color
              <input
                type="color"
                value={part.color}
                onChange={(e) => update(index, { color: e.target.value })}
              />
            </label>
            {(["position", "size", "rotation"] as const).map((field) => (
              <div key={field}>
                <div className="piece-label">{field}</div>
                <div className="triple-fields">
                  {["X", "Y", "Z"].map((axis, axisIndex) => {
                    const min =
                      field === "size"
                        ? 0.02
                        : field === "rotation"
                          ? -360
                          : axisIndex === 1
                            ? 0
                            : -10;
                    const max =
                      field === "rotation"
                        ? 360
                        : field === "position"
                          ? axisIndex === 1
                            ? 15
                            : 10
                          : axisIndex === 1
                            ? 15
                            : 12;
                    return (
                      <label key={axis}>
                        {axis}
                        <input
                          aria-label={`${part.name} ${field} ${axis}`}
                          type="number"
                          min={min}
                          max={max}
                          step={field === "rotation" ? 15 : 0.1}
                          value={part[field][axisIndex]}
                          onChange={(e) => {
                            const value = [...part[field]] as [
                              number,
                              number,
                              number,
                            ];
                            value[axisIndex] = Math.max(
                              min,
                              Math.min(max, Number(e.target.value)),
                            );
                            update(index, { [field]: value });
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            <button
              className="button danger full"
              disabled={parts.length === 1}
              onClick={() => onChange(parts.filter((_, i) => i !== index))}
            >
              Remove piece
            </button>
          </div>
        </details>
      ))}
      <button
        className="button full"
        disabled={parts.length >= 80}
        onClick={() =>
          onChange([
            ...parts,
            {
              name: `Piece ${parts.length + 1}`,
              shape: "box",
              color: "#afa0d5",
              position: [0, 0.5, 0],
              size: [1, 1, 1],
              rotation: [0, 0, 0],
            },
          ])
        }
      >
        Add a piece
      </button>
    </div>
  );
}
