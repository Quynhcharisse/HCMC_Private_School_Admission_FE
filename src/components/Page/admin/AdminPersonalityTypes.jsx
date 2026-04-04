import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Avatar,
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
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
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
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
} from "../../../services/AdminService.jsx";
import ConfirmDialog from "../../ui/ConfirmDialog.jsx";
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
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        sx={{ mb: 2 }}
                        alignItems={{ xs: "stretch", sm: "center" }}
                    >
                        <TextField
                            size="small"
                            placeholder="Tìm theo mã (INTJ) hoặc tên..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            sx={{ flex: 1, minWidth: 220 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" sx={{ color: "#94a3b8" }} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <FormControl size="small" sx={{ minWidth: 240 }}>
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

            <PersonalityDetailModal row={detailRow} onClose={() => setDetailRow(null)} />

            <ConfirmDialog
                open={Boolean(deleteRow)}
                title="Xóa loại tính cách?"
                description={
                    deleteRow
                        ? `Bạn có chắc muốn xóa ${deleteRow.code} — ${deleteRow.name}?`
                        : ""
                }
                extraDescription="API xóa chưa được kết nối; xác nhận sẽ chỉ đóng hộp thoại."
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
            PaperProps={{
                sx: {
                    borderRadius: 4,
                    overflow: "hidden",
                    border: "1px solid #93c5fd",
                    boxShadow: "0 24px 48px rgba(37,99,235,0.24)",
                },
            }}
        >
            <DialogTitle
                sx={{
                    fontWeight: 800,
                    color: "#1e293b",
                    pb: 1.2,
                    background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 48%, #93c5fd 100%)",
                    borderBottom: "1px solid #93c5fd",
                }}
            >
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
