export const SUPPORT_LEVEL_LABELS = Object.freeze({
    BASIC: "Basic",
    STANDARD: "Standard",
    PREMIUM: "Premium",
});

export const PARENT_POST_PERMISSION_LABELS = Object.freeze({
    VIEW_ONLY: "Nhà trường chỉ xem bài viết",
    COMMENT_ONLY: "Nhà trường được bình luận",
    CREATE_POST: "Nhà trường được tạo bài viết",
});

export const formatVndPrice = (value) => {
    const amount = Number(value);
    if (Number.isNaN(amount) || amount <= 0) return "Liên hệ";
    return `${amount.toLocaleString("vi-VN")} VNĐ`;
};

export const getSupportLevelLabel = (supportLevel) => {
    const key = String(supportLevel || "").toUpperCase();
    return SUPPORT_LEVEL_LABELS[key] || (supportLevel ? String(supportLevel) : "Chưa cập nhật");
};

export const getSupportLevelRank = (supportLevel) => {
    const key = String(supportLevel || "").toUpperCase();
    if (key === "ENTERPRISE" || key === "PREMIUM") return 1;
    if (key === "STANDARD") return 2;
    if (key === "BASIC") return 3;
    return 99;
};

/** Chuẩn hóa supportLevel từ API (BASIC_SUPPORT, …) sang nhãn card (BASIC, STANDARD, PREMIUM). */
export function normalizePackageSupportLevelForCard(level) {
    const key = String(level || "").trim().toUpperCase();
    if (key === "BASIC_SUPPORT") return "BASIC";
    if (key === "STANDARD_SUPPORT") return "STANDARD";
    if (key === "PREMIUM_SUPPORT") return "PREMIUM";
    return key;
}

/**
 * Gói hiển thị cho trường: ACTIVE / PUBLISHED hoặc không có status (API catalog phẳng).
 */
export function isSchoolPackageListable(item) {
    const s = String(item?.status ?? "").trim().toUpperCase();
    if (!s) return true;
    if (
        [
            "PACKAGE_DRAFT",
            "DRAFT",
            "PACKAGE_DEACTIVATED",
            "DEACTIVATED",
            "PACKAGE_PENDING_DEACTIVE",
            "PENDING_DEACTIVE",
        ].includes(s)
    ) {
        return false;
    }
    return ["PACKAGE_ACTIVE", "ACTIVE", "PACKAGE_PUBLISHED", "PUBLISHED"].includes(s);
}

/**
 * Gộp body phẳng (finalPrice, maxCounsellors, …) + fullFeatures/features thành shape dùng cho card.
 */
export function normalizeSchoolServicePackageItem(item = {}) {
    const nested = item?.features && typeof item.features === "object" ? item.features : {};
    const full =
        item?.fullFeatures && typeof item.fullFeatures === "object"
            ? item.fullFeatures
            : item?.featureData && typeof item.featureData === "object"
              ? item.featureData
              : nested;

    const maxCounsellors = Number(full.maxCounsellors ?? item.maxCounsellors ?? nested.maxCounsellors ?? 0);
    const postLimitRaw = full.postLimit ?? item.postLimit ?? nested.postLimit;
    const postLimit = postLimitRaw != null && postLimitRaw !== "" ? Number(postLimitRaw) : 0;
    const supportRaw = full.supportLevel ?? item.supportLevel ?? nested.supportLevel ?? "";
    const parentPostPermission = full.parentPostPermission ?? item.parentPostPermission ?? nested.parentPostPermission;
    const hasAiAssistant = Boolean(full.hasAiAssistant ?? item.hasAiAssistant ?? nested.hasAiAssistant);
    const topRanking = Number(full.topRanking ?? item.topRanking ?? nested.topRanking ?? 0);
    const allowChat =
        typeof full.allowChat === "boolean"
            ? full.allowChat
            : typeof nested.allowChat === "boolean"
              ? nested.allowChat
              : hasAiAssistant;

    const priceCandidate = Number(item.finalPrice ?? item.price);
    const price = Number.isFinite(priceCandidate) && priceCandidate > 0 ? priceCandidate : 0;

    return {
        ...item,
        price,
        durationDays: item.durationDays != null ? Number(item.durationDays) : 0,
        features: {
            ...nested,
            ...full,
            maxCounsellors,
            postLimit: Number.isFinite(postLimit) ? postLimit : 0,
            topRanking,
            parentPostPermission,
            supportLevel: normalizePackageSupportLevelForCard(supportRaw),
            allowChat,
        },
    };
}

export const buildFeatureLines = (features = {}, durationDays = 0) => {
    const lines = [];
    if (Number(features.maxCounsellors) > 0) {
        lines.push(`Tối đa ${Number(features.maxCounsellors).toLocaleString("vi-VN")} tư vấn viên`);
    }
    if (Number(features.topRanking) > 0) {
        lines.push(`Ưu tiên hiển thị top ${Number(features.topRanking).toLocaleString("vi-VN")}`);
    }
    if (durationDays > 0) {
        lines.push(`Thời hạn sử dụng ${Number(durationDays).toLocaleString("vi-VN")} ngày`);
    }
    if (features.allowChat === true) {
        lines.push("Hỗ trợ nhắn tin trực tiếp với phụ huynh");
    } else if (features.allowChat === false) {
        lines.push("Không hỗ trợ nhắn tin trực tiếp với phụ huynh");
    }
    if (features.parentPostPermission) {
        const permission = PARENT_POST_PERMISSION_LABELS[features.parentPostPermission] || features.parentPostPermission;
        lines.push(permission);
    }
    return lines;
};
