import type { PowerUpRecommendation } from "./types";

export const powerUps: PowerUpRecommendation[] = [
  {
    powerUpId: "crazy_capybara",
    name: "Crazy Capybara",
    category: "attack",
    reason: "Helps the player defend the village when enemies are attacking.",
    activationRequirement: {
      metric: "activeCalories",
      target: 150,
    },
  },
  {
    powerUpId: "village_shield",
    name: "Village Shield",
    category: "defense",
    reason: "Protects the village when the player has many damaged structures.",
    activationRequirement: {
      metric: "steps",
      target: 1000,
    },
  },
  {
    powerUpId: "healing_garden",
    name: "Healing Garden",
    category: "healing",
    reason: "Restores damaged village resources after mindful activity.",
    activationRequirement: {
      metric: "exerciseMinutes",
      target: 20,
    },
  },
  {
    powerUpId: "energy_well",
    name: "Energy Well",
    category: "resource",
    reason: "Helps players recover resources when village energy is low.",
    activationRequirement: {
      metric: "steps",
      target: 750,
    },
  },
  {
    powerUpId: "swift_scout",
    name: "Swift Scout",
    category: "movement",
    reason: "Supports active players by improving village response speed.",
    activationRequirement: {
      metric: "steps",
      target: 2000,
    },
  },
  {
    powerUpId: "stone_wall_boost",
    name: "Stone Wall Boost",
    category: "defense",
    reason: "Strengthens village defenses for players who prefer protection based strategies.",
    activationRequirement: {
      metric: "activeCalories",
      target: 120,
    },
  },
];
