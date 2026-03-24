import axiosClient from "../configs/APIConfig.jsx";

const normalizeProfileResponse = (response) => {
    // Backend đôi khi trả `body` dưới dạng string JSON; normalize để UI dùng thống nhất.
    const body = response?.data?.body;
    if (typeof body === "string") {
        try {
            response.data.body = JSON.parse(body);
        } catch {
            // ignore parse error; keep original response
        }
    }
    return response;
};

export const signout = async () => {
    const response = await axiosClient.post("/account/logout", {}, {
        headers: {
            "X-Device-Type": "web"
        }
    });
    return response || null
}

export const getAccess = async () => {
    const response = await axiosClient.post("/account/access")
    return response || null;
}

export const getProfile = async () => {
    const response = await axiosClient.get("/account/profile");
    return normalizeProfileResponse(response) || null;
}

/** Role SCHOOL: gửi `{ campusData: { ... } }` (không gửi parentData/counsellorData). */
export const updateProfile = async (profileData) => {
    const response = await axiosClient.put("/account/profile", profileData, {
        headers: {
            "X-Device-Type": "web"
        }
    });
    return normalizeProfileResponse(response) || null;
};