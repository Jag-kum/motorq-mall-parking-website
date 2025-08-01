import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Slot, Session } from "@/lib/models";
import mongoose from "mongoose";
import { calculateHourlyFee } from "@/lib/billing";

export async function POST(req: NextRequest) {
  try {
    await db;
    const { plate } = await req.json();

    // Find active session
    const session = await Session.findOne({ vehicleNumberPlate: plate, status: "Active" });
    if (!session) {
      // Fallback — maybe the vehicle was added straight in the DB (no Session)
      const slot = await Slot.findOne({ currentPlate: plate, status: "Occupied" });
      if (!slot) {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
      }
      // Mark slot as free
      slot.status = "Available";
      slot.currentPlate = null;
      await slot.save();

      return NextResponse.json({
        success: true,
        slotCode: slot.slotCode,
        duration: 0,
      });
    }

    // Calculate duration before we mutate anything
    const exitTimestamp = Date.now();
    const durationMs = exitTimestamp - session.entryTime.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));

    // Calculate charges
    let fee = 0;
    let alreadyCollected = false;
    if (session.billingType === "Hourly") {
      fee = calculateHourlyFee(durationMs);
      session.billingAmount.calculated = fee;
    } else {
      // Day Pass – fee was collected at entry
      fee = session.billingAmount?.fixed || 0;
      alreadyCollected = true;
    }

    // Finalize session
    session.exitTime = new Date(exitTimestamp);
    session.status = "Completed";
    await session.save();

    // Free the slot
    await Slot.updateOne(
      { slotId: session.slotId },
      { status: "Available", currentPlate: null }
    );

    // Build human-friendly identifier for message
    const slotDoc = await Slot.findOne({ slotId: session.slotId }) || ({} as any);
    const slotIdentifier = (slotDoc as any).slotNumber || (slotDoc as any).slotCode || session.slotId;

    return NextResponse.json({
      success: true,
      slotNumber: slotIdentifier,
      duration: durationMinutes,
      fee,
      billingType: session.billingType,
      alreadyCollected,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as any)?.message || "Server error" }, { status: 500 });
  }
}
