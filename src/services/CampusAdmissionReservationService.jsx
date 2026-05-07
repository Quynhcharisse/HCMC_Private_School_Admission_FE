import axiosClient from "../configs/APIConfig.jsx";

const pickBody = (response) => response?.data?.body ?? response?.body ?? response?.data ?? null;

export const getCampusAdmissionReservationForms = async ({
    status = "ALL",
} = {}) => {
    const normalized = String(status || "").trim().toUpperCase();
    const params = {};
    if (normalized && normalized !== "ALL") {
        params.status = normalized;
    }

    const response = await axiosClient.get("/campus/admission/reservation/form", { params });
    const body = pickBody(response);
    const items = Array.isArray(body?.items) ? body.items : Array.isArray(body) ? body : [];

    return {
        items,
        totalItems: items.length,
        raw: body,
    };
};

export const processAdmissionReservationForm = async ({formId, campusId, action, rejectReason}) => {
    const payload = {
        formId: Number(formId),
        action: String(action || "").toUpperCase(),
    };
    const normalizedCampusId = Number(campusId);
    if (Number.isFinite(normalizedCampusId) && normalizedCampusId > 0) {
        payload.campusId = normalizedCampusId;
    }
    if (payload.action === "REJECT") {
        payload.rejectReason = String(rejectReason || "").trim();
    }
    return axiosClient.put("/campus/process/admission/reservation/form", payload, {
        headers: {"X-Device-Type": "web"},
    });
};
