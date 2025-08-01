import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Session } from "@/lib/models";

export async function GET(req: NextRequest) {
  try {
    await db;

    // Fetch completed sessions – include only relevant fields to keep payload small
    const sessions = await Session.find({ status: "Completed" }).select(
      "vehicleNumberPlate billingType entryTime exitTime billingAmount"
    );

    const totalRevenue = sessions.reduce((sum: number, session: any) => {
      const fixed = session.billingAmount?.fixed || 0;
      const calculated = session.billingAmount?.calculated || 0;
      return sum + fixed + calculated;
    }, 0);

    return NextResponse.json({
      totalRevenue,
      sessions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch revenue info" },
      { status: 500 }
    );
  }
}
