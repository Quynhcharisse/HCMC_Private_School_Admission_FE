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
    CircularProgress,
    IconButton,
    Tooltip,
} from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PendingRoundedIcon from "@mui/icons-material/PendingRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CallRoundedIcon from "@mui/icons-material/CallRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import {enqueueSnackbar} from "notistack";
import {showSuccessSnackbar} from "../../ui/AppSnackbar.jsx";
import ConfirmDialog from "../../ui/ConfirmDialog.jsx";
import {getPendingSchoolRegistrations, verifySchoolRegistration} from "../../../services/AdminService.jsx";

export default function AdminSchoolVerification() {
    const [registrations, setRegistrations] = useState([]);
    const [sortBy, setSortBy] = useState("newest");
    const [loading, setLoading] = useState(false);
    const [verifyingId, setVerifyingId] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedRegistration, setSelectedRegistration] = useState(null);
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
                    icon={<AccessTimeIcon sx={{fontSize: 14}} />}
                    label="Chờ xác thực"
                    sx={{
                        bgcolor: "#f59e0b",
                        color: "#ffffff",
                        border: "1px solid #f59e0b",
                        "& .MuiChip-label": {fontWeight: 700, px: 1.2},
                        "& .MuiChip-icon": {color: "#ffffff"},
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
                        bgcolor: "#10b981",
                        color: "#ffffff",
                        border: "1px solid #10b981",
                        "& .MuiChip-label": {fontWeight: 700, px: 1.2},
                        "& .MuiChip-icon": {color: "#ffffff"},
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
                        bgcolor: "#f43f5e",
                        color: "#ffffff",
                        border: "1px solid #f43f5e",
                        "& .MuiChip-label": {fontWeight: 700, px: 1.2},
                        "& .MuiChip-icon": {color: "#ffffff"},
                    }}
                />
            );
        }
        return <Chip label={status || "Không xác định"} size="small" />;
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

    return (
        <Box sx={{pb: 2}}>
            <Card
                elevation={0}
                sx={{
                    borderRadius: 5,
                    mb: 3,
                    color: "white",
                    background: "linear-gradient(92deg, #2563eb 0%, #3158ef 38%, #6d3df2 72%, #8b3dff 100%)",
                    boxShadow: "0 20px 38px rgba(67, 56, 202, 0.26)",
                }}
            >
                <CardContent sx={{p: {xs: 2.5, md: 3.5}, "&:last-child": {pb: {xs: 2.5, md: 3.5}}}}>
                    <Box sx={{display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2}}>
                        <Box sx={{display: "flex", alignItems: "center", gap: 1.5}}>
                            <Avatar
                                sx={{
                                    bgcolor: alpha("#ffffff", 0.18),
                                    color: "white",
                                    width: 44,
                                    height: 44,
                                }}
                            >
                                <SchoolIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" sx={{fontWeight: 700, lineHeight: 1.2}}>
                                    Xác Thực Trường Học
                                </Typography>
                                <Typography variant="body2" sx={{opacity: 0.9, mt: 0.5}}>
                                    Hệ thống quản lý và xác thực hồ sơ trường học
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <Box
                sx={{
                    mb: 3,
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, minmax(0, 1fr))",
                        lg: "repeat(4, minmax(0, 1fr))",
                    },
                    gap: 2,
                }}
            >
                <Card elevation={0} sx={{borderRadius: 3, border: "1px solid #dbeafe", bgcolor: "#eef7ff", minHeight: 132}}>
                    <CardContent sx={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                        <Box>
                            <Typography sx={{fontSize: 13, color: "#64748b", mb: 0.5}}>Tổng hồ sơ</Typography>
                            <Typography variant="h4" sx={{fontWeight: 700, color: "#0f172a"}}>{stats.total}</Typography>
                        </Box>
                        <Avatar sx={{bgcolor: "#dbeafe", color: "#2563eb"}}>
                            <DescriptionRoundedIcon />
                        </Avatar>
                    </CardContent>
                </Card>

                <Card elevation={0} sx={{borderRadius: 3, border: "1px solid #fde7c7", bgcolor: "#fff7ec", minHeight: 132}}>
                    <CardContent sx={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                        <Box>
                            <Typography sx={{fontSize: 13, color: "#64748b", mb: 0.5}}>Chờ duyệt</Typography>
                            <Typography variant="h4" sx={{fontWeight: 700, color: "#0f172a"}}>{stats.pending}</Typography>
                        </Box>
                        <Avatar sx={{bgcolor: "#ffedd5", color: "#f97316"}}>
                            <PendingRoundedIcon />
                        </Avatar>
                    </CardContent>
                </Card>

                <Card elevation={0} sx={{borderRadius: 3, border: "1px solid #d6f5e4", bgcolor: "#effcf5", minHeight: 132}}>
                    <CardContent sx={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                        <Box>
                            <Typography sx={{fontSize: 13, color: "#64748b", mb: 0.5}}>Đã duyệt</Typography>
                            <Typography variant="h4" sx={{fontWeight: 700, color: "#0f172a"}}>{stats.verified}</Typography>
                        </Box>
                        <Avatar sx={{bgcolor: "#dcfce7", color: "#16a34a"}}>
                            <CheckCircleRoundedIcon />
                        </Avatar>
                    </CardContent>
                </Card>

                <Card elevation={0} sx={{borderRadius: 3, border: "1px solid #ffd9e0", bgcolor: "#fff1f5", minHeight: 132}}>
                    <CardContent sx={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                        <Box>
                            <Typography sx={{fontSize: 13, color: "#64748b", mb: 0.5}}>Từ chối</Typography>
                            <Typography variant="h4" sx={{fontWeight: 700, color: "#0f172a"}}>{stats.rejected}</Typography>
                        </Box>
                        <Avatar sx={{bgcolor: "#fee2e2", color: "#e11d48"}}>
                            <CancelRoundedIcon />
                        </Avatar>
                    </CardContent>
                </Card>
            </Box>

            <Card elevation={0} sx={{borderRadius: 4, border: "1px solid #e5e7eb", bgcolor: "#f9fafb"}}>
                <CardContent sx={{p: {xs: 2, md: 3}, "&:last-child": {pb: {xs: 2, md: 3}}}}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb: 2.5}}>
                        <Box sx={{display: "flex", alignItems: "center", gap: 1.5}}>
                            <Avatar sx={{width: 34, height: 34, bgcolor: "#f59e0b"}}>
                                <PendingRoundedIcon sx={{fontSize: 18}} />
                            </Avatar>
                            <Box>
                                <Typography sx={{fontSize: 32, fontWeight: 700, lineHeight: 1.1, color: "#1f2937"}}>
                                    Danh sách hồ sơ chờ duyệt
                                </Typography>
                                <Typography sx={{fontSize: 13, color: "#6b7280"}}>
                                    {displayedRegistrations.length} hồ sơ được tìm thấy
                                </Typography>
                            </Box>
                        </Box>
                        <Stack direction="row" spacing={1}>
                            <Chip
                                label="Mới nhất"
                                clickable
                                onClick={() => setSortBy("newest")}
                                sx={{
                                    height: 34,
                                    borderRadius: 999,
                                    border: "1px solid #d1d5db",
                                    bgcolor: sortBy === "newest" ? "#111827" : "#ffffff",
                                    color: sortBy === "newest" ? "#ffffff" : "#111827",
                                    "& .MuiChip-label": {fontWeight: 600},
                                }}
                            />
                            <Chip
                                label="Theo tên"
                                clickable
                                onClick={() => setSortBy("name")}
                                sx={{
                                    height: 34,
                                    borderRadius: 999,
                                    border: "1px solid #d1d5db",
                                    bgcolor: sortBy === "name" ? "#111827" : "#ffffff",
                                    color: sortBy === "name" ? "#ffffff" : "#111827",
                                    "& .MuiChip-label": {fontWeight: 600},
                                }}
                            />
                        </Stack>
                    </Stack>

                    {loading ? (
                        <Box sx={{py: 5, display: "flex", justifyContent: "center"}}>
                            <CircularProgress size={30} />
                        </Box>
                    ) : displayedRegistrations.length === 0 ? (
                        <Typography variant="body1" sx={{color: "#64748b", textAlign: "center", py: 4}}>
                            Không có hồ sơ để hiển thị.
                        </Typography>
                    ) : (
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: {xs: "1fr", xl: "repeat(2, minmax(0, 1fr))"},
                                gap: 2,
                            }}
                        >
                            {displayedRegistrations.map((item) => (
                                <Card
                                    key={item.id}
                                    elevation={0}
                                    sx={{
                                        borderRadius: 3,
                                        border: "1px solid #eceff3",
                                        bgcolor: "#ffffff",
                                        position: "relative",
                                        overflow: "hidden",
                                        transition:
                                            "border-color 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease",
                                        "&::before": {
                                            content: '""',
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            width: "100%",
                                            height: 4,
                                            background:
                                                "linear-gradient(90deg, #3b82f6 0%, #6366f1 52%, #ec4899 100%)",
                                            opacity: 0,
                                            transition: "opacity 0.22s ease",
                                        },
                                        "&:hover": {
                                            borderColor: "#c7d2fe",
                                            boxShadow: "0 12px 26px rgba(59, 130, 246, 0.14)",
                                            transform: "translateY(-2px)",
                                        },
                                        "&:hover .school-name": {
                                            color: "#2563eb",
                                        },
                                        "&:hover::before": {
                                            opacity: 1,
                                        },
                                    }}
                                >
                                    <CardContent sx={{p: 2.2}}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{mb: 1.8}}>
                                            <Stack direction="row" spacing={1.5}>
                                                <Avatar
                                                    src={item.logoUrl || undefined}
                                                    alt={item.schoolName || "School logo"}
                                                    sx={{
                                                        width: 48,
                                                        height: 48,
                                                        fontWeight: 700,
                                                        background:
                                                            "linear-gradient(135deg, #6366f1 0%, #2563eb 100%)",
                                                    }}
                                                >
                                                    {(item.schoolName || "SC")
                                                        .split(" ")
                                                        .filter(Boolean)
                                                        .slice(0, 2)
                                                        .map((word) => word[0])
                                                        .join("")
                                                        .toUpperCase()}
                                                </Avatar>
                                                <Box>
                                                    <Typography
                                                        className="school-name"
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: "#1f2937",
                                                            fontSize: 18,
                                                            transition: "color 0.2s ease",
                                                        }}
                                                    >
                                                        {item.schoolName || "Trường học"}
                                                    </Typography>
                                                    <Stack direction="row" spacing={0.7} alignItems="center" sx={{mt: 0.5}}>
                                                        <PersonOutlineRoundedIcon sx={{fontSize: 15, color: "#9ca3af"}} />
                                                        <Typography sx={{fontSize: 14, color: "#6b7280"}}>
                                                            Đại diện: {item.representativeName || "Chưa cập nhật"}
                                                        </Typography>
                                                    </Stack>
                                                </Box>
                                            </Stack>
                                            {renderStatusChip(item.status)}
                                        </Stack>

                                        <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 1.4, mb: 1.4}}>
                                            <Box sx={{p: 1.3, borderRadius: 2, bgcolor: "#f8fafc", border: "1px solid #edf2f7"}}>
                                                <Stack direction="row" spacing={1.1}>
                                                    <Box
                                                        sx={{
                                                            width: 44,
                                                            height: 44,
                                                            borderRadius: 1.6,
                                                            background: "linear-gradient(135deg, #4f7dff 0%, #3b82f6 100%)",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            color: "#ffffff",
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <DescriptionRoundedIcon sx={{fontSize: 22}} />
                                                    </Box>
                                                    <Box>
                                                        <Typography sx={{fontSize: 12, color: "#6b7280"}}>Mã số thuế</Typography>
                                                        <Typography sx={{fontWeight: 700, color: "#1f2937"}}>{item.taxCode || "--"}</Typography>
                                                    </Box>
                                                </Stack>
                                            </Box>
                                            <Box sx={{p: 1.3, borderRadius: 2, bgcolor: "#f8fafc", border: "1px solid #edf2f7"}}>
                                                <Stack direction="row" spacing={1.1}>
                                                    <Box
                                                        sx={{
                                                            width: 44,
                                                            height: 44,
                                                            borderRadius: 1.6,
                                                            background: "linear-gradient(135deg, #22c7b3 0%, #0ea5a4 100%)",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            color: "#ffffff",
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <CallRoundedIcon sx={{fontSize: 22}} />
                                                    </Box>
                                                    <Box>
                                                        <Typography sx={{fontSize: 12, color: "#6b7280"}}>Hotline</Typography>
                                                        <Typography sx={{fontWeight: 700, color: "#1f2937"}}>{item.hotline || "--"}</Typography>
                                                    </Box>
                                                </Stack>
                                            </Box>
                                        </Box>

                                        <Box sx={{p: 1.3, borderRadius: 2, bgcolor: "#fffaf0", border: "1px solid #feefc7", mb: 2}}>
                                            <Stack direction="row" spacing={1.1}>
                                                <Box
                                                    sx={{
                                                        width: 44,
                                                        height: 44,
                                                        borderRadius: 1.6,
                                                        background: "linear-gradient(135deg, #ffb020 0%, #f97316 100%)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        color: "#ffffff",
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <LocationOnRoundedIcon sx={{fontSize: 22}} />
                                                </Box>
                                                <Box>
                                                    <Typography sx={{fontSize: 12, color: "#6b7280"}}>Địa chỉ</Typography>
                                                    <Typography sx={{fontWeight: 600, color: "#1f2937"}}>
                                                        {item.campusAddress || "Chưa cập nhật địa chỉ"}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Box>

                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Stack direction="row" spacing={2} sx={{color: "#6b7280"}}>
                                                <Stack direction="row" spacing={0.7} alignItems="center">
                                                    <CalendarTodayRoundedIcon sx={{fontSize: 14}} />
                                                    <Typography sx={{fontSize: 13}}>
                                                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString("vi-VN") : "--"}
                                                    </Typography>
                                                </Stack>
                                                <Stack direction="row" spacing={0.7} alignItems="center">
                                                    <FolderOpenRoundedIcon sx={{fontSize: 14}} />
                                                    <Typography sx={{fontSize: 13}}>{item.documentCount || 0} tài liệu</Typography>
                                                </Stack>
                                            </Stack>

                                            <Stack direction="row" spacing={0.8}>
                                                <Tooltip title="Xem giấy phép kinh doanh">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            component={item.businessLicenseUrl ? "a" : "button"}
                                                            href={item.businessLicenseUrl || undefined}
                                                            target={item.businessLicenseUrl ? "_blank" : undefined}
                                                            rel={item.businessLicenseUrl ? "noopener noreferrer" : undefined}
                                                            disabled={!item.businessLicenseUrl}
                                                            sx={{border: "1px solid #d1d5db"}}
                                                        >
                                                            <VisibilityIcon sx={{fontSize: 18}} />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Mở website trường">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            component={item.websiteUrl ? "a" : "button"}
                                                            href={item.websiteUrl || undefined}
                                                            target={item.websiteUrl ? "_blank" : undefined}
                                                            rel={item.websiteUrl ? "noopener noreferrer" : undefined}
                                                            disabled={!item.websiteUrl}
                                                            sx={{border: "1px solid #d1d5db"}}
                                                        >
                                                            <OpenInNewRoundedIcon sx={{fontSize: 18}} />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title={item.status === "VERIFIED" ? "Đã xác thực" : "Xác thực trường học"}>
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            disabled={!!verifyingId || item.status === "VERIFIED"}
                                                            onClick={() => openConfirm(item)}
                                                            sx={{border: "1px solid #d1d5db"}}
                                                        >
                                                            <TaskAltIcon sx={{fontSize: 18}} />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </Stack>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    )}
                </CardContent>
            </Card>
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
                    background: "linear-gradient(90deg, rgba(37,99,235,0.2) 0%, rgba(79,70,229,0.12) 100%)",
                    borderBottom: "none",
                }}
            />
        </Box>
    );
}

