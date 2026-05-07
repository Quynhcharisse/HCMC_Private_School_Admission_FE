import React from "react";
import {
    Avatar,
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Stack,
    Typography,
    Button,
    TextField
} from "@mui/material";
import {
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Close as CloseIcon,
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
    InsertDriveFileOutlined as FileIcon,
    OpenInNew as OpenInNewIcon
} from "@mui/icons-material";
import {disablePostStatus, getPostList} from "../../services/PostService.jsx";
import {APP_PRIMARY_MAIN, BRAND_NAVY} from "../../constants/homeLandingTheme";
import {enqueueSnackbar} from "notistack";
import {ConfirmHighlight} from "../ui/ConfirmDialog.jsx";
import {normalizeUserRole} from "../../utils/userRole.js";
import HomeCreatePostBar from "../ui/HomeCreatePostBar.jsx";

const DEFAULT_SCHOOL_IMAGE =
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=80";

function removeGmtPlus7(value) {
    if (value == null) return "";
    return String(value)
        .replace(/\s*\(GMT\s*\+\s*7(?::?00)?\)\s*/gi, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function normalizeCaptionHtml(html) {
    const raw = removeGmtPlus7(html || "");
    if (!raw) return "";
    return raw.replace(
        /<p>\s*([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])\s*<\/p>\s*<p>\s*<(strong|b)>(.*?)<\/\2>/giu,
        "<p>$1 <$2>$3</$2>"
    );
}

function stripHtmlToPlain(html) {
    if (html == null) return "";
    return String(html)
        .replace(/<\s*br\s*\/?>/gi, "\n")
        .replace(/<\/\s*p\s*>/gi, "\n\n")
        .replace(/<\s*li[^>]*>/gi, "• ")
        .replace(/<\/\s*li\s*>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/\r/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/\s+/g, " ")
        .replace(/ *\n */g, "\n")
        .trim()
        .replace(/\(GMT\s*\+\s*7(?::?00)?\)/gi, "")
        .trim();
}

function formatPublishedDateVi(iso) {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return removeGmtPlus7(iso);
        return d.toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch {
        return removeGmtPlus7(iso);
    }
}

function parseJsonMaybe(value) {
    if (typeof value !== "string") return value;
    const t = value.trim();
    if (!t) return value;
    if (!(t.startsWith("{") || t.startsWith("["))) return value;
    try {
        return JSON.parse(t);
    } catch {
        return value;
    }
}

function looksLikeHttpUrl(value) {
    return /^https?:\/\//i.test(String(value || "").trim());
}

function looksLikeImageUrl(value) {
    const url = String(value || "").trim().toLowerCase();
    if (!looksLikeHttpUrl(url)) return false;
    if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar)(\?|#|$)/i.test(url)) return false;
    return true;
}

function collectImageUrlsDeep(input, bag, seen, depth = 0) {
    if (input == null || depth > 6) return;
    const parsed = parseJsonMaybe(input);

    if (typeof parsed === "string") {
        const s = parsed.trim();
        if (looksLikeImageUrl(s) && !seen.has(s)) {
            seen.add(s);
            bag.push(s);
        }
        return;
    }

    if (Array.isArray(parsed)) {
        for (const item of parsed) {
            collectImageUrlsDeep(item, bag, seen, depth + 1);
        }
        return;
    }

    if (typeof parsed === "object") {
        for (const [key, value] of Object.entries(parsed)) {
            const keyLower = String(key || "").toLowerCase();
            if (typeof value === "string" && (keyLower.includes("image") || keyLower.includes("url"))) {
                const v = value.trim();
                if (looksLikeImageUrl(v) && !seen.has(v)) {
                    seen.add(v);
                    bag.push(v);
                }
            }
            collectImageUrlsDeep(value, bag, seen, depth + 1);
        }
    }
}

function extractPostImageUrls(raw) {
    const sources = [raw?.image, raw?.images, raw?.content?.image, raw?.content?.images].map(parseJsonMaybe);

    for (const src of sources) {
        if (!src || typeof src !== "object") continue;

        if (Array.isArray(src?.imageItemList)) {
            return [...src.imageItemList]
                .sort((a, b) => (Number(a?.position) || 0) - (Number(b?.position) || 0))
                .map((item) => String(item?.url ?? item?.imageUrl ?? "").trim())
                .filter(Boolean);
        }

        if (Array.isArray(src?.imageList)) {
            return src.imageList
                .map((item) => (typeof item === "string" ? item.trim() : String(item?.url ?? item?.imageUrl ?? "").trim()))
                .filter(Boolean);
        }
    }

    const deepUrls = [];
    const seen = new Set();
    collectImageUrlsDeep(raw, deepUrls, seen);
    const thumbnail = String(raw?.thumbnail ?? "").trim();
    return deepUrls.filter((u) => u !== thumbnail);
}

function getFileDisplayName(url) {
    try {
        const pathname = new URL(url).pathname;
        const name = decodeURIComponent(pathname.split("/").pop() || "");
        return name || "Tải file đính kèm";
    } catch {
        return "Tải file đính kèm";
    }
}

function getFileTypeLabel(url) {
    const m = String(url || "").match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv|zip|rar)(\?|#|$)/i);
    if (!m) return "FILE";
    return m[1].toUpperCase();
}

function mapApiPostToFeedItem(raw) {
    const title = removeGmtPlus7(String(raw?.content?.shortDescription ?? "").trim()) || "Không có tiêu đề";
    const list = raw?.content?.contentDataList;
    let contentBlocks = [];
    let description = "";
    let captionHtml = "";
    if (Array.isArray(list) && list.length) {
        const sorted = [...list].sort((a, b) => (Number(a?.position) || 0) - (Number(b?.position) || 0));
        contentBlocks = sorted.map((item) => removeGmtPlus7(String(item?.text ?? "").trim())).filter(Boolean);
        captionHtml = normalizeCaptionHtml(String(contentBlocks[0] || "").trim());
        description = contentBlocks.map((block) => stripHtmlToPlain(block)).filter(Boolean).join("\n\n");
    }

    let tags = raw?.hashTag;
    if (!Array.isArray(tags)) {
        tags = Array.isArray(raw?.hashTagList) ? raw.hashTagList : [];
    }
    tags = tags.map((t) => String(t).trim()).filter(Boolean);

    const detailImages = extractPostImageUrls(raw);
    const heroImage = String(raw?.thumbnail ?? "").trim() || detailImages[0] || DEFAULT_SCHOOL_IMAGE;
    const authorName = String(raw?.author?.name ?? "").trim();
    const isAdminPost = authorName.toLowerCase() === "hệ thống edubridge";

    const fileUrl = String(raw?.fileUrl ?? raw?.content?.fileUrl ?? "").trim() || null;

    return {
        id: raw?.id,
        title,
        caption: description || title,
        captionHtml,
        date: formatPublishedDateVi(raw?.publishedDate),
        authorName: authorName || "Trường học",
        authorType: isAdminPost ? "ADMIN" : "SCHOOL",
        tags,
        heroImage,
        detailImages,
        contentBlocks,
        fileUrl,
    };
}

function FeedPostCard({post, onOpen, onDisable, disableLoading = false, canDisable = false}) {
    const firstTagLine = post.tags.length ? post.tags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ") : "#edubridge";
    const allImages = [post.heroImage, ...post.detailImages].filter(Boolean);
    const heroImage = allImages[0];
    const belowImages = allImages.slice(1);
    const maxBelowVisible = 3;
    const visibleBelowImages = belowImages.slice(0, maxBelowVisible);
    const hiddenBelowCount = Math.max(0, belowImages.length - maxBelowVisible);
    const initials = String(post.authorName || "ED")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "ED";

    return (
        <Card
            sx={{
                position: "relative",
                borderRadius: 3,
                border: "none",
                background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                boxShadow: "0 16px 34px rgba(15,23,42,0.14)",
                transition: "background-color 180ms ease, transform 180ms ease, box-shadow 180ms ease",
                "&:hover": {
                    backgroundColor: "#f1f7ff",
                    transform: "translateY(-2px)",
                    boxShadow: "0 20px 40px rgba(15,23,42,0.18)"
                }
            }}
        >
            {canDisable ? (
                <IconButton
                    onClick={() => onDisable(post)}
                    disabled={disableLoading}
                    size="small"
                    sx={{
                        position: "absolute",
                        right: 8,
                        top: 8,
                        zIndex: 2,
                        color: "#64748b",
                        "&:hover": {color: "#334155", bgcolor: "transparent"}
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            ) : null}
            <CardContent sx={{p: {xs: 2, md: 2.5}}}>
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{mb: 1.25}}>
                    <Avatar sx={{bgcolor: BRAND_NAVY, width: 42, height: 42, fontWeight: 700}}>{initials}</Avatar>
                    <Box sx={{minWidth: 0}}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography sx={{fontWeight: 800, color: "#0f172a", lineHeight: 1.15}}>{post.authorName}</Typography>
                            <Chip
                                size="small"
                                label={post.authorType === "ADMIN" ? "Admin" : "School"}
                                sx={{height: 20, fontSize: "0.68rem", fontWeight: 700}}
                            />
                        </Stack>
                        <Typography sx={{fontSize: "0.8rem", color: "#64748b"}}>{post.date || "Vừa đăng"}</Typography>
                    </Box>
                </Stack>

                <Typography sx={{fontWeight: 700, color: "#0f172a", mb: 0.5, lineHeight: 1.45}}>{post.title}</Typography>
                <Typography
                    component="div"
                    sx={{
                        color: "#334155",
                        fontSize: "0.94rem",
                        mb: 1.1,
                        lineHeight: 1.65,
                        "& p": {my: 0.6},
                        "& ul, & ol": {pl: 2.25, my: 0.6},
                        "& li": {my: 0.2},
                        "& a": {color: APP_PRIMARY_MAIN}
                    }}
                    dangerouslySetInnerHTML={{__html: post.captionHtml || post.caption || "Bài viết chưa có mô tả."}}
                />
                <Typography sx={{fontSize: "0.86rem", color: APP_PRIMARY_MAIN, fontWeight: 700, mb: 1.25}}>{firstTagLine}</Typography>

                {post.fileUrl ? (
                    <Box
                        component="a"
                        href={post.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 1.25,
                            px: 1.5,
                            py: 0.9,
                            borderRadius: 2,
                            border: "1px solid #e2e8f0",
                            bgcolor: "#f8fafc",
                            textDecoration: "none",
                            color: "#1e293b",
                            transition: "background-color 150ms ease, border-color 150ms ease",
                            "&:hover": {bgcolor: "#eef4ff", borderColor: "#93c5fd"},
                        }}
                    >
                        <FileIcon sx={{fontSize: 20, color: APP_PRIMARY_MAIN, flexShrink: 0}} />
                        <Box sx={{minWidth: 0}}>
                            <Typography sx={{fontWeight: 700, fontSize: "0.85rem", color: "#1e293b", lineHeight: 1.3}} noWrap>
                                {getFileDisplayName(post.fileUrl)}
                            </Typography>
                            <Typography sx={{fontSize: "0.75rem", color: "#64748b", fontWeight: 600}}>
                                {getFileTypeLabel(post.fileUrl)} · Nhấn để mở
                            </Typography>
                        </Box>
                        <OpenInNewIcon sx={{fontSize: 15, color: "#94a3b8", flexShrink: 0, ml: "auto"}} />
                    </Box>
                ) : null}

                {heroImage ? (
                    <Box
                        component="img"
                        src={heroImage}
                        alt={post.title}
                        onClick={() => onOpen(post, 0)}
                        sx={{
                            width: "100%",
                            height: {xs: 170, md: 220},
                            borderRadius: 2,
                            objectFit: "contain",
                            backgroundColor: "#dbe7f6",
                            cursor: "pointer",
                            display: "block",
                            mb: belowImages.length ? 0.75 : 0
                        }}
                    />
                ) : null}

                {visibleBelowImages.length ? (
                    <Grid container spacing={0.75}>
                        {visibleBelowImages.map((img, idx) => {
                            const isLastVisible = idx === visibleBelowImages.length - 1;
                            const showMoreOverlay = isLastVisible && hiddenBelowCount > 0;
                            return (
                                <Grid key={`${post.id || "post"}-sub-${idx}`} size={{xs: 4}}>
                                    <Box
                                        onClick={() => onOpen(post, idx + 1)}
                                        sx={{
                                            position: "relative",
                                            width: "100%",
                                            aspectRatio: "1 / 1",
                                            borderRadius: 2,
                                            overflow: "hidden",
                                            cursor: "pointer"
                                        }}
                                    >
                                        <Box
                                            component="img"
                                            src={img}
                                            alt={post.title}
                                            sx={{width: "100%", height: "100%", objectFit: "cover", display: "block"}}
                                        />
                                        {showMoreOverlay ? (
                                            <Box
                                                sx={{
                                                    position: "absolute",
                                                    inset: 0,
                                                    bgcolor: "rgba(15,23,42,0.5)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center"
                                                }}
                                            >
                                                <Typography sx={{color: "#fff", fontWeight: 800, fontSize: "1.1rem"}}>
                                                    +{hiddenBelowCount}
                                                </Typography>
                                            </Box>
                                        ) : null}
                                    </Box>
                                </Grid>
                            );
                        })}
                    </Grid>
                ) : null}
            </CardContent>
        </Card>
    );
}

export default function PostFeedPage() {
    const [posts, setPosts] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [fetchError, setFetchError] = React.useState(false);
    const [imagePreview, setImagePreview] = React.useState({open: false, post: null, index: 0});
    const [disableTarget, setDisableTarget] = React.useState(null);
    const [disableNote, setDisableNote] = React.useState("");
    const [isDisabling, setIsDisabling] = React.useState(false);
    const [canDisablePost, setCanDisablePost] = React.useState(false);
    const [previewZoom, setPreviewZoom] = React.useState(1);
    const [previewPan, setPreviewPan] = React.useState({x: 0, y: 0});
    const [isPreviewDragging, setIsPreviewDragging] = React.useState(false);
    const previewDragRef = React.useRef({dragging: false, startX: 0, startY: 0, baseX: 0, baseY: 0});
    const previewFrameRef = React.useRef(null);
    const previewImageRef = React.useRef(null);

    const reloadPosts = React.useCallback(async () => {
        setLoading(true);
        setFetchError(false);
        try {
            const res = await getPostList();
            let body = res?.data?.body;
            if (typeof body === "string") {
                try {
                    body = JSON.parse(body);
                } catch {
                    body = [];
                }
            }
            const list = Array.isArray(body) ? body : [];
            const activeOnly = list.filter((p) => !p?.status || p.status === "POST_ACTIVE");
            setPosts(activeOnly.map(mapApiPostToFeedItem));
        } catch {
            setFetchError(true);
            setPosts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        reloadPosts();
    }, [reloadPosts]);

    React.useEffect(() => {
        try {
            const raw = localStorage.getItem("user");
            if (!raw) return;
            const user = JSON.parse(raw);
            const role = normalizeUserRole(user?.role ?? "");
            setCanDisablePost(role === "ADMIN" || role === "SCHOOL");
        } catch {
            setCanDisablePost(false);
        }
    }, []);

    React.useEffect(() => {
        setPreviewZoom(1);
        setPreviewPan({x: 0, y: 0});
        setIsPreviewDragging(false);
        previewDragRef.current.dragging = false;
    }, [imagePreview.open, imagePreview.index]);

    React.useEffect(() => {
        if (previewZoom <= 1) {
            setPreviewPan({x: 0, y: 0});
            setIsPreviewDragging(false);
            previewDragRef.current.dragging = false;
        }
    }, [previewZoom]);

    const clampPreviewPan = React.useCallback(
        (panX, panY) => {
            const frameEl = previewFrameRef.current;
            if (!frameEl) return {x: 0, y: 0};

            const frameRect = frameEl.getBoundingClientRect();
            const frameWidth = frameRect.width;
            const frameHeight = frameRect.height;
            if (!frameWidth || !frameHeight) return {x: 0, y: 0};

            // Clamp by frame bounds so dragging never reveals outside background.
            const maxOffsetX = Math.max(0, ((previewZoom - 1) * frameWidth) / 2);
            const maxOffsetY = Math.max(0, ((previewZoom - 1) * frameHeight) / 2);
            const x = Math.min(maxOffsetX, Math.max(-maxOffsetX, panX));
            const y = Math.min(maxOffsetY, Math.max(-maxOffsetY, panY));

            return {x, y};
        },
        [previewZoom]
    );

    React.useEffect(() => {
        setPreviewPan((prev) => clampPreviewPan(prev.x, prev.y));
    }, [previewZoom, imagePreview.index, clampPreviewPan]);

    const handlePreviewMouseDown = React.useCallback(
        (event) => {
            if (previewZoom <= 1) return;
            event.preventDefault();
            previewDragRef.current = {
                dragging: true,
                startX: event.clientX,
                startY: event.clientY,
                baseX: previewPan.x,
                baseY: previewPan.y
            };
            setIsPreviewDragging(true);
        },
        [previewZoom, previewPan.x, previewPan.y]
    );

    const handlePreviewMouseMove = React.useCallback((event) => {
        const drag = previewDragRef.current;
        if (!drag.dragging) return;
        const deltaX = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;
        const nextPan = clampPreviewPan(drag.baseX + deltaX, drag.baseY + deltaY);
        setPreviewPan(nextPan);
    }, [clampPreviewPan]);

    const handlePreviewMouseUp = React.useCallback(() => {
        if (!previewDragRef.current.dragging) return;
        previewDragRef.current.dragging = false;
        setIsPreviewDragging(false);
    }, []);

    const handleConfirmDisable = async () => {
        const postId = Number(disableTarget?.id);
        if (!Number.isFinite(postId) || postId <= 0) {
            enqueueSnackbar("Không xác định được bài viết để ẩn.", {variant: "error"});
            return;
        }
        if (!disableNote.trim()) {
            enqueueSnackbar("Vui lòng nhập ghi chú.", {variant: "warning"});
            return;
        }
        setIsDisabling(true);
        try {
            await disablePostStatus({postId, note: disableNote.trim()});
            enqueueSnackbar("Đã ẩn bài đăng.", {variant: "success"});
            setDisableTarget(null);
            setDisableNote("");
            await reloadPosts();
        } catch (error) {
            const msg = error?.response?.data?.message || error?.message || "Không thể ẩn bài đăng.";
            enqueueSnackbar(msg, {variant: "error"});
        } finally {
            setIsDisabling(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                pt: {xs: 10.5, md: 12},
                pb: {xs: 3, md: 5},
                background: "linear-gradient(180deg, #e7edf6 0%, #d4deec 100%)"
            }}
        >
            <Container maxWidth="md">
                {canDisablePost ? (
                    <Box sx={{mt: {xs: -0.5, md: -1}, mb: 2}}>
                        <HomeCreatePostBar visible belowHero maxBarWidth="100%" onPostCreated={reloadPosts} />
                    </Box>
                ) : null}

                {loading ? (
                    <Box sx={{display: "flex", justifyContent: "center", py: 10}}>
                        <CircularProgress sx={{color: APP_PRIMARY_MAIN}} />
                    </Box>
                ) : fetchError ? (
                    <Typography sx={{color: "#64748b"}}>Không tải được bảng tin. Vui lòng thử lại sau.</Typography>
                ) : posts.length === 0 ? (
                    <Typography sx={{color: "#64748b"}}>Chưa có bài đăng nào.</Typography>
                ) : (
                    <Stack spacing={2}>
                        {posts.map((post) => (
                            <FeedPostCard
                                key={post.id || post.title}
                                post={post}
                                canDisable={canDisablePost}
                                disableLoading={isDisabling && Number(disableTarget?.id) === Number(post.id)}
                                onDisable={(selectedPost) => {
                                    setDisableTarget(selectedPost);
                                    setDisableNote("Ẩn bài đăng theo yêu cầu quản trị.");
                                }}
                                onOpen={(selectedPost, selectedImageIndex) =>
                                    setImagePreview({open: true, post: selectedPost, index: selectedImageIndex ?? 0})
                                }
                            />
                        ))}
                    </Stack>
                )}
            </Container>

            <Dialog
                open={Boolean(imagePreview.open)}
                onClose={() => setImagePreview({open: false, post: null, index: 0})}
                fullScreen
                sx={{
                    "& .MuiDialog-paper.MuiDialog-paperFullScreen": {
                        margin: 0,
                        width: {xs: "calc(100% - 6px)", md: "calc(100% - 18px)"},
                        height: {xs: "calc(100% - 10px)", md: "calc(100% - 22px)"},
                        maxWidth: "none",
                        maxHeight: "none",
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: {xs: 2, md: 3},
                        overflow: "hidden",
                        backgroundColor: "transparent",
                        backgroundImage: "none",
                        boxShadow: "none",
                        border: "none"
                    }
                }}
            >
                <DialogContent
                    sx={{
                        px: {xs: 1, md: 1.5},
                        py: {xs: 1.5, md: 2},
                        overflow: "hidden",
                        bgcolor: "transparent",
                        display: "flex",
                        flex: 1,
                        minHeight: 0,
                        height: "100%"
                    }}
                >
                    {(() => {
                        const images = imagePreview.post
                            ? [imagePreview.post.heroImage, ...imagePreview.post.detailImages].filter(Boolean)
                            : [];
                        const currentImg = images[imagePreview.index] || images[0];
                        const isThumbnailImage = imagePreview.index === 0;
                        return currentImg ? (
                            <Box
                                sx={{
                                    height: "100%",
                                    flex: 1,
                                    display: "grid",
                                    gridTemplateColumns: {xs: "1fr", md: "380px 1fr"},
                                    borderRadius: {xs: 2, md: 3},
                                    overflow: "hidden",
                                    minHeight: 0
                                }}
                            >
                                <Box
                                    sx={{
                                        p: {xs: 2, md: 2.5},
                                        borderRight: {xs: "none", md: "1px solid rgba(148,163,184,0.24)"},
                                        borderBottom: {xs: "1px solid rgba(148,163,184,0.24)", md: "none"},
                                        overflowY: "auto",
                                        bgcolor: "#ffffff"
                                    }}
                                >
                                    <Typography sx={{fontWeight: 800, color: "#0f172a", mb: 1}}>
                                        {imagePreview.post?.title || "Bài viết"}
                                    </Typography>
                                    <Typography sx={{fontSize: "0.9rem", color: "#64748b", mb: 1}}>
                                        {imagePreview.post?.authorName || "EduBridge"} • {imagePreview.post?.date || "Vừa đăng"}
                                    </Typography>
                                    <Typography
                                        component="div"
                                        sx={{
                                            color: "#334155",
                                            fontSize: "0.94rem",
                                            lineHeight: 1.65,
                                            "& p": {my: 0.6},
                                            "& ul, & ol": {pl: 2.25, my: 0.6},
                                            "& li": {my: 0.2},
                                            "& a": {color: APP_PRIMARY_MAIN}
                                        }}
                                        dangerouslySetInnerHTML={{
                                            __html:
                                                imagePreview.post?.captionHtml ||
                                                imagePreview.post?.caption ||
                                                "Bài viết chưa có mô tả."
                                        }}
                                    />
                                </Box>
                                <Box
                                    sx={{
                                        position: "relative",
                                        bgcolor: isThumbnailImage ? "#eaf3ff" : "#111827",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        p: 0,
                                        minHeight: 0,
                                        overflow: "hidden",
                                        cursor: previewZoom > 1 ? (isPreviewDragging ? "grabbing" : "grab") : "default"
                                    }}
                                    ref={previewFrameRef}
                                    onMouseDown={handlePreviewMouseDown}
                                    onMouseMove={handlePreviewMouseMove}
                                    onMouseUp={handlePreviewMouseUp}
                                    onMouseLeave={handlePreviewMouseUp}
                                >
                                    <Box
                                        component="img"
                                        src={currentImg}
                                        alt={imagePreview.post?.title || "preview"}
                                        draggable={false}
                                        ref={previewImageRef}
                                        onLoad={() => setPreviewPan((prev) => clampPreviewPan(prev.x, prev.y))}
                                        sx={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: isThumbnailImage ? "contain" : "cover",
                                            transform: `translate(${previewPan.x}px, ${previewPan.y}px) scale(${previewZoom})`,
                                            transformOrigin: "center center",
                                            transition: isPreviewDragging ? "none" : "transform 140ms ease",
                                            userSelect: "none",
                                            pointerEvents: "none"
                                        }}
                                    />
                                    <Stack direction="row" spacing={0.75} sx={{position: "absolute", right: 58, top: 10, zIndex: 3}}>
                                        <IconButton
                                            onClick={() => setPreviewZoom((z) => Math.max(1, Number((z - 0.2).toFixed(1))))}
                                            disabled={previewZoom <= 1}
                                            sx={{
                                                bgcolor: "rgba(15,23,42,0.44)",
                                                color: "#fff",
                                                "&:hover": {bgcolor: "rgba(15,23,42,0.62)"}
                                            }}
                                        >
                                            <ZoomOutIcon />
                                        </IconButton>
                                        <IconButton
                                            onClick={() => setPreviewZoom((z) => Math.min(3, Number((z + 0.2).toFixed(1))))}
                                            disabled={previewZoom >= 3}
                                            sx={{
                                                bgcolor: "rgba(15,23,42,0.44)",
                                                color: "#fff",
                                                "&:hover": {bgcolor: "rgba(15,23,42,0.62)"}
                                            }}
                                        >
                                            <ZoomInIcon />
                                        </IconButton>
                                    </Stack>
                                    <IconButton
                                        onClick={() => setImagePreview({open: false, post: null, index: 0})}
                                        sx={{
                                            position: "absolute",
                                            right: 10,
                                            top: 10,
                                            zIndex: 3,
                                            bgcolor: "rgba(15,23,42,0.44)",
                                            color: "#fff",
                                            "&:hover": {bgcolor: "rgba(15,23,42,0.62)"}
                                        }}
                                    >
                                        <CloseIcon />
                                    </IconButton>
                                    {images.length > 1 ? (
                                        <>
                                            <IconButton
                                                onClick={() =>
                                                    setImagePreview((prev) => ({
                                                        ...prev,
                                                        index: (prev.index - 1 + images.length) % images.length
                                                    }))
                                                }
                                                sx={{
                                                    position: "absolute",
                                                    left: 10,
                                                    top: "50%",
                                                    transform: "translateY(-50%)",
                                                    bgcolor: "rgba(15,23,42,0.42)",
                                                    color: "#fff",
                                                    "&:hover": {bgcolor: "rgba(15,23,42,0.62)"}
                                                }}
                                            >
                                                <ChevronLeftIcon />
                                            </IconButton>
                                            <IconButton
                                                onClick={() =>
                                                    setImagePreview((prev) => ({
                                                        ...prev,
                                                        index: (prev.index + 1) % images.length
                                                    }))
                                                }
                                                sx={{
                                                    position: "absolute",
                                                    right: 10,
                                                    top: "50%",
                                                    transform: "translateY(-50%)",
                                                    bgcolor: "rgba(15,23,42,0.42)",
                                                    color: "#fff",
                                                    "&:hover": {bgcolor: "rgba(15,23,42,0.62)"}
                                                }}
                                            >
                                                <ChevronRightIcon />
                                            </IconButton>
                                        </>
                                    ) : null}
                                </Box>
                            </Box>
                        ) : (
                            <Typography sx={{color: "#64748b"}}>Không có ảnh để xem.</Typography>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(disableTarget)} onClose={() => (isDisabling ? null : setDisableTarget(null))} fullWidth maxWidth="sm">
                <DialogTitle sx={{fontWeight: 800}}>Ẩn bài đăng</DialogTitle>
                <DialogContent dividers>
                    <Typography sx={{color: "#475569", mb: 1}}>
                        Bài đăng sẽ <ConfirmHighlight>bị ẩn khỏi người dùng khác</ConfirmHighlight>.
                    </Typography>
                    <TextField
                        label="Ghi chú"
                        value={disableNote}
                        onChange={(e) => setDisableNote(e.target.value)}
                        fullWidth
                        multiline
                        minRows={3}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDisableTarget(null)} disabled={isDisabling} sx={{textTransform: "none"}}>
                        Hủy
                    </Button>
                    <Button onClick={handleConfirmDisable} disabled={isDisabling} variant="contained" sx={{textTransform: "none"}}>
                        {isDisabling ? "Đang xử lý..." : "Xác nhận ẩn"}
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
}
