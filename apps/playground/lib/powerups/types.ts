export type PowerUpCategory =
  | "attack"
  | "defense"
  | "healing"
  | "resource"
  | "movement";

export type PowerUpRecommendationRequest = {
  uid: string;
  displayName?: string;
  healthGoals: string[];
  healthActivity: {
    steps: number;
    activeCalories: number;
    exerciseMinutes: number;
  };
  village: {
    defenseScore: number;
    attackScore: number;
    availableEnergy: number;
    damagedStructures: number;
  };
};

export type PowerUpRecommendation = {
  powerUpId: string;
  name: string;
  category: PowerUpCategory;
  reason: string;
  activationRequirement: {
    metric: "steps" | "activeCalories" | "exerciseMinutes";
    target: number;
  };
};
