import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    FormControl,
    InputLabel,
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
} from "@mui/material";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import { LineChart, PieChart } from "@mui/x-charts";
import { enqueueSnackbar } from "notistack";
import { getAdminDashboardOverview, getAdminRevenueSummary } from "../../../services/AdminService.jsx";

function toInputDate(value) {
    return value.toISOString().slice(0, 10);
}

function formatVnd(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")} VNĐ`;
}

function scopeToVi(scope) {
    const normalized = String(scope || "").toUpperCase();
    if (normalized === "DAY") return "Ngày";
    if (normalized === "WEEK") return "Tuần";
    if (normalized === "MONTH") return "Tháng";
    if (normalized === "YEAR") return "Năm";
    return "Không xác định";
}

function formatPeriodLabel(period, scope) {
    const raw = String(period || "");
    if (!raw) return "Không xác định";
    if (scope === "DAY" && raw.includes("-")) {
        const [y, m, d] = raw.split("-");
        return `${d}-${m}-${y}`;
    }
    if (scope === "MONTH" && raw.includes("-")) {
        const [y, m] = raw.split("-");
        return `${m}-${y}`;
    }
    return raw;
}

function buildQuickRange(type) {
    const now = new Date();
    const thisYear = now.getFullYear();
    if (type === "THIS_YEAR") return { startDate: `${thisYear}-01-01`, endDate: `${thisYear}-12-31` };
    if (type === "LAST_YEAR") return { startDate: `${thisYear - 1}-01-01`, endDate: `${thisYear - 1}-12-31` };
    if (type === "LAST_5_YEARS") return { startDate: `${thisYear - 4}-01-01`, endDate: `${thisYear}-12-31` };
    return { startDate: `${thisYear - 1}-12-01`, endDate: `${thisYear}-03-31` };
}

export default function AdminDashboard() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const [startDate, setStartDate] = useState(toInputDate(new Date(currentYear, now.getMonth(), 1)));
    const [endDate, setEndDate] = useState(toInputDate(now));
    const [packageType, setPackageType] = useState("");
    const [revenueLoading, setRevenueLoading] = useState(false);
    const [revenueSummary, setRevenueSummary] = useState(null);

    const [year] = useState(currentYear);
    const [overviewLoading, setOverviewLoading] = useState(false);
    const [overview, setOverview] = useState(null);

    const fetchOverview = useCallback(async () => {
        if (!year) return;
        setOverviewLoading(true);
        try {
            const response = await getAdminDashboardOverview({ year });
            setOverview(response?.data?.body || null);
        } catch (error) {
            enqueueSnackbar(
                error?.response?.data?.message || "Không thể tải thống kê tổng quát. Vui lòng thử lại.",
                { variant: "error" }
            );
        } finally {
            setOverviewLoading(false);
        }
    }, [year]);

    useEffect(() => {
        fetchOverview();
    }, [fetchOverview]);

    const fetchRevenueSummary = useCallback(async () => {
        if (!startDate || !endDate) return;
        setRevenueLoading(true);
        try {
            const response = await getAdminRevenueSummary({
                startDate,
                endDate,
                packageType: packageType || undefined,
            });
            setRevenueSummary(response?.data?.body || null);
        } catch (error) {
            enqueueSnackbar(
                error?.response?.data?.message || "Không thể tải thống kê doanh thu. Vui lòng thử lại.",
                { variant: "error" }
            );
        } finally {
            setRevenueLoading(false);
        }
    }, [endDate, packageType, startDate]);

    useEffect(() => {
        fetchRevenueSummary();
    }, [fetchRevenueSummary]);

    const usersByRole = overview?.usersByRole || {};
    const verified = Number(overview?.verificationStatus?.verified || 0);
    const unverified = Number(overview?.verificationStatus?.unverified || 0);
    const activeSchools = Number(overview?.activeSchools || 0);
    const parentCount = Number(usersByRole.PARENT ?? usersByRole.STUDENT ?? 0);
    const counsellorCount = Number(usersByRole.COUNSELLOR || 0);
    const schoolAccountCount = Number(usersByRole.SCHOOL || 0);
    const isOverviewEmpty =
        activeSchools === 0 &&
        parentCount === 0 &&
        counsellorCount === 0 &&
        schoolAccountCount === 0 &&
        verified === 0 &&
        unverified === 0;

    const overviewKpiCards = [
        {
            key: "activeSchools",
            title: "Trường đang hoạt động",
            value: activeSchools.toLocaleString("vi-VN"),
            icon: <SchoolRoundedIcon sx={{ fontSize: 22 }} />,
            iconColor: "#0369a1",
            iconBg: "#e0f2fe",
            cardBg: "#f0f9ff",
        },
        {
            key: "parents",
            title: "Phụ huynh",
            value: parentCount.toLocaleString("vi-VN"),
            icon: <GroupRoundedIcon sx={{ fontSize: 22 }} />,
            iconColor: "#1d4ed8",
            iconBg: "#dbeafe",
            cardBg: "#eff6ff",
        },
        {
            key: "counsellors",
            title: "Tư vấn viên",
            value: counsellorCount.toLocaleString("vi-VN"),
            icon: <SupportAgentRoundedIcon sx={{ fontSize: 22 }} />,
            iconColor: "#15803d",
            iconBg: "#dcfce7",
            cardBg: "#f0fdf4",
        },
    ];

    const verificationPieData = [
        { id: 0, label: "Đã xác thực", value: verified, color: "#16a34a" },
        { id: 1, label: "Chưa xác thực", value: unverified, color: "#f59e0b" },
    ];

    const totals = revenueSummary?.totals || {};
    const trend = Array.isArray(revenueSummary?.trend) ? revenueSummary.trend : [];
    const scope = String(revenueSummary?.scope || "DAY").toUpperCase();
    const scopeLabel = scopeToVi(scope);

    const revenueCards = [
        {
            key: "totalNetRevenue",
            title: "Tổng Doanh thu (Chưa trừ phí)",
            value: formatVnd(totals.totalNetRevenue),
            icon: <AttachMoneyRoundedIcon sx={{ fontSize: 22 }} />,
            iconColor: "#075985",
            iconBg: "#e0f2fe",
            cardBg: "#ecfeff",
        },
        {
            key: "totalFinalRevenue",
            title: "Lợi nhuận Thực nhận",
            value: formatVnd(totals.totalFinalRevenue),
            icon: <AccountBalanceWalletRoundedIcon sx={{ fontSize: 22 }} />,
            iconColor: "#0f766e",
            iconBg: "#ccfbf1",
            cardBg: "#f0fdfa",
        },
        {
            key: "cost",
            title: "Chi phí Dịch vụ & Thuế",
            value: formatVnd(Number(totals.totalServiceFee || 0) + Number(totals.totalTaxFee || 0)),
            icon: <ReceiptLongRoundedIcon sx={{ fontSize: 22 }} />,
            iconColor: "#c2410c",
            iconBg: "#ffedd5",
            cardBg: "#fff7ed",
        },
        {
            key: "transactions",
            title: "Số lượng Giao dịch",
            value: `${Number(totals.totalTransactions || 0).toLocaleString("vi-VN")} giao dịch`,
            icon: <SwapHorizRoundedIcon sx={{ fontSize: 22 }} />,
            iconColor: "#6d28d9",
            iconBg: "#ede9fe",
            cardBg: "#f5f3ff",
        },
    ];

    const chartLabels = useMemo(() => trend.map((item) => formatPeriodLabel(item?.period, scope)), [scope, trend]);
    const netSeries = useMemo(() => trend.map((item) => Number(item?.netRevenue || 0)), [trend]);
    const finalSeries = useMemo(() => trend.map((item) => Number(item?.finalRevenue || 0)), [trend]);
    const hasValidChart = chartLabels.length > 0 && netSeries.length === chartLabels.length && finalSeries.length === chartLabels.length;

    const handleQuickRange = (type) => {
        const range = buildQuickRange(type);
        setStartDate(range.startDate);
        setEndDate(range.endDate);
    };

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
                    gap: 1.25,
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
                }}
            >
                {(overviewLoading || revenueLoading
                    ? Array.from({ length: overviewKpiCards.length }, (_, idx) => ({ key: `top-skeleton-${idx}`, isSkeleton: true }))
                    : overviewKpiCards
                ).map((card) => (
                    <Card
                        key={card.key}
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid #e2e8f0",
                            bgcolor: card.cardBg || "#ffffff",
                            boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                            minWidth: 0,
                        }}
                    >
                        {"isSkeleton" in card ? (
                            <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
                                <Skeleton variant="text" width="50%" height={22} />
                                <Skeleton variant="text" width="70%" height={42} />
                            </CardContent>
                        ) : (
                            <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
                                <Stack direction="row" spacing={0.95} alignItems="center">
                                    <Box
                                        sx={{
                                            width: 30,
                                            height: 30,
                                            borderRadius: 1.2,
                                            color: card.iconColor || "#7c3aed",
                                            bgcolor: card.iconBg || "#f3e8ff",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Box sx={{ "& .MuiSvgIcon-root": { fontSize: 16 } }}>{card.icon}</Box>
                                    </Box>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography sx={{ color: "#64748b", fontSize: 11, lineHeight: 1.15, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {card.title}
                                        </Typography>
                                        <Typography sx={{ mt: 0.1, fontSize: { xs: 19, md: 18, lg: 19 }, lineHeight: 1.2, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>
                                            {card.value}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        )}
                    </Card>
                ))}
            </Box>

            <Box
                sx={{
                    display: "grid",
                    gap: 1.25,
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
                }}
            >
                {(overviewLoading || revenueLoading
                    ? Array.from({ length: revenueCards.length }, (_, idx) => ({ key: `bottom-skeleton-${idx}`, isSkeleton: true }))
                    : revenueCards
                ).map((card) => (
                    <Card
                        key={card.key}
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid #e2e8f0",
                            bgcolor: card.cardBg || "#ffffff",
                            boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                            minWidth: 0,
                        }}
                    >
                        {"isSkeleton" in card ? (
                            <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
                                <Skeleton variant="text" width="50%" height={22} />
                                <Skeleton variant="text" width="70%" height={42} />
                            </CardContent>
                        ) : (
                            <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
                                <Stack direction="row" spacing={0.95} alignItems="center">
                                    <Box
                                        sx={{
                                            width: 30,
                                            height: 30,
                                            borderRadius: 1.2,
                                            color: card.iconColor || "#7c3aed",
                                            bgcolor: card.iconBg || "#f3e8ff",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Box sx={{ "& .MuiSvgIcon-root": { fontSize: 16 } }}>{card.icon}</Box>
                                    </Box>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography sx={{ color: "#64748b", fontSize: 11, lineHeight: 1.15, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {card.title}
                                        </Typography>
                                        <Typography sx={{ mt: 0.1, fontSize: { xs: 19, md: 18, lg: 19 }, lineHeight: 1.2, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>
                                            {card.value}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        )}
                    </Card>
                ))}
            </Box>

            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #bfdbfe",
                    background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 40%, #f0f9ff 100%)",
                    boxShadow: "0 16px 36px rgba(37,99,235,0.16)",
                }}
            >
                <CardContent sx={{ p: 2 }}>
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        justifyContent="space-between"
                        sx={{ mb: 1.2 }}
                    >
                        <Box>
                            <Typography sx={{ fontWeight: 900, color: "#0f172a", fontSize: 20 }}>Báo cáo Doanh thu</Typography>
                            <Typography sx={{ color: "#475569", fontSize: 13 }}>
                                Theo dõi biến động doanh thu và hiệu quả thực nhận trong kỳ.
                            </Typography>
                        </Box>
                        <Chip label={`Đang xem theo: ${scopeLabel}`} color="primary" sx={{ fontWeight: 700, bgcolor: "#ffffff" }} />
                    </Stack>

                    <Stack
                        direction={{ xs: "column", xl: "row" }}
                        spacing={1.5}
                        alignItems={{ xs: "stretch", xl: "center" }}
                        justifyContent="space-between"
                        sx={{
                            p: 1.2,
                            borderRadius: 2,
                            border: "1px solid #dbeafe",
                            bgcolor: "rgba(255,255,255,0.92)",
                        }}
                    >
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems={{ md: "center" }}>
                            <Typography sx={{ fontWeight: 700, color: "#0f172a", minWidth: 132 }}>Thời gian báo cáo:</Typography>
                            <TextField type="date" size="small" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            <Typography sx={{ color: "#64748b", fontWeight: 600 }}>đến</Typography>
                            <TextField type="date" size="small" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </Stack>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems={{ md: "center" }}>
                            <Typography sx={{ fontWeight: 700, color: "#0f172a", minWidth: 78 }}>Loại gói:</Typography>
                            <FormControl size="small" sx={{ minWidth: 210 }}>
                                <InputLabel id="package-type-label">Loại gói</InputLabel>
                                <Select labelId="package-type-label" label="Loại gói" value={packageType} onChange={(e) => setPackageType(e.target.value)}>
                                    <MenuItem value="">Tất cả</MenuItem>
                                    <MenuItem value="TRIAL">Gói Dùng thử</MenuItem>
                                    <MenuItem value="STANDARD">Gói Tiêu chuẩn</MenuItem>
                                    <MenuItem value="ENTERPRISE">Gói Doanh nghiệp</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ mt: 1.4, flexWrap: "wrap" }}>
                        <Button size="small" variant="outlined" sx={{ borderRadius: 99, bgcolor: "#ffffff" }} onClick={() => handleQuickRange("THIS_YEAR")}>Năm nay</Button>
                        <Button size="small" variant="outlined" sx={{ borderRadius: 99, bgcolor: "#ffffff" }} onClick={() => handleQuickRange("LAST_YEAR")}>Năm trước</Button>
                        <Button size="small" variant="outlined" sx={{ borderRadius: 99, bgcolor: "#ffffff" }} onClick={() => handleQuickRange("LAST_5_YEARS")}>5 năm gần nhất</Button>
                        <Button size="small" variant="outlined" sx={{ borderRadius: 99, bgcolor: "#ffffff" }} onClick={() => handleQuickRange("DEC_TO_MAR")}>Tháng 12 đến Tháng 3</Button>
                        <Button
                            size="small"
                            variant="contained"
                            onClick={fetchRevenueSummary}
                            sx={{
                                borderRadius: 99,
                                px: 2,
                                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                                boxShadow: "0 8px 18px rgba(37,99,235,0.28)",
                            }}
                        >
                            Áp dụng
                        </Button>
                    </Stack>
                </CardContent>
            </Card>

            <Box
                sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: "1fr",
                    alignItems: "stretch",
                }}
            >
                <Card
                    elevation={0}
                    sx={{
                        borderRadius: 3,
                        border: "1px solid #bbf7d0",
                        background: "linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%)",
                        boxShadow: "0 14px 30px rgba(22,163,74,0.14)",
                    }}
                >
                    <CardContent sx={{ p: 2.2 }}>
                        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 0.4 }}>
                            Trạng thái xác thực trường
                        </Typography>
                        <Typography sx={{ color: "#64748b", fontSize: 13, mb: 1.4 }}>
                            Tỷ lệ trường đã xác thực trong hệ thống.
                        </Typography>

                        {overviewLoading ? (
                            <Skeleton variant="rounded" height={300} />
                        ) : verified + unverified === 0 ? (
                            <Box sx={{ py: 6, textAlign: "center", color: "#64748b" }}>Không có dữ liệu xác thực.</Box>
                        ) : (
                            <Stack direction={{ xs: "column", md: "row" }} alignItems="center" spacing={1.2}>
                                <Stack spacing={1.1} sx={{ minWidth: 155, alignSelf: "stretch", justifyContent: "center" }}>
                                    {verificationPieData.map((item) => (
                                        <Stack key={item.id} direction="row" alignItems="center" spacing={1}>
                                            <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: item.color, flexShrink: 0 }} />
                                            <Typography sx={{ color: "#334155", fontSize: 13, fontWeight: 500 }}>
                                                {item.label}: {item.value.toLocaleString("vi-VN")}
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Stack>

                                <PieChart
                                    height={260}
                                    hideLegend
                                    series={[
                                        {
                                            data: verificationPieData,
                                            innerRadius: 65,
                                            outerRadius: 105,
                                            paddingAngle: 1,
                                            cornerRadius: 4,
                                            valueFormatter: (value) => `${Number(value.value || 0).toLocaleString("vi-VN")} trường`,
                                        },
                                    ]}
                                />
                            </Stack>
                        )}
                    </CardContent>
                </Card>
            </Box>

            {!overviewLoading && isOverviewEmpty ? (
                <Card elevation={0} sx={{ borderRadius: 3, border: "1px dashed #cbd5e1", bgcolor: "#f8fafc" }}>
                    <CardContent sx={{ py: 3.5 }}>
                        <Typography sx={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>
                            Chưa có dữ liệu tổng quát cho năm {year}.
                        </Typography>
                    </CardContent>
                </Card>
            ) : null}

            <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #bfdbfe", background: "linear-gradient(145deg, #ffffff 0%, #eff6ff 100%)", boxShadow: "0 14px 30px rgba(37,99,235,0.12)" }}>
                <CardContent sx={{ p: 2.2 }}>
                    <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 0.3 }}>Biểu đồ Xu hướng Doanh thu theo {scopeLabel}</Typography>
                    <Typography sx={{ color: "#64748b", fontSize: 13, mb: 1.1 }}>
                        So sánh trực quan tổng doanh thu và lợi nhuận thực nhận theo từng giai đoạn.
                    </Typography>
                    {revenueLoading ? (
                        <Skeleton variant="rounded" height={300} />
                    ) : !hasValidChart ? (
                        <Box sx={{ py: 6, textAlign: "center", color: "#64748b" }}>Không có dữ liệu xu hướng doanh thu.</Box>
                    ) : (
                        <LineChart
                            height={320}
                            xAxis={[{ scaleType: "point", data: chartLabels }]}
                            series={[
                                { data: netSeries, label: "Tổng doanh thu", color: "#2563eb", valueFormatter: (value) => formatVnd(value) },
                                { data: finalSeries, label: "Lợi nhuận thực nhận", color: "#f97316", valueFormatter: (value) => formatVnd(value) },
                            ]}
                            yAxis={[
                                {
                                    width: 90,
                                    valueFormatter: (value) => Number(value || 0).toLocaleString("vi-VN"),
                                },
                            ]}
                            margin={{ left: 0, right: 56, top: 20, bottom: 50 }}
                        />
                    )}
                </CardContent>
            </Card>

            <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#ffffff", boxShadow: "0 12px 24px rgba(15,23,42,0.06)" }}>
                <CardContent sx={{ p: 2.2 }}>
                    <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 0.4 }}>Bảng Số liệu Chi tiết theo {scopeLabel}</Typography>
                    <Typography sx={{ color: "#64748b", fontSize: 13, mb: 1.2 }}>
                        Bảng đối soát doanh thu, chi phí và giao dịch cho từng giai đoạn.
                    </Typography>
                    {revenueLoading ? (
                        <Skeleton variant="rounded" height={280} />
                    ) : trend.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: "center", color: "#64748b" }}>Không có dữ liệu chi tiết.</Box>
                    ) : (
                        <TableContainer sx={{ border: "1px solid #dbeafe", borderRadius: 2, overflow: "hidden" }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: "#eff6ff" }}>
                                        <TableCell>Giai đoạn</TableCell>
                                        <TableCell align="right">Tổng Doanh thu</TableCell>
                                        <TableCell align="right">Phí Dịch vụ</TableCell>
                                        <TableCell align="right">Thuế</TableCell>
                                        <TableCell align="right">Thực nhận</TableCell>
                                        <TableCell align="right">Số giao dịch</TableCell>
                                        <TableCell align="center">Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {trend.map((row, idx) => (
                                        <TableRow
                                            key={`${row.period || "period"}-${idx}`}
                                            sx={{ "&:nth-of-type(even)": { bgcolor: "#f8fafc" } }}
                                        >
                                            <TableCell>{formatPeriodLabel(row.period, scope)}</TableCell>
                                            <TableCell align="right">{formatVnd(row.netRevenue)}</TableCell>
                                            <TableCell align="right">{formatVnd(row.serviceFee)}</TableCell>
                                            <TableCell align="right">{formatVnd(row.taxFee)}</TableCell>
                                            <TableCell align="right">{formatVnd(row.finalRevenue)}</TableCell>
                                            <TableCell align="right">{Number(row.transactions || 0).toLocaleString("vi-VN")}</TableCell>
                                            <TableCell align="center">
                                                <Button size="small" variant="outlined" onClick={() => enqueueSnackbar(`Chi tiết giai đoạn ${formatPeriodLabel(row.period, scope)}.`, { variant: "info" })}>
                                                    Xem chi tiết
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}
