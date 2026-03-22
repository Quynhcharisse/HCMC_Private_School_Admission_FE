/**
 * Bảng màu thương hiệu (gợi ý): navy → sky → light sky → aqua highlight.
 * Dùng chung footer / hero / header.
 */
export const BRAND_NAVY = '#2D5F73';
export const BRAND_SKY = '#55B3D9';
export const BRAND_SKY_LIGHT = '#73C6D9';
export const BRAND_AQUA = '#88E8F2';

/**
 * Gradient nền: kết thúc về BRAND_SKY để giữ tương phản chữ trắng; #88E8F2 chỉ trong overlay.
 */
export const BRAND_BLUE_GRADIENT =
    `linear-gradient(145deg, ${BRAND_NAVY} 0%, ${BRAND_SKY} 45%, ${BRAND_SKY_LIGHT} 72%, ${BRAND_SKY} 100%)`;

/** Lớp sáng + aqua — dùng chung hero & footer (::before). */
export const BRAND_BLUE_GRADIENT_OVERLAY = `
    radial-gradient(ellipse 95% 60% at 12% -8%, rgba(255,255,255,0.2), transparent 55%),
    radial-gradient(ellipse 80% 50% at 92% 100%, rgba(136,232,242,0.38), transparent 52%),
    radial-gradient(ellipse 55% 40% at 48% 45%, rgba(85,179,217,0.18), transparent 65%)
`;

/** Nền khu vực hero (cùng tone footer). */
export const HOME_HERO_SHELF_GRADIENT = BRAND_BLUE_GRADIENT;

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
