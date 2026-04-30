import React from "react";
import {
    Box,
    Button,
    ButtonBase,
    Card,
    CardMedia,
    Chip,
    Container,
    Divider,
    IconButton,
    InputAdornment,
    Link,
    MenuItem,
    Pagination,
    Rating,
    Stack,
    TextField,
    Typography,
    CircularProgress
} from "@mui/material";
import {
    Add as AddIcon,
    AutoAwesome as SparkleIcon,
    CheckCircle as CheckCircleIcon,
    Favorite as FavoriteIcon,
    FavoriteBorder as FavoriteBorderIcon,
    Language as LanguageIcon,
    LocationOn as LocationOnIcon,
    Phone as PhoneIcon,
    Search as SearchIcon,
    Tune as TuneIcon
} from "@mui/icons-material";
import {useLocation, useNavigate} from "react-router-dom";
import {
    APP_PRIMARY_DARK,
    APP_PRIMARY_MAIN,
    APP_PRIMARY_MUTED_BORDER,
    BRAND_NAVY,
    BRAND_SKY,
    BRAND_SKY_LIGHT,
    HOME_PAGE_SURFACE_GRADIENT,
    landingSectionShadow
} from "../../constants/homeLandingTheme";
import {
    getCompareSchools,
    MAX_COMPARE_SCHOOLS,
    setCompareSchools
} from "../../utils/compareSchoolsStorage";
import {showSuccessSnackbar, showWarningSnackbar} from "../ui/AppSnackbar.jsx";
import {
    getSchoolStorageKey,
    getUserIdentity
} from "../../utils/savedSchoolsStorage";
import {getPublicSchoolDetail, getPublicSchoolList, searchNearbyCampuses} from "../../services/SchoolPublicService.jsx";
import {
    deleteParentFavouriteSchool,
    getParentFavouriteSchools,
    postParentFavouriteSchool
} from "../../services/ParentService.jsx";
import SchoolSearchDetailView from "./SchoolSearchDetailView.jsx";
import {DEFAULT_SCHOOL_IMAGE, mapPublicSchoolDetailToRow, normalizeProvinceName} from "../../utils/schoolPublicMapper.js";

const LOCATION_FALLBACK_PROVINCE = "Tất cả";
const LOCATION_FALLBACK_WARD = "Tất cả";
const FAVOURITE_SYNC_PAGE_SIZE = 200;
const SEARCH_SCHOOLS_LIST_PATH = "/search-schools";
const SEARCH_SCHOOLS_DETAIL_PATH = "/search-schools/detail";

function getSchoolUrlName(school) {
    return String(school?.school ?? school?.name ?? "").trim();
}

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
            item?.schoolId ??
            item?.school?.schoolId ??
            item?.school?.id ??
            item?.id ??
            null
        );
        const favouriteId = Number(item?.id ?? item?.favouriteId ?? null);
        if (Number.isFinite(schoolId) && Number.isFinite(favouriteId)) {
            map[schoolId] = favouriteId;
        }
    }
    return map;
}

function mapPublicSchoolToRow(api) {
    if (!api || typeof api !== "object") return null;
    const campusList = Array.isArray(api.campusList) ? api.campusList : [];
    const firstCampus = campusList[0] ?? null;
    return {
        id: api.id,
        school: api.name ?? "",
        province: LOCATION_FALLBACK_PROVINCE,
        ward: LOCATION_FALLBACK_WARD,
        website: api.websiteUrl || "",
        phone: api.hotline || "",
        emailSupport: String(api.emailSupport || "").trim(),
        email: api.email || api.schoolEmail || api.accountEmail || "",
        counsellorEmail: api.counsellorEmail || "",
        address: firstCampus?.address || api.address || "",
        locationLabel: "TP.HCM",
        description: api.description,
        averageRating: typeof api.averageRating === "number" ? api.averageRating : 0,
        totalCampus: api.totalCampus ?? 0,
        logoUrl: api.logoUrl || null,
        isFavourite: Boolean(api.isFavourite),
        foundingDate: api.foundingDate,
        representativeName: api.representativeName,
        campusList: [],
        curriculumList: [],
        boardingType: "",
        hasDetailLoaded: false
    };
}


export default function SchoolSearchPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const rawUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    const userInfo = React.useMemo(() => {
        try {
            return rawUser ? JSON.parse(rawUser) : null;
        } catch {
            return null;
        }
    }, [rawUser]);

    const isParent = userInfo?.role === "PARENT";
    const userIdentity = getUserIdentity(userInfo);
    const canSaveSchool = Boolean(isParent && userInfo);

    const [searchKeyword, setSearchKeyword] = React.useState('');
    const [schools, setSchools] = React.useState([]);
    const [listLoading, setListLoading] = React.useState(true);
    const [listError, setListError] = React.useState(null);
    const [detailLoading, setDetailLoading] = React.useState(false);
    const [detailError, setDetailError] = React.useState(null);
    const [favouriteIdBySchool, setFavouriteIdBySchool] = React.useState({});
    const [selectedDistrict, setSelectedDistrict] = React.useState("");
    const [selectedProvince, setSelectedProvince] = React.useState("");
    const [selectedBoardingType, setSelectedBoardingType] = React.useState(null);

    const provinces = React.useMemo(
        () =>
            Array.from(
                new Set(
                    schools
                        .map((s) => normalizeProvinceName(s.province))
                        .filter((value) => Boolean(value) && value !== LOCATION_FALLBACK_PROVINCE)
                )
            ),
        [schools]
    );
    const wardsByProvince = React.useMemo(() => {
        const acc = {};
        for (const s of schools) {
            const p = normalizeProvinceName(s.province);
            if (!p) continue;
            if (!acc[p]) acc[p] = new Set();
            if (s.ward && s.ward !== LOCATION_FALLBACK_WARD) {
                acc[p].add(s.ward);
            }
        }
        return Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, Array.from(v)]));
    }, [schools]);
    const allWards = React.useMemo(
        () =>
            Array.from(
                new Set(
                    schools
                        .map((s) => s.ward)
                        .filter((value) => Boolean(value) && value !== LOCATION_FALLBACK_WARD)
                )
            ),
        [schools]
    );

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            setListLoading(true);
            setListError(null);
            try {
                const raw = await getPublicSchoolList();
                if (cancelled) return;
                const rows = raw.map(mapPublicSchoolToRow).filter(Boolean);
                const detailRows = await Promise.all(
                    rows.map(async (row) => {
                        if (!row?.id) return row;
                        try {
                            const detailBody = await getPublicSchoolDetail(row.id);
                            const mappedDetail = mapPublicSchoolDetailToRow(detailBody);
                            if (!mappedDetail) return row;
                            return {
                                ...row,
                                ...mappedDetail
                            };
                        } catch {
                            return row;
                        }
                    })
                );
                if (cancelled) return;
                setSchools(detailRows);
            } catch (e) {
                if (!cancelled) {
                    const msg =
                        e?.response?.data?.message ||
                        e?.message ||
                        "Không tải được danh sách trường.";
                    setListError(msg);
                    setSchools([]);
                }
            } finally {
                if (!cancelled) setListLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    React.useEffect(() => {
        window.scrollTo({top: 0, left: 0, behavior: 'auto'});
    }, []);

    const [compareSchoolKeys, setCompareSchoolKeys] = React.useState(() => {
        if (typeof window === "undefined") return new Set();
        const list = getCompareSchools(userInfo);
        return new Set(list.map((x) => x?.schoolKey).filter(Boolean));
    });

    const toggleSingleSelection = (value, setter) => {
        setter((prev) => (prev === value ? null : value));
    };

    const filterChipSx = (isSelected) => ({
        borderRadius: 999,
        fontWeight: isSelected ? 700 : 600,
        fontSize: '0.8125rem',
        color: isSelected ? BRAND_NAVY : '#64748b',
        bgcolor: isSelected ? 'rgba(45, 95, 115, 0.12)' : 'rgba(255,255,255,0.9)',
        border: `1px solid ${isSelected ? 'rgba(59,130,246,0.42)' : 'rgba(51,65,85,0.10)'}`,
        cursor: 'pointer',
        px: 1,
        py: 0.35,
        transition: 'all 0.34s cubic-bezier(0.2, 0, 0, 1)',
        boxShadow: isSelected ? '0 4px 14px rgba(45, 95, 115, 0.14)' : 'none',
        '&:hover': {
            bgcolor: isSelected ? 'rgba(45, 95, 115, 0.18)' : 'rgba(255,255,255,1)',
            color: BRAND_NAVY,
            borderColor: isSelected ? APP_PRIMARY_DARK : APP_PRIMARY_MUTED_BORDER,
            transform: 'translateY(-1px)',
            boxShadow: landingSectionShadow(3)
        }
    });

    React.useEffect(() => {
        const wards = selectedProvince ? (wardsByProvince[selectedProvince] ?? []) : allWards;
        setSelectedDistrict((prev) => (wards.includes(prev) ? prev : ""));
    }, [selectedProvince, wardsByProvince, allWards]);

    React.useEffect(() => {
        const compare = getCompareSchools(userInfo);
        setCompareSchoolKeys(new Set(compare.map((x) => x?.schoolKey).filter(Boolean)));
    }, [userIdentity]);

    const availableDistricts = selectedProvince ? (wardsByProvince[selectedProvince] ?? []) : allWards;
    const normalizedKeyword = searchKeyword.trim().toLowerCase();
    const filteredSchools = schools.filter((s) => {
        const matchProvince = selectedProvince ? normalizeProvinceName(s.province) === selectedProvince : true;
        const matchWard = selectedDistrict ? s.ward === selectedDistrict : true;
        const matchKeyword = normalizedKeyword ? s.school.toLowerCase().includes(normalizedKeyword) : true;
        return matchProvince && matchWard && matchKeyword;
    });
    const shownSchools = filteredSchools.slice(0, 20);
    const totalCount = filteredSchools.length;
    const paginationCount = Math.max(1, Math.ceil(totalCount / 20));
    const maptilerApiKey = import.meta.env.VITE_MAPTILER_API_KEY ?? "";

    const detailRouteActive = location.pathname === SEARCH_SCHOOLS_DETAIL_PATH;
    const detailSchoolNameRaw = React.useMemo(() => {
        const p = new URLSearchParams(location.search);
        return p.get("school");
    }, [location.search]);
    const detailKeyRaw = React.useMemo(() => {
        const p = new URLSearchParams(location.search);
        return p.get("detail");
    }, [location.search]);

    const detailSchool = React.useMemo(() => {
        if (!detailRouteActive) return null;
        if (detailSchoolNameRaw) {
            const normalizedName = detailSchoolNameRaw.trim().toLowerCase();
            const byName = schools.find(
                (s) => getSchoolUrlName(s).toLowerCase() === normalizedName
            );
            if (byName) return byName;
        }
        if (!detailKeyRaw) return null;
        return schools.find((s) => getSchoolStorageKey(s) === detailKeyRaw) ?? null;
    }, [detailKeyRaw, detailRouteActive, detailSchoolNameRaw, schools]);

    React.useEffect(() => {
        if (!detailSchool?.id || detailSchool?.hasDetailLoaded) {
            setDetailError(null);
            setDetailLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            setDetailLoading(true);
            setDetailError(null);
            try {
                const detailBody = await getPublicSchoolDetail(detailSchool.id);
                if (cancelled || !detailBody) return;
                const mapped = mapPublicSchoolDetailToRow(detailBody);
                if (!mapped) return;
                setSchools((prev) =>
                    prev.map((item) =>
                        item?.id === mapped.id
                            ? {
                                ...item,
                                ...mapped
                            }
                            : item
                    )
                );
            } catch (e) {
                if (!cancelled) {
                    const msg =
                        e?.response?.data?.message ||
                        e?.message ||
                        "Không tải được chi tiết trường.";
                    setDetailError(msg);
                }
            } finally {
                if (!cancelled) setDetailLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [detailSchool?.id, detailSchool?.hasDetailLoaded]);

    const openSchoolDetail = React.useCallback(
        (school) => {
            const key = getSchoolStorageKey(school);
            const schoolUrlName = getSchoolUrlName(school);
            const next = new URLSearchParams(location.search);
            if (schoolUrlName) {
                next.set("school", schoolUrlName);
            }
            next.set("detail", key);
            next.delete("consult");
            const qs = next.toString();
            const url = `${SEARCH_SCHOOLS_DETAIL_PATH}${qs ? `?${qs}` : ""}`;
            if (isParent) {
                window.location.assign(url);
                return;
            }
            navigate({pathname: SEARCH_SCHOOLS_DETAIL_PATH, search: qs ? `?${qs}` : ""}, {replace: false});
        },
        [isParent, location.search, navigate]
    );

    const closeSchoolDetail = React.useCallback(() => {
        const next = new URLSearchParams(location.search);
        next.delete("school");
        next.delete("detail");
        next.delete("consult");
        const qs = next.toString();
        const url = `${SEARCH_SCHOOLS_LIST_PATH}${qs ? `?${qs}` : ""}`;
        if (isParent) {
            window.location.replace(url);
            return;
        }
        navigate({pathname: SEARCH_SCHOOLS_LIST_PATH, search: qs ? `?${qs}` : ""}, {replace: true});
    }, [isParent, location.search, navigate]);

    React.useEffect(() => {
        if (detailRouteActive) return;
        const next = new URLSearchParams(location.search);
        const hasDetailParams = next.has("school") || next.has("detail") || next.has("consult");
        if (!hasDetailParams) return;
        next.delete("school");
        next.delete("detail");
        next.delete("consult");
        const qs = next.toString();
        navigate({pathname: SEARCH_SCHOOLS_LIST_PATH, search: qs ? `?${qs}` : ""}, {replace: true});
    }, [detailRouteActive, location.search, navigate]);

    React.useEffect(() => {
        if (!listLoading && detailRouteActive && !detailSchool) {
            const next = new URLSearchParams(location.search);
            next.delete("school");
            next.delete("detail");
            next.delete("consult");
            const qs = next.toString();
            const url = `${SEARCH_SCHOOLS_LIST_PATH}${qs ? `?${qs}` : ""}`;
            if (isParent) {
                window.location.replace(url);
                return;
            }
            navigate({pathname: SEARCH_SCHOOLS_LIST_PATH, search: qs ? `?${qs}` : ""}, {replace: true});
        }
    }, [detailRouteActive, detailSchool, isParent, listLoading, location.search, navigate]);

    React.useEffect(() => {
        if (detailSchool) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = prev;
            };
        }
        return undefined;
    }, [detailSchool]);

    const syncFavouriteLookup = React.useCallback(async () => {
        if (!isParent) {
            setFavouriteIdBySchool({});
            return {};
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
    }, [isParent]);

    React.useEffect(() => {
        if (!isParent) {
            setFavouriteIdBySchool({});
            return;
        }
        void syncFavouriteLookup();
    }, [isParent, userIdentity, syncFavouriteLookup]);

    const toggleSave = async (schoolRecord) => {
        if (!isParent || !userInfo) {
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
            (Number(detailSchool?.id) === schoolId ? detailSchool?.isFavourite : undefined) ??
                schools.find((s) => Number(s?.id) === schoolId)?.isFavourite ??
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
        setSchools((prev) =>
            prev.map((item) =>
                Number(item?.id) === schoolId
                    ? {
                        ...item,
                        isFavourite: !exists
                    }
                    : item
            )
        );
        await syncFavouriteLookup();
        showSuccessSnackbar(exists ? "Đã bỏ trường khỏi Trường yêu thích." : "Đã thêm trường vào Trường yêu thích.");
    };

    const toggleCompare = (schoolRecord) => {
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
                    schoolName: schoolRecord.school,
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
    };

    const compareCount = compareSchoolKeys.size;

    const detailKeyForActions = detailSchool ? getSchoolStorageKey(detailSchool) : "";
    const detailIsSaved = Boolean(detailSchool?.isFavourite);
    const detailInCompare = Boolean(detailSchool && compareSchoolKeys.has(detailKeyForActions));

    return (
        <Box
            sx={{
                pt: {xs: 'calc(72px + 8px)', md: 'calc(80px + 12px)'},
                minHeight: '100vh',
                background: HOME_PAGE_SURFACE_GRADIENT,
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
                    background:
                        'radial-gradient(circle, rgba(85,179,217,0.26) 0%, rgba(168,224,240,0.12) 42%, transparent 68%)',
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
                    background:
                        'radial-gradient(circle, rgba(136,232,242,0.22) 0%, rgba(214,244,252,0.14) 45%, transparent 72%)',
                    pointerEvents: 'none'
                }
            }}
        >
            <Container maxWidth={false} sx={{maxWidth: '1400px', px: {xs: 2, md: 4}, pt: 1, pb: 6, position: 'relative', zIndex: 1}}>
                <Card
                    sx={{
                        mb: 3,
                        p: 0,
                        overflow: 'hidden',
                        borderRadius: 3,
                        border: '1px solid rgba(203,213,225,0.95)',
                        boxShadow: '0 10px 40px rgba(15,23,42,0.07), 0 2px 8px rgba(15,23,42,0.04)',
                        bgcolor: '#fff'
                    }}
                >
                    <Box
                        sx={{
                            px: 2,
                            py: 1.35,
                            bgcolor: BRAND_NAVY,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                        }}
                    >
                        <SparkleIcon sx={{fontSize: 20, color: '#fff'}}/>
                        <Typography
                            sx={{
                                fontSize: '0.8125rem',
                                fontWeight: 800,
                                letterSpacing: '0.08em',
                                color: '#fff'
                            }}
                        >
                            TÌM TRƯỜNG PHÙ HỢP
                        </Typography>
                    </Box>
                    <Box sx={{p: {xs: 2.25, md: 2.75}, bgcolor: '#fff'}}>
                        <Typography
                            sx={{
                                fontWeight: 800,
                                fontSize: {xs: '1.65rem', md: '2rem'},
                                lineHeight: 1.2,
                                letterSpacing: '-0.02em',
                                mb: 1.25,
                                color: BRAND_NAVY
                            }}
                        >
                            Khám phá và so sánh trường học
                        </Typography>
                        <Typography
                            sx={{
                                color: '#64748b',
                                fontSize: {xs: '0.95rem', md: '1.02rem'},
                                lineHeight: 1.65,
                                maxWidth: 720
                            }}
                        >
                            Lọc theo khu vực và nhu cầu nội trú — giao diện đồng bộ với trang chủ EduBridge HCM.
                        </Typography>
                    </Box>
                </Card>

                <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: 'minmax(0, 3fr) minmax(0, 7fr)'}, gap: 3}}>
                    <Card
                        sx={{
                            p: 0,
                            borderRadius: 3,
                            overflow: 'hidden',
                            border: '1px solid rgba(203,213,225,0.95)',
                            bgcolor: '#fff',
                            boxShadow: '0 10px 40px rgba(15,23,42,0.07), 0 2px 8px rgba(15,23,42,0.04)',
                            height: 'fit-content',
                            position: {md: 'sticky'},
                            top: {md: 96}
                        }}
                    >
                        <Box
                            sx={{
                                px: 2,
                                py: 1.35,
                                bgcolor: BRAND_NAVY,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.1
                            }}
                        >
                            <TuneIcon sx={{fontSize: 22, color: '#fff'}}/>
                            <Typography
                                sx={{
                                    fontWeight: 800,
                                    color: '#fff',
                                    fontSize: '1.02rem',
                                    letterSpacing: '0.02em'
                                }}
                            >
                                Bộ lọc tìm trường
                            </Typography>
                        </Box>
                        <Stack spacing={2} sx={{p: 2, pt: 2}}>
                            <Box>
                                <Typography sx={{fontWeight: 700, fontSize: 13, mb: 1, color: BRAND_NAVY, letterSpacing: '0.02em'}}>Tỉnh, Thành phố</Typography>
                                <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap'}}>
                                    <Chip
                                        label="Tất cả"
                                        size="small"
                                        onClick={() => setSelectedProvince("")}
                                        sx={filterChipSx(!selectedProvince)}
                                    />
                                    {provinces.map((province) => (
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
                            <Divider sx={{borderColor: 'rgba(226,232,240,0.95)'}}/>
                            <Box>
                                <Typography sx={{fontWeight: 700, fontSize: 13, mb: 1, color: BRAND_NAVY, letterSpacing: '0.02em'}}>Khu vực (Phường/Xã)</Typography>
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
                                            transition: 'all 0.32s cubic-bezier(0.2, 0, 0, 1)',
                                            bgcolor: 'rgba(255,255,255,0.9)',
                                            '& fieldset': {borderColor: 'rgba(59,130,246,0.22)'},
                                            '&:hover fieldset': {borderColor: 'rgba(59,130,246,0.4)'},
                                            '&.Mui-focused fieldset': {borderColor: BRAND_NAVY, borderWidth: 2}
                                        },
                                        '& .MuiSelect-select': {
                                            pl: 2,
                                            py: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontWeight: 600,
                                            color: '#1e293b'
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
                            <Divider sx={{borderColor: 'rgba(226,232,240,0.95)'}}/>
                            <Box>
                                <Typography sx={{fontWeight: 700, fontSize: 13, mb: 1, color: BRAND_NAVY, letterSpacing: '0.02em'}}>Nội trú/Bán trú</Typography>
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
                        </Stack>
                    </Card>

                    <Box>
                        <Card
                            sx={{
                                mb: 2,
                                p: 0,
                                overflow: 'hidden',
                                borderRadius: 3,
                                border: '1px solid rgba(203,213,225,0.95)',
                                bgcolor: '#fff',
                                boxShadow: '0 10px 40px rgba(15,23,42,0.07), 0 2px 8px rgba(15,23,42,0.04)'
                            }}
                        >
                            <Box
                                sx={{
                                    px: 2,
                                    py: 1.35,
                                    bgcolor: BRAND_NAVY,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.1
                                }}
                            >
                                <SearchIcon sx={{fontSize: 22, color: '#fff'}}/>
                                <Typography
                                    sx={{
                                        fontWeight: 800,
                                        color: '#fff',
                                        fontSize: '1.02rem',
                                        letterSpacing: '0.02em'
                                    }}
                                >
                                    Tìm kiếm
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    p: {xs: 1.75, sm: 2},
                                    pt: {xs: 1.75, sm: 2},
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1.5
                                }}
                            >
                                <TextField
                                    placeholder="Tìm kiếm trường học..."
                                    size="small"
                                    fullWidth
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    size="small"
                                                    sx={{
                                                        background: `linear-gradient(90deg, ${BRAND_NAVY}, ${BRAND_SKY})`,
                                                        color: '#ffffff',
                                                        width: 34,
                                                        height: 34,
                                                        borderRadius: 999,
                                                        boxShadow: '0 8px 22px rgba(45, 95, 115, 0.28)',
                                                        '&:hover': {
                                                            background: `linear-gradient(90deg, ${APP_PRIMARY_DARK}, ${BRAND_NAVY})`,
                                                            boxShadow: '0 10px 28px rgba(45, 95, 115, 0.35)'
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
                                        minWidth: 0,
                                        boxShadow: landingSectionShadow(2),
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 999,
                                            pr: 0.5,
                                            '& fieldset': {
                                                border: '1px solid rgba(59,130,246,0.2)',
                                            },
                                            '&:hover fieldset': {
                                                border: '1px solid rgba(59,130,246,0.38)',
                                            },
                                            '&.Mui-focused fieldset': {
                                                border: `2px solid ${BRAND_NAVY}`,
                                            }
                                        },
                                        '& .MuiInputBase-input': {
                                            py: 1.05,
                                            pl: 1.25,
                                            color: '#1e293b',
                                            fontSize: '0.9rem',
                                            fontWeight: 500
                                        },
                                        '& .MuiInputBase-input::placeholder': {
                                            fontSize: '0.88rem',
                                            color: '#94a3b8'
                                        },
                                    }}
                                />
                                {compareCount > 0 && (
                                    <Box sx={{display: 'flex', justifyContent: 'flex-end'}}>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            onClick={() => navigate("/compare-schools")}
                                            sx={{
                                                textTransform: "none",
                                                fontWeight: 700,
                                                borderRadius: 999,
                                                px: 2,
                                                bgcolor: BRAND_NAVY,
                                                "&:hover": {bgcolor: APP_PRIMARY_DARK}
                                            }}
                                        >
                                            So sánh ({compareCount})
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        </Card>

                        {listError && (
                            <Typography sx={{color: "#b45309", fontSize: "0.95rem", mb: 2, fontWeight: 600}}>
                                {listError}
                            </Typography>
                        )}

                        {listLoading ? (
                            <Box sx={{display: "flex", justifyContent: "center", py: 6}}>
                                <CircularProgress sx={{color: BRAND_NAVY}}/>
                            </Box>
                        ) : (
                        <Stack spacing={2}>
                            {shownSchools.map((school) => {
                                const schoolKey = getSchoolStorageKey(school);
                                const isSaved = Boolean(school?.isFavourite);
                                const inCompare = compareSchoolKeys.has(schoolKey);

                                return (
                                    <Card
                                        key={school.id != null ? `school-${school.id}` : `${school.province}-${school.ward}-${school.school}`}
                                        sx={{
                                            position: "relative",
                                            display: 'grid',
                                            gridTemplateColumns: {xs: '1fr', sm: 'minmax(0, 2.6fr) minmax(0, 7.4fr)'},
                                            gap: {xs: 1.25, sm: 2},
                                            p: {xs: 1.25, sm: 1.35},
                                            borderRadius: 3,
                                            border: '1px solid rgba(203,213,225,0.95)',
                                            bgcolor: '#fff',
                                            boxShadow: '0 8px 28px rgba(15,23,42,0.06), 0 2px 10px rgba(15,23,42,0.04)',
                                            transition:
                                                'transform 0.32s cubic-bezier(0.2, 0, 0.2, 1), box-shadow 0.32s cubic-bezier(0.2, 0, 0.2, 1), border-color 0.32s cubic-bezier(0.2, 0, 0.2, 1), background-color 0.32s ease',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                bgcolor: '#fff',
                                                borderColor: 'rgba(148,163,184,0.65)',
                                                boxShadow: '0 14px 40px rgba(15,23,42,0.1), 0 4px 14px rgba(59,130,246,0.08)'
                                            }
                                        }}
                                    >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '100%',
                                            maxWidth: {xs: '100%', sm: 148},
                                            justifySelf: {sm: 'center'},
                                            alignSelf: 'stretch',
                                            minHeight: {xs: 128, sm: 132},
                                            py: {xs: 0.35, sm: 0.25}
                                        }}
                                    >
                                        <CardMedia
                                            component="img"
                                            image={school.logoUrl || DEFAULT_SCHOOL_IMAGE}
                                            alt={`${school.school} logo`}
                                            sx={{
                                                height: {xs: 120, sm: 120},
                                                width: {xs: '100%', sm: 120},
                                                maxWidth: '100%',
                                                borderRadius: {xs: 2.5, sm: '50%'},
                                                objectFit: 'contain',
                                                objectPosition: 'center',
                                                display: 'block',
                                                bgcolor: {sm: 'rgba(248,250,252,0.95)'},
                                                p: {sm: 0.65},
                                                m: 0
                                            }}
                                        />
                                    </Box>
                                    <Box sx={{display: 'flex', flexDirection: 'column', minHeight: 0, justifyContent: 'center'}}>
                                        <Typography
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: {xs: '1.05rem', sm: '1.2rem'},
                                                color: BRAND_NAVY,
                                                lineHeight: 1.2,
                                                mb: 0.75
                                            }}
                                        >
                                            {school.school}
                                        </Typography>
                                        <Box sx={{display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.4}}>
                                            {(Number(school.averageRating) || 0) > 0 ? (
                                                <>
                                                    <Typography
                                                        component="span"
                                                        sx={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            color: '#000',
                                                            lineHeight: 1,
                                                            display: 'inline-block',
                                                            flexShrink: 0
                                                        }}
                                                    >{Number(school.averageRating).toFixed(1)}</Typography>
                                                    <Rating
                                                        value={Math.min(5, Math.max(0, Number(school.averageRating) || 0))}
                                                        precision={0.1}
                                                        readOnly
                                                        size="small"
                                                        sx={{
                                                            color: '#ffc107',
                                                            display: 'inline-flex',
                                                            verticalAlign: 'middle',
                                                            m: 0,
                                                            p: 0,
                                                            '& .MuiRating-iconFilled': {color: '#ffc107'},
                                                            '& .MuiRating-iconEmpty': {color: 'rgba(0,0,0,0.22)'}
                                                        }}
                                                    />
                                                </>
                                            ) : (
                                                <Typography
                                                    component="span"
                                                    sx={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: 500,
                                                        color: '#000',
                                                        lineHeight: 1.2
                                                    }}
                                                >
                                                    —
                                                </Typography>
                                            )}
                                        </Box>
                                        {school.description ? (
                                            <Typography
                                                sx={{
                                                    mt: 0.5,
                                                    color: '#64748b',
                                                    fontSize: '0.8125rem',
                                                    fontWeight: 400,
                                                    lineHeight: 1.45,
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    wordBreak: 'break-word',
                                                    minHeight: '2.9em'
                                                }}
                                            >
                                                {String(school.description)}
                                            </Typography>
                                        ) : null}
                                        <Box
                                            sx={{
                                                mt: 0.75,
                                                display: 'flex',
                                                flexDirection: {xs: 'column', sm: 'row'},
                                                flexWrap: {sm: 'wrap'},
                                                alignItems: {sm: 'flex-start'},
                                                justifyContent: 'flex-start',
                                                width: '100%',
                                                gap: {xs: 0.65, sm: 3},
                                                alignSelf: 'stretch'
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: 0.35,
                                                    flexShrink: {sm: 1},
                                                    minWidth: 0,
                                                    maxWidth: {sm: 280},
                                                    width: {xs: '100%', sm: 'auto'}
                                                }}
                                            >
                                                <LocationOnIcon sx={{fontSize: 13, color: '#000', flexShrink: 0, mt: '2px'}}/>
                                                <Typography
                                                    sx={{
                                                        fontSize: '0.6875rem',
                                                        fontWeight: 400,
                                                        lineHeight: 1.35,
                                                        color: '#0f172a',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        wordBreak: 'break-word',
                                                        minWidth: 0
                                                    }}
                                                >
                                                    {school.address?.trim() ? school.address : 'Đang cập nhật'}
                                                </Typography>
                                            </Box>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.35,
                                                    flexShrink: 0,
                                                    minWidth: 0,
                                                    maxWidth: {sm: 200},
                                                    width: {xs: '100%', sm: 'auto'}
                                                }}
                                            >
                                                <LanguageIcon sx={{fontSize: 13, color: '#000', flexShrink: 0}}/>
                                                {school.website ? (
                                                    <Link
                                                        href={school.website.startsWith('http') ? school.website : `https://${school.website}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        sx={{
                                                            fontSize: '0.6875rem',
                                                            color: BRAND_NAVY,
                                                            textDecoration: 'none',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            maxWidth: '100%',
                                                            minWidth: 0,
                                                            '&:hover': {
                                                                color: APP_PRIMARY_DARK,
                                                                textDecoration: 'underline'
                                                            }
                                                        }}
                                                    >
                                                        {school.website.replace(/^https?:\/\//i, '')}
                                                    </Link>
                                                ) : (
                                                    <Typography sx={{fontSize: '0.6875rem', color: '#0f172a'}}>—</Typography>
                                                )}
                                            </Box>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.35,
                                                    flexShrink: 0,
                                                    minWidth: 0,
                                                    width: {xs: '100%', sm: 'auto'}
                                                }}
                                            >
                                                <PhoneIcon sx={{fontSize: 13, color: '#000', flexShrink: 0}}/>
                                                <Typography
                                                    sx={{
                                                        fontSize: '0.6875rem',
                                                        color: '#0f172a',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        maxWidth: '100%',
                                                        minWidth: 0
                                                    }}
                                                >
                                                    {school.phone || '—'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                alignItems: 'center',
                                                justifyContent: 'flex-end',
                                                gap: 0.65,
                                                mt: 'auto',
                                                pt: 1
                                            }}
                                        >
                                            <ButtonBase
                                                onClick={() => toggleCompare(school)}
                                                title={inCompare ? "Gỡ khỏi so sánh" : "Thêm vào so sánh"}
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
                                                    <CheckCircleIcon sx={{fontSize: 16, color: BRAND_NAVY}}/>
                                                ) : (
                                                    <AddIcon sx={{fontSize: 16, color: '#64748b'}}/>
                                                )}
                                                So sánh
                                            </ButtonBase>
                                            <ButtonBase
                                                disabled={!canSaveSchool}
                                                onClick={() => toggleSave(school)}
                                                title={
                                                    canSaveSchool
                                                        ? isSaved
                                                            ? "Bỏ yêu thích"
                                                            : "Thêm vào yêu thích"
                                                        : "Đăng nhập với vai trò Phụ huynh để yêu thích trường"
                                                }
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
                                                    },
                                                    '&.Mui-disabled': {opacity: 0.5}
                                                }}
                                            >
                                                {isSaved ? (
                                                    <FavoriteIcon sx={{fontSize: 16, color: '#e11d48'}}/>
                                                ) : (
                                                    <FavoriteBorderIcon sx={{fontSize: 16, color: '#64748b'}}/>
                                                )}
                                                {isSaved ? "Đã yêu thích" : "Yêu thích"}
                                            </ButtonBase>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => openSchoolDetail(school)}
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
                                                    ml: {xs: 0, sm: 0.25},
                                                    '&:hover': {
                                                        borderColor: BRAND_NAVY,
                                                        bgcolor: 'rgba(255,255,255,0.95)'
                                                    }
                                                }}
                                            >
                                                Xem chi tiết
                                            </Button>
                                        </Box>
                                    </Box>
                                    </Card>
                                );
                            })}
                        </Stack>
                        )}

                        {!listLoading && (
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
                                        bgcolor: `${BRAND_NAVY} !important`,
                                        color: '#fff',
                                        '&:hover': {bgcolor: `${APP_PRIMARY_DARK} !important`}
                                    }
                                }}
                            />
                        </Box>
                        )}
                    </Box>
                </Box>
            </Container>

            {detailSchool && (
                <SchoolSearchDetailView
                    school={detailSchool}
                    detailKeyRaw={detailKeyRaw}
                    detailLoading={detailLoading}
                    detailError={detailError}
                    maptilerApiKey={maptilerApiKey}
                    onSearchNearbyCampuses={searchNearbyCampuses}
                    onOpenSchoolById={(schoolId) => {
                        const target = schools.find((s) => Number(s?.id) === Number(schoolId));
                        if (target) {
                            openSchoolDetail(target);
                        } else {
                            navigate("/search-schools");
                        }
                    }}
                    onClose={closeSchoolDetail}
                    navigate={navigate}
                    isParent={isParent}
                    canSaveSchool={canSaveSchool}
                    detailIsSaved={detailIsSaved}
                    detailInCompare={detailInCompare}
                    toggleCompare={toggleCompare}
                    toggleSave={toggleSave}
                />
            )}
        </Box>
    );
}
