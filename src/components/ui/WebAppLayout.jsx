import React, {useEffect} from "react";
import {Box} from "@mui/material";
import {Outlet, useLocation, useNavigate} from "react-router-dom";
import Header, {ScrollTopButton} from "../partials/Header.jsx";
import Footer from "../partials/Footer.jsx";
import AuthHeader from "../partials/AuthHeader.jsx";

export default function WebAppLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
    const isHomeRoute = location.pathname === '/' || location.pathname === '/home';
    const isParentFirstLoginRoute = location.pathname === '/parent-first-login';
    const toBoolean = (value) => value === true || value === 'true' || value === 1 || value === '1';

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

    useEffect(() => {
        const storedUser = localStorage.getItem('user');

        if (!storedUser) {
            return;
        }

        try {
            const parsed = JSON.parse(storedUser);
            const isParent = parsed?.role === 'PARENT';
            const isFirstLogin = toBoolean(parsed?.firstLogin);

            if (isParent && isFirstLogin) {
                if (location.pathname !== '/parent-first-login') {
                    navigate('/parent-first-login', {replace: true});
                }
            }
        } catch {
            /* ignore invalid stored user JSON */
        }
    }, [location.pathname, navigate]);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                overflowX: 'hidden',
                ...(isAuthPage
                    ? {overflowY: 'hidden', height: '100vh'}
                    : {})
            }}
        >
            {isAuthPage ? <AuthHeader/> : <Header/>}
            <Box
                component="main"
                sx={{
                    flex: 1,
                    width: '100%',
                    maxWidth: '100vw',
                    minHeight: '60vh',
                    bgcolor: isHomeRoute && !isAuthPage ? 'transparent' : '#f8fafc'
                }}
            >
                <Outlet key={location.pathname}/>
            </Box>
            {!isAuthPage && !isParentFirstLoginRoute && <Footer/>}
            {!isAuthPage && <ScrollTopButton/>}
        </Box>
    );
}
