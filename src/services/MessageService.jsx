import axiosClient from "../configs/APIConfig.jsx";

export const getParentMessagesHistory = async ({parentEmail, counsellorEmail, cursorId}) => {
    const encodedParentEmail = encodeURIComponent(parentEmail || "");
    const encodedCounsellorEmail = encodeURIComponent(counsellorEmail || "");
    const endpoint = `/parent/messages/history/${encodedParentEmail}/${encodedCounsellorEmail}`;

    const response = await axiosClient.request({
        url: endpoint,
        method: "get",
        data: cursorId ? {cursorId} : undefined,
        headers: {
            "X-Device-Type": "web"
        }
    });

    return response || null;
};

export const markParentMessagesRead = async ({conversationId, username}) => {
    const encodedConversationId = encodeURIComponent(conversationId || "");
    const encodedUsername = encodeURIComponent(username || "");
    const endpoint = `/parent/messages/read/${encodedConversationId}/${encodedUsername}`;

    const response = await axiosClient.post(endpoint, {}, {
        headers: {
            "X-Device-Type": "web"
        }
    });

    return response || null;
};

export const getCounsellorMessagesHistory = async ({parentEmail, counsellorEmail, cursorId}) => {
    const encodedParentEmail = encodeURIComponent(parentEmail || "");
    const encodedCounsellorEmail = encodeURIComponent(counsellorEmail || "");
    const endpoint = `/counsellor/messages/history/${encodedParentEmail}/${encodedCounsellorEmail}`;

    const response = await axiosClient.request({
        url: endpoint,
        method: "get",
        data: cursorId ? {cursorId} : undefined,
        headers: {
            "X-Device-Type": "web"
        }
    });

    return response || null;
};

export const markCounsellorMessagesRead = async ({conversationId, username}) => {
    const encodedConversationId = encodeURIComponent(conversationId || "");
    const encodedUsername = encodeURIComponent(username || "");
    const endpoint = `/counsellor/messages/read/${encodedConversationId}/${encodedUsername}`;

    const response = await axiosClient.put(endpoint, {}, {
        headers: {
            "X-Device-Type": "web"
        }
    });

    return response || null;
};
