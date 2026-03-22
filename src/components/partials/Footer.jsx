import React from "react";
import {Box, Container, Divider, Grid, Link, Typography} from "@mui/material";
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import {
    BRAND_AQUA,
    BRAND_BLUE_GRADIENT,
    BRAND_BLUE_GRADIENT_OVERLAY,
    BRAND_NAVY
} from "../../constants/homeLandingTheme";

const footerSx = {
    position: 'relative',
    overflow: 'hidden',
    color: 'common.white',
    pt: {xs: 6, md: 8},
    pb: 3,
    background: BRAND_BLUE_GRADIENT,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
    '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: BRAND_BLUE_GRADIENT_OVERLAY
    }
};

const sectionTitleSx = {
    fontWeight: 800,
    mb: 2,
    color: 'common.white',
    letterSpacing: '0.06em',
    fontSize: '0.95rem',
    position: 'relative',
    display: 'inline-block',
    pl: {xs: 0, md: 1.5},
    '&::before': {
        content: '""',
        display: {xs: 'none', md: 'block'},
        position: 'absolute',
        left: 0,
        top: '0.15em',
        width: 3,
        height: '1em',
        borderRadius: 1,
        background: `linear-gradient(180deg, ${BRAND_AQUA} 0%, ${BRAND_NAVY} 100%)`
    }
};

const linkSx = {
    color: 'rgba(255,255,255,0.92)',
    textDecoration: 'none',
    display: 'inline-block',
    py: 0.25,
    borderRadius: 1,
    transition: 'color 0.2s ease, transform 0.2s ease, background-color 0.2s ease',
    '&:hover': {
        color: BRAND_AQUA,
        transform: 'translateX(2px)',
        backgroundColor: 'rgba(255,255,255,0.06)'
    }
};

export default function Footer() {
    return (
        <Box sx={footerSx}>
            <Container
                maxWidth={false}
                sx={{
                    px: {xs: 2, md: 8},
                    position: 'relative',
                    zIndex: 1
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
                            <PhoneIcon sx={{fontSize: 18, color: 'rgba(186,230,253,0.95)'}}/>
                            <Typography variant="body2" sx={{color: 'rgba(255,255,255,0.95)'}}>0839-674-767</Typography>
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
                            <EmailIcon sx={{fontSize: 18, color: 'rgba(186,230,253,0.95)'}}/>
                            <Typography variant="body2" sx={{color: 'rgba(255,255,255,0.95)'}}>admission@hcmhighschool.edu.vn</Typography>
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
                <Divider sx={{my: 4, borderColor: 'rgba(186,230,253,0.22)'}}/>
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    pt: 0.5,
                    pb: 1
                }}>
                    <Typography variant="body2" align="center" sx={{color: 'rgba(224,242,254,0.72)', maxWidth: 560}}>
                        © {new Date().getFullYear()} EduBridgeHCM - Nền Tảng Tư Vấn Tuyển Sinh. Tất cả quyền được bảo lưu.
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
}
