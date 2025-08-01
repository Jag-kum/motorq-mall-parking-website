import mongoose, { Schema } from "mongoose";

// Vehicle Schema
const VehicleSchema = new Schema(
  {
    vehicleId: {
      type: String,
      unique: true,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString(), // Auto-generated
    },
    numberPlate: {
      type: String,
      unique: true,
      required: true,
    },
    vehicleType: {
      type: String,
      enum: ["Car", "Bike", "EV", "Handicap", "Handicap Accessible"],
      required: true,
    },
  },
  { timestamps: true }
);

// Parking Slot Schema
const SlotSchema = new Schema(
  {
    slotId: {
      type: String,
      unique: true,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString(), // Auto-generated
    },
    slotNumber: {
      type: String,
      unique: true,
      required: true,
    }, // E.g., "B1-12"
    slotType: {
      type: String,
      enum: ["Regular", "Compact", "Bike", "EV", "Handicap", "Handicap Accessible"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Available", "Occupied", "Maintenance"],
      default: "Available",
    },
    currentPlate: { type: String, default: null }, // for quick lookup/display
    // Keep your existing fields for functionality
    level: { type: Number, required: true },
    distanceRank: { type: Number, required: true },
  },
  { timestamps: true }
);

// Parking Session Schema
const SessionSchema = new Schema(
  {
    sessionId: {
      type: String,
      unique: true,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString(), // Auto-generated
    },
    vehicleNumberPlate: {
      type: String,
      required: true,
    }, // Reference to vehicle
    slotId: {
      type: String,
      required: true,
    }, // Reference to assigned slot
    entryTime: {
      type: Date,
      default: Date.now,
    },
    exitTime: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["Active", "Completed"],
      default: "Active",
    },
    billingType: {
      type: String,
      enum: ["Hourly", "Day Pass"],
      required: true,
    },
    billingAmount: {
      calculated: {
        type: Number,
        default: 0,
      }, // For hourly - calculated on exit
      fixed: {
        type: Number,
        default: 0,
      }, // For day pass - fixed rate at entry
    },
  },
  { timestamps: true }
);

// Single compound indexes for queries
SlotSchema.index({ status: 1, slotType: 1, distanceRank: 1 });
SessionSchema.index({ vehicleNumberPlate: 1, status: 1 });

export const Vehicle =
  mongoose.models.Vehicle || mongoose.model("Vehicle", VehicleSchema);
export const Slot = mongoose.models.Slot || mongoose.model("Slot", SlotSchema);
export const Session =
  mongoose.models.Session || mongoose.model("Session", SessionSchema);
