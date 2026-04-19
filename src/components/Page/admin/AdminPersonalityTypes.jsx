import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    DialogActions,
    Divider,
    FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    Link,
    MenuItem,
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
    Dialog,
    DialogTitle,
    DialogContent,
    Pagination,
    alpha,
} from "@mui/material";
import {
    adminDialogActionsSx,
    adminDialogPaperSx,
    adminDialogTitleSx,
} from "../../../constants/adminDialogStyles.js";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import FormatQuoteOutlinedIcon from "@mui/icons-material/FormatQuoteOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import { enqueueSnackbar } from "notistack";
import {
    getAdminPersonalityTypes,
    patchAdminPersonalityTypeStatus,
    postAdminPersonalityType,
} from "../../../services/AdminService.jsx";
import ConfirmDialog, { ConfirmHighlight } from "../../ui/ConfirmDialog.jsx";
import { APP_PRIMARY_MAIN } from "../../../constants/homeLandingTheme";
import {
    adminDataCardBorderSx,
    adminTableBodyRowSx,
    adminTableContainerSx,
    adminTableHeadCellSx,
    adminTableHeadRowSx,
} from "../../../constants/adminTableStyles.js";

const STATUS_ACTIVE = "PERSONALITY_TYPE_ACTIVE";
const STATUS_INACTIVE = "PERSONALITY_TYPE_INACTIVE";
const PAGE_SIZE = 5;

const GROUP_PALETTE = {
    ANALYST: { main: "#88619a", soft: "rgba(136, 97, 154, 0.14)" },
    DIPLOMAT: { main: "#33a474", soft: "rgba(51, 164, 116, 0.14)" },
    SENTINEL: { main: "#4298b4", soft: "rgba(66, 152, 180, 0.14)" },
    EXPLORER: { main: "#e2a03f", soft: "rgba(226, 160, 63, 0.16)" },
};

const PERSONALITY_GROUP_OPTIONS = Object.freeze(Object.keys(GROUP_PALETTE));

function pickHttpErrorMessage(error, fallback) {
    const d = error?.response?.data;
    if (d == null || typeof d !== "object") return fallback;
    const m = d.message;
    if (typeof m === "string" && m.trim()) return m.trim();
    if (Array.isArray(m) && m.length) return m.filter((x) => x != null && String(x).trim()).join(" ");
    if (typeof d.error === "string" && d.error.trim()) return d.error.trim();
    return fallback;
}

function resolveGroupKey(personalityTypeGroup, groupLabel) {
    const g = String(personalityTypeGroup || "").toUpperCase();
    if (g.includes("ANALYST")) return "ANALYST";
    if (g.includes("DIPLOMAT")) return "DIPLOMAT";
    if (g.includes("SENTINEL")) return "SENTINEL";
    if (g.includes("EXPLORER")) return "EXPLORER";
    const t = String(groupLabel || "").toLowerCase();
    if (t.includes("phân tích")) return "ANALYST";
    if (t.includes("ngoại giao")) return "DIPLOMAT";
    if (t.includes("bảo vệ")) return "SENTINEL";
    if (t.includes("thám hiểm")) return "EXPLORER";
    return "ANALYST";
}

function groupChipSx(personalityTypeGroup, groupLabel) {
    const key = resolveGroupKey(personalityTypeGroup, groupLabel);
    const { main, soft } = GROUP_PALETTE[key] || GROUP_PALETTE.ANALYST;
    return {
        fontWeight: 700,
        letterSpacing: 0.02,
        color: main,
        bgcolor: soft,
        border: `1px solid ${alpha(main, 0.35)}`,
    };
}

function flattenBody(body) {
    if (!body || typeof body !== "object") return [];
    const rows = [];
    for (const [groupLabel, items] of Object.entries(body)) {
        if (!Array.isArray(items)) continue;
        for (const item of items) {
            rows.push({
                ...item,
                _groupLabel: groupLabel,
            });
        }
    }
    return rows;
}

export default function AdminPersonalityTypes() {
    const [rawBody, setRawBody] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [groupFilter, setGroupFilter] = useState("");
    const [detailRow, setDetailRow] = useState(null);
    const [deleteRow, setDeleteRow] = useState(null);
    const [statusUpdatingIds, setStatusUpdatingIds] = useState(() => new Set());
    const [page, setPage] = useState(1);
    const [addOpen, setAddOpen] = useState(false);

    const allRows = useMemo(() => flattenBody(rawBody), [rawBody]);

    const groupOptions = useMemo(() => {
        if (!rawBody || typeof rawBody !== "object") return [];
        return Object.keys(rawBody).filter((k) => Array.isArray(rawBody[k]));
    }, [rawBody]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return allRows.filter((row) => {
            if (groupFilter && row._groupLabel !== groupFilter) return false;
            if (!q) return true;
            const code = String(row.code || "").toLowerCase();
            const name = String(row.name || "").toLowerCase();
            return code.includes(q) || name.includes(q);
        });
    }, [allRows, search, groupFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

    const paginatedRows = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredRows.slice(start, start + PAGE_SIZE);
    }, [filteredRows, page]);

    useEffect(() => {
        setPage(1);
    }, [search, groupFilter]);

    useEffect(() => {
        setPage((p) => (p > totalPages ? totalPages : p));
    }, [totalPages]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAdminPersonalityTypes();
            setRawBody(res?.data?.body ?? null);
        } catch (e) {
            console.error(e);
            enqueueSnackbar("Không thể tải danh sách loại tính cách.", { variant: "error" });
            setRawBody(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const setRowStatusLocal = (id, status) => {
        if (!rawBody) return;
        const next = { ...rawBody };
        for (const key of Object.keys(next)) {
            const arr = next[key];
            if (!Array.isArray(arr)) continue;
            next[key] = arr.map((r) => (r.id === id ? { ...r, status } : r));
        }
        setRawBody(next);
    };

    const handleStatusChange = async (row, checked) => {
        const id = row?.id;
        if (id === undefined || id === null) return;
        const nextStatus = checked ? STATUS_ACTIVE : STATUS_INACTIVE;
        const prevStatus = row.status;
        setRowStatusLocal(id, nextStatus);
        setStatusUpdatingIds((prev) => new Set(prev).add(id));
        try {
            await patchAdminPersonalityTypeStatus(id, nextStatus);
            enqueueSnackbar("Đã cập nhật trạng thái.", { variant: "success" });
        } catch (e) {
            console.error(e);
            setRowStatusLocal(id, prevStatus);
            enqueueSnackbar(
                "Không thể cập nhật trạng thái. Kiểm tra endpoint PATCH trên backend hoặc quyền admin.",
                { variant: "error" }
            );
        } finally {
            setStatusUpdatingIds((prev) => {
                const n = new Set(prev);
                n.delete(id);
                return n;
            });
        }
    };

    return (
        <Box
            sx={{
                p: { xs: 1, md: 2 },
                borderRadius: 4,
                bgcolor: "#ffffff",
                color: "#1e293b",
            }}
        >
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
                    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Avatar
                                sx={{
                                    bgcolor: alpha("#ffffff", 0.2),
                                    color: "white",
                                    width: 42,
                                    height: 42,
                                }}
                            >
                                <PsychologyOutlinedIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                    Quản Lý Loại Tính Cách
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.92, mt: 0.45 }}>
                                    Hệ thống quản lý danh mục loại tính cách trên nền tảng
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <Card elevation={0} sx={{ ...adminDataCardBorderSx, borderRadius: 2 }}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Stack
                        direction="row"
                        flexWrap="wrap"
                        alignItems="center"
                        spacing={1.5}
                        useFlexGap
                        sx={{ mb: 2, width: "100%" }}
                    >
                        <TextField
                            size="small"
                            placeholder="Tìm theo mã (INTJ) hoặc tên..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            sx={{
                                flex: "1 1 220px",
                                minWidth: 0,
                                "& .MuiOutlinedInput-root": { height: 40, boxSizing: "border-box" },
                                "& .MuiOutlinedInput-input": { py: 0, height: 40, boxSizing: "border-box" },
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" sx={{ color: "#94a3b8" }} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <FormControl
                            size="small"
                            sx={{
                                minWidth: 200,
                                flex: "0 1 240px",
                                "& .MuiOutlinedInput-root": { height: 40, boxSizing: "border-box" },
                            }}
                        >
                            <InputLabel id="personality-group-filter">Nhóm tính cách</InputLabel>
                            <Select
                                labelId="personality-group-filter"
                                label="Nhóm tính cách"
                                value={groupFilter}
                                onChange={(e) => setGroupFilter(e.target.value)}
                            >
                                <MenuItem value="">
                                    <em>Tất cả</em>
                                </MenuItem>
                                {groupOptions.map((g) => (
                                    <MenuItem key={g} value={g}>
                                        {g}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => setAddOpen(true)}
                            sx={{
                                flexShrink: 0,
                                height: 40,
                                minHeight: 40,
                                px: 2,
                                textTransform: "none",
                                fontWeight: 700,
                                boxShadow: "0 6px 14px rgba(37,99,235,0.35)",
                                ml: { xs: 0, md: "auto" },
                            }}
                        >
                            Thêm loại tính cách
                        </Button>
                    </Stack>

                    <TableContainer component={Paper} elevation={0} sx={adminTableContainerSx}>
                        <Table size="small" sx={{ minWidth: 880 }}>
                            <TableHead>
                                <TableRow sx={adminTableHeadRowSx}>
                                    <TableCell width={56} sx={adminTableHeadCellSx}>
                                        STT
                                    </TableCell>
                                    <TableCell width={72} sx={adminTableHeadCellSx}>
                                        Ảnh
                                    </TableCell>
                                    <TableCell sx={adminTableHeadCellSx}>Mã</TableCell>
                                    <TableCell sx={adminTableHeadCellSx}>Tên gọi</TableCell>
                                    <TableCell sx={{ ...adminTableHeadCellSx, minWidth: 140 }}>Nhóm</TableCell>
                                    <TableCell width={100} sx={adminTableHeadCellSx}>
                                        Trạng thái
                                    </TableCell>
                                    <TableCell width={200} sx={adminTableHeadCellSx}>
                                        Hành động
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                            <CircularProgress size={36} sx={{ color: APP_PRIMARY_MAIN }} />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: "#64748b" }}>
                                            Không có bản ghi phù hợp.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedRows.map((row, idx) => {
                                        const active = row.status === STATUS_ACTIVE;
                                        const busy = statusUpdatingIds.has(row.id);
                                        const stt = (page - 1) * PAGE_SIZE + idx + 1;
                                        return (
                                            <TableRow
                                                key={row.id}
                                                hover
                                                sx={{
                                                    "& td": {
                                                        ...adminTableBodyRowSx["& td"],
                                                        verticalAlign: "middle",
                                                        textAlign: "center",
                                                    },
                                                    "&:hover": adminTableBodyRowSx["&:hover"],
                                                }}
                                            >
                                                <TableCell>{stt}</TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                                                        <Avatar
                                                            src={row.image || undefined}
                                                            alt={row.code}
                                                            variant="rounded"
                                                            sx={{ width: 44, height: 44, bgcolor: "#e2e8f0" }}
                                                        >
                                                            {String(row.code || "?").slice(0, 1)}
                                                        </Avatar>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                                                        <Chip
                                                            label={row.code}
                                                            size="small"
                                                            sx={groupChipSx(row.personalityTypeGroup, row._groupLabel)}
                                                        />
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography fontWeight={600} color="#1e293b">
                                                        {row.name}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                                                        <Chip
                                                            label={row._groupLabel}
                                                            size="small"
                                                            sx={{
                                                                ...groupChipSx(row.personalityTypeGroup, row._groupLabel),
                                                                maxWidth: 220,
                                                                height: "auto",
                                                                "& .MuiChip-label": {
                                                                    display: "block",
                                                                    whiteSpace: "normal",
                                                                    textAlign: "center",
                                                                    py: 0.65,
                                                                    px: 0.5,
                                                                    lineHeight: 1.35,
                                                                },
                                                            }}
                                                        />
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Tooltip
                                                        title={active ? "Đang hiển thị" : "Đang tắt"}
                                                        placement="top"
                                                    >
                                                        <Switch
                                                            size="small"
                                                            checked={active}
                                                            disabled={busy}
                                                            onChange={(_, c) => handleStatusChange(row, c)}
                                                            color="primary"
                                                        />
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>
                                                    <Stack
                                                        direction="row"
                                                        justifyContent="center"
                                                        alignItems="center"
                                                        spacing={0.25}
                                                    >
                                                        <Tooltip title="Xem chi tiết">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setDetailRow(row)}
                                                                sx={{ color: APP_PRIMARY_MAIN }}
                                                            >
                                                                <VisibilityIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Sửa (sắp có)">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() =>
                                                                    enqueueSnackbar(
                                                                        "Chức năng sửa đang được bổ sung.",
                                                                        { variant: "info" }
                                                                    )
                                                                }
                                                            >
                                                                <EditOutlinedIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Xóa">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => setDeleteRow(row)}
                                                            >
                                                                <DeleteOutlineIcon fontSize="small" />
                                                            </IconButton>
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

                    {!loading && filteredRows.length > 0 && totalPages > 1 ? (
                        <Stack alignItems="center" sx={{ mt: 1.8 }}>
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={(_, p) => setPage(p)}
                                shape="rounded"
                                disabled={loading}
                                sx={{
                                    "& .MuiPaginationItem-root": {
                                        borderRadius: 2,
                                        color: "#334155",
                                        border: "1px solid #cbd5e1",
                                        bgcolor: "#ffffff",
                                    },
                                    "& .MuiPaginationItem-root:hover": {
                                        bgcolor: "#eef2ff",
                                        borderColor: "#a5b4fc",
                                    },
                                    "& .Mui-selected": {
                                        bgcolor: `${APP_PRIMARY_MAIN} !important`,
                                        color: "#ffffff",
                                        borderColor: APP_PRIMARY_MAIN,
                                        boxShadow: "0 6px 14px rgba(37,99,235,0.35)",
                                    },
                                }}
                            />
                        </Stack>
                    ) : null}
                </CardContent>
            </Card>

            <AddPersonalityTypeDialog open={addOpen} onClose={() => setAddOpen(false)} onCreated={load} />

            <PersonalityDetailModal row={detailRow} onClose={() => setDetailRow(null)} />

            <ConfirmDialog
                open={Boolean(deleteRow)}
                title="Xóa loại tính cách?"
                description={
                    deleteRow ? (
                        <>
                            Bạn có chắc muốn <ConfirmHighlight>xóa</ConfirmHighlight>{" "}
                            <ConfirmHighlight>{deleteRow.code}</ConfirmHighlight> —{" "}
                            <ConfirmHighlight>{deleteRow.name}</ConfirmHighlight>?
                        </>
                    ) : (
                        ""
                    )
                }
                extraDescription={
                    <>
                        API xóa chưa được kết nối; <ConfirmHighlight>xác nhận sẽ chỉ đóng hộp thoại</ConfirmHighlight>.
                    </>
                }
                onCancel={() => setDeleteRow(null)}
                onConfirm={() => {
                    setDeleteRow(null);
                    enqueueSnackbar("Chức năng xóa đang được bổ sung trên backend.", { variant: "info" });
                }}
                confirmText="Đã hiểu"
            />
        </Box>
    );
}

function createInitialAddForm() {
    return {
        code: "",
        name: "",
        description: "",
        quoteContent: "",
        quoteAuthor: "",
        traits: [{ name: "", description: "" }],
        strengthsText: "",
        weaknessesText: "",
        sources: [{ title: "", url: "" }],
        recommendedCareers: [{ name: "", explainText: "" }],
        personalityTypeGroup: PERSONALITY_GROUP_OPTIONS[0] || "ANALYST",
    };
}

function buildPostPersonalityPayload(form) {
    const strengths = String(form.strengthsText ?? "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    const weaknesses = String(form.weaknessesText ?? "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    const traits = (form.traits || [])
        .map((t) => ({
            name: String(t?.name ?? "").trim(),
            description: String(t?.description ?? "").trim(),
        }))
        .filter((t) => t.name || t.description);
    const sources = (form.sources || [])
        .map((s) => ({
            title: String(s?.title ?? "").trim(),
            url: String(s?.url ?? "").trim(),
        }))
        .filter((s) => s.title || s.url);
    const recommendedCareers = (form.recommendedCareers || [])
        .map((c) => ({
            name: String(c?.name ?? "").trim(),
            explainText: String(c?.explainText ?? "").trim(),
        }))
        .filter((c) => c.name || c.explainText);

    return {
        code: String(form.code ?? "").trim(),
        name: String(form.name ?? "").trim(),
        description: String(form.description ?? "").trim(),
        quoteInfo: {
            content: String(form.quoteContent ?? "").trim(),
            author: String(form.quoteAuthor ?? "").trim(),
        },
        traits,
        strengths,
        weaknesses,
        sources,
        recommendedCareers,
        personalityTypeGroup: String(form.personalityTypeGroup ?? "").trim(),
    };
}

function addDialogFieldSx() {
    return {
        "& .MuiOutlinedInput-root": { borderRadius: 2 },
    };
}

function AddPersonalityTypeDialog({ open, onClose, onCreated }) {
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState(createInitialAddForm);

    useEffect(() => {
        if (open) setForm(createInitialAddForm());
    }, [open]);

    const handleClose = () => {
        if (submitting) return;
        onClose();
    };

    const setTrait = (index, key, value) => {
        setForm((prev) => {
            const traits = [...(prev.traits || [])];
            traits[index] = { ...traits[index], [key]: value };
            return { ...prev, traits };
        });
    };

    const addTraitRow = () => {
        setForm((prev) => ({ ...prev, traits: [...(prev.traits || []), { name: "", description: "" }] }));
    };

    const removeTraitRow = (index) => {
        setForm((prev) => {
            const traits = [...(prev.traits || [])];
            if (traits.length <= 1) return prev;
            traits.splice(index, 1);
            return { ...prev, traits };
        });
    };

    const setSource = (index, key, value) => {
        setForm((prev) => {
            const sources = [...(prev.sources || [])];
            sources[index] = { ...sources[index], [key]: value };
            return { ...prev, sources };
        });
    };

    const addSourceRow = () => {
        setForm((prev) => ({ ...prev, sources: [...(prev.sources || []), { title: "", url: "" }] }));
    };

    const removeSourceRow = (index) => {
        setForm((prev) => {
            const sources = [...(prev.sources || [])];
            if (sources.length <= 1) return prev;
            sources.splice(index, 1);
            return { ...prev, sources };
        });
    };

    const setCareer = (index, key, value) => {
        setForm((prev) => {
            const recommendedCareers = [...(prev.recommendedCareers || [])];
            recommendedCareers[index] = { ...recommendedCareers[index], [key]: value };
            return { ...prev, recommendedCareers };
        });
    };

    const addCareerRow = () => {
        setForm((prev) => ({
            ...prev,
            recommendedCareers: [...(prev.recommendedCareers || []), { name: "", explainText: "" }],
        }));
    };

    const removeCareerRow = (index) => {
        setForm((prev) => {
            const recommendedCareers = [...(prev.recommendedCareers || [])];
            if (recommendedCareers.length <= 1) return prev;
            recommendedCareers.splice(index, 1);
            return { ...prev, recommendedCareers };
        });
    };

    const handleSubmit = async () => {
        const payload = buildPostPersonalityPayload(form);
        if (!payload.code || !payload.name) {
            enqueueSnackbar("Vui lòng nhập mã và tên loại tính cách.", { variant: "warning" });
            return;
        }
        if (!payload.personalityTypeGroup) {
            enqueueSnackbar("Vui lòng chọn nhóm tính cách.", { variant: "warning" });
            return;
        }
        setSubmitting(true);
        try {
            await postAdminPersonalityType(payload);
            enqueueSnackbar("Đã thêm loại tính cách.", { variant: "success" });
            onClose();
            await onCreated?.();
        } catch (e) {
            console.error(e);
            enqueueSnackbar(
                pickHttpErrorMessage(e, "Không thể thêm loại tính cách. Kiểm tra dữ liệu hoặc quyền admin."),
                { variant: "error" }
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="md"
            PaperProps={{ sx: adminDialogPaperSx }}
        >
            <DialogTitle sx={adminDialogTitleSx}>Thêm loại tính cách</DialogTitle>
            <DialogContent
                dividers
                sx={{ maxHeight: "min(85vh, 720px)", bgcolor: "#f8fafc", borderColor: "#e2e8f0" }}
            >
                <Stack spacing={2} sx={{ pt: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                        Các trường có dấu <strong>*</strong> là bắt buộc. Điểm mạnh/yếu: mỗi dòng một mục.
                    </Typography>
                    <Box>
                        <Typography sx={{ fontWeight: 700, mb: 1, color: "#334155" }}>Thông tin cơ bản</Typography>
                        <Stack spacing={1.5}>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                                <TextField
                                    required
                                    label="Mã (code)"
                                    size="small"
                                    fullWidth
                                    value={form.code}
                                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                                    disabled={submitting}
                                    sx={addDialogFieldSx()}
                                />
                                <FormControl size="small" fullWidth sx={addDialogFieldSx()}>
                                    <InputLabel id="add-personality-group">Nhóm *</InputLabel>
                                    <Select
                                        labelId="add-personality-group"
                                        label="Nhóm *"
                                        value={form.personalityTypeGroup}
                                        onChange={(e) =>
                                            setForm((p) => ({ ...p, personalityTypeGroup: e.target.value }))
                                        }
                                        disabled={submitting}
                                    >
                                        {PERSONALITY_GROUP_OPTIONS.map((g) => (
                                            <MenuItem key={g} value={g}>
                                                {g}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Stack>
                            <TextField
                                required
                                label="Tên gọi"
                                size="small"
                                fullWidth
                                value={form.name}
                                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                disabled={submitting}
                                sx={addDialogFieldSx()}
                            />
                            <TextField
                                label="Mô tả"
                                size="small"
                                fullWidth
                                multiline
                                minRows={3}
                                value={form.description}
                                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                                disabled={submitting}
                                sx={addDialogFieldSx()}
                            />
                        </Stack>
                    </Box>
                    <Divider />
                    <Box>
                        <Typography sx={{ fontWeight: 700, mb: 1, color: "#334155" }}>Trích dẫn (quoteInfo)</Typography>
                        <Stack spacing={1.5}>
                            <TextField
                                label="Nội dung trích dẫn"
                                size="small"
                                fullWidth
                                multiline
                                minRows={2}
                                value={form.quoteContent}
                                onChange={(e) => setForm((p) => ({ ...p, quoteContent: e.target.value }))}
                                disabled={submitting}
                                sx={addDialogFieldSx()}
                            />
                            <TextField
                                label="Tác giả"
                                size="small"
                                fullWidth
                                value={form.quoteAuthor}
                                onChange={(e) => setForm((p) => ({ ...p, quoteAuthor: e.target.value }))}
                                disabled={submitting}
                                sx={addDialogFieldSx()}
                            />
                        </Stack>
                    </Box>
                    <Divider />
                    <Box>
                        <Typography sx={{ fontWeight: 700, mb: 1, color: "#334155" }}>Đặc điểm (traits)</Typography>
                        <Stack spacing={1}>
                            {(form.traits || []).map((t, i) => (
                                <Stack key={i} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
                                    <TextField
                                        label="Tên đặc điểm"
                                        size="small"
                                        fullWidth
                                        value={t.name}
                                        onChange={(e) => setTrait(i, "name", e.target.value)}
                                        disabled={submitting}
                                        sx={{ ...addDialogFieldSx(), flex: 1 }}
                                    />
                                    <TextField
                                        label="Mô tả"
                                        size="small"
                                        fullWidth
                                        value={t.description}
                                        onChange={(e) => setTrait(i, "description", e.target.value)}
                                        disabled={submitting}
                                        sx={{ ...addDialogFieldSx(), flex: 2 }}
                                    />
                                    <IconButton
                                        aria-label="Xóa dòng"
                                        color="error"
                                        onClick={() => removeTraitRow(i)}
                                        disabled={submitting || (form.traits || []).length <= 1}
                                        sx={{ mt: { sm: 0.5 } }}
                                    >
                                        <DeleteOutlineIcon />
                                    </IconButton>
                                </Stack>
                            ))}
                            <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={addTraitRow}
                                disabled={submitting}
                                sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 600 }}
                            >
                                Thêm đặc điểm
                            </Button>
                        </Stack>
                    </Box>
                    <Divider />
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                        <TextField
                            label="Điểm mạnh (mỗi dòng một ý)"
                            size="small"
                            fullWidth
                            multiline
                            minRows={4}
                            value={form.strengthsText}
                            onChange={(e) => setForm((p) => ({ ...p, strengthsText: e.target.value }))}
                            disabled={submitting}
                            sx={addDialogFieldSx()}
                        />
                        <TextField
                            label="Điểm yếu (mỗi dòng một ý)"
                            size="small"
                            fullWidth
                            multiline
                            minRows={4}
                            value={form.weaknessesText}
                            onChange={(e) => setForm((p) => ({ ...p, weaknessesText: e.target.value }))}
                            disabled={submitting}
                            sx={addDialogFieldSx()}
                        />
                    </Stack>
                    <Divider />
                    <Box>
                        <Typography sx={{ fontWeight: 700, mb: 1, color: "#334155" }}>Nguồn tham khảo</Typography>
                        <Stack spacing={1}>
                            {(form.sources || []).map((s, i) => (
                                <Stack key={i} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
                                    <TextField
                                        label="Tiêu đề"
                                        size="small"
                                        fullWidth
                                        value={s.title}
                                        onChange={(e) => setSource(i, "title", e.target.value)}
                                        disabled={submitting}
                                        sx={{ ...addDialogFieldSx(), flex: 1 }}
                                    />
                                    <TextField
                                        label="URL"
                                        size="small"
                                        fullWidth
                                        value={s.url}
                                        onChange={(e) => setSource(i, "url", e.target.value)}
                                        disabled={submitting}
                                        sx={{ ...addDialogFieldSx(), flex: 2 }}
                                    />
                                    <IconButton
                                        aria-label="Xóa nguồn"
                                        color="error"
                                        onClick={() => removeSourceRow(i)}
                                        disabled={submitting || (form.sources || []).length <= 1}
                                        sx={{ mt: { sm: 0.5 } }}
                                    >
                                        <DeleteOutlineIcon />
                                    </IconButton>
                                </Stack>
                            ))}
                            <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={addSourceRow}
                                disabled={submitting}
                                sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 600 }}
                            >
                                Thêm nguồn
                            </Button>
                        </Stack>
                    </Box>
                    <Divider />
                    <Box>
                        <Typography sx={{ fontWeight: 700, mb: 1, color: "#334155" }}>
                            Nghề nghiệp gợi ý (recommendedCareers)
                        </Typography>
                        <Stack spacing={1}>
                            {(form.recommendedCareers || []).map((c, i) => (
                                <Stack key={i} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
                                    <TextField
                                        label="Tên nghề"
                                        size="small"
                                        fullWidth
                                        value={c.name}
                                        onChange={(e) => setCareer(i, "name", e.target.value)}
                                        disabled={submitting}
                                        sx={{ ...addDialogFieldSx(), flex: 1 }}
                                    />
                                    <TextField
                                        label="Giải thích"
                                        size="small"
                                        fullWidth
                                        multiline
                                        minRows={2}
                                        value={c.explainText}
                                        onChange={(e) => setCareer(i, "explainText", e.target.value)}
                                        disabled={submitting}
                                        sx={{ ...addDialogFieldSx(), flex: 2 }}
                                    />
                                    <IconButton
                                        aria-label="Xóa nghề"
                                        color="error"
                                        onClick={() => removeCareerRow(i)}
                                        disabled={submitting || (form.recommendedCareers || []).length <= 1}
                                        sx={{ mt: { sm: 0.5 } }}
                                    >
                                        <DeleteOutlineIcon />
                                    </IconButton>
                                </Stack>
                            ))}
                            <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={addCareerRow}
                                disabled={submitting}
                                sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 600 }}
                            >
                                Thêm nghề gợi ý
                            </Button>
                        </Stack>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={adminDialogActionsSx}>
                <Button onClick={handleClose} disabled={submitting} sx={{ textTransform: "none", fontWeight: 600 }}>
                    Hủy
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={submitting}
                    sx={{ textTransform: "none", fontWeight: 700, boxShadow: "0 6px 14px rgba(37,99,235,0.35)" }}
                >
                    {submitting ? "Đang gửi…" : "Lưu"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

const personalityModalSectionSx = {
    border: "1px solid #bfdbfe",
    borderRadius: 3,
    bgcolor: "#eff6ff",
    p: { xs: 1.4, md: 1.8 },
    boxShadow: "0 10px 24px rgba(37,99,235,0.14)",
};

const personalityModalContentSx = {
    bgcolor: "#eff6ff",
    backgroundImage:
        "radial-gradient(circle at top right, rgba(59,130,246,0.24), transparent 45%), radial-gradient(circle at bottom left, rgba(37,99,235,0.2), transparent 42%)",
};

function PersonalityModalSectionHeader({ icon: Icon, title }) {
    return (
        <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 1 }}>
            <Icon sx={{ fontSize: 17, color: "#2563eb" }} />
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#2563eb" }}>{title}</Typography>
        </Stack>
    );
}

function PersonalityModalField({ label, value, fullWidth }) {
    return (
        <Box
            sx={{
                border: "1px solid #bfdbfe",
                borderRadius: 2.25,
                bgcolor: "#ffffff",
                px: 1.3,
                py: 1.1,
                gridColumn: fullWidth ? { xs: "auto", md: "1 / span 2" } : "auto",
                boxShadow: "0 5px 12px rgba(37,99,235,0.08)",
            }}
        >
            <Typography sx={{ fontSize: 12, color: "#2563eb", mb: 0.35, fontWeight: 700 }}>{label}</Typography>
            <Typography
                sx={{ fontSize: 14, color: "#1e293b", fontWeight: 600, whiteSpace: "pre-wrap", lineHeight: 1.55 }}
            >
                {value != null && value !== "" ? value : "—"}
            </Typography>
        </Box>
    );
}

function PersonalityModalFieldBox({ label, fullWidth, children }) {
    return (
        <Box
            sx={{
                border: "1px solid #bfdbfe",
                borderRadius: 2.25,
                bgcolor: "#ffffff",
                px: 1.3,
                py: 1.1,
                gridColumn: fullWidth ? { xs: "auto", md: "1 / span 2" } : "auto",
                boxShadow: "0 5px 12px rgba(37,99,235,0.08)",
            }}
        >
            <Typography sx={{ fontSize: 12, color: "#2563eb", mb: 0.5, fontWeight: 700 }}>{label}</Typography>
            {children}
        </Box>
    );
}

function PersonalityStatusChip({ active }) {
    return (
        <Chip
            size="small"
            label={active ? "Đang hiển thị" : "Đang tắt"}
            sx={{
                fontWeight: 700,
                ...(active
                    ? {
                          bgcolor: "rgba(16,185,129,0.16)",
                          color: "#059669",
                          border: "1px solid rgba(52,211,153,0.45)",
                      }
                    : {
                          bgcolor: "rgba(148,163,184,0.2)",
                          color: "#475569",
                          border: "1px solid rgba(203,213,225,0.55)",
                      }),
            }}
        />
    );
}

function PersonalityBulletList({ items }) {
    if (!items?.length) {
        return <Typography sx={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>—</Typography>;
    }
    return (
        <Stack component="ul" spacing={0.65} sx={{ m: 0, pl: 2, py: 0 }}>
            {items.map((text, i) => (
                <Typography
                    key={i}
                    component="li"
                    sx={{ fontSize: 14, color: "#1e293b", fontWeight: 600, lineHeight: 1.5 }}
                >
                    {text}
                </Typography>
            ))}
        </Stack>
    );
}

function PersonalityDetailModal({ row, onClose }) {
    const open = Boolean(row);
    if (!row) return null;

    const chipSx = groupChipSx(row.personalityTypeGroup, row._groupLabel);
    const active = row.status === STATUS_ACTIVE;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            PaperProps={{ sx: adminDialogPaperSx }}
        >
            <DialogTitle sx={adminDialogTitleSx}>
                Chi tiết loại tính cách
            </DialogTitle>
            <DialogContent dividers sx={personalityModalContentSx}>
                <Stack spacing={1.5}>
                    <Box sx={personalityModalSectionSx}>
                        <PersonalityModalSectionHeader icon={PersonOutlineIcon} title="Thông tin cơ bản" />
                        <Box
                            sx={{
                                border: "1px solid #bfdbfe",
                                borderRadius: 2.25,
                                bgcolor: "#ffffff",
                                px: 1.4,
                                py: 1.25,
                                mb: 1,
                                boxShadow: "0 5px 12px rgba(37,99,235,0.08)",
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                            }}
                        >
                            <Avatar src={row.image || undefined} alt={row.code} variant="rounded" sx={{ width: 56, height: 56, flexShrink: 0 }}>
                                {(row.code || "?").charAt(0)}
                            </Avatar>
                            <Typography sx={{ fontSize: 18, color: "#1e293b", fontWeight: 700, lineHeight: 1.25 }}>
                                {row.name || "—"}
                            </Typography>
                        </Box>
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
                            <PersonalityModalFieldBox label="Mã loại">
                                <Chip label={row.code} size="small" sx={chipSx} />
                            </PersonalityModalFieldBox>
                            <PersonalityModalFieldBox label="Nhóm tính cách">
                                <Chip label={row._groupLabel} size="small" sx={chipSx} />
                            </PersonalityModalFieldBox>
                            <Box
                                sx={{
                                    border: "1px solid #bfdbfe",
                                    borderRadius: 2.25,
                                    bgcolor: "#ffffff",
                                    px: 1.3,
                                    py: 1.1,
                                    boxShadow: "0 5px 12px rgba(37,99,235,0.08)",
                                }}
                            >
                                <Typography sx={{ fontSize: 12, color: "#2563eb", mb: 0.5, fontWeight: 700 }}>
                                    Trạng thái hiển thị
                                </Typography>
                                <PersonalityStatusChip active={active} />
                            </Box>
                        </Box>
                    </Box>

                    <Box sx={personalityModalSectionSx}>
                        <PersonalityModalSectionHeader icon={ArticleOutlinedIcon} title="Mô tả" />
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
                            <PersonalityModalField label="Nội dung mô tả" value={row.description} fullWidth />
                        </Box>
                    </Box>

                    <Box sx={personalityModalSectionSx}>
                        <PersonalityModalSectionHeader icon={AutoAwesomeOutlinedIcon} title="Đặc điểm (traits)" />
                        <Stack spacing={1}>
                            {(row.traits || []).length > 0 ? (
                                (row.traits || []).map((t) => (
                                    <PersonalityModalField key={t.name} label={t.name} value={t.description} fullWidth />
                                ))
                            ) : (
                                <PersonalityModalField label="Chi tiết" value="—" fullWidth />
                            )}
                        </Stack>
                    </Box>

                    <Box sx={personalityModalSectionSx}>
                        <PersonalityModalSectionHeader icon={TrendingUpIcon} title="Điểm mạnh" />
                        <PersonalityModalFieldBox label="Danh sách" fullWidth>
                            <PersonalityBulletList items={row.strengths} />
                        </PersonalityModalFieldBox>
                    </Box>

                    <Box sx={personalityModalSectionSx}>
                        <PersonalityModalSectionHeader icon={TrendingDownIcon} title="Điểm yếu" />
                        <PersonalityModalFieldBox label="Danh sách" fullWidth>
                            <PersonalityBulletList items={row.weaknesses} />
                        </PersonalityModalFieldBox>
                    </Box>

                    <Box sx={personalityModalSectionSx}>
                        <PersonalityModalSectionHeader icon={FormatQuoteOutlinedIcon} title="Trích dẫn" />
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
                            <PersonalityModalField label="Nội dung" value={row.quote?.content} fullWidth />
                            {row.quote?.author ? (
                                <PersonalityModalField label="Tác giả" value={row.quote.author} />
                            ) : null}
                        </Box>
                    </Box>

                    <Box sx={personalityModalSectionSx}>
                        <PersonalityModalSectionHeader icon={WorkOutlineOutlinedIcon} title="Nghề nghiệp gợi ý" />
                        <Stack spacing={1}>
                            {(row.recommendedCareers || []).length > 0 ? (
                                (row.recommendedCareers || []).map((c) => (
                                    <PersonalityModalField key={c.name} label={c.name} value={c.explainText} fullWidth />
                                ))
                            ) : (
                                <PersonalityModalField label="Danh sách" value="—" fullWidth />
                            )}
                        </Stack>
                    </Box>

                    <Box sx={personalityModalSectionSx}>
                        <PersonalityModalSectionHeader icon={LinkOutlinedIcon} title="Nguồn tham khảo" />
                        <Stack spacing={1}>
                            {(row.sources || []).length > 0 ? (
                                (row.sources || []).map((s) => (
                                    <PersonalityModalFieldBox key={s.url} label={s.title || "Liên kết"} fullWidth>
                                        <Link
                                            href={s.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            variant="body2"
                                            sx={{ fontWeight: 600, color: "#2563eb", wordBreak: "break-all" }}
                                        >
                                            {s.url}
                                        </Link>
                                    </PersonalityModalFieldBox>
                                ))
                            ) : (
                                <PersonalityModalField label="Liên kết" value="—" fullWidth />
                            )}
                        </Stack>
                    </Box>
                </Stack>
            </DialogContent>
        </Dialog>
    );
}
