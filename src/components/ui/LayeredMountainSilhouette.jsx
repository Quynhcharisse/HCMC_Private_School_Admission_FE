import React from 'react';
import {Box} from '@mui/material';
import {HOME_MOUNTAIN_FOOTER_FILLS, HOME_MOUNTAIN_HERO_FILLS} from '../../constants/homeLandingTheme';

const VB_W = 1200;
const VB_H = 640;

const WAVE_CYCLES = 2.55;

const SEG = 64;

function waveY(x, base, amp, phase) {
    const k = (WAVE_CYCLES * 2 * Math.PI * x) / VB_W + phase;
    return base + amp * Math.sin(k) + amp * 0.2 * Math.sin(k * 1.65 + phase * 1.2);
}

function pathLayerFlatTop(bottom) {
    const {base, amp, ph} = bottom;
    let d = `M0,0 L${VB_W},0 L${VB_W},${waveY(VB_W, base, amp, ph).toFixed(2)}`;
    for (let i = 1; i <= SEG; i++) {
        const x = VB_W - (VB_W * i) / SEG;
        d += ` L${x.toFixed(1)},${waveY(x, base, amp, ph).toFixed(2)}`;
    }
    d += ' L0,0 Z';
    return d;
}

function pathLayerWavy(top, bottom) {
    const {base: tb, amp: ta, ph: tph} = top;
    const {base: bb, amp: ba, ph: bph} = bottom;
    let d = `M0,${waveY(0, tb, ta, tph).toFixed(2)}`;
    for (let i = 1; i <= SEG; i++) {
        const x = (VB_W * i) / SEG;
        d += ` L${x.toFixed(1)},${waveY(x, tb, ta, tph).toFixed(2)}`;
    }
    d += ` L${VB_W},${waveY(VB_W, bb, ba, bph).toFixed(2)}`;
    for (let i = 1; i <= SEG; i++) {
        const x = VB_W - (VB_W * i) / SEG;
        d += ` L${x.toFixed(1)},${waveY(x, bb, ba, bph).toFixed(2)}`;
    }
    d += ` L0,${waveY(0, tb, ta, tph).toFixed(2)} Z`;
    return d;
}

function pathLayerFlatBottom(top) {
    const {base: tb, amp: ta, ph: tph} = top;
    let d = `M0,${waveY(0, tb, ta, tph).toFixed(2)}`;
    for (let i = 1; i <= SEG; i++) {
        const x = (VB_W * i) / SEG;
        d += ` L${x.toFixed(1)},${waveY(x, tb, ta, tph).toFixed(2)}`;
    }
    d += ` L${VB_W},${VB_H} L0,${VB_H} L0,${waveY(0, tb, ta, tph).toFixed(2)} Z`;
    return d;
}

const BANDS = [
    {bot: {base: 118, amp: 15, ph: 0.4}},
    {top: {base: 118, amp: 15, ph: 0.4}, bot: {base: 228, amp: 16, ph: 0.92}},
    {top: {base: 228, amp: 16, ph: 0.92}, bot: {base: 338, amp: 15.5, ph: 1.38}},
    {top: {base: 338, amp: 15.5, ph: 1.38}, bot: {base: 448, amp: 16.5, ph: 0.22}},
    {top: {base: 448, amp: 16.5, ph: 0.22}, bot: {base: 558, amp: 15.5, ph: 0.72}},
    {top: {base: 558, amp: 15.5, ph: 0.72}}
];

const PATHS = [
    pathLayerFlatTop(BANDS[0].bot),
    pathLayerWavy(BANDS[1].top, BANDS[1].bot),
    pathLayerWavy(BANDS[2].top, BANDS[2].bot),
    pathLayerWavy(BANDS[3].top, BANDS[3].bot),
    pathLayerWavy(BANDS[4].top, BANDS[4].bot),
    pathLayerFlatBottom(BANDS[5].top)
];

function normalizePath(d) {
    return d.replace(/\s+/g, ' ').trim();
}

const LAYERS_FULL = PATHS.map((d, i) => ({d, fill: HOME_MOUNTAIN_HERO_FILLS[i]}));
const LAYERS_FOOTER_MIRROR = PATHS.map((d, i) => ({d, fill: HOME_MOUNTAIN_FOOTER_FILLS[i]}));

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
                viewBox={`0 0 ${VB_W} ${VB_H}`}
                preserveAspectRatio="none"
                shapeRendering="geometricPrecision"
                style={{display: 'block'}}
            >
                {layers.map((layer, i) => (
                    <path key={i} d={normalizePath(layer.d)} fill={layer.fill}/>
                ))}
            </svg>
        </Box>
    );
}
