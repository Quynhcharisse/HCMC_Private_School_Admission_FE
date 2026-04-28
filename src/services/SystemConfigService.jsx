import axiosClient from "../configs/APIConfig.jsx";

export const getSystemConfig = async () => {
    const res = await axiosClient.get("/system/config");
    return res || null;
};

export const getSystemConfigByKey = async (key) => {
    const res = await axiosClient.get("/system/config/key", {params: {k: key}});
    return res || null;
};

const MEDIA_CONFIG_CACHE = {
    value: null,
    fetchedAt: 0,
    pending: null,
};

export const fetchSystemMediaConfig = async ({force = false, staleTimeMs = 10 * 60 * 1000} = {}) => {
    const now = Date.now();
    const hasFreshCache =
        !force &&
        MEDIA_CONFIG_CACHE.value &&
        now - MEDIA_CONFIG_CACHE.fetchedAt <= Math.max(0, Number(staleTimeMs) || 0);
    if (hasFreshCache) {
        return MEDIA_CONFIG_CACHE.value;
    }
    if (MEDIA_CONFIG_CACHE.pending) {
        return MEDIA_CONFIG_CACHE.pending;
    }

    MEDIA_CONFIG_CACHE.pending = (async () => {
        try {
            const byKeyRes = await getSystemConfigByKey("media");
            const byKeyBody = byKeyRes?.data?.body ?? byKeyRes?.data?.data ?? byKeyRes?.data;
            const byKeyMedia = byKeyBody?.media;
            if (byKeyMedia && typeof byKeyMedia === "object" && !Array.isArray(byKeyMedia)) {
                MEDIA_CONFIG_CACHE.value = byKeyMedia;
                MEDIA_CONFIG_CACHE.fetchedAt = Date.now();
                return byKeyMedia;
            }
        } catch (error) {
            void error;
        }

        const fullRes = await getSystemConfig();
        const fullBody = fullRes?.data?.body ?? fullRes?.data?.data ?? fullRes?.data;
        const fullMedia = fullBody?.mediaData ?? fullBody?.media;
        const normalized =
            fullMedia && typeof fullMedia === "object" && !Array.isArray(fullMedia) ? fullMedia : null;
        MEDIA_CONFIG_CACHE.value = normalized;
        MEDIA_CONFIG_CACHE.fetchedAt = Date.now();
        return normalized;
    })();

    try {
        return await MEDIA_CONFIG_CACHE.pending;
    } finally {
        MEDIA_CONFIG_CACHE.pending = null;
    }
};

export const clearSystemMediaConfigCache = () => {
    MEDIA_CONFIG_CACHE.value = null;
    MEDIA_CONFIG_CACHE.fetchedAt = 0;
    MEDIA_CONFIG_CACHE.pending = null;
};

export const fetchSystemAdmissionSettingsData = async () => {
    try {
        const res = await getSystemConfigByKey("admissionSettingsData");
        if (res?.status >= 200 && res?.status < 300) {
            const body = res?.data?.body ?? res?.data?.data ?? res?.data;
            if (body?.admissionSettingsData && typeof body.admissionSettingsData === "object") {
                return body.admissionSettingsData;
            }
            if (body && typeof body === "object" && Array.isArray(body.allowedMethods)) {
                return body;
            }
        }
    } catch (error) {
        void error;
    }
    try {
        const res = await getSystemConfig();
        const cfg = res?.data?.body ?? res?.data;
        const ad = cfg?.admissionSettingsData;
        return ad && typeof ad === "object" ? ad : null;
    } catch (error) {
        void error;
        return null;
    }
};

export const importSystemAdmissionTemplate = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axiosClient.post("/system/config/admission/template/import", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return res || null;
};

const parseImportRowsPayload = (res) => {
    const root = res?.data;
    const payload = root?.body ?? root?.data ?? root;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.rows)) return payload.rows;
    return [];
};

const normalizeImportRowRequest = (row) => {
    if (row && typeof row === "object" && row.rowData && typeof row.rowData === "object") {
        return {
            rowData: row.rowData,
            error: row.error ?? null,
            isError: Boolean(row.isError),
        };
    }
    return {
        rowData: row && typeof row === "object" ? row : null,
        error: null,
        isError: false,
    };
};

export const importSystemConfigPreview = async ({ type, file }) => {
    const importType = String(type ?? "").trim();
    if (!importType) throw new Error("Thiếu loại dữ liệu import");
    if (!file) throw new Error("Không có file để tải lên");
    const formData = new FormData();
    formData.append("file", file);
    const res = await axiosClient.post(`/system/config/preview`, formData, {
        params: { type: importType },
        headers: { "Content-Type": "multipart/form-data" },
    });
    return {
        response: res,
        rows: parseImportRowsPayload(res),
        message: String(res?.data?.message ?? "").trim(),
    };
};

export const validateSystemConfigSingleRow = async ({ type, row }) => {
    const importType = String(type ?? "").trim();
    if (!importType) throw new Error("Thiếu loại dữ liệu import");
    const res = await axiosClient.post(
        `/system/config/validate-row`,
        { rows: [normalizeImportRowRequest(row)] },
        { params: { type: importType } }
    );
    const rows = parseImportRowsPayload(res);
    return rows[0] ?? null;
};

export const validateSystemConfigRows = async ({ type, rows }) => {
    const importType = String(type ?? "").trim();
    if (!importType) throw new Error("Thiếu loại dữ liệu import");
    const safeRows = Array.isArray(rows) ? rows.map((item) => normalizeImportRowRequest(item)) : [];
    const res = await axiosClient.post(`/system/config/validate-row`, { rows: safeRows }, { params: { type: importType } });
    return {
        response: res,
        rows: parseImportRowsPayload(res),
        message: String(res?.data?.message ?? "").trim(),
    };
};

export const confirmSystemConfigImport = async ({ type, rows }) => {
    const importType = String(type ?? "").trim();
    if (!importType) throw new Error("Thiếu loại dữ liệu import");
    const safeRows = Array.isArray(rows) ? rows.map((item) => normalizeImportRowRequest(item)) : [];
    const res = await axiosClient.post(`/system/config/confirm`, { rows: safeRows }, { params: { type: importType } });
    return res || null;
};

export const updateSystemConfig = async (body) => {
    const res = await axiosClient.put("/system/config", body);
    return res || null;
};

