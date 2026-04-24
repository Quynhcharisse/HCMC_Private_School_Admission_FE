import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    LinearProgress,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CampaignIcon from "@mui/icons-material/Campaign";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FlagCircleIcon from "@mui/icons-material/FlagCircle";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import InsightsIcon from "@mui/icons-material/Insights";
import PlaylistAddCheckCircleIcon from "@mui/icons-material/PlaylistAddCheckCircle";
import RouteIcon from "@mui/icons-material/Route";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import { getCampaignTemplatesByYear } from "../../../services/CampaignService.jsx";

const CURRENT_YEAR = new Date().getFullYear();
const SCAN_YEARS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3];

function normalizeCampaignStatus(rawStatus) {
    const s = String(rawStatus || "").trim().toUpperCase();
    if (!s) return "DRAFT";
    if (s === "OPEN" || s === "OPEN_ADMISSION_CAMPAIGN") return "OPEN";
    if (s === "CANCELLED" || s === "CANCELLED_ADMISSION_CAMPAIGN") return "CANCELLED";
    if (s === "DRAFT" || s === "DRAFT_ADMISSION_CAMPAIGN") return "DRAFT";
    return s;
}

function normalizeDateLikeToIso(v) {
    if (Array.isArray(v) && v.length >= 3) {
        const y = Number(v[0]);
        const m = Number(v[1]);
        const d = Number(v[2]);
        if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
            return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        }
    }
    const s = String(v ?? "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

function mapTemplate(row) {
    if (!row) return null;
    const timelines = Array.isArray(row.admissionMethodTimelines)
        ? row.admissionMethodTimelines.map((t) => ({
              ...t,
              methodCode: String(t?.methodCode ?? "").trim(),
              startDate: normalizeDateLikeToIso(t?.startDate),
              endDate: normalizeDateLikeToIso(t?.endDate),
          }))
        : [];
    const details = Array.isArray(row.admissionMethodDetails)
        ? row.admissionMethodDetails.map((d) => ({
              ...d,
              methodCode: String(d?.methodCode ?? "").trim(),
              startDate: normalizeDateLikeToIso(d?.startDate),
              endDate: normalizeDateLikeToIso(d?.endDate),
              admissionProcessSteps: Array.isArray(d?.admissionProcessSteps) ? d.admissionProcessSteps : [],
              methodDocumentRequirements: Array.isArray(d?.methodDocumentRequirements) ? d.methodDocumentRequirements : [],
              mandatoryAll: Array.isArray(d?.mandatoryAll) ? d.mandatoryAll : [],
          }))
        : [];
    return {
        ...row,
        id: row.admissionCampaignTemplateId ?? row.id,
        admissionCampaignTemplateId: row.admissionCampaignTemplateId ?? row.id,
        status: normalizeCampaignStatus(row.status),
        admissionMethodTimelines: timelines,
        admissionMethodDetails: details,
    };
}

function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("vi-VN");
}

function statusUi(status) {
    const s = String(status || "").toUpperCase();
    if (s === "OPEN") return { label: "Đang mở", bg: "rgba(34, 197, 94, 0.14)", color: "#166534", dot: "#22c55e" };
    if (s === "CANCELLED") return { label: "Đã hủy", bg: "rgba(248, 113, 113, 0.16)", color: "#b91c1c", dot: "#ef4444" };
    return { label: "Bản nháp", bg: "rgba(59, 130, 246, 0.14)", color: "#1d4ed8", dot: "#3b82f6" };
}

function timelineItemState(startDate, endDate) {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "upcoming";
    if (now < start) return "upcoming";
    if (now > end) return "completed";
    return "active";
}

function timelineStateUi(state) {
    if (state === "active") return { label: "Đang diễn ra", color: "#16a34a", bg: "rgba(22, 163, 74, 0.12)" };
    if (state === "completed") return { label: "Đã kết thúc", color: "#475569", bg: "rgba(100, 116, 139, 0.14)" };
    return { label: "Sắp diễn ra", color: "#1d4ed8", bg: "rgba(59, 130, 246, 0.14)" };
}

export default function SchoolCampaignViewDetail() {
    const navigate = useNavigate();
    const location = useLocation();
    const { campaignId } = useParams();
    const [loading, setLoading] = useState(true);
    const [campaign, setCampaign] = useState(null);

    const idNum = campaignId ? parseInt(campaignId, 10) : NaN;
    const initialCampaign = location?.state?.campaign || null;

    const resolveCampaignFromApi = useCallback(async () => {
        if (!Number.isFinite(idNum)) return null;
        for (const y of SCAN_YEARS) {
            try {
                const res = await getCampaignTemplatesByYear(y);
                const raw = res?.data?.body ?? res?.data;
                const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
                const found = list.find((row) => Number(row?.id ?? row?.admissionCampaignTemplateId) === idNum);
                if (found) return mapTemplate(found);
            } catch {
                /* keep scanning */
            }
        }
        return null;
    }, [idNum]);

    useEffect(() => {
        let cancelled = false;
        if (initialCampaign) {
            setCampaign(mapTemplate(initialCampaign));
            setLoading(false);
            return;
        }
        setLoading(true);
        resolveCampaignFromApi()
            .then((c) => {
                if (cancelled) return;
                setCampaign(c);
            })
            .catch(() => {
                if (cancelled) return;
                enqueueSnackbar("Không tải được chi tiết chiến dịch.", { variant: "error" });
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [initialCampaign, resolveCampaignFromApi]);

    const status = useMemo(() => statusUi(campaign?.status), [campaign?.status]);

    if (loading) {
        return (
            <Box sx={{ width: "100%", py: 4 }}>
                <LinearProgress sx={{ borderRadius: 1 }} />
            </Box>
        );
    }

    if (!campaign) {
        return (
            <Card sx={{ borderRadius: 3, border: "1px solid #e2e8f0", p: 3 }}>
                <Typography variant="h6">Không tìm thấy chiến dịch.</Typography>
                <Button sx={{ mt: 2, textTransform: "none" }} onClick={() => navigate("/school/campaigns")}>
                    Quay lại danh sách
                </Button>
            </Card>
        );
    }

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%" }}>
            <Card
                sx={{
                    position: "sticky",
                    top: 12,
                    zIndex: 3,
                    borderRadius: 3,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.25)",
                    boxShadow: "0 20px 45px rgba(59, 130, 246, 0.18)",
                }}
            >
                <Box
                    sx={{
                        background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                        px: { xs: 2.5, md: 3 },
                        py: { xs: 2.2, md: 2.6 },
                        color: "#fff",
                        backdropFilter: "blur(6px)",
                    }}
                >
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", md: "center" }}
                        spacing={2}
                    >
                        <Box sx={{ minWidth: 0 }}>
                            <Button
                                startIcon={<ArrowBackIcon />}
                                onClick={() => navigate("/school/campaigns")}
                                sx={{
                                    color: "#fff",
                                    textTransform: "none",
                                    borderRadius: 999,
                                    bgcolor: "rgba(255,255,255,0.14)",
                                    px: 1.7,
                                    mb: 1.1,
                                    "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                                }}
                            >
                                Danh sách chiến dịch
                            </Button>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                                <CampaignIcon sx={{ opacity: 0.95 }} />
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontWeight: 800,
                                        lineHeight: 1.25,
                                        letterSpacing: "-0.02em",
                                        textWrap: "balance",
                                    }}
                                >
                                    {campaign.name || "Chi tiết chiến dịch tuyển sinh"}
                                </Typography>
                            </Stack>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.2 }}>
                                <Chip
                                    icon={<FlagCircleIcon sx={{ fontSize: 16 }} />}
                                    label={`Năm ${campaign.year || "—"}`}
                                    size="small"
                                    sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "#fff", "& .MuiChip-icon": { color: "#fff" } }}
                                />
                                <Chip
                                    icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />}
                                    label={`${formatDate(campaign.startDate)} - ${formatDate(campaign.endDate)}`}
                                    size="small"
                                    sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "#fff", "& .MuiChip-icon": { color: "#fff" } }}
                                />
                                <Chip
                                    size="small"
                                    label={status.label}
                                    sx={{ bgcolor: "rgba(255,255,255,0.9)", color: status.color, fontWeight: 800 }}
                                />
                            </Stack>
                        </Box>
                        <Stack direction="row" spacing={1}>
                            <Tooltip title="Chỉnh sửa chiến dịch">
                                <Button
                                    startIcon={<EditIcon />}
                                    variant="contained"
                                    onClick={() => navigate(`/school/campaigns/detail/${campaign.id}`)}
                                    sx={{
                                        textTransform: "none",
                                        borderRadius: 999,
                                        px: 2,
                                        bgcolor: "rgba(255,255,255,0.92)",
                                        color: "#1d4ed8",
                                        fontWeight: 700,
                                        "&:hover": { bgcolor: "#fff" },
                                    }}
                                >
                                    Chỉnh sửa
                                </Button>
                            </Tooltip>
                            <Tooltip title="Nhân bản nhanh (đi tới trang chỉnh sửa)">
                                <Button
                                    startIcon={<ContentCopyIcon />}
                                    variant="outlined"
                                    onClick={() => navigate(`/school/campaigns/detail/${campaign.id}`)}
                                    sx={{
                                        textTransform: "none",
                                        borderRadius: 999,
                                        px: 2,
                                        borderColor: "rgba(255,255,255,0.7)",
                                        color: "#fff",
                                        "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.12)" },
                                    }}
                                >
                                    Nhân bản
                                </Button>
                            </Tooltip>
                        </Stack>
                    </Stack>
                </Box>
            </Card>

            <Card
                sx={{
                    borderRadius: 3,
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    boxShadow: "0 14px 35px rgba(15, 23, 42, 0.08)",
                    bgcolor: "rgba(255,255,255,0.72)",
                    backdropFilter: "blur(10px)",
                }}
            >
                <CardContent sx={{ p: { xs: 2.3, md: 3 } }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.4 }}>
                        <AutoAwesomeIcon sx={{ color: "#4f46e5" }} />
                        <Typography variant="h6" sx={{ fontWeight: 800, color: "#111827" }}>
                            Tổng quan
                        </Typography>
                    </Stack>
                    <Box
                        sx={{
                            color: "#374151",
                            fontSize: "0.98rem",
                            lineHeight: 1.85,
                            "& p": { my: 0.9 },
                            "& ul, & ol": { pl: 2.7, my: 0.8 },
                            "& h1,& h2,& h3,& h4": { mt: 1.3, mb: 0.7, lineHeight: 1.35 },
                        }}
                        dangerouslySetInnerHTML={{ __html: String(campaign.description || "<p>—</p>") }}
                    />
                </CardContent>
            </Card>

            <Card sx={{ borderRadius: 3, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15,23,42,0.06)" }}>
                <CardContent sx={{ p: { xs: 2.2, md: 3 } }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                        <InsightsIcon sx={{ color: "#2563eb" }} />
                        <Typography variant="h6" sx={{ fontWeight: 800, color: "#111827" }}>
                            Mốc theo phương thức tuyển sinh
                        </Typography>
                    </Stack>
                    <Stack spacing={1.4}>
                        {(campaign.admissionMethodTimelines || []).map((row, idx, arr) => {
                            const state = timelineItemState(row.startDate, row.endDate);
                            const stateUi = timelineStateUi(state);
                            return (
                                <Stack key={`tl-modern-${idx}`} direction="row" spacing={1.4} sx={{ position: "relative" }}>
                                    <Stack alignItems="center" sx={{ width: 24, pt: 0.9 }}>
                                        <Box
                                            sx={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: "50%",
                                                bgcolor: stateUi.color,
                                                boxShadow: `0 0 0 4px ${stateUi.bg}`,
                                            }}
                                        />
                                        {idx < arr.length - 1 ? (
                                            <Box
                                                sx={{
                                                    width: 2,
                                                    flex: 1,
                                                    minHeight: 60,
                                                    mt: 0,
                                                    mb: -1.4,
                                                    bgcolor: "rgba(148, 163, 184, 0.35)",
                                                }}
                                            />
                                        ) : null}
                                    </Stack>
                                    <Card
                                        variant="outlined"
                                        sx={{
                                            flex: 1,
                                            borderRadius: 2.5,
                                            borderColor: "rgba(148,163,184,0.32)",
                                            bgcolor: "rgba(255,255,255,0.9)",
                                            transition: "all .22s ease",
                                            "&:hover": { transform: "translateY(-2px)", boxShadow: "0 12px 26px rgba(30,64,175,0.12)" },
                                        }}
                                    >
                                        <CardContent sx={{ p: 1.6, "&:last-child": { pb: 1.6 } }}>
                                            <Stack
                                                direction={{ xs: "column", sm: "row" }}
                                                spacing={1}
                                                justifyContent="space-between"
                                                alignItems={{ xs: "flex-start", sm: "center" }}
                                            >
                                                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
                                                    {row.displayName || row.methodCode || `Phương thức ${idx + 1}`}
                                                </Typography>
                                                <Chip size="small" label={stateUi.label} sx={{ bgcolor: stateUi.bg, color: stateUi.color, fontWeight: 700 }} />
                                            </Stack>
                                            <Typography variant="body2" sx={{ mt: 0.4, color: "#64748b", fontWeight: 500 }}>
                                                {formatDate(row.startDate)} - {formatDate(row.endDate)}
                                            </Typography>
                                            {row.description ? (
                                                <Typography variant="body2" sx={{ mt: 0.7, color: "#475569" }}>
                                                    {row.description}
                                                </Typography>
                                            ) : null}
                                        </CardContent>
                                    </Card>
                                </Stack>
                            );
                        })}
                    </Stack>
                </CardContent>
            </Card>

            <Card sx={{ borderRadius: 3, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15,23,42,0.06)" }}>
                <CardContent sx={{ p: { xs: 2.2, md: 3 } }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                        <RouteIcon sx={{ color: "#2563eb" }} />
                        <Typography variant="h6" sx={{ fontWeight: 800, color: "#111827" }}>
                            Chi tiết phương thức tuyển sinh
                        </Typography>
                    </Stack>
                    <Stack spacing={1.2}>
                        {(campaign.admissionMethodDetails || []).map((detail, idx) => {
                            const state = timelineItemState(detail.startDate, detail.endDate);
                            const stateUi = timelineStateUi(state);
                            return (
                                <Accordion
                                    key={`md-acc-${detail.methodCode || idx}`}
                                    disableGutters
                                    sx={{
                                        borderRadius: "14px !important",
                                        border: "1px solid rgba(148,163,184,0.25)",
                                        overflow: "hidden",
                                        boxShadow: "none",
                                        "&:before": { display: "none" },
                                    }}
                                >
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                        sx={{
                                            px: 2,
                                            py: 0.75,
                                            bgcolor: "rgba(248,250,252,0.8)",
                                            transition: "all .2s ease",
                                            "&:hover": { bgcolor: "rgba(239,246,255,0.8)" },
                                        }}
                                    >
                                        <Stack
                                            direction={{ xs: "column", sm: "row" }}
                                            spacing={1}
                                            alignItems={{ xs: "flex-start", sm: "center" }}
                                            justifyContent="space-between"
                                            sx={{ width: "100%", pr: 1 }}
                                        >
                                            <Box>
                                                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
                                                    {detail.displayName || detail.methodCode || `Phương thức ${idx + 1}`}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: "#64748b", mt: 0.25 }}>
                                                    {formatDate(detail.startDate)} - {formatDate(detail.endDate)}
                                                </Typography>
                                            </Box>
                                            <Chip size="small" label={stateUi.label} sx={{ bgcolor: stateUi.bg, color: stateUi.color, fontWeight: 700 }} />
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ px: 2, pb: 2 }}>
                                        <Stack spacing={2}>
                                            <Box>
                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                                    <PlaylistAddCheckCircleIcon sx={{ color: "#2563eb", fontSize: 20 }} />
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                                        Các bước quy trình
                                                    </Typography>
                                                </Stack>
                                                <Stack spacing={1}>
                                                    {(detail.admissionProcessSteps || []).length > 0 ? (
                                                        detail.admissionProcessSteps.map((s, sIdx) => (
                                                            <Stack key={`step-${sIdx}`} direction="row" spacing={1.2} alignItems="flex-start">
                                                                <Box
                                                                    sx={{
                                                                        width: 24,
                                                                        height: 24,
                                                                        borderRadius: "50%",
                                                                        bgcolor: "rgba(37,99,235,0.15)",
                                                                        color: "#1d4ed8",
                                                                        fontSize: 12,
                                                                        fontWeight: 800,
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                        mt: 0.2,
                                                                        flexShrink: 0,
                                                                    }}
                                                                >
                                                                    {s.stepOrder ?? sIdx + 1}
                                                                </Box>
                                                                <Box>
                                                                    <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
                                                                        {s.stepName || `Bước ${sIdx + 1}`}
                                                                    </Typography>
                                                                    {s.description ? (
                                                                        <Typography variant="body2" sx={{ color: "#64748b" }}>
                                                                            {s.description}
                                                                        </Typography>
                                                                    ) : null}
                                                                </Box>
                                                            </Stack>
                                                        ))
                                                    ) : (
                                                        <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                                                            Chưa có bước quy trình.
                                                        </Typography>
                                                    )}
                                                </Stack>
                                            </Box>

                                            <Divider />

                                            <Box>
                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                                    <FolderOpenIcon sx={{ color: "#2563eb", fontSize: 20 }} />
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                                        Hồ sơ theo phương thức
                                                    </Typography>
                                                </Stack>
                                                <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                                                    {(detail.methodDocumentRequirements || []).length > 0 ? (
                                                        detail.methodDocumentRequirements.map((d, dIdx) => (
                                                            <Chip
                                                                key={`doc-chip-${dIdx}`}
                                                                icon={d.required ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : undefined}
                                                                size="small"
                                                                label={d.name || d.code || "Tài liệu"}
                                                                sx={{
                                                                    bgcolor: d.required ? "rgba(22,163,74,0.12)" : "rgba(148,163,184,0.14)",
                                                                    color: d.required ? "#166534" : "#475569",
                                                                    fontWeight: 700,
                                                                }}
                                                            />
                                                        ))
                                                    ) : (
                                                        <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                                                            Không có hồ sơ riêng cho phương thức này.
                                                        </Typography>
                                                    )}
                                                </Stack>
                                            </Box>

                                            <Box>
                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                                    <FolderOpenIcon sx={{ color: "#64748b", fontSize: 20 }} />
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#334155" }}>
                                                        Hồ sơ bắt buộc chung
                                                    </Typography>
                                                </Stack>
                                                <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                                                    {(detail.mandatoryAll || []).length > 0 ? (
                                                        detail.mandatoryAll.map((d, dIdx) => (
                                                            <Chip
                                                                key={`all-chip-${dIdx}`}
                                                                size="small"
                                                                label={d.name || d.code || "Tài liệu"}
                                                                sx={{
                                                                    bgcolor: "rgba(148,163,184,0.16)",
                                                                    color: "#475569",
                                                                    fontWeight: 700,
                                                                }}
                                                            />
                                                        ))
                                                    ) : (
                                                        <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                                                            Không có hồ sơ bắt buộc chung.
                                                        </Typography>
                                                    )}
                                                </Stack>
                                            </Box>
                                        </Stack>
                                    </AccordionDetails>
                                </Accordion>
                            );
                        })}
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}

