"use client";
import { Play } from "lucide-react";
import type { WorldObject } from "../lib/world";
import { vehicleSchema, isCar } from "../lib/vehicles";

export default function VehicleEditor({
  object,
  onChange,
  onTest,
}: {
  object: WorldObject;
  onChange: (patch: Partial<WorldObject>) => void;
  onTest: () => void;
}) {
  const settings = vehicleSchema.parse(object.vehicle ?? {});
  return (
    <details className="editor-details vehicle-editor" open>
      <summary>Driving & movement</summary>
      <div className="field-stack">
        <label className="toggle-row">
          Visitors can drive
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) =>
              onChange({ vehicle: { ...settings, enabled: e.target.checked } })
            }
          />
        </label>
        {(["speed", "handling"] as const).map((key) => (
          <label key={key}>
            {key === "speed" ? "Top speed" : "Steering sensitivity"}
            <span>{settings[key].toFixed(1)}×</span>
            <input
              aria-label={
                key === "speed" ? "Top speed" : "Steering sensitivity"
              }
              type="range"
              min=".5"
              max="2"
              step=".1"
              value={settings[key]}
              onChange={(e) =>
                onChange({ vehicle: { ...settings, [key]: +e.target.value } })
              }
            />
          </label>
        ))}
        {isCar(object.kind) && (
          <label>
            Tire grip <span>{settings.grip.toFixed(2)}×</span>
            <input
              type="range"
              aria-label="Tire grip"
              min=".35"
              max="1.5"
              step=".05"
              value={settings.grip}
              onChange={(e) =>
                onChange({ vehicle: { ...settings, grip: +e.target.value } })
              }
            />
            <small className="fineprint">
              Lower grip makes longer slides. Hold Space and steer at speed.
            </small>
          </label>
        )}
        <button
          className="button primary full"
          disabled={!settings.enabled}
          onClick={onTest}
        >
          <Play size={15} /> Test drive
        </button>
        <p className="fineprint">
          {object.kind === "boat"
            ? "Place on ocean water or a sculpted lake, near shore so visitors can board. Boats float at the water level."
            : object.kind === "plane"
              ? "Give your plane a clear, flat runway. W to accelerate, Space to take off, C to descend. Slow down before landing."
              : "Drive off-road across grass, sand, snow and hills—no paths needed. Avoid deep water and cliffs. W / S accelerate and reverse; A / D steer. Hold Space while steering to drift; B brakes. Open Radio for Tokyo Drift or a local audio file."}{" "}
          Vehicles follow the surface when driven. Test-drive positions are
          never saved.
        </p>
      </div>
    </details>
  );
}
