import React from "react";
import {Box} from "@mui/material";
import {Outlet, useLocation} from "react-router-dom";
import Header, {ScrollTopButton} from "../partials/Header.jsx";
import Footer from "../partials/Footer.jsx";
import AuthHeader from "../partials/AuthHeader.jsx";

export default function WebAppLayout() {
    const location = useLocation();
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                overflowX: 'hidden',
            }}
        >
            {isAuthPage ? <AuthHeader/> : <Header/>}
            <Box component="main" sx={{flex: 1, width: '100vw', minHeight: '60vh', bgcolor: '#f8fafc'}}>
                <Outlet/>
            </Box>
            {!isAuthPage && <Footer/>}
            {!isAuthPage && <ScrollTopButton/>}
        </Box>
    );
}
