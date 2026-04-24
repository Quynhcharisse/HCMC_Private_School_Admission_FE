import React, {useState, useMemo, useEffect, useCallback, useRef} from "react";
import {
    Box,
    Button,
    Card,
    CircularProgress,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormHelperText,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import Pagination from "@mui/material/Pagination";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import BlockIcon from "@mui/icons-material/Block";
import ApartmentIcon from "@mui/icons-material/Apartment";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import PhoneIcon from "@mui/icons-material/Phone";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import {enqueueSnackbar} from "notistack";
import {ConfirmHighlight} from "../../ui/ConfirmDialog.jsx";
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {useSchool} from "../../../contexts/SchoolContext.jsx";
import {extractCampusListBody, listCampuses, createCampus, exportCampusList} from "../../../services/CampusService.jsx";
import {sendWelcomeEmail} from "../../../services/emailService.jsx";
import {
    BOARDING_TYPE_DEFAULT_VI,
    BOARDING_TYPE_OPTIONS,
    normalizeBoardingTypeForApi,
    parseBoardingType,
} from "../../../constants/schoolBoardingType.js";
import CloudinaryUpload from "../../ui/CloudinaryUpload.jsx";
import {usePlatformMediaImageRules} from "../../../hooks/usePlatformMediaImageRules.js";

const modalPaperSx = {
    borderRadius: "16px",
    boxShadow: "0 24px 48px rgba(0, 0, 0, 0.12)",
    bgcolor: "white",
    overflow: "hidden",
};
const modalBackdropSx = {
    backdropFilter: "blur(6px)",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
};

const initialMockCampuses = [
    {
        id: 1,
        name: "Cơ sở 1 - Quận 1",
        address: "123 Nguyễn Huệ, Phường Bến Nghé",
        city: "Quận 1",
        district: "Quận 1",
        ward: "Phường Bến Nghé",
        phone: "0283822123",
        email: "campus1@school.edu.vn",
        description: "Cơ sở chính, gần trung tâm thành phố.",
        imageUrl: null,
        status: "active",
        counselorCount: 3,
    },
    {
        id: 2,
        name: "Cơ sở 2 - Bình Thạnh",
        address: "456 Điện Biên Phủ, Phường 25",
        city: "Bình Thạnh",
        district: "Bình Thạnh",
        ward: "Phường 25",
        phone: "0283899567",
        email: "campus2@school.edu.vn",
        description: "Cơ sở mở rộng, khu vực phía Bắc.",
        imageUrl: null,
        status: "active",
        counselorCount: 2,
    },
    {
        id: 3,
        name: "Cơ sở 3 - Thủ Đức",
        address: "789 Võ Văn Ngân, Phường Linh Chiểu",
        city: "Thủ Đức",
        district: "Thủ Đức",
        ward: "Phường Linh Chiểu",
        phone: "0283726901",
        email: "campus3@school.edu.vn",
        description: "Cơ sở tại thành phố Thủ Đức.",
        imageUrl: null,
        status: "inactive",
        counselorCount: 0,
    },
];

const emptyForm = {
    name: "",
    address: "",
    city: "",
    district: "",
    ward: "",
    phone: "",
    email: "",
    latitude: "",
    longitude: "",
    boardingType: BOARDING_TYPE_DEFAULT_VI,
    description: "",
    imagePreview: null,
    status: true,
};

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='60' viewBox='0 0 80 60' fill='%23e2e8f0'%3E%3Crect width='80' height='60' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%2394a3b8'%3ECampus%3C/text%3E%3C/svg%3E";
const HCM_CODE = 79;
const HCM_CITY_NAME = "Ho Chi Minh City";
const DEFAULT_MAP_CENTER = [10.7769, 106.7009];

/** Đồng bộ với CampusValidation.normalize (BE). */
function normalizeCampusField(value) {
    if (value == null) return null;
    const trimmed = String(value).trim();
    return trimmed === "" ? null : trimmed;
}

function RecenterMap({ center, zoom = 15 }) {
    const map = useMap();

    useEffect(() => {
        if (!Array.isArray(center) || center.length !== 2) return;
        map.setView(center, zoom, { animate: true });
    }, [center, zoom, map]);

    return null;
}

const formatDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return d;
    return date.toLocaleDateString("vi-VN");
};

const getBoardingTypeLabelVi = (boardingType, boardingTypeLabel) => {
    if (boardingType != null && String(boardingType).trim() !== "") {
        return normalizeBoardingTypeForApi(boardingType);
    }
    if (boardingTypeLabel != null && String(boardingTypeLabel).trim() !== "") {
        return normalizeBoardingTypeForApi(boardingTypeLabel);
    }
    return "—";
};

const toCampusUiStatus = (status) => {
    const normalizedStatus = String(status ?? "").toUpperCase();
    return normalizedStatus === "ACTIVE" || normalizedStatus === "VERIFIED"
        ? "active"
        : "inactive";
};

export default function SchoolCampus() {
    const { isPrimaryBranch } = useSchool();
    const [campuses, setCampuses] = useState([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [districtFilter, setDistrictFilter] = useState("all");
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
    const [selectedCampus, setSelectedCampus] = useState(null);
    const [formValues, setFormValues] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState({});
    const [districtOptions, setDistrictOptions] = useState([]);
    const [wardOptions, setWardOptions] = useState([]);
    const [selectedCreateDistrictCode, setSelectedCreateDistrictCode] = useState("");
    const [selectedCreateWardCode, setSelectedCreateWardCode] = useState("");
    const [geocodingCreate, setGeocodingCreate] = useState(false);
    const [createCampusSubmitting, setCreateCampusSubmitting] = useState(false);
    const geocodeCreateRequestIdRef = useRef(0);
    const [page, setPage] = useState(0);
    const rowsPerPage = 10;
    const [exporting, setExporting] = useState(false);
    const {loading: mediaImageRulesLoading, rules: mediaImageRules} = usePlatformMediaImageRules();
    const createLatitude = formValues.latitude === "" ? NaN : Number(formValues.latitude);
    const createLongitude = formValues.longitude === "" ? NaN : Number(formValues.longitude);
    const hasCreateLatLng = Number.isFinite(createLatitude) && Number.isFinite(createLongitude);
    const createMapCenter = hasCreateLatLng ? [createLatitude, createLongitude] : DEFAULT_MAP_CENTER;

    const districts = useMemo(() => {
        const set = new Set(campuses.map((c) => c.district).filter(Boolean));
        return Array.from(set).sort();
    }, [campuses]);

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormValues((prev) => ({...prev, [name]: value}));
        setFormErrors((prev) => ({...prev, [name]: undefined}));
    };

    const handleStatusToggle = (e) => {
        setFormValues((prev) => ({...prev, status: e.target.checked}));
    };

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
            { headers: { Accept: "application/json" } }
        );
        if (!res.ok) throw new Error("Không tìm được tọa độ");
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return null;
        return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
        };
    }, []);

    const clearImagePreview = () => {
        if (formValues.imagePreview?.startsWith?.("blob:")) {
            URL.revokeObjectURL(formValues.imagePreview);
        }
        setFormValues((prev) => ({
            ...prev,
            imagePreview: null,
        }));
    };

    const handleCampusImageUploaded = (files) => {
        const first = files?.[0];
        if (!first?.url) return;
        if (formValues.imagePreview?.startsWith?.("blob:")) {
            URL.revokeObjectURL(formValues.imagePreview);
        }
        setFormValues((prev) => ({
            ...prev,
            imagePreview: first.url,
        }));
        enqueueSnackbar("Tải ảnh lên thành công", {variant: "success"});
    };

    const filteredCampuses = useMemo(() => {
        let list = campuses;
        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (c) =>
                    c.name?.toLowerCase().includes(q) ||
                    c.address?.toLowerCase().includes(q)
            );
        }
        if (statusFilter === "active") {
            list = list.filter((c) => c.status === "active");
        } else if (statusFilter === "inactive") {
            list = list.filter((c) => c.status === "inactive");
        }
        if (districtFilter !== "all") {
            list = list.filter((c) => c.district === districtFilter);
        }
        return list;
    }, [campuses, search, statusFilter, districtFilter]);

    const paginatedCampuses = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredCampuses.slice(start, start + rowsPerPage);
    }, [filteredCampuses, page]);

    const validateForm = () => {
        const errors = {};
        const isCreateFlow = createModalOpen;

        const email = normalizeCampusField(formValues.email);
        if (!email) errors.email = "Email không được để trống";
        else if (email.length > 100) errors.email = "Email không được vượt quá 100 ký tự";

        const address = normalizeCampusField(formValues.address);
        if (!address) errors.address = "Địa chỉ không được để trống";
        else if (address.length > 250) errors.address = "Địa chỉ không được vượt quá 250 ký tự";

        const phone = normalizeCampusField(formValues.phone);
        if (!phone) errors.phone = "Số điện thoại không được để trống";
        else if (!/^0\d{9}$/.test(phone)) {
            errors.phone = "Số điện thoại không hợp lệ (phải bắt đầu bằng số 0 và có đúng 10 chữ số)";
        }

        const city = normalizeCampusField(formValues.city);
        if (!city) errors.city = "Vui lòng chọn Tỉnh/Thành phố";

        if (isCreateFlow) {
            if (!selectedCreateDistrictCode || !normalizeCampusField(formValues.district)) {
                errors.district = "Vui lòng chọn Quận/Huyện";
            }
            if (!selectedCreateWardCode || !normalizeCampusField(formValues.ward)) {
                errors.ward = "Vui lòng chọn Phường/Xã";
            }
        } else {
            if (!normalizeCampusField(formValues.district)) errors.district = "Vui lòng chọn Quận/Huyện";
            if (!normalizeCampusField(formValues.ward)) errors.ward = "Vui lòng chọn Phường/Xã";
        }

        if (parseBoardingType(formValues.boardingType) == null) {
            errors.boardingType =
                "Loại hình nội trú không hợp lệ. Các giá trị chấp nhận: FULL_BOARDING, SEMI_BOARDING, BOTH";
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const mapCampusFromApi = (dto, account) => ({
        id: dto.id,
        name: dto.name,
        address: dto.address,
        city: dto.city ?? "",
        district: dto.district ?? "",
        ward: dto.ward ?? "",
        latitude: dto.latitude,
        longitude: dto.longitude,
        boardingType: normalizeBoardingTypeForApi(dto.boardingType ?? dto.boardingTypeLabel),
        boardingTypeLabel: dto.boardingTypeLabel ?? "",
        phone: dto.phoneNumber ?? dto.phone ?? "",
        email: account?.email ?? "",
        description: dto.policyDetail ?? "",
        imageUrl: dto.imageJson?.coverUrl ?? dto.imageUrl ?? null,
        isPrimaryBranch: dto.isPrimaryBranch ?? false,
        campusStatus: dto.status,
        status: toCampusUiStatus(dto.status),
        accountStatus: account?.status ?? "",
        accountRegisterDate: account?.registerDate ?? "",
        counselorCount: 0,
    });

    useEffect(() => {
        const loadCampuses = async () => {
            try {
                const res = await listCampuses();
                const items = extractCampusListBody(res);
                if (res && res.status === 200 && Array.isArray(items)) {
                    setCampuses(items.map((dto) => mapCampusFromApi(dto, dto.account)));
                } else {
                    setCampuses(initialMockCampuses);
                }
            } catch (error) {
                console.error("Fetch campuses error:", error);
                enqueueSnackbar("Không tải được danh sách cơ sở", {variant: "error"});
                setCampuses(initialMockCampuses);
            }
        };

        loadCampuses();
    }, []);

    useEffect(() => {
        const loadDistricts = async () => {
            try {
                const data = await fetchDistrictsHCM();
                setDistrictOptions(data);
            } catch (error) {
                enqueueSnackbar(error?.message || "Không tải được danh sách quận TP.HCM", {variant: "error"});
            }
        };
        loadDistricts();
    }, [fetchDistrictsHCM]);

    const handleOpenCreate = () => {
        setSelectedCampus(null);
        setFormValues({...emptyForm, city: HCM_CITY_NAME});
        setFormErrors({});
        setSelectedCreateDistrictCode("");
        setSelectedCreateWardCode("");
        setWardOptions([]);
        setCreateModalOpen(true);
    };

    const handleCloseCreate = () => {
        clearImagePreview();
        setSelectedCreateDistrictCode("");
        setSelectedCreateWardCode("");
        setWardOptions([]);
        setGeocodingCreate(false);
        setCreateCampusSubmitting(false);
        setFormErrors({});
        setCreateModalOpen(false);
    };

    const handleCreateDistrictChange = async (districtCode) => {
        setSelectedCreateDistrictCode(districtCode ? String(districtCode) : "");
        setSelectedCreateWardCode("");
        setWardOptions([]);
        const district = districtOptions.find((d) => String(d.code) === String(districtCode));
        setFormValues((prev) => ({
            ...prev,
            city: HCM_CITY_NAME,
            district: district?.name || "",
            ward: "",
            latitude: "",
            longitude: "",
        }));
        setFormErrors((prev) => ({...prev, district: undefined, ward: undefined}));
        if (!districtCode) return;
        try {
            const wards = await fetchWards(districtCode);
            setWardOptions(wards);
        } catch (error) {
            enqueueSnackbar(error?.message || "Không tải được danh sách phường", {variant: "error"});
        }
    };

    const handleCreateWardChange = (wardCode) => {
        setSelectedCreateWardCode(wardCode ? String(wardCode) : "");
        const w = wardOptions.find((x) => String(x.code) === String(wardCode));
        setFormValues((prev) => ({
            ...prev,
            ward: w?.name || "",
            latitude: "",
            longitude: "",
        }));
        setFormErrors((prev) => ({...prev, ward: undefined}));
    };

    useEffect(() => {
        if (!createModalOpen || !selectedCreateDistrictCode || !selectedCreateWardCode) return;
        const district = districtOptions.find((d) => String(d.code) === String(selectedCreateDistrictCode));
        const ward = wardOptions.find((w) => String(w.code) === String(selectedCreateWardCode));
        if (!district || !ward) return;

        const requestId = geocodeCreateRequestIdRef.current + 1;
        geocodeCreateRequestIdRef.current = requestId;
        const address = `${ward.name}, ${district.name}, ${HCM_CITY_NAME}, Vietnam`;

        const runGeocode = async () => {
            setGeocodingCreate(true);
            try {
                const location = await geocodeAddress(address);
                if (requestId !== geocodeCreateRequestIdRef.current) return;
                if (!location) {
                    enqueueSnackbar("Không tìm thấy tọa độ cho địa chỉ đã chọn", {variant: "warning"});
                    return;
                }
                setFormValues((prev) => ({
                    ...prev,
                    city: HCM_CITY_NAME,
                    district: district.name,
                    ward: ward.name,
                    latitude: String(location.lat),
                    longitude: String(location.lng),
                }));
            } catch (error) {
                enqueueSnackbar(error?.message || "Không lấy được tọa độ", {variant: "error"});
            } finally {
                if (requestId === geocodeCreateRequestIdRef.current) {
                    setGeocodingCreate(false);
                }
            }
        };
        runGeocode();
    }, [createModalOpen, selectedCreateDistrictCode, selectedCreateWardCode, districtOptions, wardOptions, geocodeAddress]);

    const handleCreateSubmit = async () => {
        if (!validateForm()) return;

        setCreateCampusSubmitting(true);
        try {
            const boardingEnum = parseBoardingType(formValues.boardingType);
            const res = await createCampus({
                email: normalizeCampusField(formValues.email) || "",
                address: normalizeCampusField(formValues.address) || "",
                phone: normalizeCampusField(formValues.phone) || "",
                city: HCM_CITY_NAME,
                district: normalizeCampusField(formValues.district) || undefined,
                ward: normalizeCampusField(formValues.ward) || undefined,
                latitude: formValues.latitude !== "" ? formValues.latitude : undefined,
                longitude: formValues.longitude !== "" ? formValues.longitude : undefined,
                boardingType: boardingEnum || undefined,
            });

            const body = res?.data?.body;
            const campusDto = body?.campus ?? body ?? null;
            if (campusDto?.id) {
                const account = campusDto.account ?? body?.account;
                const newCampus = mapCampusFromApi(campusDto, account);
                setCampuses((prev) => [newCampus, ...prev]);

                const emailAddr = (newCampus.email || formValues.email.trim()).trim();
                const displayName =
                    newCampus.name?.trim() ||
                    campusDto.name?.trim() ||
                    (typeof account?.fullName === "string" && account.fullName.trim()) ||
                    emailAddr.split("@")[0] ||
                    "Quản lý cơ sở";

                let welcomeMailOk = false;
                if (emailAddr) {
                    try {
                        await sendWelcomeEmail({name: displayName, email: emailAddr});
                        welcomeMailOk = true;
                    } catch (emailErr) {
                        console.error("Welcome email error:", emailErr);
                        const apiText =
                            typeof emailErr?.text === "string" && emailErr.text.trim()
                                ? emailErr.text.trim()
                                : null;
                        const mailMsg = emailErr?.message?.includes("Thiếu cấu hình EmailJS")
                            ? emailErr.message
                            : apiText
                              ? `Không gửi được email chào mừng: ${apiText}`
                              : "Không gửi được email chào mừng.";
                        enqueueSnackbar(mailMsg, {variant: "warning"});
                    }
                }

                enqueueSnackbar(
                    welcomeMailOk
                        ? "Tạo cơ sở thành công. Đã gửi email chào mừng."
                        : "Tạo cơ sở thành công",
                    {variant: "success"}
                );
                handleCloseCreate();
            } else {
                enqueueSnackbar("Không thể tạo cơ sở", {variant: "error"});
            }
        } catch (error) {
            console.error("Create campus error:", error);
            const apiMsg = error?.response?.data?.message;
            enqueueSnackbar(
                typeof apiMsg === "string" && apiMsg.trim() ? apiMsg.trim() : "Lỗi khi tạo cơ sở",
                {variant: "error"}
            );
        } finally {
            setCreateCampusSubmitting(false);
        }
    };

    const handleOpenView = (campus) => {
        setSelectedCampus(campus);
        setViewModalOpen(true);
    };

    const handleOpenEdit = (campus) => {
        setSelectedCampus(campus);
        setFormValues({
            name: campus.name || "",
            address: campus.address || "",
            city: campus.city || "",
            district: campus.district || "",
            ward: campus.ward || "",
            phone: campus.phone || "",
            email: campus.email || "",
            latitude: campus.latitude ?? "",
            longitude: campus.longitude ?? "",
            boardingType: normalizeBoardingTypeForApi(campus.boardingType ?? campus.boardingTypeLabel),
            description: campus.description || "",
            imagePreview: campus.imageUrl || null,
            status: campus.status === "active",
        });
        setFormErrors({});
        setEditModalOpen(true);
    };

    const getPayload = () => {
        const latitude = formValues.latitude !== "" ? Number(formValues.latitude) : undefined;
        const longitude = formValues.longitude !== "" ? Number(formValues.longitude) : undefined;

        return {
            name: formValues.name?.trim() || "",
            address: formValues.address?.trim() || "",
            city: formValues.city?.trim() || "",
            district: formValues.district?.trim() || "",
            ward: formValues.ward?.trim() || "",
            phone: formValues.phone?.trim() || "",
            email: formValues.email?.trim() || "",
            latitude: latitude !== undefined && Number.isNaN(latitude) ? undefined : latitude,
            longitude: longitude !== undefined && Number.isNaN(longitude) ? undefined : longitude,
            boardingType: parseBoardingType(formValues.boardingType) ?? normalizeBoardingTypeForApi(formValues.boardingType),
            description: formValues.description?.trim() || "",
            imageUrl: formValues.imagePreview ?? selectedCampus?.imageUrl ?? null,
            status: formValues.status ? "active" : "inactive",
        };
    };

    const handleEditSubmit = () => {
        if (!selectedCampus || !validateForm()) return;
        const payload = getPayload();
        setCampuses((prev) =>
            prev.map((c) =>
                c.id === selectedCampus.id ? {...c, ...payload} : c
            )
        );
        enqueueSnackbar("Cập nhật cơ sở thành công", {variant: "success"});
        setFormErrors({});
        setEditModalOpen(false);
    };

    const handleOpenDisableConfirm = (campus) => {
        setSelectedCampus(campus);
        setDisableConfirmOpen(true);
    };

    const handleDisableConfirm = () => {
        if (!selectedCampus) return;
        setCampuses((prev) =>
            prev.map((c) =>
                c.id === selectedCampus.id ? {...c, status: "inactive"} : c
            )
        );
        enqueueSnackbar("Đã vô hiệu hóa cơ sở", {variant: "info"});
        setDisableConfirmOpen(false);
        setSelectedCampus(null);
    };

    const handleExportCampusExcel = async () => {
        if (exporting) return;
        setExporting(true);
        try {
            const res = await exportCampusList();
            const fileBlob = res?.data;
            if (!fileBlob) {
                enqueueSnackbar("Không có dữ liệu để xuất file.", {variant: "warning"});
                return;
            }
            const contentDisposition = res?.headers?.["content-disposition"] || "";
            const fileNameFromHeader = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)?.[1];
            const fileName = decodeURIComponent((fileNameFromHeader || "").replace(/"/g, "")) ||
                `danh-sach-co-so-${new Date().toISOString().slice(0, 10)}.xlsx`;
            const downloadUrl = window.URL.createObjectURL(fileBlob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
            enqueueSnackbar("Xuất file Excel thành công.", {variant: "success"});
        } catch (e) {
            console.error("Export campus list failed", e);
            enqueueSnackbar("Xuất file Excel thất bại.", {variant: "error"});
        } finally {
            setExporting(false);
        }
    };

    return (
        <Box sx={{display: "flex", flexDirection: "column", gap: 3, width: "100%"}}>
            {/* Page Header */}
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
                        flexDirection: {xs: "column", sm: "row"},
                        alignItems: {xs: "stretch", sm: "center"},
                        justifyContent: "space-between",
                        gap: 2,
                    }}
                >
                    <Box>
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 700,
                                letterSpacing: "-0.02em",
                                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            }}
                        >
                            Quản lý Cơ sở
                        </Typography>
                        <Typography variant="body2" sx={{mt: 0.5, opacity: 0.95}}>
                            {isPrimaryBranch
                                ? "Quản lý tất cả cơ sở của trường bạn"
                                : "Xem thông tin cơ sở của bạn"}
                        </Typography>
                    </Box>
                    {isPrimaryBranch && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon/>}
                            onClick={handleOpenCreate}
                            sx={{
                                bgcolor: "rgba(255,255,255,0.95)",
                                color: "#0D64DE",
                                borderRadius: 2,
                                textTransform: "none",
                                fontWeight: 600,
                                px: 3,
                                py: 1.5,
                                boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                                "&:hover": {
                                    bgcolor: "white",
                                    boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                                },
                            }}
                        >
                            Tạo cơ sở
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Search & Filter */}
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                    bgcolor: "#F8FAFC",
                }}
            >
                <CardContent sx={{p: 2.5}}>
                    <Stack
                        direction={{xs: "column", md: "row"}}
                        spacing={2}
                        alignItems={{xs: "stretch", md: "center"}}
                        flexWrap="wrap"
                    >
                        <TextField
                            placeholder="Tìm theo tên hoặc địa chỉ..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            size="small"
                            sx={{
                                flex: 1,
                                minWidth: 200,
                                maxWidth: {md: 320},
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2,
                                    bgcolor: "white",
                                },
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{color: "#64748b"}}/>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <FormControl size="small" sx={{minWidth: 140}}>
                            <InputLabel>Trạng thái</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Trạng thái"
                                onChange={(e) => setStatusFilter(e.target.value)}
                                sx={{borderRadius: 2, bgcolor: "white"}}
                            >
                                <MenuItem value="all">Tất cả</MenuItem>
                                <MenuItem value="active">Hoạt động</MenuItem>
                                <MenuItem value="inactive">Ngưng hoạt động</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{minWidth: 160}}>
                            <InputLabel>Quận / Khu vực</InputLabel>
                            <Select
                                value={districtFilter}
                                label="Quận / Khu vực"
                                onChange={(e) => setDistrictFilter(e.target.value)}
                                sx={{borderRadius: 2, bgcolor: "white"}}
                            >
                                <MenuItem value="all">Tất cả</MenuItem>
                                {districts.map((district) => (
                                    <MenuItem key={district} value={district}>
                                        {district}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button
                            variant="outlined"
                            startIcon={<DownloadIcon/>}
                            onClick={handleExportCampusExcel}
                            disabled={exporting}
                            sx={{
                                textTransform: "none",
                                fontWeight: 600,
                                borderRadius: 2,
                                borderColor: "#cbd5e1",
                                color: "#0f172a",
                                "&:hover": {borderColor: "#0D64DE", bgcolor: "rgba(13, 100, 222, 0.06)"},
                            }}
                        >
                            {exporting ? "Đang xuất..." : "Xuất Excel"}
                        </Button>
                    </Stack>
                </CardContent>
            </Card>

            {/* Campus Table */}
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                    overflow: "hidden",
                    bgcolor: "#F8FAFC",
                }}
            >
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{bgcolor: "#f1f5f9"}}>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Cơ sở
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Địa chỉ
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Số điện thoại
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Chi nhánh chính
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Trạng thái cơ sở
                                </TableCell>
                                <TableCell
                                    sx={{fontWeight: 700, color: "#1e293b", py: 2}}
                                    align="right"
                                >
                                    Thao tác
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedCampuses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{py: 8}}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                gap: 1.5,
                                            }}
                                        >
                                            <ApartmentIcon
                                                sx={{fontSize: 56, color: "#cbd5e1"}}
                                            />
                                            <Typography
                                                variant="h6"
                                                sx={{color: "#64748b", fontWeight: 600}}
                                            >
                                                Chưa có cơ sở nào
                                            </Typography>
                                            <Typography variant="body2" sx={{color: "#94a3b8"}}>
                                                {filteredCampuses.length === 0 && campuses.length > 0
                                                    ? "Không có kết quả phù hợp với tìm kiếm hoặc bộ lọc."
                                                    : isPrimaryBranch
                                                        ? "Tạo cơ sở đầu tiên để bắt đầu."
                                                        : "Chưa có dữ liệu cơ sở."}
                                            </Typography>
                                            {campuses.length === 0 && isPrimaryBranch && (
                                                <Button
                                                    variant="contained"
                                                    startIcon={<AddIcon/>}
                                                    onClick={handleOpenCreate}
                                                    sx={{
                                                        mt: 1,
                                                        borderRadius: 2,
                                                        textTransform: "none",
                                                        fontWeight: 600,
                                                        background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                                                    }}
                                                >
                                                    Tạo cơ sở
                                                </Button>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedCampuses.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        hover
                                        onClick={() => handleOpenView(row)}
                                        sx={{
                                            cursor: "pointer",
                                            "&:hover": {
                                                bgcolor: "rgba(122, 169, 235, 0.06)",
                                            },
                                        }}
                                    >
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={2}>
                                                <Box
                                                    component="img"
                                                    src={row.imageUrl || PLACEHOLDER_IMAGE}
                                                    alt={row.name}
                                                    sx={{
                                                        width: 56,
                                                        height: 42,
                                                        borderRadius: 1.5,
                                                        objectFit: "cover",
                                                        border: "1px solid #e2e8f0",
                                                    }}
                                                />
                                                <Typography
                                                    sx={{fontWeight: 600, color: "#1e293b"}}
                                                >
                                                    {row.name}
                                                </Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{color: "#64748b", maxWidth: 200}}>
                                            <Typography noWrap title={row.address}>
                                                {row.address || "—"}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{color: "#64748b"}}>
                                            {row.phone || "—"}
                                        </TableCell>
                                        <TableCell sx={{color: "#64748b"}}>
                                            {row.isPrimaryBranch ? "Có" : "Không"}
                                        </TableCell>
                                        <TableCell>
                                            <Box
                                                component="span"
                                                sx={{
                                                    px: 1.5,
                                                    py: 0.5,
                                                    borderRadius: 999,
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    bgcolor:
                                                        row.status === "active"
                                                            ? "rgba(34, 197, 94, 0.12)"
                                                            : "rgba(148, 163, 184, 0.2)",
                                                    color:
                                                        row.status === "active"
                                                            ? "#16a34a"
                                                            : "#64748b",
                                                }}
                                            >
                                                {row.status === "active" ? "Hoạt động" : "Ngưng hoạt động"}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack
                                                direction="row"
                                                spacing={0.5}
                                                justifyContent="flex-end"
                                            >
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenView(row);
                                                    }}
                                                    sx={{
                                                        color: "#64748b",
                                                        "&:hover": {color: "#0D64DE", bgcolor: "rgba(13, 100, 222, 0.08)"},
                                                    }}
                                                    title="Xem chi tiết"
                                                >
                                                    <VisibilityIcon fontSize="small"/>
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {filteredCampuses.length > 0 && (
                    <Box sx={{ borderTop: "1px solid #e2e8f0", bgcolor: "#f8fafc", px: 3, py: 1.5, display: "flex", justifyContent: "flex-end" }}>
                        <Pagination
                            count={Math.ceil(filteredCampuses.length / rowsPerPage)}
                            page={page + 1}
                            onChange={(_, p) => setPage(p - 1)}
                            color="primary"
                            shape="rounded"
                        />
                    </Box>
                )}
            </Card>

            {/* Create Campus Modal */}
            <Dialog
                open={createModalOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    if (createCampusSubmitting) return;
                    handleCloseCreate();
                }}
                fullWidth
                maxWidth="md"
                PaperProps={{sx: modalPaperSx}}
                slotProps={{backdrop: {sx: modalBackdropSx}}}
            >
                <Box sx={{px: 3, pt: 3, pb: 0}}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 2,
                        }}
                    >
                        <Box>
                            <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b"}}>
                                Tạo cơ sở
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b", mt: 0.5}}>
                                Điền thông tin cơ sở mới bên dưới.
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={handleCloseCreate}
                            size="small"
                            disabled={createCampusSubmitting}
                            sx={{mt: -0.5, mr: -0.5}}
                            aria-label="Đóng"
                        >
                            <CloseIcon fontSize="small"/>
                        </IconButton>
                    </Box>
                </Box>
                <DialogContent dividers={false} sx={{px: 3, pt: 2, pb: 1}}>
                    <Box sx={{ maxWidth: 840, mx: "auto", width: "100%" }}>
                    <Stack spacing={2.5}>
                        <TextField
                            label="Email"
                            name="email"
                            type="email"
                            fullWidth
                            value={formValues.email}
                            onChange={handleChange}
                            error={!!formErrors.email}
                            helperText={formErrors.email}
                            placeholder="truonghongductphcm@gmail.com"
                            required
                        />
                        <TextField
                            label="Số điện thoại"
                            name="phone"
                            fullWidth
                            value={formValues.phone}
                            onChange={handleChange}
                            error={!!formErrors.phone}
                            helperText={formErrors.phone || "10 chữ số, bắt đầu bằng 0 (ví dụ 0983810915)"}
                            placeholder="0983810915"
                        />
                        <FormControl fullWidth error={!!formErrors.boardingType}>
                            <InputLabel>Loại nội trú</InputLabel>
                            <Select
                                name="boardingType"
                                value={formValues.boardingType}
                                label="Loại nội trú"
                                onChange={handleChange}
                            >
                                {BOARDING_TYPE_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                            {formErrors.boardingType ? <FormHelperText>{formErrors.boardingType}</FormHelperText> : null}
                        </FormControl>
                        <TextField
                            label="Địa chỉ"
                            name="address"
                            fullWidth
                            value={formValues.address}
                            onChange={handleChange}
                            error={!!formErrors.address}
                            helperText={formErrors.address}
                            placeholder="8, Hồ Đắc Di, Tây Thạnh Tân Phú, TP Hồ Chí Minh"
                        />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                label="Thành phố"
                                fullWidth
                                value={HCM_CITY_NAME}
                                disabled
                                error={!!formErrors.city}
                                helperText={formErrors.city || ""}
                            />
                            <FormControl fullWidth error={!!formErrors.district}>
                                <InputLabel id="create-campus-district">Quận / Huyện</InputLabel>
                                <Select
                                    labelId="create-campus-district"
                                    label="Quận / Huyện"
                                    value={selectedCreateDistrictCode}
                                    onChange={(e) => handleCreateDistrictChange(e.target.value)}
                                >
                                    <MenuItem value="">Chọn quận</MenuItem>
                                    {districtOptions.map((d) => (
                                        <MenuItem key={d.code} value={String(d.code)}>
                                            {d.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {formErrors.district ? <FormHelperText>{formErrors.district}</FormHelperText> : null}
                            </FormControl>
                        </Stack>
                        <FormControl fullWidth disabled={!selectedCreateDistrictCode} error={!!formErrors.ward}>
                            <InputLabel id="create-campus-ward">Phường / Xã</InputLabel>
                            <Select
                                labelId="create-campus-ward"
                                label="Phường / Xã"
                                value={selectedCreateWardCode}
                                onChange={(e) => handleCreateWardChange(e.target.value)}
                            >
                                <MenuItem value="">Chọn phường</MenuItem>
                                {wardOptions.map((w) => (
                                    <MenuItem key={w.code} value={String(w.code)}>
                                        {w.name}
                                    </MenuItem>
                                ))}
                            </Select>
                            {formErrors.ward ? <FormHelperText>{formErrors.ward}</FormHelperText> : null}
                        </FormControl>
                        {geocodingCreate && (
                            <Typography variant="caption" color="text.secondary">
                                Đang tự động lấy kinh độ / vĩ độ...
                            </Typography>
                        )}
                        <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(15,23,42,0.04)" }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                                    Địa điểm
                                </Typography>
                                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                                    <TextField
                                        label="Vĩ độ"
                                        name="latitude"
                                        type="number"
                                        fullWidth
                                        size="small"
                                        value={formValues.latitude}
                                        onChange={handleChange}
                                        placeholder="10.8012"
                                        inputProps={{ step: "any" }}
                                    />
                                    <TextField
                                        label="Kinh độ"
                                        name="longitude"
                                        type="number"
                                        fullWidth
                                        size="small"
                                        value={formValues.longitude}
                                        onChange={handleChange}
                                        placeholder="106.7104"
                                        inputProps={{ step: "any" }}
                                    />
                                </Box>
                                <Box sx={{ mt: 2, height: 220, border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                                    <MapContainer center={createMapCenter} zoom={hasCreateLatLng ? 15 : 12} style={{ height: "100%", width: "100%" }}>
                                        <TileLayer
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />
                                        {hasCreateLatLng && (
                                            <>
                                                <RecenterMap center={createMapCenter} zoom={15} />
                                                <CircleMarker center={createMapCenter} radius={8} pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.45 }} />
                                            </>
                                        )}
                                    </MapContainer>
                                </Box>
                            </CardContent>
                        </Card>
                        <Typography variant="body2" sx={{color: "#64748b", fontSize: 13}}>
                            Hệ thống sẽ tạo cơ sở mới và tài khoản quản lý tương ứng với role{" "}
                            <strong>SCHOOL</strong> dựa trên email này.
                        </Typography>
                    </Stack>
                    </Box>
                </DialogContent>
                <DialogActions sx={{px: 3, py: 2.5, borderTop: "1px solid #e2e8f0", gap: 1}}>
                    <Button
                        onClick={handleCloseCreate}
                        variant="text"
                        color="inherit"
                        disabled={createCampusSubmitting}
                        sx={{textTransform: "none", fontWeight: 500}}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleCreateSubmit}
                        variant="contained"
                        disabled={createCampusSubmitting}
                        startIcon={
                            createCampusSubmitting ? (
                                <CircularProgress size={18} color="inherit" aria-label="Đang xử lý"/>
                            ) : undefined
                        }
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            px: 3,
                            background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                        }}
                    >
                        {createCampusSubmitting ? "Đang tạo…" : "Tạo cơ sở"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Details Modal */}
            <Dialog
                open={viewModalOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    setViewModalOpen(false);
                }}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        ...modalPaperSx,
                        display: "flex",
                        flexDirection: "column",
                    },
                }}
                slotProps={{backdrop: {sx: modalBackdropSx}}}
            >
                <DialogTitle sx={{px: 3, pt: 3, pb: 1.5}}>
                    <Box sx={{display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2}}>
                        <Box>
                            <Typography
                                sx={{
                                    fontSize: 22,
                                    fontWeight: 800,
                                    color: "#1e293b",
                                    lineHeight: 1.2,
                                }}
                            >
                                Chi tiết cơ sở
                            </Typography>
                            <Typography
                                sx={{
                                    mt: 0.75,
                                    color: "#64748b",
                                    fontSize: 13,
                                    maxWidth: 520,
                                    lineHeight: 1.4,
                                }}
                            >
                                {selectedCampus
                                    ? selectedCampus.address ||
                                      [selectedCampus.city, selectedCampus.district].filter(Boolean).join(" / ") ||
                                      "—"
                                    : "—"}
                            </Typography>
                        </Box>

                        <Box sx={{display: "flex", alignItems: "center", gap: 1.25}}>
                            {selectedCampus && (
                                <>
                                    <Box
                                        component="span"
                                        sx={{
                                            px: 1.25,
                                            py: 0.75,
                                            borderRadius: 999,
                                            fontSize: 13,
                                            fontWeight: 900,
                                            bgcolor:
                                                selectedCampus.status === "active"
                                                    ? "rgba(22, 163, 74, 0.12)"
                                                    : "rgba(148, 163, 184, 0.25)",
                                            color:
                                                selectedCampus.status === "active" ? "#16a34a" : "#64748b",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 0.75,
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        <Box component="span" sx={{display: "inline-flex", alignItems: "center"}}>
                                            {selectedCampus.status === "active" ? (
                                                <CheckCircleIcon sx={{fontSize: 16, color: "inherit"}}/>
                                            ) : (
                                                <WarningAmberOutlinedIcon sx={{fontSize: 16, color: "inherit"}}/>
                                            )}
                                        </Box>
                                        {selectedCampus.status === "active" ? "Hoạt động" : "Ngưng hoạt động"}
                                    </Box>

                                </>
                            )}

                            <IconButton
                                onClick={() => setViewModalOpen(false)}
                                size="small"
                                sx={{mt: -0.5, mr: -0.5}}
                                aria-label="Đóng"
                            >
                                <CloseIcon fontSize="small"/>
                            </IconButton>
                        </Box>
                    </Box>
                </DialogTitle>

                <DialogContent
                    sx={{
                        px: 3,
                        pt: 1.5,
                        pb: 0,
                        flex: 1,
                        maxHeight: "72vh",
                        overflowY: "auto",
                    }}
                >
                    {selectedCampus && (
                        <Box sx={{display: "flex", flexDirection: "column", gap: 3, pb: 2.5}}>
                            {/* Hero */}
                            <Box
                                sx={{
                                    position: "relative",
                                    height: {xs: 180, sm: 220},
                                    borderRadius: 3,
                                    overflow: "hidden",
                                    boxShadow: "0 18px 36px rgba(2, 6, 23, 0.12)",
                                    border: "1px solid #e2e8f0",
                                }}
                            >
                                <Box
                                    component="img"
                                    src={selectedCampus.imageUrl || PLACEHOLDER_IMAGE}
                                    alt={selectedCampus.name}
                                    sx={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                    }}
                                />
                                <Box
                                    sx={{
                                        position: "absolute",
                                        inset: 0,
                                        background:
                                            "linear-gradient(180deg, rgba(2, 6, 23, 0.10) 0%, rgba(2, 6, 23, 0.58) 100%)",
                                    }}
                                />

                                <Box
                                    sx={{
                                        position: "absolute",
                                        inset: 0,
                                        p: 3,
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    {selectedCampus.isPrimaryBranch && (
                                        <Box
                                            component="span"
                                            sx={{
                                                alignSelf: "flex-start",
                                                px: 1.5,
                                                py: 0.75,
                                                borderRadius: 999,
                                                background: "rgba(255,255,255,0.92)",
                                                color: "#0D64DE",
                                                fontWeight: 900,
                                                fontSize: 12,
                                                boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
                                                border: "1px solid rgba(255,255,255,0.65)",
                                            }}
                                        >
                                            Chi nhánh chính
                                        </Box>
                                    )}

                                    <Typography
                                        sx={{
                                            color: "white",
                                            fontSize: {xs: 20, sm: 24},
                                            fontWeight: 900,
                                            textShadow: "0 18px 40px rgba(0,0,0,0.5)",
                                            lineHeight: 1.15,
                                        }}
                                    >
                                        {selectedCampus.name}
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Info grid */}
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: {xs: "1fr", sm: "1fr 1fr"},
                                    gap: 2,
                                }}
                            >
                                {/** Address */}
                                <Card
                                    sx={{
                                        borderRadius: 3,
                                        border: "1px solid #e2e8f0",
                                        p: 2.25,
                                        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
                                        transition: "box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease",
                                        "&:hover": {
                                            boxShadow: "0 16px 34px rgba(2, 6, 23, 0.10)",
                                            transform: "translateY(-1px)",
                                            borderColor: "#cbd5e1",
                                        },
                                    }}
                                >
                                    <Typography sx={{fontSize: 12, color: "#94a3b8", fontWeight: 700}}>
                                        Địa chỉ
                                    </Typography>
                                    <Typography
                                        sx={{
                                            mt: 0.6,
                                            color: "#1e293b",
                                            fontWeight: 700,
                                            fontSize: 14,
                                            wordBreak: "break-word",
                                        }}
                                    >
                                        {selectedCampus.address || "—"}
                                    </Typography>
                                </Card>

                                {/** City/District */}
                                <Card
                                    sx={{
                                        borderRadius: 3,
                                        border: "1px solid #e2e8f0",
                                        p: 2.25,
                                        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
                                        transition: "box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease",
                                        "&:hover": {
                                            boxShadow: "0 16px 34px rgba(2, 6, 23, 0.10)",
                                            transform: "translateY(-1px)",
                                            borderColor: "#cbd5e1",
                                        },
                                    }}
                                >
                                    <Typography sx={{fontSize: 12, color: "#94a3b8", fontWeight: 700}}>
                                        Thành phố / Quận / Phường
                                    </Typography>
                                    <Typography
                                        sx={{
                                            mt: 0.6,
                                            color: "#1e293b",
                                            fontWeight: 700,
                                            fontSize: 14,
                                            wordBreak: "break-word",
                                        }}
                                    >
                                        {[selectedCampus.city, selectedCampus.district, selectedCampus.ward].filter(Boolean).join(" / ") || "—"}
                                    </Typography>
                                </Card>

                                {/** Boarding type */}
                                <Card
                                    sx={{
                                        borderRadius: 3,
                                        border: "1px solid #e2e8f0",
                                        p: 2.25,
                                        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
                                        transition: "box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease",
                                        "&:hover": {
                                            boxShadow: "0 16px 34px rgba(2, 6, 23, 0.10)",
                                            transform: "translateY(-1px)",
                                            borderColor: "#cbd5e1",
                                        },
                                    }}
                                >
                                    <Typography sx={{fontSize: 12, color: "#94a3b8", fontWeight: 700}}>
                                        Loại nội trú
                                    </Typography>
                                    <Typography
                                        sx={{
                                            mt: 0.6,
                                            color: "#1e293b",
                                            fontWeight: 700,
                                            fontSize: 14,
                                            wordBreak: "break-word",
                                        }}
                                    >
                                        {getBoardingTypeLabelVi(
                                            selectedCampus.boardingType,
                                            selectedCampus.boardingTypeLabel
                                        )}
                                    </Typography>
                                </Card>

                                {/** Coordinates */}
                                <Card
                                    sx={{
                                        borderRadius: 3,
                                        border: "1px solid #e2e8f0",
                                        p: 2.25,
                                        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
                                        transition: "box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease",
                                        "&:hover": {
                                            boxShadow: "0 16px 34px rgba(2, 6, 23, 0.10)",
                                            transform: "translateY(-1px)",
                                            borderColor: "#cbd5e1",
                                        },
                                    }}
                                >
                                    <Typography sx={{fontSize: 12, color: "#94a3b8", fontWeight: 700}}>
                                        Tọa độ
                                    </Typography>
                                    <Box
                                        sx={{
                                            mt: 0.8,
                                            display: "inline-block",
                                            px: 1.25,
                                            py: 0.75,
                                            borderRadius: 2,
                                            background: "#f1f5f9",
                                            border: "1px solid #e2e8f0",
                                        }}
                                    >
                                        <Typography
                                            component="span"
                                            sx={{
                                                color: "#1e293b",
                                                fontWeight: 800,
                                                fontSize: 13,
                                                fontFamily:
                                                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                            }}
                                        >
                                            {[selectedCampus.latitude, selectedCampus.longitude]
                                                .filter((v) => v != null && v !== "")
                                                .join(", ") || "—"}
                                        </Typography>
                                    </Box>
                                </Card>
                            </Box>

                            {/* Contact */}
                            <Card
                                sx={{
                                    borderRadius: 3,
                                    background: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                    p: 2.5,
                                    boxShadow: "none",
                                }}
                            >
                                <Typography sx={{fontSize: 14, fontWeight: 900, color: "#1e293b", mb: 2}}>
                                    Thông tin liên hệ
                                </Typography>

                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: {xs: "1fr", sm: "1fr 1fr"},
                                        gap: 2,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            p: 1.75,
                                            borderRadius: 2,
                                            background: "white",
                                            border: "1px solid #e2e8f0",
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                fontSize: 12,
                                                color: "#94a3b8",
                                                fontWeight: 800,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                            }}
                                        >
                                            <Box component="span" sx={{display: "inline-flex", alignItems: "center"}}>
                                                <PhoneIcon sx={{fontSize: 18, color: "inherit"}}/>
                                            </Box>
                                            Phone
                                        </Typography>
                                        <Typography
                                            sx={{
                                                mt: 0.6,
                                                color: "#1e293b",
                                                fontWeight: 700,
                                                fontSize: 14,
                                                wordBreak: "break-word",
                                            }}
                                        >
                                            {selectedCampus.phone || "—"}
                                        </Typography>
                                    </Box>

                                    <Box
                                        sx={{
                                            p: 1.75,
                                            borderRadius: 2,
                                            background: "white",
                                            border: "1px solid #e2e8f0",
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                fontSize: 12,
                                                color: "#94a3b8",
                                                fontWeight: 800,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                            }}
                                        >
                                            <Box component="span" sx={{display: "inline-flex", alignItems: "center"}}>
                                                <MailOutlineIcon sx={{fontSize: 18, color: "inherit"}}/>
                                            </Box>
                                            Email
                                        </Typography>
                                        <Typography
                                            sx={{
                                                mt: 0.6,
                                                color: "#1e293b",
                                                fontWeight: 700,
                                                fontSize: 14,
                                                wordBreak: "break-word",
                                            }}
                                        >
                                            {selectedCampus.email || "—"}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Card>

                            {/* Date */}
                            <Card
                                sx={{
                                    borderRadius: 3,
                                    border: "1px solid #e2e8f0",
                                    p: 2.25,
                                    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
                                    transition: "box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease",
                                    "&:hover": {
                                        boxShadow: "0 16px 34px rgba(2, 6, 23, 0.10)",
                                        transform: "translateY(-1px)",
                                        borderColor: "#cbd5e1",
                                    },
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: 12,
                                        color: "#94a3b8",
                                        fontWeight: 800,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                    }}
                                >
                                    <Box component="span" sx={{display: "inline-flex", alignItems: "center"}}>
                                        <CalendarTodayIcon sx={{fontSize: 18, color: "inherit"}}/>
                                    </Box>
                                    Ngày đăng ký tài khoản
                                </Typography>
                                <Typography
                                    sx={{
                                        mt: 0.7,
                                        color: "#1e293b",
                                        fontWeight: 800,
                                        fontSize: 15,
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {formatDate(selectedCampus.accountRegisterDate)}
                                </Typography>
                            </Card>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions
                    sx={{
                        position: "sticky",
                        bottom: 0,
                        zIndex: 2,
                        bgcolor: "white",
                        borderTop: "1px solid #e2e8f0",
                        px: 3,
                        py: 2.25,
                        gap: 2,
                        justifyContent: "flex-end",
                    }}
                >
                    <Button
                        onClick={() => setViewModalOpen(false)}
                        variant="text"
                        color="inherit"
                        sx={{textTransform: "none", fontWeight: 700, px: 1.25}}
                    >
                        Đóng
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Campus Modal */}
            <Dialog
                open={editModalOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    setFormErrors({});
                    setEditModalOpen(false);
                }}
                fullWidth
                maxWidth="sm"
                PaperProps={{sx: modalPaperSx}}
                slotProps={{backdrop: {sx: modalBackdropSx}}}
            >
                <Box sx={{px: 3, pt: 3, pb: 0}}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 2,
                        }}
                    >
                        <Box>
                            <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b"}}>
                                Chỉnh sửa cơ sở
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b", mt: 0.5}}>
                                Cập nhật thông tin cơ sở.
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={() => {
                                setFormErrors({});
                                setEditModalOpen(false);
                            }}
                            size="small"
                            sx={{mt: -0.5, mr: -0.5}}
                            aria-label="Đóng"
                        >
                            <CloseIcon fontSize="small"/>
                        </IconButton>
                    </Box>
                </Box>
                <DialogContent dividers={false} sx={{px: 3, pt: 2, pb: 1}}>
                    <Stack spacing={2.5}>
                        <TextField
                            label="Tên cơ sở"
                            name="name"
                            fullWidth
                            value={formValues.name}
                            onChange={handleChange}
                            error={!!formErrors.name}
                            helperText={formErrors.name}
                        />
                        <TextField
                            label="Địa chỉ"
                            name="address"
                            fullWidth
                            value={formValues.address}
                            onChange={handleChange}
                            error={!!formErrors.address}
                            helperText={formErrors.address}
                        />
                        <TextField
                            label="Quận / Thành phố"
                            name="city"
                            fullWidth
                            value={formValues.city}
                            onChange={handleChange}
                            error={!!(formErrors.city || formErrors.district)}
                            helperText={formErrors.city || formErrors.district || ""}
                        />
                        <TextField
                            label="Phường / Xã"
                            name="ward"
                            fullWidth
                            value={formValues.ward}
                            onChange={handleChange}
                            error={!!formErrors.ward}
                            helperText={formErrors.ward}
                        />
                        <TextField
                            label="Số điện thoại"
                            name="phone"
                            fullWidth
                            value={formValues.phone}
                            onChange={handleChange}
                            error={!!formErrors.phone}
                            helperText={formErrors.phone || "10 chữ số, bắt đầu bằng 0"}
                        />
                        <TextField
                            label="Email"
                            name="email"
                            type="email"
                            fullWidth
                            value={formValues.email}
                            onChange={handleChange}
                            error={!!formErrors.email}
                            helperText={formErrors.email}
                        />
                        <TextField
                            label="Mô tả"
                            name="description"
                            fullWidth
                            multiline
                            rows={3}
                            value={formValues.description}
                            onChange={handleChange}
                        />
                        <Box>
                            <Typography variant="body2" sx={{mb: 1, color: "#64748b"}}>
                                Ảnh cơ sở
                            </Typography>
                            <CloudinaryUpload
                                inputId="school-campus-edit-image"
                                accept="image/*"
                                multiple={false}
                                mediaImageRules={mediaImageRules}
                                mediaImageRulesLoading={mediaImageRulesLoading}
                                onSuccess={handleCampusImageUploaded}
                                onError={(msg) => enqueueSnackbar(msg, {variant: "error"})}
                            >
                                {({inputId, loading}) => (
                                    <Button
                                        component="label"
                                        htmlFor={inputId}
                                        variant="outlined"
                                        startIcon={<CloudUploadIcon/>}
                                        disabled={loading}
                                        sx={{borderRadius: 2, textTransform: "none"}}
                                    >
                                        {loading ? "Đang tải..." : "Tải ảnh lên (Cloudinary)"}
                                    </Button>
                                )}
                            </CloudinaryUpload>
                            {(formValues.imagePreview || selectedCampus?.imageUrl) && (
                                <Box
                                    component="img"
                                    src={formValues.imagePreview || selectedCampus?.imageUrl || PLACEHOLDER_IMAGE}
                                    alt="Preview"
                                    sx={{
                                        mt: 1,
                                        maxHeight: 120,
                                        borderRadius: 2,
                                        border: "1px solid #e2e8f0",
                                    }}
                                />
                            )}
                        </Box>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <Typography sx={{fontWeight: 500}}>Trạng thái</Typography>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography
                                    variant="body2"
                                    sx={{color: formValues.status ? "#16a34a" : "#94a3b8"}}
                                >
                                    {formValues.status ? "Hoạt động" : "Ngưng hoạt động"}
                                </Typography>
                                <Switch
                                    checked={formValues.status}
                                    onChange={handleStatusToggle}
                                    sx={{
                                        "& .MuiSwitch-switchBase.Mui-checked": {color: "#0D64DE"},
                                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                            backgroundColor: "#0D64DE",
                                        },
                                    }}
                                />
                            </Stack>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{px: 3, py: 2.5, borderTop: "1px solid #e2e8f0", gap: 1}}>
                    <Button
                        onClick={() => {
                            setFormErrors({});
                            setEditModalOpen(false);
                        }}
                        variant="text"
                        color="inherit"
                        sx={{textTransform: "none", fontWeight: 500}}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleEditSubmit}
                        variant="contained"
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            px: 3,
                            background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                        }}
                    >
                        Lưu
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Disable confirmation dialog */}
            <Dialog
                open={disableConfirmOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    setDisableConfirmOpen(false);
                }}
                PaperProps={{sx: {borderRadius: 3, p: 1}}}
            >
                <DialogTitle sx={{display: "flex", alignItems: "center", gap: 1}}>
                    <PersonOffIcon color="error"/> Vô hiệu hóa cơ sở
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Bạn có chắc muốn <ConfirmHighlight>vô hiệu hóa</ConfirmHighlight> cơ sở{" "}
                        <ConfirmHighlight>{selectedCampus?.name}</ConfirmHighlight>? Cơ sở này sẽ được đánh dấu là{" "}
                        <ConfirmHighlight>ngưng hoạt động</ConfirmHighlight> và có thể bị ẩn khỏi phụ huynh.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{px: 3, pb: 2}}>
                    <Button onClick={() => setDisableConfirmOpen(false)} color="inherit">
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDisableConfirm}
                        startIcon={<BlockIcon/>}
                    >
                        Vô hiệu hóa
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
