import axiosClient from "../configs/APIConfig.jsx";

export const HOLIDAY_SCOPE = {
    GLOBAL: "GLOBAL",
    CAMPUS: "CAMPUS",
};

export const HOLIDAY_IMPACT_LEVEL = {
    STUDENT_ONLY: "STUDENT_ONLY",
    STAFF_ONLY: "STAFF_ONLY",
    ALL_SHUTDOWN: "ALL_SHUTDOWN",
    ONLINE_ONLY: "ONLINE_ONLY",
};

export function getCreateHolidayInitialValues({
    isPrimaryBranch = true,
    currentCampusId = null,
    currentCampusName = "",
} = {}) {
    const isSubCampus = !isPrimaryBranch;
    return {
        title: "",
        startDate: "",
        endDate: "",
        holidayImpactLevel: HOLIDAY_IMPACT_LEVEL.ALL_SHUTDOWN,
        forceCreate: false,
        scope: isSubCampus ? HOLIDAY_SCOPE.CAMPUS : HOLIDAY_SCOPE.GLOBAL,
        isGlobal: !isSubCampus,
        campusId: isSubCampus ? currentCampusId : "",
        campusName: isSubCampus ? currentCampusName : "",
    };
}

export function buildCreateHolidayPayload(values) {
    const scope = values?.scope === HOLIDAY_SCOPE.CAMPUS ? HOLIDAY_SCOPE.CAMPUS : HOLIDAY_SCOPE.GLOBAL;
    const payload = {
        title: String(values?.title ?? "").trim(),
        startDate: values?.startDate || "",
        endDate: values?.endDate || "",
        isGlobal: scope === HOLIDAY_SCOPE.GLOBAL,
        holidayImpactLevel: values?.holidayImpactLevel || HOLIDAY_IMPACT_LEVEL.ALL_SHUTDOWN,
        forceCreate: Boolean(values?.forceCreate),
    };

    if (!payload.isGlobal && values?.campusId != null && values?.campusId !== "") {
        payload.campusId = values.campusId;
    }
    return payload;
}

export async function createHoliday(values) {
    const payload = buildCreateHolidayPayload(values);
    return axiosClient.post("/holiday/", payload);
}

export function extractHolidayListBody(response) {
    const body = response?.data?.body ?? response?.body ?? response?.data ?? [];
    if (!Array.isArray(body)) return [];
    return body;
}

export async function getHolidayList() {
    return axiosClient.get("/holiday/");
}

/**
 * PUT /api/v1/holiday/ — cập nhật ngày nghỉ.
 */
export function buildUpdateHolidayPayload({
    id,
    title,
    startDate,
    endDate,
    holidayImpactLevel,
    forceCreate = false,
}) {
    return {
        id: Number(id),
        title: String(title ?? "").trim(),
        startDate: startDate || "",
        endDate: endDate || "",
        holidayImpactLevel: holidayImpactLevel || HOLIDAY_IMPACT_LEVEL.ALL_SHUTDOWN,
        forceCreate: Boolean(forceCreate),
    };
}

export async function updateHoliday(payload) {
    return axiosClient.put("/holiday/", payload);
}

/**
 * Xem trước thay đổi (draft) khi đổi ngày / mức ảnh hưởng.
 * Backend có thể map endpoint khác — chỉnh path nếu BE khác.
 */
export async function previewHolidayUpdate(body) {
    return axiosClient.post("/holiday/preview", body);
}

export function parsePreviewHolidayBody(res) {
    const raw = res?.data?.body ?? res?.data ?? {};
    if (!raw || typeof raw !== "object") {
        return {
            slotsToRestore: 0,
            slotsToLock: 0,
            conflictSlots: 0,
        };
    }
    const n = (v) => {
        const x = Number(v);
        return Number.isFinite(x) ? x : 0;
    };
    return {
        slotsToRestore: n(
            raw.slotsToRestore ??
                raw.slotsRestored ??
                raw.recoveredSlots ??
                raw.slotRestoreCount
        ),
        slotsToLock: n(
            raw.slotsToLock ??
                raw.additionalLockedSlots ??
                raw.slotsToBlock ??
                raw.slotLockCount
        ),
        conflictSlots: n(
            raw.conflictSlots ??
                raw.bookedConflictCount ??
                raw.conflicts ??
                raw.conflictCount
        ),
    };
}

export function parseHolidayConflictFromError(error) {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const body = data?.body ?? data;
    const list =
        (Array.isArray(body?.affectedBookings) && body.affectedBookings) ||
        (Array.isArray(body?.bookedSlots) && body.bookedSlots) ||
        (Array.isArray(body?.conflicts) && body.conflicts) ||
        (Array.isArray(body?.items) && body.items) ||
        [];
    return {
        status,
        message: data?.message ?? body?.message ?? "",
        items: list,
    };
}
