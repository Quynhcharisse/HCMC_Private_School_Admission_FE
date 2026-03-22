import React from "react";
import {Box, Container, Divider, Grid, Link, Typography} from "@mui/material";
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import {BRAND_AQUA, HOME_PAGE_HERO_BACKDROP} from "../../constants/homeLandingTheme";
import LayeredMountainSilhouette from "../ui/LayeredMountainSilhouette.jsx";

const sectionTitleSx = {
    fontWeight: 800,
    mb: 2,
    color: '#ffffff',
    letterSpacing: '0.06em',
    fontSize: '0.95rem',
    position: 'relative',
    display: 'inline-block',
    pl: {xs: 0, md: 1.5},
    textShadow: '0 1px 3px rgba(0,0,0,0.45)',
    '&::before': {
        content: '""',
        display: {xs: 'none', md: 'block'},
        position: 'absolute',
        left: 0,
        top: '0.15em',
        width: 3,
        height: '1em',
        borderRadius: 1,
        background: `linear-gradient(180deg, ${BRAND_AQUA} 0%, rgba(255,255,255,0.85) 100%)`
    }
};

const linkSx = {
    color: 'rgba(255,255,255,0.95)',
    textDecoration: 'none',
    display: 'inline-block',
    py: 0.25,
    borderRadius: 1,
    textShadow: '0 1px 2px rgba(0,0,0,0.35)',
    transition: 'color 0.2s ease, transform 0.2s ease, background-color 0.2s ease',
    '&:hover': {
        color: BRAND_AQUA,
        transform: 'translateX(2px)',
        backgroundColor: 'rgba(255,255,255,0.1)'
    }
};

export default function Footer() {
    return (
        <Box
            component="footer"
            sx={{
                position: 'relative',
                width: '100%',
                overflow: 'hidden',
                bgcolor: HOME_PAGE_HERO_BACKDROP,
                minHeight: {xs: 480, md: 520}
            }}
        >
            <LayeredMountainSilhouette variant="footer"/>
            <Container
                maxWidth={false}
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    px: {xs: 2, md: 8},
                    minHeight: {xs: 480, md: 520},
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    py: {xs: 4, md: 5}
                }}
            >
                <Box
                    sx={{
                        p: {xs: 2.5, md: 3.5},
                        borderRadius: {xs: 2.5, md: 3},
                        bgcolor: 'rgba(6, 18, 28, 0.82)',
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.95)'
                    }}
                >
                <Grid
                    container
                    spacing={4}
                    alignItems="flex-start"
                    justifyContent="space-between"
                >
                    <Grid
                        item
                        xs={12}
                        md={3}
                        sx={{textAlign: {xs: 'center', md: 'left'}}}
                    >
                        <Typography variant="h6" component="h2" sx={sectionTitleSx}>
                            GIỚI THIỆU
                        </Typography>
                        <Typography variant="body2" sx={{color: 'rgba(255,255,255,0.88)', lineHeight: 1.75, mb: 2}}>
                            EduBridgeHCM là nền tảng tư vấn tuyển sinh thông minh, kết nối phụ huynh với các trường học chất lượng tại TP.HCM. Chúng tôi giúp phụ huynh tìm trường phù hợp và hỗ trợ trường học tiếp cận học sinh tiềm năng.
                        </Typography>
                    </Grid>

                    <Grid
                        item
                        xs={12}
                        md={3}
                        sx={{textAlign: {xs: 'center', md: 'left'}}}
                    >
                        <Typography variant="h6" component="h2" sx={sectionTitleSx}>
                            LIÊN HỆ
                        </Typography>

                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: {xs: 'center', md: 'flex-start'},
                                gap: 1,
                                mb: 0.5
                            }}
                        >
                            <PhoneIcon sx={{fontSize: 18, color: BRAND_AQUA}}/>
                            <Typography variant="body2" sx={{color: 'rgba(255,255,255,0.9)'}}>0839-674-767</Typography>
                        </Box>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: {xs: 'center', md: 'flex-start'},
                                gap: 1,
                                mb: 1
                            }}
                        >
                            <EmailIcon sx={{fontSize: 18, color: BRAND_AQUA}}/>
                            <Typography variant="body2" sx={{color: 'rgba(255,255,255,0.9)'}}>admission@hcmhighschool.edu.vn</Typography>
                        </Box>
                    </Grid>

                    <Grid
                        item
                        xs={12}
                        md={3}
                        sx={{textAlign: {xs: 'center', md: 'left'}}}
                    >
                        <Typography variant="h6" component="h2" sx={sectionTitleSx}>
                            CHÍNH SÁCH
                        </Typography>
                        <Box sx={{
                            fontSize: 15,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                            alignItems: {xs: 'center', md: 'flex-start'}
                        }}>
                            <Link href="/policy/privacy" sx={linkSx}>Chính Sách Bảo Mật</Link>
                            <Link href="/tos" sx={linkSx}>Điều Khoản Sử Dụng</Link>
                            <Link href="/faq" sx={linkSx}>Câu Hỏi Thường Gặp</Link>
                        </Box>
                    </Grid>

                    <Grid
                        item
                        xs={12}
                        md={3}
                        sx={{textAlign: {xs: 'center', md: 'left'}}}
                    >
                        <Typography variant="h6" component="h2" sx={sectionTitleSx}>
                            LIÊN KẾT NHANH
                        </Typography>
                        <Box sx={{
                            fontSize: 15,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                            alignItems: {xs: 'center', md: 'flex-start'}
                        }}>
                            <Link href="/home" sx={linkSx}>Trang Chủ</Link>
                            <Link href="/search-schools" sx={linkSx}>Danh Sách Trường</Link>
                            <Link href="/guide" sx={linkSx}>Hướng Dẫn</Link>
                            <Link href="/about" sx={linkSx}>Về Chúng Tôi</Link>
                        </Box>
                    </Grid>
                </Grid>
                <Divider sx={{my: 4, borderColor: 'rgba(255,255,255,0.18)'}}/>
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    pt: 0.5,
                    pb: 0.5
                }}>
                    <Typography variant="body2" align="center" sx={{color: 'rgba(255,255,255,0.72)', maxWidth: 560}}>
                        © {new Date().getFullYear()} EduBridgeHCM - Nền Tảng Tư Vấn Tuyển Sinh. Tất cả quyền được bảo lưu.
                    </Typography>
                </Box>
                </Box>
            </Container>
        </Box>
    );
}
