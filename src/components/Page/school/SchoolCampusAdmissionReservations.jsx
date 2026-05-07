import React from "react";
import {
    Alert,
    Avatar,
    Backdrop,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Fade,
    Grid,
    IconButton,
    InputAdornment,
    LinearProgress,
    MenuItem,
    Skeleton,
    Stack,
    TextField,
    Typography,
    useMediaQuery,
} from "@mui/material";
import Pagination from "@mui/material/Pagination";
import SearchIcon from "@mui/icons-material/Search";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import WcRoundedIcon from "@mui/icons-material/WcRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import ClassRoundedIcon from "@mui/icons-material/ClassRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SortRoundedIcon from "@mui/icons-material/SortRounded";
import {enqueueSnackbar} from "notistack";
import {useTheme} from "@mui/material/styles";
import {useSchool} from "../../../contexts/SchoolContext.jsx";
import {
    getCampusAdmissionReservationForms,
    processAdmissionReservationForm,
} from "../../../services/CampusAdmissionReservationService.jsx";
import {getApiErrorMessage} from "../../../utils/getApiErrorMessage.js";

const STATUS_OPTIONS = [
    {value: "ALL", label: "Tất cả"},
    {value: "RESERVATION_PENDING", label: "Chờ duyệt"},
    {value: "RESERVATION_APPROVAL", label: "Đã duyệt"},
    {value: "RESERVATION_REJECTED", label: "Từ chối"},
    {value: "RESERVATION_CANCELLED", label: "Đã hủy"},
];

const VALID_STATUSES = new Set([
    "RESERVATION_PENDING",
    "RESERVATION_APPROVAL",
    "RESERVATION_REJECTED",
    "RESERVATION_CANCELLED",
]);

const STATUS_STYLES = {
    RESERVATION_PENDING: {
        label: "Chờ duyệt",
        color: "#b45309",
        bg: "#fff7ed",
        border: "#fdba74",
        icon: AccessTimeRoundedIcon,
    },
    RESERVATION_APPROVAL: {
        label: "Đã duyệt",
        color: "#166534",
        bg: "#dcfce7",
        border: "#86efac",
        icon: CheckCircleRoundedIcon,
    },
    RESERVATION_REJECTED: {
        label: "Từ chối",
        color: "#b91c1c",
        bg: "#fee2e2",
        border: "#fca5a5",
        icon: CancelRoundedIcon,
    },
    RESERVATION_CANCELLED: {
        label: "Đã hủy",
        color: "#475569",
        bg: "#e2e8f0",
        border: "#cbd5e1",
        icon: CancelRoundedIcon,
    },
};

const toStatusKey = (value) => {
    const v = String(value || "").toUpperCase();
    return VALID_STATUSES.has(v) ? v : "RESERVATION_PENDING";
};

const statusMeta = (status) => STATUS_STYLES[toStatusKey(status)] ?? STATUS_STYLES.RESERVATION_PENDING;

const formatDateTime = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("vi-VN");
};

const InfoRow = ({ icon, label, value }) => (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
        <Box sx={{ color: "#64748b", display: "inline-flex" }}>{icon}</Box>
        <Typography variant="body2" sx={{ color: "#64748b", minWidth: 82 }}>
            {label}
        </Typography>
        <Typography variant="body2" sx={{ color: "#0f172a", fontWeight: 600, minWidth: 0, wordBreak: "break-word" }}>
            {value || "—"}
        </Typography>
    </Stack>
);

const StatusChip = ({ status }) => {
    const meta = statusMeta(status);
    const Icon = meta.icon;
    return (
        <Chip
            icon={<Icon sx={{ fontSize: 18 }} />}
            label={meta.label}
            sx={{
                borderRadius: 999,
                bgcolor: meta.bg,
                color: meta.color,
                border: `1px solid ${meta.border}`,
                fontWeight: 800,
                height: 34,
                "& .MuiChip-label": { px: 1.25 },
            }}
        />
    );
};

const flattenAttachments = (metadata = []) => {
    const files = [];
    metadata.forEach((item) => {
        const urls = Array.isArray(item?.imageUrl) ? item.imageUrl : [];
        urls.forEach((url) => {
            if (url) files.push({ key: item?.key || "Tệp", url });
        });
    });
    return files;
};

const mapRow = (item, index) => {
    const studentName = item?.studentName ?? item?.childName ?? item?.studentProfileName ?? "Học sinh chưa có tên";
    const parentName = item?.parentName ?? item?.guardianName ?? "Phụ huynh";
    const status = String(item?.status ?? item?.formStatus ?? "").trim().toUpperCase();
    const submittedAt = item?.submittedAt ?? item?.createdTime ?? item?.createdAt ?? item?.createdDate;
    return {
        id: Number(item?.formId ?? item?.id ?? index + 1),
        campusId: Number(item?.campusId),
        campusName: String(item?.campusName ?? "—"),
        studentName: String(studentName),
        currentSchool: String(item?.schoolName ?? item?.currentSchool ?? item?.currentSchoolName ?? "—"),
        registerClass: String(item?.registerClass ?? item?.gradeName ?? item?.targetGrade ?? "—"),
        programName: String(item?.programName ?? "—"),
        methodName: String(item?.methodName ?? item?.admissionMethodCode ?? "—"),
        submittedAt,
        parentName: String(parentName),
        phone: String(item?.parentPhone ?? item?.phone ?? "—"),
        parentEmail: String(item?.parentEmail ?? "—"),
        address: String(item?.address ?? "—"),
        gender: String(item?.gender ?? "—"),
        identityCard: String(item?.identityCard ?? "—"),
        profileMetadata: Array.isArray(item?.profileMetadata) ? item.profileMetadata : [],
        note: String(item?.note ?? item?.message ?? "").trim(),
        rejectReason: String(item?.rejectReason ?? "").trim(),
        status,
        raw: item,
    };
};

function AdmissionReservationCard({ row, isSubmitting, onApprove, onReject, onViewDetail, onOpenPreview }) {
    const isPending = row.status === "RESERVATION_PENDING";
    const initial = String(row.studentName || "?").trim().charAt(0).toUpperCase() || "?";
    const attachmentFiles = flattenAttachments(row.profileMetadata);
    const firstAttachment = attachmentFiles[0];

    return (
        <Card
            elevation={0}
            sx={{
                height: "100%",
                borderRadius: 2.5,
                border: "1px solid #e2e8f0",
                boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
                bgcolor: "#fff",
                transition: "transform .25s ease, box-shadow .25s ease",
                "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 16px 30px rgba(15,23,42,0.11)",
                    borderColor: "#bfdbfe",
                },
            }}
        >
            <CardContent sx={{ p: 2, height: "100%" }}>
                <Stack spacing={1.25} sx={{ height: "100%" }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1.25}>
                        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                            <Avatar sx={{ width: 44, height: 44, bgcolor: "#dbeafe", color: "#1d4ed8", fontWeight: 800 }}>
                                {initial}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 800, fontSize: "1.02rem", color: "#0f172a" }}>{row.studentName}</Typography>
                                <Typography variant="caption" sx={{ color: "#64748b", display: "block", mt: 0.25 }} noWrap>{row.currentSchool}</Typography>
                                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }} noWrap>
                                    {row.programName} · {row.methodName}
                                </Typography>
                            </Box>
                        </Stack>
                        <Stack spacing={0.75} alignItems="flex-end">
                            <StatusChip status={row.status} />
                            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                                {formatDateTime(row.submittedAt)}
                            </Typography>
                        </Stack>
                    </Stack>
                    <Grid container spacing={0.75}>
                        <Grid item xs={12} sm={6}><InfoRow icon={<PersonRoundedIcon sx={{ fontSize: 16 }} />} label="Phụ huynh" value={row.parentName} /></Grid>
                        <Grid item xs={12} sm={6}><InfoRow icon={<PhoneRoundedIcon sx={{ fontSize: 16 }} />} label="SĐT" value={row.phone} /></Grid>
                        <Grid item xs={12} sm={6}><InfoRow icon={<ApartmentRoundedIcon sx={{ fontSize: 16 }} />} label="Campus" value={row.campusName} /></Grid>
                        <Grid item xs={12} sm={6}><InfoRow icon={<ClassRoundedIcon sx={{ fontSize: 16 }} />} label="Lớp" value={row.registerClass} /></Grid>
                    </Grid>
                    <Box
                        onClick={() => onOpenPreview(row, 0)}
                        sx={{
                            p: 1,
                            borderRadius: 2,
                            border: "1px solid #e2e8f0",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            cursor: attachmentFiles.length > 0 ? "pointer" : "default",
                            bgcolor: "#f8fafc",
                        }}
                    >
                        {firstAttachment ? (
                            <Box component="img" src={firstAttachment.url} alt="preview" sx={{ width: 40, height: 40, borderRadius: 1.5, objectFit: "cover" }} />
                        ) : (
                            <Box sx={{ width: 40, height: 40, borderRadius: 1.5, border: "1px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                                <DescriptionRoundedIcon fontSize="small" />
                            </Box>
                        )}
                        <Typography variant="body2" sx={{ color: "#475569", fontWeight: 700 }}>
                            {attachmentFiles.length > 0 ? `+${attachmentFiles.length} tài liệu đính kèm` : "Không có tài liệu"}
                        </Typography>
                    </Box>

                    {isPending ? (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: "auto" }}>
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<VisibilityRoundedIcon />}
                                onClick={onViewDetail}
                                sx={{ textTransform: "none", borderRadius: 2.5, fontWeight: 700, borderColor: "#cbd5e1" }}
                            >
                                Xem chi tiết
                            </Button>
                            <Button
                                fullWidth
                                variant="contained"
                                startIcon={<CheckCircleRoundedIcon />}
                                disabled={isSubmitting}
                                onClick={onApprove}
                                sx={{
                                    textTransform: "none",
                                    borderRadius: 2.5,
                                    fontWeight: 800,
                                    background: "linear-gradient(90deg, #0D64DE 0%, #2563eb 100%)",
                                    boxShadow: "0 8px 20px rgba(37,99,235,0.28)",
                                    "&:hover": { boxShadow: "0 12px 24px rgba(37,99,235,0.35)" },
                                }}
                            >
                                Phê duyệt
                            </Button>
                            <Button
                                fullWidth
                                variant="outlined"
                                color="error"
                                startIcon={<CancelRoundedIcon />}
                                disabled={isSubmitting}
                                onClick={onReject}
                                sx={{ textTransform: "none", borderRadius: 2.5, fontWeight: 800 }}
                            >
                                Từ chối
                            </Button>
                        </Stack>
                    ) : (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: "auto" }}>
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<VisibilityRoundedIcon />}
                                onClick={onViewDetail}
                                sx={{ textTransform: "none", borderRadius: 2.5, fontWeight: 700, borderColor: "#cbd5e1" }}
                            >
                                Xem chi tiết
                            </Button>
                            <Chip
                                label="Đã xử lý"
                                sx={{ alignSelf: "center", borderRadius: 999, bgcolor: "#f1f5f9", color: "#475569", fontWeight: 800, minWidth: 110 }}
                            />
                        </Stack>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
}

function AttachmentGallery({ files, onOpenImage }) {
    if (files.length === 0) {
        return <Typography variant="body2" sx={{ color: "#64748b" }}>Không có tệp đính kèm.</Typography>;
    }
    return (
        <Grid container spacing={1.2}>
            {files.map((file, idx) => (
                <Grid item xs={6} sm={4} key={`${file.key}-${idx}`}>
                    <Box
                        onClick={() => onOpenImage(idx)}
                        sx={{
                            borderRadius: 2,
                            overflow: "hidden",
                            border: "1px solid #e2e8f0",
                            cursor: "pointer",
                            bgcolor: "#fff",
                        }}
                    >
                        <Box component="img" src={file.url} alt={file.key} loading="lazy" sx={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", transition: "transform .25s ease", "&:hover": { transform: "scale(1.04)" } }} />
                        <Typography variant="caption" sx={{ px: 1, py: 0.75, display: "block", color: "#475569", fontWeight: 700 }} noWrap>
                            {file.key}
                        </Typography>
                    </Box>
                </Grid>
            ))}
        </Grid>
    );
}

function AdmissionReservationDetailDrawer({ open, row, onClose, onApprove, onReject, isSubmitting, onOpenPreview, fullScreen }) {
    const files = flattenAttachments(row?.profileMetadata || []);
    const isPending = row?.status === "RESERVATION_PENDING";
    const initial = String(row?.studentName || "?").trim().charAt(0).toUpperCase() || "?";
    const sectionCard = { p: 1.5, borderRadius: 2.5, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" };
    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            fullScreen={fullScreen}
            maxWidth="md"
            PaperProps={{
                sx: {
                    borderRadius: fullScreen ? 0 : 3,
                    bgcolor: "rgba(255,255,255,0.98)",
                    backdropFilter: "blur(10px)",
                    minHeight: fullScreen ? "100%" : "80vh",
                },
            }}
        >
            <Stack sx={{ height: "100%", maxHeight: fullScreen ? "100%" : "80vh" }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5, borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, bgcolor: "rgba(255,255,255,0.95)", zIndex: 2 }}>
                    <Stack direction="row" spacing={1.2} alignItems="center">
                        <Avatar sx={{ width: 48, height: 48, bgcolor: "#dbeafe", color: "#1d4ed8", fontWeight: 800 }}>{initial}</Avatar>
                        <Box>
                            <Typography sx={{ fontWeight: 800 }}>{row?.studentName}</Typography>
                            <Typography variant="caption" sx={{ color: "#64748b" }}>{row?.programName} · {row?.methodName}</Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <StatusChip status={row?.status} />
                        <IconButton onClick={onClose}><CloseRoundedIcon /></IconButton>
                    </Stack>
                </Stack>

                <Box sx={{ p: 2, overflowY: "auto", flex: 1 }}>
                    <Stack spacing={1.5}>
                        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700 }}>Nộp lúc: {formatDateTime(row?.submittedAt)}</Typography>
                        <Box sx={sectionCard}>
                            <Typography sx={{ fontWeight: 800, mb: 1, color: "#334155" }}>Thông tin học sinh</Typography>
                            <Stack spacing={0.9}>
                                <InfoRow icon={<WcRoundedIcon sx={{ fontSize: 16 }} />} label="Giới tính" value={row?.gender} />
                                <InfoRow icon={<BadgeRoundedIcon sx={{ fontSize: 16 }} />} label="CCCD" value={row?.identityCard} />
                                <InfoRow icon={<ApartmentRoundedIcon sx={{ fontSize: 16 }} />} label="Campus" value={row?.campusName} />
                                <InfoRow icon={<ClassRoundedIcon sx={{ fontSize: 16 }} />} label="Lớp đăng ký" value={row?.registerClass} />
                                <InfoRow icon={<SchoolRoundedIcon sx={{ fontSize: 16 }} />} label="Trường" value={row?.currentSchool} />
                            </Stack>
                        </Box>

                        <Box sx={sectionCard}>
                            <Typography sx={{ fontWeight: 800, mb: 1, color: "#334155" }}>Thông tin phụ huynh</Typography>
                            <Stack spacing={0.9}>
                                <InfoRow icon={<PersonRoundedIcon sx={{ fontSize: 16 }} />} label="Tên" value={row?.parentName} />
                                <InfoRow icon={<PhoneRoundedIcon sx={{ fontSize: 16 }} />} label="SĐT" value={row?.phone} />
                                <InfoRow icon={<EmailRoundedIcon sx={{ fontSize: 16 }} />} label="Email" value={row?.parentEmail} />
                                <InfoRow icon={<HomeRoundedIcon sx={{ fontSize: 16 }} />} label="Địa chỉ" value={row?.address} />
                            </Stack>
                        </Box>

                        <Box sx={sectionCard}>
                            <Typography sx={{ fontWeight: 800, mb: 1, color: "#334155" }}>Hồ sơ đính kèm</Typography>
                            <AttachmentGallery files={files} onOpenImage={(idx) => onOpenPreview(row, idx)} />
                        </Box>

                        {(row?.status === "RESERVATION_REJECTED" && row?.rejectReason) || row?.note ? (
                            <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: "#fef2f2", border: "1px solid #fecaca" }}>
                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                    <WarningAmberRoundedIcon sx={{ fontSize: 18, color: "#dc2626", mt: 0.2 }} />
                                    <Box>
                                        <Typography sx={{ fontWeight: 800, color: "#b91c1c" }}>
                                            {row?.status === "RESERVATION_REJECTED" ? "Lý do từ chối" : "Ghi chú"}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "#7f1d1d" }}>
                                            {row?.status === "RESERVATION_REJECTED" ? row?.rejectReason : row?.note}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Box>
                        ) : null}
                    </Stack>
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ p: 2, borderTop: "1px solid #e2e8f0", position: "sticky", bottom: 0, bgcolor: "rgba(255,255,255,0.97)" }}>
                    {isPending ? (
                        <>
                            <Button fullWidth variant="contained" startIcon={<CheckCircleRoundedIcon />} onClick={onApprove} disabled={isSubmitting} sx={{ textTransform: "none", borderRadius: 2.5, fontWeight: 800 }}>Phê duyệt</Button>
                            <Button fullWidth variant="outlined" color="error" startIcon={<CancelRoundedIcon />} onClick={onReject} disabled={isSubmitting} sx={{ textTransform: "none", borderRadius: 2.5, fontWeight: 800 }}>Từ chối</Button>
                        </>
                    ) : (
                        <Chip label="Đã xử lý" sx={{ borderRadius: 999, bgcolor: "#f1f5f9", color: "#475569", fontWeight: 800 }} />
                    )}
                </Stack>
            </Stack>
        </Dialog>
    );
}

function ImagePreviewModal({ open, images, selectedIndex, onChangeIndex, onClose }) {
    React.useEffect(() => {
        if (!open) return undefined;
        const onKeyDown = (e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowRight" && selectedIndex < images.length - 1) onChangeIndex(selectedIndex + 1);
            if (e.key === "ArrowLeft" && selectedIndex > 0) onChangeIndex(selectedIndex - 1);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose, onChangeIndex, selectedIndex, images.length]);

    const current = images[selectedIndex];
    return (
        <Backdrop open={open} onClick={onClose} sx={{ zIndex: 1400, bgcolor: "rgba(2,6,23,0.82)", backdropFilter: "blur(4px)" }}>
            <Fade in={open}>
                <Box onClick={(e) => e.stopPropagation()} sx={{ width: "min(92vw,980px)", maxHeight: "90vh", p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography sx={{ color: "#e2e8f0", fontWeight: 700 }}>
                            {selectedIndex + 1}/{images.length} {current?.key ? `· ${current.key}` : ""}
                        </Typography>
                        <IconButton onClick={onClose} sx={{ color: "#fff" }}><CloseRoundedIcon /></IconButton>
                    </Stack>
                    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", maxHeight: "82vh" }}>
                        {current ? <Box component="img" src={current.url} alt={current.key || "preview"} sx={{ maxWidth: "100%", maxHeight: "82vh", borderRadius: 2, boxShadow: "0 20px 45px rgba(0,0,0,0.35)" }} /> : null}
                    </Box>
                </Box>
            </Fade>
        </Backdrop>
    );
}

export default function SchoolCampusAdmissionReservations() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const {currentCampusId, loading: schoolCtxLoading} = useSchool();
    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [search, setSearch] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("RESERVATION_PENDING");
    const [page, setPage] = React.useState(0);
    const [pageSize] = React.useState(12);
    const [totalItems, setTotalItems] = React.useState(0);
    const [sortBy, setSortBy] = React.useState("NEWEST");
    const [selectedReservation, setSelectedReservation] = React.useState(null);
    const [detailOpen, setDetailOpen] = React.useState(false);
    const [imagePreviewOpen, setImagePreviewOpen] = React.useState(false);
    const [previewImages, setPreviewImages] = React.useState([]);
    const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);

    const [confirmState, setConfirmState] = React.useState({open: false, form: null});
    const [rejectState, setRejectState] = React.useState({open: false, form: null, reason: "", touched: false});
    const [submittingId, setSubmittingId] = React.useState(null);

    const loadData = React.useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await getCampusAdmissionReservationForms({
                status: statusFilter,
            });
            const allRows = Array.isArray(res?.items)
                ? res.items.map(mapRow).filter((row) => VALID_STATUSES.has(row.status))
                : [];
            allRows.sort((a, b) => {
                const diff = new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
                return sortBy === "OLDEST" ? -diff : diff;
            });

            const kw = String(search || "").trim().toLowerCase();
            const filtered = kw
                ? allRows.filter((row) =>
                    [
                        row.studentName,
                        row.parentName,
                        row.phone,
                        row.parentEmail,
                        row.currentSchool,
                        row.programName,
                        row.methodName,
                    ].some((field) => String(field || "").toLowerCase().includes(kw))
                )
                : allRows;

            const total = filtered.length;
            const start = page * pageSize;
            const pagedRows = filtered.slice(start, start + pageSize);
            setRows(pagedRows);
            setTotalItems(total);
        } catch (err) {
            setRows([]);
            setTotalItems(0);
            setError(getApiErrorMessage(err, "Không tải được danh sách hồ sơ nhập học."));
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, statusFilter, sortBy]);

    React.useEffect(() => {
        if (schoolCtxLoading) return;
        void loadData();
    }, [schoolCtxLoading, loadData]);

    React.useEffect(() => {
        setPage(0);
    }, [search, statusFilter]);

    const pendingCount = React.useMemo(() => rows.filter((row) => row.status === "RESERVATION_PENDING").length, [rows]);
    const openDetail = (row) => {
        setSelectedReservation(row);
        setDetailOpen(true);
    };
    const openImagePreview = (row, index = 0) => {
        const files = flattenAttachments(row?.profileMetadata || []);
        if (files.length === 0) return;
        setPreviewImages(files);
        setSelectedImageIndex(Math.max(0, Math.min(index, files.length - 1)));
        setImagePreviewOpen(true);
    };

    const handleApprove = async () => {
        const form = confirmState.form;
        const resolvedCampusId = Number(currentCampusId ?? form?.campusId ?? form?.raw?.campusId);
        if (!form) return;
        setSubmittingId(form.id);
        try {
            await processAdmissionReservationForm({
                formId: form.id,
                campusId: Number.isFinite(resolvedCampusId) ? resolvedCampusId : undefined,
                action: "APPROVE",
            });
            enqueueSnackbar("Phê duyệt thành công", {variant: "success"});
            setConfirmState({open: false, form: null});
            await loadData();
        } catch (err) {
            enqueueSnackbar(getApiErrorMessage(err, "Không thể phê duyệt hồ sơ."), {variant: "error"});
        } finally {
            setSubmittingId(null);
        }
    };

    const handleRejectSubmit = async () => {
        const form = rejectState.form;
        const reason = String(rejectState.reason || "").trim();
        const resolvedCampusId = Number(currentCampusId ?? form?.campusId ?? form?.raw?.campusId);
        if (!form) return;
        if (!reason) {
            setRejectState((prev) => ({...prev, touched: true}));
            return;
        }
        setSubmittingId(form.id);
        try {
            await processAdmissionReservationForm({
                formId: form.id,
                campusId: Number.isFinite(resolvedCampusId) ? resolvedCampusId : undefined,
                action: "REJECT",
                rejectReason: reason,
            });
            enqueueSnackbar("Từ chối thành công", {variant: "success"});
            setRejectState({open: false, form: null, reason: "", touched: false});
            await loadData();
        } catch (err) {
            enqueueSnackbar(getApiErrorMessage(err, "Không thể từ chối hồ sơ."), {variant: "error"});
        } finally {
            setSubmittingId(null);
        }
    };

    return (
        <Box sx={{display: "flex", flexDirection: "column", gap: 3, width: "100%", pb: 4}}>
            <Box sx={{ background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)", borderRadius: 3, p: { xs: 2.2, md: 3 }, color: "white", boxShadow: "0 8px 32px rgba(13, 100, 222, 0.25)" }}>
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: {xs: "column", sm: "row"},
                        alignItems: {xs: "stretch", sm: "center"},
                        justifyContent: "space-between",
                        gap: 2,
                    }}
                >
                    <Stack direction="row" spacing={1.2} alignItems="center">
                        <Box sx={{width: 40, height: 40, borderRadius: 2, bgcolor: "rgba(255,255,255,0.22)", color: "white", display: "flex", alignItems: "center", justifyContent: "center"}}>
                            <FactCheckOutlinedIcon sx={{fontSize: 22}}/>
                        </Box>
                        <Box>
                            <Typography variant="h4" sx={{fontWeight: 700, letterSpacing: "-0.02em", textShadow: "0 1px 2px rgba(0,0,0,0.1)"}}>
                                Xác nhận hồ sơ nhập học
                            </Typography>
                            <Typography variant="body2" sx={{mt: 0.5, opacity: 0.95}}>
                                Quản lý và xử lý hồ sơ từ phụ huynh
                            </Typography>
                        </Box>
                    </Stack>
                    <Chip label={`Còn lại: ${pendingCount} hồ sơ`} sx={{ alignSelf: {xs: "flex-start", sm: "flex-end"}, borderRadius: 999, bgcolor: "rgba(255,255,255,0.95)", color: "#0D64DE", fontWeight: 800 }} />
                </Box>
            </Box>

            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                    bgcolor: "rgba(248,250,252,0.8)",
                    backdropFilter: "blur(6px)",
                    position: "sticky",
                    top: 8,
                    zIndex: 4,
                }}
            >
                <CardContent sx={{p: 2.5}}>
                    <Stack direction={{xs: "column", md: "row"}} spacing={2} alignItems={{xs: "stretch", md: "center"}} flexWrap="wrap">
                        <TextField
                            placeholder="Tìm theo tên học sinh / phụ huynh..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            size="small"
                            sx={{flex: 1, minWidth: 220, maxWidth: {md: 360}, "& .MuiOutlinedInput-root": {borderRadius: 2, bgcolor: "white"}}}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{color: "#64748b"}}/>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            select
                            size="small"
                            label="Trạng thái"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            sx={{minWidth: 180, "& .MuiOutlinedInput-root": {borderRadius: 2, bgcolor: "white"}}}
                        >
                            {STATUS_OPTIONS.map((s) => (
                                <MenuItem key={s.value} value={s.value}>
                                    {s.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            size="small"
                            label="Sắp xếp"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            sx={{ minWidth: 150, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "white" } }}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SortRoundedIcon sx={{ color: "#64748b", fontSize: 18 }} /></InputAdornment> }}
                        >
                            <MenuItem value="NEWEST">Mới nhất</MenuItem>
                            <MenuItem value="OLDEST">Cũ nhất</MenuItem>
                        </TextField>
                    </Stack>
                </CardContent>
            </Card>

            {schoolCtxLoading ? (
                <Card elevation={0} sx={{borderRadius: 4, border: "1px solid #e2e8f0"}}><CardContent><Skeleton height={48}/><Skeleton height={38}/><Skeleton height={38}/></CardContent></Card>
            ) : error ? (
                <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void loadData()}>Thử lại</Button>} sx={{borderRadius: 2}}>
                    {error}
                </Alert>
            ) : (
                <>
                    {loading ? (
                        <Grid container spacing={1.5}>
                            {Array.from({length: 6}).map((_, i) => (
                                <Grid item xs={12} md={6} key={i}>
                                    <Card elevation={0} sx={{borderRadius: "22px", border: "1px solid #e2e8f0", boxShadow: "0 8px 20px rgba(15,23,42,0.04)"}}>
                                        <CardContent>
                                            <Skeleton variant="rounded" height={56} sx={{borderRadius: 2}} />
                                            <Skeleton sx={{mt: 1}} />
                                            <Skeleton />
                                            <Skeleton variant="rounded" height={88} sx={{mt: 1.2, borderRadius: 2}} />
                                            <Skeleton variant="rounded" height={40} sx={{mt: 1.2, borderRadius: 2}} />
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    ) : rows.length === 0 ? (
                        <Card elevation={0} sx={{borderRadius: 4, border: "1px dashed #cbd5e1", textAlign: "center"}}>
                            <CardContent>
                                <Typography sx={{fontWeight: 800, color: "#334155"}}>Không có hồ sơ phù hợp</Typography>
                                <Typography variant="body2" sx={{color: "#64748b"}}>Không tìm thấy hồ sơ phù hợp với bộ lọc hiện tại.</Typography>
                            </CardContent>
                        </Card>
                    ) : (
                        <Grid container spacing={1.5}>
                            {rows.map((row) => (
                                <Grid item xs={12} md={6} key={row.id}>
                                    <AdmissionReservationCard
                                        row={row}
                                        isSubmitting={submittingId === row.id}
                                        onViewDetail={() => openDetail(row)}
                                        onApprove={() => setConfirmState({open: true, form: row})}
                                        onReject={() => setRejectState({open: true, form: row, reason: "", touched: false})}
                                        onOpenPreview={openImagePreview}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    )}
                    {totalItems > pageSize ? (
                        <Box sx={{display: "flex", justifyContent: "flex-end", pt: 1}}>
                            <Pagination
                                count={Math.ceil(totalItems / pageSize)}
                                page={page + 1}
                                onChange={(_, p) => setPage(p - 1)}
                                color="primary"
                                shape="rounded"
                            />
                        </Box>
                    ) : null}
                </>
            )}

            <Dialog open={confirmState.open} onClose={() => setConfirmState({open: false, form: null})} maxWidth="xs" fullWidth>
                <DialogTitle sx={{fontWeight: 800}}>Xác nhận phê duyệt</DialogTitle>
                <DialogContent><Typography>Bạn có chắc muốn duyệt đơn này?</Typography></DialogContent>
                <DialogActions sx={{p: 2}}>
                    <Button onClick={() => setConfirmState({open: false, form: null})} disabled={submittingId != null}>Hủy</Button>
                    <Button variant="contained" onClick={handleApprove} disabled={submittingId != null}>Xác nhận</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={rejectState.open} onClose={() => setRejectState({open: false, form: null, reason: "", touched: false})} maxWidth="sm" fullWidth>
                <DialogTitle sx={{fontWeight: 800}}>Xác nhận từ chối</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.2} sx={{pt: 0.5}}>
                        <Typography variant="body2" sx={{color: "#475569"}}>Nhập lý do từ chối hồ sơ.</Typography>
                        <TextField
                            multiline
                            minRows={3}
                            placeholder="Nhập lý do từ chối..."
                            value={rejectState.reason}
                            onChange={(e) => setRejectState((prev) => ({...prev, reason: e.target.value, touched: true}))}
                            error={rejectState.touched && !String(rejectState.reason || "").trim()}
                            helperText={rejectState.touched && !String(rejectState.reason || "").trim() ? "Vui lòng nhập lý do" : ""}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{p: 2}}>
                    <Button onClick={() => setRejectState({open: false, form: null, reason: "", touched: false})} disabled={submittingId != null}>Hủy</Button>
                    <Button color="error" variant="contained" onClick={handleRejectSubmit} disabled={submittingId != null}>Xác nhận từ chối</Button>
                </DialogActions>
            </Dialog>

            <AdmissionReservationDetailDrawer
                open={detailOpen}
                row={selectedReservation}
                onClose={() => setDetailOpen(false)}
                fullScreen={isMobile}
                isSubmitting={submittingId != null}
                onApprove={() => {
                    setConfirmState({ open: true, form: selectedReservation });
                    if (isMobile) setDetailOpen(false);
                }}
                onReject={() => {
                    setRejectState({ open: true, form: selectedReservation, reason: "", touched: false });
                    if (isMobile) setDetailOpen(false);
                }}
                onOpenPreview={openImagePreview}
            />

            <ImagePreviewModal
                open={imagePreviewOpen}
                images={previewImages}
                selectedIndex={selectedImageIndex}
                onChangeIndex={setSelectedImageIndex}
                onClose={() => setImagePreviewOpen(false)}
            />
        </Box>
    );
}
