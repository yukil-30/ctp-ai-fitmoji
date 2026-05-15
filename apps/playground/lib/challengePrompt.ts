import type { GeneratedChallenge } from "./challenges";
import { callLlmJson, type LlmProvider } from "./llm/client";
import type { PowerUpRecommendationRequest } from "./powerups/types";

type ChallengeEnrichmentItem = {
  challengeId: string;
  title: string;
  shortDescription: string;
  reason?: string;
};

type ChallengeEnrichmentResult = {
  challenges: ChallengeEnrichmentItem[];
};

const SYSTEM_PROMPT = `
You are a copywriter for Fitmoji, a fitness game where real-world activity protects a village.

Your job is to rewrite challenge titles and descriptions so they feel personal and encouraging for this player.
You must NOT change challenge IDs, metrics, targets, or windows — only the text fields provided.

RULES:
- Keep titles short (roughly 3–6 words).
- Keep shortDescription to 1–2 sentences, game-themed, encouraging.
- Optional "reason" is one short sentence explaining why this challenge fits (no shame, no medical advice).
- Do not invent new challenge IDs.
- Return ONLY valid JSON, no markdown.

OUTPUT FORMAT:
{
  "challenges": [
    {
      "challengeId": "exact_id_from_input",
      "title": "rewritten title",
      "shortDescription": "rewritten description",
      "reason": "optional one sentence"
    }
  ]
}
`.trim();

export function isChallengeAiEnabled(request: Request): boolean {
  const url = new URL(request.url);
  if (url.searchParams.get("ai") === "true") {
    return true;
  }
  const flag = process.env.ENABLE_CHALLENGE_AI?.toLowerCase();
  return flag === "1" || flag === "true";
}

export function buildChallengeEnrichmentPrompt(
  request: PowerUpRecommendationRequest,
  challenges: GeneratedChallenge[]
): string {
  const locked = challenges.map((ch) => ({
    challengeId: ch.challengeId,
    metric: ch.metric,
    target: ch.target,
    window: ch.window,
    title: ch.title,
    shortDescription: ch.shortDescription,
  }));

  return `
PLAYER:
${JSON.stringify(request, null, 2)}

CHALLENGES TO REWRITE (keep every challengeId exactly as shown):
${JSON.stringify(locked, null, 2)}

Rewrite title and shortDescription for each challenge so they fit this player's village state and goals.
Return the same number of challenges with the same challengeId values.
`.trim();
}

function mergeEnrichment(
  staticChallenges: GeneratedChallenge[],
  enriched: ChallengeEnrichmentItem[]
): GeneratedChallenge[] {
  const byId = new Map(enriched.map((item) => [item.challengeId, item]));

  return staticChallenges.map((ch) => {
    const copy = byId.get(ch.challengeId);
    if (!copy?.title || !copy.shortDescription) {
      return ch;
    }

    return {
      ...ch,
      title: copy.title,
      shortDescription: copy.shortDescription,
      ...(copy.reason ? { reason: copy.reason } : {}),
    };
  });
}

export async function enrichChallengesWithLLM(
  request: PowerUpRecommendationRequest,
  challenges: GeneratedChallenge[]
): Promise<{ challenges: GeneratedChallenge[]; provider: LlmProvider }> {
  const { data: parsed, provider } = await callLlmJson<ChallengeEnrichmentResult>({
    system: SYSTEM_PROMPT,
    user: buildChallengeEnrichmentPrompt(request, challenges),
  });

  if (!Array.isArray(parsed.challenges) || parsed.challenges.length === 0) {
    throw new Error(`LLM response missing challenges array.\nParsed: ${JSON.stringify(parsed)}`);
  }

  const expectedIds = new Set(challenges.map((ch) => ch.challengeId));
  const returnedIds = new Set(parsed.challenges.map((ch) => ch.challengeId));

  for (const id of expectedIds) {
    if (!returnedIds.has(id)) {
      throw new Error(`LLM response missing challengeId: ${id}`);
    }
  }

  return {
    challenges: mergeEnrichment(challenges, parsed.challenges),
    provider,
  };
}
