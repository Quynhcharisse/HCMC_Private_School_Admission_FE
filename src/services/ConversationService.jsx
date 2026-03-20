import axiosClient from "../configs/APIConfig.jsx";

export const getParentConversations = async (cursorId) => {
    const params = cursorId ? {cursorId} : undefined;
    const response = await axiosClient.request({
        url: "/parent/conversations",
        method: "get",
        params,
        headers: {
            "X-Device-Type": "web"
        }
    });

    return response || null;
};

export const getCounsellorConversations = async (cursorId) => {
    const params = cursorId ? {cursorId} : undefined;
    const response = await axiosClient.request({
        url: "/counsellor/conversations",
        method: "get",
        params,
        headers: {
            "X-Device-Type": "web"
        }
    });

    return response || null;
};
