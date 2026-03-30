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
