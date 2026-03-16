import axiosClient from "../configs/APIConfig.jsx";

export const listCampuses = async () => {
    const response = await axiosClient.get("/school/campus/list");
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

