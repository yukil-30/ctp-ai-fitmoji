interface Challenge {
    prompt: string;
    metric: Metric;
    duration: Duration;
    target: Target;
}

interface Metric {
    id: string;
    label: string;
    shortLabel: string;
    unit: string;
    resultUnit: string;
}

interface Duration {
    hours: number;
    label: string;
}

interface Target {
    amount: number;
    label: string;
    tier: number;
    tierOf: number;
    tierLabel: string;
}

export async function getRewardBudget(challenge: Challenge) {

    const tierWeight = challenge.target.tier / challenge.target.tierOf; // 0–1

    const metricDifficulty: any = {
        exerciseMinutes: 1.2,
        activeCalories: 1.0,
        steps: 0.8,
        stairs: 1.1
    };

    const multiplier = metricDifficulty[challenge.metric.id] || 1.0;
    const score = Math.min(tierWeight * multiplier, 1.0);
    return {
        score,
        tier: challenge.target.tierLabel, // Use your existing labels: "Easy", "Extreme", etc.
        maxMagnitude: Math.round(20 + score * 180), // 20–200
        rarityScore: Math.ceil(score * 5),           // 1–5
        allowPermanent: score > 0.8,                 // Only for "Extreme" tiers
        suggestedValue: score > 0.7 ? "Luxurious/Rare" : "Standard"
    };
}