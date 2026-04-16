import axiosClient from "../configs/APIConfig.jsx";

export const refreshToken = async () => {
    const response = await axiosClient.post("/auth/refresh", {}, {
        headers: {
            "X-Device-Type": "web"
        }
    });
    return response || null
}

export const signin = async (email) => {
    const response = await axiosClient.post("/auth/login", {
            email: email
        }, {
            headers: {
                "X-Device-Type": "web"
            }
        }
    );
    return response || null
}

export const signup = async (email, role, picture) => {
    const response = await axiosClient.post("/auth/register", {
            email: email,
            role: role,
            avatar: picture
        }, {
            headers: {
                "X-Device-Type": "web"
            }
        }
    );
    return response || null
}

export const registerSchool = async (registerData) => {
    const response = await axiosClient.post("/auth/register", registerData, {
        headers: {
            "X-Device-Type": "web"
        }
    });
    return response || null
}

const resolveSchoolLicenseUploadEndpoint = () => {
    const raw = (import.meta.env.VITE_SCHOOL_LICENSE_UPLOAD_ENDPOINT || "/auth/business/license/upload").trim();
    if (!raw) return "/auth/business/license/upload";
    return raw.startsWith("/") ? raw : `/${raw}`;
};

const pickUploadedFileUrl = (body) => {
    if (!body || typeof body !== "object") return null;
    return (
        body?.data?.url ||
        body?.data?.fileUrl ||
        body?.data?.secure_url ||
        body?.body?.url ||
        body?.body?.fileUrl ||
        body?.body?.secure_url ||
        body?.url ||
        body?.fileUrl ||
        body?.secure_url ||
        null
    );
};

const pickMessageFromUnknown = (value) => {
    if (value == null) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "object") {
        const m = value.message ?? value.error ?? value.desc;
        if (typeof m === "string") return m.trim();
    }
    return "";
};

export const getSchoolLicenseUploadErrorMessage = (error) => {
    if (error?.message === "API upload không trả về URL file") {
        return "Server không trả về URL file (url/fileUrl). Kiểm tra response API upload hoặc map thêm trong pickUploadedFileUrl.";
    }

    const status = error?.response?.status;
    const data = error?.response?.data;

    if (status === 413) {
        return "File quá lớn so với giới hạn server. Hãy nén PDF hoặc chọn bản scan nhỏ hơn; nhóm backend cần tăng multipart max nếu cần.";
    }
    if (status === 401 || status === 403) {
        return "Bạn chưa có quyền tải file lên (đăng nhập / quyền truy cập).";
    }
    if (status === 404) {
        return "Không tìm thấy API upload file. Kiểm tra endpoint backend hoặc biến VITE_SCHOOL_LICENSE_UPLOAD_ENDPOINT.";
    }

    const fromBody =
        pickMessageFromUnknown(data) ||
        (typeof data === "string" ? data.trim() : "") ||
        pickMessageFromUnknown(data?.data);

    if (fromBody) return fromBody;

    if (error?.code === "ECONNABORTED" || error?.message?.includes?.("timeout")) {
        return "Hết thời gian chờ khi tải file. Thử lại với file nhỏ hơn hoặc mạng ổn định hơn.";
    }
    if (error?.message === "Network Error") {
        return "Lỗi mạng hoặc server từ chối kết nối. Kiểm tra backend đang chạy và CORS.";
    }

    return "Tải file giấy phép thất bại. Vui lòng thử lại.";
};

export const uploadSchoolBusinessLicensePdf = async (file) => {
    if (!file) {
        throw new Error("Không tìm thấy file PDF để tải lên");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosClient.post(resolveSchoolLicenseUploadEndpoint(), formData, {
        headers: {
            "X-Device-Type": "web"
        },
        transformRequest: [
            (data, headers) => {
                if (data instanceof FormData) {
                    delete headers["Content-Type"];
                }
                return data;
            }
        ],
        maxBodyLength: Infinity,
        maxContentLength: Infinity
    });

    const uploadedUrl = pickUploadedFileUrl(response?.data);
    if (!uploadedUrl) {
        throw new Error("API upload không trả về URL file");
    }
    return uploadedUrl;
};

export const checkTaxCode = async (taxCode) => {
    const response = await fetch(`https://api.vietqr.io/v2/business/${encodeURIComponent(taxCode)}`);
    const status = response.status;
    const contentType = response.headers.get('content-type') || '';
    let data = null;
    try {
        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            try {
                data = text ? JSON.parse(text) : null;
            } catch {
                data = { raw: text };
            }
        }
    } catch (parseErr) {
        const err = new Error('Tax code lookup failed');
        err.status = status;
        err.response = { status, data: null };
        throw err;
    }
    if (!response.ok) {
        const message =
            data?.desc ||
            (status === 429
                ? 'Too many requests'
                : 'Tax code lookup failed');
        const error = new Error(message);
        error.status = status;
        error.response = { status, data };
        throw error;
    }
    return data;
};
