import React from 'react';
import {Box, IconButton, Tooltip, Typography} from '@mui/material';
import {InfoOutlined} from '@mui/icons-material';
import {SUBJECT_UNAVAILABLE_TOOLTIP} from './childrenInfoHelpers.js';

/** Cao hơn dialog / overlay phụ huynh (≈1600) để tooltip không bị che. */
const TOOLTIP_Z_INDEX = 1700;

/**
 * Nhãn “Không khả dụng” + nút (i) giải thích — dùng Thông tin con và panel chat.
 * Popper z-index cao + touch delay thấp để tooltip không nằm dưới modal và dễ xem trên mobile.
 */
export function SubjectUnavailableHint() {
    return (
        <Box
            component="span"
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.25,
                maxWidth: '100%',
                flexWrap: 'wrap',
            }}
        >
            <Typography
                component="span"
                sx={{
                    fontSize: 12,
                    color: '#64748b',
                    fontWeight: 600,
                    lineHeight: 1.35,
                }}
            >
                Không khả dụng
            </Typography>
            <Tooltip
                title={SUBJECT_UNAVAILABLE_TOOLTIP}
                arrow
                placement="top-start"
                enterDelay={100}
                enterTouchDelay={0}
                leaveTouchDelay={4000}
                disableInteractive={false}
                PopperProps={{
                    sx: {zIndex: TOOLTIP_Z_INDEX},
                    disablePortal: false,
                }}
            >
                <IconButton
                    size="small"
                    aria-label="Giải thích: môn không khả dụng"
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                    sx={{
                        p: 0.125,
                        color: '#64748b',
                        '&:hover': {bgcolor: 'rgba(100, 116, 139, 0.08)'},
                    }}
                >
                    <InfoOutlined sx={{fontSize: 16}}/>
                </IconButton>
            </Tooltip>
        </Box>
    );
}
