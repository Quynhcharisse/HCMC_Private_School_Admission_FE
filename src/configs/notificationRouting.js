import {ROLES} from "../constants/roles.js";

export const NOTIFICATION_EVENTS = {
    NEW_USER_REGISTERED: "NEW_USER_REGISTERED",
    SCHOOL_POST_PUBLISHED: "SCHOOL_POST_PUBLISHED",
    ADMIN_POST_PUBLISHED: "ADMIN_POST_PUBLISHED",
    BUY_PACKAGE_FEE: "BUY_PACKAGE_FEE",
    CREATE_PACKAGE_FEE: "CREATE_PACKAGE_FEE",

    COUNSELLOR_ASSIGNED: "COUNSELLOR_ASSIGNED",
    CONSULTATION_BOOKED: "CONSULTATION_BOOKED",
    CONSULTATION_CANCELLED: "CONSULTATION_CANCELLED",
    SYSTEM_ANNOUNCEMENT: "SYSTEM_ANNOUNCEMENT",
};

const EVENT_ROLE_MATRIX = {
    [NOTIFICATION_EVENTS.NEW_USER_REGISTERED]: [ROLES.ADMIN],
    [NOTIFICATION_EVENTS.SCHOOL_POST_PUBLISHED]: [ROLES.ADMIN, ROLES.PARENT],
    [NOTIFICATION_EVENTS.ADMIN_POST_PUBLISHED]: [ROLES.SCHOOL, ROLES.PARENT],
    [NOTIFICATION_EVENTS.BUY_PACKAGE_FEE]: [ROLES.ADMIN],
    [NOTIFICATION_EVENTS.CREATE_PACKAGE_FEE]: [ROLES.SCHOOL],

    [NOTIFICATION_EVENTS.COUNSELLOR_ASSIGNED]: [ROLES.PARENT, ROLES.COUNSELLOR],
    [NOTIFICATION_EVENTS.CONSULTATION_BOOKED]: [ROLES.PARENT, ROLES.COUNSELLOR, ROLES.SCHOOL],
    [NOTIFICATION_EVENTS.CONSULTATION_CANCELLED]: [ROLES.PARENT, ROLES.COUNSELLOR, ROLES.SCHOOL],
    [NOTIFICATION_EVENTS.SYSTEM_ANNOUNCEMENT]: [ROLES.ADMIN, ROLES.SCHOOL, ROLES.PARENT, ROLES.COUNSELLOR],
};

export const normalizeNotificationEventType = (payload) => {
    const raw = String(payload?.data?.eventType || payload?.data?.type || "").trim().toUpperCase();
    const aliasMap = {
        SCHOOL_POST_PUBLISHED: NOTIFICATION_EVENTS.SCHOOL_POST_PUBLISHED,
        ADMIN_POST_PUBLISHED: NOTIFICATION_EVENTS.ADMIN_POST_PUBLISHED,
        USER_REGISTERED: NOTIFICATION_EVENTS.NEW_USER_REGISTERED,
        NEW_REGISTER: NOTIFICATION_EVENTS.NEW_USER_REGISTERED,
        PACKAGE_FEE_CREATED: NOTIFICATION_EVENTS.CREATE_PACKAGE_FEE,
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
    const actorName = String(payload?.data?.actorName || "").trim();
    const packageName = String(payload?.data?.packageName || "").trim();

    const fallbackByEvent = {
        [NOTIFICATION_EVENTS.NEW_USER_REGISTERED]: {
            title: "Đăng ký mới",
            body: "Có người dùng mới vừa đăng ký tài khoản.",
        },
        [NOTIFICATION_EVENTS.SCHOOL_POST_PUBLISHED]: {
            title: "Bài viết mới từ trường",
            body: "Có bài viết mới vừa được đăng từ trường học.",
        },
        [NOTIFICATION_EVENTS.ADMIN_POST_PUBLISHED]: {
            title: "Bài viết mới từ quản trị viên",
            body: "Có bài viết mới vừa được đăng từ quản trị viên.",
        },
        [NOTIFICATION_EVENTS.BUY_PACKAGE_FEE]: {
            title: actorName ? `Giao dịch mới từ ${actorName}` : "Giao dịch gói dịch vụ mới",
            body: packageName
                ? `${actorName || "Trường học"} vừa thanh toán gói ${packageName}.`
                : `${actorName || "Trường học"} vừa thanh toán đăng ký gói dịch vụ.`,
        },
        [NOTIFICATION_EVENTS.CREATE_PACKAGE_FEE]: {
            title: actorName ? `${actorName} vừa phát hành gói mới` : "Gói dịch vụ mới đã phát hành",
            body: packageName
                ? `Gói ${packageName} đã sẵn sàng để đăng ký.`
                : "Có gói dịch vụ mới vừa được phát hành.",
        },



        [NOTIFICATION_EVENTS.CONSULTATION_BOOKED]: {
            title: "Lịch tư vấn mới",
            body: "Bạn có một lịch tư vấn mới.",
        },
        [NOTIFICATION_EVENTS.CONSULTATION_CANCELLED]: {
            title: "Lịch tư vấn bị hủy",
            body: "Có cập nhật hủy lịch tư vấn.",
        }
    };
    return fallbackByEvent[eventType] || {title: "Thông báo", body: "Bạn có thông báo mới."};
};
