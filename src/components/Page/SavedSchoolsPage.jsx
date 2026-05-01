import React from "react";
import {
    Box,
    Button,
    ButtonBase,
    Card,
    CardMedia,
    CircularProgress,
    Divider,
    Link,
    Pagination,
    Rating,
    Stack,
    Typography
} from "@mui/material";
import {
    Add as AddIcon,
    CheckCircle as CheckCircleIcon,
    Favorite as FavoriteIcon,
    FavoriteBorder as FavoriteBorderIcon,
    Language as LanguageIcon,
    LocationOn as LocationOnIcon,
    Phone as PhoneIcon
} from "@mui/icons-material";
import {useNavigate} from "react-router-dom";
import {showSuccessSnackbar, showWarningSnackbar} from "../ui/AppSnackbar.jsx";
import {
    APP_PRIMARY_DARK,
    BRAND_NAVY,
    HOME_PAGE_SURFACE_GRADIENT,
    landingSectionShadow
} from "../../constants/homeLandingTheme";
import {getPublicSchoolDetail, searchNearbyCampuses} from "../../services/SchoolPublicService.jsx";
import {
    deleteParentFavouriteSchool,
    getParentFavouriteSchools,
    postParentFavouriteSchool
} from "../../services/ParentService.jsx";
import SchoolSearchDetailView from "./SchoolSearchDetailView.jsx";
import {mapPublicSchoolDetailToRow} from "../../utils/schoolPublicMapper.js";
import {
    getCompareSchools,
    MAX_COMPARE_SCHOOLS,
    setCompareSchools
} from "../../utils/compareSchoolsStorage";
import {getSchoolStorageKey, getUserIdentity} from "../../utils/savedSchoolsStorage";

const DEFAULT_SCHOOL_IMAGE =
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=80";
const LOCATION_FALLBACK_PROVINCE = "Đang cập nhật";
const LOCATION_FALLBACK_WARD = "Đang cập nhật";
const FAVOURITE_PAGE_SIZE = 10;

function mapFavouriteSchoolRow(item) {
    if (!item || typeof item !== "object") return null;
    const school = item.school ?? item.schoolDto ?? item;
    const schoolId =
        item.schoolId != null && item.schoolId !== ""
            ? item.schoolId
            : school?.schoolId != null && school?.schoolId !== ""
                ? school.schoolId
                : school?.id ?? item.id ?? null;
    const campusList = Array.isArray(school?.campusList)
        ? school.campusList
        : Array.isArray(item?.campusList)
            ? item.campusList
            : [];
    const firstCampus = campusList[0] ?? null;
    const name = school?.name || item?.name || item?.schoolName || "Trường đang cập nhật";
    const ward = (firstCampus?.district || "").trim() || LOCATION_FALLBACK_WARD;
    const province = (firstCampus?.city || "").trim() || LOCATION_FALLBACK_PROVINCE;
    const addressRaw = (firstCampus?.address || "").trim();
    const address =
        addressRaw ||
        (school?.address ? String(school.address).trim() : "") ||
        (ward !== LOCATION_FALLBACK_WARD || province !== LOCATION_FALLBACK_PROVINCE
            ? [ward, province].filter(Boolean).join(", ")
            : "");
    return {
        id: schoolId,
        schoolId,
        favouriteId: item?.id ?? null,
        schoolKey: schoolId != null ? `id:${schoolId}` : `saved-${name || Math.random()}`,
        schoolName: name,
        school: name,
        province,
        ward,
        locationLabel: "TP.HCM",
        gradeLevel: school?.gradeLevel ?? item?.gradeLevel ?? "",
        schoolType: school?.schoolType ?? item?.schoolType ?? "",
        logoUrl: school?.logoUrl || item?.logoUrl || null,
        averageRating: Number(school?.averageRating ?? item?.averageRating) || 0,
        description: school?.description ?? item?.description ?? "",
        website: school?.websiteUrl ?? item?.websiteUrl ?? "",
        phone: school?.hotline ?? item?.hotline ?? firstCampus?.phoneNumber ?? "",
        address,
        isFavourite: true
    };
}

function parseFavouriteListPayload(res) {
    const raw = res?.data?.body ?? res?.body ?? res?.data ?? res;
    const items = Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.content)
            ? raw.content
            : Array.isArray(raw)
                ? raw
                : [];
    const totalItemsRaw = raw?.totalItems ?? raw?.total;
    const totalPagesRaw = raw?.totalPages;
    const totalItems = Number(totalItemsRaw);
    const totalPages = Number(totalPagesRaw);
    return {
        items,
        totalItems: Number.isFinite(totalItems) ? totalItems : null,
        totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : null
    };
}

export default function SavedSchoolsPage() {
    const navigate = useNavigate();

    const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    const userInfo = React.useMemo(() => {
        try {
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }, [raw]);

    const userIdentity = React.useMemo(() => getUserIdentity(userInfo), [userInfo]);
    const isParent = userInfo?.role === "PARENT";
    const [compareSchoolKeys, setCompareSchoolKeys] = React.useState(() => {
        if (typeof window === "undefined") return new Set();
        const list = getCompareSchools(userInfo);
        return new Set(list.map((x) => x?.schoolKey).filter(Boolean));
    });

    React.useEffect(() => {
        const compare = getCompareSchools(userInfo);
        setCompareSchoolKeys(new Set(compare.map((x) => x?.schoolKey).filter(Boolean)));
    }, [userIdentity, userInfo]);
    const [savedSchools, setSavedSchools] = React.useState([]);
    const [page, setPage] = React.useState(0);
    const [totalPages, setTotalPages] = React.useState(1);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [detailLoading, setDetailLoading] = React.useState(false);
    const [detailError, setDetailError] = React.useState("");
    const [detailSchool, setDetailSchool] = React.useState(null);

    React.useEffect(() => {
        if (!isParent) {
            navigate("/login", {replace: true});
        }
    }, [isParent, navigate]);

    const loadFavouritePage = React.useCallback(
        async (pageIndex) => {
            setLoading(true);
            setError("");
            try {
                const res = await getParentFavouriteSchools(pageIndex, FAVOURITE_PAGE_SIZE);
                const {items, totalItems, totalPages: apiTotalPages} = parseFavouriteListPayload(res);
                const rows = items.map(mapFavouriteSchoolRow).filter(Boolean);
                let resolvedTotalPages = apiTotalPages;
                if (resolvedTotalPages == null && totalItems != null) {
                    resolvedTotalPages = Math.max(1, Math.ceil(totalItems / FAVOURITE_PAGE_SIZE));
                }
                if (resolvedTotalPages == null) {
                    resolvedTotalPages =
                        rows.length < FAVOURITE_PAGE_SIZE && pageIndex === 0 ? 1 : Math.max(pageIndex + 1, 1);
                }
                if (rows.length === 0 && pageIndex > 0) {
                    await loadFavouritePage(pageIndex - 1);
                    return;
                }
                setSavedSchools(rows);
                setTotalPages(Math.max(1, resolvedTotalPages));
                setPage(pageIndex);
            } catch (e) {
                setError(
                    e?.response?.data?.message ||
                    e?.message ||
                    "Không tải được danh sách trường yêu thích."
                );
                setSavedSchools([]);
                setTotalPages(1);
            } finally {
                setLoading(false);
            }
        },
        []
    );

    React.useEffect(() => {
        if (!isParent) return;
        let cancelled = false;
        (async () => {
            await loadFavouritePage(page);
            if (cancelled) return;
        })();
        return () => {
            cancelled = true;
        };
    }, [isParent, userInfo, page, loadFavouritePage]);

    const toggleFavourite = async (schoolRecord) => {
        if (!isParent) {
            showWarningSnackbar("Bạn phải đăng nhập với vai trò Phụ huynh để quản lý trường yêu thích.");
            return;
        }
        const rawSchoolId =
            schoolRecord?.schoolId ??
            schoolRecord?.id ??
            (String(schoolRecord?.schoolKey || "").startsWith("id:")
                ? String(schoolRecord.schoolKey).slice(3)
                : null);
        const schoolId = Number(rawSchoolId);
        if (!Number.isFinite(schoolId)) {
            showWarningSnackbar("Không xác định được trường để cập nhật yêu thích.");
            return;
        }
        const favouriteIdCandidate =
            schoolRecord?.favouriteId ??
            savedSchools.find((r) => Number(r?.schoolId ?? r?.id) === schoolId)?.favouriteId ??
            (Number(detailSchool?.id) === schoolId ? detailSchool?.favouriteId : null);
        const favouriteId = Number(favouriteIdCandidate);
        const exists = Boolean(
            (Number(detailSchool?.id) === schoolId ? detailSchool?.isFavourite : undefined) ??
                savedSchools.find((r) => Number(r?.id) === schoolId)?.isFavourite ??
                schoolRecord?.isFavourite
        );
        try {
            if (exists) {
                if (!Number.isFinite(favouriteId)) {
                    showWarningSnackbar("Thiếu id bản ghi yêu thích để bỏ yêu thích.");
                    return;
                }
                await deleteParentFavouriteSchool(favouriteId);
            } else {
                await postParentFavouriteSchool({schoolId});
            }
        } catch (e) {
            showWarningSnackbar(
                e?.response?.data?.message ||
                e?.message ||
                "Không thể cập nhật trạng thái yêu thích trường lúc này. Vui lòng thử lại."
            );
            return;
        }
        setSavedSchools((prev) =>
            prev.map((row) =>
                Number(row?.id) === schoolId ? {...row, isFavourite: !exists} : row
            )
        );
        setDetailSchool((prev) =>
            prev && Number(prev.id) === schoolId ? {...prev, isFavourite: !exists} : prev
        );
        showSuccessSnackbar(exists ? "Đã bỏ trường khỏi Trường yêu thích." : "Đã thêm trường vào Trường yêu thích.");
        if (exists) {
            await loadFavouritePage(page);
        }
    };

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
                        schoolName: schoolRecord.schoolName || schoolRecord.school,
                        province: schoolRecord.province,
                        ward: schoolRecord.ward,
                        locationLabel: schoolRecord.locationLabel || "TP.HCM",
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

    const closeSchoolDetail = React.useCallback(() => {
        setDetailSchool(null);
        setDetailError("");
        setDetailLoading(false);
    }, []);

    const openSchoolDetail = React.useCallback(async (schoolRecord) => {
        setDetailError("");
        const label = schoolRecord?.schoolName || schoolRecord?.school || "Trường";
        setDetailSchool({
            ...schoolRecord,
            school: label,
            hasDetailLoaded: false
        });
        const id = schoolRecord?.id;
        if (!id) return;
        try {
            setDetailLoading(true);
            const detailBody = await getPublicSchoolDetail(id);
            const mapped = mapPublicSchoolDetailToRow(detailBody);
            if (!mapped) return;
            setDetailSchool((prev) => ({
                ...(prev || {}),
                ...mapped,
                isFavourite: Boolean(schoolRecord?.isFavourite)
            }));
        } catch (e) {
            setDetailError(e?.response?.data?.message || e?.message || "Không tải được chi tiết trường.");
        } finally {
            setDetailLoading(false);
        }
    }, []);

    const maptilerApiKey = import.meta.env.VITE_MAPTILER_API_KEY ?? "";
    const canSaveSchool = Boolean(isParent && userInfo);

    React.useEffect(() => {
        if (!detailSchool) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [detailSchool]);

    const detailKeyForActions = detailSchool ? getSchoolStorageKey(detailSchool) : "";
    const detailIsSaved = Boolean(detailSchool?.isFavourite);
    const detailInCompare = Boolean(detailSchool && compareSchoolKeys.has(detailKeyForActions));

    const cardSurface = {
        bgcolor: "#fff",
        borderRadius: 3,
        border: "1px solid rgba(51,65,85,0.08)",
        boxShadow: landingSectionShadow(2)
    };

    return (
        <Box
            sx={{
                pt: "90px",
                minHeight: "100vh",
                background: HOME_PAGE_SURFACE_GRADIENT
            }}
        >
            <Box sx={{maxWidth: 1200, mx: "auto", px: {xs: 2, md: 3}, pb: 5}}>
                <Box sx={{display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5}}>
                    <Typography sx={{fontWeight: 800, fontSize: 20, color: "#1e293b"}}>
                        Trường yêu thích
                    </Typography>
                    {isParent && compareSchoolKeys.size > 0 && (
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
                            So sánh ({compareSchoolKeys.size})
                        </Button>
                    )}
                    {!isParent && (
                        <Button
                            variant="contained"
                            onClick={() => navigate("/login")}
                            sx={{
                                textTransform: "none",
                                fontWeight: 600,
                                bgcolor: BRAND_NAVY,
                                "&:hover": {bgcolor: APP_PRIMARY_DARK}
                            }}
                        >
                            Đăng nhập
                        </Button>
                    )}
                </Box>

                {!isParent ? (
                    <Card sx={{p: 3, ...cardSurface}}>
                        <Typography sx={{color: "#64748b", fontWeight: 600}}>
                            Bạn cần đăng nhập với vai trò Phụ huynh để xem Trường yêu thích.
                        </Typography>
                    </Card>
                ) : (
                    <>
                        <Divider sx={{mb: 2, borderColor: "rgba(51,65,85,0.08)"}}/>
                        {loading ? (
                            <Box sx={{display: "flex", justifyContent: "center", py: 6}}>
                                <CircularProgress sx={{color: BRAND_NAVY}}/>
                            </Box>
                        ) : error ? (
                            <Card sx={{p: 3, ...cardSurface}}>
                                <Typography sx={{color: "#b45309", fontWeight: 600}}>
                                    {error}
                                </Typography>
                            </Card>
                        ) : savedSchools.length === 0 ? (
                            <Card sx={{p: 3, ...cardSurface}}>
                                <Typography sx={{color: "#64748b"}}>
                                    Chưa có trường yêu thích nào.
                                </Typography>
                            </Card>
                        ) : (
                            <>
                            <Stack spacing={2}>
                                {savedSchools.map((item) => {
                                    const schoolKey = getSchoolStorageKey(item);
                                    const inCompare = compareSchoolKeys.has(schoolKey);
                                    const isSaved = Boolean(item?.isFavourite);
                                    return (
                                    <Card
                                        key={item?.schoolKey}
                                        sx={{
                                            position: "relative",
                                            display: "grid",
                                            gridTemplateColumns: {xs: "1fr", sm: "220px 1fr"},
                                            gap: 1.5,
                                            p: 1.5,
                                            borderRadius: 4,
                                            border: "1px solid rgba(51,65,85,0.07)",
                                            bgcolor: "rgba(255,255,255,0.85)",
                                            backdropFilter: "blur(8px)",
                                            boxShadow: landingSectionShadow(3),
                                            transition:
                                                "transform 0.32s cubic-bezier(0.2, 0, 0.2, 1), box-shadow 0.32s cubic-bezier(0.2, 0, 0.2, 1), border-color 0.32s cubic-bezier(0.2, 0, 0.2, 1), background-color 0.32s ease",
                                            "&:hover": {
                                                transform: "translateY(-7px)",
                                                bgcolor: "rgba(255,255,255,0.98)",
                                                boxShadow: `0 12px 40px rgba(59, 130, 246, 0.14), 0 24px 56px rgba(51, 65, 85, 0.12), ${landingSectionShadow(6)}`,
                                                borderColor: "rgba(59,130,246,0.45)"
                                            }
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                width: "100%",
                                                alignSelf: "center",
                                                minHeight: {xs: 132, sm: 120},
                                                py: {xs: 0.5, sm: 0.5}
                                            }}
                                        >
                                            <CardMedia
                                                component="img"
                                                image={item?.logoUrl || DEFAULT_SCHOOL_IMAGE}
                                                alt={`${item?.schoolName} logo`}
                                                sx={{
                                                    height: {xs: 132, sm: 120},
                                                    width: "100%",
                                                    maxWidth: "100%",
                                                    borderRadius: 3,
                                                    objectFit: "contain",
                                                    objectPosition: "center",
                                                    display: "block",
                                                    p: 0,
                                                    m: 0
                                                }}
                                            />
                                        </Box>
                                        <Box sx={{display: "flex", flexDirection: "column", minHeight: 132}}>
                                            <Typography
                                                sx={{
                                                    fontWeight: 700,
                                                    fontSize: {xs: "1.15rem", sm: "1.35rem"},
                                                    color: "#1e293b",
                                                    lineHeight: 1.25,
                                                    mb: 1.25
                                                }}
                                            >
                                                {item?.schoolName}
                                            </Typography>
                                            <Box sx={{display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.4}}>
                                                {(Number(item?.averageRating) || 0) > 0 ? (
                                                    <>
                                                        <Typography
                                                            component="span"
                                                            sx={{
                                                                fontSize: "0.75rem",
                                                                fontWeight: 600,
                                                                color: "#000",
                                                                lineHeight: 1,
                                                                display: "inline-block",
                                                                flexShrink: 0
                                                            }}
                                                        >
                                                            {Number(item.averageRating).toFixed(1)}
                                                        </Typography>
                                                        <Rating
                                                            value={Math.min(5, Math.max(0, Number(item.averageRating) || 0))}
                                                            precision={0.1}
                                                            readOnly
                                                            size="small"
                                                            sx={{
                                                                color: "#ffc107",
                                                                display: "inline-flex",
                                                                verticalAlign: "middle",
                                                                m: 0,
                                                                p: 0,
                                                                "& .MuiRating-iconFilled": {color: "#ffc107"},
                                                                "& .MuiRating-iconEmpty": {color: "rgba(0,0,0,0.22)"}
                                                            }}
                                                        />
                                                    </>
                                                ) : (
                                                    <Typography
                                                        component="span"
                                                        sx={{
                                                            fontSize: "0.75rem",
                                                            fontWeight: 500,
                                                            color: "#000",
                                                            lineHeight: 1.2
                                                        }}
                                                    >
                                                        —
                                                    </Typography>
                                                )}
                                            </Box>
                                            {item.description ? (
                                                <Typography
                                                    sx={{
                                                        mt: 1,
                                                        color: "#64748b",
                                                        fontSize: "0.875rem",
                                                        fontWeight: 400,
                                                        lineHeight: 1.45,
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: "vertical",
                                                        overflow: "hidden",
                                                        wordBreak: "break-word"
                                                    }}
                                                >
                                                    {String(item.description)}
                                                </Typography>
                                            ) : null}
                                            <Box
                                                sx={{
                                                    mt: 1.25,
                                                    display: "flex",
                                                    flexDirection: {xs: "column", sm: "row"},
                                                    flexWrap: {sm: "wrap"},
                                                    alignItems: {sm: "flex-start"},
                                                    justifyContent: "flex-start",
                                                    width: "100%",
                                                    gap: {xs: 1.1, sm: 7},
                                                    alignSelf: "stretch"
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "flex-start",
                                                        gap: 0.35,
                                                        flexShrink: {sm: 1},
                                                        minWidth: 0,
                                                        maxWidth: {sm: 280},
                                                        width: {xs: "100%", sm: "auto"}
                                                    }}
                                                >
                                                    <LocationOnIcon sx={{fontSize: 13, color: "#000", flexShrink: 0, mt: "2px"}}/>
                                                    <Typography
                                                        sx={{
                                                            fontSize: "0.6875rem",
                                                            fontWeight: 400,
                                                            lineHeight: 1.35,
                                                            color: "#0f172a",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            display: "-webkit-box",
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: "vertical",
                                                            wordBreak: "break-word",
                                                            minWidth: 0
                                                        }}
                                                    >
                                                        {item.address?.trim() ? item.address : "Đang cập nhật"}
                                                    </Typography>
                                                </Box>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 0.35,
                                                        flexShrink: 0,
                                                        minWidth: 0,
                                                        maxWidth: {sm: 200},
                                                        width: {xs: "100%", sm: "auto"}
                                                    }}
                                                >
                                                    <LanguageIcon sx={{fontSize: 13, color: "#000", flexShrink: 0}}/>
                                                    {item.website ? (
                                                        <Link
                                                            href={item.website.startsWith("http") ? item.website : `https://${item.website}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            sx={{
                                                                fontSize: "0.6875rem",
                                                                color: BRAND_NAVY,
                                                                textDecoration: "none",
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                                maxWidth: "100%",
                                                                minWidth: 0,
                                                                "&:hover": {
                                                                    color: APP_PRIMARY_DARK,
                                                                    textDecoration: "underline"
                                                                }
                                                            }}
                                                        >
                                                            {String(item.website).replace(/^https?:\/\//i, "")}
                                                        </Link>
                                                    ) : (
                                                        <Typography sx={{fontSize: "0.6875rem", color: "#0f172a"}}>—</Typography>
                                                    )}
                                                </Box>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 0.35,
                                                        flexShrink: 0,
                                                        minWidth: 0,
                                                        width: {xs: "100%", sm: "auto"}
                                                    }}
                                                >
                                                    <PhoneIcon sx={{fontSize: 13, color: "#000", flexShrink: 0}}/>
                                                    <Typography
                                                        sx={{
                                                            fontSize: "0.6875rem",
                                                            color: "#0f172a",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                            maxWidth: "100%",
                                                            minWidth: 0
                                                        }}
                                                    >
                                                        {item.phone || "—"}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    alignItems: "center",
                                                    justifyContent: "flex-end",
                                                    gap: 0.75,
                                                    mt: "auto",
                                                    pt: 1.75
                                                }}
                                            >
                                                <ButtonBase
                                                    onClick={() => toggleCompare(item)}
                                                    title={inCompare ? "Gỡ khỏi so sánh" : "Thêm vào so sánh"}
                                                    sx={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: 0.4,
                                                        color: inCompare ? BRAND_NAVY : "#4a5568",
                                                        fontSize: "0.6875rem",
                                                        fontWeight: 700,
                                                        borderRadius: 1.5,
                                                        py: 0.35,
                                                        px: 0.75,
                                                        bgcolor: inCompare
                                                            ? "rgba(59,130,246,0.12)"
                                                            : "rgba(226,232,240,0.85)",
                                                        "&:hover": {bgcolor: inCompare ? "rgba(59,130,246,0.18)" : "rgba(226,232,240,1)"}
                                                    }}
                                                >
                                                    {inCompare ? (
                                                        <CheckCircleIcon sx={{fontSize: 14, color: BRAND_NAVY}}/>
                                                    ) : (
                                                        <AddIcon sx={{fontSize: 14, color: "#4a5568"}}/>
                                                    )}
                                                    So sánh
                                                </ButtonBase>
                                                <ButtonBase
                                                    onClick={() => toggleFavourite(item)}
                                                    title={
                                                        isParent
                                                            ? isSaved
                                                                ? "Bỏ yêu thích"
                                                                : "Thêm vào yêu thích"
                                                            : "Đăng nhập với vai trò Phụ huynh để yêu thích trường"
                                                    }
                                                    disabled={!isParent}
                                                    sx={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: 0.45,
                                                        fontSize: "0.6875rem",
                                                        fontWeight: 700,
                                                        borderRadius: 999,
                                                        py: 0.5,
                                                        px: 1.25,
                                                        color: isSaved ? "#e11d48" : "#64748b",
                                                        border: isSaved
                                                            ? "1px solid rgba(225,29,72,0.45)"
                                                            : "1px solid rgba(148,163,184,0.85)",
                                                        bgcolor: isSaved ? "rgba(225,29,72,0.06)" : "rgba(255,255,255,0.85)",
                                                        "&:hover": {
                                                            bgcolor: isSaved ? "rgba(225,29,72,0.1)" : "rgba(241,245,249,0.95)"
                                                        },
                                                        "&.Mui-disabled": {
                                                            color: "rgba(100,116,139,0.55)",
                                                            borderColor: "rgba(148,163,184,0.5)"
                                                        }
                                                    }}
                                                >
                                                    {isSaved ? (
                                                        <FavoriteIcon sx={{fontSize: 14, color: "#e11d48"}}/>
                                                    ) : (
                                                        <FavoriteBorderIcon sx={{fontSize: 14, color: "#64748b"}}/>
                                                    )}
                                                    {isSaved ? "Đã yêu thích" : "Yêu thích"}
                                                </ButtonBase>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => openSchoolDetail(item)}
                                                    sx={{
                                                        textTransform: "none",
                                                        fontWeight: 700,
                                                        borderRadius: 999,
                                                        px: 2,
                                                        py: 0.5,
                                                        fontSize: "0.8125rem",
                                                        borderColor: "rgba(59,130,246,0.4)",
                                                        color: BRAND_NAVY,
                                                        bgcolor: "rgba(255,255,255,0.6)",
                                                        ml: {xs: 0, sm: 0.25},
                                                        "&:hover": {
                                                            borderColor: BRAND_NAVY,
                                                            bgcolor: "rgba(255,255,255,0.95)"
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
                            {totalPages > 1 && (
                                <Box sx={{display: "flex", justifyContent: "center", mt: 3}}>
                                    <Pagination
                                        count={totalPages}
                                        page={page + 1}
                                        onChange={(_, value) => setPage(value - 1)}
                                        color="primary"
                                        sx={{
                                            "& .MuiPaginationItem-root": {fontWeight: 600}
                                        }}
                                    />
                                </Box>
                            )}
                            </>
                        )}
                    </>
                )}
            </Box>
            {detailSchool && (
                <SchoolSearchDetailView
                    school={detailSchool}
                    detailKeyRaw={detailKeyForActions}
                    detailLoading={detailLoading}
                    detailError={detailError}
                    maptilerApiKey={maptilerApiKey}
                    onSearchNearbyCampuses={searchNearbyCampuses}
                    onOpenSchoolById={(schoolId) => {
                        const target = savedSchools.find((s) => Number(s?.id) === Number(schoolId));
                        if (target) {
                            openSchoolDetail(target);
                        } else {
                            navigate(`/search-schools/detail?detail=${encodeURIComponent(`id:${schoolId}`)}`);
                        }
                    }}
                    onClose={closeSchoolDetail}
                    navigate={navigate}
                    isParent={isParent}
                    canSaveSchool={canSaveSchool}
                    detailIsSaved={detailIsSaved}
                    detailInCompare={detailInCompare}
                    toggleCompare={toggleCompare}
                    toggleSave={toggleFavourite}
                />
            )}
        </Box>
    );
}

