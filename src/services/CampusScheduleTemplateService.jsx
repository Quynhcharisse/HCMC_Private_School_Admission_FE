import axiosClient from "../configs/APIConfig.jsx";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

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

export function parseCampusScheduleTemplateListBody(res) {
  const body = res?.data?.body ?? res?.data?.data?.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return normalizeScheduleTemplateDayMap({});
  }
  return normalizeScheduleTemplateDayMap(body);
}

/**
 * POST /api/v1/campus/schedule/templete (UPSERT)
 * Create: templateId = 0; Update: templateId = id từ GET list.
 * @param {{
 *   templateId: number,
 *   campusId: number,
 *   dayOfWeek: string[],
 *   startTime: string,
 *   endTime: string,
 *   sessionType: string,
 *   active?: boolean
 * }} payload
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
