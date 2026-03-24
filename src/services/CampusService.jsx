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

export const createCampus = async ({
    email,
    name,
    address,
    phone,
    city,
    district,
    latitude,
    longitude,
    boardingType,
}) => {
    const response = await axiosClient.post(
        "/school/campus",
        {
            email,
            name,
            address,
            phone,
            city: city ?? undefined,
            district: district ?? undefined,
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

