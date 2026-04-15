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
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
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
import CreatePostRichTextEditor from "../../ui/CreatePostRichTextEditor.jsx";

const HEADER_ACCENT = "#0D64DE";

function campaignDescriptionPlainText(html) {
    if (html == null || html === "") return "";
    const s = String(html);
    if (typeof document !== "undefined") {
        const el = document.createElement("div");
        el.innerHTML = s;
        return (el.textContent || "").trim();
    }
    return s.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();
}

/** Chuẩn hoá mô tả từ API (plain hoặc HTML) để đưa vào editor TipTap. */
function campaignDescriptionToInitialHtml(stored) {
    const raw = stored ?? "";
    const s = String(raw).trim();
    if (!s) return "";
    if (/<[a-z][\s/>]/i.test(s)) return String(raw);
    const esc = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<p>${esc}</p>`;
}

/** Đổi sang route quản lý hồ sơ đăng ký / tuyển sinh khi có trang riêng. */
const SCHOOL_REGISTRATION_PROFILES_PATH = "/school/dashboard";

const DEFAULT_CANCEL_BLOCKED_MESSAGE =
    "Cannot cancel campaign. There are active registration profiles linked to this campaign. Please Reject or Process all profiles before cancelling to ensure student data integrity.";

function extractApiMessage(data) {
    if (data == null) return "";
    if (typeof data === "string") return data.trim();
    if (typeof data === "object") {
        const m =
            data.message ??
            data.error ??
            data.detail ??
            (Array.isArray(data.errors) ? data.errors.filter(Boolean).join(" ") : "");
        if (m) return String(m).trim();
        if (data.body != null && data.body !== data) {
            const inner = extractApiMessage(data.body);
            if (inner) return inner;
        }
        return "";
    }
    return "";
}

function buildCancelBlockedMessage(data) {
    const fromApi = extractApiMessage(data);
    if (fromApi) return fromApi;
    if (data && typeof data === "object") {
        const n = Number(data.activeProfilesCount ?? data.activeRegistrationProfilesCount);
        if (Number.isFinite(n) && n > 0) {
            return `Cannot cancel campaign. There are ${n} active registration profiles linked to this campaign. Please Reject or Process all profiles before cancelling to ensure student data integrity.`;
        }
    }
    return DEFAULT_CANCEL_BLOCKED_MESSAGE;
}

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
    "Campaign already inactive": "Chiến dịch đã không còn hoạt động hoặc đã được hủy trước đó.",
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

    const openCampaignConflict =
        /^Academic year (\d+) already has an open campaign\. Please close it before publishing a new one\.$/i.exec(
            trimmed
        );
    if (openCampaignConflict) {
        return `Năm học ${openCampaignConflict[1]} đã có chiến dịch đang mở. Vui lòng đóng chiến dịch đó trước khi công bố chiến dịch mới.`;
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
    const [cancelFlowOpen, setCancelFlowOpen] = useState(false);
    /** idle | confirm | reason | blocked */
    const [cancelFlowPhase, setCancelFlowPhase] = useState("idle");
    const [cancelBlockedMessage, setCancelBlockedMessage] = useState("");
    const [postCancelChoiceOpen, setPostCancelChoiceOpen] = useState(false);
    const [selectedPostCancelOption, setSelectedPostCancelOption] = useState("");
    const [confirmCloneOpen, setConfirmCloneOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [cancelReasonError, setCancelReasonError] = useState("");
    const [isInfoEditing, setIsInfoEditing] = useState(false);
    /** Tăng sau khi lưu template để remount phần chỉ tiêu và gọi lại API */
    const [offeringsRemountKey, setOfferingsRemountKey] = useState(0);
    const [descriptionFieldKey, setDescriptionFieldKey] = useState(0);

    const idNum = campaignId ? parseInt(campaignId, 10) : NaN;

    useEffect(() => {
        setDescriptionFieldKey((k) => k + 1);
    }, [campaign?.admissionCampaignTemplateId, campaign?.description]);

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
                description: campaignDescriptionToInitialHtml(m.description),
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
                    description: campaignDescriptionToInitialHtml(c.description),
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

    const campaignYearNum = Number(campaign?.year);
    const isPastYearCampaign =
        Number.isFinite(campaignYearNum) && campaignYearNum > 0 && campaignYearNum < CURRENT_YEAR;

    const formLocked = status !== "DRAFT" || !isPrimaryBranch || isPastYearCampaign;
    const isCampaignInfoEditable = !formLocked && isInfoEditing;
    const readOnlyTerminal = status === "CLOSED" || status === "EXPIRED";
    const canMutateOfferings = status === "OPEN" && !readOnlyTerminal && !isPastYearCampaign;
    const isDraft = status === "DRAFT";
    const isCancelled = status === "CANCELLED";
    const today = startOfLocalToday();
    const endDateObj = parseLocalDate(campaign?.endDate?.slice?.(0, 10) || campaign?.endDate);
    const publishBlockedByPastEndDate = !!(endDateObj && endDateObj.getTime() < today.getTime());
    const isFormDirty = useMemo(() => {
        const originalName = String(campaign?.name ?? "").trim();
        const originalDescriptionPlain = campaignDescriptionPlainText(campaign?.description ?? "");
        const originalStartDate = String(campaign?.startDate ?? "").slice(0, 10);
        const originalEndDate = String(campaign?.endDate ?? "").slice(0, 10);

        return (
            String(formValues.name ?? "").trim() !== originalName ||
            campaignDescriptionPlainText(formValues.description ?? "") !== originalDescriptionPlain ||
            String(formValues.startDate ?? "").trim() !== originalStartDate ||
            String(formValues.endDate ?? "").trim() !== originalEndDate
        );
    }, [campaign?.name, campaign?.description, campaign?.startDate, campaign?.endDate, formValues]);

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
        const descriptionPlain = campaignDescriptionPlainText(formValues.description ?? "");
        const yearNum = Number(campaign?.year);
        const startIso = formValues.startDate?.trim() ?? "";
        const endIso = formValues.endDate?.trim() ?? "";

        if (!name) errors.name = "Tên chiến dịch là bắt buộc";
        else if (name.length > 100) errors.name = "Tên chiến dịch quá dài. Tối đa 100 ký tự";

        if (!descriptionPlain) errors.description = "Mô tả là bắt buộc";

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
                description: campaignDescriptionToInitialHtml(c.description),
                startDate: c.startDate?.slice(0, 10) || "",
                endDate: c.endDate?.slice(0, 10) || "",
            });
            return c;
        }
        return null;
    };

    const templateId = campaign?.admissionCampaignTemplateId ?? campaign?.id;

    const resetCancelFlow = useCallback(() => {
        setCancelFlowOpen(false);
        setCancelFlowPhase("idle");
        setCancelBlockedMessage("");
        setCancelReason("");
        setCancelReasonError("");
        setSubmitLoading(false);
    }, []);

    const handleOpenCancelFlow = () => {
        if (!templateId || isPastYearCampaign) return;
        setCancelReason("");
        setCancelReasonError("");
        setCancelBlockedMessage("");
        setCancelFlowOpen(true);
        setCancelFlowPhase("confirm");
    };

    const runPublish = async () => {
        if (!templateId || isPastYearCampaign) return;
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
        if (!templateId || isPastYearCampaign) return;
        const reason = cancelReason.trim();
        if (!reason) {
            setCancelReasonError("Vui lòng nhập lý do hủy");
            return;
        }
        setSubmitLoading(true);
        try {
            const res = await cancelCampaignTemplate(templateId, reason);
            if (res?.status >= 200 && res?.status < 300) {
                enqueueSnackbar("Đã hủy chiến dịch thành công.", { variant: "success" });
                resetCancelFlow();
                const updated = await refreshCampaign();
                setOfferingsRemountKey((k) => k + 1);
                if (updated && campaignId) {
                    navigate(`/school/campaigns/detail/${campaignId}`, {
                        replace: true,
                        state: { campaign: updated },
                    });
                }
                setSelectedPostCancelOption("");
                setPostCancelChoiceOpen(true);
            } else {
                enqueueSnackbar(getCampaignErrorMessage(res?.data?.message, "Không thể hủy chiến dịch"), {
                    variant: "error",
                });
            }
        } catch (err) {
            const code = err?.response?.status;
            const data = err?.response?.data;
            if (code === 412) {
                setCancelBlockedMessage(buildCancelBlockedMessage(data));
                setCancelFlowPhase("blocked");
            } else if (code === 403) {
                enqueueSnackbar("Bạn không có quyền thực hiện hành động này", { variant: "error" });
                resetCancelFlow();
            } else if (code === 404) {
                enqueueSnackbar("Dữ liệu không tồn tại hoặc đã bị xóa", { variant: "error" });
                resetCancelFlow();
            } else {
                enqueueSnackbar(
                    getCampaignErrorMessage(err?.response?.data?.message, "Không thể hủy chiến dịch"),
                    { variant: "error" }
                );
            }
        } finally {
            setSubmitLoading(false);
        }
    };

    const runCloneCampaign = async () => {
        if (!templateId || isPastYearCampaign) return;
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
        if (!validateForm() || !templateId || isPastYearCampaign) return;
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
                setIsInfoEditing(false);
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

    useEffect(() => {
        if (formLocked) setIsInfoEditing(false);
    }, [formLocked]);

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
                            sx={{ flexShrink: 0, ml: { md: 2 }, alignSelf: { xs: "stretch", md: "flex-start" } }}
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
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1e293b", mb: 2 }}>
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
                            InputProps={{ readOnly: !isCampaignInfoEditable }}
                            error={!!formErrors.name}
                            helperText={formErrors.name}
                            sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                        />
                    </Stack>
                    <Box sx={{ mb: 2 }}>
                        <Typography
                            component="label"
                            variant="body2"
                            sx={{
                                display: "block",
                                mb: 0.75,
                                fontWeight: 700,
                                color: "#64748b",
                            }}
                        >
                            Mô tả
                        </Typography>
                        <CreatePostRichTextEditor
                            key={descriptionFieldKey}
                            initialHtml={campaignDescriptionToInitialHtml(formValues.description)}
                            onChange={(html) =>
                                setFormValues((prev) => ({ ...prev, description: html }))
                            }
                            disabled={!isCampaignInfoEditable || submitLoading}
                            minEditorHeight={220}
                            maxEditorHeight={400}
                        />
                        {formErrors.description ? (
                            <Typography
                                variant="caption"
                                sx={{ mt: 0.75, display: "block", color: "error.main" }}
                            >
                                {formErrors.description}
                            </Typography>
                        ) : null}
                    </Box>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                            label="Ngày bắt đầu"
                            name="startDate"
                            type="date"
                            fullWidth
                            value={formValues.startDate}
                            onChange={handleFormChange}
                            InputProps={{ readOnly: !isCampaignInfoEditable }}
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
                            InputProps={{ readOnly: !isCampaignInfoEditable }}
                            error={!!formErrors.endDate}
                            helperText={formErrors.endDate}
                            InputLabelProps={{ shrink: true }}
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                        />
                    </Stack>
                    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                            {isPrimaryBranch && isDraft && !isPastYearCampaign && (
                                <>
                                    <Button
                                        variant="contained"
                                        onClick={isInfoEditing ? runSaveTemplate : () => setIsInfoEditing(true)}
                                        disabled={submitLoading || (isInfoEditing && !isFormDirty)}
                                        sx={{
                                            bgcolor: HEADER_ACCENT,
                                            textTransform: "none",
                                            fontWeight: 600,
                                            borderRadius: "12px",
                                            px: 3,
                                            "&:hover": { bgcolor: "#0a52b8" },
                                        }}
                                    >
                                        {isInfoEditing ? "Lưu thay đổi" : "Chỉnh sửa"}
                                    </Button>
                                    <Tooltip
                                        title={
                                            isFormDirty
                                                ? "Vui lòng lưu thay đổi trước khi công bố chiến dịch."
                                                : publishBlockedByPastEndDate
                                                ? "Chiến dịch đã hết hạn, vui lòng cập nhật ngày kết thúc trước khi công bố."
                                                : ""
                                        }
                                    >
                                        <span>
                                            <Button
                                                variant="contained"
                                                onClick={() => setConfirmPublishOpen(true)}
                                                disabled={submitLoading || publishBlockedByPastEndDate || isFormDirty}
                                                sx={{
                                                    textTransform: "none",
                                                    fontWeight: 600,
                                                    borderRadius: "12px",
                                                    bgcolor: HEADER_ACCENT,
                                                }}
                                            >
                                                Công bố chiến dịch
                                            </Button>
                                        </span>
                                    </Tooltip>
                                </>
                            )}
                            {isPrimaryBranch && status === "OPEN" && !isPastYearCampaign && (
                                <Button
                                    variant="outlined"
                                    onClick={handleOpenCancelFlow}
                                    disabled={submitLoading}
                                    color="primary"
                                    sx={{ textTransform: "none", fontWeight: 600, borderRadius: "12px" }}
                                >
                                    Cập nhật
                                </Button>
                            )}
                            {isPrimaryBranch && isCancelled && !isPastYearCampaign && (
                                <Button
                                    variant="outlined"
                                    onClick={() => setConfirmCloneOpen(true)}
                                    disabled={submitLoading}
                                    sx={{ textTransform: "none", fontWeight: 600, borderRadius: "12px" }}
                                >
                                    Clone chiến dịch
                                </Button>
                            )}
                        </Stack>
                    </Box>
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
                    {isPastYearCampaign && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                            Năm học này đã qua — chỉ xem, không chỉnh sửa chiến dịch hay chỉ tiêu.
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
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    if (!submitLoading) setConfirmPublishOpen(false);
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
                open={cancelFlowOpen}
                disableEscapeKeyDown={false}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    if (submitLoading) return;
                    resetCancelFlow();
                }}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: "16px" } }}
            >
                {cancelFlowPhase === "blocked" && (
                    <>
                        <DialogContent sx={{ pt: 3 }}>
                            <Stack spacing={2} alignItems="flex-start">
                                <WarningAmberIcon sx={{ fontSize: 52, color: "#d97706" }} />
                                <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b" }}>
                                    Không thể hủy chiến dịch tuyển sinh
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}
                                >
                                    {cancelBlockedMessage}
                                </Typography>
                            </Stack>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: "wrap" }}>
                            <Button
                                onClick={resetCancelFlow}
                                disabled={submitLoading}
                                color="inherit"
                                variant="outlined"
                                sx={{ textTransform: "none", borderColor: "#cbd5e1", color: "#64748b" }}
                            >
                                Đóng
                            </Button>
                            <Button
                                variant="contained"
                                onClick={() => {
                                    navigate(SCHOOL_REGISTRATION_PROFILES_PATH);
                                    resetCancelFlow();
                                }}
                                disabled={submitLoading}
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 600,
                                    borderRadius: "12px",
                                    bgcolor: HEADER_ACCENT,
                                }}
                            >
                                Xem danh sách hồ sơ
                            </Button>
                        </DialogActions>
                    </>
                )}

                {cancelFlowPhase === "confirm" && (
                    <>
                        <DialogContent sx={{ pt: 2.5 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                Không thể cập nhật khi chiến dịch đang trong trạng thái mở. Vui lòng Huỷ trước khi cập nhật.
                            </Typography>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: "wrap" }}>
                            <Button
                                onClick={resetCancelFlow}
                                color="inherit"
                                variant="outlined"
                                sx={{
                                    textTransform: "none",
                                    borderRadius: "12px",
                                    borderColor: "#cbd5e1",
                                    color: "#64748b",
                                }}
                            >
                                Đóng
                            </Button>
                            <Button
                                variant="contained"
                                onClick={() => {
                                    setCancelReasonError("");
                                    setCancelFlowPhase("reason");
                                }}
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 600,
                                    borderRadius: "12px",
                                    bgcolor: HEADER_ACCENT,
                                }}
                            >
                                Đã hiểu và tiếp tục Huỷ
                            </Button>
                        </DialogActions>
                    </>
                )}

                {cancelFlowPhase === "reason" && (
                    <>
                        <DialogContent sx={{ pt: 2.5 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                Nhập lý do hủy
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
                                Vui lòng nhập lý do hủy chiến dịch. Thông tin này được gửi kèm yêu cầu hủy tới hệ thống.
                            </Typography>
                            <TextField
                                label="Lý do hủy"
                                placeholder="Nhập lý do hủy chiến dịch…"
                                multiline
                                minRows={4}
                                fullWidth
                                required
                                value={cancelReason}
                                onChange={(e) => {
                                    setCancelReason(e.target.value);
                                    if (cancelReasonError) setCancelReasonError("");
                                }}
                                error={!!cancelReasonError}
                                helperText={cancelReasonError}
                                sx={{ mt: 2.5, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                            />
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: "wrap" }}>
                            <Button
                                onClick={() => {
                                    setCancelFlowPhase("confirm");
                                    setCancelReasonError("");
                                }}
                                disabled={submitLoading}
                                sx={{ textTransform: "none", color: "#64748b" }}
                            >
                                Quay lại
                            </Button>
                            <Button
                                variant="contained"
                                onClick={runCancelCampaign}
                                disabled={submitLoading || !cancelReason.trim()}
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 600,
                                    borderRadius: "12px",
                                    bgcolor: "#991b1b",
                                    "&:hover": { bgcolor: "#7f1d1d" },
                                    "&.Mui-disabled": { bgcolor: "rgba(153, 27, 27, 0.35)" },
                                }}
                            >
                                {submitLoading ? "Đang xử lý…" : "Huỷ"}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            <Dialog
                open={postCancelChoiceOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    if (submitLoading) return;
                    setPostCancelChoiceOpen(false);
                    setSelectedPostCancelOption("");
                }}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: "16px" } }}
            >
                <DialogContent sx={{ pt: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Chiến dịch đã được hủy
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, lineHeight: 1.6 }}>
                        Bạn muốn tiếp tục theo hướng nào?
                    </Typography>
                    <Stack spacing={1.5} sx={{ mt: 2 }}>
                        <Card
                            elevation={0}
                            onClick={() => setSelectedPostCancelOption("create")}
                            sx={{
                                p: 2,
                                borderRadius: "12px",
                                border: "2px solid",
                                borderColor:
                                    selectedPostCancelOption === "create" ? HEADER_ACCENT : "transparent",
                                cursor: "pointer",
                                backgroundColor:
                                    selectedPostCancelOption === "create"
                                        ? "rgba(13, 100, 222, 0.08)"
                                        : "#fff",
                                boxShadow:
                                    selectedPostCancelOption === "create"
                                        ? "0 0 0 1px rgba(13, 100, 222, 0.15)"
                                        : "0 0 0 1px #e2e8f0",
                                transition: "all 0.2s ease",
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b" }}>
                                Optional 1
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, color: "#475569" }}>
                                Bạn có muốn tạo chiến dịch mới
                            </Typography>
                        </Card>
                        <Card
                            elevation={0}
                            onClick={() => setSelectedPostCancelOption("clone")}
                            sx={{
                                p: 2,
                                borderRadius: "12px",
                                border: "2px solid",
                                borderColor:
                                    selectedPostCancelOption === "clone" ? HEADER_ACCENT : "transparent",
                                cursor: "pointer",
                                backgroundColor:
                                    selectedPostCancelOption === "clone"
                                        ? "rgba(13, 100, 222, 0.08)"
                                        : "#fff",
                                boxShadow:
                                    selectedPostCancelOption === "clone"
                                        ? "0 0 0 1px rgba(13, 100, 222, 0.15)"
                                        : "0 0 0 1px #e2e8f0",
                                transition: "all 0.2s ease",
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b" }}>
                                Optional 2
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, color: "#475569" }}>
                                Bạn vẫn muốn giữ dữ liệu của chiến dịch hiện tại để clone cập nhật
                            </Typography>
                        </Card>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: "wrap" }}>
                    <Button
                        onClick={() => {
                            setPostCancelChoiceOpen(false);
                            setSelectedPostCancelOption("");
                        }}
                        disabled={submitLoading}
                        sx={{ textTransform: "none", color: "#64748b" }}
                    >
                        Đóng
                    </Button>
                    <Button
                        variant="contained"
                        onClick={async () => {
                            if (!selectedPostCancelOption) return;
                            setPostCancelChoiceOpen(false);
                            if (selectedPostCancelOption === "create") {
                                setSelectedPostCancelOption("");
                                navigate("/school/campaigns", { state: { openCreateModal: true } });
                                return;
                            }
                            setSelectedPostCancelOption("");
                            await runCloneCampaign();
                        }}
                        disabled={submitLoading || !selectedPostCancelOption}
                        sx={{ textTransform: "none", fontWeight: 600, borderRadius: "12px", bgcolor: HEADER_ACCENT }}
                    >
                        Tiếp tục
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={confirmCloneOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    if (!submitLoading) setConfirmCloneOpen(false);
                }}
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
