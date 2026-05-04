import axiosClient from "../configs/APIConfig.jsx";

/** GET /api/v1/campus/counsellor/list — query: page (0-based), pageSize */
export const fetchCounsellors = async (page = 0, pageSize = 10) => {
    const response = await axiosClient.get("/campus/counsellor/list", {
        params: {page, pageSize},
    });
    return response || null;
};

/** POST /api/v1/campus/counsellor — body: { email, avatar, name } */
export const createCounsellor = async ({email, avatar = "", name = ""}) => {
    const response = await axiosClient.post(
        "/campus/counsellor",
        {
            email,
            avatar: avatar ?? "",
            name: typeof name === "string" ? name.trim() : "",
        },
        {
            headers: {
                "X-Device-Type": "web",
            },
        }
    );
    return response || null;
};

export const exportCounsellors = async () => {
    const response = await axiosClient.get("/campus/counsellor/list/export", {
        responseType: "blob",
    });
    return response || null;
};

