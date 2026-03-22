/**
 * Bảng màu thương hiệu — xanh dương pastel + navy.
 */
export const BRAND_NAVY = '#2D5F73';
export const BRAND_SKY = '#55B3D9';
export const BRAND_SKY_LIGHT = '#73C6D9';
export const BRAND_AQUA = '#88E8F2';

/** Base pastel (một tông, có alpha) — dùng khi cần màu phẳng */
export const BRAND_PASTEL_BLUE = 'rgba(184, 232, 247, 0.82)';

/**
 * Nền hero/footer đẹp hơn: gradient pastel cùng họ màu (sáng → trung bình),
 * không lệch tông khác.
 */
export const BRAND_PASTEL_SURFACE = `
    linear-gradient(168deg,
        rgba(214, 244, 252, 0.97) 0%,
        rgba(188, 234, 248, 0.94) 42%,
        rgba(168, 224, 240, 0.96) 100%
    )
`;

/**
 * Lớp “aura” — bóng sáng mềm + hơi aqua (chỉ để tạo chiều sâu).
 */
export const BRAND_PASTEL_AURA = `
    radial-gradient(ellipse 85% 60% at 12% 8%, rgba(255,255,255,0.65) 0%, transparent 52%),
    radial-gradient(ellipse 70% 50% at 92% 88%, rgba(136,232,242,0.28) 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 48% 55%, rgba(85,179,217,0.1) 0%, transparent 62%)
`;

/** Alias — nền phẳng / cũ */
export const BRAND_BLUE_GRADIENT = BRAND_PASTEL_BLUE;

export const BRAND_BLUE_GRADIENT_OVERLAY = 'transparent';

export const HOME_HERO_SHELF_GRADIENT = BRAND_PASTEL_SURFACE;

/** Nền ngoài HomePage — thêm chút hơi xanh nhạt phía trên cho khớp hero */
export const HOME_PAGE_BODY_GRADIENT =
    'linear-gradient(180deg, #f3fafc 0%, #f8fafc 22%, #eef2ff 42%, #fdf2f8 72%, #ffffff 100%)';

/** HomePage — sáng hơn ~1 tông: nền bọc toàn trang + khớp hero */
export const HOME_PAGE_SURFACE_GRADIENT =
    'linear-gradient(180deg, #fcfdfe 0%, #f8faff 26%, #f2f6ff 44%, #fef7fb 72%, #ffffff 100%)';

export const HOME_PAGE_HERO_BACKDROP = '#f2f9fc';

/**
 * SVG LayeredMountain (hero): đậm trên → nhạt dưới — tông sáng hơn, giữ cùng bậc.
 * Footer dùng HOME_MOUNTAIN_FOOTER_FILLS (đảo).
 */
export const HOME_MOUNTAIN_HERO_FILLS = ['#456f82', '#75a5b8', '#a8dce8', '#daeef6', '#f6fcfe'];

export const HOME_MOUNTAIN_FOOTER_FILLS = [
    '#f6fcfe',
    '#daeef6',
    '#a8dce8',
    '#75a5b8',
    '#456f82'
];

/** Đổ bóng section/card — depth 2–6. */
export function landingSectionShadow(depth = 3) {
    const y = depth <= 2 ? 10 : depth <= 4 ? 18 : 24;
    const blur = depth <= 2 ? 28 : depth <= 4 ? 40 : 52;
    const alpha = depth <= 2 ? 0.06 : depth <= 4 ? 0.08 : 0.1;
    return `0 ${y}px ${blur}px rgba(15, 23, 42, ${alpha})`;
}
