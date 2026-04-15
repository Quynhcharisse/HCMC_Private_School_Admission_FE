import React, {useId, useState} from "react";
import {uploadFilesToCloudinary} from "../../utils/cloudinaryUpload.js";

/**
 * Upload unsigned lên Cloudinary (preset trong Dashboard).
 *
 * @param {object} props
 * @param {(files: { url: string, type: string, publicId?: string, format?: string, bytes?: number }[]) => void} props.onSuccess
 * @param {(message: string) => void} [props.onError]
 * @param {string} [props.accept]
 * @param {boolean} [props.multiple]
 * @param {boolean} [props.disabled]
 * @param {string} [props.inputId] — để gắn label/htmlFor từ ngoài (tránh trùng khi nhiều input trên trang)
 * @param {(ctx: { inputId: string, loading: boolean }) => React.ReactNode} props.children — nút kích hoạt (dùng htmlFor={inputId})
 */
export default function CloudinaryUpload({
    onSuccess,
    onError,
    accept = "image/*,application/pdf",
    multiple = true,
    disabled = false,
    inputId: inputIdProp,
    children,
}) {
    const genId = useId();
    const inputId = inputIdProp ?? `cloudinary-file-${genId.replace(/:/g, "")}`;
    const [loading, setLoading] = useState(false);

    const handleChange = async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = "";
        if (!files.length) return;

        setLoading(true);
        try {
            const results = await uploadFilesToCloudinary(files);
            onSuccess?.(results);
        } catch (err) {
            const message = err?.message || "Upload thất bại";
            onError?.(message);
            console.error("Cloudinary upload:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <input
                id={inputId}
                type="file"
                hidden
                accept={accept}
                multiple={multiple}
                disabled={disabled || loading}
                onChange={handleChange}
            />
            {typeof children === "function" ? children({inputId, loading}) : children}
        </>
    );
}
