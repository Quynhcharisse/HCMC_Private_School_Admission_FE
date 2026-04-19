import axiosClient from "../configs/APIConfig.jsx";
import {
    normalizeUserRole,
    notifyAuthUserStorageChanged,
    pickRoleFromAccessBody,
    sanitizeUserForLocalStorage,
} from "../utils/userRole.js";

const normalizeProfileResponse = (response) => {
    const body = response?.data?.body;
    if (typeof body === "string") {
        try {
            response.data.body = JSON.parse(body);
        } catch {
            // ignore parse error; keep original response
        }
    }
    return response;
};

export const signout = async () => {
    const response = await axiosClient.post("/account/logout", {}, {
        headers: {
            "X-Device-Type": "web"
        }
    });
    return response || null
}

export const getAccess = async () => {
    const response = await axiosClient.post("/account/access");
    return normalizeProfileResponse(response) || null;
};

export async function syncLocalUserWithAccess() {
    try {
        const res = await getAccess();
        if (!res || res.status !== 200) return null;

        let body = res.data?.body;
        if (typeof body === "string") {
            try {
                body = JSON.parse(body);
            } catch {
                return null;
            }
        }
        if (!body || typeof body !== "object") return null;

        const roleRaw = pickRoleFromAccessBody(body);
        if (roleRaw == null || String(roleRaw).trim() === "") return null;

        const normalizedRole = normalizeUserRole(roleRaw);
        if (!normalizedRole) return null;
        let prev = {};
        try {
            const raw = localStorage.getItem("user");
            if (raw) prev = JSON.parse(raw);
        } catch {
            prev = {};
        }

        const merged = sanitizeUserForLocalStorage({
            ...prev,
            role: normalizedRole,
            ...(body.email != null ? {email: body.email} : {}),
            ...(body.firstLogin !== undefined ? {firstLogin: body.firstLogin} : {}),
            ...(body.name != null ? {name: body.name} : {}),
        });
        localStorage.setItem("user", JSON.stringify(merged));
        notifyAuthUserStorageChanged();
        return merged;
    } catch {
        return null;
    }
}

export const getProfile = async () => {
    const response = await axiosClient.get("/account/profile");
    return normalizeProfileResponse(response) || null;
}

export const updateProfile = async (profileData) => {
    const response = await axiosClient.put("/account/profile", profileData, {
        headers: {
            "X-Device-Type": "web"
        }
    });
    return normalizeProfileResponse(response) || null;
};
