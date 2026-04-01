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
    Tooltip,
    Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CampaignIcon from "@mui/icons-material/Campaign";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import { useSchool } from "../../../contexts/SchoolContext.jsx";
import {
    getCampaignTemplatesByYear,
    cancelCampaignTemplate,
    cloneCampaignTemplate,
    updateCampaignTemplate,
    updateCampaignTemplateStatus,
} from "../../../services/CampaignService.jsx";
import CampaignOfferingsSection from "./CampaignOfferingsSection.jsx";

const HEADER_ACCENT = "#0D64DE";

const STATUS_UI = {
    DRAFT: { label: "Bản nháp", badgeBg: "rgba(100, 116, 139, 0.14)", badgeColor: "#475569" },
    OPEN: { label: "Đang mở", badgeBg: "rgba(34, 197, 94, 0.12)", badgeColor: "#16a34a" },
    PAUSED: { label: "Tạm dừng", badgeBg: "rgba(250, 204, 21, 0.2)", badgeColor: "#a16207" },
    CANCELLED: { label: "Đã hủy", badgeBg: "rgba(248, 113, 113, 0.16)", badgeColor: "#b91c1c" },
    CLOSED: { label: "Đã đóng", badgeBg: "rgba(148, 163, 184, 0.25)", badgeColor: "#64748b" },
    EXPIRED: { label: "Hết hạn", badgeBg: "rgba(248, 113, 113, 0.15)", badgeColor: "#b91c1c" },
};

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

function mapTemplate(row) {
    if (!row) return null;
    const id = row.admissionCampaignTemplateId ?? row.id;
    const status = normalizeCampaignStatus(row.status);
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

function parseLocalDate(iso) {
    const t = String(iso ?? "").trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const da = Number(m[3]);
    const d = new Date(y, mo - 1, da);
    if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) return null;
    return d;
}

function startOfLocalToday() {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function addLocalDays(date, delta) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + delta);
    return d;
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
    "No school campus account found": "Không tìm thấy tài khoản cơ sở thuộc trường",
    "Request is required": "Yêu cầu không được để trống",
    "Name is required": "Tên chiến dịch là bắt buộc",
    "Name is too long. Maximum length is 100 characters": "Tên chiến dịch quá dài. Tối đa 100 ký tự",
    "Description is required": "Mô tả là bắt buộc",
    "Year is required": "Năm học là bắt buộc",
    "Cannot create a campaign for a past academic year": "Không thể tạo chiến dịch cho năm học đã qua",
    "Start date are required": "Ngày bắt đầu là bắt buộc",
    "End date are required": "Ngày kết thúc là bắt buộc",
    "Start date and end date are required": "Ngày bắt đầu và ngày kết thúc là bắt buộc",
    "Start date cannot be in the past":
        "Ngày bắt đầu không được ở quá khứ (cho phép lùi tối đa 1 ngày so với hôm nay)",
    "End date must be in the future": "Ngày kết thúc phải từ hôm nay trở đi (không được ở quá khứ)",
    "End date must be after start date":
        "Ngày kết thúc phải sau ngày bắt đầu (chiến dịch phải kéo dài ít nhất hơn 1 ngày)",
    Forbidden: "Bạn không có quyền thực hiện hành động này",
    "Campaign not found": "Dữ liệu không tồn tại hoặc đã bị xóa",
    "Campaign is not in DRAFT status": "Chiến dịch này đã được công bố hoặc đã đóng",
    "Campaign has expired": "Chiến dịch đã hết hạn, vui lòng cập nhật ngày kết thúc trước khi công bố",
    "Campaign already cancelled": "Chiến dịch này đã hủy trước đó",
};

function getCampaignErrorMessage(backendMessage, fallback) {
    if (!backendMessage) return fallback;
    const trimmed = String(backendMessage).trim();
    if (CAMPAIGN_ERROR_VI[trimmed]) return CAMPAIGN_ERROR_VI[trimmed];

    const earlyBird =
        /^Start date is too early\. Early bird for (\d+) should start from October (\d+)$/.exec(trimmed);
    if (earlyBird) {
        const [, y, octYear] = earlyBird;
        return `Ngày bắt đầu quá sớm. Chiến dịch năm ${y} chỉ được bắt đầu sớm nhất từ 01/10/${octYear}.`;
    }

    const endInvalid =
        /^End date is invalid\. A campaign for (\d+) must at least last until the end of (\d+)$/.exec(trimmed);
    if (endInvalid) {
        const [, y, untilYear] = endInvalid;
        return `Ngày kết thúc không hợp lệ. Chiến dịch năm ${y} phải kéo dài ít nhất đến hết ngày 31/12/${untilYear}.`;
    }

    const endWithin = /^End date must be within the academic year (\d+)$/.exec(trimmed);
    if (endWithin) {
        return `Ngày kết thúc phải nằm trọn trong năm dương lịch ${endWithin[1]} (theo năm học đã chọn).`;
    }

    const duplicate = /^A campaign template for the year (\d+) already exists$/.exec(trimmed);
    if (duplicate) {
        return `Đã tồn tại chiến dịch tuyển sinh cho năm ${duplicate[1]}.`;
    }
    const duplicateTypo = /^A campaign template for the (\d+)year already exists$/.exec(trimmed);
    if (duplicateTypo) {
        return `Đã tồn tại chiến dịch tuyển sinh cho năm ${duplicateTypo[1]}.`;
    }

    return trimmed || fallback;
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
    const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
    const [confirmCloneOpen, setConfirmCloneOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [cancelReasonError, setCancelReasonError] = useState("");
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

    const status = normalizeCampaignStatus(campaign?.status);
    const statusInfo = STATUS_UI[status] ?? {
        label: status,
        badgeBg: "rgba(7, 200, 81, 0.2)",
        badgeColor: "#64748b",
    };

    const formLocked = status !== "DRAFT" || !isPrimaryBranch;
    const readOnlyTerminal = status === "CLOSED" || status === "EXPIRED";
    const canMutateOfferings = status === "OPEN" && !readOnlyTerminal;
    const isDraft = status === "DRAFT";
    const isCancelled = status === "CANCELLED";
    const today = startOfLocalToday();
    const endDateObj = parseLocalDate(campaign?.endDate?.slice?.(0, 10) || campaign?.endDate);
    const publishBlockedByPastEndDate = !!(endDateObj && endDateObj.getTime() < today.getTime());

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
        const name = formValues.name?.trim() ?? "";
        const description = formValues.description?.trim() ?? "";
        const yearNum = Number(campaign?.year);
        const startIso = formValues.startDate?.trim() ?? "";
        const endIso = formValues.endDate?.trim() ?? "";

        if (!name) errors.name = "Tên chiến dịch là bắt buộc";
        else if (name.length > 100) errors.name = "Tên chiến dịch quá dài. Tối đa 100 ký tự";

        if (!description) errors.description = "Mô tả là bắt buộc";

        if (!Number.isFinite(yearNum) || yearNum <= 0) {
            errors.year = "Năm học là bắt buộc";
        } else if (yearNum < CURRENT_YEAR) {
            errors.year = "Không thể tạo chiến dịch cho năm học đã qua";
        }

        if (!startIso) errors.startDate = "Ngày bắt đầu là bắt buộc";
        if (!endIso) errors.endDate = "Ngày kết thúc là bắt buộc";

        const start = parseLocalDate(startIso);
        const end = parseLocalDate(endIso);
        if (startIso && !start) errors.startDate = "Ngày bắt đầu không hợp lệ";
        if (endIso && !end) errors.endDate = "Ngày kết thúc không hợp lệ";

        const today = startOfLocalToday();
        const earliestStartAllowed = addLocalDays(today, -1);

        if (start && !errors.startDate && start.getTime() < earliestStartAllowed.getTime()) {
            errors.startDate = "Ngày bắt đầu không được ở quá khứ (cho phép lùi tối đa 1 ngày so với hôm nay)";
        }
        if (end && !errors.endDate && end.getTime() < today.getTime()) {
            errors.endDate = "Ngày kết thúc phải từ hôm nay trở đi (không được ở quá khứ)";
        }
        if (start && end && !errors.startDate && !errors.endDate && end.getTime() <= start.getTime()) {
            errors.endDate = "Ngày kết thúc phải sau ngày bắt đầu (chiến dịch phải kéo dài ít nhất hơn 1 ngày)";
        }

        if (Number.isFinite(yearNum) && yearNum > 0 && start && !errors.startDate) {
            const oct1Prev = new Date(yearNum - 1, 9, 1);
            if (start.getTime() < oct1Prev.getTime()) {
                errors.startDate = `Ngày bắt đầu quá sớm. Chiến dịch năm ${yearNum} chỉ được bắt đầu sớm nhất từ 01/10/${yearNum - 1}.`;
            }
        }

        if (Number.isFinite(yearNum) && yearNum > 0 && end && !errors.endDate) {
            const dec31Prev = new Date(yearNum - 1, 11, 31);
            if (end.getTime() < dec31Prev.getTime()) {
                errors.endDate = `Ngày kết thúc không hợp lệ. Chiến dịch năm ${yearNum} phải kéo dài ít nhất đến hết ngày 31/12/${yearNum - 1}.`;
            } else if (end.getFullYear() !== yearNum) {
                errors.endDate = `Ngày kết thúc phải nằm trọn trong năm dương lịch ${yearNum} (theo năm học đã chọn).`;
            }
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

    const runPublish = async () => {
        if (!templateId) return;
        setSubmitLoading(true);
        try {
            const res = await updateCampaignTemplateStatus(templateId);
            if (res?.status === 200 || res?.data) {
                enqueueSnackbar("Đã công bố chiến dịch thành công.", { variant: "success" });
                setConfirmPublishOpen(false);
                const updated = await refreshCampaign();
                setOfferingsRemountKey((k) => k + 1);
                if (updated && campaignId) {
                    navigate(`/school/campaigns/detail/${campaignId}`, {
                        replace: true,
                        state: { campaign: updated },
                    });
                }
            } else {
                enqueueSnackbar(getCampaignErrorMessage(res?.data?.message, "Không thể công bố chiến dịch"), {
                    variant: "error",
                });
            }
        } catch (err) {
            const statusCode = err?.response?.status;
            if (statusCode === 403) {
                enqueueSnackbar("Bạn không có quyền thực hiện hành động này", { variant: "error" });
            } else if (statusCode === 404) {
                enqueueSnackbar("Dữ liệu không tồn tại hoặc đã bị xóa", { variant: "error" });
            } else {
                enqueueSnackbar(
                    getCampaignErrorMessage(err?.response?.data?.message, "Không thể công bố chiến dịch"),
                    { variant: "error" }
                );
            }
        } finally {
            setSubmitLoading(false);
        }
    };

    const runCancelCampaign = async () => {
        if (!templateId) return;
        const reason = cancelReason.trim();
        if (!reason) {
            setCancelReasonError("Vui lòng nhập lý do hủy");
            return;
        }
        setSubmitLoading(true);
        try {
            const res = await cancelCampaignTemplate(templateId, reason);
            if (res?.status >= 200 && res?.status < 300) {
                enqueueSnackbar(res?.data?.message || "Đã hủy chiến dịch.", { variant: "success" });
                setConfirmCancelOpen(false);
                setCancelReason("");
                setCancelReasonError("");
                const updated = await refreshCampaign();
                setOfferingsRemountKey((k) => k + 1);
                if (updated && campaignId) {
                    navigate(`/school/campaigns/detail/${campaignId}`, {
                        replace: true,
                        state: { campaign: updated },
                    });
                }
            } else {
                enqueueSnackbar(getCampaignErrorMessage(res?.data?.message, "Không thể hủy chiến dịch"), {
                    variant: "error",
                });
            }
        } catch (err) {
            const code = err?.response?.status;
            if (code === 403) enqueueSnackbar("Bạn không có quyền thực hiện hành động này", { variant: "error" });
            else if (code === 404) enqueueSnackbar("Dữ liệu không tồn tại hoặc đã bị xóa", { variant: "error" });
            else
                enqueueSnackbar(getCampaignErrorMessage(err?.response?.data?.message, "Không thể hủy chiến dịch"), {
                    variant: "error",
                });
        } finally {
            setSubmitLoading(false);
        }
    };

    const runCloneCampaign = async () => {
        if (!templateId) return;
        setSubmitLoading(true);
        try {
            const res = await cloneCampaignTemplate(templateId);
            if (res?.status >= 200 && res?.status < 300) {
                const body = res?.data?.body ?? res?.data ?? {};
                const newId = Number(
                    body?.id ??
                        body?.admissionCampaignTemplateId ??
                        body?.data?.id ??
                        body?.data?.admissionCampaignTemplateId
                );
                enqueueSnackbar(res?.data?.message || "Đã sao chép chiến dịch sang bản nháp mới.", {
                    variant: "success",
                });
                if (Number.isFinite(newId) && newId > 0) {
                    navigate(`/school/campaigns/detail/${newId}`);
                } else {
                    await refreshCampaign();
                }
            } else {
                enqueueSnackbar(getCampaignErrorMessage(res?.data?.message, "Sao chép chiến dịch thất bại"), {
                    variant: "error",
                });
            }
        } catch (err) {
            enqueueSnackbar(getCampaignErrorMessage(err?.response?.data?.message, "Sao chép chiến dịch thất bại"), {
                variant: "error",
            });
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
                year: Number(campaign?.year),
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
                            alignItems: { xs: "flex-start", md: "center" },
                            justifyContent: "space-between",
                            gap: 2,
                        }}
                    >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
                                {campaign.name}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.92 }}>
                                Năm {campaign.year} · {formatDate(campaign.startDate)} –{" "}
                                {formatDate(campaign.endDate)}
                            </Typography>
                        </Box>
                        <Stack
                            direction="column"
                            spacing={1}
                            alignItems="flex-end"
                            sx={{ flexShrink: 0, ml: { md: 2 }, alignSelf: { xs: "stretch", md: "center" } }}
                        >
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
                            {isPrimaryBranch && isDraft && (
                                <Tooltip
                                    title={
                                        publishBlockedByPastEndDate
                                            ? "Chiến dịch đã hết hạn, vui lòng cập nhật ngày kết thúc trước khi công bố."
                                            : ""
                                    }
                                >
                                    <span>
                                        <Button
                                            variant="contained"
                                            onClick={() => setConfirmPublishOpen(true)}
                                            disabled={submitLoading || publishBlockedByPastEndDate}
                                            sx={{
                                                bgcolor: "rgba(255,255,255,0.95)",
                                                color: HEADER_ACCENT,
                                                textTransform: "none",
                                                fontWeight: 600,
                                                borderRadius: "12px",
                                                "&:hover": { bgcolor: "#fff" },
                                            }}
                                        >
                                            Công bố chiến dịch
                                        </Button>
                                    </span>
                                </Tooltip>
                            )}
                            {isPrimaryBranch && status === "OPEN" && (
                                <Button
                                    variant="outlined"
                                    onClick={() => {
                                        setCancelReason("");
                                        setCancelReasonError("");
                                        setConfirmCancelOpen(true);
                                    }}
                                    disabled={submitLoading}
                                    sx={{
                                        borderColor: "rgba(255,255,255,0.85)",
                                        color: "#fff",
                                        textTransform: "none",
                                        fontWeight: 600,
                                        borderRadius: "12px",
                                        "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.08)" },
                                    }}
                                >
                                    Hủy chiến dịch
                                </Button>
                            )}
                            {isPrimaryBranch && isCancelled && (
                                <Button
                                    variant="outlined"
                                    onClick={() => setConfirmCloneOpen(true)}
                                    disabled={submitLoading}
                                    sx={{
                                        borderColor: "rgba(255,255,255,0.85)",
                                        color: "#fff",
                                        textTransform: "none",
                                        fontWeight: 600,
                                        borderRadius: "12px",
                                        "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.08)" },
                                    }}
                                >
                                    Clone chiến dịch
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
                        error={!!formErrors.description}
                        helperText={formErrors.description}
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
                    {isPrimaryBranch && status === "DRAFT" && (
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
                    {formErrors.year && (
                        <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
                            {formErrors.year}
                        </Typography>
                    )}
                    {formLocked && status !== "DRAFT" && !readOnlyTerminal && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                            Chỉ có thể cập nhật khi chiến dịch ở trạng thái «Bản nháp (DRAFT)».
                        </Typography>
                    )}
                    {!isPrimaryBranch && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                            Bạn đang đăng nhập bằng Campus. Chỉ Primary Campus mới có quyền chỉnh sửa/công bố chiến dịch.
                        </Typography>
                    )}
                    {readOnlyTerminal && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                            Chiến dịch đã kết thúc — chỉ xem.
                        </Typography>
                    )}
                    {isCancelled && (
                        <Typography variant="caption" sx={{ display: "block", mt: 2, color: "#b91c1c" }}>
                            Chiến dịch đã hủy.
                            {campaign?.reason || campaign?.cancelReason || campaign?.cancellationReason
                                ? ` Lý do: ${campaign?.reason || campaign?.cancelReason || campaign?.cancellationReason}`
                                : ""}
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
                        campaignPaused={status !== "OPEN"}
                        canMutate={canMutateOfferings}
                    />
                </CardContent>
            </Card>

            <Dialog
                open={confirmPublishOpen}
                onClose={() => !submitLoading && setConfirmPublishOpen(false)}
                PaperProps={{ sx: { borderRadius: "16px" } }}
            >
                <DialogContent>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Công bố chiến dịch?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Bạn có chắc chắn muốn công bố chiến dịch này? Sau khi công bố sẽ không thể chỉnh sửa thông tin
                        cơ bản.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setConfirmPublishOpen(false)}
                        disabled={submitLoading}
                        sx={{ textTransform: "none" }}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={runPublish}
                        disabled={submitLoading}
                        sx={{ textTransform: "none", fontWeight: 600, bgcolor: HEADER_ACCENT, borderRadius: "12px" }}
                    >
                        Công bố
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={confirmCancelOpen}
                onClose={() => !submitLoading && setConfirmCancelOpen(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: "16px" } }}
            >
                <DialogContent sx={{ pt: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Xác nhận hủy chiến dịch?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
                        Bạn có chắc chắn muốn hủy chiến dịch này? Tất cả các ngành học đang mở thuộc chiến dịch cũng sẽ
                        bị đóng lại. Hành động này không thể hoàn tác.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Nếu chiến dịch đã có hồ sơ đăng ký, hệ thống có thể cần xử lý hoàn trả/hủy hồ sơ cho thí sinh.
                    </Typography>
                    <TextField
                        label="Lý do hủy"
                        multiline
                        minRows={3}
                        fullWidth
                        required
                        value={cancelReason}
                        onChange={(e) => {
                            setCancelReason(e.target.value);
                            if (cancelReasonError) setCancelReasonError("");
                        }}
                        error={!!cancelReasonError}
                        helperText={cancelReasonError}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button
                        onClick={() => setConfirmCancelOpen(false)}
                        disabled={submitLoading}
                        sx={{ textTransform: "none" }}
                    >
                        Đóng
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={runCancelCampaign}
                        disabled={submitLoading}
                        sx={{ textTransform: "none", fontWeight: 600, borderRadius: "12px" }}
                    >
                        Xác nhận hủy
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={confirmCloneOpen}
                onClose={() => !submitLoading && setConfirmCloneOpen(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: "16px" } }}
            >
                <DialogContent sx={{ pt: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Xác nhận clone chiến dịch?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
                        Bạn có chắc chắn muốn sao chép chiến dịch này để tạo một bản nháp mới không?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button
                        onClick={() => setConfirmCloneOpen(false)}
                        disabled={submitLoading}
                        sx={{ textTransform: "none" }}
                    >
                        Đóng
                    </Button>
                    <Button
                        variant="contained"
                        onClick={async () => {
                            await runCloneCampaign();
                            setConfirmCloneOpen(false);
                        }}
                        disabled={submitLoading}
                        sx={{ textTransform: "none", fontWeight: 600, borderRadius: "12px", bgcolor: HEADER_ACCENT }}
                    >
                        Xác nhận clone
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
