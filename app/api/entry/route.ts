import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Slot, Session, Vehicle } from "@/lib/models";
import mongoose from "mongoose";
import { DAY_PASS_FEE } from "@/lib/billing";

function getAllowedSlotTypes(vehicleType: string): string[] {
  switch (vehicleType) {
    case "Handicap Accessible":
      return ["Handicap", "Handicap Accessible"];
    case "EV":
      return ["EV"];
    case "Bike":
      return ["Bike"];
    default:
      return ["Regular", "Compact"];
  }
}

export async function POST(req: NextRequest) {
  try {
    await db;
    const { plate, vehicleType, slotNumber, billingType = "Hourly" } = await req.json();

    // Validate plate format (e.g., TN07CV7077)
    if (!plate || !/^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/.test(plate.toUpperCase())) {
      return NextResponse.json({ error: "Invalid plate format" }, { status: 400 });
    }

    // Create or fetch vehicle record
    const vehicle = await Vehicle.findOneAndUpdate(
      { numberPlate: plate },
      { numberPlate: plate, vehicleType },
      { upsert: true, new: true }
    );

    // Check if vehicle already parked
    const activeSession = await Session.findOne({ vehicleNumberPlate: plate, status: "Active" });
    if (activeSession) {
      return NextResponse.json(
        { error: "Vehicle already parked" },
        { status: 409 }
      );
    }

    let slot;
    if (slotNumber) {
      // Manual assignment path
      slot = await Slot.findOne({ slotNumber }) || await Slot.findOne({ slotCode: slotNumber });
      if (!slot)
        return NextResponse.json({ error: "Invalid slot code" }, { status: 404 });

      // validate compatibility
      if (
        slot.status !== "Available" ||
        !getAllowedSlotTypes(vehicleType).includes(slot.slotType)
      ) {
        return NextResponse.json({ error: "Incompatible or unavailable slot" }, { status: 409 });
      }

      slot.status = "Occupied";
      slot.currentPlate = plate;
      await slot.save();
    } else {
      // Auto assignment
      slot = await Slot.findOneAndUpdate(
        {
          status: "Available",
          slotType: { $in: getAllowedSlotTypes(vehicleType) },
        },
        {
          status: "Occupied",
          currentPlate: plate,
        },
        { sort: { distanceRank: 1 }, new: true }
      );
      if (!slot) {
        return NextResponse.json({ error: "No available slot" }, { status: 409 });
      }
      // Ensure slotNumber exists for UI messages
      if (!slot.slotNumber && slot.slotCode) {
        slot.slotNumber = slot.slotCode;
        await slot.save();
      }
    }

    // Ensure slot has a slotId (legacy docs may miss it)
    if (!slot.slotId) {
      slot.slotId = new mongoose.Types.ObjectId().toString();
      await slot.save();
    }

    // Ensure slot not already in an active session (edge-case overlap)
    const slotConflict = await Session.findOne({ slotId: slot.slotId, status: "Active" });
    if (slotConflict) {
      // rollback slot status
      slot.status = "Available";
      slot.currentPlate = null;
      await slot.save();
      return NextResponse.json(
        { error: "Selected slot is currently active with another vehicle" },
        { status: 409 }
      );
    }

    // Create session
    await Session.create({
      vehicleNumberPlate: plate,
      slotId: slot.slotId,
      status: "Active",
      billingType,
      billingAmount: billingType === "Day Pass" ? { fixed: DAY_PASS_FEE } : undefined,
    });

    const raw: any = slot;
    const slotIdentifier = raw.slotNumber || raw.slotCode || raw.slotId || raw._id;

    const feeCollected = billingType === "Day Pass" ? DAY_PASS_FEE : 0;

    return NextResponse.json({
      success: true,
      slotNumber: slotIdentifier,
      level: slot.level,
      billingType,
      fee: feeCollected,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as any)?.message || "Server error" }, { status: 500 });
  }
}
