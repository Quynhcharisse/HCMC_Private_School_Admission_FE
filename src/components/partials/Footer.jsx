import React from "react";
import {Box, Container, Divider, Grid, Link, Typography} from "@mui/material";
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import {BRAND_AQUA, HOME_PAGE_HERO_BACKDROP} from "../../constants/homeLandingTheme";
import LayeredMountainSilhouette from "../ui/LayeredMountainSilhouette.jsx";

const sectionTitleSx = {
    fontWeight: 800,
    mb: 1.25,
    color: '#ffffff',
    letterSpacing: '0.06em',
    fontSize: '0.95rem',
    position: 'relative',
    display: 'inline-block',
    pl: {xs: 0, md: 1.5},
    textShadow: '0 1px 2px rgba(51,65,85,0.35)',
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
    textShadow: '0 1px 2px rgba(51,65,85,0.28)',
    transition: 'color 0.2s ease, transform 0.2s ease, background-color 0.2s ease',
    '&:hover': {
        color: BRAND_AQUA,
        transform: 'translateX(2px)',
        backgroundColor: 'rgba(255,255,255,0.1)'
    }
};

/** Plain footer lines (no href) — same base look as links without hover/navigation */
const footerPlainLineSx = {
    color: 'rgba(255,255,255,0.95)',
    textShadow: '0 1px 2px rgba(51,65,85,0.28)',
    py: 0.25,
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
                minHeight: {xs: 320, md: 360}
            }}
        >
            <LayeredMountainSilhouette variant="footer"/>
            <Container
                maxWidth={false}
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    px: {xs: 2, md: 8},
                    minHeight: {xs: 320, md: 360},
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    py: {xs: 2, md: 2.25}
                }}
            >
                <Box
                    sx={{
                        px: {xs: 2, md: 2.75},
                        pt: {xs: 1.75, md: 2},
                        pb: {xs: 1.25, md: 1.5},
                        borderRadius: {xs: 2.5, md: 3},
                        bgcolor: 'rgba(30, 58, 100, 0.52)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.28)',
                        boxShadow: '0 8px 28px rgba(37,99,235,0.1), inset 0 1px 0 rgba(255,255,255,0.2)',
                        color: 'rgba(255,255,255,0.96)'
                    }}
                >
                <Grid
                    container
                    spacing={3}
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
                        <Typography variant="body2" sx={{color: 'rgba(255,255,255,0.88)', lineHeight: 1.65, mb: 1}}>
                            EduBridgeHCM là dự án học tập nhằm xây dựng nền tảng tư vấn tuyển sinh thông minh, kết nối phụ huynh với các trường học. Dự án phục vụ mục đích nghiên cứu và không đại diện cho tổ chức thương mại thực tế
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
                            <Typography variant="body2" sx={{color: 'rgba(255,255,255,0.9)'}}>admissionhcmhighschool@gmail.com</Typography>
                        </Box>
                    </Grid>

                    <Grid
                        item
                        xs={12}
                        md={3}
                        sx={{textAlign: {xs: 'center', md: 'left'}}}
                    >
                        <Typography variant="h6" component="h2" sx={sectionTitleSx}>
                            THÔNG TIN & HỖ TRỢ
                        </Typography>
                        <Box sx={{
                            fontSize: 15,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                            alignItems: {xs: 'center', md: 'flex-start'}
                        }}>
                            <Typography component="span" variant="body2" sx={footerPlainLineSx}>
                                Bảo Mật Thông tin (Demo)
                            </Typography>
                            <Typography component="span" variant="body2" sx={footerPlainLineSx}>
                                Hướng Dẫn Sử Dụng
                            </Typography>
                            <Typography component="span" variant="body2" sx={footerPlainLineSx}>
                                Câu Hỏi Thường Gặp
                            </Typography>
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
                            <Link href="/compare-schools" sx={linkSx}>So sánh trường</Link>
                            <Link href="/about" sx={linkSx}>Về Chúng Tôi</Link>
                        </Box>
                    </Grid>
                </Grid>
                <Divider sx={{mt: 1.25, mb: 0.75, borderColor: 'rgba(255,255,255,0.26)'}}/>
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pt: 0,
                    pb: 0,
                    width: '100%',
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                }}>
                    <Typography
                        variant="body2"
                        align="center"
                        sx={{
                            color: 'rgba(255,255,255,0.72)',
                            whiteSpace: 'nowrap',
                            m: 0,
                            px: 0.5,
                        }}
                    >
                        © {new Date().getFullYear()} EduBridgeHCM - Dự án học tập. Tất cả thông tin trên hệ thống mang tính minh họa.
                    </Typography>
                </Box>
                </Box>
            </Container>
        </Box>
    );
}
