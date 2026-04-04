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
 * PUT update school configuration (partial or full body)
 * @param {number | string} schoolId
 * @param {Record<string, unknown>} payload — e.g. { admissionSettingsData: {...}, facilityData: {...} }
 */
export const updateSchoolConfig = async (schoolId, payload) => {
  const response = await axiosClient.put(`/school/config/${Number(schoolId) || schoolId}`, payload);
  return response;
};

/**
 * GET /api/v1/campus/{campusId}/config — campus phụ (body: campusCurrent + hqDefault)
 * @param {number | string} campusId
 */
export const getCampusConfig = async (campusId) => {
  const id = Number(campusId) || campusId;
  const response = await axiosClient.get(`/campus/${id}/config`);
  return response;
};

/**
 * PUT /api/v1/campus/{campusId}/config
 * @param {number | string} campusId
 * @param {Record<string, unknown>} payload — overview, itemList, imageJsonData, hotline, …
 */
export const updateCampusConfig = async (campusId, payload) => {
  const id = Number(campusId) || campusId;
  const response = await axiosClient.put(`/campus/${id}/config`, payload);
  return response;
};
