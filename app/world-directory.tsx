"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { ArrowRight, Search, Globe, RefreshCw, Compass } from "lucide-react";
import { directoryResponse, type WorldCard } from "../lib/directory";
import { BIOMES } from "../lib/terrain";

export default function WorldDirectory({ currentId }: { currentId?: string }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({ q: "", page: 0 });
  const [worlds, setWorlds] = useState<WorldCard[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const timer = setTimeout(
      () => setQuery({ q: search.trim(), page: 0 }),
      250,
    );
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(
      `/api/worlds?${new URLSearchParams({ q: query.q, page: String(query.page) })}`,
      {
        signal: controller.signal,
        cache: "no-store",
      },
    )
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "Could not load the world network. Please try again.",
          );
        return directoryResponse.parse(await response.json());
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setWorlds(data.worlds);
        setHasMore(data.hasMore);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, retry]);
  return (
    <section className="world-directory" aria-label="Connected portfolios">
      <div className="directory-intro">
        <span className="eyebrow">
          <Globe size={14} /> THE WORLDFOLIO NETWORK
        </span>
        <h2>
          A different world.
          <br />A new perspective.
        </h2>
        <p>
          Meet the people behind the portfolios. Pick a world and step inside.
        </p>
      </div>
      <label className="directory-search">
        <Search size={18} />
        <input
          aria-label="Search portfolios"
          placeholder="Find a creator, world, or interest…"
          maxLength={100}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div className="directory-results" aria-busy={loading}>
        {loading ? (
          <p className="directory-empty" role="status">
            Finding your next destination…
          </p>
        ) : error ? (
          <div className="directory-empty" role="alert">
            <p>{error}</p>
            <button className="button" onClick={() => setRetry((n) => n + 1)}>
              <RefreshCw size={15} /> Try again
            </button>
          </div>
        ) : worlds.length === 0 ? (
          <div className="directory-empty">
            <Compass size={36} />
            <h3>
              {query.q
                ? "No worlds match yet."
                : "The next world could be yours."}
            </h3>
            <p>
              {query.q
                ? "Try a different name or interest."
                : "Publish a portfolio with “Join the world network” enabled to appear here. Only opted-in published worlds on this server are shown."}
            </p>
            {!query.q && (
              <a href="/editor" className="button primary">
                Build your world <ArrowRight size={16} />
              </a>
            )}
          </div>
        ) : (
          <div className="world-card-grid">
            {worlds.map((world) => {
              const here = world.id === currentId;
              const biome = BIOMES.find((b) => b.id === world.biome)!;
              return (
                <article className="world-card" key={world.id}>
                  <div
                    className={`world-card-art ${world.lighting === "night" ? "at-night" : ""}`}
                    aria-hidden="true"
                    style={
                      {
                        "--island-color": world.ground,
                        "--world-sky": biome.sky,
                      } as CSSProperties
                    }
                  >
                    <span className="card-orbit orbit-one" />
                    <span className="card-orbit orbit-two" />
                    <span className="card-island" />
                    <span className="card-gate" />
                    <span className="card-sun" />
                  </div>
                  <div className="world-card-copy">
                    <span className="eyebrow">
                      {biome.name} · {world.lighting}
                    </span>
                    <h3>{world.name}</h3>
                    <p className="card-owner">
                      by {world.ownerName || "An explorer"}
                    </p>
                    <p className="card-tagline">
                      {world.tagline ||
                        "A little universe of ideas. Come explore."}
                    </p>
                    {here ? (
                      <span className="current-world">You’re here</span>
                    ) : (
                      <a
                        className="button"
                        href={`/w/${world.id}`}
                        aria-label={`Travel to ${world.name}`}
                      >
                        Enter world <ArrowRight size={16} />
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
      {!loading && !error && (query.page > 0 || hasMore) && (
        <nav className="directory-pagination" aria-label="World pages">
          <button
            className="button"
            disabled={query.page === 0}
            onClick={() => setQuery((q) => ({ ...q, page: q.page - 1 }))}
          >
            Previous
          </button>
          <span>Page {query.page + 1}</span>
          <button
            className="button"
            disabled={!hasMore}
            onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))}
          >
            Next
          </button>
        </nav>
      )}
      <p className="directory-note">
        Travel opens another portfolio at its spawn point. Cars, boats and
        planes stay in their home world. No live multiplayer.
      </p>
    </section>
  );
}
