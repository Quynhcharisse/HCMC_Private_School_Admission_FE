import axiosClient from "../configs/APIConfig.jsx";

/**
 * GET campaign templates by year
 * @param {number} year
 * @returns {Promise<{ data?: any }>}
 */
export const getCampaignTemplatesByYear = async (year) => {
    const response = await axiosClient.get(`/school/${year}/campaign/template`);
    return response || null;
};

/**
 * POST create campaign template
 * @param {{ name: string, description?: string, year: number, startDate: string, endDate: string }} body
 */
export const createCampaignTemplate = async (body) => {
    const response = await axiosClient.post("/school/campaign/template", {
        name: body.name?.trim() ?? "",
        description: body.description?.trim() ?? "",
        year: Number(body.year) || new Date().getFullYear(),
        startDate: body.startDate ?? "",
        endDate: body.endDate ?? "",
    });
    return response || null;
};

/**
 * PUT update campaign template
 * @param {{ admissionCampaignTemplateId: number, name: string, description?: string, startDate: string, endDate: string }} body
 */
export const updateCampaignTemplate = async (body) => {
    const response = await axiosClient.put("/school/campaign/template", {
        admissionCampaignTemplateId: Number(body.admissionCampaignTemplateId),
        name: body.name?.trim() ?? "",
        description: body.description?.trim() ?? "",
        startDate: body.startDate ?? "",
        endDate: body.endDate ?? "",
    });
    return response || null;
};

/**
 * PUT change campaign template status
 * @param {number} id
 * @param {string} targetStatus
 */
export const updateCampaignTemplateStatus = async (id, targetStatus) => {
    const response = await axiosClient.put(
        `/school/${id}/campaign/template/status`,
        null,
        {
            params: {targetStatus},
        }
    );
    return response || null;
};

/**
 * GET campaign offerings by campus (paginated)
 * @param {number} campusId
 * @param {{ page: number, pageSize: number, admissionCampaignId?: number }} params
 */
export const getCampaignOfferingsByCampus = async (campusId, { page = 0, pageSize = 10, admissionCampaignId } = {}) => {
    const response = await axiosClient.get(`/school/${campusId}/campaign/offering/list`, {
        params: {
            page,
            pageSize,
            ...(admissionCampaignId != null ? { admissionCampaignId } : {}),
        },
    });
    return response || null;
};

/**
 * POST create campaign offering
 * @param {{
 *   admissionCampaignId: number,
 *   campusId: number,
 *   programId: number,
 *   quota: number,
 *   learningMode: string,
 *   tuitionFee: number,
 *   applicationStatus: string,
 *   openDate: string,
 *   closeDate: string
 * }} body
 */
export const createCampaignOffering = async (body) => {
    const response = await axiosClient.post("/school/campaign/offering", {
        admissionCampaignId: Number(body.admissionCampaignId),
        campusId: Number(body.campusId),
        programId: Number(body.programId),
        quota: Number(body.quota) || 0,
        learningMode: body.learningMode ?? "DAY_SCHOOL",
        tuitionFee: Number(body.tuitionFee) || 0,
        applicationStatus: body.applicationStatus ?? "",
        openDate: body.openDate ?? "",
        closeDate: body.closeDate ?? "",
    });
    return response || null;
};

/**
 * PUT update campaign offering (bulk list endpoint)
 */
export const updateCampaignOffering = async (body) => {
    const response = await axiosClient.put("/school/campaign/offering/list", {
        id: Number(body.id),
        admissionCampaignId: Number(body.admissionCampaignId),
        campusId: Number(body.campusId),
        programId: Number(body.programId),
        quota: Number(body.quota) || 0,
        learningMode: body.learningMode ?? "DAY_SCHOOL",
        tuitionFee: Number(body.tuitionFee) || 0,
        applicationStatus: body.applicationStatus ?? "",
        openDate: body.openDate ?? "",
        closeDate: body.closeDate ?? "",
    });
    return response || null;
};
