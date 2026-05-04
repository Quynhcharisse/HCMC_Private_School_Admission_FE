import axiosClient from "../configs/APIConfig.jsx";
import { parseSchoolConfigResponseBody } from "./SchoolFacilityService.jsx";
import { resolveSchoolWideWorkingConfigDisplay } from "../utils/schoolWideWorkingConfig.js";
import { isAcademicCalendarLimitActive, normalizeAcademicCalendarShape } from "../utils/academicCalendarUi.js";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

/**
 * Chuẩn hoá giờ gửi BE (`LocalTime.parse`): `HH:mm` (bỏ giây nếu có).
 * @param {string | null | undefined} t
 * @returns {string}
 */
export function normalizeScheduleTimeHHmm(t) {
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
 * Ràng buộc form khung lịch từ GET /campus/config (`campusCurrent` + `hqDefault.operation`).
 * @returns {{
 *   slotDurationMinutes: number,
 *   bufferBetweenSlotsMinutes: number,
 *   stepMinutes: number,
 *   minCounsellorsPerSlot: number,
 *   maxCounsellorsPerSlot: number,
 *   maxBookingPerSlot: number,
 *   workShifts: Array<Record<string, unknown>>,
 *   regularDays: string[],
 *   workingNote: string,
 *   academicCalendar: { term1: { start: string, end: string }, term2: { start: string, end: string } },
 *   academicSemesterLimitActive: boolean
 * }}
 */
export function parseCampusSchedulePolicyFromConfigResponse(res) {
  const body = parseSchoolConfigResponseBody(res);
  const cur = body.campusCurrent ?? body.campus_current ?? {};
  const hq = body.hqDefault ?? body.hq_default ?? {};
  const hqOp = hq.operation && typeof hq.operation === "object" ? hq.operation : {};

  const pol =
    cur.policyDetail && typeof cur.policyDetail === "object"
      ? cur.policyDetail
      : cur.policy_detail && typeof cur.policy_detail === "object"
        ? cur.policy_detail
        : {};

  /** BE có thể đặt slot ở `hqDefault.operation.policyDetail` thay vì thẳng trên operation. */
  const hqPol =
    hqOp.policyDetail && typeof hqOp.policyDetail === "object"
      ? hqOp.policyDetail
      : hqOp.policy_detail && typeof hqOp.policy_detail === "object"
        ? hqOp.policy_detail
        : {};

  const slotRaw =
    pol.slotDurationInMinutes ??
    pol.slot_duration_in_minutes ??
    hqPol.slotDurationInMinutes ??
    hqPol.slot_duration_in_minutes ??
    cur.slotDurationInMinutes ??
    cur.slot_duration_in_minutes ??
    hqOp.slotDurationInMinutes ??
    hqOp.slot_duration_in_minutes;
  const slotDurationMinutes = Number(slotRaw);
  const slot = Number.isFinite(slotDurationMinutes) && slotDurationMinutes > 0 ? slotDurationMinutes : 0;

  const bufferRaw =
    pol.bufferBetweenSlotsMinutes ??
    pol.buffer_between_slots_minutes ??
    hqPol.bufferBetweenSlotsMinutes ??
    hqPol.buffer_between_slots_minutes ??
    cur.bufferBetweenSlotsMinutes ??
    cur.buffer_between_slots_minutes ??
    hqOp.bufferBetweenSlotsMinutes ??
    hqOp.buffer_between_slots_minutes;
  const bufN = Number(bufferRaw);
  const bufferBetweenSlotsMinutes =
    Number.isFinite(bufN) && bufN >= 0 ? Math.floor(bufN) : 0;
  const stepMinutes = slot > 0 ? slot + bufferBetweenSlotsMinutes : 0;

  const minTvRaw =
    pol.minCounsellorPerSlot ??
    pol.min_counsellor_per_slot ??
    hqPol.minCounsellorPerSlot ??
    hqPol.min_counsellor_per_slot ??
    cur.minCounsellorPerSlot ??
    cur.min_counsellor_per_slot ??
    hqOp.minCounsellorPerSlot ??
    hqOp.min_counsellor_per_slot;
  const minN = Number(minTvRaw);
  const minCounsellorsPerSlot =
    Number.isFinite(minN) && minN >= 0 ? Math.floor(minN) : 1;

  const maxTvRaw =
    pol.maxCounsellorsPerSlot ??
    pol.max_counsellors_per_slot ??
    hqPol.maxCounsellorsPerSlot ??
    hqPol.max_counsellors_per_slot ??
    cur.maxCounsellorsPerSlot ??
    cur.max_counsellors_per_slot ??
    hqOp.maxCounsellorsPerSlot ??
    hqOp.max_counsellors_per_slot;
  const mxN = Number(maxTvRaw);
  const maxCounsellorsPerSlot =
    maxTvRaw == null || maxTvRaw === "" || Number.isNaN(mxN)
      ? 0
      : Math.max(0, Math.floor(mxN));

  const maxBookRaw =
    pol.maxBookingPerSlot ??
    pol.max_booking_per_slot ??
    hqPol.maxBookingPerSlot ??
    hqPol.max_booking_per_slot ??
    cur.maxBookingPerSlot ??
    cur.max_booking_per_slot ??
    hqOp.maxBookingPerSlot ??
    hqOp.max_booking_per_slot;
  const bookN = Number(maxBookRaw);
  const maxBookingPerSlot =
    maxBookRaw == null || maxBookRaw === "" || Number.isNaN(bookN)
      ? 1
      : Math.max(0, Math.floor(bookN));

  const wc = resolveSchoolWideWorkingConfigDisplay(hqOp, cur);

  const shiftsRaw = wc.workShifts ?? wc.work_shifts;
  const workShifts = Array.isArray(shiftsRaw) ? shiftsRaw : [];

  const rdRaw = wc.regularDays ?? wc.regular_days;
  const regularDays = Array.isArray(rdRaw)
    ? rdRaw.map((d) => String(d || "").toUpperCase()).filter((d) => DAYS.includes(d))
    : [];

  const workingNote =
    wc.note != null && String(wc.note).trim() !== ""
      ? String(wc.note).trim()
      : wc.working_note != null && String(wc.working_note).trim() !== ""
        ? String(wc.working_note).trim()
        : "";

  const rawHqCal = hqOp.academicCalendar ?? hqOp.academic_calendar;
  const rawCurCal = cur.academicCalendar ?? cur.academic_calendar;
  const nHq = normalizeAcademicCalendarShape(rawHqCal);
  const nCur = normalizeAcademicCalendarShape(rawCurCal);
  /** Trụ sở trước; nếu chưa «siết» thì dùng bản trên campus (nếu có). */
  const academicCalendar = isAcademicCalendarLimitActive(nHq)
    ? nHq
    : isAcademicCalendarLimitActive(nCur)
      ? nCur
      : nHq;
  const academicSemesterLimitActive = isAcademicCalendarLimitActive(academicCalendar);

  return {
    slotDurationMinutes: slot,
    bufferBetweenSlotsMinutes,
    stepMinutes,
    minCounsellorsPerSlot,
    maxCounsellorsPerSlot,
    maxBookingPerSlot,
    workShifts,
    regularDays,
    workingNote,
    academicCalendar,
    academicSemesterLimitActive,
  };
}

/**
 * POST /api/v1/campus/schedule/templete — body chuẩn contract:
 * - Tạo mới: không gửi `templateId` (hoặc null); có thể gửi `expandToPolicySlots: true`.
 * - Sửa: `templateId` > 0, `dayOfWeek` một phần tử.
 * - `campusId` giữ khi có (một số triển khai BE vẫn nhận).
 * @param {{
 *   templateId?: number | null,
 *   campusId?: number | null,
 *   dayOfWeek: string[],
 *   sessionType: string,
 *   active?: boolean,
 *   expandToPolicySlots?: boolean
 * }} input
 * @returns {Record<string, unknown>}
 */
export function buildUpsertCampusScheduleTemplatePayload(input) {
  const {templateId, campusId, dayOfWeek, sessionType, active, expandToPolicySlots} = input || {};

  /** @type {Record<string, unknown>} */
  const payload = {
    dayOfWeek: Array.isArray(dayOfWeek) ? dayOfWeek.map((d) => String(d || "").toUpperCase()) : [],
    sessionType: String(sessionType || "").trim().toUpperCase(),
  };

  if (campusId != null && campusId !== "" && !Number.isNaN(Number(campusId))) {
    payload.campusId = Number(campusId);
  }

  const tid = Number(templateId);
  const isUpdate = Number.isFinite(tid) && tid > 0;
  if (isUpdate) {
    payload.templateId = tid;
  }

  if (active === false) {
    payload.active = false;
  }

  if (!isUpdate && expandToPolicySlots === true) {
    payload.expandToPolicySlots = true;
  }

  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined || payload[k] === "") delete payload[k];
  });
  return payload;
}

/**
 * Chuẩn hoá map thứ trong tuần → mảng template (GET campus list).
 * @param {Record<string, unknown>} raw
 */
export function normalizeScheduleTemplateDayMap(raw) {
  const out = {};
  for (const d of DAYS) {
    const v = raw?.[d];
    out[d] = Array.isArray(v) ? v : [];
  }
  return out;
}

/**
 * GET /api/v1/campus/{campusId}/schedule/templete/list — chỉ path `campusId`, không query/body (Parameters: none).
 * @param {number|string} campusId
 */
export const getCampusScheduleTemplateList = async (campusId) => {
  const id = campusId == null || campusId === "" ? null : Number(campusId);
  if (id == null || Number.isNaN(id)) {
    return Promise.reject(new Error("campusId is required"));
  }
  const response = await axiosClient.get(`/campus/${id}/schedule/templete/list`);
  return response ?? null;
};

/**
 * GET /api/v1/campus/schedule/template/list/export
 * Export danh sách template lịch của campus hiện tại theo phiên đăng nhập.
 */
export const exportCampusScheduleTemplateList = async () => {
  const response = await axiosClient.get("/campus/schedule/template/list/export", {
    responseType: "blob",
  });
  return response ?? null;
};

export function parseCampusScheduleTemplateListBody(res) {
  const body = res?.data?.body ?? res?.data?.data?.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return normalizeScheduleTemplateDayMap({});
  }
  return normalizeScheduleTemplateDayMap(body);
}

/**
 * POST /api/v1/campus/schedule/templete (UPSERT)
 * Tạo mới: không gửi `templateId` trong body (dùng {@link buildUpsertCampusScheduleTemplatePayload}).
 * Sửa / vô hiệu: `templateId` > 0; `expandToPolicySlots` chỉ khi tạo mới.
 * @param {Record<string, unknown>} payload
 */
export const upsertCampusScheduleTemplate = async (payload) => {
  const response = await axiosClient.post("/campus/schedule/templete", payload);
  return response ?? null;
};

/**
 * GET /api/v1/school/campus/schedule/template/list
 * @param {{ page?: number, pageSize?: number }} [params]
 */
export const getSchoolCampusScheduleTemplateList = async (params = {}) => {
  const page = params.page ?? 0;
  const pageSize = params.pageSize ?? 50;
  const response = await axiosClient.get("/school/campus/schedule/template/list", {
    params: { page, pageSize },
  });
  return response ?? null;
};

function isFlatScheduleTemplateItem(row) {
  if (!row || typeof row !== "object") return false;
  if (row.templateId != null) return true;
  if (Array.isArray(row.dayOfWeek) && (row.startTime != null || row.endTime != null)) return true;
  return false;
}

/**
 * GET school list dạng phân trang: body.items = mảng template phẳng (templateId, campusId, dayOfWeek[], …)
 * → gom theo campusId → scheduleByDay giống GET /campus/{id}/schedule/templete/list
 */
function parseFlatTemplateItemsToCampusRows(items) {
  if (!Array.isArray(items) || items.length === 0) return [];

  const byCampus = new Map();
  for (const item of items) {
    if (!isFlatScheduleTemplateItem(item)) continue;
    const campusId = item.campusId;
    if (campusId == null) continue;
    const idNum = Number(campusId);
    if (!byCampus.has(idNum)) {
      byCampus.set(idNum, {
        campusId: idNum,
        campusName: item.campusName ?? item.campus_name,
        scheduleByDay: normalizeScheduleTemplateDayMap({}),
      });
    }
    const row = byCampus.get(idNum);
    if (item.campusName != null && item.campusName !== "") {
      row.campusName = item.campusName;
    }
    const tplId = item.templateId ?? item.id;
    const days = Array.isArray(item.dayOfWeek) ? item.dayOfWeek : [];
    for (const rawDay of days) {
      const day = String(rawDay || "").toUpperCase();
      if (!DAYS.includes(day)) continue;
      const slot = {
        id: tplId,
        templateId: tplId,
        dayOfWeek: day,
        startTime: item.startTime,
        endTime: item.endTime,
        sessionType: item.sessionType,
        active: item.active !== false,
        campusId: idNum,
      };
      row.scheduleByDay[day].push(slot);
    }
  }

  return [...byCampus.values()].sort((a, b) => a.campusId - b.campusId);
}

/**
 * Gọi GET /school/campus/schedule/template/list lặp theo `totalPages` rồi gộp `items`,
 * tránh thiếu campus/khung giờ khi phân trang theo từng dòng template (không phải theo campus).
 * @param {{ pageSize?: number }} [opts] — pageSize mỗi request (mặc định 200)
 * @returns {Promise<Array<{ campusId: number, campusName?: string, scheduleByDay: Record<string, unknown[]> }>>}
 */
export async function fetchSchoolCampusScheduleTemplateListAll(opts = {}) {
  const pageSize = opts.pageSize ?? 200;
  const MAX_PAGES = 100;
  const allItems = [];
  let totalPages = 1;
  for (let page = 0; page < totalPages && page < MAX_PAGES; page += 1) {
    const res = await getSchoolCampusScheduleTemplateList({ page, pageSize });
    if (res?.status !== 200) {
      throw new Error(res?.data?.message || "Không tải được dữ liệu");
    }
    const body = res?.data?.body ?? res?.data?.data?.body;
    const items = body?.items ?? body?.content ?? body?.records;
    if (Array.isArray(items)) {
      for (const it of items) allItems.push(it);
    }
    const meta = parseSchoolCampusScheduleTemplateListPageMeta(res);
    totalPages = Math.max(1, meta.totalPages);
  }
  return parseFlatTemplateItemsToCampusRows(allItems);
}

/**
 * Meta phân trang từ body (currentPage 0-based, totalPages, …)
 * @returns {{ totalPages: number, totalItems: number, currentPage: number, pageSize: number }}
 */
export function parseSchoolCampusScheduleTemplateListPageMeta(res) {
  const body = res?.data?.body ?? res?.data?.data?.body;
  if (!body || typeof body !== "object") {
    return { totalPages: 1, totalItems: 0, currentPage: 0, pageSize: 0 };
  }
  const totalPages = Number(body.totalPages);
  const totalItems = Number(body.totalItems);
  return {
    totalPages: Number.isFinite(totalPages) && totalPages >= 1 ? totalPages : 1,
    totalItems: Number.isFinite(totalItems) ? totalItems : 0,
    currentPage: Number(body.currentPage) || 0,
    pageSize: Number(body.pageSize) || 0,
  };
}

/**
 * @returns {{ campusId: number, campusName?: string, scheduleByDay: Record<string, unknown[]> }[]}
 */
export function parseSchoolCampusScheduleTemplateListBody(res) {
  const body = res?.data?.body ?? res?.data?.data?.body;
  if (!body || typeof body !== "object") return [];

  const items = body.items ?? body.content ?? body.records;
  if (Array.isArray(items)) {
    if (items.length > 0 && isFlatScheduleTemplateItem(items[0])) {
      return parseFlatTemplateItemsToCampusRows(items);
    }
    if (items.length > 0) {
      const asRow = (row) => {
        const campusId = row?.campusId ?? row?.id;
        if (campusId == null) return null;
        const inner = row?.schedule ?? row?.templatesByDay ?? row?.scheduleByDay ?? row;
        return {
          campusId: Number(campusId),
          campusName: row?.campusName ?? row?.name,
          scheduleByDay: normalizeScheduleTemplateDayMap(inner),
        };
      };
      return items.map(asRow).filter(Boolean);
    }
  }

  if (Array.isArray(body)) {
    const asRow = (row) => {
      const campusId = row?.campusId ?? row?.id;
      if (campusId == null) return null;
      const inner = row?.schedule ?? row?.templatesByDay ?? row?.scheduleByDay ?? row;
      return {
        campusId: Number(campusId),
        campusName: row?.campusName ?? row?.name,
        scheduleByDay: normalizeScheduleTemplateDayMap(inner),
      };
    };
    return body.map(asRow).filter(Boolean);
  }

  const keys = Object.keys(body);
  const sample = keys.length ? body[keys[0]] : null;
  const looksLikeDayMap =
    sample &&
    typeof sample === "object" &&
    !Array.isArray(sample) &&
    DAYS.some((d) => Array.isArray(sample[d]));

  if (looksLikeDayMap && keys.length && keys.every((k) => /^\d+$/.test(String(k)))) {
    return keys.map((k) => ({
      campusId: Number(k),
      scheduleByDay: normalizeScheduleTemplateDayMap(body[k]),
    }));
  }

  return [];
}
