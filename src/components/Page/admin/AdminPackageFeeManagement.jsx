import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    InputLabel,
    IconButton,
    Paper,
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
    Tooltip,
    Typography,
    alpha,
    MenuItem,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import PolicyOutlinedIcon from "@mui/icons-material/PolicyOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import AddIcon from "@mui/icons-material/Add";
import FileUploadSharpIcon from "@mui/icons-material/FileUploadSharp";
import BlockSharpIcon from "@mui/icons-material/BlockSharp";
import { enqueueSnackbar } from "notistack";
import ConfirmDialog from "../../ui/ConfirmDialog.jsx";
import { APP_PRIMARY_MAIN } from "../../../constants/homeLandingTheme";
import {
    adminDialogActionsSx,
    adminDialogContentSx,
    adminDialogPaperSx,
    adminDialogTitleSx,
} from "../../../constants/adminDialogStyles.js";
import {
    adminDataCardBorderSx,
    adminTableBodyRowSx,
    adminTableContainerSx,
    adminTableHeadCellSx,
    adminTableHeadRowSx,
} from "../../../constants/adminTableStyles.js";
import { deactiveAdminPackageFee, getAdminPackageFees, publishAdminPackageFee, upsertAdminPackageFee } from "../../../services/AdminService.jsx";

const defaultForm = {
    packageId: null,
    name: "",
    description: "",
    price: "",
    durationDays: "",
    maxCounsellors: "",
    maxAdmissions: "",
    allowChat: false,
    parentPostPermission: "CREATE_POST",
    isFeatured: false,
    topRanking: "",
    supportLevel: "STANDARD",
};

const SUPPORT_LEVELS = ["BASIC", "STANDARD", "ENTERPRISE"];
const PARENT_POST_PERMISSIONS = ["NONE", "VIEW_ONLY", "CREATE_POST"];

function displayEnum(value) {
    if (value === null || value === undefined || value === "") return "—";
    return String(value);
}

function packageStatusLabel(status) {
    if (status === "PACKAGE_DRAFT") return "Bản nháp";
    if (status === "PACKAGE_PUBLISHED") return "Đã phát hành";
    if (status === "PACKAGE_ACTIVE") return "Hoạt động";
    if (status === "PACKAGE_PENDING_DEACTIVE" || status === "PENDING_DEACTIVE") return "Chờ ngừng bán";
    if (status === "PACKAGE_DEACTIVATED") return "Đã ngừng bán";
    return status || "Không xác định";
}

function packageStatusChipProps(status) {
    if (status === "PACKAGE_DRAFT") return { color: "warning", variant: "filled" };
    if (status === "PACKAGE_ACTIVE" || status === "PACKAGE_PUBLISHED") return { color: "success", variant: "filled" };
    if (status === "PACKAGE_PENDING_DEACTIVE" || status === "PENDING_DEACTIVE") return { color: "warning", variant: "outlined" };
    if (status === "PACKAGE_DEACTIVATED") return { color: "error", variant: "outlined" };
    return { color: "default", variant: "outlined" };
}

function canDeactivatePackage(status) {
    return status === "PACKAGE_ACTIVE" || status === "PACKAGE_PUBLISHED";
}

function pickHttpErrorMessage(error, fallback) {
    const d = error?.response?.data;
    if (!d || typeof d !== "object") return fallback;
    if (typeof d.message === "string" && d.message.trim()) return d.message.trim();
    if (typeof d.error === "string" && d.error.trim()) return d.error.trim();
    if (typeof d?.body?.message === "string" && d.body.message.trim()) return d.body.message.trim();
    return fallback;
}

const vndFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

function formatVnd(amount) {
    if (amount === "" || amount === null || amount === undefined) return "";
    const n = Number(amount);
    if (Number.isNaN(n) || n < 0) return "";
    return vndFormatter.format(Math.trunc(n));
}

function mapPackageFromApi(item) {
    const features = item?.features || item?.featureData || {};
    return {
        id: item?.id ?? null,
        name: item?.name || "",
        description: item?.description || "",
        price: item?.price != null ? Number(item.price) : null,
        durationDays: item?.durationDays != null ? Number(item.durationDays) : null,
        status: item?.status || "",
        features: {
            maxCounsellors: Number(features?.maxCounsellors ?? 0),
            maxAdmissions: Number(features?.maxAdmissions ?? 0),
            allowChat: Boolean(features?.allowChat),
            parentPostPermission: String(features?.parentPostPermission || "CREATE_POST"),
            isFeatured: Boolean(features?.isFeatured),
            topRanking: Number(features?.topRanking ?? 0),
            supportLevel: String(features?.supportLevel || "STANDARD"),
        },
    };
}

const packageDetailSectionSx = {
    border: "1px solid #bfdbfe",
    borderRadius: 3,
    bgcolor: "#eff6ff",
    p: { xs: 1.4, md: 1.8 },
    boxShadow: "0 10px 24px rgba(37,99,235,0.14)",
};

const packageDetailFieldBoxSx = {
    border: "1px solid #bfdbfe",
    borderRadius: 2.25,
    bgcolor: "#ffffff",
    px: 1.3,
    py: 1.1,
    boxShadow: "0 5px 12px rgba(37,99,235,0.08)",
};

const detailInfoLabelSx = { fontSize: 12, color: "#94a3b8", fontWeight: 600, display: "block", mb: 0.35 };
const detailInfoValueSx = { fontSize: 15, color: "#1e293b", fontWeight: 600, wordBreak: "break-word" };

const detailFeatureGridLabelSx = { fontSize: 12, color: "#94a3b8", fontWeight: 600, lineHeight: 1.3 };
const detailFeatureGridValueSx = { fontSize: 15, color: "#1e293b", fontWeight: 700, lineHeight: 1.35 };
const featureIconWrapSx = {
    width: 44,
    height: 44,
    borderRadius: 2,
    bgcolor: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
};

function PackageDetailPriceDurationSection({ price, durationDays }) {
    const hasPrice = price != null && !Number.isNaN(Number(price));
    const hasDuration = durationDays != null && !Number.isNaN(Number(durationDays));
    return (
        <Box sx={packageDetailSectionSx}>
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 1.5 }}>
                <PaymentsOutlinedIcon sx={{ fontSize: 17, color: "#2563eb" }} />
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#2563eb" }}>Giá & thời hạn</Typography>
            </Stack>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1px 1fr" },
                    alignItems: "center",
                    gap: 0,
                    width: "100%",
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1.25} justifyContent="center" sx={{ minWidth: 0, py: 0.5, px: 1 }}>
                    <MonetizationOnOutlinedIcon sx={{ fontSize: 24, color: "#64748b" }} aria-hidden />
                    <Typography sx={{ fontSize: 16, color: "#1e293b", fontWeight: 600 }}>{hasPrice ? formatVnd(price) : "—"}</Typography>
                </Stack>
                <Box
                    sx={{
                        display: { xs: "none", md: "block" },
                        width: "1px",
                        alignSelf: "stretch",
                        minHeight: 44,
                        bgcolor: "#cbd5e1",
                        justifySelf: "center",
                    }}
                />
                <Stack direction="row" alignItems="center" spacing={1.25} justifyContent="center" sx={{ minWidth: 0, py: 0.5, px: 1 }}>
                    <CalendarMonthOutlinedIcon sx={{ fontSize: 24, color: "#64748b" }} aria-hidden />
                    <Typography sx={{ fontSize: 16, color: "#1e293b", fontWeight: 600 }}>
                        {hasDuration ? `${Number(durationDays)} ngày` : "—"}
                    </Typography>
                </Stack>
            </Box>
            <Divider sx={{ display: { xs: "block", md: "none" }, mt: 1.5, borderColor: "#e2e8f0" }} />
        </Box>
    );
}

function PackageDetailInfoSection({ row }) {
    return (
        <Box sx={packageDetailSectionSx}>
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 1.5 }}>
                <InfoOutlinedIcon sx={{ fontSize: 17, color: "#2563eb" }} />
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#2563eb" }}>Thông tin gói</Typography>
            </Stack>
            <Stack spacing={1.25}>
                <Box sx={packageDetailFieldBoxSx}>
                    <Typography sx={detailInfoLabelSx}>ID</Typography>
                    <Typography sx={detailInfoValueSx}>{row.id != null ? String(row.id) : "—"}</Typography>
                </Box>
                <Box sx={packageDetailFieldBoxSx}>
                    <Typography sx={detailInfoLabelSx}>Tên gói</Typography>
                    <Typography sx={detailInfoValueSx}>{row.name || "—"}</Typography>
                </Box>
                <Box sx={packageDetailFieldBoxSx}>
                    <Typography sx={detailInfoLabelSx}>Mô tả / Trạng thái</Typography>
                    <Typography
                        sx={{
                            ...detailInfoValueSx,
                            fontWeight: 500,
                            lineHeight: 1.55,
                            whiteSpace: "pre-wrap",
                            mb: 1.5,
                        }}
                    >
                        {row.description || "—"}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                        <Typography sx={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Trạng thái:</Typography>
                        <Chip size="small" label={packageStatusLabel(row.status)} {...packageStatusChipProps(row.status)} />
                    </Stack>
                </Box>
            </Stack>
        </Box>
    );
}

function PackageFeatureGridCell({ Icon, label, value }) {
    return (
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box sx={featureIconWrapSx} aria-hidden>
                <Icon sx={{ fontSize: 22, color: "#64748b" }} />
            </Box>
            <Box sx={{ minWidth: 0, pt: 0.15 }}>
                <Typography sx={detailFeatureGridLabelSx}>{label}</Typography>
                <Typography sx={detailFeatureGridValueSx}>{value}</Typography>
            </Box>
        </Stack>
    );
}

function PackageFeaturesDetailGrid({ features }) {
    const f = features || {};
    const cells = [
        { Icon: SupportAgentOutlinedIcon, label: "Tư vấn viên", value: String(f.maxCounsellors ?? 0) },
        { Icon: SchoolOutlinedIcon, label: "Tuyển sinh", value: String(f.maxAdmissions ?? 0) },
        { Icon: PolicyOutlinedIcon, label: "Quyền nhà trường", value: displayEnum(f.parentPostPermission) },
        { Icon: ChatBubbleOutlineIcon, label: "Chat", value: f.allowChat ? "Đã bật" : "Đã tắt" },
        { Icon: StarOutlineIcon, label: "Nổi bật", value: f.isFeatured ? "Có" : "Không" },
        { Icon: EmojiEventsOutlinedIcon, label: "Xếp hạng", value: `Số ${f.topRanking ?? 0}` },
    ];
    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
                gap: { xs: 2, md: 2.5 },
                columnGap: { md: 3 },
                rowGap: { xs: 2, md: 2.75 },
                width: "100%",
            }}
        >
            {cells.map((c) => (
                <PackageFeatureGridCell key={c.label} Icon={c.Icon} label={c.label} value={c.value} />
            ))}
        </Box>
    );
}

function buildPayload(form, isEdit) {
    const body = {
        name: String(form.name).trim(),
        description: String(form.description).trim(),
        price: Number(form.price),
        durationDays: Number(form.durationDays),
        featureData: {
            maxCounsellors: Number(form.maxCounsellors),
            maxAdmissions: Number(form.maxAdmissions),
            allowChat: Boolean(form.allowChat),
            parentPostPermission: String(form.parentPostPermission || "CREATE_POST"),
            isFeatured: Boolean(form.isFeatured),
            topRanking: Number(form.topRanking),
            supportLevel: String(form.supportLevel || "STANDARD"),
        },
    };
    if (isEdit) {
        return { packageId: Number(form.packageId), ...body };
    }
    return body;
}

export default function AdminPackageFeeManagement() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const isCompact = useMediaQuery(theme.breakpoints.down("lg"));
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailRow, setDetailRow] = useState(null);
    const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
    const [publishTargetRow, setPublishTargetRow] = useState(null);
    const [publishLoading, setPublishLoading] = useState(false);
    const [deactiveConfirmOpen, setDeactiveConfirmOpen] = useState(false);
    const [deactiveTargetRow, setDeactiveTargetRow] = useState(null);
    const [deactiveLoading, setDeactiveLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState(defaultForm);

    const isEdit = form.packageId != null;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAdminPackageFees();
            const list = Array.isArray(res?.data?.body) ? res.data.body : [];
            setItems(list.map(mapPackageFromApi));
        } catch (e) {
            console.error(e);
            enqueueSnackbar("Không thể tải danh sách phí gói dịch vụ.", { variant: "error" });
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const sortedItems = useMemo(() => {
        const clone = [...items];
        clone.sort((a, b) => {
            const ida = a.id != null && !Number.isNaN(Number(a.id)) ? Number(a.id) : Number.POSITIVE_INFINITY;
            const idb = b.id != null && !Number.isNaN(Number(b.id)) ? Number(b.id) : Number.POSITIVE_INFINITY;
            return ida - idb;
        });
        return clone;
    }, [items]);

    const openCreateDialog = () => {
        setForm(defaultForm);
        setDialogOpen(true);
    };

    const openEditDialog = (row) => {
        if (row?.status !== "PACKAGE_DRAFT") {
            enqueueSnackbar("Chỉ có thể cập nhật gói ở trạng thái PACKAGE_DRAFT (Bản nháp).", { variant: "warning" });
            return;
        }
        setForm({
            packageId: row.id,
            name: row.name,
            description: row.description,
            price: row.price != null && !Number.isNaN(Number(row.price)) ? Number(row.price) : "",
            durationDays: row.durationDays != null && !Number.isNaN(Number(row.durationDays)) ? Number(row.durationDays) : "",
            maxCounsellors: row.features.maxCounsellors,
            maxAdmissions: row.features.maxAdmissions,
            allowChat: row.features.allowChat,
            parentPostPermission: row.features.parentPostPermission,
            isFeatured: row.features.isFeatured,
            topRanking: row.features.topRanking,
            supportLevel: row.features.supportLevel,
        });
        setDialogOpen(true);
    };

    const closeDialog = () => {
        if (submitting) return;
        setDialogOpen(false);
        setForm(defaultForm);
    };

    const openDetailDialog = (row) => {
        setDetailRow(row);
        setDetailOpen(true);
    };

    const closeDetailDialog = () => {
        setDetailOpen(false);
        setDetailRow(null);
    };

    const openPublishConfirm = (row) => {
        if (row?.status !== "PACKAGE_DRAFT") {
            enqueueSnackbar("Chỉ có thể công khai gói ở trạng thái Bản nháp.", { variant: "warning" });
            return;
        }
        if (row?.id == null) return;
        setPublishTargetRow(row);
        setPublishConfirmOpen(true);
    };

    const closePublishConfirm = () => {
        if (publishLoading) return;
        setPublishConfirmOpen(false);
        setPublishTargetRow(null);
    };

    const handleConfirmPublish = async () => {
        if (!publishTargetRow?.id) return;
        setPublishLoading(true);
        try {
            await publishAdminPackageFee(publishTargetRow.id);
            enqueueSnackbar("Đã công khai gói dịch vụ.", { variant: "success" });
            closePublishConfirm();
            await load();
        } catch (e) {
            console.error(e);
            enqueueSnackbar(pickHttpErrorMessage(e, "Không thể công khai gói. Vui lòng thử lại."), { variant: "error" });
        } finally {
            setPublishLoading(false);
        }
    };

    const openDeactiveConfirm = (row) => {
        if (!canDeactivatePackage(row?.status)) {
            enqueueSnackbar("Chỉ có thể ngừng mở bán gói đang hoạt động hoặc đã phát hành.", { variant: "warning" });
            return;
        }
        if (row?.id == null) return;
        setDeactiveTargetRow(row);
        setDeactiveConfirmOpen(true);
    };

    const closeDeactiveConfirm = () => {
        if (deactiveLoading) return;
        setDeactiveConfirmOpen(false);
        setDeactiveTargetRow(null);
    };

    const handleConfirmDeactive = async () => {
        if (!deactiveTargetRow?.id) return;
        setDeactiveLoading(true);
        try {
            await deactiveAdminPackageFee(deactiveTargetRow.id);
            enqueueSnackbar("Đã gửi yêu cầu ngừng mở bán gói.", { variant: "success" });
            closeDeactiveConfirm();
            await load();
        } catch (e) {
            console.error(e);
            enqueueSnackbar(pickHttpErrorMessage(e, "Không thể ngừng mở bán gói. Vui lòng thử lại."), { variant: "error" });
        } finally {
            setDeactiveLoading(false);
        }
    };

    const handleChange = (key) => (e) => {
        const value = e?.target?.type === "checkbox" ? e.target.checked : e.target.value;
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handlePriceVndChange = (e) => {
        const digits = String(e.target.value).replace(/\D/g, "");
        if (digits === "") {
            setForm((prev) => ({ ...prev, price: "" }));
            return;
        }
        const n = parseInt(digits, 10);
        if (Number.isNaN(n)) return;
        setForm((prev) => ({ ...prev, price: n }));
    };

    const validateForm = () => {
        if (!String(form.name).trim()) return "Vui lòng nhập tên gói.";
        if (!String(form.description).trim()) return "Vui lòng nhập mô tả gói.";
        if (form.price === "" || Number.isNaN(Number(form.price)) || Number(form.price) < 0) return "Giá gói (VNĐ) không hợp lệ.";
        const dur = Number(form.durationDays);
        if (form.durationDays === "" || Number.isNaN(dur) || dur < 1 || !Number.isInteger(dur)) {
            return "Thời hạn gói (ngày) phải là số nguyên dương.";
        }
        if (form.maxCounsellors === "" || Number(form.maxCounsellors) < 0) return "Số tư vấn viên tối đa không hợp lệ.";
        if (form.maxAdmissions === "" || Number(form.maxAdmissions) < 0) return "Số tuyển sinh tối đa không hợp lệ.";
        if (form.topRanking === "" || Number(form.topRanking) < 0) return "Thứ hạng ưu tiên không hợp lệ.";
        if (form.packageId != null) {
            const pid = Number(form.packageId);
            if (!Number.isFinite(pid) || pid < 1) {
                return "Cập nhật cần mã gói (packageId) hợp lệ.";
            }
        }
        return null;
    };

    const submit = async () => {
        const validationError = validateForm();
        if (validationError) {
            enqueueSnackbar(validationError, { variant: "warning" });
            return;
        }
        setSubmitting(true);
        try {
            if (isEdit && (form.packageId == null || Number.isNaN(Number(form.packageId)))) {
                enqueueSnackbar("Cập nhật bắt buộc có packageId.", { variant: "warning" });
                setSubmitting(false);
                return;
            }
            const payload = buildPayload(form, isEdit);
            await upsertAdminPackageFee(payload);
            enqueueSnackbar(isEdit ? "Cập nhật gói dịch vụ thành công." : "Tạo gói dịch vụ thành công.", {
                variant: "success",
            });
            closeDialog();
            await load();
        } catch (e) {
            console.error(e);
            enqueueSnackbar(pickHttpErrorMessage(e, "Không thể lưu gói dịch vụ. Vui lòng thử lại."), {
                variant: "error",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 1, md: 2 }, borderRadius: 4, bgcolor: "#ffffff", color: "#1e293b" }}>
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3.5,
                    mb: 2.5,
                    color: "white",
                    background: "linear-gradient(95deg, #2563eb 0%, #3158ef 40%, #6d3df2 72%, #8b3dff 100%)",
                    boxShadow: "0 18px 34px rgba(67, 56, 202, 0.28)",
                }}
            >
                <CardContent sx={{ p: { xs: 2.2, md: 2.8 }, "&:last-child": { pb: { xs: 2.2, md: 2.8 } } }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: alpha("#ffffff", 0.2), color: "white", width: 42, height: 42 }}>
                                <MonetizationOnOutlinedIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                    Quản lý phí gói dịch vụ
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.92, mt: 0.45 }}>
                                    Tạo mới hoặc cập nhật gói ở trạng thái Bản nháp
                                </Typography>
                            </Box>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={openCreateDialog}
                            sx={{
                                textTransform: "none",
                                fontWeight: 700,
                                px: 2,
                                boxShadow: "0 6px 14px rgba(37,99,235,0.35)",
                            }}
                        >
                            Tạo gói mới
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            <Card elevation={0} sx={{ ...adminDataCardBorderSx, borderRadius: 2 }}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1e293b", mb: 1.5 }}>
                        Danh sách gói dịch vụ
                    </Typography>
                    <TableContainer component={Paper} elevation={0} sx={adminTableContainerSx}>
                        <Table
                            size="small"
                            sx={{
                                width: "100%",
                                minWidth: 0,
                                tableLayout: isCompact ? "fixed" : "auto",
                                "& .MuiTableCell-root": {
                                    px: isCompact ? 0.5 : isMobile ? 0.75 : 1.25,
                                    py: isCompact ? 0.7 : isMobile ? 0.9 : 1.1,
                                    fontSize: isCompact ? 11 : isMobile ? 12 : 14,
                                },
                            }}
                        >
                            <TableHead>
                                <TableRow sx={adminTableHeadRowSx}>
                                    <TableCell align="center" sx={adminTableHeadCellSx}>
                                        ID
                                    </TableCell>
                                    <TableCell align="center" sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>
                                        Tên gói
                                    </TableCell>
                                    <TableCell align="center" sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>
                                        Mô tả
                                    </TableCell>
                                    <TableCell align="center" sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>
                                        Giá (VNĐ)
                                    </TableCell>
                                    <TableCell align="center" sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>
                                        Thời hạn (ngày)
                                    </TableCell>
                                    <TableCell align="center" sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>
                                        Trạng thái
                                    </TableCell>
                                    <TableCell align="center" sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>
                                        Chi tiết
                                    </TableCell>
                                    <TableCell align="center" sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>
                                        Thao tác
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                            <CircularProgress size={36} sx={{ color: APP_PRIMARY_MAIN }} />
                                        </TableCell>
                                    </TableRow>
                                ) : sortedItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 4, color: "#64748b" }}>
                                            Chưa có gói dịch vụ nào.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedItems.map((row, idx) => {
                                        const isDraft = row.status === "PACKAGE_DRAFT";
                                        const canDeactive = canDeactivatePackage(row.status);
                                        return (
                                            <TableRow key={`${row.id ?? "new"}-${idx}`} hover sx={adminTableBodyRowSx}>
                                                <TableCell align="center" sx={{ whiteSpace: "nowrap", verticalAlign: "middle" }}>
                                                    {row.id != null ? row.id : "—"}
                                                </TableCell>
                                                <TableCell align="center" sx={{ verticalAlign: "middle", maxWidth: isCompact ? 140 : 280 }}>
                                                    <Typography
                                                        fontWeight={700}
                                                        color="#1e293b"
                                                        sx={{
                                                            textAlign: "center",
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                        }}
                                                    >
                                                        {row.name}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell
                                                    align="center"
                                                    sx={{
                                                        color: "#475569",
                                                        lineHeight: 1.35,
                                                        verticalAlign: "middle",
                                                        maxWidth: isCompact ? 140 : 360,
                                                    }}
                                                >
                                                    <Typography variant="body2" sx={{ fontSize: isCompact ? 11 : 13, textAlign: "center" }}>
                                                        {row.description || "—"}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center" sx={{ whiteSpace: "nowrap", verticalAlign: "middle" }}>
                                                    {row.price != null && !Number.isNaN(Number(row.price)) ? formatVnd(row.price) : "—"}
                                                </TableCell>
                                                <TableCell align="center" sx={{ whiteSpace: "nowrap", verticalAlign: "middle" }}>
                                                    {row.durationDays != null && !Number.isNaN(Number(row.durationDays))
                                                        ? row.durationDays
                                                        : "—"}
                                                </TableCell>
                                                <TableCell align="center" sx={{ whiteSpace: "nowrap", verticalAlign: "middle" }}>
                                                    <Chip
                                                        size="small"
                                                        label={packageStatusLabel(row.status)}
                                                        {...packageStatusChipProps(row.status)}
                                                        sx={{
                                                            maxWidth: "100%",
                                                            "& .MuiChip-label": {
                                                                px: isMobile ? 0.75 : 1,
                                                                fontSize: isMobile ? 11 : 12,
                                                            },
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell align="center" sx={{ whiteSpace: "nowrap", verticalAlign: "middle" }}>
                                                    <Tooltip title="Xem chi tiết">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => openDetailDialog(row)}
                                                            sx={{
                                                                color: "#0f766e",
                                                                border: "1px solid",
                                                                borderColor: "#99f6e4",
                                                                bgcolor: "#f0fdfa",
                                                                borderRadius: 2,
                                                            }}
                                                        >
                                                            <VisibilityOutlinedIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell align="center" sx={{ whiteSpace: "nowrap", verticalAlign: "middle" }}>
                                                    <Stack direction="row" spacing={0.75} justifyContent="center" alignItems="center" flexWrap="wrap" useFlexGap>
                                                        <Tooltip title={isDraft ? "Cập nhật gói" : "Chỉ cập nhật được gói ở trạng thái Bản nháp"}>
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    disabled={!isDraft}
                                                                    onClick={() => openEditDialog(row)}
                                                                    sx={{
                                                                        color: isDraft ? "#2563eb" : "#94a3b8",
                                                                        border: "1px solid",
                                                                        borderColor: isDraft ? "#93c5fd" : "#e2e8f0",
                                                                        bgcolor: isDraft ? "#eff6ff" : "#f8fafc",
                                                                        borderRadius: 2,
                                                                    }}
                                                                >
                                                                    <EditOutlinedIcon fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                        <Tooltip
                                                            title={
                                                                isDraft
                                                                    ? "Công khai gói (khách hàng có thể xem)"
                                                                    : "Gói đã công khai hoặc không thể công khai từ trạng thái này"
                                                            }
                                                        >
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    disabled={!isDraft}
                                                                    onClick={() => openPublishConfirm(row)}
                                                                    sx={{
                                                                        color: isDraft ? "#0369a1" : "#94a3b8",
                                                                        border: "1px solid",
                                                                        borderColor: isDraft ? "#7dd3fc" : "#e2e8f0",
                                                                        bgcolor: isDraft ? "#f0f9ff" : "#f8fafc",
                                                                        borderRadius: 2,
                                                                    }}
                                                                >
                                                                    <FileUploadSharpIcon fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                        <Tooltip
                                                            title={
                                                                canDeactive
                                                                    ? "Ngừng mở bán (gói không còn trên trang chủ để trường mới mua)"
                                                                    : "Chỉ áp dụng cho gói đang hoạt động hoặc đã phát hành"
                                                            }
                                                        >
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    disabled={!canDeactive}
                                                                    onClick={() => openDeactiveConfirm(row)}
                                                                    sx={{
                                                                        color: canDeactive ? "#b91c1c" : "#94a3b8",
                                                                        border: "1px solid",
                                                                        borderColor: canDeactive ? "#fecaca" : "#e2e8f0",
                                                                        bgcolor: canDeactive ? "#fef2f2" : "#f8fafc",
                                                                        borderRadius: 2,
                                                                    }}
                                                                >
                                                                    <BlockSharpIcon fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            <Dialog
                open={detailOpen}
                onClose={closeDetailDialog}
                fullWidth
                maxWidth="md"
                PaperProps={{ sx: adminDialogPaperSx }}
            >
                <DialogTitle
                    component="div"
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        fontWeight: 800,
                        color: "#1e293b",
                        pb: 1.2,
                        pr: 1,
                        bgcolor: "#ffffff",
                        borderBottom: "1px solid #e2e8f0",
                    }}
                >
                    <Typography component="h2" sx={{ fontWeight: 800, fontSize: "1.25rem", lineHeight: 1.3, m: 0 }}>
                        Chi tiết gói dịch vụ
                    </Typography>
                    <IconButton
                        onClick={closeDetailDialog}
                        aria-label="Đóng"
                        size="small"
                        sx={{
                            color: "#475569",
                            "&:hover": { bgcolor: "rgba(255,255,255,0.55)", color: "#1e293b" },
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent
                    dividers
                    sx={{
                        bgcolor: "#ffffff",
                        pt: 2.5,
                        pb: 3,
                        px: { xs: 2, sm: 3 },
                    }}
                >
                    {detailRow && (
                        <Stack spacing={2}>
                            <PackageDetailPriceDurationSection price={detailRow.price} durationDays={detailRow.durationDays} />
                            <PackageDetailInfoSection row={detailRow} />

                            <Box sx={{ pt: 0.5 }}>
                                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 2 }}>
                                    <ExtensionOutlinedIcon sx={{ fontSize: 17, color: "#2563eb" }} />
                                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#2563eb" }}>Tính năng</Typography>
                                </Stack>
                                <PackageFeaturesDetailGrid features={detailRow.features} />
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="md" PaperProps={{ sx: adminDialogPaperSx }}>
                <DialogTitle sx={adminDialogTitleSx}>
                    {isEdit ? "Cập nhật gói dịch vụ (Bản nháp)" : "Tạo gói dịch vụ mới"}
                </DialogTitle>
                <DialogContent dividers sx={adminDialogContentSx}>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Typography variant="subtitle2" sx={{ color: "#1e40af", fontWeight: 700 }}>
                            Thông tin cơ bản
                        </Typography>
                        <TextField label="Tên gói dịch vụ" size="small" value={form.name} onChange={handleChange("name")} fullWidth />
                        <TextField
                            label="Mô tả"
                            size="small"
                            value={form.description}
                            onChange={handleChange("description")}
                            fullWidth
                            multiline
                            minRows={2}
                        />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                            <TextField
                                label="Giá (VNĐ)"
                                type="text"
                                size="small"
                                value={formatVnd(form.price)}
                                onChange={handlePriceVndChange}
                                fullWidth
                                placeholder="Ví dụ: 15.000.000"
                                inputProps={{ inputMode: "numeric", autoComplete: "off" }}
                            />
                            <TextField
                                label="Thời hạn gói (ngày)"
                                type="number"
                                size="small"
                                value={form.durationDays}
                                onChange={handleChange("durationDays")}
                                fullWidth
                                inputProps={{ min: 1 }}
                            />
                        </Stack>
                        <Divider />
                        <Typography variant="subtitle2" sx={{ color: "#1e40af", fontWeight: 700 }}>
                            Cấu hình tính năng
                        </Typography>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                            <TextField
                                label="Số tư vấn viên tối đa"
                                type="number"
                                size="small"
                                value={form.maxCounsellors}
                                onChange={handleChange("maxCounsellors")}
                                fullWidth
                            />
                            <TextField
                                label="Số tuyển sinh tối đa"
                                type="number"
                                size="small"
                                value={form.maxAdmissions}
                                onChange={handleChange("maxAdmissions")}
                                fullWidth
                            />
                            <TextField
                                label="Thứ hạng ưu tiên"
                                type="number"
                                size="small"
                                value={form.topRanking}
                                onChange={handleChange("topRanking")}
                                fullWidth
                            />
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="parent-post-permission-label">Quyền đăng bài của nhà trường</InputLabel>
                                <Select
                                    labelId="parent-post-permission-label"
                                    label="Quyền đăng bài của nhà trường"
                                    value={form.parentPostPermission}
                                    onChange={handleChange("parentPostPermission")}
                                    renderValue={(v) => displayEnum(v)}
                                >
                                    {PARENT_POST_PERMISSIONS.map((v) => (
                                        <MenuItem key={v} value={v}>
                                            {v}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth size="small">
                                <InputLabel id="support-level-label">Mức hỗ trợ</InputLabel>
                                <Select
                                    labelId="support-level-label"
                                    label="Mức hỗ trợ"
                                    value={form.supportLevel}
                                    onChange={handleChange("supportLevel")}
                                    renderValue={(v) => displayEnum(v)}
                                >
                                    {SUPPORT_LEVELS.map((v) => (
                                        <MenuItem key={v} value={v}>
                                            {v}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.2}
                            sx={{ bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 2, px: 1.5, py: 1 }}
                        >
                            <FormControlLabel
                                control={<Switch checked={Boolean(form.allowChat)} onChange={(e) => setForm((prev) => ({ ...prev, allowChat: e.target.checked }))} />}
                                label="Cho phép chat"
                            />
                            <FormControlLabel
                                control={<Switch checked={Boolean(form.isFeatured)} onChange={(e) => setForm((prev) => ({ ...prev, isFeatured: e.target.checked }))} />}
                                label="Đánh dấu nổi bật"
                            />
                        </Stack>
                        <Typography variant="caption" color="#64748b" sx={{ wordBreak: "break-word" }}>
                            Quyền nhà trường hiện tại: {displayEnum(form.parentPostPermission)}
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions sx={adminDialogActionsSx}>
                    <Button onClick={closeDialog} disabled={submitting} sx={{ textTransform: "none" }}>
                        Hủy
                    </Button>
                    <Button variant="contained" onClick={submit} disabled={submitting} sx={{ textTransform: "none", fontWeight: 700 }}>
                        {submitting ? <CircularProgress size={22} color="inherit" /> : isEdit ? "Lưu cập nhật" : "Tạo mới"}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={publishConfirmOpen}
                title="Công khai gói dịch vụ"
                description="Bạn có chắc chắn muốn công khai gói dịch vụ này?"
                extraDescription="Nó sẽ có thể được nhìn thấy bởi khách hàng."
                cancelText="Hủy"
                confirmText={publishLoading ? "Đang xử lý..." : "Công khai"}
                onCancel={closePublishConfirm}
                onConfirm={handleConfirmPublish}
                loading={publishLoading}
                paperSx={{
                    background: "linear-gradient(145deg, #eef7ff 0%, #f8fbff 46%, #ffffff 100%)",
                    border: "1px solid rgba(59,130,246,0.25)",
                }}
                titleSx={{
                    background: "linear-gradient(90deg, rgba(37,99,235,0.2) 0%, rgba(59,130,246,0.14) 100%)",
                    borderBottom: "none",
                }}
            />

            <ConfirmDialog
                open={deactiveConfirmOpen}
                title="Ngừng mở bán gói"
                description="Bạn có chắc chắn muốn ngừng mở bán gói dịch vụ này?"
                extraDescription="Trường đang sử dụng gói vẫn thấy gói ở trạng thái hoạt động. Gói sẽ chuyển sang chờ ngừng bán — không còn hiển thị trên trang chủ để trường mới chọn mua."
                cancelText="Hủy"
                confirmText={deactiveLoading ? "Đang xử lý..." : "Ngừng mở bán"}
                onCancel={closeDeactiveConfirm}
                onConfirm={handleConfirmDeactive}
                loading={deactiveLoading}
                paperSx={{
                    background: "linear-gradient(145deg, #fff1f2 0%, #fffbfb 46%, #ffffff 100%)",
                    border: "1px solid rgba(220,38,38,0.22)",
                }}
                titleSx={{
                    background: "linear-gradient(90deg, rgba(220,38,38,0.14) 0%, rgba(248,113,113,0.1) 100%)",
                    borderBottom: "none",
                }}
                confirmButtonSx={{
                    background: "#dc2626",
                    boxShadow: "0 6px 14px rgba(220,38,38,0.35)",
                    "&:hover": {
                        background: "#b91c1c",
                        boxShadow: "0 8px 16px rgba(220,38,38,0.4)",
                    },
                }}
            />
        </Box>
    );
}
