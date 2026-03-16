import React from "react";
import {Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ApartmentIcon from "@mui/icons-material/Apartment";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import CampaignIcon from "@mui/icons-material/Campaign";
import {useNavigate} from "react-router-dom";

const menuItems = [
    {
        text: "Bảng Điều Khiển",
        icon: <DashboardIcon/>,
        path: "/school/dashboard",
    },
    {
        text: "Cơ Sở",
        icon: <ApartmentIcon/>,
        path: "/school/campus",
    },
    {
        text: "Tư vấn viên",
        icon: <SupportAgentIcon/>,
        path: "/school/counselors",
    },
    {
        text: "Chiến dịch tuyển sinh",
        icon: <CampaignIcon/>,
        path: "/school/campaigns",
    },
];

export default function SchoolSidebar({currentPath}) {
    const navigate = useNavigate();

    return (
        <Box sx={{height: "100%", display: "flex", flexDirection: "column"}}>
            <Box
                sx={{
                    pt: 4,
                    pb: 2,
                    px: 2.5,
                    borderBottom: "1px solid #e0e7ff",
                    display: "flex",
                    alignItems: "center",
                }}
            >
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 700,
                        color: "#1d4ed8",
                        lineHeight: 1.2,
                    }}
                >
                    Trường Học
                </Typography>
            </Box>
            <List sx={{flex: 1, pt: 2}}>
                {menuItems.map((item) => {
                    const isActive =
                        currentPath === item.path ||
                        (item.path !== "/school/dashboard" && currentPath.startsWith(item.path + "/"));
                    return (
                        <ListItem key={item.path} disablePadding>
                            <ListItemButton
                                onClick={() => navigate(item.path)}
                                sx={{
                                    mx: 1,
                                    mb: 0.5,
                                    borderRadius: 2,
                                    bgcolor: isActive ? "rgba(29, 78, 216, 0.1)" : "transparent",
                                    color: isActive ? "#1d4ed8" : "#64748b",
                                    "&:hover": {
                                        bgcolor: isActive ? "rgba(29, 78, 216, 0.15)" : "rgba(29, 78, 216, 0.05)",
                                    },
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        color: isActive ? "#1d4ed8" : "#64748b",
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

