import React, {useEffect, useState} from 'react';
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
import backgroundLogin from '../../assets/backgroundLogin.png';
import {enqueueSnackbar} from 'notistack';
import {getProfile, updateProfile} from '../../services/AccountService.jsx';
import {useNavigate} from 'react-router-dom';
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

const ParentProfile = ({onBack}) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        gender: '',
        phone: '',
        relationship: '',
        workplace: '',
        occupation: '',
        currentAddress: '',
        idCardNumber: '',
        avatar: null,
    });
    const [initialData, setInitialData] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const res = await getProfile();
                if (res && res.status === 200) {
                    const rawBody = res.data?.body;
                    const body =
                        rawBody && typeof rawBody === 'string'
                            ? JSON.parse(rawBody)
                            : rawBody || {};

                    const parent = body.parent || {};

                    const fromApi = parent.avatar ?? null;
                    const fromGoogle = fromApi ? null : getStoredGooglePictureUrl();
                    const next = {
                        name: parent.name || body.name || '',
                        gender: parent.gender || '',
                        phone: parent.phone || body.phone || '',
                        relationship: parent.relationship || '',
                        workplace: parent.workplace || '',
                        occupation: parent.occupation || '',
                        currentAddress: parent.currentAddress || body.currentAddress || '',
                        idCardNumber: parent.idCardNumber || '',
                        avatar: fromApi || fromGoogle || null,
                    };

                    setFormData(next);
                    setInitialData(next);
                }
            } catch (error) {
                console.error('Error loading parent profile:', error);
                enqueueSnackbar('Không thể tải thông tin hồ sơ phụ huynh', {variant: 'error'});
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleInputChange = (e) => {
        const {name, value} = e.target;
        if (name === 'idCardNumber') {
            return;
        }
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
        if (formErrors[name]) {
            setFormErrors(prev => ({
                ...prev,
                [name]: '',
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

    const handleCancelEdit = () => {
        if (initialData) {
            setFormData(initialData);
        }
        setFormErrors({});
        setIsEditing(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isEditing) return;

        if (!validateForm()) {
            return;
        }

        setSaving(true);
        try {
            const trimmedName = formData.name.trim();
            const payload = {
                name: trimmedName,
                phone: formData.phone.trim(),
                currentAddress: formData.currentAddress.trim(),
                parentData: {
                    name: trimmedName,
                    gender: formData.gender,
                    relationship: formData.relationship,
                    workplace: formData.workplace.trim(),
                    occupation: formData.occupation.trim(),
                    idCardNumber: (initialData?.idCardNumber || formData.idCardNumber || '').trim(),
                    currentAddress: formData.currentAddress.trim(),
                    phone: formData.phone.trim(),
                    ...(formData.avatar ? {avatar: formData.avatar} : {}),
                },
            };

            const res = await updateProfile(payload);
            if (res && res.status === 200) {
                enqueueSnackbar('Cập nhật hồ sơ phụ huynh thành công!', {variant: 'success'});
                setInitialData(formData);
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Error updating parent profile:', error);
            const errorMessage =
                error?.response?.data?.message ||
                error?.message ||
                'Có lỗi xảy ra khi cập nhật thông tin. Vui lòng thử lại.';
            enqueueSnackbar(errorMessage, {variant: 'error'});
        } finally {
            setSaving(false);
        }
    };

    const isDisabled = !isEditing || loading;

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
                        background:
                            'radial-gradient(circle at top left, rgba(239,246,255,0.96) 0, rgba(239,246,255,0.98) 40%, #ffffff 100%)',
                        border: '1px solid #dbeafe',
                        backdropFilter: 'blur(10px)',
                        position: 'relative',
                    }}
                >
                    <Box component="form" onSubmit={handleSubmit}>
                        <Stack spacing={3}>
                            <Box
                                sx={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: '40px',
                                }}
                            >
                                <IconButton
                                    onClick={onBack || (() => navigate('/home'))}
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
                                    variant="h5"
                                    sx={{
                                        fontWeight: 700,
                                        color: '#1e293b',
                                        textAlign: 'center',
                                    }}
                                >
                                    Thông tin cá nhân
                                </Typography>
                            </Box>

                            {!loading && (
                                <Box sx={{display: 'flex', justifyContent: 'center', py: 0.5}}>
                                    <Avatar
                                        src={formData.avatar || undefined}
                                        imgProps={GOOGLE_AVATAR_IMG_PROPS}
                                        alt={formData.name || 'Phụ huynh'}
                                        sx={{width: 88, height: 88, boxShadow: '0 8px 24px rgba(15,23,42,0.12)'}}
                                    >
                                        {(formData.name || '?').charAt(0).toUpperCase()}
                                    </Avatar>
                                </Box>
                            )}

                            {loading ? (
                                <Box sx={{display: 'flex', justifyContent: 'center', py: 6}}>
                                    <CircularProgress />
                                </Box>
                            ) : (
                                <Grid container rowSpacing={2} columnSpacing={{xs: 1, sm: 2, md: 3}}>
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
                                            disabled={isDisabled}
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
                                            disabled={isDisabled}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                },
                                            }}
                                        >
                                            {genderOptions.map(option => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    </Grid>

                                    <Grid size={6}>
                                        <TextField
                                            label="Số CMND/CCCD"
                                            name="idCardNumber"
                                            value={formData.idCardNumber}
                                            onChange={handleInputChange}
                                            fullWidth
                                            size="small"
                                            error={!!formErrors.idCardNumber}
                                            helperText={formErrors.idCardNumber}
                                            disabled
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
                                            disabled={isDisabled}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                },
                                            }}
                                        >
                                            {relationshipOptions.map(option => (
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
                                            disabled={isDisabled}
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
                                            disabled={isDisabled}
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
                                            disabled={isDisabled}
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
                                            disabled={isDisabled}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                },
                                            }}
                                        />
                                    </Grid>
                                </Grid>
                            )}

                            <Box sx={{display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 1}}>
                                {!isEditing ? (
                                    <Button
                                        variant="contained"
                                        onClick={() => setIsEditing(true)}
                                        disabled={loading}
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
                                        Chỉnh sửa
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            variant="outlined"
                                            onClick={handleCancelEdit}
                                            disabled={saving}
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
                                            Hủy
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            disabled={saving}
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
                                            {saving ? <CircularProgress size={24} color="inherit" /> : 'Cập nhật'}
                                        </Button>
                                    </>
                                )}
                            </Box>
                        </Stack>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

export default ParentProfile;

