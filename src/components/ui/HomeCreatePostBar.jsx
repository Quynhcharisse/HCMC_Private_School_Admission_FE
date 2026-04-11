import React from "react";
import {
    Avatar,
    Box,
    Button,
    Dialog,
    DialogContent,
    FormControl,
    FormHelperText,
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
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import {enqueueSnackbar} from "notistack";
import {
    APP_PRIMARY_DARK,
    APP_PRIMARY_MAIN,
    APP_PRIMARY_SOFT_BG,
    APP_PRIMARY_SOFT_BORDER,
    BRAND_NAVY
} from "../../constants/homeLandingTheme";
import {CATEGORY_POST_ADMIN, CATEGORY_POST_SCHOOL} from "../../constants/categoryPost";
import {buildCreatePostPayload} from "../../utils/buildCreatePostPayload";
import {createPost} from "../../services/PostService.jsx";

function toDatetimeLocalValue(d = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function validateClientPayload(body) {
    if (!body.hashTagList?.length) return "Cần ít nhất một hashtag.";
    if (body.totalPosition <= 0) return "totalPosition phải > 0 (kiểm tra nội dung).";
    if (!body.content?.shortDescription) return "Mô tả ngắn (shortDescription) bắt buộc.";
    if (!body.content?.contentDataList?.length) return "Cần ít nhất một đoạn trong nội dung chi tiết (contentDataList).";
    if (!body.image?.imageItemList?.length) return "Cần ít nhất một URL ảnh trong bài (imageItemList).";
    if (!body.thumbnail?.trim()) return "Thumbnail URL bắt buộc.";
    if (!body.thumbnail.startsWith("http")) return "Thumbnail phải là URL (bắt đầu bằng http/https).";
    if (!body.typeFile?.trim()) return "Loại file (typeFile) bắt buộc.";
    if (!body.categoryPost?.trim()) return "Chọn danh mục bài (categoryPost).";
    if (!body.publishedDate?.trim()) return "Ngày giờ đăng (publishedDate) bắt buộc.";
    for (let i = 0; i < body.image.imageItemList.length; i++) {
        const u = body.image.imageItemList[i].url;
        if (!u?.startsWith("http")) return `URL ảnh thứ ${i + 1} phải bắt đầu bằng http/https.`;
    }
    return null;
}

export default function HomeCreatePostBar({visible, embedded = false, belowHero = false}) {
    const [open, setOpen] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const imageInputRef = React.useRef(null);
    const fileInputRef = React.useRef(null);

    const [shortDescription, setShortDescription] = React.useState("");
    const [contentBody, setContentBody] = React.useState("");
    const [hashTagsRaw, setHashTagsRaw] = React.useState("");
    const [categoryPost, setCategoryPost] = React.useState("");
    const [imageUrlsText, setImageUrlsText] = React.useState("");
    const [thumbnail, setThumbnail] = React.useState("");
    const [typeFile, setTypeFile] = React.useState("image/jpeg");
    const [publishedAt, setPublishedAt] = React.useState(() => toDatetimeLocalValue());

    const [user, setUser] = React.useState(() => {
        try {
            const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });

    const role = String(user?.role ?? "").toUpperCase();
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
        if (categoryOptions[0]) setCategoryPost(categoryOptions[0].value);
    }, [categoryOptions]);

    if (!visible) {
        return null;
    }

    const avatarSrc = user?.avatar || user?.picture || undefined;
    const displayName = user?.name || user?.email || "Người dùng";

    const openModal = () => {
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
            const res = await createPost(body);
            const msg = res?.data?.message ?? res?.data?.body;
            enqueueSnackbar(typeof msg === "string" ? msg : "Đăng bài thành công.", {variant: "success"});
            setOpen(false);
            resetForm();
        } catch (e) {
            const raw =
                e?.response?.data?.message ??
                e?.response?.data?.body ??
                e?.message ??
                "Không thể đăng bài.";
            enqueueSnackbar(typeof raw === "string" ? raw : "Không thể đăng bài.", {variant: "error"});
        } finally {
            setSubmitting(false);
        }
    };

    const stubAfterPick = (label) => {
        enqueueSnackbar(`${label} — vui lòng dán URL ảnh vào ô tương ứng sau khi có link từ storage.`, {variant: "info"});
    };

    const handleImageChange = (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (f) stubAfterPick("Ảnh đã chọn");
    };

    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (f) stubAfterPick("File đã chọn");
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
        bgcolor: "#ffffff",
        overflow: "hidden",
        boxShadow: `
            0 28px 72px rgba(37, 99, 235, 0.18),
            0 12px 28px rgba(15, 23, 42, 0.08),
            0 0 0 1px rgba(59, 130, 246, 0.15)
        `,
        m: {xs: 1.5, sm: 2}
    };

    const fieldHint = (key) => (
        <FormHelperText sx={{mt: 0.5, fontSize: "0.7rem", color: "#94a3b8"}}>
            → BE: <Box component="span" sx={{fontFamily: "monospace", color: "#64748b"}}>{key}</Box>
        </FormHelperText>
    );

    const canSubmit =
        shortDescription.trim().length > 0 &&
        contentBody.trim().length > 0 &&
        hashTagsRaw.trim().length > 0 &&
        imageUrlsText.trim().length > 0 &&
        thumbnail.trim().length > 0 &&
        categoryPost &&
        publishedAt;

    return (
        <>
            <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleImageChange} />
            <input ref={fileInputRef} type="file" hidden onChange={handleFileChange} />

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
                            aria-label="Tải file lên"
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
                        sx: {bgcolor: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(4px)"}
                    }
                }}
            >
                <Box
                    sx={{
                        position: "relative",
                        px: {xs: 2, sm: 2.75},
                        pt: 2.25,
                        pb: 1.75,
                        borderBottom: `1px solid ${APP_PRIMARY_SOFT_BORDER}`
                    }}
                >
                    <Typography
                        component="h2"
                        sx={{
                            textAlign: "center",
                            fontWeight: 800,
                            fontSize: "1.15rem",
                            color: BRAND_NAVY,
                            letterSpacing: "-0.02em"
                        }}
                    >
                        Tạo bài viết
                    </Typography>
                    <IconButton
                        aria-label="Đóng"
                        onClick={handleClose}
                        size="small"
                        disabled={submitting}
                        sx={{
                            position: "absolute",
                            right: 12,
                            top: 12,
                            color: "#64748b",
                            bgcolor: APP_PRIMARY_SOFT_BG,
                            "&:hover": {bgcolor: "rgba(59, 130, 246, 0.2)", color: BRAND_NAVY}
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                <DialogContent
                    sx={{
                        px: {xs: 2, sm: 2.75},
                        pt: 2.5,
                        pb: 2,
                        maxHeight: {xs: "70vh", sm: "75vh"},
                        overflowY: "auto"
                    }}
                >
                    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{mb: 2}}>
                        <Avatar
                            src={avatarSrc}
                            alt=""
                            sx={{
                                width: 44,
                                height: 44,
                                border: `2px solid ${APP_PRIMARY_SOFT_BORDER}`,
                                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.1)"
                            }}
                        />
                        <Box sx={{minWidth: 0, flex: 1}}>
                            <Typography sx={{fontWeight: 800, color: "#0f172a", fontSize: "0.98rem", mb: 0.75}}>
                                {displayName}
                            </Typography>
                            <Stack
                                component="span"
                                direction="row"
                                alignItems="center"
                                spacing={0.5}
                                sx={{
                                    alignSelf: "flex-start",
                                    width: "fit-content",
                                    py: "4px",
                                    px: "8px",
                                    borderRadius: "6px",
                                    bgcolor: "rgba(59, 130, 246, 0.14)",
                                    border: `1px solid ${APP_PRIMARY_MAIN}`,
                                    boxSizing: "border-box",
                                    userSelect: "none"
                                }}
                            >
                                <PublicOutlinedIcon
                                    sx={{fontSize: 15, color: APP_PRIMARY_MAIN, flexShrink: 0, display: "block"}}
                                />
                                <Typography
                                    sx={{
                                        fontWeight: 600,
                                        fontSize: "0.75rem",
                                        lineHeight: 1,
                                        color: BRAND_NAVY,
                                        whiteSpace: "nowrap",
                                        letterSpacing: "0.01em"
                                    }}
                                >
                                    Công khai
                                </Typography>
                            </Stack>
                        </Box>
                    </Stack>

                    <Stack spacing={2.25}>
                        <TextField
                            label="Mô tả ngắn"
                            required
                            fullWidth
                            value={shortDescription}
                            onChange={(e) => setShortDescription(e.target.value)}
                            placeholder="VD: Thông báo bảo trì hệ thống định kỳ"
                            size="small"
                            disabled={submitting}
                        />
                        {fieldHint("content.shortDescription")}

                        <TextField
                            label="Nội dung chi tiết"
                            required
                            fullWidth
                            multiline
                            minRows={5}
                            value={contentBody}
                            onChange={(e) => setContentBody(e.target.value)}
                            placeholder={"Mỗi đoạn cách nhau bằng một dòng trống.\n\nĐoạn 1...\n\nĐoạn 2..."}
                            disabled={submitting}
                        />
                        {fieldHint("content.contentDataList[] { text, position } — position tự tăng 1,2,3…")}

                        <TextField
                            label="Hashtag"
                            required
                            fullWidth
                            value={hashTagsRaw}
                            onChange={(e) => setHashTagsRaw(e.target.value)}
                            placeholder="thongbao, baotri, capnhat"
                            size="small"
                            disabled={submitting}
                        />
                        {fieldHint("hashTagList — tách bằng dấu phẩy hoặc khoảng trắng")}

                        <FormControl fullWidth size="small" required disabled={submitting}>
                            <InputLabel id="category-post-label">Danh mục bài</InputLabel>
                            <Select
                                labelId="category-post-label"
                                label="Danh mục bài"
                                value={categoryPost}
                                onChange={(e) => setCategoryPost(e.target.value)}
                            >
                                {categoryOptions.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}{" "}
                                        <Typography component="span" variant="caption" sx={{color: "#94a3b8", ml: 0.5}}>
                                            ({opt.value})
                                        </Typography>
                                    </MenuItem>
                                ))}
                            </Select>
                            {fieldHint("categoryPost")}
                        </FormControl>

                        <TextField
                            label="URL ảnh trong bài (mỗi dòng một URL)"
                            required
                            fullWidth
                            multiline
                            minRows={2}
                            value={imageUrlsText}
                            onChange={(e) => setImageUrlsText(e.target.value)}
                            placeholder={"https://example.com/banner.jpg\nhttps://example.com/photo2.png"}
                            disabled={submitting}
                        />
                        {fieldHint("image.imageItemList[] { url, position }")}

                        <TextField
                            label="Thumbnail (URL)"
                            required
                            fullWidth
                            value={thumbnail}
                            onChange={(e) => setThumbnail(e.target.value)}
                            placeholder="https://example.com/thumb.jpg"
                            size="small"
                            disabled={submitting}
                        />
                        {fieldHint("thumbnail")}

                        <TextField
                            label="Loại file (MIME)"
                            required
                            fullWidth
                            value={typeFile}
                            onChange={(e) => setTypeFile(e.target.value)}
                            placeholder="image/jpeg"
                            size="small"
                            disabled={submitting}
                        />
                        {fieldHint("typeFile")}

                        <TextField
                            label="Ngày giờ đăng"
                            type="datetime-local"
                            required
                            fullWidth
                            value={publishedAt}
                            onChange={(e) => setPublishedAt(e.target.value)}
                            InputLabelProps={{shrink: true}}
                            size="small"
                            disabled={submitting}
                        />
                        {fieldHint("publishedDate — ISO dạng 2026-04-11T19:00:00")}
                    </Stack>

                    <Stack
                        direction={{xs: "column", sm: "row"}}
                        alignItems={{xs: "stretch", sm: "center"}}
                        justifyContent="space-between"
                        spacing={1.5}
                        sx={{
                            mt: 2.5,
                            p: 1.5,
                            borderRadius: "16px",
                            bgcolor: APP_PRIMARY_SOFT_BG,
                            border: `1px solid ${APP_PRIMARY_SOFT_BORDER}`
                        }}
                    >
                        <Typography
                            sx={{
                                flex: 1,
                                minWidth: 0,
                                fontSize: {xs: "0.8125rem", sm: "0.875rem"},
                                fontWeight: 800,
                                color: BRAND_NAVY,
                                letterSpacing: "0.01em",
                                lineHeight: 1.4,
                                pr: {sm: 1}
                            }}
                        >
                            Thêm vào bài viết của bạn
                        </Typography>
                        <Stack direction="row" spacing={1.25} justifyContent={{xs: "flex-end", sm: "flex-end"}} flexShrink={0}>
                            <IconButton
                                aria-label="Tải hình ảnh"
                                onClick={() => imageInputRef.current?.click()}
                                disabled={submitting}
                                sx={{
                                    ...iconBtnSx,
                                    bgcolor: "#fff",
                                    width: 44,
                                    height: 44
                                }}
                            >
                                <AddPhotoAlternateOutlinedIcon />
                            </IconButton>
                            <IconButton
                                aria-label="Tải file"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={submitting}
                                sx={{
                                    ...iconBtnSx,
                                    bgcolor: "#fff",
                                    width: 44,
                                    height: 44
                                }}
                            >
                                <UploadFileOutlinedIcon />
                            </IconButton>
                        </Stack>
                    </Stack>
                </DialogContent>

                <Box sx={{px: {xs: 2, sm: 2.75}, pb: 2.25, pt: 0}}>
                    <Button
                        fullWidth
                        variant="contained"
                        disabled={!canSubmit || submitting}
                        onClick={handleSubmit}
                        sx={{
                            py: 1.35,
                            textTransform: "none",
                            fontWeight: 800,
                            fontSize: "1rem",
                            letterSpacing: "0.06em",
                            borderRadius: "12px",
                            bgcolor: canSubmit && !submitting ? APP_PRIMARY_MAIN : "rgba(148, 163, 184, 0.45)",
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
