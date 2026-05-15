import { generateChallenges } from "@/lib/challenges";
import {
  enrichChallengesWithLLM,
  isChallengeAiEnabled,
} from "@/lib/challengePrompt";
import { mockPersonas } from "@/lib/powerups/personas";
import { validatePowerUpRequest } from "@/lib/powerups/validation";
import type { PowerUpRecommendationRequest } from "@/lib/powerups/types";

async function resolveChallenges(
  request: Request,
  body: PowerUpRecommendationRequest
) {
  const challenges = generateChallenges(body);
  const aiRequested = isChallengeAiEnabled(request);

  if (!aiRequested) {
    return { challenges, aiEnriched: false as const };
  }

  try {
    const enriched = await enrichChallengesWithLLM(body, challenges);
    return { challenges: enriched, aiEnriched: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn("[challenge-generator] AI enrichment failed, using static copy:", message);
    return { challenges, aiEnriched: false as const };
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PowerUpRecommendationRequest;

    const validationError = validatePowerUpRequest(body);

    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    const { challenges, aiEnriched } = await resolveChallenges(request, body);

    return Response.json({
      uid: body.uid,
      generatedAt: new Date().toISOString(),
      challenges,
      ...(isChallengeAiEnabled(request) && { aiEnriched }),
    });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const testUser = mockPersonas[0];
  const { challenges, aiEnriched } = await resolveChallenges(request, testUser);

  return Response.json({
    testUser,
    challenges,
    ...(isChallengeAiEnabled(request) && { aiEnriched }),
  });
}
