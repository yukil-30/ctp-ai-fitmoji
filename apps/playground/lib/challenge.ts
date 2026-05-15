import type { PowerUpRecommendationRequest } from "./powerups/types";

export type ChallengeMetric = "steps" | "activeCalories" | "exerciseMinutes";

export type ChallengeWindow = "today" | "7d";

export type Challenge = {
  challengeId: string;
  title: string;
  shortDescription: string;
  metric: ChallengeMetric;
  target: number;
  window: ChallengeWindow;
};

export type GeneratedChallenge = Challenge & {
  progress: {
    metric: ChallengeMetric;
    current: number;
    target: number;
  };
};

type ChallengeDefinition = Challenge & {
  tags: string[];
};

const CHALLENGE_CATALOG: ChallengeDefinition[] = [
  {
    challengeId: "village_patrol_steps",
    title: "Village patrol",
    shortDescription: "Stack steps today so your village stays ready for the next wave.",
    metric: "steps",
    target: 6000,
    window: "today",
    tags: ["village", "movement"],
  },
  {
    challengeId: "fortify_calories",
    title: "Fortify the perimeter",
    shortDescription: "Burn active calories to match a stronger defense week.",
    metric: "activeCalories",
    target: 400,
    window: "7d",
    tags: ["defense", "energy"],
  },
  {
    challengeId: "recovery_ring",
    title: "Recovery ring",
    shortDescription: "Keep exercise minutes light and steady while your village heals up.",
    metric: "exerciseMinutes",
    target: 20,
    window: "today",
    tags: ["healing", "easy"],
  },
  {
    challengeId: "supply_run_steps",
    title: "Supply run",
    shortDescription: "Hit a reachable step goal to refill the feeling of village momentum.",
    metric: "steps",
    target: 4500,
    window: "today",
    tags: ["resource", "movement"],
  },
  {
    challengeId: "power_walk_endurance",
    title: "Power walk endurance",
    shortDescription: "Push a longer step day when you are building endurance.",
    metric: "steps",
    target: 9000,
    window: "7d",
    tags: ["endurance", "movement"],
  },
  {
    challengeId: "spark_calories",
    title: "Spark day",
    shortDescription: "A focused active calorie target for short high energy bursts.",
    metric: "activeCalories",
    target: 350,
    window: "today",
    tags: ["attack", "energy"],
  },
  {
    challengeId: "iron_minutes",
    title: "Iron minutes",
    shortDescription: "Stack exercise minutes when you want to feel stronger for battles ahead.",
    metric: "exerciseMinutes",
    target: 35,
    window: "7d",
    tags: ["strength", "attack"],
  },
  {
    challengeId: "steady_coast_steps",
    title: "Steady coast",
    shortDescription: "A lighter step goal for consistency without an all out sprint.",
    metric: "steps",
    target: 3500,
    window: "today",
    tags: ["easy", "default"],
  },
];

function goalIncludes(request: PowerUpRecommendationRequest, needle: string): boolean {
  return request.healthGoals.some((g) => g.toLowerCase() === needle.toLowerCase());
}

function scoreChallenge(
  def: ChallengeDefinition,
  request: PowerUpRecommendationRequest
): number {
  let score = 0;
  const { village, healthActivity } = request;

  if (def.tags.includes("village") && village.damagedStructures > 0) {
    score += 3;
  }

  if (def.tags.includes("defense") && village.damagedStructures > 0) {
    score += 2;
  }

  if (def.tags.includes("healing") && village.damagedStructures >= 2) {
    score += 4;
  }

  if (def.tags.includes("resource") && village.availableEnergy < 500) {
    score += 4;
  }

  if (def.tags.includes("movement") && healthActivity.steps >= 5000) {
    score += 2;
  }

  if (def.tags.includes("attack") && village.attackScore < village.defenseScore) {
    score += 2;
  }

  if (def.tags.includes("strength") && goalIncludes(request, "get stronger")) {
    score += 2;
  }

  if (def.tags.includes("endurance") && goalIncludes(request, "endurance")) {
    score += 2;
  }

  if (def.tags.includes("energy") && village.availableEnergy < 500) {
    score += 1;
  }

  if (def.tags.includes("default")) {
    score += 1;
  }

  if (def.tags.includes("easy") && village.damagedStructures === 0) {
    score += 1;
  }

  return score;
}

function withProgress(
  request: PowerUpRecommendationRequest,
  challenges: Challenge[]
): GeneratedChallenge[] {
  return challenges.map((ch) => ({
    ...ch,
    progress: {
      metric: ch.metric,
      current: request.healthActivity[ch.metric],
      target: ch.target,
    },
  }));
}

export function generateChallenges(
  request: PowerUpRecommendationRequest
): GeneratedChallenge[] {
  const ranked = CHALLENGE_CATALOG.map((def) => ({
    def,
    score: scoreChallenge(def, request),
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const challenges: Challenge[] = ranked.map(({ def }) => ({
    challengeId: def.challengeId,
    title: def.title,
    shortDescription: def.shortDescription,
    metric: def.metric,
    target: def.target,
    window: def.window,
  }));

  return withProgress(request, challenges);
}