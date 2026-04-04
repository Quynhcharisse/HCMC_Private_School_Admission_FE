import axiosClient from "../configs/APIConfig.jsx";

export const getParentMessagesHistory = async ({parentEmail, campusId, studentProfileId, cursorId}) => {
    const encodedParentEmail = encodeURIComponent(parentEmail || "");
    const campusIdNum = campusId != null ? Number(campusId) : NaN;
    if (!Number.isFinite(campusIdNum)) {
        throw new Error("campusId is required for parent messages history");
    }
    const normalizedStudentProfileId = studentProfileId != null ? String(studentProfileId).trim() : "";
    if (!normalizedStudentProfileId) {
        throw new Error("studentProfileId is required for parent messages history");
    }
    const endpoint = `/parent/messages/history/${encodedParentEmail}/${String(Math.trunc(campusIdNum))}/${encodeURIComponent(normalizedStudentProfileId)}`;
    const params = cursorId ? {cursorId} : undefined;

    const response = await axiosClient.request({
        url: endpoint,
        method: "get",
        params,
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

    const response = await axiosClient.put(endpoint, {}, {
        headers: {
            "X-Device-Type": "web"
        }
    });

    return response || null;
};

export const getCounsellorMessagesHistory = async ({parentEmail, counsellorEmail, studentProfileId, cursorId}) => {
    const encodedParentEmail = encodeURIComponent(parentEmail || "");
    const encodedCounsellorEmail = encodeURIComponent(counsellorEmail || "");
    const encodedStudentProfileId = encodeURIComponent(studentProfileId || "");
    const endpoint = `/counsellor/messages/history/${encodedParentEmail}/${encodedCounsellorEmail}/${encodedStudentProfileId}`;

    const response = await axiosClient.request({
        url: endpoint,
        method: "get",
        params: cursorId ? {cursorId} : undefined,
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
