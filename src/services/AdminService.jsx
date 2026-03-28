import axiosClient from "../configs/APIConfig.jsx";

export const getPendingSchoolRegistrations = async () => {
    const response = await axiosClient.get("/admin/school/registrations/list");
    return response || null;
};

export const verifySchoolRegistration = async (requestId) => {
    const response = await axiosClient.post(`/admin/school/registrations/verify`, null, {
        params: { requestId },
    });
    return response || null;
};

export const getUsersByRole = async ({ role, page = 0, pageSize = 10, search = "" }) => {
    const response = await axiosClient.get("/account/user/list", {
        params: {
            role,
            page,
            pageSize,
            search: search || undefined,
        },
    });
    return response || null;
};

export const setAccountRestricted = async (accountId, { isRestricted, reason = "" }) => {
    const response = await axiosClient.post(`/account/${accountId}/restrict`, {
        isRestricted,
        reason: reason ?? "",
    });
    return response || null;
};

export const getSchoolCampuses = async ({ schoolId, page = 0, pageSize = 10 }) => {
    const response = await axiosClient.get(`/account/school/${schoolId}/campus/list`, {
        params: {
            page,
            pageSize,
        },
    });
    return response || null;
};

export const getCampusCounsellors = async ({ campusId, page = 0, pageSize = 10 }) => {
    const response = await axiosClient.get(`/account/campus/${campusId}/counsellor/list`, {
        params: {
            page,
            pageSize,
        },
    });
    return response || null;
};

