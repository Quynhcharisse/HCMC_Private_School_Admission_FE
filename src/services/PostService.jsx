import axiosClient from "../configs/APIConfig.jsx";

export const createPost = async (body) => {
    return axiosClient.post("/post", body);
};
