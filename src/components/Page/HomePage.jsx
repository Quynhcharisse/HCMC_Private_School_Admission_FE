import React from "react";
import {
    Box,
    Button,
    ButtonBase,
    Card,
    CardContent,
    CardMedia,
    Container,
    Typography,
    Stack,
    TextField,
    Chip,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    CircularProgress,
    IconButton,
    useMediaQuery,
    Link
} from "@mui/material";
import {useTheme} from "@mui/material/styles";
import {syncLocalUserWithAccess, updateProfile} from "../../services/AccountService";
import {normalizeUserRole, notifyAuthUserStorageChanged, sanitizeUserForLocalStorage} from "../../utils/userRole.js";
import {enqueueSnackbar} from "notistack";
import {
    ArrowForward as ArrowForwardIcon,
    LocationOn as LocationIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Search as SearchIcon,
    AutoAwesome as SparkleIcon,
    FormatQuote as FormatQuoteIcon,
    HeadsetMicOutlined as HeadsetMicIcon,
    CalendarMonthOutlined as CalendarMonthIcon,
    SmartToyOutlined as SmartToyIcon,
    Add as AddIcon,
    CheckCircle as CheckCircleIcon,
    Favorite as FavoriteIcon,
    FavoriteBorder as FavoriteBorderIcon,
    Language as LanguageIcon,
    Phone as PhoneIcon
} from "@mui/icons-material";
import {useLocation, useNavigate} from "react-router-dom";
import {
    APP_PRIMARY_DARK,
    APP_PRIMARY_MAIN,
    APP_PRIMARY_SOFT_BG,
    APP_PRIMARY_SOFT_BORDER,
    BRAND_NAVY,
    BRAND_SKY,
    BRAND_SKY_LIGHT,
    landingSectionShadow
} from "../../constants/homeLandingTheme";
import HomeCreatePostBar from "../ui/HomeCreatePostBar.jsx";
import topPromoBanner1 from "../../assets/1.png";
import topPromoBanner2 from "../../assets/2.png";
import homeBackgroundImage from "../../assets/image.png";
import {getPublicSchoolDetail, getPublicSchoolList, searchNearbyCampuses} from "../../services/SchoolPublicService.jsx";
import {getAdminPackageFees} from "../../services/AdminService.jsx";
import {createSchoolSubscriptionPayment} from "../../services/SchoolSubscriptionService.jsx";
import {getPostList} from "../../services/PostService.jsx";
import SchoolServicePackagesGrid from "../ui/SchoolServicePackagesGrid.jsx";
import SchoolSearchDetailView from "./SchoolSearchDetailView.jsx";
import {mapPublicSchoolDetailToRow, DEFAULT_SCHOOL_IMAGE} from "../../utils/schoolPublicMapper.js";
import {showSuccessSnackbar, showWarningSnackbar} from "../ui/AppSnackbar.jsx";
import {
    getCompareSchools,
    MAX_COMPARE_SCHOOLS,
    setCompareSchools
} from "../../utils/compareSchoolsStorage";
import {getSchoolStorageKey, getUserIdentity} from "../../utils/savedSchoolsStorage";
import {
    deleteParentFavouriteSchool,
    getParentFavouriteSchools,
    postParentFavouriteSchool
} from "../../services/ParentService.jsx";

const ADMISSION_CAROUSEL_INTERVAL_MS = 7000;
const ADMISSION_ANIM_MS = 1400;
const admissionEase = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

const TOP_PROMO_CAROUSEL_INTERVAL_MS = 6000;
const TOP_PROMO_SLIDE_MS = 520;
const TOP_PROMO_SLIDE_EASE = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
const TOP_PROMO_SLIDES = [
    {src: topPromoBanner1, alt: 'Hỗ trợ tư vấn tuyển sinh — EduBridgeHCM'},
    {src: topPromoBanner2, alt: 'Hỗ trợ tư vấn tuyển sinh — EduBridgeHCM'}
];

const HOME_ABOUT_MEDIA = [
    {
        src: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80",
        alt: "Sách và tài liệu học tập"
    },
    {
        src: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80",
        alt: "Kệ sách và sách giáo khoa"
    },
    {
        src: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80",
        alt: "Dụng cụ học tập"
    }
];

const FAVOURITE_SYNC_PAGE_SIZE = 200;

function parseFavouriteListPayload(res) {
    const raw = res?.data?.body ?? res?.body ?? res?.data ?? res;
    if (Array.isArray(raw?.items)) return raw.items;
    if (Array.isArray(raw?.content)) return raw.content;
    if (Array.isArray(raw)) return raw;
    return [];
}

function buildFavouriteIdBySchool(items) {
    const map = {};
    for (const item of items) {
        const schoolId = Number(
            item?.schoolId ?? item?.school?.schoolId ?? item?.school?.id ?? item?.id ?? null
        );
        const favouriteId = Number(item?.id ?? item?.favouriteId ?? null);
        if (Number.isFinite(schoolId) && Number.isFinite(favouriteId)) {
            map[schoolId] = favouriteId;
        }
    }
    return map;
}

const CONSULT_STEPS = [
    {
        n: 1,
        title: 'Nhắn tin cho tư vấn viên online của trường',
        subtitle:
            'Quý phụ huynh có thể trao đổi trực tiếp với tư vấn viên qua kênh online do nhà trường cung cấp.',
        mirror: false,
        variant: 1
    },
    {
        n: 2,
        title: 'Đặt lịch để được tư vấn trực tiếp tại trường',
        subtitle:
            'Quý phụ huynh có thể đặt lịch thăm quan và trao đổi trực tiếp tại cơ sở của trường.',
        mirror: true,
        variant: 2
    },
    {
        n: 3,
        title: 'Nhắn tin tìm hiểu bằng chatbot',
        subtitle:
            'Quý phụ huynh có thể đặt câu hỏi nhanh và nhận gợi ý phù hợp thông qua chatbot trên nền tảng.',
        mirror: false,
        variant: 3,
        showSparkle: true
    }
];

const HOME_TESTIMONIALS = [
    {
        quote: "Nhờ EduBridgeHCM mà gia đình mình tìm được trường phù hợp rất nhanh. Thông tin rõ ràng, dễ so sánh và tư vấn rất tận tâm.",
        name: "Trần Thị Mai",
        accent: "#0ea5e9",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80"
    },
    {
        quote: "Mình thích nhất là có thể xem nhiều trường cùng lúc và đặt lịch tư vấn ngay. Trải nghiệm mượt, tiết kiệm rất nhiều thời gian.",
        name: "Nguyễn Hoàng Nam",
        accent: "#2563eb",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80"
    },
    {
        quote: "Website trình bày khoa học, nội dung thực tế và đáng tin cậy. Con mình đã nhập học đúng nguyện vọng nhờ nền tảng này.",
        name: "Lê Mỹ Linh",
        accent: "#1d4ed8",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80"
    }
];

const glassPane = (sx) => ({
    position: 'absolute',
    borderRadius: 3,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.45)',
    boxShadow: '0 12px 36px rgba(51,65,85,0.06)',
    ...sx
});

function ConsultGraphicCluster({variant = 1, mirror = false}) {
    const palette = {
        1: [
            ['linear-gradient(145deg, rgba(191,219,254,0.55), rgba(147,197,253,0.38))', -14, 2, 8],
            ['linear-gradient(145deg, rgba(96,165,250,0.48), rgba(59,130,246,0.32))', 16, 44, 36],
            ['linear-gradient(145deg, rgba(224,242,254,0.52), rgba(186,230,253,0.36))', 8, 4, 88],
            ['linear-gradient(145deg, rgba(59,130,246,0.32), rgba(37,99,235,0.22))', -20, 52, 128]
        ],
        2: [
            ['linear-gradient(145deg, rgba(147,197,253,0.5), rgba(125,211,252,0.34))', -18, 0, 12],
            ['linear-gradient(145deg, rgba(96,165,250,0.42), rgba(37,99,235,0.26))', 22, 48, 48],
            ['linear-gradient(145deg, rgba(219,234,254,0.55), rgba(191,219,254,0.38))', -10, 8, 108],
            ['linear-gradient(145deg, rgba(37,99,235,0.28), rgba(59,130,246,0.2))', 14, 56, 168]
        ],
        3: [
            ['linear-gradient(145deg, rgba(186,230,253,0.52), rgba(125,211,252,0.36))', 12, 6, 20],
            ['linear-gradient(145deg, rgba(59,130,246,0.4), rgba(37,99,235,0.28))', -16, 44, 8],
            ['linear-gradient(145deg, rgba(224,242,254,0.5), rgba(191,219,254,0.34))', -8, 4, 112],
            ['linear-gradient(145deg, rgba(96,165,250,0.36), rgba(59,130,246,0.24))', 20, 48, 152]
        ]
    };
    const layers = palette[variant] || palette[1];
    const W = {xs: 100, md: 118};

    return (
        <Box
            sx={{
                position: 'relative',
                width: W,
                height: {xs: 168, md: 188},
                flexShrink: 0,
                transform: mirror ? 'scaleX(-1)' : 'none',
                pointerEvents: 'none'
            }}
        >
            {layers.map(([bg, rot, left, top], idx) => {
                const size = idx === 1 ? {w: 52, h: 62} : idx === 3 ? {w: 44, h: 44} : {w: 50, h: 50};
                return (
                    <Box
                        key={idx}
                        sx={glassPane({
                            width: {xs: size.w - 4, md: size.w},
                            height: {xs: size.h - 6, md: size.h},
                            background: bg,
                            transform: `rotate(${rot}deg)`,
                            top,
                            left,
                            zIndex: idx
                        })}
                    />
                );
            })}
        </Box>
    );
}

function stripHtmlToPlain(html) {
    if (html == null) return "";
    return String(html)
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function formatPublishedDateVi(iso) {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return String(iso);
        return d.toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch {
        return String(iso);
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
    const sources = [
        raw?.image,
        raw?.images,
        raw?.content?.image,
        raw?.content?.images
    ].map(parseJsonMaybe);

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
                .map((item) =>
                    typeof item === "string"
                        ? item.trim()
                        : String(item?.url ?? item?.imageUrl ?? "").trim()
                )
                .filter(Boolean);
        }
    }

    const deepUrls = [];
    const seen = new Set();
    collectImageUrlsDeep(raw, deepUrls, seen);
    const thumbnail = String(raw?.thumbnail ?? "").trim();
    return deepUrls.filter((u) => u !== thumbnail);
}

function mapApiPostToBlogCard(raw) {
    const title = String(raw?.content?.shortDescription ?? "").trim() || "Không có tiêu đề";
    const list = raw?.content?.contentDataList;
    let contentBlocks = [];
    let descriptionHtml = "";
    let description = "";
    if (Array.isArray(list) && list.length) {
        const sorted = [...list].sort((a, b) => (Number(a?.position) || 0) - (Number(b?.position) || 0));
        contentBlocks = sorted
            .map((item) => String(item?.text ?? "").trim())
            .filter(Boolean);
        descriptionHtml = String(sorted[0]?.text ?? "").trim();
        description = stripHtmlToPlain(descriptionHtml);
    }
    const image = String(raw?.thumbnail ?? "").trim() || DEFAULT_SCHOOL_IMAGE;
    const detailImages = extractPostImageUrls(raw);
    const date = formatPublishedDateVi(raw?.publishedDate);
    let tags = raw?.hashTag;
    if (!Array.isArray(tags)) {
        tags = Array.isArray(raw?.hashTagList) ? raw.hashTagList : [];
    }
    tags = tags.map((t) => String(t).trim()).filter(Boolean);
    const id = raw?.id;
    const url = id != null ? `#post-${id}` : "#";
    return {title, description, descriptionHtml, contentBlocks, image, detailImages, date, tags, url, id};
}

function BlogCard({title, description, descriptionHtml, image, date, tags = [], url, variant = 'featured', onOpenDetail}) {
    const isFeatured = variant === 'featured';
    const isExternal = typeof url === "string" && /^https?:\/\//i.test(url);
    return (
        <Card
            sx={{
                maxWidth: isFeatured ? 370 : 300,
                width: '100%',
                mx: 'auto',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                borderRadius: isFeatured ? 5 : 3,
                boxShadow: isFeatured ? landingSectionShadow(5) : landingSectionShadow(3),
                border: '1px solid rgba(51,65,85,0.07)',
                overflow: 'hidden',
                bgcolor: '#fff',
                transition: `transform ${ADMISSION_ANIM_MS}ms ${admissionEase}, box-shadow 0.35s ease, opacity ${ADMISSION_ANIM_MS}ms ${admissionEase}`,
                '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: landingSectionShadow(6)
                }
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    borderRadius: isFeatured ? 5 : 3,
                    overflow: 'hidden',
                    mt: isFeatured ? 0 : 0.5,
                    mx: isFeatured ? 0 : 1,
                    boxShadow: isFeatured ? '0 20px 50px rgba(37,99,235,0.14)' : 'none'
                }}
            >
                <CardMedia
                    component="img"
                    height={isFeatured ? 240 : 168}
                    image={image}
                    alt={title}
                    imgProps={{
                        referrerPolicy: "no-referrer",
                        onError: (e) => {
                            if (e?.currentTarget?.src !== DEFAULT_SCHOOL_IMAGE) {
                                e.currentTarget.src = DEFAULT_SCHOOL_IMAGE;
                            }
                        }
                    }}
                    sx={{
                        objectFit: 'cover',
                        transition: `transform ${ADMISSION_ANIM_MS}ms ${admissionEase}`,
                        '.MuiCard-root:hover &': {transform: 'scale(1.04)'}
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, transparent 35%, rgba(51,65,85,0.55) 100%)',
                        pointerEvents: 'none'
                    }}
                />
            </Box>
            <CardContent
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    p: {xs: 2.25, md: isFeatured ? 3 : 2.35},
                    pt: isFeatured ? 2.25 : 2,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    mx: isFeatured ? 0 : 1,
                    mt: isFeatured ? {xs: -4, md: -5} : {xs: -2, md: -2.5},
                    mb: 0,
                    borderRadius: 3,
                    bgcolor: '#fff',
                    border: '1px solid rgba(255,255,255,0.9)',
                    boxShadow: isFeatured ? '0 16px 40px rgba(51,65,85,0.1)' : landingSectionShadow(2)
                }}
            >
                <Typography sx={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: '#64748b',
                    mb: 0.75,
                    letterSpacing: '0.02em'
                }}>
                    {date}
                </Typography>
                <Typography
                    sx={{
                        fontWeight: 800,
                        fontSize: isFeatured ? {xs: '1.12rem', md: '1.22rem'} : {xs: '0.95rem', md: '1.02rem'},
                        color: '#1e293b',
                        lineHeight: 1.35,
                        mb: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: isFeatured ? 3 : 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                    }}
                >
                    {title}
                </Typography>
                <Typography
                    component="div"
                    sx={{
                        color: '#64748b',
                        fontSize: isFeatured ? '0.95rem' : '0.88rem',
                        lineHeight: 1.65,
                        mb: 1.5,
                        flex: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: isFeatured ? 4 : 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                    }}
                    dangerouslySetInnerHTML={{__html: descriptionHtml || description}}
                />
                <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.6}}>
                    {tags.map((tag) => (
                        <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            sx={{
                                borderRadius: 999,
                                bgcolor: APP_PRIMARY_SOFT_BG,
                                color: APP_PRIMARY_DARK,
                                fontSize: '0.72rem',
                                fontWeight: 600
                            }}
                        />
                    ))}
                </Box>
                <Button
                    size="small"
                    href={onOpenDetail ? undefined : url || "#"}
                    target={onOpenDetail ? undefined : isExternal ? "_blank" : undefined}
                    rel={onOpenDetail ? undefined : isExternal ? "noopener noreferrer" : undefined}
                    onClick={onOpenDetail}
                    sx={{
                        alignSelf: 'flex-start',
                        mt: 2,
                        textTransform: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: BRAND_NAVY,
                        px: 0,
                        minWidth: 0,
                        '&:hover': {bgcolor: 'transparent', textDecoration: 'underline'}
                    }}
                >
                    Xem chi tiết
                </Button>
            </CardContent>
        </Card>
    );
}

function SchoolCard({school, onOpenDetail, onToggleCompare, onToggleSave, compareSchoolKeys}) {
    const displayName = school.school || school.name || "Trường đang cập nhật";
    const logoSrc = school.logoUrl || school.cover || DEFAULT_SCHOOL_IMAGE;
    const description = school.description?.trim?.() ? String(school.description).trim() : "";
    const address = school.address?.trim?.()
        ? String(school.address).trim()
        : school.location?.trim?.()
          ? String(school.location).trim()
          : "";
    const website = school.website?.trim?.() ? String(school.website).trim() : "";
    const phone = school.phone?.trim?.() ? String(school.phone).trim() : "";

    const schoolKey = getSchoolStorageKey({
        id: school.id,
        province: school.province,
        ward: school.ward,
        school: displayName
    });
    const inCompare = compareSchoolKeys.has(schoolKey);
    const isSaved = Boolean(school.isFavourite);

    return (
        <Card
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                overflow: 'hidden',
                bgcolor: '#fff',
                border: '1px solid rgba(203,213,225,0.95)',
                boxShadow: '0 8px 28px rgba(15,23,42,0.06), 0 2px 10px rgba(15,23,42,0.04)',
                transition:
                    'transform 0.32s cubic-bezier(0.2, 0, 0.2, 1), box-shadow 0.32s cubic-bezier(0.2, 0, 0.2, 1), border-color 0.32s cubic-bezier(0.2, 0, 0.2, 1)',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: 'rgba(148,163,184,0.65)',
                    boxShadow: '0 14px 40px rgba(15,23,42,0.1), 0 4px 14px rgba(59,130,246,0.08)'
                }
            }}
        >
            <Box
                sx={{
                    pt: 2.25,
                    px: 2.25,
                    pb: 1.5,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 1.75,
                    minWidth: 0
                }}
            >
                <CardMedia
                    component="img"
                    image={logoSrc}
                    alt={`${displayName} logo`}
                    imgProps={{
                        referrerPolicy: 'no-referrer',
                        onError: (e) => {
                            if (e?.currentTarget?.src !== DEFAULT_SCHOOL_IMAGE) {
                                e.currentTarget.src = DEFAULT_SCHOOL_IMAGE;
                            }
                        }
                    }}
                    sx={{
                        height: {xs: 92, sm: 96},
                        width: {xs: 92, sm: 96},
                        flexShrink: 0,
                        borderRadius: '50%',
                        objectFit: 'contain',
                        objectPosition: 'center',
                        bgcolor: 'rgba(248,250,252,0.95)',
                        p: 0.65,
                        border: '1px solid rgba(226,232,240,0.9)'
                    }}
                />
                <Typography
                    sx={{
                        textAlign: 'left',
                        fontWeight: 700,
                        fontSize: {xs: '1rem', sm: '1.08rem'},
                        color: BRAND_NAVY,
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minWidth: 0,
                        flex: 1
                    }}
                >
                    {displayName}
                </Typography>
            </Box>

            <CardContent
                sx={{
                    pt: 0.5,
                    px: 2.25,
                    pb: 2.25,
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minHeight: 0,
                    gap: 0,
                    '&:last-child': {pb: 2.25}
                }}
            >
                <Box
                    sx={{
                        flex: '1 1 auto',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 2,
                        minHeight: {xs: 200, md: 220}
                    }}
                >
                    <Box>
                        {description ? (
                            <Typography
                                sx={{
                                    color: '#475569',
                                    fontSize: {xs: '0.9rem', sm: '0.9375rem'},
                                    fontWeight: 400,
                                    lineHeight: 1.75,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 12,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    wordBreak: 'break-word'
                                }}
                            >
                                {description}
                            </Typography>
                        ) : (
                            <Typography
                                sx={{
                                    color: '#94a3b8',
                                    fontSize: {xs: '0.9rem', sm: '0.9375rem'},
                                    fontStyle: 'italic',
                                    lineHeight: 1.75
                                }}
                            >
                                Đang cập nhật giới thiệu trường.
                            </Typography>
                        )}
                    </Box>

                    <Stack spacing={1.35} sx={{width: '100%'}}>
                        <Box sx={{display: 'flex', alignItems: 'flex-start', gap: 0.75, minWidth: 0}}>
                            <LocationIcon sx={{fontSize: 17, color: '#0f172a', flexShrink: 0, mt: '3px'}} />
                            <Typography
                                sx={{
                                    fontSize: {xs: '0.8125rem', sm: '0.875rem'},
                                    fontWeight: 400,
                                    lineHeight: 1.55,
                                    color: '#0f172a',
                                    wordBreak: 'break-word'
                                }}
                            >
                                {address || 'Đang cập nhật'}
                            </Typography>
                        </Box>
                        <Box sx={{display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0}}>
                            <LanguageIcon sx={{fontSize: 17, color: '#0f172a', flexShrink: 0}} />
                            {website ? (
                                <Link
                                    href={website.startsWith('http') ? website : `https://${website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    sx={{
                                        fontSize: {xs: '0.8125rem', sm: '0.875rem'},
                                        color: BRAND_NAVY,
                                        fontWeight: 600,
                                        textDecoration: 'none',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: '100%',
                                        minWidth: 0,
                                        '&:hover': {color: APP_PRIMARY_DARK, textDecoration: 'underline'}
                                    }}
                                >
                                    {website.replace(/^https?:\/\//i, '')}
                                </Link>
                            ) : (
                                <Typography sx={{fontSize: {xs: '0.8125rem', sm: '0.875rem'}, color: '#0f172a'}}>—</Typography>
                            )}
                        </Box>
                        <Box sx={{display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0}}>
                            <PhoneIcon sx={{fontSize: 17, color: '#0f172a', flexShrink: 0}} />
                            <Typography
                                sx={{
                                    fontSize: {xs: '0.8125rem', sm: '0.875rem'},
                                    fontWeight: 600,
                                    color: '#0f172a',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '100%',
                                    minWidth: 0
                                }}
                            >
                                {phone || '—'}
                            </Typography>
                        </Box>
                    </Stack>
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 0.65,
                        mt: 2.25,
                        pt: 2,
                        flexShrink: 0,
                        borderTop: '1px solid rgba(226, 232, 240, 0.95)'
                    }}
                >
                    <ButtonBase
                        onClick={() => onToggleCompare?.(school)}
                        title={inCompare ? 'Gỡ khỏi so sánh' : 'Thêm vào so sánh'}
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.45,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            borderRadius: 999,
                            py: 0.45,
                            px: 1,
                            border: '1px solid',
                            borderColor: inCompare ? 'rgba(59,130,246,0.45)' : 'rgba(203,213,225,0.95)',
                            color: inCompare ? BRAND_NAVY : '#475569',
                            bgcolor: inCompare ? 'rgba(59,130,246,0.12)' : 'rgba(241,245,249,0.98)',
                            '&:hover': {
                                bgcolor: inCompare ? 'rgba(59,130,246,0.18)' : 'rgba(226,232,240,0.95)',
                                borderColor: inCompare ? 'rgba(59,130,246,0.55)' : 'rgba(148,163,184,0.85)'
                            }
                        }}
                    >
                        {inCompare ? (
                            <CheckCircleIcon sx={{fontSize: 16, color: BRAND_NAVY}} />
                        ) : (
                            <AddIcon sx={{fontSize: 16, color: '#64748b'}} />
                        )}
                        So sánh
                    </ButtonBase>
                    <ButtonBase
                        onClick={() => onToggleSave?.(school)}
                        title={isSaved ? 'Bỏ yêu thích' : 'Thêm vào yêu thích (cần đăng nhập Phụ huynh)'}
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.45,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            borderRadius: 999,
                            py: 0.45,
                            px: 1,
                            border: '1px solid',
                            borderColor: isSaved ? 'rgba(244,63,94,0.45)' : 'rgba(203,213,225,0.95)',
                            color: isSaved ? '#e11d48' : '#475569',
                            bgcolor: isSaved ? 'rgba(244,63,94,0.1)' : 'rgba(241,245,249,0.98)',
                            '&:hover': {
                                bgcolor: isSaved ? 'rgba(244,63,94,0.16)' : 'rgba(226,232,240,0.95)',
                                borderColor: isSaved ? 'rgba(244,63,94,0.55)' : 'rgba(148,163,184,0.85)'
                            }
                        }}
                    >
                        {isSaved ? (
                            <FavoriteIcon sx={{fontSize: 16, color: '#e11d48'}} />
                        ) : (
                            <FavoriteBorderIcon sx={{fontSize: 16, color: '#64748b'}} />
                        )}
                        {isSaved ? 'Đã yêu thích' : 'Yêu thích'}
                    </ButtonBase>
                    <Button
                        size="small"
                        variant="outlined"
                        endIcon={<ArrowForwardIcon sx={{fontSize: 16}} />}
                        onClick={() => onOpenDetail?.(school)}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            borderRadius: 999,
                            px: 2,
                            py: 0.5,
                            fontSize: '0.8125rem',
                            borderColor: 'rgba(59,130,246,0.4)',
                            color: BRAND_NAVY,
                            bgcolor: 'rgba(255,255,255,0.6)',
                            '&:hover': {
                                borderColor: BRAND_NAVY,
                                bgcolor: 'rgba(255,255,255,0.95)'
                            }
                        }}
                    >
                        Xem chi tiết
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
}

function mapHomeSchoolCardToDetailRow(school) {
    if (!school) return null;
    if (school.hasDetailLoaded && school.school) {
        return {
            ...school,
            logoUrl: school.logoUrl || school.cover || DEFAULT_SCHOOL_IMAGE
        };
    }
    const name = school.school || school.name || "Trường đang cập nhật";
    return {
        id: school?.id ?? null,
        school: name,
        province: school?.province || "Hồ Chí Minh",
        ward: school?.ward || "Đang cập nhật",
        website: school?.website || "",
        phone: school?.phone || "",
        email: school?.email || "",
        counsellorEmail: school?.counsellorEmail || "",
        consultantEmails: school?.consultantEmails || [],
        address: school?.address || school?.location || "Đang cập nhật",
        locationLabel: school?.locationLabel || school?.district || "TP.HCM",
        description: school?.description || "",
        averageRating: Number(school?.averageRating ?? school?.rating) || 0,
        totalCampus: school?.totalCampus ?? 0,
        logoUrl: school?.logoUrl || school?.cover || DEFAULT_SCHOOL_IMAGE,
        isFavourite: Boolean(school?.isFavourite),
        foundingDate: school?.foundingDate || "",
        representativeName: school?.representativeName || "",
        campusList: school?.campusList || [],
        curriculumList: school?.curriculumList || [],
        boardingType: school?.boardingType || "",
        primaryCampusId: school?.primaryCampusId ?? null,
        hasDetailLoaded: Boolean(school?.hasDetailLoaded)
    };
}

function LatestAdmissionNewsSection({refreshTrigger = 0}) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [posts, setPosts] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [fetchError, setFetchError] = React.useState(false);
    const [detailPost, setDetailPost] = React.useState(null);
    const n = posts.length;
    const [active, setActive] = React.useState(0);
    const timerRef = React.useRef(null);

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
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
                const mapped = activeOnly.map(mapApiPostToBlogCard);
                if (!cancelled) setPosts(mapped);
            } catch {
                if (!cancelled) {
                    setFetchError(true);
                    setPosts([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [refreshTrigger]);

    const clearTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const goToSlide = React.useCallback(
        (index) => {
            if (n === 0) return;
            clearTimer();
            setActive(((index % n) + n) % n);
            if (n <= 1) return;
            timerRef.current = setInterval(() => {
                setActive((prev) => (prev + 1) % n);
            }, ADMISSION_CAROUSEL_INTERVAL_MS);
        },
        [n]
    );

    React.useEffect(() => {
        if (n === 0) {
            clearTimer();
            return undefined;
        }
        setActive((prev) => (prev >= n ? 0 : prev));
        goToSlide(0);
        return () => clearTimer();
    }, [goToSlide, n]);

    const prevIndex = n === 0 ? 0 : (active - 1 + n) % n;
    const nextIndex = n === 0 ? 0 : (active + 1) % n;

    return (
        <Box
            id="thong-tin-thong-bao"
            sx={{
                pt: {xs: 8, md: 10},
                pb: {xs: 3, md: 4},
                background: 'linear-gradient(180deg, #eff6ff 0%, #e0f2fe 42%, #fbfcfe 100%)',
                scrollMarginTop: '80px',
                position: 'relative'
            }}
        >
            <Container maxWidth="lg" sx={{px: {xs: 2, md: 4}}}>
                <Box
                    sx={{
                        px: {xs: 0, md: 0},
                        py: {xs: 0, md: 0},
                        background: 'transparent',
                        border: 'none',
                        boxShadow: 'none'
                    }}
                >
                <Box sx={{textAlign: 'center', mb: {xs: 5, md: 7}}}>
                    <Typography
                        variant="h3"
                        sx={{
                            fontWeight: 700,
                            mb: 2,
                            color: '#1e293b',
                            fontSize: {xs: '1.85rem', md: '2.45rem'},
                            letterSpacing: '-0.02em'
                        }}
                    >
                        Bảng Tin
                    </Typography>
                </Box>

                {loading ? (
                    <Box sx={{display: 'flex', justifyContent: 'center', py: 6}}>
                        <CircularProgress sx={{color: APP_PRIMARY_MAIN}} />
                    </Box>
                ) : fetchError ? (
                    <Typography align="center" sx={{color: '#64748b', py: 4}}>
                        Không tải được danh sách thông báo. Vui lòng thử lại sau.
                    </Typography>
                ) : n === 0 ? (
                    <Typography align="center" sx={{color: '#64748b', py: 4}}>
                        Chưa có thông báo nào.
                    </Typography>
                ) : n < 3 || isMobile ? (
                    <Box
                        sx={{
                            position: 'relative',
                            maxWidth: {xs: 400, md: 520},
                            mx: 'auto'
                        }}
                    >
                        <Box
                            sx={{
                                transition: `opacity ${ADMISSION_ANIM_MS}ms ${admissionEase}, transform ${ADMISSION_ANIM_MS}ms ${admissionEase}`,
                                opacity: 1,
                                transform: 'translateY(0) scale(1)'
                            }}
                            key={posts[active]?.id ?? active}
                        >
                            <BlogCard
                                {...posts[active]}
                                variant="featured"
                                onOpenDetail={() => setDetailPost(posts[active])}
                            />
                        </Box>
                        {n > 1 ? (
                            <>
                                <IconButton
                                    onClick={() => goToSlide(active - 1)}
                                    sx={{
                                        position: 'absolute',
                                        left: -8,
                                        top: '42%',
                                        bgcolor: 'rgba(255,255,255,0.92)',
                                        boxShadow: landingSectionShadow(3),
                                        '&:hover': {bgcolor: '#fff'}
                                    }}
                                    aria-label="Tin trước"
                                >
                                    <ChevronLeftIcon />
                                </IconButton>
                                <IconButton
                                    onClick={() => goToSlide(active + 1)}
                                    sx={{
                                        position: 'absolute',
                                        right: -8,
                                        top: '42%',
                                        bgcolor: 'rgba(255,255,255,0.92)',
                                        boxShadow: landingSectionShadow(3),
                                        '&:hover': {bgcolor: '#fff'}
                                    }}
                                    aria-label="Tin sau"
                                >
                                    <ChevronRightIcon />
                                </IconButton>
                            </>
                        ) : null}
                    </Box>
                ) : (
                    <Box
                        sx={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'stretch',
                            justifyContent: 'center',
                            gap: {md: 2, lg: 3},
                            minHeight: 420,
                            perspective: '1200px'
                        }}
                    >
                        <Box
                            onClick={() => goToSlide(prevIndex)}
                            sx={{
                                flex: '0 1 26%',
                                maxWidth: 300,
                                cursor: 'pointer',
                                alignSelf: 'center',
                                transition: `transform ${ADMISSION_ANIM_MS}ms ${admissionEase}, opacity ${ADMISSION_ANIM_MS}ms ${admissionEase}`,
                                transform: 'translateX(0) scale(0.88)',
                                opacity: 0.55,
                                zIndex: 1,
                                '&:hover': {opacity: 0.75}
                            }}
                        >
                            <BlogCard
                                {...posts[prevIndex]}
                                variant="side"
                                onOpenDetail={() => setDetailPost(posts[prevIndex])}
                            />
                        </Box>
                        <Box
                            key={posts[active]?.id ?? active}
                            sx={{
                                flex: '0 1 43%',
                                maxWidth: 390,
                                zIndex: 3,
                                transform: 'translateY(-8px) scale(1)',
                                opacity: 1,
                                '@keyframes admissionCenterIn': {
                                    from: {
                                        opacity: 0.5,
                                        transform: 'translateY(28px) scale(0.94)'
                                    },
                                    to: {
                                        opacity: 1,
                                        transform: 'translateY(-8px) scale(1)'
                                    }
                                },
                                animation: `admissionCenterIn ${ADMISSION_ANIM_MS}ms ${admissionEase} both`
                            }}
                        >
                            <BlogCard
                                {...posts[active]}
                                variant="featured"
                                onOpenDetail={() => setDetailPost(posts[active])}
                            />
                        </Box>
                        <Box
                            onClick={() => goToSlide(nextIndex)}
                            sx={{
                                flex: '0 1 26%',
                                maxWidth: 300,
                                cursor: 'pointer',
                                alignSelf: 'center',
                                transition: `transform ${ADMISSION_ANIM_MS}ms ${admissionEase}, opacity ${ADMISSION_ANIM_MS}ms ${admissionEase}`,
                                transform: 'translateX(0) scale(0.88)',
                                opacity: 0.55,
                                zIndex: 1,
                                '&:hover': {opacity: 0.75}
                            }}
                        >
                            <BlogCard
                                {...posts[nextIndex]}
                                variant="side"
                                onOpenDetail={() => setDetailPost(posts[nextIndex])}
                            />
                        </Box>
                    </Box>
                )}

                {!loading && !fetchError && n > 0 ? (
                    <Stack direction="row" spacing={1} justifyContent="center" sx={{mt: {xs: 3, md: 3.5}}}>
                        {posts.map((p, i) => (
                            <Box
                                key={p.id ?? i}
                                onClick={() => goToSlide(i)}
                                sx={{
                                    width: i === active ? 28 : 9,
                                    height: 9,
                                    borderRadius: 999,
                                    bgcolor: i === active ? APP_PRIMARY_MAIN : 'rgba(51,65,85,0.18)',
                                    cursor: 'pointer',
                                    transition: `all ${ADMISSION_ANIM_MS * 0.5}ms ${admissionEase}`
                                }}
                            />
                        ))}
                    </Stack>
                ) : null}
                <Dialog
                    open={Boolean(detailPost)}
                    onClose={() => setDetailPost(null)}
                    fullWidth
                    maxWidth="md"
                >
                    <DialogTitle sx={{fontWeight: 800}}>
                        {detailPost?.title || "Chi tiết bài viết"}
                    </DialogTitle>
                    <DialogContent dividers sx={{pt: 2}}>
                        {detailPost?.image ? (
                            <Box
                                component="img"
                                src={detailPost.image}
                                alt={detailPost.title || ""}
                                referrerPolicy="no-referrer"
                                sx={{
                                    width: "100%",
                                    maxHeight: 320,
                                    objectFit: "cover",
                                    borderRadius: 2,
                                    mb: 2
                                }}
                            />
                        ) : null}
                        <Typography sx={{fontSize: "0.85rem", color: "#64748b", mb: 1.5}}>
                            {detailPost?.date}
                        </Typography>
                        {Array.isArray(detailPost?.contentBlocks) && detailPost.contentBlocks.length > 0 ? (
                            detailPost.contentBlocks.map((block, idx) => (
                                <Box
                                    key={`${detailPost?.id ?? "post"}-${idx}`}
                                    sx={{
                                        color: "#334155",
                                        fontSize: "1rem",
                                        lineHeight: 1.75,
                                        mb: 1.5,
                                        "& p": {my: 1},
                                        "& ul, & ol": {pl: 2.5, my: 1},
                                        "& li": {my: 0.35}
                                    }}
                                    dangerouslySetInnerHTML={{__html: block}}
                                />
                            ))
                        ) : (
                            <Typography sx={{color: "#64748b"}}>
                                {detailPost?.description || "Bài viết chưa có nội dung chi tiết."}
                            </Typography>
                        )}
                        {Array.isArray(detailPost?.detailImages) && detailPost.detailImages.length > 0 ? (
                            <Box
                                sx={{
                                    mt: 1,
                                    display: "grid",
                                    gridTemplateColumns: {xs: "1fr", sm: "repeat(2, minmax(0, 1fr))"},
                                    gap: 1.25
                                }}
                            >
                                {detailPost.detailImages.map((imgUrl, idx) => (
                                    <Box
                                        key={`${detailPost?.id ?? "post"}-detail-image-${idx}`}
                                        component="img"
                                        src={imgUrl}
                                        alt=""
                                        referrerPolicy="no-referrer"
                                        sx={{
                                            width: "100%",
                                            borderRadius: 2,
                                            maxHeight: 300,
                                            objectFit: "cover",
                                            border: "1px solid rgba(148, 163, 184, 0.3)"
                                        }}
                                    />
                                ))}
                            </Box>
                        ) : null}
                        {Array.isArray(detailPost?.tags) && detailPost.tags.length > 0 ? (
                            <Box sx={{display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1}}>
                                {detailPost.tags.map((tag) => (
                                    <Chip key={tag} size="small" label={tag} />
                                ))}
                            </Box>
                        ) : null}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDetailPost(null)} sx={{textTransform: "none", fontWeight: 700}}>
                            Đóng
                        </Button>
                    </DialogActions>
                </Dialog>
                </Box>
            </Container>
        </Box>
    );
}

const carouselCtaEase = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

function HomeTopPromoCarousel({isSignedIn, onRegisterClick, navigate}) {
    const slides = TOP_PROMO_SLIDES;
    const n = slides.length;
    const extendedSlides = React.useMemo(() => {
        if (n <= 1) return slides;
        return [slides[n - 1], ...slides, slides[0]];
    }, [slides, n]);
    const len = extendedSlides.length;

    const [slideIndex, setSlideIndex] = React.useState(n <= 1 ? 0 : 1);
    const [noTransition, setNoTransition] = React.useState(false);
    const timerRef = React.useRef(null);
    const slideIndexRef = React.useRef(slideIndex);

    React.useEffect(() => {
        slideIndexRef.current = slideIndex;
    }, [slideIndex]);

    const clearTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const restartTimer = React.useCallback(() => {
        clearTimer();
        if (n <= 1) return;
        timerRef.current = setInterval(() => {
            setSlideIndex((si) => (si >= len - 1 ? si : si + 1));
        }, TOP_PROMO_CAROUSEL_INTERVAL_MS);
    }, [n, len]);

    const advanceOneLeft = React.useCallback(() => {
        setSlideIndex((si) => (si >= len - 1 ? si : si + 1));
    }, [len]);

    const handleTrackTransitionEnd = React.useCallback(
        (e) => {
            if (e.propertyName !== 'transform') return;
            if (slideIndexRef.current !== len - 1) return;
            setNoTransition(true);
            setSlideIndex(1);
        },
        [len]
    );

    React.useLayoutEffect(() => {
        if (!noTransition) return;
        const id = requestAnimationFrame(() => {
            setNoTransition(false);
        });
        return () => cancelAnimationFrame(id);
    }, [noTransition]);

    React.useEffect(() => {
        restartTimer();
        return () => clearTimer();
    }, [restartTimer]);

    return (
        <Box
            component="section"
            aria-label="Banner tuyển sinh"
            sx={{
                width: '100%',
                pt: 0,
                pb: 0,
                px: 0,
                mx: 0,
                mt: 0,
                position: 'relative',
                zIndex: 1,
                isolation: 'isolate',
                bgcolor: 'transparent',
                backgroundImage: 'none'
            }}
        >
            <Box sx={{width: '100%', maxWidth: '100%', px: 0, mx: 0}}>
                <Box
                    sx={{
                        position: 'relative',
                        width: '100%',
                        overflow: 'hidden',
                        borderRadius: 0,
                        boxShadow: 'none',
                        border: 'none',
                        bgcolor: 'transparent',
                        pb: 0
                    }}
                >
                    <Box
                        onTransitionEnd={n <= 1 ? undefined : handleTrackTransitionEnd}
                        sx={{
                            display: 'flex',
                            width: n <= 1 ? '100%' : `${len * 100}%`,
                            transform:
                                n <= 1
                                    ? 'none'
                                    : `translateX(-${(slideIndex * 100) / len}%)`,
                            transition: noTransition
                                ? 'none'
                                : `transform ${TOP_PROMO_SLIDE_MS}ms ${TOP_PROMO_SLIDE_EASE}`
                        }}
                    >
                        {extendedSlides.map((slide, idx) => (
                            <Box
                                key={`${idx}-${slide.src}`}
                                sx={{
                                    width: n <= 1 ? '100%' : `${100 / len}%`,
                                    flexShrink: 0
                                }}
                            >
                                <Box
                                    component="img"
                                    src={slide.src}
                                    alt={slide.alt}
                                    sx={{
                                        width: '100%',
                                        height: 'auto',
                                        display: 'block',
                                        verticalAlign: 'bottom'
                                    }}
                                />
                            </Box>
                        ))}
                    </Box>
                    <Stack
                        direction={{xs: 'column', sm: 'row'}}
                        spacing={1.5}
                        sx={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: {xs: 'min(10%, 52px)', sm: 'min(9%, 50px)', md: 'min(8%, 46px)'},
                            px: {xs: 2, sm: 3},
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 4,
                            pointerEvents: 'none',
                            '& .MuiButton-root': {pointerEvents: 'auto'}
                        }}
                    >
                        {!isSignedIn && (
                            <Button
                                variant="contained"
                                size="large"
                                onClick={onRegisterClick}
                                sx={{
                                    bgcolor: BRAND_NAVY,
                                    color: '#fff',
                                    px: 3,
                                    py: 1.1,
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    borderRadius: 999,
                                    textTransform: 'none',
                                    boxShadow: '0 12px 28px rgba(30, 58, 138, 0.35)',
                                    minWidth: {xs: 'min(100%, 280px)', sm: 200},
                                    transition: `transform 0.35s ${carouselCtaEase}, box-shadow 0.35s ease, background-color 0.25s ease`,
                                    '&:hover': {
                                        bgcolor: APP_PRIMARY_DARK,
                                        boxShadow: '0 16px 36px rgba(30, 58, 138, 0.42)',
                                        transform: 'translateY(-2px)'
                                    }
                                }}
                            >
                                Đăng ký miễn phí
                            </Button>
                        )}
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<SearchIcon sx={{color: 'inherit'}}/>}
                            onClick={() => navigate('/search-schools')}
                            sx={{
                                borderRadius: 999,
                                textTransform: 'none',
                                fontWeight: 700,
                                px: 2.75,
                                py: 1.1,
                                fontSize: '0.9rem',
                                color: BRAND_NAVY,
                                bgcolor: '#dbeafe',
                                border: `2px solid ${BRAND_SKY}`,
                                boxShadow: '0 8px 22px rgba(37, 99, 235, 0.14)',
                                minWidth: {xs: 'min(100%, 280px)', sm: 200},
                                '&:hover': {
                                    bgcolor: '#bfdbfe',
                                    borderColor: BRAND_NAVY,
                                    boxShadow: '0 10px 26px rgba(37, 99, 235, 0.2)'
                                }
                            }}
                        >
                            Tìm trường ngay
                        </Button>
                    </Stack>
                    <IconButton
                        onClick={() => {
                            if (n <= 1) return;
                            clearTimer();
                            advanceOneLeft();
                            restartTimer();
                        }}
                        size="small"
                        aria-label="Banner trước"
                        sx={{
                            position: 'absolute',
                            left: {xs: 4, sm: 10},
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 5,
                            bgcolor: 'rgba(255,255,255,0.9)',
                            boxShadow: landingSectionShadow(2),
                            '&:hover': {bgcolor: '#fff'}
                        }}
                    >
                        <ChevronLeftIcon fontSize="small"/>
                    </IconButton>
                    <IconButton
                        onClick={() => {
                            if (n <= 1) return;
                            clearTimer();
                            advanceOneLeft();
                            restartTimer();
                        }}
                        size="small"
                        aria-label="Banner sau"
                        sx={{
                            position: 'absolute',
                            right: {xs: 4, sm: 10},
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 5,
                            bgcolor: 'rgba(255,255,255,0.9)',
                            boxShadow: landingSectionShadow(2),
                            '&:hover': {bgcolor: '#fff'}
                        }}
                    >
                        <ChevronRightIcon fontSize="small"/>
                    </IconButton>
                </Box>
            </Box>
        </Box>
    );
}

function readSignedInRoleFlags() {
    try {
        if (typeof window === "undefined") {
            return {signedIn: false, admin: false, school: false, parent: false};
        }
        const raw = localStorage.getItem("user");
        if (!raw) return {signedIn: false, admin: false, school: false, parent: false};
        const user = JSON.parse(raw);
        const r = normalizeUserRole(user.role ?? "");
        return {signedIn: true, admin: r === "ADMIN", school: r === "SCHOOL", parent: r === "PARENT"};
    } catch {
        return {signedIn: false, admin: false, school: false, parent: false};
    }
}

export default function HomePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [homeSchools, setHomeSchools] = React.useState([]);
    const [schoolLoading, setSchoolLoading] = React.useState(true);
    const [authSnapshot] = React.useState(() => readSignedInRoleFlags());
    const [isSignedIn, setIsSignedIn] = React.useState(authSnapshot.signedIn);
    const [isAdminRole, setIsAdminRole] = React.useState(authSnapshot.admin);
    const [isSchoolRole, setIsSchoolRole] = React.useState(authSnapshot.school);
    const [isParentRole, setIsParentRole] = React.useState(authSnapshot.parent);
    const [schoolServicePackages, setSchoolServicePackages] = React.useState([]);
    const [servicePackagesLoading, setServicePackagesLoading] = React.useState(false);
    const [buyNowLoadingPackageId, setBuyNowLoadingPackageId] = React.useState(null);
    const [showParentFormModal, setShowParentFormModal] = React.useState(false);
    const [isSubmittingParentForm, setIsSubmittingParentForm] = React.useState(false);
    const [selectedSchoolDetail, setSelectedSchoolDetail] = React.useState(null);
    const [schoolDetailLoading, setSchoolDetailLoading] = React.useState(false);
    const [schoolDetailError, setSchoolDetailError] = React.useState("");
    const submitRef = React.useRef(false);
    const [parentFormData, setParentFormData] = React.useState({
        occupation: '',
        gender: '',
        name: '',
        phone: '',
        idCardNumber: '',
        relationship: '',
        workplace: '',
        currentAddress: ''
    });
    const userInfo = React.useMemo(() => {
        try {
            const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }, [isSignedIn]);
    const userIdentity = getUserIdentity(userInfo);
    const [compareSchoolKeys, setCompareSchoolKeys] = React.useState(() => new Set());
    const [favouriteIdBySchool, setFavouriteIdBySchool] = React.useState({});

    React.useEffect(() => {
        const list = getCompareSchools(userInfo);
        setCompareSchoolKeys(new Set(list.map((x) => x?.schoolKey).filter(Boolean)));
    }, [userIdentity]);

    const showcaseSchools = React.useMemo(
        () => [...homeSchools].sort((a, b) => (Number(b.rating ?? b.averageRating) || 0) - (Number(a.rating ?? a.averageRating) || 0)).slice(0, 6),
        [homeSchools]
    );
    const maptilerApiKey = import.meta.env.VITE_MAPTILER_API_KEY ?? "";
    const isParent = isParentRole;
    const canSaveSchool = Boolean(isParentRole && userInfo);

    const syncFavouriteLookup = React.useCallback(async () => {
        if (!isParentRole) {
            setFavouriteIdBySchool({});
            return null;
        }
        try {
            const res = await getParentFavouriteSchools(0, FAVOURITE_SYNC_PAGE_SIZE);
            const items = parseFavouriteListPayload(res);
            const nextMap = buildFavouriteIdBySchool(items);
            setFavouriteIdBySchool(nextMap);
            return nextMap;
        } catch {
            return null;
        }
    }, [isParentRole]);

    const toggleCompare = React.useCallback(
        (schoolRecord) => {
            const schoolKey = getSchoolStorageKey(schoolRecord);
            const current = getCompareSchools(userInfo);
            const exists = current.some((x) => x?.schoolKey === schoolKey);
            let next;
            if (exists) {
                next = current.filter((x) => x?.schoolKey !== schoolKey);
            } else {
                if (current.length >= MAX_COMPARE_SCHOOLS) {
                    showWarningSnackbar(`Chỉ được chọn tối đa ${MAX_COMPARE_SCHOOLS} trường để so sánh.`);
                    return;
                }
                next = [
                    ...current,
                    {
                        schoolKey,
                        schoolName: schoolRecord.school || schoolRecord.name,
                        province: schoolRecord.province,
                        ward: schoolRecord.ward,
                        locationLabel: schoolRecord.locationLabel,
                        gradeLevel: schoolRecord.gradeLevel,
                        schoolType: schoolRecord.schoolType
                    }
                ];
            }
            setCompareSchools(userInfo, next);
            setCompareSchoolKeys(new Set(next.map((x) => x?.schoolKey).filter(Boolean)));
            showSuccessSnackbar(exists ? "Đã gỡ trường khỏi so sánh." : "Đã thêm vào danh sách so sánh.");
        },
        [userInfo]
    );

    const toggleSave = React.useCallback(
        async (schoolRecord) => {
            if (!isParentRole || !userInfo) {
                showWarningSnackbar("Bạn phải đăng nhập với vai trò Phụ huynh để yêu thích trường.");
                return;
            }
            const rawId =
                schoolRecord?.schoolId ??
                schoolRecord?.id ??
                (String(schoolRecord?.schoolKey || "").startsWith("id:")
                    ? String(schoolRecord.schoolKey).slice(3)
                    : null);
            const schoolId = Number(rawId);
            if (!Number.isFinite(schoolId)) {
                showWarningSnackbar("Không xác định được trường để cập nhật yêu thích.");
                return;
            }
            let favouriteId = Number(favouriteIdBySchool[schoolId]);
            const exists = Boolean(
                (Number(selectedSchoolDetail?.id) === schoolId ? selectedSchoolDetail?.isFavourite : undefined) ??
                    homeSchools.find((s) => Number(s?.id) === schoolId)?.isFavourite ??
                    schoolRecord?.isFavourite ??
                    Number.isFinite(favouriteId)
            );
            try {
                if (exists) {
                    if (!Number.isFinite(favouriteId)) {
                        const refreshed = await syncFavouriteLookup();
                        favouriteId = Number(refreshed?.[schoolId]);
                    }
                    if (!Number.isFinite(favouriteId)) {
                        showWarningSnackbar("Không tìm thấy id yêu thích để bỏ yêu thích.");
                        return;
                    }
                    await deleteParentFavouriteSchool(favouriteId);
                } else {
                    await postParentFavouriteSchool({schoolId});
                }
            } catch (e) {
                const msg =
                    e?.response?.data?.message ||
                    e?.message ||
                    "Không thể cập nhật trạng thái yêu thích trường lúc này. Vui lòng thử lại.";
                showWarningSnackbar(msg);
                return;
            }
            setHomeSchools((prev) =>
                prev.map((item) =>
                    Number(item?.id) === schoolId
                        ? {
                              ...item,
                              isFavourite: !exists
                          }
                        : item
                )
            );
            if (Number(selectedSchoolDetail?.id) === schoolId) {
                setSelectedSchoolDetail((prev) => (prev ? {...prev, isFavourite: !exists} : prev));
            }
            await syncFavouriteLookup();
            showSuccessSnackbar(exists ? "Đã bỏ trường khỏi Trường yêu thích." : "Đã thêm trường vào Trường yêu thích.");
        },
        [
            isParentRole,
            userInfo,
            favouriteIdBySchool,
            selectedSchoolDetail,
            homeSchools,
            syncFavouriteLookup
        ]
    );

    const detailKeyRaw = selectedSchoolDetail?.id ? String(selectedSchoolDetail.id) : "";
    const detailKeyForActions = selectedSchoolDetail ? getSchoolStorageKey(selectedSchoolDetail) : "";
    const detailIsSaved = Boolean(selectedSchoolDetail?.isFavourite);
    const detailInCompare = Boolean(selectedSchoolDetail && compareSchoolKeys.has(detailKeyForActions));

    const loadSchoolDetailForHome = React.useCallback(async (schoolId, fallbackCard = null) => {
        if (!schoolId) return;
        setSchoolDetailError("");
        setSchoolDetailLoading(true);
        setSelectedSchoolDetail(mapHomeSchoolCardToDetailRow(fallbackCard || {id: schoolId}));
        try {
            const detail = await getPublicSchoolDetail(schoolId);
            const mapped = mapPublicSchoolDetailToRow(detail);
            if (mapped) {
                setSelectedSchoolDetail(mapped);
            } else if (fallbackCard) {
                setSelectedSchoolDetail(mapHomeSchoolCardToDetailRow(fallbackCard));
            }
        } catch (error) {
            setSchoolDetailError(error?.response?.data?.message || "Không tải được chi tiết trường.");
        } finally {
            setSchoolDetailLoading(false);
        }
    }, []);

    const handleOpenSchoolDetail = React.useCallback(async (school) => {
        if (!school?.id) return;
        await loadSchoolDetailForHome(school.id, school);
    }, [loadSchoolDetailForHome]);

    const closeSchoolDetailDialog = React.useCallback(() => {
        setSelectedSchoolDetail(null);
        setSchoolDetailLoading(false);
        setSchoolDetailError("");
    }, []);

    const consultSectionRef = React.useRef(null);
    const [consultVisible, setConsultVisible] = React.useState(false);
    const servicePackagesSectionRef = React.useRef(null);
    const [servicePackagesVisible, setServicePackagesVisible] = React.useState(false);
    const aboutSectionRef = React.useRef(null);
    const [aboutVisible, setAboutVisible] = React.useState(false);
    const testimonialSectionRef = React.useRef(null);
    const [testimonialsVisible, setTestimonialsVisible] = React.useState(false);
    const consultMotionEase = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
    const consultStaggerMs = 130;
    const consultIcons = [HeadsetMicIcon, CalendarMonthIcon, SmartToyIcon];

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            setSchoolLoading(true);
            try {
                const rows = await getPublicSchoolList();
                if (cancelled) return;
                const list = Array.isArray(rows) ? rows : [];
                if (list.length === 0) {
                    setHomeSchools([]);
                    return;
                }
                const light = list.map((item) => ({
                    id: item.id,
                    name: item.name || "Trường đang cập nhật",
                    rating: typeof item.averageRating === "number" ? item.averageRating : 0,
                    cover: item.logoUrl || DEFAULT_SCHOOL_IMAGE
                }));
                const top6 = [...light]
                    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
                    .slice(0, 6);
                const enriched = await Promise.all(
                    top6.map(async (s) => {
                        if (!s.id) {
                            return {
                                id: null,
                                school: s.name,
                                name: s.name,
                                rating: s.rating,
                                cover: s.cover,
                                logoUrl: s.cover,
                                hasDetailLoaded: false
                            };
                        }
                        try {
                            const detailBody = await getPublicSchoolDetail(s.id);
                            const mapped = mapPublicSchoolDetailToRow(detailBody);
                            if (!mapped) {
                                return {
                                    id: s.id,
                                    school: s.name,
                                    name: s.name,
                                    rating: s.rating,
                                    cover: s.cover,
                                    logoUrl: s.cover,
                                    hasDetailLoaded: false,
                                    address: "",
                                    description: "",
                                    website: "",
                                    phone: "",
                                    province: "Hồ Chí Minh",
                                    ward: "Đang cập nhật",
                                    locationLabel: "TP.HCM"
                                };
                            }
                            return {
                                ...mapped,
                                name: mapped.school,
                                cover: mapped.logoUrl || s.cover,
                                rating:
                                    typeof mapped.averageRating === "number" ? mapped.averageRating : s.rating
                            };
                        } catch {
                            return {
                                id: s.id,
                                school: s.name,
                                name: s.name,
                                rating: s.rating,
                                cover: s.cover,
                                logoUrl: s.cover,
                                hasDetailLoaded: false,
                                address: "",
                                description: "",
                                website: "",
                                phone: "",
                                province: "Hồ Chí Minh",
                                ward: "Đang cập nhật",
                                locationLabel: "TP.HCM"
                            };
                        }
                    })
                );
                if (!cancelled) setHomeSchools(enriched);
            } catch {
                if (!cancelled) {
                    setHomeSchools([]);
                }
            } finally {
                if (!cancelled) setSchoolLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    React.useEffect(() => {
        if (!isParentRole || schoolLoading || homeSchools.length === 0) return;
        let cancelled = false;
        (async () => {
            const map = await syncFavouriteLookup();
            if (cancelled || !map) return;
            setHomeSchools((prev) =>
                prev.map((s) => ({
                    ...s,
                    isFavourite: Number.isFinite(Number(map[Number(s.id)]))
                }))
            );
        })();
        return () => {
            cancelled = true;
        };
    }, [isParentRole, schoolLoading, homeSchools.length, syncFavouriteLookup]);

    const syncUserRoleFlags = React.useCallback(() => {
        const userData = localStorage.getItem('user');
        setIsSignedIn(Boolean(userData));
        if (userData) {
            try {
                const user = JSON.parse(userData);
                const r = normalizeUserRole(user.role ?? "");
                setIsAdminRole(r === "ADMIN");
                setIsSchoolRole(r === "SCHOOL");
                setIsParentRole(r === "PARENT");
            } catch (e) {
                console.error('Error parsing user data:', e);
                setIsAdminRole(false);
                setIsSchoolRole(false);
                setIsParentRole(false);
            }
        } else {
            setIsAdminRole(false);
            setIsSchoolRole(false);
            setIsParentRole(false);
        }
    }, []);

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!localStorage.getItem('user')) return;
            await syncLocalUserWithAccess();
            if (!cancelled) syncUserRoleFlags();
        })();
        return () => {
            cancelled = true;
        };
    }, [syncUserRoleFlags]);

    React.useEffect(() => {
        syncUserRoleFlags();
        try {
            const raw = localStorage.getItem('user');
            if (raw) {
                const user = JSON.parse(raw);
                if (normalizeUserRole(user.role ?? "") === "PARENT" && user.firstLogin === true) {
                    setShowParentFormModal(true);
                }
            }
        } catch {
            void 0;
        }

        const smoothScrollToElement = (element, headerHeight) => {
            const rect = element.getBoundingClientRect();
            const offsetPosition = rect.top + window.pageYOffset - headerHeight;
            const startPosition = window.pageYOffset;
            const distance = offsetPosition - startPosition;
            const duration = Math.min(Math.max(Math.abs(distance) * 0.9, 400), 1400);
            let start = null;

            const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

            const step = (timestamp) => {
                if (!start) start = timestamp;
                const progress = timestamp - start;
                const progressPercent = Math.min(progress / duration, 1);
                const eased = easeOutCubic(progressPercent);

                window.scrollTo(0, startPosition + distance * eased);

                if (progress < duration) {
                    requestAnimationFrame(step);
                }
            };

            requestAnimationFrame(step);
        };

        const handleHashNavigation = () => {
            const hash = window.location.hash.replace('#', '');
            if (hash) {
                setTimeout(() => {
                    const element = document.getElementById(hash);
                    if (element) {
                        const headerHeight = 80;
                        smoothScrollToElement(element, headerHeight);
                    }
                }, 100);
            }
        };

        handleHashNavigation();

        window.addEventListener('hashchange', handleHashNavigation);
        return () => window.removeEventListener('hashchange', handleHashNavigation);
    }, [syncUserRoleFlags]);

    React.useEffect(() => {
        const onFocus = () => syncUserRoleFlags();
        const onStorage = (e) => {
            if (e.key === 'user' || e.key == null) syncUserRoleFlags();
        };
        window.addEventListener('focus', onFocus);
        window.addEventListener('storage', onStorage);
        return () => {
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('storage', onStorage);
        };
    }, [syncUserRoleFlags]);

    React.useEffect(() => {
        syncUserRoleFlags();
    }, [location.pathname, syncUserRoleFlags]);

    React.useEffect(() => {
        if (!isSchoolRole) {
            setSchoolServicePackages([]);
            return;
        }

        let cancelled = false;
        (async () => {
            setServicePackagesLoading(true);
            try {
                const res = await getAdminPackageFees();
                const raw = Array.isArray(res?.data?.body) ? res.data.body : [];
                const activePackages = raw.filter(
                    (item) => String(item?.status || "").trim().toUpperCase() === "PACKAGE_ACTIVE"
                );
                if (!cancelled) setSchoolServicePackages(activePackages);
            } catch (error) {
                console.error(error);
                if (!cancelled) {
                    setSchoolServicePackages([]);
                    enqueueSnackbar("Không thể tải danh sách gói dịch vụ.", {variant: "error"});
                }
            } finally {
                if (!cancelled) setServicePackagesLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isSchoolRole]);

    React.useEffect(() => {
        const el = consultSectionRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => {
                setConsultVisible(entry.isIntersecting);
            },
            {root: null, rootMargin: '-6% 0px -10% 0px', threshold: 0.12}
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    React.useEffect(() => {
        const el = servicePackagesSectionRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setServicePackagesVisible(true);
                    obs.disconnect();
                }
            },
            {root: null, rootMargin: '-4% 0px -8% 0px', threshold: 0.1}
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [isSchoolRole]);

    React.useEffect(() => {
        const el = testimonialSectionRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => {
                setTestimonialsVisible(entry.isIntersecting);
            },
            {root: null, rootMargin: '-10% 0px -12% 0px', threshold: 0.18}
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    React.useEffect(() => {
        const el = aboutSectionRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => {
                setAboutVisible(entry.isIntersecting);
            },
            {root: null, rootMargin: '-8% 0px -12% 0px', threshold: 0.14}
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    const handleRegisterClick = () => {
        window.location.href = '/register';
    };

    const handleSchoolPackageBuyNow = React.useCallback(async (pkg) => {
        const packageId = Number(pkg?.id);
        if (!Number.isFinite(packageId) || packageId <= 0) {
            enqueueSnackbar("Không xác định được gói dịch vụ.", {variant: "error"});
            return;
        }
        const description = pkg?.name?.trim()
            ? `Thanh toán gói ${pkg.name.trim()}`
            : "Thanh toán gói dịch vụ";
        setBuyNowLoadingPackageId(packageId);
        try {
            const res = await createSchoolSubscriptionPayment({packageId, description});
            const paymentUrl = res?.data?.body;
            if (typeof paymentUrl === "string" && /^https?:\/\//i.test(paymentUrl.trim())) {
                const url = paymentUrl.trim();
                const w = window.open(url, "_blank");
                if (w) {
                    try {
                        w.opener = null;
                    } catch {
                    }
                } else {
                    enqueueSnackbar("Không mở được tab mới. Đang chuyển trong tab hiện tại.", {variant: "warning"});
                    window.location.assign(url);
                }
                return;
            }
            enqueueSnackbar(
                typeof res?.data?.message === "string" ? res.data.message : "Không nhận được liên kết thanh toán.",
                {variant: "warning"}
            );
        } catch (error) {
            const raw =
                error?.response?.data?.message ??
                error?.response?.data?.body ??
                error?.message;
            const msg = typeof raw === "string" ? raw : "Không thể tạo liên kết thanh toán.";
            enqueueSnackbar(msg, {variant: "error"});
        } finally {
            setBuyNowLoadingPackageId(null);
        }
    }, []);

    const handleParentFormChange = (field) => (event) => {
        setParentFormData({
            ...parentFormData,
            [field]: event.target.value
        });
    };

    const handleParentFormSubmit = async () => {
        if (isSubmittingParentForm || submitRef.current) {
            return;
        }
        
        submitRef.current = true;

        if (!parentFormData.idCardNumber || !parentFormData.idCardNumber.trim()) {
            enqueueSnackbar('Vui lòng nhập số CMND/CCCD', {variant: 'error'});
            return;
        }
        if (!parentFormData.name || !parentFormData.name.trim()) {
            enqueueSnackbar('Vui lòng nhập họ và tên', {variant: 'error'});
            return;
        }
        if (!parentFormData.phone || !parentFormData.phone.trim()) {
            enqueueSnackbar('Vui lòng nhập số điện thoại', {variant: 'error'});
            return;
        }
        if (!parentFormData.gender) {
            enqueueSnackbar('Vui lòng chọn giới tính', {variant: 'error'});
            return;
        }
        if (!parentFormData.relationship) {
            enqueueSnackbar('Vui lòng chọn mối quan hệ với học sinh', {variant: 'error'});
            return;
        }
        if (!parentFormData.occupation || !parentFormData.occupation.trim()) {
            enqueueSnackbar('Vui lòng nhập nghề nghiệp', {variant: 'error'});
            return;
        }
        if (!parentFormData.workplace || !parentFormData.workplace.trim()) {
            enqueueSnackbar('Vui lòng nhập nơi làm việc', {variant: 'error'});
            return;
        }
        if (!parentFormData.currentAddress || !parentFormData.currentAddress.trim()) {
            enqueueSnackbar('Vui lòng nhập địa chỉ hiện tại', {variant: 'error'});
            return;
        }

        setIsSubmittingParentForm(true);

        try {
            const profilePayload = {
                parentData: {
                    idCardNumber: parentFormData.idCardNumber.trim(),
                },
                gender: parentFormData.gender,
                name: parentFormData.name.trim(),
                phone: parentFormData.phone.trim(),
                relationship: parentFormData.relationship,
                workplace: parentFormData.workplace.trim(),
                occupation: parentFormData.occupation.trim(),
                currentAddress: parentFormData.currentAddress.trim(),
                idCardNumber: parentFormData.idCardNumber.trim(),
            };

            const response = await updateProfile(profilePayload);
            
            if (response && response.status === 200) {
                enqueueSnackbar('Cập nhật thông tin thành công!', {variant: 'success'});
                const userData = localStorage.getItem('user');
                if (userData) {
                    try {
                        const user = JSON.parse(userData);
                        user.firstLogin = false;
                        localStorage.setItem('user', JSON.stringify(sanitizeUserForLocalStorage(user)));
                        notifyAuthUserStorageChanged();
                    } catch (e) {
                        console.error('Error updating user data:', e);
                    }
                }
                setShowParentFormModal(false);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            const errorMessage = error?.response?.data?.message || error?.message || 'Có lỗi xảy ra khi cập nhật thông tin. Vui lòng thử lại.';
            enqueueSnackbar(errorMessage, {variant: 'error'});
        } finally {
            setIsSubmittingParentForm(false);
            submitRef.current = false;
        }
    };

    const handleParentFormClose = () => {
        setShowParentFormModal(false);
    };

    const showHeadCreatePost = isSignedIn && (isAdminRole || isSchoolRole);

    if (selectedSchoolDetail) {
        return (
            <SchoolSearchDetailView
                school={selectedSchoolDetail}
                detailKeyRaw={detailKeyRaw}
                detailLoading={schoolDetailLoading}
                detailError={schoolDetailError}
                maptilerApiKey={maptilerApiKey}
                onSearchNearbyCampuses={searchNearbyCampuses}
                onOpenSchoolById={async (schoolId) => {
                    const target = homeSchools.find((s) => Number(s?.id) === Number(schoolId)) || null;
                    await loadSchoolDetailForHome(schoolId, target);
                }}
                onClose={closeSchoolDetailDialog}
                navigate={navigate}
                isParent={isParent}
                canSaveSchool={canSaveSchool}
                detailIsSaved={detailIsSaved}
                detailInCompare={detailInCompare}
                toggleCompare={toggleCompare}
                toggleSave={toggleSave}
            />
        );
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                overflow: 'hidden',
                pt: {xs: '64px', md: '74px'},
                backgroundImage: `linear-gradient(rgba(245, 249, 255, 0.64), rgba(245, 249, 255, 0.64)), url(${homeBackgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed'
            }}
        >
            <Dialog
                open={showParentFormModal}
                onClose={handleParentFormClose}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        boxShadow: '0 12px 40px rgba(51,65,85,0.15)',
                    }
                }}
            >
                <DialogTitle sx={{fontWeight: 700, color: '#1e293b', pb: 1}}>
                    Điền thông tin phụ huynh
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{color: '#64748b', mb: 3}}>
                        Vui lòng điền đầy đủ thông tin để hoàn tất hồ sơ của bạn.
                    </Typography>
                    <Stack spacing={2.5} sx={{mt: 1}}>
                        <TextField
                            label="Họ và tên"
                            fullWidth
                            value={parentFormData.name}
                            onChange={handleParentFormChange('name')}
                            size="small"
                        />
                        <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Giới tính</InputLabel>
                                <Select
                                    value={parentFormData.gender}
                                    onChange={handleParentFormChange('gender')}
                                    label="Giới tính"
                                >
                                    <MenuItem value="MALE">Nam</MenuItem>
                                    <MenuItem value="FEMALE">Nữ</MenuItem>
                                    <MenuItem value="OTHER">Khác</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField
                                label="Số CMND/CCCD"
                                fullWidth
                                value={parentFormData.idCardNumber}
                                onChange={handleParentFormChange('idCardNumber')}
                                size="small"
                            />
                        </Stack>
                        <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Mối quan hệ với học sinh</InputLabel>
                                <Select
                                    value={parentFormData.relationship}
                                    onChange={handleParentFormChange('relationship')}
                                    label="Mối quan hệ với học sinh"
                                >
                                    <MenuItem value="FATHER">Cha</MenuItem>
                                    <MenuItem value="MOTHER">Mẹ</MenuItem>
                                    <MenuItem value="GUARDIAN">Người giám hộ</MenuItem>
                                    <MenuItem value="OTHER">Khác</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField
                                label="Số điện thoại *"
                                fullWidth
                                value={parentFormData.phone}
                                onChange={handleParentFormChange('phone')}
                                size="small"
                                placeholder="Nhập số điện thoại"
                            />
                        </Stack>
                        <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
                            <TextField
                                label="Nghề nghiệp"
                                fullWidth
                                value={parentFormData.occupation}
                                onChange={handleParentFormChange('occupation')}
                                size="small"
                            />
                        </Stack>
                        <TextField
                            label="Nơi làm việc"
                            fullWidth
                            value={parentFormData.workplace}
                            onChange={handleParentFormChange('workplace')}
                            size="small"
                        />
                        <TextField
                            label="Địa chỉ hiện tại"
                            fullWidth
                            value={parentFormData.currentAddress}
                            onChange={handleParentFormChange('currentAddress')}
                            size="small"
                            multiline
                            rows={2}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{px: 3, pb: 3, pt: 2}}>
                    <Button
                        onClick={handleParentFormClose}
                        sx={{
                            textTransform: 'none',
                            color: '#64748b',
                        }}
                    >
                        Đóng
                    </Button>
                    <Button
                        type="button"
                        onClick={handleParentFormSubmit}
                        variant="contained"
                        disabled={isSubmittingParentForm}
                        sx={{
                            textTransform: 'none',
                            bgcolor: BRAND_NAVY,
                            fontWeight: 600,
                            px: 3,
                            '&:hover': {
                                bgcolor: APP_PRIMARY_DARK,
                            },
                            '&:disabled': {
                                bgcolor: BRAND_SKY_LIGHT,
                            }
                        }}
                    >
                        {isSubmittingParentForm ? (
                            <CircularProgress size={20} color="inherit" />
                        ) : (
                            'Lưu thông tin'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>
            <Box
                id="ve-chung-toi"
                ref={aboutSectionRef}
                sx={{
                    mt: '-1px',
                    py: {xs: 5, md: 7},
                    background: 'transparent'
                }}
            >
                <Container maxWidth="lg" sx={{px: {xs: 2, sm: 3, md: 4}}}>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {xs: '1fr', md: 'repeat(12, minmax(0, 1fr))'},
                            gap: {xs: 3, md: 4},
                            alignItems: 'center'
                        }}
                    >
                        <Box
                            sx={{
                                gridColumn: {md: '1 / span 5'},
                                opacity: aboutVisible ? 1 : 0,
                                transform: aboutVisible ? 'translateY(0)' : 'translateY(26px)',
                                transition: `opacity 700ms ${admissionEase}, transform 700ms ${admissionEase}`
                            }}
                        >
                            <Typography
                                component="h2"
                                sx={{
                                    fontWeight: 800,
                                    color: '#020617',
                                    fontSize: {xs: '1.7rem', md: '2.3rem'},
                                    lineHeight: 1.2,
                                    letterSpacing: '-0.02em'
                                }}
                            >
                                Về chúng tôi
                            </Typography>
                            <Box sx={{width: 64, height: 2, bgcolor: 'rgba(15,23,42,0.18)', my: 2.2}} />
                            <Typography
                                sx={{
                                    color: '#1e293b',
                                    fontSize: {xs: '0.95rem', md: '1rem'},
                                    lineHeight: 1.9,
                                    fontWeight: 600,
                                    maxWidth: 460
                                }}
                            >
                                <Box component="span" sx={{fontWeight: 800}}>EduBridgeHCM</Box> kết nối phụ huynh với các trường học phù hợp thông qua thông tin minh bạch và quy trình tư vấn dễ tiếp cận. Chúng tôi tập trung vào trải nghiệm rõ ràng, tiết kiệm thời gian và hỗ trợ ra quyết định hiệu quả cho từng gia đình.
                            </Typography>
                            <Typography sx={{mt: 1.4, color: '#475569', fontSize: '0.94rem', fontStyle: 'italic', fontWeight: 700}}>
                                "Lựa chọn đúng trường, bắt đầu từ thông tin đúng."
                            </Typography>
                            <Box sx={{mt: 2.6}}>
                                <Button
                                    variant="contained"
                                    startIcon={<SearchIcon sx={{color: 'inherit'}}/>}
                                    onClick={() => navigate('/search-schools')}
                                    sx={{
                                        borderRadius: 999,
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        px: 2.75,
                                        py: 1.05,
                                        fontSize: '0.9rem',
                                        color: BRAND_NAVY,
                                        bgcolor: '#dbeafe',
                                        border: `2px solid ${BRAND_SKY}`,
                                        boxShadow: '0 8px 22px rgba(37, 99, 235, 0.14)',
                                        '&:hover': {
                                            bgcolor: '#bfdbfe',
                                            borderColor: BRAND_NAVY,
                                            boxShadow: '0 10px 26px rgba(37, 99, 235, 0.2)'
                                        }
                                    }}
                                >
                                    Tìm trường ngay
                                </Button>
                            </Box>
                        </Box>

                        <Box sx={{gridColumn: {md: '6 / span 7'}}}>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                    gap: {xs: 1.25, md: 1.6},
                                    gridTemplateAreas: {
                                        xs: `"img1 img2" "img3 img2"`,
                                        md: `"img1 img2" "img3 img2"`
                                    }
                                }}
                            >
                                <Box
                                    component="img"
                                    src={HOME_ABOUT_MEDIA[0].src}
                                    alt={HOME_ABOUT_MEDIA[0].alt}
                                    sx={{
                                        gridArea: 'img1',
                                        width: '100%',
                                        height: {xs: 175, md: 300},
                                        objectFit: 'cover',
                                        borderRadius: 2,
                                        boxShadow: '0 14px 30px rgba(15,23,42,0.1)',
                                        transform: aboutVisible ? {xs: 'translateY(0)', md: 'translateY(22px)'} : 'translateY(34px)',
                                        opacity: aboutVisible ? 1 : 0,
                                        transition: `opacity 680ms ${admissionEase}, transform 680ms ${admissionEase}`,
                                        transitionDelay: aboutVisible ? '80ms' : '0ms'
                                    }}
                                />
                                <Box
                                    component="img"
                                    src={HOME_ABOUT_MEDIA[1].src}
                                    alt={HOME_ABOUT_MEDIA[1].alt}
                                    sx={{
                                        gridArea: 'img2',
                                        width: '100%',
                                        height: {xs: 295, md: 440},
                                        objectFit: 'cover',
                                        borderRadius: 2,
                                        boxShadow: '0 18px 38px rgba(15,23,42,0.12)',
                                        transform: aboutVisible ? {xs: 'translateY(0)', md: 'translateY(-10px)'} : 'translateY(28px)',
                                        opacity: aboutVisible ? 1 : 0,
                                        transition: `opacity 740ms ${admissionEase}, transform 740ms ${admissionEase}`,
                                        transitionDelay: aboutVisible ? '170ms' : '0ms'
                                    }}
                                />
                                <Box
                                    component="img"
                                    src={HOME_ABOUT_MEDIA[2].src}
                                    alt={HOME_ABOUT_MEDIA[2].alt}
                                    sx={{
                                        gridArea: 'img3',
                                        width: '100%',
                                        height: {xs: 112, md: 146},
                                        objectFit: 'cover',
                                        borderRadius: 2,
                                        boxShadow: '0 10px 24px rgba(15,23,42,0.1)',
                                        transform: aboutVisible ? {xs: 'translateY(0)', md: 'translateY(18px)'} : 'translateY(30px)',
                                        opacity: aboutVisible ? 1 : 0,
                                        transition: `opacity 700ms ${admissionEase}, transform 700ms ${admissionEase}`,
                                        transitionDelay: aboutVisible ? '250ms' : '0ms'
                                    }}
                                />
                            </Box>
                        </Box>
                    </Box>
                </Container>
            </Box>
            {showHeadCreatePost && (
                <Box
                    sx={{
                        position: 'relative',
                        zIndex: 4,
                        bgcolor: 'rgba(255,255,255,0.28)',
                        borderTop: '1px solid rgba(59,130,246,0.12)',
                        pt: {xs: 2, md: 2.5},
                        pb: {xs: 2, md: 2.5}
                    }}
                >
                    <Container maxWidth="xl" sx={{px: {xs: 2, sm: 3, md: 4}}}>
                        <HomeCreatePostBar belowHero visible />
                    </Container>
                </Box>
            )}
            <Box
                id="danh-sach-truong-tu-thuc"
                sx={{
                    position: 'relative',
                    zIndex: 2,
                    mt: 0,
                    pt: {xs: 6, md: 8},
                    pb: {xs: 11, md: 13},
                    overflow: 'visible',
                    isolation: 'isolate',
                    background: 'transparent',
                    scrollMarginTop: '80px'
                }}
            >
                <Container maxWidth="lg" sx={{px: {xs: 2.5, md: 4}, position: 'relative', zIndex: 3}}>
                    <Box
                        sx={{
                            textAlign: 'center',
                            mb: {xs: 3.5, md: 4.5}
                        }}
                    >
                        <Typography
                            component="h2"
                            sx={{
                                fontWeight: 700,
                                fontSize: {xs: '1.8rem', md: '2.5rem'},
                                lineHeight: 1.14,
                                color: '#0f172a',
                                letterSpacing: '-0.02em'
                            }}
                        >
                            Danh sách trường tư thục
                        </Typography>
                        <Typography
                            sx={{
                                color: '#64748b',
                                fontSize: {xs: '0.93rem', md: '1rem'},
                                lineHeight: 1.75,
                                maxWidth: 620,
                                mx: 'auto',
                                mt: 1.5
                            }}
                        >
                            Khám phá nhanh các trường đang được quan tâm để bắt đầu hành trình chọn trường phù hợp.
                        </Typography>
                    </Box>
                    <Box sx={{position: 'relative', zIndex: 3}}>
                        {schoolLoading ? (
                            <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
                                <CircularProgress size={18} sx={{color: BRAND_NAVY}} />
                                <Typography sx={{color: '#64748b', fontSize: '0.9rem'}}>Đang tải danh sách trường...</Typography>
                            </Box>
                        ) : showcaseSchools.length === 0 ? (
                            <Typography sx={{color: '#64748b', fontSize: '0.9rem'}}>Hiện chưa có dữ liệu trường.</Typography>
                        ) : (
                            <>
                                <Box
                                    sx={{
                                        display: 'grid',
                                        width: '100%',
                                        maxWidth: {xs: '100%', md: 1140},
                                        mx: 'auto',
                                        gridTemplateColumns: {
                                            xs: 'minmax(0, 1fr)',
                                            md: 'repeat(3, minmax(0, 1fr))'
                                        },
                                        gap: {xs: 2.5, md: 3},
                                        alignItems: 'stretch'
                                    }}
                                >
                                    {showcaseSchools.map((school) => (
                                        <SchoolCard
                                            key={school.id || school.name}
                                            school={school}
                                            onOpenDetail={handleOpenSchoolDetail}
                                            onToggleCompare={toggleCompare}
                                            onToggleSave={toggleSave}
                                            compareSchoolKeys={compareSchoolKeys}
                                        />
                                    ))}
                                </Box>
                                {showcaseSchools.length > 3 && (
                                    <Box sx={{display: 'flex', justifyContent: 'center', mt: {xs: 3, md: 3.5}}}>
                                        <Button
                                            variant="contained"
                                            endIcon={<ArrowForwardIcon sx={{fontSize: 18}} />}
                                            onClick={() => navigate('/search-schools')}
                                            sx={{
                                                borderRadius: 999,
                                                textTransform: 'none',
                                                fontWeight: 700,
                                                px: 3,
                                                py: 1.05,
                                                fontSize: '0.9rem',
                                                color: BRAND_NAVY,
                                                bgcolor: '#dbeafe',
                                                border: `2px solid ${BRAND_SKY}`,
                                                boxShadow: '0 8px 22px rgba(37, 99, 235, 0.14)',
                                                '&:hover': {
                                                    bgcolor: '#bfdbfe',
                                                    borderColor: BRAND_NAVY,
                                                    boxShadow: '0 10px 26px rgba(37, 99, 235, 0.2)'
                                                }
                                            }}
                                        >
                                            Xem thêm trường
                                        </Button>
                                    </Box>
                                )}
                            </>
                        )}
                    </Box>
                </Container>
            </Box>
            <Box
                ref={consultSectionRef}
                id="quy-trình"
                sx={{
                    pt: {xs: 7, md: 8},
                    pb: {xs: 4, md: 5},
                    scrollMarginTop: '80px',
                    position: 'relative',
                    zIndex: 0,
                    overflow: 'visible',
                    background: 'transparent'
                }}
            >
                <Container maxWidth="lg" sx={{px: {xs: 2.5, md: 4}}}>
                    <Box
                        sx={{
                            textAlign: 'center',
                            transition: `opacity 0.8s ${consultMotionEase}, transform 0.8s ${consultMotionEase}`,
                            opacity: consultVisible ? 1 : 0,
                            transform: consultVisible ? 'translateY(0)' : 'translateY(20px)'
                        }}
                    >
                        <Typography
                            component="h2"
                            sx={{
                                fontWeight: 700,
                                fontSize: {xs: '1.8rem', md: '2.5rem'},
                                lineHeight: 1.14,
                                color: '#0f172a',
                                letterSpacing: '-0.02em'
                            }}
                        >
                            Tư vấn rõ ràng, giải đáp dễ hiểu
                        </Typography>
                        <Typography
                            sx={{
                                color: '#64748b',
                                fontSize: {xs: '0.93rem', md: '1rem'},
                                lineHeight: 1.75,
                                maxWidth: 620,
                                mx: 'auto',
                                mt: 1.5,
                                mb: {xs: 3.5, md: 4.5}
                            }}
                        >
                            Các hình thức hỗ trợ tư vấn dành cho Quý phụ huynh
                        </Typography>

                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: {xs: '1fr', md: 'repeat(3, minmax(0, 1fr))'},
                                bgcolor: 'transparent'
                            }}
                        >
                            {CONSULT_STEPS.map((step, i) => {
                                const StepIcon = consultIcons[i] || HeadsetMicIcon;
                                return (
                                    <Box
                                        key={step.n}
                                        sx={{
                                            px: {xs: 2.5, md: 3.6},
                                            py: {xs: 3.3, md: 4.25},
                                            borderRight: {md: i < CONSULT_STEPS.length - 1 ? '1px solid rgba(148,163,184,0.2)' : 'none'},
                                            borderBottom: {xs: i < CONSULT_STEPS.length - 1 ? '1px solid rgba(148,163,184,0.2)' : 'none', md: 'none'},
                                            transition: `transform 0.7s ${consultMotionEase}, background-color 0.35s ease, opacity 0.7s ${consultMotionEase}, filter 0.7s ${consultMotionEase}`,
                                            transitionDelay: consultVisible ? `${i * consultStaggerMs}ms` : '0ms',
                                            opacity: consultVisible ? 1 : 0,
                                            transform: consultVisible ? 'translateY(0)' : 'translateY(28px)',
                                            filter: consultVisible ? 'blur(0px)' : 'blur(2px)',
                                            '&:hover': {
                                                transform: 'translateY(-6px)',
                                                backgroundColor: 'rgba(219,234,254,0.2)'
                                            }
                                        }}
                                    >
                                        <Box sx={{display: 'flex', justifyContent: 'center', mb: 2.35}}>
                                            <StepIcon
                                                sx={{
                                                    fontSize: 50,
                                                    color: '#3b82f6',
                                                    opacity: consultVisible ? 1 : 0,
                                                    transform: consultVisible ? 'translateY(0) scale(1)' : 'translateY(18px) scale(0.86)',
                                                    transition: `opacity 680ms ${consultMotionEase}, transform 680ms ${consultMotionEase}`,
                                                    transitionDelay: consultVisible ? `${i * consultStaggerMs + 170}ms` : '0ms',
                                                    filter: 'saturate(0.92)',
                                                    '.MuiBox-root:hover &': {
                                                        transform: 'translateY(-2px) scale(1.05)'
                                                    }
                                                }}
                                            />
                                        </Box>
                                        <Typography
                                            sx={{
                                                fontWeight: 700,
                                                color: '#0f172a',
                                                fontSize: {xs: '0.98rem', md: '1.03rem'},
                                                lineHeight: 1.5,
                                                mb: 1.35
                                            }}
                                        >
                                            {step.title}
                                        </Typography>
                                        <Typography
                                            sx={{
                                                color: '#64748b',
                                                fontSize: {xs: '0.88rem', md: '0.91rem'},
                                                lineHeight: 1.8
                                            }}
                                        >
                                            {step.subtitle}
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Box>
                        <Box sx={{mt: {xs: 3, md: 3.8}}}>
                            <Button
                                variant="contained"
                                onClick={() => navigate('/search-schools')}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: {xs: '0.92rem', md: '0.96rem'},
                                    px: {xs: 3.5, md: 4.25},
                                    py: 1.2,
                                    borderRadius: 999,
                                    bgcolor: BRAND_NAVY,
                                    color: '#fff',
                                    boxShadow: '0 10px 26px rgba(37,99,235,0.22)',
                                    '&:hover': {
                                        bgcolor: APP_PRIMARY_DARK,
                                        boxShadow: '0 14px 32px rgba(37,99,235,0.3)'
                                    }
                                }}
                            >
                                Tìm hiểu thêm
                            </Button>
                        </Box>
                    </Box>
                </Container>
            </Box>
            {isSchoolRole && (
                <Box
                    ref={servicePackagesSectionRef}
                    id="goi-dich-vu"
                    sx={{
                        position: 'relative',
                        zIndex: 1,
                        pt: {xs: 5, md: 7},
                        pb: {xs: 5, md: 7},
                        background: 'transparent',
                        opacity: servicePackagesVisible ? 1 : 0,
                        transform: servicePackagesVisible ? 'translateY(0px)' : 'translateY(28px)',
                        transition: 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.22, 0.61, 0.36, 1)',
                    }}
                >
                    <Container maxWidth="lg" sx={{px: {xs: 2, sm: 3, md: 4}}}>
                        <Typography
                            variant="h4"
                            sx={{
                                textAlign: 'center',
                                fontWeight: 700,
                                color: BRAND_NAVY,
                                mb: 1,
                                fontSize: {xs: '1.6rem', md: '2rem'}
                            }}
                        >
                            Các gói dịch vụ
                        </Typography>
                        <Typography
                            sx={{
                                textAlign: 'center',
                                color: '#64748b',
                                fontSize: {xs: '0.95rem', md: '1rem'},
                                mb: 4
                            }}
                        >
                            Lựa chọn gói phù hợp để tăng hiệu quả tuyển sinh cho trường của bạn.
                        </Typography>

                        <SchoolServicePackagesGrid
                            packages={schoolServicePackages}
                            loading={servicePackagesLoading}
                            buyNowLoadingPackageId={buyNowLoadingPackageId}
                            onBuyNow={handleSchoolPackageBuyNow}
                            cardsVisible={servicePackagesVisible}
                        />
                    </Container>
                </Box>
            )}
            <Box
                component="section"
                id="cam-nhan-phu-huynh"
                ref={testimonialSectionRef}
                sx={{
                    pt: {xs: 4.5, md: 5.5},
                    pb: {xs: 8, md: 10},
                    background: 'transparent'
                }}
            >
                <Container maxWidth="lg" sx={{px: {xs: 2, md: 4}}}>
                    <Box sx={{textAlign: 'center', mb: {xs: 4, md: 5.5}}}>
                        <Typography
                            component="h2"
                            sx={{
                                fontWeight: 800,
                                color: '#020617',
                                fontSize: {xs: '1.9rem', md: '2.6rem'},
                                lineHeight: 1.15,
                                letterSpacing: '-0.02em'
                            }}
                        >
                            Không chỉ là lời giới thiệu.
                            <br />
                            Phụ huynh thật sự tin tưởng <Box component="span" sx={{fontWeight: 800}}>EduBridgeHCM</Box>.
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {xs: '1fr', md: 'repeat(3, minmax(0, 1fr))'},
                            gap: {xs: 2, md: 2.5},
                            '@keyframes testimonialFadeInUp': {
                                from: {
                                    opacity: 0,
                                    transform: 'translateY(24px) scale(0.98)'
                                },
                                to: {
                                    opacity: 1,
                                    transform: 'translateY(0) scale(1)'
                                }
                            }
                        }}
                    >
                        {HOME_TESTIMONIALS.map((item, idx) => (
                            <Card
                                key={item.name}
                                elevation={0}
                                sx={{
                                    position: 'relative',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    borderRadius: 4,
                                    border: '1px solid rgba(148,163,184,0.18)',
                                    bgcolor: '#e8eef6',
                                    overflow: 'hidden',
                                    boxShadow: '0 12px 30px rgba(15,23,42,0.1)',
                                    opacity: testimonialsVisible ? 1 : 0,
                                    transform: testimonialsVisible
                                        ? {xs: 'translateY(0)', md: idx === 1 ? 'translateY(-4px)' : 'translateY(0)'}
                                        : 'translateY(26px)',
                                    transition: `opacity 620ms ${admissionEase}, transform 620ms ${admissionEase}, box-shadow 0.35s ease, background-color 0.35s ease`,
                                    transitionDelay: testimonialsVisible ? `${idx * 110}ms` : '0ms',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'linear-gradient(145deg, rgba(255,255,255,0.55) 0%, rgba(37,99,235,0.06) 100%)',
                                        pointerEvents: 'none'
                                    },
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        backgroundColor: '#dbe4ef',
                                        boxShadow: '0 18px 38px rgba(30,58,138,0.2)'
                                    }
                                }}
                            >
                                <CardContent
                                    sx={{
                                        p: {xs: 2.25, md: 2.5},
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1.5,
                                        height: '100%',
                                        position: 'relative',
                                        zIndex: 1
                                    }}
                                >
                                    <Box sx={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: '50%', bgcolor: 'rgba(37,99,235,0.12)', color: '#1d4ed8'}}>
                                        <FormatQuoteIcon sx={{fontSize: 20}} />
                                    </Box>
                                    <Typography
                                        sx={{
                                            color: '#020617',
                                            fontSize: {xs: '0.95rem', md: '1rem'},
                                            fontWeight: 600,
                                            lineHeight: 1.75
                                        }}
                                    >
                                        "{item.quote}"
                                    </Typography>

                                    <Box sx={{mt: 'auto'}}>
                                        <Typography sx={{color: '#64748b', fontSize: '0.75rem', mt: 0.15, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600}}>
                                            Cảm nhận từ phụ huynh
                                        </Typography>
                                    </Box>

                                    <Box
                                        sx={{
                                            pt: 1.4,
                                            mt: 0.3,
                                            borderTop: '1px solid rgba(148,163,184,0.22)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <Box sx={{minWidth: 0}}>
                                            <Typography sx={{fontWeight: 600, color: '#020617', fontSize: '0.95rem', lineHeight: 1.25}}>
                                                {item.name}
                                            </Typography>
                                            <Typography sx={{color: '#334155', fontSize: '0.82rem', mt: 0.25, fontWeight: 500}}>
                                                {item.role}
                                            </Typography>
                                        </Box>
                                        <Box
                                            component="img"
                                            src={item.avatar}
                                            alt={item.name}
                                            referrerPolicy="no-referrer"
                                            sx={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: '50%',
                                                objectFit: 'cover',
                                                border: '2px solid #fff',
                                                boxShadow: '0 2px 8px rgba(15,23,42,0.22)',
                                                bgcolor: '#e2e8f0',
                                                p: 0,
                                                transition: 'transform 0.25s ease, background-color 0.25s ease',
                                                '.MuiCard-root:hover &': {
                                                    transform: 'translateY(-1px) scale(1.08)',
                                                    bgcolor: '#fff'
                                                }
                                            }}
                                        />
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>
                </Container>
            </Box>

        </Box>
    );
}
