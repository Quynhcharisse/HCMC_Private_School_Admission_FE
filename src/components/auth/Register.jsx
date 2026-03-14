import React, {useState} from 'react';
import {jwtDecode} from 'jwt-decode';
import {signup} from '../../services/AuthService';
import {ROLES} from '../../constants/roles';
import RegisterGoogle from '../ui/RegisterGoogle';
import {
    Box,
    Button,
    Container,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
    CircularProgress,
} from '@mui/material';
import backgroundLogin from '../../assets/backgroundLogin.png';
import SchoolRegistrationForm from './SchoolRegistrationForm';
import {useNavigate} from 'react-router-dom';

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
        setPicture(data.picture || '');
        setIsEmailVerified(true);
        setStep(2);
    };

    const handleGoogleError = () => {
        console.error('Đăng nhập Google thất bại');
    };

    const handleRoleSelect = async () => {
        if (!selectedRole) {
            alert('Vui lòng chọn vai trò (Phụ huynh hoặc Nhà trường).');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await signup(email, selectedRole);

            if (response) {
                console.log('Đăng ký thành công:', response);
                
                if (selectedRole === ROLES.SCHOOL) {
                    setStep(3);
                } else if (selectedRole === ROLES.PARENT) {
                    alert('Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.');
                    navigate('/login');
                }
            }
        } catch (error) {
            console.error('Lỗi đăng ký:', error);
            const errorMessage = error?.response?.data?.message || error?.message || 'Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.';
            
            if (error?.response?.status === 400 || errorMessage.includes('đã tồn tại') || errorMessage.includes('already exists')) {
                alert('Tài khoản đã tồn tại. Vui lòng đăng nhập.');
                navigate('/login');
            } else {
                alert(errorMessage);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackToRoleSelection = () => {
        setStep(2);
    };

    if (step === 3) {
        return <SchoolRegistrationForm email={email} onBack={handleBackToRoleSelection} />;
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
            <Container maxWidth="sm">
                <Paper
                    elevation={8}
                    sx={{
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
                            <Typography variant="h5" sx={{fontWeight: 700, color: '#1e293b'}}>
                                {step === 1 ? 'Đăng ký tài khoản' : 'Chọn vai trò'}
                            </Typography>
                            <Typography variant="body2" sx={{color: '#64748b', mt: 0.5}}>
                                {step === 1
                                    ? 'Vui lòng đăng nhập bằng tài khoản Google để xác thực email của bạn.'
                                    : 'Vui lòng chọn vai trò phù hợp với bạn trong hệ thống.'}
                            </Typography>
                        </Box>

                        {step === 1 ? (
                            <Stack spacing={2} alignItems="center">
                                <Typography variant="body2" sx={{color: '#475569', width: '100%'}}>
                                    Đăng ký bằng tài khoản Google của bạn để tiếp tục quá trình đăng ký.
                                </Typography>
                                <Box sx={{width: '100%', display: 'flex', justifyContent: 'center'}}>
                                    <RegisterGoogle
                                        onSuccess={handleGoogleSuccess}
                                        onError={handleGoogleError}
                                    />
                                </Box>
                                <Typography variant="caption" sx={{color: '#94a3b8', width: '100%', textAlign: 'left'}}>
                                    Sau khi đăng ký bằng Google, hệ thống sẽ tự động lấy email của bạn.
                                </Typography>
                            </Stack>
                        ) : (
                            <Box component="form" onSubmit={(e) => { e.preventDefault(); handleRoleSelect(); }}>
                                <Stack spacing={3}>
                                    {isEmailVerified && (
                                        <Box sx={{p: 2, bgcolor: '#e0f2fe', borderRadius: 2}}>
                                            <Typography variant="body2" sx={{color: '#0369a1', fontWeight: 600}}>
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
                                        {isSubmitting ? (
                                            <CircularProgress size={24} color="inherit" />
                                        ) : (
                                            'Tiếp tục'
                                        )}
                                    </Button>

                                    <Button
                                        variant="outlined"
                                        onClick={() => setStep(1)}
                                        fullWidth
                                        sx={{
                                            textTransform: 'none',
                                            borderRadius: 999,
                                        }}
                                    >
                                        Quay lại
                                    </Button>
                                </Stack>
                            </Box>
                        )}
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
};

export default Register;
