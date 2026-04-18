/**
 * CampusValidation (BE) dùng BoardingType enum: NONE, FULL_BOARDING, SEMI_BOARDING, BOTH.
 * UI vẫn dùng nhãn tiếng Việt trong BOARDING_TYPE_OPTIONS; parseBoardingType / gửi API map sang enum.
 */
export const BOARDING_TYPE_DEFAULT_VI = "Nội trú";

export const BOARDING_TYPE_OPTIONS = [
    { value: "Nội trú", label: "Nội trú" },
    { value: "Bán trú", label: "Bán trú" },
    { value: "Cả hai (Nội trú & Bán trú)", label: "Cả hai (Nội trú & Bán trú)" },
];

const ENUM_TO_VI = {
    NONE: "Nội trú",
    FULL_BOARDING: "Nội trú",
    SEMI_BOARDING: "Bán trú",
    BOTH: "Cả hai (Nội trú & Bán trú)",
};

const BOARDING_ENUM_NAMES = ["NONE", "FULL_BOARDING", "SEMI_BOARDING", "BOTH"];

const VI_SET = new Set(BOARDING_TYPE_OPTIONS.map((o) => o.value));

function normalizeTrimmedNull(value) {
    if (value == null) return null;
    const trimmed = String(value).trim();
    return trimmed === "" ? null : trimmed;
}

/**
 * Đồng bộ với CampusValidation.parseBoardingType (BE): enum name, dấu gạch / khoảng trắng, hoặc nhãn tiếng Việt (getValue tương đương).
 * @returns {"NONE"|"FULL_BOARDING"|"SEMI_BOARDING"|"BOTH"|null}
 */
export function parseBoardingType(value) {
    const normalized = normalizeTrimmedNull(value);
    if (normalized == null) return null;
    const enumKey = normalized.toUpperCase().replace(/-/g, "_").replace(/\s+/g, "_");
    if (BOARDING_ENUM_NAMES.includes(enumKey)) return enumKey;
    for (const name of BOARDING_ENUM_NAMES) {
        const vi = ENUM_TO_VI[name];
        if (vi && vi.toLowerCase() === normalized.toLowerCase()) return name;
    }
    return null;
}

/** Chuẩn hóa giá trị gửi API / hiển thị: chấp nhận cả enum cũ và đúng chuỗi tiếng Việt. */
export function normalizeBoardingTypeForApi(raw) {
    if (raw == null || String(raw).trim() === "") return BOARDING_TYPE_DEFAULT_VI;
    const parsed = parseBoardingType(raw);
    if (parsed && ENUM_TO_VI[parsed]) return ENUM_TO_VI[parsed];
    const s = String(raw).trim();
    if (VI_SET.has(s)) return s;
    const key = s.toUpperCase();
    if (ENUM_TO_VI[key]) return ENUM_TO_VI[key];
    return BOARDING_TYPE_DEFAULT_VI;
}
