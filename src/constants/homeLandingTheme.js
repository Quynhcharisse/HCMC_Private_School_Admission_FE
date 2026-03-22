/**
 * Pastel shelf cho landing: Primary (xanh dương trust) → Accent (xanh lá nhẹ support) → CTA (cam nhẹ highlight).
 * Dùng chung cho header (trong suốt) + hero — một dải linear-gradient liền mạch.
 */
export const HOME_HERO_SHELF_GRADIENT =
    'linear-gradient(168deg, #dbeafe 0%, #bfdbfe 14%, #e0f2fe 28%, #dbeafe 40%, #bae6fd 52%, #cffafe 64%, #d1fae5 76%, #ffedd5 90%, #eff6ff 100%)';

/** Nền ngoài HomePage và các trang landing đồng bộ (slate → indigo → rose → trắng). */
export const HOME_PAGE_BODY_GRADIENT =
    'linear-gradient(180deg, #f8fafc 0%, #eef2ff 38%, #fdf2f8 72%, #ffffff 100%)';

/** Đổ bóng section/card giống HomePage — depth 2–6. */
export function landingSectionShadow(depth = 3) {
    const y = depth <= 2 ? 10 : depth <= 4 ? 18 : 24;
    const blur = depth <= 2 ? 28 : depth <= 4 ? 40 : 52;
    const alpha = depth <= 2 ? 0.06 : depth <= 4 ? 0.08 : 0.1;
    return `0 ${y}px ${blur}px rgba(15, 23, 42, ${alpha})`;
}
