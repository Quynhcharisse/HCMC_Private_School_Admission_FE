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
        } catch {
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
    } catch {
    }
    try {
        const res = await getSystemConfig();
        const cfg = res?.data?.body ?? res?.data;
        const ad = cfg?.admissionSettingsData;
        return ad && typeof ad === "object" ? ad : null;
    } catch {
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

export const updateSystemConfig = async (body) => {
    const res = await axiosClient.put("/system/config", body);
    return res || null;
};

