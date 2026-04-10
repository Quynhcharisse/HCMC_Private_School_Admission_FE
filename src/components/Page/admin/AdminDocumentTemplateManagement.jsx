import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    IconButton,
    Tab,
    Tabs,
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
                
const CATEGORY_TABS = [
    { key: "CAMPUS_INFO_TEMPLATE", label: "CAMPUS_INFO_TEMPLATE" },
    { key: "SCHOOL_INFO_TEMPLATE", label: "SCHOOL_INFO_TEMPLATE" },
];

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

function extractUploadedFilename(response, fallbackName) {
    const body = response?.data?.body;
    const value =
        body?.fileName ??
        body?.filename ??
        body?.name ??
        body?.originalFileName ??
        response?.data?.fileName ??
        response?.data?.filename;
    if (typeof value === "string" && value.trim()) return value.trim();
    return fallbackName;
}

function mapDocument(item, index) {
    return {
        id: item?.templateId ?? item?.id ?? `row-${index}`,
        fileName: item?.fileName ?? item?.filename ?? item?.name ?? item?.originalFileName ?? `file_${index + 1}.docx`,
    };
}

function isDocFile(file) {
    const lowerName = String(file?.name || "").toLowerCase();
    return ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

export default function AdminDocumentTemplateManagement() {
    const fileInputRef = useRef(null);
    const [tabIndex, setTabIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [uploadedFileName, setUploadedFileName] = useState("");

    const activeCategory = useMemo(() => CATEGORY_TABS[tabIndex]?.key ?? CATEGORY_TABS[0].key, [tabIndex]);

    const loadDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAdminTemplateDocuments(activeCategory);
            const list = extractDocuments(res).map(mapDocument);
            setDocuments(list);
        } catch (e) {
            console.error(e);
            enqueueSnackbar("Không thể tải danh sách tài liệu mẫu.", { variant: "error" });
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    }, [activeCategory]);

    useEffect(() => {
        setUploadedFileName("");
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
            const res = await uploadAdminTemplateDocument(activeCategory, file);
            setUploadedFileName(extractUploadedFilename(res, file.name));
            enqueueSnackbar("Upload tài liệu mẫu thành công.", { variant: "success" });
            await loadDocuments();
        } catch (e) {
            console.error(e);
            enqueueSnackbar(pickHttpErrorMessage(e, "Upload thất bại. Vui lòng thử lại."), { variant: "error" });
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
                    background: "linear-gradient(95deg, #2563eb 0%, #3158ef 40%, #6d3df2 72%, #8b3dff 100%)",
                    boxShadow: "0 18px 34px rgba(67, 56, 202, 0.28)",
                }}
            >
                <CardContent sx={{ p: { xs: 2.2, md: 2.8 }, "&:last-child": { pb: { xs: 2.2, md: 2.8 } } }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: alpha("#ffffff", 0.2), color: "white", width: 42, height: 42 }}>
                            <DescriptionOutlinedIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                Quản lý tài liệu mẫu
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.92, mt: 0.45 }}>
                                Upload và quản lý tài liệu mẫu theo từng nhóm template
                            </Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <Card elevation={0} sx={{ ...adminDataCardBorderSx, borderRadius: 2 }}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Tabs
                        value={tabIndex}
                        onChange={(_, next) => setTabIndex(next)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            mb: 2,
                            minHeight: 44,
                            borderBottom: "1px solid #bfdbfe",
                            "& .MuiTab-root": {
                                textTransform: "none",
                                fontWeight: 700,
                                fontSize: "0.95rem",
                                minHeight: 44,
                                color: "#64748b",
                            },
                            "& .Mui-selected": { color: APP_PRIMARY_MAIN },
                            "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0", bgcolor: APP_PRIMARY_MAIN },
                        }}
                    >
                        {CATEGORY_TABS.map((tab, idx) => (
                            <Tab key={tab.key} value={idx} label={tab.label} />
                        ))}
                    </Tabs>

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
                                    Kéo thả file vào đây hoặc bấm Upload
                                </Typography>
                                <Button
                                    variant="outlined"
                                    onClick={onChooseFile}
                                    disabled={uploading}
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
                                    {uploading ? <CircularProgress size={20} color="inherit" /> : "Upload"}
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
                                    py: 1,
                                    minHeight: 44,
                                    display: "flex",
                                    alignItems: "center",
                                }}
                            >
                                <Typography sx={{ color: "#0f172a", fontWeight: 600 }}>
                                    {uploadedFileName || "file_name"}
                                </Typography>
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
                                    bgcolor: "#e0f2fe",
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
                                                bgcolor: alpha("#1d4ed8", 0.82),
                                                border: "1px solid",
                                                borderColor: alpha("#93c5fd", 0.75),
                                                boxShadow: "0 8px 20px rgba(37, 99, 235, 0.28)",
                                                borderRadius: 2.5,
                                                px: 1.5,
                                                py: 1,
                                            }}
                                        >
                                            <Typography sx={{ fontWeight: 700, color: "#f8fafc", wordBreak: "break-word" }}>
                                                {doc.fileName}
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                onClick={() => onDelete(doc)}
                                                disabled={deletingId === doc.id}
                                                sx={{
                                                    color: "#f8fafc",
                                                    bgcolor: alpha("#ffffff", 0.14),
                                                    "&:hover": { bgcolor: alpha("#ffffff", 0.24) },
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
