import axiosClient from "../configs/APIConfig.jsx";

/**
 * GET /api/v1/school/public/list
 * Công khai — có hoặc không đăng nhập đều gọi được.
 */
export async function getPublicSchoolList() {
    const response = await axiosClient.get("/school/public/list");
    const body = response?.data?.body;
    if (Array.isArray(body)) return body;
    return [];
}

/**
 * GET /api/v1/school/{schoolId}/public/detail
 * Công khai — có hoặc không đăng nhập đều gọi được.
 */
export async function getPublicSchoolDetail(schoolId) {
    if (schoolId === undefined || schoolId === null) return null;
    const response = await axiosClient.get(`/school/${schoolId}/public/detail`);
    return response?.data?.body ?? null;
}

/**
 * GET /api/v1/school/{schoolId}/campaign/template/public?year=...
 * Lấy danh sách chiến dịch tuyển sinh public của trường.
 */
export async function getPublicSchoolCampaignTemplates(schoolId, year = 0) {
    if (schoolId === undefined || schoolId === null) return [];
    const response = await axiosClient.get(`/school/${schoolId}/campaign/template/public`, {
        params: {year: Number(year) || 0}
    });
    const body = response?.data?.body;
    return Array.isArray(body) ? body : [];
}

/**
 * GET /api/v1/school/campus/search/nearby?lat=...&lng=...&radius=...
 * Tìm các campus lân cận dựa trên tọa độ phụ huynh.
 */
export async function searchNearbyCampuses({lat, lng, radius = 10}) {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return [];
    const params = {
        lat: Number(lat),
        lng: Number(lng),
        radius: Number(radius)
    };
    const endpoints = [
        "/school/campus/search/nearby",
        "/campus/search-nearby"
    ];
    const pickBodyList = (response) => {
        const body = response?.data?.body;
        if (Array.isArray(body)) return body;
        if (Array.isArray(body?.items)) return body.items;
        if (Array.isArray(body?.content)) return body.content;
        if (Array.isArray(body?.campusList)) return body.campusList;
        return [];
    };

    let lastError = null;
    for (const endpoint of endpoints) {
        try {
            const response = await axiosClient.get(endpoint, {params});
            return pickBodyList(response);
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError ?? new Error("Không gọi được API tìm campus lân cận.");
}
