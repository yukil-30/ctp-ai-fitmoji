

// powerupPrompt.ts

const ANTHROPIC_API_URL = process.env.ANTHROPIC_API_URL;
const LOCAL_LLM_API_URL = process.env.LOCAL_LLM_API_URL

// --- Types ---

export interface VillageNeeds {
    primaryNeed: string;
    urgency: "high" | "medium" | "low";
    secondaryNeed: string;
}

export interface VillageStatus {
    units: Record<string, any>;
    walls: Record<string, any>;
    harvestCapacity: any;
    swarmProgress: any;
    emptyTiles: number;
    needs: VillageNeeds;
}

export interface RewardBudget {
    score: number;
    tier: string;
    maxMagnitude: number;
    rarityScore: number;
    allowPermanent: boolean;
    suggestedValue: string;
}

export interface GeneratedPowerup {
    id: string;
    version: number;
    status: "active";
    visibility: "persistent" | "ephemeral";
    displayName: string;
    shortDescription: string;
    sourceMode: "swarm_village";
    category: "combat" | "support" | "harvest" | "defense";
    ui: {
        assetKey: string;
        primaryColor: string;
        sortOrder: number;
    };
    duration: {
        type: "instant" | "timed" | "per_placed_unit";
        milliseconds?: number;
    };
    effects: Array<Record<string, any>>;
    useWindow: {
        mode: "manual";
        screen: "swarm_village";
        allowedBattleStatuses: string[];
    };
    stacking: {
        chargeStackable: boolean;
        activeEffectStackable: boolean;
        maxConcurrentInstances: number;
    };
    activationConsumption: Record<string, any>;
    telemetry: {
        eventType: string;
        recommendedFields: string[];
    };
}

export interface PowerupGenerationResult {
    powerup: GeneratedPowerup;
    villageNeedsAssessment: string;
}


const FEW_SHOT_EXAMPLES = `
EXAMPLE 1 — Combat powerup (crazy_capy):
{
  "powerup": {
    "id": "crazy_capy",
    "version": 1,
    "status": "active",
    "visibility": "persistent",
    "displayName": "Crazy Capy",
    "shortDescription": "A roaming combat powerup that damages ijoms during an active swarm.",
    "sourceMode": "swarm_village",
    "category": "combat",
    "ui": { "assetKey": "capybara_powerup", "primaryColor": "#34d399", "sortOrder": 10 },
    "duration": { "type": "timed", "milliseconds": 20000 },
    "effects": [
      { "type": "spawn_actor", "actorId": "crazy_capy", "spawnLocation": "near_castle" },
      { "type": "damage_enemies_in_radius", "target": "ijoms", "damagePerHit": 10, "hitRadiusTiles": 0.72 }
    ],
    "useWindow": { "mode": "manual", "screen": "swarm_village", "allowedBattleStatuses": ["wave"] },
    "stacking": { "chargeStackable": false, "activeEffectStackable": false, "maxConcurrentInstances": 1 },
    "activationConsumption": { "setsChargeProgressToZero": true, "consumesCharge": false },
    "telemetry": { "eventType": "swarm_village_powerup_use", "recommendedFields": ["powerupId", "damageDealt", "enemiesKnockedOut", "recordedAt"] }
  },
  "villageNeedsAssessment": "Village has low wall HP with a swarm approaching — combat powerup helps clear enemies before they deal more damage."
}
 
EXAMPLE 2 — Support powerup (forest_spirit):
{
  "powerup": {
    "id": "forest_spirit",
    "version": 1,
    "status": "active",
    "visibility": "persistent",
    "displayName": "Forest Spirit",
    "shortDescription": "A support powerup that heals damaged village defenses and units.",
    "sourceMode": "swarm_village",
    "category": "support",
    "ui": { "assetKey": "forest_spirit", "primaryColor": "#86efac", "sortOrder": 20 },
    "duration": { "type": "instant", "milliseconds": 0 },
    "effects": [
      { "type": "heal_all_damaged_village_items", "targets": ["damageable_units", "walls"], "healFractionOfMaxHp": 0.1, "rounding": "ceil", "cappedAtMaxHp": true },
      { "type": "visual_feedback", "effect": "heal_sparkle_per_healed_cell" }
    ],
    "useWindow": { "mode": "manual", "screen": "swarm_village", "allowedBattleStatuses": ["ready", "wave", "cleared", "lost"] },
    "stacking": { "chargeStackable": true, "activeEffectStackable": false, "maxConcurrentInstances": 0 },
    "activationConsumption": { "consumesCharges": 1, "persistsBoardAfterUse": true },
    "telemetry": { "eventType": "swarm_village_powerup_use", "recommendedFields": ["powerupId", "healedItemCount", "totalHpRestored", "recordedAt"] }
  },
  "villageNeedsAssessment": "Multiple units and walls are below 50% HP — instant heal powerup addresses the most urgent survival need."
}
`.trim();

// --- System prompt ---

const SYSTEM_PROMPT = `
You are a game design engine for Fitmoji, a fitness-gamification app. 
Your job is to generate one contextually appropriate powerup for a player's village based on their current village state and challenge difficulty.
 
GAME MECHANICS:
- Units: boxer (melee, 135HP), quarterback (ranged, 150HP), tennis (ranged, 115HP)
- Structures: Walls (20HP), Windmills (6HP), Houses (80HP)
- Enemies are called "ijoms"
- Stars: Luxury currency. Energy: Earned via real-world activity.
- Powerup categories: "combat" | "support" | "harvest" | "defense"
 
POWERUP DESIGN RULES:
- combat: spawns actors or boosts damage during waves. allowedBattleStatuses must include "wave".
- support: heals or buffs. Can be used in most battle statuses.
- harvest: boosts star/energy yield from windmills or chests.
- defense: temporarily boosts wall/unit HP or adds shields.
- Duration scales with budget score: score < 0.4 → instant or short timed (≤15s), score 0.4–0.7 → medium (15–45s), score > 0.7 → long or per_placed_unit.
- damagePerHit for combat effects should scale with maxMagnitude (roughly maxMagnitude / 15, capped at 25).
- healFractionOfMaxHp for support effects: score < 0.5 → 0.10, score 0.5–0.8 → 0.20, score > 0.8 → 0.35.
- id must be snake_case and unique-sounding. assetKey mirrors the id.
- primaryColor: use a hex that fits the category (green tones for support, red for combat, gold for harvest, blue for defense).
 
OUTPUT FORMAT:
Respond ONLY with a valid JSON object. No markdown, no explanation outside the JSON.
{
  "powerup": { ...GeneratedPowerup fields... },
  "villageNeedsAssessment": "1–2 sentence explanation of why this powerup was chosen"
}
`.trim();

export async function generatePowerupWithLLM(
    villageStatus: VillageStatus,
    rewardBudget: RewardBudget
): Promise<PowerupGenerationResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");

    const userMessage = `
VILLAGE STATUS:
${JSON.stringify(villageStatus, null, 2)}
 
REWARD BUDGET:
${JSON.stringify(rewardBudget, null, 2)}
 
PRIMARY NEED: ${villageStatus.needs.primaryNeed} (urgency: ${villageStatus.needs.urgency})
SECONDARY NEED: ${villageStatus.needs.secondaryNeed}
 
HERE ARE TWO EXAMPLES OF VALID POWERUP OBJECTS TO USE AS SCHEMA REFERENCE:
${FEW_SHOT_EXAMPLES}
 
Now generate ONE new powerup tailored to the village status and budget above.
The powerup should be a creative variation — give it a unique id and displayName, do not reuse "crazy_capy" or "forest_spirit".
`.trim();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            // model: "llama3.1:8b",
            max_tokens: 2000,
            system: SYSTEM_PROMPT,
            messages: [
                { role: "user", content: userMessage },
            ],
            // stream: false,
            // format: "json",
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Anthropic API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    // Log the raw shape so you can see exactly what Ollama returned
    console.log("[powerup-generator] Raw Anthropic response:", JSON.stringify(data, null, 2));

    const rawText: string =
        data.content?.[0]?.text  // OpenAI-compat
        // data.message?.content             // Ollama native
        ?? "";

    if (!rawText) {
        throw new Error(
            `Anthropic returned no content. Full response: ${JSON.stringify(data)}`
        );
    }

    // Strip any accidental markdown fences
    const stripped = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    const cleaned = stripped.replace(
        /:\s*(Math\.[a-zA-Z]+\([^)]+\)|[\d\s+\-*/.()]+)/g,
        (_match, expr) => {
            try {
                // Only allow digits and basic math — no arbitrary code execution
                if (/^[\d\s+\-*/.()Mathminaxflorceundbs]+$/.test(expr) || /^Math\.[a-z]+\(/.test(expr)) {
                    const result = Function(`"use strict"; return (${expr})`)();
                    if (typeof result === "number" && isFinite(result)) {
                        return `: ${Math.round(result * 1000) / 1000}`;
                    }
                }
            } catch { /* leave as-is if eval fails */ }
            return _match;
        }
    );


    let parsed: PowerupGenerationResult;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new Error(`Failed to parse LLM response as JSON.\nRaw: ${rawText}`);
    }

    // Lightweight schema guard
    if (!parsed.powerup?.id || !parsed.powerup?.effects || !parsed.villageNeedsAssessment) {
        throw new Error(`LLM response missing required fields.\nParsed: ${JSON.stringify(parsed)}`);
    }

    return parsed;
}