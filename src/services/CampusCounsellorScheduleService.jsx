import axiosClient from "../configs/APIConfig.jsx";

/**
 * Lịch tư vấn viên — tách nguồn: template (schedule/templete/list) · assigned (slots/assigned) ·
 * available theo ngày (slot/available) · chọn người (available/list) · gán (assign).
 */

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

function logCounsellorAssign(stage, data) {
  const prefix = "[counsellor/assign]";
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info(prefix, stage, data);
  }
}

/**
 * Chuẩn hóa body trước POST — UNASSIGN: `action` + `slotIds` (tùy chọn `counsellorIds`), không gửi campusId (BE theo phiên).
 * ASSIGN: templateIds + counsellorIds + … (có thể kèm campusId nếu BE yêu cầu).
 * @param {Record<string, unknown>} payload
 * @returns {Record<string, unknown>}
 */
export function normalizeCounsellorAssignPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("counsellor/assign: payload is required");
  }
  const out = { ...payload };
  const rawAction = out.action;
  if (rawAction == null || rawAction === "") {
    throw new Error("counsellor/assign: action is required (ASSIGN or UNASSIGN)");
  }
  out.action = String(rawAction).toUpperCase();
  if (out.action !== "ASSIGN" && out.action !== "UNASSIGN") {
    throw new Error("counsellor/assign: action must be ASSIGN or UNASSIGN");
  }
  if (out.action === "UNASSIGN") {
    const fromArr = Array.isArray(out.slotIds) ? out.slotIds : Array.isArray(out.slot_ids) ? out.slot_ids : [];
    let slotIds = fromArr.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0);
    if (slotIds.length === 0) {
      const one = Number(out.slotId ?? out.slot_id);
      if (Number.isFinite(one) && one > 0) slotIds = [one];
    }
    if (slotIds.length === 0) {
      throw new Error("counsellor/assign UNASSIGN: slotIds is required (≥1 id from GET …/slots/assigned)");
    }
    out.slotIds = [...new Set(slotIds)];
    delete out.slotId;
    delete out.slot_id;
    delete out.slot_ids;
    delete out.templateIds;
    delete out.startDate;
    delete out.endDate;
    if (Array.isArray(out.counsellorIds) && out.counsellorIds.length > 0) {
      out.counsellorIds = out.counsellorIds.map((x) => Number(x)).filter((x) => Number.isFinite(x));
      if (out.counsellorIds.length === 0) delete out.counsellorIds;
    } else {
      delete out.counsellorIds;
    }
    delete out.campusId;
    delete out.campus_id;
  }
  if (out.action === "ASSIGN") {
    const tids = Array.isArray(out.templateIds)
      ? out.templateIds.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)
      : [];
    const cids = Array.isArray(out.counsellorIds)
      ? out.counsellorIds.map((x) => Number(x)).filter((x) => Number.isFinite(x))
      : [];
    if (tids.length === 0) {
      throw new Error("counsellor/assign ASSIGN: templateIds is required (non-empty array)");
    }
    if (cids.length === 0) {
      throw new Error("counsellor/assign ASSIGN: counsellorIds is required");
    }
    out.templateIds = tids;
    out.counsellorIds = cids;
  }
  return out;
}

/**
 * Thành công khi HTTP 2xx (thường 200). 4xx/5xx: axios throw → không toast success.
 * @param {unknown} res
 * @returns {boolean}
 */
export function isCounsellorAssignResponseSuccess(res) {
  const st = res && typeof res === "object" && "status" in res ? Number(res.status) : 0;
  return st >= 200 && st < 300;
}

/**
 * syncCounsellorIntoSlots — log DEV để đối chiếu payload/response (200/4xx).
 */
export const postCounsellorAssign = async (payload) => {
  const normalized = normalizeCounsellorAssignPayload(payload);
  const action = normalized.action;
  logCounsellorAssign("→ request", { action, payload: { ...normalized } });
  try {
    const response = await axiosClient.post("/campus/counsellor/assign", normalized);
    const st = response?.status ?? 0;
    logCounsellorAssign("← response OK", {
      status: st,
      message: response?.data?.message,
      body: response?.data?.body ?? null,
      slotsCount: Array.isArray(response?.data?.body?.slots) ? response.data.body.slots.length : null,
    });
    return response ?? null;
  } catch (e) {
    logCounsellorAssign("← response error", {
      status: e?.response?.status,
      message: e?.response?.data?.message ?? e?.message,
      data: e?.response?.data ?? null,
    });
    throw e;
  }
};

/**
 * POST /counsellor/assign thành công (HTTP 200) — BE mới trả snapshot toàn campus.
 * Cùng cấu trúc phần tử với GET …/slots/assigned. Nếu `body` null (BE cũ) → trả null, FE gọi GET.
 * @returns {{ action: 'ASSIGN' | 'UNASSIGN', slots: unknown[] } | null}
 */
export function parseCounsellorAssignSuccessBody(res) {
  const body = res?.data?.body;
  if (body == null || typeof body !== "object") return null;
  const { slots } = body;
  if (!Array.isArray(slots)) return null;
  const raw = String(body.action ?? "").toUpperCase();
  const action = raw === "UNASSIGN" ? "UNASSIGN" : "ASSIGN";
  return { action, slots };
}

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
  if (import.meta.env.DEV) {
    const rows = response?.data?.body;
    // eslint-disable-next-line no-console
    console.info("[GET /campus/counsellor/slots/assigned]", { params, count: Array.isArray(rows) ? rows.length : "?" });
  }
  return response ?? null;
};

export function parseCounsellorAssignedSlotsBody(res) {
  const d = res?.data;
  if (!d || typeof d !== "object") return [];
  const body = d.body ?? d.data?.body ?? d.result ?? d.data?.result ?? d.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(d)) return d;
  return [];
}
