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

/**
 * GET /api/v1/school/payment/receipt — chi tiết hóa đơn theo mã tham chiếu VNPay (txnRef).
 */
export const getSchoolPaymentReceipt = async (txnRef) => {
    const ref = String(txnRef ?? "").trim();
    const response = await axiosClient.get("/school/payment/receipt", {
        params: { txnRef: ref },
    });
    return response;
};

/**
 * GET /api/v1/school/subscription/receipt/export — tải file PDF hóa đơn.
 */
export const exportSchoolSubscriptionReceiptPdf = async (txnRef) => {
    const ref = String(txnRef ?? "").trim();
    const response = await axiosClient.get("/school/subscription/receipt/export", {
        params: { txnRef: ref },
        responseType: "blob",
    });
    return response;
};

/**
 * POST /api/v1/school/subscription/preview — xem trước chênh lệch khi nâng cấp/gia hạn gói.
 */
export const previewSchoolSubscriptionChange = async ({ actionType, targetPackageId }) => {
    const response = await axiosClient.post("/school/subscription/preview", {
        actionType: String(actionType || "").toUpperCase(),
        targetPackageId: Number(targetPackageId),
    });
    return response;
};
