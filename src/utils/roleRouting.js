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

export const isRouteAllowedForRole = (path, role) => {
    if (!role) return false;

    const normalizedRole = role.toUpperCase();

    if (normalizedRole === 'ADMIN') {
        return path.startsWith('/admin');
    }

    if (normalizedRole === 'SCHOOL') {
        const schoolAllowedPrefixes = [
            '/school',
            '/home',
            '/search-schools',
            '/compare-schools',
            '/package-fees',
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

