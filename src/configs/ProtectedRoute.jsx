import {useEffect, useState} from "react";
import {refreshToken} from "../services/AuthService.jsx";
import {getAccess, signout} from "../services/AccountService.jsx";
import {useLoading} from "../contexts/LoadingContext.jsx";
import {getRoleDashboardRoute} from "../utils/roleRouting";
import {normalizeUserRole, pickRoleFromAccessBody} from "../utils/userRole.js";

async function GetAccessData() {
    try {
        const response = await getAccess();
        if (response && response.status === 200) {
            return response.data.body;
        } else {
            return null;
        }
    } catch (error) {
        console.error("GetAccessData error:", error);
        return null;
    }
}

async function Logout() {
    try {
        const res = await signout();
        if (res && res.status === 200) {
            if (localStorage.length > 0) {
                localStorage.clear();
            }
            if (sessionStorage.length > 0) {
                sessionStorage.clear();
            }
            setTimeout(() => {
                window.location.href = "/login";
            }, 1000);
        } else {
            if (localStorage.length > 0) {
                localStorage.clear();
            }
            if (sessionStorage.length > 0) {
                sessionStorage.clear();
            }
            window.location.href = "/login";
        }
    } catch (error) {
        console.error("Logout error:", error);
        if (localStorage.length > 0) {
            localStorage.clear();
        }
        if (sessionStorage.length > 0) {
            sessionStorage.clear();
        }
        window.location.href = "/login";
    }
}

async function CheckIfRoleValid(allowRoles, role) {
    if (!role) return false;
    const normalizedRole = normalizeUserRole(role);
    const normalizedAllowRoles = allowRoles.map((r) => normalizeUserRole(r));
    return normalizedAllowRoles.includes(normalizedRole);
}

export default function ProtectedRoute({children, allowRoles = []}) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasValidRole, setHasValidRole] = useState(false);
    const [hasAttemptedAuth, setHasAttemptedAuth] = useState(false);
    const {setAuthLoading} = useLoading();

    useEffect(() => {
        const checkAuthentication = async () => {
            if (hasAttemptedAuth) {
                return;
            }

            try {
                setIsLoading(true);
                setAuthLoading(true);
                setHasAttemptedAuth(true);

                const data = await GetAccessData();

                const roleFromData = data != null ? pickRoleFromAccessBody(data) ?? data.role : null;
                if (data != null && roleFromData) {
                    const isValidRole = await CheckIfRoleValid(allowRoles, roleFromData);
                    if (isValidRole) {
                        setIsAuthenticated(true);
                        setHasValidRole(true);
                        setIsLoading(false);
                        setAuthLoading(false);
                        return;
                    } else {
                        console.warn(`User has role ${roleFromData} but route requires:`, allowRoles);
                        const redirect = getRoleDashboardRoute(normalizeUserRole(roleFromData));
                        window.location.href = redirect;
                        return;
                    }
                }

                try {
                    const refreshResponse = await refreshToken();
                    if (refreshResponse && refreshResponse.status === 200) {
                        const retryData = await GetAccessData();
                        const retryRole = retryData != null ? pickRoleFromAccessBody(retryData) ?? retryData.role : null;
                        if (retryData != null && retryRole) {
                            const isValidRole = await CheckIfRoleValid(allowRoles, retryRole);
                            if (isValidRole) {
                                setIsAuthenticated(true);
                                setHasValidRole(true);
                                setIsLoading(false);
                                setAuthLoading(false);
                                return;
                            } else {
                                console.warn(`User has role ${retryRole} but route requires:`, allowRoles);
                                const redirect = getRoleDashboardRoute(normalizeUserRole(retryRole));
                                window.location.href = redirect;
                                return;
                            }
                        }
                    }
                } catch (refreshError) {
                    console.log("Token refresh failed, user not authenticated");
                }

                if (localStorage.length > 0) {
                    localStorage.clear();
                }
                if (sessionStorage.length > 0) {
                    sessionStorage.clear();
                }
                window.location.href = "/login";

            } catch (error) {
                console.error("Authentication error:", error);
                if (localStorage.length > 0) {
                    localStorage.clear();
                }
                if (sessionStorage.length > 0) {
                    sessionStorage.clear();
                }
                window.location.href = "/login";
            } finally {
                setIsLoading(false);
                setAuthLoading(false);
            }
        };

        checkAuthentication();
    }, [allowRoles, setAuthLoading]);

    if (isLoading) {
        return null;
    }

    if (isAuthenticated && hasValidRole) {
        return children;
    }

    return null;
}