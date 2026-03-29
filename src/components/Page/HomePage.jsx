import React from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    CardMedia,
    Container,
    Typography,
    Avatar,
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
import {getStoredGooglePictureUrl} from "../../utils/storedUserPicture";
import {enqueueSnackbar} from "notistack";
import {
    Chat as ChatIcon,
    ArrowForward as ArrowForwardIcon,
    LocationOn as LocationIcon,
    Star as StarIcon,
    AttachMoney as MoneyIcon,
    Verified as VerifiedIcon,
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
    HEADER_HOME_BAR_BG,
    HOME_PAGE_HERO_BACKDROP,
    HOME_SCHOOL_SECTION_SURFACE,
    HOME_CONSULT_SECTION_TOP,
    HOME_PAGE_HERO_BANNER_GRADIENT,
    HOME_PAGE_SURFACE_GRADIENT,
    landingSectionShadow
} from "../../constants/homeLandingTheme";
import Chatbot from "../ui/Chatbot";
import LayeredMountainSilhouette from "../ui/LayeredMountainSilhouette.jsx";
import SectionWaveEdge from "../ui/SectionWaveEdge.jsx";
import admissionCard1Image from "../../assets/Nguyên tắc công bố tuyển sinh (từ Bộ GD&ĐT).jpg";
import admissionCard2Image from "../../assets/Nhiều trường THPT công bố chỉ tiêu tuyển sinh 2026.jpg";
import admissionCard3Image from "../../assets/TPHCM chốt 3 môn thi tuyển sinh lớp 10 năm 2026.jpeg";
import admissionCard4Image from "../../assets/Đề thi lớp 10 2026 thay đổi theo hướng đánh giá năng lựcwebp.webp";
import admissionCard5Image from "../../assets/TP.HCM tiếp tục kết hợp thi tuyển và xét tuyển.jpg.webp";

const heroMuted = '#334155';

const ADMISSION_CAROUSEL_INTERVAL_MS = 7000;
const ADMISSION_ANIM_MS = 1400;
const admissionEase = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

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

const SCHOOL_SHOWCASE = [
    {
        name: 'THPT Chuyên Lê Hồng Phong',
        district: 'Quận 5',
        location: 'Quận 5, TP.HCM',
        type: 'Công lập',
        tuition: 'Miễn phí',
        rating: 4.9,
        reviews: 12,
        grade: 'A+',
        featured: true,
        badge: 'Top 1 Quận 5',
        cover: 'https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=1200'
    },
    {
        name: 'THPT Nguyễn Thị Minh Khai',
        district: 'Quận 3',
        location: 'Quận 3, TP.HCM',
        type: 'Công lập',
        tuition: 'Miễn phí',
        rating: 4.8,
        reviews: 8,
        grade: 'A',
        featured: true,
        badge: 'Nổi bật',
        cover: 'https://images.pexels.com/photos/8471835/pexels-photo-8471835.jpeg?auto=compress&cs=tinysrgb&w=1200'
    },
    {
        name: 'THPT Trần Đại Nghĩa',
        district: 'Quận 1',
        location: 'Quận 1, TP.HCM',
        type: 'Công lập',
        tuition: 'Miễn phí',
        rating: 4.9,
        reviews: 15,
        grade: 'A+',
        featured: true,
        badge: 'Tỷ lệ đậu cao',
        cover: 'https://images.pexels.com/photos/8617737/pexels-photo-8617737.jpeg?auto=compress&cs=tinysrgb&w=1200'
    },
    {
        name: 'THPT Gia Định',
        district: 'Bình Thạnh',
        location: 'Bình Thạnh, TP.HCM',
        type: 'Công lập',
        tuition: 'Miễn phí',
        rating: 4.7,
        reviews: 10,
        grade: 'A',
        featured: false,
        badge: 'Uy tín khu vực',
        cover: 'https://images.pexels.com/photos/7972737/pexels-photo-7972737.jpeg?auto=compress&cs=tinysrgb&w=1200'
    },
    {
        name: 'THPT Nguyễn Du',
        district: 'Quận 10',
        location: 'Quận 10, TP.HCM',
        type: 'Công lập',
        tuition: 'Miễn phí',
        rating: 4.8,
        reviews: 9,
        grade: 'A',
        featured: false,
        badge: 'Top lựa chọn',
        cover: 'https://images.pexels.com/photos/1184587/pexels-photo-1184587.jpeg?auto=compress&cs=tinysrgb&w=1200'
    },
    {
        name: 'THCS-THPT Hoa Sen',
        district: 'Phú Nhuận',
        location: 'Phú Nhuận, TP.HCM',
        type: 'Tư thục',
        tuition: '3,5 triệu/tháng',
        rating: 4.6,
        reviews: 18,
        grade: 'A',
        featured: false,
        badge: 'Học bổng tốt',
        cover: 'https://images.pexels.com/photos/5905445/pexels-photo-5905445.jpeg?auto=compress&cs=tinysrgb&w=1200'
    },
    {
        name: 'THCS-THPT Việt Âu',
        district: 'Tân Bình',
        location: 'Tân Bình, TP.HCM',
        type: 'Tư thục',
        tuition: '4,2 triệu/tháng',
        rating: 4.5,
        reviews: 14,
        grade: 'B+',
        featured: false,
        badge: 'Cơ sở vật chất mới',
        cover: 'https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg?auto=compress&cs=tinysrgb&w=1200'
    },
    {
        name: 'THCS-THPT Quốc Trí',
        district: 'Gò Vấp',
        location: 'Gò Vấp, TP.HCM',
        type: 'Tư thục',
        tuition: '3,8 triệu/tháng',
        rating: 4.6,
        reviews: 11,
        grade: 'A',
        featured: false,
        badge: 'Đội ngũ tư vấn tốt',
        cover: 'https://images.pexels.com/photos/7972504/pexels-photo-7972504.jpeg?auto=compress&cs=tinysrgb&w=1200'
    },
    {
        name: 'THCS-THPT Ánh Dương',
        district: 'Thủ Đức',
        location: 'TP Thủ Đức, TP.HCM',
        type: 'Tư thục',
        tuition: '4,6 triệu/tháng',
        rating: 4.7,
        reviews: 16,
        grade: 'A',
        featured: false,
        badge: 'Tỷ lệ đậu cao',
        cover: 'https://images.pexels.com/photos/4144222/pexels-photo-4144222.jpeg?auto=compress&cs=tinysrgb&w=1200'
    },
    {
        name: 'THCS-THPT Trí Đức',
        district: 'Quận 7',
        location: 'Quận 7, TP.HCM',
        type: 'Tư thục',
        tuition: '4,0 triệu/tháng',
        rating: 4.5,
        reviews: 13,
        grade: 'B+',
        featured: false,
        badge: 'Hoạt động ngoại khóa mạnh',
        cover: 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=1200'
    },
    {
        name: 'THCS-THPT Bình Minh',
        district: 'Quận 12',
        location: 'Quận 12, TP.HCM',
        type: 'Tư thục',
        tuition: '3,2 triệu/tháng',
        rating: 4.4,
        reviews: 9,
        grade: 'B+',
        featured: false,
        badge: 'Học phí hợp lý',
        cover: 'https://images.pexels.com/photos/1181359/pexels-photo-1181359.jpeg?auto=compress&cs=tinysrgb&w=1200'
    }
];

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
                    backgroundImage: `linear-gradient(180deg, rgba(51,65,85,0.18) 0%, rgba(51,65,85,0.6) 100%), url(${school.cover})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
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
                <Avatar
                    sx={{
                        position: 'absolute',
                        left: 14,
                        bottom: -20,
                        width: 40,
                        height: 40,
                        bgcolor: 'rgba(51,65,85,0.92)',
                        border: '2px solid #fff',
                        fontSize: '0.72rem',
                        fontWeight: 800
                    }}
                >
                    {school.name.split(' ').slice(-2).map((w) => w[0]).join('')}
                </Avatar>
            </Box>

            <CardContent sx={{pt: 3.5, px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.25, flex: 1}}>
                <Typography sx={{fontSize: '1.02rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.35}}>
                    {school.name}
                </Typography>

                <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.75}}>
                    <Chip size="small" label={school.type} sx={{bgcolor: 'rgba(51,65,85,0.08)', fontWeight: 600}} />
                    <Chip size="small" icon={<MoneyIcon sx={{fontSize: 14}} />} label={school.tuition} sx={{bgcolor: APP_PRIMARY_SOFT_BG, fontWeight: 600}} />
                    <Chip size="small" icon={<LocationIcon sx={{fontSize: 14}} />} label={school.district} sx={{bgcolor: 'rgba(59,130,246,0.12)', fontWeight: 600}} />
                </Box>

                <Typography sx={{display: 'flex', alignItems: 'center', gap: 0.75, color: '#64748b', fontSize: '0.88rem'}}>
                    <LocationIcon sx={{fontSize: 16}} />
                    {school.location}
                </Typography>

                <Box sx={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mt: 'auto', pt: 0.5}}>
                    <Box>
                        <Typography sx={{fontSize: '1.08rem', fontWeight: 800, color: APP_PRIMARY_MAIN, lineHeight: 1}}>
                            {school.rating}
                            <Typography component="span" sx={{fontSize: '0.82rem', color: '#64748b', fontWeight: 600, ml: 0.75}}>
                                ({school.reviews} đánh giá)
                            </Typography>
                        </Typography>
                        <Typography sx={{fontSize: '0.78rem', color: '#64748b', mt: 0.35}}>Xếp hạng học lực: {school.grade}</Typography>
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

export default function HomePage() {
    const navigate = useNavigate();
    const [isParentRole, setIsParentRole] = React.useState(false);
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
    const privateSchools = React.useMemo(
        () => SCHOOL_SHOWCASE
            .filter((school) => school.type === 'Tư thục')
            .sort((a, b) => b.rating - a.rating),
        []
    );

    const consultSectionRef = React.useRef(null);
    const [consultVisible, setConsultVisible] = React.useState(false);
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
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                setIsParentRole(user.role === 'PARENT');
                if (user.role === 'PARENT' && user.firstLogin === true) {
                    setShowParentFormModal(true);
                }
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
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

    const handleRegisterClick = () => {
        window.location.href = '/register';
    };

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
            const googleAvatar = getStoredGooglePictureUrl();
            const profilePayload = {
                parentData: {
                    idCardNumber: parentFormData.idCardNumber.trim(),
                    ...(googleAvatar ? {avatar: googleAvatar} : {}),
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
            <Box
                sx={{
                    position: 'relative',
                    pt: {xs: 'calc(72px + 40px)', md: 'calc(80px + 56px)'},
                    pb: {xs: 18, md: 26},
                    overflow: 'hidden',
                    bgcolor: HEADER_HOME_BAR_BG,
                    backgroundImage: HOME_PAGE_HERO_BANNER_GRADIENT,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '100% 100%',
                    boxShadow: 'none'
                }}
            >
                <LayeredMountainSilhouette variant="hero"/>
                <Container maxWidth="lg" sx={{position: 'relative', zIndex: 1, px: {xs: 2, md: 3}, py: 0}}>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {xs: '1fr', md: 'repeat(2, minmax(0, 1fr))'},
                            gap: {xs: 4, md: 6},
                            alignItems: 'stretch',
                            width: '100%'
                        }}
                    >
                        <Box
                            sx={{
                                minWidth: 0,
                                order: {xs: 1, md: 1},
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <Box
                                sx={{
                                    textAlign: {xs: 'center', md: 'left'},
                                    width: '100%',
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minHeight: 0
                                }}
                            >
                                <Box
                                    sx={{
                                        p: {xs: 2.25, md: 3},
                                        borderRadius: 4,
                                        overflow: 'visible',
                                        bgcolor: 'rgba(255,255,255,0.9)',
                                        backdropFilter: 'blur(16px)',
                                        WebkitBackdropFilter: 'blur(16px)',
                                        border: '1px solid rgba(255,255,255,0.98)',
                                        boxShadow: '0 20px 50px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(255,255,255,0.8) inset',
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        height: '100%'
                                    }}
                                >
                                <Box
                                    sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        mb: 2.5,
                                        px: 2.25,
                                        py: 0.85,
                                        borderRadius: 999,
                                        bgcolor: 'rgba(255,255,255,0.95)',
                                        backdropFilter: 'blur(10px)',
                                        border: `1px solid rgba(59,130,246,0.45)`,
                                        boxShadow: '0 8px 28px rgba(15,23,42,0.08)'
                                    }}
                                >
                                    <SparkleIcon sx={{fontSize: 20, color: BRAND_SKY}}/>
                                    <Typography sx={{fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.06em', color: BRAND_NAVY}}>
                                        TƯ VẤN TUYỂN SINH THÔNG MINH
                                    </Typography>
                                </Box>
                                <Typography
                                    variant="h1"
                                    sx={{
                                        fontWeight: 800,
                                        mb: 1.5,
                                        fontSize: {xs: '1.35rem', sm: '1.5rem', md: '1.65rem'},
                                        lineHeight: 1.35,
                                        letterSpacing: '-0.02em',
                                        pt: '0.04em',
                                        pb: '0.2em',
                                        overflow: 'visible',
                                        background: `linear-gradient(120deg, ${APP_PRIMARY_MAIN} 0%, ${BRAND_SKY} 38%, ${BRAND_SKY_LIGHT} 72%, #93c5fd 100%)`,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.85)) drop-shadow(0 2px 8px rgba(255,255,255,0.35))'
                                    }}
                                >
                                    Kết nối phụ huynh và nhà trường
                                </Typography>
                                <Typography
                                    variant="h5"
                                    component="p"
                                    sx={{
                                        mb: 2.5,
                                        fontWeight: 400,
                                        fontSize: {xs: '0.9rem', md: '0.95rem'},
                                        lineHeight: 1.65,
                                        color: heroMuted,
                                        maxWidth: 520,
                                        mx: {xs: 'auto', md: 0}
                                    }}
                                >
                                    So sánh trường, đặt lịch tư vấn và theo dõi hành trình tuyển sinh — giao diện hiện đại, thao tác rõ ràng cho phụ huynh bận rộn.
                                </Typography>
                                <Box sx={{flex: 1, minHeight: 0, minWidth: 0}}/>
                                <Stack
                                    direction={{xs: 'column', sm: 'row'}}
                                    spacing={1.5}
                                    sx={{justifyContent: {xs: 'center', md: 'flex-start'}, mb: 2}}
                                >
                                    {!isParentRole && (
                                        <Button
                                            variant="contained"
                                            size="large"
                                            onClick={handleRegisterClick}
                                            sx={{
                                                bgcolor: '#ffffff',
                                                color: BRAND_NAVY,
                                                px: 3,
                                                py: 1.1,
                                                fontSize: '0.9rem',
                                                fontWeight: 700,
                                                borderRadius: 999,
                                                textTransform: 'none',
                                                boxShadow: '0 12px 32px rgba(37, 99, 235, 0.14), 0 2px 8px rgba(255,255,255,0.9) inset',
                                                minWidth: {xs: '100%', sm: 200},
                                                transition: `transform 0.35s ${consultMotionEase}, box-shadow 0.35s ease`,
                                                '&:hover': {
                                                    bgcolor: '#ffffff',
                                                    boxShadow: '0 18px 44px rgba(37, 99, 235, 0.18), 0 2px 10px rgba(255,255,255,0.95) inset',
                                                    transform: 'translateY(-2px)'
                                                }
                                            }}
                                        >
                                            Đăng ký miễn phí
                                        </Button>
                                    )}
                                    <Button
                                        variant="outlined"
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
                                            borderColor: 'rgba(59,130,246,0.7)',
                                            color: BRAND_NAVY,
                                            bgcolor: 'rgba(255,255,255,0.88)',
                                            minWidth: {xs: '100%', sm: 200},
                                            '&:hover': {
                                                borderColor: BRAND_NAVY,
                                                bgcolor: '#ffffff'
                                            }
                                        }}
                                    >
                                        Tìm trường ngay
                                    </Button>
                                </Stack>
                                <Stack
                                    direction="row"
                                    spacing={2}
                                    flexWrap="wrap"
                                    sx={{justifyContent: {xs: 'center', md: 'flex-start'}, gap: 1.5}}
                                >
                                    {[
                                        {icon: <VerifiedIcon sx={{fontSize: 18, color: BRAND_NAVY}}/>, t: 'Thông tin đã kiểm duyệt'},
                                        {icon: <ChatIcon sx={{fontSize: 18, color: BRAND_NAVY}}/>, t: 'Chat tư vấn 24/7'}
                                    ].map((x) => (
                                        <Box
                                            key={x.t}
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 0.75,
                                                px: 1.5,
                                                py: 0.75,
                                                borderRadius: 999,
                                                bgcolor: 'rgba(255,255,255,0.92)',
                                                border: '1px solid rgba(59,130,246,0.42)'
                                            }}
                                        >
                                            {x.icon}
                                            <Typography sx={{fontSize: '0.8rem', fontWeight: 600, color: BRAND_NAVY}}>
                                                {x.t}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Stack>
                                </Box>
                            </Box>
                        </Box>
                        <Box
                            sx={{
                                minWidth: 0,
                                width: '100%',
                                order: {xs: 2, md: 2},
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: {xs: 'center', md: 'stretch'}
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'relative',
                                    width: '100%',
                                    maxWidth: {xs: 480, md: '100%'},
                                    borderRadius: 3,
                                    p: {xs: 2.5, md: 3},
                                    background: 'linear-gradient(155deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.88) 100%)',
                                    backdropFilter: 'blur(20px) saturate(1.12)',
                                    WebkitBackdropFilter: 'blur(20px) saturate(1.12)',
                                    border: '1px solid rgba(255,255,255,0.98)',
                                    boxShadow: `
                                        0 24px 56px rgba(15, 23, 42, 0.14),
                                        0 0 0 1px rgba(255,255,255,0.9) inset,
                                        0 1px 0 rgba(255,255,255,1) inset
                                    `,
                                    transition: 'transform 0.45s cubic-bezier(0.22, 0.61, 0.36, 1), box-shadow 0.45s ease',
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%',
                                    minHeight: 0,
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: `
                                            0 32px 64px rgba(15, 23, 42, 0.16),
                                            0 0 0 1px rgba(255,255,255,0.92) inset,
                                            0 1px 0 rgba(255,255,255,1) inset
                                        `
                                    },
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        inset: -1,
                                        borderRadius: 4,
                                        background: `linear-gradient(135deg, rgba(59,130,246,0.22), rgba(37,99,235,0.14))`,
                                        zIndex: -1,
                                        filter: 'blur(8px)',
                                        opacity: 0.9
                                    }
                                }}
                            >
                                <Stack spacing={0} sx={{mb: 2, flexShrink: 0}}>
                                    <Typography sx={{fontWeight: 800, fontSize: '0.95rem', color: '#1e293b'}}>
                                        Trò chuyện với EduBridge
                                    </Typography>
                                    <Typography sx={{fontSize: '0.78rem', color: '#64748b'}}>
                                            Gợi ý trường phù hợp theo học lực và khu vực
                                    </Typography>
                                </Stack>
                                <Stack spacing={1.5} sx={{flex: 1, minHeight: 0}}>
                                    <Box
                                        sx={{
                                            alignSelf: 'flex-start',
                                            maxWidth: '92%',
                                            px: 2,
                                            py: 1.25,
                                            borderRadius: '16px 16px 16px 4px',
                                            bgcolor: 'rgba(241,245,249,0.95)',
                                            border: '1px solid rgba(148,163,184,0.35)'
                                        }}
                                    >
                                        <Typography sx={{fontSize: '0.875rem', color: '#334155', lineHeight: 1.55}}>
                                            Chào chị! Con em học lớp 9, điểm TB 8.2 — nên ưu tiên trường nào ở quận trung tâm ạ?
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            alignSelf: 'flex-end',
                                            maxWidth: '88%',
                                            px: 2,
                                            py: 1.25,
                                            borderRadius: '16px 16px 4px 16px',
                                            background: `linear-gradient(125deg, ${BRAND_NAVY} 0%, ${BRAND_SKY} 50%, ${BRAND_SKY_LIGHT} 100%)`,
                                            color: '#fff',
                                            boxShadow: '0 8px 24px rgba(37,99,235,0.35)'
                                        }}
                                    >
                                        <Typography sx={{fontSize: '0.875rem', lineHeight: 1.55, fontWeight: 500}}>
                                            Dựa trên hồ sơ, em gợi ý 3 trường có tỷ lệ chọi phù hợp và lịch tư vấn tuần này. Chị xem nhé ↓
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            gap: 1,
                                            flexWrap: 'wrap',
                                            pt: 0.5
                                        }}
                                    >
                                        {['THPT Chuyên', 'Tư thục A', 'Công lập gần nhà'].map((label) => (
                                            <Chip
                                                key={label}
                                                label={label}
                                                size="small"
                                                sx={{
                                                    bgcolor: 'rgba(255,255,255,0.9)',
                                                    fontWeight: 600,
                                                    fontSize: '0.72rem',
                                                    border: `1px solid ${APP_PRIMARY_SOFT_BORDER}`
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Stack>
                                <Box
                                    sx={{
                                        mt: 'auto',
                                        pt: 2.5,
                                        borderTop: '1px dashed rgba(148,163,184,0.5)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        flexShrink: 0
                                    }}
                                >
                                    <Box
                                        sx={{
                                            flex: 1,
                                            height: 40,
                                            borderRadius: 2,
                                            bgcolor: 'rgba(255,255,255,0.65)',
                                            border: '1px solid rgba(226,232,240,0.9)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            px: 1.5
                                        }}
                                    >
                                        <Typography sx={{fontSize: '0.8rem', color: '#94a3b8'}}>
                                            Nhập câu hỏi…
                                        </Typography>
                                    </Box>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        sx={{
                                            minWidth: 0,
                                            px: 2,
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            background: `linear-gradient(90deg, ${BRAND_NAVY}, ${BRAND_SKY})`,
                                            '&:hover': {background: `linear-gradient(90deg, ${APP_PRIMARY_DARK}, ${BRAND_NAVY})`}
                                        }}
                                    >
                                        Gửi
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Container>
            </Box>

            <Box
                id="trường-nổi-bật"
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    mt: {xs: -7, md: -9},
                    pt: {xs: 10, md: 12},
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
                                So sánh nhanh học phí, vị trí và đánh giá để chọn trường tư thục phù hợp cho học sinh.
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
                            💰 Trường tư thục
                        </Typography>
                        {privateSchools.length === 0 ? (
                            <Typography sx={{color: '#64748b', fontSize: '0.9rem'}}>Hiện chưa có dữ liệu trường tư thục.</Typography>
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
                                {privateSchools.map((school) => (
                                    <SchoolCard key={school.name} school={school} />
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

            <LatestAdmissionNewsSection/>

            <Chatbot />
        </Box>
    );
}
