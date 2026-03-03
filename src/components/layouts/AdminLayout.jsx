import React from "react";
import {Box, Drawer} from "@mui/material";
import {Outlet, useLocation} from "react-router-dom";
import AuthHeader from "../partials/AuthHeader.jsx";
import AdminSidebar from "../partials/AdminSidebar.jsx";

const DRAWER_WIDTH = 280;

export default function AdminLayout() {
    const location = useLocation();

    return (
        <Box sx={{display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f8fafc'}}>
            <AuthHeader/>
            <Box sx={{display: 'flex', flex: 1, pt: '65px', position: 'relative'}}>
                <Drawer
                    variant="permanent"
                    sx={{
                        width: DRAWER_WIDTH,
                        flexShrink: 0,
                        '& .MuiDrawer-paper': {
                            width: DRAWER_WIDTH,
                            boxSizing: 'border-box',
                            borderRight: '1px solid #e0e7ff',
                            bgcolor: 'white',
                            height: 'calc(100vh - 65px)',
                            top: '65px',
                            position: 'fixed',
                            left: 0,
                            zIndex: 1000,
                            animation: 'slideInLeft 0.3s ease-out',
                            '@keyframes slideInLeft': {
                                '0%': {
                                    transform: 'translateX(-100%)',
                                    opacity: 0,
                                },
                                '100%': {
                                    transform: 'translateX(0)',
                                    opacity: 1,
                                },
                            },
                        },
                    }}
                >
                    <AdminSidebar currentPath={location.pathname}/>
                </Drawer>
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        pt: 3,
                        pb: 3,
                        px: 3,
                        minHeight: 'calc(100vh - 65px)',
                        bgcolor: '#f8fafc',
                        overflow: 'auto',
                    }}
                    >
                    <Outlet/>
                </Box>
            </Box>
        </Box>
    );
}
