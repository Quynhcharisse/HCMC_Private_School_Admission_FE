import axiosClient from "../configs/APIConfig.jsx";
import {AUTH_USER_STORAGE_CHANGED_EVENT, normalizeUserRole} from "../utils/userRole.js";
import {normalizeNotificationEventType, NOTIFICATION_EVENTS} from "../configs/notificationRouting.js";

const TOKEN_SYNC_CACHE_KEY = "edubridge_fcm_token_sync_v1";
const NOTIFICATION_UNREAD_KEY = "edubridge_notification_unread_count";
const NOTIFICATION_UNREAD_EVENT = "edubridge-notification-unread-updated";
const NOTIFICATION_LIST_KEY = "edubridge_notification_items_v1";
const NOTIFICATION_LIST_EVENT = "edubridge-notification-list-updated";
const NOTIFICATION_PAGE_DEFAULT_SIZE = 20;
const TOKEN_SYNC_ENABLED = String(import.meta.env.VITE_NOTIFICATION_TOKEN_SYNC_ENABLED || "false").trim().toLowerCase() === "true";
const TOKEN_REGISTER_ENDPOINT = "/notifications/device-tokens";
const NOTIFICATION_LIST_ENDPOINT = "/notifications";
const NOTIFICATION_UNREAD_COUNT_ENDPOINT = "/notifications/unread-count";
const TOKEN_SYNC_IGNORED_STATUSES = new Set([401, 403, 404]);

const safeJsonParse = (raw) => {
    if (!raw || typeof raw !== "string") return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

export const getCurrentAuthUser = () => {
    const user = safeJsonParse(localStorage.getItem("user"));
    if (!user || typeof user !== "object") return null;
    const role = normalizeUserRole(user.role);
    const email = String(user.email || "").trim().toLowerCase();
    if (!role || !email) return null;
    return {...user, role, email};
};

const readTokenSyncCache = () => safeJsonParse(localStorage.getItem(TOKEN_SYNC_CACHE_KEY));
const writeTokenSyncCache = (value) => localStorage.setItem(TOKEN_SYNC_CACHE_KEY, JSON.stringify(value || null));

const buildTokenPayload = ({token, user}) => ({
    token,
    platform: "WEB",
    deviceType: "web",
    role: user.role,
    email: user.email,
});

export const shouldSyncToken = ({token, user}) => {
    if (!token || !user?.email || !user?.role) return false;
    const cache = readTokenSyncCache();
    if (!cache) return true;
    return !(cache.token === token && cache.email === user.email && cache.role === user.role);
};

export const registerNotificationToken = async ({token, user}) => {
    if (!TOKEN_SYNC_ENABLED) return false;
    if (!token || !user) return false;
    if (!shouldSyncToken({token, user})) return true;
    const payload = buildTokenPayload({token, user});
    try {
        await axiosClient.post(TOKEN_REGISTER_ENDPOINT, payload, {
            headers: {"X-Device-Type": "web"},
        });
    } catch (error) {
        const status = error?.response?.status;
        if (TOKEN_SYNC_IGNORED_STATUSES.has(status)) {
            console.info(`[Notification] Bỏ qua sync token do API trả ${status}. Kiểm tra quyền/endpoint backend.`);
            return false;
        }
        throw error;
    }
    writeTokenSyncCache({token, email: user.email, role: user.role, syncedAt: Date.now()});
    return true;
};

export const watchAuthUserChanges = (onChanged) => {
    if (typeof onChanged !== "function") return () => {
    };
    const handleCustom = () => onChanged(getCurrentAuthUser());
    const handleStorage = (event) => {
        if (event?.key && event.key !== "user") return;
        onChanged(getCurrentAuthUser());
    };
    window.addEventListener(AUTH_USER_STORAGE_CHANGED_EVENT, handleCustom);
    window.addEventListener("storage", handleStorage);
    return () => {
        window.removeEventListener(AUTH_USER_STORAGE_CHANGED_EVENT, handleCustom);
        window.removeEventListener("storage", handleStorage);
    };
};

export const resolveNotificationRoute = ({eventType, data = {}, role}) => {
    const normalizedType = String(eventType || "").trim().toUpperCase();
    const dataRoute = String(data.route || data.path || data.url || "").trim();
    if (dataRoute.startsWith("/")) {
        if (role === "SCHOOL" && dataRoute === "/admin/package-fees") return "/package-fees";
        return dataRoute;
    }
    const subjectType = String(data.subjectType || data.actorType || "").trim().toUpperCase();

    switch (normalizedType) {
        case NOTIFICATION_EVENTS.NEW_USER_REGISTERED:
            if (subjectType === "SCHOOL") return "/admin/schools/verification";
            if (subjectType === "PARENT") return "/admin/users";
            return "/admin/users";
        case NOTIFICATION_EVENTS.SCHOOL_POST_PUBLISHED:
            return "/posts";
        case NOTIFICATION_EVENTS.ADMIN_POST_PUBLISHED:
            return "/posts";
        case NOTIFICATION_EVENTS.BUY_PACKAGE_FEE:
            return "/admin/transaction-statistics";
        case NOTIFICATION_EVENTS.CREATE_PACKAGE_FEE:
            return role === "SCHOOL" ? "/package-fees" : "/admin/package-fees";
        case NOTIFICATION_EVENTS.FAVORITE_SCHOOL:
            return "/school/parents-interest";

        case NOTIFICATION_EVENTS.COUNSELLOR_ASSIGNED:
            if (role === "PARENT") return "/parent/profile";
            if (role === "COUNSELLOR") return "/counsellor/parent-consultation";
            if (role === "SCHOOL") return "/school/counselor-schedule";
            return "/home";
        case NOTIFICATION_EVENTS.CONSULTATION_BOOKED:
        case NOTIFICATION_EVENTS.CONSULTATION_CANCELLED:
            if (role === "PARENT") return "/parent/offline-consultations";
            if (role === "COUNSELLOR") return "/counsellor/parent-consultation";
            if (role === "SCHOOL") return "/school/counselor-schedule";
            return "/home";
        default:
            if (role === "ADMIN") return "/admin/dashboard";
            if (role === "SCHOOL") return "/school/dashboard";
            if (role === "COUNSELLOR") return "/counsellor/calendar";
            if (role === "PARENT") return "/parent/profile";
            return "/home";
    }
};

export const navigateFromNotificationPayload = ({payload, role}) => {
    const eventType = normalizeNotificationEventType(payload);
    const route = resolveNotificationRoute({eventType, data: payload?.data || {}, role});
    if (route && route.startsWith("/")) {
        window.location.assign(route);
        return route;
    }
    return null;
};

export const readNotificationUnreadCount = () => {
    try {
        const raw = localStorage.getItem(NOTIFICATION_UNREAD_KEY);
        const value = Number(raw);
        return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
    } catch {
        return 0;
    }
};

export const writeNotificationUnreadCount = (value) => {
    const next = Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;
    try {
        localStorage.setItem(NOTIFICATION_UNREAD_KEY, String(next));
    } catch {
        // ignore storage errors
    }
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(NOTIFICATION_UNREAD_EVENT, {detail: {count: next}}));
    }
    return next;
};

export const bumpNotificationUnreadCount = () => {
    const next = Math.min(99, readNotificationUnreadCount() + 1);
    return writeNotificationUnreadCount(next);
};

export const clearNotificationUnreadCount = () => writeNotificationUnreadCount(0);

export const watchNotificationUnread = (onChanged) => {
    if (typeof onChanged !== "function") return () => {
    };
    const onEvent = (event) => {
        const count = Number(event?.detail?.count);
        if (Number.isFinite(count) && count >= 0) onChanged(Math.trunc(count));
        else onChanged(readNotificationUnreadCount());
    };
    const onStorage = (event) => {
        if (event?.key && event.key !== NOTIFICATION_UNREAD_KEY) return;
        onChanged(readNotificationUnreadCount());
    };
    window.addEventListener(NOTIFICATION_UNREAD_EVENT, onEvent);
    window.addEventListener("storage", onStorage);
    return () => {
        window.removeEventListener(NOTIFICATION_UNREAD_EVENT, onEvent);
        window.removeEventListener("storage", onStorage);
    };
};

const readNotificationItemsRaw = () => {
    const data = safeJsonParse(localStorage.getItem(NOTIFICATION_LIST_KEY));
    return Array.isArray(data) ? data : [];
};

const writeNotificationItemsRaw = (items) => {
    const next = Array.isArray(items) ? items : [];
    localStorage.setItem(NOTIFICATION_LIST_KEY, JSON.stringify(next));
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(NOTIFICATION_LIST_EVENT, {detail: {items: next}}));
    }
};

const normalizeBackendNotificationItem = (item, user) => {
    if (!item || typeof item !== "object") return null;
    const recipientId = item.recipientId ?? item.id ?? null;
    const eventType = String(item.eventType || item?.data?.eventType || "").trim().toUpperCase();
    const data = item?.data && typeof item.data === "object" ? item.data : {};
    const route = resolveNotificationRoute({eventType, data, role: user?.role});
    const isRead = item.isRead === true || item.read === true;
    const createdRaw = item.createdAt || item.deliveredAt || item.sentAt || Date.now();
    const createdAt = Number(new Date(createdRaw).getTime()) || Date.now();
    return {
        id: recipientId != null ? `recipient_${recipientId}` : `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        recipientId,
        notificationId: item.notificationId ?? null,
        ownerEmail: user?.email || "",
        title: String(item.title || "Thông báo").trim(),
        body: String(item.body || "Bạn có thông báo mới.").trim(),
        eventType,
        route,
        read: isRead,
        createdAt,
        data,
    };
};

const countUnreadByEmail = (items, email) =>
    items.reduce((acc, item) => {
        if (!item || item.ownerEmail !== email) return acc;
        return item.read ? acc : acc + 1;
    }, 0);

const toNotificationItem = ({payload, user}) => {
    const title = String(payload?.notification?.title || "Thông báo").trim();
    const body = String(payload?.notification?.body || "Bạn có thông báo mới.").trim();
    const eventType = normalizeNotificationEventType(payload);
    const route = resolveNotificationRoute({eventType, data: payload?.data || {}, role: user?.role});
    return {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        ownerEmail: user?.email || "",
        title,
        body,
        eventType,
        route,
        read: false,
        createdAt: Date.now(),
        data: payload?.data || {},
    };
};

export const saveIncomingNotification = ({payload, user}) => {
    if (!user?.email) return null;
    const items = readNotificationItemsRaw();
    const nextItem = toNotificationItem({payload, user});
    const nextItems = [nextItem, ...items].slice(0, 100);
    writeNotificationItemsRaw(nextItems);
    writeNotificationUnreadCount(Math.min(99, countUnreadByEmail(nextItems, user.email)));
    return nextItem;
};

export const getNotificationPage = async ({page = 0, pageSize = NOTIFICATION_PAGE_DEFAULT_SIZE} = {}) => {
    const response = await axiosClient.get(NOTIFICATION_LIST_ENDPOINT, {
        params: {
            page: Number.isFinite(Number(page)) ? Math.max(0, Math.trunc(Number(page))) : 0,
            pageSize: Number.isFinite(Number(pageSize)) ? Math.max(1, Math.trunc(Number(pageSize))) : NOTIFICATION_PAGE_DEFAULT_SIZE,
        },
    });
    return response || null;
};

export const getUnreadCount = async () => {
    const response = await axiosClient.get(NOTIFICATION_UNREAD_COUNT_ENDPOINT);
    return response || null;
};

export const refreshNotificationInboxForUser = async (user, {
    page = 0,
    pageSize = NOTIFICATION_PAGE_DEFAULT_SIZE
} = {}) => {
    if (!user?.email) return {items: [], unreadCount: 0};
    const [listRes, unreadRes] = await Promise.all([
        getNotificationPage({page, pageSize}),
        getUnreadCount(),
    ]);
    const listBody = listRes?.data?.body;
    const rows = Array.isArray(listBody?.items) ? listBody.items : [];
    const normalizedItems = rows
        .map((row) => normalizeBackendNotificationItem(row, user))
        .filter(Boolean);
    writeNotificationItemsRaw(normalizedItems);
    const unreadCount = Number(unreadRes?.data?.body?.unreadCount);
    const finalUnread = Number.isFinite(unreadCount)
        ? Math.max(0, Math.trunc(unreadCount))
        : normalizedItems.reduce((acc, item) => acc + (item.read ? 0 : 1), 0);
    writeNotificationUnreadCount(Math.min(99, finalUnread));
    return {items: normalizedItems, unreadCount: finalUnread};
};

export const getNotificationsForUser = (user) => {
    if (!user?.email) return [];
    return readNotificationItemsRaw()
        .filter((item) => item?.ownerEmail === user.email)
        .sort((a, b) => Number(b?.createdAt || 0) - Number(a?.createdAt || 0));
};

export const markNotificationAsRead = ({notificationId, user}) => {
    if (!notificationId || !user?.email) return Promise.resolve();
    const currentItems = getNotificationsForUser(user);
    const target = currentItems.find((item) => item?.id === notificationId);
    const recipientId = target?.recipientId;
    const localMarkRead = () => {
        const nextItems = readNotificationItemsRaw().map((item) => {
            if (item?.id === notificationId && item?.ownerEmail === user.email) {
                return {...item, read: true};
            }
            return item;
        });
        writeNotificationItemsRaw(nextItems);
        writeNotificationUnreadCount(Math.min(99, countUnreadByEmail(nextItems, user.email)));
    };
    if (recipientId == null || recipientId === "") {
        localMarkRead();
        return Promise.resolve();
    }
    return axiosClient.put(`/notifications/${encodeURIComponent(String(recipientId))}/read`)
        .then(() => refreshNotificationInboxForUser(user))
        .catch(() => {
            localMarkRead();
        });
};

export const markAllNotificationsAsRead = (user) => {
    if (!user?.email) return Promise.resolve();
    const unreadRows = getNotificationsForUser(user).filter((item) => !item.read && item.recipientId != null);
    if (!unreadRows.length) {
        const nextItems = readNotificationItemsRaw().map((item) => {
            if (item?.ownerEmail === user.email) return {...item, read: true};
            return item;
        });
        writeNotificationItemsRaw(nextItems);
        writeNotificationUnreadCount(0);
        return Promise.resolve();
    }
    return Promise.allSettled(
        unreadRows.map((row) => axiosClient.put(`/notifications/${encodeURIComponent(String(row.recipientId))}/read`))
    ).finally(() => refreshNotificationInboxForUser(user).catch(() => {
    }));
};

export const watchNotificationList = (onChanged, user) => {
    if (typeof onChanged !== "function") return () => {
    };
    const push = () => onChanged(getNotificationsForUser(user));
    const onEvent = () => push();
    const onStorage = (event) => {
        if (event?.key && event.key !== NOTIFICATION_LIST_KEY) return;
        push();
    };
    window.addEventListener(NOTIFICATION_LIST_EVENT, onEvent);
    window.addEventListener("storage", onStorage);
    push();
    return () => {
        window.removeEventListener(NOTIFICATION_LIST_EVENT, onEvent);
        window.removeEventListener("storage", onStorage);
    };
};

