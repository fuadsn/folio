"use client";
import { npcSchema, type Npc } from "../lib/npc";
import type { World, WorldObject } from "../lib/world";

export default function NpcEditor({ object, world, onChange, onPreview }: {
  object: WorldObject;
  world: World;
  onChange: (npc: Npc) => void;
  onPreview: () => void;
}) {
  const npc = npcSchema.parse(object.npc ?? {});
  const changeChoice = (index: number, patch: Partial<Npc["choices"][number]>) =>
    onChange({ ...npc, choices: npc.choices.map((c, i) => i === index ? { ...c, ...patch } : c) });
  return <details className="editor-details" open>
    <summary>NPC appearance & dialogue</summary>
    <div className="field-stack">
      {!object.parts?.length && <>
        {(["skin", "hat"] as const).map((key) => <label className="color-field" key={key}>
          NPC {key} color
          <input type="color" aria-label={`NPC ${key} color`} value={npc[key]}
            onChange={(e) => onChange({ ...npc, [key]: e.target.value })} />
        </label>)}
        <label>NPC hat
          <select aria-label="NPC hat" value={npc.hatStyle} onChange={(e) => onChange({ ...npc, hatStyle: e.target.value as Npc["hatStyle"] })}>
            <option value="cap">Cap</option><option value="beanie">Beanie</option><option value="none">No hat</option>
          </select>
        </label>
        <label>NPC animation
          <select aria-label="NPC animation" value={npc.motion} onChange={(e) => onChange({ ...npc, motion: e.target.value as Npc["motion"] })}>
            <option value="wave">Turn and wave to nearby visitors</option><option value="still">Stand still</option>
          </select>
        </label>
      </>}
      <label>Greeting
        <textarea aria-label="NPC greeting" rows={3} maxLength={1500} value={npc.greeting}
          onChange={(e) => onChange({ ...npc, greeting: e.target.value })} />
      </label>
      {npc.choices.map((choice, index) => <div className="npc-choice-editor field-stack" key={index}>
        <label>Question {index + 1}
          <input aria-label={`NPC question ${index + 1}`} maxLength={80} value={choice.label}
            onChange={(e) => changeChoice(index, { label: e.target.value })} />
        </label>
        <label>Answer {index + 1}
          <textarea aria-label={`NPC answer ${index + 1}`} rows={3} maxLength={2000} value={choice.answer}
            onChange={(e) => changeChoice(index, { answer: e.target.value })} />
        </label>
        <label>Linked portfolio story
          <select aria-label={`NPC story ${index + 1}`} value={choice.targetId ?? ""}
            onChange={(e) => changeChoice(index, { targetId: e.target.value || undefined })}>
            <option value="">No linked story</option>
            {world.objects.filter((o) => o.kind !== "npc" && o.role !== "none").map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
        <button className="button" onClick={() => onChange({ ...npc, choices: npc.choices.filter((_, i) => i !== index) })}>Remove question {index + 1}</button>
      </div>)}
      <button className="button" disabled={npc.choices.length >= 6}
        onClick={() => onChange({ ...npc, choices: [...npc.choices, { label: "Tell me more", answer: "" }] })}>
        Add dialogue choice ({npc.choices.length}/6)
      </button>
      <button className="button primary full" onClick={onPreview}>Preview conversation</button>
      <p className="fineprint">Scripted dialogue, not AI chat. Use the object color for the outfit. Unlocking individual pieces freezes the pose but keeps dialogue.</p>
    </div>
  </details>;
}
