import { useCallback, useEffect, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    FormControl,
    InputLabel,
    LinearProgress,
    MenuItem,
    Select,
    Skeleton,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import PersonOffRoundedIcon from "@mui/icons-material/PersonOffRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import PlayCircleRoundedIcon from "@mui/icons-material/PlayCircleRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import { BarChart, LineChart, PieChart } from "@mui/x-charts";
import { enqueueSnackbar } from "notistack";
import { getCampusConsultationStats } from "../../../services/CampusConsultationStatsService.jsx";

const PRESETS = [
    { value: "THIS_WEEK", label: "Tuần này" },
    { value: "THIS_MONTH", label: "Tháng này" },
    { value: "THIS_QUARTER", label: "Quý này" },
    { value: "THIS_YEAR", label: "Năm này" },
];

const CAMPUS_METRIC_OPTIONS = [
    { value: "total", label: "Tổng lịch hẹn" },
    { value: "completed", label: "Hoàn thành" },
    { value: "completionRate", label: "Tỉ lệ hoàn thành (%)" },
    { value: "noShow", label: "Bỏ hẹn" },
];

const STATUS_COLORS = {
    completed: "#16a34a",
    inProgress: "#7c3aed",
    confirmed: "#2563eb",
    pending: "#f59e0b",
    cancelled: "#dc2626",
    noShow: "#64748b",
};

function rateColor(rate, goodWhenHigh) {
    if (goodWhenHigh) {
        return rate >= 80 ? "#16a34a" : rate >= 50 ? "#f59e0b" : "#dc2626";
    }
    return rate <= 5 ? "#16a34a" : rate <= 15 ? "#f59e0b" : "#dc2626";
}

function toISO(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getPresetRange(preset) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    if (preset === "THIS_WEEK") {
        const dow = now.getDay();
        const mon = new Date(now);
        mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        return { from: toISO(mon), to: toISO(sun) };
    }
    if (preset === "THIS_MONTH") {
        return { from: `${y}-${String(m + 1).padStart(2, "0")}-01`, to: toISO(new Date(y, m + 1, 0)) };
    }
    if (preset === "THIS_QUARTER") {
        const q = Math.floor(m / 3);
        return { from: toISO(new Date(y, q * 3, 1)), to: toISO(new Date(y, q * 3 + 3, 0)) };
    }
    if (preset === "THIS_YEAR") {
        return { from: `${y}-01-01`, to: `${y}-12-31` };
    }
    return null;
}

function formatDateLabel(isoDate) {
    if (!isoDate) return "";
    const [y, mo, d] = isoDate.split("-");
    return `${d}/${mo}/${y}`;
}

export default function CampusConsultationStats() {
    const initRange = getPresetRange("THIS_MONTH");
    const [selectedFrom, setSelectedFrom] = useState(initRange.from);
    const [selectedTo, setSelectedTo] = useState(initRange.to);
    const [appliedFrom, setAppliedFrom] = useState(initRange.from);
    const [appliedTo, setAppliedTo] = useState(initRange.to);
    const [appliedPeriod, setAppliedPeriod] = useState("THIS_MONTH");
    const [activePreset, setActivePreset] = useState("THIS_MONTH");
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [campusMetric, setCampusMetric] = useState("total");

    const isDirty = selectedFrom !== appliedFrom || selectedTo !== appliedTo;

    const fetchStats = useCallback(async () => {
        if (!appliedFrom || !appliedTo) return;
        setLoading(true);
        try {
            const response = await getCampusConsultationStats({
                period: appliedPeriod,
                from: appliedFrom,
                to: appliedTo,
            });
            setStats(response?.data?.body || null);
        } catch (error) {
            enqueueSnackbar(
                error?.response?.data?.message || "Không thể tải thống kê tư vấn. Vui lòng thử lại.",
                { variant: "error" }
            );
        } finally {
            setLoading(false);
        }
    }, [appliedPeriod, appliedFrom, appliedTo]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handlePreset = (preset) => {
        const range = getPresetRange(preset);
        if (!range) return;
        setSelectedFrom(range.from);
        setSelectedTo(range.to);
        setAppliedFrom(range.from);
        setAppliedTo(range.to);
        setAppliedPeriod(preset);
        setActivePreset(preset);
    };

    const handleFromChange = (e) => {
        setSelectedFrom(e.target.value);
        setActivePreset(null);
    };

    const handleToChange = (e) => {
        setSelectedTo(e.target.value);
        setActivePreset(null);
    };

    const handleApply = () => {
        if (!selectedFrom || !selectedTo) {
            enqueueSnackbar("Vui lòng chọn ngày bắt đầu và ngày kết thúc.", { variant: "warning" });
            return;
        }
        if (selectedFrom > selectedTo) {
            enqueueSnackbar("Ngày bắt đầu không được sau ngày kết thúc.", { variant: "warning" });
            return;
        }
        setAppliedFrom(selectedFrom);
        setAppliedTo(selectedTo);
        setAppliedPeriod("CUSTOM");
    };

    const cards = stats?.cards || {};
    const trend = Array.isArray(stats?.trend) ? stats.trend : [];
    const byDayOfWeek = Array.isArray(stats?.byDayOfWeek) ? stats.byDayOfWeek : [];
    const byCampus = Array.isArray(stats?.byCampus) ? stats.byCampus : [];
    const isPrimaryBranch = stats?.isPrimaryBranch ?? false;
    // Chỉ ẩn charts khi chưa load lần nào (stats=null), không ẩn khi data=0
    const statsLoaded = stats !== null;
    const hasChartData = (cards.total ?? 0) > 0;

    // ── Status cards ──────────────────────────────────────────────
    const statusCards = [
        {
            key: "total",
            title: "Tổng lịch hẹn",
            value: cards.total ?? 0,
            icon: <EventNoteRoundedIcon sx={{ fontSize: 20 }} />,
            gradient: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 55%, #60a5fa 100%)",
            glow: "0 12px 28px rgba(37,99,235,0.35)",
        },
        {
            key: "pending",
            title: "Chờ xác nhận",
            value: cards.pending ?? 0,
            icon: <HourglassTopRoundedIcon sx={{ fontSize: 20 }} />,
            gradient: "linear-gradient(135deg, #d97706 0%, #f59e0b 55%, #fbbf24 100%)",
            glow: "0 12px 28px rgba(217,119,6,0.32)",
        },
        {
            key: "confirmed",
            title: "Đã xác nhận",
            value: cards.confirmed ?? 0,
            icon: <VerifiedRoundedIcon sx={{ fontSize: 20 }} />,
            gradient: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 55%, #38bdf8 100%)",
            glow: "0 12px 28px rgba(3,105,161,0.3)",
        },
        {
            key: "inProgress",
            title: "Đang diễn ra",
            value: cards.inProgress ?? 0,
            icon: <PlayCircleRoundedIcon sx={{ fontSize: 20 }} />,
            gradient: "linear-gradient(135deg, #6d28d9 0%, #8b5cf6 55%, #a78bfa 100%)",
            glow: "0 12px 28px rgba(109,40,217,0.3)",
        },
        {
            key: "completed",
            title: "Hoàn thành",
            value: cards.completed ?? 0,
            icon: <CheckCircleRoundedIcon sx={{ fontSize: 20 }} />,
            gradient: "linear-gradient(135deg, #15803d 0%, #22c55e 55%, #4ade80 100%)",
            glow: "0 12px 28px rgba(21,128,61,0.3)",
        },
        {
            key: "cancelled",
            title: "Đã huỷ",
            value: cards.cancelled ?? 0,
            icon: <CancelRoundedIcon sx={{ fontSize: 20 }} />,
            gradient: "linear-gradient(135deg, #b91c1c 0%, #ef4444 55%, #f87171 100%)",
            glow: "0 12px 28px rgba(185,28,28,0.3)",
        },
        {
            key: "noShow",
            title: "Bỏ hẹn",
            value: cards.noShow ?? 0,
            icon: <PersonOffRoundedIcon sx={{ fontSize: 20 }} />,
            gradient: "linear-gradient(135deg, #374151 0%, #6b7280 55%, #9ca3af 100%)",
            glow: "0 12px 28px rgba(55,65,81,0.3)",
        },
    ];

    // ── Rate cards ────────────────────────────────────────────────
    const rateCards = [
        { key: "completionRate", title: "Tỉ lệ hoàn thành", value: Number(cards.completionRate ?? 0), goodWhenHigh: true },
        { key: "cancellationRate", title: "Tỉ lệ huỷ", value: Number(cards.cancellationRate ?? 0), goodWhenHigh: false }
    ];

    // ── Trend chart ───────────────────────────────────────────────
    const trendLabels = trend.map((t) => t.label || "");
    const trendSeries = [
        { data: trend.map((t) => Number(t.completed ?? 0)), label: "Hoàn thành", color: STATUS_COLORS.completed, showMark: false },
        { data: trend.map((t) => Number(t.confirmed ?? 0)), label: "Đã xác nhận", color: STATUS_COLORS.confirmed, showMark: false },
        { data: trend.map((t) => Number(t.pending ?? 0)), label: "Chờ xác nhận", color: STATUS_COLORS.pending, showMark: false },
        { data: trend.map((t) => Number(t.cancelled ?? 0)), label: "Đã huỷ", color: STATUS_COLORS.cancelled, showMark: false },
    ];

    // ── byDayOfWeek ───────────────────────────────────────────────
    const dowLabels = byDayOfWeek.map((d) => d.label || d.day || "");
    const dowValues = byDayOfWeek.map((d) => Number(d.total ?? 0));

    // ── Donut ─────────────────────────────────────────────────────
    const pieData = [
        { id: 0, value: Number(cards.completed ?? 0), label: "Hoàn thành", color: STATUS_COLORS.completed },
        { id: 1, value: Number(cards.confirmed ?? 0), label: "Đã xác nhận", color: STATUS_COLORS.confirmed },
        { id: 2, value: Number(cards.inProgress ?? 0), label: "Đang xử lý", color: STATUS_COLORS.inProgress },
        { id: 3, value: Number(cards.pending ?? 0), label: "Chờ xác nhận", color: STATUS_COLORS.pending },
        { id: 4, value: Number(cards.cancelled ?? 0), label: "Đã huỷ", color: STATUS_COLORS.cancelled },
        { id: 5, value: Number(cards.noShow ?? 0), label: "Bỏ hẹn", color: STATUS_COLORS.noShow },
    ].filter((d) => d.value > 0);

    // ── byCampus ──────────────────────────────────────────────────
    const campusNames = byCampus.map((c) => c.campusName || `Cơ sở ${c.campusId}`);
    const getCampusValues = (key) => byCampus.map((c) => Number(c[key] ?? 0));
    const campusChartHeight = Math.max(220, byCampus.length * 60);

    // ── Shared sx ─────────────────────────────────────────────────
    const sectionCard = { elevation: 0, sx: { borderRadius: 3, border: "1px solid", borderColor: "divider" } };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4 }}>

            {/* ── HEADER + FILTERS ── always visible ─────────────── */}
            <Card {...sectionCard}>
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    {/* Title row */}
                    <Stack direction="row" alignItems="center" gap={1.25} mb={1.75}>
                        <QueryStatsRoundedIcon sx={{ color: "primary.main", fontSize: 28 }} />
                        <Box>
                            <Typography variant="h6" fontWeight={700} lineHeight={1.25}>
                                Thống kê tư vấn offline
                            </Typography>
                            {appliedFrom && appliedTo && (
                                <Typography variant="caption" color="text.secondary">
                                    {formatDateLabel(appliedFrom)} – {formatDateLabel(appliedTo)}
                                </Typography>
                            )}
                        </Box>
                    </Stack>

                    {/* Date range pickers + Apply */}
                    <Stack direction={{ xs: "column", sm: "row" }} gap={1.25} alignItems="center" flexWrap="wrap">
                        <TextField
                            label="Từ ngày"
                            type="date"
                            size="small"
                            value={selectedFrom}
                            onChange={handleFromChange}
                            InputLabelProps={{ shrink: true }}
                            sx={{ width: 170 }}
                        />
                        <Typography color="text.disabled" fontWeight={600} sx={{ userSelect: "none" }}>→</Typography>
                        <TextField
                            label="Đến ngày"
                            type="date"
                            size="small"
                            value={selectedTo}
                            onChange={handleToChange}
                            InputLabelProps={{ shrink: true }}
                            sx={{ width: 170 }}
                        />
                        {isDirty && (
                            <Button variant="contained" size="small" onClick={handleApply} sx={{ px: 2.5, height: 40 }}>
                                Áp dụng
                            </Button>
                        )}
                    </Stack>

                    {/* Quick preset chips */}
                    <Stack direction="row" gap={0.75} mt={1.25} flexWrap="wrap">
                        {PRESETS.map((p) => (
                            <Chip
                                key={p.value}
                                label={p.label}
                                size="small"
                                onClick={() => handlePreset(p.value)}
                                color={activePreset === p.value ? "primary" : "default"}
                                variant={activePreset === p.value ? "filled" : "outlined"}
                                sx={{ fontSize: 12, fontWeight: activePreset === p.value ? 700 : 500, cursor: "pointer" }}
                            />
                        ))}
                    </Stack>
                </CardContent>
            </Card>

            {/* ── STATE: LOADING ──────────────────────────────────── */}
            {loading && (
                <>
                    <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "repeat(2,1fr)", sm: "repeat(4,1fr)", lg: "repeat(7,1fr)" } }}>
                        {Array.from({ length: 7 }).map((_, i) => (
                            <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 3 }} />
                        ))}
                    </Box>
                    <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5,1fr)" } }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} variant="rounded" height={90} sx={{ borderRadius: 3 }} />
                        ))}
                    </Box>
                    <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3 }} />
                    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
                        <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
                        <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
                    </Box>
                </>
            )}

            {/* ── STATE: HAS DATA or NO DATA (luôn hiện cards khi đã load) ── */}
            {!loading && statsLoaded && (
                <>
                    {/* Row 1 – Status count cards */}
                    <Box
                        sx={{
                            display: "grid",
                            gap: 1.5,
                            gridTemplateColumns: {
                                xs: "repeat(2, 1fr)",
                                sm: "repeat(4, 1fr)",
                                lg: "repeat(7, 1fr)",
                            },
                        }}
                    >
                        {statusCards.map((card) => (
                            <Card
                                key={card.key}
                                elevation={0}
                                sx={{
                                    borderRadius: 3,
                                    background: card.gradient,
                                    boxShadow: card.glow,
                                    border: "1px solid rgba(255,255,255,0.28)",
                                    color: "#fff",
                                    minWidth: 0,
                                }}
                            >
                                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                        <Box minWidth={0}>
                                            <Typography
                                                sx={{
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    color: "rgba(255,255,255,0.85)",
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                }}
                                            >
                                                {card.title}
                                            </Typography>
                                            <Typography
                                                sx={{
                                                    fontSize: { xs: 28, md: 26 },
                                                    fontWeight: 900,
                                                    color: "#fff",
                                                    letterSpacing: "-0.025em",
                                                    lineHeight: 1.15,
                                                    mt: 0.25,
                                                }}
                                            >
                                                {card.value.toLocaleString("vi-VN")}
                                            </Typography>
                                        </Box>
                                        <Box
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: 1.5,
                                                bgcolor: "rgba(255,255,255,0.22)",
                                                border: "1px solid rgba(255,255,255,0.32)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                                color: "#fff",
                                            }}
                                        >
                                            {card.icon}
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>

                    {/* Row 2 – Rate cards */}
                    <Box
                        sx={{
                            display: "grid",
                            gap: 1.5,
                            gridTemplateColumns: {
                                xs: "1fr 1fr",
                                sm: "repeat(3, 1fr)",
                                md: "repeat(5, 1fr)",
                            },
                        }}
                    >
                        {rateCards.map((rc) => {
                            const color = rateColor(rc.value, rc.goodWhenHigh);
                            return (
                                <Card key={rc.key} {...sectionCard}>
                                    <CardContent sx={{ p: 1.75, "&:last-child": { pb: 1.75 } }}>
                                        <Typography
                                            sx={{
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: "text.secondary",
                                                mb: 0.5,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {rc.title}
                                        </Typography>
                                        <Typography sx={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.1, mb: 0.75 }}>
                                            {rc.value.toFixed(1)}%
                                        </Typography>
                                        <LinearProgress
                                            variant="determinate"
                                            value={Math.min(rc.value, 100)}
                                            sx={{
                                                height: 6,
                                                borderRadius: 3,
                                                bgcolor: `${color}22`,
                                                "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 },
                                            }}
                                        />
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Box>

                    {/* Banner khi chưa có lịch tư vấn */}
                    {!hasChartData && (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                p: 2,
                                borderRadius: 3,
                                bgcolor: "rgba(37,99,235,0.06)",
                                border: "1px dashed rgba(37,99,235,0.3)",
                            }}
                        >
                            <BarChartRoundedIcon sx={{ color: "primary.main", opacity: 0.6, fontSize: 28, flexShrink: 0 }} />
                            <Box>
                                <Typography variant="body2" fontWeight={600} color="primary.main">
                                    Chưa có lịch tư vấn trong kỳ này
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Biểu đồ xu hướng và phân bổ sẽ hiển thị khi có dữ liệu.
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {/* Row 3 – Trend line chart */}
                    {hasChartData && (
                    <Card {...sectionCard}>
                        <CardContent sx={{ p: 2, pb: 0, "&:last-child": { pb: 0 } }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
                                Xu hướng theo thời gian
                            </Typography>
                            <LineChart
                                xAxis={[{ data: trendLabels, scaleType: "point" }]}
                                series={trendSeries}
                                height={300}
                                margin={{ left: 44, right: 24, top: 16, bottom: 44 }}
                            />
                        </CardContent>
                    </Card>
                    )}

                    {/* Row 4 – byDayOfWeek + Donut */}
                    {hasChartData && <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
                        <Card {...sectionCard}>
                            <CardContent sx={{ p: 2, pb: 0, "&:last-child": { pb: 0 } }}>
                                <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
                                    Phân bổ theo thứ trong tuần
                                </Typography>
                                <BarChart
                                    layout="horizontal"
                                    yAxis={[{ data: dowLabels, scaleType: "band" }]}
                                    xAxis={[{ scaleType: "linear" }]}
                                    series={[{ data: dowValues, color: "#2563eb", label: "Số lịch hẹn" }]}
                                    height={260}
                                    margin={{ left: 88, right: 20, top: 10, bottom: 32 }}
                                />
                            </CardContent>
                        </Card>

                        <Card {...sectionCard}>
                            <CardContent sx={{ p: 2, pb: 0, "&:last-child": { pb: 0 } }}>
                                <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
                                    Phân bổ trạng thái
                                </Typography>
                                {pieData.length > 0 ? (
                                    <PieChart
                                        series={[{
                                            data: pieData,
                                            innerRadius: 58,
                                            outerRadius: 100,
                                            paddingAngle: 2,
                                            cornerRadius: 4,
                                        }]}
                                        height={260}
                                    />
                                ) : (
                                    <Box sx={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Typography color="text.secondary">Chưa có dữ liệu</Typography>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Box>}

                    {/* Row 5 – byCampus (chỉ HQ) */}
                    {isPrimaryBranch && byCampus.length > 0 && (
                        <Card {...sectionCard}>
                            <CardContent sx={{ p: 2, pb: 0, "&:last-child": { pb: 0 } }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                                    <Typography variant="subtitle1" fontWeight={700}>
                                        So sánh giữa các cơ sở
                                    </Typography>
                                    <FormControl size="small" sx={{ minWidth: 210 }}>
                                        <InputLabel>Chỉ số</InputLabel>
                                        <Select
                                            value={campusMetric}
                                            label="Chỉ số"
                                            onChange={(e) => setCampusMetric(e.target.value)}
                                        >
                                            {CAMPUS_METRIC_OPTIONS.map((opt) => (
                                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Stack>

                                {campusMetric === "total" ? (
                                    <BarChart
                                        layout="horizontal"
                                        yAxis={[{ data: campusNames, scaleType: "band" }]}
                                        xAxis={[{ scaleType: "linear" }]}
                                        series={[
                                            { data: getCampusValues("completed"), label: "Hoàn thành", color: STATUS_COLORS.completed, stack: "s" },
                                            { data: getCampusValues("inProgress"), label: "Đang xử lý", color: STATUS_COLORS.inProgress, stack: "s" },
                                            { data: getCampusValues("cancelled"), label: "Đã huỷ", color: STATUS_COLORS.cancelled, stack: "s" },
                                            { data: getCampusValues("noShow"), label: "Bỏ hẹn", color: STATUS_COLORS.noShow, stack: "s" },
                                        ]}
                                        height={campusChartHeight}
                                        margin={{ left: 130, right: 24, top: 12, bottom: 36 }}
                                    />
                                ) : campusMetric === "completionRate" ? (
                                    <BarChart
                                        layout="horizontal"
                                        yAxis={[{ data: campusNames, scaleType: "band" }]}
                                        xAxis={[{ scaleType: "linear", min: 0, max: 100 }]}
                                        series={[{
                                            data: getCampusValues("completionRate"),
                                            label: "Tỉ lệ hoàn thành (%)",
                                            color: STATUS_COLORS.completed,
                                        }]}
                                        height={campusChartHeight}
                                        margin={{ left: 130, right: 24, top: 12, bottom: 36 }}
                                    />
                                ) : (
                                    <BarChart
                                        layout="horizontal"
                                        yAxis={[{ data: campusNames, scaleType: "band" }]}
                                        xAxis={[{ scaleType: "linear" }]}
                                        series={[{
                                            data: getCampusValues(campusMetric),
                                            label: CAMPUS_METRIC_OPTIONS.find((o) => o.value === campusMetric)?.label || campusMetric,
                                            color: STATUS_COLORS.completed,
                                        }]}
                                        height={campusChartHeight}
                                        margin={{ left: 130, right: 24, top: 12, bottom: 36 }}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </Box>
    );
}
