import React from "react";
import {Box, Container, Typography} from "@mui/material";

export default function HomePage() {
    return (
        <Box sx={{py: 6}}>
            <Container maxWidth="lg">
                <Typography variant="h3" sx={{fontWeight: 700, mb: 3, color: '#1976d2'}}>
                    Home Page
                </Typography>
                <Typography variant="body1">
                    Nội dung trang chủ sẽ được xây dựng tại đây.
                </Typography>
            </Container>
        </Box>
    );
}

