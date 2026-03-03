import {useState, useRef} from 'react';
import {Box, Button, Container, Divider, Paper, Stack, Typography} from '@mui/material';
import {Link as RouterLink, useNavigate} from 'react-router-dom';
import LoginGoogle from '../ui/LoginGoogle';
import backgroundLogin from '../../assets/backgroundLogin.png';
import {getAccess} from '../../services/AccountService';

export default function Login() {
    const [userEmail, setUserEmail] = useState(null);
    const [userData, setUserData] = useState(null);
    const navigate = useNavigate();
    const hasNavigated = useRef(false); // Flag để prevent multiple navigate calls

    const getRoleBasedRoute = (role) => {
        // Normalize role về uppercase để match với constants
        const normalizedRole = role?.toUpperCase();
        
        switch (normalizedRole) {
            case 'ADMIN':
                return '/admin/dashboard';
            case 'SCHOOL':
                return '/school/dashboard';
            case 'STUDENT':
                return '/student/dashboard';
            case 'PARENT':
                return '/home'; // Chưa có route riêng cho PARENT
            default:
                return '/home';
        }
    };

    const handleLoginSuccess = async (data) => {
        // Prevent multiple calls
        if (hasNavigated.current) {
            console.log('Navigation already triggered, skipping...');
            return;
        }

        const {email, name, picture, response} = data;

        setUserEmail(email);
        setUserData({email, name, picture});

        console.log('Login successful!');
        console.log('Email:', email);
        console.log('Name:', name);
        console.log('Picture:', picture);
        console.log('Auth Response:', response);
        console.log('Full response data:', response?.data);

        // Lấy role từ signin response
        let role = null;
        
        // Response structure: { message: "...", body: { role: "admin", ... } }
        if (response && response.data) {
            // Thử cả response.data.body.role và response.data.role
            if (response.data.body && response.data.body.role) {
                role = response.data.body.role;
                console.log('Role from response.data.body.role:', role);
            } else if (response.data.role) {
                role = response.data.role;
                console.log('Role from response.data.role:', role);
            }
        }

        // Nếu không có trong response, gọi getAccess() để lấy role
        if (!role) {
            try {
                const accessResponse = await getAccess();
                if (accessResponse && accessResponse.status === 200 && accessResponse.data.body) {
                    role = accessResponse.data.body.role;
                    console.log('Role from getAccess:', role);
                }
            } catch (error) {
                console.error('Error getting user role:', error);
            }
        }

        // Lưu thông tin user vào localStorage
        if (role) {
            const normalizedRole = role.toUpperCase();
            const userData = {
                email: email,
                name: name,
                picture: picture,
                role: normalizedRole
            };
            localStorage.setItem('user', JSON.stringify(userData));
            console.log('User data saved to localStorage:', userData);
        }

        // Navigate đến trang tương ứng với role (chỉ navigate 1 lần)
        if (!hasNavigated.current) {
            hasNavigated.current = true; // Đánh dấu đã navigate
            
            if (role) {
                const normalizedRole = role.toUpperCase();
                const route = getRoleBasedRoute(normalizedRole);
                console.log('User role:', normalizedRole, '-> Navigating to:', route);
                setTimeout(() => {
                    navigate(route);
                }, 1000); // Delay 1 giây để user thấy thông báo thành công
            } else {
                // Nếu không có role, navigate về home
                console.warn('No role found, navigating to home');
                setTimeout(() => {
                    navigate('/home');
                }, 1000);
            }
        }
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
            <Container maxWidth="md">
                <Stack
                    direction={{xs: 'column', md: 'row'}}
                    spacing={4}
                    sx={{
                        alignItems: 'stretch',
                    }}
                >
                    <Box
                        sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                        }}
                    >
                        <Box
                            sx={{
                                backgroundColor: 'rgba(15,23,42,0.55)',
                                borderRadius: 4,
                                px: {xs: 2.5, md: 4},
                                py: {xs: 2.5, md: 3},
                                boxShadow: '0 18px 45px rgba(15,23,42,0.65)',
                                backdropFilter: 'blur(8px)',
                            }}
                        >
                            <Typography
                                variant="h4"
                                sx={{
                                    fontWeight: 800,
                                    color: '#1d4ed8',
                                    mb: 1.5,
                                    textShadow: '0 6px 18px rgba(15,23,42,0.9)',
                                }}
                            >
                                Chào mừng trở lại 👋
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={{color: 'rgba(226,232,240,0.95)', mb: 1}}
                            >
                                Đăng nhập để tiếp tục theo dõi hành trình học tập và tuyển sinh cùng EduBridgeHCM.
                            </Typography>
                            <Box
                                sx={{
                                    mt: 1.5,
                                    borderLeft: '3px solid rgba(191,219,254,0.9)',
                                    pl: 2,
                                    color: 'rgba(226,232,240,0.9)',
                                    fontSize: 14,
                                }}
                            >
                                <Typography variant="body2">
                                    Tài khoản Google của bạn sẽ được dùng để xác thực, chúng tôi không chia sẻ thông tin
                                    với bên thứ ba ngoài hệ thống nhà trường.
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    <Paper
                        elevation={8}
                        sx={{
                            flex: 1,
                            p: 4,
                            borderRadius: 4,
                            background:
                                'radial-gradient(circle at top left, rgba(239,246,255,0.96) 0, rgba(239,246,255,0.98) 40%, #ffffff 100%)',
                            border: '1px solid #dbeafe',
                            backdropFilter: 'blur(10px)',
                        }}
                    >
                        <Stack spacing={3}>
                            <Box>
                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 800,
                                        color: '#1d4ed8',
                                        textAlign: 'center',
                                        mb: 0.5,
                                    }}
                                >
                                    Đăng nhập
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{color: '#64748b', mt: 0.5, textAlign: 'center'}}
                                >
                                    Sử dụng tài khoản Google do nhà trường cung cấp.
                                </Typography>
                            </Box>

                            {!userEmail ? (
                                <Stack spacing={2}>
                                    <Box
                                        sx={{
                                            width: '100%',
                                            '& > div': {width: '100%'},
                                        }}
                                    >
                                        <LoginGoogle
                                            onSuccess={handleLoginSuccess}
                                            onError={handleLoginError}
                                        />
                                    </Box>
                                    <Typography variant="caption" sx={{color: '#94a3b8'}}>
                                        Bằng cách tiếp tục, bạn đồng ý với các điều khoản sử dụng và chính sách bảo mật
                                        của hệ thống.
                                    </Typography>
                                </Stack>
                            ) : (
                                <Stack spacing={2} alignItems="center" textAlign="center">
                                    <Typography variant="h6" sx={{fontWeight: 700, color: '#16a34a'}}>
                                        Đăng nhập thành công
                                    </Typography>
                                    <Typography variant="body2" sx={{color: '#4b5563'}}>
                                        {userData?.name && `${userData.name}`} ({userEmail})
                                    </Typography>
                                    {userData?.picture && (
                                        <Box
                                            component="img"
                                            src={userData.picture}
                                            alt="Profile"
                                            sx={{
                                                borderRadius: '50%',
                                                width: 80,
                                                height: 80,
                                                mt: 1,
                                                boxShadow: '0 10px 30px rgba(15, 118, 110, 0.25)',
                                            }}
                                        />
                                    )}
                                </Stack>
                            )}

                            <Divider sx={{my: 1}}/>

                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                spacing={1}
                            >
                                <Typography variant="body2" sx={{color: '#64748b'}}>
                                    Chưa có tài khoản?
                                </Typography>
                                <Button
                                    component={RouterLink}
                                    to="/register"
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                        borderRadius: 999,
                                        textTransform: 'none',
                                        borderColor: '#bfdbfe',
                                        color: '#1d4ed8',
                                        fontWeight: 600,
                                        px: 2.5,
                                        '&:hover': {
                                            borderColor: '#60a5fa',
                                            backgroundColor: '#eff6ff',
                                        },
                                    }}
                                >
                                    Đăng ký tài khoản mới
                                </Button>
                            </Stack>
                        </Stack>
                    </Paper>
                </Stack>
            </Container>
        </Box>
    );
}
