import { VillageNeeds } from "./powerupPrompt";

interface BoardItem {
    wallHeight: number;
    unit: string | null;
    wallHp: number,
    wallType: string | null;
    unitRewardBaselineCompletionCount: string | null;
    soilPlacedAt: number;
    foundation: string | null;
    unitMaxHp: number;
    soilStartSwarmCompletionCount: number;
    unitFacingScaleX: number;
    unitHp: number;
    unitLastAttackAt: number;
    unitLevel: number;
    unitRotation: number;
}

interface SwarmProgress {
    nextAvailableAtMs: number;
    streakCount: number;
    completionCount: number;
    firstVillageBuildPlacedAtMs: number;
}

interface BoardInfo {
    board: BoardItem[];
    swarmProgress: SwarmProgress; 
    gridCols: number;
    spentEnergy: number;
    completionCount: number;
}

export async function villageAnalyzer(localBoardInfo: BoardInfo) {

    const board = localBoardInfo.board;
    let swarmProgress = { completionCount: localBoardInfo.swarmProgress.completionCount, streakCount: localBoardInfo.swarmProgress.streakCount };

    let units: any = {
        boxer: { count: 0, avgHpPct: 0.0, minHpPct: 1.0, maxHpPct: 0.0 },
        quarterback: { count: 0, avgHpPct: 0.0, minHpPct: 1.0, maxHpPct: 0.0 },
        tennis: { count: 0, avgHpPct: 0.0, minHpPct: 1.0, maxHpPct: 0.0 },
        windmill: { count: 0, avgHpPct: 0.0 },
        house: { count: 0, avgHpPct: 0.0 },
        chest: { count: 0, avgHpPct: 0.0 },
        prizes: { count: 0, avgHpPct: 0.0 },
    }
    let walls: any = {
        stone: { count: 0, avgHpPct: 0, minHpPct: 1.0 },
        fence: { count: 0, avgHpPct: 0, minHpPct: 1.0 },
    };
    let soilCount = 0
    let windmillCount = 0;
    let emptyTiles: number = 0

    board.forEach((item: BoardItem) => {
        // 1. Process Units 
        if (item.unit && units[item.unit]) {
            const hpPct = item.unitMaxHp > 0 ? item.unitHp / item.unitMaxHp : 0;
            const u = units[item.unit];
            u.count++;
            u.totalHpPct += hpPct;
            u.minHpPct = Math.min(u.minHpPct, hpPct);
            u.maxHpPct = Math.max(u.maxHpPct, hpPct);
        }

        // 2. Process Walls
        if (item.wallType !== null) {
            const hpPct = item.wallHp / item.unitMaxHp;
            const w = walls[item.wallType];
            w.count++;
            w.totalHpPct += hpPct;
            w.minHpPct = Math.min(w.minHpPct, hpPct);
        }


        // 3. Foundation & Empty space 
        if (item.foundation === 'soil') soilCount++;
        if (!item.unit && !item.wallType) emptyTiles++;
    });

    // Finalize Averages and cleanup
    Object.keys(units).forEach(key => {
        const u = units[key];
        u.avgHpPct = u.count > 0 ? u.totalHpPct / u.count : 0;
        if (u.count === 0) u.minHpPct = 0;
        delete u.totalHpPct;
    });

    Object.keys(walls).forEach(key => {
        const w = walls[key];
        w.avgHpPct = w.count > 0 ? w.totalHpPct / w.count : 0;
        if (w.count === 0) w.minHpPct = 0;
        delete w.totalHpPct;
    });

    const harvestCapacity = { soilCount, windmillCount: units.windmill.count }

    const needs = primaryNeed(units, walls, harvestCapacity, swarmProgress);
    return {
        units,
        walls,
        harvestCapacity,
        swarmProgress,
        emptyTiles,
        needs
    }
}



function primaryNeed(units: any, walls: any, harvest: any, swarm: any) {
    let scores: { id: string, score: number }[] = [];

    // 1. boxer_healing: any boxer below 60% HP → medium; below 30% → high
    if (units.boxer.count > 0) {
        if (units.boxer.minHpPct < 0.3) {
            scores.push({ id: "boxer_healing", score: 90 }); // High
        } else if (units.boxer.minHpPct < 0.6) {
            scores.push({ id: "boxer_healing", score: 60 }); // Medium
        }
    }

    // 2. wall_repair: any wall below 70% HP, or fewer than 4 wall tiles → medium
    const totalWalls = (walls.stone?.count || 0) + (walls.fence?.count || 0);
    const minWallHp = Math.min(walls.stone?.minHpPct || 1, walls.fence?.minHpPct || 1);
    
    if (minWallHp < 0.7 || totalWalls < 4) {
        scores.push({ id: "wall_repair", score: 50 }); // Medium
    }

    // 3. quarterback_boost: all quarterbacks idle (lastAttackAt = 0) and swarm count ≥ 3 → low
    // Note: This requires your loop to track minLastAttackAt
    if (units.quarterback.count > 0 && units.quarterback.maxLastAttackAt === 0 && swarm.completionCount >= 3) {
        scores.push({ id: "quarterback_boost", score: 20 }); // Low
    }

    // 4. harvest_boost: windmill/chest present and under 50% of reward threshold → medium
    // Based on PDF: Windmill rewards 10 star every 5 swarms; Chest pays after 2 swarms 
    const windmillNeedsBoost = units.windmill.count > 0 && (swarm.completionCount % 5) < 2.5; 
    const chestNeedsBoost = units.chest.count > 0 && (swarm.completionCount % 2) < 1;

    if (windmillNeedsBoost || chestNeedsBoost) {
        scores.push({ id: "harvest_boost", score: 45 }); // Medium
    }

    // 5. instant_defense: swarm due in under 30 minutes and wall or unit HP critical
    // You'll need to pass the current time to check against swarm.nextAvailableAtMs
    const currentTime = Date.now();
    const timeToSwarm = swarm.nextAvailableAtMs - currentTime;
    const isCritical = units.boxer.minHpPct < 0.3 || minWallHp < 0.4;

    if (timeToSwarm > 0 && timeToSwarm < 1800000 && isCritical) {
        scores.push({ id: "instant_defense", score: 100 }); // Urgent Priority
    }

    // 6. energy_bonus: always a fallback
    scores.push({ id: "energy_bonus", score: 5 });

    // --- FINAL RANKING ---
    // Sort descending by score
    const sorted = scores.sort((a, b) => b.score - a.score);

    const topNeed = sorted[0];
    const secondNeed = sorted[1];

    return {
        primaryNeed: topNeed?.id || "energy_bonus",
        urgency: (topNeed?.score >= 90 ? "high" : topNeed?.score >= 40 ? "medium" : "low") as VillageNeeds["urgency"],
        secondaryNeed: secondNeed?.id || "energy_bonus"
    };
}