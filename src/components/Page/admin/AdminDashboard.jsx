import React from "react";
import {Box, Card, CardContent, Grid, Typography} from "@mui/material";
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import AssessmentIcon from '@mui/icons-material/Assessment';

const statCards = [
    {
        title: 'Tổng Người Dùng',
        value: '0',
        icon: <PeopleIcon sx={{fontSize: 40}}/>,
        color: '#1d4ed8',
    },
    {
        title: 'Tổng Trường Học',
        value: '0',
        icon: <SchoolIcon sx={{fontSize: 40}}/>,
        color: '#16a34a',
    },
    {
        title: 'Tổng Đơn Đăng Ký',
        value: '0',
        icon: <AssessmentIcon sx={{fontSize: 40}}/>,
        color: '#dc2626',
    },
];

export default function AdminDashboard() {
    return (
        <Box>
            <Typography 
                variant="h4" 
                sx={{
                    fontWeight: 700, 
                    color: '#1e293b', 
                    mb: 3,
                }}
            >
                Bảng Điều Khiển
            </Typography>

            <Grid container spacing={3}>
                {statCards.map((card, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                        <Card
                            elevation={2}
                            sx={{
                                borderRadius: 3,
                                border: '1px solid #e0e7ff',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 8px 24px rgba(29, 78, 216, 0.15)',
                                },
                            }}
                        >
                            <CardContent>
                                <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                                    <Box>
                                        <Typography variant="body2" sx={{color: '#64748b', mb: 1}}>
                                            {card.title}
                                        </Typography>
                                        <Typography variant="h4" sx={{fontWeight: 700, color: '#1e293b'}}>
                                            {card.value}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            color: card.color,
                                            bgcolor: `${card.color}15`,
                                            borderRadius: 2,
                                            p: 1.5,
                                        }}
                                    >
                                        {card.icon}
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Card
                elevation={2}
                sx={{
                    mt: 4,
                    borderRadius: 3,
                    border: '1px solid #e0e7ff',
                }}
            >
                <CardContent>
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 2, mb: 2}}>
                        <DashboardIcon sx={{fontSize: 32, color: '#1d4ed8'}}/>
                        <Typography variant="h5" sx={{fontWeight: 700, color: '#1e293b'}}>
                            Tổng Quan Hệ Thống
                        </Typography>
                    </Box>
                    <Typography variant="body1" sx={{color: '#64748b'}}>
                        Chào mừng đến với trang quản trị của EduBridgeHCM. Tại đây bạn có thể quản lý người dùng,
                        trường học và các hoạt động của hệ thống.
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
}
