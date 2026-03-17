import React, {useEffect} from "react";
import {Box, Fade} from "@mui/material";
import {Outlet, useLocation} from "react-router-dom";
import Header, {ScrollTopButton} from "../partials/Header.jsx";
import Footer from "../partials/Footer.jsx";
import AuthHeader from "../partials/AuthHeader.jsx";

export default function WebAppLayout() {
    const location = useLocation();
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

    useEffect(() => {
        if (isAuthPage) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
        } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        };
    }, [isAuthPage]);

    return (
            <Box
                sx={{
            minHeight: '100vh',
            bgcolor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
                overflowX: 'hidden',
            overflowY: isAuthPage ? 'hidden' : 'auto',
            }}
        >
            {isAuthPage ? <AuthHeader/> : <Header/>}
            <Fade in key={location.pathname} timeout={{ enter: 250, exit: 150 }}>
                <Box
                    component="main"
                    sx={{
                        flex: 1,
                        width: '100vw',
                        minHeight: '60vh',
                        bgcolor: '#f8fafc',
                        overflow: isAuthPage ? 'hidden' : 'auto'
                    }}
                >
                    <Outlet/>
                </Box>
            </Fade>
            {!isAuthPage && <Footer/>}
            {!isAuthPage && <ScrollTopButton/>}
        </Box>
    );
}
