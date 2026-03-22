import React from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    CardMedia,
    Container,
    Grid,
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
import {enqueueSnackbar} from "notistack";
import {
    Chat as ChatIcon,
    ArrowForward as ArrowForwardIcon,
    LocationOn as LocationIcon,
    Star as StarIcon,
    AttachMoney as MoneyIcon,
    AccountBalance as BoardingIcon,
    Verified as VerifiedIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Search as SearchIcon,
    AutoAwesome as SparkleIcon
} from "@mui/icons-material";
import {useNavigate} from "react-router-dom";
import {
    BRAND_NAVY,
    BRAND_SKY,
    BRAND_SKY_LIGHT,
    HOME_PAGE_HERO_BACKDROP,
    HOME_PAGE_SURFACE_GRADIENT,
    landingSectionShadow
} from "../../constants/homeLandingTheme";
import Chatbot from "../ui/Chatbot";
import LayeredMountainSilhouette from "../ui/LayeredMountainSilhouette.jsx";

const heroMuted = 'rgba(52,102,118,0.82)';

const ADMISSION_CAROUSEL_INTERVAL_MS = 7000;
const ADMISSION_ANIM_MS = 1400;
const admissionEase = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

const ADMISSION_POSTS = [
    {
        title: 'Đại học Quốc gia TP.HCM mở rộng chỉ tiêu chương trình tài năng 2026',
        date: '12/03/2026',
        description: 'Thông tin chi tiết về chỉ tiêu, phương thức xét tuyển và các mốc thời gian quan trọng cho phụ huynh và học sinh.',
        image: 'https://via.placeholder.com/600x350?text=Tin+tuyen+sinh+1',
        tags: ['Tuyển sinh', 'Đại học', 'Xét tuyển']
    },
    {
        title: 'Ngày hội tư vấn định hướng chọn trường THPT cho học sinh lớp 9',
        date: '05/03/2026',
        description: 'Sự kiện quy tụ hơn 50 trường THPT chất lượng cao tại TP.HCM với nhiều hoạt động trải nghiệm thực tế.',
        image: 'https://via.placeholder.com/600x350?text=Tin+tuyen+sinh+2',
        tags: ['Tư vấn', 'THPT', 'Sự kiện']
    },
    {
        title: 'Chuỗi học bổng lên đến 100% học phí từ các trường THPT tư thục',
        date: '28/02/2026',
        description: 'Tổng hợp các chương trình học bổng mới nhất dành cho học sinh có thành tích học tập và hoạt động nổi bật.',
        image: 'https://via.placeholder.com/600x350?text=Tin+tuyen+sinh+3',
        tags: ['Học bổng', 'THPT', 'Tài chính']
    },
    {
        title: 'Cập nhật lịch thi tuyển sinh lớp 10 công lập tại TP.HCM năm 2026',
        date: '20/02/2026',
        description: 'Lịch thi, môn thi và thời gian đăng ký dự thi tuyển sinh lớp 10 các trường công lập tại TP.HCM.',
        image: 'https://via.placeholder.com/600x350?text=Tin+tuyen+sinh+4',
        tags: ['Tuyển sinh', 'Lớp 10', 'THPT']
    },
    {
        title: 'Thông báo xét tuyển học bạ các trường cao đẳng sư phạm khu vực phía Nam',
        date: '15/02/2026',
        description: 'Danh sách trường, mức điểm nhận hồ sơ và hình thức xét tuyển học bạ dành cho thí sinh quan tâm ngành sư phạm.',
        image: 'https://via.placeholder.com/600x350?text=Tin+tuyen+sinh+5',
        tags: ['Cao đẳng', 'Học bạ', 'Sư phạm']
    },
    {
        title: 'Chương trình dự bị đại học liên kết quốc tế',
        date: '08/02/2026',
        description: 'Giới thiệu chương trình dự bị đại học liên kết với các trường quốc tế, phù hợp cho học sinh có định hướng du học.',
        image: 'https://via.placeholder.com/600x350?text=Tin+tuyen+sinh+6',
        tags: ['Tuyển sinh', 'Du học', 'Liên kết quốc tế']
    }
];

/** Ô pastel xếp chồng — chồng lên mép thẻ trắng (layout ngang như mẫu) */
const glassPane = (sx) => ({
    position: 'absolute',
    borderRadius: 3,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.45)',
    boxShadow: '0 12px 36px rgba(15,23,42,0.06)',
    ...sx
});

/** Cụm 3–4 ô nằm cạnh thẻ; mirror = graphic bên phải */
function ConsultGraphicCluster({variant = 1, mirror = false}) {
    const palette = {
        1: [
            ['linear-gradient(145deg, rgba(255,182,193,0.42), rgba(255,205,210,0.32))', -14, 2, 8],
            ['linear-gradient(145deg, rgba(186,230,253,0.4), rgba(167,243,208,0.3))', 16, 44, 36],
            ['linear-gradient(145deg, rgba(254,249,195,0.42), rgba(253,224,71,0.28))', 8, 4, 88],
            ['linear-gradient(145deg, rgba(221,214,254,0.36), rgba(196,181,253,0.28))', -20, 52, 128]
        ],
        2: [
            ['linear-gradient(145deg, rgba(252,231,243,0.44), rgba(251,207,232,0.32))', -18, 0, 12],
            ['linear-gradient(145deg, rgba(207,250,254,0.38), rgba(165,243,252,0.28))', 22, 48, 48],
            ['linear-gradient(145deg, rgba(255,237,213,0.4), rgba(254,215,170,0.3))', -10, 8, 108],
            ['linear-gradient(145deg, rgba(233,213,255,0.34), rgba(216,180,254,0.26))', 14, 56, 168]
        ],
        3: [
            ['linear-gradient(145deg, rgba(255,218,185,0.42), rgba(253,186,116,0.32))', 12, 6, 20],
            ['linear-gradient(145deg, rgba(167,243,208,0.4), rgba(110,231,183,0.28))', -16, 44, 8],
            ['linear-gradient(145deg, rgba(254,249,195,0.4), rgba(250,232,168,0.28))', -8, 4, 112],
            ['linear-gradient(145deg, rgba(251,207,232,0.38), rgba(244,114,182,0.22))', 20, 48, 152]
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

function BlogCard({title, description, image, date, tags, variant = 'featured'}) {
    const isFeatured = variant === 'featured';
    return (
        <Card
            sx={{
                maxWidth: isFeatured ? 440 : 300,
                width: '100%',
                mx: 'auto',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                borderRadius: isFeatured ? 5 : 3,
                boxShadow: isFeatured ? landingSectionShadow(5) : landingSectionShadow(3),
                border: '1px solid rgba(15,23,42,0.07)',
                overflow: 'visible',
                bgcolor: 'transparent',
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
                    boxShadow: isFeatured ? '0 20px 50px rgba(79,70,229,0.12)' : 'none'
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
                        background: 'linear-gradient(180deg, transparent 35%, rgba(15,23,42,0.55) 100%)',
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
                    /* Cùng chiều ngang với ảnh (ảnh mx: 0 khi featured — không thu hẹp khối trắng) */
                    mx: isFeatured ? 0 : 1,
                    mt: isFeatured ? {xs: -4, md: -5} : {xs: -2, md: -2.5},
                    mb: isFeatured ? 1 : 0.5,
                    borderRadius: 3,
                    bgcolor: '#fff',
                    border: '1px solid rgba(255,255,255,0.9)',
                    boxShadow: isFeatured ? '0 16px 40px rgba(15,23,42,0.1)' : landingSectionShadow(2)
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
                        color: '#0f172a',
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
                                bgcolor: 'rgba(99,102,241,0.1)',
                                color: '#4338ca',
                                fontSize: '0.72rem',
                                fontWeight: 600
                            }}
                        />
                    ))}
                </Box>
                <Button
                    size="small"
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
                py: {xs: 8, md: 10},
                background: 'linear-gradient(180deg, #f8f4ff 0%, #f2f4ff 40%, #fbfcfe 100%)',
                scrollMarginTop: '80px',
                position: 'relative'
            }}
        >
            <Container maxWidth="lg" sx={{px: {xs: 2, md: 4}}}>
                <Box
                    sx={{
                        borderRadius: {xs: 3, md: 5},
                        px: {xs: 2, md: 4},
                        py: {xs: 4, md: 5},
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.98) 100%)',
                        border: '1px solid rgba(199,210,254,0.55)',
                        boxShadow: '0 28px 80px rgba(79, 70, 229, 0.08), 0 0 0 1px rgba(255,255,255,0.8) inset'
                    }}
                >
                <Box sx={{textAlign: 'center', mb: {xs: 5, md: 7}}}>
                    <Typography
                        variant="h3"
                        sx={{
                            fontWeight: 800,
                            mb: 2,
                            color: '#0f172a',
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
                                flex: '0 1 48%',
                                maxWidth: 440,
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

                <Stack direction="row" spacing={1} justifyContent="center" sx={{mt: {xs: 4, md: 5}}}>
                    {posts.map((_, i) => (
                        <Box
                            key={i}
                            onClick={() => goToSlide(i)}
                            sx={{
                                width: i === active ? 28 : 9,
                                height: 9,
                                borderRadius: 999,
                                bgcolor: i === active ? '#4f46e5' : 'rgba(15,23,42,0.18)',
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

    const consultSectionRef = React.useRef(null);
    const [consultVisible, setConsultVisible] = React.useState(false);
    const consultMotionEase = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
    const consultStaggerMs = 140;

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
                        boxShadow: '0 12px 40px rgba(15,23,42,0.15)',
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
                                bgcolor: '#265a6b',
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
                    background: HOME_PAGE_HERO_BACKDROP,
                    boxShadow: '0 24px 48px rgba(45, 95, 115, 0.045)'
                }}
            >
                <LayeredMountainSilhouette variant="hero"/>
                <Container maxWidth="lg" sx={{position: 'relative', zIndex: 1, px: {xs: 2, md: 3}, py: 0}}>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {xs: '1fr', md: 'repeat(2, minmax(0, 1fr))'},
                            gap: {xs: 4, md: 6},
                            alignItems: 'center',
                            width: '100%'
                        }}
                    >
                        <Box sx={{minWidth: 0, order: {xs: 1, md: 1}}}>
                            <Box sx={{textAlign: {xs: 'center', md: 'left'}, width: '100%'}}>
                                <Box
                                    sx={{
                                        p: {xs: 2.25, md: 3},
                                        borderRadius: 4,
                                        bgcolor: 'rgba(255,255,255,0.44)',
                                        backdropFilter: 'blur(14px)',
                                        WebkitBackdropFilter: 'blur(14px)',
                                        border: '1px solid rgba(255,255,255,0.65)',
                                        boxShadow: '0 16px 48px rgba(45,95,115,0.06)'
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
                                        bgcolor: 'rgba(255,255,255,0.62)',
                                        backdropFilter: 'blur(10px)',
                                        border: `1px solid rgba(85,179,217,0.45)`,
                                        boxShadow: '0 8px 28px rgba(45,95,115,0.08)'
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
                                        mb: 2,
                                        fontSize: {xs: '2.2rem', sm: '2.75rem', md: '3.25rem'},
                                        lineHeight: 1.08,
                                        letterSpacing: '-0.03em',
                                        // Giữ gradient nhưng không dùng tông quá nhạt ở cuối — tránh chìm vào nền kính xanh nhạt
                                        background: `linear-gradient(120deg, #1a4a5c 0%, ${BRAND_NAVY} 32%, #3a7d96 68%, ${BRAND_SKY} 100%)`,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.65))'
                                    }}
                                >
                                    Kết nối phụ huynh và nhà trường
                                </Typography>
                                <Typography
                                    variant="h5"
                                    component="p"
                                    sx={{
                                        mb: 3.5,
                                        fontWeight: 400,
                                        fontSize: {xs: '1.05rem', md: '1.2rem'},
                                        lineHeight: 1.75,
                                        color: heroMuted,
                                        maxWidth: 520,
                                        mx: {xs: 'auto', md: 0}
                                    }}
                                >
                                    So sánh trường, đặt lịch tư vấn và theo dõi hành trình tuyển sinh — giao diện hiện đại, thao tác rõ ràng cho phụ huynh bận rộn.
                                </Typography>
                                <Stack
                                    direction={{xs: 'column', sm: 'row'}}
                                    spacing={1.5}
                                    sx={{justifyContent: {xs: 'center', md: 'flex-start'}, mb: 3}}
                                >
                                    {!isParentRole && (
                                        <Button
                                            variant="contained"
                                            size="large"
                                            onClick={handleRegisterClick}
                                            sx={{
                                                bgcolor: '#ffffff',
                                                color: BRAND_NAVY,
                                                px: 3.5,
                                                py: 1.35,
                                                fontSize: '1rem',
                                                fontWeight: 700,
                                                borderRadius: 999,
                                                textTransform: 'none',
                                                boxShadow: '0 12px 32px rgba(45, 95, 115, 0.12), 0 2px 8px rgba(255,255,255,0.9) inset',
                                                minWidth: {xs: '100%', sm: 200},
                                                transition: `transform 0.35s ${consultMotionEase}, box-shadow 0.35s ease`,
                                                '&:hover': {
                                                    bgcolor: '#ffffff',
                                                    boxShadow: '0 18px 44px rgba(45, 95, 115, 0.16), 0 2px 10px rgba(255,255,255,0.95) inset',
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
                                            px: 3,
                                            py: 1.35,
                                            borderColor: 'rgba(85,179,217,0.65)',
                                            color: BRAND_NAVY,
                                            bgcolor: 'rgba(255,255,255,0.45)',
                                            minWidth: {xs: '100%', sm: 200},
                                            '&:hover': {
                                                borderColor: BRAND_NAVY,
                                                bgcolor: 'rgba(255,255,255,0.75)'
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
                                                bgcolor: 'rgba(255,255,255,0.5)',
                                                border: '1px solid rgba(85,179,217,0.35)'
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
                                justifyContent: {xs: 'center', md: 'stretch'}
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'relative',
                                    width: '100%',
                                    maxWidth: {xs: 480, md: '100%'},
                                    borderRadius: 3,
                                    p: {xs: 2.5, md: 3},
                                    background: 'linear-gradient(155deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.52) 100%)',
                                    backdropFilter: 'blur(18px) saturate(1.15)',
                                    WebkitBackdropFilter: 'blur(18px) saturate(1.15)',
                                    border: '1px solid rgba(255,255,255,0.9)',
                                    boxShadow: `
                                        0 20px 50px rgba(45, 95, 115, 0.1),
                                        0 0 0 1px rgba(255,255,255,0.65) inset,
                                        0 1px 0 rgba(255,255,255,0.95) inset
                                    `,
                                    transition: 'transform 0.45s cubic-bezier(0.22, 0.61, 0.36, 1), box-shadow 0.45s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: `
                                            0 28px 60px rgba(45, 95, 115, 0.14),
                                            0 0 0 1px rgba(255,255,255,0.75) inset,
                                            0 1px 0 rgba(255,255,255,1) inset
                                        `
                                    },
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        inset: -1,
                                        borderRadius: 4,
                                        background: `linear-gradient(135deg, rgba(85,179,217,0.35), rgba(45,95,115,0.22))`,
                                        zIndex: -1,
                                        filter: 'blur(8px)',
                                        opacity: 0.85
                                    }
                                }}
                            >
                                <Stack spacing={0} sx={{mb: 2}}>
                                    <Typography sx={{fontWeight: 800, fontSize: '0.95rem', color: '#0f172a'}}>
                                        Trò chuyện với EduBridge
                                    </Typography>
                                    <Typography sx={{fontSize: '0.78rem', color: '#64748b'}}>
                                            Gợi ý trường phù hợp theo học lực và khu vực
                                    </Typography>
                                </Stack>
                                <Stack spacing={1.5}>
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
                                            boxShadow: '0 8px 24px rgba(45,95,115,0.35)'
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
                                                    border: '1px solid rgba(199,210,254,0.9)'
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Stack>
                                <Box
                                    sx={{
                                        mt: 2.5,
                                        pt: 2,
                                        borderTop: '1px dashed rgba(148,163,184,0.5)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1
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
                                            '&:hover': {background: `linear-gradient(90deg, #265a6b, ${BRAND_NAVY})`}
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
                    py: {xs: 8, md: 10},
                    background: `linear-gradient(180deg, ${HOME_PAGE_HERO_BACKDROP} 0%, rgba(255,250,242,0.88) 28%, #fbfcfe 100%)`,
                    position: 'relative',
                    scrollMarginTop: '80px',
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.8)`
                }}
            >
                <Container maxWidth="xl" sx={{px: {xs: 2, sm: 3, md: 4}}}>
                    <Box sx={{mb: {xs: 4, md: 6}, textAlign: 'center'}}>
                        <Box sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            mb: 1.5,
                            px: 2,
                            py: 0.75,
                            borderRadius: 999,
                            bgcolor: 'rgba(99,102,241,0.1)',
                            border: '1px solid rgba(99,102,241,0.22)'
                        }}>
                            <StarIcon sx={{fontSize: 18, color: '#7c3aed'}}/>
                            <Typography sx={{
                                fontSize: '0.8125rem',
                                fontWeight: 700,
                                color: '#4f46e5',
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase'
                            }}>
                                Nổi bật
                            </Typography>
                        </Box>
                        <Typography
                            variant="h2"
                            sx={{
                                fontWeight: 800,
                                mb: 1,
                                color: '#0f172a',
                                fontSize: {xs: '1.75rem', sm: '2.25rem', md: '2.5rem'},
                                letterSpacing: '-0.02em',
                                lineHeight: 1.2
                            }}
                        >
                            Top 5 trường học nổi bật
                        </Typography>
                        <Typography variant="body1" sx={{
                            color: '#64748b',
                            fontSize: {xs: '0.9375rem', md: '1rem'},
                            maxWidth: '600px',
                            mx: 'auto',
                            lineHeight: 1.65
                        }}>
                            Các trường uy tín đồng hành cùng EduBridgeHCM — thẻ pastel, dễ so sánh nhanh.
                        </Typography>
                    </Box>

                    <Grid container spacing={{xs: 2.5, sm: 3, md: 3.5}} justifyContent="center">
                        {[
                            {name: 'Trường THPT Chuyên Lê Hồng Phong', location: 'Quận 5, TP.HCM', logo: 'LHP', rating: 4.9, reviews: 12, tuition: 'Miễn phí', grade: 'A+', featured: true, boarding: true},
                            {name: 'Trường THPT Nguyễn Thị Minh Khai', location: 'Quận 3, TP.HCM', logo: 'NTMK', rating: 4.8, reviews: 8, tuition: 'Miễn phí', grade: 'A', featured: true, boarding: true},
                            {name: 'Trường THPT Trần Đại Nghĩa', location: 'Quận 1, TP.HCM', logo: 'TDN', rating: 4.9, reviews: 15, tuition: 'Miễn phí', grade: 'A+', featured: true, boarding: true},
                            {name: 'Trường THPT Gia Định', location: 'Quận Bình Thạnh, TP.HCM', logo: 'GD', rating: 4.7, reviews: 10, tuition: 'Miễn phí', grade: 'A', featured: false, boarding: true},
                            {name: 'Trường THPT Nguyễn Du', location: 'Quận 10, TP.HCM', logo: 'ND', rating: 4.8, reviews: 9, tuition: 'Miễn phí', grade: 'A', featured: false, boarding: true}
                        ].map((school, index) => (
                            <Grid 
                                item 
                                xs={12} 
                                sm={6} 
                                md={4} 
                                lg={2.4}
                                key={index}
                            sx={{
                                    '@media (min-width: 1200px)': {
                                        maxWidth: '20%',
                                        flexBasis: '20%'
                                    }
                                }}
                            >
                            <Card
                                sx={{
                                    height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    borderRadius: 3,
                                    overflow: 'hidden',
                                        bgcolor: 'white',
                                        boxShadow: landingSectionShadow(3),
                                        border: '1px solid rgba(15,23,42,0.08)',
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        cursor: 'pointer',
                                    '&:hover': {
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                            transform: 'translateY(-6px)',
                                            '& .school-image': {
                                                transform: 'scale(1.05)'
                                                }
                                            }
                                        }}
                                    >
                                    <Box sx={{
                                        position: 'relative',
                                        width: '100%',
                                        height: {xs: 180, sm: 200, md: 220},
                                        bgcolor: '#ede9fe',
                                                background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 55%, #fce7f3 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                        overflow: 'hidden'
                                    }}>
                                        {school.featured && (
                                            <Box sx={{
                                                        position: 'absolute',
                                                top: 12,
                                                left: 12,
                                                zIndex: 2,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.5,
                                                px: 1.5,
                                                py: 0.5,
                                                borderRadius: 1.5,
                                                bgcolor: '#17a2b8',
                                                border: '1px solid #17a2b8'
                                            }}>
                                                <StarIcon sx={{fontSize: 14, color: 'white'}}/>
                                                <Typography sx={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    color: 'white'
                                                }}>
                                                    Nổi bật
                                        </Typography>
                                    </Box>
                                        )}
                                        
                                        {school.boarding && (
                                            <Box sx={{
                                            position: 'absolute',
                                                top: school.featured ? 48 : 12,
                                                left: 12,
                                                zIndex: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                                gap: 0.5,
                                                px: 1.5,
                                                py: 0.5,
                                                borderRadius: 1.5,
                                                bgcolor: 'rgba(255,255,255,0.9)',
                                                border: '1px solid rgba(0,0,0,0.1)'
                                            }}>
                                                <BoardingIcon sx={{fontSize: 14, color: '#666'}}/>
                                                <Typography sx={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 500,
                                                    color: '#333'
                                                }}>
                                                    Trường tư
                                            </Typography>
                                    </Box>
                                        )}
                                        
                                        <Avatar
                                            className="school-image"
                                sx={{
                                                width: 100,
                                                height: 100,
                                                bgcolor: BRAND_NAVY,
                                                fontSize: '2rem',
                                                fontWeight: 700,
                                                boxShadow: '0 4px 16px rgba(45,95,115,0.35)',
                                                background: `linear-gradient(135deg, ${BRAND_NAVY} 0%, ${BRAND_SKY} 100%)`,
                                                transition: 'transform 0.3s ease'
                                            }}
                                        >
                                            {school.logo}
                                        </Avatar>
                                    </Box>
                                    
                                    <CardContent sx={{
                                        flexGrow: 1,
                                                display: 'flex',
                                        flexDirection: 'column',
                                        p: 2.5
                                    }}>
                                        <Box sx={{display: 'flex', alignItems: 'flex-start', mb: 1.5, gap: 1}}>
                                            <Typography 
                                                variant="h6" 
                                                sx={{
                                                    fontWeight: 600, 
                                                    color: '#1e1b4b', 
                                                    fontSize: {xs: '1rem', sm: '1.0625rem'}, 
                                                    lineHeight: 1.3,
                                                    flex: 1
                                                }}
                                            >
                                            {school.name}
                                        </Typography>
                                        </Box>
                                        
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.75,
                                            mb: 1.5
                                        }}>
                                            <MoneyIcon sx={{fontSize: 18, color: '#666'}}/>
                                            <Typography sx={{
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                color: '#333'
                                            }}>
                                                {school.tuition}
                                        </Typography>
                                    </Box>
                                        
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.75,
                                            mb: 1.5
                                        }}>
                                            <LocationIcon sx={{fontSize: 18, color: '#666'}}/>
                                            <Typography sx={{
                                                fontSize: '0.875rem',
                                                color: '#666'
                                            }}>
                                                {school.location}
                                            </Typography>
                                    </Box>
                                        
                                        <Box sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                            gap: 1.5,
                                            pt: 1.5,
                                            borderTop: '1px solid rgba(0,0,0,0.08)',
                                            mt: 'auto'
                                        }}>
                                            <Box sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.75
                                            }}>
                                                <Box sx={{
                                                    px: 1,
                                                    py: 0.25,
                                                    borderRadius: 1,
                                                    bgcolor: '#dc3545',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <Typography sx={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        color: 'white'
                                                    }}>
                                                        {school.grade}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{display: 'flex', alignItems: 'center', gap: 0.25}}>
                                                    {[...Array(5)].map((_, i) => (
                                                        <StarIcon 
                                                            key={i}
                                            sx={{
                                                                fontSize: 14,
                                                                color: i < Math.floor(school.rating) ? '#ffb300' : '#ddd'
                                                            }}
                                                        />
                                                    ))}
                                        </Box>
                                                <Typography sx={{
                                                    fontSize: '0.8125rem',
                                                    color: '#666',
                                                    ml: 0.5
                                                }}>
                                                    {school.rating} ({school.reviews} Bình luận)
                                        </Typography>
                                    </Box>
                                        </Box>
                                        
                                        <Box sx={{
                                            display: 'flex',
                                            justifyContent: 'flex-end',
                                            mt: 1
                                        }}>
                                            <ArrowForwardIcon sx={{
                                                fontSize: 20,
                                                color: '#6366f1'
                                            }}/>
                                        </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            <Box
                ref={consultSectionRef}
                id="quy-trình"
                sx={{
                    py: {xs: 10, md: 14},
                    scrollMarginTop: '80px',
                    position: 'relative',
                    overflow: 'hidden',
                    /** Nền section tách lớp rõ với phần còn lại của trang */
                    background: 'linear-gradient(165deg, #f2f4ff 0%, #f5f8fa 42%, #fcfaff 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)'
                }}
            >
                <Container maxWidth="lg" sx={{px: {xs: 2.5, md: 4}}}>
                    <Grid container spacing={{xs: 7, md: 12}} alignItems="flex-start">
                        <Grid item xs={12} md={5}>
                            <Box
                                sx={{
                                    transition: `opacity 0.9s ${consultMotionEase}, transform 0.9s ${consultMotionEase}`,
                                    opacity: consultVisible ? 1 : 0,
                                    transform: consultVisible ? 'translateY(0)' : 'translateY(24px)',
                                    textAlign: {xs: 'center', md: 'left'}
                                }}
                            >
                                <Typography
                                    component="h2"
                                    sx={{
                                        fontWeight: 900,
                                        fontSize: {xs: '1.85rem', sm: '2.25rem', md: '2.65rem'},
                                        lineHeight: 1.08,
                                        letterSpacing: {xs: '0.04em', md: '0.06em'},
                                        textTransform: 'uppercase',
                                        color: '#0f172a',
                                        mb: 2.5
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
                                        mb: {xs: 2, md: 2.5},
                                        maxWidth: 440,
                                        mx: {xs: 'auto', md: 0}
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
                                        bgcolor: '#0f172a',
                                        color: '#fff',
                                        boxShadow: '0 12px 32px rgba(15,23,42,0.22)',
                                        '&:hover': {
                                            bgcolor: '#020617',
                                            boxShadow: '0 16px 40px rgba(15,23,42,0.28)'
                                        }
                                    }}
                                >
                                    Tìm hiểu thêm
                                </Button>
                            </Box>
                        </Grid>
                        <Grid
                            item
                            xs={12}
                            md={7}
                            sx={{
                                pt: {xs: 7, md: 18},
                                pl: {xs: 0, md: 3}
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: {xs: 3, md: 3.5},
                                    position: 'relative',
                                    alignItems: 'stretch',
                                    maxWidth: '100%',
                                    pl: {xs: 0, md: 0},
                                    pr: {xs: 0, md: 0}
                                }}
                            >
                                {[
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
                                ].map((step, i) => (
                                    <Box
                                        key={step.n}
                                        sx={{
                                            position: 'relative',
                                            width: '100%',
                                            maxWidth: {xs: '100%', md: 540},
                                            alignSelf: {
                                                xs: 'stretch',
                                                md: i === 1 ? 'flex-end' : 'flex-start'
                                            },
                                            zIndex: 2,
                                            transition: `opacity 0.85s ${consultMotionEase}, transform 0.85s ${consultMotionEase}`,
                                            transitionDelay: consultVisible ? `${i * consultStaggerMs}ms` : '0ms',
                                            opacity: consultVisible ? 1 : 0,
                                            transform: consultVisible
                                                ? 'translateX(0)'
                                                : {xs: 'translateX(20px)', md: 'translateX(40px)'},
                                            overflow: 'visible'
                                        }}
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
                                                <ConsultGraphicCluster
                                                    variant={step.variant}
                                                    mirror={false}
                                                />
                                            </Box>
                                            <Card
                                                elevation={0}
                                                sx={{
                                                    position: 'relative',
                                                    zIndex: 1,
                                                    flex: 1,
                                                    minWidth: 0,
                                                    width: {xs: '100%', md: 'auto'},
                                                    borderRadius: 3,
                                                    overflow: 'visible',
                                                    bgcolor: '#fff',
                                                    border: '1px solid rgba(226,232,240,0.95)',
                                                    boxShadow: '0 20px 56px rgba(15,23,42,0.08)',
                                                    ml: {xs: 0, md: step.mirror ? 0 : -3.5},
                                                    mr: {xs: 0, md: step.mirror ? -3.5 : 0},
                                                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                                    '&:hover': {
                                                        transform: 'translateY(-3px)',
                                                        boxShadow: '0 24px 64px rgba(15,23,42,0.1)'
                                                    }
                                                }}
                                            >
                                                {step.showSparkle ? (
                                                    <SparkleIcon
                                                        sx={{
                                                            position: 'absolute',
                                                            bottom: 12,
                                                            right: 12,
                                                            fontSize: 22,
                                                            color: '#0f172a',
                                                            opacity: 0.28,
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
                                                            bgcolor: '#0f172a',
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
                                                                color: '#0f172a',
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
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            <LatestAdmissionNewsSection/>

            <Chatbot />
        </Box>
    );
}
