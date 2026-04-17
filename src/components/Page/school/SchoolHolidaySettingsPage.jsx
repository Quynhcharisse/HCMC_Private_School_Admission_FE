import React from "react";
import {Box} from "@mui/material";
import SchoolHoliday from "./SchoolHoliday.jsx";

/**
 * Trang cài đặt ngày nghỉ (trước đây là tab trong Cấu hình chung).
 */
export default function SchoolHolidaySettingsPage() {
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
      <SchoolHoliday />
    </Box>
  );
}
