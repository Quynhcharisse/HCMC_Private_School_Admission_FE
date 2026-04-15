import React from "react";
import { Box, Card, CardContent, Grid, Typography } from "@mui/material";

const statCards = [
  { title: "Lịch tư vấn hôm nay", value: "0" },
  { title: "Phụ huynh chờ phản hồi", value: "0" },
  { title: "Phiên tư vấn đã hoàn thành", value: "0" },
];

export default function CounsellorDashboard() {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e293b", mb: 0.5 }}>
        Dashboard Tư vấn viên
      </Typography>
      <Typography variant="body2" sx={{ color: "#64748b", mb: 3 }}>
        Theo dõi nhanh tình hình tư vấn phụ huynh trong ngày.
      </Typography>

      <Grid container spacing={2}>
        {statCards.map((item) => (
          <Grid key={item.title} item xs={12} md={4}>
            <Card
              sx={{
                borderRadius: 2.5,
                boxShadow: "0 2px 10px rgba(2, 6, 23, 0.06)",
                border: "1px solid #e2e8f0",
              }}
            >
              <CardContent>
                <Typography variant="body2" sx={{ color: "#64748b", mb: 1 }}>
                  {item.title}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "#2563eb" }}>
                  {item.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
