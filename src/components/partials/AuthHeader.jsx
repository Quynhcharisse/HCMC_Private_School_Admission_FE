import React from "react";
import {AppBar, Box, Container, Typography} from "@mui/material";
import logo from "../../assets/logo.jpg";

export default function AuthHeader() {
    const handleGoHome = () => {
        window.location.href = '/home';
    };

    return (
        <AppBar position="static" elevation={0} sx={{bgcolor: 'white', borderBottom: '1px solid #e0e7ff'}}>
            <Container maxWidth={false} sx={{px: {xs: 2, md: 8}}}>
                <Box
                    sx={{
                        py: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                    }}
                    onClick={handleGoHome}
                >
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1.5}}>
                        <Box
                            component="img"
                            src={logo}
                            alt="EduBridgeHCM"
                            sx={{
                                height: 40,
                                width: 40,
                                borderRadius: '50%',
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                            }}
                        />
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 800,
                                color: '#1d4ed8',
                                letterSpacing: 0.5,
                            }}
                        >
                            EduBridgeHCM
                        </Typography>
                    </Box>
                </Box>
            </Container>
        </AppBar>
    );
}

