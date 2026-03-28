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
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import {checkTaxCode, registerSchool} from '../../services/AuthService';
import backgroundLogin from '../../assets/backgroundLogin.png';
import {useNavigate} from 'react-router-dom';
import {enqueueSnackbar} from 'notistack';
import {showErrorSnackbar, showSuccessSnackbar} from '../ui/AppSnackbar.jsx';
import CloudinaryUpload from '../ui/CloudinaryUpload.jsx';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {BRAND_NAVY, BRAND_SKY, BRAND_SKY_LIGHT} from '../../constants/homeLandingTheme';

const HEADER_MUTED = 'rgba(52,102,118,0.82)';

const SchoolRegistrationForm = ({email, onBack}) => {
    const navigate = useNavigate();

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
    const taxCodeRequestIdRef = useRef(0);
    const lastCheckedTaxCodeRef = useRef('');
    const taxCodeCacheRef = useRef(new Map());
    const taxCodeCooldownUntilRef = useRef(0);
    const [isCheckingTaxCode, setIsCheckingTaxCode] = useState(false);
    const [taxCodeLookupMessage, setTaxCodeLookupMessage] = useState('');
    const [lastTaxCodeCheckResult, setLastTaxCodeCheckResult] = useState({
        taxCode: '',
        isValid: false
    });

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
        if (digits.length <= 2) return digits;
        if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
        return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
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

    const handleInputChange = (e) => {
        const {name} = e.target;
        const value = name === 'foundingDate' ? formatFoundingDateInput(e.target.value) : e.target.value;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (name === 'taxCode') {
            const normalizedTaxCode = value.trim();
            setTaxCodeLookupMessage('');
            setLastTaxCodeCheckResult({taxCode: normalizedTaxCode, isValid: false});
        }
        if (formErrors[name]) {
            setFormErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const isTaxCodeFormatValid = (taxCode) => /^\d{10}(\d{3})?$/.test(taxCode);

    const getAutoFillDataFromTaxCode = (taxCodeData) => ({
        schoolName: taxCodeData?.name || taxCodeData?.companyName || '',
        campusAddress: taxCodeData?.address || taxCodeData?.companyAddress || '',
        campusPhone: taxCodeData?.phone || taxCodeData?.phoneNumber || '',
        representativeName: taxCodeData?.representative || taxCodeData?.representativeName || '',
    });

    const handleTaxCodeCheck = async () => {
        const taxCodeValue = formData.taxCode.trim();

        if (!taxCodeValue) {
            setFormErrors((prev) => ({...prev, taxCode: 'Mã số thuế là bắt buộc'}));
            setTaxCodeLookupMessage('');
            setLastTaxCodeCheckResult({taxCode: '', isValid: false});
            return;
        }

        if (!isTaxCodeFormatValid(taxCodeValue)) {
            setFormErrors((prev) => ({...prev, taxCode: 'Mã số thuế gồm 10 hoặc 13 chữ số'}));
            setTaxCodeLookupMessage('');
            setLastTaxCodeCheckResult({taxCode: taxCodeValue, isValid: false});
            return;
        }

        const cachedResult = taxCodeCacheRef.current.get(taxCodeValue);
        if (cachedResult) {
            if (cachedResult.isValid) {
                setTaxCodeLookupMessage('Mã số thuế hợp lệ');
                setFormErrors((prev) => ({...prev, taxCode: ''}));
                setFormData((prev) => ({
                    ...prev,
                    schoolName: cachedResult.schoolName || prev.schoolName,
                    campusAddress: cachedResult.campusAddress || prev.campusAddress,
                    campusPhone: cachedResult.campusPhone || prev.campusPhone,
                    representativeName: cachedResult.representativeName || prev.representativeName,
                }));
                enqueueSnackbar('Mã số thuế hợp lệ', {variant: 'success'});
            } else {
                setTaxCodeLookupMessage('');
                setFormErrors((prev) => ({...prev, taxCode: cachedResult.message || 'Mã số thuế không hợp lệ'}));
                enqueueSnackbar(cachedResult.message || 'Mã số thuế không hợp lệ', {variant: 'error'});
            }
            lastCheckedTaxCodeRef.current = taxCodeValue;
            setLastTaxCodeCheckResult({taxCode: taxCodeValue, isValid: cachedResult.isValid});
            return;
        }

        if (Date.now() < taxCodeCooldownUntilRef.current) {
            setTaxCodeLookupMessage('');
            setFormErrors((prev) => ({
                ...prev,
                taxCode: 'Đang quá nhiều lượt kiểm tra. Vui lòng thử lại sau ít giây.'
            }));
            setLastTaxCodeCheckResult({taxCode: taxCodeValue, isValid: false});
            enqueueSnackbar('Hệ thống tra cứu đang quá tải, vui lòng thử lại sau.', {variant: 'warning'});
            return;
        }

        const requestId = taxCodeRequestIdRef.current + 1;
        taxCodeRequestIdRef.current = requestId;
        setIsCheckingTaxCode(true);
        setTaxCodeLookupMessage('Đang kiểm tra mã số thuế...');

        try {
            const taxCodeCheck = await checkTaxCode(taxCodeValue);
            if (taxCodeRequestIdRef.current !== requestId) return;

            if (taxCodeCheck?.code === '00' && taxCodeCheck?.data) {
                lastCheckedTaxCodeRef.current = taxCodeValue;
                setLastTaxCodeCheckResult({taxCode: taxCodeValue, isValid: true});
                setTaxCodeLookupMessage('Mã số thuế hợp lệ');
                setFormErrors((prev) => ({...prev, taxCode: ''}));

                const autoFillData = getAutoFillDataFromTaxCode(taxCodeCheck.data);
                taxCodeCacheRef.current.set(taxCodeValue, {
                    isValid: true,
                    ...autoFillData
                });
                setFormData((prev) => ({
                    ...prev,
                    schoolName: autoFillData.schoolName || prev.schoolName,
                    campusAddress: autoFillData.campusAddress || prev.campusAddress,
                    campusPhone: autoFillData.campusPhone || prev.campusPhone,
                    representativeName: autoFillData.representativeName || prev.representativeName,
                }));
                enqueueSnackbar('Mã số thuế hợp lệ, đã tự động điền thông tin liên quan.', {variant: 'success'});
            } else {
                const errorMessage = taxCodeCheck?.desc || 'Mã số thuế không hợp lệ';
                taxCodeCacheRef.current.set(taxCodeValue, {
                    isValid: false,
                    message: errorMessage
                });
                setTaxCodeLookupMessage('');
                setFormErrors((prev) => ({...prev, taxCode: errorMessage}));
                setLastTaxCodeCheckResult({taxCode: taxCodeValue, isValid: false});
                enqueueSnackbar(errorMessage, {variant: 'error'});
            }
        } catch (error) {
            if (taxCodeRequestIdRef.current !== requestId) return;
            setTaxCodeLookupMessage('');
            const isTooManyRequests = error?.status === 429 || error?.response?.status === 429;
            if (isTooManyRequests) {
                taxCodeCooldownUntilRef.current = Date.now() + 15000;
            }
            const errorMessage = isTooManyRequests
                ? 'Hệ thống tra cứu đang quá tải (429). Vui lòng thử lại sau 15 giây.'
                : 'Có lỗi khi kiểm tra mã số thuế. Vui lòng thử lại.';
            setFormErrors((prev) => ({
                ...prev,
                taxCode: errorMessage
            }));
            setLastTaxCodeCheckResult({taxCode: taxCodeValue, isValid: false});
            enqueueSnackbar(errorMessage, {variant: 'error'});
        } finally {
            if (taxCodeRequestIdRef.current === requestId) {
                setIsCheckingTaxCode(false);
            }
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
        const hasFoundingDateInput = /\d/.test(formData.foundingDate);
        if (hasFoundingDateInput && !normalizeFoundingDate(formData.foundingDate)) {
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
            const taxCodeValue = formData.taxCode.trim();

            if (!isTaxCodeFormatValid(taxCodeValue)) {
                setFormErrors((prev) => ({
                    ...prev,
                    taxCode: 'Mã số thuế gồm 10 hoặc 13 chữ số',
                }));
                setIsSubmitting(false);
                return;
            }

            if (!(lastTaxCodeCheckResult.taxCode === taxCodeValue && lastTaxCodeCheckResult.isValid)) {
                setFormErrors((prev) => ({
                    ...prev,
                    taxCode: 'Vui lòng chờ hệ thống xác thực mã số thuế hợp lệ trước khi đăng ký.',
                }));
                showErrorSnackbar('Vui lòng nhập mã số thuế hợp lệ và chờ hệ thống kiểm tra xong.');
                setIsSubmitting(false);
                return;
            }

            const registerPayload = {
                email: email,
                role: 'SCHOOL',
                schoolRequest: {
                    description: formData.description.trim(),
                    schoolName: formData.schoolName.trim(),
                    campusName: formData.campusName.trim(),
                    campusAddress: formData.campusAddress.trim(),
                    campusPhone: formData.campusPhone.trim(),
                    taxCode: taxCodeValue,
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
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                py: {xs: 2, md: 3},
                px: {xs: 2, md: 0},
                backgroundImage: `linear-gradient(135deg, rgba(45,95,115,0.46), rgba(45,95,115,0.26)), url(${backgroundLogin})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
                overflow: 'hidden',
            }}
        >
            <Container maxWidth="lg" sx={{maxWidth: '960px !important', mb: {xs: 2, md: 3}}}>
                <Paper
                    elevation={8}
                    sx={{
                        p: {xs: 1, sm: 1.25, md: 1.5},
                        maxHeight: {
                            xs: 'calc(100vh - 64px - 16px)',
                            sm: 'calc(100vh - 64px - 24px)',
                            md: 'calc(100vh - 64px - 48px)',
                        },
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        borderRadius: 2.5,
                        background: '#ffffff',
                        border: '1px solid rgba(85,179,217,0.28)',
                        boxShadow: '0 12px 28px rgba(45, 95, 115, 0.12)',
                        position: 'relative',
                        '& .MuiFormLabel-asterisk': {
                            color: '#111827 !important',
                        },
                        '& .MuiInputBase-input': {fontSize: '0.9rem', py: 0.78},
                        '& .MuiFormHelperText-root': {marginTop: 0.35, fontSize: '0.72rem', lineHeight: 1.25},
                        '& .MuiInputLabel-root': {fontSize: '0.86rem', color: '#64748b'},
                        '& .MuiInputLabel-root.Mui-focused': {color: BRAND_NAVY},
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: '#ffffff',
                            transition: 'all 0.2s ease',
                            '& fieldset': {
                                borderColor: 'rgba(148,163,184,0.55)',
                            },
                            '&:hover fieldset': {
                                borderColor: 'rgba(115,198,217,0.85)',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: BRAND_SKY,
                                borderWidth: '1px',
                                boxShadow: '0 0 0 2px rgba(85, 179, 217, 0.16)',
                            },
                        },
                    }}
                >
                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        sx={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}
                    >
                        <Box
                            sx={{
                                flexShrink: 0,
                                mx: {xs: -0.5, sm: -0.75, md: -0.75},
                                mt: {xs: -0.5, sm: -0.65, md: -0.65},
                                px: {xs: 0.5, sm: 0.75, md: 0.75},
                                pt: 0.5,
                                pb: 1,
                                bgcolor: '#fff',
                                borderBottom: '1px solid rgba(45, 95, 115, 0.12)',
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: 40,
                                }}
                            >
                                <IconButton
                                    onClick={onBack}
                                    aria-label="Quay lại"
                                    sx={{
                                        position: 'absolute',
                                        left: 0,
                                        color: HEADER_MUTED,
                                        '&:hover': {
                                            bgcolor: 'rgba(85, 179, 217, 0.12)',
                                            color: BRAND_NAVY,
                                        },
                                    }}
                                >
                                    <ArrowBack/>
                                </IconButton>
                                <Typography
                                    variant="h6"
                                    component="h1"
                                    sx={{
                                        fontWeight: 700,
                                        color: BRAND_NAVY,
                                        textAlign: 'center',
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    Đăng ký trường học
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden'}}>
                            <Stack spacing={1.2}>
                                <Box>
                                    <Typography
                                        variant="subtitle1"
                                        sx={{
                                            fontWeight: 700,
                                            color: '#0f172a',
                                            mb: 0.55,
                                            fontSize: '0.84rem',
                                            letterSpacing: '0.2px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            px: 1,
                                            py: 0.35,
                                            borderRadius: 999,
                                            bgcolor: 'rgba(85,179,217,0.14)',
                                            border: `1px solid ${BRAND_SKY_LIGHT}`,
                                            lineHeight: 1.2,
                                        }}
                                    >
                                        Mã số thuế
                                    </Typography>
                                    <Divider sx={{mb: 0.85, borderColor: '#e2e8f0'}} />
                                    <Grid
                                        container
                                        rowSpacing={1}
                                        columnSpacing={{xs: 1, sm: 1.25, md: 2}}
                                        sx={{
                                            p: {xs: 0.8, sm: 0.95},
                                            borderRadius: 2,
                                            bgcolor: 'rgba(214,244,252,0.35)',
                                            border: '1px solid rgba(136,232,242,0.45)',
                                            mb: 0.95,
                                        }}
                                    >
                                        <Grid size={{xs: 12}}>
                                            <TextField
                                                label="Mã số thuế"
                                                required
                                                name="taxCode"
                                                value={formData.taxCode}
                                                onChange={handleInputChange}
                                                fullWidth
                                                size="small"
                                                error={!!formErrors.taxCode}
                                                helperText={formErrors.taxCode || taxCodeLookupMessage || 'Nhập mã số thuế rồi bấm Kiểm tra'}
                                                FormHelperTextProps={{sx: {minHeight: 20}}}
                                                InputProps={{
                                                    endAdornment: (
                                                        <InputAdornment
                                                            position="end"
                                                            sx={{
                                                                m: 0,
                                                                ml: 0.75,
                                                                mr: '-2px',
                                                                maxHeight: 'none',
                                                                alignSelf: 'stretch',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                            }}
                                                        >
                                                            <IconButton
                                                                size="small"
                                                                onClick={handleTaxCodeCheck}
                                                                disabled={isCheckingTaxCode}
                                                                sx={{
                                                                    color: '#16a34a',
                                                                    bgcolor: 'transparent',
                                                                    borderRadius: 1.5,
                                                                    border: '1px solid rgba(22, 163, 74, 0.42)',
                                                                    boxShadow: '0 1px 4px rgba(22, 163, 74, 0.15)',
                                                                    '&:hover': {
                                                                        bgcolor: 'rgba(22, 163, 74, 0.08)',
                                                                        borderColor: 'rgba(22, 163, 74, 0.65)',
                                                                        boxShadow: '0 2px 8px rgba(22, 163, 74, 0.22)',
                                                                    },
                                                                    '&.Mui-disabled': {
                                                                        color: 'rgba(22, 163, 74, 0.38)',
                                                                        borderColor: 'rgba(15, 23, 42, 0.1)',
                                                                        boxShadow: 'none',
                                                                    },
                                                                }}
                                                                aria-label="Kiểm tra mã số thuế"
                                                            >
                                                                {isCheckingTaxCode ? (
                                                                    <CircularProgress size={14} sx={{color: '#16a34a'}} />
                                                                ) : (
                                                                    <CheckCircleOutlineIcon fontSize="small" />
                                                                )}
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ),
                                                }}
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 2,
                                                        paddingRight: '0px',
                                                        '& .MuiInputAdornment-root.MuiInputAdornment-positionEnd': {
                                                            marginRight: 0,
                                                        },
                                                    },
                                                }}
                                            />
                                        </Grid>
                                    </Grid>

                                    <Typography 
                                        variant="subtitle1" 
                                        sx={{
                                            fontWeight: 700,
                                            color: '#0f172a',
                                            mb: 0.55,
                                            fontSize: '0.84rem',
                                            letterSpacing: '0.2px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            px: 1,
                                            py: 0.35,
                                            borderRadius: 999,
                                            bgcolor: 'rgba(85,179,217,0.14)',
                                            border: `1px solid ${BRAND_SKY_LIGHT}`,
                                            lineHeight: 1.2,
                                        }}
                                    >
                                        Thông tin trường
                                    </Typography>
                                    <Divider sx={{mb: 0.85, borderColor: '#e2e8f0'}} />
                                    <Grid
                                        container
                                        rowSpacing={1}
                                        columnSpacing={{xs: 1, sm: 1.25, md: 2}}
                                        sx={{
                                            p: {xs: 0.8, sm: 0.95},
                                            borderRadius: 2,
                                            bgcolor: 'rgba(214,244,252,0.35)',
                                            border: '1px solid rgba(136,232,242,0.45)',
                                        }}
                                    >
                                        <Grid size={{xs: 12, md: 6}}>
                                            <Stack spacing={1.2}>
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
                                                rows={4}
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
                                    </Grid>
                                </Box>

                                <Box>
                                    <Typography 
                                        variant="subtitle1" 
                                        sx={{
                                            fontWeight: 700,
                                            color: '#0f172a',
                                            mb: 0.55,
                                            fontSize: '0.84rem',
                                            letterSpacing: '0.2px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            px: 1,
                                            py: 0.35,
                                            borderRadius: 999,
                                            bgcolor: 'rgba(85,179,217,0.14)',
                                            border: `1px solid ${BRAND_SKY_LIGHT}`,
                                            lineHeight: 1.2,
                                        }}
                                    >
                                        Thông tin liên hệ
                                    </Typography>
                                    <Divider sx={{mb: 0.85, borderColor: '#e2e8f0'}} />
                                    <Grid
                                        container
                                        rowSpacing={1}
                                        columnSpacing={{xs: 1, sm: 1.25, md: 2}}
                                        sx={{
                                            p: {xs: 0.8, sm: 0.95},
                                            borderRadius: 2,
                                            bgcolor: 'rgba(214,244,252,0.35)',
                                            border: '1px solid rgba(136,232,242,0.45)',
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
                                            rows={2}
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
                                            <Stack spacing={1.2} sx={{width: '100%'}}>
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

                                <Box>
                                    <Typography 
                                        variant="subtitle1" 
                                        sx={{
                                            fontWeight: 700,
                                            color: '#0f172a',
                                            mb: 0.55,
                                            fontSize: '0.84rem',
                                            letterSpacing: '0.2px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            px: 1,
                                            py: 0.35,
                                            borderRadius: 999,
                                            bgcolor: 'rgba(85,179,217,0.14)',
                                            border: `1px solid ${BRAND_SKY_LIGHT}`,
                                            lineHeight: 1.2,
                                        }}
                                    >
                                        Thông tin pháp lý
                                    </Typography>
                                    <Divider sx={{mb: 0.85, borderColor: '#e2e8f0'}} />
                                    <Grid
                                        container
                                        rowSpacing={1}
                                        columnSpacing={{xs: 1, sm: 1.25, md: 2}}
                                        sx={{
                                            p: {xs: 0.8, sm: 0.95},
                                            borderRadius: 2,
                                            bgcolor: 'rgba(214,244,252,0.35)',
                                            border: '1px solid rgba(136,232,242,0.45)',
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
                                                                            color: BRAND_NAVY,
                                                                            bgcolor: loading ? 'rgba(85,179,217,0.14)' : 'transparent',
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
                                                label="Ảnh giấy phép kinh doanh"
                                                name="businessLicenseUrl"
                                                value={formData.businessLicenseUrl}
                                                onChange={handleInputChange}
                                                fullWidth
                                                size="small"
                                                placeholder="URL ảnh hoặc tải JPG/PNG"
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
                                                                accept="image/*"
                                                                multiple={false}
                                                                onSuccess={([f]) => {
                                                                    if (f?.url) {
                                                                        setFormData((p) => ({...p, businessLicenseUrl: f.url}));
                                                                        enqueueSnackbar("Đã tải ảnh lên", {variant: "success"});
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
                                                                            color: BRAND_NAVY,
                                                                            bgcolor: loading ? 'rgba(85,179,217,0.14)' : 'transparent',
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
                                                        style={{color: BRAND_NAVY, textDecoration: "none"}}
                                                    >
                                                        Mở giấy phép
                                                    </a>
                                                </Typography>
                                            ) : null}
                                    </Grid>
                                </Grid>
                                </Box>

                                <Box sx={{display: 'flex', justifyContent: 'center', pt: 0.75}}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        disabled={isSubmitting}
                                        sx={{
                                            minWidth: 170,
                                            py: 0.82,
                                            px: 3,
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            borderRadius: 2,
                                            background: `linear-gradient(90deg, ${BRAND_NAVY} 0%, ${BRAND_SKY} 100%)`,
                                            boxShadow: '0 8px 18px rgba(45,95,115,0.24)',
                                            '&:hover': {
                                                background: `linear-gradient(90deg, #265a6b 0%, ${BRAND_NAVY} 100%)`,
                                                boxShadow: '0 10px 20px rgba(45,95,115,0.3)',
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
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

export default SchoolRegistrationForm;
