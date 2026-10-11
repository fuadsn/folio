"use client";
import { useState } from "react";
import { MessageCircle, ArrowUpRight } from "lucide-react";
import { npcSchema } from "../lib/npc";
import type { World, WorldObject } from "../lib/world";
import { Modal, Story } from "./ui";

export default function ObjectInteraction({ object, world, onClose, onOpen }: {
  object: WorldObject;
  world: World;
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  if (object.kind !== "npc") return <Story object={object} onClose={onClose} />;
  return <NpcDialog key={object.id} object={object} world={world} onClose={onClose} onOpen={onOpen} />;
}

function NpcDialog({ object, world, onClose, onOpen }: {
  object: WorldObject;
  world: World;
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const npc = npcSchema.parse(object.npc ?? {});
  const [selected, setSelected] = useState<number | null>(null);
  const choice = selected === null ? null : npc.choices[selected];
  const target = choice?.targetId ? world.objects.find((o) =>
    o.id === choice.targetId && o.kind !== "npc" && o.role !== "none",
  ) : null;
  return (
    <Modal title={`Talk to ${object.name}`} onClose={onClose}>
      <div className="npc-dialogue">
        <span className="eyebrow"><MessageCircle size={15} /> WORLD GUIDE · AUTHORED DIALOGUE</span>
        <p className="npc-speech">{npc.greeting}</p>
        <div className="npc-choices" aria-label="Conversation choices">
          {npc.choices.map((item, index) => (
            <button key={index} className={`button ${selected === index ? "primary" : ""}`}
              aria-pressed={selected === index} onClick={() => setSelected(index)}>
              {item.label || `Question ${index + 1}`}
            </button>
          ))}
        </div>
        {choice && <div className="npc-answer" aria-live="polite">
          <p>{choice.answer || "Take a look at this part of the portfolio."}</p>
          {target ? <button className="button" onClick={() => onOpen(target.id)}>
            Open {target.name} <ArrowUpRight size={15} />
          </button> : choice.targetId ? <p className="fineprint">This linked story is no longer available.</p> : null}
        </div>}
        <button className="button full" onClick={onClose}>See you around</button>
      </div>
    </Modal>
  );
}
