import React from "react";
import {
    Box,
    Button,
    Card,
    CardMedia,
    Chip,
    Container,
    Divider,
    IconButton,
    InputAdornment,
    MenuItem,
    Pagination,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import {
    AutoAwesome as SparkleIcon,
    Bookmark as BookmarkIcon,
    BookmarkBorder as BookmarkBorderIcon,
    Search as SearchIcon
} from "@mui/icons-material";
import {GoogleMap, MarkerF, useJsApiLoader} from "@react-google-maps/api";
import {HOME_PAGE_BODY_GRADIENT, landingSectionShadow} from "../../constants/homeLandingTheme";
import TuitionFilter from "../ui/TuitionFilter";
import {showSuccessSnackbar, showWarningSnackbar} from "../ui/AppSnackbar.jsx";
import {
    getSavedSchools,
    getSchoolStorageKey,
    getUserIdentity,
    setSavedSchools
} from "../../utils/savedSchoolsStorage";

const MOCK_SCHOOLS = [
    {province: "TP.HCM", ward: "Phường Sài Gòn", school: "THPT Quốc tế Á Châu – Cơ sở 2"},
    {province: "TP.HCM", ward: "Phường Tân Định", school: "Asian International Primary, Secondary and High School"},
    {province: "TP.HCM", ward: "Phường Bến Thành", school: "Trường THCS & THPT Đăng Khoa"},
    {province: "TP.HCM", ward: "Phường Xuân Hòa", school: "THPT Tây Úc"},
    {province: "TP.HCM", ward: "Phường Xuân Hòa", school: "Western Australian Primary and High School"},
    {province: "TP.HCM", ward: "Phường Nhiêu Lộc", school: "Trường Quốc Tế Tây Úc - Cơ Sở BHTQ"},
    {province: "TP.HCM", ward: "Phường An Đông", school: "Trường THPT Dân Lập An Đông"},
    {province: "TP.HCM", ward: "Phường Chợ Lớn", school: "THPT Văn Lang"},
    {province: "TP.HCM", ward: "Phường Bình Tây", school: "Trường THCS - THPT Phan Bội Châu"},
    {province: "TP.HCM", ward: "Phường Phú Lâm", school: "Trường THPT Quốc Trí"},
    {province: "TP.HCM", ward: "Phường Tân Thuận", school: "Đức Trí Secondary - High School"},
    {province: "TP.HCM", ward: "Phường Tân Thuận", school: "Emasi Nam Long Primary, Secondary and High School"},
    {province: "TP.HCM", ward: "Phường Phú Thuận", school: "Đức Trí Secondary - High School"},
    {province: "TP.HCM", ward: "Phường Tân Mỹ", school: "Canadian International School Vietnam"},
    {province: "TP.HCM", ward: "Phường Tân Mỹ", school: "Korean International School, HCMC (Trường Quốc tế Hàn Quốc – TP. HCM)"},
    {province: "TP.HCM", ward: "Phường Tân Mỹ", school: "Taipei School in Ho Chi Minh City (Trường Đài Bắc)"},
    {province: "TP.HCM", ward: "Phường Tân Hưng", school: "Trường THPT Tân Phong"},
    {province: "TP.HCM", ward: "Phường Tân Hưng", school: "Trường THPT Lê Thánh Tôn"},
    {province: "TP.HCM", ward: "Phường Tân Hưng", school: "Trường THCS & THPT Đức Trí"},
    {province: "TP.HCM", ward: "Phường Tân Hưng", school: "Trường THCS & THPT Sao Việt (VSTAR School)"},
    {province: "TP.HCM", ward: "Phường Hòa Hưng", school: "Trường THCS & THPT Duy Tân"},
    {province: "TP.HCM", ward: "Phường Hòa Hưng", school: "Trường TH – THCS – THPT Vạn Hạnh"},
    {province: "TP.HCM", ward: "Phường Minh Phụng", school: "Trường THPT Quốc Trí"},
    {province: "TP.HCM", ward: "Phường Minh Phụng", school: "Nam Kỳ Khởi Nghĩa High School"},
    {province: "TP.HCM", ward: "Phường Bình Thới", school: "Trường Tiểu học, THCS, THPT Việt Mỹ Quận 11"},
    {province: "TP.HCM", ward: "Phường Phú Thọ", school: "APU International School"},
    {province: "TP.HCM", ward: "Phường Phú Thọ", school: "Tran Quoc Tuan High School"},
    {province: "TP.HCM", ward: "Phường Đông Hưng Thuận", school: "Ngoc Vien Dong Middle School and High School"},
    {province: "TP.HCM", ward: "Phường Trung Mỹ Tây", school: "Trường THPT Huỳnh Túc Kháng"},
    {province: "TP.HCM", ward: "Phường Trung Mỹ Tây", school: "THPT Nhân Việt – Cơ sở 3"},
    {province: "TP.HCM", ward: "Phường Trung Mỹ Tây", school: "Bamboo School Tân Chánh Hiệp - Trường Hội nhập Quốc tế"},
    {province: "TP.HCM", ward: "Phường Tân Thới Hiệp", school: "Viet Au High School"},
    {province: "TP.HCM", ward: "Phường Thới An", school: "Trường THCS và THPT Lạc Hồng cơ sở 2"},
    {province: "TP.HCM", ward: "Phường An Phú Đông", school: "Trường THPT Đông Dương"},
    {province: "TP.HCM", ward: "Phường Bình Tân", school: "THPT Trí Tuệ Việt"},
    {province: "TP.HCM", ward: "Phường Bình Trị Đông", school: "TRƯỜNG THPT TRẦN NHÂN TÔNG"},
    {province: "TP.HCM", ward: "Phường Bình Hưng Hòa", school: "THPT Chu Văn An"},
    {province: "TP.HCM", ward: "Phường Bình Thạnh", school: "Trường THPT Tư Thục Quốc Văn Sài Gòn 3"},
    {province: "TP.HCM", ward: "Phường Bình Thạnh", school: "Trường Trung học phổ thông Sài Gòn"},
    {province: "TP.HCM", ward: "Phường An Nhơn", school: "Ly Thai To High School"},
    {province: "TP.HCM", ward: "Phường Gò Vấp", school: "Hong Ha Secondary School & High School"},
    {province: "TP.HCM", ward: "Phường Đức Nhuận", school: "Trường Việt Anh"},
    {province: "TP.HCM", ward: "Phường Đức Nhuận", school: "Trường THCS & THPT Đức Trí"},
    {province: "TP.HCM", ward: "Phường Đức Nhuận", school: "Trường THCS và THPT Việt Mỹ VASS"},
    {province: "TP.HCM", ward: "Phường Đức Nhuận", school: "Trường THCS - THPT Phan Bội Châu"},
    {province: "TP.HCM", ward: "Phường Đức Nhuận", school: "The International School"},
    {province: "TP.HCM", ward: "Phường Tân Sơn Hòa", school: "TRƯỜNG THÁI BÌNH DƯƠNG (PHS)"},
    {province: "TP.HCM", ward: "Phường Bảy Hiền", school: "Thái Bình Private Secondary and High School"},
    {province: "TP.HCM", ward: "Phường Bảy Hiền", school: "Thanh Bình Primary, Middle and High School"},
    {province: "TP.HCM", ward: "Phường Tân Sơn", school: "Trung học Pathway Tuệ Đức – Cơ sở Nguyễn Sỹ Sách"},
    {province: "TP.HCM", ward: "Phường Tân Sơn Nhì", school: "THPT Thành Nhân"},
    {province: "TP.HCM", ward: "Phường Tân Phú", school: "Trường TH‑THCS‑THPT Tân Phú"},
    {province: "TP.HCM", ward: "Phường Tân Phú", school: "Tri Duc Private High School"},
    {province: "TP.HCM", ward: "Phường Tân Phú", school: "Trường THCS & THPT Nhân Văn"},
    {province: "TP.HCM", ward: "Phường Tân Phú", school: "Trường Tiểu Học ‑ Trung Học Cơ Sở ‑ THPT Hòa Bình"},
    {province: "TP.HCM", ward: "Phường Tân Phú", school: "Bamboo Tân Phú"},
    {province: "TP.HCM", ward: "Phường Hiệp Bình", school: "Hiep Binh High School"},
    {province: "TP.HCM", ward: "Phường Hiệp Bình", school: "Bach Viet Private High School"},
    {province: "TP.HCM", ward: "Phường Long Trường", school: "Trường Trung học Phổ thông Long Trường"},
    {province: "TP.HCM", ward: "Xã Bình Hưng", school: "The ABC International School"},
    {province: "TP.HCM", ward: "Xã Bình Hưng", school: "Singapore International School @ Saigon South (cơ sở Trung Sơn, Binh Hung)"},
    {province: "TP.HCM", ward: "Xã Bình Hưng", school: "Albert Einstein School (ESH)"},
    {province: "TP.HCM", ward: "Xã Tân An Hội", school: "Trường THPT Chiến Thắng"},
    {province: "TP.HCM", ward: "Xã An Nhơn Tây", school: "Trường Trung học Phổ thông An Nhơn Tây"},
    {province: "TP.HCM", ward: "Xã Xuân Thới Sơn", school: "Bamboo Xuân Thới Sơn"},

    {province: "Bình Dương", ward: "Phường Dĩ An", school: "THPT Hoa Sen"},
    {province: "Bình Dương", ward: "Phường Dĩ An", school: "THPT Phan Chu Trinh"},
    {province: "Bình Dương", ward: "Phường Dĩ An", school: "THPT Việt Anh 2"},
    {province: "Bình Dương", ward: "Phường Bình Dương", school: "Trường THPT An Mỹ"},
    {province: "Bình Dương", ward: "Phường Long Nguyên", school: "INschool – Ben Cat Campus"},

    {province: "Bà Rịa - Vũng Tàu", ward: "Phường Vũng Tàu", school: "Trường Việt Mỹ chi nhánh Vũng Tàu"},
    {province: "Bà Rịa - Vũng Tàu", ward: "Phường Vũng Tàu", school: "Trường Thpt Song Ngữ Vũng Tàu"},
    {province: "Bà Rịa - Vũng Tàu", ward: "Phường Vũng Tàu", school: "Singapore International School @ Vung Tau"},
    {province: "Bà Rịa - Vũng Tàu", ward: "Phường Tam Thắng", school: "Trường THPT Tư thục Lê Hồng Phong"},
    {province: "Bà Rịa - Vũng Tàu", ward: "Phường Tam Thắng", school: "Singapore International School @ Vung Tau (SIS Vũng Tàu)"},
];

const PROVINCES = Array.from(new Set(MOCK_SCHOOLS.map((s) => s.province)));
const ALL_WARDS = Array.from(new Set(MOCK_SCHOOLS.map((s) => s.ward)));
const WARDS_BY_PROVINCE = PROVINCES.reduce((acc, province) => {
    acc[province] = Array.from(
        new Set(MOCK_SCHOOLS.filter((s) => s.province === province).map((s) => s.ward))
    );
    return acc;
}, {});

const DEFAULT_PROVINCE = PROVINCES[0] ?? null;
const DEFAULT_WARD = DEFAULT_PROVINCE ? (WARDS_BY_PROVINCE[DEFAULT_PROVINCE]?.[0] ?? "") : "";

const DEFAULT_SCHOOL_IMAGE =
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=80";

const FALLBACK_MAP_CENTER = {lat: 10.7769, lng: 106.7009};
const MAP_CONTAINER_STYLE = {width: "100%", height: "260px"};

function SchoolLocationMap({school, apiKey}) {
    const [markerPosition, setMarkerPosition] = React.useState(null);
    const [isGeocoding, setIsGeocoding] = React.useState(false);
    const [geocodeError, setGeocodeError] = React.useState("");
    const {isLoaded, loadError} = useJsApiLoader({
        id: "school-location-map-script",
        googleMapsApiKey: apiKey
    });

    React.useEffect(() => {
        if (!isLoaded || !school || !window.google?.maps?.Geocoder) return;
        setIsGeocoding(true);
        setGeocodeError("");
        const address = `${school.school}, ${school.ward}, ${school.province}, Vietnam`;
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({address}, (results, status) => {
            setIsGeocoding(false);
            if (status === "OK" && results?.[0]?.geometry?.location) {
                const location = results[0].geometry.location;
                setMarkerPosition({lat: location.lat(), lng: location.lng()});
                return;
            }
            setMarkerPosition(null);
            setGeocodeError("Không thể định vị trường trên bản đồ.");
        });
    }, [isLoaded, school]);

    if (loadError) {
        return (
            <Typography sx={{color: "#dc2626", fontSize: "0.9rem"}}>
                Không tải được Google Maps. Vui lòng kiểm tra API key.
            </Typography>
        );
    }

    if (!isLoaded) {
        return <Typography sx={{color: "#475569"}}>Đang tải bản đồ...</Typography>;
    }

    return (
        <Box>
            <GoogleMap
                mapContainerStyle={MAP_CONTAINER_STYLE}
                center={markerPosition ?? FALLBACK_MAP_CENTER}
                zoom={markerPosition ? 15 : 11}
                options={{
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false
                }}
            >
                {markerPosition && <MarkerF position={markerPosition} />}
            </GoogleMap>
            {isGeocoding && (
                <Typography sx={{mt: 1, color: "#475569", fontSize: "0.9rem"}}>
                    Đang định vị địa chỉ trường...
                </Typography>
            )}
            {!!geocodeError && (
                <Typography sx={{mt: 1, color: "#dc2626", fontSize: "0.9rem"}}>
                    {geocodeError}
                </Typography>
            )}
        </Box>
    );
}

export default function SchoolSearchPage() {
    const rawUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    let userInfo = null;
    try {
        userInfo = rawUser ? JSON.parse(rawUser) : null;
    } catch {
        userInfo = null;
    }

    const isParent = userInfo?.role === "PARENT";
    const userIdentity = getUserIdentity(userInfo);

    const [searchKeyword, setSearchKeyword] = React.useState('');
    const [selectedDistrict, setSelectedDistrict] = React.useState(DEFAULT_WARD);
    const [tuitionMin, setTuitionMin] = React.useState(0);
    const [tuitionMax, setTuitionMax] = React.useState(30);
    const [selectedProvince, setSelectedProvince] = React.useState(DEFAULT_PROVINCE);
    const [selectedBoardingType, setSelectedBoardingType] = React.useState(null);

    React.useEffect(() => {
        window.scrollTo({top: 0, left: 0, behavior: 'auto'});
    }, []);

    const [savedSchoolKeys, setSavedSchoolKeys] = React.useState(() => {
        if (typeof window === "undefined" || !isParent || !userInfo) return new Set();
        const saved = getSavedSchools(userInfo);
        return new Set(saved.map((x) => x?.schoolKey).filter(Boolean));
    });

    const toggleSingleSelection = (value, setter) => {
        setter((prev) => (prev === value ? null : value));
    };

    const filterChipSx = (isSelected) => ({
        borderRadius: 999,
        fontWeight: isSelected ? 700 : 600,
        fontSize: '0.8125rem',
        color: isSelected ? '#4338ca' : '#475569',
        bgcolor: isSelected ? 'rgba(79, 70, 229, 0.12)' : 'rgba(255,255,255,0.9)',
        border: `1px solid ${isSelected ? 'rgba(79,70,229,0.45)' : 'rgba(15,23,42,0.10)'}`,
        cursor: 'pointer',
        px: 1,
        py: 0.35,
        transition: 'all 0.22s cubic-bezier(0.22, 0.61, 0.36, 1)',
        boxShadow: isSelected ? '0 4px 14px rgba(79, 70, 229, 0.18)' : 'none',
        '&:hover': {
            bgcolor: isSelected ? 'rgba(79, 70, 229, 0.18)' : 'rgba(255,255,255,1)',
            color: '#4f46e5',
            borderColor: isSelected ? '#6366f1' : 'rgba(79,70,229,0.28)',
            transform: 'translateY(-1px)',
            boxShadow: landingSectionShadow(3)
        }
    });

    React.useEffect(() => {
        const wards = selectedProvince ? (WARDS_BY_PROVINCE[selectedProvince] ?? []) : ALL_WARDS;
        setSelectedDistrict((prev) => (wards.includes(prev) ? prev : (wards[0] ?? "")));
    }, [selectedProvince]);

    React.useEffect(() => {
        if (!isParent || !userInfo) {
            setSavedSchoolKeys(new Set());
            return;
        }
        const saved = getSavedSchools(userInfo);
        setSavedSchoolKeys(new Set(saved.map((x) => x?.schoolKey).filter(Boolean)));
    }, [isParent, userIdentity, userInfo]);

    const availableDistricts = selectedProvince ? (WARDS_BY_PROVINCE[selectedProvince] ?? []) : ALL_WARDS;
    const normalizedKeyword = searchKeyword.trim().toLowerCase();
    const filteredSchools = MOCK_SCHOOLS.filter((s) => {
        const matchProvince = selectedProvince ? s.province === selectedProvince : true;
        const matchWard = selectedDistrict ? s.ward === selectedDistrict : true;
        const matchKeyword = normalizedKeyword ? s.school.toLowerCase().includes(normalizedKeyword) : true;
        return matchProvince && matchWard && matchKeyword;
    });
    const shownSchools = filteredSchools.slice(0, 20);
    const totalCount = filteredSchools.length;
    const paginationCount = Math.max(1, Math.ceil(totalCount / 20));
    const [selectedSchoolKey, setSelectedSchoolKey] = React.useState("");
    const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

    React.useEffect(() => {
        if (!filteredSchools.length) {
            setSelectedSchoolKey("");
            return;
        }
        setSelectedSchoolKey((prev) => {
            if (!prev) return "";
            return filteredSchools.some((s) => getSchoolStorageKey(s) === prev) ? prev : "";
        });
    }, [filteredSchools]);

    const toggleSave = (schoolRecord) => {
        if (!isParent || !userInfo) {
            showWarningSnackbar("Bạn phải đăng nhập với vai trò Phụ huynh mới lưu được trường.");
            return;
        }
        const schoolKey = getSchoolStorageKey(schoolRecord);
        const saved = getSavedSchools(userInfo);
        const exists = saved.some((x) => x?.schoolKey === schoolKey);
        const next = exists
            ? saved.filter((x) => x?.schoolKey !== schoolKey)
            : [
                ...saved,
                {
                    schoolKey,
                    schoolName: schoolRecord.school,
                    province: schoolRecord.province,
                    ward: schoolRecord.ward
                }
            ];
        setSavedSchools(userInfo, next);
        setSavedSchoolKeys((prev) => {
            const n = new Set(prev);
            if (exists) n.delete(schoolKey);
            else n.add(schoolKey);
            return n;
        });
        showSuccessSnackbar(exists ? "Đã bỏ lưu trường." : "Đã lưu trường vào Trường đã lưu.");
    };

    return (
        <Box
            sx={{
                pt: {xs: 'calc(72px + 16px)', md: 'calc(80px + 24px)'},
                minHeight: '100vh',
                background: HOME_PAGE_BODY_GRADIENT,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    width: {xs: 280, md: 420},
                    height: {xs: 280, md: 420},
                    borderRadius: '50%',
                    top: '-8%',
                    right: '-10%',
                    background: 'radial-gradient(circle, rgba(199,210,254,0.45) 0%, transparent 68%)',
                    pointerEvents: 'none'
                },
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    width: {xs: 220, md: 320},
                    height: {xs: 220, md: 320},
                    borderRadius: '50%',
                    bottom: '12%',
                    left: '-6%',
                    background: 'radial-gradient(circle, rgba(252,231,243,0.5) 0%, transparent 70%)',
                    pointerEvents: 'none'
                }
            }}
        >
            <Container maxWidth={false} sx={{maxWidth: '1400px', px: {xs: 2, md: 4}, pt: 2, pb: 6, position: 'relative', zIndex: 1}}>
                <Box
                    sx={{
                        mb: 3,
                        p: {xs: 2.25, md: 2.75},
                        borderRadius: 4,
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.5) 100%)',
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                        border: '1px solid rgba(255,255,255,0.95)',
                        boxShadow: landingSectionShadow(4)
                    }}
                >
                    <Box sx={{display: 'inline-flex', alignItems: 'center', gap: 1, mb: 1.5}}>
                        <Box
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.75,
                                px: 1.75,
                                py: 0.65,
                                borderRadius: 999,
                                bgcolor: 'rgba(255,255,255,0.72)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.9)',
                                boxShadow: landingSectionShadow(2)
                            }}
                        >
                            <SparkleIcon sx={{fontSize: 18, color: '#7c3aed'}}/>
                            <Typography sx={{fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', color: '#312e81'}}>
                                TÌM TRƯỜNG PHÙ HỢP
                            </Typography>
                        </Box>
                    </Box>
                    <Typography
                        sx={{
                            fontWeight: 800,
                            fontSize: {xs: '1.65rem', md: '2rem'},
                            lineHeight: 1.15,
                            letterSpacing: '-0.03em',
                            mb: 1,
                            background: 'linear-gradient(120deg, #1e1b4b 0%, #4f46e5 45%, #7c3aed 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}
                    >
                        Khám phá và so sánh trường học
                    </Typography>
                    <Typography sx={{color: '#475569', fontSize: {xs: '0.95rem', md: '1.02rem'}, lineHeight: 1.65, maxWidth: 720}}>
                        Lọc theo khu vực, học phí và nhu cầu nội trú — giao diện đồng bộ với trang chủ EduBridge HCM.
                    </Typography>
                </Box>

                <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: '300px 1fr'}, gap: 3}}>
                    <Card
                        sx={{
                            p: 2,
                            borderRadius: 4,
                            border: '1px solid rgba(15,23,42,0.07)',
                            bgcolor: 'rgba(255,255,255,0.72)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            boxShadow: landingSectionShadow(3),
                            height: 'fit-content',
                            position: {md: 'sticky'},
                            top: {md: 96}
                        }}
                    >
                        <Typography sx={{fontWeight: 800, color: '#0f172a', mb: 1.5, fontSize: '1.05rem'}}>Bộ lọc tìm trường</Typography>
                        <Divider sx={{mb: 2, borderColor: 'rgba(15,23,42,0.08)'}}/>
                        <Stack spacing={2}>
                            <Box>
                                <Typography sx={{fontWeight: 700, fontSize: 13, mb: 1, color: '#334155', letterSpacing: '0.02em'}}>Tỉnh, Thành phố</Typography>
                                <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap'}}>
                                    {PROVINCES.map((province) => (
                                        <Chip
                                            key={province}
                                            label={province}
                                            size="small"
                                            onClick={() => toggleSingleSelection(province, setSelectedProvince)}
                                            sx={filterChipSx(selectedProvince === province)}
                                        />
                                    ))}
                                </Box>
                            </Box>
                            <Divider />
                            <Box>
                                <Typography sx={{fontWeight: 700, fontSize: 13, mb: 1, color: '#334155', letterSpacing: '0.02em'}}>Khu vực (Phường/Xã)</Typography>
                                <TextField
                                    select
                                    size="small"
                                    value={selectedDistrict}
                                    onChange={(e) => setSelectedDistrict(e.target.value)}
                                    sx={{
                                        bgcolor: 'white',
                                        borderRadius: 999,
                                        width: '100%',
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 999,
                                            height: 36,
                                            transition: 'all 0.25s ease',
                                            bgcolor: 'rgba(255,255,255,0.9)',
                                            '& fieldset': {borderColor: 'rgba(79,70,229,0.22)'},
                                            '&:hover fieldset': {borderColor: 'rgba(79,70,229,0.45)'},
                                            '&.Mui-focused fieldset': {borderColor: '#4f46e5', borderWidth: 2}
                                        },
                                        '& .MuiSelect-select': {
                                            pl: 2,
                                            py: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontWeight: 600,
                                            color: '#111827'
                                        },
                                        '& .MuiSelect-icon': {
                                            color: '#64748b',
                                            top: 'calc(50% - 9px)'
                                        }
                                    }}
                                    SelectProps={{
                                        displayEmpty: true,
                                        MenuProps: {
                                            PaperProps: {
                                                sx: {
                                                    borderRadius: 2,
                                                    mt: 1,
                                                    maxHeight: 360,
                                                    overflow: 'auto',
                                                    width: 'min(260px, 100%)',
                                                    maxWidth: 260,
                                                    '& .MuiMenuItem-root': {
                                                        py: 1,
                                                        px: 1.5,
                                                        fontSize: 13,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }
                                                }
                                            },
                                            MenuListProps: {
                                                sx: {
                                                    p: 0
                                                }
                                            }
                                        }
                                    }}
                                >
                                    <MenuItem value="">
                                        <Typography sx={{fontSize: 13, color: '#64748b'}}>Chọn khu vực</Typography>
                                    </MenuItem>
                                    {availableDistricts.map((district) => (
                                        <MenuItem key={district} value={district}>
                                            {district}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Box>
                            <Divider />
                            <Box>
                                <Typography sx={{fontWeight: 700, fontSize: 13, mb: 1, color: '#334155', letterSpacing: '0.02em'}}>Nội trú/Bán trú</Typography>
                                <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap'}}>
                                    {['Nội trú', 'Bán trú'].map((boardingType) => (
                                        <Chip
                                            key={boardingType}
                                            label={boardingType}
                                            size="small"
                                            onClick={() => toggleSingleSelection(boardingType, setSelectedBoardingType)}
                                            sx={filterChipSx(selectedBoardingType === boardingType)}
                                        />
                                    ))}
                                </Box>
                            </Box>
                            <Divider />
                            <Box>
                                <TuitionFilter
                                    tuitionMin={tuitionMin}
                                    tuitionMax={tuitionMax}
                                    onChange={(min, max) => {
                                        setTuitionMin(min);
                                        setTuitionMax(max);
                                    }}
                                />
                            </Box>
                        </Stack>
                    </Card>

                    <Box>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: {xs: 'column', lg: 'row'},
                                alignItems: {xs: 'stretch', lg: 'center'},
                                gap: 1.5,
                                mb: 2
                            }}
                        >
                            <TextField
                                placeholder="Tìm kiếm trường học..."
                                size="small"
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                size="small"
                                                sx={{
                                                    background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)',
                                                    color: '#ffffff',
                                                    width: 34,
                                                    height: 34,
                                                    borderRadius: 999,
                                                    boxShadow: '0 8px 22px rgba(79, 70, 229, 0.35)',
                                                    '&:hover': {
                                                        background: 'linear-gradient(90deg, #4338ca 0%, #6d28d9 100%)',
                                                        boxShadow: '0 10px 28px rgba(79, 70, 229, 0.42)'
                                                    }
                                                }}
                                            >
                                                <SearchIcon sx={{fontSize: 18}}/>
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                                sx={{
                                    bgcolor: 'rgba(255,255,255,0.92)',
                                    borderRadius: 999,
                                    width: '100%',
                                    minWidth: '100%',
                                    maxWidth: '100%',
                                    boxShadow: landingSectionShadow(2),
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 999,
                                        pr: 0.5,
                                        '& fieldset': {
                                            border: '1px solid rgba(79,70,229,0.2)',
                                        },
                                        '&:hover fieldset': {
                                            border: '1px solid rgba(79,70,229,0.38)',
                                        },
                                        '&.Mui-focused fieldset': {
                                            border: '2px solid #4f46e5',
                                        }
                                    },
                                    '& .MuiInputBase-input': {
                                        py: 1.2,
                                        pl: 1.25,
                                        color: '#334155',
                                        fontSize: '0.9rem',
                                        fontWeight: 500
                                    },
                                    '& .MuiInputBase-input::placeholder': {
                                        fontSize: '0.88rem',
                                        color: '#94a3b8'
                                    },
                                }}
                            />
                        </Box>

                        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap'}}>
                            <Typography sx={{fontWeight: 800, color: '#0f172a', fontSize: '1rem'}}>
                                {totalCount === 0 ? "0 trường" : `1 - ${Math.min(20, totalCount)} trên ${totalCount} trường`}
                            </Typography>
                            <Box sx={{display: 'flex', alignItems: 'center', gap: 1.5}}>
                                <Typography sx={{fontSize: 14, color: '#64748b', fontWeight: 600}}>Sắp xếp theo</Typography>
                                <TextField
                                    select
                                    size="small"
                                    defaultValue="fit"
                                    sx={{
                                        minWidth: 178,
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 999,
                                            bgcolor: 'rgba(255,255,255,0.92)',
                                            '& fieldset': {borderColor: 'rgba(79,70,229,0.2)'},
                                            '&:hover fieldset': {borderColor: 'rgba(79,70,229,0.38)'},
                                            '&.Mui-focused fieldset': {borderColor: '#4f46e5', borderWidth: 2}
                                        }
                                    }}
                                >
                                    <MenuItem value="fit">Phù hợp nhất</MenuItem>
                                    <MenuItem value="tuitionAsc">Học phí tăng dần</MenuItem>
                                    <MenuItem value="tuitionDesc">Học phí giảm dần</MenuItem>
                                </TextField>
                            </Box>
                        </Box>

                        <Stack spacing={2}>
                            {shownSchools.map((school) => {
                                const schoolKey = getSchoolStorageKey(school);
                                const isSaved = savedSchoolKeys.has(schoolKey);
                                const isExpanded = selectedSchoolKey === schoolKey;
                                const schoolAddress = `${school.school}, ${school.ward}, ${school.province}, Vietnam`;
                                const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(schoolAddress)}`;

                                return (
                                    <Card
                                        key={`${school.province}-${school.ward}-${school.school}`}
                                        sx={{
                                            position: "relative",
                                            display: 'grid',
                                            gridTemplateColumns: {xs: '1fr', sm: '280px 1fr'},
                                            gap: 2,
                                            p: 2,
                                            borderRadius: 4,
                                            border: '1px solid rgba(15,23,42,0.07)',
                                            bgcolor: 'rgba(255,255,255,0.85)',
                                            backdropFilter: 'blur(8px)',
                                            boxShadow: landingSectionShadow(3),
                                            transition: 'transform 0.35s cubic-bezier(0.22, 0.61, 0.36, 1), box-shadow 0.35s ease, border-color 0.25s ease',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: landingSectionShadow(5),
                                                borderColor: 'rgba(79,70,229,0.18)'
                                            }
                                        }}
                                    >
                                        <IconButton
                                            size="small"
                                            onClick={() => toggleSave(school)}
                                            sx={{
                                                position: "absolute",
                                                top: 10,
                                                right: 10,
                                                zIndex: 2,
                                                bgcolor: "rgba(255,255,255,0.92)",
                                                border: "1px solid rgba(79,70,229,0.15)",
                                                '&:hover': {bgcolor: "#fff", borderColor: 'rgba(79,70,229,0.28)'},
                                                opacity: isParent ? 1 : 0.65,
                                                cursor: "pointer"
                                            }}
                                        >
                                            {isSaved ? (
                                                <BookmarkIcon fontSize="small" sx={{color: "#ea580c"}}/>
                                            ) : (
                                                <BookmarkBorderIcon fontSize="small" sx={{color: "#64748b"}}/>
                                            )}
                                        </IconButton>
                                    <CardMedia
                                        component="img"
                                        image={DEFAULT_SCHOOL_IMAGE}
                                        alt={school.school}
                                        sx={{
                                            height: {xs: 180, sm: 170},
                                            borderRadius: 3,
                                            objectFit: 'cover',
                                            border: '1px solid rgba(15,23,42,0.06)'
                                        }}
                                    />
                                    <Box>
                                        <Typography sx={{fontWeight: 800, fontSize: {xs: '1.15rem', sm: '1.35rem'}, color: '#0f172a', lineHeight: 1.25, pr: 4}}>
                                            {school.school}
                                        </Typography>
                                        <Typography sx={{mt: 0.75, color: '#475569', fontSize: '0.95rem'}}>
                                            {school.province} - {school.ward}
                                        </Typography>
                                        <Box sx={{display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap'}}>
                                            <Chip
                                                label={school.ward}
                                                size="small"
                                                sx={{
                                                    borderRadius: 999,
                                                    fontWeight: 600,
                                                    bgcolor: 'rgba(241,245,249,0.95)',
                                                    border: '1px solid rgba(15,23,42,0.08)',
                                                    color: '#475569'
                                                }}
                                            />
                                            <Chip
                                                label={school.province}
                                                size="small"
                                                variant="outlined"
                                                sx={{
                                                    borderRadius: 999,
                                                    fontWeight: 600,
                                                    borderColor: 'rgba(79,70,229,0.35)',
                                                    color: '#4f46e5',
                                                    bgcolor: 'rgba(79,70,229,0.06)'
                                                }}
                                            />
                                        </Box>
                                        <Box sx={{display: 'flex', justifyContent: 'flex-end', mt: 2}}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => setSelectedSchoolKey((prev) => (prev === schoolKey ? "" : schoolKey))}
                                                sx={{
                                                    textTransform: 'none',
                                                    fontWeight: 700,
                                                    borderRadius: 999,
                                                    px: 2,
                                                    borderColor: 'rgba(79,70,229,0.45)',
                                                    color: '#4338ca',
                                                    bgcolor: 'rgba(255,255,255,0.6)',
                                                    '&:hover': {
                                                        borderColor: '#4f46e5',
                                                        bgcolor: 'rgba(255,255,255,0.95)'
                                                    }
                                                }}
                                            >
                                                {isExpanded ? "Thu gọn" : "Xem thêm"}
                                            </Button>
                                        </Box>
                                        {isExpanded && (
                                            <Box
                                                sx={{
                                                    mt: 2,
                                                    pt: 2,
                                                    borderTop: "1px dashed rgba(79,70,229,0.25)"
                                                }}
                                            >
                                                <Typography sx={{fontWeight: 800, color: "#1e1b4b", mb: 0.75}}>
                                                    Vị trí trường
                                                </Typography>
                                                <Typography sx={{color: "#475569", fontSize: "0.92rem", mb: 1.5}}>
                                                    {school.ward}, {school.province}
                                                </Typography>
                                                {!googleMapsApiKey ? (
                                                    <Typography sx={{color: "#b45309", fontSize: "0.9rem"}}>
                                                        Chưa có API key. Thêm `VITE_GOOGLE_MAPS_API_KEY` vào file `.env` để hiển thị bản đồ.
                                                    </Typography>
                                                ) : (
                                                    <SchoolLocationMap school={school} apiKey={googleMapsApiKey} />
                                                )}
                                                <Box sx={{display: "flex", justifyContent: "flex-end", mt: 1.5}}>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        href={directionsUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        sx={{
                                                            textTransform: "none",
                                                            borderRadius: 999,
                                                            fontWeight: 700
                                                        }}
                                                    >
                                                        Chỉ đường đến trường
                                                    </Button>
                                                </Box>
                                            </Box>
                                        )}
                                    </Box>
                                    </Card>
                                );
                            })}
                        </Stack>

                        <Box sx={{display: 'flex', justifyContent: 'center', mt: 3}}>
                            <Pagination
                                count={paginationCount}
                                page={1}
                                sx={{
                                    '& .MuiPaginationItem-root': {
                                        borderRadius: 2,
                                        fontWeight: 600
                                    },
                                    '& .Mui-selected': {
                                        bgcolor: '#4f46e5 !important',
                                        color: '#fff',
                                        '&:hover': {bgcolor: '#4338ca !important'}
                                    }
                                }}
                            />
                        </Box>
                    </Box>
                </Box>
            </Container>
        </Box>
    );
}
