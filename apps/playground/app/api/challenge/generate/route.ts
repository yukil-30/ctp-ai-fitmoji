import { generateChallenges } from "@/lib/challenges";
import { mockPersonas } from "@/lib/powerups/personas";
import { validatePowerUpRequest } from "@/lib/powerups/validation";
import type { PowerUpRecommendationRequest } from "@/lib/powerups/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PowerUpRecommendationRequest;

    const validationError = validatePowerUpRequest(body);

    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    const challenges = generateChallenges(body);

    return Response.json({
      uid: body.uid,
      generatedAt: new Date().toISOString(),
      challenges,
    });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function GET() {
  const testUser = mockPersonas[0];
  const challenges = generateChallenges(testUser);

  return Response.json({
    testUser,
    challenges,
  });
}