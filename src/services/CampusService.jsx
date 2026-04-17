import axiosClient from "../configs/APIConfig.jsx";

export const extractCampusListBody = (response) => {
    const body = response?.data?.body ?? response?.body ?? response?.data ?? null;
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.items)) return body.items;
    return [];
};

export const listCampuses = async () => {
    // API yêu cầu query params `page` và `pageSize`
    // Default pageSize lớn để các màn hình hiện tại có thể tự paginate/filter ở client.
    const response = await axiosClient.get("/school/campus/list", {
        params: {
            page: 0,
            pageSize: 1000,
        },
    });
    return response || null;
};

/** GET /school/campus/list/export — file Excel danh sách cơ sở */
export const exportCampusList = async () => {
    const response = await axiosClient.get("/school/campus/list/export", {
        responseType: "blob",
    });
    return response || null;
};

export const createCampus = async ({
    email,
    address,
    phone,
    city,
    district,
    ward,
    latitude,
    longitude,
    boardingType,
}) => {
    const response = await axiosClient.post(
        "/school/campus",
        {
            email,
            address,
            phone,
            city: city ?? undefined,
            district: district ?? undefined,
            ward: ward ?? undefined,
            latitude: latitude != null ? Number(latitude) : undefined,
            longitude: longitude != null ? Number(longitude) : undefined,
            boardingType: boardingType || undefined,
        },
        {
            headers: {
                "X-Device-Type": "web",
            },
        }
    );
    return response || null;
};

/**
 * GET /api/v1/campus/quota/request/summary/emailjs
 * Dữ liệu cho campus phụ gửi email yêu cầu thêm nguồn lực tới campus chính (EmailJS).
 */
export const getCampusQuotaRequestSummaryForEmailJs = async () => {
    const response = await axiosClient.get("/campus/quota/request/summary/emailjs");
    return response?.data?.body ?? response?.data ?? null;
};
