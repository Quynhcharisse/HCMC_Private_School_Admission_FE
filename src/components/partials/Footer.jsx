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
                <Grid container spacing={4} alignItems="flex-start" justifyContent="space-between">
                    <Grid>
                        <Typography variant="h6" sx={{fontWeight: 700, mb: 2, color: 'white'}}>
                            ĐỊA CHỈ
                        </Typography>
                        <Box sx={{borderRadius: 2, overflow: 'hidden', boxShadow: 2, mb: 1}}>
                            <iframe
                                title="Google Map"
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.3282089076287!2d106.6884157!3d10.7769658!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1sHo%20Chi%20Minh%20City!5e0!3m2!1sen!2s!4v1753587320335"
                                width="100%"
                                height="140"
                                style={{border: 0}}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            ></iframe>
                        </Box>
                    </Grid>

                    <Grid>
                        <Typography variant="h6" sx={{fontWeight: 700, mb: 2, color: 'white'}}>
                            LIÊN HỆ
                        </Typography>
                        <Typography variant="body2" sx={{mb: 1, color: 'rgba(255,255,255,0.9)'}}>
                            123 Đường Nguyễn Huệ<br/>Quận 1, Thành phố Hồ Chí Minh<br/>Việt Nam
                        </Typography>
                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 0.5}}>
                            <PhoneIcon sx={{fontSize: 18, color: 'rgba(255,255,255,0.8)'}}/>
                            <Typography variant="body2">0839-674-767</Typography>
                        </Box>
                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1}}>
                            <EmailIcon sx={{fontSize: 18, color: 'rgba(255,255,255,0.8)'}}/>
                            <Typography variant="body2">admission@hcmhighschool.edu.vn</Typography>
                        </Box>
                    </Grid>

                    <Grid>
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

                    <Grid>
                        <Typography variant="h6" sx={{fontWeight: 700, mb: 2, color: 'white'}}>
                            PHƯƠNG THỨC THANH TOÁN
                        </Typography>
                        <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>

                            {/* Visa & Mastercard */}
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'flex-start',
                                backgroundColor: 'transparent',
                                width: '100%'
                            }}>
                                <Box component="img"
                                     src="/visa.png"
                                     alt="Visa & Mastercard"
                                     sx={{
                                         height: '50px',
                                         width: '150px',
                                     }}
                                />
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
                <Divider sx={{my: 4, borderColor: 'rgba(255,255,255,0.2)'}}/>
                <Box sx={{
                    display: 'flex',
                    flexDirection: {xs: 'column', md: 'row'},
                    alignItems: {xs: 'center', md: 'flex-end'},
                    justifyContent: 'space-between',
                    gap: 2
                }}>
                    <Typography variant="body2" align="center" sx={{color: 'rgba(255,255,255,0.7)'}}>
                        © {new Date().getFullYear()} Admission Hub - Nền Tảng Tư Vấn Tuyển Sinh. Tất cả quyền được bảo
                        lưu. | Thiết kế với ❤️ cho giáo dục
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
}

