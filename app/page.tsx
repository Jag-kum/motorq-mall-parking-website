"use client";
import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { CheckCircle, Car, Wrench, Search } from "lucide-react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, ChartTooltip);

interface Slot {
  _id: string;
  slotCode: string;
  slotNumber: string;
  level: number;
  slotType: string;
  status: "Available" | "Occupied" | "Maintenance";
  currentPlate?: string;
}

export default function ParkingManagement() {
  /* ───────── state ───────── */
  const [slots, setSlots] = useState<Slot[]>([]);
  const [entryPlate, setEntryPlate] = useState("");
  const [entryType, setEntryType] = useState("Car");
  const [billingType, setBillingType] =
    useState<"Hourly" | "Day Pass">("Hourly");
  const [exitPlate, setExitPlate] = useState("");
  const [searchPlate, setSearchPlate] = useState("");
  const [manualAssign, setManualAssign] = useState(false);
  const [manualSlot, setManualSlot] = useState("");
  const [loading, setLoading] = useState(false);

  /* ───────── derived ───────── */
  const counts = slots.reduce(
    (acc, s) => ({ ...acc, [s.status]: (acc[s.status] || 0) + 1 }),
    {} as Record<Slot["status"], number>
  );
  const occupancyRate = slots.length
    ? Math.round(((counts.Occupied || 0) / slots.length) * 100)
    : 0;

  /* ───────── effects ───────── */
  useEffect(() => {
    fetchSlots();
    const id = setInterval(fetchSlots, 3000);
    return () => clearInterval(id);
  }, []);

  /* ───────── API helpers ───────── */
  async function fetchSlots() {
    const res = await fetch("/api/slots");
    const json = await res.json();
    setSlots(json.slots);
  }

  async function handleSearch() {
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
        toast.success(
          `Vehicle ${searchPlate.toUpperCase()} → ${data.slotNumber} (Lvl ${data.level})`
        );
      } else toast.error("Vehicle not found");
    } catch {
      toast.error("Search failed");
    }
    setLoading(false);
  }

  /* ───────── API helpers for entry/exit ───────── */
  async function handleEntry(e: React.FormEvent) {
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
        toast.success(`Parked at ${data.slotNumber} (Lvl ${data.level})${data.billingType === "Day Pass" ? ` – Fee ₹${data.fee}` : ""}`);
        setEntryPlate("");
        setManualSlot("");
        fetchSlots();
      } else toast.error(data.error);
    } catch {
      toast.error("Entry failed");
    }
    setLoading(false);
  }

  async function handleExit(e: React.FormEvent) {
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
        toast.success(
          data.billingType === "Day Pass"
            ? `Exited ${data.slotNumber} – fee already collected`
            : `Exited ${data.slotNumber} – Fee ₹${data.fee}`
        );
        setExitPlate("");
        fetchSlots();
      } else toast.error(data.error);
    } catch {
      toast.error("Exit failed");
    }
    setLoading(false);
  }

  async function toggleMaintenance(slotNumber: string, status: string) {
    const newStatus = status === "Maintenance" ? "Available" : "Maintenance";
    try {
      const res = await fetch("/api/slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotNumber, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error || "Failed to update slot");
      fetchSlots();
    } catch {
      toast.error("Failed to update slot");
    }
  }

  function slotsByLevel(list: Slot[]) {
    return list.reduce((acc: Record<string, Slot[]>, s) => {
      const name = s.level === 0 ? "Ground" : `Level ${s.level}`;
      (acc[name] ||= []).push(s);
      return acc;
    }, {});
  }

  /* ───────── chart data ───────── */
  const donutColors =
    occupancyRate > 70
      ? ["#f43f5e", "#e2e8f0"]
      : occupancyRate > 40
      ? ["#fbbf24", "#e2e8f0"]
      : ["#10b981", "#e2e8f0"];
  const chartData = {
    datasets: [
      {
        data: [occupancyRate, 100 - occupancyRate],
        backgroundColor: donutColors,
        cutout: "70%",
        borderWidth: 0,
      },
    ],
  };

  /* ───────── component ───────── */
  return (
    <Fragment>
      <Toaster position="bottom-right" toastOptions={{ duration: 5000 }} />
      <main className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <header className="sticky top-0 z-40 flex flex-col gap-4 rounded-2xl bg-white/70 p-4 shadow backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-800">
              Parking Management System
            </h1>
            <div className="flex flex-1 items-center justify-end gap-4">
              <Link
                href="/revenue"
                className="text-indigo-600 transition hover:text-indigo-700"
              >
                Revenue
              </Link>
              {/* search box */}
              <div className="flex items-center overflow-hidden rounded-xl bg-slate-100 focus-within:ring-2 focus-within:ring-indigo-500">
                <Search className="mx-2 h-4 w-4 flex-shrink-0 text-slate-400" />
                <input
                  className="w-36 bg-transparent px-2 py-2 text-sm outline-none"
                  placeholder="TN07CV7077"
                  value={searchPlate}
                  onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
                  pattern="[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}"
                />
              </div>
              <button
                onClick={handleSearch}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                disabled={loading}
              >
                Search
              </button>
            </div>
          </header>

          {/* Info banner */}
          <section className="flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800 md:flex-row md:items-center md:justify-between">
            <p className="font-medium">
              Hourly: 0–1h ₹50 · 1–3h ₹100 · 3–6h ₹150 · Max ₹200/day — Day-Pass
              ₹150
            </p>
            <div className="flex flex-wrap gap-3">
              <LegendDot color="bg-emerald-400" label="Available" />
              <LegendDot color="bg-rose-400" label="Occupied" />
              <LegendDot color="bg-amber-400" label="Maintenance" />
            </div>
            <p className="font-semibold">Have a pleasant visit!</p>
          </section>

          {/* Dashboard */}
          <section className="grid gap-4 sm:grid-cols-4">
            {/* donut */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-6 shadow-lg sm:col-span-1">
              <Doughnut
                data={chartData}
                options={{ plugins: { tooltip: { enabled: false } } }}
              />
              <p className="mt-3 text-sm font-medium text-gray-600">Occupied</p>
            </div>
            {/* cards */}
            <div className="grid grid-cols-3 gap-4 sm:col-span-3">
              <StatCard
                color="emerald"
                label="Available"
                count={counts.Available || 0}
                Icon={CheckCircle}
              />
              <StatCard
                color="rose"
                label="Occupied"
                count={counts.Occupied || 0}
                Icon={Car}
              />
              <StatCard
                color="amber"
                label="Maintenance"
                count={counts.Maintenance || 0}
                Icon={Wrench}
              />
            </div>
          </section>

          {/* ───────────────── Entry + Exit Forms ───────────────── */}
          <section className="grid gap-6 md:grid-cols-2">
            {/* Entry */}
            <form
              onSubmit={handleEntry}
              className="space-y-4 rounded-2xl bg-white p-6 shadow"
            >
              <h2 className="text-xl font-semibold text-indigo-600">Vehicle Entry</h2>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Number Plate</label>
                <div className="relative">
                  <input
                    value={entryPlate}
                    onChange={(e) => setEntryPlate(e.target.value.toUpperCase())}
                    placeholder="TN07CV7077"
                    pattern="[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}"
                    required
                    className="w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Vehicle Type</label>
                <select
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-indigo-500"
                >
                  <option>Car</option>
                  <option>Bike</option>
                  <option>EV</option>
                  <option>Handicap Accessible</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Billing</label>
                <select
                  value={billingType}
                  onChange={(e) =>
                    setBillingType(e.target.value as "Hourly" | "Day Pass")
                  }
                  className="w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-indigo-500"
                >
                  <option>Hourly</option>
                  <option>Day Pass</option>
                </select>
              </div>

              <details className="rounded-xl border border-gray-200 p-3">
                <summary className="cursor-pointer select-none text-sm font-medium text-gray-700">
                  Manual Slot Assignment
                </summary>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={manualAssign}
                    onChange={(e) => setManualAssign(e.target.checked)}
                  />
                  <input
                    disabled={!manualAssign}
                    value={manualSlot}
                    onChange={(e) => setManualSlot(e.target.value.toUpperCase())}
                    placeholder="G-H-001"
                    className="flex-1 rounded-xl border border-gray-300 p-2 disabled:opacity-50"
                  />
                </div>
              </details>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-indigo-600 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "Processing…" : "Park Vehicle"}
              </button>
            </form>

            {/* Exit */}
            <form
              onSubmit={handleExit}
              className="space-y-4 rounded-2xl bg-white p-6 shadow"
            >
              <h2 className="text-xl font-semibold text-rose-600">Vehicle Exit</h2>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Number Plate</label>
                <input
                  value={exitPlate}
                  onChange={(e) => setExitPlate(e.target.value.toUpperCase())}
                  placeholder="TN07CV7077"
                  pattern="[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}"
                  required
                  className="w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-rose-600 py-3 font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {loading ? "Processing…" : "Exit Vehicle"}
              </button>
            </form>
          </section>

          {/* ───────────────── Slot Grid ───────────────── */}
          {Object.entries(slotsByLevel(slots)).map(([level, levelSlots]) => (
            <section key={level} className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">{level}</h3>
              <div className="grid grid-cols-8 gap-2 md:grid-cols-12 lg:grid-cols-16">
                {levelSlots.map((slot) => (
                  <div
                    key={slot._id}
                    onClick={() =>
                      slot.status !== "Occupied" &&
                      toggleMaintenance(slot.slotNumber || slot.slotCode, slot.status)
                    }
                    title={`${slot.slotCode} - ${slot.status}${slot.currentPlate ? ` (${slot.currentPlate})` : ""}`}
                    className={`relative cursor-pointer rounded p-2 text-center text-xs transition-all duration-200 hover:shadow-lg
                      ${
                        slot.status === "Available"
                          ? "bg-emerald-200 text-emerald-800 hover:bg-emerald-300"
                          : slot.status === "Occupied"
                          ? "bg-rose-200 text-rose-800"
                          : "bg-amber-200 text-amber-800 hover:bg-amber-300"
                      }`}
                  >
                    <div className="font-bold">
                      {slot.slotCode.split("-").pop()}
                    </div>
                    {slot.currentPlate && (
                      <div className="truncate text-[10px]" title={slot.currentPlate}>
                        {slot.currentPlate}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}

        </div>
      </main>
    </Fragment>
  );
}

/* ───────── helpers ───────── */
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-gray-700">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      {label}
    </span>
  );
}

interface StatProps {
  color: "emerald" | "rose" | "amber";
  label: string;
  count: number;
  Icon: typeof CheckCircle;
}
function StatCard({ color, label, count, Icon }: StatProps) {
  return (
    <div
      className={`rounded-2xl bg-${color}-100 text-${color}-600 flex flex-col items-center py-6 shadow transition-all duration-300 hover:shadow-xl`}
    >
      <Icon className="h-6 w-6" />
      <span className="mt-1 text-3xl font-extrabold">{count}</span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
