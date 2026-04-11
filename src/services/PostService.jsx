import axiosClient from "../configs/APIConfig.jsx";

/**
 * POST /api/v1/post
 * @param {object} body — CreatePostRequest JSON
 */
export const createPost = async (body) => {
    return axiosClient.post("/post", body);
};
