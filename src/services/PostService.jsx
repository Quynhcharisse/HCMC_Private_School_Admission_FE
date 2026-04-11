import axiosClient from "../configs/APIConfig.jsx";

function normalizeBodyString(body) {
    if (typeof body === "string") {
        try {
            return JSON.parse(body);
        } catch {
            return null;
        }
    }
    return body;
}

function parsePostDocumentImportResponse(responseData) {
    if (!responseData || typeof responseData !== "object") return null;
    let inner = responseData;
    if (inner.data != null && typeof inner.data === "object") {
        inner = inner.data;
    }
    let body = inner.body != null ? inner.body : inner;
    body = normalizeBodyString(body);
    if (!body || typeof body !== "object") return null;

    const fileName = body.fileName != null ? String(body.fileName).trim() : "";
    const fileUrlRaw = body.fileUrl;
    const fileUrl =
        fileUrlRaw == null || fileUrlRaw === ""
            ? null
            : String(fileUrlRaw).trim() || null;
    const storagePath = body.storagePath != null ? String(body.storagePath).trim() : "";
    const category = body.category != null ? String(body.category).trim() : "";

    if (!fileName) return null;

    return {fileName, fileUrl, storagePath, category};
}

export const createPost = async (body) => {
    return axiosClient.post("/post", body);
};

export const getPostList = async () => {
    return axiosClient.get("/post");
};

export async function uploadPostDocumentImport(categoryPostTemplate, file) {
    const template = String(categoryPostTemplate ?? "").trim();
    if (!template) {
        throw new Error("Thiếu danh mục bài (categoryPost)");
    }
    if (!file) {
        throw new Error("Không có file để tải lên");
    }
    const formData = new FormData();
    formData.append("file", file);
    const pathSeg = encodeURIComponent(template);
    const response = await axiosClient.post(`/post/${pathSeg}/document/post/import`, formData, {
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

    const parsed = parsePostDocumentImportResponse(response?.data);
    if (!parsed) {
        throw new Error("API upload không trả về fileName trong body.");
    }
    return parsed;
}
