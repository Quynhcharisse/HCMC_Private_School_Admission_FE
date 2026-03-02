import React, {useState} from 'react';
import {GoogleLogin} from '@react-oauth/google';
import {jwtDecode} from 'jwt-decode';
import {signup} from '../../services/AuthService';
import {ROLES} from '../../constants/roles';
import {
    Box,
    Button,
    Container,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';

const roleOptions = [
    {value: ROLES.PARENT, label: 'Phụ huynh'},
    {value: ROLES.SCHOOL, label: 'Nhà trường'},
];

const Register = () => {
    const [email, setEmail] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [isEmailVerified, setIsEmailVerified] = useState(false);

    const handleGoogleSuccess = (credentialResponse) => {
        const decoded = jwtDecode(credentialResponse.credential);
        setEmail(decoded.email);
        setIsEmailVerified(true);
    };

    const handleGoogleError = () => {
        console.error('Đăng nhập Google thất bại');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isEmailVerified) {
            alert('Vui lòng xác thực email bằng Google trước khi đăng ký.');
            return;
        }

        if (!selectedRole) {
            alert('Vui lòng chọn vai trò (Phụ huynh hoặc Nhà trường).');
            return;
        }

        try {
            const response = await signup(email, selectedRole);

            if (response) {
                console.log('Đăng ký thành công:', response);
                // Redirect hoặc xử lý tiếp theo
            }
        } catch (error) {
            console.error('Lỗi đăng ký:', error);
        }
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
            <Container maxWidth="sm">
                <Paper
                    elevation={8}
                    sx={{
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
                                Đăng ký tài khoản
                            </Typography>
                            <Typography variant="body2" sx={{color: '#64748b', mt: 0.5}}>
                                Chọn vai trò của bạn trong hệ thống, sau đó xác thực email bằng Google để hoàn tất đăng ký.
                            </Typography>
                        </Box>

                        <Box component="form" onSubmit={handleSubmit}>
                            <Stack spacing={3}>
                                <TextField
                                    select
                                    label="Vai trò trong hệ thống"
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    fullWidth
                                    size="small"
                                    helperText="Vui lòng chọn đúng vai trò: Phụ huynh hoặc Nhà trường"
                                >
                                    {roleOptions.map((role) => (
                                        <MenuItem key={role.value} value={role.value}>
                                            {role.label}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                <Stack spacing={2} alignItems="center">
                                    <Typography variant="body2" sx={{color: '#475569', width: '100%'}}>
                                        Xác thực email bằng tài khoản Google được chỉ định cho bạn.
                                    </Typography>
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={handleGoogleError}
                                    />
                                    <Typography variant="caption" sx={{color: '#94a3b8', width: '100%', textAlign: 'left'}}>
                                        {isEmailVerified
                                            ? `Email đã được xác thực: ${email}`
                                            : 'Sau khi đăng nhập Google, hệ thống sẽ tự động lấy email của bạn.'}
                                    </Typography>
                                </Stack>

                                <Button
                                    type="submit"
                                    variant="contained"
                                    fullWidth
                                    sx={{
                                        mt: 1,
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
                                    Đăng ký
                                </Button>
                            </Stack>
                        </Box>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
};

export default Register;
