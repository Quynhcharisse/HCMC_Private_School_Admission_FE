const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/** @returns {{ cloudName?: string, uploadPreset?: string }} */
export function getCloudinaryConfig() {
    return {cloudName, uploadPreset};
}

export function isCloudinaryConfigured() {
    return Boolean(cloudName && uploadPreset);
}

/**
 * Cloudinary REST API dùng resource_type trong path.
 * Ảnh → image; PDF và file khác → raw (endpoint "auto" không phải lúc nào cũng hỗ trợ đầy đủ qua fetch trực tiếp).
 */
export function getCloudinaryUploadUrl(file) {
    if (!cloudName) {
        throw new Error("Thiếu VITE_CLOUDINARY_CLOUD_NAME");
    }
    const mime = file?.type || "";
    const isImage = mime.startsWith("image/");
    const resource = isImage ? "image" : "raw";
    return `https://api.cloudinary.com/v1_1/${cloudName}/${resource}/upload`;
}

/**
 * @param {File} file
 * @returns {Promise<{ url: string, type: string, publicId?: string, format?: string, bytes?: number }>}
 */
export async function uploadFileToCloudinary(file) {
    if (!isCloudinaryConfigured()) {
        throw new Error("Thiếu VITE_CLOUDINARY_CLOUD_NAME hoặc VITE_CLOUDINARY_UPLOAD_PRESET trong file .env");
    }
    const url = getCloudinaryUploadUrl(file);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const res = await fetch(url, {method: "POST", body: formData});
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.error) {
        const msg =
            (typeof data.error === "object" && data.error?.message) ||
            (typeof data.error === "string" && data.error) ||
            `Upload thất bại (${res.status})`;
        throw new Error(msg);
    }
    if (!data.secure_url) {
        throw new Error("Phản hồi từ Cloudinary không có secure_url");
    }

    return {
        url: data.secure_url,
        type: data.resource_type || (file.type?.startsWith("image/") ? "image" : "raw"),
        publicId: data.public_id,
        format: data.format,
        bytes: data.bytes,
    };
}

/**
 * @param {File[]} files
 */
export async function uploadFilesToCloudinary(files) {
    return Promise.all(files.map((f) => uploadFileToCloudinary(f)));
}
