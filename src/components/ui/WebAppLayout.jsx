import React, {useEffect, useRef} from "react";
import {Box} from "@mui/material";
import {Outlet, useLocation, useNavigate} from "react-router-dom";
import Header, {ScrollTopButton} from "../partials/Header.jsx";
import Footer from "../partials/Footer.jsx";
import AuthHeader from "../partials/AuthHeader.jsx";
import Chatbot from "./Chatbot.jsx";
import {
    getRoleDashboardRoute,
    isRouteAllowedForRole,
    shouldPreferCurrentPathOverLastRoute
} from "../../utils/roleRouting";
import {normalizeUserRole} from "../../utils/userRole.js";

export default function WebAppLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
    const isHomeRoute = location.pathname === '/' || location.pathname === '/home';
    const isParentFirstLoginRoute = location.pathname === '/parent-first-login';
    const isParentProfileRoute = location.pathname === '/parent/profile';
    const toBoolean = (value) => value === true || value === 'true' || value === 1 || value === '1';
    const hasHandledInitialRoute = useRef(false);

    const isPublicRoute = (path) => {
        return (
            path === '/' ||
            path === '/home' ||
            path === '/search-schools' ||
            path === '/about' ||
            path === '/policy/privacy' ||
            path === '/tos' ||
            path === '/faq' ||
            path === '/login' ||
            path === '/register' ||
            path === '/saved-schools' ||
            path === '/compare-schools' ||
            path === '/payment/vnpay-result' ||
            path.startsWith('/payment/')
        );
    };

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
        const currentPath = location.pathname + location.search;
        if (!isAuthPage) {
            localStorage.setItem('lastRoute', currentPath);
        }
    }, [location.pathname, location.search, isAuthPage]);

    useEffect(() => {
        if (hasHandledInitialRoute.current) {
            return;
        }
        hasHandledInitialRoute.current = true;

        const storedUser = localStorage.getItem('user');

        if (!storedUser) {
            const currentPath = location.pathname;
            if (!isPublicRoute(currentPath) && currentPath !== '/parent-first-login') {
                navigate('/login', {replace: true});
            }
            return;
        }

        let parsed = null;
        try {
            parsed = JSON.parse(storedUser);
        } catch {
            localStorage.removeItem('user');
            navigate('/login', {replace: true});
            return;
        }

        const role = parsed?.role;
        const lastRoute = localStorage.getItem('lastRoute');
        const currentPath = location.pathname;

        if (lastRoute && isRouteAllowedForRole(lastRoute, role)) {
            if (
                currentPath !== lastRoute &&
                !shouldPreferCurrentPathOverLastRoute(currentPath, role)
            ) {
                navigate(lastRoute, {replace: true});
            }
            return;
        }

        // Nếu lastRoute không hợp lệ hoặc không có → về dashboard theo role
        const dashboardRoute = getRoleDashboardRoute(role);
        if (currentPath !== dashboardRoute) {
            navigate(dashboardRoute, {replace: true});
        }
    }, [location.pathname, navigate]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            return;
        }

        let parsed = null;
        try {
            parsed = JSON.parse(storedUser);
        } catch {
            return;
        }

        const role = parsed?.role;
        const currentPath = location.pathname;

        if (!role || isAuthPage || currentPath === '/parent-first-login') {
            return;
        }

        if (!isRouteAllowedForRole(currentPath, role)) {
            const dashboardRoute = getRoleDashboardRoute(role);
            if (currentPath !== dashboardRoute) {
                navigate(dashboardRoute, {replace: true});
            }
        }
    }, [location.pathname, isAuthPage, navigate]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');

        if (!storedUser) {
            return;
        }

        try {
            const parsed = JSON.parse(storedUser);
            const isParent = normalizeUserRole(parsed?.role ?? "") === "PARENT";
            const isFirstLogin = toBoolean(parsed?.firstLogin);

            if (isParent && isFirstLogin) {
                if (location.pathname !== '/parent-first-login') {
                    navigate('/parent-first-login', {replace: true});
                }
            }
        } catch {
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
            {!isAuthPage && !isParentFirstLoginRoute && !isParentProfileRoute && <Footer/>}
            {!isAuthPage && <ScrollTopButton/>}
            {!isAuthPage && <Chatbot/>}
        </Box>
    );
}
