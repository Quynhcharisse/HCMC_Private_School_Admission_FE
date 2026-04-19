import axiosClient from "../configs/APIConfig.jsx";

export const getSystemConfig = async () => {
    const res = await axiosClient.get("/system/config");
    return res || null;
};

/** GET /system/config/key?k=admissionSettingsData — nếu BE chưa có, gọi getSystemConfig và lấy key. */
export const getSystemConfigByKey = async (key) => {
    const res = await axiosClient.get("/system/config/key", {params: {k: key}});
    return res || null;
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
        // fallback
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

    export const updateSystemConfig = async (body) => {
    const res = await axiosClient.put("/system/config", body);
    return res || null;
};

