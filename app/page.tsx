"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Slot {
  _id: string;
  slotCode: string;
  slotNumber: string;
  level: number;
  slotType: string;
  status: string;
  currentPlate?: string;
}

export default function ParkingManagement() {
  // States
  const [slots, setSlots] = useState<Slot[]>([]);
  const [entryPlate, setEntryPlate] = useState("");
  const [entryType, setEntryType] = useState("Car");
  const [billingType, setBillingType] = useState<"Hourly" | "Day Pass">(
    "Hourly"
  );
  const [exitPlate, setExitPlate] = useState("");
  const [searchPlate, setSearchPlate] = useState("");
  const [manualAssign, setManualAssign] = useState(false);
  const [manualSlot, setManualSlot] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSearch = async () => {
    if (!searchPlate) return;
    setLoading(true);
    try {
      const res = await fetch("/api/locate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plate: searchPlate.toUpperCase() }),
      });
      const data = await res.json();
      if (res.ok && data.found) {
        setMessage(
          `Vehicle ${searchPlate.toUpperCase()} is parked at ${data.slotNumber} (Level ${data.level})`
        );
      } else {
        setMessage("Vehicle not found or not parked currently");
      }
    } catch {
      setMessage("Search failed");
    }
    setLoading(false);
  };

  // Load slots on mount and every 3 seconds
  useEffect(() => {
    fetchSlots();
    const interval = setInterval(fetchSlots, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchSlots = async () => {
    try {
      const res = await fetch("/api/slots");
      const data = await res.json();
      setSlots(data.slots);
    } catch (error) {
      console.error("Failed to fetch slots");
    }
  };

  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryPlate) return;
    if (manualAssign && !manualSlot) return;

    setLoading(true);
    try {
      const res = await fetch("/api/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plate: entryPlate.toUpperCase(),
          vehicleType: entryType,
          billingType,
          ...(manualAssign && { slotNumber: manualSlot.toUpperCase() }),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(
          ` Vehicle parked at ${data.slotNumber} (Level ${data.level})` +
            (data.billingType === "Day Pass"
              ? ` – Fee collected: ₹${data.fee}`
              : "")
        );
        setEntryPlate("");
        setManualSlot("");
        fetchSlots();
      } else {
        setMessage(` ${data.error}`);
      }
    } catch {
      setMessage(" Entry failed");
    }
    setLoading(false);
  };

  const handleExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exitPlate) return;

    setLoading(true);
    try {
      const res = await fetch("/api/exit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plate: exitPlate.toUpperCase() }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(
          data.billingType === "Day Pass"
            ? ` Vehicle exited from ${data.slotNumber}. Duration: ${data.duration} mins. Fee already collected (₹${data.fee})`
            : ` Vehicle exited from ${data.slotNumber}. Duration: ${data.duration} mins. Fee: ₹${data.fee}`
        );
        setExitPlate("");
        fetchSlots();
      } else {
        setMessage(` ${data.error}`);
      }
    } catch {
      setMessage(" Exit failed");
    }
    setLoading(false);
  };

  const toggleMaintenance = async (
    slotNumber: string,
    currentStatus: string
  ) => {
    const newStatus =
      currentStatus === "Maintenance" ? "Available" : "Maintenance";

    try {
      const res = await fetch("/api/slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotNumber, status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "Failed to update slot");
        return;
      }
      fetchSlots();
    } catch {
      setMessage("Failed to update slot");
    }
  };

  // Group slots by level
  const slotsByLevel = slots.reduce((acc, slot) => {
    const levelName = slot.level === 0 ? "Ground" : `Level ${slot.level}`;
    if (!acc[levelName]) acc[levelName] = [];
    acc[levelName].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  // Count slots by status
  const counts = slots.reduce((acc, slot) => {
    acc[slot.status] = (acc[slot.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate overall occupancy percentage
  const occupancyRate = slots.length
    ? Math.round(((counts.Occupied || 0) / slots.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          Parking Management System
        </h1>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
           <Link
             href="/revenue"
             className="text-blue-600 underline hover:text-blue-800"
           >
             View Revenue & Billing
           </Link>
           <div className="flex gap-2">
             <input
               type="text"
               value={searchPlate}
               onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
               pattern="[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}"
               title="Format: TN07CV7077"
               placeholder="Search vehicle (e.g., MH12AB1234)"
               className="p-2 border border-gray-300 rounded-md"
             />
             <button
               onClick={handleSearch}
               disabled={loading}
               className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
             >
               Search
             </button>
           </div>
         </div>
        {/* Status Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          {/* Occupancy Progress */}
          <div className="sm:col-span-1 bg-white p-4 rounded-lg shadow flex flex-col justify-center">
            <h3 className="text-sm font-medium text-gray-600 mb-2 text-center">
              Occupancy
            </h3>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                style={{ width: `${occupancyRate}%` }}
                className={`h-4 rounded-full ${
                  occupancyRate > 70
                    ? "bg-red-500"
                    : occupancyRate > 40
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
              />
            </div>
            <p className="mt-1 text-center text-sm text-gray-600">
              {occupancyRate}% occupied
            </p>
          </div>

          {/* Status Cards */}
          <div className="col-span-1 sm:col-span-3 grid grid-cols-3 gap-4">
            <div className="bg-green-100 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-800">
                {counts.Available || 0}
              </div>
              <div className="text-green-600">Available</div>
            </div>
            <div className="bg-red-100 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-800">
                {counts.Occupied || 0}
              </div>
              <div className="text-red-600">Occupied</div>
            </div>
            <div className="bg-yellow-100 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-800">
                {counts.Maintenance || 0}
              </div>
              <div className="text-yellow-600">Maintenance</div>
            </div>
          </div>
        </div>

        {/* Entry and Exit Forms */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Entry Form */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-green-700">
               Vehicle Entry
            </h2>
            <form onSubmit={handleEntry} className="space-y-4">
              <input
                 type="text"
                 value={entryPlate}
                 onChange={(e) => setEntryPlate(e.target.value.toUpperCase())}
                 placeholder="License Plate (e.g., TN07CV7077)"
                 pattern="[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}"
                 title="Format: 2 letters, 2 digits, 1-2 letters, 4 digits. Example: TN07CV7077"
                 className="w-full p-3 border border-gray-300 rounded-md"
                 required
               />
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md"
              >
                <option value="Car"> Car</option>
                <option value="Bike">Bike</option>
                <option value="EV"> Electric Vehicle</option>
                <option value="Handicap Accessible">
                  {" "}
                  Handicap Accessible
                </option>
              </select>

              {/* Billing Type */}
              <select
                value={billingType}
                onChange={(e) => setBillingType(e.target.value as any)}
                className="w-full p-3 border border-gray-300 rounded-md"
              >
                <option value="Hourly"> Hourly</option>
                <option value="Day Pass"> Day Pass</option>
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="manualAssign"
                  checked={manualAssign}
                  onChange={(e) => setManualAssign(e.target.checked)}
                />
                <label htmlFor="manualAssign" className="text-sm">
                  Assign slot manually
                </label>
              </div>
              {manualAssign && (
                <input
                  type="text"
                  value={manualSlot}
                  onChange={(e) => setManualSlot(e.target.value.toUpperCase())}
                  placeholder="Slot Code (e.g., G-H-001)"
                  className="w-full p-3 border border-gray-300 rounded-md"
                  required
                />
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Processing..." : "Park Vehicle"}
              </button>
            </form>
          </div>

          {/* Exit Form */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-red-700">
               Vehicle Exit
            </h2>
            <form onSubmit={handleExit} className="space-y-4">
              <input
               type="text"
               value={exitPlate}
               onChange={(e) => setExitPlate(e.target.value.toUpperCase())}
               placeholder="License Plate (e.g., TN07CV7077)"
               pattern="[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}"
               title="Format: TN07CV7077"
               className="w-full p-3 border border-gray-300 rounded-md"
               required
             />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 text-white py-3 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Processing..." : "Exit Vehicle"}
              </button>
            </form>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 text-center">
            <p className="text-lg">{message}</p>
            <button
              onClick={() => setMessage("")}
              className="mt-2 text-blue-600 underline"
            >
              Clear
            </button>
          </div>
        )}

        {/* Slot Grid by Level */}
        <div className="space-y-8">
          {Object.entries(slotsByLevel).map(([level, levelSlots]) => (
            <div key={level} className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-4 text-gray-700 flex items-center justify-between">
                <span>{level}</span>
                <span className="text-sm font-normal text-gray-500">
                  {levelSlots.filter((s) => s.status === "Occupied").length}/
                  {levelSlots.length} occupied
                </span>
              </h3>
              <div className="grid grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-2">
                {levelSlots.map((slot) => (
                  <div
                    key={slot._id}
                    className={`
                      relative p-2 text-xs text-center rounded cursor-pointer transition-all
                      ${
                        slot.status === "Available"
                          ? "bg-green-200 hover:bg-green-300 text-green-800"
                          : slot.status === "Occupied"
                          ? "bg-red-200 text-red-800"
                          : "bg-yellow-200 hover:bg-yellow-300 text-yellow-800"
                      }
                    `}
                    onClick={() =>
                      slot.status !== "Occupied" &&
                      toggleMaintenance(
                        slot.slotNumber || slot.slotCode,
                        slot.status
                      )
                    }
                    title={`${slot.slotCode} - ${slot.slotType} - ${
                      slot.status
                    }${slot.currentPlate ? ` (${slot.currentPlate})` : ""}`}
                  >
                    <div className="font-bold">
                      {slot.slotCode.split("-").pop()}
                    </div>
                    <div className="text-xs">{slot.slotType.charAt(0)}</div>
                    {slot.currentPlate && (
                      <div className="text-xs truncate">
                        {slot.currentPlate}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Click available/maintenance slots to toggle maintenance mode
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold mb-2">Color Legend:</h4>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-200 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-200 rounded"></div>
              <span>Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-200 rounded"></div>
              <span>Maintenance</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
