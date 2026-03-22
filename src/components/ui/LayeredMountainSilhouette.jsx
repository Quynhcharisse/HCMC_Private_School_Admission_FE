import React from 'react';
import {Box} from '@mui/material';
import {HOME_MOUNTAIN_FOOTER_FILLS, HOME_MOUNTAIN_HERO_FILLS} from '../../constants/homeLandingTheme';

const VB_H = 640;

const PATHS = [
    `M0,0 L1200,0 L1200,128 C 1050,92 920,155 740,108 C 520,58 280,145 0,112 L0,0 Z`,
    `M0,112 C 280,145 520,58 740,108 C 920,155 1050,92 1200,128 L1200,268 C 1040,228 860,305 620,255 C 380,198 180,288 0,248 L0,112 Z`,
    `M0,248 C 180,288 380,198 620,255 C 860,305 1040,228 1200,268 L1200,408 C 1040,368 860,448 620,398 C 380,348 180,428 0,388 L0,248 Z`,
    `M0,388 C 180,428 380,348 620,398 C 860,448 1040,368 1200,408 L1200,538 C 1040,498 860,578 620,528 C 380,478 180,558 0,518 L0,388 Z`,
    `M0,518 C 180,558 380,478 620,528 C 860,578 1040,498 1200,538 L1200,640 L0,640 L0,518 Z`
];

/**
 * Hero: 5 lớp full khung — đậm (trên) → nhạt (dưới).
 * Footer: cùng path, đảo màu — đậm (dưới) → nhạt (trên).
 */
const LAYERS_FULL = PATHS.map((d, i) => ({d, fill: HOME_MOUNTAIN_HERO_FILLS[i]}));
const LAYERS_FOOTER_MIRROR = PATHS.map((d, i) => ({d, fill: HOME_MOUNTAIN_FOOTER_FILLS[i]}));

function normalizePath(d) {
    return d.replace(/\s+/g, ' ').trim();
}

export default function LayeredMountainSilhouette({variant = 'hero', sx = {}}) {
    const isFooter = variant === 'footer';
    const layers = isFooter ? LAYERS_FOOTER_MIRROR : LAYERS_FULL;

    return (
        <Box
            aria-hidden
            sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 0,
                lineHeight: 0,
                ...sx
            }}
        >
            <svg
                width="100%"
                height="100%"
                viewBox={`0 0 1200 ${VB_H}`}
                preserveAspectRatio="none"
                style={{display: 'block'}}
            >
                {layers.map((layer, i) => (
                    <path key={i} d={normalizePath(layer.d)} fill={layer.fill}/>
                ))}
            </svg>
        </Box>
    );
}
