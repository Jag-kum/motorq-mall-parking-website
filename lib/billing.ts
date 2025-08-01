// Utility helpers for parking billing logic
// Keep this in sync with pricing rules – modify here only and reuse across API routes.

export type BillingSlab = {
  // Maximum number of hours (inclusive) that this slab covers.
  // Use Infinity for open-ended range.
  maxHours: number;
  fee: number;
};

// Hourly parking slab rates (mall can update here centrally)
export const HOURLY_SLAB_RATES: BillingSlab[] = [
  { maxHours: 1, fee: 50 },
  { maxHours: 3, fee: 100 },
  { maxHours: 6, fee: 150 },
];

// Anything beyond the largest "maxHours" in the slab list will be charged at this cap.
export const MAX_DAILY_CAP_FEE = 200;

// Day-pass flat rate
export const DAY_PASS_FEE = 150;

/**
 * Calculate the hourly parking fee based on total parking duration.
 * The duration is rounded UP to the next whole hour (so 1h 5m → 2 hours).
 * @param durationMs Total duration parked in **milliseconds**
 */
export function calculateHourlyFee(durationMs: number): number {
  // Convert to hours – round up so partial hours are charged as full hours
  const hoursParked = Math.ceil(durationMs / (1000 * 60 * 60));

  // Find the first slab where hoursParked ≤ slab.maxHours
  for (const slab of HOURLY_SLAB_RATES) {
    if (hoursParked <= slab.maxHours) {
      return slab.fee;
    }
  }

  // If beyond all defined slabs, apply daily cap
  return MAX_DAILY_CAP_FEE;
}
