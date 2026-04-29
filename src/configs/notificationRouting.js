import {ROLES} from "../constants/roles.js";

export const NOTIFICATION_EVENTS = {
    NEW_USER_REGISTERED: "NEW_USER_REGISTERED",
    SCHOOL_REGISTER_SUBMITTED: "SCHOOL_REGISTER_SUBMITTED",
    SCHOOL_POST_PUBLISHED: "SCHOOL_POST_PUBLISHED",
    SCHOOL_VERIFIED: "SCHOOL_VERIFIED",
    COUNSELLOR_ASSIGNED: "COUNSELLOR_ASSIGNED",
    CONSULTATION_BOOKED: "CONSULTATION_BOOKED",
    CONSULTATION_CANCELLED: "CONSULTATION_CANCELLED",
    SYSTEM_ANNOUNCEMENT: "SYSTEM_ANNOUNCEMENT",
};

const EVENT_ROLE_MATRIX = {
    [NOTIFICATION_EVENTS.NEW_USER_REGISTERED]: [ROLES.ADMIN],
    [NOTIFICATION_EVENTS.SCHOOL_REGISTER_SUBMITTED]: [ROLES.ADMIN],
    [NOTIFICATION_EVENTS.SCHOOL_POST_PUBLISHED]: [ROLES.ADMIN, ROLES.PARENT],
    [NOTIFICATION_EVENTS.SCHOOL_VERIFIED]: [ROLES.SCHOOL],
    [NOTIFICATION_EVENTS.COUNSELLOR_ASSIGNED]: [ROLES.PARENT, ROLES.COUNSELLOR],
    [NOTIFICATION_EVENTS.CONSULTATION_BOOKED]: [ROLES.PARENT, ROLES.COUNSELLOR, ROLES.SCHOOL],
    [NOTIFICATION_EVENTS.CONSULTATION_CANCELLED]: [ROLES.PARENT, ROLES.COUNSELLOR, ROLES.SCHOOL],
    [NOTIFICATION_EVENTS.SYSTEM_ANNOUNCEMENT]: [ROLES.ADMIN, ROLES.SCHOOL, ROLES.PARENT, ROLES.COUNSELLOR],
};

export const normalizeNotificationEventType = (payload) =>
    {
        const raw = String(payload?.data?.eventType || payload?.data?.type || "").trim().toUpperCase();
        const aliasMap = {
            USER_REGISTERED: NOTIFICATION_EVENTS.NEW_USER_REGISTERED,
            NEW_REGISTER: NOTIFICATION_EVENTS.NEW_USER_REGISTERED,
        };
        return aliasMap[raw] || raw;
    };

export const canRoleReceiveEvent = (role, eventType) => {
    if (!role) return false;
    if (!eventType) return true;
    const allowedRoles = EVENT_ROLE_MATRIX[eventType];
    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return true;
    return allowedRoles.includes(role);
};

export const getNotificationMessage = (payload) => {
    const eventType = normalizeNotificationEventType(payload);
    const title = payload?.notification?.title;
    const body = payload?.notification?.body;
    if (title || body) return {title: title || "Thông báo", body: body || "Bạn có thông báo mới."};

    const fallbackByEvent = {
        [NOTIFICATION_EVENTS.NEW_USER_REGISTERED]: {
            title: "Đăng ký mới",
            body: "Có người dùng mới vừa đăng ký tài khoản.",
        },
        [NOTIFICATION_EVENTS.SCHOOL_REGISTER_SUBMITTED]: {
            title: "Trường mới đăng ký",
            body: "Có hồ sơ trường mới chờ Admin duyệt.",
        },
        [NOTIFICATION_EVENTS.SCHOOL_VERIFIED]: {
            title: "Trường đã được duyệt",
            body: "Hồ sơ trường của bạn đã được xác thực.",
        },
        [NOTIFICATION_EVENTS.SCHOOL_POST_PUBLISHED]: {
            title: "Bài viết mới từ trường",
            body: "Có bài viết mới vừa được đăng từ trường học.",
        },
        [NOTIFICATION_EVENTS.CONSULTATION_BOOKED]: {
            title: "Lịch tư vấn mới",
            body: "Bạn có một lịch tư vấn mới.",
        },
        [NOTIFICATION_EVENTS.CONSULTATION_CANCELLED]: {
            title: "Lịch tư vấn bị hủy",
            body: "Có cập nhật hủy lịch tư vấn.",
        },
        [NOTIFICATION_EVENTS.SYSTEM_ANNOUNCEMENT]: {
            title: "Thông báo hệ thống",
            body: "Có thông báo mới từ hệ thống.",
        },
    };
    return fallbackByEvent[eventType] || {title: "Thông báo", body: "Bạn có thông báo mới."};
};
