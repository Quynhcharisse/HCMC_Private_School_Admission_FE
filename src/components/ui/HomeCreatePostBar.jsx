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
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import CloseIcon from "@mui/icons-material/Close";
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
import {syncLocalUserWithAccess} from "../../services/AccountService.jsx";
import {createPost} from "../../services/PostService.jsx";
import {getApiErrorMessage} from "../../utils/getApiErrorMessage";
import {isCloudinaryConfigured, uploadFileToCloudinary} from "../../utils/cloudinaryUpload.js";
import {normalizeUserRole} from "../../utils/userRole.js";

function toDatetimeLocalValue(d = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isHttpUrl(s) {
    return /^https?:\/\//i.test(String(s || "").trim());
}

function validateClientPayload(body) {
    if (!body.hashTagList?.length) return "Vui lòng nhập ít nhất một nhãn từ khóa (cách nhau bằng dấu phẩy hoặc khoảng trắng).";
    if (body.totalPosition <= 0) return "Nội dung chưa hợp lệ, vui lòng kiểm tra lại.";
    if (!body.content?.shortDescription) return "Vui lòng nhập mô tả ngắn.";
    if (!body.content?.contentDataList?.length) return "Vui lòng nhập nội dung chi tiết (có ít nhất một đoạn).";
    if (!body.image?.imageItemList?.length) return "Cần ít nhất một ảnh trong bài — hãy tải ảnh bìa hoặc dùng nút thêm ảnh.";
    if (!body.thumbnail?.trim()) return "Vui lòng chọn ảnh đại diện cho bài viết.";
    if (!isHttpUrl(body.thumbnail)) return "Ảnh đại diện phải là đường dẫn liên kết hợp lệ.";
    if (!body.categoryPost?.trim()) return "Vui lòng chọn danh mục bài.";
    if (!body.publishedDate?.trim()) return "Vui lòng chọn ngày giờ đăng.";
    for (let i = 0; i < body.image.imageItemList.length; i++) {
        const u = body.image.imageItemList[i].url;
        if (!isHttpUrl(u)) return `Đường dẫn ảnh thứ ${i + 1} chưa hợp lệ.`;
    }
    return null;
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

export default function HomeCreatePostBar({visible, embedded = false, belowHero = false}) {
    const [open, setOpen] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [uploadingCloudinary, setUploadingCloudinary] = React.useState(false);
    const imageInputRef = React.useRef(null);
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
        if (submitting) return;
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
            thumbnail,
            typeFile,
            publishedDate
        });

        const err = validateClientPayload(body);
        if (err) {
            enqueueSnackbar(err, {variant: "warning"});
            return;
        }

        setSubmitting(true);
        try {
            await createPost(body);
            enqueueSnackbar("Đăng bài thành công.", {variant: "success"});
            setOpen(false);
            resetForm();
        } catch (e) {
            const status = e?.response?.status;
            if (status === 403) {
                enqueueSnackbar(
                    "Bạn không có quyền đăng bài với tài khoản này. Hãy đăng nhập lại hoặc dùng tài khoản quản trị / trường.",
                    {variant: "error"}
                );
            } else {
                enqueueSnackbar(getApiErrorMessage(e, "Không thể đăng bài. Vui lòng thử lại."), {variant: "error"});
            }
        } finally {
            setSubmitting(false);
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

    const runCloudinaryUpload = async (file, mode) => {
        if (!isCloudinaryConfigured()) {
            enqueueSnackbar("Chưa cấu hình dịch vụ lưu ảnh. Vui lòng liên hệ quản trị viên.", {
                variant: "error"
            });
            return;
        }
        setUploadingCloudinary(true);
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
            setUploadingCloudinary(false);
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

    return (
        <>
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                    void handleCloudinaryInput(e, "append");
                }}
            />
            <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={(e) => {
                    void handleCloudinaryInput(e, "append");
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
                    <Stack direction="row" spacing={1} sx={{flexShrink: 0}}>
                        <IconButton
                            size="medium"
                            aria-label="Tải hình ảnh lên"
                            onClick={openModal}
                            sx={iconBtnSx}
                        >
                            <AddPhotoAlternateOutlinedIcon />
                        </IconButton>
                        <IconButton
                            size="medium"
                            aria-label="Tải tệp từ máy"
                            onClick={openModal}
                            sx={iconBtnSx}
                        >
                            <UploadFileOutlinedIcon />
                        </IconButton>
                    </Stack>
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
                        disabled={submitting}
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

                    <Stack
                        direction={{xs: "column", sm: "row"}}
                        alignItems={{xs: "flex-start", sm: "center"}}
                        justifyContent="space-between"
                        spacing={2}
                        sx={{pr: {sm: 5}}}
                    >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar src={avatarSrc} alt="" sx={{width: 44, height: 44}} />
                            <Typography sx={{fontWeight: 800, color: LM.text, fontSize: "1rem"}}>{displayName}</Typography>
                        </Stack>

                        <FormControl
                            size="small"
                            sx={{minWidth: {xs: "100%", sm: 280}, ...textFieldLightSx}}
                            disabled={submitting}
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
                    <Stack direction={{xs: "column", md: "row"}} spacing={2.5} alignItems="stretch">
                        {/* Cột trái — nội dung chính */}
                        <Box sx={{flex: {md: "1 1 58%"}, minWidth: 0, display: "flex", flexDirection: "column", gap: 2}}>
                            <TextField
                                label="Tiêu đề"
                                required
                                fullWidth
                                value={shortDescription}
                                onChange={(e) => setShortDescription(e.target.value)}
                                placeholder="Nhập tiêu đề hoặc mô tả ngắn..."
                                size="small"
                                disabled={submitting}
                                sx={{
                                    ...textFieldLightSx,
                                    "& .MuiOutlinedInput-root": {
                                        ...textFieldLightSx["& .MuiOutlinedInput-root"],
                                        bgcolor: "rgba(59, 130, 246, 0.12)",
                                        "& fieldset": {borderColor: `${APP_PRIMARY_MAIN} !important`},
                                        "&:hover fieldset": {borderColor: `${APP_PRIMARY_MAIN} !important`}
                                    }
                                }}
                            />

                            <Box>
                                <Typography
                                    component="label"
                                    variant="body2"
                                    sx={{
                                        display: "block",
                                        mb: 0.75,
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
                                    disabled={submitting}
                                />
                            </Box>

                            <TextField
                                label="Nhãn từ khóa"
                                required
                                fullWidth
                                size="small"
                                value={hashTagsRaw}
                                onChange={(e) => setHashTagsRaw(e.target.value)}
                                placeholder="ví dụ: thongbao, sukien, capnhat"
                                disabled={submitting}
                                sx={{...textFieldLightSx, alignSelf: "stretch"}}
                            />

                            <Stack
                                direction={{xs: "column", sm: "row"}}
                                alignItems={{xs: "stretch", sm: "center"}}
                                justifyContent="space-between"
                                spacing={1.5}
                                sx={{
                                    p: 1.5,
                                    borderRadius: "12px",
                                    bgcolor: LM.bgElev,
                                    border: `1px solid ${LM.border}`
                                }}
                            >
                                <Typography sx={{fontSize: "0.8125rem", fontWeight: 700, color: LM.textMuted}}>
                                    Thêm vào bài viết của bạn
                                </Typography>
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    <IconButton
                                        aria-label="Tải thêm ảnh"
                                        onClick={() => imageInputRef.current?.click()}
                                        disabled={submitting || uploadingCloudinary}
                                        sx={{
                                            color: LM.accent,
                                            border: `1px solid ${LM.border}`,
                                            "&:hover": {bgcolor: "rgba(59,130,246,0.15)"}
                                        }}
                                    >
                                        {uploadingCloudinary ? (
                                            <CircularProgress size={22} sx={{color: LM.accent}} />
                                        ) : (
                                            <AddPhotoAlternateOutlinedIcon />
                                        )}
                                    </IconButton>
                                    <IconButton
                                        aria-label="Tải tệp đính kèm"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={submitting || uploadingCloudinary}
                                        sx={{
                                            color: LM.accent,
                                            border: `1px solid ${LM.border}`,
                                            "&:hover": {bgcolor: "rgba(59,130,246,0.15)"}
                                        }}
                                    >
                                        {uploadingCloudinary ? (
                                            <CircularProgress size={22} sx={{color: LM.accent}} />
                                        ) : (
                                            <UploadFileOutlinedIcon />
                                        )}
                                    </IconButton>
                                </Stack>
                            </Stack>
                        </Box>

                        {/* Cột phải — metadata & ảnh */}
                        <Box
                            sx={{
                                flex: {md: "1 1 38%"},
                                minWidth: {md: 240},
                                maxWidth: {md: 320},
                                display: "flex",
                                flexDirection: "column",
                                gap: 2
                            }}
                        >
                            <Box>
                                <Typography variant="caption" sx={{color: LM.textMuted, fontWeight: 700, display: "block", mb: 0.75}}>
                                    Ảnh đại diện bài viết
                                </Typography>
                                <Box
                                    sx={{
                                        position: "relative",
                                        borderRadius: 2,
                                        overflow: "hidden",
                                        border: `1px solid ${LM.border}`,
                                        bgcolor: LM.inputBg,
                                        minHeight: 120,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                >
                                    {isHttpUrl(thumbnail) ? (
                                        <>
                                            <Box
                                                component="img"
                                                src={String(thumbnail).trim()}
                                                alt=""
                                                referrerPolicy="no-referrer"
                                                sx={{width: "100%", maxHeight: 160, objectFit: "cover", display: "block"}}
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
                                        </>
                                    ) : (
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => thumbnailInputRef.current?.click()}
                                            disabled={uploadingCloudinary || submitting}
                                            startIcon={<CloudUploadOutlinedIcon />}
                                            sx={{color: LM.textMuted, borderColor: LM.border}}
                                        >
                                            Tải ảnh đại diện
                                        </Button>
                                    )}
                                </Box>
                            </Box>

                            <Box>
                                <Typography variant="caption" sx={{color: LM.textMuted, fontWeight: 700, display: "block", mb: 0.75}}>
                                    Ảnh minh họa trong bài
                                </Typography>
                                <Box
                                    onClick={() => !uploadingCloudinary && !submitting && bannerInputRef.current?.click()}
                                    sx={{
                                        border: `2px dashed ${LM.border}`,
                                        borderRadius: 2,
                                        py: 2.5,
                                        px: 2,
                                        textAlign: "center",
                                        cursor: uploadingCloudinary || submitting ? "default" : "pointer",
                                        bgcolor: LM.inputBg,
                                        "&:hover": {borderColor: uploadingCloudinary ? LM.border : LM.accent}
                                    }}
                                >
                                    {uploadingCloudinary ? (
                                        <CircularProgress size={28} sx={{color: LM.accent}} />
                                    ) : (
                                        <>
                                            <CloudUploadOutlinedIcon sx={{fontSize: 36, color: LM.textMuted, mb: 0.5}} />
                                            <Typography variant="caption" sx={{color: LM.textMuted, display: "block"}}>
                                                Chạm để chọn ảnh (có thể chọn nhiều ảnh)
                                            </Typography>
                                        </>
                                    )}
                                </Box>
                                {illustrationUrls.length > 0 ? (
                                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{mt: 1.5}} useFlexGap>
                                        {illustrationUrls.map((url) => (
                                            <Box
                                                key={url}
                                                sx={{
                                                    position: "relative",
                                                    width: 56,
                                                    height: 56,
                                                    flexShrink: 0,
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
                                                    disabled={submitting || uploadingCloudinary}
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
                                    </Stack>
                                ) : null}
                            </Box>

                            <TextField
                                label="Ngày giờ đăng"
                                type="datetime-local"
                                required
                                fullWidth
                                size="small"
                                value={publishedAt}
                                onChange={(e) => setPublishedAt(e.target.value)}
                                InputLabelProps={{shrink: true}}
                                disabled={submitting}
                                inputProps={{"aria-label": "Ngày giờ đăng", lang: "vi-VN"}}
                                sx={textFieldLightSx}
                            />
                        </Box>
                    </Stack>
                </DialogContent>

                <Box sx={{px: {xs: 2, sm: 2.5}, pb: 2.25, pt: 0, bgcolor: LM.bg}}>
                    <Button
                        fullWidth
                        variant="contained"
                        disabled={!canSubmit || submitting || uploadingCloudinary}
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
