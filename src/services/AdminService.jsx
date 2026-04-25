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

export const getUsersByRole = async ({ role, page = 0, pageSize = 10 }) => {
    const response = await axiosClient.get("/account/user/list", {
        params: {
            role,
            page,
            pageSize,
        },
    });
    return response || null;
};

export const exportUsersByRole = async ({ role }) => {
    const response = await axiosClient.get("/account/user/list/export", {
        params: { role },
        responseType: "blob",
    });
    return response || null;
};

export const exportSchools = async () => {
    const response = await axiosClient.get("/account/school/list/export", {
        responseType: "blob",
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

export const exportCampusCounsellors = async () => {
    const response = await axiosClient.get("/account/counsellor/list/export", {
        responseType: "blob",
    });
    return response || null;
};

export const getAdminPersonalityTypes = async () => {
    const response = await axiosClient.get("/admin/personality/type");
    return response || null;
};

export const patchAdminPersonalityTypeStatus = async (id, status) => {
    const response = await axiosClient.patch(`/admin/personality/type/${id}/status`, { status });
    return response || null;
};

export const postAdminPersonalityType = async (body) => {
    const response = await axiosClient.post("/admin/personality/type", body);
    return response || null;
};

export const ADMIN_SUBJECT_TYPE = Object.freeze({
    REGULAR_SUBJECT: "REGULAR_SUBJECT",
    FOREIGN_LANGUAGE_SUBJECT: "FOREIGN_LANGUAGE_SUBJECT",
});

export const getAdminSubjects = async () => {
    const response = await axiosClient.get("/admin/subject");
    return response || null;
};

export const postAdminSubject = async (payload) => {
    const trimmedName = String(payload?.name ?? "").trim();
    const subjectType = String(payload?.subjectType ?? "");
    const response = await axiosClient.post(
        "/admin/subject",
        null,
        {
            params: {
                name: trimmedName,
                subjectType,
            },
        }
    );
    return response || null;
};

export const getAdminPackageFees = async () => {
    const response = await axiosClient.get("/admin/service/package/fee/list");
    return response || null;
};

export const getAdminRevenueSummary = async ({ year, month, packageType }) => {
    const response = await axiosClient.get("/admin/revenues/summary", {
        params: {
            year,
            ...(month ? { month } : {}),
            ...(packageType ? { packageType } : {}),
        },
    });
    return response || null;
};

export const getAdminDashboardOverview = async ({ year }) => {
    const response = await axiosClient.get("/admin/dashboard/overview", {
        params: {
            year,
        },
    });
    return response || null;
};

export const upsertAdminPackageFee = async (payload) => {
    const response = await axiosClient.post("/admin/service/package/fee", payload);
    return response || null;
};

export const publishAdminPackageFee = async (packageId) => {
    const id = Number(packageId);
    const response = await axiosClient.put(`/admin/${id}/service/package/fee/publish`);
    return response || null;
};

export const deactiveAdminPackageFee = async (packageId) => {
    const id = Number(packageId);
    const response = await axiosClient.put(`/admin/${id}/service/package/fee/deactive`);
    return response || null;
};

export const getAdminTemplateDocuments = async (categoryTemplate) => {
    const response = await axiosClient.get(`/admin/${categoryTemplate}`);
    return response || null;
};

export const uploadAdminTemplateDocument = async (categoryTemplate, file) => {
    const formData = new FormData();
    // Key "file" phải khớp chính xác với @RequestParam("file") ở Backend
    formData.append("file", file);

    const response = await axiosClient.post(
        `/admin/${categoryTemplate}/upload`,
        formData,
        {
            headers: {
                // QUAN TRỌNG: Phải đảm bảo không có 'Content-Type': 'application/json'
                // Thường thì để trình duyệt tự xử lý 'multipart/form-data' là tốt nhất
                "Content-Type": "multipart/form-data",
            },
        }
    );
    return response;
};

// Code cũ giữ lại để tham chiếu:
// export const uploadAdminTemplateDocument = async (categoryTemplate, file) => {
//     const formData = new FormData();
//     formData.append("file", file);
//     const response = await axiosClient.post(`/admin/${categoryTemplate}/upload`, formData);
//     return response || null;
// };

export const deleteAdminTemplateDocument = async (templateId) => {
    const response = await axiosClient.delete(`/admin/${templateId}`);
    return response || null;
};

export const autoFillAdminSchoolQuotas = async ({ url }) => {
    const response = await axiosClient.post("/admin/school/quotas/auto/fill", {
        url: String(url ?? "").trim(),
    });
    return response || null;
};
