import { NextResponse } from "next/server";
import { villageAnalyzer } from  "../../../../lib/villageAnalyzer"
import { getRewardBudget } from "../../../../lib/rewardCalibrator"
import { generatePowerupWithLLM } from "@/lib/powerupPrompt";




// POST HANDLER
export async function POST(req: Request) {
  try {
    const userPayload = await req.json()

    const { villageMap, challenge } = userPayload

    const villageStatus = await villageAnalyzer(villageMap.local)
    const rewardBudget = await getRewardBudget(challenge)


    // Step 3: Ask the LLM to generate a tailored powerup
    const { powerup, villageNeedsAssessment } = await generatePowerupWithLLM(
      villageStatus,
      rewardBudget
    );
 
    return NextResponse.json({
      status: "success",
      village_status: villageStatus,
      rewardBudget,
      generatedPowerup: powerup,
      villageNeedsAssessment,
    });
 
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[powerup-generator] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}