/** UX + normalize cho `operationSettingsData.academicCalendar` (HK1/HK2) — giới hạn ngày gán lịch tư vấn. */

export function normalizeAcademicDate(value) {
  if (value == null) return "";
  if (Array.isArray(value) && value.length >= 3) {
    const [y, m, d] = value;
    if (Number.isFinite(Number(y)) && Number.isFinite(Number(m)) && Number.isFinite(Number(d))) {
      const pad = (n) => String(Math.trunc(Number(n))).padStart(2, "0");
      return `${Number(y)}-${pad(m)}-${pad(d)}`;
    }
    return "";
  }
  const s = String(value).trim();
  if (!s) return "";
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export function normalizeAcademicTerm(term) {
  if (!term || typeof term !== "object") return {start: "", end: ""};
  return {
    start: normalizeAcademicDate(term.start),
    end: normalizeAcademicDate(term.end),
  };
}

export function normalizeAcademicCalendarShape(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    term1: normalizeAcademicTerm(src.term1),
    term2: normalizeAcademicTerm(src.term2),
  };
}

export function termIsComplete(term) {
  const s = String(term?.start ?? "").trim();
  const e = String(term?.end ?? "").trim();
  return Boolean(s && e);
}

/** Chỉ một trong hai ô có giá trị → không hợp lệ khi đang bật giới hạn. */
export function termIsPartial(term) {
  const s = String(term?.start ?? "").trim();
  const e = String(term?.end ?? "").trim();
  return Boolean((s && !e) || (!s && e));
}

function compareYmd(a, b) {
  const sa = String(a ?? "").trim();
  const sb = String(b ?? "").trim();
  if (!sa || !sb) return 0;
  return sa.localeCompare(sb);
}

/**
 * Đã cấu hình đủ để BE coi là «siết» theo học kỳ: ít nhất một HK có cả start/end và start ≤ end.
 */
export function isAcademicCalendarLimitActive(cal) {
  const n = normalizeAcademicCalendarShape(cal);
  const check = (t) => termIsComplete(t) && compareYmd(t.start, t.end) <= 0;
  return check(n.term1) || check(n.term2);
}

export function emptyAcademicCalendar() {
  return {
    term1: {start: "", end: ""},
    term2: {start: "", end: ""},
  };
}

/**
 * Khi user bật công tắc giới hạn học kỳ và nhấn Lưu.
 * @returns {{ ok: boolean, message?: string }}
 */
export function validateAcademicCalendarForSave(limitToggleOn, cal) {
  const n = normalizeAcademicCalendarShape(cal);
  if (!limitToggleOn) return {ok: true};

  if (termIsPartial(n.term1) || termIsPartial(n.term2)) {
    return {
      ok: false,
      message:
        "Mỗi học kỳ cần nhập đủ «Từ ngày» và «Đến ngày», hoặc để cả hai trống. Không để một nửa ô.",
    };
  }
  if (!isAcademicCalendarLimitActive(n)) {
    return {
      ok: false,
      message:
        "Đã bật giới hạn theo học kỳ: cần ít nhất một học kỳ có cặp ngày hợp lệ (từ ≤ đến). Hoặc tắt công tắc để không giới hạn.",
    };
  }
  const t1ok = !termIsComplete(n.term1) || compareYmd(n.term1.start, n.term1.end) <= 0;
  const t2ok = !termIsComplete(n.term2) || compareYmd(n.term2.start, n.term2.end) <= 0;
  if (!t1ok || !t2ok) {
    return {
      ok: false,
      message: "Trong từng học kỳ, ngày bắt đầu phải trước hoặc bằng ngày kết thúc.",
    };
  }
  return {ok: true};
}

/** yyyy-mm-dd có nằm trong một học kỳ đã cấu hình đủ (start..end) không. */
export function ymdInAnyConfiguredTerm(ymd, cal) {
  const n = normalizeAcademicCalendarShape(cal);
  const inTerm = (t) =>
    termIsComplete(t) && compareYmd(ymd, t.start) >= 0 && compareYmd(ymd, t.end) <= 0;
  return inTerm(n.term1) || inTerm(n.term2);
}

/**
 * ASSIGN: khi đã bật giới hạn HK, cả ngày bắt đầu và ngày kết thúc gán phải nằm trong phạm vi một học kỳ (có thể khác nhau).
 * @returns {{ ok: boolean, message?: string }}
 */
export function validateAssignDateRangeAgainstAcademicTerms(startYmd, endYmd, cal, limitActive) {
  const s = String(startYmd ?? "").trim();
  const e = String(endYmd ?? "").trim();
  if (!limitActive || !isAcademicCalendarLimitActive(cal)) return {ok: true};
  if (!s || !e) {
    return {ok: false, message: "Chọn đủ ngày bắt đầu và kết thúc."};
  }
  const sOk = ymdInAnyConfiguredTerm(s, cal);
  const eOk = ymdInAnyConfiguredTerm(e, cal);
  if (sOk && eOk) return {ok: true};
  return {
    ok: false,
    message:
      "Khoảng ngày gán phải có cả ngày bắt đầu và ngày kết thúc nằm trong một học kỳ đã cấu hình (HK1 hoặc HK2).",
  };
}
