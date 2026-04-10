import React from "react";
import { Box, Container, Typography } from "@mui/material";
import { BRAND_NAVY, BRAND_SKY } from "../../constants/homeLandingTheme";

/**
 * Trang xem gói dịch vụ dành cho người dùng đã đăng nhập (ví dụ trường học).
 * Nội dung chi tiết có thể bổ sung khi API sẵn sàng.
 */
export default function PackageFeesPage() {
    return (
        <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
            <Box
                sx={{
                    borderRadius: 3,
                    p: { xs: 3, md: 4 },
                    border: "1px solid rgba(59,130,246,0.2)",
                    background: "linear-gradient(135deg, rgba(239,246,255,0.95) 0%, #fff 55%)",
                    boxShadow: "0 18px 48px rgba(51,65,85,0.08)",
                }}
            >
                <Typography
                    variant="h4"
                    component="h1"
                    sx={{
                        fontWeight: 800,
                        mb: 1,
                        background: `linear-gradient(120deg, ${BRAND_NAVY} 0%, ${BRAND_SKY} 100%)`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                    }}
                >
                    Gói dịch vụ
                </Typography>
                <Typography sx={{ color: "#64748b", fontSize: 16, lineHeight: 1.7 }}>
                    Khu vực xem và quản lý thông tin gói dịch vụ. Nội dung đang được hoàn thiện.
                </Typography>
            </Box>
        </Container>
    );
}
