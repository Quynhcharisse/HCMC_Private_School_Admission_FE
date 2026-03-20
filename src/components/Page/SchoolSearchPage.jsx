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
import {Bookmark as BookmarkIcon, BookmarkBorder as BookmarkBorderIcon, Search as SearchIcon} from "@mui/icons-material";
import TuitionFilter from "../ui/TuitionFilter";
import {showSuccessSnackbar, showWarningSnackbar} from "../ui/AppSnackbar.jsx";
import {
    getSavedSchools,
    getSchoolStorageKey,
    getUserIdentity,
    setSavedSchools
} from "../../utils/savedSchoolsStorage";

// Mock data: (Tỉnh/Thành phố, Phường/Xã, Trường)
// Dùng tạm để fill UI filter + danh sách trường.
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

    const [savedSchoolKeys, setSavedSchoolKeys] = React.useState(() => {
        if (typeof window === "undefined" || !isParent || !userInfo) return new Set();
        const saved = getSavedSchools(userInfo);
        return new Set(saved.map((x) => x?.schoolKey).filter(Boolean));
    });

    const toggleSingleSelection = (value, setter) => {
        setter((prev) => (prev === value ? null : value));
    };

    const filterChipSx = (isSelected) => ({
        borderRadius: 2,
        fontWeight: isSelected ? 700 : 500,
        color: isSelected ? '#0f4fbf' : '#334155',
        bgcolor: isSelected ? '#eff6ff' : '#ffffff',
        border: `1px solid ${isSelected ? '#93c5fd' : '#cbd5e1'}`,
        cursor: 'pointer',
        px: 0.6,
        py: 0.2,
        transition: 'all 0.22s ease',
        boxShadow: isSelected ? '0 2px 8px rgba(37,99,235,0.12)' : 'none',
        '&:hover': {
            bgcolor: isSelected ? '#bfdbfe' : '#eff6ff',
            color: '#1d4ed8',
            borderColor: isSelected ? '#3b82f6' : '#93c5fd',
            transform: 'translateY(-1px)',
            boxShadow: '0 6px 14px rgba(15,23,42,0.10)'
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
    }, [isParent, userIdentity]);

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
        <Box sx={{pt: '80px', minHeight: '100vh', bgcolor: '#f7fbff'}}>
            <Container maxWidth={false} sx={{maxWidth: '1400px', px: {xs: 2, md: 4}, pt: 2, pb: 4}}>
                <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: '300px 1fr'}, gap: 3}}>
                    <Card
                        sx={{
                            p: 2,
                            borderRadius: 3,
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 2px 10px rgba(15,23,42,0.06)',
                            height: 'fit-content',
                            position: {md: 'sticky'},
                            top: {md: 96}
                        }}
                    >
                        <Typography sx={{fontWeight: 700, color: '#0f172a', mb: 1.5}}>Bộ lọc tìm trường</Typography>
                        <Divider sx={{mb: 2}}/>
                        <Stack spacing={2}>
                            <Box>
                                <Typography sx={{fontWeight: 600, fontSize: 14, mb: 1, color: '#334155'}}>Tỉnh, Thành phố</Typography>
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
                                <Typography sx={{fontWeight: 600, fontSize: 14, mb: 1, color: '#334155'}}>Khu vực (Phường/Xã)</Typography>
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
                                            '& fieldset': {borderColor: 'rgba(25,118,210,0.25)'},
                                            '&:hover fieldset': {borderColor: 'rgba(25,118,210,0.6)'},
                                            '&.Mui-focused fieldset': {borderColor: '#1976d2', borderWidth: 2}
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
                                <Typography sx={{fontWeight: 600, fontSize: 14, mb: 1, color: '#334155'}}>Nội trú/Bán trú</Typography>
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
                                                    bgcolor: '#bdbdbd',
                                                    color: '#ffffff',
                                                    width: 26,
                                                    height: 26,
                                                    '&:hover': {bgcolor: '#a8a8a8'}
                                                }}
                                            >
                                                <SearchIcon sx={{fontSize: 16}}/>
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                                sx={{
                                    bgcolor: '#ffffff',
                                    borderRadius: 999,
                                    width: '100%',
                                    minWidth: '100%',
                                    maxWidth: '100%',
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 999,
                                        pr: 0.5,
                                        '& fieldset': {
                                            border: '1px solid #cbd5e1',
                                        },
                                        '&:hover fieldset': {
                                            border: '1px solid #94a3b8',
                                        },
                                        '&.Mui-focused fieldset': {
                                            border: '1.5px solid #94a3b8',
                                        }
                                    },
                                    '& .MuiInputBase-input': {
                                        py: 1.2,
                                        pl: 1,
                                        color: '#334155',
                                        fontSize: '0.9rem'
                                    },
                                    '& .MuiInputBase-input::placeholder': {
                                        fontSize: '0.88rem'
                                    },
                                }}
                            />
                        </Box>

                        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap'}}>
                            <Typography sx={{fontWeight: 700, color: '#0f172a'}}>
                                {totalCount === 0 ? "0 trường" : `1 - ${Math.min(20, totalCount)} trên ${totalCount} trường`}
                            </Typography>
                            <Box sx={{display: 'flex', alignItems: 'center', gap: 1.5}}>
                                <Typography sx={{fontSize: 14, color: '#64748b'}}>Sắp xếp theo</Typography>
                                <TextField select size="small" defaultValue="fit" sx={{minWidth: 170}}>
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

                                return (
                                    <Card
                                        key={`${school.province}-${school.ward}-${school.school}`}
                                        sx={{
                                            position: "relative",
                                            display: 'grid',
                                            gridTemplateColumns: {xs: '1fr', sm: '280px 1fr'},
                                            gap: 2,
                                            p: 2,
                                            borderRadius: 3,
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 2px 10px rgba(15,23,42,0.05)'
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
                                                bgcolor: "rgba(255,255,255,0.85)",
                                                border: "1px solid rgba(226,232,240,1)",
                                                '&:hover': {bgcolor: "rgba(255,255,255,1)"},
                                                opacity: isParent ? 1 : 0.65,
                                                cursor: "pointer"
                                            }}
                                        >
                                            {isSaved ? (
                                                <BookmarkIcon fontSize="small" sx={{color: "#f59e0b"}}/>
                                            ) : (
                                                <BookmarkBorderIcon fontSize="small" sx={{color: "#94a3b8"}}/>
                                            )}
                                        </IconButton>
                                    <CardMedia
                                        component="img"
                                        image={DEFAULT_SCHOOL_IMAGE}
                                        alt={school.school}
                                        sx={{height: {xs: 180, sm: 170}, borderRadius: 2}}
                                    />
                                    <Box>
                                        <Typography sx={{fontWeight: 700, fontSize: 24, color: '#0f172a'}}>
                                            {school.school}
                                        </Typography>
                                        <Typography sx={{mt: 0.75, color: '#475569'}}>
                                            {school.province} - {school.ward}
                                        </Typography>
                                        <Box sx={{display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap'}}>
                                            <Chip label={school.ward} size="small" />
                                            <Chip label={school.province} size="small" color="primary" variant="outlined" />
                                        </Box>
                                        <Box sx={{display: 'flex', justifyContent: 'flex-end', mt: 2}}>
                                            <Button size="small" variant="outlined" sx={{textTransform: 'none'}}>
                                                Xem thêm
                                            </Button>
                                        </Box>
                                    </Box>
                                    </Card>
                                );
                            })}
                        </Stack>

                        <Box sx={{display: 'flex', justifyContent: 'center', mt: 3}}>
                            <Pagination count={paginationCount} page={1} color="primary" />
                        </Box>
                    </Box>
                </Box>
            </Container>
        </Box>
    );
}
