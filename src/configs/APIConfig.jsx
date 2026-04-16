import axios from "axios";
import {refreshToken} from "../services/AuthService.jsx";

// Vite sẽ tự động load biến này dựa trên môi trường đang chạy
const apiBase = (import.meta.env.VITE_SERVER_BE || "http://localhost:8080").replace(/\/+$/, "");

const baseURL = apiBase.endsWith("/api/v1") ? apiBase : `${apiBase}/api/v1`;

axios.defaults.baseURL = baseURL;

const axiosClient = axios.create({
    // Đảm bảo luôn có /api/v1 ở cuối base URL
    baseURL,
    headers: {
        "Content-Type": "application/json",
        "X-Device-Type": "web"
    },
    withCredentials: true
});

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
);

export default axiosClient;
