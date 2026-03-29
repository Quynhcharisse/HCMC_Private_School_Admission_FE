import React, {useState, useEffect} from 'react';
import {Box, Slider, Typography} from '@mui/material';
import {BRAND_NAVY} from '../../constants/homeLandingTheme';

export default function TuitionFilter({ tuitionMin = 0, tuitionMax = 30, onChange }) {
    const [value, setValue] = useState([0, tuitionMax]);

    useEffect(() => {
        setValue([0, tuitionMax]);
    }, [tuitionMax]);

    const handleChange = (event, newValue) => {
        let maxValue = newValue[1];
        if (newValue[0] > 0) {
            maxValue = newValue[0];
        }
        const updatedValue = [0, maxValue];
        setValue(updatedValue);
        if (onChange) {
            onChange(0, maxValue);
        }
    };

    const formatCurrency = (amount) => {
        if (amount === 0) return '0đ';
        return `${amount} triệu`;
    };

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
                minWidth: 0,
                width: '100%'
            }}
        >
            <Typography
                sx={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#64748b',
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
                step={1}
                valueLabelDisplay="off"
                marks={marks}
                disableSwap
                sx={{
                    color: BRAND_NAVY,
                    height: 6,
                    mb: 1,
                    '& .MuiSlider-thumb': {
                        width: 18,
                        height: 18,
                        backgroundColor: BRAND_NAVY,
                        border: '2px solid white',
                        boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
                        '&:hover': {
                            boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
                        },
                        '&.Mui-active': {
                            boxShadow: '0 4px 16px rgba(59,130,246,0.45)',
                        },
                        '&:first-of-type': {
                            cursor: 'not-allowed',
                            opacity: 0.6,
                        },
                    },
                    '& .MuiSlider-track': {
                        backgroundColor: BRAND_NAVY,
                        border: 'none',
                    },
                    '& .MuiSlider-rail': {
                        backgroundColor: 'rgba(184, 232, 247, 0.65)',
                        opacity: 1,
                    },
                    '& .MuiSlider-mark': {
                        backgroundColor: 'rgba(184, 232, 247, 0.9)',
                        width: 2,
                        height: 8,
                        borderRadius: 1,
                    },
                    '& .MuiSlider-markLabel': {
                        fontSize: '0.7rem',
                        color: '#64748b',
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
                        color: '#1e293b',
                    }}
                >
                    {formatCurrency(value[0])}
                </Typography>
                <Typography
                    sx={{
                        fontSize: '0.7rem',
                        color: '#64748b',
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
                        color: '#1e293b',
                    }}
                >
                    {formatCurrency(value[1])}
                </Typography>
            </Box>
        </Box>
    );
}
