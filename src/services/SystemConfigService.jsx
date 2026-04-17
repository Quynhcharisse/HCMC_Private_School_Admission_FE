import axiosClient from "../configs/APIConfig.jsx";

export const getSystemConfig = async () => {
    const res = await axiosClient.get("/system/config");
    return res || null;
};

export const updateSystemConfig = async (body) => {
    const res = await axiosClient.put("/system/config", body);
    return res || null;
};

