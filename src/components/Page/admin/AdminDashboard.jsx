import { useCallback, useEffect, useState } from "react";
import {
    Box,
    Card,
    CardContent,
    Skeleton,
    Stack,
    Typography,
} from "@mui/material";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import ReceiptRoundedIcon from "@mui/icons-material/ReceiptRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import { BarChart, PieChart } from "@mui/x-charts";
import { enqueueSnackbar } from "notistack";
import { getAdminDashboardOverview, getAdminRevenueSummary } from "../../../services/AdminService.jsx";

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

export default function AdminDashboard() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const [year, setYear] = useState(currentYear);
    const month = currentMonth;
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState(null);
    const [overviewLoading, setOverviewLoading] = useState(false);
    const [overview, setOverview] = useState(null);

    const fetchRevenueSummary = useCallback(async () => {
        if (!year) return;
        setLoading(true);
        try {
            const response = await getAdminRevenueSummary({
                year,
                month,
            });
            setSummary(response?.data?.body || null);
        } catch (error) {
            enqueueSnackbar(getErrorMessage(error), { variant: "error" });
        } finally {
            setLoading(false);
        }
    }, [month, year]);

    useEffect(() => {
        fetchRevenueSummary();
    }, [fetchRevenueSummary]);

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

    const totals = summary?.totals || {
        totalNetRevenue: 0,
        totalServiceFee: 0,
        totalTaxFee: 0,
        totalFinalRevenue: 0,
        totalTransactions: 0,
    };

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

    const usersByRole = overview?.usersByRole || {};
    const verified = Number(overview?.verificationStatus?.verified || 0);
    const unverified = Number(overview?.verificationStatus?.unverified || 0);
    const activeSchools = Number(overview?.activeSchools || 0);
    const parentCount = Number(usersByRole.PARENT ?? usersByRole.STUDENT ?? 0);
    const counsellorCount = Number(usersByRole.COUNSELLOR || 0);
    const schoolAccountCount = Number(usersByRole.SCHOOL || 0);

    const growthRows = Array.isArray(overview?.schoolGrowthByMonth) ? overview.schoolGrowthByMonth : [];
    const growthXAxis = growthRows.map((item) => {
        const [yearStr, monthStr] = String(item?.month || "").split("-");
        if (!yearStr || !monthStr) return String(item?.month || "");
        return `${monthStr}/${yearStr}`;
    });
    const growthSeries = growthRows.map((item) => Number(item?.newSchools || 0));
    const isOverviewEmpty =
        activeSchools === 0 &&
        parentCount === 0 &&
        counsellorCount === 0 &&
        schoolAccountCount === 0 &&
        verified === 0 &&
        unverified === 0 &&
        growthSeries.every((value) => value === 0);

    const overviewKpiCards = [
        {
            key: "activeSchools",
            title: "Tổng trường đang hoạt động",
            value: activeSchools.toLocaleString("vi-VN"),
            icon: <SchoolRoundedIcon sx={{ fontSize: 22 }} />,
            gradient: "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 55%, #7dd3fc 100%)",
            glow: "0 16px 30px rgba(14,165,233,0.3)",
        },
        {
            key: "parents",
            title: "Học sinh/Phụ huynh",
            value: parentCount.toLocaleString("vi-VN"),
            icon: <GroupRoundedIcon sx={{ fontSize: 22 }} />,
            gradient: "linear-gradient(135deg, #2563eb 0%, #3b82f6 55%, #60a5fa 100%)",
            glow: "0 16px 30px rgba(37,99,235,0.3)",
        },
        {
            key: "counsellors",
            title: "Tư vấn viên",
            value: counsellorCount.toLocaleString("vi-VN"),
            icon: <SupportAgentRoundedIcon sx={{ fontSize: 22 }} />,
            gradient: "linear-gradient(135deg, #16a34a 0%, #22c55e 55%, #4ade80 100%)",
            glow: "0 16px 30px rgba(22,163,74,0.28)",
        },
    ];

    const verificationPieData = [
        { id: 0, label: "Đã xác thực", value: verified, color: "#16a34a" },
        { id: 1, label: "Chưa xác thực", value: unverified, color: "#f59e0b" },
    ];
    const dashboardKpiCards = [...overviewKpiCards, ...kpiCards];

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
                    gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, minmax(0, 1fr))",
                        md: "repeat(3, minmax(0, 1fr))",
                        lg: "repeat(5, minmax(0, 1fr))",
                    },
                }}
            >
                {overviewLoading || loading
                    ? Array.from({ length: dashboardKpiCards.length }, (_, idx) => (
                          <Card key={`overview-skeleton-${idx}`} elevation={0} sx={{ borderRadius: 3, p: 2 }}>
                              <Skeleton variant="text" width="50%" height={22} />
                              <Skeleton variant="text" width="70%" height={42} />
                              <Skeleton variant="rounded" width={42} height={42} />
                          </Card>
                      ))
                    : dashboardKpiCards.map((card) => (
                          <Card
                              key={card.key}
                              elevation={0}
                              sx={{
                                  borderRadius: 3,
                                  border: "1px solid rgba(255,255,255,0.35)",
                                  color: "#ffffff",
                                  background: card.gradient,
                                  boxShadow: card.glow,
                                  minWidth: 0,
                              }}
                          >
                              <CardContent sx={{ p: 1.35, "&:last-child": { pb: 1.35 } }}>
                                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                      <Box sx={{ minWidth: 0 }}>
                                          <Typography
                                              sx={{
                                                  color: "rgba(255,255,255,0.86)",
                                                  fontSize: 11,
                                                  fontWeight: 600,
                                                  whiteSpace: "nowrap",
                                                  overflow: "hidden",
                                                  textOverflow: "ellipsis",
                                              }}
                                          >
                                              {card.title}
                                          </Typography>
                                          <Typography
                                              sx={{
                                                  mt: 0.35,
                                                  fontSize: { xs: 24, md: 21, lg: 23 },
                                                  fontWeight: 900,
                                                  color: "#ffffff",
                                                  letterSpacing: "-0.02em",
                                                  whiteSpace: "nowrap",
                                              }}
                                          >
                                              {card.value}
                                          </Typography>
                                      </Box>
                                      <Box
                                          sx={{
                                              width: 32,
                                              height: 32,
                                              borderRadius: 1.7,
                                              color: "#ffffff",
                                              bgcolor: "rgba(255,255,255,0.24)",
                                              border: "1px solid rgba(255,255,255,0.35)",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              flexShrink: 0,
                                          }}
                                      >
                                          <Box sx={{ "& .MuiSvgIcon-root": { fontSize: 18 } }}>{card.icon}</Box>
                                      </Box>
                                  </Stack>
                              </CardContent>
                          </Card>
                      ))}
            </Box>

            <Box
                sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                    alignItems: "stretch",
                }}
            >
                <Card
                    elevation={0}
                    sx={{
                        borderRadius: 3,
                        border: "1px solid #d8b4fe",
                        height: "100%",
                        background: "linear-gradient(145deg, #ffffff 0%, #faf5ff 100%)",
                        boxShadow: "0 14px 30px rgba(124,58,237,0.16)",
                    }}
                >
                    <CardContent sx={{ p: 2.2 }}>
                        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 0.4 }}>
                            Phân bổ doanh thu
                        </Typography>
                        <Typography sx={{ color: "#64748b", fontSize: 13, mb: 1.4 }}>
                            Cơ cấu doanh thu thuần, phí dịch vụ và thuế.
                        </Typography>

                        {loading ? (
                            <Skeleton variant="rounded" height={260} />
                        ) : pieData.every((item) => item.value === 0) ? (
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
                        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 0.4 }}>Trạng thái xác thực trường</Typography>
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

            <Box
                sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: "1fr",
                    alignItems: "stretch",
                }}
            >
                <Box>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid #93c5fd",
                            height: "100%",
                            background: "linear-gradient(145deg, #ffffff 0%, #eff6ff 100%)",
                            boxShadow: "0 14px 30px rgba(37,99,235,0.16)",
                            transition: "transform 180ms ease, box-shadow 180ms ease",
                            "&:hover": {
                                transform: "translateY(-2px)",
                                boxShadow: "0 18px 36px rgba(37,99,235,0.2)",
                            },
                        }}
                    >
                        <CardContent sx={{ p: 2.2 }}>
                            <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 0.4 }}>
                                Tăng trưởng trường theo tháng
                            </Typography>
                            <Typography sx={{ color: "#64748b", fontSize: 13, mb: 1.4 }}>
                                Số lượng trường theo từng tháng trong năm {year}.
                            </Typography>

                            {overviewLoading ? (
                                <Skeleton variant="rounded" height={300} />
                            ) : growthSeries.every((value) => value === 0) ? (
                                <Box sx={{ py: 6, textAlign: "center", color: "#64748b" }}>Không có dữ liệu tăng trưởng.</Box>
                            ) : (
                                <BarChart
                                    height={300}
                                    xAxis={[{ scaleType: "band", data: growthXAxis }]}
                                    yAxis={[
                                        {
                                            width: 70,
                                            tickMinStep: 1,
                                            valueFormatter: (value) => `${Math.round(Number(value || 0))}`,
                                        },
                                    ]}
                                    series={[
                                        {
                                            data: growthSeries,
                                            label: "Trường",
                                            color: "#2563eb",
                                            valueFormatter: (value, context) => {
                                                const monthLabel = growthXAxis[context?.dataIndex ?? 0] || "";
                                                return `Tháng ${monthLabel}: ${Number(value || 0).toLocaleString("vi-VN")} trường`;
                                            },
                                        },
                                    ]}
                                    margin={{ left: 12, right: 20, top: 20, bottom: 35 }}
                                />
                            )}
                        </CardContent>
                    </Card>
                </Box>
            </Box>

        </Box>
    );
}
