import { NextResponse } from "next/server";
import { villageAnalyzer } from  "../../../../lib/villageAnalyzer"
import { getRewardBudget } from "../../../../lib/rewardCalibrator"




// POST HANDLER
export async function POST(req: Request) {
  try {
    const userPayload = await req.json()

    const { villageMap, challenge } = userPayload

    const village_status = await villageAnalyzer(villageMap.local)
    const rewardBudget = await getRewardBudget(challenge)


    return NextResponse.json({
      status: "success",
      village_status,
      rewardBudget
    })


  } catch (error) {
    console.log("Error")
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}