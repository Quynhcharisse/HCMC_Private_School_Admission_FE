export const getRoleDashboardRoute = (role) => {
    const normalizedRole = role?.toUpperCase();

    switch (normalizedRole) {
        case 'ADMIN':
            return '/admin/dashboard';
        case 'SCHOOL':
            return '/school/dashboard';
        case 'COUNSELLOR':
            return '/counsellor/dashboard';
        case 'PARENT':
            return '/home';
        default:
            return '/home';
    }
};

/** Pathname (+ optional search) — dùng cho lastRoute */
const stripHash = (path) => {
    if (!path || typeof path !== 'string') return '';
    const i = path.indexOf('#');
    return i === -1 ? path : path.slice(0, i);
};

export const isRouteAllowedForRole = (path, role) => {
    if (!role) return false;

    const normalizedRole = role.toUpperCase();

    if (normalizedRole === 'ADMIN') {
        const p = stripHash(path).split('?')[0] || '';
        if (p.startsWith('/admin')) return true;
        const adminAlsoAllowed = ['/home', '/search-schools', '/compare-schools'];
        return adminAlsoAllowed.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
    }

    if (normalizedRole === 'SCHOOL') {
        const schoolAllowedPrefixes = [
            '/school',
            '/home',
            '/search-schools',
            '/compare-schools',
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
            '/parent/profile',
            '/children-info',
            '/saved-schools',
            '/compare-schools',
            '/about',
        ];
        return parentAllowedPrefixes.some((allowedPrefix) => path.startsWith(allowedPrefix));
    }

    return false;
};

/**
 * Khi user mở thẳng /home, /search-schools, /compare-schools (bookmark / link),
 * không ép quay lại lastRoute (ví dụ /admin/dashboard).
 */
export const shouldPreferCurrentPathOverLastRoute = (path, role) => {
    const base = stripHash(path).split('?')[0] || '';
    const mainPrefixes = ['/home', '/search-schools', '/compare-schools'];
    if (!mainPrefixes.some((p) => base === p || base.startsWith(`${p}/`))) {
        return false;
    }
    return isRouteAllowedForRole(path, role);
};
