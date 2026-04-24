import { useCallback, useEffect, useRef, useState } from "react";
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    FormControl,
    IconButton,
    InputLabel,
    Link,
    MenuItem,
    Select,
    Typography,
    alpha,
} from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { enqueueSnackbar } from "notistack";
import { APP_PRIMARY_MAIN } from "../../../constants/homeLandingTheme";
import {
    deleteAdminTemplateDocument,
    getAdminTemplateDocuments,
    uploadAdminTemplateDocument,
} from "../../../services/AdminService.jsx";
import { adminDataCardBorderSx } from "../../../constants/adminTableStyles.js";

const TEMPLATE_CATEGORY_OPTIONS = Object.freeze([
    {value: "SCHOOL_INFO_TEMPLATE", label: "Mẫu thông tin trường"},
    {value: "CAMPUS_INFO_TEMPLATE", label: "Mẫu thông tin cơ sở"}
]);

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".doc", ".docx"];

function pickHttpErrorMessage(error, fallback) {
    const d = error?.response?.data;
    if (!d || typeof d !== "object") return fallback;
    if (typeof d.message === "string" && d.message.trim()) return d.message.trim();
    if (typeof d.error === "string" && d.error.trim()) return d.error.trim();
    if (typeof d?.body?.message === "string" && d.body.message.trim()) return d.body.message.trim();
    return fallback;
}

function extractDocuments(response) {
    const body = response?.data?.body;
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.items)) return body.items;
    if (Array.isArray(body?.data)) return body.data;
    return [];
}

function extractUploadResult(response, fallbackName) {
    const body = response?.data?.body ?? {};
    const fileName =
        (typeof body.fileName === "string" && body.fileName.trim()) ||
        (typeof body.filename === "string" && body.filename.trim()) ||
        (typeof body.name === "string" && body.name.trim()) ||
        (typeof response?.data?.fileName === "string" && response.data.fileName.trim()) ||
        fallbackName;
    const fileUrl = typeof body.fileUrl === "string" && body.fileUrl.trim() ? body.fileUrl.trim() : "";
    return {fileName, fileUrl};
}

function pickDocumentUrl(item) {
    const candidates = [
        item?.fileUrl,
        item?.url,
        item?.file_url,
        item?.downloadUrl,
        item?.download_url,
        item?.storageUrl,
        item?.storagePath,
        item?.link,
        item?.file?.url,
        item?.file?.fileUrl,
    ];
    for (const c of candidates) {
        if (typeof c === "string" && c.trim()) return c.trim();
    }
    return "";
}

function mapDocument(item, index) {
    const rawUrl = pickDocumentUrl(item);
    return {
        id: item?.templateId ?? item?.id ?? `row-${index}`,
        fileName: item?.fileName ?? item?.filename ?? item?.name ?? item?.originalFileName ?? `file_${index + 1}.docx`,
        fileUrl: rawUrl ? resolveAbsoluteFileUrl(rawUrl) : "",
    };
}

function resolveServerOrigin() {
    const raw = (import.meta.env.VITE_SERVER_BE || "http://localhost:8080").trim().replace(/\/+$/, "");
    return raw.replace(/\/api\/v1$/i, "");
}

function resolveAbsoluteFileUrl(raw) {
    const s = String(raw || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith("//")) return `${typeof window !== "undefined" ? window.location.protocol : "https:"}${s}`;
    if (s.startsWith("/")) {
        const origin = resolveServerOrigin().replace(/\/+$/, "");
        return `${origin}${s}`;
    }
    return s;
}

function isOfficeWordFile(fileName, urlString) {
    if (/\.(docx?|docm)$/i.test(String(fileName || ""))) return true;
    try {
        return /\.(docx?|docm)$/i.test(new URL(urlString).pathname);
    } catch {
        return false;
    }
}

function buildTemplateDocumentViewHref(fileUrl, fileName) {
    const absolute = resolveAbsoluteFileUrl(fileUrl);
    if (!absolute) return "";
    if (!isOfficeWordFile(fileName, absolute)) return absolute;
    try {
        const u = new URL(absolute);
        const host = u.hostname.toLowerCase();
        const isLocal =
            host === "localhost" ||
            host === "127.0.0.1" ||
            /^192\.168\.\d+\.\d+$/.test(host) ||
            /^10\.\d+\.\d+\.\d+$/.test(host);
        if (isLocal || u.protocol !== "https:") {
            return absolute;
        }
        return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absolute)}`;
    } catch {
        return absolute;
    }
}

function isDocFile(file) {
    const lowerName = String(file?.name || "").toLowerCase();
    return ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

const selectSx = {
    "& .MuiInputLabel-root": {color: "rgba(30, 41, 59, 0.65)"},
    "& .MuiOutlinedInput-root": {
        bgcolor: "#ffffff",
        color: APP_PRIMARY_MAIN,
        fontWeight: 600,
        "& fieldset": {borderColor: "rgba(59, 130, 246, 0.35)"},
        "&:hover fieldset": {borderColor: "rgba(59, 130, 246, 0.55)"},
        "&.Mui-focused fieldset": {borderColor: APP_PRIMARY_MAIN}
    }
};

export default function AdminDocumentTemplateManagement() {
    const fileInputRef = useRef(null);
    const [categoryTemplate, setCategoryTemplate] = useState(TEMPLATE_CATEGORY_OPTIONS[0].value);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [uploadedFileName, setUploadedFileName] = useState("");
    const [uploadedFileUrl, setUploadedFileUrl] = useState("");

    const loadDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAdminTemplateDocuments(categoryTemplate);
            const list = extractDocuments(res).map(mapDocument);
            setDocuments(list);
        } catch (e) {
            console.error(e);
            enqueueSnackbar("Không thể tải danh sách tài liệu mẫu.", { variant: "error" });
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    }, [categoryTemplate]);

    useEffect(() => {
        setUploadedFileName("");
        setUploadedFileUrl("");
        loadDocuments();
    }, [loadDocuments]);

    const onChooseFile = () => {
        if (uploading) return;
        fileInputRef.current?.click();
    };

    const handleUploadFile = async (file) => {
        if (!file) return;
        if (!isDocFile(file)) {
            enqueueSnackbar("Chỉ chấp nhận file .doc hoặc .docx.", { variant: "warning" });
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            enqueueSnackbar("Kích thước file tối đa là 50MB.", { variant: "warning" });
            return;
        }
        setUploading(true);
        try {
            const res = await uploadAdminTemplateDocument(categoryTemplate, file);
            const {fileName, fileUrl} = extractUploadResult(res, file.name);
            setUploadedFileName(fileName);
            setUploadedFileUrl(fileUrl);
            enqueueSnackbar("Đã tải lên tài liệu mẫu thành công.", { variant: "success" });
            await loadDocuments();
        } catch (e) {
            console.error(e);
            enqueueSnackbar(pickHttpErrorMessage(e, "Tải lên không thành công. Vui lòng thử lại."), { variant: "error" });
        } finally {
            setUploading(false);
        }
    };

    const onFileChange = async (event) => {
        const file = event?.target?.files?.[0];
        event.target.value = "";
        await handleUploadFile(file);
    };

    const onDragOver = (event) => {
        event.preventDefault();
        if (uploading) return;
        setIsDragging(true);
    };

    const onDragLeave = (event) => {
        event.preventDefault();
        setIsDragging(false);
    };

    const onDrop = async (event) => {
        event.preventDefault();
        setIsDragging(false);
        if (uploading) return;
        const file = event?.dataTransfer?.files?.[0];
        await handleUploadFile(file);
    };

    const onDelete = async (document) => {
        if (document?.id == null || document?.id === "") {
            enqueueSnackbar("Không tìm thấy templateId để xóa.", { variant: "warning" });
            return;
        }
        setDeletingId(document.id);
        try {
            await deleteAdminTemplateDocument(document.id);
            enqueueSnackbar("Đã xóa tài liệu mẫu.", { variant: "success" });
            await loadDocuments();
        } catch (e) {
            console.error(e);
            enqueueSnackbar(pickHttpErrorMessage(e, "Không thể xóa tài liệu mẫu."), { variant: "error" });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Box sx={{ p: { xs: 1, md: 2 }, borderRadius: 4, bgcolor: "#ffffff", color: "#1e293b" }}>
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3.5,
                    mb: 2.5,
                    color: "white",
                    background: "linear-gradient(95deg, #60a5fa 0%, #818cf8 46%, #a78bfa 100%)",
                    boxShadow: "0 12px 24px rgba(99, 102, 241, 0.2)",
                }}
            >
                <CardContent sx={{ p: { xs: 1.5, md: 1.9 }, "&:last-child": { pb: { xs: 1.5, md: 1.9 } } }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: alpha("#ffffff", 0.28), color: "white", width: 34, height: 34, border: "1px solid rgba(255,255,255,0.45)" }}>
                            <DescriptionOutlinedIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, textShadow: "0 1px 2px rgba(15,23,42,0.24)" }}>
                                Quản lý tài liệu mẫu
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 1, mt: 0.3, fontSize: 13, fontWeight: 500, textShadow: "0 1px 2px rgba(15,23,42,0.2)" }}>
                                Upload và quản lý tài liệu mẫu theo từng nhóm template
                            </Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <Card elevation={0} sx={{ ...adminDataCardBorderSx, borderRadius: 2 }}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <FormControl fullWidth size="small" sx={{mb: 2, maxWidth: {sm: 420}, ...selectSx}}>
                        <InputLabel id="template-category-label">Định dạng tệp đính kèm</InputLabel>
                        <Select
                            labelId="template-category-label"
                            label="Định dạng tệp đính kèm"
                            value={categoryTemplate}
                            onChange={(e) => setCategoryTemplate(e.target.value)}
                            disabled={uploading}
                            renderValue={(val) => {
                                const o = TEMPLATE_CATEGORY_OPTIONS.find((x) => x.value === val);
                                return o?.label ?? "";
                            }}
                            MenuProps={{
                                PaperProps: {
                                    sx: {
                                        bgcolor: "#ffffff",
                                        border: "1px solid rgba(59, 130, 246, 0.22)",
                                        "& .MuiMenuItem-root": {fontSize: "0.9rem"}
                                    }
                                }
                            }}
                        >
                            {TEMPLATE_CATEGORY_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                            gap: 2,
                        }}
                    >
                        <Box
                            sx={{
                                border: "1px solid #bfdbfe",
                                borderRadius: 3,
                                p: 2,
                                bgcolor: "#eff6ff",
                                minHeight: 320,
                            }}
                        >
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                                Tài liệu mẫu
                            </Typography>
                            <Box
                                sx={{
                                    border: "2px dashed #93c5fd",
                                    borderRadius: 3,
                                    borderColor: isDragging ? "#3b82f6" : "#93c5fd",
                                    bgcolor: isDragging ? "#eff6ff" : "#ffffff",
                                    minHeight: 220,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    textAlign: "center",
                                    px: 2,
                                    transition: "all 0.15s ease",
                                }}
                                onDragOver={onDragOver}
                                onDragLeave={onDragLeave}
                                onDrop={onDrop}
                            >
                                <UploadFileOutlinedIcon sx={{ fontSize: 44, color: "#60a5fa", mb: 1 }} />
                                <Typography sx={{ color: "#334155", mb: 1, fontWeight: 600 }}>
                                    Kéo thả file vào đây hoặc bấm tải lên
                                </Typography>
                                <Button
                                    variant="outlined"
                                    onClick={onChooseFile}
                                    disabled={uploading}
                                    startIcon={
                                        uploading ? (
                                            <CircularProgress size={18} color="inherit" />
                                        ) : (
                                            <UploadFileOutlinedIcon sx={{ fontSize: 20 }} />
                                        )
                                    }
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 600,
                                        borderColor: "#94a3b8",
                                        color: "#1e293b",
                                        bgcolor: "#ffffff",
                                        px: 2.5,
                                        "&:hover": {
                                            borderColor: "#60a5fa",
                                            bgcolor: "#f8fafc",
                                        },
                                    }}
                                >
                                    {uploading ? "Đang tải…" : "Tải lên"}
                                </Button>
                                <Typography
                                    variant="caption"
                                    sx={{ color: "#94a3b8", mt: 1.1, fontSize: "0.72rem", textAlign: "center" }}
                                >
                                    Chỉ upload file DOC/DOCX, dung lượng tối đa 50MB
                                </Typography>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    hidden
                                    onChange={onFileChange}
                                />
                            </Box>
                            <Box
                                sx={{
                                    mt: 2,
                                    border: "1px solid #93c5fd",
                                    borderRadius: 2,
                                    bgcolor: "#e0f2fe",
                                    px: 1.5,
                                    py: 1.25,
                                    minHeight: 44,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 0.75,
                                }}
                            >
                                <Typography sx={{ color: "#0f172a", fontWeight: 600, wordBreak: "break-word" }}>
                                    {uploadedFileName || "Chưa có tệp vừa tải"}
                                </Typography>
                                {uploadedFileUrl ? (
                                    <Link
                                        href={buildTemplateDocumentViewHref(uploadedFileUrl, uploadedFileName)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{ fontSize: "0.8rem", fontWeight: 600, wordBreak: "break-all" }}
                                    >
                                        Xem / mở tệp đã lưu
                                    </Link>
                                ) : null}
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                border: "1px solid #bfdbfe",
                                borderRadius: 3,
                                p: 2,
                                bgcolor: "#eff6ff",
                                minHeight: 320,
                            }}
                        >
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                                Danh sách tài liệu
                            </Typography>
                            <Box
                                sx={{
                                    borderRadius: 2.5,
                                    bgcolor: "#f0f7ff",
                                    p: 1.5,
                                    minHeight: 252,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 1.2,
                                }}
                            >
                                {loading ? (
                                    <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <CircularProgress size={30} sx={{ color: APP_PRIMARY_MAIN }} />
                                    </Box>
                                ) : documents.length === 0 ? (
                                    <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Typography sx={{ color: "#64748b" }}>Chưa có tài liệu nào.</Typography>
                                    </Box>
                                ) : (
                                    documents.map((doc) => (
                                        <Box
                                            key={`${doc.id}-${doc.fileName}`}
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                gap: 1,
                                                bgcolor: alpha("#3b82f6", 0.28),
                                                border: "1px solid",
                                                borderColor: alpha("#60a5fa", 0.45),
                                                boxShadow: "0 6px 14px rgba(59, 130, 246, 0.14)",
                                                borderRadius: 2.5,
                                                px: 1.5,
                                                py: 1,
                                            }}
                                        >
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                {doc.fileUrl ? (
                                                    <Link
                                                        href={buildTemplateDocumentViewHref(doc.fileUrl, doc.fileName)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        underline="hover"
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: "#1e3a8a",
                                                            wordBreak: "break-word",
                                                        }}
                                                    >
                                                        {doc.fileName}
                                                    </Link>
                                                ) : (
                                                    <Typography
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: "#1e3a8a",
                                                            wordBreak: "break-word",
                                                        }}
                                                    >
                                                        {doc.fileName}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <IconButton
                                                size="small"
                                                onClick={() => onDelete(doc)}
                                                disabled={deletingId === doc.id}
                                                sx={{
                                                    color: "#2563eb",
                                                    p: 0.25,
                                                    "&:hover": { bgcolor: "transparent", color: "#1d4ed8" },
                                                }}
                                                aria-label="Xóa tài liệu"
                                            >
                                                {deletingId === doc.id ? (
                                                    <CircularProgress size={16} color="inherit" />
                                                ) : (
                                                    <CloseIcon fontSize="small" />
                                                )}
                                            </IconButton>
                                        </Box>
                                    ))
                                )}
                            </Box>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}
