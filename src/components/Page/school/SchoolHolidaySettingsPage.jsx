import React, {useState} from "react";
import {Alert, Box, Collapse} from "@mui/material";
import {useLocation} from "react-router-dom";
import SchoolHoliday from "./SchoolHoliday.jsx";

/**
 * Trang cài đặt ngày nghỉ.
 * Khi navigate với state { needsHoliday: true } (từ trang gán tư vấn viên),
 * hiện banner warning — tự ẩn sau khi user tạo holiday đầu tiên thành công.
 */
export default function SchoolHolidaySettingsPage() {
    const location = useLocation();
    const [showBanner, setShowBanner] = useState(
        () => !!location.state?.needsHoliday
    );

    return (
        <Box
            sx={{
                p: {xs: 1, md: 2},
                borderRadius: 4,
                bgcolor: "#ffffff",
                color: "#1e293b",
                width: "100%",
                boxSizing: "border-box",
                pb: {xs: 6, md: 8},
            }}
        >
            <Collapse in={showBanner} unmountOnExit>
                <Alert
                    severity="warning"
                    onClose={() => setShowBanner(false)}
                    sx={{mb: 2, borderRadius: 2, border: "1px solid #fde68a"}}
                >
                    Bạn cần thiết lập ít nhất một ngày nghỉ lễ để có thể gán tư vấn viên. Tạo ngày nghỉ bên dưới rồi quay lại trang gán lịch.
                </Alert>
            </Collapse>

            <SchoolHoliday onHolidayCreated={() => setShowBanner(false)} />
        </Box>
    );
}
