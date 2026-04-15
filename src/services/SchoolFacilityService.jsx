import axiosClient from "../configs/APIConfig.jsx";

/** Parse `message` + `body` envelope từ GET config (full hoặc key). */
export function parseSchoolConfigResponseBody(res) {
  let body = res?.data?.body ?? res?.data?.data?.body ?? res?.body ?? {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  return body && typeof body === "object" ? body : {};
}

/**
 * GET /school/config/key?k=admissionSettingsData trả body dạng:
 * `{ "admissionSettingsData": { ... } }` (một key cấp top).
 * Hàm này trả object đưa vào `normalizeFromApi` cùng cách với GET full config.
 */
export function schoolConfigKeyedBodyForNormalize(res, k) {
  const raw = parseSchoolConfigResponseBody(res);
  if (k == null || String(k).trim() === "") return raw;
  if (raw[k] != null && typeof raw[k] === "object") {
    return {[k]: raw[k]};
  }
  return raw;
}

/** Query keys `k` for GET /api/v1/school/config/key?k= */
export const SCHOOL_CONFIG_KEY = {
  ADMISSION_SETTINGS_DATA: "admissionSettingsData",
  DOCUMENT_REQUIREMENTS_DATA: "documentRequirementsData",
  FINANCE_POLICY_DATA: "financePolicyData",
  OPERATION_SETTINGS_DATA: "operationSettingsData",
  FACILITY_DATA: "facilityData",
  QUOTA_CONFIG_DATA: "quotaConfigData",
  RESOURCE_DISTRIBUTION_DATA: "resourceDistributionData",
};

/**
 * GET full school configuration
 * @param {number | string} schoolId
 */
export const getSchoolConfig = async (schoolId) => {
  const response = await axiosClient.get(`/school/config/${Number(schoolId) || schoolId}`);
  return response;
};

/**
 * GET partial config by key (catalog / section)
 * @param {string} k — e.g. admissionSettingsData, facilityData (see SCHOOL_CONFIG_KEY)
 */
export const getSchoolConfigByKey = async (k) => {
  const response = await axiosClient.get("/school/config/key", {
    params: { k },
  });
  return response;
};

/**
 * PUT /api/v1/school/config/{schoolId} — cấu hình cấp trường (cơ sở chính / isPrimaryBranch):
 * admission, quota, finance, documents, operationSettingsData, facilityData,
 * resourceDistributionData (partial theo diff).
 * operationSettingsData (FE): GET `admissionProcesses` → state `methodAdmissionProcess`; PUT gửi `methodAdmissionProcess`;
 * `workingConfig.openSunday` khi PUT (GET có thể trả `isOpenSunday`).
 * @param {number | string} schoolId
 * @param {Record<string, unknown>} payload
 */
export const updateSchoolConfig = async (schoolId, payload) => {
  const response = await axiosClient.put(`/school/config/${Number(schoolId) || schoolId}`, payload);
  return response;
};

/** Chuẩn hóa campusId cho segment URL path (path parameter, không query). */
function campusConfigPathId(campusId) {
  if (campusId == null || campusId === "") return null;
  const n = Number(campusId);
  if (Number.isFinite(n)) return n;
  const s = String(campusId).trim();
  return s || null;
}

/**
 * GET /api/v1/campus/config — không path/query; campus theo phiên đăng nhập.
 * Response: `{ message, body: { campusCurrent, hqDefault } }` (camelCase; BE có thể dùng snake_case tương ứng).
 * `body.campusCurrent`: `facilityJson`, `policyDetailRendered`, … — xem `normalizeFromCampusConfigApi` trong SchoolFacilityOverview.
 */
export const getCampusConfig = async () => {
  const response = await axiosClient.get("/campus/config");
  return response;
};

/**
 * PUT /api/v1/campus/{campusId}/config — path `campusId`, không query params.
 * Body phẳng (partial), đúng contract BE, ví dụ:
 * overview, itemList[{ facilityCode, name, value, unit, category }],
 * imageJsonData: { coverUrl, imageList: [{ url, name, altName, … }] },
 * hotline, emailSupport, minCounsellorPerSlot, slotDurationInMinutes, maxBookingPerSlot,
 * allowBookingBeforeHours, workingOverride, admissionStepsOverride, policyDetail.
 * @param {number | string} campusId
 * @param {Record<string, unknown>} payload
 */
export const updateCampusConfig = async (campusId, payload) => {
  const id = campusConfigPathId(campusId);
  if (id == null) return Promise.reject(new Error("campusId is required"));
  const response = await axiosClient.put(`/campus/${id}/config`, payload);
  return response;
};

/** GET /api/v1/school/config/campus/list — read-only list of campus configs (facilities + policy per campus) */
export const getSchoolCampusConfigList = async () => {
  const response = await axiosClient.get("/school/config/campus/list");
  return response;
};

function parseFacilityConfigBlock(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    try {
      const p = JSON.parse(t);
      return p && typeof p === "object" ? p : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw;
  return null;
}

/** Normalize list body to an array of campus config rows */
export function parseSchoolCampusConfigListBody(res) {
  const body = res?.data?.body ?? res?.data?.data?.body;
  if (!Array.isArray(body)) return [];
  return body.map((row) => {
    if (!row || typeof row !== "object") return row;
    const direct =
      parseFacilityConfigBlock(row.facilityConfig) ??
      parseFacilityConfigBlock(row.facility_config);
    if (direct) return {...row, facilityConfig: direct};
    const alt = row.facilityJson ?? row.facility_json;
    const parsedAlt = parseFacilityConfigBlock(alt);
    if (parsedAlt) return {...row, facilityConfig: parsedAlt};
    return row;
  });
}

/**
 * GET /school/config/campus/list — `policyDetail` có thể là string (legacy) hoặc object
 * { fullTextRendered, rawCustomNote, ... }.
 */
export function schoolCampusListRowPolicyText(row) {
  const p = row?.policyDetail;
  if (p == null || p === "") return null;
  if (typeof p === "string") {
    const t = p.trim();
    return t || null;
  }
  if (typeof p === "object") {
    const full = p.fullTextRendered != null ? String(p.fullTextRendered).trim() : "";
    if (full) return full;
    const raw = p.rawCustomNote != null ? String(p.rawCustomNote).trim() : "";
    if (raw) return raw;
  }
  return null;
}
