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
    Dialog,
    DialogActions,
    DialogContent,
    LinearProgress,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CampaignIcon from "@mui/icons-material/Campaign";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FlagCircleIcon from "@mui/icons-material/FlagCircle";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import InsightsIcon from "@mui/icons-material/Insights";
import PlaylistAddCheckCircleIcon from "@mui/icons-material/PlaylistAddCheckCircle";
import RouteIcon from "@mui/icons-material/Route";
import PublishIcon from "@mui/icons-material/Publish";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import { ConfirmHighlight } from "../../ui/ConfirmDialog.jsx";
import {
    getCampaignTemplatesByYear,
    updateCampaignTemplateStatus,
    cloneCampaignTemplate,
    cancelCampaignTemplate,
} from "../../../services/CampaignService.jsx";

const CURRENT_YEAR = new Date().getFullYear();
const FUTURE_SCAN_YEARS = 30;
const PAST_SCAN_YEARS = 3;
const SCAN_YEARS = Array.from(
    { length: FUTURE_SCAN_YEARS + PAST_SCAN_YEARS + 1 },
    (_, idx) => CURRENT_YEAR + FUTURE_SCAN_YEARS - idx
);

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
    const sourceMethods = Array.isArray(row.admissionMethodDetails) && row.admissionMethodDetails.length > 0
        ? row.admissionMethodDetails
        : Array.isArray(row.admissionMethodTimelines)
            ? row.admissionMethodTimelines
            : [];
    const details = sourceMethods.map((d) => ({
        ...d,
        methodCode: String(d?.methodCode ?? "").trim(),
        displayName: String(d?.displayName ?? d?.name ?? d?.methodCode ?? "").trim(),
        description: String(d?.description ?? "").trim(),
        startDate: normalizeDateLikeToIso(d?.startDate),
        endDate: normalizeDateLikeToIso(d?.endDate),
        quota: Number(d?.quota ?? 0),
        allowReservationSubmission: Boolean(d?.allowReservationSubmission),
        admissionProcessSteps: Array.isArray(d?.admissionProcessSteps) ? d.admissionProcessSteps : [],
        methodDocumentRequirements: Array.isArray(d?.methodDocumentRequirements) ? d.methodDocumentRequirements : [],
    }));
    const timelines = Array.isArray(row.admissionMethodTimelines) && row.admissionMethodTimelines.length > 0
        ? row.admissionMethodTimelines.map((t) => ({
              ...t,
              methodCode: String(t?.methodCode ?? "").trim(),
              startDate: normalizeDateLikeToIso(t?.startDate),
              endDate: normalizeDateLikeToIso(t?.endDate),
              quota: Number(t?.quota ?? 0),
              allowReservationSubmission: Boolean(t?.allowReservationSubmission),
          }))
        : details.map((d) => ({
              ...d,
              quota: Number(d?.quota ?? 0),
              allowReservationSubmission: Boolean(d?.allowReservationSubmission),
          }));
    const mandatoryAll = Array.isArray(row.mandatoryAll) ? row.mandatoryAll : [];
    return {
        ...row,
        id: row.admissionCampaignTemplateId ?? row.id,
        admissionCampaignTemplateId: row.admissionCampaignTemplateId ?? row.id,
        status: normalizeCampaignStatus(row.status),
        admissionMethodTimelines: timelines,
        admissionMethodDetails: details,
        mandatoryAll,
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
    const [publishLoading, setPublishLoading] = useState(false);
    const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
    const [campaign, setCampaign] = useState(null);
    const [cloneLoading, setCloneLoading] = useState(false);
    const [confirmCloneOpen, setConfirmCloneOpen] = useState(false);
    const [cloneDisabled, setCloneDisabled] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [cancelReasonError, setCancelReasonError] = useState("");
    const [cancelBlockedMessage, setCancelBlockedMessage] = useState("");

    const idNum = campaignId ? parseInt(campaignId, 10) : NaN;
    const initialCampaign = location?.state?.campaign || null;

    const resolveCampaignFromApi = useCallback(async () => {
        if (!Number.isFinite(idNum)) return null;
        const responses = await Promise.all(
            SCAN_YEARS.map(async (y) => {
                try {
                    return await getCampaignTemplatesByYear(y);
                } catch {
                    return null;
                }
            })
        );
        for (const res of responses) {
            const raw = res?.data?.body ?? res?.data;
            const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
            const found = list.find((row) => Number(row?.id ?? row?.admissionCampaignTemplateId) === idNum);
            if (found) return mapTemplate(found);
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

    useEffect(() => {
        if (!campaign?.year) return;
        let cancelled = false;
        const nextYear = Number(campaign.year) + 1;
        getCampaignTemplatesByYear(nextYear)
            .then((res) => {
                if (cancelled) return;
                const raw = res?.data?.body ?? res?.data;
                const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
                const hasActive = list.some((r) => {
                    const s = normalizeCampaignStatus(r.status);
                    return s === "DRAFT" || s === "OPEN";
                });
                setCloneDisabled(hasActive);
            })
            .catch(() => { if (!cancelled) setCloneDisabled(false); });
        return () => { cancelled = true; };
    }, [campaign?.year]);

    const status = useMemo(() => statusUi(campaign?.status), [campaign?.status]);

    const handlePublishCampaign = useCallback(async () => {
        if (!campaign?.id || publishLoading) return;
        setPublishLoading(true);
        try {
            await updateCampaignTemplateStatus(campaign.id);
            const latest = await resolveCampaignFromApi();
            if (latest) setCampaign(latest);
            setConfirmPublishOpen(false);
            enqueueSnackbar("Công bố chiến dịch thành công.", { variant: "success" });
        } catch {
            enqueueSnackbar("Công bố chiến dịch thất bại.", { variant: "error" });
        } finally {
            setPublishLoading(false);
        }
    }, [campaign?.id, publishLoading, resolveCampaignFromApi]);

    const handleCloneCampaign = useCallback(async () => {
        if (!campaign?.id || cloneLoading) return;
        setCloneLoading(true);
        try {
            const res = await cloneCampaignTemplate(campaign.id);
            if (res?.status >= 200 && res?.status < 300) {
                const body = res?.data?.body ?? res?.data ?? {};
                const newId = Number(body?.id ?? body?.admissionCampaignTemplateId ?? body?.data?.id ?? body?.data?.admissionCampaignTemplateId);
                enqueueSnackbar(res?.data?.message || `Đã tạo bản nháp Chiến dịch ${Number(campaign.year) + 1}`, { variant: "success" });
                setConfirmCloneOpen(false);
                if (Number.isFinite(newId) && newId > 0) {
                    navigate(`/school/campaigns/detail/${newId}`, {
                        state: { clonedFrom: Number(campaign.year) },
                    });
                }
            } else {
                enqueueSnackbar(res?.data?.message || "Nhân bản chiến dịch thất bại.", { variant: "error" });
            }
        } catch (err) {
            enqueueSnackbar(err?.response?.data?.message || "Nhân bản chiến dịch thất bại.", { variant: "error" });
        } finally {
            setCloneLoading(false);
        }
    }, [campaign?.id, campaign?.year, cloneLoading, navigate]);

    const resetCancelFlow = useCallback(() => {
        setConfirmCancelOpen(false);
        setCancelReason("");
        setCancelReasonError("");
        setCancelBlockedMessage("");
    }, []);

    const handleCancelCampaign = useCallback(async () => {
        if (!campaign?.id || cancelLoading) return;
        const isOpen = normalizeCampaignStatus(campaign.status) === "OPEN";
        const reason = cancelReason.trim();
        if (isOpen && !reason) {
            setCancelReasonError("Vui lòng nhập lý do hủy");
            return;
        }
        setCancelLoading(true);
        try {
            const res = await cancelCampaignTemplate(campaign.id, reason);
            if (res?.status >= 200 && res?.status < 300) {
                enqueueSnackbar("Đã hủy chiến dịch thành công.", { variant: "success" });
                resetCancelFlow();
                const latest = await resolveCampaignFromApi();
                if (latest) setCampaign(latest);
            } else {
                enqueueSnackbar(res?.data?.message || "Không thể hủy chiến dịch.", { variant: "error" });
            }
        } catch (err) {
            const code = err?.response?.status;
            if (code === 412) {
                setCancelBlockedMessage(
                    err?.response?.data?.message ||
                    "Còn hồ sơ chưa xử lý. Vui lòng từ chối hoặc xử lý tất cả hồ sơ trước khi hủy."
                );
            } else if (code === 403) {
                enqueueSnackbar("Bạn không có quyền thực hiện hành động này.", { variant: "error" });
                resetCancelFlow();
            } else {
                enqueueSnackbar(err?.response?.data?.message || "Không thể hủy chiến dịch.", { variant: "error" });
            }
        } finally {
            setCancelLoading(false);
        }
    }, [campaign?.id, campaign?.status, cancelLoading, cancelReason, resetCancelFlow, resolveCampaignFromApi]);

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
        <>
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
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            {normalizeCampaignStatus(campaign?.status) === "DRAFT" && (
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
                            )}
                            {normalizeCampaignStatus(campaign?.status) === "DRAFT" && (
                                <Tooltip title="Công bố chiến dịch">
                                    <Button
                                        startIcon={<PublishIcon />}
                                        variant="outlined"
                                        onClick={() => setConfirmPublishOpen(true)}
                                        disabled={publishLoading}
                                        sx={{
                                            textTransform: "none",
                                            borderRadius: 999,
                                            px: 2,
                                            borderColor: "rgba(255,255,255,0.7)",
                                            color: "#fff",
                                            "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.12)" },
                                        }}
                                    >
                                        {publishLoading ? "Đang công bố..." : "Công bố"}
                                    </Button>
                                </Tooltip>
                            )}
                            {(normalizeCampaignStatus(campaign?.status) === "OPEN" || normalizeCampaignStatus(campaign?.status) === "CANCELLED") && (
                                <Tooltip title={cloneDisabled ? `Năm ${Number(campaign.year) + 1} đã có chiến dịch DRAFT/OPEN` : `Nhân bản → ${Number(campaign.year) + 1}`}>
                                    <span>
                                        <Button
                                            variant="outlined"
                                            onClick={() => setConfirmCloneOpen(true)}
                                            disabled={cloneDisabled || cloneLoading}
                                            sx={{
                                                textTransform: "none",
                                                borderRadius: 999,
                                                px: 2,
                                                borderColor: "rgba(255,255,255,0.7)",
                                                color: "#fff",
                                                "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.12)" },
                                                "&.Mui-disabled": { borderColor: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.4)" },
                                            }}
                                        >
                                            Nhân bản → {Number(campaign.year) + 1}
                                        </Button>
                                    </span>
                                </Tooltip>
                            )}
                            {(normalizeCampaignStatus(campaign?.status) === "OPEN" || normalizeCampaignStatus(campaign?.status) === "DRAFT") && (
                                <Button
                                    variant="outlined"
                                    onClick={() => { setCancelReason(""); setCancelReasonError(""); setCancelBlockedMessage(""); setConfirmCancelOpen(true); }}
                                    disabled={cancelLoading}
                                    color="error"
                                    sx={{
                                        textTransform: "none",
                                        borderRadius: 999,
                                        px: 2,
                                        borderColor: "rgba(255,200,200,0.7)",
                                        color: "#fecaca",
                                        "&:hover": { borderColor: "#fca5a5", bgcolor: "rgba(239,68,68,0.15)" },
                                    }}
                                >
                                    Hủy
                                </Button>
                            )}
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

            {(() => {
                const totalQuota = (campaign.admissionMethodTimelines || []).reduce((s, t) => s + (Number(t?.quota) || 0), 0);
                const totalApps = campaign.totalApplications ?? campaign.totalReservations ?? null;
                const pending = campaign.pendingApplications ?? campaign.pendingCount ?? null;
                const approved = campaign.approvedApplications ?? campaign.approvedCount ?? null;
                const rejected = campaign.rejectedApplications ?? campaign.rejectedCount ?? null;
                const hasStats = totalApps !== null || pending !== null || approved !== null || rejected !== null;
                if (!hasStats && totalQuota === 0) return null;
                return (
                    <Card sx={{ borderRadius: 3, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15,23,42,0.06)" }}>
                        <CardContent sx={{ p: { xs: 2.2, md: 3 } }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                <InsightsIcon sx={{ color: "#2563eb", fontSize: 20 }} />
                                <Typography variant="h6" sx={{ fontWeight: 800, color: "#111827" }}>
                                    Thống kê
                                </Typography>
                            </Stack>
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(5, 1fr)" }, gap: 1.5 }}>
                                {[
                                    { label: "Tổng quota", value: totalQuota > 0 ? totalQuota.toLocaleString("vi-VN") : "—", color: "#1d4ed8", bg: "rgba(59,130,246,0.08)" },
                                    { label: "Tổng hồ sơ", value: totalApps !== null ? Number(totalApps).toLocaleString("vi-VN") : "—", color: "#0f172a", bg: "rgba(148,163,184,0.1)" },
                                    { label: "Đang chờ xét", value: pending !== null ? Number(pending).toLocaleString("vi-VN") : "—", color: "#d97706", bg: "rgba(251,191,36,0.1)" },
                                    { label: "Đã duyệt", value: approved !== null ? Number(approved).toLocaleString("vi-VN") : "—", color: "#16a34a", bg: "rgba(34,197,94,0.1)" },
                                    { label: "Đã từ chối", value: rejected !== null ? Number(rejected).toLocaleString("vi-VN") : "—", color: "#dc2626", bg: "rgba(248,113,113,0.1)" },
                                ].map((item) => (
                                    <Box
                                        key={item.label}
                                        sx={{ p: 1.5, borderRadius: 2, bgcolor: item.bg, textAlign: "center" }}
                                    >
                                        <Typography variant="h5" sx={{ fontWeight: 800, color: item.color, lineHeight: 1.2 }}>
                                            {item.value}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, display: "block", mt: 0.4 }}>
                                            {item.label}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                );
            })()}

            <Card sx={{ borderRadius: 3, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15,23,42,0.06)" }}>
                <CardContent sx={{ p: { xs: 2.2, md: 3 } }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                        <FolderOpenIcon sx={{ color: "#2563eb", fontSize: 20 }} />
                        <Typography variant="h6" sx={{ fontWeight: 800, color: "#111827" }}>
                            Hồ sơ bắt buộc chung
                        </Typography>
                    </Stack>
                    <Stack spacing={0.75}>
                        {(campaign.mandatoryAll || []).length > 0 ? (
                            campaign.mandatoryAll.map((d, dIdx) => (
                                <Box
                                    key={`campaign-all-chip-${dIdx}`}
                                    sx={{
                                        borderRadius: 1.5,
                                        border: "1px solid rgba(148,163,184,0.3)",
                                        bgcolor: "rgba(248,250,252,0.95)",
                                        px: 1.25,
                                        py: 0.9,
                                    }}
                                >
                                    <Typography variant="body2" sx={{ color: "#334155", fontWeight: 600 }}>
                                        {d.required ? "• [Bắt buộc] " : "• "}
                                        {d.name || d.code || "Tài liệu"}
                                    </Typography>
                                </Box>
                            ))
                        ) : (
                            <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                                Không có hồ sơ bắt buộc chung.
                            </Typography>
                        )}
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
                                                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} sx={{ mt: 0.9 }}>
                                                    <Chip
                                                        size="small"
                                                        label={`Mã: ${detail.methodCode || "—"}`}
                                                        sx={{ bgcolor: "rgba(59,130,246,0.12)", color: "#1d4ed8", fontWeight: 700 }}
                                                    />
                                                    <Chip
                                                        size="small"
                                                        label={`Chỉ tiêu: ${Number.isFinite(Number(detail.quota)) && Number(detail.quota) > 0 ? detail.quota : "—"}`}
                                                        sx={{ bgcolor: "rgba(16,185,129,0.12)", color: "#047857", fontWeight: 700 }}
                                                    />
                                                    <Chip
                                                        size="small"
                                                        label={detail.allowReservationSubmission ? "Cho phép giữ chỗ" : "Không giữ chỗ"}
                                                        sx={{
                                                            bgcolor: detail.allowReservationSubmission ? "rgba(250,204,21,0.16)" : "rgba(148,163,184,0.14)",
                                                            color: detail.allowReservationSubmission ? "#a16207" : "#475569",
                                                            fontWeight: 700,
                                                        }}
                                                    />
                                                </Stack>
                                            </Box>
                                            <Chip size="small" label={stateUi.label} sx={{ bgcolor: stateUi.bg, color: stateUi.color, fontWeight: 700 }} />
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ px: 2, pb: 2 }}>
                                        <Stack spacing={2}>
                                            <Box
                                                sx={{
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    bgcolor: "rgba(239,246,255,0.75)",
                                                    border: "1px solid rgba(191,219,254,0.7)",
                                                }}
                                            >
                                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#1e3a8a", mb: 0.5 }}>
                                                    Mô tả phương thức
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: "#475569", lineHeight: 1.7 }}>
                                                    {detail.description || "Không có mô tả chi tiết cho phương thức này."}
                                                </Typography>
                                            </Box>

                                            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                                                <Card
                                                    variant="outlined"
                                                    sx={{
                                                        flex: 1.15,
                                                        borderRadius: 2.5,
                                                        borderColor: "rgba(148,163,184,0.28)",
                                                        boxShadow: "0 10px 22px rgba(15,23,42,0.05)",
                                                    }}
                                                >
                                                    <CardContent sx={{ p: 1.6, "&:last-child": { pb: 1.6 } }}>
                                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
                                                            <PlaylistAddCheckCircleIcon sx={{ color: "#2563eb", fontSize: 20 }} />
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                                                Các bước quy trình
                                                            </Typography>
                                                            <Chip
                                                                size="small"
                                                                label={`${(detail.admissionProcessSteps || []).length} bước`}
                                                                sx={{ bgcolor: "rgba(37,99,235,0.1)", color: "#1d4ed8", fontWeight: 700, ml: "auto" }}
                                                            />
                                                        </Stack>
                                                        <Stack spacing={1}>
                                                            {(detail.admissionProcessSteps || []).length > 0 ? (
                                                                detail.admissionProcessSteps.map((s, sIdx) => (
                                                                    <Card
                                                                        key={`step-${sIdx}`}
                                                                        variant="outlined"
                                                                        sx={{
                                                                            borderRadius: 2,
                                                                            borderColor: "rgba(219,234,254,0.95)",
                                                                            bgcolor: "rgba(248,250,252,0.95)",
                                                                        }}
                                                                    >
                                                                        <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
                                                                            <Stack direction="row" spacing={1.1} alignItems="flex-start">
                                                                                <Box
                                                                                    sx={{
                                                                                        width: 26,
                                                                                        height: 26,
                                                                                        borderRadius: "50%",
                                                                                        bgcolor: "rgba(37,99,235,0.15)",
                                                                                        color: "#1d4ed8",
                                                                                        fontSize: 12,
                                                                                        fontWeight: 800,
                                                                                        display: "flex",
                                                                                        alignItems: "center",
                                                                                        justifyContent: "center",
                                                                                        flexShrink: 0,
                                                                                    }}
                                                                                >
                                                                                    {s.stepOrder ?? sIdx + 1}
                                                                                </Box>
                                                                                <Box>
                                                                                    <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
                                                                                        {s.stepName || `Bước ${sIdx + 1}`}
                                                                                    </Typography>
                                                                                    {s.description ? (
                                                                                        <Typography variant="body2" sx={{ color: "#64748b", mt: 0.25 }}>
                                                                                            {s.description}
                                                                                        </Typography>
                                                                                    ) : null}
                                                                                </Box>
                                                                            </Stack>
                                                                        </CardContent>
                                                                    </Card>
                                                                ))
                                                            ) : (
                                                                <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                                                                    Chưa có bước quy trình.
                                                                </Typography>
                                                            )}
                                                        </Stack>
                                                    </CardContent>
                                                </Card>

                                                <Card
                                                    variant="outlined"
                                                    sx={{
                                                        flex: 0.95,
                                                        borderRadius: 2.5,
                                                        borderColor: "rgba(148,163,184,0.28)",
                                                        boxShadow: "0 10px 22px rgba(15,23,42,0.05)",
                                                    }}
                                                >
                                                    <CardContent sx={{ p: 1.6, "&:last-child": { pb: 1.6 } }}>
                                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
                                                            <FolderOpenIcon sx={{ color: "#2563eb", fontSize: 20 }} />
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                                                Hồ sơ theo phương thức
                                                            </Typography>
                                                            <Chip
                                                                size="small"
                                                                label={`${(detail.methodDocumentRequirements || []).length} hồ sơ`}
                                                                sx={{ bgcolor: "rgba(16,185,129,0.1)", color: "#047857", fontWeight: 700, ml: "auto" }}
                                                            />
                                                        </Stack>
                                                        <Stack spacing={0.9}>
                                                            {(detail.methodDocumentRequirements || []).length > 0 ? (
                                                                detail.methodDocumentRequirements.map((d, dIdx) => (
                                                                    <Box
                                                                        key={`doc-chip-${dIdx}`}
                                                                        sx={{
                                                                            borderRadius: 2,
                                                                            border: "1px solid rgba(148,163,184,0.22)",
                                                                            bgcolor: d.required ? "rgba(22,163,74,0.08)" : "rgba(248,250,252,0.95)",
                                                                            px: 1.1,
                                                                            py: 0.9,
                                                                        }}
                                                                    >
                                                                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                                                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                                                                                <CheckCircleIcon sx={{ fontSize: 16, color: d.required ? "#16a34a" : "#94a3b8", flexShrink: 0 }} />
                                                                                <Box sx={{ minWidth: 0 }}>
                                                                                    <Typography sx={{ fontWeight: 700, color: "#0f172a", lineHeight: 1.35 }}>
                                                                                        {d.name || d.code || "Tài liệu"}
                                                                                    </Typography>
                                                                                    <Typography variant="caption" sx={{ color: "#64748b" }}>
                                                                                        {d.code || "—"}
                                                                                    </Typography>
                                                                                </Box>
                                                                            </Stack>
                                                                            <Chip
                                                                                size="small"
                                                                                label={d.required ? "Bắt buộc" : "Tùy chọn"}
                                                                                sx={{
                                                                                    bgcolor: d.required ? "rgba(22,163,74,0.12)" : "rgba(148,163,184,0.14)",
                                                                                    color: d.required ? "#166534" : "#475569",
                                                                                    fontWeight: 700,
                                                                                }}
                                                                            />
                                                                        </Stack>
                                                                    </Box>
                                                                ))
                                                            ) : (
                                                                <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                                                                    Không có hồ sơ riêng cho phương thức này.
                                                                </Typography>
                                                            )}
                                                        </Stack>
                                                    </CardContent>
                                                </Card>
                                            </Stack>
                                        </Stack>
                                    </AccordionDetails>
                                </Accordion>
                            );
                        })}
                    </Stack>
                </CardContent>
            </Card>
            </Box>

            <Dialog
                open={confirmPublishOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    if (!publishLoading) setConfirmPublishOpen(false);
                }}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: "16px" } }}
            >
                <DialogContent>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Công bố chiến dịch?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Bạn có chắc chắn muốn <ConfirmHighlight>công bố chiến dịch này</ConfirmHighlight>? Sau khi công bố sẽ{" "}
                        <ConfirmHighlight>không thể chỉnh sửa thông tin cơ bản</ConfirmHighlight>.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setConfirmPublishOpen(false)} disabled={publishLoading} sx={{ textTransform: "none" }}>
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handlePublishCampaign}
                        disabled={publishLoading}
                        sx={{ textTransform: "none", fontWeight: 600, bgcolor: "#0D64DE", borderRadius: "12px" }}
                    >
                        {publishLoading ? "Đang công bố..." : "Công bố"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Clone dialog */}
            <Dialog
                open={confirmCloneOpen}
                onClose={(_, reason) => { if (reason !== "backdropClick" && !cloneLoading) setConfirmCloneOpen(false); }}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: "16px" } }}
            >
                <DialogContent sx={{ pt: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Nhân bản chiến dịch?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Bạn có chắc chắn muốn <ConfirmHighlight>nhân bản chiến dịch này</ConfirmHighlight> để tạo{" "}
                        <ConfirmHighlight>một bản nháp mới cho năm {Number(campaign?.year) + 1}</ConfirmHighlight>?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button onClick={() => setConfirmCloneOpen(false)} disabled={cloneLoading} sx={{ textTransform: "none" }}>
                        Bỏ qua
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCloneCampaign}
                        disabled={cloneLoading}
                        sx={{ textTransform: "none", fontWeight: 600, borderRadius: "12px", bgcolor: "#0D64DE" }}
                    >
                        {cloneLoading ? "Đang nhân bản..." : "Xác nhận nhân bản"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Cancel dialog */}
            <Dialog
                open={confirmCancelOpen}
                onClose={(_, reason) => { if (reason !== "backdropClick" && !cancelLoading) resetCancelFlow(); }}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: "16px" } }}
            >
                {cancelBlockedMessage ? (
                    <>
                        <DialogContent sx={{ pt: 3 }}>
                            <Stack spacing={2} alignItems="flex-start">
                                <Typography sx={{ fontSize: 40, lineHeight: 1 }}>⚠️</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b" }}>
                                    Không thể hủy chiến dịch
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                                    {cancelBlockedMessage}
                                </Typography>
                            </Stack>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2.5 }}>
                            <Button onClick={resetCancelFlow} sx={{ textTransform: "none" }}>Đóng</Button>
                        </DialogActions>
                    </>
                ) : normalizeCampaignStatus(campaign?.status) === "OPEN" ? (
                    <>
                        <DialogContent sx={{ pt: 3 }}>
                            <Stack spacing={1.5} alignItems="flex-start">
                                <Typography sx={{ fontSize: 40, lineHeight: 1 }}>⚠️</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b" }}>
                                    Hủy chiến dịch đang mở
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                    Toàn bộ {(campaign?.admissionMethodTimelines || []).length} gói tuyển sinh sẽ bị đóng.{" "}
                                    <Box component="span" sx={{ fontWeight: 700, color: "#b91c1c" }}>Hành động này không thể hoàn tác.</Box>
                                </Typography>
                            </Stack>
                            <TextField
                                label="Lý do hủy"
                                placeholder="Nhập lý do hủy chiến dịch…"
                                multiline
                                minRows={3}
                                fullWidth
                                required
                                value={cancelReason}
                                onChange={(e) => { setCancelReason(e.target.value); if (cancelReasonError) setCancelReasonError(""); }}
                                error={!!cancelReasonError}
                                helperText={cancelReasonError}
                                sx={{ mt: 2.5, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                            />
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                            <Button onClick={resetCancelFlow} disabled={cancelLoading} sx={{ textTransform: "none", color: "#64748b" }}>
                                Bỏ qua
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleCancelCampaign}
                                disabled={cancelLoading || !cancelReason.trim()}
                                sx={{ textTransform: "none", fontWeight: 600, borderRadius: "12px", bgcolor: "#991b1b", "&:hover": { bgcolor: "#7f1d1d" } }}
                            >
                                {cancelLoading ? "Đang xử lý…" : "Xác nhận hủy"}
                            </Button>
                        </DialogActions>
                    </>
                ) : (
                    <>
                        <DialogContent sx={{ pt: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>Hủy chiến dịch?</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Bạn có chắc muốn hủy chiến dịch <ConfirmHighlight>{campaign?.name}</ConfirmHighlight>?
                            </Typography>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                            <Button onClick={resetCancelFlow} disabled={cancelLoading} sx={{ textTransform: "none", color: "#64748b" }}>Đóng</Button>
                            <Button
                                variant="contained"
                                onClick={handleCancelCampaign}
                                disabled={cancelLoading}
                                sx={{ textTransform: "none", fontWeight: 600, borderRadius: "12px", bgcolor: "#991b1b", "&:hover": { bgcolor: "#7f1d1d" } }}
                            >
                                {cancelLoading ? "Đang xử lý…" : "Hủy chiến dịch"}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </>
    );
}

