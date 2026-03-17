import React, { useState, useEffect } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    LinearProgress,
    Tab,
    Tabs,
    Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ListIcon from "@mui/icons-material/List";
import CampaignIcon from "@mui/icons-material/Campaign";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSchool } from "../../../contexts/SchoolContext.jsx";

const STATUS_OPTIONS = [
    { value: "active", label: "Đang diễn ra" },
    { value: "upcoming", label: "Sắp diễn ra" },
    { value: "closed", label: "Đã kết thúc" },
];

function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN");
}

function getStatusLabel(status) {
    const o = STATUS_OPTIONS.find((s) => s.value === status);
    return o?.label ?? status;
}

/** Progress (0–100) of campaign timeline based on today between start and end */
function getTimelineProgress(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (today <= start) return 0;
    if (today >= end) return 100;
    const total = end - start;
    const elapsed = today - start;
    return Math.min(100, Math.round((elapsed / total) * 100));
}

export default function SchoolCampaignDetail() {
    const navigate = useNavigate();
    const { campaignId } = useParams();
    const location = useLocation();
    const { isPrimaryBranch } = useSchool();
    const campaign = location.state?.campaign;

    const [tabValue, setTabValue] = useState(0);

    useEffect(() => {
        if (!isPrimaryBranch) {
            navigate("/school/campaigns", { replace: true });
        }
    }, [isPrimaryBranch, navigate]);

    if (!isPrimaryBranch) return null;
    if (!campaign) {
        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%" }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate("/school/campaigns")}
                    sx={{ alignSelf: "flex-start", textTransform: "none" }}
                >
                    Quay lại danh sách chiến dịch
                </Button>
                <Card sx={{ borderRadius: 3, p: 4, textAlign: "center" }}>
                    <CampaignIcon sx={{ fontSize: 64, color: "#cbd5e1", mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        Không tìm thấy thông tin chiến dịch. Vui lòng chọn từ danh sách.
                    </Typography>
                </Card>
            </Box>
        );
    }

    const status = campaign.status ?? "upcoming";
    const progress = getTimelineProgress(campaign.startDate, campaign.endDate);

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%" }}>
            {/* Header */}
            <Box
                sx={{
                    background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                    borderRadius: 3,
                    p: 3,
                    color: "white",
                    boxShadow: "0 8px 32px rgba(13, 100, 222, 0.25)",
                }}
            >
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate("/school/campaigns")}
                    sx={{
                        color: "white",
                        textTransform: "none",
                        mb: 1,
                        "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                    }}
                >
                    Quay lại chiến dịch
                </Button>
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                        textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                    }}
                >
                    {campaign.name}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.95 }}>
                    Năm {campaign.year} · {formatDate(campaign.startDate)} – {formatDate(campaign.endDate)} ·{" "}
                    {getStatusLabel(status)}
                </Typography>
            </Box>

            <Tabs
                value={tabValue}
                onChange={(_, v) => setTabValue(v)}
                sx={{
                    borderBottom: 1,
                    borderColor: "divider",
                    "& .MuiTab-root": { textTransform: "none", fontWeight: 600 },
                }}
            >
                <Tab label="Tổng quan" />
                <Tab label="Chỉ tiêu tuyển sinh" />
            </Tabs>

            {tabValue === 0 && (
                <Card
                    elevation={0}
                    sx={{
                        borderRadius: 3,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                        overflow: "hidden",
                        bgcolor: "#F8FAFC",
                    }}
                >
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Mô tả
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 3 }}>
                            {campaign.description || "—"}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Tiến độ chiến dịch
                        </Typography>
                        <Box sx={{ mb: 1 }}>
                            <LinearProgress
                                variant="determinate"
                                value={progress}
                                sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    bgcolor: "rgba(13, 100, 222, 0.12)",
                                    "& .MuiLinearProgress-bar": {
                                        borderRadius: 4,
                                        bgcolor: "#0D64DE",
                                    },
                                }}
                            />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                            {formatDate(campaign.startDate)} → {formatDate(campaign.endDate)}
                        </Typography>
                    </CardContent>
                </Card>
            )}

            {tabValue === 1 && (
                <Card
                    elevation={0}
                    sx={{
                        borderRadius: 3,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                        overflow: "hidden",
                        bgcolor: "#F8FAFC",
                    }}
                >
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                            Quản lý chỉ tiêu tuyển sinh theo cơ sở và chương trình cho chiến dịch này.
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<ListIcon />}
                            onClick={() =>
                                navigate(`/school/campaigns/offerings/${campaign.id ?? campaign.admissionCampaignTemplateId ?? campaignId}`, {
                                    state: { campaign },
                                })
                            }
                            sx={{
                                textTransform: "none",
                                fontWeight: 600,
                                borderRadius: 2,
                                background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                            }}
                        >
                            Quản lý chỉ tiêu
                        </Button>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
}
