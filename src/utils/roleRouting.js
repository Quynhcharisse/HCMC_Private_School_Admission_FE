import {normalizeUserRole} from "./userRole.js";

export const getRoleDashboardRoute = (role) => {
    const normalizedRole = normalizeUserRole(role ?? "");

    switch (normalizedRole) {
        case 'ADMIN':
            return '/admin/dashboard';
        case 'SCHOOL':
            return '/school/dashboard';
        case 'COUNSELLOR':
            return '/counsellor/calendar';
        case 'PARENT':
            return '/home';
        default:
            return '/home';
    }
};

const stripHash = (path) => {
    if (!path || typeof path !== 'string') return '';
    const i = path.indexOf('#');
    return i === -1 ? path : path.slice(0, i);
};

export const isRouteAllowedForRole = (path, role) => {
    if (!role) return false;

    const normalizedRole = normalizeUserRole(role);

    if (normalizedRole === 'ADMIN') {
        const p = stripHash(path).split('?')[0] || '';
        if (p.startsWith('/admin')) return true;
        const adminAlsoAllowed = ['/home', '/search-schools', '/compare-schools', '/posts'];
        return adminAlsoAllowed.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
    }

    if (normalizedRole === 'SCHOOL') {
        const schoolAllowedPrefixes = [
            '/school',
            '/home',
            '/search-schools',
            '/compare-schools',
            '/posts',
            '/package-fees',
            '/payment',
        ];
        return schoolAllowedPrefixes.some((allowedPrefix) => path.startsWith(allowedPrefix));
    }

    if (normalizedRole === 'COUNSELLOR') {
        return path.startsWith('/counsellor');
    }

    if (normalizedRole === 'PARENT') {
        const parentAllowedPrefixes = [
            '/home',
            '/search-schools',
            '/schools',
            '/posts',
            '/parent/profile',
            '/parent/offline-consultations',
            '/children-info',
            '/saved-schools',
            '/compare-schools',
            '/about',
        ];
        return parentAllowedPrefixes.some((allowedPrefix) => path.startsWith(allowedPrefix));
    }

    return false;
};

export const shouldPreferCurrentPathOverLastRoute = (path, role) => {
    const base = stripHash(path).split('?')[0] || '';
    const mainPrefixes = ['/home', '/search-schools', '/compare-schools', '/posts'];
    if (!mainPrefixes.some((p) => base === p || base.startsWith(`${p}/`))) {
        return false;
    }
    return isRouteAllowedForRole(path, role);
};
