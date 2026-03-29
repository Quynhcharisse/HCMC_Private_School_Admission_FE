import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    LinearProgress,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CampaignIcon from "@mui/icons-material/Campaign";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import { useSchool } from "../../../contexts/SchoolContext.jsx";
import {
    getCampaignTemplatesByYear,
    updateCampaignTemplate,
    updateCampaignTemplateStatus,
} from "../../../services/CampaignService.jsx";
import CampaignOfferingsSection from "./CampaignOfferingsSection.jsx";

const HEADER_ACCENT = "#0D64DE";

const STATUS_UI = {
    OPEN: { label: "Đang mở", badgeBg: "rgba(34, 197, 94, 0.12)", badgeColor: "#16a34a" },
    PAUSED: { label: "Tạm dừng", badgeBg: "rgba(250, 204, 21, 0.2)", badgeColor: "#a16207" },
    CLOSED: { label: "Đã đóng", badgeBg: "rgba(148, 163, 184, 0.25)", badgeColor: "#64748b" },
    EXPIRED: { label: "Hết hạn", badgeBg: "rgba(248, 113, 113, 0.15)", badgeColor: "#b91c1c" },
};

const CURRENT_YEAR = new Date().getFullYear();
const SCAN_YEARS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3];

function mapTemplate(row) {
    if (!row) return null;
    const id = row.admissionCampaignTemplateId ?? row.id;
    const status = row.status ? String(row.status).toUpperCase() : "OPEN";
    return {
        ...row,
        id,
        admissionCampaignTemplateId: row.admissionCampaignTemplateId ?? row.id,
        status,
    };
}

function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN");
}

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

const CAMPAIGN_ERROR_VI = {
    "Request is required": "Yêu cầu không được để trống",
    "Name is required": "Tên chiến dịch là bắt buộc",
    "Start date and end date are required": "Ngày bắt đầu và ngày kết thúc là bắt buộc",
    "End date must be after start date": "Ngày kết thúc phải sau ngày bắt đầu",
};

function getCampaignErrorMessage(backendMessage, fallback) {
    if (!backendMessage) return fallback;
    const trimmed = String(backendMessage).trim();
    return CAMPAIGN_ERROR_VI[trimmed] ?? trimmed ?? fallback;
}

export default function SchoolCampaignDetail() {
    const navigate = useNavigate();
    const { campaignId } = useParams();
    const location = useLocation();
    const { isPrimaryBranch } = useSchool();
    const initialCampaign = location.state?.campaign;

    const [campaign, setCampaign] = useState(initialCampaign || null);
    const [loadingCampaign, setLoadingCampaign] = useState(!initialCampaign);
    const [formValues, setFormValues] = useState({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
    });
    const [formErrors, setFormErrors] = useState({});
    const [submitLoading, setSubmitLoading] = useState(false);
    const [confirmPauseOpen, setConfirmPauseOpen] = useState(false);
    const [confirmResumeOpen, setConfirmResumeOpen] = useState(false);
    /** Tăng sau khi lưu template để remount phần chỉ tiêu và gọi lại API */
    const [offeringsRemountKey, setOfferingsRemountKey] = useState(0);

    const idNum = campaignId ? parseInt(campaignId, 10) : NaN;

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
                /* continue */
            }
        }
        return null;
    }, [idNum]);

    useEffect(() => {
        if (!isPrimaryBranch) {
            navigate("/school/campaigns", { replace: true });
        }
    }, [isPrimaryBranch, navigate]);

    useEffect(() => {
        if (initialCampaign) {
            const m = mapTemplate(initialCampaign);
            setCampaign(m);
            setFormValues({
                name: m.name || "",
                description: m.description || "",
                startDate: m.startDate?.slice(0, 10) || "",
                endDate: m.endDate?.slice(0, 10) || "",
            });
            setLoadingCampaign(false);
            return;
        }
        let cancelled = false;
        setLoadingCampaign(true);
        resolveCampaignFromApi().then((c) => {
            if (cancelled) return;
            if (c) {
                setCampaign(c);
                setFormValues({
                    name: c.name || "",
                    description: c.description || "",
                    startDate: c.startDate?.slice(0, 10) || "",
                    endDate: c.endDate?.slice(0, 10) || "",
                });
            } else setCampaign(null);
            setLoadingCampaign(false);
        });
        return () => {
            cancelled = true;
        };
    }, [initialCampaign, resolveCampaignFromApi]);

    const status = String(campaign?.status || "OPEN").toUpperCase();
    const statusInfo = STATUS_UI[status] ?? {
        label: status,
        badgeBg: "rgba(7, 200, 81, 0.2)",
        badgeColor: "#64748b",
    };

    const formLocked = status === "OPEN" || status === "CLOSED" || status === "EXPIRED";
    const readOnlyTerminal = status === "CLOSED" || status === "EXPIRED";

    const canMutateOfferings = isPrimaryBranch && !readOnlyTerminal;

    const progress = useMemo(
        () => getTimelineProgress(campaign?.startDate, campaign?.endDate),
        [campaign?.startDate, campaign?.endDate]
    );

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormValues((prev) => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        const errors = {};
        if (!formValues.name?.trim()) errors.name = "Tên chiến dịch là bắt buộc";
        if (!formValues.startDate?.trim()) errors.startDate = "Ngày bắt đầu là bắt buộc";
        if (!formValues.endDate?.trim()) errors.endDate = "Ngày kết thúc là bắt buộc";
        if (
            formValues.startDate &&
            formValues.endDate &&
            new Date(formValues.endDate) < new Date(formValues.startDate)
        ) {
            errors.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const refreshCampaign = async () => {
        const c = await resolveCampaignFromApi();
        if (c) {
            setCampaign(c);
            setFormValues({
                name: c.name || "",
                description: c.description || "",
                startDate: c.startDate?.slice(0, 10) || "",
                endDate: c.endDate?.slice(0, 10) || "",
            });
            return c;
        }
        return null;
    };

    const templateId = campaign?.admissionCampaignTemplateId ?? campaign?.id;

    const runPause = async () => {
        if (!templateId) return;
        setSubmitLoading(true);
        try {
            const res = await updateCampaignTemplateStatus(templateId, "PAUSED");
            if (res?.status === 200 || res?.data) {
                enqueueSnackbar(
                    "Chiến dịch đã tạm dừng. Bây giờ bạn có thể chỉnh sửa thông tin.",
                    { variant: "success" }
                );
                setConfirmPauseOpen(false);
                const updated = await refreshCampaign();
                setOfferingsRemountKey((k) => k + 1);
                if (updated && campaignId) {
                    navigate(`/school/campaigns/detail/${campaignId}`, {
                        replace: true,
                        state: { campaign: updated },
                    });
                }
            } else {
                enqueueSnackbar(res?.data?.message || "Không thể tạm dừng chiến dịch", { variant: "error" });
            }
        } catch (err) {
            enqueueSnackbar(
                getCampaignErrorMessage(err?.response?.data?.message, "Không thể tạm dừng chiến dịch"),
                { variant: "error" }
            );
        } finally {
            setSubmitLoading(false);
        }
    };

    const runResume = async () => {
        if (!templateId) return;
        setSubmitLoading(true);
        try {
            const res = await updateCampaignTemplateStatus(templateId, "OPEN");
            if (res?.status === 200 || res?.data) {
                enqueueSnackbar("Chiến dịch đã được mở lại.", { variant: "success" });
                setConfirmResumeOpen(false);
                const updated = await refreshCampaign();
                setOfferingsRemountKey((k) => k + 1);
                if (updated && campaignId) {
                    navigate(`/school/campaigns/detail/${campaignId}`, {
                        replace: true,
                        state: { campaign: updated },
                    });
                }
            } else {
                enqueueSnackbar(res?.data?.message || "Không thể mở lại chiến dịch", { variant: "error" });
            }
        } catch (err) {
            enqueueSnackbar(
                getCampaignErrorMessage(err?.response?.data?.message, "Không thể mở lại chiến dịch"),
                { variant: "error" }
            );
        } finally {
            setSubmitLoading(false);
        }
    };

    const runSaveTemplate = async () => {
        if (!validateForm() || !templateId) return;
        setSubmitLoading(true);
        try {
            const res = await updateCampaignTemplate({
                admissionCampaignTemplateId: templateId,
                name: formValues.name.trim(),
                description: formValues.description?.trim() || "",
                startDate: formValues.startDate?.trim() || "",
                endDate: formValues.endDate?.trim() || "",
            });
            if (res?.status === 200 || res?.data) {
                enqueueSnackbar("Đã lưu thay đổi chiến dịch.", { variant: "success" });
                const updated = await refreshCampaign();
                setOfferingsRemountKey((k) => k + 1);
                if (updated && campaignId) {
                    navigate(`/school/campaigns/detail/${campaignId}`, {
                        replace: true,
                        state: { campaign: updated },
                    });
                }
            } else {
                enqueueSnackbar(
                    getCampaignErrorMessage(res?.data?.message, "Lưu thất bại"),
                    { variant: "error" }
                );
            }
        } catch (err) {
            enqueueSnackbar(
                getCampaignErrorMessage(err?.response?.data?.message, "Lưu thất bại"),
                { variant: "error" }
            );
        } finally {
            setSubmitLoading(false);
        }
    };

    if (!isPrimaryBranch) return null;

    if (loadingCampaign) {
        return (
            <Box sx={{ width: "100%", py: 4 }}>
                <LinearProgress sx={{ borderRadius: 1 }} />
            </Box>
        );
    }

    if (!campaign) {
        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%" }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate("/school/campaigns")}
                    sx={{ alignSelf: "flex-start", textTransform: "none" }}
                >
                    Quay lại danh sách
                </Button>
                <Card
                    sx={{
                        borderRadius: "16px",
                        p: 4,
                        textAlign: "center",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 24px rgba(51,65,85,0.06)",
                    }}
                >
                    <CampaignIcon sx={{ fontSize: 64, color: "#cbd5e1", mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        Không tìm thấy chiến dịch. Vui lòng chọn từ danh sách chiến dịch tuyển sinh.
                    </Typography>
                </Card>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                width: "100%",
                fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
            }}
        >
            <Card
                elevation={0}
                sx={{
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 24px rgba(51,65,85,0.06)",
                    overflow: "hidden",
                }}
            >
                <Box
                    sx={{
                        background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                        color: "#fff",
                        p: 3,
                        boxShadow: "0 8px 32px rgba(13, 100, 222, 0.25)",
                    }}
                >
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate("/school/campaigns")}
                        sx={{
                            color: "#fff",
                            textTransform: "none",
                            mb: 1,
                            "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
                        }}
                    >
                        Danh sách chiến dịch
                    </Button>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: { xs: "column", md: "row" },
                            alignItems: { xs: "flex-start", md: "flex-start" },
                            justifyContent: "space-between",
                            gap: 2,
                        }}
                    >
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
                                {campaign.name}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.92 }}>
                                Năm {campaign.year} · {formatDate(campaign.startDate)} –{" "}
                                {formatDate(campaign.endDate)}
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                            <Box
                                component="span"
                                sx={{
                                    px: 2,
                                    py: 0.75,
                                    borderRadius: "999px",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: statusInfo.badgeColor,
                                    backgroundColor: "#fff",
                                    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
                                }}
                            >
                                {statusInfo.label}
                            </Box>
                            {status === "OPEN" && (
                                <Button
                                    variant="contained"
                                    onClick={() => setConfirmPauseOpen(true)}
                                    disabled={submitLoading}
                                    sx={{
                                        bgcolor: "rgba(255,255,255,0.95)",
                                        color: HEADER_ACCENT,
                                        textTransform: "none",
                                        fontWeight: 600,
                                        borderRadius: "12px",
                                        "&:hover": { bgcolor: "#fff" },
                                    }}
                                >
                                    Tạm dừng chiến dịch
                                </Button>
                            )}
                            {status === "PAUSED" && (
                                <Button
                                    variant="outlined"
                                    onClick={() => setConfirmResumeOpen(true)}
                                    disabled={submitLoading}
                                    sx={{
                                        borderColor: "rgba(255,255,255,0.8)",
                                        color: "#fff",
                                        textTransform: "none",
                                        fontWeight: 600,
                                        borderRadius: "12px",
                                    }}
                                >
                                    Mở lại chiến dịch
                                </Button>
                            )}
                        </Stack>
                    </Box>
                </Box>
            </Card>

            <Card
                elevation={0}
                sx={{
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 24px rgba(51,65,85,0.06)",
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: "#1e293b" }}>
                        Thông tin chiến dịch
                    </Typography>
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={2}
                        useFlexGap
                        sx={{ mb: 2 }}
                    >
                        <TextField
                            label="Tên chiến dịch"
                            name="name"
                            fullWidth
                            value={formValues.name}
                            onChange={handleFormChange}
                            disabled={formLocked}
                            error={!!formErrors.name}
                            helperText={formErrors.name}
                            sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                        />
                    </Stack>
                    <TextField
                        label="Mô tả"
                        name="description"
                        fullWidth
                        multiline
                        rows={3}
                        value={formValues.description}
                        onChange={handleFormChange}
                        disabled={formLocked}
                        sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                    />
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                            label="Ngày bắt đầu"
                            name="startDate"
                            type="date"
                            fullWidth
                            value={formValues.startDate}
                            onChange={handleFormChange}
                            disabled={formLocked}
                            error={!!formErrors.startDate}
                            helperText={formErrors.startDate}
                            InputLabelProps={{ shrink: true }}
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                        />
                        <TextField
                            label="Ngày kết thúc"
                            name="endDate"
                            type="date"
                            fullWidth
                            value={formValues.endDate}
                            onChange={handleFormChange}
                            disabled={formLocked}
                            error={!!formErrors.endDate}
                            helperText={formErrors.endDate}
                            InputLabelProps={{ shrink: true }}
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                        />
                    </Stack>
                    {status === "PAUSED" && (
                        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                            <Button
                                variant="contained"
                                onClick={runSaveTemplate}
                                disabled={submitLoading}
                                sx={{
                                    bgcolor: HEADER_ACCENT,
                                    textTransform: "none",
                                    fontWeight: 600,
                                    borderRadius: "12px",
                                    px: 3,
                                    "&:hover": { bgcolor: "#0a52b8" },
                                }}
                            >
                                Lưu thay đổi
                            </Button>
                        </Box>
                    )}
                    {formLocked && status === "OPEN" && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                            Chiến dịch đang mở: thông tin bị khóa. Chọn «Tạm dừng chiến dịch» để chỉnh sửa.
                        </Typography>
                    )}
                    {readOnlyTerminal && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                            Chiến dịch đã kết thúc — chỉ xem.
                        </Typography>
                    )}
                </CardContent>
            </Card>

            <Card
                elevation={0}
                sx={{
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 24px rgba(51,65,85,0.06)",
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: "#1e293b" }}>
                        Tiến độ thời gian
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                            height: 10,
                            borderRadius: 5,
                            bgcolor: "rgba(13, 100, 222, 0.12)",
                            "& .MuiLinearProgress-bar": { borderRadius: 5, bgcolor: HEADER_ACCENT },
                        }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                        {formatDate(campaign.startDate)} → {formatDate(campaign.endDate)}
                    </Typography>
                </CardContent>
            </Card>

            <Card
                elevation={0}
                sx={{
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 24px rgba(51,65,85,0.06)",
                    p: 0,
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    <CampaignOfferingsSection
                        key={`offerings-${templateId}-${offeringsRemountKey}`}
                        campaignId={Number(templateId)}
                        campaignPaused={status === "PAUSED"}
                        canMutate={canMutateOfferings}
                    />
                </CardContent>
            </Card>

            <Dialog
                open={confirmPauseOpen}
                onClose={() => !submitLoading && setConfirmPauseOpen(false)}
                PaperProps={{ sx: { borderRadius: "16px" } }}
            >
                <DialogContent>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Tạm dừng chiến dịch?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Sau khi tạm dừng, bạn có thể chỉnh sửa thông tin chiến dịch và chỉ tiêu. Xác nhận thực hiện?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setConfirmPauseOpen(false)} disabled={submitLoading} sx={{ textTransform: "none" }}>
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={runPause}
                        disabled={submitLoading}
                        sx={{ textTransform: "none", fontWeight: 600, bgcolor: HEADER_ACCENT, borderRadius: "12px" }}
                    >
                        Tạm dừng
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={confirmResumeOpen}
                onClose={() => !submitLoading && setConfirmResumeOpen(false)}
                PaperProps={{ sx: { borderRadius: "16px" } }}
            >
                <DialogContent>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Mở lại chiến dịch?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Chiến dịch sẽ chuyển sang trạng thái đang mở và khóa chỉnh sửa. Hãy đảm bảo bạn đã lưu mọi thay đổi.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setConfirmResumeOpen(false)} disabled={submitLoading} sx={{ textTransform: "none" }}>
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={runResume}
                        disabled={submitLoading}
                        sx={{ textTransform: "none", fontWeight: 600, bgcolor: HEADER_ACCENT, borderRadius: "12px" }}
                    >
                        Mở lại
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
