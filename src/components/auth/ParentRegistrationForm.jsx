import React, {useState, useEffect} from 'react';
import {
    Avatar,
    Box,
    Button,
    Container,
    Paper,
    Stack,
    TextField,
    Typography,
    CircularProgress,
    IconButton,
    MenuItem,
    Grid,
} from '@mui/material';
import {ArrowBack} from '@mui/icons-material';
import {updateProfile, signout} from '../../services/AccountService';
import backgroundLogin from '../../assets/backgroundLogin.png';
import {useNavigate} from 'react-router-dom';
import {enqueueSnackbar} from 'notistack';
import {getStoredGooglePictureUrl, GOOGLE_AVATAR_IMG_PROPS} from '../../utils/storedUserPicture';

const genderOptions = [
    {value: 'MALE', label: 'Nam'},
    {value: 'FEMALE', label: 'Nữ'},
    {value: 'OTHER', label: 'Khác'},
];

const relationshipOptions = [
    {value: 'FATHER', label: 'Cha'},
    {value: 'MOTHER', label: 'Mẹ'},
    {value: 'GUARDIAN', label: 'Người giám hộ'},
    {value: 'OTHER', label: 'Khác'},
];

const ParentRegistrationForm = ({email, name: initialName, onBack, isFirstLogin = false}) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: initialName || '',
        gender: '',
        phone: '',
        relationship: '',
        workplace: '',
        occupation: '',
        currentAddress: '',
        idCardNumber: '',
    });
    
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!initialName) {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    const parsed = JSON.parse(storedUser);
                    if (parsed?.name) {
                        setFormData(prev => ({
                            ...prev,
                            name: parsed.name,
                        }));
                    }
                } catch {
                    // ignore parse errors
                }
            }
        }
    }, [initialName]);

    const handleInputChange = (e) => {
        const {name, value} = e.target;
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
        
        if (!formData.name.trim()) {
            errors.name = 'Họ và tên là bắt buộc';
        }
        if (!formData.gender) {
            errors.gender = 'Giới tính là bắt buộc';
        }
        if (!formData.phone.trim()) {
            errors.phone = 'Số điện thoại là bắt buộc';
        } else if (!/^[0-9]{10,11}$/.test(formData.phone.trim())) {
            errors.phone = 'Số điện thoại không hợp lệ';
        }
        if (!formData.relationship) {
            errors.relationship = 'Mối quan hệ với học sinh là bắt buộc';
        }
        if (!formData.occupation.trim()) {
            errors.occupation = 'Nghề nghiệp là bắt buộc';
        }
        if (!formData.workplace.trim()) {
            errors.workplace = 'Nơi làm việc là bắt buộc';
        }
        if (!formData.currentAddress.trim()) {
            errors.currentAddress = 'Địa chỉ hiện tại là bắt buộc';
        }
        if (!formData.idCardNumber.trim()) {
            errors.idCardNumber = 'Số CMND/CCCD là bắt buộc';
        } else if (!/^[0-9]{9,12}$/.test(formData.idCardNumber.trim())) {
            errors.idCardNumber = 'Số CMND/CCCD không hợp lệ (9-12 chữ số)';
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
            const googleAvatar = getStoredGooglePictureUrl();
            const profilePayload = {
                parentData: {
                    gender: formData.gender,
                    name: formData.name.trim(),
                    phone: formData.phone.trim(),
                    relationship: formData.relationship,
                    workplace: formData.workplace.trim(),
                    occupation: formData.occupation.trim(),
                    currentAddress: formData.currentAddress.trim(),
                    idCardNumber: formData.idCardNumber.trim(),
                    ...(googleAvatar ? {avatar: googleAvatar} : {}),
                },
            };

            const response = await updateProfile(profilePayload);
            
            if (response && response.status === 200) {
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    try {
                        const parsed = JSON.parse(storedUser);
                        localStorage.setItem('user', JSON.stringify({...parsed, firstLogin: false}));
                    } catch {
                        // ignore
                    }
                }

                enqueueSnackbar('Cập nhật thông tin phụ huynh thành công!', {variant: 'success'});
                setTimeout(() => {
                    navigate('/home');
                }, 800);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            const errorMessage = error?.response?.data?.message || error?.message || 'Có lỗi xảy ra khi cập nhật thông tin. Vui lòng thử lại.';
            enqueueSnackbar(errorMessage, {variant: 'error'});
            setIsSubmitting(false);
        }
    };

    const handleExit = async () => {
        try {
            await signout();
        } catch (error) {
            console.error('Error during logout:', error);
        } finally {
            localStorage.removeItem('user');
            navigate('/login');
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
                py: {xs: 2, md: 3},
                px: {xs: 2, md: 0},
                backgroundImage: `linear-gradient(135deg, rgba(15,23,42,0.55), rgba(15,23,42,0.35)), url(${backgroundLogin})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
                overflow: 'auto',
            }}
        >
            <Container maxWidth="md">
                <Paper
                    elevation={8}
                    sx={{
                        p: 4,
                        borderRadius: 4,
                        background: 'radial-gradient(circle at top left, rgba(239,246,255,0.96) 0, rgba(239,246,255,0.98) 40%, #ffffff 100%)',
                        border: '1px solid #dbeafe',
                        backdropFilter: 'blur(10px)',
                        position: 'relative',
                    }}
                >
                    <Box component="form" onSubmit={handleSubmit}>
                        <Stack spacing={3}>
                            <Stack spacing={0.5} alignItems="center" sx={{width: '100%'}}>
                                <Box sx={{position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40px', width: '100%'}}>
                                    {!isFirstLogin && (
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
                                    )}
                                    <Typography 
                                        variant="h5" 
                                        sx={{
                                            fontWeight: 700, 
                                            color: '#1e293b',
                                            textAlign: 'center',
                                        }}
                                    >
                                        Điền thông tin phụ huynh
                                    </Typography>
                                </Box>

                                <Typography 
                                    variant="body2" 
                                    sx={{
                                        color: '#64748b',
                                        textAlign: 'center',
                                        lineHeight: 1.45,
                                    }}
                                >
                                    Vui lòng điền đầy đủ thông tin để hoàn tất hồ sơ của bạn.
                                </Typography>
                            </Stack>

                            <Box sx={{display: 'flex', justifyContent: 'center', py: 0.5}}>
                                <Avatar
                                    src={getStoredGooglePictureUrl() || undefined}
                                    imgProps={GOOGLE_AVATAR_IMG_PROPS}
                                    alt={formData.name || 'Phụ huynh'}
                                    sx={{width: 88, height: 88, boxShadow: '0 8px 24px rgba(15,23,42,0.12)'}}
                                >
                                    {(formData.name || '?').trim().slice(0, 1).toUpperCase() || '?'}
                                </Avatar>
                            </Box>

                            <Grid container rowSpacing={2} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
                                <Grid size={12}>
                                    <TextField
                                        label="Họ và tên *"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        fullWidth
                                        size="small"
                                        error={!!formErrors.name}
                                        helperText={formErrors.name}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                            },
                                        }}
                                    />
                                </Grid>

                                <Grid size={6}>
                                    <TextField
                                        select
                                        label="Giới tính *"
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleInputChange}
                                        fullWidth
                                        size="small"
                                        error={!!formErrors.gender}
                                        helperText={formErrors.gender}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                            },
                                        }}
                                    >
                                        {genderOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>

                                <Grid size={6}>
                                    <TextField
                                        label="Số CMND/CCCD *"
                                        name="idCardNumber"
                                        value={formData.idCardNumber}
                                        onChange={handleInputChange}
                                        fullWidth
                                        size="small"
                                        error={!!formErrors.idCardNumber}
                                        helperText={formErrors.idCardNumber}
                                        placeholder="Nhập số CMND/CCCD"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                            },
                                        }}
                                    />
                                </Grid>

                                <Grid size={6}>
                                    <TextField
                                        select
                                        label="Mối quan hệ với học sinh *"
                                        name="relationship"
                                        value={formData.relationship}
                                        onChange={handleInputChange}
                                        fullWidth
                                        size="small"
                                        error={!!formErrors.relationship}
                                        helperText={formErrors.relationship}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                            },
                                        }}
                                    >
                                        {relationshipOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>

                                <Grid size={6}>
                                    <TextField
                                        label="Số điện thoại *"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        fullWidth
                                        size="small"
                                        error={!!formErrors.phone}
                                        helperText={formErrors.phone}
                                        placeholder="Nhập số điện thoại"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                            },
                                        }}
                                    />
                                </Grid>

                                <Grid size={6}>
                                    <TextField
                                        label="Nghề nghiệp *"
                                        name="occupation"
                                        value={formData.occupation}
                                        onChange={handleInputChange}
                                        fullWidth
                                        size="small"
                                        error={!!formErrors.occupation}
                                        helperText={formErrors.occupation}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                            },
                                        }}
                                    />
                                </Grid>

                                <Grid size={6}>
                                    <TextField
                                        label="Nơi làm việc *"
                                        name="workplace"
                                        value={formData.workplace}
                                        onChange={handleInputChange}
                                        fullWidth
                                        size="small"
                                        error={!!formErrors.workplace}
                                        helperText={formErrors.workplace}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                            },
                                        }}
                                    />
                                </Grid>

                                <Grid size={12}>
                                    <TextField
                                        label="Địa chỉ hiện tại *"
                                        name="currentAddress"
                                        value={formData.currentAddress}
                                        onChange={handleInputChange}
                                        fullWidth
                                        size="small"
                                        multiline
                                        rows={3}
                                        error={!!formErrors.currentAddress}
                                        helperText={formErrors.currentAddress}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                            },
                                        }}
                                    />
                                </Grid>
                            </Grid>

                            <Box sx={{display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 1}}>
                                <Button
                                variant="outlined"
                                onClick={isFirstLogin ? handleExit : onBack}
                                    sx={{
                                        py: 1.1,
                                        px: 3,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        borderRadius: 2,
                                        borderColor: '#64748b',
                                        color: '#64748b',
                                        '&:hover': {
                                            borderColor: '#475569',
                                            bgcolor: 'rgba(100, 116, 139, 0.08)',
                                        },
                                    }}
                                >
                                    {isFirstLogin ? 'Thoát' : 'Đóng'}
                                </Button>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={isSubmitting}
                                    sx={{
                                        py: 1.1,
                                        px: 4,
                                        textTransform: 'none',
                                        fontWeight: 700,
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
                                        'Lưu thông tin'
                                    )}
                                </Button>
                            </Box>
                        </Stack>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

export default ParentRegistrationForm;
