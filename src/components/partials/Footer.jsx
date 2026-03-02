import React from "react";
import {Box, Container, Divider, Grid, Typography} from "@mui/material";
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';

export default function Footer() {
    return (
        <Box sx={{
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            color: 'white',
            pt: 8,
            pb: 3,
        }}>
            <Container maxWidth={false} sx={{px: {xs: 2, md: 8}}}>
                <Grid
                    container
                    spacing={4}
                    alignItems="flex-start"
                    justifyContent="space-between"
                >
                    {/* Phần 1 trống để chia layout */}
                    <Grid item xs={false} md={2} sx={{display: {xs: 'none', md: 'block'}}}/>

                    {/* Phần 2: LIÊN HỆ */}
                    <Grid
                        item
                        xs={12}
                        md={2}
                        sx={{textAlign: {xs: 'center', md: 'left'}}}
                    >
                        <Typography variant="h6" sx={{fontWeight: 700, mb: 2, color: 'white'}}>
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
                            <PhoneIcon sx={{fontSize: 18, color: 'rgba(255,255,255,0.8)'}}/>
                            <Typography variant="body2">0839-674-767</Typography>
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
                            <EmailIcon sx={{fontSize: 18, color: 'rgba(255,255,255,0.8)'}}/>
                            <Typography variant="body2">admission@hcmhighschool.edu.vn</Typography>
                        </Box>
                    </Grid>

                    {/* Phần 3 trống để chia layout */}
                    <Grid item xs={false} md={2} sx={{display: {xs: 'none', md: 'block'}}}/>

                    {/* Phần 4: CHÍNH SÁCH */}
                    <Grid
                        item
                        xs={12}
                        md={2}
                        sx={{textAlign: {xs: 'center', md: 'left'}}}
                    >
                        <Typography variant="h6" sx={{fontWeight: 700, mb: 2, color: 'white'}}>
                            CHÍNH SÁCH
                        </Typography>
                        <Box sx={{
                            color: 'rgba(255,255,255,0.9)',
                            fontSize: 15,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1
                        }}>
                            <div><a href="/policy/privacy" style={{color: 'inherit', textDecoration: 'none'}}>Chính Sách
                                Bảo Mật</a></div>
                            <div><a href="/tos" style={{color: 'inherit', textDecoration: 'none'}}>Điều Khoản Sử
                                Dụng</a>
                            </div>
                            <div><a href="/faq" style={{color: 'inherit', textDecoration: 'none'}}>Câu Hỏi Thường
                                Gặp</a></div>
                        </Box>
                    </Grid>

                    {/* Phần 5 trống để chia layout */}
                    <Grid item xs={false} md={2} sx={{display: {xs: 'none', md: 'block'}}}/>
                </Grid>
                <Divider sx={{my: 4, borderColor: 'rgba(255,255,255,0.2)'}}/>
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1
                }}>
                    <Typography variant="body2" align="center" sx={{color: 'rgba(255,255,255,0.7)'}}>
                        © {new Date().getFullYear()} EduBridgeHCM - Nền Tảng Tư Vấn Tuyển Sinh. Tất cả quyền được bảo
                        lưu
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
}

