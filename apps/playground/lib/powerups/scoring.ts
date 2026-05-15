import { powerUps } from "./data";
import type {
  PowerUpRecommendation,
  PowerUpRecommendationRequest,
} from "./types";

export function recommendPowerUps(
  request: PowerUpRecommendationRequest
): PowerUpRecommendation[] {
  return powerUps
    .map((powerUp) => {
      let score = 0;

      if (powerUp.category === "defense" && request.village.damagedStructures > 0) {
        score += 3;
      }

      if (powerUp.category === "attack" && request.village.attackScore < request.village.defenseScore) {
        score += 2;
      }

      if (powerUp.category === "healing" && request.village.damagedStructures >= 2) {
        score += 4;
      }

      if (powerUp.category === "resource" && request.village.availableEnergy < 500) {
        score += 4;
      }

      if (powerUp.category === "movement" && request.healthActivity.steps >= 5000) {
        score += 2;
      }

      if (
        request.healthGoals.includes("get stronger") &&
        powerUp.category === "attack"
      ) {
        score += 2;
      }

      if (
        request.healthGoals.includes("endurance") &&
        powerUp.activationRequirement.metric === "steps"
      ) {
        score += 2;
      }

      return {
        ...powerUp,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ score, ...powerUp }) => powerUp);
}
