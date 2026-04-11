import React, { useMemo, useState } from "react";
import {
    Box,
    Button,
    FormControl,
    InputAdornment,
    InputLabel,
    LinearProgress,
    MenuItem,
    Select,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { useNavigate, useParams } from "react-router-dom";
import { BRAND_NAVY } from "../../../constants/homeLandingTheme";

/** Mock data — thay bằng API khi backend sẵn sàng */
const MOCK_PACKAGES = [
    {
        id: "pkg-1",
        name: "Tuyển sinh Pro",
        description: "Không giới hạn chiến dịch, báo cáo nâng cao và hỗ trợ ưu tiên.",
        packageType: "Tuyển sinh",
        priceVnd: 2_000_000,
        durationDays: 30,
        startDate: "2026-03-15",
        endDate: "2026-04-14",
        usagePercent: 72,
    },
    {
        id: "pkg-2",
        name: "Gói Tư vấn",
        description: "Lịch hẹn, chat phụ huynh và lịch sử tư vấn tập trung một nơi.",
        packageType: "Tư vấn",
        priceVnd: 4_500_000,
        durationDays: 90,
        startDate: "2026-01-01",
        endDate: "2026-03-31",
        usagePercent: 100,
    },
    {
        id: "pkg-3",
        name: "Cơ sở Starter",
        description: "Tối đa 3 cơ sở, hồ sơ cơ bản và hiển thị trên danh sách.",
        packageType: "Cơ sở",
        priceVnd: 990_000,
        durationDays: 365,
        startDate: "2026-05-01",
        endDate: "2027-04-30",
        usagePercent: 0,
    },
    {
        id: "pkg-4",
        name: "Toàn nền tảng",
        description: "Mở khóa toàn bộ module cho đơn vị quy mô lớn.",
        packageType: "Doanh nghiệp",
        priceVnd: 12_000_000,
        durationDays: 180,
        startDate: "2025-10-01",
        endDate: "2026-03-28",
        usagePercent: 88,
    },
];

function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function daysBetween(a, b) {
    const ms = 86400000;
    return Math.ceil((startOfDay(b) - startOfDay(a)) / ms);
}

function enrichPackage(pkg) {
    const today = startOfDay(new Date());
    const start = startOfDay(pkg.startDate);
    const end = startOfDay(pkg.endDate);
    let status;
    if (start > today) status = "upcoming";
    else if (end < today) status = "expired";
    else status = "active";
    const remainingDays = status === "expired" ? 0 : daysBetween(today, end);
    const expiringSoon = status === "active" && remainingDays >= 0 && remainingDays < 5;
    return { ...pkg, status, remainingDays, expiringSoon, start, end };
}

function formatVnd(n) {
    return new Intl.NumberFormat("vi-VN").format(n) + " VNĐ";
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

const STATUS_BADGE = {
    active: { label: "Đang hoạt động", bg: "rgba(34, 197, 94, 0.12)", color: "#15803d" },
    expired: { label: "Đã hết hạn", bg: "rgba(100, 116, 139, 0.14)", color: "#475569" },
    upcoming: { label: "Sắp diễn ra", bg: "rgba(249, 115, 22, 0.12)", color: "#c2410c" },
};

const TAB_KEYS = ["all", "active", "expired", "upcoming"];

function PackageDetailView({ pkg, onBack }) {
    if (!pkg) {
        return (
            <Box sx={{ maxWidth: 560, mx: "auto", py: 6, textAlign: "center" }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                    Không tìm thấy gói
                </Typography>
                <Button variant="contained" onClick={onBack} sx={{ mt: 2, textTransform: "none", borderRadius: 2 }}>
                    Quay lại danh sách
                </Button>
            </Box>
        );
    }
    const e = enrichPackage(pkg);
    const sb = STATUS_BADGE[e.status];
    return (
        <Box sx={{ maxWidth: 720, mx: "auto" }}>
            <Button onClick={onBack} sx={{ mb: 2, textTransform: "none", color: "#64748b" }}>
                ← Quay lại gói đã mua
            </Button>
            <Box
                sx={{
                    bgcolor: "#fff",
                    borderRadius: "12px",
                    p: { xs: 2.5, sm: 4 },
                    boxShadow: "0 4px 24px rgba(15, 23, 42, 0.06)",
                    border: e.expiringSoon ? "2px solid #facc15" : "1px solid rgba(148, 163, 184, 0.25)",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                    <Box>
                        <Typography variant="h5" fontWeight={700} color="#0f172a">
                            {pkg.name}
                        </Typography>
                        <Typography sx={{ color: "#64748b", mt: 1, maxWidth: 520 }}>{pkg.description}</Typography>
                    </Box>
                    <Box
                        sx={{
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 999,
                            fontSize: 13,
                            fontWeight: 600,
                            bgcolor: sb.bg,
                            color: sb.color,
                        }}
                    >
                        {sb.label}
                    </Box>
                </Box>
                <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                    {[
                        ["Giá", formatVnd(pkg.priceVnd)],
                        ["Thời hạn", `${pkg.durationDays} ngày`],
                        ["Bắt đầu", formatDate(pkg.startDate)],
                        ["Kết thúc", formatDate(pkg.endDate)],
                        ["Còn lại", e.status === "expired" ? "—" : `${e.remainingDays} ngày`],
                        ["Mức sử dụng", `${pkg.usagePercent}% đã dùng`],
                    ].map(([k, v]) => (
                        <Box key={k} sx={{ py: 1.5, borderBottom: "1px solid rgba(226, 232, 240, 0.9)" }}>
                            <Typography variant="caption" color="#94a3b8" fontWeight={600} letterSpacing={0.4}>
                                {k}
                            </Typography>
                            <Typography fontWeight={600} color="#0f172a">
                                {v}
                            </Typography>
                        </Box>
                    ))}
                </Box>
                <Box sx={{ mt: 3, display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                    <Button variant="contained" sx={{ textTransform: "none", borderRadius: 2 }} onClick={() => {}}>
                        Gia hạn
                    </Button>
                    <Button variant="outlined" sx={{ textTransform: "none", borderRadius: 2 }} onClick={() => {}}>
                        Nâng cấp
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}

function EmptyState({ onExplore }) {
    return (
        <Box
            sx={{
                bgcolor: "#fff",
                borderRadius: "12px",
                py: 8,
                px: 3,
                textAlign: "center",
                boxShadow: "0 4px 24px rgba(15, 23, 42, 0.06)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
            }}
        >
            <Box sx={{ maxWidth: 200, mx: "auto", mb: 3, color: "#cbd5e1" }}>
                <svg viewBox="0 0 120 100" width="100%" height="auto" aria-hidden>
                    <rect x="10" y="30" width="45" height="55" rx="8" fill="currentColor" opacity="0.35" />
                    <rect x="62" y="18" width="48" height="67" rx="8" fill="currentColor" opacity="0.55" />
                    <rect x="38" y="8" width="38" height="38" rx="6" fill="currentColor" opacity="0.25" />
                </svg>
            </Box>
            <Typography variant="h6" fontWeight={700} color="#0f172a" sx={{ mt: 1 }}>
                Chưa có gói nào
            </Typography>
            <Typography sx={{ color: "#64748b", mt: 1, mb: 3 }}>
                Sau khi đăng ký, các gói của bạn sẽ hiển thị tại đây để dễ theo dõi.
            </Typography>
            <Button variant="contained" onClick={onExplore} sx={{ textTransform: "none", borderRadius: 2, px: 3 }}>
                Xem các gói dịch vụ
            </Button>
        </Box>
    );
}

function PackageRow({ pkg, onOpen }) {
    const e = enrichPackage(pkg);
    const sb = STATUS_BADGE[e.status];
    const remainingHighlight = e.status === "active" && e.remainingDays >= 0 && e.remainingDays < 5;
    const used = pkg.usagePercent;
    const remainingPct = 100 - used;

    const handleCardClick = () => onOpen(pkg.id);
    const stop = (ev) => ev.stopPropagation();

    return (
        <Box
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
            onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    handleCardClick();
                }
            }}
            sx={{
                bgcolor: "#fff",
                borderRadius: "12px",
                p: { xs: 2, md: 2.5 },
                boxShadow: "0 4px 20px rgba(15, 23, 42, 0.05)",
                border: e.expiringSoon ? "2px solid #facc15" : "1px solid rgba(148, 163, 184, 0.22)",
                cursor: "pointer",
                transition: "box-shadow 0.2s ease, transform 0.2s ease",
                "&:hover": {
                    boxShadow: "0 12px 40px rgba(15, 23, 42, 0.1)",
                    transform: "scale(1.008)",
                },
                "&:focus-visible": {
                    outline: `2px solid ${BRAND_NAVY}`,
                    outlineOffset: 2,
                },
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    flexWrap: { md: "wrap", lg: "nowrap" },
                    alignItems: { xs: "stretch", lg: "stretch" },
                    gap: { xs: 2, md: 2, lg: 3 },
                }}
            >
                {/* (1) Package info ~30% */}
                <Box
                    sx={{
                        flex: { xs: "none", md: "1 1 calc(50% - 8px)", lg: "0 1 30%" },
                        minWidth: 0,
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                        {e.expiringSoon && (
                            <Tooltip title="Gói này sẽ hết hạn trong vòng chưa đầy 5 ngày">
                                <WarningAmberRoundedIcon sx={{ color: "#ca8a04", fontSize: 22, mt: 0.25 }} />
                            </Tooltip>
                        )}
                        <Box sx={{ minWidth: 0 }}>
                            <Typography fontWeight={700} color="#0f172a" fontSize={17}>
                                {pkg.name}
                            </Typography>
                            <Typography sx={{ color: "#64748b", fontSize: 14, mt: 0.5, lineHeight: 1.5 }} noWrap={false}>
                                {pkg.description}
                            </Typography>
                            <Box
                                component="span"
                                sx={{
                                    display: "inline-block",
                                    mt: 1.25,
                                    px: 1.25,
                                    py: 0.35,
                                    borderRadius: 999,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    bgcolor: sb.bg,
                                    color: sb.color,
                                }}
                            >
                                {sb.label}
                            </Box>
                        </Box>
                    </Box>
                </Box>

                {/* (2) Details ~30% */}
                <Box
                    sx={{
                        flex: { xs: "none", md: "1 1 calc(50% - 8px)", lg: "0 1 30%" },
                        minWidth: 0,
                    }}
                >
                    <Typography fontWeight={600} color="#0f172a" fontSize={15}>
                        {formatVnd(pkg.priceVnd)}
                    </Typography>
                    <Typography sx={{ color: "#64748b", fontSize: 14, mt: 0.5 }}>{pkg.durationDays} ngày</Typography>
                    <Typography sx={{ color: "#64748b", fontSize: 13, mt: 1 }}>
                        {formatDate(pkg.startDate)} → {formatDate(pkg.endDate)}
                    </Typography>
                    <Tooltip title="Tính theo ngày kết thúc gói đăng ký">
                        <Typography
                            sx={{
                                mt: 1,
                                fontSize: 14,
                                fontWeight: 600,
                                color: remainingHighlight ? "#b45309" : "#334155",
                            }}
                        >
                            {e.status === "expired"
                                ? "Đã kết thúc"
                                : e.status === "upcoming"
                                  ? `Bắt đầu sau ${daysBetween(new Date(), pkg.startDate)} ngày`
                                  : `Còn ${e.remainingDays} ngày`}
                        </Typography>
                    </Tooltip>
                </Box>

                {/* (3) Usage ~25% */}
                <Box
                    sx={{
                        flex: { xs: "none", md: "1 1 calc(50% - 8px)", lg: "0 1 25%" },
                        minWidth: 0,
                    }}
                >
                    <Tooltip title="Tỷ lệ hạn mức đã sử dụng (dữ liệu mẫu, sẽ thay bằng API)">
                        <Typography fontWeight={600} color="#475569" fontSize={13} sx={{ mb: 1 }}>
                            Mức sử dụng
                        </Typography>
                    </Tooltip>
                    <LinearProgress
                        variant="determinate"
                        value={Math.min(100, used)}
                        sx={{
                            height: 8,
                            borderRadius: 999,
                            bgcolor: "rgba(148, 163, 184, 0.2)",
                            "& .MuiLinearProgress-bar": {
                                borderRadius: 999,
                                bgcolor: used >= 90 ? "#f97316" : BRAND_NAVY,
                            },
                        }}
                    />
                    <Typography sx={{ color: "#64748b", fontSize: 13, mt: 1 }}>
                        {used}% đã dùng · {remainingPct}% còn lại
                    </Typography>
                </Box>

                {/* (4) Actions ~15% — bottom on mobile */}
                <Box
                    sx={{
                        flex: { xs: "none", md: "1 1 calc(50% - 8px)", lg: "0 1 15%" },
                        display: "flex",
                        flexDirection: "column",
                        alignItems: { xs: "stretch", lg: "flex-end" },
                        justifyContent: "center",
                        gap: 1,
                        order: { xs: 99, lg: 0 },
                    }}
                    onClick={stop}
                >
                    <Button
                        size="small"
                        onClick={() => onOpen(pkg.id)}
                        sx={{ textTransform: "none", color: BRAND_NAVY, justifyContent: { xs: "center", lg: "flex-end" } }}
                    >
                        Xem chi tiết
                    </Button>
                    {e.status === "expired" && (
                        <Button variant="contained" size="small" sx={{ textTransform: "none", borderRadius: 2 }} onClick={stop}>
                            Gia hạn
                        </Button>
                    )}
                    {e.status !== "expired" && (
                        <Button variant="outlined" size="small" sx={{ textTransform: "none", borderRadius: 2 }} onClick={stop}>
                            Nâng cấp
                        </Button>
                    )}
                </Box>
            </Box>
        </Box>
    );
}

function PurchasedPackagesList() {
    const navigate = useNavigate();
    const [tab, setTab] = useState(0);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [dateFilter, setDateFilter] = useState("");

    const packageTypes = useMemo(() => {
        const s = new Set(MOCK_PACKAGES.map((p) => p.packageType));
        return [...s].sort();
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const today = startOfDay(new Date());
        return MOCK_PACKAGES.map(enrichPackage).filter((p) => {
            if (TAB_KEYS[tab] !== "all" && p.status !== TAB_KEYS[tab]) return false;
            if (q && !(`${p.name} ${p.description}`.toLowerCase().includes(q))) return false;
            if (typeFilter && p.packageType !== typeFilter) return false;
            if (dateFilter === "expiring7") {
                if (p.status !== "active" || p.remainingDays > 7 || p.remainingDays < 0) return false;
            } else if (dateFilter === "startedThisMonth") {
                if (p.start.getMonth() !== today.getMonth() || p.start.getFullYear() !== today.getFullYear()) return false;
            } else if (dateFilter === "endsThisMonth") {
                if (p.end.getMonth() !== today.getMonth() || p.end.getFullYear() !== today.getFullYear()) return false;
            }
            return true;
        });
    }, [tab, search, typeFilter, dateFilter]);

    const showGlobalEmpty = MOCK_PACKAGES.length === 0;

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%" }}>
            {/* Page Header — cùng phong cách SchoolCampus */}
            <Box
                sx={{
                    background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                    borderRadius: 3,
                    p: 3,
                    color: "white",
                    boxShadow: "0 8px 32px rgba(13, 100, 222, 0.25)",
                }}
            >
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
                        <Typography
                            variant="h4"
                            component="h1"
                            sx={{
                                fontWeight: 700,
                                letterSpacing: "-0.02em",
                                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            }}
                        >
                            Gói đã mua
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.95 }}>
                            Quản lý và theo dõi các gói của trường
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate("/package-fees")}
                        sx={{
                            bgcolor: "rgba(255,255,255,0.95)",
                            color: "#0D64DE",
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 600,
                            px: 3,
                            py: 1.5,
                            boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                            "&:hover": {
                                bgcolor: "white",
                                boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                            },
                        }}
                    >
                        Mua gói mới
                    </Button>
                </Box>
            </Box>

            {/* Filters */}
            <Box
                sx={{
                    bgcolor: "#fff",
                    borderRadius: "12px",
                    p: 2,
                    boxShadow: "0 2px 12px rgba(15, 23, 42, 0.04)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                }}
            >
                    <Tabs
                        value={tab}
                        onChange={(_, v) => setTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            minHeight: 42,
                            mb: 2,
                            "& .MuiTab-root": { textTransform: "none", fontWeight: 600, fontSize: 14 },
                        }}
                    >
                        <Tab label="Tất cả" />
                        <Tab label="Đang hoạt động" />
                        <Tab label="Đã hết hạn" />
                        <Tab label="Sắp diễn ra" />
                    </Tabs>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: { xs: "column", md: "row" },
                            gap: 2,
                            flexWrap: "wrap",
                            alignItems: { md: "center" },
                        }}
                    >
                        <TextField
                            size="small"
                            placeholder="Tìm gói…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            sx={{ flex: { md: "1 1 220px" }, minWidth: { xs: "100%", md: 200 } }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: "#94a3b8" }} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 180 } }}>
                            <InputLabel id="pkg-type-filter">Loại gói</InputLabel>
                            <Select
                                labelId="pkg-type-filter"
                                label="Loại gói"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                            >
                                <MenuItem value="">Tất cả loại</MenuItem>
                                {packageTypes.map((t) => (
                                    <MenuItem key={t} value={t}>
                                        {t}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 200 } }}>
                            <InputLabel id="pkg-date-filter">Thời gian</InputLabel>
                            <Select
                                labelId="pkg-date-filter"
                                label="Thời gian"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                            >
                                <MenuItem value="">Mọi thời điểm</MenuItem>
                                <MenuItem value="expiring7">Hết hạn trong 7 ngày</MenuItem>
                                <MenuItem value="startedThisMonth">Bắt đầu trong tháng này</MenuItem>
                                <MenuItem value="endsThisMonth">Kết thúc trong tháng này</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
            </Box>

            {/* List */}
            {showGlobalEmpty ? (
                <EmptyState onExplore={() => navigate("/package-fees")} />
            ) : filtered.length === 0 ? (
                <Box
                    sx={{
                        bgcolor: "#fff",
                        borderRadius: "12px",
                        py: 6,
                        textAlign: "center",
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                    }}
                >
                    <Typography color="#64748b">Không có gói nào khớp bộ lọc.</Typography>
                    <Button sx={{ mt: 2, textTransform: "none" }} onClick={() => { setTab(0); setSearch(""); setTypeFilter(""); setDateFilter(""); }}>
                        Xóa bộ lọc
                    </Button>
                </Box>
            ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {filtered.map((p) => (
                        <PackageRow key={p.id} pkg={p} onOpen={(id) => navigate(`/school/purchased-packages/${id}`)} />
                    ))}
                </Box>
            )}
        </Box>
    );
}

export default function SchoolPurchasedPackages() {
    const { subscriptionId } = useParams();
    const navigate = useNavigate();
    const pkg = subscriptionId ? MOCK_PACKAGES.find((p) => p.id === subscriptionId) : null;

    if (subscriptionId) {
        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%" }}>
                <PackageDetailView pkg={pkg} onBack={() => navigate("/school/purchased-packages")} />
            </Box>
        );
    }

    return <PurchasedPackagesList />;
}
