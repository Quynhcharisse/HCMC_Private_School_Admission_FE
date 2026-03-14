import React, { useState, useEffect } from 'react';
import { Box, Slider, Typography } from '@mui/material';

/**
 * Component để lọc trường theo mức học phí bằng range slider
 * 
 * @param {Object} props
 * @param {number} props.tuitionMin - Giá trị tối thiểu (triệu đồng)
 * @param {number} props.tuitionMax - Giá trị tối đa (triệu đồng)
 * @param {Function} props.onChange - Callback khi giá trị thay đổi (tuitionMin, tuitionMax)
 */
export default function TuitionFilter({ tuitionMin = 0, tuitionMax = 30, onChange }) {
    const [value, setValue] = useState([0, tuitionMax]);

    // Sync với props khi props thay đổi
    useEffect(() => {
        setValue([0, tuitionMax]);
    }, [tuitionMax]);

    // Xử lý khi slider thay đổi - luôn giữ giá trị min ở 0
    const handleChange = (event, newValue) => {
        // Luôn giữ giá trị đầu tiên ở 0, chỉ cho phép giá trị thứ hai thay đổi
        // Nếu handle đầu tiên bị kéo, giữ nó ở 0 và dùng giá trị của nó làm giá trị max
        let maxValue = newValue[1];
        if (newValue[0] > 0) {
            // Nếu handle đầu tiên bị kéo, dùng giá trị đó làm max và giữ min ở 0
            maxValue = newValue[0];
        }
        const updatedValue = [0, maxValue];
        setValue(updatedValue);
        if (onChange) {
            onChange(0, maxValue);
        }
    };

    // Format số tiền thành định dạng: 15 triệu
    const formatCurrency = (amount) => {
        if (amount === 0) return '0đ';
        return `${amount} triệu`;
    };

    // Các mốc học phí để hiển thị dưới slider
    const marks = [
        { value: 0, label: '0đ' },
        { value: 10, label: '10tr' },
        { value: 20, label: '20tr' },
        { value: 30, label: '30tr' },
        { value: 40, label: '40tr' },
        { value: 50, label: '50tr' },
        { value: 60, label: '60tr' },
    ];

    return (
        <Box
            sx={{
                position: 'relative',
                minWidth: { xs: '100%', md: 300 },
            }}
        >
            <Typography
                sx={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    mb: 1,
                }}
            >
                Khoảng học phí mỗi tháng
            </Typography>

            <Slider
                value={value}
                onChange={handleChange}
                min={0}
                max={60}
                step={3}
                valueLabelDisplay="off"
                marks={marks}
                disableSwap
                sx={{
                    color: '#1976d2',
                    height: 6,
                    mb: 1,
                    '& .MuiSlider-thumb': {
                        width: 18,
                        height: 18,
                        backgroundColor: '#1976d2',
                        border: '2px solid white',
                        boxShadow: '0 2px 8px rgba(25,118,210,0.3)',
                        '&:hover': {
                            boxShadow: '0 4px 12px rgba(25,118,210,0.4)',
                        },
                        '&.Mui-active': {
                            boxShadow: '0 4px 16px rgba(25,118,210,0.5)',
                        },
                        '&:first-of-type': {
                            cursor: 'not-allowed',
                            opacity: 0.6,
                        },
                    },
                    '& .MuiSlider-track': {
                        backgroundColor: '#1976d2',
                        border: 'none',
                    },
                    '& .MuiSlider-rail': {
                        backgroundColor: '#e3f2fd',
                        opacity: 1,
                    },
                    '& .MuiSlider-mark': {
                        backgroundColor: '#e3f2fd',
                        width: 2,
                        height: 8,
                        borderRadius: 1,
                    },
                    '& .MuiSlider-markLabel': {
                        fontSize: '0.7rem',
                        color: '#ffffff',
                        fontWeight: 600,
                        mt: 0.5,
                    },
                }}
            />

            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mt: 0.5,
                }}
            >
                <Typography
                    sx={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: '#ffffff',
                    }}
                >
                    {formatCurrency(value[0])}
                </Typography>
                <Typography
                    sx={{
                        fontSize: '0.7rem',
                        color: '#ffffff',
                        fontWeight: 600,
                        mx: 1,
                    }}
                >
                    –
                </Typography>
                <Typography
                    sx={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: '#ffffff',
                    }}
                >
                    {formatCurrency(value[1])}
                </Typography>
            </Box>
        </Box>
    );
}
