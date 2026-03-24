import React, {useRef, useState} from 'react';
import {
    Box,
    Button,
    Container,
    Paper,
    Stack,
    TextField,
    Typography,
    CircularProgress,
    Grid,
    IconButton,
    InputAdornment,
    Divider,
} from '@mui/material';
import {ArrowBack, CalendarMonth} from '@mui/icons-material';
import {checkTaxCode, registerSchool} from '../../services/AuthService';
import backgroundLogin from '../../assets/backgroundLogin.png';
import {useNavigate} from 'react-router-dom';
import {enqueueSnackbar} from 'notistack';
import {showErrorSnackbar, showSuccessSnackbar} from '../ui/AppSnackbar.jsx';
import CloudinaryUpload from '../ui/CloudinaryUpload.jsx';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const SchoolRegistrationForm = ({email, onBack}) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [taxCode, setTaxCode] = useState('');
    const [taxCodeError, setTaxCodeError] = useState('');
    const [isCheckingTaxCode, setIsCheckingTaxCode] = useState(false);
    
    const [formData, setFormData] = useState({
        description: '',
        schoolName: '',
        campusName: '',
        campusAddress: '',
        campusPhone: '',
        taxCode: '',
        websiteUrl: '',
        logoUrl: '',
        foundingDate: '',
        representativeName: '',
        hotline: '',
        businessLicenseUrl: '',
    });
    
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const foundingDatePickerRef = useRef(null);

    const formatDisplayDate = (value) => {
        if (!value) return '';
        const [yyyy, mm, dd] = value.split('-');
        if (!yyyy || !mm || !dd) return '';
        return `${dd}/${mm}/${yyyy}`;
    };

    const normalizeFoundingDate = (value) => {
        const raw = value?.trim();
        if (!raw) return null;
        const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!match) return null;
        const [, dd, mm, yyyy] = match;
        return `${yyyy}-${mm}-${dd}`;
    };

    const formatFoundingDateInput = (value) => {
        const digits = value.replace(/\D/g, '').slice(0, 8);
        const day = digits.slice(0, 2);
        const month = digits.slice(2, 4);
        const year = digits.slice(4, 8);

        let result = '';
        if (digits.length > 0) result += day;
        if (digits.length > 0) result += '/';
        if (digits.length > 2) result += month;
        if (digits.length > 2) result += '/';
        if (digits.length > 4) result += year;
        return result;
    };

    const openFoundingDatePicker = () => {
        const picker = foundingDatePickerRef.current;
        if (!picker) return;
        if (typeof picker.showPicker === 'function') {
            picker.showPicker();
            return;
        }
        picker.click();
    };

    const handleTaxCodeCheck = async () => {
        if (!taxCode.trim()) {
            setTaxCodeError('Vui lòng nhập mã số thuế');
            return;
        }

        setIsCheckingTaxCode(true);
        setTaxCodeError('');

        try {
            const data = await checkTaxCode(taxCode.trim());
            
            if (data.code === '00' && data.data) {
                setFormData(prev => ({
                    ...prev,
                    taxCode: taxCode.trim(),
                    schoolName: data.data.name || data.data.companyName || prev.schoolName,
                    campusAddress: data.data.address || data.data.companyAddress || prev.campusAddress,
                    representativeName: data.data.representative || data.data.representativeName || prev.representativeName,
                    campusPhone: data.data.phone || data.data.phoneNumber || prev.campusPhone,
                }));

                showSuccessSnackbar('Mã số thuế hợp lệ! Hệ thống sẽ chuyển sang bước tiếp theo sau khi thông báo đóng.', {
                    onClose: (event, reason) => {
                        if (reason === 'clickaway') return;
                        setStep(2);
                    },
                });
            } else {
                // Tax code is invalid
                setTaxCodeError(data.desc || 'Mã số thuế không hợp lệ');
            }
        } catch (error) {
            console.error('Error checking tax code:', error);
            setTaxCodeError('Có lỗi xảy ra khi kiểm tra mã số thuế. Vui lòng thử lại.');
            showErrorSnackbar('Có lỗi xảy ra khi kiểm tra mã số thuế. Vui lòng thử lại.');
        } finally {
            setIsCheckingTaxCode(false);
        }
    };

    const handleInputChange = (e) => {
        const {name} = e.target;
        const value = name === 'foundingDate' ? formatFoundingDateInput(e.target.value) : e.target.value;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error for this field
        if (formErrors[name]) {
            setFormErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const errors = {};
        
        if (!formData.schoolName.trim()) {
            errors.schoolName = 'Tên trường là bắt buộc';
        }
        if (!formData.description.trim()) {
            errors.description = 'Mô tả trường là bắt buộc';
        }
        if (!formData.campusName.trim()) {
            errors.campusName = 'Tên cơ sở là bắt buộc';
        }
        if (!formData.campusAddress.trim()) {
            errors.campusAddress = 'Địa chỉ cơ sở là bắt buộc';
        }
        if (!formData.campusPhone.trim()) {
            errors.campusPhone = 'Số điện thoại cơ sở là bắt buộc';
        }
        if (!formData.taxCode.trim()) {
            errors.taxCode = 'Mã số thuế là bắt buộc';
        }
        if (!formData.representativeName.trim()) {
            errors.representativeName = 'Tên người đại diện là bắt buộc';
        }
        if (!formData.hotline.trim()) {
            errors.hotline = 'Hotline là bắt buộc';
        }
        if (formData.foundingDate.trim() && !normalizeFoundingDate(formData.foundingDate)) {
            errors.foundingDate = 'Ngày thành lập phải đúng định dạng dd/mm/yyyy';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const registerPayload = {
                email: email,
                role: 'SCHOOL',
                schoolRequest: {
                    description: formData.description.trim(),
                    schoolName: formData.schoolName.trim(),
                    campusName: formData.campusName.trim(),
                    campusAddress: formData.campusAddress.trim(),
                    campusPhone: formData.campusPhone.trim(),
                    taxCode: formData.taxCode.trim(),
                    websiteUrl: formData.websiteUrl.trim() || null,
                    logoUrl: formData.logoUrl.trim() || null,
                    foundingDate: normalizeFoundingDate(formData.foundingDate),
                    representativeName: formData.representativeName.trim(),
                    hotline: formData.hotline.trim(),
                    businessLicenseUrl: formData.businessLicenseUrl.trim() || null,
                }
            };

            const response = await registerSchool(registerPayload);
            
            if (response) {
                setIsSubmitting(false);

                showSuccessSnackbar(
                    'Đăng ký trường học thành công. Vui lòng chờ quản trị viên hệ thống xem xét và xác thực hồ sơ. Bạn sẽ được thông báo khi tài khoản sẵn sàng sử dụng.',
                    {
                        autoHideDuration: 5000,
                        onClose: (event, reason) => {
                            if (reason === 'clickaway') return;
                            navigate('/home');
                        }
                    }
                );
            }
        } catch (error) {
            console.error('Registration error:', error);
            showErrorSnackbar('Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.');
            setIsSubmitting(false);
        }
    };

    return (
        <Box
            sx={{
                position: 'fixed',
                top: '64px',
                left: 0,
                right: 0,
                bottom: 0,
                height: 'calc(100vh - 64px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: {xs: 1, md: 1.5},
                px: {xs: 2, md: 0},
                backgroundImage: `linear-gradient(135deg, rgba(15,23,42,0.55), rgba(15,23,42,0.35)), url(${backgroundLogin})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
                overflow: 'auto',
            }}
        >
            <Container maxWidth="lg" sx={{maxWidth: '1020px !important'}}>
                <Paper
                    elevation={8}
                    sx={{
                        p: {xs: 1.5, sm: 2, md: 2.25},
                        borderRadius: 4,
                        background: 'radial-gradient(circle at top left, rgba(239,246,255,0.96) 0, rgba(239,246,255,0.98) 40%, #ffffff 100%)',
                        border: '1px solid #dbeafe',
                        backdropFilter: 'blur(10px)',
                        position: 'relative',
                        '& .MuiFormLabel-asterisk': {
                            color: '#111827 !important',
                        },
                        '& .MuiInputBase-input': {fontSize: '0.9rem'},
                        '& .MuiFormHelperText-root': {marginTop: 0.25, fontSize: '0.72rem'},
                    }}
                >
                    {step === 1 ? (
                        <Stack spacing={2}>
                            <Box sx={{position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '32px'}}>
                                <IconButton
                                    onClick={onBack}
                                    sx={{
                                        position: 'absolute',
                                        left: 0,
                                        color: '#64748b',
                                        '&:hover': {
                                            bgcolor: 'rgba(25, 118, 210, 0.08)',
                                            color: '#1976d2',
                                        },
                                    }}
                                >
                                    <ArrowBack />
                                </IconButton>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 700, 
                                        color: '#1e293b',
                                        textAlign: 'center',
                                    }}
                                >
                                    Nhập mã số thuế
                                </Typography>
                            </Box>

                            <Stack spacing={1.25}>
                                <TextField
                                    label="Mã số thuế"
                                    value={taxCode}
                                    onChange={(e) => {
                                        setTaxCode(e.target.value);
                                        setTaxCodeError('');
                                    }}
                                    fullWidth
                                    size="small"
                                    error={!!taxCodeError}
                                    helperText={taxCodeError}
                                    placeholder="Nhập mã số thuế"
                                />

                                <Button
                                    variant="contained"
                                    onClick={handleTaxCodeCheck}
                                    disabled={isCheckingTaxCode}
                                    fullWidth
                                    sx={{
                                        py: 1.1,
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        borderRadius: 999,
                                        background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)',
                                        boxShadow: '0 10px 30px rgba(37, 99, 235, 0.35)',
                                        '&:hover': {
                                            background: 'linear-gradient(90deg, #1d4ed8 0%, #1d4ed8 100%)',
                                            boxShadow: '0 12px 36px rgba(30, 64, 175, 0.45)',
                                        },
                                    }}
                                >
                                    {isCheckingTaxCode ? (
                                        <CircularProgress size={24} color="inherit" />
                                    ) : (
                                        'Kiểm tra mã số thuế'
                                    )}
                                </Button>
                            </Stack>
                        </Stack>
                    ) : (
                        <Box component="form" onSubmit={handleSubmit}>
                            <Stack spacing={1.25}>
                                {/* Header with back button and centered title */}
                                <Box sx={{position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '32px'}}>
                                    <IconButton
                                        onClick={() => setStep(1)}
                                        sx={{
                                            position: 'absolute',
                                            left: 0,
                                            color: '#64748b',
                                            '&:hover': {
                                                bgcolor: 'rgba(25, 118, 210, 0.08)',
                                                color: '#1976d2',
                                            },
                                        }}
                                    >
                                        <ArrowBack />
                                    </IconButton>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 700, 
                                            color: '#1e293b',
                                            textAlign: 'center',
                                        }}
                                    >
                                        Đăng ký trường học
                                    </Typography>
                                </Box>

                                {/* Section 1: Basic School Information */}
                                <Box>
                                    <Typography 
                                        variant="subtitle1" 
                                        sx={{
                                            fontWeight: 600, 
                                            color: '#1976d2',
                                            mb: 1,
                                            fontSize: '0.95rem',
                                            letterSpacing: '0.5px',
                                        }}
                                    >
                                        Thông tin trường
                                    </Typography>
                                    <Divider sx={{mb: 1.5}} />
                                    <Grid
                                        container
                                        rowSpacing={1}
                                        columnSpacing={{xs: 1, sm: 2, md: 3}}
                                        sx={{
                                            p: {xs: 1, sm: 1.25},
                                            borderRadius: 2,
                                            bgcolor: 'rgba(255,255,255,0.72)',
                                            border: '1px solid #e2e8f0',
                                        }}
                                    >
                                        <Grid size={{xs: 12, md: 6}}>
                                        <TextField
                                            label="Tên trường"
                                            required
                                            name="schoolName"
                                            value={formData.schoolName}
                                            onChange={handleInputChange}
                                            fullWidth
                                            size="small"
                                            error={!!formErrors.schoolName}
                                            helperText={formErrors.schoolName}
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 2,
                                                    },
                                                }}
                                        />
                                    </Grid>
                                        <Grid size={{xs: 12, md: 6}}>
                                        <TextField
                                            label="Tên cơ sở"
                                            required
                                            name="campusName"
                                            value={formData.campusName}
                                            onChange={handleInputChange}
                                            fullWidth
                                            size="small"
                                            error={!!formErrors.campusName}
                                            helperText={formErrors.campusName}
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 2,
                                                    },
                                                }}
                                        />
                                    </Grid>
                                        <Grid size={{xs: 12, md: 6}} sx={{display: 'flex'}}>
                                            <TextField
                                                label="Mô tả trường"
                                                required
                                                name="description"
                                                value={formData.description}
                                                onChange={handleInputChange}
                                                fullWidth
                                                size="small"
                                                multiline
                                                rows={2.9}
                                                error={!!formErrors.description}
                                                helperText={formErrors.description}
                                                FormHelperTextProps={{sx: {minHeight: 20}}}
                                                sx={{
                                                    height: '100%',
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 2,
                                                    },
                                                }}
                                            />
                                        </Grid>
                                        <Grid size={{xs: 12, md: 6}}>
                                            <Stack spacing={1}>
                                                <TextField
                                                    label="Mã số thuế"
                                                    required
                                                    name="taxCode"
                                                    value={formData.taxCode}
                                                    onChange={handleInputChange}
                                                    fullWidth
                                                    size="small"
                                                    error={!!formErrors.taxCode}
                                                    helperText={formErrors.taxCode}
                                                    FormHelperTextProps={{sx: {minHeight: 20}}}
                                                    disabled
                                                    sx={{
                                                        '& .MuiOutlinedInput-root': {
                                                            borderRadius: 2,
                                                        },
                                                    }}
                                                />
                                                <TextField
                                                    label="Ngày thành lập"
                                                    name="foundingDate"
                                                    value={formData.foundingDate}
                                                    onChange={handleInputChange}
                                                    fullWidth
                                                    size="small"
                                                    placeholder="dd/mm/yyyy"
                                                    error={!!formErrors.foundingDate}
                                                    helperText={formErrors.foundingDate}
                                                    FormHelperTextProps={{sx: {minHeight: 20}}}
                                                    inputProps={{maxLength: 10, inputMode: 'numeric'}}
                                                    InputProps={{
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <IconButton size="small" onClick={openFoundingDatePicker}>
                                                                    <CalendarMonth fontSize="small" />
                                                                </IconButton>
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                    sx={{
                                                        '& .MuiOutlinedInput-root': {
                                                            borderRadius: 2,
                                                        },
                                                    }}
                                                />
                                                <input
                                                    ref={foundingDatePickerRef}
                                                    type="date"
                                                    value={normalizeFoundingDate(formData.foundingDate) ?? ''}
                                                    onChange={(event) => {
                                                        const nextDisplayDate = formatDisplayDate(event.target.value);
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            foundingDate: nextDisplayDate
                                                        }));
                                                        if (formErrors.foundingDate) {
                                                            setFormErrors((prev) => ({
                                                                ...prev,
                                                                foundingDate: ''
                                                            }));
                                                        }
                                                    }}
                                                    style={{position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0}}
                                                    aria-hidden="true"
                                                    tabIndex={-1}
                                                />
                                            </Stack>
                                        </Grid>
                                    </Grid>
                                </Box>

                                {/* Section 2: Contact Information */}
                                <Box>
                                    <Typography 
                                        variant="subtitle1" 
                                        sx={{
                                            fontWeight: 600, 
                                            color: '#1976d2',
                                            mb: 1,
                                            fontSize: '0.95rem',
                                            letterSpacing: '0.5px',
                                        }}
                                    >
                                        Thông tin liên hệ
                                    </Typography>
                                    <Divider sx={{mb: 1.5}} />
                                    <Grid
                                        container
                                        rowSpacing={1}
                                        columnSpacing={{xs: 1, sm: 2, md: 3}}
                                        sx={{
                                            p: {xs: 1, sm: 1.25},
                                            borderRadius: 2,
                                            bgcolor: 'rgba(255,255,255,0.72)',
                                            border: '1px solid #e2e8f0',
                                        }}
                                    >
                                        <Grid size={{xs: 12, md: 6}} sx={{display: 'flex'}}>
                                        <TextField
                                            label="Địa chỉ cơ sở"
                                            required
                                            name="campusAddress"
                                            value={formData.campusAddress}
                                            onChange={handleInputChange}
                                            fullWidth
                                            size="small"
                                            multiline
                                            rows={2.9}
                                            error={!!formErrors.campusAddress}
                                            helperText={formErrors.campusAddress}
                                            FormHelperTextProps={{sx: {minHeight: 20}}}
                                                sx={{
                                                    height: '100%',
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 2,
                                                    },
                                                }}
                                        />
                                    </Grid>
                                        <Grid size={{xs: 12, md: 6}} sx={{display: 'flex'}}>
                                            <Stack spacing={1} sx={{width: '100%'}}>
                                                <TextField
                                                    label="Số điện thoại cơ sở"
                                                    required
                                                    name="campusPhone"
                                                    value={formData.campusPhone}
                                                    onChange={handleInputChange}
                                                    fullWidth
                                                    size="small"
                                                    error={!!formErrors.campusPhone}
                                                    helperText={formErrors.campusPhone}
                                                    FormHelperTextProps={{sx: {minHeight: 20}}}
                                                    sx={{
                                                        '& .MuiOutlinedInput-root': {
                                                            borderRadius: 2,
                                                        },
                                                    }}
                                                />
                                                <TextField
                                                    label="Hotline"
                                                    required
                                                    name="hotline"
                                                    value={formData.hotline}
                                                    onChange={handleInputChange}
                                                    fullWidth
                                                    size="small"
                                                    error={!!formErrors.hotline}
                                                    helperText={formErrors.hotline}
                                                    FormHelperTextProps={{sx: {minHeight: 20}}}
                                                    sx={{
                                                        '& .MuiOutlinedInput-root': {
                                                            borderRadius: 2,
                                                        },
                                                    }}
                                                />
                                            </Stack>
                                        </Grid>
                                        <Grid size={{xs: 12}}>
                                        <TextField
                                            label="Website URL"
                                            name="websiteUrl"
                                            value={formData.websiteUrl}
                                            onChange={handleInputChange}
                                            fullWidth
                                            size="small"
                                            placeholder="https://example.com"
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 2,
                                                    },
                                                }}
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>

                                {/* Section 3: Legal / Branding */}
                                <Box>
                                    <Typography 
                                        variant="subtitle1" 
                                        sx={{
                                            fontWeight: 600, 
                                            color: '#1976d2',
                                            mb: 1,
                                            fontSize: '0.95rem',
                                            letterSpacing: '0.5px',
                                        }}
                                    >
                                        Thông tin pháp lý
                                    </Typography>
                                    <Divider sx={{mb: 1.5}} />
                                    <Grid
                                        container
                                        rowSpacing={1}
                                        columnSpacing={{xs: 1, sm: 2, md: 3}}
                                        sx={{
                                            p: {xs: 1, sm: 1.25},
                                            borderRadius: 2,
                                            bgcolor: 'rgba(255,255,255,0.72)',
                                            border: '1px solid #e2e8f0',
                                        }}
                                    >
                                        <Grid size={{xs: 12, md: 6}}>
                                            <TextField
                                                label="Tên người đại diện"
                                                required
                                                name="representativeName"
                                                value={formData.representativeName}
                                                onChange={handleInputChange}
                                                fullWidth
                                                size="small"
                                                error={!!formErrors.representativeName}
                                                helperText={formErrors.representativeName}
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 2,
                                                    },
                                                }}
                                        />
                                    </Grid>
                                        <Grid size={{xs: 12, md: 6}}>
                                            <TextField
                                                label="Logo URL"
                                                name="logoUrl"
                                                value={formData.logoUrl}
                                                onChange={handleInputChange}
                                                fullWidth
                                                size="small"
                                                placeholder="https://example.com/logo.png"
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 2,
                                                    },
                                                }}
                                                InputProps={{
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <CloudinaryUpload
                                                                inputId="school-registration-logo"
                                                                accept="image/*"
                                                                multiple={false}
                                                                onSuccess={([f]) => {
                                                                    if (f?.url) {
                                                                        setFormData((p) => ({...p, logoUrl: f.url}));
                                                                        enqueueSnackbar("Đã tải logo lên Cloudinary", {variant: "success"});
                                                                    }
                                                                }}
                                                                onError={(m) => enqueueSnackbar(m, {variant: "error"})}
                                                            >
                                                                {({inputId, loading}) => (
                                                                    <IconButton
                                                                        component="label"
                                                                        htmlFor={inputId}
                                                                        disabled={loading}
                                                                        size="small"
                                                                        sx={{
                                                                            borderRadius: 1,
                                                                            bgcolor: loading ? "rgba(25, 118, 210, 0.08)" : "transparent",
                                                                        }}
                                                                    >
                                                                        <CloudUploadIcon fontSize="small" />
                                                                    </IconButton>
                                                                )}
                                                            </CloudinaryUpload>
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                    </Grid>
                                        <Grid size={{xs: 12, md: 6}}>
                                            <TextField
                                                label="URL giấy phép kinh doanh"
                                                name="businessLicenseUrl"
                                                value={formData.businessLicenseUrl}
                                                onChange={handleInputChange}
                                                fullWidth
                                                size="small"
                                                placeholder="https://example.com/license.pdf"
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 2,
                                                    },
                                                }}
                                                InputProps={{
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <CloudinaryUpload
                                                                inputId="school-registration-business-license"
                                                                accept="image/*,application/pdf"
                                                                multiple={false}
                                                                onSuccess={([f]) => {
                                                                    if (f?.url) {
                                                                        setFormData((p) => ({...p, businessLicenseUrl: f.url}));
                                                                        enqueueSnackbar("Đã tải giấy phép lên Cloudinary", {variant: "success"});
                                                                    }
                                                                }}
                                                                onError={(m) => enqueueSnackbar(m, {variant: "error"})}
                                                            >
                                                                {({inputId, loading}) => (
                                                                    <IconButton
                                                                        component="label"
                                                                        htmlFor={inputId}
                                                                        disabled={loading}
                                                                        size="small"
                                                                        sx={{
                                                                            borderRadius: 1,
                                                                            bgcolor: loading ? "rgba(25, 118, 210, 0.08)" : "transparent",
                                                                        }}
                                                                    >
                                                                        <CloudUploadIcon fontSize="small" />
                                                                    </IconButton>
                                                                )}
                                                            </CloudinaryUpload>
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                            {formData.businessLicenseUrl ? (
                                                <Typography variant="caption" sx={{display: "block", mt: 0.75}}>
                                                    <a
                                                        href={formData.businessLicenseUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        style={{color: "#1976d2", textDecoration: "none"}}
                                                    >
                                                        Mở giấy phép
                                                    </a>
                                                </Typography>
                                            ) : null}
                                    </Grid>
                                </Grid>
                                </Box>

                                {/* Submit Button - Centered and smaller */}
                                <Box sx={{display: 'flex', justifyContent: 'center', pt: 1}}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        disabled={isSubmitting}
                                        sx={{
                                            minWidth: 170,
                                            py: 0.9,
                                            px: 3,
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            borderRadius: 2,
                                            background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)',
                                            boxShadow: '0 10px 30px rgba(37, 99, 235, 0.35)',
                                            '&:hover': {
                                                background: 'linear-gradient(90deg, #1d4ed8 0%, #1d4ed8 100%)',
                                                boxShadow: '0 12px 36px rgba(30, 64, 175, 0.45)',
                                            },
                                        }}
                                    >
                                        {isSubmitting ? (
                                            <CircularProgress size={24} color="inherit" />
                                        ) : (
                                            'Đăng ký'
                                        )}
                                    </Button>
                                </Box>
                            </Stack>
                        </Box>
                    )}
                </Paper>
            </Container>
        </Box>
    );
};

export default SchoolRegistrationForm;
