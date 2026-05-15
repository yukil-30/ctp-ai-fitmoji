import type {
  PowerUpRecommendation,
  PowerUpRecommendationRequest,
} from "./types";

export function buildPowerUpExplanationPrompt(
  request: PowerUpRecommendationRequest,
  recommendations: PowerUpRecommendation[]
): string {
  return `
You are helping Fitmoji explain PowerUp recommendations.

Player:
${JSON.stringify(request, null, 2)}

Recommended PowerUps:
${JSON.stringify(recommendations, null, 2)}

Write a short, friendly explanation for why these PowerUps fit this player.
Do not shame the player.
Do not mention private data.
Keep it game focused and encouraging.
`;
}
