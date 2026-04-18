/** UX + copy lỗi cho gán / hủy gán tư vấn viên (khớp backend / checklist). */

/**
 * Hàng gán từ API có bị chặn gỡ do lịch hẹn (nếu BE gửi cờ).
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {boolean}
 */
export function assignmentRowBlocksUnassign(row) {
  if (!row || typeof row !== "object") return false;
  const n = row.activeBookingsCount ?? row.active_bookings_count ?? row.pendingBookingsCount ?? row.pending_bookings_count;
  if (n != null && Number(n) > 0) return true;
  const f =
    row.hasBlockingAppointments ??
    row.has_blocking_appointments ??
    row.blockUnassign ??
    row.block_unassign ??
    row.cannotUnassign;
  if (f === true) return true;
  const st = row.bookingBlockStatus ?? row.booking_block_status;
  if (st != null && String(st).toUpperCase() === "BLOCKED") return true;
  return false;
}

function lower(raw) {
  return String(raw ?? "").toLowerCase();
}

/**
 * Thông điệp gần đúng checklist; fallback chuỗi gốc từ BE.
 * @param {string|undefined} raw
 * @returns {string}
 */
export function mapCounsellorAssignApiErrorMessage(raw) {
  const m = lower(raw);
  if (!m) return "Gán tư vấn viên không thành công.";
  if (/template|campus|không thuộc|cơ sở/.test(m) && (/ngoài|not belong|invalid/.test(m) || /thuộc/.test(m))) {
    return "Khung lịch không thuộc cơ sở này.";
  }
  if (/học kỳ|academic|term|ngoài.*phạm vi|outside.*term|semester/i.test(m)) {
    return raw || "Ngày gán nằm ngoài phạm vi học kỳ.";
  }
  if (/chưa đủ|not enough|minimum|below.*min|thiểu/i.test(m) && /counsellor|tv|staff|chuyên/i.test(m)) {
    return raw || "Số lượng chuyên viên chưa đủ theo cấu hình.";
  }
  if (/đầy|full|maximum|max|trần|exceed/i.test(m)) {
    return raw || "Ca này đã đầy theo cấu hình.";
  }
  if (/trùng|overlap|busy|conflict|đã có lịch/i.test(m)) {
    return raw || "Đã có lịch trùng khoảng thời gian hoặc khung giờ.";
  }
  if (/nghỉ|holiday|blocking|closed.*day/i.test(m)) {
    return raw || "Một hoặc nhiều ngày trong khoảng đang là ngày nghỉ / không được gán.";
  }
  if (/action|assign|unassign|tham số/i.test(m) && /must|phải|cần/i.test(m)) {
    return raw || "Tham số action phải là ASSIGN hoặc UNASSIGN.";
  }
  return raw || "Gán tư vấn viên không thành công.";
}

/**
 * @param {string|undefined} raw
 * @returns {string}
 */
export function mapCounsellorUnassignApiErrorMessage(raw) {
  const m = lower(raw);
  if (!m) return "Không thể hủy gán.";
  if (/không tìm thấy|not found|no assignment|missing/i.test(m)) {
    return raw || "Không tìm thấy lịch gán để hủy.";
  }
  if (/book|appointment|hẹn|đặt lịch|reserved|student|học sinh/i.test(m)) {
    return raw || "Không thể hủy gán — còn lịch hẹn đang xử lý.";
  }
  if (/action/i.test(m) && /assign|unassign|phải|cần/i.test(m)) {
    return raw || "Tham số action phải là ASSIGN hoặc UNASSIGN.";
  }
  return raw || "Không thể hủy gán.";
}

/**
 * @param {number} minC
 * @param {number} maxC 0 = không trần
 * @param {number} selectedCount
 * @returns {{ ok: boolean, message?: string }}
 */
export function validateCounsellorCountForAssign(minC, maxC, selectedCount) {
  const min = Math.max(1, Number(minC) || 1);
  const max = Number(maxC);
  const hasCap = Number.isFinite(max) && max > 0;
  if (selectedCount < min) {
    return {
      ok: false,
      message: `Cần chọn ít nhất ${min} tư vấn viên — đúng với mục «tư vấn viên tối thiểu trong 1 ca» đang lưu ở cấu hình vận hành (không phải số cố định trong code).`,
    };
  }
  if (hasCap && selectedCount > max) {
    return {
      ok: false,
      message: `Chỉ được gán tối đa ${max} tư vấn viên cùng khung và khoảng ngày (theo «tư vấn viên tối đa gán cùng khung» trong cấu hình).`,
    };
  }
  return {ok: true};
}

/** Chỉ bỏ qua mức «không chặn tư vấn viên / vận hành» theo checklist. */
const HOLIDAY_IMPACT_SKIP_WARN = new Set(["STUDENT_ONLY", "ONLINE_ONLY"]);

function ymdRangesOverlap(a0, a1, b0, b1) {
  const as = String(a0 ?? "").trim();
  const ae = String(a1 ?? "").trim();
  const bs = String(b0 ?? "").trim();
  const be = String(b1 ?? "").trim();
  if (!as || !ae || !bs || !be) return false;
  return as <= be && bs <= ae;
}

/**
 * @param {Array<Record<string, unknown>>} holidays — từ getHolidayList
 * @param {string} startYmd
 * @param {string} endYmd
 * @returns {string[]} nhãn ngày nghỉ giao với khoảng gán
 */
export function listBlockingHolidayLabelsInRange(holidays, startYmd, endYmd) {
  if (!Array.isArray(holidays) || !startYmd || !endYmd) return [];
  const out = [];
  for (const h of holidays) {
    if (!h || typeof h !== "object") continue;
    const lvl = h.holidayImpactLevel ?? h.holiday_impact_level ?? h.impactLevel ?? h.impact_level;
    if (lvl != null && HOLIDAY_IMPACT_SKIP_WARN.has(String(lvl).trim())) continue;
    const hs = h.startDate ?? h.start_date ?? "";
    const he = h.endDate ?? h.end_date ?? "";
    if (!hs || !he) continue;
    if (!ymdRangesOverlap(startYmd, endYmd, hs, he)) continue;
    const title = h.title != null && String(h.title).trim() !== "" ? String(h.title).trim() : "Ngày nghỉ";
    out.push(`${title} (${hs} → ${he})`);
  }
  return out;
}
