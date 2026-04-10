import React from "react";
import {
    Box,
    Button,
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
    useMediaQuery
} from "@mui/material";
import {useTheme} from "@mui/material/styles";
import {updateProfile} from "../../services/AccountService";
import {enqueueSnackbar} from "notistack";
import {
    ArrowForward as ArrowForwardIcon,
    LocationOn as LocationIcon,
    Star as StarIcon,
    CheckCircleOutline as CheckCircleOutlineIcon,
    AttachMoney as MoneyIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Search as SearchIcon,
    AutoAwesome as SparkleIcon
} from "@mui/icons-material";
import {useNavigate} from "react-router-dom";
import {
    APP_PRIMARY_DARK,
    APP_PRIMARY_MAIN,
    APP_PRIMARY_SOFT_BG,
    APP_PRIMARY_SOFT_BORDER,
    BRAND_NAVY,
    BRAND_SKY,
    BRAND_SKY_LIGHT,
    HOME_SCHOOL_SECTION_SURFACE,
    HOME_CONSULT_SECTION_TOP,
    HOME_PAGE_SURFACE_GRADIENT,
    landingSectionShadow
} from "../../constants/homeLandingTheme";
import SectionWaveEdge from "../ui/SectionWaveEdge.jsx";
import admissionCard1Image from "../../assets/Nguyên tắc công bố tuyển sinh (từ Bộ GD&ĐT).jpg";
import admissionCard2Image from "../../assets/Nhiều trường THPT công bố chỉ tiêu tuyển sinh 2026.jpg";
import admissionCard3Image from "../../assets/TPHCM chốt 3 môn thi tuyển sinh lớp 10 năm 2026.jpeg";
import admissionCard4Image from "../../assets/Đề thi lớp 10 2026 thay đổi theo hướng đánh giá năng lựcwebp.webp";
import admissionCard5Image from "../../assets/TP.HCM tiếp tục kết hợp thi tuyển và xét tuyển.jpg.webp";
import topPromoBanner1 from "../../assets/1.png";
import topPromoBanner2 from "../../assets/2.png";
import {getPublicSchoolList} from "../../services/SchoolPublicService.jsx";
import {getAdminPackageFees} from "../../services/AdminService.jsx";
import {createSchoolSubscriptionPayment} from "../../services/SchoolSubscriptionService.jsx";

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

const ADMISSION_POSTS = [
    {
        title: 'Công bố chỉ tiêu trường ngoài công lập',
        date: '02/06/2025',
        description: 'TP HCM: Công bố chi tiết chỉ tiêu tuyển sinh lớp 10 của 64 trường ngoài công lập',
        image: admissionCard1Image,
        url: 'https://ttbc-hcm.gov.vn/tp-hcm-cong-bo-chi-tiet-chi-tieu-tuyen-sinh-lop-10-cua-64-truong-ngoai-cong-lap-1018826.html',
        tags: ['Ngoài công lập', 'Chỉ tiêu', 'Lớp 10']
    },
    {
        title: 'Nhiều trường THPT công bố chỉ tiêu tuyển sinh 2026',
        date: '28/02/2026',
        description: 'TPHCM: Thêm nhiều trường công bố chỉ tiêu tuyển sinh lớp 10 năm 2026',
        image: admissionCard2Image,
        url: 'https://nld.com.vn/tphcm-them-nhieu-truong-cong-bo-chi-tieu-tuyen-sinh-lop-10-nam-2026-196260228095241168.htm',
        tags: ['THPT', 'Chỉ tiêu', '2026']
    },
    {
        title: 'TP.HCM chốt phương thức thi tuyển lớp 10',
        date: '18/10/2025',
        description: 'TPHCM chốt 3 môn thi tuyển sinh lớp 10 năm 2026',
        image: admissionCard3Image,
        url: 'https://tphcm.chinhphu.vn/tphcm-chot-3-mon-thi-tuyen-sinh-lop-10-nam-2026-101251018144656866.htm',
        tags: ['Phương thức thi', '3 môn thi', '2026']
    },
    {
        title: 'Đề thi lớp 10 2026 thay đổi theo hướng đánh giá năng lực',
        date: '01/12/2025',
        description: 'Kỳ thi tuyển sinh lớp 10 công lập năm học 2026-2027 tại TPHCM: Giúp học sinh thích ứng tốt với điểm mới trong đề thi',
        image: admissionCard4Image,
        url: 'https://www.sggp.org.vn/ky-thi-tuyen-sinh-lop-10-cong-lap-nam-hoc-2026-2027-tai-tphcm-giup-hoc-sinh-thich-ung-tot-voi-diem-moi-trong-de-thi-post826311.html',
        tags: ['Đề thi mới', 'Đánh giá năng lực', '2026-2027']
    },
    {
        title: 'TP.HCM tiếp tục kết hợp thi tuyển và xét tuyển',
        date: '16/07/2025',
        description: 'TPHCM: Dự kiến Ngoại ngữ là môn thi thứ 3 tại kỳ thi tuyển sinh lớp 10 năm 2026',
        image: admissionCard5Image,
        url: 'https://www.sggp.org.vn/tphcm-du-kien-ngoai-ngu-la-mon-thi-thu-3-tai-ky-thi-tuyen-sinh-lop-10-nam-2026-post803971.html',
        tags: ['Thi tuyển + xét tuyển', 'Ngoại ngữ', '2026']
    }
];

const DEFAULT_SCHOOL_IMAGE =
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=80";

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

const SUPPORT_LEVEL_LABELS = Object.freeze({
    BASIC: "Basic",
    STANDARD: "Standard",
    PREMIUM: "Premium",
});

const PARENT_POST_PERMISSION_LABELS = Object.freeze({
    VIEW_ONLY: "Nhà trường chỉ xem bài viết",
    COMMENT_ONLY: "Nhà trường được bình luận",
    CREATE_POST: "Nhà trường được tạo bài viết",
});

const formatVndPrice = (value) => {
    const amount = Number(value);
    if (Number.isNaN(amount) || amount <= 0) return "Liên hệ";
    return `${amount.toLocaleString("vi-VN")} VNĐ`;
};

const getSupportLevelLabel = (supportLevel) => {
    const key = String(supportLevel || "").toUpperCase();
    return SUPPORT_LEVEL_LABELS[key] || (supportLevel ? String(supportLevel) : "Chưa cập nhật");
};

const getSupportLevelRank = (supportLevel) => {
    const key = String(supportLevel || "").toUpperCase();
    if (key === "ENTERPRISE") return 1;
    if (key === "STANDARD") return 2;
    if (key === "BASIC") return 3;
    return 99;
};

const buildFeatureLines = (features = {}, durationDays = 0) => {
    const lines = [];
    if (Number(features.maxAdmissions) > 0) {
        lines.push(`Tối đa ${Number(features.maxAdmissions).toLocaleString("vi-VN")} hồ sơ tuyển sinh`);
    }
    if (Number(features.maxCounsellors) > 0) {
        lines.push(`Tối đa ${Number(features.maxCounsellors).toLocaleString("vi-VN")} tư vấn viên`);
    }
    if (Number(features.topRanking) > 0) {
        lines.push(`Ưu tiên hiển thị top ${Number(features.topRanking).toLocaleString("vi-VN")}`);
    }
    if (durationDays > 0) {
        lines.push(`Thời hạn sử dụng ${Number(durationDays).toLocaleString("vi-VN")} ngày`);
    }
    if (features.allowChat === true) {
        lines.push("Hỗ trợ nhắn tin trực tiếp với phụ huynh");
    } else if (features.allowChat === false) {
        lines.push("Không hỗ trợ nhắn tin trực tiếp với phụ huynh");
    }
    if (features.parentPostPermission) {
        const permission = PARENT_POST_PERMISSION_LABELS[features.parentPostPermission] || features.parentPostPermission;
        lines.push(permission);
    }
    return lines;
};

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

function BlogCard({title, description, image, date, tags, url, variant = 'featured'}) {
    const isFeatured = variant === 'featured';
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
                >
                    {description}
                </Typography>
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
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
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

function SchoolCard({school}) {
    const rating = Number(school.rating) || 0;
    return (
        <Card
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                overflow: 'hidden',
                bgcolor: '#fff',
                border: '1px solid rgba(51,65,85,0.08)',
                boxShadow: landingSectionShadow(2),
                transition: 'transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease',
                '&:hover': {
                    transform: 'translateY(-4px) scale(1.02)',
                    boxShadow: '0 18px 36px rgba(51,65,85,0.14)',
                    borderColor: APP_PRIMARY_SOFT_BORDER
                }
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    height: 132,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 0
                }}
            >
                {school.featured && (
                    <Chip
                        icon={<StarIcon sx={{fontSize: 14}} />}
                        label={school.badge}
                        size="small"
                        sx={{
                            position: 'absolute',
                            top: 10,
                            left: 10,
                            bgcolor: 'rgba(255,255,255,0.95)',
                            fontWeight: 700,
                            '& .MuiChip-label': {px: 1}
                        }}
                    />
                )}
                <Box
                    component="img"
                    src={school.cover || DEFAULT_SCHOOL_IMAGE}
                    alt={school.name || "School logo"}
                    sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                    }}
                />
            </Box>

            <CardContent sx={{pt: 2.25, px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.25, flex: 1}}>
                <Typography sx={{fontSize: '1.02rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.35}}>
                    {school.name}
                </Typography>

                <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.75}}>
                    <Chip size="small" label={school.type || "Trường"} sx={{bgcolor: 'rgba(51,65,85,0.08)', fontWeight: 600}} />
                    <Chip size="small" icon={<MoneyIcon sx={{fontSize: 14}} />} label={school.tuition || "Đang cập nhật"} sx={{bgcolor: APP_PRIMARY_SOFT_BG, fontWeight: 600}} />
                    <Chip size="small" icon={<LocationIcon sx={{fontSize: 14}} />} label={school.district || "TP.HCM"} sx={{bgcolor: 'rgba(59,130,246,0.12)', fontWeight: 600}} />
                </Box>

                <Typography sx={{display: 'flex', alignItems: 'center', gap: 0.75, color: '#64748b', fontSize: '0.88rem'}}>
                    <LocationIcon sx={{fontSize: 16}} />
                    {school.location || "TP.HCM"}
                </Typography>

                <Box sx={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mt: 'auto', pt: 0.5}}>
                    <Box>
                        <Typography sx={{fontSize: '1.08rem', fontWeight: 800, color: APP_PRIMARY_MAIN, lineHeight: 1}}>
                            {rating > 0 ? rating.toFixed(1) : "—"}
                            <Typography component="span" sx={{fontSize: '0.82rem', color: '#64748b', fontWeight: 600, ml: 0.75}}>
                                ({school.reviews || 0} đánh giá)
                            </Typography>
                        </Typography>
                        <Typography sx={{fontSize: '0.78rem', color: '#64748b', mt: 0.35}}>
                            {school.grade ? `Xếp hạng học lực: ${school.grade}` : "Đang cập nhật"}
                        </Typography>
                    </Box>
                    <Button
                        size="small"
                        endIcon={<ArrowForwardIcon sx={{fontSize: 16}} />}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            borderRadius: 999,
                            px: 1.5,
                            bgcolor: APP_PRIMARY_SOFT_BG,
                            color: APP_PRIMARY_DARK,
                            '&:hover': {bgcolor: 'rgba(37,99,235,0.16)'}
                        }}
                    >
                        Xem chi tiết
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
}

function LatestAdmissionNewsSection() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const posts = ADMISSION_POSTS;
    const n = posts.length;
    const [active, setActive] = React.useState(0);
    const timerRef = React.useRef(null);

    const clearTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const goToSlide = React.useCallback((index) => {
        clearTimer();
        setActive(((index % n) + n) % n);
        timerRef.current = setInterval(() => {
            setActive((prev) => (prev + 1) % n);
        }, ADMISSION_CAROUSEL_INTERVAL_MS);
    }, [n]);

    React.useEffect(() => {
        goToSlide(0);
        return () => clearTimer();
    }, [goToSlide]);

    const prevIndex = (active - 1 + n) % n;
    const nextIndex = (active + 1) % n;

    return (
        <Box
            id="tin-tuyen-sinh"
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
                            fontWeight: 800,
                            mb: 2,
                            color: '#1e293b',
                            fontSize: {xs: '1.85rem', md: '2.45rem'},
                            letterSpacing: '-0.02em'
                        }}
                    >
                        Tin tuyển sinh mới nhất
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            color: '#64748b',
                            fontSize: {xs: '0.95rem', md: '1.05rem'},
                            maxWidth: '640px',
                            mx: 'auto',
                            lineHeight: 1.75
                        }}
                    >
                        Vuốt hoặc chọn để xem — chuyển slide chậm, rõ chuyển động để dễ theo dõi.
                    </Typography>
                </Box>

                {isMobile ? (
                    <Box sx={{position: 'relative', maxWidth: 400, mx: 'auto'}}>
                        <Box
                            sx={{
                                transition: `opacity ${ADMISSION_ANIM_MS}ms ${admissionEase}, transform ${ADMISSION_ANIM_MS}ms ${admissionEase}`,
                                opacity: 1,
                                transform: 'translateY(0) scale(1)'
                            }}
                            key={active}
                        >
                            <BlogCard {...posts[active]} variant="featured" />
                        </Box>
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
                            <BlogCard {...posts[prevIndex]} variant="side" />
                        </Box>
                        <Box
                            key={active}
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
                            <BlogCard {...posts[active]} variant="featured" />
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
                            <BlogCard {...posts[nextIndex]} variant="side" />
                        </Box>
                    </Box>
                )}

                <Stack direction="row" spacing={1} justifyContent="center" sx={{mt: {xs: 3, md: 3.5}}}>
                    {posts.map((_, i) => (
                        <Box
                            key={i}
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
                zIndex: 3,
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
                        bgcolor: '#f0f7ff',
                        pb: {xs: 1.5, sm: 2}
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
                            bottom: {xs: 'min(14%, 72px)', sm: 'min(12%, 64px)', md: 'min(10%, 56px)'},
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

export default function HomePage() {
    const navigate = useNavigate();
    const [homeSchools, setHomeSchools] = React.useState([]);
    const [schoolLoading, setSchoolLoading] = React.useState(true);
    const [isSignedIn, setIsSignedIn] = React.useState(() =>
        typeof window !== "undefined" && Boolean(localStorage.getItem("user"))
    );
    const [isParentRole, setIsParentRole] = React.useState(false);
    const [isSchoolRole, setIsSchoolRole] = React.useState(false);
    const [schoolServicePackages, setSchoolServicePackages] = React.useState([]);
    const [servicePackagesLoading, setServicePackagesLoading] = React.useState(false);
    const [buyNowLoadingPackageId, setBuyNowLoadingPackageId] = React.useState(null);
    const [showParentFormModal, setShowParentFormModal] = React.useState(false);
    const [isSubmittingParentForm, setIsSubmittingParentForm] = React.useState(false);
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
    const showcaseSchools = React.useMemo(
        () => [...homeSchools].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0)).slice(0, 6),
        [homeSchools]
    );

    const consultSectionRef = React.useRef(null);
    const [consultVisible, setConsultVisible] = React.useState(false);
    const servicePackagesSectionRef = React.useRef(null);
    const [servicePackagesVisible, setServicePackagesVisible] = React.useState(false);
    const consultMotionEase = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
    const consultStaggerMs = 140;
    const consultHeadlineContentSx = {
        position: {xs: 'static', md: 'absolute'},
        left: {md: 0},
        right: {md: 0},
        top: {md: '50%'},
        width: {md: '100%'},
        transition: `opacity 0.9s ${consultMotionEase}, transform 0.9s ${consultMotionEase}`,
        opacity: consultVisible ? 1 : 0,
        transform: consultVisible
            ? {xs: 'translateY(0)', md: 'translateY(-50%)'}
            : {xs: 'translateY(24px)', md: 'translateY(calc(-50% + 24px))'},
        textAlign: 'center',
        maxWidth: 520,
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: {xs: 1, md: 1.25}
    };
    const getConsultStepWrapperSx = (stepNumber, index) => ({
        gridArea: `step${stepNumber}`,
        position: 'relative',
        width: '100%',
        maxWidth: {xs: '100%', md: 540},
        justifySelf: {md: index === 1 ? 'end' : 'start'},
        pl: {xs: 0, md: 3},
        zIndex: 2,
        transition: `opacity 0.85s ${consultMotionEase}, transform 0.85s ${consultMotionEase}`,
        transitionDelay: consultVisible ? `${index * consultStaggerMs}ms` : '0ms',
        opacity: consultVisible ? 1 : 0,
        transform: consultVisible
            ? 'translateX(0)'
            : {xs: 'translateX(20px)', md: 'translateX(40px)'},
        overflow: 'visible'
    });
    const getConsultCardSx = (isMirror) => ({
        position: 'relative',
        zIndex: 1,
        flex: 1,
        minWidth: 0,
        width: {xs: '100%', md: 'auto'},
        borderRadius: 3,
        overflow: 'visible',
        bgcolor: '#fff',
        border: '1px solid rgba(226,232,240,0.95)',
        boxShadow: '0 20px 56px rgba(51,65,85,0.08)',
        ml: {xs: 0, md: isMirror ? 0 : -3.5},
        mr: {xs: 0, md: isMirror ? -3.5 : 0},
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: '0 24px 64px rgba(51,65,85,0.1)'
        }
    });

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            setSchoolLoading(true);
            try {
                const rows = await getPublicSchoolList();
                if (cancelled) return;
                const mapped = (Array.isArray(rows) ? rows : []).map((item, idx) => ({
                    id: item.id,
                    name: item.name || "Trường đang cập nhật",
                    district: "TP.HCM",
                    location: "TP.HCM",
                    type: "Trường",
                    tuition: "Đang cập nhật",
                    rating: typeof item.averageRating === "number" ? item.averageRating : 0,
                    reviews: 0,
                    grade: "",
                    featured: idx < 3,
                    badge: idx < 3 ? "Nổi bật" : "Gợi ý",
                    cover: item.logoUrl || DEFAULT_SCHOOL_IMAGE
                }));
                setHomeSchools(mapped);
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
        const userData = localStorage.getItem('user');
        setIsSignedIn(Boolean(userData));
        if (userData) {
            try {
                const user = JSON.parse(userData);
                setIsParentRole(user.role === 'PARENT');
                setIsSchoolRole(user.role === 'SCHOOL');
                if (user.role === 'PARENT' && user.firstLogin === true) {
                    setShowParentFormModal(true);
                }
            } catch (e) {
                console.error('Error parsing user data:', e);
                setIsParentRole(false);
                setIsSchoolRole(false);
            }
        } else {
            setIsParentRole(false);
            setIsSchoolRole(false);
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
    }, []);

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
                if (entry.isIntersecting) {
                    setConsultVisible(true);
                    obs.disconnect();
                }
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
                // Không truyền "noopener" trong tham số thứ 3: nhiều trình duyệt vẫn mở tab mới nhưng trả về null,
                // khiến nhánh fallback assign() chạy và tab hiện tại cũng nhảy sang VNPay.
                const w = window.open(url, "_blank");
                if (w) {
                    try {
                        w.opener = null;
                    } catch {
                        /* cross-origin */
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
                        localStorage.setItem('user', JSON.stringify(user));
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

    return (
        <Box
            sx={{
                minHeight: '100vh',
                overflow: 'hidden',
                pt: 0,
                background: HOME_PAGE_SURFACE_GRADIENT
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
            <HomeTopPromoCarousel
                isSignedIn={isSignedIn}
                onRegisterClick={handleRegisterClick}
                navigate={navigate}
            />
            <Box
                id="trường-nổi-bật"
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    mt: 0,
                    pt: {xs: 6, md: 8},
                    pb: {xs: 11, md: 13},
                    overflow: 'visible',
                    background: `linear-gradient(180deg, ${HOME_SCHOOL_SECTION_SURFACE} 0%, #f0f9ff 32%, #fafcff 68%, ${HOME_CONSULT_SECTION_TOP} 100%)`,
                    scrollMarginTop: '80px'
                }}
            >
                <SectionWaveEdge variant="top" fill={HOME_SCHOOL_SECTION_SURFACE}/>
                <SectionWaveEdge variant="bottom" fill={HOME_CONSULT_SECTION_TOP}/>
                <Container maxWidth="xl" sx={{px: {xs: 2, sm: 3, md: 4}, position: 'relative', zIndex: 3}}>
                    <Box sx={{mb: 4.5, textAlign: 'center'}}>
                        <Box
                            sx={{
                                maxWidth: 720,
                                mx: 'auto',
                                px: {xs: 2.5, md: 3.75},
                                py: {xs: 3, md: 3.75},
                                borderRadius: 4,
                                bgcolor: 'rgba(255,255,255,0.96)',
                                border: '1px solid rgba(255,255,255,1)',
                                boxShadow: `
                                    0 28px 64px rgba(15, 23, 42, 0.11),
                                    0 0 0 1px rgba(59, 130, 246, 0.08),
                                    inset 0 1px 0 rgba(255,255,255,1)
                                `,
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)'
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    mb: 1.5,
                                    px: 2,
                                    py: 0.75,
                                    borderRadius: 999,
                                    bgcolor: 'rgba(255,255,255,0.95)',
                                    border: `1px solid ${APP_PRIMARY_SOFT_BORDER}`,
                                    boxShadow: '0 4px 16px rgba(59,130,246,0.08)'
                                }}
                            >
                                <StarIcon sx={{fontSize: 18, color: APP_PRIMARY_MAIN}} />
                                <Typography sx={{fontSize: '0.8125rem', fontWeight: 800, color: APP_PRIMARY_DARK, letterSpacing: '0.06em', textTransform: 'uppercase'}}>
                                    Trường tư thục
                                </Typography>
                            </Box>
                            <Typography
                                variant="h2"
                                sx={{
                                    fontWeight: 800,
                                    mb: 1.25,
                                    color: '#0f172a',
                                    fontSize: {xs: '1.75rem', sm: '2.25rem', md: '2.5rem'},
                                    letterSpacing: '-0.02em',
                                    lineHeight: 1.2,
                                    textShadow: '0 1px 0 rgba(255,255,255,0.9)'
                                }}
                            >
                                Danh sách trường tư thục
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={{
                                    color: '#334155',
                                    fontWeight: 500,
                                    fontSize: {xs: '0.9375rem', md: '1.02rem'},
                                    maxWidth: '640px',
                                    mx: 'auto',
                                    lineHeight: 1.7
                                }}
                            >
                                Khám phá nhanh các trường đang được quan tâm để bắt đầu hành trình chọn trường phù hợp.
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{mb: 1.5, position: 'relative', zIndex: 3}}>
                        <Typography
                            sx={{
                                fontWeight: 800,
                                color: '#0f172a',
                                fontSize: '1.12rem',
                                mb: 1.5,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.75,
                                px: 1.75,
                                py: 0.75,
                                borderRadius: 2,
                                bgcolor: 'rgba(255,255,255,0.88)',
                                border: '1px solid rgba(59,130,246,0.15)',
                                boxShadow: '0 6px 20px rgba(15,23,42,0.06)'
                            }}
                        >
                            💰 Trường nổi bật
                        </Typography>
                        {schoolLoading ? (
                            <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
                                <CircularProgress size={18} sx={{color: BRAND_NAVY}} />
                                <Typography sx={{color: '#64748b', fontSize: '0.9rem'}}>Đang tải danh sách trường...</Typography>
                            </Box>
                        ) : showcaseSchools.length === 0 ? (
                            <Typography sx={{color: '#64748b', fontSize: '0.9rem'}}>Hiện chưa có dữ liệu trường.</Typography>
                        ) : (
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: {
                                        xs: '1fr',
                                        sm: 'repeat(2, minmax(0, 1fr))',
                                        md: 'repeat(3, minmax(0, 1fr))'
                                    },
                                    gap: 3
                                }}
                            >
                                {showcaseSchools.map((school) => (
                                    <SchoolCard key={school.id || school.name} school={school} />
                                ))}
                            </Box>
                        )}
                    </Box>
                </Container>
            </Box>
            <Box
                ref={consultSectionRef}
                id="quy-trình"
                sx={{
                    py: {xs: 10, md: 14},
                    scrollMarginTop: '80px',
                    position: 'relative',
                    zIndex: 0,
                    overflow: 'visible',
                    background: `linear-gradient(165deg, ${HOME_CONSULT_SECTION_TOP} 0%, #f0f9ff 45%, #f8fafc 100%)`
                }}
            >
                <Container maxWidth="lg" sx={{px: {xs: 2.5, md: 4}}}>
                    <Box
                        sx={{
                            display: 'grid',
                            width: '100%',
                            pt: {xs: 4, md: 0},
                            columnGap: {xs: 0, md: 3},
                            rowGap: {xs: 3, md: 3.5},
                            gridTemplateColumns: {
                                xs: 'minmax(0, 1fr)',
                                md: 'minmax(0, 5fr) minmax(0, 7fr)'
                            },
                            gridTemplateAreas: {
                                xs: `
                                    "headline"
                                    "step1"
                                    "step2"
                                    "step3"
                                `,
                                md: `
                                    ". step1"
                                    "headline step2"
                                    ". step3"
                                `
                            },
                            alignItems: 'stretch'
                        }}
                    >
                        <Box
                            sx={{
                                gridArea: 'headline',
                                position: {xs: 'static', md: 'relative'},
                                minHeight: {md: 0},
                                overflow: {md: 'visible'},
                                zIndex: 3
                            }}
                        >
                            <Box
                                sx={consultHeadlineContentSx}
                            >
                                <Typography
                                    component="h2"
                                    sx={{
                                        fontWeight: 900,
                                        fontSize: {xs: '1.85rem', sm: '2.25rem', md: '2.65rem'},
                                        lineHeight: 1.08,
                                        letterSpacing: {xs: '0.04em', md: '0.06em'},
                                        textTransform: 'uppercase',
                                        color: '#1e293b',
                                        m: 0
                                    }}
                                >
                                    Tư vấn rõ ràng,
                                    <br />
                                    giải đáp dễ hiểu
                                </Typography>
                                <Typography
                                    sx={{
                                        color: '#64748b',
                                        fontSize: {xs: '0.95rem', md: '1.05rem'},
                                        lineHeight: 1.7,
                                        maxWidth: 440,
                                        mx: 'auto',
                                        m: 0
                                    }}
                                >
                                    Ba hình thức hỗ trợ quý phụ huynh tìm hiểu nhà trường và nhận tư vấn — kính mời quý vị lựa chọn phương án phù hợp.
                                </Typography>
                                <Button
                                    variant="contained"
                                    onClick={() => navigate('/search-schools')}
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 800,
                                        fontSize: {xs: '0.95rem', md: '1rem'},
                                        px: {xs: 4, md: 5},
                                        py: 1.5,
                                        borderRadius: 999,
                                        bgcolor: BRAND_NAVY,
                                        color: '#fff',
                                        boxShadow: '0 12px 32px rgba(37,99,235,0.28)',
                                        mt: {xs: 0.25, md: 0.25},
                                        '&:hover': {
                                            bgcolor: APP_PRIMARY_DARK,
                                            boxShadow: '0 16px 40px rgba(59,130,246,0.32)'
                                        }
                                    }}
                                >
                                    Tìm hiểu thêm
                                </Button>
                            </Box>
                        </Box>
                        {CONSULT_STEPS.map((step, i) => (
                            <Box
                                key={step.n}
                                sx={getConsultStepWrapperSx(step.n, i)}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: {
                                            xs: 'column',
                                            md: step.mirror ? 'row-reverse' : 'row'
                                        },
                                        alignItems: {xs: 'center', md: 'center'},
                                        width: '100%'
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            width: {xs: '100%', md: 'auto'},
                                            mb: {xs: 1.5, md: 0},
                                            zIndex: 2
                                        }}
                                    >
                                        <ConsultGraphicCluster variant={step.variant} mirror={false} />
                                    </Box>
                                    <Card
                                        elevation={0}
                                        sx={getConsultCardSx(step.mirror)}
                                    >
                                        {step.showSparkle ? (
                                            <SparkleIcon
                                                sx={{
                                                    position: 'absolute',
                                                    bottom: 12,
                                                    right: 12,
                                                    fontSize: 22,
                                                    color: BRAND_NAVY,
                                                    opacity: 0.35,
                                                    pointerEvents: 'none'
                                                }}
                                            />
                                        ) : null}
                                        <CardContent
                                            sx={{
                                                p: {xs: 2.25, md: 3},
                                                display: 'flex',
                                                gap: 2,
                                                alignItems: 'flex-start',
                                                pr: step.showSparkle ? {xs: 2.25, md: 4} : undefined
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 38,
                                                    height: 38,
                                                    minWidth: 38,
                                                    borderRadius: '50%',
                                                    bgcolor: BRAND_NAVY,
                                                    color: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 800,
                                                    fontSize: '1rem',
                                                    lineHeight: 1
                                                }}
                                            >
                                                {step.n}
                                            </Box>
                                            <Box sx={{minWidth: 0, pr: step.showSparkle ? 1 : 0}}>
                                                <Typography
                                                    sx={{
                                                        fontWeight: 800,
                                                        fontSize: {xs: '0.98rem', md: '1.06rem'},
                                                        color: '#1e293b',
                                                        lineHeight: 1.45,
                                                        letterSpacing: '-0.01em',
                                                        mb: 1
                                                    }}
                                                >
                                                    {step.title}
                                                </Typography>
                                                <Typography
                                                    sx={{
                                                        color: '#64748b',
                                                        fontSize: {xs: '0.88rem', md: '0.92rem'},
                                                        lineHeight: 1.65,
                                                        fontWeight: 400
                                                    }}
                                                >
                                                    {step.subtitle}
                                                </Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Box>
                            </Box>
                        ))}
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
                        background: 'linear-gradient(180deg, #f8fafc 0%, #f0f9ff 100%)',
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
                                fontWeight: 800,
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

                        {servicePackagesLoading ? (
                            <Box sx={{display: 'flex', justifyContent: 'center', py: 5}}>
                                <CircularProgress />
                            </Box>
                        ) : schoolServicePackages.length === 0 ? (
                            <Typography sx={{textAlign: 'center', color: '#64748b', py: 3}}>
                                Chưa có gói dịch vụ đang hoạt động.
                            </Typography>
                        ) : (
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: {
                                        xs: 'minmax(0, 340px)',
                                        sm: 'repeat(auto-fit, minmax(300px, 340px))',
                                    },
                                    justifyContent: 'center',
                                    gap: 3,
                                }}
                            >
                                {(() => {
                                    const strictlyActivePackages = schoolServicePackages.filter(
                                        (pkg) => String(pkg?.status || "").trim().toUpperCase() === "PACKAGE_ACTIVE"
                                    );
                                    const sortedPackages = [...strictlyActivePackages].sort(
                                        (a, b) => getSupportLevelRank(a?.features?.supportLevel) - getSupportLevelRank(b?.features?.supportLevel)
                                    );
                                    const enterpriseIndex = sortedPackages.findIndex(
                                        (pkg) => String(pkg?.features?.supportLevel || "").toUpperCase() === "ENTERPRISE"
                                    );
                                    const orderedPackages =
                                        enterpriseIndex > -1 && sortedPackages.length >= 3
                                            ? [
                                                  sortedPackages[(enterpriseIndex + 1) % sortedPackages.length],
                                                  sortedPackages[enterpriseIndex],
                                                  ...sortedPackages.filter((_, idx) => idx !== enterpriseIndex && idx !== (enterpriseIndex + 1) % sortedPackages.length),
                                              ]
                                            : sortedPackages;

                                    return orderedPackages.map((pkg, idx) => {
                                        const supportLevel = String(pkg?.features?.supportLevel || "").toUpperCase();
                                        const isEnterprise = supportLevel === "ENTERPRISE";
                                        const isStandard = supportLevel === "STANDARD";
                                        const isBasic = supportLevel === "BASIC";
                                        const isHighlighted = isEnterprise || idx === 1;
                                        const tone = isEnterprise
                                            ? {
                                                  border: '1px solid rgba(236,72,153,0.38)',
                                                  shadow: '0 24px 58px rgba(236,72,153,0.2)',
                                                  background: 'linear-gradient(160deg, #fce7f3 0%, #f5d0fe 50%, #e0e7ff 100%)',
                                                  color: '#7e22ce',
                                                  checkColor: '#db2777',
                                              }
                                            : isStandard
                                                ? {
                                                      border: '1px solid rgba(56,189,248,0.34)',
                                                      shadow: '0 18px 42px rgba(14,165,233,0.14)',
                                                      background: 'linear-gradient(165deg, #ecfeff 0%, #e0f2fe 52%, #dbeafe 100%)',
                                                      color: '#1d4ed8',
                                                      checkColor: '#0284c7',
                                                  }
                                                : isBasic
                                                    ? {
                                                          border: '1px solid rgba(20,184,166,0.28)',
                                                          shadow: '0 16px 36px rgba(20,184,166,0.12)',
                                                          background: 'linear-gradient(165deg, #f0fdf4 0%, #ecfdf5 50%, #f8fafc 100%)',
                                                          color: '#0f766e',
                                                          checkColor: '#0f766e',
                                                      }
                                                    : {
                                                          border: '1px solid rgba(148,163,184,0.26)',
                                                          shadow: '0 16px 40px rgba(51,65,85,0.1)',
                                                          background: '#ffffff',
                                                          color: '#1e3a8a',
                                                          checkColor: '#16a34a',
                                                      };
                                        const featureLines = buildFeatureLines(pkg?.features || {}, pkg?.durationDays);
                                        return (
                                            <Card
                                                key={pkg?.id ?? `${pkg?.name}-${idx}`}
                                                sx={{
                                                    borderRadius: 3,
                                                    border: tone.border,
                                                    boxShadow: tone.shadow,
                                                    background: tone.background,
                                                    color: '#0f172a',
                                                    p: 3,
                                                    minHeight: 470,
                                                    maxWidth: 340,
                                                    width: '100%',
                                                    mx: 'auto',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    opacity: servicePackagesVisible ? 1 : 0,
                                                    transform: servicePackagesVisible ? 'translateY(0px)' : 'translateY(22px)',
                                                    transition: `opacity 0.65s ease ${idx * 120}ms, transform 0.65s ease ${idx * 120}ms`,
                                                    '&:hover': {
                                                        transform: 'translateY(-8px)',
                                                        boxShadow: isHighlighted
                                                            ? '0 30px 64px rgba(236,72,153,0.24)'
                                                            : '0 24px 54px rgba(51,65,85,0.18)',
                                                    },
                                                }}
                                            >
                                                <Box sx={{textAlign: 'center', mb: 2}}>
                                                    <Typography sx={{fontSize: {xs: '2rem', md: '2.2rem'}, fontWeight: 800, letterSpacing: 0.5}}>
                                                        {formatVndPrice(pkg?.price)}
                                                    </Typography>
                                                    <Chip
                                                        label={getSupportLevelLabel(pkg?.features?.supportLevel)}
                                                        sx={{
                                                            mt: 1.2,
                                                            borderRadius: 999,
                                                            fontWeight: 700,
                                                            bgcolor: 'rgba(255,255,255,0.9)',
                                                            color: tone.color
                                                        }}
                                                    />
                                                </Box>

                                                <Box sx={{mb: 2.25, textAlign: 'center'}}>
                                                    <Typography sx={{fontWeight: 800, fontSize: '1.05rem'}}>
                                                        {pkg?.name || 'Gói dịch vụ'}
                                                    </Typography>
                                                </Box>

                                                <Box sx={{display: 'flex', flexDirection: 'column', gap: 1.15, flex: 1}}>
                                                    {featureLines.map((line) => (
                                                        <Box key={`${pkg?.id}-${line}`} sx={{display: 'flex', alignItems: 'flex-start', gap: 1}}>
                                                            <CheckCircleOutlineIcon sx={{fontSize: 18, mt: '2px', color: tone.checkColor}} />
                                                            <Typography sx={{fontSize: 14, lineHeight: 1.55}}>
                                                                {line}
                                                            </Typography>
                                                        </Box>
                                                    ))}
                                                </Box>

                                                <Button
                                                    variant={isHighlighted ? "contained" : "outlined"}
                                                    disabled={buyNowLoadingPackageId != null}
                                                    onClick={() => handleSchoolPackageBuyNow(pkg)}
                                                    sx={{
                                                        mt: 2.75,
                                                        borderRadius: 999,
                                                        textTransform: 'none',
                                                        fontWeight: 800,
                                                        py: 1.1,
                                                        borderColor: isHighlighted ? 'rgba(126,34,206,0.35)' : '#cbd5e1',
                                                        color: isHighlighted ? '#7e22ce' : BRAND_NAVY,
                                                        bgcolor: '#ffffff',
                                                        '&:hover': {
                                                            bgcolor: '#f8fafc',
                                                            borderColor: isHighlighted ? '#7e22ce' : BRAND_NAVY
                                                        }
                                                    }}
                                                >
                                                    {buyNowLoadingPackageId === pkg?.id ? (
                                                        <CircularProgress size={22} color="inherit" />
                                                    ) : (
                                                        "Mua ngay"
                                                    )}
                                                </Button>
                                            </Card>
                                        );
                                    });
                                })()}
                            </Box>
                        )}
                    </Container>
                </Box>
            )}

            <LatestAdmissionNewsSection/>
        </Box>
    );
}
