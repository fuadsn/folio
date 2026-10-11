"use client";
import { useEffect, useState } from "react";
import { worldSchema, type World } from "../lib/world";
import Viewer from "./viewer";
export default function DraftExplorer() {
  const [world, setWorld] = useState<World | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/world")
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load your world.");
        return res.json();
      })
      .then((data) =>
        setWorld(worldSchema.parse((data as { world: unknown }).world)),
      )
      .catch((e) => setError(e.message));
  }, []);
  if (!world)
    return (
      <main className="loading-screen">
        <h1>{error || "Opening your world…"}</h1>
        <a className="button" href="/editor">
          Open editor
        </a>
      </main>
    );
  return <Viewer world={world} draft />;
}
