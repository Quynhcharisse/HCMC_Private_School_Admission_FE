import React from 'react';
import {Box} from '@mui/material';

const VB_W = 1200;
const VB_H = 88;
const SEG = 56;
const CYCLES = 2.35;
const BASE = 36;
const AMP = 6.5;

function waveY(x, phase) {
    const k = (CYCLES * 2 * Math.PI * x) / VB_W + phase;
    return BASE + AMP * Math.sin(k) + AMP * 0.18 * Math.sin(k * 1.65 + phase * 0.9);
}

function buildWavePath(phase) {
    let d = `M0,${waveY(0, phase).toFixed(2)}`;
    for (let i = 1; i <= SEG; i++) {
        const x = (VB_W * i) / SEG;
        d += ` L${x.toFixed(1)},${waveY(x, phase).toFixed(2)}`;
    }
    d += ` L${VB_W},${VB_H} L0,${VB_H} Z`;
    return d;
}

const PATH_TOP = buildWavePath(0.35);
const PATH_BOTTOM = buildWavePath(2.15);

export default function SectionWaveEdge({variant = 'top', fill, sx = {}}) {
    const d = variant === 'top' ? PATH_TOP : PATH_BOTTOM;
    const pos =
        variant === 'top'
            ? {top: 0, transform: 'translateY(-94%)'}
            : {bottom: 0, transform: 'translateY(94%)'};

    return (
        <Box
            aria-hidden
            sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: {xs: 44, md: 56},
                zIndex: 2,
                pointerEvents: 'none',
                lineHeight: 0,
                ...pos,
                ...sx
            }}
        >
            <svg
                viewBox={`0 0 ${VB_W} ${VB_H}`}
                preserveAspectRatio="none"
                shapeRendering="geometricPrecision"
                width="100%"
                height="100%"
                style={{display: 'block'}}
            >
                <path d={d} fill={fill}/>
            </svg>
        </Box>
    );
}
