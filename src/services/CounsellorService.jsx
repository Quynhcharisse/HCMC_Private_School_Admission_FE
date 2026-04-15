import axiosClient from "../configs/APIConfig.jsx";

export const fetchCounsellors = async (page = 0, pageSize = 10) => {
    const response = await axiosClient.get("/campus/counsellor/list", {
        params: { page, pageSize },
    });
    return response || null;
};

export const createCounsellor = async ({ email, avatar = "" }) => {
    const response = await axiosClient.post(
        "/campus/counsellor",
        { email, avatar: avatar ?? "" },
        {
            headers: {
                "X-Device-Type": "web",
            },
        }
    );
    return response || null;
};

export const exportCounsellors = async () => {
    const response = await axiosClient.get("/account/counsellor/list/export", {
        responseType: "blob",
    });
    return response || null;
};

