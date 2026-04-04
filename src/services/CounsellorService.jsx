import axiosClient from "../configs/APIConfig.jsx";

/**
 * GET /api/v1/campus/counsellor/list (campus chính và phụ)
 * @param {number} page - zero-based page index (required)
 * @param {number} pageSize - size per page (required)
 * @returns {Promise<{data: { body: { items, currentPage, pageSize, totalItems, totalPages, hasNext, hasPrevious } }}>}
 */
export const fetchCounsellors = async (page = 0, pageSize = 10) => {
    const response = await axiosClient.get("/campus/counsellor/list", {
        params: { page, pageSize },
    });
    return response || null;
};

/**
 * POST /api/v1/campus/counsellor (campus chính và phụ)
 * @param {{ email: string, avatar?: string }} payload
 */
export const createCounsellor = async ({ email, avatar = "" }) => {
    const response = await axiosClient.post(
        "/campus/counsellor",
        { email, avatar: avatar ?? "" },
        {
            headers: {
                "X-Device-Type": "web",
            },
        }
    );
    return response || null;
};

