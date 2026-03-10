import React from "react";
import {Box, Card, CardContent, Grid, List, ListItem, ListItemText, Typography} from "@mui/material";
import ApartmentIcon from "@mui/icons-material/Apartment";
import GroupsIcon from "@mui/icons-material/Groups";
import ChatIcon from "@mui/icons-material/Chat";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SchoolIcon from "@mui/icons-material/School";

const statCards = [
    {
        title: "Số cơ sở (Campus)",
        value: "0",
        sub: "Tổng số cơ sở đang hoạt động",
        icon: <ApartmentIcon sx={{fontSize: 32}}/>,
        color: "#1d4ed8",
    },
    {
        title: "Tổng phụ huynh đăng ký tư vấn",
        value: "0",
        sub: "Trong toàn bộ hệ thống",
        icon: <GroupsIcon sx={{fontSize: 32}}/>,
        color: "#0ea5e9",
    },
    {
        title: "Yêu cầu tư vấn mới hôm nay",
        value: "0",
        sub: "Tổng yêu cầu được tạo trong ngày",
        icon: <ChatIcon sx={{fontSize: 32}}/>,
        color: "#16a34a",
    },
    {
        title: "Lịch hẹn tham quan hôm nay",
        value: "0",
        sub: "Tham quan trường & gặp gỡ phụ huynh",
        icon: <CalendarTodayIcon sx={{fontSize: 32}}/>,
        color: "#22c55e",
    },
    {
        title: "Số hồ sơ nhập học",
        value: "0",
        sub: "Hồ sơ đăng ký nhập học đã tạo",
        icon: <SchoolIcon sx={{fontSize: 32}}/>,
        color: "#6366f1",
    },
];

const mockRequests = [
    {parent: "Nguyễn Văn A", grade: "Lớp 10", campus: "Cơ sở 1", status: "Chờ phản hồi"},
    {parent: "Trần Thị B", grade: "Lớp 6", campus: "Cơ sở 2", status: "Đã liên hệ"},
    {parent: "Lê Văn C", grade: "Lớp 1", campus: "Cơ sở 1", status: "Đang hẹn lịch"},
];

const mockSchedules = [
    {time: "09:00 - 10:00", title: "Tham quan trường - Gia đình Nguyễn Văn A", campus: "Cơ sở 1"},
    {time: "14:00 - 15:00", title: "Tư vấn tuyển sinh trực tiếp", campus: "Cơ sở 2"},
    {time: "16:30 - 17:00", title: "Gọi lại cho phụ huynh Trần Thị B", campus: "Online"},
];

export default function SchoolDashboard() {
    return (
        <Box sx={{display: "flex", flexDirection: "column", gap: 5, width: "100%"}}>
            {/* Header + stats */}
            <Box>
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 700,
                        color: "#1e293b",
                        mb: 1,
                        letterSpacing: "-0.02em",
                    }}
                >
                    Bảng Điều Khiển Trường Học
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        color: "#64748b",
                        mb: 3,
                        maxWidth: 900,
                    }}
                >
                    Tổng quan nhanh về tuyển sinh: số cơ sở, phụ huynh đăng ký tư vấn, yêu cầu mới,
                    lịch hẹn tham quan và hồ sơ nhập học trong hệ thống.
                </Typography>

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                        gap: 2.5,
                    }}
                >
                    {statCards.map((card, index) => (
                        <Card
                            key={index}
                            elevation={2}
                            sx={{
                                borderRadius: 3,
                                border: "1px solid #e0e7ff",
                                background:
                                    "linear-gradient(135deg, #ffffff 0%, #f8fafc 40%, #eff6ff 100%)",
                                boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
                            }}
                        >
                            <CardContent sx={{p: 3}}>
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        mb: 1.5,
                                    }}
                                >
                                    <Box>
                                        <Typography
                                            variant="body2"
                                            sx={{color: "#64748b", textTransform: "uppercase", fontSize: 11}}
                                        >
                                            {card.title}
                                        </Typography>
                                        <Typography
                                            variant="h4"
                                            sx={{fontWeight: 800, color: "#0f172a", mt: 0.5}}
                                        >
                                            {card.value}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            color: card.color,
                                            bgcolor: `${card.color}15`,
                                            borderRadius: 2,
                                            p: 1.25,
                                        }}
                                    >
                                        {card.icon}
                                    </Box>
                                </Box>
                                <Typography variant="body2" sx={{color: "#94a3b8"}}>
                                    {card.sub}
                                </Typography>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            </Box>

            {/* 2 columns: requests & schedule */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Card
                        elevation={2}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid #e0e7ff",
                        }}
                    >
                        <CardContent sx={{p: 3}}>
                            <Typography
                                variant="h6"
                                sx={{fontWeight: 700, color: "#1e293b", mb: 1.5}}
                            >
                                Yêu Cầu Tư Vấn Gần Đây
                            </Typography>
                            <Typography variant="body2" sx={{color: "#94a3b8", mb: 2}}>
                                Danh sách minh họa – sau này sẽ thay bằng dữ liệu thật từ backend.
                            </Typography>
                            <List dense>
                                {mockRequests.map((item, idx) => (
                                    <ListItem
                                        key={idx}
                                        sx={{
                                            borderRadius: 2,
                                            mb: 1,
                                            px: 1.5,
                                            "&:hover": {
                                                bgcolor: "#f1f5f9",
                                            },
                                        }}
                                    >
                                        <ListItemText
                                            primary={
                                                <Box sx={{display: "flex", justifyContent: "space-between"}}>
                                                    <Typography sx={{fontWeight: 600, color: "#0f172a"}}>
                                                        {item.parent}
                                                    </Typography>
                                                    <Typography sx={{fontSize: 12, color: "#64748b"}}>
                                                        {item.status}
                                                    </Typography>
                                                </Box>
                                            }
                                            secondary={
                                                <Typography sx={{fontSize: 12, color: "#94a3b8"}}>
                                                    {item.grade} · {item.campus}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card
                        elevation={2}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid #e0e7ff",
                            height: "100%",
                        }}
                    >
                        <CardContent sx={{p: 3}}>
                            <Typography
                                variant="h6"
                                sx={{fontWeight: 700, color: "#1e293b", mb: 1.5}}
                            >
                                Lịch Hẹn Hôm Nay
                            </Typography>
                            <Typography variant="body2" sx={{color: "#94a3b8", mb: 2}}>
                                Thông tin mẫu – dùng để hình dung bố cục dashboard cho trường.
                            </Typography>
                            <List dense>
                                {mockSchedules.map((item, idx) => (
                                    <ListItem
                                        key={idx}
                                        sx={{
                                            borderRadius: 2,
                                            mb: 1,
                                            px: 1.5,
                                            alignItems: "flex-start",
                                            "&:hover": {
                                                bgcolor: "#f1f5f9",
                                            },
                                        }}
                                    >
                                        <ListItemText
                                            primary={
                                                <Typography sx={{fontWeight: 600, color: "#0f172a"}}>
                                                    {item.time} – {item.title}
                                                </Typography>
                                            }
                                            secondary={
                                                <Typography sx={{fontSize: 12, color: "#94a3b8"}}>
                                                    {item.campus}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

