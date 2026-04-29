import React from "react";
import {
    Avatar,
    Box,
    Button,
    Dialog,
    DialogContent,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
    CircularProgress
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import {enqueueSnackbar} from "notistack";
import {
    APP_PRIMARY_DARK,
    APP_PRIMARY_MAIN,
    APP_PRIMARY_SOFT_BG,
    BRAND_NAVY
} from "../../constants/homeLandingTheme";
import {CATEGORY_POST_ADMIN, CATEGORY_POST_SCHOOL} from "../../constants/categoryPost";
import {buildCreatePostPayload, isRichTextEmpty} from "../../utils/buildCreatePostPayload";
import CreatePostRichTextEditor from "./CreatePostRichTextEditor.jsx";
import {syncLocalUserWithAccess, getProfile} from "../../services/AccountService.jsx";
import {createPost, uploadPostDocumentImport} from "../../services/PostService.jsx";
import {getApiErrorMessage} from "../../utils/getApiErrorMessage";
import {isCloudinaryConfigured, uploadFileToCloudinary} from "../../utils/cloudinaryUpload.js";
import {normalizeUserRole} from "../../utils/userRole.js";
import {usePlatformMediaImageRules} from "../../hooks/usePlatformMediaImageRules.js";
import {validateMediaImageFile} from "../../utils/platformMediaConfig.js";

function toDatetimeLocalValue(d = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isHttpUrl(s) {
    return /^https?:\/\//i.test(String(s || "").trim());
}

function documentItemKey(d) {
    return `${String(d?.storagePath ?? "").trim()}::${String(d?.fileName ?? "").trim()}`;
}

function formatUploadedFileNameForDisplay(raw) {
    const s = String(raw ?? "").trim();
    if (!s) return "(file)";
    const parts = s.split("_");
    if (parts.length >= 2) {
        const head = parts[0];
        const isUuidHyphen =
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(head);
        const isUuidCompact = /^[0-9a-fA-F]{32}$/i.test(head);
        if (isUuidHyphen || isUuidCompact) {
            return parts.slice(1).join("_");
        }
    }
    return s;
}

const LM = {
    bg: "#ffffff",
    bgElev: "#f4f8ff",
    border: "rgba(59, 130, 246, 0.22)",
    text: BRAND_NAVY,
    textMuted: "rgba(30, 41, 59, 0.65)",
    inputBg: "#ffffff",
    accent: APP_PRIMARY_MAIN
};

export default function HomeCreatePostBar({
    visible,
    embedded = false,
    belowHero = false,
    onPostCreated
}) {
    const [open, setOpen] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [cloudinaryUploadSlot, setCloudinaryUploadSlot] = React.useState(null);
    const uploadingAnyImage = cloudinaryUploadSlot != null;
    const [uploadingDocument, setUploadingDocument] = React.useState(false);
    const [documentItems, setDocumentItems] = React.useState([]);
    const fileInputRef = React.useRef(null);
    const thumbnailInputRef = React.useRef(null);
    const bannerInputRef = React.useRef(null);

    const [shortDescription, setShortDescription] = React.useState("");
    const [contentBody, setContentBody] = React.useState("");
    const [hashTagsRaw, setHashTagsRaw] = React.useState("");
    const [categoryPost, setCategoryPost] = React.useState("");
    const [imageUrlsText, setImageUrlsText] = React.useState("");
    const [thumbnail, setThumbnail] = React.useState("");
    const [typeFile, setTypeFile] = React.useState("image/jpeg");
    const [publishedAt, setPublishedAt] = React.useState(() => toDatetimeLocalValue());
    const [richTextKey, setRichTextKey] = React.useState(0);

    const [user, setUser] = React.useState(() => {
        try {
            const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });

    const role = normalizeUserRole(user?.role ?? "");
    const categoryOptions = role === "ADMIN" ? CATEGORY_POST_ADMIN : CATEGORY_POST_SCHOOL;
    const {loading: mediaImageRulesLoading, rules: mediaImageRules} = usePlatformMediaImageRules();

    React.useEffect(() => {
        if (!visible) return undefined;
        const onStorage = () => {
            try {
                const raw = localStorage.getItem("user");
                setUser(raw ? JSON.parse(raw) : null);
            } catch {
                setUser(null);
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, [visible]);

    React.useEffect(() => {
        if (!open || !categoryOptions.length) return;
        setCategoryPost((prev) => {
            if (prev && categoryOptions.some((o) => o.value === prev)) return prev;
            return categoryOptions[0].value;
        });
    }, [open, categoryOptions]);

    const resetForm = React.useCallback(() => {
        setShortDescription("");
        setContentBody("");
        setHashTagsRaw("");
        setImageUrlsText("");
        setDocumentItems([]);
        setThumbnail("");
        setTypeFile("image/jpeg");
        setPublishedAt(toDatetimeLocalValue());
        setRichTextKey((k) => k + 1);
        if (categoryOptions[0]) setCategoryPost(categoryOptions[0].value);
    }, [categoryOptions]);

    if (!visible) {
        return null;
    }

    const avatarSrc = user?.avatar || user?.picture || undefined;
    const displayName = user?.name || user?.email || "Người dùng";

    const openModal = async () => {
        await syncLocalUserWithAccess();
        try {
            const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
            setUser(raw ? JSON.parse(raw) : null);
        } catch {
            setUser(null);
        }
        setPublishedAt(toDatetimeLocalValue());
        setOpen(true);
    };

    const handleClose = () => {
        if (submitting || uploadingAnyImage || uploadingDocument) return;
        setOpen(false);
        resetForm();
    };

    const handleSubmit = async () => {
        const imageUrlList = imageUrlsText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);

        let publishedDate = publishedAt.trim();
        if (publishedDate.length === 16) publishedDate = `${publishedDate}:00`;

        const body = buildCreatePostPayload({
            shortDescription,
            contentBody,
            hashTagsRaw,
            categoryPost,
            imageUrlList,
            documentItems,
            thumbnail,
            typeFile,
            publishedDate
        });

        let profile = null;
        try {
            const profileRes = await getProfile();
            profile = profileRes?.data?.body;
        } catch (err) {
            console.warn("⚠️ Lỗi lấy profile:", err.message);
        }
    
        setSubmitting(true);
        console.log("⏳ Đang gửi request...");

        try {
            const response = await createPost(body);
            console.log("✅ Đăng bài thành công!", response);

            enqueueSnackbar("Đăng bài thành công.", {variant: "success"});
            setOpen(false);
            resetForm();
            if (typeof onPostCreated === "function") {
                onPostCreated();
            }
        } catch (e) {
            console.error("❌ Lỗi API:");
            if (e.response) {
                console.error("- Status:", e.response.status);
                console.error("- Data từ server:", e.response.data);
            } else {
                console.error("- Message:", e.message);
            }

            const status = e?.response?.status;
            if (status === 403) {
                enqueueSnackbar(
                    "Bạn không có quyền đăng bài...",
                    {variant: "error"}
                );
            } else {
                enqueueSnackbar(getApiErrorMessage(e, "Không thể đăng bài. Vui lòng thử lại."), {variant: "error"});
            }
        } finally {
            setSubmitting(false);
            console.log("🏁 Kết thúc xử lý Submit.");
        }
    };

    const appendUploadedUrl = React.useCallback((url, mimeHint) => {
        const u = String(url || "").trim();
        if (!u) return;
        setImageUrlsText((prev) => {
            const lines = prev.split("\n").map((l) => l.trim()).filter(Boolean);
            if (lines.includes(u)) return prev;
            return lines.length ? `${lines.join("\n")}\n${u}` : u;
        });
        setThumbnail((t) => (String(t || "").trim() ? t : u));
        if (mimeHint) setTypeFile(mimeHint);
    }, []);

    const appendBannerUrlOnly = React.useCallback((url, mimeHint) => {
        const u = String(url || "").trim();
        if (!u) return;
        setImageUrlsText((prev) => {
            const lines = prev.split("\n").map((l) => l.trim()).filter(Boolean);
            if (lines.includes(u)) return prev;
            return lines.length ? `${lines.join("\n")}\n${u}` : u;
        });
        if (mimeHint) setTypeFile(mimeHint);
    }, []);

    const removeIllustrationUrl = React.useCallback((urlToRemove) => {
        setImageUrlsText((prev) => {
            const lines = prev.split("\n").map((l) => l.trim()).filter(Boolean);
            return lines.filter((u) => u !== urlToRemove).join("\n");
        });
    }, []);

    const illustrationUrls = React.useMemo(
        () =>
            imageUrlsText
                .split("\n")
                .map((l) => l.trim())
                .filter((u) => isHttpUrl(u)),
        [imageUrlsText]
    );

    const removeDocumentItem = React.useCallback((key) => {
        setDocumentItems((prev) => prev.filter((d) => documentItemKey(d) !== key));
    }, []);

    const handleDocumentFileInput = async (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        if (!categoryPost?.trim()) {
            enqueueSnackbar("Vui lòng chọn loại bài viết trước khi tải tài liệu.", {variant: "warning"});
            return;
        }
        setUploadingDocument(true);
        try {
            const item = await uploadPostDocumentImport(categoryPost, f);
            const key = documentItemKey(item);
            setDocumentItems((prev) => {
                if (prev.some((d) => documentItemKey(d) === key)) return prev;
                return [...prev, item];
            });
            enqueueSnackbar("Đã tải tài liệu lên.", {variant: "success"});
        } catch (err) {
            enqueueSnackbar(getApiErrorMessage(err, "Tải tài liệu không thành công."), {variant: "error"});
        } finally {
            setUploadingDocument(false);
        }
    };

    const runCloudinaryUpload = async (file, mode) => {
        if (!isCloudinaryConfigured()) {
            enqueueSnackbar("Chưa cấu hình dịch vụ lưu ảnh. Vui lòng liên hệ quản trị viên.", {
                variant: "error"
            });
            return;
        }
        if (mediaImageRulesLoading) {
            enqueueSnackbar("Đang tải cấu hình giới hạn ảnh…", {variant: "warning"});
            return;
        }
        if (!mediaImageRules) {
            enqueueSnackbar("Chưa tải được cấu hình ảnh từ hệ thống. Vui lòng thử lại sau.", {variant: "error"});
            return;
        }
        const v = validateMediaImageFile(file, mediaImageRules);
        if (!v.ok) {
            enqueueSnackbar(v.message, {variant: "warning"});
            return;
        }
        setCloudinaryUploadSlot(mode === "thumbnail" ? "thumbnail" : "banner");
        try {
            const result = await uploadFileToCloudinary(file);
            const mime = file.type || "image/jpeg";
            const uploadedUrl = String(result.url || "").trim();
            if (mode === "thumbnail") {
                setThumbnail(uploadedUrl);
                setTypeFile(mime);
            } else if (mode === "banner") {
                appendBannerUrlOnly(uploadedUrl, mime);
            } else {
                appendUploadedUrl(uploadedUrl, mime);
            }
            enqueueSnackbar("Đã tải ảnh lên thành công.", {variant: "success"});
        } catch (err) {
            enqueueSnackbar("Tải ảnh lên không thành công. Vui lòng thử lại.", {variant: "error"});
        } finally {
            setCloudinaryUploadSlot(null);
        }
    };

    const handleCloudinaryInput = (e, mode) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        runCloudinaryUpload(f, mode);
    };

    const cardRadius = embedded ? {xs: "20px 20px 0 0", md: "24px 24px 0 0"} : {xs: "20px", sm: "24px", md: "28px"};

    const cardShadow = embedded
        ? "0 10px 32px rgba(37, 99, 235, 0.14), 0 4px 12px rgba(37, 99, 235, 0.1), inset 0 1px 0 rgba(255,255,255,0.95)"
        : belowHero
          ? "0 14px 40px rgba(37, 99, 235, 0.16), 0 6px 16px rgba(37, 99, 235, 0.1), 0 0 0 1px rgba(59, 130, 246, 0.12), inset 0 1px 0 rgba(255,255,255,0.95)"
          : "0 12px 36px rgba(37, 99, 235, 0.14), 0 4px 14px rgba(37, 99, 235, 0.09), inset 0 1px 0 rgba(255,255,255,0.95)";

    const iconBtnSx = {
        color: APP_PRIMARY_MAIN,
        bgcolor: "rgba(255,255,255,0.92)",
        border: `1px solid rgba(59, 130, 246, 0.28)`,
        borderRadius: "14px",
        boxShadow: "0 2px 8px rgba(37, 99, 235, 0.07)",
        "&:hover": {
            bgcolor: APP_PRIMARY_SOFT_BG,
            color: APP_PRIMARY_DARK,
            borderColor: APP_PRIMARY_MAIN,
            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.15)"
        }
    };

    const modalPaperSx = {
        borderRadius: {xs: "16px", sm: "20px"},
        maxWidth: {xs: "calc(100% - 24px)", sm: 640, md: 760, lg: 840},
        width: "100%",
        bgcolor: LM.bg,
        overflow: "hidden",
        boxShadow: `
            0 22px 56px rgba(37, 99, 235, 0.12),
            0 8px 24px rgba(15, 23, 42, 0.06),
            0 0 0 1px ${LM.border}
        `,
        m: {xs: 1.5, sm: 2}
    };

    const canSubmit =
        shortDescription.trim().length > 0 &&
        !isRichTextEmpty(contentBody) &&
        hashTagsRaw.trim().length > 0 &&
        imageUrlsText.trim().length > 0 &&
        isHttpUrl(thumbnail) &&
        categoryPost &&
        publishedAt;

    const textFieldLightSx = {
        "& .MuiInputLabel-root": {color: LM.textMuted},
        "& .MuiOutlinedInput-root": {
            bgcolor: LM.inputBg,
            color: LM.text,
            "& fieldset": {borderColor: LM.border},
            "&:hover fieldset": {borderColor: "rgba(59, 130, 246, 0.45)"},
            "&.Mui-focused fieldset": {borderColor: LM.accent}
        },
        "& .MuiFormHelperText-root": {color: LM.textMuted}
    };

    const selectMenuPaperSx = {
        bgcolor: "#ffffff",
        color: LM.text,
        border: `1px solid ${LM.border}`,
        boxShadow: "0 12px 40px rgba(37, 99, 235, 0.12)",
        "& .MuiMenuItem-root": {fontSize: "0.875rem"}
    };

    const dropzoneInteractive =
        !uploadingAnyImage &&
        !uploadingDocument &&
        !submitting &&
        !mediaImageRulesLoading &&
        Boolean(mediaImageRules);
    const UPLOAD_ZONE_MIN_PX = 152;
    const imageDropzoneSx = {
        border: `2px dashed ${LM.border}`,
        borderRadius: 2,
        px: 2,
        py: 2,
        minHeight: UPLOAD_ZONE_MIN_PX,
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        cursor: dropzoneInteractive ? "pointer" : "default",
        bgcolor: LM.inputBg,
        "&:hover": {
            borderColor: dropzoneInteractive ? LM.accent : LM.border
        }
    };

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                hidden
                onChange={(e) => {
                    void handleDocumentFileInput(e);
                }}
            />
            <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                    void handleCloudinaryInput(e, "thumbnail");
                }}
            />
            <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                    void handleCloudinaryInput(e, "banner");
                }}
            />

            <Box
                sx={{
                    width: "100%",
                    ...(belowHero
                        ? {
                              mt: 0,
                              mb: 0,
                              maxWidth: 720,
                              width: "100%",
                              mx: "auto"
                          }
                        : embedded
                          ? {
                                mt: 0,
                                mb: 0,
                                maxWidth: 720,
                                width: "100%",
                                mx: "auto"
                            }
                          : {
                                maxWidth: 1536,
                                mx: "auto",
                                px: {xs: 2, sm: 3, md: 4},
                                pt: {xs: 2, md: 2.5},
                                pb: 0
                            })
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: {xs: 1, sm: 1.5},
                        p: {xs: 1.35, sm: 1.65},
                        borderRadius: cardRadius,
                        bgcolor: "#ffffff",
                        background: "linear-gradient(165deg, #ffffff 0%, #f5f9ff 42%, #e8f2ff 100%)",
                        border: "1px solid rgba(59, 130, 246, 0.32)",
                        boxShadow: cardShadow,
                        borderBottom: embedded ? `1px solid rgba(59, 130, 246, 0.2)` : "none"
                    }}
                >
                    <Avatar
                        alt=""
                        src={avatarSrc}
                        sx={{
                            width: 42,
                            height: 42,
                            flexShrink: 0,
                            border: `2px solid rgba(59, 130, 246, 0.35)`,
                            boxShadow: "0 2px 10px rgba(37, 99, 235, 0.12)"
                        }}
                    />
                    <Button
                        type="button"
                        fullWidth
                        onClick={openModal}
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            justifyContent: "flex-start",
                            borderRadius: 999,
                            py: 1.15,
                            px: 2.25,
                            textTransform: "none",
                            bgcolor: "rgba(59, 130, 246, 0.14)",
                            color: BRAND_NAVY,
                            fontWeight: 600,
                            fontSize: {xs: "0.875rem", sm: "0.95rem"},
                            border: `1px solid rgba(59, 130, 246, 0.22)`,
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
                            "&:hover": {
                                bgcolor: "rgba(59, 130, 246, 0.2)",
                                borderColor: "rgba(59, 130, 246, 0.35)"
                            }
                        }}
                    >
                        Đăng bài
                    </Button>
                    <IconButton
                        size="medium"
                        aria-label="Tải tệp từ máy"
                        onClick={openModal}
                        sx={{...iconBtnSx, flexShrink: 0}}
                    >
                        <UploadFileOutlinedIcon />
                    </IconButton>
                </Box>
            </Box>

            <Dialog
                open={open}
                onClose={handleClose}
                fullWidth
                maxWidth={false}
                scroll="paper"
                slotProps={{
                    paper: {
                        elevation: 0,
                        sx: modalPaperSx
                    },
                    backdrop: {
                        sx: {bgcolor: "rgba(15, 23, 42, 0.35)", backdropFilter: "blur(3px)"}
                    }
                }}
            >
                <Box
                    sx={{
                        position: "relative",
                        px: {xs: 2, sm: 2.5},
                        py: 2,
                        borderBottom: `1px solid ${LM.border}`,
                        bgcolor: LM.bgElev
                    }}
                >
                    <IconButton
                        aria-label="Đóng"
                        onClick={handleClose}
                        size="small"
                        disabled={submitting || uploadingAnyImage || uploadingDocument}
                        sx={{
                            position: "absolute",
                            right: 8,
                            top: 8,
                            color: LM.textMuted,
                            "&:hover": {bgcolor: "rgba(59, 130, 246, 0.08)", color: LM.text}
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>

                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{pr: {sm: 5}}}>
                        <Avatar src={avatarSrc} alt="" sx={{width: 44, height: 44}} />
                        <Typography sx={{fontWeight: 800, color: LM.text, fontSize: "1rem"}}>{displayName}</Typography>
                    </Stack>
                </Box>

                <DialogContent
                    sx={{
                        px: {xs: 2, sm: 2.5},
                        py: 2.5,
                        maxHeight: {xs: "70vh", sm: "75vh"},
                        overflowY: "auto",
                        bgcolor: LM.bg,
                        color: LM.text
                    }}
                >
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {xs: "1fr", md: "minmax(0, 7fr) minmax(0, 3fr)"},
                            gridTemplateRows: {xs: "auto auto 1fr auto", md: "auto minmax(0, 1fr)"},
                            gap: 3,
                            alignItems: "stretch",
                            minHeight: {xs: "min(64vh, 640px)", md: "min(72vh, 780px)"},
                            width: "100%"
                        }}
                    >
                        <TextField
                            label="Tiêu đề"
                            required
                            fullWidth
                            value={shortDescription}
                            onChange={(e) => setShortDescription(e.target.value)}
                            placeholder="Nhập tiêu đề hoặc mô tả ngắn..."
                            size="small"
                            disabled={submitting || uploadingAnyImage || uploadingDocument}
                            sx={{
                                gridColumn: 1,
                                gridRow: {xs: 1, md: 1},
                                ...textFieldLightSx,
                                "& .MuiOutlinedInput-root": {
                                    ...textFieldLightSx["& .MuiOutlinedInput-root"],
                                    bgcolor: "rgba(59, 130, 246, 0.12)",
                                    "& fieldset": {borderColor: `${APP_PRIMARY_MAIN} !important`},
                                    "&:hover fieldset": {borderColor: `${APP_PRIMARY_MAIN} !important`}
                                }
                            }}
                        />

                        <FormControl
                            size="small"
                            fullWidth
                            sx={{
                                gridColumn: {xs: 1, md: 2},
                                gridRow: {xs: 2, md: 1},
                                minWidth: 0,
                                ...textFieldLightSx
                            }}
                            disabled={submitting || uploadingAnyImage || uploadingDocument}
                        >
                            <InputLabel id="post-type-label" sx={{color: LM.textMuted}}>
                                Loại bài viết
                            </InputLabel>
                            <Select
                                labelId="post-type-label"
                                label="Loại bài viết"
                                value={categoryPost}
                                onChange={(e) => setCategoryPost(e.target.value)}
                                renderValue={(val) => {
                                    const o = categoryOptions.find((x) => x.value === val);
                                    return o?.label ?? "";
                                }}
                                sx={{color: LM.text, "& .MuiOutlinedInput-notchedOutline": {borderColor: LM.border}}}
                                MenuProps={{
                                    PaperProps: {sx: selectMenuPaperSx}
                                }}
                            >
                                {categoryOptions.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Box
                            sx={{
                                gridColumn: 1,
                                gridRow: {xs: 3, md: 2},
                                minWidth: 0,
                                minHeight: 0,
                                display: "flex",
                                flexDirection: "column",
                                gap: 2.5
                            }}
                        >
                            <Box
                                sx={{
                                    flex: 1,
                                    minHeight: 0,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 0.75
                                }}
                            >
                                <Typography
                                    component="label"
                                    variant="body2"
                                    sx={{
                                        display: "block",
                                        flexShrink: 0,
                                        fontWeight: 700,
                                        color: LM.textMuted,
                                        "& .req": {color: "#d32f2f", ml: 0.25}
                                    }}
                                >
                                    Nội dung thông báo<span className="req">*</span>
                                </Typography>
                                <CreatePostRichTextEditor
                                    key={richTextKey}
                                    initialHtml={contentBody}
                                    onChange={setContentBody}
                                    disabled={submitting || uploadingAnyImage || uploadingDocument}
                                    minEditorHeight={260}
                                    maxEditorHeight={480}
                                    fillHeight
                                />
                            </Box>

                            <Box sx={{flexShrink: 0}}>
                                <Button
                                    type="button"
                                    variant="outlined"
                                    size="small"
                                    startIcon={
                                        uploadingDocument ? (
                                            <CircularProgress size={14} sx={{color: LM.accent}} />
                                        ) : (
                                            <UploadFileOutlinedIcon sx={{fontSize: 18}} />
                                        )
                                    }
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={submitting || uploadingAnyImage || uploadingDocument}
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 600,
                                        borderColor: LM.border,
                                        color: LM.textMuted,
                                        mb: documentItems.length > 0 ? 0.75 : 0
                                    }}
                                >
                                    Đính kèm tài liệu (PDF, Word…)
                                </Button>
                                {documentItems.length > 0 ? (
                                    <Stack spacing={0.75} sx={{mt: 0.25}}>
                                        {documentItems.map((doc) => {
                                            const k = documentItemKey(doc);
                                            const tip = [doc.fileName, doc.storagePath, doc.category, doc.fileUrl]
                                                .filter(Boolean)
                                                .join("\n");
                                            return (
                                                <Stack
                                                    key={k}
                                                    direction="row"
                                                    alignItems="center"
                                                    spacing={0.75}
                                                    title={tip}
                                                    sx={{
                                                        py: 0.5,
                                                        px: 1,
                                                        borderRadius: 1,
                                                        border: `1px solid ${LM.border}`,
                                                        bgcolor: LM.inputBg,
                                                        minHeight: 36,
                                                        maxWidth: "100%"
                                                    }}
                                                >
                                                    <InsertDriveFileOutlinedIcon
                                                        sx={{
                                                            fontSize: 22,
                                                            color: APP_PRIMARY_MAIN,
                                                            flexShrink: 0,
                                                            opacity: 0.92
                                                        }}
                                                    />
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            flex: 1,
                                                            minWidth: 0,
                                                            maxWidth: "100%",
                                                            fontWeight: 600,
                                                            color: LM.text,
                                                            lineHeight: 1.35,
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            display: "block"
                                                        }}
                                                    >
                                                        {formatUploadedFileNameForDisplay(doc.fileName)}
                                                    </Typography>
                                                    <IconButton
                                                        type="button"
                                                        size="small"
                                                        aria-label="Xóa tài liệu"
                                                        onClick={() => removeDocumentItem(k)}
                                                        disabled={submitting || uploadingAnyImage || uploadingDocument}
                                                        sx={{flexShrink: 0, p: 0.35}}
                                                    >
                                                        <CloseIcon sx={{fontSize: 16}} />
                                                    </IconButton>
                                                </Stack>
                                            );
                                        })}
                                    </Stack>
                                ) : null}
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                gridColumn: {xs: 1, md: 2},
                                gridRow: {xs: 4, md: 2},
                                minWidth: 0,
                                minHeight: 0,
                                display: "flex",
                                flexDirection: "column",
                                gap: 2.5
                            }}
                        >
                            <TextField
                                label="Nhãn từ khóa"
                                required
                                fullWidth
                                size="small"
                                value={hashTagsRaw}
                                onChange={(e) => setHashTagsRaw(e.target.value)}
                                placeholder="ví dụ: thongbao, sukien"
                                disabled={submitting || uploadingAnyImage || uploadingDocument}
                                sx={{...textFieldLightSx, alignSelf: "stretch"}}
                            />

                            <Box>
                                <Typography variant="caption" sx={{color: LM.textMuted, fontWeight: 700, display: "block", mb: 0.75}}>
                                    Ảnh đại diện bài viết
                                </Typography>
                                {isHttpUrl(thumbnail) ? (
                                    <Box
                                        sx={{
                                            position: "relative",
                                            borderRadius: 2,
                                            overflow: "hidden",
                                            border: `1px solid ${LM.border}`,
                                            bgcolor: LM.inputBg,
                                            width: "100%",
                                            height: UPLOAD_ZONE_MIN_PX
                                        }}
                                    >
                                        <Box
                                            component="img"
                                            src={String(thumbnail).trim()}
                                            alt=""
                                            referrerPolicy="no-referrer"
                                            sx={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                                display: "block"
                                            }}
                                        />
                                        <IconButton
                                            size="small"
                                            onClick={() => setThumbnail("")}
                                            sx={{
                                                position: "absolute",
                                                top: 4,
                                                right: 4,
                                                bgcolor: "rgba(0,0,0,0.5)",
                                                color: "#fff",
                                                "&:hover": {bgcolor: "rgba(0,0,0,0.65)"}
                                            }}
                                        >
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                ) : (
                                    <Box
                                        onClick={() => {
                                            if (!dropzoneInteractive) return;
                                            thumbnailInputRef.current?.click();
                                        }}
                                        sx={imageDropzoneSx}
                                    >
                                        {cloudinaryUploadSlot === "thumbnail" ? (
                                            <CircularProgress size={28} sx={{color: LM.accent}} />
                                        ) : (
                                            <>
                                                <CloudUploadOutlinedIcon sx={{fontSize: 32, color: LM.textMuted, mb: 0.5}} />
                                                <Typography variant="caption" sx={{color: LM.textMuted, display: "block", lineHeight: 1.35}}>
                                                    Chạm để chọn ảnh đại diện (một ảnh)
                                                </Typography>
                                            </>
                                        )}
                                    </Box>
                                )}
                            </Box>

                            <Box>
                                <Typography variant="caption" sx={{color: LM.textMuted, fontWeight: 700, display: "block", mb: 0.75}}>
                                    Ảnh minh họa trong bài
                                </Typography>
                                <Box
                                    onClick={() => {
                                        if (!dropzoneInteractive) return;
                                        bannerInputRef.current?.click();
                                    }}
                                    sx={imageDropzoneSx}
                                >
                                    {cloudinaryUploadSlot === "banner" ? (
                                        <CircularProgress size={28} sx={{color: LM.accent}} />
                                    ) : (
                                        <>
                                            <CloudUploadOutlinedIcon sx={{fontSize: 32, color: LM.textMuted, mb: 0.5}} />
                                            <Typography variant="caption" sx={{color: LM.textMuted, display: "block", lineHeight: 1.35}}>
                                                Chạm để chọn ảnh (có thể chọn nhiều ảnh)
                                            </Typography>
                                        </>
                                    )}
                                </Box>
                                {illustrationUrls.length > 0 ? (
                                    <Box
                                        sx={{
                                            mt: 1.5,
                                            p: 1.25,
                                            borderRadius: 2,
                                            border: `1px solid ${LM.border}`,
                                            bgcolor: "rgba(59, 130, 246, 0.05)"
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{fontWeight: 700, color: LM.textMuted, display: "block", mb: 1}}
                                        >
                                            Ảnh đã chọn ({illustrationUrls.length})
                                        </Typography>
                                        <Box
                                            sx={{
                                                display: "grid",
                                                gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))",
                                                gap: 1
                                            }}
                                        >
                                            {illustrationUrls.map((url) => (
                                                <Box
                                                    key={url}
                                                    sx={{
                                                        position: "relative",
                                                        aspectRatio: "1",
                                                        width: "100%",
                                                        minHeight: 0,
                                                        borderRadius: "8px",
                                                        overflow: "hidden",
                                                        border: `1px solid ${LM.border}`,
                                                        bgcolor: "#f1f5f9"
                                                    }}
                                                >
                                                    <Box
                                                        component="img"
                                                        src={url}
                                                        alt=""
                                                        referrerPolicy="no-referrer"
                                                        sx={{
                                                            width: "100%",
                                                            height: "100%",
                                                            objectFit: "cover",
                                                            display: "block"
                                                        }}
                                                    />
                                                    <IconButton
                                                        type="button"
                                                        size="small"
                                                        aria-label="Xóa ảnh minh họa"
                                                        onClick={(ev) => {
                                                            ev.stopPropagation();
                                                            removeIllustrationUrl(url);
                                                        }}
                                                        disabled={submitting || uploadingAnyImage || uploadingDocument}
                                                        sx={{
                                                            position: "absolute",
                                                            top: 2,
                                                            right: 2,
                                                            p: 0.25,
                                                            minWidth: 22,
                                                            minHeight: 22,
                                                            bgcolor: "rgba(0,0,0,0.55)",
                                                            color: "#fff",
                                                            "&:hover": {bgcolor: "rgba(0,0,0,0.72)"}
                                                        }}
                                                    >
                                                        <CloseIcon sx={{fontSize: 14}} />
                                                    </IconButton>
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>
                                ) : null}
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>

                <Box sx={{px: {xs: 2, sm: 2.5}, pb: 2.25, pt: 0, bgcolor: LM.bg}}>
                    <Button
                        fullWidth
                        variant="contained"
                        disabled={!canSubmit || submitting || uploadingAnyImage || uploadingDocument}
                        onClick={handleSubmit}
                        sx={{
                            py: 1.35,
                            textTransform: "none",
                            fontWeight: 800,
                            fontSize: "1rem",
                            letterSpacing: "0.06em",
                            borderRadius: "12px",
                            bgcolor: canSubmit && !submitting ? APP_PRIMARY_MAIN : "rgba(148, 163, 184, 0.35)",
                            color: "#fff",
                            boxShadow: canSubmit && !submitting ? "0 8px 24px rgba(37, 99, 235, 0.35)" : "none",
                            "&:hover": {
                                bgcolor: canSubmit && !submitting ? APP_PRIMARY_DARK : undefined
                            },
                            "&.Mui-disabled": {
                                color: "rgba(255,255,255,0.85)"
                            }
                        }}
                    >
                        {submitting ? <CircularProgress size={24} color="inherit" /> : "ĐĂNG BÀI"}
                    </Button>
                </Box>
            </Dialog>
        </>
    );
}
