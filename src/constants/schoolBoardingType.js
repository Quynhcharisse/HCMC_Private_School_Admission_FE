/**
 * Backend (account profile, campus) validates `boardingType` as these exact Vietnamese strings,
 * not enum names like NONE / FULL_BOARDING.
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

const VI_SET = new Set(BOARDING_TYPE_OPTIONS.map((o) => o.value));

/** Chuẩn hóa giá trị gửi API / hiển thị: chấp nhận cả enum cũ và đúng chuỗi tiếng Việt. */
export function normalizeBoardingTypeForApi(raw) {
    if (raw == null || String(raw).trim() === "") return BOARDING_TYPE_DEFAULT_VI;
    const s = String(raw).trim();
    if (VI_SET.has(s)) return s;
    const key = s.toUpperCase();
    if (ENUM_TO_VI[key]) return ENUM_TO_VI[key];
    return BOARDING_TYPE_DEFAULT_VI;
}
