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
    FormControl,
    InputAdornment,
    InputLabel,
    MenuItem,
    Pagination,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    alpha,
} from "@mui/material";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import WalletRoundedIcon from "@mui/icons-material/WalletRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import { LineChart } from "@mui/x-charts";
import { enqueueSnackbar } from "notistack";
import { useLocation } from "react-router-dom";
import {
    adminSttChipSx,
    adminTableBodyRowSx,
    adminTableContainerSx,
    adminTableHeadCellSx,
    adminTableHeadRowSx,
} from "../../../constants/adminTableStyles.js";
import { getAdminTransactionList } from "../../../services/AdminService.jsx";

const ROWS_PER_PAGE = 10;

function formatCurrency(value) {
    const amount = Number(value || 0);
    return `${amount.toLocaleString("vi-VN")} VNĐ`;
}

function formatDateTimeParts(value) {
    if (!value) return { date: "—", time: "—" };
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { date: "—", time: "—" };
    return {
        date: date.toLocaleDateString("vi-VN"),
        time: date.toLocaleTimeString("vi-VN"),
    };
}

function pickOptionalString(v) {
    if (v == null) return null;
    const s = String(v).trim();
    return s === "" ? null : s;
}

function isSuccessStatus(status) {
    return String(status || "").toUpperCase() === "PAYMENT_SUCCESS";
}

function normalizeTransaction(item, index) {
    const amount = Number(item?.amount || 0);
    const expectedAmount = Number(
        item?.expectedAmount != null && item?.expectedAmount !== "" ? item.expectedAmount : amount,
    );
    const paidAmount = Number(item?.paidAmount != null && item?.paidAmount !== "" ? item.paidAmount : amount);
    const txnId = Number(item?.transactionId ?? index + 1);
    return {
        id: txnId,
        transactionId: txnId,
        schoolName: pickOptionalString(item?.schoolName) ?? "—",
        packageName: pickOptionalString(item?.packageName),
        txnRef: pickOptionalString(item?.txnRef) ?? "—",
        vnpTransactionNo: pickOptionalString(item?.vnpTransactionNo),
        orderInfo: pickOptionalString(item?.orderInfo),
        bankCode: pickOptionalString(item?.bankCode),
        cardType: pickOptionalString(item?.cardType),
        amount,
        expectedAmount,
        paidAmount,
        status: pickOptionalString(item?.status) ?? "UNKNOWN",
        createdAt: pickOptionalString(item?.createdAt),
        notes: pickOptionalString(item?.notes),
    };
}

const transactionDetailSectionSx = {
    border: "1px solid #bfdbfe",
    borderRadius: 3,
    bgcolor: "#eff6ff",
    p: { xs: 1.4, md: 1.8 },
    boxShadow: "0 10px 24px rgba(37,99,235,0.14)",
};

function renderTransactionDetailField(label, value, fullWidth = false) {
    const display = value === null || value === undefined || value === "" ? "—" : value;
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
            <Typography sx={{ fontSize: 14, color: "#1e293b", fontWeight: 600, wordBreak: "break-word" }}>
                {display}
            </Typography>
        </Box>
    );
}

function renderTransactionCreatedAtField(isoValue, fullWidth = false) {
    const { date, time } = formatDateTimeParts(isoValue);
    const invalid = date === "—";
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
            <Typography sx={{ fontSize: 12, color: "#2563eb", mb: 0.35, fontWeight: 700 }}>Thời gian tạo</Typography>
            {invalid ? (
                <Typography sx={{ fontSize: 14, color: "#1e293b", fontWeight: 600 }}>—</Typography>
            ) : (
                <Stack spacing={0.15}>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#1e293b", lineHeight: 1.25 }}>{date}</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 500, color: "#64748b", lineHeight: 1.2 }}>{time}</Typography>
                </Stack>
            )}
        </Box>
    );
}

function normalizeChartPoint(item, index) {
    const parsed = new Date(item?.date);
    return {
        id: `${item?.date || "unknown"}-${index}`,
        date: item?.date || "",
        label: Number.isNaN(parsed.getTime()) ? String(item?.date || "—") : parsed.toLocaleDateString("vi-VN"),
        value: Number(item?.value || 0),
    };
}

function buildAdminRevenueLineDataset(chartData) {
    if (!Array.isArray(chartData) || chartData.length === 0) return [];
    const rows = [{ x: -1, y: 0 }];
    chartData.forEach((item, i) => {
        rows.push({ x: i, y: item.value });
    });
    return rows;
}

function StatusBadge({ status }) {
    const success = isSuccessStatus(status);
    return (
        <Chip
            size="small"
            label={success ? "Thành công" : "Thất bại"}
            sx={{
                height: 24,
                fontWeight: 700,
                color: "#ffffff",
                bgcolor: success ? "#16a34a" : "#dc2626",
                border: "none",
                borderRadius: "999px",
                "& .MuiChip-label": { px: 1.2 },
            }}
        />
    );
}

export default function AdminTransactionManagement() {
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({
        totalTransactions: 0,
        successTransactions: 0,
        failedTransactions: 0,
        totalRevenue: 0,
    });
    const [chartData, setChartData] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [page, setPage] = useState(1);
    const [selectedRow, setSelectedRow] = useState(null);

    const loadTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getAdminTransactionList();
            const body = response?.data?.body || {};
            const summaryData = body?.summary || {};
            const chartRows = Array.isArray(body?.chart) ? body.chart : [];
            const tableRows = Array.isArray(body?.table) ? body.table : [];

            setSummary({
                totalTransactions: Number(summaryData?.totalTransactions || 0),
                successTransactions: Number(summaryData?.successTransactions || 0),
                failedTransactions: Number(summaryData?.failedTransactions || 0),
                totalRevenue: Number(summaryData?.totalRevenue || 0),
            });
            setChartData(chartRows.map(normalizeChartPoint));
            setTableData(tableRows.map(normalizeTransaction));
        } catch (error) {
            console.error(error);
            enqueueSnackbar("Không thể tải danh sách giao dịch.", { variant: "error" });
            setSummary({
                totalTransactions: 0,
                successTransactions: 0,
                failedTransactions: 0,
                totalRevenue: 0,
            });
            setChartData([]);
            setTableData([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!location.pathname.startsWith("/admin/transaction-statistics")) return;
        void loadTransactions();
    }, [loadTransactions, location.pathname, location.key]);

    const filteredRows = useMemo(() => {
        const keyword = searchKeyword.trim().toLowerCase();
        return [...tableData]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .filter((row) => {
                const matchKeyword =
                    !keyword ||
                    row.schoolName.toLowerCase().includes(keyword) ||
                    row.txnRef.toLowerCase().includes(keyword);
                const matchStatus =
                    statusFilter === "ALL" ||
                    (statusFilter === "PAYMENT_SUCCESS" && isSuccessStatus(row.status)) ||
                    (statusFilter === "FAILED" && !isSuccessStatus(row.status));
                return matchKeyword && matchStatus;
            });
    }, [searchKeyword, statusFilter, tableData]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
    const pagedRows = useMemo(() => {
        const start = (page - 1) * ROWS_PER_PAGE;
        return filteredRows.slice(start, start + ROWS_PER_PAGE);
    }, [filteredRows, page]);

    useEffect(() => {
        setPage(1);
    }, [searchKeyword, statusFilter]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const statCards = [
        {
            key: "revenue",
            title: "Tổng doanh thu",
            value: formatCurrency(summary.totalRevenue),
            icon: <WalletRoundedIcon />,
            color: "#2563eb",
            bg: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)",
            textColor: "#ffffff",
        },
        {
            key: "total",
            title: "Tổng giao dịch",
            value: summary.totalTransactions.toLocaleString("vi-VN"),
            icon: <ReceiptLongRoundedIcon />,
            color: "#7c3aed",
            bg: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)",
            textColor: "#ffffff",
        },
        {
            key: "success",
            title: "Thành công",
            value: summary.successTransactions.toLocaleString("vi-VN"),
            icon: <CheckCircleRoundedIcon />,
            color: "#16a34a",
            bg: "linear-gradient(135deg, #15803d 0%, #22c55e 100%)",
            textColor: "#ffffff",
        },
        {
            key: "failed",
            title: "Thất bại",
            value: summary.failedTransactions.toLocaleString("vi-VN"),
            icon: <ErrorRoundedIcon />,
            color: "#dc2626",
            bg: "linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)",
            textColor: "#ffffff",
        },
    ];

    const revenueLineDataset = useMemo(() => buildAdminRevenueLineDataset(chartData), [chartData]);
    const revenueXTickInterval = useMemo(() => chartData.map((_, i) => i), [chartData]);

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2.5,
                pb: 4,
                width: "calc(100% + 48px)",
                ml: "-24px",
                mr: "-24px",
                px: 3,
                boxSizing: "border-box",
                position: "relative",
                bgcolor: "#F4F7FE",
            }}
        >
            <Stack spacing={2}>
                <Box
                    sx={{
                        display: "grid",
                        gap: 1.5,
                        gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(2, minmax(0, 1fr))",
                            lg: "repeat(4, minmax(0, 1fr))",
                        },
                    }}
                >
                    {statCards.map((card) => (
                        <Card
                            key={card.key}
                            elevation={0}
                            sx={{
                                borderRadius: 3,
                                background: card.bg,
                                color: card.textColor,
                                border: "1px solid rgba(255,255,255,0.35)",
                                boxShadow:
                                    card.key === "revenue"
                                        ? "0 14px 26px rgba(37, 99, 235, 0.32)"
                                        : card.key === "total"
                                          ? "0 14px 26px rgba(124, 58, 237, 0.32)"
                                          : card.key === "success"
                                            ? "0 14px 26px rgba(22, 163, 74, 0.3)"
                                            : "0 14px 26px rgba(220, 38, 38, 0.3)",
                                animation:
                                    card.key === "failed" && summary.failedTransactions > 10
                                        ? "adminFailedCardPulse 1.6s ease-in-out infinite"
                                        : "none",
                                "@keyframes adminFailedCardPulse": {
                                    "0%": { boxShadow: "0 0 0 0 rgba(220, 38, 38, 0.25)" },
                                    "70%": { boxShadow: "0 0 0 10px rgba(220, 38, 38, 0)" },
                                    "100%": { boxShadow: "0 0 0 0 rgba(220, 38, 38, 0)" },
                                },
                            }}
                        >
                            <CardContent sx={{ p: 1.8, "&:last-child": { pb: 1.8 } }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography sx={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>
                                            {card.title}
                                        </Typography>
                                        <Typography
                                            sx={{
                                                mt: 0.5,
                                                fontSize: { xs: 24, md: 26 },
                                                fontWeight: 800,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {card.value}
                                        </Typography>
                                    </Box>
                                    <Avatar
                                        sx={{
                                            width: 36,
                                            height: 36,
                                            bgcolor: alpha("#ffffff", 0.24),
                                            color: "#ffffff",
                                            border: "1px solid rgba(255,255,255,0.42)",
                                        }}
                                    >
                                        {card.icon}
                                    </Avatar>
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}
                </Box>

                <Card
                    elevation={0}
                    sx={{
                        borderRadius: 3,
                        border: "1px solid #93c5fd",
                        background: "linear-gradient(145deg, #ffffff 0%, #eff6ff 100%)",
                        boxShadow: "0 14px 30px rgba(37,99,235,0.16)",
                    }}
                >
                    <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                        <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                            Xu hướng doanh thu theo ngày
                        </Typography>
                        <Typography sx={{ mt: 0.5, color: "#64748b", fontSize: 13 }}>
                            Theo dõi sự tăng trưởng doanh thu từ các giao dịch đã ghi nhận.
                        </Typography>
                        <Box sx={{ mt: 1.6 }}>
                            {loading ? (
                                <Box sx={{ py: 6, textAlign: "center" }}>
                                    <CircularProgress size={34} />
                                </Box>
                            ) : chartData.length === 0 ? (
                                <Box sx={{ py: 6, textAlign: "center", color: "#64748b" }}>
                                    Chưa có dữ liệu biểu đồ doanh thu.
                                </Box>
                            ) : (
                                <LineChart
                                    height={320}
                                    dataset={revenueLineDataset}
                                    xAxis={[
                                        {
                                            scaleType: "linear",
                                            dataKey: "x",
                                            min: -1,
                                            max: Math.max(chartData.length - 1 + 0.5, 0.5),
                                            tickInterval: revenueXTickInterval,
                                            valueFormatter: (value) => {
                                                const v = Number(value);
                                                const i = Math.round(v);
                                                if (!Number.isFinite(v) || Math.abs(v - i) > 1e-6) return "";
                                                if (i >= 0 && i < chartData.length) return chartData[i].label;
                                                return "";
                                            },
                                        },
                                    ]}
                                    yAxis={[
                                        {
                                            min: 0,
                                            width: 90,
                                            valueFormatter: (value) => `${Number(value || 0).toLocaleString("vi-VN")} VNĐ`,
                                        },
                                    ]}
                                    series={[
                                        {
                                            dataKey: "y",
                                            area: false,
                                            color: "#2563eb",
                                            curve: "linear",
                                            showMark: (params) => params.index !== 0,
                                            valueFormatter: (value, context) => {
                                                const idx = context?.dataIndex ?? 0;
                                                if (idx <= 0) return null;
                                                const dataIdx = idx - 1;
                                                const dateLabel = chartData[dataIdx]?.label ?? "—";
                                                return `Ngày: ${dateLabel} - Doanh thu: ${formatCurrency(value)}`;
                                            },
                                        },
                                    ]}
                                    margin={{ top: 20, right: 24, bottom: 30, left: 16 }}
                                    grid={{ horizontal: true, vertical: false }}
                                />
                            )}
                        </Box>
                    </CardContent>
                </Card>

                <Card
                    elevation={0}
                    sx={{
                        borderRadius: 3,
                        border: "1px solid #93c5fd",
                        background: "linear-gradient(145deg, #ffffff 0%, #eff6ff 100%)",
                        boxShadow: "0 14px 30px rgba(37,99,235,0.16)",
                    }}
                >
                    <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                        <Stack
                            direction={{ xs: "column", md: "row" }}
                            spacing={1.2}
                            alignItems={{ xs: "stretch", md: "center" }}
                            justifyContent="space-between"
                            sx={{ mb: 1.6 }}
                        >
                            <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                                Danh sách giao dịch
                            </Typography>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ minWidth: { md: 540 } }}>
                                <TextField
                                    size="small"
                                    placeholder="Tìm theo tên trường hoặc mã giao dịch"
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    fullWidth
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchRoundedIcon sx={{ color: "#64748b" }} fontSize="small" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                <FormControl size="small" sx={{ minWidth: 170 }}>
                                    <InputLabel id="transaction-status-filter-label">Trạng thái</InputLabel>
                                    <Select
                                        labelId="transaction-status-filter-label"
                                        label="Trạng thái"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <MenuItem value="ALL">Tất cả</MenuItem>
                                        <MenuItem value="PAYMENT_SUCCESS">Thành công</MenuItem>
                                        <MenuItem value="FAILED">Thất bại</MenuItem>
                                    </Select>
                                </FormControl>
                            </Stack>
                        </Stack>

                        <TableContainer component={Paper} elevation={0} sx={adminTableContainerSx}>
                            <Table size="small" sx={{ tableLayout: "fixed" }}>
                                <TableHead>
                                    <TableRow sx={adminTableHeadRowSx}>
                                        <TableCell align="center" sx={{ ...adminTableHeadCellSx, width: 52 }}>
                                            STT
                                        </TableCell>
                                        <TableCell sx={{ ...adminTableHeadCellSx, width: "44%" }}>Trường học</TableCell>
                                        <TableCell sx={{ ...adminTableHeadCellSx, width: "10%" }}>Mã GD</TableCell>
                                        <TableCell sx={{ ...adminTableHeadCellSx, width: "11%" }}>
                                            Số tiền
                                        </TableCell>
                                        <TableCell sx={{ ...adminTableHeadCellSx, width: "12%" }}>Trạng thái</TableCell>
                                        <TableCell sx={{ ...adminTableHeadCellSx, width: "13%" }}>Ngày giao dịch</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                                <CircularProgress size={34} />
                                            </TableCell>
                                        </TableRow>
                                    ) : pagedRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#64748b" }}>
                                                Không có giao dịch phù hợp với bộ lọc hiện tại.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        pagedRows.map((row, idx) => (
                                            <TableRow
                                                key={`${row.id}-${row.txnRef}`}
                                                hover
                                                sx={{ ...adminTableBodyRowSx, cursor: "pointer" }}
                                                onClick={() => setSelectedRow(row)}
                                            >
                                                <TableCell align="center">
                                                    <Chip
                                                        label={(page - 1) * ROWS_PER_PAGE + idx + 1}
                                                        size="small"
                                                        sx={adminSttChipSx}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography sx={{ fontWeight: 600 }} noWrap title={row.schoolName} textAlign="center">
                                                        {row.schoolName}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography sx={{ fontFamily: "monospace", fontSize: 13 }}>
                                                        {row.txnRef}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 700, color: "#0f172a" }}>
                                                    {Number(row.amount).toLocaleString("vi-VN")}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <StatusBadge status={row.status} />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Stack spacing={0.15} alignItems="center">
                                                        <Typography sx={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>
                                                            {formatDateTimeParts(row.createdAt).date}
                                                        </Typography>
                                                        <Typography sx={{ color: "#64748b", fontSize: 11, lineHeight: 1.1 }}>
                                                            {formatDateTimeParts(row.createdAt).time}
                                                        </Typography>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Stack direction="row" justifyContent="center" alignItems="center" sx={{ mt: 1.8 }}>
                            <Pagination
                                page={page}
                                count={totalPages}
                                size="small"
                                shape="rounded"
                                onChange={(_, value) => setPage(value)}
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
                                        bgcolor: "#2563eb !important",
                                        color: "#ffffff",
                                        borderColor: "#2563eb",
                                        boxShadow: "0 6px 14px rgba(37,99,235,0.35)",
                                    },
                                }}
                            />
                        </Stack>
                    </CardContent>
                </Card>
            </Stack>

            <Dialog
                open={Boolean(selectedRow)}
                onClose={() => setSelectedRow(null)}
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
                    Chi tiết giao dịch
                </DialogTitle>
                <DialogContent dividers sx={{ bgcolor: "#eff6ff" }}>
                    <Stack spacing={1.5}>
                        <Box sx={transactionDetailSectionSx}>
                            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 1 }}>
                                <InfoRoundedIcon sx={{ fontSize: 17, color: "#2563eb" }} />
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#2563eb" }}>Thông tin chung</Typography>
                            </Stack>
                            <Box
                                sx={{
                                    border: "1px solid #bfdbfe",
                                    borderRadius: 2.25,
                                    bgcolor: "#ffffff",
                                    px: 1.4,
                                    py: 1.25,
                                    boxShadow: "0 5px 12px rgba(37,99,235,0.08)",
                                }}
                            >
                                <Typography
                                    sx={{ fontSize: 18, color: "#1e293b", fontWeight: 700, lineHeight: 1.25, mb: 0.9 }}
                                >
                                    {selectedRow?.schoolName || "—"}
                                </Typography>
                                <Typography sx={{ fontSize: 14, color: "#334155", lineHeight: 1.5, mb: 0.75 }}>
                                    {selectedRow?.packageName ? (
                                        <>
                                            <Box component="span" sx={{ color: "#2563eb", fontWeight: 700 }}>
                                                Gói:{" "}
                                            </Box>
                                            {selectedRow.packageName}
                                        </>
                                    ) : (
                                        "—"
                                    )}
                                </Typography>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                    <StatusBadge status={selectedRow?.status} />
                                    {!isSuccessStatus(selectedRow?.status) && selectedRow?.status ? (
                                        <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                                            {selectedRow.status}
                                        </Typography>
                                    ) : null}
                                </Box>
                            </Box>
                        </Box>

                        <Box sx={transactionDetailSectionSx}>
                            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 1 }}>
                                <ReceiptLongRoundedIcon sx={{ fontSize: 17, color: "#2563eb" }} />
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#2563eb" }}>
                                    Thông tin giao dịch
                                </Typography>
                            </Stack>
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
                                    gap: 1,
                                    "& > *": { minWidth: 0 },
                                }}
                            >
                                {renderTransactionDetailField("Mã tham chiếu", selectedRow?.txnRef !== "—" ? selectedRow?.txnRef : null)}
                                {renderTransactionDetailField("Mã giao dịch VNPAY", selectedRow?.vnpTransactionNo)}
                                {renderTransactionCreatedAtField(selectedRow?.createdAt)}
                            </Box>
                        </Box>

                        <Box sx={transactionDetailSectionSx}>
                            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 1 }}>
                                <CreditCardRoundedIcon sx={{ fontSize: 17, color: "#2563eb" }} />
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#2563eb" }}>
                                    Chi tiết thanh toán
                                </Typography>
                            </Stack>
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
                                {renderTransactionDetailField("Ngân hàng", selectedRow?.bankCode)}
                                {renderTransactionDetailField("Loại thẻ", selectedRow?.cardType)}
                                {renderTransactionDetailField("Nội dung thanh toán", selectedRow?.orderInfo, true)}
                            </Box>
                        </Box>

                        <Box sx={transactionDetailSectionSx}>
                            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 1 }}>
                                <AttachMoneyRoundedIcon sx={{ fontSize: 17, color: "#2563eb" }} />
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#2563eb" }}>
                                    Thông tin số tiền
                                </Typography>
                            </Stack>
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
                                {renderTransactionDetailField("Số tiền giao dịch", formatCurrency(selectedRow?.amount))}
                                {renderTransactionDetailField("Số tiền dự kiến", formatCurrency(selectedRow?.expectedAmount))}
                                {renderTransactionDetailField("Số tiền thực thanh toán", formatCurrency(selectedRow?.paidAmount), true)}
                            </Box>
                        </Box>

                        {selectedRow?.notes ? (
                            <Box sx={transactionDetailSectionSx}>
                                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 1 }}>
                                    <ReceiptLongRoundedIcon sx={{ fontSize: 17, color: "#2563eb" }} />
                                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#2563eb" }}>Ghi chú</Typography>
                                </Stack>
                                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
                                    {renderTransactionDetailField("Nội dung", selectedRow.notes, true)}
                                </Box>
                            </Box>
                        ) : null}
                    </Stack>
                </DialogContent>
                <DialogActions
                    sx={{
                        px: 2.5,
                        py: 2,
                        bgcolor: "#eff6ff",
                        borderTop: "1px solid #bfdbfe",
                        justifyContent: "flex-end",
                    }}
                >
                    <Button
                        variant="contained"
                        onClick={() => setSelectedRow(null)}
                        sx={{
                            textTransform: "none",
                            fontWeight: 700,
                            borderRadius: 2,
                            px: 2.5,
                            bgcolor: "#2563eb",
                            boxShadow: "0 6px 14px rgba(37,99,235,0.35)",
                            "&:hover": { bgcolor: "#1d4ed8" },
                        }}
                    >
                        Đóng
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
