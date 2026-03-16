import axiosClient from "../configs/APIConfig.jsx";

export const fetchCounsellors = async () => {
    const response = await axiosClient.get("/school/counsellor/list");
    return response || null;
};

export const createCounsellor = async (email) => {
    const response = await axiosClient.post("/school/counsellor", {email}, {
        headers: {
            "X-Device-Type": "web"
        }
    });
    return response || null;
};

