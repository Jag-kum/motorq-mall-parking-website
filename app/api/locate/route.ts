import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Slot, Session } from "@/lib/models";

export async function POST(req: NextRequest) {
  try {
    await db;
    const { plate } = await req.json();
    if (!plate)
      return NextResponse.json({ error: "plate is required" }, { status: 400 });

    // Find an active session first
    let session = await Session.findOne({ vehicleNumberPlate: plate.toUpperCase(), status: "Active" });
    let slotDoc;

    if (session) {
      slotDoc = await Slot.findOne({ slotId: session.slotId });
    } else {
      // In case the session doc wasn't created, fall back to Slot currentPlate
      slotDoc = await Slot.findOne({ currentPlate: plate.toUpperCase(), status: "Occupied" });
    }

    if (!slotDoc) {
      return NextResponse.json({ found: false });
    }

    const slotIdentifier = slotDoc.slotNumber || slotDoc.slotCode || slotDoc._id;
    return NextResponse.json({
      found: true,
      slotNumber: slotIdentifier,
      level: slotDoc.level,
      slotType: slotDoc.slotType,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 });
  }
}
