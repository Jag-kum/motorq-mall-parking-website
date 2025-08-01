import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Slot } from "@/lib/models";
import mongoose from "mongoose";

export async function GET() {
  try {
    await db;
    const slots = await Slot.find({}).sort({ level: 1, slotNumber: 1 });
    return NextResponse.json({ slots });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch slots" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await db;
    const { slotNumber, status } = await req.json();

    if (!slotNumber || !status) {
      return NextResponse.json(
        { error: "slotNumber and status are required" },
        { status: 400 }
      );
    }

    const slot = await Slot.findOne({ slotNumber }) || await Slot.findOne({ slotCode: slotNumber });
    if (!slot) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    // ensure slotId exists for legacy docs
    if (!slot.slotId) {
      slot.slotId = new mongoose.Types.ObjectId().toString();
    }

    slot.status = status;
    if (status === "Maintenance") {
      slot.currentPlate = null;
    }
    await slot.save();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PATCH /api/slots error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update slot" },
      { status: 500 }
    );
  }
}
