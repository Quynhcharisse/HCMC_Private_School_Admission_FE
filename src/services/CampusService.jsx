import axiosClient from "../configs/APIConfig.jsx";

export const listCampuses = async () => {
    const response = await axiosClient.post("/school/campus/list");
    return response || null;
};

export const createCampus = async ({email, name, address, phone}) => {
    const response = await axiosClient.post("/school/campus", {
        email,
        name,
        address,
        phone,
    }, {
        headers: {
            "X-Device-Type": "web"
        }
    });
    return response || null;
};

