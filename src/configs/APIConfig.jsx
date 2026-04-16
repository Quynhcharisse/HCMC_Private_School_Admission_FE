import axios from "axios";
import {refreshToken} from "../services/AuthService.jsx";

function resolveApiV1Base() {
    const raw = (import.meta.env.VITE_SERVER_BE || "https://edubridgehcm.onrender.com").trim().replace(/\/+$/, "");
    const withoutApi = raw.replace(/\/api\/v1$/i, "");
    return `${withoutApi}/api/v1`;
}

const apiBase = resolveApiV1Base();

axios.defaults.baseURL = apiBase;

const axiosClient = axios.create({
    baseURL: apiBase,
    headers: {
        "Content-Type": "application/json",
        "X-Device-Type": "web"
    },
    withCredentials: true
})

axiosClient.interceptors.request.use((config) => {
    const m = config.method?.toLowerCase();
    if (m === "get" || m === "head") {
        if (config.headers && "Content-Type" in config.headers) {
            delete config.headers["Content-Type"];
        }
    }
    return config;
});

axiosClient.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        if (originalRequest._retry) {
            return Promise.reject(error);
        }

        if (error.response && error.response.status === 401) {
            if (originalRequest.url === "/auth/refresh" || 
                originalRequest.url === "/account/access" ||
                originalRequest.url === "/auth/login" ||
                originalRequest.url === "/auth/register") {
                console.error("Auth request failed, skipping auto refresh.");
                return Promise.reject(error);
            }

            if (originalRequest._retry) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            try {
                const refreshRes = await refreshToken();
                if (refreshRes && refreshRes.status === 200) {
                    return axiosClient(originalRequest);
                } else {
                    const publicPaths = ['/home', '/register', '/login', '/schools', '/search-schools', '/compare-schools', '/about', '/policy/privacy', '/tos', '/faq', '/payment', '/'];
                    const isPublicPath = publicPaths.some(path => window.location.pathname === path || window.location.pathname.startsWith(path + '/'));
                    if (!isPublicPath && !window.location.pathname.includes('/login')) {
                        window.location.href = "/login";
                    }
                    return Promise.reject(error);
                }
            } catch (refreshError) {
                console.error("Token refresh failed:", refreshError);
                const publicPaths = ['/home', '/register', '/login', '/schools', '/search-schools', '/compare-schools', '/about', '/policy/privacy', '/tos', '/faq', '/payment', '/'];
                const isPublicPath = publicPaths.some(path => window.location.pathname === path || window.location.pathname.startsWith(path + '/'));
                if (!isPublicPath && !window.location.pathname.includes('/login')) {
                    window.location.href = "/login";
                }
                return Promise.reject(error);
            }
        }
        
        if (error.response && error.response.status === 403) {
            return Promise.reject(error);
        }
        return Promise.reject(error);
    }
)

export default axiosClient;