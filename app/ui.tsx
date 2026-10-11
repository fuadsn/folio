"use client";
import { useEffect, useRef, type ReactNode } from "react";
import {
  X,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { roleNames, safeUrl, type World, type WorldObject } from "../lib/world";
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const dialog = ref.current;
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Story({
  object,
  onClose,
}: {
  object: WorldObject;
  onClose: () => void;
}) {
  return (
    <Modal title={object.name} onClose={onClose}>
      <div className="story">
        <span className="eyebrow">{roleNames[object.role]}</span>
        <h3>{object.title || object.name}</h3>
        <p>
          {object.text ||
            "Your story goes here. Return to the editor to make this space yours."}
        </p>
        {safeUrl(object.url) && (
          <a
            className="button primary"
            href={safeUrl(object.url)!}
            target="_blank"
            rel="noopener noreferrer"
          >
            {object.role === "contact"
              ? "Say hello"
              : object.role === "resume"
                ? "Open résumé"
                : "Explore project"}
            <ArrowUpRight size={16} />
          </a>
        )}
      </div>
    </Modal>
  );
}
export function PortfolioList({
  world,
  onClose,
}: {
  world: World;
  onClose: () => void;
}) {
  return (
    <Modal title="The portfolio, at a glance" onClose={onClose} wide>
      <div className="portfolio-list">
        <div className="portfolio-intro">
          <span className="eyebrow">{world.ownerName}</span>
          <h3>{world.name}</h3>
          <p>{world.tagline}</p>
        </div>
        {world.objects
          .filter((o) => o.role !== "none")
          .map((o) => (
            <article key={o.id}>
              <span className="eyebrow">{roleNames[o.role]}</span>
              <h4>{o.title || o.name}</h4>
              <p>{o.text || "This story hasn’t been added yet."}</p>
              {safeUrl(o.url) && (
                <a
                  href={safeUrl(o.url)!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {o.role === "contact"
                    ? "Get in touch"
                    : o.role === "resume"
                      ? "View résumé"
                      : "View project"}{" "}
                  <ArrowUpRight size={14} />
                </a>
              )}
            </article>
          ))}
      </div>
    </Modal>
  );
}
export function TouchControls({
  press,
  release,
}: {
  press: (key: string) => void;
  release: (key: string) => void;
}) {
  return (
    <div className="touch-controls" aria-label="Movement controls">
      {[
        ["w", ArrowUp],
        ["a", ArrowLeft],
        ["s", ArrowDown],
        ["d", ArrowRight],
      ].map(([key, Icon]) => {
        const I = Icon as typeof ArrowUp;
        return (
          <button
            key={String(key)}
            aria-label={`Move ${key === "w" ? "forward" : key === "s" ? "backward" : key === "a" ? "left" : "right"}`}
            className={`touch-${key}`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              press(String(key));
            }}
            onPointerUp={() => release(String(key))}
            onPointerCancel={() => release(String(key))}
            onLostPointerCapture={() => release(String(key))}
          >
            <I size={20} />
          </button>
        );
      })}
    </div>
  );
}
