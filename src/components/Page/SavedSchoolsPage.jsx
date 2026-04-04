import React from "react";
import {
    Box,
    Button,
    Card,
    CardMedia,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Rating,
    Typography
} from "@mui/material";
import {Close as CloseIcon} from "@mui/icons-material";
import {Bookmark as BookmarkIcon} from "@mui/icons-material";
import {useNavigate} from "react-router-dom";
import {enqueueSnackbar} from "notistack";
import {showWarningSnackbar} from "../ui/AppSnackbar.jsx";
import {
    APP_PRIMARY_DARK,
    BRAND_NAVY,
    HOME_PAGE_SURFACE_GRADIENT,
    landingSectionShadow
} from "../../constants/homeLandingTheme";
import {getPublicSchoolDetail, getPublicSchoolList} from "../../services/SchoolPublicService.jsx";
import {postParentFavouriteSchool} from "../../services/ParentService.jsx";

const DEFAULT_SCHOOL_IMAGE =
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=80";
const LOCATION_FALLBACK_PROVINCE = "Đang cập nhật";
const LOCATION_FALLBACK_WARD = "Đang cập nhật";

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

    const isParent = userInfo?.role === "PARENT";
    const [savedSchools, setSavedSchools] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [detailOpen, setDetailOpen] = React.useState(false);
    const [detailLoading, setDetailLoading] = React.useState(false);
    const [detailError, setDetailError] = React.useState("");
    const [detailSchool, setDetailSchool] = React.useState(null);

    React.useEffect(() => {
        if (!isParent) {
            navigate("/login", {replace: true});
        }
    }, [isParent, navigate]);

    React.useEffect(() => {
        if (!isParent) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError("");
            try {
                const schoolList = await getPublicSchoolList();
                if (cancelled) return;
                const rows = (Array.isArray(schoolList) ? schoolList : [])
                    .filter((item) => Boolean(item?.isFavourite))
                    .map((item) => {
                        const campusList = Array.isArray(item?.campusList)
                            ? item.campusList
                            : Array.isArray(item?.campustList)
                                ? item.campustList
                                : [];
                        const firstCampus = campusList[0] ?? null;
                        const id = item?.id ?? null;
                        return {
                            id,
                            schoolKey: id != null ? `id:${id}` : `saved-${item?.name || Math.random()}`,
                            schoolName: item?.name || "Trường đang cập nhật",
                            province: (firstCampus?.city || "").trim() || LOCATION_FALLBACK_PROVINCE,
                            ward: (firstCampus?.district || "").trim() || LOCATION_FALLBACK_WARD,
                            logoUrl: item?.logoUrl || null,
                            averageRating: Number(item?.averageRating) || 0,
                            isFavourite: true
                        };
                    });
                if (!cancelled) setSavedSchools(rows);
            } catch (e) {
                if (!cancelled) {
                    setError(
                        e?.response?.data?.message ||
                        e?.message ||
                        "Không tải được danh sách trường yêu thích."
                    );
                    setSavedSchools([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isParent, userInfo]);

    const onRemove = async (schoolRecord) => {
        if (!isParent) {
            showWarningSnackbar("Bạn phải đăng nhập với vai trò Phụ huynh để quản lý trường yêu thích.");
            return;
        }
        if (!schoolRecord?.id) {
            showWarningSnackbar("Không xác định được trường để bỏ yêu thích.");
            return;
        }
        try {
            await postParentFavouriteSchool({schoolId: schoolRecord.id});
        } catch (e) {
            showWarningSnackbar(
                e?.response?.data?.message ||
                e?.message ||
                "Không thể cập nhật trạng thái yêu thích trường."
            );
            return;
        }
        setSavedSchools((prev) => prev.filter((x) => x?.id !== schoolRecord.id));
        enqueueSnackbar("Đã gỡ trường khỏi Trường yêu thích.", {autoHideDuration: 1800});
    };

    const openSchoolDetail = async (schoolRecord) => {
        setDetailOpen(true);
        setDetailError("");
        setDetailSchool({
            schoolName: schoolRecord?.schoolName || "Trường",
            logoUrl: schoolRecord?.logoUrl || null,
            averageRating: Number(schoolRecord?.averageRating) || 0,
            ward: schoolRecord?.ward || LOCATION_FALLBACK_WARD,
            province: schoolRecord?.province || LOCATION_FALLBACK_PROVINCE,
            hotline: "",
            websiteUrl: "",
            description: ""
        });
        const id = schoolRecord?.id ?? (String(schoolRecord?.schoolKey || "").startsWith("id:") ? Number(String(schoolRecord.schoolKey).slice(3)) : null);
        if (!id) return;
        try {
            setDetailLoading(true);
            const detail = await getPublicSchoolDetail(id);
            const campusList = Array.isArray(detail?.campusList)
                ? detail.campusList
                : Array.isArray(detail?.campustList)
                    ? detail.campustList
                    : [];
            const firstCampus = campusList[0] ?? null;
            setDetailSchool({
                schoolName: detail?.name || schoolRecord?.schoolName || "Trường",
                logoUrl: detail?.logoUrl || schoolRecord?.logoUrl || null,
                averageRating: Number(detail?.averageRating) || Number(schoolRecord?.averageRating) || 0,
                ward: (firstCampus?.district || "").trim() || schoolRecord?.ward || LOCATION_FALLBACK_WARD,
                province: (firstCampus?.city || "").trim() || schoolRecord?.province || LOCATION_FALLBACK_PROVINCE,
                hotline: firstCampus?.phoneNumber || detail?.hotline || "",
                websiteUrl: detail?.websiteUrl || "",
                description: detail?.description ? String(detail.description) : ""
            });
        } catch (e) {
            setDetailError(e?.response?.data?.message || e?.message || "Không tải được chi tiết trường.");
        } finally {
            setDetailLoading(false);
        }
    };

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
                <Box sx={{display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2}}>
                    <Typography sx={{fontWeight: 800, fontSize: 20, color: "#1e293b"}}>
                        Trường yêu thích
                    </Typography>
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
                            <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", sm: "1fr 1fr"}, gap: 2}}>
                                {savedSchools.map((item) => (
                                    <Card
                                        key={item?.schoolKey}
                                        sx={{
                                            position: "relative",
                                            display: "grid",
                                            gridTemplateColumns: {xs: "1fr", sm: "220px 1fr"},
                                            gap: 1.5,
                                            p: 1.5,
                                            ...cardSurface,
                                            transition: "transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease",
                                            "&:hover": {
                                                transform: "translateY(-4px)",
                                                boxShadow: "0 18px 36px rgba(51,65,85,0.14)",
                                                borderColor: "rgba(59,130,246,0.28)"
                                            }
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                top: 10,
                                                right: 10,
                                                zIndex: 2,
                                                display: "flex",
                                                gap: 0.5,
                                                alignItems: "center"
                                            }}
                                        >
                                            <IconButton
                                                size="small"
                                                onClick={() => onRemove(item)}
                                                sx={{
                                                    bgcolor: "rgba(255,255,255,0.92)",
                                                    border: "1px solid rgba(59,130,246,0.2)",
                                                    "&:hover": {bgcolor: "#fff", borderColor: "rgba(59,130,246,0.35)"}
                                                }}
                                                title="Gỡ khỏi Trường yêu thích"
                                            >
                                                <BookmarkIcon fontSize="small" sx={{color: "#ea580c"}}/>
                                            </IconButton>
                                        </Box>
                                        <CardMedia
                                            component="img"
                                            image={item?.logoUrl || DEFAULT_SCHOOL_IMAGE}
                                            alt={item?.schoolName}
                                            sx={{
                                                height: {xs: 132, sm: 120},
                                                width: "88%",
                                                mx: "auto",
                                                borderRadius: 3,
                                                objectFit: "contain"
                                            }}
                                        />
                                        <Box sx={{display: "flex", flexDirection: "column", minHeight: 132}}>
                                            <Typography sx={{fontWeight: 800, fontSize: {xs: "1.15rem", sm: "1.35rem"}, color: "#1e293b", lineHeight: 1.25, pr: {xs: 6, sm: 7}}}>
                                                {item?.schoolName}
                                            </Typography>
                                            <Typography sx={{mt: 1.5, color: "#64748b", fontSize: "0.9rem", fontWeight: 600}}>
                                                {`${item?.ward || "Đang cập nhật"} - ${item?.province || "Đang cập nhật"}`}
                                            </Typography>

                                            <Box sx={{display: "flex", justifyContent: "flex-end", mt: 2}}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => openSchoolDetail(item)}
                                                    sx={{
                                                        textTransform: "none",
                                                        fontWeight: 700,
                                                        borderRadius: 999,
                                                        px: 2,
                                                        borderColor: "rgba(59,130,246,0.4)",
                                                        color: BRAND_NAVY,
                                                        bgcolor: "rgba(255,255,255,0.6)",
                                                        "&:hover": {
                                                            borderColor: BRAND_NAVY,
                                                            bgcolor: "rgba(255,255,255,0.95)"
                                                        }
                                                    }}
                                                >
                                                    Xem chi tiết
                                                </Button>
                                            </Box>
                                            <Box sx={{mt: "auto", pt: 1.25, display: "flex", alignItems: "center", minHeight: 24}}>
                                                {(Number(item?.averageRating) || 0) > 0 ? (
                                                    <Rating
                                                        value={Math.min(5, Math.max(0, Number(item?.averageRating) || 0))}
                                                        precision={0.5}
                                                        readOnly
                                                        size="small"
                                                        sx={{transform: "scale(1.2)", transformOrigin: "left center"}}
                                                    />
                                                ) : (
                                                    <Typography sx={{color: "#64748b", fontSize: "0.95rem"}}>
                                                        Chưa có đánh giá
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </Card>
                                ))}
                            </Box>
                        )}
                    </>
                )}
            </Box>
            <Dialog
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                fullWidth
                maxWidth="md"
                PaperProps={{sx: {borderRadius: 3}}}
            >
                <DialogTitle sx={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                    <Typography sx={{fontWeight: 800, color: "#1e293b"}}>Chi tiết trường</Typography>
                    <IconButton onClick={() => setDetailOpen(false)}>
                        <CloseIcon/>
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {detailSchool && (
                        <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "240px 1fr"}, gap: 2}}>
                            <CardMedia
                                component="img"
                                image={detailSchool.logoUrl || DEFAULT_SCHOOL_IMAGE}
                                alt={detailSchool.schoolName}
                                sx={{height: 180, width: "100%", borderRadius: 2, objectFit: "contain"}}
                            />
                            <Box>
                                <Typography sx={{fontSize: 24, fontWeight: 800, color: "#0f172a"}}>
                                    {detailSchool.schoolName}
                                </Typography>
                                <Typography sx={{mt: 1, color: "#64748b", fontWeight: 600}}>
                                    {`${detailSchool.ward || LOCATION_FALLBACK_WARD} - ${detailSchool.province || LOCATION_FALLBACK_PROVINCE}`}
                                </Typography>
                                <Box sx={{mt: 1}}>
                                    <Rating
                                        value={Math.min(5, Math.max(0, Number(detailSchool.averageRating) || 0))}
                                        precision={0.5}
                                        readOnly
                                    />
                                </Box>
                                {!!detailSchool.hotline && (
                                    <Typography sx={{mt: 1.5, color: "#334155"}}>Hotline: {detailSchool.hotline}</Typography>
                                )}
                                {!!detailSchool.websiteUrl && (
                                    <Typography sx={{mt: 0.75, color: "#334155"}}>Website: {detailSchool.websiteUrl}</Typography>
                                )}
                            </Box>
                        </Box>
                    )}
                    {detailLoading && (
                        <Box sx={{display: "flex", justifyContent: "center", py: 2}}>
                            <CircularProgress size={24} sx={{color: BRAND_NAVY}}/>
                        </Box>
                    )}
                    {!!detailError && (
                        <Typography sx={{mt: 1.5, color: "#b45309", fontWeight: 600}}>
                            {detailError}
                        </Typography>
                    )}
                    {!!detailSchool?.description && (
                        <Typography sx={{mt: 2, color: "#475569", lineHeight: 1.7}}>
                            {detailSchool.description}
                        </Typography>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
}

