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
    if (key === "ENTERPRISE") return 1;
    if (key === "STANDARD") return 2;
    if (key === "BASIC") return 3;
    return 99;
};

export const buildFeatureLines = (features = {}, durationDays = 0) => {
    const lines = [];
    if (Number(features.maxAdmissions) > 0) {
        lines.push(`Tối đa ${Number(features.maxAdmissions).toLocaleString("vi-VN")} hồ sơ tuyển sinh`);
    }
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
