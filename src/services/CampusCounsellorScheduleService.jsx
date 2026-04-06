import axiosClient from "../configs/APIConfig.jsx";

/**
 * GET /api/v1/campus/counsellor/available/list — không query params; campus theo phiên.
 */
export const getCounsellorAvailableList = async () => {
  const response = await axiosClient.get("/campus/counsellor/available/list");
  return response ?? null;
};

export function parseCounsellorAvailableListBody(res) {
  const body = res?.data?.body ?? res?.data?.data?.body;
  return Array.isArray(body) ? body : [];
}

/**
 * POST /api/v1/campus/counsellor/assign
 * @param {{
 *   templateId: number,
 *   campusId: number,
 *   counsellorIds: number[],
 *   startDate: string,
 *   endDate: string,
 *   action: 'ASSIGN' | 'UNASSIGN'
 * }} payload
 */
export const postCounsellorAssign = async (payload) => {
  const response = await axiosClient.post("/campus/counsellor/assign", payload);
  return response ?? null;
};

/**
 * GET /api/v1/campus/counsellor/slots/assigned
 * Query: campusId (required), counsellorId (optional).
 * @param {number|string} campusId
 * @param {number|string} [counsellorId]
 */
export const getCounsellorAssignedSlots = async (campusId, counsellorId) => {
  const id = campusId == null || campusId === "" ? null : Number(campusId);
  if (id == null || Number.isNaN(id)) {
    return Promise.reject(new Error("campusId is required"));
  }
  const params = { campusId: id };
  if (counsellorId != null && counsellorId !== "" && counsellorId !== "ALL") {
    const cid = Number(counsellorId);
    if (!Number.isNaN(cid)) params.counsellorId = cid;
  }
  const response = await axiosClient.get("/campus/counsellor/slots/assigned", { params });
  return response ?? null;
};

export function parseCounsellorAssignedSlotsBody(res) {
  const body = res?.data?.body ?? res?.data?.data?.body;
  return Array.isArray(body) ? body : [];
}
