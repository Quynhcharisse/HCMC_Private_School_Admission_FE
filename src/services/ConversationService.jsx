import axiosClient from "../configs/APIConfig.jsx";

export const getParentConversations = async (cursorId) => {
    const payload = cursorId ? {cursorId} : undefined;
    const response = await axiosClient.request({
        url: "/parent/conversations",
        method: "get",
        data: payload,
        headers: {
            "X-Device-Type": "web"
        }
    });

    return response || null;
};

export const getCounsellorConversations = async (cursorId) => {
    const payload = cursorId ? {cursorId} : undefined;
    const response = await axiosClient.request({
        url: "/counsellor/conversations",
        method: "get",
        data: payload,
        headers: {
            "X-Device-Type": "web"
        }
    });

    return response || null;
};
