import axiosClient from "../configs/APIConfig.jsx";

/**
 * GET campaign templates by year
 * @param {number} year
 * @returns {Promise<{ data?: any }>}
 */
export const getCampaignTemplatesByYear = async (year) => {
    try {
        const response = await axiosClient.get(`/school/${year}/campaign/template`);
        return response || null;
    } catch (error) {
        // Khi BE trả 404 (chưa có chiến dịch cho năm này), FE coi như "chưa có data"
        // để không hiển thị lỗi.
        if (error?.response?.status === 404) {
            return { status: 404, data: { body: [] } };
        }
        throw error;
    }
};

/**
 * POST create campaign template
 * @param {{ name: string, description?: string, year: number, startDate: string, endDate: string }} body
 */
export const createCampaignTemplate = async (body) => {
    const response = await axiosClient.post("/school/campaign/template", {
        name: body.name?.trim() ?? "",
        description: body.description?.trim() ?? "",
        year: Number(body.year),
        startDate: body.startDate ?? "",
        endDate: body.endDate ?? "",
    });
    return response || null;
};

/**
 * PUT update campaign template
 * @param {{ admissionCampaignTemplateId: number, name: string, description?: string, year?: number, startDate: string, endDate: string }} body
 */
export const updateCampaignTemplate = async (body) => {
    const response = await axiosClient.put("/school/campaign/template", {
        admissionCampaignTemplateId: Number(body.admissionCampaignTemplateId),
        name: body.name?.trim() ?? "",
        description: body.description?.trim() ?? "",
        year: Number(body.year),
        startDate: body.startDate ?? "",
        endDate: body.endDate ?? "",
    });
    return response || null;
};

/**
 * PUT publish campaign template (DRAFT -> OPEN)
 * @param {number} id
 */
export const updateCampaignTemplateStatus = async (id) => {
    const response = await axiosClient.put(`/school/${id}/campaign/template/status`, null);
    return response || null;
};

/**
 * PUT cancel campaign template
 * @param {number} id
 * @param {string} reason
 * @param {{ resolveAllStatuses?: boolean }} [options] — true: không throw, trả response mọi status (precheck 412/400/…)
 */
export const cancelCampaignTemplate = async (id, reason, options = {}) => {
    const { resolveAllStatuses = false } = options;
    const config = {
        params: { reason: reason?.trim() ?? "" },
    };
    if (resolveAllStatuses) {
        // Luôn resolve (không throw) để đọc 412/400/403 trong precheck — dùng hàm rõ ràng cho mọi phiên bản axios
        config.validateStatus = () => true;
    }
    const response = await axiosClient.put(`/school/${id}/campaign/template/cancel`, null, config);
    return response || null;
};

/**
 * POST clone campaign template
 * @param {number} id
 */
export const cloneCampaignTemplate = async (id) => {
    const response = await axiosClient.post(`/school/${id}/campaign/template/clone`, null);
    return response || null;
};

/**
 * GET /campus/{campusId}/offering/list — danh sách chỉ tiêu theo cơ sở (cả campus chính & phụ)
 * @param {number} campusId
 * @param {{ page?: number, pageSize?: number }} [params]
 */
export const getCampaignOfferingsByCampus = async (campusId, { page = 0, pageSize = 10 } = {}) => {
    const cid = Number(campusId);
    const response = await axiosClient.get(`/campus/${cid}/offering/list`, {
        params: {
            campusId: cid,
            page,
            pageSize,
        },
    });
    return response || null;
};

/**
 * POST /campus/offering — tạo chỉ tiêu
 * @param {{
 *   admissionCampaignId: number,
 *   campusId: number,
 *   programId: number,
 *   quota: number,
 *   learningMode: string,
 *   priceAdjustmentPercentage: number,
 *   openDate: string,
 *   closeDate: string
 * }} body
 */
export const createCampaignOffering = async (body) => {
    const response = await axiosClient.post("/campus/offering", {
        admissionCampaignId: Number(body.admissionCampaignId),
        campusId: Number(body.campusId),
        programId: Number(body.programId),
        quota: Number(body.quota) || 0,
        learningMode: body.learningMode ?? "DAY_SCHOOL",
        priceAdjustmentPercentage: Number(body.priceAdjustmentPercentage) || 0,
        openDate: body.openDate ?? "",
        closeDate: body.closeDate ?? "",
    });
    return response || null;
};

/** PUT /campus/offering/list — cập nhật chỉ tiêu */
export const updateCampaignOffering = async (body) => {
    const response = await axiosClient.put("/campus/offering/list", {
        id: Number(body.id),
        admissionCampaignId: Number(body.admissionCampaignId),
        campusId: Number(body.campusId),
        programId: Number(body.programId),
        quota: Number(body.quota) || 0,
        learningMode: body.learningMode ?? "DAY_SCHOOL",
        tuitionFee: Number(body.tuitionFee) || 0,
        openDate: body.openDate ?? "",
        closeDate: body.closeDate ?? "",
    });
    return response || null;
};

/**
 * PUT /campus/{offeringId}/offering/status
 * @param {number} offeringId
 * @param {string} targetStatus - e.g. OPEN, CLOSED, PAUSED, ...
 */
export const updateCampusOfferingStatus = async (offeringId, targetStatus) => {
    const response = await axiosClient.put(`/campus/${Number(offeringId)}/offering/status`, null, {
        params: { targetStatus },
    });
    return response || null;
};

/** PUT /campus/{offeringId}/offering/close */
export const closeCampusOffering = async (offeringId) => {
    const response = await axiosClient.put(`/campus/${Number(offeringId)}/offering/close`, null);
    return response || null;
};

/**
 * GET /school/admission/campaign/list/export — file Excel danh sách chiến dịch theo năm
 * @param {number} year
 */
export const exportAdmissionCampaignList = async (year) => {
    const response = await axiosClient.get("/school/admission/campaign/list/export", {
        params: { year: Number(year) },
        responseType: "blob",
    });
    return response || null;
};
