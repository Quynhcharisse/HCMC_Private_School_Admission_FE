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

export const createParentConversation = async ({parentEmail, campusId, studentProfileId}) => {
    const response = await axiosClient.request({
        url: "/parent/conversation",
        method: "post",
        data: {
            parentEmail: parentEmail ?? "",
            campusId: campusId != null ? Number(campusId) : 0,
            studentProfileId: studentProfileId != null ? Number(studentProfileId) : 0
        },
        headers: {
            "X-Device-Type": "web"
        }
    });

    return response || null;
};

export const getCounsellorConversations = async ({cursorId, status} = {}) => {
    const params = {
        ...(cursorId ? {cursorId} : {}),
        ...(status ? {status} : {})
    };
    const response = await axiosClient.request({
        url: "/counsellor/conversations",
        method: "get",
        params: Object.keys(params).length ? params : undefined,
        headers: {
            "X-Device-Type": "web"
        }
    });

    return response || null;
};

export const createCampusAdminConversation = async () => {
    const response = await axiosClient.request({
        url: "/campus/conversation",
        method: "post",
        headers: {
            "X-Device-Type": "web"
        }
    });
    return response || null;
};

/** GET /api/v1/campus/conversation — trạng thái hội thoại campus ↔ admin (unreadCount, hasNewMessage). */
export const getCampusConversation = async () => {
    const response = await axiosClient.request({
        url: "/campus/conversation",
        method: "get",
        headers: {
            "X-Device-Type": "web"
        }
    });
    return response || null;
};

export const getCampusConversationsForAdmin = async ({cursorId} = {}) => {
    const response = await axiosClient.request({
        url: "/admin/conversation",
        method: "get",
        params: cursorId ? {cursorId} : undefined,
        headers: {
            "X-Device-Type": "web"
        }
    });
    return response || null;
};
