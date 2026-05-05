import {ROLES} from "../constants/roles.js";

export const NOTIFICATION_EVENTS = {
    // ── Platform ─────────────────────────────────────────────────
    NEW_USER_REGISTERED:    "NEW_USER_REGISTERED",
    SCHOOL_POST_PUBLISHED:  "SCHOOL_POST_PUBLISHED",
    ADMIN_POST_PUBLISHED:   "ADMIN_POST_PUBLISHED",
    BUY_PACKAGE_FEE:        "BUY_PACKAGE_FEE",
    CREATE_PACKAGE_FEE:     "CREATE_PACKAGE_FEE",
    SYSTEM_ANNOUNCEMENT:    "SYSTEM_ANNOUNCEMENT",

    FAVORITE_SCHOOL:        "FAVORITE_SCHOOL",
    REMOVE_FAVORITE_SCHOOL: "REMOVE_FAVORITE_SCHOOL",

    COUNSELLOR_ASSIGNED:         "COUNSELLOR_ASSIGNED",
    COUNSELLOR_SLOT_ASSIGNED:    "COUNSELLOR_SLOT_ASSIGNED",
    COUNSELLOR_SLOT_UNASSIGNED:  "COUNSELLOR_SLOT_UNASSIGNED",

    CONSULTATION_BOOKED:    "CONSULTATION_BOOKED",
    CONSULTATION_CONFIRMED: "CONSULTATION_CONFIRMED",
    CONSULTATION_CANCELLED: "CONSULTATION_CANCELLED",
    CONSULTATION_COMPLETED: "CONSULTATION_COMPLETED",
    CONSULTATION_NO_SHOW:   "CONSULTATION_NO_SHOW",
};

const EVENT_ROLE_MATRIX = {
    [NOTIFICATION_EVENTS.NEW_USER_REGISTERED]:    [ROLES.ADMIN],
    [NOTIFICATION_EVENTS.SCHOOL_POST_PUBLISHED]:  [ROLES.ADMIN, ROLES.PARENT],
    [NOTIFICATION_EVENTS.ADMIN_POST_PUBLISHED]:   [ROLES.SCHOOL, ROLES.PARENT],
    [NOTIFICATION_EVENTS.BUY_PACKAGE_FEE]:        [ROLES.ADMIN],
    [NOTIFICATION_EVENTS.CREATE_PACKAGE_FEE]:     [ROLES.SCHOOL],
    [NOTIFICATION_EVENTS.SYSTEM_ANNOUNCEMENT]:    [ROLES.ADMIN, ROLES.SCHOOL, ROLES.PARENT, ROLES.COUNSELLOR],

    [NOTIFICATION_EVENTS.FAVORITE_SCHOOL]:        [ROLES.SCHOOL],
    [NOTIFICATION_EVENTS.REMOVE_FAVORITE_SCHOOL]: [ROLES.SCHOOL],

    [NOTIFICATION_EVENTS.COUNSELLOR_ASSIGNED]:        [ROLES.PARENT, ROLES.COUNSELLOR],
    [NOTIFICATION_EVENTS.COUNSELLOR_SLOT_ASSIGNED]:   [ROLES.COUNSELLOR],
    [NOTIFICATION_EVENTS.COUNSELLOR_SLOT_UNASSIGNED]: [ROLES.COUNSELLOR],

    [NOTIFICATION_EVENTS.CONSULTATION_BOOKED]:    [ROLES.SCHOOL],        // Parent đặt → School campus nhận
    [NOTIFICATION_EVENTS.CONSULTATION_CONFIRMED]: [ROLES.PARENT],        // Counsellor xác nhận → Parent nhận
    [NOTIFICATION_EVENTS.CONSULTATION_CANCELLED]: [ROLES.PARENT],        // Counsellor huỷ → Parent nhận
    [NOTIFICATION_EVENTS.CONSULTATION_COMPLETED]: [ROLES.PARENT],        // Counsellor kết thúc → Parent nhận
    [NOTIFICATION_EVENTS.CONSULTATION_NO_SHOW]:   [ROLES.PARENT],        // Counsellor đánh dấu → Parent nhận
};

export const normalizeNotificationEventType = (payload) => {
    const raw = String(payload?.data?.eventType || payload?.data?.type || "").trim().toUpperCase();
    const aliasMap = {
        SCHOOL_POST_PUBLISHED:  NOTIFICATION_EVENTS.SCHOOL_POST_PUBLISHED,
        ADMIN_POST_PUBLISHED:   NOTIFICATION_EVENTS.ADMIN_POST_PUBLISHED,
        USER_REGISTERED:        NOTIFICATION_EVENTS.NEW_USER_REGISTERED,
        NEW_REGISTER:           NOTIFICATION_EVENTS.NEW_USER_REGISTERED,
        PACKAGE_FEE_CREATED:    NOTIFICATION_EVENTS.CREATE_PACKAGE_FEE,
        FAVORITE_SCHOOL:        NOTIFICATION_EVENTS.FAVORITE_SCHOOL,
        REMOVE_FAVORITE_SCHOOL: NOTIFICATION_EVENTS.REMOVE_FAVORITE_SCHOOL,
        COUNSELLOR_SLOT_ASSIGNED:    NOTIFICATION_EVENTS.COUNSELLOR_SLOT_ASSIGNED,
        COUNSELLOR_SLOT_UNASSIGNED:  NOTIFICATION_EVENTS.COUNSELLOR_SLOT_UNASSIGNED,
        CONSULTATION_BOOKED:         NOTIFICATION_EVENTS.CONSULTATION_BOOKED,
        CONSULTATION_CONFIRMED: NOTIFICATION_EVENTS.CONSULTATION_CONFIRMED,
        CONSULTATION_CANCELLED: NOTIFICATION_EVENTS.CONSULTATION_CANCELLED,
        CONSULTATION_COMPLETED: NOTIFICATION_EVENTS.CONSULTATION_COMPLETED,
        CONSULTATION_NO_SHOW:   NOTIFICATION_EVENTS.CONSULTATION_NO_SHOW,
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

    // Nếu server đã gửi title/body thì dùng luôn
    const title = payload?.notification?.title;
    const body  = payload?.notification?.body;
    if (title || body) return {title: title || "Thông báo", body: body || "Bạn có thông báo mới."};

    // Trích data fields từ payload
    const actorName      = String(payload?.data?.actorName      || "").trim();
    const parentName     = String(payload?.data?.parentName     || "").trim();
    const packageName    = String(payload?.data?.packageName    || "").trim();
    const schoolName     = String(payload?.data?.schoolName     || "").trim();
    const campusName     = String(payload?.data?.campusName     || "").trim();
    const appointmentDate = String(payload?.data?.appointmentDate || "").trim();

    const locationLabel  = campusName || schoolName;
    const dateLabel      = appointmentDate ? ` ngày ${appointmentDate}` : "";

    const fallbackByEvent = {
        // ── Platform ──────────────────────────────────────────────
        [NOTIFICATION_EVENTS.NEW_USER_REGISTERED]: {
            title: "Đăng ký mới",
            body:  "Có người dùng mới vừa đăng ký tài khoản.",
        },
        [NOTIFICATION_EVENTS.SCHOOL_POST_PUBLISHED]: {
            title: "Bài viết mới từ trường",
            body:  "Có bài viết mới vừa được đăng từ trường học.",
        },
        [NOTIFICATION_EVENTS.ADMIN_POST_PUBLISHED]: {
            title: "Bài viết mới từ quản trị viên",
            body:  "Có bài viết mới vừa được đăng từ quản trị viên.",
        },
        [NOTIFICATION_EVENTS.BUY_PACKAGE_FEE]: {
            title: actorName ? `Giao dịch mới từ ${actorName}` : "Giao dịch gói dịch vụ mới",
            body:  packageName
                ? `${actorName || "Trường học"} vừa thanh toán gói ${packageName}.`
                : `${actorName || "Trường học"} vừa thanh toán đăng ký gói dịch vụ.`,
        },
        [NOTIFICATION_EVENTS.CREATE_PACKAGE_FEE]: {
            title: actorName ? `${actorName} vừa phát hành gói mới` : "Gói dịch vụ mới đã phát hành",
            body:  packageName
                ? `Gói ${packageName} đã sẵn sàng để đăng ký.`
                : "Có gói dịch vụ mới vừa được phát hành.",
        },
        [NOTIFICATION_EVENTS.SYSTEM_ANNOUNCEMENT]: {
            title: "Thông báo hệ thống",
            body:  "Bạn có thông báo mới từ hệ thống.",
        },

        // ── School / Campus ────────────────────────────────────────
        [NOTIFICATION_EVENTS.FAVORITE_SCHOOL]: {
            title: actorName ? `${actorName} vừa quan tâm trường của bạn` : "Phụ huynh mới quan tâm trường",
            body:  "Có phụ huynh vừa thêm trường của bạn vào danh sách yêu thích.",
        },
        [NOTIFICATION_EVENTS.REMOVE_FAVORITE_SCHOOL]: {
            title: actorName ? `${actorName} đã bỏ yêu thích trường` : "Phụ huynh bỏ yêu thích trường",
            body:  actorName
                ? `${actorName} vừa xóa trường của bạn khỏi danh sách yêu thích.`
                : "Một phụ huynh vừa bỏ yêu thích trường của bạn.",
        },

        // ── Counsellor ─────────────────────────────────────────────
        [NOTIFICATION_EVENTS.COUNSELLOR_ASSIGNED]: {
            title: "Tư vấn viên đã được phân công",
            body:  "Bạn đã được phân công tư vấn viên mới.",
        },
        [NOTIFICATION_EVENTS.COUNSELLOR_SLOT_ASSIGNED]: {
            title: "Lịch làm việc mới được gán",
            body:  appointmentDate
                ? `Bạn được gán lịch làm việc vào ngày ${appointmentDate}.`
                : "Bạn vừa được gán một khung giờ làm việc mới.",
        },
        [NOTIFICATION_EVENTS.COUNSELLOR_SLOT_UNASSIGNED]: {
            title: "Lịch làm việc đã bị huỷ gán",
            body:  appointmentDate
                ? `Khung giờ làm việc của bạn vào ngày ${appointmentDate} đã bị huỷ gán.`
                : "Một khung giờ làm việc của bạn đã bị huỷ gán.",
        },

        // ── Consultation flow ──────────────────────────────────────
        [NOTIFICATION_EVENTS.CONSULTATION_BOOKED]: {
            title: "Lịch tư vấn mới",
            body:  parentName && locationLabel
                ? `${parentName} vừa đặt lịch tư vấn tại ${locationLabel}${dateLabel}.`
                : parentName
                ? `${parentName} vừa đặt một lịch tư vấn mới${dateLabel}.`
                : `Có lịch tư vấn mới được đặt${dateLabel}.`,
        },
        [NOTIFICATION_EVENTS.CONSULTATION_CONFIRMED]: {
            title: "Lịch tư vấn đã được xác nhận",
            body:  locationLabel
                ? `Lịch tư vấn của bạn tại ${locationLabel}${dateLabel} đã được xác nhận.`
                : `Lịch tư vấn của bạn${dateLabel} đã được xác nhận.`,
        },
        [NOTIFICATION_EVENTS.CONSULTATION_CANCELLED]: {
            title: "Lịch tư vấn đã bị huỷ",
            body:  locationLabel
                ? `Lịch tư vấn của bạn tại ${locationLabel}${dateLabel} đã bị huỷ.`
                : `Lịch tư vấn của bạn${dateLabel} đã bị huỷ. Vui lòng đặt lại nếu cần.`,
        },
        [NOTIFICATION_EVENTS.CONSULTATION_COMPLETED]: {
            title: "Buổi tư vấn đã hoàn thành",
            body:  locationLabel
                ? `Buổi tư vấn của bạn tại ${locationLabel}${dateLabel} đã kết thúc. Cảm ơn bạn đã tham gia.`
                : `Buổi tư vấn của bạn${dateLabel} đã hoàn thành. Cảm ơn bạn đã tham gia.`,
        },
        [NOTIFICATION_EVENTS.CONSULTATION_NO_SHOW]: {
            title: "Bạn đã bỏ lỡ lịch tư vấn",
            body:  locationLabel
                ? `Bạn đã không đến buổi tư vấn tại ${locationLabel}${dateLabel}. Vui lòng đặt lịch mới nếu cần.`
                : `Bạn đã không đến buổi tư vấn đã đặt${dateLabel}. Vui lòng đặt lịch mới nếu cần.`,
        },
    };

    return fallbackByEvent[eventType] || {title: "Thông báo", body: "Bạn có thông báo mới."};
};
