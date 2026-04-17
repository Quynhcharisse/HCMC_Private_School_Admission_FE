import React from "react";
import {Box, Container, Divider, Grid, Link, Typography} from "@mui/material";
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import {BRAND_AQUA, HOME_SECTION_TESTIMONIAL_BG} from "../../constants/homeLandingTheme";

const sectionTitleSx = {
    fontWeight: 700,
    mb: 1.25,
    color: '#1e293b',
    letterSpacing: '0.06em',
    fontSize: '0.95rem',
    position: 'relative',
    display: 'inline-block',
    pl: {xs: 0, md: 1.5},
    textShadow: 'none',
    '&::before': {
        content: '""',
        display: {xs: 'none', md: 'block'},
        position: 'absolute',
        left: 0,
        top: '0.15em',
        width: 3,
        height: '1em',
        borderRadius: 1,
        background: `linear-gradient(180deg, #60a5fa 0%, ${BRAND_AQUA} 100%)`
    }
};

const linkSx = {
    color: '#334155',
    textDecoration: 'none',
    display: 'inline-block',
    py: 0.25,
    borderRadius: 1,
    textShadow: 'none',
    transition: 'color 0.2s ease, transform 0.2s ease, background-color 0.2s ease',
    '&:hover': {
        color: '#1d4ed8',
        transform: 'translateX(2px)',
        backgroundColor: 'rgba(59,130,246,0.08)'
    }
};

/** Plain footer lines (no href) — same base look as links without hover/navigation */
const footerPlainLineSx = {
    color: '#334155',
    textShadow: 'none',
    py: 0.25,
};

export default function Footer() {
    return (
        <Box
            component="footer"
            sx={{
                width: '100%',
                background: HOME_SECTION_TESTIMONIAL_BG,
                borderTop: 'none'
            }}
        >
            <Container
                maxWidth="lg"
                sx={{
                    px: {xs: 2, md: 4},
                    py: {xs: 3, md: 3.5},
                    color: '#1e293b',
                    backgroundColor: 'transparent'
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
                        <Typography variant="body2" sx={{color: '#475569', lineHeight: 1.65, mb: 1}}>
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
                            <Typography variant="body2" sx={{color: '#475569'}}>0839-674-767</Typography>
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
                            <Typography variant="body2" sx={{color: '#475569'}}>edubridgehcm@gmail.com</Typography>
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
                            <Link href="/home#ve-chung-toi" sx={linkSx}>Về Chúng Tôi</Link>
                        </Box>
                    </Grid>
                </Grid>
                <Divider sx={{mt: 1.25, mb: 0.75, borderColor: 'rgba(148,163,184,0.35)'}}/>
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
                            color: '#64748b',
                            whiteSpace: 'nowrap',
                            m: 0,
                            px: 0.5,
                        }}
                    >
                        © {new Date().getFullYear()} EduBridgeHCM - Dự án học tập. Tất cả thông tin trên hệ thống mang tính minh họa.
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
}
