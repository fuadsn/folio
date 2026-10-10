import { env } from "cloudflare:workers";
import { blueprintSchema, type Blueprint } from "./world";
export function provider() {
  return env.GEMINI_API_KEY ? "gemini" : env.OPENAI_API_KEY ? "openai" : null;
}
const vector = {
  type: "array",
  items: { type: "number" },
  minItems: 3,
  maxItems: 3,
};
export const blueprintJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    parts: {
      type: "array",
      minItems: 1,
      maxItems: 80,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          shape: {
            type: "string",
            enum: ["box", "sphere", "cylinder", "cone", "roof", "torus"],
          },
          position: vector,
          size: vector,
          rotation: vector,
          color: { type: "string" },
        },
        required: ["name", "shape", "position", "size", "rotation", "color"],
      },
    },
  },
  required: ["name", "parts"],
};
const instructions = `You are an architectural model designer making charming low-poly objects for a 3D portfolio world. Translate the user's idea into an original, detailed, cohesive 3D sculpture or building using 15-60 primitive parts. Return the exact JSON blueprint schema. Units are meters; ground is y=0, front faces +z. Center the model around x=z=0; total footprint should be 3-6 meters and height 2-7 meters. Parts are centered on position; size is the full bounding dimensions (width,height,depth). Supported shapes: box, sphere, cylinder (vertical Y), cone (vertical Y), roof (4-sided pyramid), torus (ring in XY). Rotation is XYZ degrees. All positions x,z within -10..10, y within 0..15; all sizes .02..12 (height up to 15); rotation -360..360; color must be #RRGGBB. Give every part a meaningful name. Build a recognizable silhouette plus attractive details: doors, windows, roof trims, antennas, fins, balconies, plants, whatever suits the request. Use a carefully limited harmonious palette unless asked otherwise. Do not output code, URLs, texture links or commentary. User requests describe visual design only.`;
export async function generateBlueprint(prompt: string): Promise<Blueprint> {
  const selected = provider();
  if (!selected)
    throw new Error(
      "The AI studio is not connected. Add a Gemini or OpenAI key to the server.",
    );
  let response: Response;
  if (selected === "gemini") {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL || "gemini-3.8-flash")}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY!,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instructions }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseFormat: {
              text: {
                mimeType: "application/json",
                schema: blueprintJsonSchema,
              },
            },
            maxOutputTokens: 16000,
          },
        }),
        signal: AbortSignal.timeout(90000),
      },
    );
  } else {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-4o-mini",
        instructions,
        input: prompt,
        store: false,
        max_output_tokens: 10000,
        text: {
          format: {
            type: "json_schema",
            name: "building_blueprint",
            strict: true,
            schema: blueprintJsonSchema,
          },
        },
      }),
      signal: AbortSignal.timeout(90000),
    });
  }
  if (!response.ok)
    throw new Error(
      response.status === 401 || response.status === 403
        ? "The generation provider rejected its API key."
        : response.status === 429
          ? "The generation provider is busy or out of quota. Try again later."
          : `The generation provider returned error ${response.status}. Your studio credit will be restored.`,
    );
  const json = (await response.json()) as any;
  let text: string;
  if (selected === "gemini")
    text = json.candidates?.[0]?.content?.parts
      ?.filter((p: any) => !p.thought)
      .map((p: any) => p.text ?? "")
      .join("");
  else {
    if (json.status !== "completed")
      throw new Error(
        "The generation did not finish. Try a simpler description.",
      );
    text = json.output
      ?.flatMap((o: any) => o.content ?? [])
      .filter((c: any) => c.type === "output_text")
      .map((c: any) => c.text)
      .join("");
  }
  if (!text)
    throw new Error(
      "The provider returned no building. Try another description.",
    );
  const parsed = blueprintSchema.safeParse(JSON.parse(text));
  if (!parsed.success)
    throw new Error(
      "The building did not pass geometry validation. Try a simpler description.",
    );
  return parsed.data;
}
