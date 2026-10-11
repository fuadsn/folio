"use client";
import type { RefObject } from "react";
import { Car, Ship, Plane, RotateCcw, LogIn, LogOut } from "lucide-react";
import type { WorldScene } from "../lib/scene";
import type { VehicleHUD } from "../lib/vehicles";
import { isCar } from "../lib/vehicles";
import { TouchControls } from "./ui";
import CarRadio from "./car-radio";

export default function PlayControls({
  engine,
  vehicle,
}: {
  engine: RefObject<WorldScene | null>;
  vehicle: VehicleHUD;
}) {
  const ride = vehicle.active,
    nearby = vehicle.nearby;
  const kind = ride?.kind ?? nearby?.kind;
  const Icon = kind === "plane" ? Plane : kind === "boat" ? Ship : Car;
  const hold = (key: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      if (!engine.current?.frozen) engine.current?.keys.add(key);
    },
    onPointerUp: () => engine.current?.keys.delete(key),
    onPointerCancel: () => engine.current?.keys.delete(key),
    onLostPointerCapture: () => engine.current?.keys.delete(key),
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        engine.current?.keys.add(key);
      }
    },
    onKeyUp: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        engine.current?.keys.delete(key);
      }
    },
    onBlur: () => engine.current?.keys.delete(key),
  });
  return (
    <>
      <TouchControls
        press={(k) => {
          if (!engine.current?.frozen) engine.current?.keys.add(k);
        }}
        release={(k) => engine.current?.keys.delete(k)}
      />
      {(ride || nearby || vehicle.message) && (
        <section className="vehicle-hud" aria-label="Vehicle controls">
          {(ride || nearby) && (
            <div className="vehicle-hud-title">
              <span className="vehicle-emblem">
                <Icon size={20} />
              </span>
              <div>
                <span className="eyebrow">
                  {ride
                    ? ride.drifting
                      ? "SIDEWAYS, ON PURPOSE"
                      : kind === "plane"
                        ? "FLIGHT MODE"
                        : "ON THE MOVE"
                    : "TAKE A RIDE"}
                </span>
                <strong>{ride?.name ?? nearby?.name}</strong>
              </div>
            </div>
          )}
          {ride ? (
            <>
              <div className="vehicle-instruments">
                <span>
                  <b>{ride.speed}</b> km/h
                </span>
                {kind === "plane" && (
                  <span>
                    <b>{ride.altitude}</b> m above sea
                  </span>
                )}
                <span className="vehicle-mode">
                  {kind === "plane"
                    ? ride.airborne
                      ? "AIRBORNE"
                      : "GROUNDED"
                    : kind === "boat"
                      ? "ON WATER"
                      : "ON LAND"}
                </span>
              </div>
              {kind && isCar(kind) && (
                <div
                  className={`drift-meter ${ride.drifting ? "is-drifting" : ""}`}
                  aria-label="Drift meter"
                  data-drifting={ride.drifting}
                >
                  <div>
                    <span>{ride.drifting ? "DRIFTING" : "DRIFT READY"}</span>
                    <strong>
                      {ride.drifting
                        ? `${ride.driftAngle}°`
                        : `${ride.driftScore} pts`}
                    </strong>
                  </div>
                  <meter
                    min="0"
                    max="63"
                    value={ride.driftAngle}
                    aria-label="Drift angle"
                  />
                  <small>
                    {ride.drifting
                      ? `Slide +${ride.driftChain} · Total ${ride.driftScore}`
                      : `Best slide ${ride.bestDrift} · Space + steer`}
                  </small>
                </div>
              )}
              <p className="vehicle-keys">
                W throttle · S {kind === "plane" ? "slow" : "slow / reverse"} ·
                A D steer
                <br />B brake · Shift boost
                {kind && isCar(kind) && (
                  <>
                    <br />
                    Space + A / D drift · release to grip
                  </>
                )}
                {kind === "plane" && (
                  <>
                    <br />
                    Space climb · C descend · slow to land
                  </>
                )}
              </p>
              <button
                className="button full"
                onClick={() => engine.current?.toggleVehicle()}
              >
                <LogOut size={15} /> Get out <kbd>F</kbd>
              </button>
            </>
          ) : (
            nearby && (
              <button
                className="button primary full"
                onClick={() => engine.current?.toggleVehicle()}
              >
                <LogIn size={15} />{" "}
                {kind === "plane"
                  ? "Fly plane"
                  : kind === "boat"
                    ? "Board boat"
                    : "Drive car"}{" "}
                <kbd>F</kbd>
              </button>
            )
          )}
          {vehicle.message && (
            <p className="vehicle-message" role="status">
              {vehicle.message}
            </p>
          )}
        </section>
      )}
      <div className="character-actions">
        {ride ? (
          <>
            {kind && isCar(kind) && (
              <button
                className="button hold-control drift-control"
                aria-label="Handbrake drift"
                {...hold(" ")}
              >
                Drift <kbd>Space</kbd>
              </button>
            )}
            {kind === "plane" && (
              <>
                <button className="button hold-control" {...hold(" ")}>
                  Climb ↑
                </button>
                <button className="button hold-control" {...hold("c")}>
                  Descend ↓
                </button>
              </>
            )}
            <button className="button hold-control" {...hold("b")}>
              Brake <kbd>B</kbd>
            </button>
          </>
        ) : (
          <button className="button" onClick={() => engine.current?.jump()}>
            Jump <kbd>Space</kbd>
          </button>
        )}
        <button
          className="icon-button"
          aria-label="Return to spawn"
          title="Return to spawn and reset vehicles"
          onClick={() => engine.current?.respawn()}
        >
          <RotateCcw size={18} />
        </button>
      </div>
      {ride && isCar(ride.kind) && <CarRadio key={ride.id} engine={engine} />}
    </>
  );
}
