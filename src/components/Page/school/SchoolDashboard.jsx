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
import ApartmentIcon from "@mui/icons-material/Apartment";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import CampaignIcon from "@mui/icons-material/Campaign";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import SchoolIcon from "@mui/icons-material/School";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TimelineIcon from "@mui/icons-material/Timeline";
import BarChartIcon from "@mui/icons-material/BarChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

const statCards = [
    {
        label: "Tổng số cơ sở",
        value: 4,
        trend: "+5% tuần này",
        icon: <ApartmentIcon sx={{fontSize: 28}}/>,
        color: "#2563eb",
    },
    {
        label: "Tổng số tư vấn viên",
        value: 12,
        trend: "+2% tuần này",
        icon: <PeopleAltIcon sx={{fontSize: 28}}/>,
        color: "#0ea5e9",
    },
    {
        label: "Chiến dịch đang hoạt động",
        value: 2,
        trend: "+1 chiến dịch mới",
        icon: <CampaignIcon sx={{fontSize: 28}}/>,
        color: "#22c55e",
    },
    {
        label: "Yêu cầu tư vấn",
        value: 28,
        trend: "+5 yêu cầu mới",
        icon: <ChatBubbleOutlineIcon sx={{fontSize: 28}}/>,
        color: "#f97316",
    },
    {
        label: "Học sinh đã đăng ký",
        value: 65,
        trend: "+8% tuần này",
        icon: <SchoolIcon sx={{fontSize: 28}}/>,
        color: "#2563eb",
    },
];

const mockActivities = [
    {
        parent: "Nguyễn Văn A",
        topic: "Tư vấn tuyển sinh lớp 10",
        counselor: "Trần Minh Quân",
        status: "Pending",
        time: "Hôm nay, 09:15",
    },
    {
        parent: "Trần Thị B",
        topic: "Tư vấn chương trình song ngữ",
        counselor: "Lê Thị Hương",
        status: "In Progress",
        time: "Hôm qua, 15:40",
    },
    {
        parent: "Lê Văn C",
        topic: "Hỗ trợ hồ sơ nhập học",
        counselor: "Nguyễn Thị Mai",
        status: "Completed",
        time: "2 ngày trước",
    },
    {
        parent: "Phạm Gia D",
        topic: "Tư vấn chuyển trường",
        counselor: "Trần Văn Minh",
        status: "Pending",
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
    Pending: {bg: "rgba(234, 179, 8, 0.12)", color: "#ca8a04"},
    "In Progress": {bg: "rgba(59, 130, 246, 0.12)", color: "#2563eb"},
    Completed: {bg: "rgba(34, 197, 94, 0.12)", color: "#16a34a"},
};

export default function SchoolDashboard() {
    return (
        <Box sx={{display: "flex", flexDirection: "column", gap: 4, width: "100%", pb: 4}}>
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.25)",
                    color: "white",
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
                            sx={{letterSpacing: "0.16em", opacity: 0.9, fontSize: 11}}
                        >
                            OVERVIEW DASHBOARD
                        </Typography>
                        <Typography
                            variant="h4"
                            sx={{
                                mt: 1,
                                fontWeight: 800,
                                letterSpacing: "-0.03em",
                                textShadow: "0 1px 3px rgba(51,65,85,0.4)",
                            }}
                        >
                            Chào mừng bạn trở lại
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{mt: 1, opacity: 0.92, maxWidth: 520, lineHeight: 1.6}}
                        >
                            Đây là tổng quan nhanh về hoạt động tuyển sinh, tư vấn và học sinh trong hệ
                            thống EduBridgeHCM của trường bạn.
                        </Typography>
                        <Typography variant="body2" sx={{mt: 2, opacity: 0.9}}>
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
                        <Typography variant="body2" sx={{opacity: 0.9}}>
                            Truy cập nhanh
                        </Typography>
                        <Stack
                            direction={{xs: "column", sm: "row"}}
                            spacing={1.5}
                            sx={{alignItems: {xs: "stretch", sm: "center"}}}
                        >
                            <Button
                                variant="contained"
                                startIcon={<AddCircleOutlineIcon/>}
                                sx={{
                                    textTransform: "none",
                                    borderRadius: 999,
                                    px: 3,
                                    py: 1,
                                    bgcolor: "rgba(51,65,85,0.9)",
                                    "&:hover": {
                                        bgcolor: "rgba(51,65,85,1)",
                                    },
                                }}
                            >
                                Tạo chiến dịch mới
                            </Button>
                            <Button
                                variant="outlined"
                                sx={{
                                    textTransform: "none",
                                    borderRadius: 999,
                                    px: 2.5,
                                    py: 1,
                                    borderColor: "rgba(255,255,255,0.7)",
                                    color: "white",
                                    "&:hover": {
                                        borderColor: "white",
                                        bgcolor: "rgba(51,65,85,0.25)",
                                    },
                                }}
                                endIcon={<ArrowForwardIosIcon sx={{fontSize: 14}}/>}
                            >
                                Xem yêu cầu tư vấn
                            </Button>
                        </Stack>
                    </Box>
                </CardContent>
            </Card>

            <Grid container spacing={2.5}>
                {statCards.map((card) => (
                    <Grid key={card.label} item xs={12} sm={6} md={4} lg={2.4}>
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
                                    Yêu cầu tư vấn theo thời gian
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
                                {[30, 60, 45, 80, 55, 90, 70].map((h, idx) => (
                                    <Box
                                        key={idx}
                                        sx={{
                                            flex: 1,
                                            borderRadius: 999,
                                            bgcolor: "linear-gradient(180deg, #0D64DE, #7AA9EB)",
                                            background: "linear-gradient(180deg, #0D64DE, #7AA9EB)",
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
                                    Học sinh đăng ký theo cơ sở
                                </Typography>
                                <IconButton size="small" sx={{color: "#64748b"}}>
                                    <BarChartIcon fontSize="small"/>
                                </IconButton>
                            </Stack>
                            <Typography variant="body2" sx={{mb: 2, color: "#94a3b8"}}>
                                Biểu đồ cột minh họa cho số lượng học sinh ở từng cơ sở.
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
                                    {label: "Chính", value: 80},
                                    {label: "Cơ sở 2", value: 55},
                                    {label: "Cơ sở 3", value: 40},
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
                                                bgcolor: "#0D64DE",
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
                                    Phân bố học sinh theo chiến dịch
                                </Typography>
                                <IconButton size="small" sx={{color: "#64748b"}}>
                                    <PieChartIcon fontSize="small"/>
                                </IconButton>
                            </Stack>
                            <Typography variant="body2" sx={{mb: 2, color: "#94a3b8"}}>
                                Biểu đồ tròn minh họa tỉ lệ học sinh tham gia từng chiến dịch tuyển sinh.
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
                                            "conic-gradient(#0D64DE 0 40%, #22c55e 40% 70%, #f97316 70% 100%)",
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
                                            sx={{width: 10, height: 10, borderRadius: "50%", bgcolor: "#0D64DE"}}
                                        />
                                        <Typography variant="body2" sx={{color: "#1e293b"}}>
                                            Chiến dịch lớp 10 · 40%
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Box
                                            sx={{width: 10, height: 10, borderRadius: "50%", bgcolor: "#22c55e"}}
                                        />
                                        <Typography variant="body2" sx={{color: "#1e293b"}}>
                                            Chiến dịch lớp 6 · 30%
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Box
                                            sx={{width: 10, height: 10, borderRadius: "50%", bgcolor: "#f97316"}}
                                        />
                                        <Typography variant="body2" sx={{color: "#1e293b"}}>
                                            Khác · 30%
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
                                    Hoạt động tư vấn gần đây
                                </Typography>
                                <Button
                                    size="small"
                                    sx={{
                                        textTransform: "none",
                                        color: "#0D64DE",
                                        fontWeight: 500,
                                    }}
                                >
                                    Xem tất cả
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
                                                Phụ huynh
                                            </TableCell>
                                            <TableCell sx={{fontWeight: 600, color: "#1e293b"}}>
                                                Chủ đề tư vấn
                                            </TableCell>
                                            <TableCell sx={{fontWeight: 600, color: "#1e293b"}}>
                                                Tư vấn viên
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
                                        {mockActivities.map((row) => {
                                            const statusStyle = statusColorMap[row.status] || statusColorMap.Pending;
                                            return (
                                                <TableRow
                                                    key={`${row.parent}-${row.time}`}
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
                                                                    bgcolor: "#0D64DE",
                                                                    fontSize: 14,
                                                                }}
                                                            >
                                                                {row.parent
                                                                    .split(" ")
                                                                    .map((p) => p[0])
                                                                    .slice(-2)
                                                                    .join("")
                                                                    .toUpperCase()}
                                                            </Avatar>
                                                            <Typography sx={{fontWeight: 500, color: "#1e293b"}}>
                                                                {row.parent}
                                                            </Typography>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell sx={{color: "#64748b"}}>
                                                        {row.topic}
                                                    </TableCell>
                                                    <TableCell sx={{color: "#64748b"}}>
                                                        {row.counselor}
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
                                    startIcon={<ApartmentIcon/>}
                                    sx={{
                                        justifyContent: "flex-start",
                                        borderRadius: 2,
                                        textTransform: "none",
                                        borderColor: "#e2e8f0",
                                        color: "#1e293b",
                                        "&:hover": {borderColor: "#0D64DE", bgcolor: "#eff6ff"},
                                    }}
                                >
                                    Tạo cơ sở
                                </Button>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<PeopleAltIcon/>}
                                    sx={{
                                        justifyContent: "flex-start",
                                        borderRadius: 2,
                                        textTransform: "none",
                                        borderColor: "#e2e8f0",
                                        color: "#1e293b",
                                        "&:hover": {borderColor: "#0D64DE", bgcolor: "#eff6ff"},
                                    }}
                                >
                                    Thêm tư vấn viên
                                </Button>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<CampaignIcon/>}
                                    sx={{
                                        justifyContent: "flex-start",
                                        borderRadius: 2,
                                        textTransform: "none",
                                        borderColor: "#e2e8f0",
                                        color: "#1e293b",
                                        "&:hover": {borderColor: "#0D64DE", bgcolor: "#eff6ff"},
                                    }}
                                >
                                    Tạo chiến dịch tuyển sinh
                                </Button>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<ChatBubbleOutlineIcon/>}
                                    sx={{
                                        justifyContent: "flex-start",
                                        borderRadius: 2,
                                        textTransform: "none",
                                        borderColor: "#e2e8f0",
                                        color: "#1e293b",
                                        "&:hover": {borderColor: "#0D64DE", bgcolor: "#eff6ff"},
                                    }}
                                >
                                    Xem yêu cầu tư vấn
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

