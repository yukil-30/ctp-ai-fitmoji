import type { PowerUpRecommendationRequest } from "./types";

export const mockPersonas: PowerUpRecommendationRequest[] = [
  {
    uid: "uid_strength_defender",
    displayName: "Strength Defender",
    healthGoals: ["get stronger"],
    healthActivity: {
      steps: 4200,
      activeCalories: 350,
      exerciseMinutes: 35,
    },
    village: {
      defenseScore: 8,
      attackScore: 3,
      availableEnergy: 1200,
      damagedStructures: 2,
    },
  },
  {
    uid: "uid_endurance_builder",
    displayName: "Endurance Builder",
    healthGoals: ["endurance"],
    healthActivity: {
      steps: 9800,
      activeCalories: 520,
      exerciseMinutes: 55,
    },
    village: {
      defenseScore: 4,
      attackScore: 5,
      availableEnergy: 2400,
      damagedStructures: 0,
    },
  },
  {
    uid: "uid_low_energy_player",
    displayName: "Low Energy Player",
    healthGoals: ["build consistency"],
    healthActivity: {
      steps: 900,
      activeCalories: 80,
      exerciseMinutes: 5,
    },
    village: {
      defenseScore: 2,
      attackScore: 2,
      availableEnergy: 250,
      damagedStructures: 1,
    },
  },
];
