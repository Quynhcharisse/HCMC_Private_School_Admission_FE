import React from "react";
import {Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography} from "@mui/material";
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import {useNavigate} from "react-router-dom";

const menuItems = [
    {
        text: 'Bảng Điều Khiển',
        icon: <DashboardIcon/>,
        path: '/admin/dashboard',
    },
    {
        text: 'Quản Lý Người Dùng',
        icon: <PeopleIcon/>,
        path: '/admin/users',
    },
];

export default function AdminSidebar({currentPath}) {
    const navigate = useNavigate();

    return (
        <Box sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
            <Box
                sx={{
                    pt: 4,
                    pb: 2,
                    px: 2.5,
                    borderBottom: '1px solid #e0e7ff',
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 700,
                        color: '#1d4ed8',
                        lineHeight: 1.2,
                    }}
                >
                    Quản Trị Viên
                </Typography>
            </Box>
            <List sx={{flex: 1, pt: 2}}>
                {menuItems.map((item) => {
                    const isActive = currentPath === item.path;
                    return (
                        <ListItem key={item.path} disablePadding>
                            <ListItemButton
                                onClick={() => navigate(item.path)}
                                sx={{
                                    mx: 1,
                                    mb: 0.5,
                                    borderRadius: 2,
                                    bgcolor: isActive ? 'rgba(29, 78, 216, 0.1)' : 'transparent',
                                    color: isActive ? '#1d4ed8' : '#64748b',
                                    '&:hover': {
                                        bgcolor: isActive ? 'rgba(29, 78, 216, 0.15)' : 'rgba(29, 78, 216, 0.05)',
                                    },
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        color: isActive ? '#1d4ed8' : '#64748b',
                                        minWidth: 40,
                                    }}
                                >
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontWeight: isActive ? 600 : 500,
                                        fontSize: 15,
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );
}
