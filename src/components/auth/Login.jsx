import {useRef} from 'react';
import {Box, Button, Container, Divider, Paper, Stack, Typography} from '@mui/material';
import {Link as RouterLink, useNavigate} from 'react-router-dom';
import LoginGoogle from '../ui/LoginGoogle';
import backgroundLogin from '../../assets/backgroundLogin.png';
import {getAccess, updateProfile} from '../../services/AccountService';
import {showSuccessSnackbar} from '../ui/AppSnackbar.jsx';
import {BRAND_NAVY, BRAND_SKY, landingSectionShadow} from '../../constants/homeLandingTheme';

const LOGIN_MUTED = 'rgba(52,102,118,0.82)';

export default function Login() {
    const navigate = useNavigate();
    const hasNavigated = useRef(false);

    const getRoleBasedRoute = (role) => {
        const normalizedRole = role?.toUpperCase();
        
        switch (normalizedRole) {
            case 'ADMIN':
                return '/admin/dashboard';
            case 'SCHOOL':
                return '/school/dashboard';
            case 'COUNSELLOR':
                return '/counsellor/dashboard';
            case 'STUDENT':
                return '/student/dashboard';
            case 'PARENT':
                return '/';
            default:
                return '/';
        }
    };

    const handleLoginSuccess = async (data) => {
        if (hasNavigated.current) {
            return;
        }

        const {email, name, picture, response} = data;

        let role = null;
        let firstLogin = false;
        
        if (response && response.data) {
            if (response.data.body && response.data.body.role) {
                role = response.data.body.role;
                firstLogin = response.data.body.firstLogin || false;
            } else if (response.data.role) {
                role = response.data.role;
                firstLogin = response.data.firstLogin || false;
            }
        }

        if (!role) {
            try {
                const accessResponse = await getAccess();
                if (accessResponse && accessResponse.status === 200 && accessResponse.data.body) {
                    role = accessResponse.data.body.role;
                    firstLogin = accessResponse.data.body.firstLogin || false;
                }
            } catch (error) {
                console.error('Error getting user role:', error);
            }
        }

        if (role) {
            const normalizedRole = role.toUpperCase();
            const userData = {
                email: email,
                name: name,
                ...(picture ? {picture} : {}),
                role: normalizedRole,
                firstLogin: firstLogin
            };
            localStorage.setItem('user', JSON.stringify(userData));

            if (normalizedRole === 'PARENT' && picture) {
                try {
                    await updateProfile({parentData: {avatar: picture}});
                } catch (e) {
                    console.warn('Không thể đồng bộ avatar Google lên hồ sơ phụ huynh:', e);
                }
            }
        }

        const targetRoute = role ? getRoleBasedRoute(role.toUpperCase()) : '/';

        showSuccessSnackbar('Đăng nhập thành công!');

        hasNavigated.current = true;
        navigate(targetRoute, {replace: true});
    };

    const handleLoginError = (error) => {
        console.error('Login failed:', error);
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
                                👋
                            </Box>
                            Chào mừng trở lại
                        </Typography>
                        <Typography
                            variant="body1"
                            sx={{
                                color: 'rgba(255, 255, 255, 0.95)',
                                lineHeight: 1.65,
                                mb: 2.5,
                            }}
                        >
                            Đăng nhập để tiếp tục theo dõi hành trình học tập và tuyển sinh cùng EduBridgeHCM.
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
                            border: '1px solid rgba(15,23,42,0.08)',
                            boxShadow: landingSectionShadow(4),
                            backdropFilter: 'blur(12px)',
                            backgroundImage: `
                                radial-gradient(ellipse 120% 80% at 0% 0%, rgba(85,179,217,0.08) 0%, transparent 55%),
                                radial-gradient(ellipse 90% 70% at 100% 100%, rgba(45,95,115,0.06) 0%, transparent 50%)
                            `,
                        }}
                    >
                        <Stack spacing={3}>
                            <Box sx={{textAlign: 'center'}}>
                                <Typography
                                    variant="h5"
                                    component="h1"
                                    sx={{
                                        fontWeight: 700,
                                        color: BRAND_NAVY,
                                        letterSpacing: '-0.02em',
                                        lineHeight: 1.25,
                                        mb: 1,
                                    }}
                                >
                                    Đăng nhập
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{color: LOGIN_MUTED, lineHeight: 1.6, maxWidth: 340, mx: 'auto'}}
                                >
                                    Sử dụng tài khoản Google của bạn để vào hệ thống.
                                </Typography>
                            </Box>

                        <Box sx={{width: '100%', '& > div': {width: '100%'}}}>
                            <LoginGoogle
                                onSuccess={handleLoginSuccess}
                                onError={handleLoginError}
                            />
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
                                Chưa có tài khoản?
                            </Typography>
                            <Button
                                component={RouterLink}
                                to="/register"
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
                                Đăng ký tài khoản mới
                            </Button>
                        </Box>
                    </Stack>
                </Paper>
                </Stack>
            </Container>
        </Box>
    );
}
