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

/**
 * GET /api/v1/school/current/subscription — trạng thái gói đăng ký hiện tại của trường
 */
export const getCurrentSchoolSubscription = async () => {
    const response = await axiosClient.get("/school/current/subscription");
    return response;
};

/**
 * GET /api/v1/school/vnpay-callback — FE forward nguyên query string VNPAY (như trên URL sau redirect)
 * để BE verify chữ ký và kích hoạt gói. `queryString` nên là `window.location.search` (có tiền tố "?").
 */
export const forwardSchoolVnpayCallback = async (queryString) => {
    const raw = typeof queryString === "string" ? queryString.trim() : "";
    const qs = raw.startsWith("?") ? raw : raw ? `?${raw}` : "";
    const response = await axiosClient.get(`/school/vnpay-callback${qs}`);
    return response;
};
