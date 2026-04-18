/**
 * Ca chuẩn vận hành trường (HQ) — mã API `name` + khung giờ cho phép (FE + BE).
 */

/** @type {readonly string[]} */
export const WORK_SHIFT_TYPE_CODES = ["MORNING", "NOON", "AFTERNOON", "EVENING"];

/** Nhãn UI theo mã API */
export const WORK_SHIFT_TYPE_LABEL_VI = {
  MORNING: "Ca sáng",
  NOON: "Ca trưa",
  AFTERNOON: "Ca chiều",
  EVENING: "Ca tối",
};

/** Khung cho phép: cả khoảng [startTime, endTime] phải nằm trong [min, max] */
export const WORK_SHIFT_TIME_WINDOWS = {
  MORNING: { min: "05:00", max: "12:30" },
  NOON: { min: "10:00", max: "14:30" },
  AFTERNOON: { min: "12:00", max: "18:30" },
  EVENING: { min: "16:00", max: "22:30" },
};

function timePartsToMinutes(h, m) {
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

/**
 * Chuẩn hoá về HH:mm (hỗ trợ 7:30, 07:30:00).
 * @param {string | null | undefined} t
 * @returns {string}
 */
export function normalizeTimeHHmm(t) {
  const s = String(t ?? "").trim();
  if (!s) return "";
  const parts = s.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] ?? "0", 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return s;
  const hh = String(Math.min(23, Math.max(0, h))).padStart(2, "0");
  const mm = String(Math.min(59, Math.max(0, m))).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * @param {string | null | undefined} t
 * @returns {number}
 */
export function timeToMinutes(t) {
  const n = normalizeTimeHHmm(t);
  if (!n) return NaN;
  const [h, m] = n.split(":").map((x) => parseInt(x, 10));
  return timePartsToMinutes(h, m);
}

/**
 * Chuẩn hoá `name` về một trong 4 mã; hỗ trợ vài alias tiếng Việt / chữ thường.
 * @param {unknown} raw
 * @returns {string} — một trong WORK_SHIFT_TYPE_CODES hoặc chuỗi đã trim (để báo lỗi)
 */
export function canonicalizeWorkShiftName(raw) {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";
  const u = s.toUpperCase().replace(/\s+/g, "_");
  if (WORK_SHIFT_TYPE_CODES.includes(u)) return u;
  const lower = s.toLowerCase();
  if (lower.includes("morning") || lower.includes("sáng") || lower.includes("sang") || /^ca\s*s[áa]ng/.test(lower))
    return "MORNING";
  if (lower.includes("noon") || lower.includes("trưa") || lower.includes("trua")) return "NOON";
  if (lower.includes("afternoon") || lower.includes("chiều") || lower.includes("chieu")) return "AFTERNOON";
  if (lower.includes("evening") || lower.includes("tối") || lower.includes("toi")) return "EVENING";
  return u;
}

/**
 * @param {string} code
 * @returns {string}
 */
export function formatShiftDisplayLine(code, startTime, endTime) {
  const c = canonicalizeWorkShiftName(code);
  const label = WORK_SHIFT_TYPE_LABEL_VI[c] || code;
  const st = normalizeTimeHHmm(startTime);
  const en = normalizeTimeHHmm(endTime);
  if (st && en) return `${label} (${c}): ${st} – ${en}`;
  return `${label} (${c})`;
}

/**
 * @param {{ name?: string, startTime?: string, endTime?: string }} shift
 * @returns {{ ok: boolean, message?: string }}
 */
export function validateWorkShift(shift) {
  if (!shift || typeof shift !== "object") return { ok: false, message: "Thiếu dữ liệu ca." };
  const code = canonicalizeWorkShiftName(shift.name);
  if (!code || !WORK_SHIFT_TYPE_CODES.includes(code)) {
    return {
      ok: false,
      message: `Loại ca không hợp lệ. Chỉ dùng: ${WORK_SHIFT_TYPE_CODES.join(", ")}.`,
    };
  }
  const win = WORK_SHIFT_TIME_WINDOWS[code];
  if (!win) return { ok: false, message: "Thiếu khung giờ cho loại ca." };

  const st = normalizeTimeHHmm(shift.startTime);
  const en = normalizeTimeHHmm(shift.endTime);
  if (!st || !en) {
    return { ok: false, message: `Ca ${WORK_SHIFT_TYPE_LABEL_VI[code]}: nhập đủ giờ bắt đầu và kết thúc (HH:mm).` };
  }
  const a = timeToMinutes(st);
  const b = timeToMinutes(en);
  const w0 = timeToMinutes(win.min);
  const w1 = timeToMinutes(win.max);
  if (Number.isNaN(a) || Number.isNaN(b) || Number.isNaN(w0) || Number.isNaN(w1)) {
    return { ok: false, message: "Định dạng giờ không hợp lệ." };
  }
  if (a >= b) {
    return { ok: false, message: `Ca ${WORK_SHIFT_TYPE_LABEL_VI[code]}: giờ bắt đầu phải trước giờ kết thúc.` };
  }
  if (a < w0 || b > w1) {
    return {
      ok: false,
      message: `Ca ${WORK_SHIFT_TYPE_LABEL_VI[code]} (${code}): toàn bộ ca phải nằm trong ${win.min} – ${win.max}.`,
    };
  }
  return { ok: true };
}

/**
 * Kiểm tra toàn bộ ca trong operationSettingsData (workShifts + extraShifts mùa tuyển sinh).
 * Bỏ qua dòng trống hoàn toàn.
 * @param {Record<string, unknown>} op
 * @returns {{ ok: boolean, message?: string }}
 */
export function validateOperationSettingsWorkShifts(op) {
  if (!op || typeof op !== "object") return { ok: true };
  const wc = op.workingConfig && typeof op.workingConfig === "object" ? op.workingConfig : {};
  const list = Array.isArray(wc.workShifts) ? wc.workShifts : [];
  for (let i = 0; i < list.length; i += 1) {
    const s = list[i];
    const hasAny =
      (s?.name != null && String(s.name).trim() !== "") ||
      (s?.startTime != null && String(s.startTime).trim() !== "") ||
      (s?.endTime != null && String(s.endTime).trim() !== "");
    if (!hasAny) continue;
    const r = validateWorkShift(s);
    if (!r.ok) return { ok: false, message: r.message || `Ca làm việc #${i + 1} không hợp lệ.` };
  }

  const seasons = Array.isArray(op.admissionSeasons) ? op.admissionSeasons : [];
  for (let si = 0; si < seasons.length; si += 1) {
    const row = seasons[si];
    const extras = Array.isArray(row?.extraShifts) ? row.extraShifts : [];
    for (let ei = 0; ei < extras.length; ei += 1) {
      const s = extras[ei];
      const hasAny =
        (s?.name != null && String(s.name).trim() !== "") ||
        (s?.startTime != null && String(s.startTime).trim() !== "") ||
        (s?.endTime != null && String(s.endTime).trim() !== "");
      if (!hasAny) continue;
      const r = validateWorkShift(s);
      if (!r.ok) {
        return {
          ok: false,
          message: r.message || `Mùa tuyển sinh "${row.seasonName || si + 1}", ca tăng cường #${ei + 1} không hợp lệ.`,
        };
      }
    }
  }
  return { ok: true };
}

/**
 * Chuẩn hoá shift trước khi gửi API.
 * @param {{ name?: string, startTime?: string, endTime?: string }} s
 */
export function normalizeWorkShiftForApi(s) {
  if (!s || typeof s !== "object") return { name: "", startTime: "", endTime: "" };
  const name = canonicalizeWorkShiftName(s.name);
  return {
    name: WORK_SHIFT_TYPE_CODES.includes(name) ? name : String(s.name ?? "").trim(),
    startTime: normalizeTimeHHmm(s.startTime),
    endTime: normalizeTimeHHmm(s.endTime),
  };
}

/**
 * Khớp buổi đặt lịch (session) với loại ca — dùng filter gợi ý / validate.
 * morning → [MORNING]; afternoon → ưu tiên AFTERNOON rồi NOON; evening → [EVENING]
 * @param {string} sessionType — ví dụ MORNING | AFTERNOON | EVENING
 * @returns {string[]}
 */
export function sessionTypeToWorkShiftCodes(sessionType) {
  const u = String(sessionType || "").toUpperCase();
  if (u === "MORNING") return ["MORNING"];
  if (u === "AFTERNOON") return ["AFTERNOON", "NOON"];
  if (u === "EVENING") return ["EVENING"];
  return [];
}

/**
 * Lấy khoảng giờ preview cho buổi đặt lịch (session) từ danh sách ca HQ.
 * @param {unknown[]} workShifts
 * @param {string} sessionType
 * @returns {{ start: string, end: string, shiftCode: string } | null}
 */
export function resolveSessionWindowFromWorkShifts(workShifts, sessionType) {
  const codes = sessionTypeToWorkShiftCodes(sessionType);
  if (codes.length === 0) return null;
  const list = Array.isArray(workShifts) ? workShifts : [];
  for (const code of codes) {
    const hit = list.find((s) => canonicalizeWorkShiftName(s?.name) === code);
    if (!hit || typeof hit !== "object") continue;
    const st = normalizeTimeHHmm(hit.startTime ?? hit.start_time);
    const en = normalizeTimeHHmm(hit.endTime ?? hit.end_time);
    if (st && en) return { start: st, end: en, shiftCode: code };
  }
  return null;
}

/**
 * @param {string} sessionType
 * @param {string} workShiftName
 * @returns {boolean}
 */
export function sessionTypeMatchesWorkShiftName(sessionType, workShiftName) {
  const codes = sessionTypeToWorkShiftCodes(sessionType);
  const c = canonicalizeWorkShiftName(workShiftName);
  return codes.length === 0 ? true : codes.includes(c);
}
