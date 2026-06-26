// Optional LLM layer.
//
// The deterministic engine (scoring.ts + evidence.ts) always produces a complete
// conditions brief. This module *optionally* asks an LLM to re-author the
// committee-style narrative using ONLY the evidence packet. It is strictly
// additive: if no API key is present, or the call fails, or the response is
// malformed, we fall back to the deterministic brief. The app never breaks
// without API keys.
//
// Provider order: GROQ_API_KEY → ANTHROPIC_API_KEY → OPENAI_API_KEY → deterministic.

import { deterministicBrief, toLlmEvidence } from "./evidence";
import type { ConditionsBriefNarrative, DecisionLabel, EvidencePacket } from "./types";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are Tanseeq, an AI Development Conditions Briefing Officer for a human real-estate review committee in Abu Dhabi.

You write an advisory conditions brief. Follow these rules without exception:
- Use ONLY the facts in the supplied evidence packet (JSON). Do not invent statistics, numbers, names or facts.
- Never claim legal or regulatory approval, consent, official authority, or rejection. Everything is advisory and for human review.
- If evidence is missing, say "insufficient evidence" rather than guessing.
- Keep the decision_label exactly equal to the evidence packet's decisionLabel.
- Make the core insight clear when it applies: land/capital/market may be ready while community absorption (amenities + mobility) is lower.
- Be concise, factual and committee-ready.

Return ONLY a JSON object (no markdown, no prose) with exactly these keys:
{
  "committeeSummary": string,
  "whyNotAsSubmitted": string,
  "requiredConditions": string[],
  "evidenceReferences": string[],
  "questionsForHumanReview": string[],
  "limitations": string[]
}`;

export async function generateBrief(packet: EvidencePacket): Promise<ConditionsBriefNarrative> {
  const fallback = deterministicBrief(packet);
  const evidence = toLlmEvidence(packet);
  const userPrompt = `Evidence packet:\n${JSON.stringify(evidence)}`;

  try {
    if (process.env.GROQ_API_KEY) {
      const raw = await callGroq(userPrompt);
      return finalize(raw, packet.decisionLabel, "groq") ?? fallback;
    }
    if (process.env.ANTHROPIC_API_KEY) {
      const raw = await callAnthropic(userPrompt);
      return finalize(raw, packet.decisionLabel, "anthropic") ?? fallback;
    }
    if (process.env.OPENAI_API_KEY) {
      const raw = await callOpenAI(userPrompt);
      return finalize(raw, packet.decisionLabel, "openai") ?? fallback;
    }
  } catch {
    // Any provider error → deterministic fallback. Never throw.
    return fallback;
  }
  return fallback;
}

async function callGroq(userPrompt: string): Promise<string> {
  // Groq exposes an OpenAI-compatible chat-completions endpoint.
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.GROQ_API_KEY as string}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(userPrompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
}

async function callOpenAI(userPrompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY as string}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

// Parse + validate the model output. Returns null if it can't be trusted, so
// the caller falls back to the deterministic brief.
function finalize(
  raw: string,
  decisionLabel: DecisionLabel,
  generatedBy: "anthropic" | "openai" | "groq",
): ConditionsBriefNarrative | null {
  const json = extractJson(raw);
  if (!json) return null;

  const strArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map(String) : [];
  const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

  const committeeSummary = str(json.committeeSummary);
  if (!committeeSummary) return null; // nothing usable

  return {
    decisionLabel, // always pinned to the deterministic decision
    committeeSummary,
    whyNotAsSubmitted: str(json.whyNotAsSubmitted) || "insufficient evidence",
    requiredConditions: strArray(json.requiredConditions),
    evidenceReferences: strArray(json.evidenceReferences),
    questionsForHumanReview: strArray(json.questionsForHumanReview),
    limitations: strArray(json.limitations),
    generatedBy,
  };
}

function extractJson(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}
