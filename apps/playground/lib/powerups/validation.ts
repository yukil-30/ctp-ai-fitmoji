import type { PowerUpRecommendationRequest } from "./types";

export function validatePowerUpRequest(
  body: Partial<PowerUpRecommendationRequest>
): string | null {

  if (!body.uid) {
    return "uid is required";
  }

  if (!body.healthGoals || !Array.isArray(body.healthGoals)) {
    return "healthGoals must be an array";
  }

  if (!body.healthActivity) {
    return "healthActivity is required";
  }

  if (!body.village) {
    return "village is required";
  }

  return null;
}
