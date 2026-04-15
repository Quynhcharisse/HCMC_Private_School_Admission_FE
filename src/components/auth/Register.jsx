import React, {useState} from 'react';
import {signup} from '../../services/AuthService';
import {ROLES} from '../../constants/roles';
import RegisterGoogle from '../ui/RegisterGoogle';
import {
    Box,
    Button,
    Container,
    Divider,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
    CircularProgress,
    IconButton,
} from '@mui/material';
import {ArrowBack} from '@mui/icons-material';
import backgroundLogin from '../../assets/backgroundLogin.png';
import SchoolRegistrationForm from './SchoolRegistrationForm';
import {Link as RouterLink, useNavigate} from 'react-router-dom';
import {enqueueSnackbar} from 'notistack';
import {showSuccessSnackbar} from '../ui/AppSnackbar.jsx';
import {APP_PRIMARY_DARK, BRAND_NAVY, BRAND_SKY, landingSectionShadow} from '../../constants/homeLandingTheme';

const LOGIN_MUTED = 'rgba(30, 58, 138, 0.82)';

const roleOptions = [
    {value: ROLES.PARENT, label: 'Phụ huynh'},
    {value: ROLES.SCHOOL, label: 'Nhà trường'},
];

const Register = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [picture, setPicture] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleGoogleSuccess = (data) => {
        setEmail(data.email);
        setName(data.name || '');
        setPicture(data.picture?.replace('=s96-c', '=s200-c') || '');
        setIsEmailVerified(true);
        showSuccessSnackbar('Xác thực email thành công. Vui lòng chọn vai trò để tiếp tục đăng ký.');
        setStep(2);
    };

    const handleGoogleError = () => {
        console.error('Đăng nhập Google thất bại');
    };

    const handleRoleSelect = async () => {
        if (!selectedRole) {
            enqueueSnackbar('Vui lòng chọn vai trò (Phụ huynh hoặc Nhà trường).', {variant: 'warning'});
            return;
        }

        if (selectedRole === ROLES.SCHOOL) {
            setStep(3);
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await signup(email, selectedRole, picture);

            if (response && response.status === 200) {
                const message = 'Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.';
                showSuccessSnackbar(message);
                navigate('/login', {replace: true});
            }
        } catch (error) {
            console.error('Lỗi đăng ký:', error);
            const errorMessage = error?.response?.data?.message || error?.message || 'Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.';

            if (error?.response?.status === 400 || errorMessage.includes('đã tồn tại') || errorMessage.includes('already exists')) {
                enqueueSnackbar('Tài khoản đã tồn tại. Vui lòng đăng nhập.', {variant: 'error'});
                navigate('/login');
            } else {
                enqueueSnackbar(errorMessage, {variant: 'error'});
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackToRoleSelection = () => {
        setStep(2);
    };

    if (step === 3) {
        if (selectedRole === ROLES.SCHOOL) {
            return <SchoolRegistrationForm email={email} onBack={handleBackToRoleSelection} />;
        }
    }

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
                backgroundImage: `linear-gradient(135deg, rgba(51,65,85,0.55), rgba(51,65,85,0.35)), url(${backgroundLogin})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
                overflow: 'hidden',
                animation: 'fadeInUp 0.6s ease-out',
                '@keyframes fadeInUp': {
                    '0%': {opacity: 0, transform: 'translateY(10px)'},
                    '100%': {opacity: 1, transform: 'translateY(0)'},
                },
            }}
        >
            <Container maxWidth="md" sx={{width: '100%'}}>
                <Stack
                    direction={{xs: 'column', md: 'row'}}
                    spacing={{xs: 3, md: 4}}
                    alignItems="stretch"
                    sx={{maxWidth: 920, mx: 'auto'}}
                >
                    <Box
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            borderRadius: '28px',
                            px: {xs: 3, sm: 4},
                            py: {xs: 3, sm: 4},
                            textAlign: 'left',
                            backgroundColor: 'rgba(15, 23, 42, 0.78)',
                            backdropFilter: 'blur(18px)',
                            WebkitBackdropFilter: 'blur(18px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: '0 24px 56px rgba(0, 0, 0, 0.28)',
                        }}
                    >
                        <Typography
                            variant="h4"
                            component="h2"
                            sx={{
                                fontWeight: 700,
                                color: '#2962FF',
                                fontSize: {xs: '1.5rem', sm: '1.75rem'},
                                letterSpacing: '-0.02em',
                                lineHeight: 1.2,
                                mb: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                flexWrap: 'wrap',
                            }}
                        >
                            <Box component="span" sx={{fontSize: '1.35em', lineHeight: 1}} aria-hidden>
                                ✨
                            </Box>
                            Tạo tài khoản
                        </Typography>
                        <Typography
                            variant="body1"
                            sx={{
                                color: 'rgba(255, 255, 255, 0.95)',
                                lineHeight: 1.65,
                                mb: 2.5,
                            }}
                        >
                            Đăng ký để đồng hành cùng con và nhà trường trên nền tảng EduBridgeHCM — theo dõi tuyển sinh và
                            hành trình học tập thuận tiện hơn.
                        </Typography>
                        <Box
                            sx={{
                                borderLeft: '3px solid rgba(255, 255, 255, 0.95)',
                                pl: 2,
                                py: 0.25,
                            }}
                        >
                            <Typography variant="body2" sx={{color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.6}}>
                                Tài khoản Google của bạn sẽ được dùng để xác thực, chúng tôi không chia sẻ thông tin với
                                bên thứ ba ngoài hệ thống nhà trường.
                            </Typography>
                        </Box>
                    </Box>

                    <Paper
                        elevation={0}
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            width: '100%',
                            maxWidth: {xs: 440, md: 'none'},
                            mx: {xs: 'auto', md: 0},
                            p: {xs: 3, sm: 4},
                            borderRadius: 5,
                            bgcolor: '#fff',
                            border: '1px solid rgba(51,65,85,0.08)',
                            boxShadow: landingSectionShadow(4),
                            backdropFilter: 'blur(12px)',
                            backgroundImage: `
                                radial-gradient(ellipse 120% 80% at 0% 0%, rgba(85,179,217,0.08) 0%, transparent 55%),
                                radial-gradient(ellipse 90% 70% at 100% 100%, rgba(59,130,246,0.06) 0%, transparent 50%)
                            `,
                        }}
                    >
                        <Stack spacing={3}>
                            <Box sx={{position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 40}}>
                                {step === 2 && (
                                    <IconButton
                                        onClick={() => setStep(1)}
                                        aria-label="Quay lại"
                                        sx={{
                                            position: 'absolute',
                                            left: 0,
                                            color: LOGIN_MUTED,
                                            '&:hover': {
                                                bgcolor: 'rgba(85, 179, 217, 0.12)',
                                                color: BRAND_NAVY,
                                            },
                                        }}
                                    >
                                        <ArrowBack/>
                                    </IconButton>
                                )}
                                <Typography
                                    variant="h5"
                                    component="h1"
                                    sx={{
                                        fontWeight: 700,
                                        color: BRAND_NAVY,
                                        letterSpacing: '-0.02em',
                                        textAlign: 'center',
                                    }}
                                >
                                    {step === 1 ? 'Đăng ký tài khoản' : 'Chọn vai trò'}
                                </Typography>
                            </Box>

                            {step === 1 ? (
                                <>
                                    <Box sx={{textAlign: 'center'}}>
                                        <Typography
                                            variant="body2"
                                            sx={{color: LOGIN_MUTED, lineHeight: 1.6, maxWidth: 340, mx: 'auto'}}
                                        >
                                            Đăng ký bằng tài khoản Google của bạn để tiếp tục quá trình đăng ký.
                                        </Typography>
                                    </Box>
                                    <Box sx={{width: '100%', '& > div': {width: '100%'}}}>
                                        <RegisterGoogle onSuccess={handleGoogleSuccess} onError={handleGoogleError}/>
                                    </Box>
                                    <Divider sx={{borderColor: 'rgba(45, 95, 115, 0.14)'}}/>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 0.75,
                                            textAlign: 'center',
                                        }}
                                    >
                                        <Typography variant="body2" sx={{color: LOGIN_MUTED}}>
                                            Đã có tài khoản?
                                        </Typography>
                                        <Button
                                            component={RouterLink}
                                            to="/login"
                                            variant="text"
                                            size="small"
                                            sx={{
                                                textTransform: 'none',
                                                fontWeight: 700,
                                                color: BRAND_NAVY,
                                                p: 0,
                                                minWidth: 'auto',
                                                '&:hover': {
                                                    bgcolor: 'transparent',
                                                    textDecoration: 'underline',
                                                    color: BRAND_SKY,
                                                },
                                            }}
                                        >
                                            Đăng nhập
                                        </Button>
                                    </Box>
                                </>
                            ) : (
                                <Box component="form" onSubmit={(e) => { e.preventDefault(); handleRoleSelect(); }}>
                                    <Stack spacing={3}>
                                        {isEmailVerified && (
                                            <Box
                                                sx={{
                                                    p: 2,
                                                    borderRadius: 2,
                                                    bgcolor: 'rgba(85, 179, 217, 0.12)',
                                                    border: '1px solid rgba(45, 95, 115, 0.18)',
                                                }}
                                            >
                                                <Typography variant="body2" sx={{color: BRAND_NAVY, fontWeight: 600}}>
                                                    Email đã được xác thực: {email}
                                                </Typography>
                                            </Box>
                                        )}

                                        <TextField
                                            select
                                            label="Vai trò trong hệ thống"
                                            value={selectedRole}
                                            onChange={(e) => setSelectedRole(e.target.value)}
                                            fullWidth
                                            size="small"
                                            helperText="Vui lòng chọn đúng vai trò: Phụ huynh hoặc Nhà trường"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {borderRadius: 2},
                                            }}
                                        >
                                            {roleOptions.map((role) => (
                                                <MenuItem key={role.value} value={role.value}>
                                                    {role.label}
                                                </MenuItem>
                                            ))}
                                        </TextField>

                                        <Button
                                            type="submit"
                                            variant="contained"
                                            disabled={isSubmitting || !selectedRole}
                                            fullWidth
                                            sx={{
                                                mt: 1,
                                                py: 1.15,
                                                textTransform: 'none',
                                                fontWeight: 700,
                                                borderRadius: 2,
                                                color: '#fff',
                                                background: `linear-gradient(90deg, ${BRAND_NAVY} 0%, ${BRAND_SKY} 100%)`,
                                                boxShadow: '0 8px 24px rgba(45, 95, 115, 0.28)',
                                                '&:hover': {
                                                    background: `linear-gradient(90deg, ${APP_PRIMARY_DARK} 0%, ${BRAND_NAVY} 100%)`,
                                                    boxShadow: '0 12px 32px rgba(45, 95, 115, 0.36)',
                                                },
                                                '&.Mui-disabled': {
                                                    background: 'rgba(45, 95, 115, 0.35)',
                                                    color: 'rgba(255,255,255,0.85)',
                                                },
                                            }}
                                        >
                                            {isSubmitting ? (
                                                <CircularProgress size={24} color="inherit"/>
                                            ) : (
                                                'Tiếp tục'
                                            )}
                                        </Button>
                                    </Stack>
                                </Box>
                            )}
                        </Stack>
                    </Paper>
                </Stack>
            </Container>
        </Box>
    );
};

export default Register;
