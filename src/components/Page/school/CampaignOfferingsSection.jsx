import React, { useState, useEffect, useMemo } from "react";
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
    InputLabel,
    Menu,
    MenuItem,
    Select,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Pagination,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import BusinessIcon from "@mui/icons-material/Business";
import CampaignIcon from "@mui/icons-material/Campaign";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SchoolIcon from "@mui/icons-material/School";
import { enqueueSnackbar } from "notistack";
import { extractCampusListBody, listCampuses } from "../../../services/CampusService.jsx";
import { getProgramList } from "../../../services/ProgramService.jsx";
import {
    getCampaignOfferingsByCampus,
    createCampaignOffering,
    updateCampaignOffering,
    updateCampusOfferingStatus,
    closeCampusOffering,
} from "../../../services/CampaignService.jsx";

const LEARNING_MODES = [
    { value: "DAY_SCHOOL", label: "Bán trú (ngày)" },
    { value: "BOARDING", label: "Nội trú" },
    { value: "SEMI_BOARDING", label: "Bán trú có chỗ ở" },
    { value: "HALF_DAY", label: "Nửa ngày" },
];

const APPLICATION_STATUS_OPTIONS = [
    { value: "OPEN", label: "Đang mở" },
    { value: "CLOSED", label: "Đã đóng" },
    { value: "PAUSED", label: "Tạm dừng" },
    { value: "FULL", label: "Đầy chỗ" },
];

const APPLICATION_STATUS_BADGES = {
    OPEN: { badgeBg: "rgba(34, 197, 94, 0.16)", badgeColor: "#16a34a" }, // green
    PAUSED: { badgeBg: "rgba(250, 204, 21, 0.22)", badgeColor: "#a16207" }, // amber
    FULL: { badgeBg: "rgba(239, 68, 68, 0.14)", badgeColor: "#dc2626" }, // red
    CLOSED: { badgeBg: "rgba(148, 163, 184, 0.22)", badgeColor: "#475569" }, // slate
};

/** Trạng thái vòng đời chỉ tiêu (field `status` từ API) */
const OFFERING_STATUS_LABELS = {
    OPEN: "Đang mở",
    PAUSED: "Tạm dừng",
    CLOSED: "Đã đóng",
    FULL: "Đầy chỗ",
    EXPIRED: "Hết hạn",
};

function getOfferingStatusLabel(status) {
    const s = String(status || "").toUpperCase();
    return OFFERING_STATUS_LABELS[s] ?? (s || "—");
}

function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN");
}

function formatCurrency(n) {
    if (n == null || n === "") return "—";
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(Number(n));
}

/** Nhóm nội dung trong dialog chi tiết (theo domain). */
const DETAIL_SECTIONS = [
    {
        id: "campaign",
        title: "Chiến dịch tuyển sinh",
        Icon: CampaignIcon,
        fields: [
            { key: "campaignYear", label: "Năm chiến dịch" },
            { key: "campaignName", label: "Tên chiến dịch" },
            { key: "status", label: "Trạng thái chiến dịch" },
        ],
    },
    {
        id: "offering",
        title: "Chỉ tiêu tuyển sinh",
        Icon: AssignmentTurnedInIcon,
        fields: [
            { key: "learningMode", label: "Hình thức học" },
            { key: "priceAdjustmentPercentage", label: "Điều chỉnh học phí (%)" },
            { key: "quota", label: "Chỉ tiêu" },
            { key: "remainingQuota", label: "Chỉ tiêu còn lại" },
            { key: "openDate", label: "Ngày mở nhận hồ sơ" },
            { key: "closeDate", label: "Ngày đóng nhận hồ sơ" },
            { key: "applicationStatus", label: "Trạng thái hồ sơ" },
            { key: "tuitionFee", label: "Học phí áp dụng" },
        ],
    },
    {
        id: "campus",
        title: "Cơ sở",
        Icon: BusinessIcon,
        fields: [
            { key: "campusName", label: "Tên cơ sở" },
            { key: "city", label: "Thành phố" },
            { key: "latitude", label: "Vĩ độ" },
            { key: "longitude", label: "Kinh độ" },
            { key: "district", label: "Quận / huyện" },
        ],
    },
    {
        id: "program",
        title: "Chương trình",
        Icon: SchoolIcon,
        fields: [
            { key: "enrollmentYear", label: "Năm nhập học" },
            { key: "programName", label: "Tên chương trình" },
            { key: "baseTuitionFee", label: "Học phí gốc" },
        ],
    },
    {
        id: "curriculum",
        title: "Chương trình đào tạo",
        Icon: MenuBookIcon,
        fields: [{ key: "curriculumType", label: "Loại chương trình" }],
    },
];

const emptyForm = {
    campusId: "",
    programId: "",
    learningMode: "DAY_SCHOOL",
    quota: "",
    tuitionFee: "",
    priceAdjustmentPercentage: "0",
    openDate: "",
    closeDate: "",
};

/**
 * @param {{
 *   campaignId: number,
 *   campaignPaused: boolean,
 *   canMutate: boolean,
 * }} props
 */
export default function CampaignOfferingsSection({
    campaignId,
    campaignPaused,
    canMutate,
}) {
    const [campuses, setCampuses] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [campusesLoading, setCampusesLoading] = useState(true);
    const [programsLoading, setProgramsLoading] = useState(true);
    const [campusFilter, setCampusFilter] = useState("");
    const [programFilter, setProgramFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(0);
    const pageSize = 8;
    const [rawItems, setRawItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [listNonce, setListNonce] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRow, setEditingRow] = useState(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [formValues, setFormValues] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState({});
    const [detailRow, setDetailRow] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [confirmActionOpen, setConfirmActionOpen] = useState(false);
    const [confirmActionType, setConfirmActionType] = useState(null); // "toggle" | "close"
    const [confirmTargetStatus, setConfirmTargetStatus] = useState(null); // targetStatus for toggle
    const [confirmRow, setConfirmRow] = useState(null);
    const [confirmActionLoading, setConfirmActionLoading] = useState(false);
    const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
    const [actionMenuRow, setActionMenuRow] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setCampusesLoading(true);
        listCampuses()
            .then((res) => {
                if (cancelled) return;
                const list = extractCampusListBody(res);
                const arr = Array.isArray(list)
                    ? list.map((c) => ({ id: c.id ?? c.campusId, name: c.name ?? "Cơ sở" }))
                    : [];
                setCampuses(arr);
                if (arr.length > 0 && !campusFilter) setCampusFilter(String(arr[0].id));
            })
            .catch(() => {
                if (!cancelled) enqueueSnackbar("Không tải được danh sách cơ sở", { variant: "error" });
            })
            .finally(() => {
                if (!cancelled) setCampusesLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        setProgramsLoading(true);
        getProgramList(0, 200)
            .then((res) => {
                if (cancelled) return;
                const body = res?.data?.body ?? res?.body ?? res?.data;
                const list = body?.items ?? body;
                const arr = Array.isArray(list)
                    ? list.map((p) => ({
                          id: p.id ?? p.programId,
                          name:
                              p.programName ??
                              (p.name != null && String(p.name).trim() !== "" ? p.name : null) ??
                              p.curriculumName ??
                              `Chương trình #${p.id}`,
                      }))
                    : [];
                setPrograms(arr.filter((p) => p.id != null));
            })
            .catch(() => {
                if (!cancelled) enqueueSnackbar("Không tải được chương trình", { variant: "error" });
            })
            .finally(() => {
                if (!cancelled) setProgramsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!campusFilter || !campaignId) {
            setRawItems([]);
            return;
        }
        let cancelled = false;
        setLoading(true);
        const aggregatePages = async () => {
            const acc = [];
            let p = 0;
            const batchSize = 50;
            try {
                while (!cancelled) {
                    const res = await getCampaignOfferingsByCampus(parseInt(campusFilter, 10), {
                        page: p,
                        pageSize: batchSize,
                    });
                    const body = res?.data?.body ?? res?.data;
                    const chunk = Array.isArray(body) ? body : body?.items ?? [];
                    const forCampaign = chunk.filter(
                        (row) => Number(row.campaignId) === Number(campaignId)
                    );
                    acc.push(...forCampaign);
                    if (chunk.length === 0) break;
                    if (chunk.length < batchSize) break;
                    if (body?.hasNext === false) break;
                    p += 1;
                    if (p > 40) break;
                }
                if (!cancelled) setRawItems(acc);
            } catch (err) {
                if (!cancelled) {
                    console.error("Fetch offerings error:", err);
                    enqueueSnackbar(
                        err?.response?.data?.message || "Không tải được danh sách chỉ tiêu",
                        { variant: "error" }
                    );
                    setRawItems([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        aggregatePages();
        return () => {
            cancelled = true;
        };
    }, [campusFilter, campaignId, listNonce]);

    const filteredItems = useMemo(() => {
        let list = rawItems;
        if (programFilter !== "all") {
            const pid = parseInt(programFilter, 10);
            list = list.filter((r) => Number(r.programId) === pid);
        }
        if (statusFilter !== "all") {
            list = list.filter(
                (r) =>
                    String(r.applicationStatus || "").toUpperCase() === statusFilter ||
                    String(r.status || "").toUpperCase() === statusFilter
            );
        }
        return list;
    }, [rawItems, programFilter, statusFilter]);

    const items = useMemo(() => {
        const start = page * pageSize;
        return filteredItems.slice(start, start + pageSize);
    }, [filteredItems, page, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

    useEffect(() => {
        setPage(0);
    }, [campusFilter, programFilter, statusFilter]);

    const getLearningModeLabel = (mode) =>
        LEARNING_MODES.find((m) => m.value === mode)?.label ?? mode ?? "—";
    const getApplicationStatusLabel = (s) =>
        APPLICATION_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s ?? "—";

    const getApplicationStatusBadgeStyle = (s) => {
        const key = String(s || "").toUpperCase();
        return APPLICATION_STATUS_BADGES[key] ?? { badgeBg: "#f1f5f9", badgeColor: "#64748b" };
    };

    const getProgramName = (id) =>
        programs.find((p) => Number(p.id) === Number(id))?.name ?? id ?? "—";

    const formatDetailValue = (key, value) => {
        if (value === null || value === undefined || value === "") return "—";
        if (key === "tuitionFee" || key === "baseTuitionFee") return formatCurrency(value);
        if (key === "openDate" || key === "closeDate") return formatDate(value);
        if (key === "learningMode") return getLearningModeLabel(value);
        if (key === "applicationStatus")
            return getApplicationStatusLabel(String(value || "").toUpperCase());
        if (key === "status") return getOfferingStatusLabel(String(value || "").toUpperCase());
        if (key === "priceAdjustmentPercentage") {
            const n = Number(value);
            return Number.isFinite(n) ? `${n}%` : String(value);
        }
        if (key === "latitude" || key === "longitude") {
            const n = Number(value);
            return Number.isFinite(n) ? n.toFixed(6) : String(value);
        }
        if (typeof value === "object") return JSON.stringify(value);
        return String(value);
    };

    const validateForm = () => {
        const errors = {};
        if (!formValues.campusId) errors.campusId = "Vui lòng chọn cơ sở";
        if (!formValues.programId) errors.programId = "Vui lòng chọn chương trình";
        if (formValues.quota === "" || Number(formValues.quota) < 0) errors.quota = "Chỉ tiêu không hợp lệ";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const openCreate = () => {
        setEditingRow(null);
        setFormValues({
            ...emptyForm,
            campusId: campusFilter || (campuses[0]?.id != null ? String(campuses[0].id) : ""),
        });
        setFormErrors({});
        setModalOpen(true);
    };

    const openEdit = (row) => {
        setEditingRow(row);
        setFormValues({
            campusId: String(row.campusId ?? ""),
            programId: String(row.programId ?? ""),
            learningMode: row.learningMode || "DAY_SCHOOL",
            quota: row.quota != null ? String(row.quota) : "",
            tuitionFee: row.tuitionFee != null ? String(row.tuitionFee) : "",
            priceAdjustmentPercentage:
                row.priceAdjustmentPercentage != null ? String(row.priceAdjustmentPercentage) : "0",
            openDate: row.openDate?.slice(0, 10) || "",
            closeDate: row.closeDate?.slice(0, 10) || "",
        });
        setFormErrors({});
        setModalOpen(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormValues((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        const isEditingReadOnly = !!editingRow && String(editingRow.applicationStatus || "").toUpperCase() === "CLOSED";
        if (isEditingReadOnly) return;
        if (!validateForm() || !campaignId) return;
        setSubmitLoading(true);
        try {
            if (editingRow) {
                const res = await updateCampaignOffering({
                    id: editingRow.id,
                    admissionCampaignId: campaignId,
                    campusId: Number(formValues.campusId),
                    programId: Number(formValues.programId),
                    quota: Number(formValues.quota) || 0,
                    learningMode: formValues.learningMode || "DAY_SCHOOL",
                    tuitionFee: Number(formValues.tuitionFee) || 0,
                    openDate: formValues.openDate || "",
                    closeDate: formValues.closeDate || "",
                });
                if (res?.status === 200 || res?.data?.message) {
                    enqueueSnackbar(res?.data?.message || "Cập nhật chỉ tiêu thành công", {
                        variant: "success",
                    });
                    setModalOpen(false);
                    setListNonce((n) => n + 1);
                } else {
                    enqueueSnackbar(res?.data?.message || "Cập nhật chỉ tiêu thất bại", { variant: "error" });
                }
            } else {
                const res = await createCampaignOffering({
                    admissionCampaignId: campaignId,
                    campusId: Number(formValues.campusId),
                    programId: Number(formValues.programId),
                    quota: Number(formValues.quota) || 0,
                    learningMode: formValues.learningMode || "DAY_SCHOOL",
                    priceAdjustmentPercentage: Number(formValues.priceAdjustmentPercentage) || 0,
                    openDate: formValues.openDate || "",
                    closeDate: formValues.closeDate || "",
                });
                if (res?.status === 200 || res?.data?.message != null) {
                    enqueueSnackbar(res?.data?.message || "Tạo chỉ tiêu thành công", { variant: "success" });
                    setModalOpen(false);
                    setPage(0);
                    setListNonce((n) => n + 1);
                } else {
                    enqueueSnackbar(res?.data?.message || "Tạo chỉ tiêu thất bại", { variant: "error" });
                }
            }
        } catch (err) {
            enqueueSnackbar(err?.response?.data?.message || "Thao tác thất bại", { variant: "error" });
        } finally {
            setSubmitLoading(false);
        }
    };

    const rowMuted = campaignPaused;

    const programOptions = useMemo(() => programs, [programs]);
    const isEditingReadOnly =
        !!editingRow && String(editingRow.applicationStatus || "").toUpperCase() === "CLOSED";

    const openConfirmToggle = (row, targetStatus) => {
        setConfirmRow(row);
        setConfirmTargetStatus(targetStatus);
        setConfirmActionType("toggle");
        setConfirmActionOpen(true);
    };

    const openConfirmClose = (row) => {
        setConfirmRow(row);
        setConfirmTargetStatus(null);
        setConfirmActionType("close");
        setConfirmActionOpen(true);
    };

    const openActionMenu = (e, row) => {
        e.stopPropagation();
        setActionMenuRow(row);
        setActionMenuAnchorEl(e.currentTarget);
    };

    const closeActionMenu = () => {
        setActionMenuAnchorEl(null);
        setActionMenuRow(null);
    };

    const handleConfirmAction = async () => {
        if (!confirmRow || !confirmActionType) return;
        setConfirmActionLoading(true);
        try {
            if (confirmActionType === "toggle") {
                await updateCampusOfferingStatus(confirmRow.id, confirmTargetStatus);
                enqueueSnackbar(
                    confirmTargetStatus === "PAUSED" ? "Đã tạm dừng nhận hồ sơ." : "Đã mở lại nhận hồ sơ.",
                    { variant: "success" }
                );
            } else if (confirmActionType === "close") {
                await closeCampusOffering(confirmRow.id);
                enqueueSnackbar("Đã đóng chương trình.", { variant: "success" });
            }
            setConfirmActionOpen(false);
            setConfirmActionType(null);
            setConfirmTargetStatus(null);
            setConfirmRow(null);
            setListNonce((n) => n + 1);
        } catch (err) {
            enqueueSnackbar(err?.response?.data?.message || "Thao tác thất bại", { variant: "error" });
        } finally {
            setConfirmActionLoading(false);
        }
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
                sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "stretch", sm: "center" },
                    justifyContent: "space-between",
                    gap: 2,
                }}
            >
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b" }}>
                        Chỉ tiêu tuyển sinh
                    </Typography>
                    {campaignPaused && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                            Chiến dịch đang tạm dừng — cột «Trạng thái» phản ánh dữ liệu từ hệ thống (thường là Tạm
                            dừng).
                        </Typography>
                    )}
                </Box>
                {canMutate && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={openCreate}
                        disabled={!campusFilter}
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            bgcolor: "#0D64DE",
                            alignSelf: { xs: "stretch", sm: "auto" },
                        }}
                    >
                        Thêm chỉ tiêu
                    </Button>
                )}
            </Box>

            <Card
                elevation={0}
                sx={{
                    borderRadius: 2,
                    border: "1px solid #e2e8f0",
                    bgcolor: "#fff",
                    boxShadow: "0 1px 3px rgba(51,65,85,0.06)",
                }}
            >
                <CardContent sx={{ py: 2 }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2} flexWrap="wrap">
                        <FormControl size="small" sx={{ minWidth: 200 }} disabled={campusesLoading}>
                            <InputLabel>Cơ sở</InputLabel>
                            <Select
                                value={campusFilter}
                                label="Cơ sở"
                                onChange={(e) => setCampusFilter(e.target.value)}
                                sx={{ borderRadius: 2, bgcolor: "#f8fafc" }}
                            >
                                {campuses.map((c) => (
                                    <MenuItem key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 200 }} disabled={programsLoading}>
                            <InputLabel>Chương trình</InputLabel>
                            <Select
                                value={programFilter}
                                label="Chương trình"
                                onChange={(e) => setProgramFilter(e.target.value)}
                                sx={{ borderRadius: 2, bgcolor: "#f8fafc" }}
                            >
                                <MenuItem value="all">Tất cả</MenuItem>
                                {programOptions.map((p) => (
                                    <MenuItem key={p.id} value={String(p.id)}>
                                        {p.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                            <InputLabel>Trạng thái hồ sơ</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Trạng thái hồ sơ"
                                onChange={(e) => setStatusFilter(e.target.value)}
                                sx={{ borderRadius: 2, bgcolor: "#f8fafc" }}
                            >
                                <MenuItem value="all">Tất cả</MenuItem>
                                {APPLICATION_STATUS_OPTIONS.map((o) => (
                                    <MenuItem key={o.value} value={o.value}>
                                        {o.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </CardContent>
            </Card>

            <Card
                elevation={0}
                sx={{
                    borderRadius: 2,
                    border: "1px solid #e2e8f0",
                    overflow: "hidden",
                    bgcolor: "#fff",
                    boxShadow: "0 1px 3px rgba(51,65,85,0.06)",
                }}
            >
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                <TableCell sx={{ fontWeight: 700 }}>Cơ sở</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Chương trình</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Hình thức</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Chỉ tiêu / Còn lại</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Học phí</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Hồ sơ</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Mở — Đóng</TableCell>
                                {canMutate && (
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                                        Thao tác
                                    </TableCell>
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: canMutate ? 8 : 7 }).map((__, j) => (
                                            <TableCell key={j}>
                                                <Skeleton variant="text" width="80%" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={canMutate ? 8 : 7} align="center" sx={{ py: 6 }}>
                                        <Typography color="text.secondary">Chưa có chỉ tiêu cho bộ lọc này.</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        hover
                                        onClick={() => {
                                            setDetailRow(row);
                                            setDetailOpen(true);
                                        }}
                                        sx={{
                                            cursor: "pointer",
                                            opacity: rowMuted ? 0.72 : 1,
                                            bgcolor: rowMuted ? "rgba(250, 204, 21, 0.06)" : "inherit",
                                        }}
                                    >
                                        <TableCell>{row.campusName ?? "—"}</TableCell>
                                        <TableCell>{row.programName ?? getProgramName(row.programId)}</TableCell>
                                        <TableCell>{getLearningModeLabel(row.learningMode)}</TableCell>
                                        <TableCell>
                                            {row.quota ?? "—"} / {row.remainingQuota ?? "—"}
                                        </TableCell>
                                        <TableCell>{formatCurrency(row.tuitionFee)}</TableCell>
                                        <TableCell>
                                            {(() => {
                                                const label = getApplicationStatusLabel(row.applicationStatus);
                                                const { badgeBg, badgeColor } = getApplicationStatusBadgeStyle(
                                                    row.applicationStatus
                                                );
                                                return (
                                                    <Box
                                                        component="span"
                                                        sx={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            px: 1.2,
                                                            py: 0.4,
                                                            borderRadius: "999px",
                                                            fontSize: 12,
                                                            fontWeight: 800,
                                                            lineHeight: 1,
                                                            color: badgeColor,
                                                            bgcolor: badgeBg,
                                                        }}
                                                    >
                                                        {label}
                                                    </Box>
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(row.openDate)} — {formatDate(row.closeDate)}
                                        </TableCell>
                                        {canMutate && (
                                            <TableCell align="right">
                                                <Stack direction="row" spacing={1.2} justifyContent="flex-end">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openEdit(row);
                                                        }}
                                                        aria-label="Sửa chỉ tiêu"
                                                        sx={{ color: "#0D64DE" }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>

                                                    {((String(row.applicationStatus || "").toUpperCase() === "OPEN" ||
                                                        String(row.applicationStatus || "").toUpperCase() === "PAUSED") ||
                                                        (["OPEN", "PAUSED"].includes(
                                                            String(row.applicationStatus || "").toUpperCase()
                                                        ) &&
                                                            !["CLOSED", "FULL"].includes(String(row.status || "").toUpperCase()))) && (
                                                        <IconButton
                                                            size="small"
                                                            aria-label="Thao tác khác"
                                                            onClick={(e) => openActionMenu(e, row)}
                                                            disabled={confirmActionLoading}
                                                            sx={{ color: "#64748b" }}
                                                        >
                                                            <MoreVertIcon fontSize="small" />
                                                        </IconButton>
                                                    )}
                                                </Stack>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {filteredItems.length > pageSize && (
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            p: 2,
                            borderTop: "1px solid #e2e8f0",
                        }}
                    >
                        <Pagination
                            count={totalPages}
                            page={page + 1}
                            onChange={(_, p) => setPage(p - 1)}
                            color="primary"
                            shape="rounded"
                        />
                    </Box>
                )}
            </Card>

            <Dialog
                open={detailOpen}
                onClose={() => {
                    setDetailOpen(false);
                    setDetailRow(null);
                }}
                fullWidth
                maxWidth="lg"
                scroll="paper"
                PaperProps={{
                    sx: { borderRadius: "16px", boxShadow: "0 24px 48px rgba(0,0,0,0.12)" },
                }}
                slotProps={{ backdrop: { sx: { backdropFilter: "blur(6px)" } } }}
            >
                <DialogTitle sx={{ fontWeight: 700, pr: 6 }}>Chi tiết chỉ tiêu</DialogTitle>
                <IconButton
                    aria-label="Đóng"
                    onClick={() => {
                        setDetailOpen(false);
                        setDetailRow(null);
                    }}
                    sx={{ position: "absolute", right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
                <DialogContent dividers sx={{ pt: 2, pb: 2 }}>
                    <Stack spacing={2.5}>
                        {DETAIL_SECTIONS.map(({ id, title, Icon: SectionIcon, fields }) => (
                            <Card
                                key={id}
                                elevation={0}
                                sx={{
                                    borderRadius: "14px",
                                    border: "1px solid #e2e8f0",
                                    overflow: "hidden",
                                    boxShadow: "0 1px 3px rgba(51,65,85,0.06)",
                                }}
                            >
                                <Box
                                    sx={{
                                        px: 2,
                                        py: 1.25,
                                        borderBottom: "1px solid #e2e8f0",
                                        bgcolor: "rgba(13, 100, 222, 0.06)",
                                    }}
                                >
                                    <Stack direction="row" alignItems="center" spacing={1.5}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                width: 44,
                                                height: 44,
                                                borderRadius: "12px",
                                                bgcolor: "rgba(13, 100, 222, 0.14)",
                                                color: "#0D64DE",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <SectionIcon sx={{ fontSize: 26 }} aria-hidden />
                                        </Box>
                                        <Typography
                                            variant="subtitle1"
                                            sx={{ fontWeight: 700, color: "#1e293b", minWidth: 0 }}
                                        >
                                            {title}
                                        </Typography>
                                    </Stack>
                                </Box>
                                <CardContent sx={{ pt: 2, "&:last-child": { pb: 2 } }}>
                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: {
                                                xs: "1fr",
                                                sm: "repeat(2, minmax(0, 1fr))",
                                            },
                                            gap: 1.5,
                                        }}
                                    >
                                        {fields.map(({ key, label }) => (
                                            <Box
                                                key={key}
                                                sx={{
                                                    border: "1px solid #e8eef5",
                                                    borderRadius: "12px",
                                                    p: 1.5,
                                                    bgcolor: "#f8fafc",
                                                }}
                                            >
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{ display: "block", mb: 0.5 }}
                                                >
                                                    {label}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: "#1e293b",
                                                        wordBreak: "break-word",
                                                    }}
                                                >
                                                    {formatDetailValue(key, detailRow?.[key])}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button
                        onClick={() => {
                            setDetailOpen(false);
                            setDetailRow(null);
                        }}
                        sx={{ textTransform: "none" }}
                    >
                        Đóng
                    </Button>
                    {canMutate && detailRow && (
                        <Button
                            variant="contained"
                            onClick={() => {
                                openEdit(detailRow);
                                setDetailOpen(false);
                                setDetailRow(null);
                            }}
                            sx={{ textTransform: "none", fontWeight: 600, bgcolor: "#0D64DE", borderRadius: 2 }}
                        >
                            Sửa chỉ tiêu
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            <Dialog
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    sx: { borderRadius: "16px", boxShadow: "0 24px 48px rgba(0,0,0,0.12)" },
                }}
                slotProps={{ backdrop: { sx: { backdropFilter: "blur(6px)" } } }}
            >
                <Box sx={{ px: 3, pt: 3, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {editingRow ? "Sửa chỉ tiêu" : "Thêm chỉ tiêu"}
                    </Typography>
                    <IconButton size="small" onClick={() => setModalOpen(false)} aria-label="Đóng">
                        <CloseIcon />
                    </IconButton>
                </Box>
                <DialogContent>
                    <Stack spacing={2}>
                        <FormControl fullWidth size="small" error={!!formErrors.campusId}>
                            <InputLabel>Cơ sở</InputLabel>
                            <Select
                                name="campusId"
                                value={formValues.campusId}
                                label="Cơ sở"
                                onChange={handleChange}
                                disabled={!!editingRow}
                                sx={{ borderRadius: 2 }}
                            >
                                {campuses.map((c) => (
                                    <MenuItem key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small" error={!!formErrors.programId}>
                            <InputLabel>Chương trình</InputLabel>
                            <Select
                                name="programId"
                                value={formValues.programId}
                                label="Chương trình"
                                onChange={handleChange}
                                disabled={!!editingRow}
                                sx={{ borderRadius: 2 }}
                            >
                                {programs.map((p) => (
                                    <MenuItem key={p.id} value={String(p.id)}>
                                        {p.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <InputLabel>Hình thức học</InputLabel>
                            <Select
                                name="learningMode"
                                value={formValues.learningMode}
                                label="Hình thức học"
                                onChange={handleChange}
                                disabled={isEditingReadOnly}
                                sx={{ borderRadius: 2 }}
                            >
                                {LEARNING_MODES.map((m) => (
                                    <MenuItem key={m.value} value={m.value}>
                                        {m.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Chỉ tiêu"
                            name="quota"
                            type="number"
                            fullWidth
                            size="small"
                            value={formValues.quota}
                            onChange={handleChange}
                            error={!!formErrors.quota}
                            helperText={formErrors.quota}
                            disabled={isEditingReadOnly}
                            inputProps={{ min: 0 }}
                        />
                        {editingRow ? (
                            <TextField
                                label="Học phí (VNĐ)"
                                name="tuitionFee"
                                type="number"
                                fullWidth
                                size="small"
                                value={formValues.tuitionFee}
                                onChange={handleChange}
                                disabled={isEditingReadOnly}
                                inputProps={{ min: 0 }}
                                helperText={
                                    editingRow.baseTuitionFee != null
                                        ? `Học phí gốc chương trình: ${formatCurrency(editingRow.baseTuitionFee)}`
                                        : undefined
                                }
                            />
                        ) : (
                            <TextField
                                label="Điều chỉnh học phí (%)"
                                name="priceAdjustmentPercentage"
                                type="number"
                                fullWidth
                                size="small"
                                value={formValues.priceAdjustmentPercentage}
                                onChange={handleChange}
                                inputProps={{ min: 0, max: 100 }}
                                helperText="Áp dụng trên học phí gốc của chương trình (API tạo chỉ tiêu)"
                            />
                        )}
                        <TextField
                            label="Ngày mở"
                            name="openDate"
                            type="date"
                            fullWidth
                            size="small"
                            value={formValues.openDate}
                            onChange={handleChange}
                            InputLabelProps={{ shrink: true }}
                            disabled={isEditingReadOnly}
                        />
                        <TextField
                            label="Ngày đóng"
                            name="closeDate"
                            type="date"
                            fullWidth
                            size="small"
                            value={formValues.closeDate}
                            onChange={handleChange}
                            InputLabelProps={{ shrink: true }}
                            disabled={isEditingReadOnly}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e2e8f0" }}>
                    <Button onClick={() => setModalOpen(false)} sx={{ textTransform: "none" }}>
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={submitLoading || isEditingReadOnly}
                        sx={{ textTransform: "none", fontWeight: 600, bgcolor: "#0D64DE", borderRadius: 2 }}
                    >
                        {submitLoading ? "Đang lưu…" : editingRow ? "Lưu" : "Tạo"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Menu
                anchorEl={actionMenuAnchorEl}
                open={Boolean(actionMenuAnchorEl)}
                onClose={closeActionMenu}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{
                    paper: { sx: { borderRadius: 2, minWidth: 220 } },
                }}
            >
                {actionMenuRow &&
                    String(actionMenuRow.applicationStatus || "").toUpperCase() === "OPEN" && (
                        <MenuItem
                            onClick={() => {
                                closeActionMenu();
                                openConfirmToggle(actionMenuRow, "PAUSED");
                            }}
                            disabled={confirmActionLoading}
                        >
                            Tạm dừng
                        </MenuItem>
                    )}

                {actionMenuRow &&
                    String(actionMenuRow.applicationStatus || "").toUpperCase() === "PAUSED" && (
                        <MenuItem
                            onClick={() => {
                                closeActionMenu();
                                openConfirmToggle(actionMenuRow, "OPEN");
                            }}
                            disabled={confirmActionLoading}
                        >
                            Mở lại
                        </MenuItem>
                    )}

                {actionMenuRow &&
                    ["OPEN", "PAUSED"].includes(
                        String(actionMenuRow.applicationStatus || "").toUpperCase()
                    ) &&
                    !["CLOSED", "FULL"].includes(String(actionMenuRow.status || "").toUpperCase()) && (
                        <MenuItem
                            onClick={() => {
                                closeActionMenu();
                                openConfirmClose(actionMenuRow);
                            }}
                            disabled={confirmActionLoading}
                        >
                            Đóng chương trình
                        </MenuItem>
                    )}
            </Menu>

            <Dialog
                open={confirmActionOpen}
                onClose={() => {
                    if (!confirmActionLoading) setConfirmActionOpen(false);
                }}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    sx: { borderRadius: "16px", boxShadow: "0 24px 48px rgba(0,0,0,0.12)" },
                }}
                slotProps={{ backdrop: { sx: { backdropFilter: "blur(6px)" } } }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>
                    {confirmActionType === "toggle" ? "Xác nhận thao tác" : "Xác nhận đóng chương trình"}
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        {confirmActionType === "toggle" &&
                            (confirmTargetStatus === "PAUSED"
                                ? "Bạn có chắc chắn muốn tạm dừng nhận hồ sơ? Khi tạm dừng, chương trình sẽ không còn nhận hồ sơ mới."
                                : "Bạn có chắc chắn muốn mở lại nhận hồ sơ?")}
                        {confirmActionType === "close" &&
                            "Bạn có chắc chắn muốn đóng chương trình này? Sau khi đóng sẽ không nhận thêm hồ sơ."}
                    </Typography>
                    {confirmRow && (
                        <Box sx={{ mt: 2, border: "1px solid #e2e8f0", borderRadius: 2, p: 2, bgcolor: "#f8fafc" }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                                Thông tin
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {confirmRow.programName ?? getProgramName(confirmRow.programId)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {confirmRow.campusName ?? "—"} · Chỉ tiêu: {confirmRow.quota ?? "—"} · Còn lại:{" "}
                                {confirmRow.remainingQuota ?? "—"}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button
                        onClick={() => {
                            if (!confirmActionLoading) setConfirmActionOpen(false);
                        }}
                        sx={{ textTransform: "none" }}
                        disabled={confirmActionLoading}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirmAction}
                        disabled={confirmActionLoading}
                        sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#0D64DE", borderRadius: 2 }}
                    >
                        {confirmActionLoading ? "Đang xử lý…" : "Xác nhận"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
