import React, {useCallback, useEffect, useId, useRef, useState} from "react";
import {
    Box,
    Button,
    CircularProgress,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {uploadFileToCloudinary} from "../../utils/cloudinaryUpload.js";

const ACCEPT_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/x-png"]);

function isAllowedImage(file) {
    const type = (file?.type || "").toLowerCase();
    if (ACCEPT_MIME.has(type)) return true;
    const name = file?.name?.toLowerCase() || "";
    return /\.(jpe?g|png)$/i.test(name);
}

function formatBytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Dropzone upload ảnh (Cloudinary), không ô nhập URL — preview, trạng thái loading / thành công / lỗi.
 *
 * @param {object} props
 * @param {string | null} props.value — URL ảnh hiện tại
 * @param {(url: string | null) => void} props.onChange
 * @param {(message: string) => void} [props.onError]
 * @param {number} [props.maxBytes=5242880]
 * @param {boolean} [props.disabled]
 * @param {string} [props.inputId]
 */
export default function ImageUpload({
    value,
    onChange,
    onError,
    maxBytes = 5 * 1024 * 1024,
    disabled = false,
    inputId: inputIdProp,
}) {
    const genId = useId();
    const inputId = inputIdProp ?? `image-upload-${genId.replace(/:/g, "")}`;
    const fileInputRef = useRef(null);
    const successTimerRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [blobUrl, setBlobUrl] = useState(null);
    const [fileMeta, setFileMeta] = useState(null);
    const [successHint, setSuccessHint] = useState(false);

    const revokeBlob = useCallback((u) => {
        if (u) URL.revokeObjectURL(u);
    }, []);

    useEffect(() => {
        return () => revokeBlob(blobUrl);
    }, [blobUrl, revokeBlob]);

    useEffect(() => {
        return () => {
            if (successTimerRef.current) {
                clearTimeout(successTimerRef.current);
                successTimerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!value) {
            setFileMeta(null);
            setSuccessHint(false);
        }
    }, [value]);

    const runUpload = async (file) => {
        if (!file || disabled || uploading) return;
        setError(null);

        if (!isAllowedImage(file)) {
            const msg = "Chỉ hỗ trợ định dạng JPG, JPEG, PNG.";
            setError(msg);
            onError?.(msg);
            return;
        }
        if (file.size > maxBytes) {
            const msg = `Ảnh vượt quá ${formatBytes(maxBytes)}. Vui lòng chọn file nhỏ hơn.`;
            setError(msg);
            onError?.(msg);
            return;
        }

        revokeBlob(blobUrl);
        const nextBlob = URL.createObjectURL(file);
        setBlobUrl(nextBlob);
        setFileMeta({name: file.name, size: file.size});
        setUploading(true);
        setSuccessHint(false);

        try {
            const result = await uploadFileToCloudinary(file);
            revokeBlob(nextBlob);
            setBlobUrl(null);
            onChange?.(result.url);
            setSuccessHint(true);
            if (successTimerRef.current) clearTimeout(successTimerRef.current);
            successTimerRef.current = window.setTimeout(() => {
                setSuccessHint(false);
                successTimerRef.current = null;
            }, 4500);
        } catch (err) {
            revokeBlob(nextBlob);
            setBlobUrl(null);
            setFileMeta(null);
            const msg = err?.message || "Tải ảnh lên thất bại.";
            setError(msg);
            onError?.(msg);
        } finally {
            setUploading(false);
        }
    };

    const handleInputChange = (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        runUpload(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        runUpload(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled && !uploading) setDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
    };

    const handleRemove = () => {
        if (successTimerRef.current) {
            clearTimeout(successTimerRef.current);
            successTimerRef.current = null;
        }
        revokeBlob(blobUrl);
        setBlobUrl(null);
        setFileMeta(null);
        setError(null);
        setSuccessHint(false);
        onChange?.(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const openPicker = () => {
        if (!disabled && !uploading) fileInputRef.current?.click();
    };

    const previewSrc = uploading && blobUrl ? blobUrl : value || null;
    const showPreviewCard = Boolean(previewSrc);
    const zoneDisabled = disabled || uploading;

    const dropzoneSx = {
        borderRadius: 3,
        border: "2px dashed",
        borderColor: dragOver ? "#0D64DE" : "#cbd5e1",
        bgcolor: dragOver ? "rgba(13, 100, 222, 0.06)" : "#f8fafc",
        transition: "border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease",
        boxShadow: dragOver ? "0 8px 24px rgba(13, 100, 222, 0.12)" : "0 1px 3px rgba(15, 23, 42, 0.06)",
        outline: "none",
        "&:hover":
            zoneDisabled || showPreviewCard
                ? {}
                : {
                      borderColor: "#94a3b8",
                      bgcolor: "#f1f5f9",
                      boxShadow: "0 4px 16px rgba(15, 23, 42, 0.08)",
                  },
    };

    return (
        <Stack spacing={1.5} sx={{width: "100%"}}>
            <input
                ref={fileInputRef}
                id={inputId}
                type="file"
                hidden
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                disabled={zoneDisabled}
                onChange={handleInputChange}
            />

            {!showPreviewCard ? (
                <Box
                    role="button"
                    tabIndex={zoneDisabled ? -1 : 0}
                    aria-label="Kéo thả ảnh vào đây hoặc nhấn để chọn"
                    onKeyDown={(e) => {
                        if (zoneDisabled) return;
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openPicker();
                        }
                    }}
                    onClick={zoneDisabled ? undefined : openPicker}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    sx={{
                        ...dropzoneSx,
                        py: {xs: 4, sm: 5},
                        px: 2,
                        cursor: zoneDisabled ? "not-allowed" : "pointer",
                        opacity: zoneDisabled ? 0.65 : 1,
                        textAlign: "center",
                    }}
                >
                    <Stack spacing={2} alignItems="center">
                        <Box
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: 2.5,
                                bgcolor: "rgba(13, 100, 222, 0.1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <CloudUploadIcon sx={{fontSize: 32, color: "#0D64DE"}}/>
                        </Box>
                        <Box>
                            <Typography variant="body1" sx={{fontWeight: 600, color: "#1e293b"}}>
                                Kéo thả ảnh vào đây
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b", mt: 0.5}}>
                                hoặc
                            </Typography>
                        </Box>
                        <Button
                            component="span"
                            variant="contained"
                            startIcon={<CloudUploadIcon/>}
                            disabled={zoneDisabled}
                            onClick={(e) => {
                                e.stopPropagation();
                                openPicker();
                            }}
                            sx={{
                                textTransform: "none",
                                fontWeight: 600,
                                borderRadius: 2,
                                px: 2.5,
                                py: 1,
                                background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                                boxShadow: "0 4px 14px rgba(13, 100, 222, 0.35)",
                            }}
                        >
                            Tải ảnh lên
                        </Button>
                    </Stack>
                </Box>
            ) : (
                <Box
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    sx={{
                        ...dropzoneSx,
                        p: 2,
                        cursor: zoneDisabled ? "default" : "default",
                    }}
                >
                    <Stack spacing={2} alignItems="center">
                        <Box
                            sx={{
                                position: "relative",
                                width: "100%",
                                maxWidth: 280,
                                borderRadius: 3,
                                overflow: "hidden",
                                bgcolor: "#e2e8f0",
                                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.1)",
                                aspectRatio: "1",
                            }}
                        >
                            <Box
                                component="img"
                                src={previewSrc}
                                alt="Xem trước ảnh đại diện"
                                sx={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                }}
                            />
                            {uploading && (
                                <Box
                                    sx={{
                                        position: "absolute",
                                        inset: 0,
                                        bgcolor: "rgba(15, 23, 42, 0.45)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexDirection: "column",
                                        gap: 1,
                                    }}
                                >
                                    <CircularProgress size={44} sx={{color: "white"}} thickness={4}/>
                                    <Typography variant="caption" sx={{color: "white", fontWeight: 600}}>
                                        Đang tải lên…
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        {fileMeta && (
                            <Typography variant="caption" sx={{color: "#64748b", textAlign: "center", px: 1}}>
                                {fileMeta.name} · {formatBytes(fileMeta.size)}
                            </Typography>
                        )}

                        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" alignItems="center">
                            <Tooltip title="Thay ảnh">
                                <span>
                                    <IconButton
                                        onClick={openPicker}
                                        disabled={zoneDisabled}
                                        aria-label="Thay ảnh"
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            border: "1px solid #bfdbfe",
                                            bgcolor: "#eff6ff",
                                            color: "#0D64DE",
                                            borderRadius: 2,
                                            "&:hover": {bgcolor: "#dbeafe"},
                                        }}
                                    >
                                        <CloudUploadIcon/>
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title="Xóa ảnh">
                                <span>
                                    <IconButton
                                        onClick={handleRemove}
                                        disabled={zoneDisabled}
                                        aria-label="Xóa ảnh"
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            border: "1px solid #fecaca",
                                            bgcolor: "#fef2f2",
                                            color: "#dc2626",
                                            borderRadius: 2,
                                            "&:hover": {bgcolor: "#fee2e2"},
                                        }}
                                    >
                                        <DeleteOutlineIcon/>
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>

                        <Typography variant="caption" sx={{color: "#94a3b8"}}>
                            Kéo thả ảnh mới vào khung để thay thế
                        </Typography>
                    </Stack>
                </Box>
            )}

            {successHint && value && !uploading && (
                <Stack direction="row" alignItems="center" spacing={1} justifyContent="center">
                    <CheckCircleIcon sx={{fontSize: 20, color: "#16a34a"}}/>
                    <Typography variant="body2" sx={{color: "#15803d", fontWeight: 600}}>
                        Tải lên thành công
                    </Typography>
                </Stack>
            )}

            {error && (
                <Typography variant="body2" sx={{color: "#dc2626", textAlign: "center", fontWeight: 500}}>
                    {error}
                </Typography>
            )}

            <Typography variant="caption" sx={{color: "#94a3b8", textAlign: "center", display: "block"}}>
                Định dạng: JPG, JPEG, PNG · Tối đa {formatBytes(maxBytes)}
            </Typography>
        </Stack>
    );
}
