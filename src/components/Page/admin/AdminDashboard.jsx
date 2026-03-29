import React from "react";
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Grid,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import SchoolIcon from "@mui/icons-material/School";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TimelineIcon from "@mui/icons-material/Timeline";
import BarChartIcon from "@mui/icons-material/BarChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import {
    APP_PRIMARY_DARK,
    APP_PRIMARY_MAIN,
    APP_PRIMARY_SOFT_BG,
} from "../../../constants/homeLandingTheme";

const statCards = [
    {
        label: "Tổng người dùng",
        value: 1250,
        trend: "+12% tháng này",
        icon: <PeopleIcon sx={{fontSize: 28}}/>,
        color: "#2563eb",
    },
    {
        label: "Tổng trường học",
        value: 32,
        trend: "+3 trường mới",
        icon: <SchoolIcon sx={{fontSize: 28}}/>,
        color: "#16a34a",
    },
    {
        label: "Tổng đơn đăng ký",
        value: 486,
        trend: "+58 đơn mới",
        icon: <AssessmentIcon sx={{fontSize: 28}}/>,
        color: "#dc2626",
    },
    {
        label: "Quản trị viên hệ thống",
        value: 8,
        trend: "Không đổi",
        icon: <AdminPanelSettingsIcon sx={{fontSize: 28}}/>,
        color: APP_PRIMARY_MAIN,
    },
];

const mockSystemActivities = [
    {
        actor: "Admin Super",
        action: "Tạo mới tài khoản trường THPT Nguyễn Trãi",
        target: "Trường học",
        status: "Success",
        time: "Hôm nay, 08:35",
    },
    {
        actor: "Admin HCM",
        action: "Cập nhật phân quyền cho user counselor01",
        target: "Người dùng",
        status: "Success",
        time: "Hôm qua, 16:10",
    },
    {
        actor: "Admin Hà Nội",
        action: "Khóa tạm thời tài khoản school_demo",
        target: "Bảo mật",
        status: "Warning",
        time: "2 ngày trước",
    },
    {
        actor: "Hệ thống",
        action: "Chạy tác vụ đồng bộ dữ liệu hàng ngày",
        target: "Nền tảng",
        status: "Success",
        time: "2 ngày trước",
    },
];

const todayString = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
});

const statusColorMap = {
    Success: {bg: "rgba(34, 197, 94, 0.12)", color: "#16a34a"},
    Warning: {bg: "rgba(234, 179, 8, 0.12)", color: "#ca8a04"},
};

export default function AdminDashboard() {
    return (
        <Box sx={{display: "flex", flexDirection: "column", gap: 4, width: "100%", pb: 4}}>
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    background: "linear-gradient(135deg, #dbeafe 0%, #93c5fd 50%, #eff6ff 100%)",
                    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.18)",
                    color: "#1e293b",
                    overflow: "hidden",
                }}
            >
                <CardContent
                    sx={{
                        p: {xs: 3, md: 4},
                        display: "flex",
                        flexDirection: {xs: "column", md: "row"},
                        alignItems: {xs: "flex-start", md: "center"},
                        justifyContent: "space-between",
                        gap: 3,
                    }}
                >
                    <Box>
                        <Typography
                            variant="overline"
                            sx={{letterSpacing: "0.16em", opacity: 0.7, fontSize: 11, color: APP_PRIMARY_MAIN}}
                        >
                            ADMIN DASHBOARD
                        </Typography>
                        <Typography
                            variant="h4"
                            sx={{
                                mt: 1,
                                fontWeight: 800,
                                letterSpacing: "-0.03em",
                                textShadow: "0 1px 2px rgba(148,163,184,0.8)",
                            }}
                        >
                            Chào mừng Admin trở lại
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{mt: 1, opacity: 0.9, maxWidth: 520, lineHeight: 1.6, color: "#1f2937"}}
                        >
                            Đây là tổng quan nhanh về hoạt động hệ thống, người dùng và các trường đang sử dụng
                            nền tảng EduBridgeHCM.
                        </Typography>
                        <Typography variant="body2" sx={{mt: 2, opacity: 0.9, color: "#374151"}}>
                            <strong>Hôm nay:</strong> {todayString}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
                            alignItems: {xs: "flex-start", md: "flex-end"},
                        }}
                    >
                        <Typography variant="body2" sx={{opacity: 0.8, color: "#4b5563"}}>
                            Truy cập nhanh
                        </Typography>
                        <Stack
                            direction={{xs: "column", sm: "row"}}
                            spacing={1.5}
                            sx={{alignItems: {xs: "stretch", sm: "center"}}}
                        >
                            <Button
                                variant="outlined"
                                sx={{
                                    textTransform: "none",
                                    borderRadius: 999,
                                    px: 2.5,
                                    py: 1,
                                    borderColor: APP_PRIMARY_MAIN,
                                    color: APP_PRIMARY_MAIN,
                                    "&:hover": {
                                        borderColor: APP_PRIMARY_DARK,
                                        bgcolor: APP_PRIMARY_SOFT_BG,
                                    },
                                }}
                                endIcon={<ArrowForwardIosIcon sx={{fontSize: 14}}/>}
                            >
                                Quản lý người dùng
                            </Button>
                        </Stack>
                    </Box>
                </CardContent>
            </Card>

            <Grid container spacing={2.5}>
                {statCards.map((card) => (
                    <Grid key={card.label} item xs={12} sm={6} md={3}>
                        <Card
                            elevation={0}
                            sx={{
                                borderRadius: 3,
                                border: "1px solid #e2e8f0",
                                bgcolor: "#ffffff",
                                boxShadow: "0 10px 30px rgba(51,65,85,0.08)",
                                transition: "transform 0.18s ease, box-shadow 0.18s ease",
                                "&:hover": {
                                    transform: "translateY(-4px)",
                                    boxShadow: "0 16px 40px rgba(51,65,85,0.14)",
                                },
                            }}
                        >
                            <CardContent sx={{p: 2.5}}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                    <Box>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: "#64748b",
                                                textTransform: "uppercase",
                                                fontSize: 11,
                                                letterSpacing: "0.08em",
                                            }}
                                        >
                                            {card.label}
                                        </Typography>
                                        <Typography
                                            variant="h4"
                                            sx={{
                                                mt: 0.5,
                                                fontWeight: 800,
                                                color: "#1e293b",
                                                letterSpacing: "-0.04em",
                                            }}
                                        >
                                            {card.value}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 2,
                                            bgcolor: `${card.color}12`,
                                            color: card.color,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        {card.icon}
                                    </Box>
                                </Stack>
                                <Stack direction="row" alignItems="center" spacing={1} sx={{mt: 1.5}}>
                                    <TrendingUpIcon sx={{fontSize: 18, color: "#16a34a"}}/>
                                    <Typography variant="caption" sx={{color: "#16a34a", fontWeight: 500}}>
                                        {card.trend}
                                    </Typography>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={2.5}>
                <Grid item xs={12} md={6} lg={4}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid #e2e8f0",
                            bgcolor: "#ffffff",
                        }}
                    >
                        <CardContent sx={{p: 3}}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b"}}>
                                    Tăng trưởng người dùng theo thời gian
                                </Typography>
                                <IconButton size="small" sx={{color: "#64748b"}}>
                                    <TimelineIcon fontSize="small"/>
                                </IconButton>
                            </Stack>
                            <Typography variant="body2" sx={{mb: 2, color: "#94a3b8"}}>
                                Biểu đồ minh họa – sẽ thay bằng dữ liệu thực khi API sẵn sàng.
                            </Typography>
                            <Box
                                sx={{
                                    mt: 1,
                                    height: 180,
                                    borderRadius: 2,
                                    bgcolor: "#f8fafc",
                                    position: "relative",
                                    overflow: "hidden",
                                    px: 1,
                                    display: "flex",
                                    alignItems: "flex-end",
                                    gap: 1,
                                }}
                            >
                                {[20, 40, 55, 65, 75, 90, 95].map((h, idx) => (
                                    <Box
                                        key={idx}
                                        sx={{
                                            flex: 1,
                                            borderRadius: 999,
                                            background: "linear-gradient(180deg, #6366F1, #0F172A)",
                                            height: `${h}%`,
                                            opacity: 0.9,
                                        }}
                                    />
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6} lg={4}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid #e2e8f0",
                            bgcolor: "#ffffff",
                        }}
                    >
                        <CardContent sx={{p: 3}}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b"}}>
                                    Đăng ký theo khu vực
                                </Typography>
                                <IconButton size="small" sx={{color: "#64748b"}}>
                                    <BarChartIcon fontSize="small"/>
                                </IconButton>
                            </Stack>
                            <Typography variant="body2" sx={{mb: 2, color: "#94a3b8"}}>
                                Biểu đồ cột minh họa cho số lượng đơn đăng ký từ từng khu vực.
                            </Typography>
                            <Box
                                sx={{
                                    mt: 1,
                                    height: 180,
                                    borderRadius: 2,
                                    bgcolor: "#f8fafc",
                                    display: "flex",
                                    alignItems: "flex-end",
                                    justifyContent: "space-around",
                                    px: 1,
                                }}
                            >
                                {[
                                    {label: "TP.HCM", value: 80},
                                    {label: "Hà Nội", value: 65},
                                    {label: "Khác", value: 45},
                                ].map((bar) => (
                                    <Box
                                        key={bar.label}
                                        sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: 0.5,
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 26,
                                                borderRadius: 1.5,
                                                bgcolor: "#6366F1",
                                                height: `${bar.value}%`,
                                            }}
                                        />
                                        <Typography variant="caption" sx={{color: "#64748b"}}>
                                            {bar.label}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} lg={4}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid #e2e8f0",
                            bgcolor: "#ffffff",
                            height: "100%",
                        }}
                    >
                        <CardContent sx={{p: 3}}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b"}}>
                                    Phân bố trường theo gói sử dụng
                                </Typography>
                                <IconButton size="small" sx={{color: "#64748b"}}>
                                    <PieChartIcon fontSize="small"/>
                                </IconButton>
                            </Stack>
                            <Typography variant="body2" sx={{mb: 2, color: "#94a3b8"}}>
                                Biểu đồ tròn minh họa tỉ lệ trường đang dùng các gói dịch vụ khác nhau.
                            </Typography>
                            <Stack
                                direction="row"
                                alignItems="center"
                                spacing={2.5}
                                sx={{mt: 1, flexWrap: "wrap"}}
                            >
                                <Box
                                    sx={{
                                        width: 140,
                                        height: 140,
                                        borderRadius: "50%",
                                        background:
                                            "conic-gradient(#6366F1 0 45%, #22c55e 45% 75%, #f97316 75% 100%)",
                                        position: "relative",
                                    }}
                                >
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            inset: 14,
                                            borderRadius: "50%",
                                            bgcolor: "#ffffff",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexDirection: "column",
                                        }}
                                    >
                                        <Typography variant="caption" sx={{color: "#64748b"}}>
                                            Tổng
                                        </Typography>
                                        <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b"}}>
                                            100%
                                        </Typography>
                                    </Box>
                                </Box>
                                <Stack spacing={1}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Box
                                            sx={{width: 10, height: 10, borderRadius: "50%", bgcolor: "#6366F1"}}
                                        />
                                        <Typography variant="body2" sx={{color: "#1e293b"}}>
                                            Gói Premium · 45%
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Box
                                            sx={{width: 10, height: 10, borderRadius: "50%", bgcolor: "#22c55e"}}
                                        />
                                        <Typography variant="body2" sx={{color: "#1e293b"}}>
                                            Gói Standard · 30%
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Box
                                            sx={{width: 10, height: 10, borderRadius: "50%", bgcolor: "#f97316"}}
                                        />
                                        <Typography variant="body2" sx={{color: "#1e293b"}}>
                                            Gói Cơ bản · 25%
                                        </Typography>
                                    </Stack>
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Grid container spacing={2.5}>
                <Grid item xs={12} md={8}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid #e2e8f0",
                            bgcolor: "#ffffff",
                        }}
                    >
                        <CardContent sx={{p: 3}}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b"}}>
                                    Hoạt động hệ thống gần đây
                                </Typography>
                                <Button
                                    size="small"
                                    sx={{
                                        textTransform: "none",
                                        color: "#6366F1",
                                        fontWeight: 500,
                                    }}
                                >
                                    Xem nhật ký hệ thống
                                </Button>
                            </Stack>
                            <Typography variant="body2" sx={{mb: 2, color: "#94a3b8"}}>
                                Danh sách minh họa – sẽ được thay thế bằng dữ liệu thật khi API sẵn sàng.
                            </Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{bgcolor: "#f8fafc"}}>
                                            <TableCell sx={{fontWeight: 600, color: "#1e293b"}}>
                                                Người thực hiện
                                            </TableCell>
                                            <TableCell sx={{fontWeight: 600, color: "#1e293b"}}>
                                                Hành động
                                            </TableCell>
                                            <TableCell sx={{fontWeight: 600, color: "#1e293b"}}>
                                                Nhóm
                                            </TableCell>
                                            <TableCell sx={{fontWeight: 600, color: "#1e293b"}}>
                                                Trạng thái
                                            </TableCell>
                                            <TableCell sx={{fontWeight: 600, color: "#1e293b"}}>
                                                Thời gian
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {mockSystemActivities.map((row) => {
                                            const statusStyle = statusColorMap[row.status] || statusColorMap.Success;
                                            return (
                                                <TableRow
                                                    key={`${row.actor}-${row.time}`}
                                                    hover
                                                    sx={{
                                                        "&:hover": {
                                                            bgcolor: "#f8fafc",
                                                        },
                                                    }}
                                                >
                                                    <TableCell>
                                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                                            <Avatar
                                                                sx={{
                                                                    width: 32,
                                                                    height: 32,
                                                                    bgcolor: "#6366F1",
                                                                    fontSize: 14,
                                                                }}
                                                            >
                                                                {row.actor
                                                                    .split(" ")
                                                                    .map((p) => p[0])
                                                                    .slice(-2)
                                                                    .join("")
                                                                    .toUpperCase()}
                                                            </Avatar>
                                                            <Typography sx={{fontWeight: 500, color: "#1e293b"}}>
                                                                {row.actor}
                                                            </Typography>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell sx={{color: "#64748b"}}>
                                                        {row.action}
                                                    </TableCell>
                                                    <TableCell sx={{color: "#64748b"}}>
                                                        {row.target}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={row.status}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: statusStyle.bg,
                                                                color: statusStyle.color,
                                                                fontWeight: 500,
                                                                borderRadius: 999,
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{color: "#64748b"}}>
                                                        {row.time}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid #e2e8f0",
                            bgcolor: "#ffffff",
                            height: "100%",
                        }}
                    >
                        <CardContent sx={{p: 3}}>
                            <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b", mb: 2}}>
                                Thao tác nhanh
                            </Typography>
                            <Stack spacing={1.5}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<SchoolIcon/>}
                                    sx={{
                                        justifyContent: "flex-start",
                                        borderRadius: 2,
                                        textTransform: "none",
                                        borderColor: "#e2e8f0",
                                        color: "#1e293b",
                                        "&:hover": {borderColor: "#6366F1", bgcolor: "#eff6ff"},
                                    }}
                                >
                                    Quản lý trường học
                                </Button>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<PeopleIcon/>}
                                    sx={{
                                        justifyContent: "flex-start",
                                        borderRadius: 2,
                                        textTransform: "none",
                                        borderColor: "#e2e8f0",
                                        color: "#1e293b",
                                        "&:hover": {borderColor: "#6366F1", bgcolor: "#eff6ff"},
                                    }}
                                >
                                    Quản lý người dùng
                                </Button>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<AssessmentIcon/>}
                                    sx={{
                                        justifyContent: "flex-start",
                                        borderRadius: 2,
                                        textTransform: "none",
                                        borderColor: "#e2e8f0",
                                        color: "#1e293b",
                                        "&:hover": {borderColor: "#6366F1", bgcolor: "#eff6ff"},
                                    }}
                                >
                                    Xem báo cáo hệ thống
                                </Button>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<AdminPanelSettingsIcon/>}
                                    sx={{
                                        justifyContent: "flex-start",
                                        borderRadius: 2,
                                        textTransform: "none",
                                        borderColor: "#e2e8f0",
                                        color: "#1e293b",
                                        "&:hover": {borderColor: "#6366F1", bgcolor: "#eff6ff"},
                                    }}
                                >
                                    Cấu hình phân quyền
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
