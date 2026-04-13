import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Skeleton,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import SettingsIcon from "@mui/icons-material/Settings";
import SchoolIcon from "@mui/icons-material/School";
import CloseIcon from "@mui/icons-material/Close";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { enqueueSnackbar } from "notistack";
import { getProfile, updateProfile } from "../../../services/AccountService.jsx";
import CloudinaryUpload from "../../ui/CloudinaryUpload.jsx";
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const BOARDING_TYPE_OPTIONS = [
    { value: "FULL_BOARDING", label: "Nội trú" },
    { value: "SEMI_BOARDING", label: "Bán trú" },
    { value: "BOTH", label: "Cả hai (Nội trú & Bán trú)" },
];

const BOARDING_TYPE_DEFAULT = "FULL_BOARDING";
const HCM_CODE = 79;
/** Dùng cho geocoding (Nominatim) */
const HCM_CITY_NAME = "Ho Chi Minh City";
/** Giá trị `city` gửi/nhận từ API profile (GET/PUT) */
const API_CITY_DEFAULT = "Ho Chi Minh";
const DEFAULT_MAP_CENTER = [10.7769, 106.7009];
const BOARDING_VI_TO_ENUM = {
    "Nội trú": "FULL_BOARDING",
    "Bán trú": "SEMI_BOARDING",
    "Cả hai (Nội trú & Bán trú)": "BOTH",
};

function normalizeBoardingTypeEnum(raw) {
    if (raw == null || String(raw).trim() === "") return BOARDING_TYPE_DEFAULT;
    const s = String(raw).trim();
    if (BOARDING_TYPE_OPTIONS.some((o) => o.value === s)) return s;
    if (BOARDING_VI_TO_ENUM[s]) return BOARDING_VI_TO_ENUM[s];
    return BOARDING_TYPE_DEFAULT;
}

function boardingTypeLabel(value) {
    const normalized = normalizeBoardingTypeEnum(value);
    const match = BOARDING_TYPE_OPTIONS.find((o) => o.value === normalized);
    return match ? match.label : "—";
}

function campusStatusLabel(status) {
    const s = String(status ?? "").toUpperCase();
    if (s === "ACTIVE") return "Hoạt động";
    if (s === "INACTIVE" || s === "DISABLED") return "Ngưng hoạt động";
    if (s === "VERIFIED") return "Đã xác thực";
    if (!s || s === "NULL") return "—";
    return String(status);
}

const toBoolean = (value) => value === true || value === "true" || value === 1 || value === "1";

function syncSchoolFirstLoginInStorage(nextFirstLogin) {
    const raw = localStorage.getItem("user");
    if (!raw) return;
    try {
        const u = JSON.parse(raw);
        if (u?.role === "SCHOOL" && nextFirstLogin !== undefined) {
            localStorage.setItem("user", JSON.stringify({ ...u, firstLogin: nextFirstLogin }));
        }
    } catch {
        /* ignore */
    }
}

const SectionHeader = ({ icon: HeaderIcon, title }) => (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <Box
            sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: "rgba(29, 78, 216, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <HeaderIcon sx={{ color: "#2563eb", fontSize: 22 }} />
        </Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#1e293b" }}>
            {title}
        </Typography>
    </Stack>
);

function InfoRow({ label, value }) {
    return (
        <Box sx={{ py: 1.25, borderBottom: "1px solid #f1f5f9", "&:last-of-type": { borderBottom: 0 } }}>
            <Typography variant="caption" sx={{ color: "#64748b", display: "block", mb: 0.25 }}>
                {label}
            </Typography>
            <Typography variant="body2" fontWeight={500} sx={{ color: "#1e293b" }}>
                {value || "—"}
            </Typography>
        </Box>
    );
}

function MiniInfoCard({ label, value }) {
    return (
        <Box
            sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid #e2e8f0",
                bgcolor: "#ffffff",
                minHeight: 92,
            }}
        >
            <Typography variant="caption" sx={{ color: "#64748b", display: "block", mb: 0.5 }}>
                {label}
            </Typography>
            <Typography variant="body2" fontWeight={600} sx={{ color: "#1e293b" }}>
                {value || "—"}
            </Typography>
        </Box>
    );
}

function imageItemIsUsage(item) {
    if (item == null) return true;
    if (typeof item.isUsage === "boolean") return item.isUsage;
    if (typeof item.usage === "boolean") return item.usage;
    return true;
}

function RecenterMap({ center, zoom = 15 }) {
    const map = useMap();

    useEffect(() => {
        if (!Array.isArray(center) || center.length !== 2) return;
        map.setView(center, zoom, { animate: true });
    }, [center, zoom, map]);

    return null;
}

export default function SchoolProfile() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [editOpen, setEditOpen] = useState(false);
    const [unsavedConfirmOpen, setUnsavedConfirmOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    const [selectedDistrictCode, setSelectedDistrictCode] = useState("");
    const [selectedWardCode, setSelectedWardCode] = useState("");
    const [geocoding, setGeocoding] = useState(false);
    const firstLoginPromptedRef = useRef(false);
    const geocodeRequestIdRef = useRef(0);
    const [formValues, setFormValues] = useState({
        campusName: "",
        phoneNumber: "",
        policyDetail: "",
        address: "",
        city: API_CITY_DEFAULT,
        district: "",
        ward: "",
        latitude: "",
        longitude: "",
        boardingType: BOARDING_TYPE_DEFAULT,
        schoolName: "",
        schoolDescription: "",
        logoUrl: "",
        websiteUrl: "",
        hotline: "",
        coverUrl: "",
        itemList: [],
        facilityOverview: "",
        facilityItemList: [],
    });

    const fetchDistrictsHCM = useCallback(async () => {
        const res = await fetch(`https://provinces.open-api.vn/api/p/${HCM_CODE}?depth=2`);
        if (!res.ok) throw new Error("Không tải được danh sách quận");
        const data = await res.json();
        return Array.isArray(data?.districts) ? data.districts : [];
    }, []);

    const fetchWards = useCallback(async (districtCode) => {
        if (!districtCode) return [];
        const res = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
        if (!res.ok) throw new Error("Không tải được danh sách phường");
        const data = await res.json();
        return Array.isArray(data?.wards) ? data.wards : [];
    }, []);

    const geocodeAddress = useCallback(async (address) => {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
            {
                headers: {
                    Accept: "application/json",
                },
            }
        );
        if (!res.ok) throw new Error("Không tìm được tọa độ");
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return null;
        return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
        };
    }, []);

    const hydrateFromBody = useCallback((body) => {
        if (body == null) return;
        setProfile(body);
        if (body.firstLogin !== undefined) {
            syncSchoolFirstLoginInStorage(body.firstLogin);
        }
        const campus = body?.campus || {};
        const legacySchoolData = campus.schoolData || {};
        const facilityJson = campus.facilityJson || campus.facility || {};
        const imageJson = campus.imageJson || {};
        const list = Array.isArray(imageJson.itemList) ? imageJson.itemList : [];
        const facilityList = Array.isArray(facilityJson.itemList) ? facilityJson.itemList : [];
        const schoolName = campus.schoolName || legacySchoolData.name || "";
        setFormValues({
            campusName: campus.name || "",
            phoneNumber: campus.phoneNumber || "",
            policyDetail: campus.policyDetail || "",
            address: campus.address || "",
            city: (campus.city && String(campus.city).trim()) || API_CITY_DEFAULT,
            district: campus.district || "",
            ward: campus.ward || "",
            latitude: campus.latitude != null ? String(campus.latitude) : "",
            longitude: campus.longitude != null ? String(campus.longitude) : "",
            boardingType: normalizeBoardingTypeEnum(campus.boardingType),
            schoolName: schoolName || "",
            schoolDescription: campus.schoolDescription ?? legacySchoolData.description ?? "",
            logoUrl: campus.logoUrl ?? legacySchoolData.logoUrl ?? "",
            websiteUrl: campus.websiteUrl ?? legacySchoolData.websiteUrl ?? "",
            hotline: campus.hotline ?? legacySchoolData.hotline ?? "",
            coverUrl: imageJson.coverUrl || "",
            itemList: list.map((item) => ({
                name: item.name || "",
                url: item.url || "",
                altName: item.altName || "",
                isUsage: imageItemIsUsage(item),
                uploadDate: item.uploadDate,
            })),
            facilityOverview: facilityJson.overview || "",
            facilityItemList: facilityList.map((f) => ({
                facilityCode: f.facilityCode || "",
                name: f.name || "",
                value: f.value || "",
                unit: f.unit || "",
                category: f.category || "",
            })),
        });
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getProfile();
                if (res?.status === 200) {
                    hydrateFromBody(res?.data?.body);
                } else {
                    enqueueSnackbar(res?.data?.message || "Không tải được thông tin hồ sơ", { variant: "error" });
                }
            } catch {
                enqueueSnackbar("Không tải được thông tin hồ sơ", { variant: "error" });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [hydrateFromBody]);

    useEffect(() => {
        const loadDistricts = async () => {
            try {
                const data = await fetchDistrictsHCM();
                setDistricts(data);
            } catch (error) {
                enqueueSnackbar(error?.message || "Không tải được danh sách quận TP.HCM", { variant: "error" });
            }
        };
        loadDistricts();
    }, [fetchDistrictsHCM]);

    useEffect(() => {
        if (!editOpen || districts.length === 0) return;
        const existingDistrictName = formValues.district?.trim();
        if (!existingDistrictName || selectedDistrictCode) return;
        const matchedDistrict = districts.find((d) => d.name === existingDistrictName);
        if (!matchedDistrict) return;
        setSelectedDistrictCode(String(matchedDistrict.code));
        fetchWards(matchedDistrict.code)
            .then((data) => setWards(data))
            .catch(() => setWards([]));
    }, [editOpen, districts, formValues.district, selectedDistrictCode, fetchWards]);

    useEffect(() => {
        if (!editOpen || wards.length === 0) return;
        const existingWardName = formValues.ward?.trim();
        if (!existingWardName || selectedWardCode) return;
        const matchedWard = wards.find((w) => w.name === existingWardName);
        if (!matchedWard) return;
        setSelectedWardCode(String(matchedWard.code));
    }, [editOpen, wards, formValues.ward, selectedWardCode]);

    useEffect(() => {
        if (loading) return;
        try {
            const raw = localStorage.getItem("user");
            if (!raw) return;
            const u = JSON.parse(raw);
            if (u?.role === "SCHOOL" && toBoolean(u.firstLogin) && !firstLoginPromptedRef.current) {
                firstLoginPromptedRef.current = true;
                setEditOpen(true);
                enqueueSnackbar("Vui lòng cập nhật thông tin hồ sơ cơ sở.", { variant: "info" });
            }
        } catch {
            /* ignore */
        }
    }, [loading]);

    const handleSaveProfile = async () => {
        const firstErrorField = Object.keys(formErrors)[0];
        if (firstErrorField) {
            enqueueSnackbar("Vui lòng kiểm tra lại thông tin bắt buộc", { variant: "warning" });
            const target = document.getElementById(`school-profile-${firstErrorField}`);
            target?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
        setSaving(true);
        try {
            const latitudeNumber = formValues.latitude === "" ? undefined : Number(formValues.latitude);
            const longitudeNumber = formValues.longitude === "" ? undefined : Number(formValues.longitude);
            const isBranchCampusPayload = profile?.campus?.isPrimaryBranch === false;
            const cityPayload = (formValues.city && String(formValues.city).trim()) || API_CITY_DEFAULT;
            const campusBase = {
                name: formValues.campusName?.trim() || "",
                phoneNumber: (formValues.phoneNumber || "").replace(/[^\d+]/g, "").trim(),
                address: formValues.address?.trim() || "",
                city: cityPayload,
                district: formValues.district?.trim() || "",
                ward: formValues.ward?.trim() || "",
                boardingType: normalizeBoardingTypeEnum(formValues.boardingType),
                latitude: Number.isFinite(latitudeNumber) ? latitudeNumber : undefined,
                longitude: Number.isFinite(longitudeNumber) ? longitudeNumber : undefined,
            };
            const payload = {
                campusData: isBranchCampusPayload
                    ? campusBase
                    : {
                          ...campusBase,
                          schoolData: {
                              description: formValues.schoolDescription?.trim() || "",
                              logoUrl: formValues.logoUrl?.trim() || "",
                              websiteUrl: formValues.websiteUrl?.trim() || "",
                              hotline: formValues.hotline?.trim() || "",
                          },
                      },
            };
            const res = await updateProfile(payload);
            if (res?.status === 200) {
                enqueueSnackbar("Cập nhật hồ sơ thành công", { variant: "success" });
                setEditOpen(false);
                let nextBody = res.data?.body;
                if (typeof nextBody === "string") {
                    try {
                        nextBody = JSON.parse(nextBody);
                    } catch {
                        nextBody = null;
                    }
                }
                if (!nextBody) {
                    const fresh = await getProfile();
                    if (fresh?.status === 200) {
                        nextBody = fresh.data?.body;
                        if (typeof nextBody === "string") {
                            try {
                                nextBody = JSON.parse(nextBody);
                            } catch {
                                nextBody = null;
                            }
                        }
                    }
                }
                if (nextBody) {
                    hydrateFromBody(nextBody);
                    if (nextBody.firstLogin === undefined) {
                        syncSchoolFirstLoginInStorage(false);
                    }
                } else {
                    syncSchoolFirstLoginInStorage(false);
                }
            } else {
                enqueueSnackbar("Cập nhật thất bại", { variant: "error" });
            }
        } catch (e) {
            enqueueSnackbar(e?.response?.data?.message || "Cập nhật thất bại", { variant: "error" });
        } finally {
            setSaving(false);
        }
    };

    const handleDistrictChange = async (districtCode) => {
        setSelectedDistrictCode(districtCode ? String(districtCode) : "");
        setSelectedWardCode("");
        setWards([]);

        const district = districts.find((d) => String(d.code) === String(districtCode));
        setFormValues((p) => ({
            ...p,
            city: (p.city && String(p.city).trim()) || API_CITY_DEFAULT,
            district: district?.name || "",
            ward: "",
        }));

        if (!districtCode) return;
        try {
            const wardData = await fetchWards(districtCode);
            setWards(wardData);
        } catch (error) {
            enqueueSnackbar(error?.message || "Không tải được danh sách phường", { variant: "error" });
        }
    };

    const handleGetLocation = useCallback(async () => {
        const district = districts.find((d) => String(d.code) === String(selectedDistrictCode));
        const ward = wards.find((w) => String(w.code) === String(selectedWardCode));
        const address = district && ward ? `${ward.name}, ${district.name}, ${HCM_CITY_NAME}, Vietnam` : "";
        if (!address) return;

        const requestId = geocodeRequestIdRef.current + 1;
        geocodeRequestIdRef.current = requestId;
        setGeocoding(true);
        try {
            const location = await geocodeAddress(address);
            if (requestId !== geocodeRequestIdRef.current) return;
            if (!location) {
                enqueueSnackbar("Không tìm thấy tọa độ cho địa chỉ đã chọn", { variant: "warning" });
                return;
            }
            setFormValues((p) => ({
                ...p,
                city: (p.city && String(p.city).trim()) || API_CITY_DEFAULT,
                district: district?.name || p.district,
                ward: ward?.name || p.ward,
                latitude: String(location.lat),
                longitude: String(location.lng),
            }));
        } catch (error) {
            enqueueSnackbar(error?.message || "Không lấy được tọa độ", { variant: "error" });
        } finally {
            if (requestId === geocodeRequestIdRef.current) {
                setGeocoding(false);
            }
        }
    }, [districts, geocodeAddress, selectedDistrictCode, selectedWardCode, wards]);

    useEffect(() => {
        if (!editOpen || !selectedDistrictCode || !selectedWardCode || wards.length === 0) return;
        handleGetLocation();
        // Auto geocode when ward selection is completed.
    }, [editOpen, selectedDistrictCode, selectedWardCode, wards, handleGetLocation]);

    const campus = profile?.campus || {};
    const isBranchCampus = campus.isPrimaryBranch === false;
    const facility = campus.facility ?? campus.facilityJson ?? { overview: "", itemList: [] };
    const facilityItemList = facility.itemList ?? [];
    const hasImageJson = !!(campus.imageJson?.coverUrl || (campus.imageJson?.itemList?.length > 0));
    const hasFacilityJson = !!(facility?.overview || facilityItemList.length > 0);
    const campusLatitude = Number(campus.latitude);
    const campusLongitude = Number(campus.longitude);
    const hasCampusLatLng = Number.isFinite(campusLatitude) && Number.isFinite(campusLongitude);
    const campusMapCenter = hasCampusLatLng ? [campusLatitude, campusLongitude] : DEFAULT_MAP_CENTER;
    const formLatitude = Number(formValues.latitude);
    const formLongitude = Number(formValues.longitude);
    const hasFormLatLng = Number.isFinite(formLatitude) && Number.isFinite(formLongitude);
    const editMapCenter = hasFormLatLng ? [formLatitude, formLongitude] : DEFAULT_MAP_CENTER;
    const initialEditSnapshotRef = useRef("");

    const formErrors = useMemo(() => {
        const errors = {};
        if (!formValues.campusName?.trim()) errors.campusName = "Vui lòng nhập tên cơ sở";
        if (!formValues.phoneNumber?.trim()) errors.phoneNumber = "Vui lòng nhập số điện thoại";
        if (!/^[0-9+\-\s()]{8,15}$/.test(formValues.phoneNumber?.trim() || "")) {
            errors.phoneNumber = "Số điện thoại chưa hợp lệ";
        }
        if (!formValues.address?.trim()) errors.address = "Vui lòng nhập địa chỉ";
        if (!isBranchCampus && formValues.websiteUrl?.trim()) {
            try {
                // eslint-disable-next-line no-new
                new URL(formValues.websiteUrl.trim());
            } catch {
                errors.websiteUrl = "Đường dẫn website không hợp lệ";
            }
        }
        return errors;
    }, [formValues.address, formValues.campusName, formValues.phoneNumber, formValues.websiteUrl, isBranchCampus]);

    const isFormDirty = useMemo(() => {
        const currentSnapshot = JSON.stringify({
            ...formValues,
            selectedDistrictCode,
            selectedWardCode,
        });
        return currentSnapshot !== initialEditSnapshotRef.current;
    }, [formValues, selectedDistrictCode, selectedWardCode]);

    useEffect(() => {
        if (!editOpen) return;
        initialEditSnapshotRef.current = JSON.stringify({
            ...formValues,
            selectedDistrictCode,
            selectedWardCode,
        });
    }, [editOpen, formValues, selectedDistrictCode, selectedWardCode]);

    const handleRequestCloseEdit = () => {
        if (saving) return;
        if (isFormDirty) {
            setUnsavedConfirmOpen(true);
        } else {
            setEditOpen(false);
        }
    };

    const handleConfirmDiscardUnsaved = () => {
        setUnsavedConfirmOpen(false);
        setEditOpen(false);
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%", pb: 4 }}>
                <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
            </Box>
        );
    }

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%", pb: 4 }}>
            <Box
                sx={{
                    background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                    borderRadius: 3,
                    p: 3,
                    color: "white",
                    boxShadow: "0 8px 32px rgba(13, 100, 222, 0.25)",
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: { xs: "flex-start", sm: "center" },
                        justifyContent: "space-between",
                        gap: 2,
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1, minWidth: 0 }}>
                        <Box
                            sx={{
                                width: 72,
                                height: 72,
                                borderRadius: "50%",
                                bgcolor: "rgba(255,255,255,0.25)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                overflow: "hidden",
                            }}
                        >
                            {formValues.logoUrl ? (
                                <Box component="img" src={formValues.logoUrl} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
                            ) : null}
                            {!formValues.logoUrl && <SchoolIcon sx={{ fontSize: 36 }} />}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
                                {isBranchCampus ? (campus.name || "Hồ sơ cơ sở") : (campus.schoolName || campus.name || "Hồ sơ trường")}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.95 }}>
                                {isBranchCampus ? (profile?.email || "—") : "Quản lý thông tin trường học"}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap", gap: 0.5 }}>
                                <Chip label="Trường học" size="small" sx={{ bgcolor: "rgba(255,255,255,0.25)", color: "white", fontWeight: 600 }} />
                                {isBranchCampus && (
                                    <Chip label="Cơ sở phụ" size="small" sx={{ bgcolor: "rgba(255,255,255,0.25)", color: "white", fontWeight: 600 }} />
                                )}
                                {!isBranchCampus && campus.status === "VERIFIED" && (
                                    <Chip icon={<VerifiedUserIcon sx={{ fontSize: 16, color: "white !important" }} />} label="Đã xác thực" size="small" sx={{ bgcolor: "rgba(255,255,255,0.25)", color: "white", fontWeight: 600 }} />
                                )}
                            </Stack>
                        </Box>
                    </Stack>
                    <Button
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={() => setEditOpen(true)}
                        sx={{
                            bgcolor: "rgba(255,255,255,0.95)",
                            color: "#0D64DE",
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 600,
                            px: 3,
                            py: 1.25,
                            boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                            "&:hover": { bgcolor: "white", boxShadow: "0 6px 20px rgba(0,0,0,0.2)" },
                        }}
                    >
                        Chỉnh sửa hồ sơ
                    </Button>
                </Box>
            </Box>

            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                    bgcolor: "#F8FAFC",
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    <SectionHeader icon={PersonIcon} title={isBranchCampus ? "Hồ sơ cơ sở" : "Thông tin liên hệ"} />
                    {isBranchCampus ? (
                        <Stack spacing={2}>
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                                <MiniInfoCard label="Email" value={profile?.email} />
                                <MiniInfoCard label="Tên cơ sở" value={campus.name} />
                                <MiniInfoCard label="Số điện thoại" value={campus.phoneNumber} />
                                <MiniInfoCard label="Hình thức nội trú" value={boardingTypeLabel(campus.boardingType)} />
                                <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                                    <MiniInfoCard label="Địa chỉ" value={campus.address} />
                                </Box>
                                <MiniInfoCard label="Thành phố" value={campus.city} />
                                <MiniInfoCard label="Quận / Huyện" value={campus.district} />
                                <MiniInfoCard label="Phường / Xã" value={campus.ward} />
                                <MiniInfoCard label="Vĩ độ" value={campus.latitude != null ? String(campus.latitude) : undefined} />
                                <MiniInfoCard label="Kinh độ" value={campus.longitude != null ? String(campus.longitude) : undefined} />
                                <MiniInfoCard label="Trạng thái cơ sở" value={campusStatusLabel(campus.status)} />
                            </Box>
                        </Stack>
                    ) : (
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, color: "#334155", fontWeight: 700 }}>Thông tin trường</Typography>
                                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                                    <MiniInfoCard label="Tên trường" value={campus.schoolName} />
                                    <MiniInfoCard label="Mô tả trường" value={campus.schoolDescription ?? campus.schoolData?.description} />
                                </Box>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, color: "#334155", fontWeight: 700 }}>Liên hệ</Typography>
                                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                                    <Stack spacing={2}>
                                        <MiniInfoCard label="Email" value={profile?.email} />
                                        <MiniInfoCard label="Số điện thoại" value={campus.phoneNumber} />
                                    </Stack>
                                    <Stack spacing={2}>
                                        <MiniInfoCard label="Website" value={campus.websiteUrl ?? campus.schoolData?.websiteUrl} />
                                        <MiniInfoCard label="Hotline" value={campus.hotline ?? campus.schoolData?.hotline} />
                                    </Stack>
                                </Box>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, color: "#334155", fontWeight: 700 }}>Đại diện & pháp lý</Typography>
                                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                                    <MiniInfoCard label="Đại diện" value={campus.representativeName ?? campus.schoolData?.representativeName} />
                                    <MiniInfoCard
                                        label="Giấy phép kinh doanh"
                                        value={(() => {
                                            const businessLicenseUrl = campus.businessLicenseUrl ?? campus.schoolData?.businessLicenseUrl;
                                            if (!businessLicenseUrl) return "—";
                                            return (
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    sx={{ textTransform: "none" }}
                                                    onClick={() => window.open(businessLicenseUrl, "_blank", "noopener,noreferrer")}
                                                >
                                                    Mở giấy phép
                                                </Button>
                                            );
                                        })()}
                                    />
                                </Box>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, color: "#334155", fontWeight: 700 }}>Địa điểm</Typography>
                                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
                                    <MiniInfoCard label="Thành phố" value={campus.city} />
                                    <MiniInfoCard label="Quận / Huyện" value={campus.district} />
                                    <MiniInfoCard label="Phường / Xã" value={campus.ward} />
                                </Box>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, color: "#334155", fontWeight: 700 }}>Thông tin bổ sung</Typography>
                                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2 }}>
                                    <MiniInfoCard label="Ngày thành lập" value={campus.foundingDate ?? campus.schoolData?.foundingDate} />
                                    <MiniInfoCard label="Hình thức nội trú" value={boardingTypeLabel(campus.boardingType)} />
                                    <MiniInfoCard label="Mã số thuế" value={campus.taxCode} />
                                </Box>
                            </Box>
                        </Stack>
                    )}
                </CardContent>
            </Card>

            {!isBranchCampus && (campus.imageJson?.coverUrl || (campus.imageJson?.itemList?.length > 0)) && (
                <Card
                    elevation={0}
                    sx={{
                        borderRadius: 3,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                        bgcolor: "#F8FAFC",
                    }}
                >
                    <CardContent sx={{ p: 3 }}>
                        <SectionHeader icon={AddPhotoAlternateIcon} title="Hình ảnh cơ sở" />
                        {campus.imageJson?.coverUrl && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" sx={{ color: "#64748b", display: "block", mb: 1 }}>
                                    Ảnh bìa
                                </Typography>
                                <Box
                                    component="img"
                                    src={campus.imageJson.coverUrl}
                                    alt="Ảnh bìa"
                                    onError={(e) => { e.target.style.display = "none"; }}
                                    sx={{
                                        width: "100%",
                                        maxHeight: 280,
                                        objectFit: "cover",
                                        borderRadius: 2,
                                        border: "1px solid #e2e8f0",
                                    }}
                                />
                            </Box>
                        )}
                        {campus.imageJson?.itemList?.length > 0 && (
                            <Box>
                                <Typography variant="caption" sx={{ color: "#64748b", display: "block", mb: 1 }}>
                                    Danh sách ảnh
                                </Typography>
                                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 2 }}>
                                    {campus.imageJson.itemList.map((item, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                borderRadius: 2,
                                                overflow: "hidden",
                                                border: "1px solid #e2e8f0",
                                                bgcolor: "#f8fafc",
                                                aspectRatio: "1",
                                            }}
                                        >
                                            <Box
                                                component="img"
                                                src={item.url}
                                                alt={item.altName || item.name || "Ảnh"}
                                                onError={(e) => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100' fill='%23e2e8f0'%3E%3Crect width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='12'%3E?%3C/text%3E%3C/svg%3E"; }}
                                                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                                            />
                                            {(item.name || item.altName) && (
                                                <Typography variant="caption" sx={{ display: "block", p: 1, color: "#64748b" }} noWrap>
                                                    {item.name || item.altName}
                                                </Typography>
                                            )}
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}

            {!isBranchCampus && (facility?.overview || facilityItemList.length > 0) && (
                <Card
                    elevation={0}
                    sx={{
                        borderRadius: 3,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                        bgcolor: "#F8FAFC",
                    }}
                >
                    <CardContent sx={{ p: 3 }}>
                        <SectionHeader icon={SettingsIcon} title="Cơ sở vật chất" />
                        {facility?.overview && <InfoRow label="Tổng quan" value={facility.overview} />}
                        {facilityItemList.length > 0 ? (
                            <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 2 }}>
                                {facilityItemList.map((item, index) => (
                                    <Box
                                        key={index}
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            border: "1px solid #e2e8f0",
                                            bgcolor: "#f8fafc",
                                        }}
                                    >
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                                            {item.name || item.facilityCode || "Facility"}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "#1e293b" }}>
                                            {item.value || "—"}
                                            {item.unit ? ` ${item.unit}` : ""}
                                        </Typography>
                                        {(item.category || item.facilityCode) && (
                                            <Typography variant="caption" sx={{ display: "block", color: "#64748b", mt: 0.5 }}>
                                                {item.category ? `Category: ${item.category}` : `Code: ${item.facilityCode}`}
                                            </Typography>
                                        )}
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Chưa có dữ liệu facility.
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                    bgcolor: "#F8FAFC",
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    <SectionHeader icon={LocationOnIcon} title="Địa chỉ" />
                    <InfoRow label="Địa chỉ" value={campus.address} />
                    <Box
                        sx={{
                            mt: 2,
                            height: 280,
                            borderRadius: 2,
                            overflow: "hidden",
                            border: "1px solid #e2e8f0",
                        }}
                    >
                        <MapContainer center={campusMapCenter} zoom={hasCampusLatLng ? 15 : 12} style={{ height: "100%", width: "100%" }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {hasCampusLatLng && (
                                <>
                                    <RecenterMap center={campusMapCenter} zoom={15} />
                                    <CircleMarker center={campusMapCenter} radius={10} pathOptions={{ color: "#0d64de", fillColor: "#0d64de", fillOpacity: 0.5 }} />
                                </>
                            )}
                        </MapContainer>
                    </Box>
                    {!hasCampusLatLng && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                            Chưa có tọa độ. Vào Chỉnh sửa hồ sơ để chọn Quận/Phường và tự động lấy kinh độ, vĩ độ.
                        </Typography>
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={editOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    handleRequestCloseEdit();
                }}
                fullWidth
                maxWidth="md"
                PaperProps={{ sx: { borderRadius: 3, bgcolor: "#f8fafc" } }}
            >
                <DialogTitle sx={{ px: 3, py: 2.5, borderBottom: "1px solid #e2e8f0" }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                        <Box>
                            <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#0f172a" }}>{isBranchCampus ? "Chỉnh sửa hồ sơ cơ sở" : "Chỉnh sửa hồ sơ"}</Typography>
                            <Typography variant="body2" sx={{ color: "#64748b", mt: 0.25 }}>
                                {isBranchCampus ? "Cập nhật thông tin cơ sở của bạn" : "Cập nhật thông tin trường học của bạn"}
                            </Typography>
                        </Box>
                        <IconButton onClick={handleRequestCloseEdit} size="small" aria-label="Đóng">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 3 }}>
                    <Box component="fieldset" disabled={saving} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
                        <Box sx={{ maxWidth: 840, mx: "auto" }}>
                            <Stack spacing={2.5}>
                                <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(15,23,42,0.04)" }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Thông tin cơ bản</Typography>
                                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                                            {!isBranchCampus && <TextField label="Tên trường" value={formValues.schoolName} fullWidth size="small" disabled />}
                                            <TextField id="school-profile-campusName" label="Tên cơ sở" value={formValues.campusName} onChange={(e) => setFormValues((p) => ({ ...p, campusName: e.target.value }))} error={!!formErrors.campusName} helperText={formErrors.campusName || ""} fullWidth size="small" placeholder="Nhập tên cơ sở" sx={isBranchCampus ? { gridColumn: { xs: "auto", sm: "1 / -1" } } : undefined} />
                                            <TextField id="school-profile-phoneNumber" label="Số điện thoại" value={formValues.phoneNumber} onChange={(e) => setFormValues((p) => ({ ...p, phoneNumber: e.target.value }))} error={!!formErrors.phoneNumber} helperText={formErrors.phoneNumber || ""} fullWidth size="small" placeholder="Ví dụ: 0983 810 915" />
                                            <FormControl fullWidth size="small">
                                                <InputLabel id="school-profile-boarding-type">Hình thức nội trú</InputLabel>
                                                <Select labelId="school-profile-boarding-type" label="Hình thức nội trú" value={formValues.boardingType || BOARDING_TYPE_DEFAULT} onChange={(e) => setFormValues((p) => ({ ...p, boardingType: e.target.value }))}>
                                                    {BOARDING_TYPE_OPTIONS.map((o) => (
                                                        <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                            <TextField id="school-profile-address" label="Địa chỉ" value={formValues.address} onChange={(e) => setFormValues((p) => ({ ...p, address: e.target.value }))} error={!!formErrors.address} helperText={formErrors.address || ""} fullWidth size="small" multiline rows={2} sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }} />
                                        </Box>
                                    </CardContent>
                                </Card>

                                <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(15,23,42,0.04)" }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Địa điểm</Typography>
                                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2 }}>
                                            <TextField label="Thành phố" value={formValues.city || API_CITY_DEFAULT} fullWidth size="small" disabled />
                                            <FormControl fullWidth size="small">
                                                <InputLabel id="school-profile-district">Quận</InputLabel>
                                                <Select labelId="school-profile-district" label="Quận" value={selectedDistrictCode} onChange={(e) => handleDistrictChange(e.target.value)}>
                                                    <MenuItem value="">Chọn quận</MenuItem>
                                                    {districts.map((d) => (<MenuItem key={d.code} value={String(d.code)}>{d.name}</MenuItem>))}
                                                </Select>
                                            </FormControl>
                                            <FormControl fullWidth size="small" disabled={!selectedDistrictCode}>
                                                <InputLabel id="school-profile-ward">Phường</InputLabel>
                                                <Select
                                                    labelId="school-profile-ward"
                                                    label="Phường"
                                                    value={selectedWardCode}
                                                    onChange={(e) => {
                                                        const code = e.target.value;
                                                        setSelectedWardCode(code);
                                                        const w = wards.find((x) => String(x.code) === String(code));
                                                        setFormValues((p) => ({ ...p, ward: w?.name || "" }));
                                                    }}
                                                >
                                                    <MenuItem value="">Chọn phường</MenuItem>
                                                    {wards.map((w) => (<MenuItem key={w.code} value={String(w.code)}>{w.name}</MenuItem>))}
                                                </Select>
                                            </FormControl>
                                        </Box>
                                        {geocoding && <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>Đang tự động lấy kinh độ / vĩ độ...</Typography>}
                                        <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                                            <TextField label="Vĩ độ" value={formValues.latitude} onChange={(e) => setFormValues((p) => ({ ...p, latitude: e.target.value }))} fullWidth size="small" type="number" inputProps={{ step: "any" }} />
                                            <TextField label="Kinh độ" value={formValues.longitude} onChange={(e) => setFormValues((p) => ({ ...p, longitude: e.target.value }))} fullWidth size="small" type="number" inputProps={{ step: "any" }} />
                                        </Box>
                                        <Box sx={{ mt: 2, height: 220, border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                                            <MapContainer center={editMapCenter} zoom={hasFormLatLng ? 15 : 12} style={{ height: "100%", width: "100%" }}>
                                                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                                {hasFormLatLng && (
                                                    <>
                                                        <RecenterMap center={editMapCenter} zoom={15} />
                                                        <CircleMarker center={editMapCenter} radius={8} pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.45 }} />
                                                    </>
                                                )}
                                            </MapContainer>
                                        </Box>
                                    </CardContent>
                                </Card>

                                {!isBranchCampus && (
                                    <>
                                        <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(15,23,42,0.04)" }}>
                                            <CardContent sx={{ p: 3 }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Thông tin hiển thị trường</Typography>
                                                <Stack spacing={2}>
                                                    <TextField
                                                        label="Mô tả trường"
                                                        value={formValues.schoolDescription}
                                                        onChange={(e) => setFormValues((p) => ({ ...p, schoolDescription: e.target.value }))}
                                                        fullWidth
                                                        size="small"
                                                        multiline
                                                        rows={4}
                                                    />
                                                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                                                        <TextField
                                                            id="school-profile-websiteUrl"
                                                            label="Website"
                                                            value={formValues.websiteUrl}
                                                            onChange={(e) => setFormValues((p) => ({ ...p, websiteUrl: e.target.value }))}
                                                            error={!!formErrors.websiteUrl}
                                                            helperText={formErrors.websiteUrl || ""}
                                                            fullWidth
                                                            size="small"
                                                            placeholder="https://..."
                                                        />
                                                        <TextField label="Hotline" value={formValues.hotline} onChange={(e) => setFormValues((p) => ({ ...p, hotline: e.target.value }))} fullWidth size="small" />
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, display: "block", mb: 1 }}>
                                                            Logo (logoUrl)
                                                        </Typography>
                                                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                                            <Box sx={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", border: "1px solid #e2e8f0", bgcolor: "#f8fafc", flexShrink: 0 }}>
                                                                {formValues.logoUrl ? <Box component="img" src={formValues.logoUrl} alt="Logo" sx={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <SchoolIcon sx={{ fontSize: 30, m: 2.5, color: "#94a3b8" }} />}
                                                            </Box>
                                                            <IconButton
                                                                type="button"
                                                                size="small"
                                                                aria-label="Xóa logo"
                                                                disabled={!formValues.logoUrl}
                                                                onClick={() => setFormValues((p) => ({ ...p, logoUrl: "" }))}
                                                                sx={{ bgcolor: "#fef2f2", color: "#dc2626", "&:hover": { bgcolor: "#fee2e2" }, "&.Mui-disabled": { bgcolor: "#f1f5f9", color: "#94a3b8" } }}
                                                            >
                                                                <DeleteOutlineIcon fontSize="small" />
                                                            </IconButton>
                                                            <CloudinaryUpload inputId="school-profile-logo" accept="image/*" multiple={false} onSuccess={([f]) => f?.url && setFormValues((p) => ({ ...p, logoUrl: f.url }))} onError={(m) => enqueueSnackbar(m, { variant: "error" })}>
                                                                {({ inputId, loading }) => (
                                                                    <IconButton component="label" htmlFor={inputId} disabled={loading} size="small" sx={{ bgcolor: "#f1f5f9", color: "#334155", border: "1px solid #e2e8f0", "&:hover": { bgcolor: "#e2e8f0" } }}>
                                                                        <CloudUploadIcon fontSize="small" />
                                                                    </IconButton>
                                                                )}
                                                            </CloudinaryUpload>
                                                        </Stack>
                                                        <Typography variant="body2" sx={{ color: "#64748b", wordBreak: "break-all", fontFamily: "ui-monospace, monospace", fontSize: "0.8125rem", lineHeight: 1.5 }}>
                                                            {formValues.logoUrl || "—"}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    </>
                                )}
                            </Stack>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e2e8f0", position: "sticky", bottom: 0, bgcolor: "#fff", zIndex: 2 }}>
                    <Button onClick={handleRequestCloseEdit} sx={{ textTransform: "none" }} disabled={saving}>Hủy</Button>
                    <Button variant="contained" onClick={handleSaveProfile} disabled={saving} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, bgcolor: "#2563eb", "&:hover": { bgcolor: "#2563eb" } }}>
                        {saving ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={unsavedConfirmOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    setUnsavedConfirmOpen(false);
                }}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Đóng chỉnh sửa?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                    <Button onClick={() => setUnsavedConfirmOpen(false)} sx={{ textTransform: "none" }}>
                        Quay lại
                    </Button>
                    <Button variant="contained" color="error" onClick={handleConfirmDiscardUnsaved} sx={{ textTransform: "none", fontWeight: 600 }}>
                        Đóng và hủy thay đổi
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
