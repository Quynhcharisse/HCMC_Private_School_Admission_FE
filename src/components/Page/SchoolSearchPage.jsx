import React from "react";
import {
    Box,
    Breadcrumbs,
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
    Tab,
    Tabs,
    TextField,
    Typography,
    CircularProgress
} from "@mui/material";
import {
    Add as AddIcon,
    ArrowBack as ArrowBackIcon,
    AutoAwesome as SparkleIcon,
    Bookmark as BookmarkIcon,
    BookmarkBorder as BookmarkBorderIcon,
    CalendarMonth as CalendarMonthIcon,
    CheckCircle as CheckCircleIcon,
    ChatBubbleOutline as ChatBubbleOutlineIcon,
    Email as EmailIcon,
    Favorite as FavoriteIcon,
    FavoriteBorder as FavoriteBorderIcon,
    Language as LanguageIcon,
    LocationOn as LocationOnIcon,
    MapsHomeWork as MapsHomeWorkIcon,
    Phone as PhoneIcon,
    Search as SearchIcon,
    Share as ShareIcon
} from "@mui/icons-material";
import {useLocation, useNavigate} from "react-router-dom";
import {GoogleMap, MarkerF, useJsApiLoader} from "@react-google-maps/api";
import {
    APP_PRIMARY_DARK,
    APP_PRIMARY_MAIN,
    APP_PRIMARY_MUTED_BORDER,
    BRAND_NAVY,
    BRAND_SKY,
    BRAND_SKY_LIGHT,
    HOME_PAGE_HERO_BACKDROP,
    HOME_PAGE_SURFACE_GRADIENT,
    landingSectionShadow
} from "../../constants/homeLandingTheme";
import {OPEN_PARENT_CHAT_EVENT} from "../../constants/parentChatEvents";
import {
    getCompareSchools,
    MAX_COMPARE_SCHOOLS,
    setCompareSchools
} from "../../utils/compareSchoolsStorage";
import TuitionFilter from "../ui/TuitionFilter";
import {showSuccessSnackbar, showWarningSnackbar} from "../ui/AppSnackbar.jsx";
import {
    getSavedSchools,
    getSchoolStorageKey,
    getUserIdentity,
    setSavedSchools
} from "../../utils/savedSchoolsStorage";
import {getPublicSchoolDetail, getPublicSchoolList} from "../../services/SchoolPublicService.jsx";

const LOCATION_FALLBACK_PROVINCE = "Tất cả";
const LOCATION_FALLBACK_WARD = "Tất cả";

function mapPublicSchoolToRow(api) {
    if (!api || typeof api !== "object") return null;
    const campusList = Array.isArray(api.campusList)
        ? api.campusList
        : Array.isArray(api.campustList)
            ? api.campustList
            : [];
    const firstCampus = campusList[0] ?? null;
    return {
        id: api.id,
        school: api.name ?? "",
        province: LOCATION_FALLBACK_PROVINCE,
        ward: LOCATION_FALLBACK_WARD,
        website: api.websiteUrl || "",
        phone: api.hotline || "",
        email: api.email || api.schoolEmail || api.accountEmail || "",
        counsellorEmail: api.counsellorEmail || api.email || api.schoolEmail || api.accountEmail || "",
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

function mapPublicSchoolDetailToRow(api) {
    if (!api || typeof api !== "object") return null;
    const campusList = Array.isArray(api.campusList)
        ? api.campusList
        : Array.isArray(api.campustList)
            ? api.campustList
            : [];
    const firstCampus = campusList[0] ?? null;
    const consultantEmails = campusList
        .flatMap((campus) => (Array.isArray(campus?.consultantEmails) ? campus.consultantEmails : []))
        .map((email) => String(email || "").trim())
        .filter(Boolean);
    const primaryConsultantEmail = consultantEmails[0] || "";
    const province = (firstCampus?.city || "").trim() || LOCATION_FALLBACK_PROVINCE;
    const ward = (firstCampus?.district || "").trim() || LOCATION_FALLBACK_WARD;
    return {
        id: api.id,
        school: api.name ?? "",
        province,
        ward,
        website: api.websiteUrl || "",
        phone: firstCampus?.phoneNumber || api.hotline || "",
        email: primaryConsultantEmail || firstCampus?.email || api.email || api.schoolEmail || api.accountEmail || "",
        counsellorEmail:
            primaryConsultantEmail ||
            firstCampus?.counsellorEmail ||
            firstCampus?.email ||
            api.counsellorEmail ||
            api.email ||
            api.schoolEmail ||
            api.accountEmail ||
            "",
        consultantEmails,
        address: firstCampus?.address || (api.description ? String(api.description) : "Đang cập nhật"),
        locationLabel: province,
        description: api.description,
        averageRating: typeof api.averageRating === "number" ? api.averageRating : 0,
        totalCampus: api.totalCampus ?? campusList.length,
        logoUrl: api.logoUrl || null,
        isFavourite: Boolean(api.isFavourite),
        foundingDate: api.foundingDate,
        representativeName: api.representativeName,
        campusList,
        curriculumList: Array.isArray(api.curriculumList) ? api.curriculumList : [],
        boardingType: firstCampus?.boardingType || "",
        hasDetailLoaded: true
    };
}

const DEFAULT_SCHOOL_IMAGE =
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=80";

const FALLBACK_MAP_CENTER = {lat: 10.7769, lng: 106.7009};
const MAP_CONTAINER_STYLE = {width: "100%", height: "260px"};

const DETAIL_SCROLL_HEADROOM = 88;
const DETAIL_WITH_HEADER_OFFSET = 78;
const DETAIL_SCROLL_MIN_MS = 420;
const DETAIL_SCROLL_MAX_MS = 980;
const DETAIL_SCROLL_LOCK_BUFFER_MS = 140;

function smootherstep(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function getBoardingTypeTags(rawValue) {
    const normalized = String(rawValue || "").trim().toLowerCase();
    if (!normalized) return [];
    if (normalized === "both") return ["Nội trú", "Bán trú"];
    if (normalized.includes("both")) return ["Nội trú", "Bán trú"];
    if (normalized.includes("nội trú") && normalized.includes("bán trú")) {
        return ["Nội trú", "Bán trú"];
    }
    const tags = [];
    if (normalized.includes("nội trú")) tags.push("Nội trú");
    if (normalized.includes("bán trú")) tags.push("Bán trú");
    return tags.length ? tags : [String(rawValue)];
}

function formatFoundingDate(value) {
    if (!value) return "";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return String(value);
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
}

let detailScrollAnimGeneration = 0;

function smoothScrollContainerToElement(container, element) {
    if (!container || !element || typeof window === "undefined") return;
    const startTop = container.scrollTop;
    const elRect = element.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    const relativeTop = elRect.top - cRect.top + startTop - DETAIL_SCROLL_HEADROOM;
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    const targetTop = Math.max(0, Math.min(relativeTop, maxScroll));
    const distance = targetTop - startTop;
    if (Math.abs(distance) < 0.5) return;
    const duration = Math.max(
        DETAIL_SCROLL_MIN_MS,
        Math.min(DETAIL_SCROLL_MAX_MS, 360 + Math.abs(distance) * 0.55)
    );

    const myGen = ++detailScrollAnimGeneration;
    const startTime = performance.now();

    const step = (now) => {
        if (myGen !== detailScrollAnimGeneration) return;
        const rawT = Math.min(1, (now - startTime) / duration);
        const t = smootherstep(rawT);
        container.scrollTop = startTop + distance * t;
        if (rawT < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    return duration;
}

function buildSchoolContact(school) {
    const hasWebsite = Boolean(school?.website);
    return {
        websiteUrl: hasWebsite
            ? school.website
            : `https://www.google.com/search?q=${encodeURIComponent(school?.school ?? "")}`,
        websiteIsExternal: hasWebsite,
        websiteDisplay: hasWebsite ? school.website : "Tìm kiếm trên Google",
        address: school?.address || `${school?.ward ?? ""}, ${school?.province ?? ""}`.replace(/^,\s*|,\s*$/g, "").trim() || "—",
        phone: school?.phone || "Đang cập nhật",
        email: school?.email || "Đang cập nhật",
        location: school?.locationLabel || school?.province || "—"
    };
}

const CONTACT_BODY = "#64748b";
const CONTACT_MUTED = "#94a3b8";
const contactIconSx = {fontSize: 22, color: CONTACT_BODY, flexShrink: 0, opacity: 0.92};
const contactRowSx = {
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    py: 1.65,
    minHeight: 48
};
const contactDividerSx = {borderColor: "rgba(51,65,85,0.1)"};

function SchoolContactPanel({school}) {
    const c = buildSchoolContact(school);
    return (
        <Card
            sx={{
                p: {xs: 2, sm: 2.5},
                borderRadius: 3,
                border: "1px solid rgba(51,65,85,0.08)",
                boxShadow: landingSectionShadow(2),
                position: {md: "sticky"},
                top: {md: 16},
                bgcolor: "#fff"
            }}
        >
            <Typography sx={{fontWeight: 800, color: "#1e293b", fontSize: "1.05rem", mb: 0.5}}>
                Thông tin liên hệ
            </Typography>
            <Divider sx={{...contactDividerSx, mb: 0.5}}/>

            <Box sx={contactRowSx}>
                <LanguageIcon sx={contactIconSx}/>
                <Link
                    href={c.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    underline="hover"
                    sx={{
                        fontSize: "0.9rem",
                        color: CONTACT_BODY,
                        fontWeight: 400,
                        wordBreak: "break-all",
                        "&:hover": {color: BRAND_NAVY}
                    }}
                >
                    {c.websiteDisplay}
                </Link>
            </Box>
            <Divider sx={contactDividerSx}/>

            <Box sx={contactRowSx}>
                <MapsHomeWorkIcon sx={contactIconSx}/>
                <Typography sx={{fontSize: "0.9rem", color: CONTACT_BODY, fontWeight: 400, lineHeight: 1.45}}>
                    {c.address}
                </Typography>
            </Box>
            <Divider sx={contactDividerSx}/>

            <Box sx={contactRowSx}>
                <PhoneIcon sx={contactIconSx}/>
                <Typography
                    component={c.phone !== "Đang cập nhật" ? "a" : "span"}
                    href={c.phone !== "Đang cập nhật" ? `tel:${c.phone.replace(/\s/g, "")}` : undefined}
                    sx={{
                        fontSize: "0.9rem",
                        color: c.phone === "Đang cập nhật" ? CONTACT_MUTED : CONTACT_BODY,
                        fontWeight: 400,
                        textDecoration: "none",
                        "&:hover": c.phone !== "Đang cập nhật" ? {color: BRAND_NAVY} : {}
                    }}
                >
                    {c.phone}
                </Typography>
            </Box>
            <Divider sx={contactDividerSx}/>

            <Box sx={contactRowSx}>
                <EmailIcon sx={contactIconSx}/>
                <Typography
                    component={c.email !== "Đang cập nhật" ? "a" : "span"}
                    href={c.email !== "Đang cập nhật" ? `mailto:${c.email}` : undefined}
                    sx={{
                        fontSize: "0.9rem",
                        color: c.email === "Đang cập nhật" ? CONTACT_MUTED : CONTACT_BODY,
                        fontWeight: 400,
                        wordBreak: "break-all",
                        textDecoration: "none",
                        "&:hover": c.email !== "Đang cập nhật" ? {color: BRAND_NAVY} : {}
                    }}
                >
                    {c.email}
                </Typography>
            </Box>
            <Divider sx={contactDividerSx}/>

            <Box sx={{...contactRowSx, py: 1.65}}>
                <LocationOnIcon sx={contactIconSx}/>
                <Typography sx={{fontSize: "0.9rem", color: CONTACT_BODY, fontWeight: 400}}>
                    {c.location}
                </Typography>
            </Box>
        </Card>
    );
}

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
        return <Typography sx={{color: "#64748b"}}>Đang tải bản đồ...</Typography>;
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
                <Typography sx={{mt: 1, color: "#64748b", fontSize: "0.9rem"}}>
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
    const navigate = useNavigate();
    const location = useLocation();
    const rawUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    let userInfo = null;
    try {
        userInfo = rawUser ? JSON.parse(rawUser) : null;
    } catch {
        userInfo = null;
    }

    const isParent = userInfo?.role === "PARENT";
    const userIdentity = getUserIdentity(userInfo);
    const canSaveSchool = Boolean(isParent && userInfo);

    const [searchKeyword, setSearchKeyword] = React.useState('');
    const [schools, setSchools] = React.useState([]);
    const [listLoading, setListLoading] = React.useState(true);
    const [listError, setListError] = React.useState(null);
    const [detailLoading, setDetailLoading] = React.useState(false);
    const [detailError, setDetailError] = React.useState(null);
    const [selectedDistrict, setSelectedDistrict] = React.useState("");
    const [tuitionMin, setTuitionMin] = React.useState(0);
    const [tuitionMax, setTuitionMax] = React.useState(30);
    const [selectedProvince, setSelectedProvince] = React.useState("");
    const [selectedBoardingType, setSelectedBoardingType] = React.useState(null);

    const provinces = React.useMemo(
        () => Array.from(new Set(schools.map((s) => s.province).filter(Boolean))),
        [schools]
    );
    const wardsByProvince = React.useMemo(() => {
        const acc = {};
        for (const s of schools) {
            const p = s.province;
            if (!p) continue;
            if (!acc[p]) acc[p] = new Set();
            acc[p].add(s.ward);
        }
        return Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, Array.from(v)]));
    }, [schools]);
    const allWards = React.useMemo(() => Array.from(new Set(schools.map((s) => s.ward).filter(Boolean))), [schools]);

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
        if (!schools.length || !provinces.length) return;
        setSelectedProvince((prev) => (prev && provinces.includes(prev) ? prev : provinces[0]));
    }, [schools, provinces]);

    React.useEffect(() => {
        window.scrollTo({top: 0, left: 0, behavior: 'auto'});
    }, []);

    const [savedSchoolKeys, setSavedSchoolKeys] = React.useState(() => {
        if (typeof window === "undefined" || !isParent || !userInfo) return new Set();
        const saved = getSavedSchools(userInfo);
        return new Set(saved.map((x) => x?.schoolKey).filter(Boolean));
    });

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
        setSelectedDistrict((prev) => (wards.includes(prev) ? prev : (wards[0] ?? "")));
    }, [selectedProvince, wardsByProvince, allWards]);

    React.useEffect(() => {
        if (!isParent || !userInfo) {
            setSavedSchoolKeys(new Set());
        } else {
            const saved = getSavedSchools(userInfo);
            setSavedSchoolKeys(new Set(saved.map((x) => x?.schoolKey).filter(Boolean)));
        }
    }, [isParent, userIdentity, userInfo]);

    React.useEffect(() => {
        const compare = getCompareSchools(userInfo);
        setCompareSchoolKeys(new Set(compare.map((x) => x?.schoolKey).filter(Boolean)));
    }, [userIdentity]);

    const availableDistricts = selectedProvince ? (wardsByProvince[selectedProvince] ?? []) : allWards;
    const normalizedKeyword = searchKeyword.trim().toLowerCase();
    const filteredSchools = schools.filter((s) => {
        const matchProvince = selectedProvince ? s.province === selectedProvince : true;
        const matchWard = selectedDistrict ? s.ward === selectedDistrict : true;
        const matchKeyword = normalizedKeyword ? s.school.toLowerCase().includes(normalizedKeyword) : true;
        return matchProvince && matchWard && matchKeyword;
    });
    const shownSchools = filteredSchools.slice(0, 20);
    const totalCount = filteredSchools.length;
    const paginationCount = Math.max(1, Math.ceil(totalCount / 20));
    const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

    const detailKeyRaw = React.useMemo(() => {
        const p = new URLSearchParams(location.search);
        return p.get("detail");
    }, [location.search]);

    const detailSchool = React.useMemo(() => {
        if (!detailKeyRaw) return null;
        return schools.find((s) => getSchoolStorageKey(s) === detailKeyRaw) ?? null;
    }, [detailKeyRaw, schools]);

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
            const next = new URLSearchParams(location.search);
            next.set("detail", key);
            next.delete("consult");
            const qs = next.toString();
            const url = `${location.pathname}${qs ? `?${qs}` : ""}`;
            if (isParent) {
                window.location.assign(url);
                return;
            }
            navigate({pathname: location.pathname, search: qs ? `?${qs}` : ""}, {replace: false});
        },
        [isParent, location.pathname, location.search, navigate]
    );

    const closeSchoolDetail = React.useCallback(() => {
        const next = new URLSearchParams(location.search);
        next.delete("detail");
        next.delete("consult");
        const qs = next.toString();
        const url = `${location.pathname}${qs ? `?${qs}` : ""}`;
        if (isParent) {
            window.location.replace(url);
            return;
        }
        navigate({pathname: location.pathname, search: qs ? `?${qs}` : ""}, {replace: true});
    }, [isParent, location.pathname, location.search, navigate]);

    React.useEffect(() => {
        if (!listLoading && detailKeyRaw && !detailSchool) {
            const next = new URLSearchParams(location.search);
            next.delete("detail");
            next.delete("consult");
            const qs = next.toString();
            const url = `${location.pathname}${qs ? `?${qs}` : ""}`;
            if (isParent) {
                window.location.replace(url);
                return;
            }
            navigate({pathname: location.pathname, search: qs ? `?${qs}` : ""}, {replace: true});
        }
    }, [detailKeyRaw, detailSchool, isParent, listLoading, location.pathname, location.search, navigate]);

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
                    id: schoolRecord.id,
                    schoolName: schoolRecord.school,
                    province: schoolRecord.province,
                    ward: schoolRecord.ward,
                    logoUrl: schoolRecord.logoUrl || null,
                    averageRating: Number(schoolRecord.averageRating) || 0
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

    const [detailActiveSection, setDetailActiveSection] = React.useState("intro");
    const detailScrollRef = React.useRef(null);
    const detailIntroRef = React.useRef(null);
    const detailLocationRef = React.useRef(null);
    const detailConsultRef = React.useRef(null);
    const detailTabScrollLockRef = React.useRef(false);
    const detailTabUnlockTimerRef = React.useRef(0);

    React.useEffect(() => {
        setDetailActiveSection("intro");
    }, [detailKeyRaw]);

    React.useEffect(() => () => {
        if (detailTabUnlockTimerRef.current) {
            window.clearTimeout(detailTabUnlockTimerRef.current);
        }
    }, []);

    const scrollDetailToSection = React.useCallback((section) => {
        detailTabScrollLockRef.current = true;
        setDetailActiveSection(section);
        const id =
            section === "intro"
                ? "school-detail-intro"
                : section === "location"
                  ? "school-detail-location"
                  : "school-detail-consult";
        const container = detailScrollRef.current;
        const el = typeof document !== "undefined" ? document.getElementById(id) : null;
        let lockMs = DETAIL_SCROLL_MIN_MS + DETAIL_SCROLL_LOCK_BUFFER_MS;
        if (container && el) {
            requestAnimationFrame(() => {
                const ms = smoothScrollContainerToElement(container, el);
                lockMs = (Number(ms) || DETAIL_SCROLL_MIN_MS) + DETAIL_SCROLL_LOCK_BUFFER_MS;
                if (detailTabUnlockTimerRef.current) {
                    window.clearTimeout(detailTabUnlockTimerRef.current);
                }
                detailTabUnlockTimerRef.current = window.setTimeout(() => {
                    detailTabScrollLockRef.current = false;
                    detailTabUnlockTimerRef.current = 0;
                }, lockMs);
            });
            return;
        }
        if (detailTabUnlockTimerRef.current) {
            window.clearTimeout(detailTabUnlockTimerRef.current);
        }
        detailTabUnlockTimerRef.current = window.setTimeout(() => {
            detailTabScrollLockRef.current = false;
            detailTabUnlockTimerRef.current = 0;
        }, lockMs);
    }, []);

    const detailTabIndex =
        detailActiveSection === "consult" ? 2 : detailActiveSection === "location" ? 1 : 0;

    React.useEffect(() => {
        const root = detailScrollRef.current;
        if (!root || !detailSchool) return undefined;

        let raf = 0;
        const onScroll = () => {
            if (detailTabScrollLockRef.current) return;
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const intro = detailIntroRef.current;
                const loc = detailLocationRef.current;
                const consult = detailConsultRef.current;
                if (!intro || !loc || !consult) return;
                const rootRect = root.getBoundingClientRect();
                const anchor = rootRect.top + DETAIL_SCROLL_HEADROOM;
                const activationLine = anchor + 24;
                const consultTop = consult.getBoundingClientRect().top;
                const locTop = loc.getBoundingClientRect().top;
                if (consultTop <= activationLine) setDetailActiveSection("consult");
                else if (locTop <= activationLine) setDetailActiveSection("location");
                else setDetailActiveSection("intro");
            });
        };

        onScroll();
        root.addEventListener("scroll", onScroll, {passive: true});
        return () => {
            cancelAnimationFrame(raf);
            root.removeEventListener("scroll", onScroll);
        };
    }, [detailSchool, detailKeyRaw]);

    const detailKeyForActions = detailSchool ? getSchoolStorageKey(detailSchool) : "";
    const detailIsSaved = Boolean(detailSchool && savedSchoolKeys.has(detailKeyForActions));
    const detailInCompare = Boolean(detailSchool && compareSchoolKeys.has(detailKeyForActions));

    const detailHeroActionBtnSx = {
        textTransform: "none",
        fontWeight: 700,
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.55)",
        borderRadius: 2,
        minWidth: 0,
        "&:hover": {
            borderColor: "#fff",
            bgcolor: "rgba(255,255,255,0.12)"
        }
    };

    const shareSchoolDetail = React.useCallback(() => {
        if (!detailSchool) return;
        const url = typeof window !== "undefined" ? window.location.href : "";
        if (typeof navigator !== "undefined" && navigator.share) {
            navigator
                .share({
                    title: detailSchool.school,
                    text: `${detailSchool.school} — ${detailSchool.ward}, ${detailSchool.province}`,
                    url
                })
                .catch(() => {});
        } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                showSuccessSnackbar("Đã sao chép liên kết trường.");
            });
        }
    }, [detailSchool]);

    const messageSchoolDetail = React.useCallback(() => {
        if (!detailSchool || typeof window === "undefined") return;
        window.dispatchEvent(
            new CustomEvent(OPEN_PARENT_CHAT_EVENT, {
                detail: {
                    schoolName: detailSchool.school,
                    schoolEmail: (detailSchool.email || "").trim(),
                    counsellorEmail: (detailSchool.counsellorEmail || detailSchool.email || "").trim(),
                },
            })
        );
    }, [detailSchool]);

    const openConsultMailto = React.useCallback(() => {
        if (!detailSchool) return;
        const email = (detailSchool.email || "").trim();
        if (!email) {
            navigate("/home");
            showSuccessSnackbar("Đến trang chủ để xem các hình thức hỗ trợ và đặt lịch tư vấn.");
            return;
        }
        const subject = encodeURIComponent(`Đặt lịch tư vấn — ${detailSchool.school}`);
        const body = encodeURIComponent(
            `Kính gửi ${detailSchool.school},\n\nTôi muốn đặt lịch tư vấn / tham quan trường.\n\nTrân trọng,`
        );
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    }, [detailSchool, navigate]);

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
                <Box
                    sx={{
                        mb: 3,
                        p: {xs: 2.25, md: 2.75},
                        borderRadius: 4,
                        background: `linear-gradient(145deg, ${HOME_PAGE_HERO_BACKDROP}e8 0%, rgba(255,255,255,0.78) 52%, rgba(255,255,255,0.65) 100%)`,
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                        border: '1px solid rgba(85,179,217,0.28)',
                        boxShadow: '0 16px 48px rgba(59,130,246,0.06)'
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
                                border: '1px solid rgba(85,179,217,0.45)',
                                boxShadow: '0 8px 28px rgba(59,130,246,0.08)'
                            }}
                        >
                            <SparkleIcon sx={{fontSize: 18, color: BRAND_SKY}}/>
                            <Typography sx={{fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.06em', color: BRAND_NAVY}}>
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
                            background: `linear-gradient(120deg, #1e293b 0%, ${BRAND_NAVY} 28%, ${APP_PRIMARY_MAIN} 62%, ${BRAND_SKY_LIGHT} 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}
                    >
                        Khám phá và so sánh trường học
                    </Typography>
                    <Typography sx={{color: '#64748b', fontSize: {xs: '0.95rem', md: '1.02rem'}, lineHeight: 1.65, maxWidth: 720}}>
                        Lọc theo khu vực, học phí và nhu cầu nội trú — giao diện đồng bộ với trang chủ EduBridge HCM.
                    </Typography>
                </Box>

                <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: '300px 1fr'}, gap: 3}}>
                    <Card
                        sx={{
                            p: 2,
                            borderRadius: 4,
                            border: '1px solid rgba(51,65,85,0.08)',
                            bgcolor: 'rgba(255,255,255,0.88)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            boxShadow: landingSectionShadow(3),
                            height: 'fit-content',
                            position: {md: 'sticky'},
                            top: {md: 96}
                        }}
                    >
                        <Typography sx={{fontWeight: 800, color: BRAND_NAVY, mb: 1.5, fontSize: '1.05rem'}}>
                            Bộ lọc tìm trường
                        </Typography>
                        <Divider sx={{mb: 2, borderColor: 'rgba(51,65,85,0.08)'}}/>
                        <Stack spacing={2}>
                            <Box>
                                <Typography sx={{fontWeight: 700, fontSize: 13, mb: 1, color: '#64748b', letterSpacing: '0.02em'}}>Tỉnh, Thành phố</Typography>
                                <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap'}}>
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
                            <Divider />
                            <Box>
                                <Typography sx={{fontWeight: 700, fontSize: 13, mb: 1, color: '#64748b', letterSpacing: '0.02em'}}>Khu vực (Phường/Xã)</Typography>
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
                            <Divider />
                            <Box>
                                <Typography sx={{fontWeight: 700, fontSize: 13, mb: 1, color: '#64748b', letterSpacing: '0.02em'}}>Nội trú/Bán trú</Typography>
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
                                    minWidth: '100%',
                                    maxWidth: '100%',
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
                                        py: 1.2,
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
                        </Box>

                        <Box sx={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap'}}>
                            <Box sx={{display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap'}}>
                                {compareCount > 0 && (
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
                                )}
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
                                            '& fieldset': {borderColor: 'rgba(59,130,246,0.2)'},
                                            '&:hover fieldset': {borderColor: 'rgba(59,130,246,0.38)'},
                                            '&.Mui-focused fieldset': {borderColor: BRAND_NAVY, borderWidth: 2}
                                        }
                                    }}
                                >
                                    <MenuItem value="fit">Phù hợp nhất</MenuItem>
                                    <MenuItem value="tuitionAsc">Học phí tăng dần</MenuItem>
                                    <MenuItem value="tuitionDesc">Học phí giảm dần</MenuItem>
                                </TextField>
                            </Box>
                        </Box>

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
                                const isSaved = savedSchoolKeys.has(schoolKey);
                                const inCompare = compareSchoolKeys.has(schoolKey);

                                return (
                                    <Card
                                        key={school.id != null ? `school-${school.id}` : `${school.province}-${school.ward}-${school.school}`}
                                        sx={{
                                            position: "relative",
                                            display: 'grid',
                                            gridTemplateColumns: {xs: '1fr', sm: '220px 1fr'},
                                            gap: 1.5,
                                            p: 1.5,
                                            borderRadius: 4,
                                            border: '1px solid rgba(51,65,85,0.07)',
                                            bgcolor: 'rgba(255,255,255,0.85)',
                                            backdropFilter: 'blur(8px)',
                                            boxShadow: landingSectionShadow(3),
                                            transition:
                                                'transform 0.32s cubic-bezier(0.2, 0, 0.2, 1), box-shadow 0.32s cubic-bezier(0.2, 0, 0.2, 1), border-color 0.32s cubic-bezier(0.2, 0, 0.2, 1), background-color 0.32s ease',
                                            '&:hover': {
                                                transform: 'translateY(-7px)',
                                                bgcolor: 'rgba(255,255,255,0.98)',
                                                boxShadow: `0 12px 40px rgba(59, 130, 246, 0.14), 0 24px 56px rgba(51, 65, 85, 0.12), ${landingSectionShadow(6)}`,
                                                borderColor: 'rgba(59,130,246,0.45)'
                                            }
                                        }}
                                    >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '100%',
                                            alignSelf: 'center',
                                            minHeight: {xs: 132, sm: 120},
                                            py: {xs: 0.5, sm: 0.5}
                                        }}
                                    >
                                        <CardMedia
                                            component="img"
                                            image={school.logoUrl || DEFAULT_SCHOOL_IMAGE}
                                            alt={`${school.school} logo`}
                                            sx={{
                                                height: {xs: 132, sm: 120},
                                                width: '100%',
                                                maxWidth: '100%',
                                                borderRadius: 3,
                                                objectFit: 'contain',
                                                objectPosition: 'center',
                                                display: 'block',
                                                p: 0,
                                                m: 0
                                            }}
                                        />
                                    </Box>
                                    <Box sx={{display: 'flex', flexDirection: 'column', minHeight: 132}}>
                                        <Typography
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: {xs: '1.15rem', sm: '1.35rem'},
                                                color: '#1e293b',
                                                lineHeight: 1.25,
                                                mb: 1.25
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
                                                    mt: 1,
                                                    color: '#64748b',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 400,
                                                    lineHeight: 1.45,
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    wordBreak: 'break-word'
                                                }}
                                            >
                                                {String(school.description)}
                                            </Typography>
                                        ) : null}
                                        <Box
                                            sx={{
                                                mt: 1.25,
                                                display: 'flex',
                                                flexDirection: {xs: 'column', sm: 'row'},
                                                flexWrap: {sm: 'wrap'},
                                                alignItems: {sm: 'flex-start'},
                                                justifyContent: 'flex-start',
                                                width: '100%',
                                                gap: {xs: 1.1, sm: 7},
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
                                                gap: 0.75,
                                                mt: 'auto',
                                                pt: 1.75
                                            }}
                                        >
                                            <ButtonBase
                                                onClick={() => toggleCompare(school)}
                                                title={inCompare ? "Gỡ khỏi so sánh" : "Thêm vào so sánh"}
                                                sx={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 0.4,
                                                    color: inCompare ? BRAND_NAVY : '#4a5568',
                                                    fontSize: '0.6875rem',
                                                    fontWeight: 700,
                                                    borderRadius: 1.5,
                                                    py: 0.35,
                                                    px: 0.75,
                                                    bgcolor: inCompare
                                                        ? 'rgba(59,130,246,0.12)'
                                                        : 'rgba(226,232,240,0.85)',
                                                    '&:hover': {bgcolor: inCompare ? 'rgba(59,130,246,0.18)' : 'rgba(226,232,240,1)'}
                                                }}
                                            >
                                                {inCompare ? (
                                                    <CheckCircleIcon sx={{fontSize: 14, color: BRAND_NAVY}}/>
                                                ) : (
                                                    <AddIcon sx={{fontSize: 14, color: '#4a5568'}}/>
                                                )}
                                                So sánh
                                            </ButtonBase>
                                            <ButtonBase
                                                disabled={!canSaveSchool}
                                                onClick={() => toggleSave(school)}
                                                title={
                                                    canSaveSchool
                                                        ? isSaved
                                                            ? "Bỏ lưu"
                                                            : "Lưu trường"
                                                        : "Đăng nhập với vai trò Phụ huynh để lưu trường"
                                                }
                                                sx={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 0.4,
                                                    color: isSaved ? '#e11d48' : '#4a5568',
                                                    fontSize: '0.6875rem',
                                                    fontWeight: 700,
                                                    borderRadius: 1.5,
                                                    py: 0.35,
                                                    px: 0.35,
                                                    bgcolor: 'transparent',
                                                    '&:hover': {bgcolor: 'rgba(59,130,246,0.06)'},
                                                    '&.Mui-disabled': {opacity: 0.5}
                                                }}
                                            >
                                                {isSaved ? (
                                                    <FavoriteIcon sx={{fontSize: 14, color: '#e11d48'}}/>
                                                ) : (
                                                    <FavoriteBorderIcon sx={{fontSize: 14, color: '#4a5568'}}/>
                                                )}
                                                Yêu thích
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
                <Box
                    sx={{
                        position: "fixed",
                        inset: 0,
                        top: `${DETAIL_WITH_HEADER_OFFSET}px`,
                        height: `calc(100vh - ${DETAIL_WITH_HEADER_OFFSET}px)`,
                        zIndex: 900,
                        display: "flex",
                        flexDirection: "column",
                        bgcolor: "#f8fafc",
                        overflow: "hidden"
                    }}
                >
                    <IconButton
                        aria-label="Quay lại trang tìm kiếm"
                        onClick={closeSchoolDetail}
                        sx={{
                            position: "fixed",
                            top: `calc(${DETAIL_WITH_HEADER_OFFSET}px + 8px + env(safe-area-inset-top, 0px))`,
                            left: 12,
                            zIndex: 1400,
                            color: "#fff",
                            bgcolor: "transparent",
                            border: "none",
                            boxShadow: "none",
                            p: 0.5,
                            "&:hover": {bgcolor: "transparent", opacity: 0.85}
                        }}
                    >
                        <ArrowBackIcon/>
                    </IconButton>

                    <Box
                        ref={detailScrollRef}
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflow: "auto",
                            WebkitOverflowScrolling: "touch",
                            scrollBehavior: "auto",
                            overscrollBehavior: "contain",
                            willChange: "scroll-position"
                        }}
                    >
                    <Box
                        sx={{
                            position: "relative",
                            minHeight: {xs: 280, sm: 320},
                            backgroundImage: `
                                linear-gradient(180deg, rgba(51,65,85,0.55) 0%, rgba(51,65,85,0.82) 100%),
                                url(${detailSchool.logoUrl || DEFAULT_SCHOOL_IMAGE})
                            `,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            color: "#fff"
                        }}
                    >
                        <Box
                            sx={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                bottom: 0,
                                pt: {xs: 5, sm: 6},
                                pb: {xs: 2, sm: 3},
                                px: {xs: 24, sm: 40}
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: {xs: "column", sm: "row"},
                                    alignItems: {xs: "stretch", sm: "center"},
                                    justifyContent: "space-between",
                                    gap: {xs: 0, sm: 2},
                                    width: "100%"
                                }}
                            >
                            <Box sx={{flex: "1 1 auto", minWidth: 0}}>
                            <Typography
                                sx={{
                                    fontWeight: 800,
                                    fontSize: {xs: "1.35rem", sm: "1.75rem"},
                                    lineHeight: 1.25,
                                    textShadow: "0 2px 12px rgba(0,0,0,0.35)"
                                }}
                            >
                                {detailSchool.school}
                            </Typography>
                            <Stack
                                direction="row"
                                alignItems="center"
                                flexWrap="wrap"
                                useFlexGap
                                sx={{mt: 1.25, gap: {xs: 1, sm: 2.5}, rowGap: 1}}
                            >
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={0.5}
                                    flexWrap="wrap"
                                    useFlexGap
                                    sx={{gap: 0.5, minHeight: 28}}
                                >
                                    <Rating
                                        value={Math.min(5, Math.max(0, Number(detailSchool.averageRating) || 0))}
                                        precision={0.1}
                                        readOnly
                                        size="small"
                                        sx={{color: "#fbbf24", display: "flex", alignItems: "center"}}
                                    />
                                    <Typography
                                        sx={{
                                            fontSize: "0.85rem",
                                            opacity: 0.95,
                                            lineHeight: 1.2,
                                            display: "flex",
                                            alignItems: "center"
                                        }}
                                    >
                                        {detailSchool.averageRating > 0
                                            ? detailSchool.averageRating.toFixed(1)
                                            : "—"}
                                    </Typography>
                                </Stack>
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={0.5}
                                    useFlexGap
                                    sx={{gap: 0.5, minHeight: 28}}
                                >
                                    <LocationOnIcon sx={{fontSize: 18, opacity: 0.92, flexShrink: 0}}/>
                                    <Typography
                                        component="span"
                                        sx={{
                                            fontSize: "0.85rem",
                                            opacity: 0.9,
                                            lineHeight: 1.2,
                                            display: "inline-flex",
                                            alignItems: "center"
                                        }}
                                    >
                                        {detailSchool.ward}, {detailSchool.province}
                                    </Typography>
                                </Stack>
                            </Stack>
                            </Box>

                            <Stack
                                direction="row"
                                flexWrap="wrap"
                                useFlexGap
                                justifyContent="flex-end"
                                sx={{
                                    mt: {xs: 2, sm: 0},
                                    gap: 0.75,
                                    flexShrink: 0,
                                    width: {xs: "100%", sm: "auto"},
                                    alignSelf: {xs: "stretch", sm: "center"}
                                }}
                            >
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<LanguageIcon sx={{fontSize: 18}}/>}
                                    href={
                                        (detailSchool.website || "").trim()
                                            ? detailSchool.website
                                            : `https://www.google.com/search?q=${encodeURIComponent(detailSchool.school)}`
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    sx={detailHeroActionBtnSx}
                                >
                                    {(detailSchool.website || "").trim() ? "Website trường" : "Tìm trên web"}
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<ChatBubbleOutlineIcon sx={{fontSize: 18}}/>}
                                    onClick={messageSchoolDetail}
                                    title={
                                        isParent
                                            ? "Mở chat với tư vấn viên trường (cần đăng nhập phụ huynh)"
                                            : "Đăng nhập với vai trò Phụ huynh để chat với tư vấn viên"
                                    }
                                    sx={detailHeroActionBtnSx}
                                >
                                    Nhắn tin
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={
                                        detailInCompare ? (
                                            <CheckCircleIcon sx={{fontSize: 18}}/>
                                        ) : (
                                            <AddIcon sx={{fontSize: 18}}/>
                                        )
                                    }
                                    onClick={() => toggleCompare(detailSchool)}
                                    sx={detailHeroActionBtnSx}
                                >
                                    {detailInCompare ? "Đã chọn so sánh" : "So sánh"}
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    disabled={!canSaveSchool}
                                    title={
                                        canSaveSchool
                                            ? detailIsSaved
                                                ? "Bỏ lưu trường này"
                                                : "Lưu trường vào danh sách"
                                            : "Đăng nhập với vai trò Phụ huynh để lưu trường"
                                    }
                                    startIcon={
                                        detailIsSaved ? (
                                            <BookmarkIcon sx={{fontSize: 18, color: "#fb923c"}}/>
                                        ) : (
                                            <BookmarkBorderIcon sx={{fontSize: 18}}/>
                                        )
                                    }
                                    onClick={() => toggleSave(detailSchool)}
                                    sx={{
                                        ...detailHeroActionBtnSx,
                                        "&.Mui-disabled": {
                                            color: "rgba(255,255,255,0.45)",
                                            border: "1px solid rgba(255,255,255,0.45)",
                                            WebkitTextFillColor: "rgba(255,255,255,0.45)"
                                        }
                                    }}
                                >
                                    {detailIsSaved ? "Đã lưu" : "Lưu trường"}
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<ShareIcon sx={{fontSize: 18}}/>}
                                    onClick={shareSchoolDetail}
                                    sx={detailHeroActionBtnSx}
                                >
                                    Chia sẻ
                                </Button>
                            </Stack>
                            </Box>
                        </Box>
                    </Box>

                        <Box sx={{maxWidth: 1100, mx: "auto", width: "100%", px: {xs: 2, sm: 3}, py: 2}}>
                            <Breadcrumbs sx={{mb: 2, "& a": {color: BRAND_NAVY, fontWeight: 600}}}>
                                <Link
                                    component="button"
                                    type="button"
                                    underline="hover"
                                    onClick={() => navigate("/home")}
                                    sx={{cursor: "pointer", border: "none", background: "none", font: "inherit"}}
                                >
                                    Trang chủ
                                </Link>
                                <Link
                                    component="button"
                                    type="button"
                                    underline="hover"
                                    onClick={closeSchoolDetail}
                                    sx={{cursor: "pointer", border: "none", background: "none", font: "inherit"}}
                                >
                                    Tìm trường
                                </Link>
                                <Typography
                                    color="text.secondary"
                                    sx={{fontWeight: 600, maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis"}}
                                >
                                    {detailSchool.school}
                                </Typography>
                            </Breadcrumbs>

                            <Box
                                sx={{
                                    position: "sticky",
                                    top: 0,
                                    zIndex: 20,
                                    bgcolor: "#f8fafc",
                                    pt: 0.25,
                                    pb: 0,
                                    mb: 1.5,
                                    borderBottom: 1,
                                    borderColor: "rgba(51,65,85,0.08)",
                                    pl: {xs: 6.5, sm: 7},
                                    boxShadow: "0 1px 0 rgba(51,65,85,0.04)"
                                }}
                            >
                                <Tabs
                                    value={detailTabIndex}
                                    onChange={(_, v) =>
                                        scrollDetailToSection(
                                            v === 0 ? "intro" : v === 1 ? "location" : "consult"
                                        )
                                    }
                                    variant="scrollable"
                                    scrollButtons="auto"
                                    allowScrollButtonsMobile
                                    TabIndicatorProps={{
                                        sx: {
                                            height: 2.5,
                                            borderRadius: "2px 2px 0 0",
                                            bgcolor: BRAND_NAVY,
                                            transition:
                                                "left 0.52s cubic-bezier(0.2, 0, 0, 1), width 0.52s cubic-bezier(0.2, 0, 0, 1)"
                                        }
                                    }}
                                    sx={{
                                        minHeight: 40,
                                        "& .MuiTabs-scrollButtons": {
                                            width: 28,
                                            "&.Mui-disabled": {opacity: 0.35}
                                        },
                                        "& .MuiTab-root": {
                                            textTransform: "none",
                                            fontWeight: 600,
                                            fontSize: "0.8125rem",
                                            letterSpacing: "0.01em",
                                            minHeight: 40,
                                            minWidth: "auto",
                                            px: 1.75,
                                            py: 0.75,
                                            color: "#64748b",
                                            transition: "color 0.5s cubic-bezier(0.2, 0, 0, 1)"
                                        },
                                        "& .Mui-selected": {
                                            color: `${BRAND_NAVY} !important`,
                                            fontWeight: 700
                                        },
                                        "& .MuiTabs-flexContainer": {gap: 0.25}
                                    }}
                                >
                                    <Tab label="Giới thiệu" disableRipple/>
                                    <Tab label="Vị trí & bản đồ" disableRipple/>
                                    <Tab label="Đặt lịch tư vấn" disableRipple/>
                                </Tabs>
                            </Box>
                            {detailLoading && (
                                <Typography sx={{fontSize: "0.85rem", color: "#64748b", mb: 1}}>
                                    Đang tải chi tiết trường...
                                </Typography>
                            )}
                            {!!detailError && (
                                <Typography sx={{fontSize: "0.85rem", color: "#b45309", mb: 1}}>
                                    {detailError}
                                </Typography>
                            )}

                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: {xs: "1fr", md: "1fr 320px"},
                                    gap: 3,
                                    alignItems: "start"
                                }}
                            >
                                <Box>
                                    <Box
                                        ref={detailIntroRef}
                                        id="school-detail-intro"
                                        sx={{scrollMarginTop: {xs: 56, sm: 52}}}
                                    >
                                        <Typography sx={{fontWeight: 800, color: BRAND_NAVY, mb: 2, fontSize: "1.05rem"}}>
                                            Giới thiệu trường
                                        </Typography>
                                        <Typography sx={{color: "#475569", lineHeight: 1.75, fontSize: "0.95rem", mb: 2}}>
                                            {detailSchool.description
                                                ? String(detailSchool.description)
                                                : `Thông tin tổng quan về ${detailSchool.school}. Nội dung chi tiết sẽ được cập nhật từ nhà trường trên hệ thống EduBridge.`}
                                        </Typography>
                                        {detailSchool.totalCampus > 0 && (
                                            <Typography sx={{color: "#64748b", fontSize: "0.9rem", mb: 2}}>
                                                Số cơ sở: {detailSchool.totalCampus}
                                            </Typography>
                                        )}
                                        {!!detailSchool.boardingType && (
                                            <Box sx={{display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 2}}>
                                                {getBoardingTypeTags(detailSchool.boardingType).map((tag) => (
                                                    <Chip
                                                        key={tag}
                                                        label={tag}
                                                        size="small"
                                                        sx={{
                                                            borderRadius: 999,
                                                            fontWeight: 700,
                                                            bgcolor: "rgba(59,130,246,0.1)",
                                                            color: BRAND_NAVY,
                                                            border: "1px solid rgba(59,130,246,0.25)"
                                                        }}
                                                    />
                                                ))}
                                            </Box>
                                        )}
                                        {!!detailSchool.foundingDate && (
                                            <Typography sx={{color: "#64748b", fontSize: "0.9rem", mb: 2}}>
                                                Ngày thành lập: {formatFoundingDate(detailSchool.foundingDate)}
                                            </Typography>
                                        )}
                                        <Typography sx={{color: "#475569", lineHeight: 1.75, fontSize: "0.95rem", mb: 2}}>
                                            Trường tập trung phát triển năng lực học thuật, kỹ năng và phẩm chất cho học sinh; chương trình được
                                            cập nhật theo khung của Bộ Giáo dục và Đào tạo kết hợp hoạt động trải nghiệm, câu lạc bộ và tư vấn hướng nghiệp.
                                        </Typography>
                                        <Typography sx={{color: "#475569", lineHeight: 1.75, fontSize: "0.95rem", mb: 2}}>
                                            Phụ huynh có thể đặt lịch tham quan cơ sở, tìm hiểu học phí — biểu phí minh bạch theo từng cấp — và các
                                            chính sách học bổng (nếu có). Đội ngũ tuyển sinh hỗ trợ giải đáp hồ sơ, thời hạn nộp và lịch kiểm tra
                                            đầu vào.
                                        </Typography>
                                        <Typography sx={{color: "#475569", lineHeight: 1.75, fontSize: "0.95rem", mb: 2}}>
                                            Cơ sở vật chất gồm phòng học, thư viện, khu thực hành, sân chơi và khu vực an toàn cho học sinh. Nhà
                                            trường duy trì liên lạc định kỳ với phụ huynh qua cổng thông tin điện tử và buổi họp lớp theo học kỳ.
                                        </Typography>
                                        <Typography sx={{color: "#475569", lineHeight: 1.75, fontSize: "0.95rem", mb: 2}}>
                                            Để biết lịch tuyển sinh mới nhất, hãy theo dõi mục tin tức trên trang chủ hoặc liên hệ trực tiếp qua
                                            thông tin ở cột bên phải (khi đã được cập nhật từ nhà trường).
                                        </Typography>
                                        <CardMedia
                                            component="img"
                                            height={200}
                                            image={detailSchool.logoUrl || DEFAULT_SCHOOL_IMAGE}
                                            alt=""
                                            sx={{mt: 1, borderRadius: 2, objectFit: "cover", border: "1px solid rgba(51,65,85,0.08)"}}
                                        />
                                        <Typography sx={{color: "#475569", lineHeight: 1.75, fontSize: "0.95rem", mb: 3}}>
                                            EduBridge HCM giúp bạn so sánh nhanh vị trí, lộ trình và phản hồi từ cộng đồng phụ huynh để chọn môi
                                            trường phù hợp cho con em.
                                        </Typography>
                                    </Box>

                                    <Box
                                        ref={detailLocationRef}
                                        id="school-detail-location"
                                        sx={{scrollMarginTop: {xs: 56, sm: 52}, pt: 1, pb: 2}}
                                    >
                                        <Typography sx={{fontWeight: 800, color: BRAND_NAVY, mb: 1, fontSize: "1.05rem"}}>
                                            Vị trí &amp; bản đồ
                                        </Typography>
                                        <Typography sx={{color: "#64748b", fontSize: "0.92rem", mb: 2}}>
                                            {detailSchool.ward}, {detailSchool.province}, Việt Nam
                                        </Typography>
                                        {!googleMapsApiKey ? (
                                            <Typography sx={{color: "#b45309", fontSize: "0.9rem"}}>
                                                Chưa có API key. Thêm <code>VITE_GOOGLE_MAPS_API_KEY</code> vào file <code>.env</code> để hiển thị bản đồ.
                                            </Typography>
                                        ) : (
                                            <SchoolLocationMap school={detailSchool} apiKey={googleMapsApiKey}/>
                                        )}
                                        <Stack direction={{xs: "column", sm: "row"}} spacing={1.5} sx={{mt: 2.5}}>
                                            <Button
                                                variant="contained"
                                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                                                    `${detailSchool.school}, ${detailSchool.ward}, ${detailSchool.province}, Vietnam`
                                                )}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                sx={{
                                                    textTransform: "none",
                                                    fontWeight: 700,
                                                    bgcolor: BRAND_NAVY,
                                                    "&:hover": {bgcolor: APP_PRIMARY_DARK}
                                                }}
                                            >
                                                Chỉ đường đến trường
                                            </Button>
                                            
                                        </Stack>
                                    </Box>

                                    <Box
                                        ref={detailConsultRef}
                                        id="school-detail-consult"
                                        sx={{
                                            scrollMarginTop: {xs: 56, sm: 52},
                                            pt: 1,
                                            pb: 2
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                p: 2.5,
                                                borderRadius: 2,
                                                border: "1px solid rgba(59,130,246,0.2)",
                                                bgcolor: "rgba(255,255,255,0.98)",
                                                boxShadow: "0 4px 20px rgba(51,65,85,0.06)"
                                            }}
                                        >
                                            <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                                                <CalendarMonthIcon
                                                    sx={{fontSize: 28, color: BRAND_NAVY, flexShrink: 0, mt: 0.25}}
                                                />
                                                <Box sx={{minWidth: 0}}>
                                                    <Typography
                                                        sx={{fontWeight: 800, color: BRAND_NAVY, fontSize: "1.05rem", mb: 0.75}}
                                                    >
                                                        Đặt lịch tư vấn
                                                    </Typography>
                                                    <Typography sx={{color: "#64748b", fontSize: "0.9rem", lineHeight: 1.6, mb: 1.5}}>
                                                        {(detailSchool?.email || "").trim()
                                                            ? "Soạn email đặt lịch với nhà trường hoặc điều chỉnh nội dung trước khi gửi."
                                                            : "Trường chưa công bố email trên hệ thống. Bạn có thể xem các hình thức hỗ trợ trên trang chủ."}
                                                    </Typography>
                                                    {(detailSchool?.email || "").trim() ? (
                                                        <Button
                                                            variant="contained"
                                                            size="small"
                                                            onClick={openConsultMailto}
                                                            sx={{
                                                                textTransform: "none",
                                                                fontWeight: 700,
                                                                bgcolor: BRAND_NAVY,
                                                                "&:hover": {bgcolor: APP_PRIMARY_DARK}
                                                            }}
                                                        >
                                                            Soạn email đặt lịch
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="outlined"
                                                            size="small"
                                                            onClick={() => navigate("/home")}
                                                            sx={{textTransform: "none", fontWeight: 700}}
                                                        >
                                                            Đến trang chủ
                                                        </Button>
                                                    )}
                                                </Box>
                                            </Stack>
                                        </Box>
                                    </Box>
                                </Box>

                                <SchoolContactPanel school={detailSchool}/>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            )}
        </Box>
    );
}
