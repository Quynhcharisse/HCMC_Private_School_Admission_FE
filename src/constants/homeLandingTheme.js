export const APP_PRIMARY_MAIN = '#3b82f6';
export const APP_PRIMARY_DARK = '#2563eb';
export const APP_PRIMARY_LIGHT = '#93c5fd';
export const APP_PRIMARY_SOFT_BG = 'rgba(59, 130, 246, 0.1)';
export const APP_PRIMARY_SOFT_BORDER = 'rgba(59, 130, 246, 0.22)';
export const APP_PRIMARY_MUTED_BORDER = 'rgba(59, 130, 246, 0.28)';

export const BRAND_NAVY = '#2563eb';
export const BRAND_SKY = '#3b82f6';
export const BRAND_SKY_LIGHT = '#60a5fa';
export const BRAND_AQUA = '#93c5fd';

export const BRAND_PASTEL_BLUE = 'rgba(191, 219, 254, 0.82)';

export const BRAND_PASTEL_SURFACE = `
    linear-gradient(168deg,
        rgba(248, 250, 255, 0.98) 0%,
        rgba(235, 244, 255, 0.96) 42%,
        rgba(224, 238, 255, 0.97) 100%
    )
`;

export const BRAND_PASTEL_AURA = `
    radial-gradient(ellipse 85% 60% at 12% 8%, rgba(255,255,255,0.65) 0%, transparent 52%),
    radial-gradient(ellipse 70% 50% at 92% 88%, rgba(147,197,253,0.28) 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 48% 55%, rgba(59,130,246,0.1) 0%, transparent 62%)
`;

export const BRAND_BLUE_GRADIENT = BRAND_PASTEL_BLUE;

export const BRAND_BLUE_GRADIENT_OVERLAY = 'transparent';

export const HOME_HERO_SHELF_GRADIENT = BRAND_PASTEL_SURFACE;

export const HOME_PAGE_BODY_GRADIENT =
    'linear-gradient(180deg, #f5f9ff 0%, #fafcff 26%, #eaf2ff 50%, #f8fbff 100%)';

export const HOME_PAGE_SURFACE_GRADIENT =
    'linear-gradient(180deg, #fcfdff 0%, #f5f9ff 28%, #eef5ff 52%, #fafbff 100%)';

export const HOME_PAGE_HERO_BACKDROP = '#f6f9ff';

export const HEADER_HOME_BAR_BG = '#eaf2fb';

const HERO_BAND_A = '#d4e6f5';
const HERO_BAND_B = '#b0cfe8';
const HERO_BAND_C = '#8ab6db';
const HERO_BAND_D = '#6899ca';
const HERO_BAND_E = '#4f7fb5';

export const HOME_HERO_BOTTOM_BG = '#3a5f90';

export const HOME_HERO_WAVE_FLOOR = HOME_HERO_BOTTOM_BG;

export const HOME_SCHOOL_SECTION_SURFACE = '#e8f4fc';

export const HOME_CONSULT_SECTION_TOP = '#eff6ff';

export const HOME_PAGE_HERO_BANNER_GRADIENT =
    `linear-gradient(180deg,
        ${HEADER_HOME_BAR_BG} 0%,
        ${HEADER_HOME_BAR_BG} 12%,
        ${HERO_BAND_A} 22%,
        ${HERO_BAND_B} 38%,
        ${HERO_BAND_C} 52%,
        ${HERO_BAND_D} 68%,
        ${HERO_BAND_E} 82%,
        ${HOME_HERO_BOTTOM_BG} 96%,
        ${HOME_HERO_BOTTOM_BG} 100%)`;

export const HOME_PAGE_HERO_TOP_GRADIENT =
    `linear-gradient(180deg, ${HEADER_HOME_BAR_BG} 0%, ${HERO_BAND_A} 45%, ${HERO_BAND_B} 100%)`;

export const HOME_MOUNTAIN_HERO_FILLS = [
    HEADER_HOME_BAR_BG,
    HERO_BAND_A,
    HERO_BAND_B,
    HERO_BAND_C,
    HERO_BAND_D,
    HERO_BAND_E,
    HOME_HERO_BOTTOM_BG
];

export const HOME_MOUNTAIN_FOOTER_FILLS = [
    HOME_HERO_BOTTOM_BG,
    HERO_BAND_E,
    HERO_BAND_D,
    HERO_BAND_C,
    HERO_BAND_B,
    HERO_BAND_A,
    HEADER_HOME_BAR_BG
];

export function landingSectionShadow(depth = 3) {
    const y = depth <= 2 ? 10 : depth <= 4 ? 18 : 24;
    const blur = depth <= 2 ? 28 : depth <= 4 ? 40 : 52;
    const alpha = depth <= 2 ? 0.06 : depth <= 4 ? 0.08 : 0.1;
    return `0 ${y}px ${blur}px rgba(51, 65, 85, ${alpha * 0.92})`;
}
