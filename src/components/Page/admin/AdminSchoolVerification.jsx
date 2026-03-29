import React, {useEffect, useState} from "react";
import {
    Box,
    Card,
    CardContent,
    alpha,
    Typography,
    Avatar,
    Chip,
    Stack,
    IconButton,
    Tooltip,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Breadcrumbs,
    Link,
    Dialog,
    DialogTitle,
    DialogContent,
} from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import ApartmentIcon from "@mui/icons-material/Apartment";
import PlaceIcon from "@mui/icons-material/Place";
import InsightsIcon from "@mui/icons-material/Insights";
import CallIcon from "@mui/icons-material/Call";
import BadgeIcon from "@mui/icons-material/Badge";
import LockIcon from "@mui/icons-material/Lock";
import CloseIcon from "@mui/icons-material/Close";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PendingRoundedIcon from "@mui/icons-material/PendingRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import {useNavigate} from "react-router-dom";
import {enqueueSnackbar} from "notistack";
import {showSuccessSnackbar} from "../../ui/AppSnackbar.jsx";
import ConfirmDialog from "../../ui/ConfirmDialog.jsx";
import {getPendingSchoolRegistrations, verifySchoolRegistration} from "../../../services/AdminService.jsx";
import {APP_PRIMARY_MAIN} from "../../../constants/homeLandingTheme";

export default function AdminSchoolVerification() {
    const navigate = useNavigate();
    const [registrations, setRegistrations] = useState([]);
    const [sortBy, setSortBy] = useState("newest");
    const [loading, setLoading] = useState(false);
    const [verifyingId, setVerifyingId] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailItem, setDetailItem] = useState(null);
    const getVerifyRequestId = (registration) => {
        const rawId = registration?.id;
        if (rawId === undefined || rawId === null || rawId === "") return null;
        const parsed = Number(rawId);
        return Number.isNaN(parsed) ? null : parsed;
    };

    const fetchRegistrations = async () => {
        setLoading(true);
        try {
            const res = await getPendingSchoolRegistrations();
            const list = res?.data?.body || [];
            const sorted = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setRegistrations(sorted);
        } catch (error) {
            console.error("Failed to load school registrations", error);
            enqueueSnackbar("Không thể tải danh sách hồ sơ trường học.", {variant: "error"});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRegistrations();
    }, []);

    const openConfirm = (registration) => {
        if (!registration || verifyingId) return;
        setSelectedRegistration(registration);
        setConfirmOpen(true);
    };

    const openDetail = (item) => {
        if (!item) return;
        setDetailItem(item);
        setDetailOpen(true);
    };

    const closeDetail = () => {
        setDetailOpen(false);
        setDetailItem(null);
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return "-";
        const parsed = new Date(dateValue);
        if (Number.isNaN(parsed.getTime())) return "-";
        return parsed.toLocaleDateString("vi-VN");
    };

    const handleConfirmClose = () => {
        if (verifyingId) return;
        setConfirmOpen(false);
        setSelectedRegistration(null);
    };

    const handleVerify = async () => {
        const requestId = getVerifyRequestId(selectedRegistration);
        if (verifyingId) return;
        if (requestId === null) {
            enqueueSnackbar("Không tìm thấy id hồ sơ để xác thực.", {variant: "error"});
            return;
        }
        setVerifyingId(requestId);
        try {
            const res = await verifySchoolRegistration(requestId);
            if (res && res.status === 200) {
                showSuccessSnackbar("Xác thực trường học thành công!");
                await fetchRegistrations();
            }
        } catch (error) {
            console.error("Verify school registration failed", error);
            const msg = error?.response?.data?.message || "Xác thực thất bại. Vui lòng thử lại.";
            enqueueSnackbar(msg, {variant: "error"});
        } finally {
            setVerifyingId(null);
            setConfirmOpen(false);
            setSelectedRegistration(null);
        }
    };

    const renderStatusChip = (status) => {
        if (status === "ACCOUNT_PENDING_VERIFY" || status === "PENDING") {
            return (
                <Chip
                    size="small"
                    icon={<AccessTimeIcon sx={{fontSize: 14}} />}
                    label="Chờ xác thực"
                    sx={{
                        bgcolor: "rgba(245,158,11,0.16)",
                        color: "#fbbf24",
                        border: "1px solid rgba(251,191,36,0.35)",
                        fontWeight: 600,
                        "& .MuiChip-icon": {color: "#f59e0b"},
                    }}
                />
            );
        }
        if (status === "VERIFIED") {
            return (
                <Chip
                    size="small"
                    icon={<CheckCircleRoundedIcon sx={{fontSize: 14}} />}
                    label="Đã duyệt"
                    sx={{
                        bgcolor: "rgba(16,185,129,0.16)",
                        color: "#34d399",
                        border: "1px solid rgba(52,211,153,0.35)",
                        fontWeight: 600,
                        "& .MuiChip-icon": {color: "#10b981"},
                    }}
                />
            );
        }
        if (status === "REJECTED") {
            return (
                <Chip
                    size="small"
                    icon={<CancelRoundedIcon sx={{fontSize: 14}} />}
                    label="Từ chối"
                    sx={{
                        bgcolor: "rgba(239,68,68,0.16)",
                        color: "#f87171",
                        border: "1px solid rgba(248,113,113,0.35)",
                        fontWeight: 600,
                        "& .MuiChip-icon": {color: "#ef4444"},
                    }}
                />
            );
        }
        return (
            <Chip
                label={status || "Không xác định"}
                size="small"
                sx={{
                    bgcolor: "rgba(148,163,184,0.2)",
                    color: "#cbd5e1",
                    border: "1px solid rgba(203,213,225,0.3)",
                }}
            />
        );
    };

    const displayedRegistrations = [...registrations].sort((a, b) => {
        if (sortBy === "name") {
            return (a?.schoolName || "").localeCompare(b?.schoolName || "", "vi");
        }
        return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
    });

    const stats = {
        total: registrations.length,
        pending: registrations.filter(
            (item) => item.status === "ACCOUNT_PENDING_VERIFY" || item.status === "PENDING"
        ).length,
        verified: registrations.filter((item) => item.status === "VERIFIED").length,
        rejected: registrations.filter((item) => item.status === "REJECTED").length,
    };

    const statCards = [
        {
            label: "Tổng hồ sơ",
            value: stats.total,
            icon: <DescriptionRoundedIcon sx={{fontSize: 22}}/>,
            iconColor: "#2563eb",
            iconBg: "#dbeafe",
            cardBg: "#eef7ff",
            cardBorder: "#dbeafe",
        },
        {
            label: "Chờ duyệt",
            value: stats.pending,
            icon: <PendingRoundedIcon sx={{fontSize: 22}}/>,
            iconColor: "#f97316",
            iconBg: "#ffedd5",
            cardBg: "#fff7ec",
            cardBorder: "#fde7c7",
        },
        {
            label: "Đã duyệt",
            value: stats.verified,
            icon: <CheckCircleRoundedIcon sx={{fontSize: 22}}/>,
            iconColor: "#16a34a",
            iconBg: "#dcfce7",
            cardBg: "#effcf5",
            cardBorder: "#d6f5e4",
        },
        {
            label: "Từ chối",
            value: stats.rejected,
            icon: <CancelRoundedIcon sx={{fontSize: 22}}/>,
            iconColor: "#e11d48",
            iconBg: "#fee2e2",
            cardBg: "#fff1f5",
            cardBorder: "#ffd9e0",
        },
    ];

    const tableColCount = 9;

    const detailSectionSx = {
        border: "1px solid #bfdbfe",
        borderRadius: 3,
        bgcolor: "#eff6ff",
        p: {xs: 1.4, md: 1.8},
        boxShadow: "0 10px 24px rgba(37,99,235,0.14)",
    };

    const fieldBoxSx = {
        border: "1px solid #bfdbfe",
        borderRadius: 2.25,
        bgcolor: "#ffffff",
        px: 1.3,
        py: 1.1,
        boxShadow: "0 5px 12px rgba(37,99,235,0.08)",
    };

    const renderDetailField = (label, value, fullWidth = false) => (
        <Box
            sx={{
                ...fieldBoxSx,
                gridColumn: fullWidth ? {xs: "auto", md: "1 / span 2"} : "auto",
            }}
        >
            <Typography sx={{fontSize: 12, color: "#2563eb", mb: 0.35, fontWeight: 700}}>{label}</Typography>
            <Typography sx={{fontSize: 14, color: "#1e293b", fontWeight: 600, wordBreak: "break-all"}}>{value || "-"}</Typography>
        </Box>
    );

    const renderDetailLinkField = (label, url, fullWidth = false) => (
        <Box
            sx={{
                ...fieldBoxSx,
                gridColumn: fullWidth ? {xs: "auto", md: "1 / span 2"} : "auto",
            }}
        >
            <Typography sx={{fontSize: 12, color: "#2563eb", mb: 0.35, fontWeight: 700}}>{label}</Typography>
            {url ? (
                <Link
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    sx={{
                        fontSize: 14,
                        fontWeight: 400,
                        wordBreak: "break-all",
                        color: "#2563eb",
                        display: "inline-block",
                        "&:hover": {color: "#2563eb"},
                    }}
                >
                    {url}
                </Link>
            ) : (
                <Typography sx={{fontSize: 14, color: "#64748b", fontWeight: 400}}>-</Typography>
            )}
        </Box>
    );

    return (
        <Box
            sx={{
                p: {xs: 1, md: 2},
                borderRadius: 4,
                bgcolor: "#ffffff",
                color: "#1e293b",
            }}
        >
            <Breadcrumbs separator="›" aria-label="breadcrumb" sx={{mb: 1, color: "#64748b"}}>
                <Link
                    underline="hover"
                    color="inherit"
                    onClick={() => navigate("/admin/schools/verification")}
                    sx={{cursor: "pointer", color: "#2563eb"}}
                >
                    Xác thực trường
                </Link>
            </Breadcrumbs>

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
                <CardContent sx={{p: {xs: 2.2, md: 2.8}, "&:last-child": {pb: {xs: 2.2, md: 2.8}}}}>
                    <Box sx={{display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2}}>
                        <Box sx={{display: "flex", alignItems: "center", gap: 1.5}}>
                            <Avatar
                                sx={{
                                    bgcolor: alpha("#ffffff", 0.2),
                                    color: "white",
                                    width: 42,
                                    height: 42,
                                }}
                            >
                                <SchoolIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" sx={{fontWeight: 700, lineHeight: 1.2}}>
                                    Xác Thực Trường Học
                                </Typography>
                                <Typography variant="body2" sx={{opacity: 0.92, mt: 0.45}}>
                                    Hệ thống quản lý và xác thực hồ sơ trường học
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <Box
                sx={{
                    mb: 2.5,
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, minmax(0, 1fr))",
                        lg: "repeat(4, minmax(0, 1fr))",
                    },
                    gap: 2,
                    width: "100%",
                }}
            >
                {statCards.map((item) => (
                    <Card
                        key={item.label}
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: `1px solid ${item.cardBorder}`,
                            bgcolor: item.cardBg,
                            minHeight: 132,
                        }}
                    >
                        <CardContent
                            sx={{
                                py: 2,
                                px: 2.25,
                                height: "100%",
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                            }}
                        >
                            <Box>
                                <Typography sx={{fontSize: 12, color: "#64748b"}}>{item.label}</Typography>
                                <Typography sx={{fontSize: 30, lineHeight: 1.2, fontWeight: 800, color: "#1e293b"}}>
                                    {item.value}
                                </Typography>
                            </Box>
                            <Avatar
                                sx={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: "50%",
                                    bgcolor: item.iconBg,
                                    color: item.iconColor,
                                    mt: 0.5,
                                }}
                            >
                                {item.icon}
                            </Avatar>
                        </CardContent>
                    </Card>
                ))}
            </Box>

            <Card
                elevation={0}
                sx={{
                    borderRadius: 4,
                    border: "1px solid #e2e8f0",
                    bgcolor: "#ffffff",
                    overflow: "hidden",
                }}
            >
                <CardContent sx={{p: {xs: 1.5, md: 2.5}}}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1.5,
                            mb: 2,
                            flexWrap: "wrap",
                        }}
                    >
                        <Typography variant="h6" sx={{fontWeight: 800, color: "#1e293b", fontSize: {xs: 17, sm: 18}}}>
                            Danh sách hồ sơ chờ duyệt
                            <Typography component="span" sx={{display: "block", fontSize: 13, fontWeight: 500, color: "#64748b", mt: 0.35}}>
                                {displayedRegistrations.length} hồ sơ
                            </Typography>
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip
                                label="Mới nhất"
                                clickable
                                onClick={() => setSortBy("newest")}
                                sx={{
                                    height: 34,
                                    borderRadius: 999,
                                    border: "1px solid #cbd5e1",
                                    bgcolor: sortBy === "newest" ? "#ede9fe" : "#ffffff",
                                    color: sortBy === "newest" ? "#1e293b" : "#64748b",
                                    fontWeight: 700,
                                }}
                            />
                            <Chip
                                label="Theo tên"
                                clickable
                                onClick={() => setSortBy("name")}
                                sx={{
                                    height: 34,
                                    borderRadius: 999,
                                    border: "1px solid #cbd5e1",
                                    bgcolor: sortBy === "name" ? "#ede9fe" : "#ffffff",
                                    color: sortBy === "name" ? "#1e293b" : "#64748b",
                                    fontWeight: 700,
                                }}
                            />
                        </Stack>
                    </Box>

                    <TableContainer
                        component={Paper}
                        elevation={0}
                        sx={{bgcolor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 3}}
                    >
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{bgcolor: "#f8fafc"}}>
                                    <TableCell align="center" sx={{fontWeight: 700, color: "#334155", width: 60}}>
                                        STT
                                    </TableCell>
                                    <TableCell align="left" sx={{fontWeight: 700, color: "#334155", width: 56, pl: 1.5, pr: 0.5}} />
                                    <TableCell align="left" sx={{fontWeight: 700, color: "#334155", minWidth: 200}}>
                                        Tên trường
                                    </TableCell>
                                    <TableCell align="center" sx={{fontWeight: 700, color: "#334155", minWidth: 140}}>
                                        Đại diện
                                    </TableCell>
                                    <TableCell align="center" sx={{fontWeight: 700, color: "#334155", width: 130}}>
                                        Mã số thuế
                                    </TableCell>
                                    <TableCell align="center" sx={{fontWeight: 700, color: "#334155", width: 120}}>
                                        Hotline
                                    </TableCell>
                                    <TableCell align="center" sx={{fontWeight: 700, color: "#334155", minWidth: 130}}>
                                        Trạng thái
                                    </TableCell>
                                    <TableCell align="center" sx={{fontWeight: 700, color: "#334155", width: 72, px: 0.5}}>
                                        Chi tiết
                                    </TableCell>
                                    <TableCell align="center" sx={{fontWeight: 700, color: "#334155", width: 100, px: 0.5}}>
                                        Thao tác
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={tableColCount} align="center" sx={{py: 4, color: "#64748b"}}>
                                            <Typography variant="body2" sx={{color: "#64748b"}}>
                                                Đang tải dữ liệu...
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : displayedRegistrations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={tableColCount} align="center" sx={{py: 4}}>
                                            <Typography variant="body1" sx={{color: "#64748b"}}>
                                                Không có hồ sơ để hiển thị.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    displayedRegistrations.map((item, index) => (
                                        <TableRow
                                            key={item.id ?? index}
                                            hover
                                            sx={{
                                                "& td": {borderBottomColor: "#e2e8f0", color: "#334155"},
                                                "&:hover": {bgcolor: "#f8fafc"},
                                            }}
                                        >
                                            <TableCell align="center">
                                                <Chip
                                                    label={index + 1}
                                                    size="small"
                                                    sx={{
                                                        width: 28,
                                                        height: 24,
                                                        fontWeight: 700,
                                                        bgcolor: "rgba(37,99,235,0.18)",
                                                        color: APP_PRIMARY_MAIN,
                                                        border: "1px solid rgba(96,165,250,0.35)",
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="left" sx={{pl: 1.5, pr: 0.5}}>
                                                <Avatar
                                                    src={item.logoUrl || undefined}
                                                    alt={item.schoolName || "logo trường"}
                                                    sx={{width: 34, height: 34, bgcolor: "#e2e8f0"}}
                                                >
                                                    {(item.schoolName || "S").charAt(0).toUpperCase()}
                                                </Avatar>
                                            </TableCell>
                                            <TableCell align="left" sx={{pl: 0.5}}>
                                                <Typography sx={{fontWeight: 600, fontSize: 14, color: "#1e293b"}}>
                                                    {item.schoolName || "Trường chưa đặt tên"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography sx={{fontSize: 14, color: "#334155"}}>
                                                    {item.representativeName || "-"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography sx={{fontSize: 14, color: "#334155"}}>{item.taxCode || "-"}</Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography sx={{fontSize: 14, color: "#334155"}}>{item.hotline || "-"}</Typography>
                                            </TableCell>
                                            <TableCell align="center">{renderStatusChip(item.status)}</TableCell>
                                            <TableCell align="center" sx={{px: 0.5}}>
                                                <Tooltip title="Xem chi tiết hồ sơ">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => openDetail(item)}
                                                        aria-label="Xem chi tiết hồ sơ"
                                                        sx={{color: "#38bdf8"}}
                                                    >
                                                        <VisibilityIcon fontSize="small"/>
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell align="center" sx={{px: 0.5}}>
                                                <Tooltip title={item.status === "VERIFIED" ? "Đã xác thực" : "Xác thực trường học"}>
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            disabled={!!verifyingId || item.status === "VERIFIED"}
                                                            onClick={() => openConfirm(item)}
                                                            aria-label="Xác thực trường học"
                                                            sx={{
                                                                background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                                                                color: "#ffffff",
                                                                boxShadow: "0 4px 14px rgba(22, 163, 74, 0.45)",
                                                                "&:hover": {
                                                                    background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                                                                    boxShadow: "0 6px 18px rgba(22, 163, 74, 0.5)",
                                                                },
                                                                "&.Mui-disabled": {
                                                                    background: "#e2e8f0",
                                                                    color: "#94a3b8",
                                                                    boxShadow: "none",
                                                                },
                                                            }}
                                                        >
                                                            <TaskAltIcon fontSize="small"/>
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
            <Dialog
                open={detailOpen}
                onClose={closeDetail}
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
                        background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 48%, #93c5fd 100%)",
                        borderBottom: "1px solid #93c5fd",
                    }}
                >
                    <Typography component="h2" sx={{fontWeight: 800, fontSize: "1.25rem", lineHeight: 1.3, m: 0}}>
                        Chi tiết hồ sơ đăng ký
                    </Typography>
                    <IconButton
                        onClick={closeDetail}
                        aria-label="Đóng"
                        size="small"
                        sx={{
                            color: "#475569",
                            "&:hover": {bgcolor: "rgba(255,255,255,0.55)", color: "#1e293b"},
                        }}
                    >
                        <CloseIcon fontSize="small"/>
                    </IconButton>
                </DialogTitle>
                <DialogContent
                    dividers
                    sx={{
                        bgcolor: "#eff6ff",
                        backgroundImage:
                            "radial-gradient(circle at top right, rgba(59,130,246,0.24), transparent 45%), radial-gradient(circle at bottom left, rgba(37,99,235,0.2), transparent 42%)",
                    }}
                >
                    {detailItem && (
                        <Stack spacing={1.5}>
                            <Box sx={detailSectionSx}>
                                <Stack direction="row" spacing={0.8} alignItems="center" sx={{mb: 1}}>
                                    <ApartmentIcon sx={{fontSize: 17, color: "#2563eb"}} />
                                    <Typography sx={{fontSize: 13, fontWeight: 800, color: "#2563eb"}}>
                                        Thông tin chung
                                    </Typography>
                                </Stack>
                                <Box
                                    sx={{
                                        border: "1px solid #bfdbfe",
                                        borderRadius: 2.25,
                                        bgcolor: "#ffffff",
                                        px: 1.4,
                                        py: 1.25,
                                        boxShadow: "0 5px 12px rgba(37,99,235,0.08)",
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: 1.5,
                                    }}
                                >
                                    <Avatar
                                        src={detailItem.logoUrl || undefined}
                                        alt={detailItem.schoolName || "logo"}
                                        sx={{width: 56, height: 56, mt: 0.2}}
                                    >
                                        {(detailItem.schoolName || "S").charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Box sx={{minWidth: 0}}>
                                        <Typography sx={{fontSize: 18, color: "#1e293b", fontWeight: 700, lineHeight: 1.25, mb: 0.9}}>
                                            {detailItem.schoolName || "-"}
                                        </Typography>
                                        <Typography sx={{fontSize: 14, color: "#64748b", lineHeight: 1.45}}>
                                            Hồ sơ đăng ký trường trên hệ thống EduBridgeHCM
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>

                            <Box sx={detailSectionSx}>
                                <Stack direction="row" spacing={0.8} alignItems="center" sx={{mb: 1}}>
                                    <PlaceIcon sx={{fontSize: 17, color: "#2563eb"}} />
                                    <Typography sx={{fontSize: 13, fontWeight: 800, color: "#2563eb"}}>
                                        Cơ sở đăng ký
                                    </Typography>
                                </Stack>
                                <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 1}}>
                                    {renderDetailField("Tên cơ sở", detailItem.campusName)}
                                    {renderDetailField("Số điện thoại", detailItem.campusPhone)}
                                    {renderDetailField("Địa chỉ", detailItem.campusAddress, true)}
                                </Box>
                            </Box>

                            <Box sx={detailSectionSx}>
                                <Stack direction="row" spacing={0.8} alignItems="center" sx={{mb: 1}}>
                                    <InsightsIcon sx={{fontSize: 17, color: "#2563eb"}} />
                                    <Typography sx={{fontSize: 13, fontWeight: 800, color: "#2563eb"}}>
                                        Thông tin hồ sơ
                                    </Typography>
                                </Stack>
                                <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 1}}>
                                    {renderDetailField("Mã số thuế", detailItem.taxCode)}
                                    {renderDetailField("Ngày thành lập", formatDate(detailItem.foundingDate))}
                                    {renderDetailField("Ngày nộp hồ sơ", formatDate(detailItem.createdAt))}
                                </Box>
                            </Box>

                            <Box sx={detailSectionSx}>
                                <Stack direction="row" spacing={0.8} alignItems="center" sx={{mb: 1}}>
                                    <CallIcon sx={{fontSize: 17, color: "#2563eb"}} />
                                    <Typography sx={{fontSize: 13, fontWeight: 800, color: "#2563eb"}}>
                                        Liên hệ & liên kết
                                    </Typography>
                                </Stack>
                                <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 1}}>
                                    {renderDetailField("Hotline", detailItem.hotline)}
                                    {renderDetailLinkField("Website", detailItem.websiteUrl)}
                                    {renderDetailLinkField("Giấy phép / thông tin pháp lý", detailItem.businessLicenseUrl, true)}
                                </Box>
                            </Box>

                            <Box sx={detailSectionSx}>
                                <Stack direction="row" spacing={0.8} alignItems="center" sx={{mb: 1}}>
                                    <BadgeIcon sx={{fontSize: 17, color: "#2563eb"}} />
                                    <Typography sx={{fontSize: 13, fontWeight: 800, color: "#2563eb"}}>
                                        Đại diện
                                    </Typography>
                                </Stack>
                                <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 1}}>
                                    {renderDetailField("Người đại diện", detailItem.representativeName)}
                                </Box>
                            </Box>

                            <Box sx={detailSectionSx}>
                                <Stack direction="row" spacing={0.8} alignItems="center" sx={{mb: 1}}>
                                    <LockIcon sx={{fontSize: 17, color: "#2563eb"}} />
                                    <Typography sx={{fontSize: 13, fontWeight: 800, color: "#2563eb"}}>
                                        Trạng thái
                                    </Typography>
                                </Stack>
                                <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 1}}>
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
                                        <Typography sx={{fontSize: 12, color: "#2563eb", mb: 0.5, fontWeight: 700}}>
                                            Trạng thái hồ sơ
                                        </Typography>
                                        {renderStatusChip(detailItem.status)}
                                    </Box>
                                </Box>
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={confirmOpen}
                title="Xác thực hồ sơ trường học"
                description={
                    selectedRegistration
                        ? `Bạn có chắc chắn muốn xác thực hồ sơ cho "${selectedRegistration.schoolName}"?`
                        : ""
                }
                extraDescription="Sau khi được xác thực, tài khoản của trường sẽ được kích hoạt để sử dụng hệ thống EduBridgeHCM."
                cancelText="Hủy"
                confirmText={verifyingId ? "Đang xác thực..." : "Xác thực"}
                onCancel={handleConfirmClose}
                onConfirm={handleVerify}
                loading={!!verifyingId}
                paperSx={{
                    background: "linear-gradient(145deg, #eef7ff 0%, #f8fbff 46%, #ffffff 100%)",
                    border: "1px solid rgba(59,130,246,0.25)",
                }}
                titleSx={{
                    background: "linear-gradient(90deg, rgba(37,99,235,0.2) 0%, rgba(59,130,246,0.14) 100%)",
                    borderBottom: "none",
                }}
            />
        </Box>
    );
}

