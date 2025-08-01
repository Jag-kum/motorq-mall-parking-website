"use client";
import { useEffect, useState } from "react";

interface SessionInfo {
  _id: string;
  vehicleNumberPlate: string;
  billingType: "Hourly" | "Day Pass";
  entryTime: string;
  exitTime: string;
  billingAmount: {
    calculated?: number;
    fixed?: number;
  };
}

export default function RevenuePage() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRevenue();
  }, []);

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/revenue");
      const data = await res.json();
      if (res.ok) {
        setSessions(data.sessions);
        setTotal(data.totalRevenue);
      } else {
        setError(data.error || "Failed to fetch revenue");
      }
    } catch {
      setError("Failed to fetch revenue");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          💰 Revenue & Billing Summary
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-200 p-4 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Total Revenue</h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <p className="text-2xl font-bold">₹ {total}</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Completed Sessions</h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 border">Vehicle</th>
                    <th className="px-4 py-2 border">Billing Type</th>
                    <th className="px-4 py-2 border">Entry</th>
                    <th className="px-4 py-2 border">Exit</th>
                    <th className="px-4 py-2 border">Fee (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => {
                    const fee = (s.billingAmount.fixed || 0) + (s.billingAmount.calculated || 0);
                    return (
                      <tr key={s._id} className="border-t">
                        <td className="px-4 py-2 border">{s.vehicleNumberPlate}</td>
                        <td className="px-4 py-2 border">{s.billingType}</td>
                        <td className="px-4 py-2 border">
                          {new Date(s.entryTime).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 border">
                          {new Date(s.exitTime).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 border">{fee}</td>
                      </tr>
                    );
                  })}
                  {sessions.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-center">
                        No completed sessions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
