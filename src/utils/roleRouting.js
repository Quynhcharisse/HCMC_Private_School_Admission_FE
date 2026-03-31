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
            return '/parent/profile';
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
        return path.startsWith('/school');
    }

    if (normalizedRole === 'COUNSELLOR') {
        return path.startsWith('/counsellor');
    }

    if (normalizedRole === 'PARENT') {
        return path.startsWith('/parent');
    }

    return false;
};

