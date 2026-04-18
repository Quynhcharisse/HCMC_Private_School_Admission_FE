/** Các scalar vận hành so với `hqDefault.operation` (campus override). */
export const OP_SCALAR_KEYS = [
  "maxBookingPerSlot",
  "minCounsellorPerSlot",
  "maxCounsellorsPerSlot",
  "slotDurationInMinutes",
  "bufferBetweenSlotsMinutes",
  "allowBookingBeforeHours",
];

export function numOpScalar(v) {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @returns {Record<string, boolean | null>} mỗi key: true = khác HQ, false = trùng HQ, null = không so được
 */
export function computeOpScalarVsHq(effectiveOp, hqOp, hqMissing) {
  const out = {};
  if (hqMissing || !hqOp || typeof hqOp !== "object") {
    for (const k of OP_SCALAR_KEYS) out[k] = null;
    return out;
  }
  for (const k of OP_SCALAR_KEYS) {
    out[k] = numOpScalar(effectiveOp?.[k]) !== numOpScalar(hqOp[k]);
  }
  return out;
}
