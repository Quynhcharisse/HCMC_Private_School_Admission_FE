import {useState} from 'react';
import {Box, Button, Container, Divider, Paper, Stack, Typography} from '@mui/material';
import {Link as RouterLink} from 'react-router-dom';
import LoginGoogle from '../ui/LoginGoogle';

export default function Login() {
    const [userEmail, setUserEmail] = useState(null);
    const [userData, setUserData] = useState(null);

    const handleLoginSuccess = (data) => {
        const {email, name, picture, response} = data;

        setUserEmail(email);
        setUserData({email, name, picture});

        console.log('Login successful!');
        console.log('Email:', email);
        console.log('Name:', name);
        console.log('Picture:', picture);
        console.log('Auth Response:', response);
    };

    const handleLoginError = (error) => {
        console.error('Login failed:', error);
    };

    return (
        <Box
            sx={{
                minHeight: 'calc(100vh - 72px)',
                bgcolor: 'linear-gradient(135deg, #e0f2fe 0%, #eff6ff 40%, #e0ecff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: {xs: 6, md: 8},
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
                            gap: 2,
                        }}
                    >
                        <Typography variant="h4" sx={{fontWeight: 800, color: '#1d4ed8'}}>
                            Chào mừng trở lại 👋
                        </Typography>
                        <Typography variant="body1" sx={{color: '#475569'}}>
                            Đăng nhập để tiếp tục theo dõi hành trình học tập và tuyển sinh cùng EduBridgeHCM.
                        </Typography>
                        <Box
                            sx={{
                                mt: 2,
                                borderLeft: '3px solid #bfdbfe',
                                pl: 2,
                                color: '#64748b',
                                fontSize: 14,
                            }}
                        >
                            <Typography variant="body2">
                                Tài khoản Google của bạn sẽ được dùng để xác thực, chúng tôi không chia sẻ thông tin
                                với bên thứ ba ngoài hệ thống nhà trường.
                            </Typography>
                        </Box>
                    </Box>

                    <Paper
                        elevation={8}
                        sx={{
                            flex: 1,
                            p: 4,
                            borderRadius: 4,
                            background:
                                'radial-gradient(circle at top left, #dbeafe 0, #eff6ff 40%, #ffffff 100%)',
                            border: '1px solid #dbeafe',
                        }}
                    >
                        <Stack spacing={3}>
                            <Box>
                                <Typography variant="h5" sx={{fontWeight: 700, color: '#1e293b'}}>
                                    Đăng nhập
                                </Typography>
                                <Typography variant="body2" sx={{color: '#64748b', mt: 0.5}}>
                                    Sử dụng tài khoản Google do nhà trường cung cấp.
                                </Typography>
                            </Box>

                            {!userEmail ? (
                                <Stack spacing={2}>
                                    <LoginGoogle
                                        onSuccess={handleLoginSuccess}
                                        onError={handleLoginError}
                                    />
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
