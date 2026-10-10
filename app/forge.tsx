"use client";
import { useEffect, useState } from "react";
import {
  Sparkles,
  ArrowUpRight,
  Loader2,
  Plus,
  Box,
  Coins,
  RefreshCw,
} from "lucide-react";
import { blueprintSchema, type Blueprint } from "../lib/world";
import { Modal } from "./ui";
type Creation = {
  id: string;
  prompt: string;
  status: string;
  result: Blueprint | null;
  error: string | null;
};
export default function Forge({
  onAdd,
  notify,
}: {
  onAdd: (b: Blueprint) => void;
  notify: (s: string) => void;
}) {
  const [prompt, setPrompt] = useState(""),
    [busy, setBusy] = useState(false),
    [provider, setProvider] = useState<string | null>(null),
    [credits, setCredits] = useState(0),
    [creations, setCreations] = useState<Creation[]>([]),
    [loaded, setLoaded] = useState(false),
    [checkout, setCheckout] = useState(false),
    [showCredits, setShowCredits] = useState(false),
    [error, setError] = useState("");
  async function refresh() {
    try {
      const res = await fetch("/api/generate");
      const data = (await res.json()) as {
        error?: string;
        provider: string | null;
        credits: number;
        creations: Creation[];
        checkout: boolean;
      };
      if (!res.ok) throw new Error(data.error);
      setProvider(data.provider);
      setCredits(data.credits);
      setCreations(data.creations);
      setCheckout(data.checkout);
      setLoaded(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  async function generate() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: crypto.randomUUID(), prompt }),
      });
      const data = (await res.json()) as { error?: string; blueprint: unknown };
      if (!res.ok) throw new Error(data.error);
      const blueprint = blueprintSchema.parse(data.blueprint);
      onAdd(blueprint);
      notify("Your custom creation is in the world. Give it a story.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      refresh();
    }
  }
  return (
    <>
      <div className="panel-title forge-title">
        <span className="forge-badge">
          <Sparkles size={13} /> THE IMAGINATION STUDIO
        </span>
        <h1>
          What if it
          <br />
          didn’t exist yet?
        </h1>
        <p>
          Describe it. Make room for it.
          <br />
          Build a world nobody else has.
        </p>
      </div>
      <div className="forge-body">
        <div className="credit-row">
          <span>
            <Coins size={15} />
            {loaded ? credits : "…"} studio credits
          </span>
          <button onClick={() => setShowCredits(true)}>
            Get more
            <Plus size={12} />
          </button>
        </div>
        <label className="prompt-label">
          What are you imagining?
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={1500}
            placeholder="A tiny observatory shaped like a mushroom, with a copper telescope and a round purple door…"
            rows={7}
          />
        </label>
        <div className="prompt-examples">
          <span>A LITTLE INSPIRATION</span>
          {[
            "A floating library with turquoise roofs",
            "A cozy ramen shop with a red lantern",
            "A rocket-shaped house with round windows",
          ].map((text) => (
            <button key={text} onClick={() => setPrompt(text)}>
              {text}
              <ArrowUpRight size={12} />
            </button>
          ))}
        </div>
        <button
          className="button primary full"
          disabled={
            busy || !provider || prompt.trim().length < 8 || credits < 1
          }
          onClick={generate}
        >
          {busy ? (
            <Loader2 className="spin" size={15} />
          ) : (
            <Sparkles size={15} />
          )}{" "}
          {busy ? "Dreaming up your creation…" : "Create something new"}
          <span>1 credit</span>
        </button>
        <p className="fineprint">
          {provider
            ? `Powered by ${provider === "gemini" ? "Gemini" : "OpenAI"}. Your description is sent to that provider. Failed generations return the credit.`
            : "AI creation is not connected yet. Add a Gemini or OpenAI key on the server to enable it."}
        </p>
        <p className="fineprint">
          Creates editable 3D shapes and buildings. For detailed sculpted
          models, use GLB upload in the library.
        </p>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="library-subhead">
          <span>MY CREATIONS</span>
          <button
            className="icon-button"
            aria-label="Refresh creations"
            onClick={refresh}
          >
            <RefreshCw size={13} />
          </button>
        </div>
        {creations.length ? (
          creations.map((c) => (
            <div className="creation" key={c.id}>
              <Box size={22} />
              <div>
                <b>{c.result?.name || c.prompt.slice(0, 36)}</b>
                <small>
                  {c.status === "complete"
                    ? `${c.result!.parts.length} editable pieces`
                    : c.status === "running"
                      ? "Building… refresh shortly"
                      : c.error || "Credit restored"}
                </small>
              </div>
              {c.result && (
                <button
                  className="icon-button"
                  aria-label={`Add ${c.result.name}`}
                  onClick={() => onAdd(c.result!)}
                >
                  <Plus size={16} />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="empty-creations">
            <Box size={28} />
            <p>
              Your next big idea
              <br />
              starts with a few words.
            </p>
          </div>
        )}
      </div>
      {showCredits && (
        <Modal
          title="A little fuel for your imagination."
          onClose={() => setShowCredits(false)}
        >
          <div className="credits-modal">
            <Sparkles size={34} />
            <h3>10 studio credits</h3>
            <p>
              One custom 3D creation per credit. Build, move, and publish with
              the library for free.
            </p>
            <button
              className="button primary full"
              disabled={!checkout}
              onClick={async () => {
                try {
                  const res = await fetch("/api/checkout", { method: "POST" });
                  const data = (await res.json()) as {
                    error?: string;
                    url: string;
                  };
                  if (!res.ok) throw new Error(data.error);
                  location.assign(data.url);
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              Continue to checkout
              <ArrowUpRight size={16} />
            </button>
            <p className="fineprint">
              {checkout
                ? "Price and payment details are shown on the secure checkout page."
                : "Checkout is not connected in this demo. Three starter credits are included once an AI provider is connected; no payment is being collected."}
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
