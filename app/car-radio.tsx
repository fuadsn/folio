"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Radio, X, Music2, ExternalLink, Upload } from "lucide-react";
import type { WorldScene } from "../lib/scene";

const song = "https://open.spotify.com/track/5kfNNvRHnxiSwkcSfImN5s";
export default function CarRadio({
  engine,
}: {
  engine: RefObject<WorldScene | null>;
}) {
  const [open, setOpen] = useState(false),
    [source, setSource] = useState<"none" | "spotify" | "local">("none");
  const [local, setLocal] = useState<{ url: string; name: string } | null>(
      null,
    ),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null),
    audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    return () => {
      if (local) URL.revokeObjectURL(local.url);
    };
  }, [local]);
  useEffect(() => {
    const player = audio.current;
    if (player) player.volume = 0.4;
    return () => player?.pause();
  }, [local, source, open]);
  function choose(file?: File) {
    if (!file) return;
    if (
      !(
        file.type.startsWith("audio/") ||
        (!file.type && /\.(mp3|wav|ogg|m4a|flac)$/i.test(file.name))
      )
    ) {
      setError("Choose an audio file such as MP3, WAV, or OGG.");
      return;
    }
    if (!file.size || file.size > 25 * 1024 * 1024) {
      setError("Choose a non-empty audio file smaller than 25 MB.");
      return;
    }
    setError("");
    setSource("local");
    setLocal({ url: URL.createObjectURL(file), name: file.name });
  }
  return (
    <section
      className={`car-radio ${open ? "is-open" : ""}`}
      aria-label="Car radio"
      onFocusCapture={() => engine.current?.clearKeys()}
      onPointerDownCapture={() => engine.current?.clearKeys()}
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
    >
      <button
        className="button radio-toggle"
        aria-expanded={open}
        aria-label={open ? "Close car radio" : "Open car radio"}
        onClick={() => {
          engine.current?.clearKeys();
          setOpen(!open);
        }}
      >
        <Radio size={16} /> Radio {open && <X size={15} />}
      </button>
      {open && (
        <div className="radio-content">
          <span className="eyebrow">THE DRIFT SOUNDTRACK</span>
          <h3>Tokyo Drift</h3>
          <p>Teriyaki Boyz · Fast & Furious</p>
          {source === "spotify" ? (
            <>
              <iframe
                title="Tokyo Drift — Spotify player"
                src="https://open.spotify.com/embed/track/5kfNNvRHnxiSwkcSfImN5s?utm_source=oembed"
                width="100%"
                height="152"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                referrerPolicy="no-referrer"
              />
              <button className="button full" onClick={() => setSource("none")}>
                Stop Spotify player
              </button>
            </>
          ) : (
            <button
              className="button primary full"
              onClick={() => {
                setSource("spotify");
                setError("");
              }}
            >
              <Music2 size={15} /> Load Tokyo Drift on Spotify
            </button>
          )}
          <p className="fineprint">
            Loads Spotify only when you choose it. Playback may be a preview and
            depends on Spotify, your account and region.
          </p>
          <a
            className="radio-link"
            href={song}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open track on Spotify <ExternalLink size={12} />
          </a>
          <div className="radio-local">
            <input
              ref={input}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac"
              aria-label="Local music file"
              hidden
              onChange={(e) => {
                choose(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button
              className="button full"
              onClick={() => input.current?.click()}
            >
              <Upload size={14} /> Choose local audio
            </button>
            {source === "local" && local && (
              <>
                <span className="radio-filename" title={local.name}>
                  {local.name}
                </span>
                <audio
                  ref={audio}
                  controls
                  loop
                  preload="metadata"
                  src={local.url}
                  aria-label="Local music player"
                  onError={() =>
                    setError(
                      "This file could not play. Try an MP3, WAV, or OGG file supported by your browser.",
                    )
                  }
                />
              </>
            )}
            {error && (
              <p className="radio-error" role="alert">
                {error}
              </p>
            )}
            <p className="fineprint">
              Use audio you have permission to play. Files stay in this
              tab—never uploaded or included in your portfolio. Closing the
              radio or leaving the car stops playback.
            </p>
          </div>
          <button
            className="button full"
            onClick={() => {
              engine.current?.clearKeys();
              engine.current?.renderer.domElement.focus();
            }}
          >
            Back to driving · W A S D
          </button>
        </div>
      )}
    </section>
  );
}
