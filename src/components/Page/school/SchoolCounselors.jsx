import React, {useState, useMemo, useEffect, useCallback} from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
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
    Avatar,
    CircularProgress,
    LinearProgress,
    Tooltip,
} from "@mui/material";
import Pagination from "@mui/material/Pagination";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import CloseIcon from "@mui/icons-material/Close";
import LockIcon from "@mui/icons-material/Lock";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {enqueueSnackbar} from "notistack";
import {useNavigate} from "react-router-dom";
import {fetchCounsellors, createCounsellor, exportCounsellors} from "../../../services/CounsellorService.jsx";
import {sendWelcomeEmail} from "../../../services/emailService.jsx";
import ImageUpload from "../../ui/ImageUpload.jsx";

const InfoItem = ({ label, value }) => (
    <Box>
        <Typography variant="caption" sx={{color: "#94a3b8"}}>
            {label}
        </Typography>
        <Typography variant="body1" sx={{fontWeight: 600, color: "#1e293b"}}>
            {value}
        </Typography>
    </Box>
);

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

const _initialMockCounsellors = [
    {
        id: 1,
        fullName: "Nguyễn Thị Mai",
        email: "mai.nguyen@school.edu.vn",
        phone: "0901234567",
        specialty: "Tư vấn tuyển sinh THPT",
        shortBio: "5 năm kinh nghiệm tư vấn tuyển sinh.",
        avatar: null,
        status: "active",
    },
    {
        id: 2,
        fullName: "Trần Văn Minh",
        email: "minh.tran@school.edu.vn",
        phone: "0912345678",
        specialty: "Tư vấn chương trình quốc tế",
        shortBio: "Chuyên gia tư vấn chương trình song ngữ.",
        avatar: null,
        status: "active",
    },
    {
        id: 3,
        fullName: "Lê Thị Hương",
        email: "huong.le@school.edu.vn",
        phone: "0923456789",
        specialty: "Hỗ trợ phụ huynh",
        shortBio: "Tư vấn định hướng và hỗ trợ hồ sơ.",
        avatar: null,
        status: "inactive",
        campusName: "Cơ sở 1 - Quận 1",
        employeeCode: "MOCK-EMP-003",
        registerDate: "2024-03-10",
    },
];

const emptyForm = {
    email: "",
    avatar: "",
    status: true,
};

const mapCounsellorFromApi = (dto) => ({
    id: dto.id,
    fullName: dto.name || "",
    email: dto.account?.email || "",
    phone: "",
    specialty: "",
    shortBio: "",
    avatar: dto.avatar || null,
    firstLogin: dto.account?.firstLogin,
    status: dto.account?.status === "ACCOUNT_ACTIVE" ? "active" : "inactive",
    campusName: dto.campusName,
    employeeCode: dto.employeeCode,
    registerDate: dto.account?.registerDate || "",
});

const formatDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return d;
    return date.toLocaleDateString("vi-VN");
};

/** Khớp thông báo `CounsellorValidation` (BE) → tiếng Việt cho snackbar. */
function translateCreateCounsellorBackendMessage(raw) {
    if (raw == null) return null;
    const msg = String(raw).trim();
    if (!msg) return null;
    const exact = {
        "Email is required": "Email là bắt buộc",
        "Email exceeds 100 characters": "Email vượt quá 100 ký tự",
        "Email is invalid": "Email không hợp lệ",
        "This email is already registered in the system.": "Email này đã được đăng ký trong hệ thống.",
        "This email is already assigned to another counsellor.": "Email này đã được gán cho tư vấn viên khác.",
        "This campus has not been allocated a quota for Counsellors.": "Cơ sở này chưa được phân bổ hạn ngạch cho tư vấn viên.",
        "Feature Locked: This campus has not subscribed to a service package or has not been allocated a counsellor quota.":
            "Tính năng bị khóa: Cơ sở này chưa đăng ký gói dịch vụ hoặc chưa được cấp hạn ngạch tư vấn viên.",
        "Current service package does not support counsellor creation. Please upgrade your package.":
            "Gói dịch vụ hiện tại chưa hỗ trợ tạo tư vấn viên. Vui lòng nâng cấp gói.",
    };
    if (exact[msg]) return exact[msg];
    const quotaReached = msg.match(/^The counsellor quota for this campus has been reached \((\d+)\)\.?$/i);
    if (quotaReached) {
        return `Đã đạt hạn ngạch tư vấn viên của cơ sở này (${quotaReached[1]}).`;
    }
    return msg;
}

function messageFromApiPayload(data) {
    if (data == null || typeof data !== "object") return null;
    const m = data.message;
    if (typeof m === "string" && m.trim()) return m.trim();
    const b = data.body;
    if (typeof b === "string" && b.trim()) return b.trim();
    return null;
}

function normalizeFeatureLockDisplayMessage(message) {
    if (typeof message !== "string") return "";
    const normalized = message.trim();
    if (!normalized) return "";
    if (normalized === "Cơ sở chưa đăng ký gói dịch vụ này. Vui lòng liên hệ để kích hoạt.") {
        return "Cơ sở chưa đăng ký gói dịch vụ này. Vui lòng nâng cấp để kích hoạt.";
    }
    return normalized;
}

export default function SchoolCounselors() {
    const navigate = useNavigate();
    const [counselors, setCounselors] = useState([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
    const [selectedCounselor, setSelectedCounselor] = useState(null);
    const [formValues, setFormValues] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState({});
    const [page, setPage] = useState(0);
    const rowsPerPage = 10;
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [_loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [createSubmitting, setCreateSubmitting] = useState(false);
    const [canCreate, setCanCreate] = useState(true);
    const [displayMessage, setDisplayMessage] = useState("");
    const [currentUsage, setCurrentUsage] = useState(0);
    const [maxQuota, setMaxQuota] = useState(0);
    const [accessStatus, setAccessStatus] = useState("");

    const loadCounsellors = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchCounsellors(page, rowsPerPage);
            const body = res?.data?.body;
            const counsellorsPayload = body?.counsellors;
            const list = counsellorsPayload?.items;
            if (res && res.status === 200 && Array.isArray(list)) {
                setCounselors(list.map(mapCounsellorFromApi));
                setTotalItems(counsellorsPayload?.totalItems ?? 0);
                setTotalPages(counsellorsPayload?.totalPages ?? 0);
                setCanCreate(Boolean(body?.canCreate));
                setDisplayMessage(normalizeFeatureLockDisplayMessage(body?.displayMessage));
                setCurrentUsage(Number(body?.currentUsage ?? 0));
                setMaxQuota(Number(body?.maxQuota ?? 0));
                setAccessStatus(typeof body?.accessStatus === "string" ? body.accessStatus : "");
            } else {
                setCounselors([]);
                setTotalItems(0);
                setTotalPages(0);
                setCanCreate(true);
                setDisplayMessage("");
                setCurrentUsage(0);
                setMaxQuota(0);
                setAccessStatus("");
            }
        } catch (error) {
            console.error("Fetch counsellors error:", error);
            enqueueSnackbar("Không tải được danh sách tư vấn viên", {variant: "error"});
            setCounselors([]);
            setTotalItems(0);
            setTotalPages(0);
            setCanCreate(true);
            setDisplayMessage("");
            setCurrentUsage(0);
            setMaxQuota(0);
            setAccessStatus("");
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        loadCounsellors();
    }, [loadCounsellors]);

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormValues((prev) => ({...prev, [name]: value}));
    };

    const handleStatusToggle = (e) => {
        setFormValues((prev) => ({...prev, status: e.target.checked}));
    };

    const filteredCounselors = useMemo(() => {
        let list = counselors;
        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (c) =>
                    c.fullName?.toLowerCase().includes(q) ||
                    c.email?.toLowerCase().includes(q)
            );
        }
        if (statusFilter === "active") {
            list = list.filter((c) => c.status === "active");
        } else if (statusFilter === "inactive") {
            list = list.filter((c) => c.status === "inactive");
        }
        return list;
    }, [counselors, search, statusFilter]);

    const validateCreate = () => {
        const errors = {};
        if (!formValues.email?.trim()) errors.email = "Email là bắt buộc";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleOpenCreate = () => {
        if (!canCreate) return;
        setFormValues(emptyForm);
        setFormErrors({});
        setCreateSubmitting(false);
        setCreateModalOpen(true);
    };

    const handleCloseCreate = () => {
        if (createSubmitting) return;
        setCreateModalOpen(false);
        setCreateSubmitting(false);
    };

    const handleCreateSubmit = async () => {
        if (!validateCreate()) return;
        setCreateSubmitting(true);
        try {
            const res = await createCounsellor({
                email: formValues.email.trim(),
                avatar: formValues.avatar?.trim() || "",
            });
            const dto = res?.data?.body;
            const ok = res && res.status >= 200 && res.status < 300;
            if (ok) {
                await loadCounsellors();

                const mapped = dto ? mapCounsellorFromApi(dto) : null;
                const emailAddr = mapped?.email || formValues.email.trim();
                const displayName =
                    (mapped?.fullName && mapped.fullName.trim()) ||
                    emailAddr.split("@")[0] ||
                    "Tư vấn viên";

                let welcomeMailOk = false;
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

                enqueueSnackbar(
                    welcomeMailOk
                        ? "Tạo tài khoản tư vấn viên thành công. Đã gửi email chào mừng."
                        : "Tạo tài khoản tư vấn viên thành công",
                    {variant: "success"}
                );
                setCreateModalOpen(false);
            } else {
                const raw = messageFromApiPayload(res?.data);
                enqueueSnackbar(
                    translateCreateCounsellorBackendMessage(raw) || "Không thể tạo tư vấn viên",
                    {variant: "error"}
                );
            }
        } catch (error) {
            console.error("Create counsellor error:", error);
            const raw =
                messageFromApiPayload(error?.response?.data) ||
                (typeof error?.message === "string" ? error.message : null);
            enqueueSnackbar(
                translateCreateCounsellorBackendMessage(raw) || "Lỗi khi tạo tư vấn viên",
                {variant: "error"}
            );
        } finally {
            setCreateSubmitting(false);
        }
    };

    const handleOpenView = (counselor) => {
        setSelectedCounselor(counselor);
        setViewModalOpen(true);
    };

    const handleOpenEdit = (counselor) => {
        setSelectedCounselor(counselor);
        setFormValues({
            fullName: counselor.fullName || "",
            email: counselor.email || "",
            phone: counselor.phone || "",
            password: "",
            specialty: counselor.specialty || "",
            shortBio: counselor.shortBio || "",
            avatar: counselor.avatar || "",
            status: counselor.status === "active",
        });
        setFormErrors({});
        setEditModalOpen(true);
    };

    const handleEditSubmit = () => {
        if (!selectedCounselor) return;
        const errors = {};
        if (!formValues.fullName?.trim()) errors.fullName = "Họ tên là bắt buộc";
        if (!formValues.email?.trim()) errors.email = "Email là bắt buộc";
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setCounselors((prev) =>
            prev.map((c) =>
                c.id === selectedCounselor.id
                    ? {
                        ...c,
                        fullName: formValues.fullName.trim(),
                        email: formValues.email.trim(),
                        phone: formValues.phone?.trim() || "",
                        specialty: formValues.specialty?.trim() || "",
                        shortBio: formValues.shortBio?.trim() || "",
                        avatar: formValues.avatar?.trim() || null,
                        status: formValues.status ? "active" : "inactive",
                    }
                    : c
            )
        );
        enqueueSnackbar("Cập nhật tư vấn viên thành công", {variant: "success"});
        setEditModalOpen(false);
    };

    const handleOpenDisableConfirm = (counselor) => {
        setSelectedCounselor(counselor);
        setDisableConfirmOpen(true);
    };

    const handleDisableConfirm = () => {
        if (!selectedCounselor) return;
        setCounselors((prev) =>
            prev.map((c) =>
                c.id === selectedCounselor.id ? {...c, status: "inactive"} : c
            )
        );
        enqueueSnackbar("Đã vô hiệu hóa tài khoản tư vấn viên", {variant: "info"});
        setDisableConfirmOpen(false);
        setSelectedCounselor(null);
    };

    const getInitials = (name) => {
        if (!name?.trim()) return "?";
        return name
            .trim()
            .split(/\s+/)
            .map((s) => s[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
    };

    const handleExportCounsellors = async () => {
        if (exporting) return;
        setExporting(true);
        try {
            const res = await exportCounsellors();
            const fileBlob = res?.data;
            if (!fileBlob) {
                enqueueSnackbar("Không có dữ liệu để xuất file.", {variant: "warning"});
                return;
            }

            const contentDisposition = res?.headers?.["content-disposition"] || "";
            const fileNameFromHeader = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i)?.[1];
            const fileName = decodeURIComponent((fileNameFromHeader || "").replace(/"/g, "")) ||
                `danh-sach-tu-van-vien-${new Date().toISOString().slice(0, 10)}.xlsx`;

            const downloadUrl = window.URL.createObjectURL(fileBlob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
            enqueueSnackbar("Xuất file thành công.", {variant: "success"});
        } catch (error) {
            console.error("Export counsellors error:", error);
            enqueueSnackbar("Xuất file thất bại.", {variant: "error"});
        } finally {
            setExporting(false);
        }
    };

    const isFeatureLocked = accessStatus === "FEATURE_LOCKED_NO_PACKAGE";
    const isUsageNoPackage = maxQuota === 0;
    const usagePercent = useMemo(() => {
        if (isUsageNoPackage) return 100;
        const raw = (currentUsage / maxQuota) * 100;
        return Math.max(0, Math.min(100, raw));
    }, [currentUsage, isUsageNoPackage, maxQuota]);
    const usageBarColor = useMemo(() => {
        if (isUsageNoPackage) return "#94a3b8";
        if (usagePercent >= 100) return "#ef4444";
        if (usagePercent >= 80) return "#f59e0b";
        return "#22c55e";
    }, [isUsageNoPackage, usagePercent]);
    const showUsageWarning = !isUsageNoPackage && usagePercent >= 100;
    const createTooltipMessage = displayMessage || "Tính năng tạo tài khoản hiện chưa khả dụng.";

    return (
        <Box sx={{display: "flex", flexDirection: "column", gap: 3, width: "100%"}}>
            {/* Header with gradient */}
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
                            Quản lý Tư vấn viên
                        </Typography>
                        <Typography variant="body2" sx={{mt: 0.5, opacity: 0.95}}>
                            Quản lý tài khoản tư vấn viên của trường
                        </Typography>
                    </Box>
                    <Tooltip
                        title={!canCreate ? createTooltipMessage : ""}
                        arrow
                        disableHoverListener={canCreate}
                        enterDelay={300}
                        slotProps={{
                            tooltip: {
                                sx: {
                                    bgcolor: "rgba(15, 23, 42, 0.95)",
                                    color: "#fff",
                                    borderRadius: 1.5,
                                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.25)",
                                    fontSize: 12,
                                },
                            },
                            arrow: {
                                sx: {
                                    color: "rgba(15, 23, 42, 0.95)",
                                },
                            },
                        }}
                    >
                        <Box component="span">
                            <Button
                                variant="contained"
                                startIcon={<AddIcon/>}
                                onClick={handleOpenCreate}
                                disabled={!canCreate}
                                sx={{
                                    bgcolor: canCreate ? "#0D64DE" : "#cbd5e1",
                                    color: canCreate ? "#ffffff" : "#475569",
                                    borderRadius: 2,
                                    textTransform: "none",
                                    fontWeight: 600,
                                    px: 3,
                                    py: 1.5,
                                    opacity: canCreate ? 1 : 0.6,
                                    cursor: canCreate ? "pointer" : "not-allowed",
                                    transition: "all 0.2s ease",
                                    boxShadow: canCreate ? "0 4px 14px rgba(0,0,0,0.15)" : "none",
                                    "&:hover": canCreate
                                        ? {
                                            bgcolor: "#0b5ad1",
                                            boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                                        }
                                        : {},
                                }}
                            >
                                Tạo tài khoản tư vấn viên
                            </Button>
                        </Box>
                    </Tooltip>
                </Box>
            </Box>

            {/* Search & Filter */}
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                    opacity: canCreate ? 1 : 0.55,
                    pointerEvents: canCreate ? "auto" : "none",
                    transition: "opacity 0.2s ease",
                }}
            >
                <CardContent sx={{p: 2.5}}>
                    <Stack
                        direction={{xs: "column", md: "row"}}
                        spacing={2}
                        alignItems={{xs: "stretch", md: "center"}}
                    >
                        <TextField
                            placeholder="Tìm theo tên hoặc email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            size="small"
                            disabled={!canCreate}
                            sx={{
                                flex: 1,
                                maxWidth: {md: 360},
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2,
                                    bgcolor: "#f8fafc",
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
                        <FormControl size="small" sx={{minWidth: 160}}>
                            <InputLabel>Trạng thái</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Trạng thái"
                                onChange={(e) => setStatusFilter(e.target.value)}
                                disabled={!canCreate}
                                sx={{borderRadius: 2, bgcolor: "#f8fafc"}}
                            >
                                <MenuItem value="all">Tất cả</MenuItem>
                                <MenuItem value="active">Hoạt động</MenuItem>
                                <MenuItem value="inactive">Ngưng hoạt động</MenuItem>
                            </Select>
                        </FormControl>
                        <IconButton
                            onClick={handleExportCounsellors}
                            disabled={exporting || !canCreate}
                            title={exporting ? "Đang xuất..." : "Xuất danh sách tư vấn viên"}
                            sx={{
                                border: "1px solid #cbd5e1",
                                color: "#64748b",
                                bgcolor: "#ffffff",
                                borderRadius: 2,
                                "&:hover": {
                                    borderColor: "#94a3b8",
                                    bgcolor: "#f8fafc",
                                },
                            }}
                        >
                            <DownloadIcon fontSize="small"/>
                        </IconButton>
                    </Stack>
                </CardContent>
            </Card>

            {/* Table Card */}
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                    overflow: "hidden",
                    position: "relative",
                }}
            >
                <Box sx={{px: 3, pt: 2.5, pb: 1.5, borderBottom: "1px solid #e2e8f0", bgcolor: "#fcfdff"}}>
                    <Stack spacing={1}>
                        <Typography variant="body2" sx={{color: "#334155", fontWeight: 600, display: "flex", alignItems: "center", gap: 0.75}}>
                            {isUsageNoPackage ? "Chưa có gói dịch vụ" : `Usage: ${currentUsage}/${maxQuota} tài khoản`}
                            {showUsageWarning && <WarningAmberIcon sx={{fontSize: 18, color: "#f59e0b"}}/>}
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={usagePercent}
                            sx={{
                                height: 8,
                                borderRadius: 999,
                                bgcolor: "#e2e8f0",
                                "& .MuiLinearProgress-bar": {
                                    borderRadius: 999,
                                    backgroundColor: usageBarColor,
                                    transition: "transform 0.4s ease",
                                },
                            }}
                        />
                    </Stack>
                </Box>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{bgcolor: "#f8fafc"}}>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Tư vấn viên
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Email
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Cơ sở
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Trạng thái
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
                            {filteredCounselors.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{py: 8}}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                gap: 1.5,
                                            }}
                                        >
                                            <SupportAgentIcon
                                                sx={{fontSize: 56, color: "#cbd5e1"}}
                                            />
                                            <Typography
                                                variant="h6"
                                                sx={{color: "#64748b", fontWeight: 600}}
                                            >
                                                Chưa có tư vấn viên nào
                                            </Typography>
                                            <Typography variant="body2" sx={{color: "#94a3b8"}}>
                                                {filteredCounselors.length === 0 && counselors.length > 0
                                                    ? "Không có kết quả phù hợp với tìm kiếm hoặc bộ lọc."
                                                    : "Tạo tài khoản tư vấn viên đầu tiên để bắt đầu."}
                                            </Typography>
                                            {counselors.length === 0 && (
                                                <Tooltip
                                                    title={!canCreate ? createTooltipMessage : ""}
                                                    arrow
                                                    disableHoverListener={canCreate}
                                                    enterDelay={300}
                                                >
                                                    <Box component="span">
                                                        <Button
                                                            variant="contained"
                                                            startIcon={<AddIcon/>}
                                                            onClick={handleOpenCreate}
                                                            disabled={!canCreate}
                                                            sx={{
                                                                mt: 1,
                                                                borderRadius: 2,
                                                                textTransform: "none",
                                                                fontWeight: 600,
                                                                background: canCreate
                                                                    ? "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)"
                                                                    : "#cbd5e1",
                                                                opacity: canCreate ? 1 : 0.6,
                                                                transition: "all 0.2s ease",
                                                                cursor: canCreate ? "pointer" : "not-allowed",
                                                                "&:hover": canCreate
                                                                    ? {
                                                                        background:
                                                                            "linear-gradient(135deg, #6b9be6 0%, #0b5ad1 100%)",
                                                                    }
                                                                    : {},
                                                            }}
                                                        >
                                                            Tạo tài khoản tư vấn viên
                                                        </Button>
                                                    </Box>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCounselors.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        hover
                                        onClick={() => handleOpenView(row)}
                                        sx={{
                                            cursor: "pointer",
                                            "&:hover": {
                                                bgcolor: "rgba(122, 169, 235, 0.04)",
                                            },
                                        }}
                                    >
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={2}>
                                                <Avatar
                                                    src={row.avatar || undefined}
                                                    alt={row.fullName}
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        bgcolor: "#7AA9EB",
                                                        fontSize: "0.875rem",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {getInitials(row.fullName)}
                                                </Avatar>
                                                <Typography
                                                    sx={{fontWeight: 600, color: "#1e293b"}}
                                                >
                                                    {row.fullName}
                                                </Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{color: "#64748b"}}>
                                            {row.email}
                                        </TableCell>
                                        <TableCell sx={{color: "#64748b"}}>
                                            {row.campusName || "—"}
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
                                        <TableCell
                                            align="right"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Stack
                                                direction="row"
                                                spacing={0.5}
                                                justifyContent="flex-end"
                                            >
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenView(row)}
                                                    sx={{
                                                        color: "#64748b",
                                                        "&:hover": {color: "#0D64DE", bgcolor: "rgba(13, 100, 222, 0.08)"},
                                                    }}
                                                    title="Xem"
                                                >
                                                    <VisibilityIcon fontSize="small"/>
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenEdit(row)}
                                                    sx={{
                                                        color: "#64748b",
                                                        "&:hover": {color: "#0D64DE", bgcolor: "rgba(13, 100, 222, 0.08)"},
                                                    }}
                                                    title="Sửa"
                                                >
                                                    <EditIcon fontSize="small"/>
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenDisableConfirm(row)}
                                                    disabled={row.status === "inactive"}
                                                    sx={{
                                                        color: "#64748b",
                                                        "&:hover": {color: "#dc2626", bgcolor: "rgba(220, 38, 38, 0.08)"},
                                                    }}
                                                    title="Vô hiệu hóa"
                                                >
                                                    <BlockIcon fontSize="small"/>
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {totalItems > 0 && (
                    <Box sx={{ borderTop: "1px solid #e2e8f0", px: 3, py: 1.5, display: "flex", justifyContent: "flex-end", bgcolor: "#f8fafc" }}>
                        <Pagination
                            count={Math.max(1, totalPages || Math.ceil(totalItems / rowsPerPage) || 1)}
                            page={page + 1}
                            onChange={(_, p) => setPage(p - 1)}
                            color="primary"
                            shape="rounded"
                        />
                    </Box>
                )}
                {isFeatureLocked && (
                    <Box
                        sx={{
                            position: "absolute",
                            inset: 0,
                            zIndex: 10,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            pt: {xs: 2, md: 0},
                            background:
                                "linear-gradient(to bottom, rgba(255,255,255,0.4), rgba(255,255,255,0.58))",
                            backdropFilter: "blur(6px)",
                            borderRadius: 3,
                            animation: "lockOverlayFadeIn 0.2s ease",
                            pointerEvents: "auto",
                            "@keyframes lockOverlayFadeIn": {
                                from: {opacity: 0},
                                to: {opacity: 1},
                            },
                        }}
                    >
                        <Card
                            elevation={0}
                            role="dialog"
                            aria-modal="true"
                            sx={{
                                width: "min(92%, 520px)",
                                borderRadius: "20px",
                                border: "1px solid rgba(255,255,255,0.55)",
                                boxShadow:
                                    "0 10px 40px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255,255,255,0.55)",
                                p: 4,
                                textAlign: "center",
                                background: "rgba(255,255,255,0.55)",
                                backdropFilter: "blur(12px)",
                                WebkitBackdropFilter: "blur(12px)",
                                transform: "translateY(-50px)",
                                animation: "lockCardScaleIn 0.2s ease",
                                transformOrigin: "center",
                                position: "relative",
                                overflow: "hidden",
                                "@keyframes lockCardScaleIn": {
                                    from: {opacity: 0, transform: "translateY(-50px) scale(0.96)"},
                                    to: {opacity: 1, transform: "translateY(-50px) scale(1)"},
                                },
                                "&::before": {
                                    content: '""',
                                    position: "absolute",
                                    inset: 0,
                                    pointerEvents: "none",
                                    background:
                                        "linear-gradient(120deg, rgba(255,255,255,0.5), rgba(255,255,255,0.1))",
                                },
                            }}
                        >
                            <Stack spacing={2} alignItems="center">
                                <Box
                                    sx={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: "50%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
                                        boxShadow: "0 0 20px rgba(37, 99, 235, 0.3)",
                                    }}
                                >
                                    <LockIcon sx={{fontSize: 30, color: "#2563eb"}}/>
                                </Box>
                                <Typography variant="h6" sx={{fontWeight: 700, color: "#0f172a"}}>
                                    Tính năng chưa khả dụng
                                </Typography>
                                <Typography variant="body2" sx={{color: "#64748b", maxWidth: 420}}>
                                    {displayMessage || "Bạn chưa đăng ký gói dịch vụ cho tính năng này."}
                                </Typography>
                                <Stack direction={{xs: "column", sm: "row"}} spacing={1.5} sx={{pt: 1}}>
                                    <Button
                                        variant="contained"
                                        onClick={() => navigate("/package-fees")}
                                        autoFocus
                                        sx={{
                                            textTransform: "none",
                                            fontWeight: 600,
                                            borderRadius: 2,
                                            px: 2.75,
                                            py: 1,
                                            background: "linear-gradient(135deg, #0D64DE, #2563eb)",
                                            transition: "all 0.2s ease",
                                            boxShadow: "0 8px 18px rgba(37, 99, 235, 0.25)",
                                            "&:hover": {
                                                transform: "translateY(-1px) scale(1.01)",
                                                boxShadow: "0 10px 22px rgba(37, 99, 235, 0.32)",
                                                background: "linear-gradient(135deg, #0b5ad1, #1d4ed8)",
                                            },
                                        }}
                                    >
                                        Nâng cấp gói
                                    </Button>
                                </Stack>
                            </Stack>
                        </Card>
                    </Box>
                )}
            </Card>

            {/* Create Counselor Modal */}
            <Dialog
                open={createModalOpen}
                onClose={(e, reason) => {
                    if (reason === "backdropClick") return;
                    if (createSubmitting && reason === "escapeKeyDown") return;
                    handleCloseCreate();
                }}
                fullWidth
                maxWidth="sm"
                aria-busy={createSubmitting}
                PaperProps={{
                    sx: {
                        ...modalPaperSx,
                        position: "relative",
                    },
                }}
                slotProps={{backdrop: {sx: modalBackdropSx}}}
            >
                {createSubmitting && (
                    <LinearProgress
                        sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 3,
                            zIndex: 2,
                            borderRadius: "16px 16px 0 0",
                        }}
                    />
                )}
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
                                Tạo tài khoản tư vấn viên
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b", mt: 0.5}}>
                                Điền thông tin tư vấn viên mới bên dưới.
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={handleCloseCreate}
                            size="small"
                            disabled={createSubmitting}
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
                            label="Email tư vấn viên"
                            name="email"
                            type="email"
                            fullWidth
                            value={formValues.email}
                            onChange={handleChange}
                            error={!!formErrors.email}
                            helperText={formErrors.email}
                            required
                            disabled={createSubmitting}
                        />
                        <Box>
                            <Typography
                                variant="subtitle2"
                                sx={{mb: 1, fontWeight: 600, color: "#1e293b"}}
                            >
                                Ảnh đại diện{" "}
                            </Typography>
                            <ImageUpload
                                inputId="school-counsellors-create-avatar"
                                value={formValues.avatar?.trim() ? formValues.avatar.trim() : null}
                                onChange={(url) =>
                                    setFormValues((p) => ({...p, avatar: url ?? ""}))
                                }
                                onError={(m) => enqueueSnackbar(m, {variant: "error"})}
                                maxBytes={5 * 1024 * 1024}
                                disabled={createSubmitting}
                            />
                        </Box>
                        <Typography variant="body2" sx={{color: "#64748b", fontSize: 13}}>
                            Hệ thống sẽ tạo tài khoản với role <strong>COUNSELLOR</strong> dựa trên địa chỉ
                            email. Các thông tin khác (họ tên, mật khẩu, chuyên môn) sẽ được cập nhật sau khi
                            tư vấn viên đăng nhập lần đầu hoặc qua trang quản trị.
                        </Typography>
                        {createSubmitting && (
                            <Typography
                                variant="body2"
                                sx={{
                                    color: "#1d4ed8",
                                    fontWeight: 500,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    py: 0.5,
                                }}
                            >
                                <CircularProgress size={18} thickness={5} sx={{color: "#2563eb"}}/>
                                Đang xử lý, vui lòng đợi trong giây lát…
                            </Typography>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{px: 3, py: 2.5, borderTop: "1px solid #e2e8f0", gap: 1}}>
                    <Button
                        onClick={handleCloseCreate}
                        variant="text"
                        color="inherit"
                        disabled={createSubmitting}
                        sx={{textTransform: "none", fontWeight: 500}}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleCreateSubmit}
                        variant="contained"
                        disabled={createSubmitting}
                        startIcon={
                            createSubmitting ? (
                                <CircularProgress
                                    size={20}
                                    thickness={4}
                                    sx={{color: "#fff"}}
                                />
                            ) : null
                        }
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            px: 3,
                            background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                        }}
                    >
                        {createSubmitting ? "Đang tạo…" : "Tạo"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Detail Modal */}
<Dialog
    open={viewModalOpen}
    onClose={(event, reason) => {
        if (reason === "backdropClick") return;
        setViewModalOpen(false);
    }}
    maxWidth="sm"
    fullWidth
    PaperProps={{
        sx: {
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        },
    }}
    slotProps={{backdrop: {sx: modalBackdropSx}}}
>
    {/* HEADER */}
    <Box
        sx={{
            px: 3,
            py: 2.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #f1f5f9",
            background: "#fafafa",
        }}
    >
        <Typography variant="h6" sx={{fontWeight: 700}}>
            Chi tiết tư vấn viên
        </Typography>

        <IconButton
            onClick={() => setViewModalOpen(false)}
            size="small"
            sx={{
                bgcolor: "#f1f5f9",
                "&:hover": {bgcolor: "#e2e8f0"},
            }}
        >
            <CloseIcon fontSize="small"/>
        </IconButton>
    </Box>

    {/* CONTENT */}
    <DialogContent sx={{px: 3, py: 3}}>
        {selectedCounselor && (
            <Stack spacing={3}>
                {/* PROFILE */}
                <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                        src={selectedCounselor.avatar || undefined}
                        alt={selectedCounselor.fullName}
                        sx={{
                            width: 64,
                            height: 64,
                            background:
                                "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                            fontWeight: 700,
                            fontSize: "1.4rem",
                        }}
                    >
                        {getInitials(selectedCounselor.fullName)}
                    </Avatar>

                    <Box>
                        <Typography variant="h6" sx={{fontWeight: 700}}>
                            {selectedCounselor.fullName}
                        </Typography>
                        <Typography variant="body2" sx={{color: "#64748b"}}>
                            {selectedCounselor.email}
                        </Typography>
                    </Box>
                </Stack>

                {/* INFO CARD */}
                <Box
                    sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: "#f8fafc",
                        border: "1px solid #f1f5f9",
                    }}
                >
                    <Stack spacing={2}>
                        <InfoItem
                            label="Cơ sở"
                            value={selectedCounselor.campusName || "—"}
                        />
                        <InfoItem
                            label="Mã nhân viên"
                            value={selectedCounselor.employeeCode || "—"}
                        />
                        <InfoItem
                            label="Ngày đăng ký"
                            value={formatDate(selectedCounselor.registerDate)}
                        />
                        <InfoItem
                            label="Đăng nhập lần đầu"
                            value={
                                selectedCounselor.firstLogin === true
                                    ? "Chưa hoàn tất"
                                    : selectedCounselor.firstLogin === false
                                        ? "Đã hoàn tất"
                                        : "—"
                            }
                        />

                        {/* STATUS */}
                        <Box>
                            <Typography variant="caption" sx={{color: "#94a3b8"}}>
                                Trạng thái
                            </Typography>
                            <Box mt={1}>
                                <Box
                                    sx={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: "999px",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        bgcolor:
                                            selectedCounselor.status === "active"
                                                ? "#dcfce7"
                                                : "#f1f5f9",
                                        color:
                                            selectedCounselor.status === "active"
                                                ? "#16a34a"
                                                : "#64748b",
                                    }}
                                >
                                    ●{" "}
                                    {selectedCounselor.status === "active"
                                        ? "Hoạt động"
                                        : "Ngưng hoạt động"}
                                </Box>
                            </Box>
                        </Box>
                    </Stack>
                </Box>
            </Stack>
        )}
    </DialogContent>

    {/* FOOTER */}
    <DialogActions
        sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #f1f5f9",
        }}
    >
        <Button
            onClick={() => setViewModalOpen(false)}
            sx={{
                textTransform: "none",
                color: "#64748b",
                fontWeight: 500,
            }}
        >
            Đóng
        </Button>

        <Button
            variant="contained"
            startIcon={<EditIcon/>}
            onClick={() => {
                setViewModalOpen(false);
                handleOpenEdit(selectedCounselor);
            }}
            sx={{
                borderRadius: 2,
                px: 2.5,
                fontWeight: 600,
                background:
                    "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                boxShadow: "0 4px 14px rgba(13,100,222,0.4)",
                textTransform: "none",
                "&:hover": {
                    background:
                        "linear-gradient(135deg, #6b9be6 0%, #0b5ad1 100%)",
                },
            }}
        >
            Sửa thông tin
        </Button>
    </DialogActions>
</Dialog>

            {/* Edit Modal */}
            <Dialog
                open={editModalOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
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
                                Chỉnh sửa tư vấn viên
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b", mt: 0.5}}>
                                Cập nhật thông tin tư vấn viên.
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={() => setEditModalOpen(false)}
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
                            label="Họ và tên"
                            name="fullName"
                            fullWidth
                            value={formValues.fullName}
                            onChange={handleChange}
                            error={!!formErrors.fullName}
                            helperText={formErrors.fullName}
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
                            label="Số điện thoại"
                            name="phone"
                            fullWidth
                            value={formValues.phone}
                            onChange={handleChange}
                        />
                        <TextField
                            label="Chuyên môn / Lĩnh vực"
                            name="specialty"
                            fullWidth
                            value={formValues.specialty}
                            onChange={handleChange}
                        />
                        <TextField
                            label="Tiểu sử ngắn"
                            name="shortBio"
                            fullWidth
                            multiline
                            rows={3}
                            value={formValues.shortBio}
                            onChange={handleChange}
                        />
                        <TextField
                            label="Ảnh đại diện (URL)"
                            name="avatar"
                            type="url"
                            fullWidth
                            value={formValues.avatar ?? ""}
                            onChange={handleChange}
                            placeholder="https://..."
                        />
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
                        onClick={() => setEditModalOpen(false)}
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
                    <PersonOffIcon color="error"/> Vô hiệu hóa tài khoản tư vấn viên
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Bạn có chắc muốn vô hiệu hóa tài khoản của{" "}
                        <strong>{selectedCounselor?.fullName}</strong>? Tư vấn viên này sẽ không thể
                        đăng nhập hoặc truy cập hệ thống nữa.
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
