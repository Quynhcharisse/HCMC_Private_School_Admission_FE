import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Box,
    Card,
    CardContent,
    CircularProgress,
    Stack,
    Typography,
} from "@mui/material";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import ReceiptRoundedIcon from "@mui/icons-material/ReceiptRounded";
import { LineChart, PieChart } from "@mui/x-charts";
import { enqueueSnackbar } from "notistack";
import { getAdminRevenueSummary } from "../../../services/AdminService.jsx";

const PACKAGE_TYPE_OPTIONS = ["STANDARD", "TRIAL", "ENTERPRISE"];

function formatVnd(value) {
    if (value === null || value === undefined) return "0 VNĐ";
    return `${Number(value).toLocaleString("vi-VN")} VNĐ`;
}

function getErrorMessage(error) {
    return (
        error?.response?.data?.message ||
        error?.response?.data?.body?.message ||
        "Không thể tải dữ liệu doanh thu. Vui lòng thử lại."
    );
}

function getPeriodLabel(period) {
    if (!period) return "N/A";
    const parsed = new Date(period);
    if (Number.isNaN(parsed.getTime())) return String(period);
    return parsed.toLocaleDateString("vi-VN");
}

export default function AdminDashboard() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(currentMonth);
    const [packageType, setPackageType] = useState("STANDARD");
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState(null);

    const yearOptions = useMemo(
        () => Array.from({ length: 8 }, (_, i) => currentYear - 5 + i),
        [currentYear]
    );

    const fetchRevenueSummary = useCallback(async () => {
        if (!year) return;
        setLoading(true);
        try {
            const response = await getAdminRevenueSummary({
                year,
                month,
                packageType: packageType || undefined,
            });
            setSummary(response?.data?.body || null);
        } catch (error) {
            enqueueSnackbar(getErrorMessage(error), { variant: "error" });
        } finally {
            setLoading(false);
        }
    }, [month, packageType, year]);

    useEffect(() => {
        fetchRevenueSummary();
    }, [fetchRevenueSummary]);

    const totals = summary?.totals || {
        totalNetRevenue: 0,
        totalServiceFee: 0,
        totalTaxFee: 0,
        totalFinalRevenue: 0,
        totalTransactions: 0,
    };

    const trend = Array.isArray(summary?.trend) ? summary.trend : [];
    const trendInSelectedMonth = trend
        .map((item) => {
            const parsed = new Date(item?.period);
            if (Number.isNaN(parsed.getTime())) return null;
            if (parsed.getFullYear() !== Number(year) || parsed.getMonth() + 1 !== Number(month)) return null;
            return {
                day: parsed.getDate(),
                finalRevenue: Number(item?.finalRevenue || 0),
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.day - b.day);

    const trendChangePoints = (() => {
        const points = [{ day: 1, finalRevenue: 0 }];
        trendInSelectedMonth.forEach((item) => {
            const previous = points[points.length - 1];
            if (previous.finalRevenue !== item.finalRevenue) {
                points.push(item);
            }
        });
        return points;
    })();
    const trendXAxisChart = trendChangePoints.map((item) => `${item.day}`);
    const trendSeriesChart = trendChangePoints.map((item) => item.finalRevenue);

    const pieData = [
        { id: 0, label: "Doanh thu thuần", value: Number(totals.totalNetRevenue || 0), color: "#2563eb" },
        { id: 1, label: "Phí dịch vụ", value: Number(totals.totalServiceFee || 0), color: "#16a34a" },
        { id: 2, label: "Thuế", value: Number(totals.totalTaxFee || 0), color: "#f59e0b" },
    ];
    const pieTotal = pieData.reduce((sum, item) => sum + item.value, 0);
    const pieDataWithPercent = pieData.map((item) => ({
        ...item,
        percent: pieTotal > 0 ? Math.round((item.value / pieTotal) * 100) : 0,
    }));

    const kpiCards = [
        {
            key: "totalFinalRevenue",
            title: "Tổng doanh thu",
            value: formatVnd(totals.totalFinalRevenue),
            icon: <AttachMoneyRoundedIcon sx={{ fontSize: 22 }} />,
            color: "#1d4ed8",
            gradient: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 55%, #60a5fa 100%)",
            glow: "0 16px 30px rgba(37, 99, 235, 0.35)",
        },
        {
            key: "totalTransactions",
            title: "Số giao dịch",
            value: Number(totals.totalTransactions || 0).toLocaleString("vi-VN"),
            icon: <ReceiptRoundedIcon sx={{ fontSize: 22 }} />,
            color: "#7c3aed",
            gradient: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 55%, #a78bfa 100%)",
            glow: "0 16px 30px rgba(124, 58, 237, 0.33)",
        },
    ];

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
            }}
        >
            <Box
                sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                    opacity: loading ? 0.45 : 1,
                    transition: "opacity 140ms ease",
                }}
            >
                {kpiCards.map((card) => (
                    <Box key={card.key}>
                        <Card
                            elevation={0}
                            sx={{
                                borderRadius: 3,
                                border: "1px solid rgba(255,255,255,0.35)",
                                height: "100%",
                                color: "#ffffff",
                                background: card.gradient,
                                boxShadow: card.glow,
                                position: "relative",
                                overflow: "hidden",
                                transition: "transform 180ms ease, box-shadow 180ms ease",
                                "&::after": {
                                    content: '""',
                                    position: "absolute",
                                    inset: 0,
                                    background: "radial-gradient(circle at top right, rgba(255,255,255,0.26), transparent 48%)",
                                    pointerEvents: "none",
                                },
                                "&:hover": {
                                    transform: "translateY(-3px)",
                                    boxShadow: `${card.glow}, 0 18px 32px rgba(15, 23, 42, 0.18)`,
                                },
                            }}
                        >
                            <CardContent sx={{ p: 2 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                    <Box>
                                        <Typography sx={{ color: "rgba(255,255,255,0.86)", fontSize: 12, fontWeight: 600 }}>
                                            {card.title}
                                        </Typography>
                                        <Typography sx={{ mt: 0.6, fontSize: 26, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.02em" }}>
                                            {card.value}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 2,
                                            color: "#ffffff",
                                            bgcolor: "rgba(255,255,255,0.24)",
                                            border: "1px solid rgba(255,255,255,0.35)",
                                            boxShadow: "0 6px 18px rgba(15,23,42,0.2)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        {card.icon}
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Box>
                ))}
            </Box>

            <Box
                sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                    alignItems: "stretch",
                    opacity: loading ? 0.45 : 1,
                    transition: "opacity 140ms ease",
                }}
            >
                <Box>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid #93c5fd",
                            background: "linear-gradient(145deg, #ffffff 0%, #eff6ff 100%)",
                            boxShadow: "0 14px 30px rgba(37,99,235,0.16)",
                            transition: "transform 180ms ease, box-shadow 180ms ease",
                            height: "100%",
                            "&:hover": {
                                transform: "translateY(-2px)",
                                boxShadow: "0 18px 36px rgba(37,99,235,0.2)",
                            },
                        }}
                    >
                        <CardContent sx={{ p: 2.2 }}>
                            <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 0.4 }}>
                                Biến động doanh thu
                            </Typography>
                            <Typography sx={{ color: "#64748b", fontSize: 13, mb: 1.4 }}>
                                Theo dõi tăng/giảm doanh thu theo thời gian.
                            </Typography>
                            {trendInSelectedMonth.length === 0 ? (
                                <Box sx={{ py: 6, textAlign: "center", color: "#64748b" }}>Không có dữ liệu xu hướng.</Box>
                            ) : (
                                <LineChart
                                    height={320}
                                    xAxis={[{ scaleType: "point", data: trendXAxisChart }]}
                                    yAxis={[
                                        {
                                            width: 96,
                                            valueFormatter: (value) => Number(value || 0).toLocaleString("vi-VN"),
                                        },
                                    ]}
                                    series={[
                                        {
                                            data: trendSeriesChart,
                                            label: "Doanh thu",
                                            color: "#2563eb",
                                            area: false,
                                            showMark: true,
                                            curve: "linear",
                                            lineWidth: 3,
                                            valueFormatter: (value) => formatVnd(value),
                                        },
                                    ]}
                                    margin={{ left: 12, right: 20, top: 20, bottom: 40 }}
                                />
                            )}
                        </CardContent>
                    </Card>
                </Box>

                <Box>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid #d8b4fe",
                            height: "100%",
                            background: "linear-gradient(145deg, #ffffff 0%, #faf5ff 100%)",
                            boxShadow: "0 14px 30px rgba(124,58,237,0.16)",
                            transition: "transform 180ms ease, box-shadow 180ms ease",
                            "&:hover": {
                                transform: "translateY(-2px)",
                                boxShadow: "0 18px 36px rgba(124,58,237,0.2)",
                            },
                        }}
                    >
                        <CardContent sx={{ p: 2.2 }}>
                            <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 0.4 }}>
                                Phân bổ doanh thu
                            </Typography>
                            <Typography sx={{ color: "#64748b", fontSize: 13, mb: 1.4 }}>
                                Cơ cấu doanh thu thuần, phí dịch vụ và thuế.
                            </Typography>

                            {pieData.every((item) => item.value === 0) ? (
                                <Box sx={{ py: 6, textAlign: "center", color: "#64748b" }}>Không có dữ liệu cơ cấu doanh thu.</Box>
                            ) : (
                                <Stack direction={{ xs: "column", md: "row" }} alignItems="center" spacing={1.2}>
                                    <Stack spacing={1.1} sx={{ minWidth: 135, alignSelf: "stretch", justifyContent: "center" }}>
                                        {pieDataWithPercent.map((item) => (
                                            <Stack key={item.id} direction="row" alignItems="center" spacing={1}>
                                                <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: item.color, flexShrink: 0 }} />
                                                <Typography sx={{ color: "#334155", fontSize: 13, fontWeight: 500 }}>
                                                    {item.label}
                                                </Typography>
                                            </Stack>
                                        ))}
                                    </Stack>
                                    <PieChart
                                        height={260}
                                        hideLegend
                                        series={[
                                            {
                                                data: pieDataWithPercent,
                                                innerRadius: 0,
                                                outerRadius: 108,
                                                paddingAngle: 0,
                                                cornerRadius: 0,
                                                valueFormatter: (value) => formatVnd(value.value),
                                            },
                                        ]}
                                    />
                                </Stack>
                            )}
                        </CardContent>
                    </Card>
                </Box>
            </Box>

            {loading ? (
                <Box
                    sx={{
                        position: "absolute",
                        inset: 0,
                        zIndex: 5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 3,
                        background: "rgba(248, 250, 252, 0.55)",
                        backdropFilter: "blur(2px)",
                    }}
                >
                    <CircularProgress size={42} />
                </Box>
            ) : null}
        </Box>
    );
}
