import axiosClient from "../configs/APIConfig.jsx";

/**
 * GET /api/v1/parent/slots/:campusId?startDate=&endDate=
 * @param {string|number} campusId
 * @param {{ startDate: string, endDate: string }} range
 */
export async function getParentConsultSlots(campusId, { startDate, endDate }, axiosConfig = {}) {
  const id = Number(campusId);
  if (!Number.isFinite(id)) {
    throw new Error("parent/slots: campusId không hợp lệ");
  }
  return axiosClient.get(`/parent/slots/${id}`, {
    params: { startDate, endDate },
    ...axiosConfig,
  });
}

export function parseParentConsultSlotsBody(response) {
  const raw = response?.data?.body ?? response?.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.body)) return raw.body;
  return [];
}
