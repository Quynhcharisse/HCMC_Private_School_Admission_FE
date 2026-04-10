import axiosClient from "../configs/APIConfig.jsx";

/**
 * POST /api/v1/school/subscription — tạo phiên thanh toán VNPay, trả về URL trong response.body
 */
export const createSchoolSubscriptionPayment = async ({ packageId, description }) => {
    const response = await axiosClient.post("/school/subscription", {
        packageId: Number(packageId),
        description: description ?? "",
    });
    return response;
};
