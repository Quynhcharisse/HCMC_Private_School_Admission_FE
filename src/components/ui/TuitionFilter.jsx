import React, {useState, useEffect} from 'react';
import {Box, Slider, Typography} from '@mui/material';

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
                    color: '#334155',
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
                    color: '#4f46e5',
                    height: 6,
                    mb: 1,
                    '& .MuiSlider-thumb': {
                        width: 18,
                        height: 18,
                        backgroundColor: '#4f46e5',
                        border: '2px solid white',
                        boxShadow: '0 2px 8px rgba(79,70,229,0.35)',
                        '&:hover': {
                            boxShadow: '0 4px 12px rgba(79,70,229,0.45)',
                        },
                        '&.Mui-active': {
                            boxShadow: '0 4px 16px rgba(79,70,229,0.5)',
                        },
                        '&:first-of-type': {
                            cursor: 'not-allowed',
                            opacity: 0.6,
                        },
                    },
                    '& .MuiSlider-track': {
                        backgroundColor: '#4f46e5',
                        border: 'none',
                    },
                    '& .MuiSlider-rail': {
                        backgroundColor: '#e0e7ff',
                        opacity: 1,
                    },
                    '& .MuiSlider-mark': {
                        backgroundColor: '#e0e7ff',
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
