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

export function getPackageTypeLabelVi(packageType) {
    const v = String(packageType || "").trim().toUpperCase();
    if (v === "TRIAL") return "Dùng thử";
    if (v === "STANDARD") return "Tiêu chuẩn";
    if (v === "ENTERPRISE") return "Doanh nghiệp";
    return v ? String(packageType).trim() : "—";
}

export function getPackageTypeLabelEn(packageType) {
    const v = String(packageType || "").trim().toUpperCase();
    if (v === "TRIAL") return "Trial";
    if (v === "STANDARD") return "Standard";
    if (v === "ENTERPRISE") return "Enterprise";
    return v ? String(packageType).trim() : "—";
}

export function formatSchoolPackageCardPrice(packageType, price) {
    if (String(packageType || "").trim().toUpperCase() === "TRIAL") return "Miễn phí";
    return formatVndPrice(price);
}

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

export function normalizePackageSupportLevelForCard(level) {
    const key = String(level || "").trim().toUpperCase();
    if (key === "BASIC_SUPPORT") return "BASIC";
    if (key === "STANDARD_SUPPORT") return "STANDARD";
    if (key === "PREMIUM_SUPPORT") return "PREMIUM";
    return key;
}

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
              : undefined;

    const priceCandidate = Number(item.finalPrice ?? item.price);
    const price = Number.isFinite(priceCandidate) && priceCandidate > 0 ? priceCandidate : 0;

    const featuresOut = {
        ...nested,
        ...full,
        maxCounsellors,
        postLimit: Number.isFinite(postLimit) ? postLimit : 0,
        topRanking,
        parentPostPermission,
        supportLevel: normalizePackageSupportLevelForCard(supportRaw),
        hasAiAssistant,
    };
    if (allowChat !== undefined) {
        featuresOut.allowChat = allowChat;
    } else {
        delete featuresOut.allowChat;
    }

    return {
        ...item,
        price,
        durationDays: item.durationDays != null ? Number(item.durationDays) : 0,
        features: featuresOut,
    };
}

export const buildFeatureLines = (features = {}, durationDays = 0) => {
    const lines = [];
    if (Number(features.maxCounsellors) > 0) {
        lines.push(`Tối đa ${Number(features.maxCounsellors).toLocaleString("vi-VN")} tư vấn viên`);
    }
    const postLimit = Number(features.postLimit);
    if (postLimit === -1) {
        lines.push("Không giới hạn số bài đăng");
    } else if (Number.isFinite(postLimit) && postLimit > 0) {
        lines.push(`Tối đa ${postLimit.toLocaleString("vi-VN")} bài đăng`);
    }
    if (Number(features.topRanking) > 0) {
        lines.push(`Ưu tiên hiển thị top ${Number(features.topRanking).toLocaleString("vi-VN")}`);
    }
    if (durationDays > 0) {
        lines.push(`Thời hạn sử dụng ${Number(durationDays).toLocaleString("vi-VN")} ngày`);
    }
    if (features.hasAiAssistant === true) {
        lines.push("Có trợ lý AI");
    } else if (features.hasAiAssistant === false) {
        lines.push("Không có trợ lý AI");
    }
    if (typeof features.allowChat === "boolean") {
        if (features.allowChat) {
            lines.push("Hỗ trợ nhắn tin trực tiếp với phụ huynh");
        } else {
            lines.push("Không hỗ trợ nhắn tin trực tiếp với phụ huynh");
        }
    }
    if (features.parentPostPermission) {
        const permission = PARENT_POST_PERMISSION_LABELS[features.parentPostPermission] || features.parentPostPermission;
        lines.push(permission);
    }
    return lines;
};
