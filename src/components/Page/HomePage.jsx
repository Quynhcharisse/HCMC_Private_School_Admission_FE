import React from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Grid,
    Typography,
    Avatar,
    Stack
} from "@mui/material";
import {
    School as SchoolIcon,
    FamilyRestroom as ParentIcon,
    Search as SearchIcon,
    Chat as ChatIcon,
    Assignment as AssignmentIcon,
    CalendarToday as CalendarIcon,
    TrendingUp as TrendingUpIcon,
    CheckCircle as CheckCircleIcon,
    ArrowForward as ArrowForwardIcon,
    LocationOn as LocationIcon,
    Star as StarIcon
} from "@mui/icons-material";

export default function HomePage() {
    const handleParentClick = () => {
        window.location.href = '/register?role=PARENT';
    };

    const handleSchoolClick = () => {
        window.location.href = '/register?role=SCHOOL';
    };

    return (
        <Box sx={{bgcolor: '#ffffff', overflow: 'hidden'}}>
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 50%, #64b5f6 100%)',
                    color: 'white',
                    pt: {xs: 16, md: 20},
                    pb: {xs: 12, md: 16},
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                        pointerEvents: 'none'
                    },
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '100px',
                        background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.1))',
                        pointerEvents: 'none'
                    }
                }}
            >
                <Container maxWidth="lg" sx={{position: 'relative', zIndex: 1}}>
                    <Box sx={{textAlign: 'center', maxWidth: '900px', mx: 'auto', px: {xs: 2, md: 0}}}>
                        <Box
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 1,
                                mb: 3,
                                px: 2.5,
                                py: 1,
                                borderRadius: 3,
                                bgcolor: 'rgba(255,255,255,0.15)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.2)'
                            }}
                        >
                            <StarIcon sx={{fontSize: 20, color: '#ffd700'}}/>
                            <Typography sx={{fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em'}}>
                                NỀN TẢNG TƯ VẤN TUYỂN SINH HÀNG ĐẦU
                            </Typography>
                        </Box>
                        <Typography
                            variant="h1"
                            sx={{
                                fontWeight: 800,
                                mb: 3,
                                fontSize: {xs: '2.5rem', md: '4rem'},
                                lineHeight: 1.1,
                                letterSpacing: '-0.03em',
                                background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.9) 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}
                        >
                            Kết Nối Phụ Huynh Và Trường Học
                        </Typography>
                        <Typography
                            variant="h5"
                            sx={{
                                mb: 5,
                                fontWeight: 400,
                                opacity: 0.95,
                                fontSize: {xs: '1.125rem', md: '1.5rem'},
                                lineHeight: 1.6,
                                maxWidth: '800px',
                                mx: 'auto',
                                textShadow: '0 2px 10px rgba(0,0,0,0.1)'
                            }}
                        >
                            Nền tảng tư vấn tuyển sinh thông minh giúp phụ huynh tìm trường phù hợp và trường học tiếp cận học sinh tiềm năng
                        </Typography>
                        <Stack
                            direction={{xs: 'column', sm: 'row'}}
                            spacing={2.5}
                            justifyContent="center"
                            alignItems="center"
                        >
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<ParentIcon/>}
                                onClick={handleParentClick}
                                sx={{
                                    bgcolor: 'white',
                                    color: '#1976d2',
                                    px: {xs: 4, md: 6},
                                    py: 2,
                                    fontSize: {xs: '1rem', md: '1.125rem'},
                                    fontWeight: 700,
                                    borderRadius: 3,
                                    textTransform: 'none',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                    minWidth: {xs: '100%', sm: '240px'},
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': {
                                        bgcolor: '#f5f5f5',
                                        boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                                        transform: 'translateY(-3px) scale(1.02)'
                                    }
                                }}
                            >
                                Tôi là Phụ huynh
                            </Button>
                            <Button
                                variant="outlined"
                                size="large"
                                startIcon={<SchoolIcon/>}
                                onClick={handleSchoolClick}
                                sx={{
                                    borderColor: 'white',
                                    color: 'white',
                                    borderWidth: 2.5,
                                    px: {xs: 4, md: 6},
                                    py: 2,
                                    fontSize: {xs: '1rem', md: '1.125rem'},
                                    fontWeight: 700,
                                    borderRadius: 3,
                                    textTransform: 'none',
                                    minWidth: {xs: '100%', sm: '240px'},
                                    backdropFilter: 'blur(10px)',
                                    bgcolor: 'rgba(255,255,255,0.1)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': {
                                        borderColor: 'white',
                                        bgcolor: 'rgba(255,255,255,0.2)',
                                        borderWidth: 2.5,
                                        transform: 'translateY(-3px) scale(1.02)',
                                        boxShadow: '0 8px 24px rgba(255,255,255,0.2)'
                                    }
                                }}
                            >
                                Tôi là Trường học
                            </Button>
                        </Stack>
                    </Box>
                </Container>
            </Box>

            <Box sx={{py: {xs: 10, md: 14}, bgcolor: '#f8fafc', position: 'relative'}}>
                <Container maxWidth="lg" sx={{px: {xs: 3, md: 4}}}>
                    <Box sx={{textAlign: 'center', mb: {xs: 6, md: 8}}}>
                        <Typography
                            variant="h2"
                            sx={{
                                fontWeight: 800,
                                mb: 2,
                                color: '#1a237e',
                                fontSize: {xs: '2.25rem', md: '3rem'},
                                letterSpacing: '-0.02em'
                            }}
                        >
                            Vấn Đề & Giải Pháp
                        </Typography>
                        <Box
                            sx={{
                                width: 60,
                                height: 4,
                                bgcolor: '#1976d2',
                                borderRadius: 2,
                                mx: 'auto',
                                mb: 1
                            }}
                        />
                        <Typography variant="body1" sx={{color: '#666', fontSize: '1.125rem', maxWidth: '600px', mx: 'auto'}}>
                            Hiểu rõ những thách thức và giải pháp cho cả hai phía
                        </Typography>
                    </Box>
                    <Grid container spacing={{xs: 3, md: 4}} justifyContent="center">
                        <Grid item xs={12} md={6}>
                            <Card
                                sx={{
                                    height: '100%',
                                    borderRadius: 3,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    border: '1px solid rgba(25,118,210,0.1)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '4px',
                                        background: 'linear-gradient(90deg, #1976d2, #42a5f5)'
                                    },
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        boxShadow: '0 12px 40px rgba(25,118,210,0.15)',
                                        borderColor: 'rgba(25,118,210,0.3)'
                                    }
                                }}
                            >
                                <CardContent sx={{p: {xs: 3.5, md: 4.5}}}>
                                    <Box sx={{display: 'flex', alignItems: 'flex-start', mb: 3}}>
                                        <Box
                                            sx={{
                                                width: 64,
                                                height: 64,
                                                borderRadius: 2.5,
                                                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                mr: 2.5,
                                                flexShrink: 0,
                                                boxShadow: '0 4px 12px rgba(25,118,210,0.15)'
                                            }}
                                        >
                                            <ParentIcon sx={{fontSize: 32, color: '#1976d2'}}/>
                                        </Box>
                                        <Typography variant="h5" sx={{fontWeight: 700, color: '#1976d2', lineHeight: 1.3, pt: 0.5}}>
                                            Phụ Huynh Gặp Khó Khăn
                                        </Typography>
                                    </Box>
                                    <Box component="ul" sx={{pl: 0, mt: 2, listStyle: 'none', '& li': {
                                        mb: 2.5,
                                        fontSize: '1.0625rem',
                                        color: '#555',
                                        lineHeight: 1.7,
                                        position: 'relative',
                                        pl: 3,
                                        '&::before': {
                                            content: '"✓"',
                                            position: 'absolute',
                                            left: 0,
                                            color: '#1976d2',
                                            fontSize: '1.25rem',
                                            fontWeight: 700,
                                            width: 24,
                                            height: 24,
                                            borderRadius: '50%',
                                            bgcolor: '#e3f2fd',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.875rem'
                                        }
                                    }}}>
                                        <li>Khó khăn trong việc tìm kiếm trường học phù hợp với con</li>
                                        <li>Thiếu thông tin chi tiết về chương trình đào tạo và học phí</li>
                                        <li>Không biết cách liên hệ trực tiếp với trường để được tư vấn</li>
                                        <li>Mất nhiều thời gian để so sánh các trường học khác nhau</li>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Card
                                sx={{
                                    height: '100%',
                                    borderRadius: 3,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    border: '1px solid rgba(25,118,210,0.1)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '4px',
                                        background: 'linear-gradient(90deg, #1976d2, #42a5f5)'
                                    },
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        boxShadow: '0 12px 40px rgba(25,118,210,0.15)',
                                        borderColor: 'rgba(25,118,210,0.3)'
                                    }
                                }}
                            >
                                <CardContent sx={{p: {xs: 3.5, md: 4.5}}}>
                                    <Box sx={{display: 'flex', alignItems: 'flex-start', mb: 3}}>
                                        <Box
                                            sx={{
                                                width: 64,
                                                height: 64,
                                                borderRadius: 2.5,
                                                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                mr: 2.5,
                                                flexShrink: 0,
                                                boxShadow: '0 4px 12px rgba(25,118,210,0.15)'
                                            }}
                                        >
                                            <SchoolIcon sx={{fontSize: 32, color: '#1976d2'}}/>
                                        </Box>
                                        <Typography variant="h5" sx={{fontWeight: 700, color: '#1976d2', lineHeight: 1.3, pt: 0.5}}>
                                            Trường Học Gặp Khó Khăn
                                        </Typography>
                                    </Box>
                                    <Box component="ul" sx={{pl: 0, mt: 2, listStyle: 'none', '& li': {
                                        mb: 2.5,
                                        fontSize: '1.0625rem',
                                        color: '#555',
                                        lineHeight: 1.7,
                                        position: 'relative',
                                        pl: 3,
                                        '&::before': {
                                            content: '"✓"',
                                            position: 'absolute',
                                            left: 0,
                                            color: '#1976d2',
                                            fontSize: '1.25rem',
                                            fontWeight: 700,
                                            width: 24,
                                            height: 24,
                                            borderRadius: '50%',
                                            bgcolor: '#e3f2fd',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.875rem'
                                        }
                                    }}}>
                                        <li>Khó tiếp cận phụ huynh và học sinh tiềm năng</li>
                                        <li>Chi phí marketing và quảng cáo tuyển sinh cao</li>
                                        <li>Thiếu công cụ quản lý hồ sơ và yêu cầu tư vấn hiệu quả</li>
                                        <li>Khó đánh giá chất lượng và phản hồi từ phụ huynh</li>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sx={{mt: {xs: 3, md: 4}}}>
                            <Card
                                sx={{
                                    background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 50%, #64b5f6 100%)',
                                    color: 'white',
                                    borderRadius: 3,
                                    boxShadow: '0 8px 32px rgba(25,118,210,0.3)',
                                    border: 'none',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: -50,
                                        right: -50,
                                        width: 200,
                                        height: 200,
                                        borderRadius: '50%',
                                        bgcolor: 'rgba(255,255,255,0.1)',
                                        filter: 'blur(40px)'
                                    }
                                }}
                            >
                                <CardContent sx={{p: {xs: 4, md: 5}, position: 'relative', zIndex: 1}}>
                                    <Box sx={{display: 'flex', alignItems: 'flex-start', mb: 3}}>
                                        <Box
                                            sx={{
                                                width: 64,
                                                height: 64,
                                                borderRadius: 2.5,
                                                bgcolor: 'rgba(255,255,255,0.25)',
                                                backdropFilter: 'blur(10px)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                mr: 2.5,
                                                flexShrink: 0,
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                            }}
                                        >
                                            <CheckCircleIcon sx={{fontSize: 32}}/>
                                        </Box>
                                        <Typography variant="h5" sx={{fontWeight: 700, lineHeight: 1.3, pt: 0.5}}>
                                            Giải Pháp Của EduBridgeHCM
                                        </Typography>
                                    </Box>
                                    <Grid container spacing={3}>
                                        <Grid item xs={12} md={6}>
                                            <Typography variant="body1" sx={{fontSize: '1.125rem', lineHeight: 1.8, opacity: 0.95}}>
                                                <strong>Đối với Phụ Huynh:</strong> Cung cấp công cụ tìm kiếm thông minh, thông tin chi tiết về trường học, và kết nối trực tiếp với trường để được tư vấn miễn phí.
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Typography variant="body1" sx={{fontSize: '1.125rem', lineHeight: 1.8, opacity: 0.95}}>
                                                <strong>Đối với Trường Học:</strong> Nền tảng quản lý tuyển sinh hiệu quả, tiếp cận phụ huynh tiềm năng, và công cụ quản lý hồ sơ chuyên nghiệp.
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            <Box sx={{py: {xs: 10, md: 14}, bgcolor: '#ffffff'}}>
                <Container maxWidth="lg" sx={{px: {xs: 3, md: 4}}}>
                    <Box sx={{textAlign: 'center', mb: {xs: 6, md: 8}}}>
                        <Typography
                            variant="h2"
                            sx={{
                                fontWeight: 800,
                                mb: 2,
                                color: '#1a237e',
                                fontSize: {xs: '2.25rem', md: '3rem'},
                                letterSpacing: '-0.02em'
                            }}
                        >
                            Cách Hoạt Động
                        </Typography>
                        <Box
                            sx={{
                                width: 60,
                                height: 4,
                                bgcolor: '#1976d2',
                                borderRadius: 2,
                                mx: 'auto',
                                mb: 1
                            }}
                        />
                        <Typography variant="body1" sx={{color: '#666', fontSize: '1.125rem', maxWidth: '600px', mx: 'auto'}}>
                            Quy trình đơn giản và hiệu quả cho cả hai phía
                        </Typography>
                    </Box>

                    <Box sx={{mb: {xs: 8, md: 10}}}>
                        <Typography 
                            variant="h4" 
                            sx={{
                                fontWeight: 700, 
                                mb: {xs: 4, md: 5}, 
                                color: '#1976d2', 
                                textAlign: 'center',
                                fontSize: {xs: '1.75rem', md: '2rem'}
                            }}
                        >
                            Dành Cho Phụ Huynh
                        </Typography>
                        <Grid container spacing={{xs: 3, md: 4}} justifyContent="center">
                            {[
                                {icon: <SearchIcon/>, title: 'Tìm Kiếm Trường', desc: 'Sử dụng công cụ tìm kiếm thông minh để tìm trường học phù hợp với nhu cầu và điều kiện của gia đình'},
                                {icon: <ChatIcon/>, title: 'Gửi Yêu Cầu Tư Vấn', desc: 'Gửi yêu cầu tư vấn trực tiếp đến trường học quan tâm và nhận phản hồi nhanh chóng'},
                                {icon: <CalendarIcon/>, title: 'Đặt Lịch Hẹn', desc: 'Đặt lịch hẹn trực tiếp với trường để tham quan và được tư vấn chi tiết về chương trình học'}
                            ].map((step, index) => (
                                <Grid item xs={12} sm={6} md={4} key={index}>
                                    <Card
                                        sx={{
                                            height: '100%',
                                            textAlign: 'center',
                                            borderRadius: 3,
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                            border: '1px solid rgba(25,118,210,0.1)',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                height: '3px',
                                                background: `linear-gradient(90deg, #1976d2, #42a5f5)`,
                                                transform: 'scaleX(0)',
                                                transition: 'transform 0.4s ease'
                                            },
                                            '&:hover': {
                                                transform: 'translateY(-8px)',
                                                boxShadow: '0 12px 40px rgba(25,118,210,0.15)',
                                                borderColor: 'rgba(25,118,210,0.3)',
                                                '&::before': {
                                                    transform: 'scaleX(1)'
                                                }
                                            }
                                        }}
                                    >
                                        <CardContent sx={{p: {xs: 3.5, md: 4.5}}}>
                                            <Box
                                                sx={{
                                                    width: 88,
                                                    height: 88,
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    mx: 'auto',
                                                    mb: 3,
                                                    boxShadow: '0 8px 24px rgba(25,118,210,0.2)',
                                                    position: 'relative',
                                                    '&::after': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        inset: -4,
                                                        borderRadius: '50%',
                                                        border: '2px solid rgba(25,118,210,0.1)',
                                                        animation: 'pulse 2s infinite'
                                                    }
                                                }}
                                            >
                                                <Box sx={{color: '#1976d2', fontSize: 40, position: 'relative', zIndex: 1}}>
                                                    {step.icon}
                                                </Box>
                                            </Box>
                                            <Typography variant="h6" sx={{fontWeight: 700, mb: 1.5, color: '#1976d2', fontSize: '1.25rem'}}>
                                                Bước {index + 1}: {step.title}
                                            </Typography>
                                            <Typography variant="body2" sx={{color: '#666', lineHeight: 1.7, fontSize: '1rem'}}>
                                                {step.desc}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>

                    <Box>
                        <Typography 
                            variant="h4" 
                            sx={{
                                fontWeight: 700, 
                                mb: {xs: 4, md: 5}, 
                                color: '#1976d2', 
                                textAlign: 'center',
                                fontSize: {xs: '1.75rem', md: '2rem'}
                            }}
                        >
                            Dành Cho Trường Học
                        </Typography>
                        <Grid container spacing={{xs: 3, md: 4}} justifyContent="center">
                            {[
                                {icon: <SchoolIcon/>, title: 'Đăng Ký Tài Khoản', desc: 'Đăng ký tài khoản trường học và cung cấp thông tin chi tiết về trường, chương trình đào tạo và học phí'},
                                {icon: <AssignmentIcon/>, title: 'Quản Lý Yêu Cầu', desc: 'Nhận và quản lý các yêu cầu tư vấn từ phụ huynh, phản hồi nhanh chóng và chuyên nghiệp'},
                                {icon: <TrendingUpIcon/>, title: 'Theo Dõi Hiệu Quả', desc: 'Theo dõi số lượng yêu cầu, tỷ lệ chuyển đổi và đánh giá từ phụ huynh để cải thiện chất lượng'}
                            ].map((step, index) => (
                                <Grid item xs={12} sm={6} md={4} key={index}>
                                    <Card
                                        sx={{
                                            height: '100%',
                                            textAlign: 'center',
                                            borderRadius: 3,
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                            border: '1px solid rgba(25,118,210,0.1)',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                height: '3px',
                                                background: `linear-gradient(90deg, #1976d2, #42a5f5)`,
                                                transform: 'scaleX(0)',
                                                transition: 'transform 0.4s ease'
                                            },
                                            '&:hover': {
                                                transform: 'translateY(-8px)',
                                                boxShadow: '0 12px 40px rgba(25,118,210,0.15)',
                                                borderColor: 'rgba(25,118,210,0.3)',
                                                '&::before': {
                                                    transform: 'scaleX(1)'
                                                }
                                            }
                                        }}
                                    >
                                        <CardContent sx={{p: {xs: 3.5, md: 4.5}}}>
                                            <Box
                                                sx={{
                                                    width: 88,
                                                    height: 88,
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    mx: 'auto',
                                                    mb: 3,
                                                    boxShadow: '0 8px 24px rgba(25,118,210,0.2)',
                                                    position: 'relative',
                                                    '&::after': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        inset: -4,
                                                        borderRadius: '50%',
                                                        border: '2px solid rgba(25,118,210,0.1)',
                                                        animation: 'pulse 2s infinite'
                                                    }
                                                }}
                                            >
                                                <Box sx={{color: '#1976d2', fontSize: 40, position: 'relative', zIndex: 1}}>
                                                    {step.icon}
                                                </Box>
                                            </Box>
                                            <Typography variant="h6" sx={{fontWeight: 700, mb: 1.5, color: '#1976d2', fontSize: '1.25rem'}}>
                                                Bước {index + 1}: {step.title}
                                            </Typography>
                                            <Typography variant="body2" sx={{color: '#666', lineHeight: 1.7, fontSize: '1rem'}}>
                                                {step.desc}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                </Container>
            </Box>

            <Box sx={{py: {xs: 10, md: 14}, bgcolor: '#f8fafc'}}>
                <Container maxWidth="lg" sx={{px: {xs: 3, md: 4}}}>
                    <Box sx={{textAlign: 'center', mb: {xs: 6, md: 8}}}>
                        <Typography
                            variant="h2"
                            sx={{
                                fontWeight: 800,
                                mb: 2,
                                color: '#1a237e',
                                fontSize: {xs: '2.25rem', md: '3rem'},
                                letterSpacing: '-0.02em'
                            }}
                        >
                            Trường Học Nổi Bật
                        </Typography>
                        <Box
                            sx={{
                                width: 60,
                                height: 4,
                                bgcolor: '#1976d2',
                                borderRadius: 2,
                                mx: 'auto',
                                mb: 1
                            }}
                        />
                        <Typography variant="body1" sx={{color: '#666', fontSize: '1.125rem', maxWidth: '600px', mx: 'auto'}}>
                            Các trường học uy tín đã tin tưởng và hợp tác với chúng tôi
                        </Typography>
                    </Box>
                    <Grid container spacing={{xs: 3, md: 4}} justifyContent="center">
                        {[
                            {name: 'Trường THPT Chuyên Lê Hồng Phong', location: 'Quận 5, TP.HCM', logo: 'LHP'},
                            {name: 'Trường THPT Nguyễn Thị Minh Khai', location: 'Quận 3, TP.HCM', logo: 'NTMK'},
                            {name: 'Trường THPT Trần Đại Nghĩa', location: 'Quận 1, TP.HCM', logo: 'TDN'},
                            {name: 'Trường THPT Gia Định', location: 'Quận Bình Thạnh, TP.HCM', logo: 'GD'}
                        ].map((school, index) => (
                            <Grid item xs={12} sm={6} md={3} key={index}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        borderRadius: 3,
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                        border: '1px solid rgba(25,118,210,0.1)',
                                        textAlign: 'center',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: '3px',
                                            background: 'linear-gradient(90deg, #1976d2, #42a5f5)',
                                            transform: 'scaleX(0)',
                                            transition: 'transform 0.4s ease'
                                        },
                                        '&:hover': {
                                            transform: 'translateY(-8px)',
                                            boxShadow: '0 12px 40px rgba(25,118,210,0.15)',
                                            borderColor: 'rgba(25,118,210,0.3)',
                                            '&::before': {
                                                transform: 'scaleX(1)'
                                            }
                                        }
                                    }}
                                >
                                    <CardContent sx={{p: {xs: 3.5, md: 4}}}>
                                        <Avatar
                                            sx={{
                                                width: 80,
                                                height: 80,
                                                mx: 'auto',
                                                mb: 3,
                                                bgcolor: '#1976d2',
                                                fontSize: '1.75rem',
                                                fontWeight: 700,
                                                boxShadow: '0 8px 24px rgba(25,118,210,0.25)',
                                                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)'
                                            }}
                                        >
                                            {school.logo}
                                        </Avatar>
                                        <Typography variant="h6" sx={{fontWeight: 700, mb: 1.5, color: '#1976d2', fontSize: '1.0625rem', lineHeight: 1.4}}>
                                            {school.name}
                                        </Typography>
                                        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3}}>
                                            <LocationIcon sx={{fontSize: 18, color: '#666', mr: 0.5}}/>
                                            <Typography variant="body2" sx={{color: '#666', fontSize: '0.9375rem'}}>
                                                {school.location}
                                            </Typography>
                                        </Box>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            endIcon={<ArrowForwardIcon/>}
                                            sx={{
                                                borderColor: '#1976d2',
                                                color: '#1976d2',
                                                textTransform: 'none',
                                                borderRadius: 2,
                                                px: 3,
                                                fontWeight: 600,
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    borderColor: '#1565c0',
                                                    bgcolor: '#e3f2fd',
                                                    transform: 'translateX(4px)'
                                                }
                                            }}
                                        >
                                            Xem chi tiết
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            <Box sx={{py: {xs: 10, md: 14}, bgcolor: '#ffffff'}}>
                <Container maxWidth="lg" sx={{px: {xs: 3, md: 4}}}>
                    <Box sx={{textAlign: 'center', mb: {xs: 6, md: 8}}}>
                        <Typography
                            variant="h2"
                            sx={{
                                fontWeight: 800,
                                mb: 2,
                                color: '#1a237e',
                                fontSize: {xs: '2.25rem', md: '3rem'},
                                letterSpacing: '-0.02em'
                            }}
                        >
                            Tính Năng Chính
                        </Typography>
                        <Box
                            sx={{
                                width: 60,
                                height: 4,
                                bgcolor: '#1976d2',
                                borderRadius: 2,
                                mx: 'auto',
                                mb: 1
                            }}
                        />
                        <Typography variant="body1" sx={{color: '#666', fontSize: '1.125rem', maxWidth: '600px', mx: 'auto'}}>
                            Công cụ mạnh mẽ giúp bạn tìm kiếm và quản lý hiệu quả
                        </Typography>
                    </Box>
                    <Grid container spacing={{xs: 3, md: 4}} justifyContent="center">
                        {[
                            {icon: <SearchIcon/>, title: 'Tìm Kiếm Thông Minh', desc: 'Tìm kiếm trường học theo khu vực, học phí, chương trình đào tạo và nhiều tiêu chí khác'},
                            {icon: <ChatIcon/>, title: 'Tư Vấn Trực Tuyến', desc: 'Chat trực tiếp với trường học để được tư vấn và giải đáp thắc mắc ngay lập tức'},
                            {icon: <AssignmentIcon/>, title: 'Quản Lý Hồ Sơ', desc: 'Lưu trữ và quản lý hồ sơ đăng ký, yêu cầu tư vấn một cách có tổ chức'},
                            {icon: <CalendarIcon/>, title: 'Đặt Lịch Hẹn', desc: 'Đặt lịch hẹn tham quan trường và tư vấn trực tiếp với ban tuyển sinh'},
                            {icon: <SchoolIcon/>, title: 'So Sánh Trường', desc: 'So sánh các trường học để đưa ra quyết định phù hợp nhất'},
                            {icon: <TrendingUpIcon/>, title: 'Thống Kê & Báo Cáo', desc: 'Theo dõi thống kê và báo cáo về hoạt động tuyển sinh'}
                        ].map((feature, index) => (
                            <Grid item xs={12} sm={6} md={4} key={index}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        borderRadius: 3,
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                        border: '1px solid rgba(25,118,210,0.1)',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: '3px',
                                            background: 'linear-gradient(90deg, #1976d2, #42a5f5)',
                                            transform: 'scaleX(0)',
                                            transition: 'transform 0.4s ease'
                                        },
                                        '&:hover': {
                                            transform: 'translateY(-8px)',
                                            boxShadow: '0 12px 40px rgba(25,118,210,0.15)',
                                            borderColor: 'rgba(25,118,210,0.3)',
                                            '&::before': {
                                                transform: 'scaleX(1)'
                                            }
                                        }
                                    }}
                                >
                                    <CardContent sx={{p: {xs: 3.5, md: 4}}}>
                                        <Box 
                                            sx={{
                                                color: '#1976d2', 
                                                fontSize: 48, 
                                                mb: 2.5,
                                                display: 'inline-flex',
                                                p: 1.5,
                                                borderRadius: 2,
                                                bgcolor: '#e3f2fd',
                                                boxShadow: '0 4px 12px rgba(25,118,210,0.15)'
                                            }}
                                        >
                                            {feature.icon}
                                        </Box>
                                        <Typography variant="h6" sx={{fontWeight: 700, mb: 1.5, color: '#1976d2', fontSize: '1.25rem'}}>
                                            {feature.title}
                                        </Typography>
                                        <Typography variant="body2" sx={{color: '#666', lineHeight: 1.7, fontSize: '1rem'}}>
                                            {feature.desc}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            <Box sx={{py: {xs: 10, md: 14}, background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 50%, #64b5f6 100%)', position: 'relative', overflow: 'hidden'}}>
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                        pointerEvents: 'none'
                    }}
                />
                <Container maxWidth="lg" sx={{px: {xs: 3, md: 4}, position: 'relative', zIndex: 1}}>
                    <Box sx={{textAlign: 'center', mb: {xs: 6, md: 8}}}>
                        <Typography
                            variant="h2"
                            sx={{
                                fontWeight: 800,
                                mb: 2,
                                color: 'white',
                                fontSize: {xs: '2.25rem', md: '3rem'},
                                letterSpacing: '-0.02em',
                                textShadow: '0 2px 20px rgba(0,0,0,0.1)'
                            }}
                        >
                            Thống Kê Nền Tảng
                        </Typography>
                        <Box
                            sx={{
                                width: 60,
                                height: 4,
                                bgcolor: 'white',
                                borderRadius: 2,
                                mx: 'auto',
                                mb: 1,
                                opacity: 0.9
                            }}
                        />
                    </Box>
                    <Grid container spacing={{xs: 4, md: 6}} justifyContent="center">
                        {[
                            {number: '150+', label: 'Trường Học Tham Gia', icon: <SchoolIcon/>},
                            {number: '5,000+', label: 'Phụ Huynh Đăng Ký', icon: <ParentIcon/>},
                            {number: '10,000+', label: 'Yêu Cầu Tư Vấn', icon: <ChatIcon/>},
                            {number: '95%', label: 'Độ Hài Lòng', icon: <CheckCircleIcon/>}
                        ].map((stat, index) => (
                            <Grid item xs={6} md={3} key={index}>
                                <Box sx={{textAlign: 'center', color: 'white'}}>
                                    <Box 
                                        sx={{
                                            fontSize: 56, 
                                            mb: 2, 
                                            opacity: 0.95, 
                                            display: 'flex', 
                                            justifyContent: 'center',
                                            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                                        }}
                                    >
                                        {stat.icon}
                                    </Box>
                                    <Typography
                                        variant="h2"
                                        sx={{
                                            fontWeight: 800,
                                            mb: 1,
                                            fontSize: {xs: '2.25rem', md: '3rem'},
                                            lineHeight: 1.1,
                                            textShadow: '0 2px 10px rgba(0,0,0,0.2)'
                                        }}
                                    >
                                        {stat.number}
                                    </Typography>
                                    <Typography variant="h6" sx={{fontWeight: 600, opacity: 0.95, fontSize: {xs: '1rem', md: '1.125rem'}, textShadow: '0 1px 5px rgba(0,0,0,0.1)'}}>
                                        {stat.label}
                                    </Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            <Box sx={{py: {xs: 10, md: 14}, bgcolor: '#f8fafc'}}>
                <Container maxWidth="md" sx={{px: {xs: 3, md: 4}}}>
                    <Card
                        sx={{
                            borderRadius: 4,
                            boxShadow: '0 12px 48px rgba(0,0,0,0.12)',
                            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 50%, #64b5f6 100%)',
                            color: 'white',
                            textAlign: 'center',
                            p: {xs: 5, md: 7},
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: -100,
                                right: -100,
                                width: 300,
                                height: 300,
                                borderRadius: '50%',
                                bgcolor: 'rgba(255,255,255,0.1)',
                                filter: 'blur(60px)'
                            },
                            '&::after': {
                                content: '""',
                                position: 'absolute',
                                bottom: -50,
                                left: -50,
                                width: 200,
                                height: 200,
                                borderRadius: '50%',
                                bgcolor: 'rgba(255,255,255,0.1)',
                                filter: 'blur(40px)'
                            }
                        }}
                    >
                        <Box sx={{position: 'relative', zIndex: 1}}>
                            <Typography
                                variant="h2"
                                sx={{
                                    fontWeight: 800,
                                    mb: 2,
                                    fontSize: {xs: '2rem', md: '2.75rem'},
                                    letterSpacing: '-0.02em',
                                    textShadow: '0 2px 20px rgba(0,0,0,0.1)'
                                }}
                            >
                                Sẵn Sàng Bắt Đầu?
                            </Typography>
                            <Typography
                                variant="h6"
                                sx={{
                                    mb: 5,
                                    fontWeight: 400,
                                    opacity: 0.95,
                                    fontSize: {xs: '1.0625rem', md: '1.25rem'},
                                    lineHeight: 1.6,
                                    textShadow: '0 1px 10px rgba(0,0,0,0.1)'
                                }}
                            >
                                Tham gia cùng hàng nghìn phụ huynh và trường học đã tin tưởng EduBridgeHCM
                            </Typography>
                            <Stack
                                direction={{xs: 'column', sm: 'row'}}
                                spacing={2.5}
                                justifyContent="center"
                                alignItems="center"
                            >
                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={<ParentIcon/>}
                                    onClick={handleParentClick}
                                    sx={{
                                        bgcolor: 'white',
                                        color: '#1976d2',
                                        px: {xs: 4, md: 6},
                                        py: 2,
                                        fontSize: {xs: '1rem', md: '1.125rem'},
                                        fontWeight: 700,
                                        borderRadius: 3,
                                        textTransform: 'none',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                        minWidth: {xs: '100%', sm: '240px'},
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': {
                                            bgcolor: '#f5f5f5',
                                            boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                                            transform: 'translateY(-3px) scale(1.02)'
                                        }
                                    }}
                                >
                                    Đăng Ký Phụ Huynh
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="large"
                                    startIcon={<SchoolIcon/>}
                                    onClick={handleSchoolClick}
                                    sx={{
                                        borderColor: 'white',
                                        color: 'white',
                                        borderWidth: 2.5,
                                        px: {xs: 4, md: 6},
                                        py: 2,
                                        fontSize: {xs: '1rem', md: '1.125rem'},
                                        fontWeight: 700,
                                        borderRadius: 3,
                                        textTransform: 'none',
                                        minWidth: {xs: '100%', sm: '240px'},
                                        backdropFilter: 'blur(10px)',
                                        bgcolor: 'rgba(255,255,255,0.1)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': {
                                            borderColor: 'white',
                                            bgcolor: 'rgba(255,255,255,0.2)',
                                            borderWidth: 2.5,
                                            transform: 'translateY(-3px) scale(1.02)',
                                            boxShadow: '0 8px 24px rgba(255,255,255,0.2)'
                                        }
                                    }}
                                >
                                    Đăng Ký Trường Học
                                </Button>
                            </Stack>
                        </Box>
                    </Card>
                </Container>
            </Box>
        </Box>
    );
}
