import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    LinearProgress,
    MenuItem,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import CampaignIcon from "@mui/icons-material/Campaign";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import { ConfirmHighlight } from "../../ui/ConfirmDialog.jsx";
import { useSchool } from "../../../contexts/SchoolContext.jsx";
import {
    getCampaignTemplatesByYear,
    cancelCampaignTemplate,
    cloneCampaignTemplate,
    updateCampaignTemplate,
    updateCampaignTemplateStatus,
} from "../../../services/CampaignService.jsx";
import {
    getSchoolConfigByKey,
    parseSchoolConfigResponseBody,
    SCHOOL_CONFIG_KEY,
} from "../../../services/SchoolFacilityService.jsx";
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
    const timelines = Array.isArray(row.admissionMethodTimelines)
        ? row.admissionMethodTimelines.map((t) => ({
              methodCode: String(t?.methodCode ?? "").trim(),
              startDate: normalizeDateLikeToIso(t?.startDate),
              endDate: normalizeDateLikeToIso(t?.endDate),
              allowReservationSubmission: Boolean(t?.allowReservationSubmission),
              quota: Number(t?.quota ?? 0),
          }))
        : [];
    return {
        ...row,
        id,
        admissionCampaignTemplateId: row.admissionCampaignTemplateId ?? row.id,
        status,
        admissionMethodTimelines: timelines,
    };
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
    "No school campus account found": "Không tìm thấy tài khoản cơ sở trường học",
    "Request is required": "Yêu cầu không được để trống",
    "Name is required": "Tên chiến dịch không được để trống",
    "Name is too long. Maximum length is 100 characters": "Tên chiến dịch quá dài. Độ dài tối đa là 100 ký tự",
    "Description is required": "Mô tả chiến dịch không được để trống",
    "Year is required": "Năm học không được để trống",
    "Cannot create a campaign for a past academic year": "Không thể tạo chiến dịch cho một năm học trong quá khứ",
    "Cannot update a campaign for a past academic year": "Không thể cập nhật chiến dịch cho một năm học trong quá khứ",
    "Start date are required": "Ngày bắt đầu không được để trống",
    "End date are required": "Ngày kết thúc không được để trống",
    "Start date and end date are required": "Ngày bắt đầu và ngày kết thúc là bắt buộc",
    "Start date cannot be in the past": "Ngày bắt đầu không được ở trong quá khứ",
    "End date must be in the future": "Ngày kết thúc phải ở trong tương lai",
    "End date must be after start date": "Ngày kết thúc phải sau ngày bắt đầu",
    Forbidden: "Bạn không có quyền thực hiện hành động này",
    "Campaign not found": "Dữ liệu không tồn tại hoặc đã bị xóa",
    "Campaign is not in DRAFT status": "Chiến dịch này đã được công bố hoặc đã đóng",
    "Campaign has expired": "Chiến dịch đã hết hạn, vui lòng cập nhật ngày kết thúc trước khi công bố",
    "Campaign already cancelled": "Chiến dịch này đã hủy trước đó",
    "Campaign already inactive": "Chiến dịch đã không còn hoạt động hoặc đã được hủy trước đó.",
    // validationUpdateAdmissionCampaignTemplate (BE) — tiếng Việt
    "Dữ liệu yêu cầu không được để trống": "Dữ liệu yêu cầu không được để trống",
    "Không tìm thấy tài khoản cơ sở trường học": "Không tìm thấy tài khoản cơ sở trường học",
    "Tên chiến dịch không được để trống": "Tên chiến dịch không được để trống",
    "Tên chiến dịch quá dài. Độ dài tối đa là 100 ký tự": "Tên chiến dịch quá dài. Độ dài tối đa là 100 ký tự",
    "Mô tả chiến dịch không được để trống": "Mô tả chiến dịch không được để trống",
    "Năm học không được để trống": "Năm học không được để trống",
    "Không thể cập nhật chiến dịch cho một năm học trong quá khứ": "Không thể cập nhật chiến dịch cho một năm học trong quá khứ",
    "Ngày bắt đầu không được để trống": "Ngày bắt đầu không được để trống",
    "Ngày kết thúc không được để trống": "Ngày kết thúc không được để trống",
    "Ngày bắt đầu không được ở trong quá khứ": "Ngày bắt đầu không được ở trong quá khứ",
    "Ngày kết thúc phải ở trong tương lai": "Ngày kết thúc phải ở trong tương lai",
    "Ngày kết thúc phải sau ngày bắt đầu": "Ngày kết thúc phải sau ngày bắt đầu",
};

function getCampaignErrorMessage(backendMessage, fallback) {
    if (!backendMessage) return fallback;
    const trimmed = String(backendMessage).trim();
    if (CAMPAIGN_ERROR_VI[trimmed]) return CAMPAIGN_ERROR_VI[trimmed];

    const openConflictVi =
        /^Năm học (\d+) đã có một chiến dịch đang MỞ \(ID: (\d+)\)\. Không thể có nhiều chiến dịch hoạt động cùng lúc\.$/.exec(
            trimmed
        );
    if (openConflictVi) return trimmed;

    const earlyBird =
        /^Start date is too early\. Early bird for (\d+) should start from October (\d+)$/.exec(trimmed);
    if (earlyBird) {
        const [, y, octYear] = earlyBird;
        return `Ngày bắt đầu quá sớm. Đợt tuyển sinh sớm cho năm ${y} nên bắt đầu từ tháng 10 năm ${octYear}`;
    }

    const earlyBirdVi =
        /^Ngày bắt đầu quá sớm\. Đợt tuyển sinh sớm cho năm (\d+) nên bắt đầu từ tháng 10 năm (\d+)$/.exec(trimmed);
    if (earlyBirdVi) return trimmed;

    const endInvalid =
        /^End date is invalid\. A campaign for (\d+) must at least last until the end of (\d+)$/.exec(trimmed);
    if (endInvalid) {
        const [, y, untilYear] = endInvalid;
        return `Ngày kết thúc không hợp lệ. Chiến dịch cho năm ${y} phải kéo dài ít nhất đến hết năm ${untilYear}`;
    }

    const endInvalidVi =
        /^Ngày kết thúc không hợp lệ\. Chiến dịch cho năm (\d+) phải kéo dài ít nhất đến hết năm (\d+)$/.exec(trimmed);
    if (endInvalidVi) return trimmed;

    const endWithin = /^End date must be within the academic year (\d+)$/.exec(trimmed);
    if (endWithin) {
        return `Ngày kết thúc phải nằm trong năm học ${endWithin[1]}`;
    }

    const endWithinVi = /^Ngày kết thúc phải nằm trong năm học (\d+)$/.exec(trimmed);
    if (endWithinVi) return trimmed;

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
        return `Năm học ${openCampaignConflict[1]} đã có một chiến dịch đang MỞ. Không thể có nhiều chiến dịch hoạt động cùng lúc.`;
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
        admissionMethodTimelines: [{ methodCode: "", startDate: "", endDate: "", allowReservationSubmission: false, quota: "" }],
    });
    const [formErrors, setFormErrors] = useState({});
    /** Chiến dịch khác cùng năm đang OPEN (để đồng bộ validationUpdateAdmissionCampaignTemplate). */
    const [peerOpenSameYear, setPeerOpenSameYear] = useState(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
    const [cancelFlowOpen, setCancelFlowOpen] = useState(false);
    /** idle | confirm | reason | blocked */
    const [cancelFlowPhase, setCancelFlowPhase] = useState("idle");
    const [cancelBlockedMessage, setCancelBlockedMessage] = useState("");
    const [postCancelChoiceOpen, setPostCancelChoiceOpen] = useState(false);
    const [selectedPostCancelOption, setSelectedPostCancelOption] = useState("");
    const [cancelReason, setCancelReason] = useState("");
    const [cancelReasonError, setCancelReasonError] = useState("");
    const [confirmCloneOpen, setConfirmCloneOpen] = useState(false);
    const [cloneTargetYear, setCloneTargetYear] = useState("");
    const [cloneYearError, setCloneYearError] = useState("");
    const [isInfoEditing, setIsInfoEditing] = useState(false);
    const [descriptionFieldKey, setDescriptionFieldKey] = useState(0);
    const [admissionMethodOptions, setAdmissionMethodOptions] = useState([]);
    const [configuredTotalQuota, setConfiguredTotalQuota] = useState(0);
    const clonedFromYear = location.state?.clonedFrom;
    const openEditAfterClone = !!location.state?.openEdit;

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
                admissionMethodTimelines:
                    Array.isArray(m.admissionMethodTimelines) && m.admissionMethodTimelines.length > 0
                        ? m.admissionMethodTimelines.map((t) => ({
                              methodCode: String(t?.methodCode ?? "").trim(),
                              startDate: String(t?.startDate ?? "").slice(0, 10),
                              endDate: String(t?.endDate ?? "").slice(0, 10),
                              allowReservationSubmission: Boolean(t?.allowReservationSubmission),
                              quota: t?.quota != null ? String(t?.quota) : "",
                          }))
                        : [{ methodCode: "", startDate: "", endDate: "", allowReservationSubmission: false, quota: "" }],
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
                    admissionMethodTimelines:
                        Array.isArray(c.admissionMethodTimelines) && c.admissionMethodTimelines.length > 0
                            ? c.admissionMethodTimelines.map((t) => ({
                                  methodCode: String(t?.methodCode ?? "").trim(),
                                  startDate: String(t?.startDate ?? "").slice(0, 10),
                                  endDate: String(t?.endDate ?? "").slice(0, 10),
                                  allowReservationSubmission: Boolean(t?.allowReservationSubmission),
                                  quota: t?.quota != null ? String(t?.quota) : "",
                              }))
                            : [{ methodCode: "", startDate: "", endDate: "", allowReservationSubmission: false, quota: "" }],
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
            String(formValues.endDate ?? "").trim() !== originalEndDate ||
            JSON.stringify(
                (Array.isArray(formValues.admissionMethodTimelines) ? formValues.admissionMethodTimelines : []).map(
                    (t) => ({
                        methodCode: String(t?.methodCode ?? "").trim(),
                        startDate: String(t?.startDate ?? "").trim(),
                        endDate: String(t?.endDate ?? "").trim(),
                        allowReservationSubmission: Boolean(t?.allowReservationSubmission),
                        quota: String(t?.quota ?? "").trim(),
                    })
                )
            ) !==
                JSON.stringify(
                    (Array.isArray(campaign?.admissionMethodTimelines) ? campaign.admissionMethodTimelines : []).map((t) => ({
                        methodCode: String(t?.methodCode ?? "").trim(),
                        startDate: String(t?.startDate ?? "").slice(0, 10),
                        endDate: String(t?.endDate ?? "").slice(0, 10),
                        allowReservationSubmission: Boolean(t?.allowReservationSubmission),
                        quota: String(t?.quota ?? "").trim(),
                    }))
                )
        );
    }, [campaign?.name, campaign?.description, campaign?.startDate, campaign?.endDate, campaign?.admissionMethodTimelines, formValues]);

    const progress = useMemo(
        () => getTimelineProgress(campaign?.startDate, campaign?.endDate),
        [campaign?.startDate, campaign?.endDate]
    );

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormValues((prev) => ({ ...prev, [name]: value }));
        setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    };

    const handleTimelineChange = (index, field, value) => {
        setFormValues((prev) => {
            const next = Array.isArray(prev.admissionMethodTimelines) ? [...prev.admissionMethodTimelines] : [];
            const row = next[index] || {
                methodCode: "",
                startDate: "",
                endDate: "",
                allowReservationSubmission: false,
                quota: "",
            };
            next[index] = { ...row, [field]: value };
            return { ...prev, admissionMethodTimelines: next };
        });
        setFormErrors((prev) => ({ ...prev, admissionMethodTimelines: undefined }));
    };

    const addTimelineRow = () => {
        setFormValues((prev) => ({
            ...prev,
            admissionMethodTimelines: [
                ...(Array.isArray(prev.admissionMethodTimelines) ? prev.admissionMethodTimelines : []),
                { methodCode: "", startDate: "", endDate: "", allowReservationSubmission: false, quota: "" },
            ],
        }));
    };

    const removeTimelineRow = (index) => {
        setFormValues((prev) => {
            const current = Array.isArray(prev.admissionMethodTimelines) ? prev.admissionMethodTimelines : [];
            const next = current.filter((_, i) => i !== index);
            return {
                ...prev,
                admissionMethodTimelines:
                    next.length > 0
                        ? next
                        : [{ methodCode: "", startDate: "", endDate: "", allowReservationSubmission: false, quota: "" }],
            };
        });
        setFormErrors((prev) => ({ ...prev, admissionMethodTimelines: undefined }));
    };

    useEffect(() => {
        let cancelled = false;
        const yearNum = Number(campaign?.year);
        const selfId = Number(campaign?.admissionCampaignTemplateId ?? campaign?.id ?? 0);
        if (!Number.isFinite(yearNum) || yearNum <= 0 || !Number.isFinite(selfId) || selfId <= 0) {
            setPeerOpenSameYear(null);
            return;
        }
        (async () => {
            try {
                const res = await getCampaignTemplatesByYear(yearNum);
                const raw = res?.data?.body ?? res?.data;
                const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
                const mapped = list.map(mapTemplate).filter(Boolean);
                const conflict = mapped.find((c) => {
                    const cid = Number(c.admissionCampaignTemplateId ?? c.id);
                    const st = normalizeCampaignStatus(c.status);
                    return st === "OPEN" && cid !== selfId;
                });
                if (!cancelled) setPeerOpenSameYear(conflict || null);
            } catch {
                if (!cancelled) setPeerOpenSameYear(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [campaign?.year, campaign?.admissionCampaignTemplateId, campaign?.id]);

    useEffect(() => {
        let cancelled = false;
        getSchoolConfigByKey(SCHOOL_CONFIG_KEY.ADMISSION_SETTINGS_DATA)
            .then((res) => {
                if (cancelled) return;
                const body = parseSchoolConfigResponseBody(res);
                const adm =
                    body?.admissionSettingsData && typeof body.admissionSettingsData === "object"
                        ? body.admissionSettingsData
                        : body;
                const methods = Array.isArray(adm?.allowedMethods) ? adm.allowedMethods : [];
                const options = methods
                    .map((m) => {
                        const value = String(m?.code ?? "").trim();
                        if (!value) return null;
                        const display = String(m?.displayName ?? "").trim() || value;
                        return { value, label: `${display} (${value})` };
                    })
                    .filter(Boolean);
                setAdmissionMethodOptions(options);
                const tq = Number(adm?.totalQuota ?? adm?.quota ?? adm?.maxQuota ?? 0);
                setConfiguredTotalQuota(Number.isFinite(tq) && tq > 0 ? tq : 0);
            })
            .catch(() => {
                if (cancelled) return;
                setAdmissionMethodOptions([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const validateForm = () => {
        const errors = {};
        const name = formValues.name?.trim() ?? "";
        const descriptionPlain = campaignDescriptionPlainText(formValues.description ?? "");
        const yearNum = Number(campaign?.year);
        const startIso = formValues.startDate?.trim() ?? "";
        const endIso = formValues.endDate?.trim() ?? "";

        if (!name) errors.name = "Tên chiến dịch không được để trống";
        else if (name.length > 100) errors.name = "Tên chiến dịch quá dài. Độ dài tối đa là 100 ký tự";

        if (!descriptionPlain) errors.description = "Mô tả chiến dịch không được để trống";

        if (!Number.isFinite(yearNum) || yearNum <= 0) {
            errors.year = "Năm học không được để trống";
        } else if (yearNum < CURRENT_YEAR) {
            errors.year = "Không thể cập nhật chiến dịch cho một năm học trong quá khứ";
        }

        if (!startIso) errors.startDate = "Ngày bắt đầu không được để trống";
        if (!endIso) errors.endDate = "Ngày kết thúc không được để trống";

        const start = parseLocalDate(startIso);
        const end = parseLocalDate(endIso);
        if (startIso && !start) errors.startDate = "Ngày bắt đầu không hợp lệ";
        if (endIso && !end) errors.endDate = "Ngày kết thúc không hợp lệ";

        const today = startOfLocalToday();
        const earliestStartAllowed = addLocalDays(today, -1);

        if (start && !errors.startDate && start.getTime() < earliestStartAllowed.getTime()) {
            errors.startDate = "Ngày bắt đầu không được ở trong quá khứ";
        }
        if (end && !errors.endDate && end.getTime() < today.getTime()) {
            errors.endDate = "Ngày kết thúc phải ở trong tương lai";
        }
        if (start && end && !errors.startDate && !errors.endDate && end.getTime() <= start.getTime()) {
            errors.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
        }

        if (Number.isFinite(yearNum) && yearNum > 0 && start && !errors.startDate) {
            const oct1Prev = new Date(yearNum - 1, 9, 1);
            if (start.getTime() < oct1Prev.getTime()) {
                errors.startDate = `Ngày bắt đầu quá sớm. Đợt tuyển sinh sớm cho năm ${yearNum} nên bắt đầu từ tháng 10 năm ${yearNum - 1}`;
            }
        }

        if (Number.isFinite(yearNum) && yearNum > 0 && end && !errors.endDate) {
            const dec31Prev = new Date(yearNum - 1, 11, 31);
            if (end.getTime() < dec31Prev.getTime()) {
                errors.endDate = `Ngày kết thúc không hợp lệ. Chiến dịch cho năm ${yearNum} phải kéo dài ít nhất đến hết năm ${yearNum - 1}`;
            } else if (end.getFullYear() !== yearNum) {
                errors.endDate = `Ngày kết thúc phải nằm trong năm học ${yearNum}`;
            }
        }

        if (peerOpenSameYear && Number.isFinite(yearNum) && yearNum > 0 && !errors.year) {
            const oid = peerOpenSameYear.admissionCampaignTemplateId ?? peerOpenSameYear.id;
            errors.year = `Năm học ${yearNum} đã có một chiến dịch đang MỞ (ID: ${oid}). Không thể có nhiều chiến dịch hoạt động cùng lúc.`;
        }

        const timelines = Array.isArray(formValues.admissionMethodTimelines)
            ? formValues.admissionMethodTimelines
            : [];
        if (timelines.length === 0) {
            errors.admissionMethodTimelines = "Cần ít nhất 1 mốc phương thức tuyển sinh";
        } else {
            const rowErrors = [];
            const usedCodes = new Set();
            timelines.forEach((row, idx) => {
                const rowErr = {};
                const methodCode = String(row?.methodCode ?? "").trim();
                const rowStartIso = String(row?.startDate ?? "").trim();
                const rowEndIso = String(row?.endDate ?? "").trim();
                const quotaNum = Number(row?.quota);
                if (!methodCode) rowErr.methodCode = "Chọn phương thức tuyển sinh";
                if (!rowStartIso) rowErr.startDate = "Chọn ngày bắt đầu";
                if (!rowEndIso) rowErr.endDate = "Chọn ngày kết thúc";
                if (!Number.isFinite(quotaNum) || quotaNum <= 0) rowErr.quota = "Nhập quota lớn hơn 0";
                const rowStart = parseLocalDate(rowStartIso);
                const rowEnd = parseLocalDate(rowEndIso);
                if (rowStartIso && !rowStart) rowErr.startDate = "Ngày bắt đầu không hợp lệ";
                if (rowEndIso && !rowEnd) rowErr.endDate = "Ngày kết thúc không hợp lệ";
                if (rowStart && rowEnd && rowEnd.getTime() < rowStart.getTime()) {
                    rowErr.endDate = "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu";
                }
                if (start && rowStart && rowStart.getTime() < start.getTime()) {
                    rowErr.startDate = "Ngày bắt đầu phải nằm trong chiến dịch";
                }
                if (end && rowEnd && rowEnd.getTime() > end.getTime()) {
                    rowErr.endDate = "Ngày kết thúc phải nằm trong chiến dịch";
                }
                if (methodCode) {
                    if (usedCodes.has(methodCode)) {
                        rowErr.methodCode = "Phương thức đã được chọn";
                    } else {
                        usedCodes.add(methodCode);
                    }
                }
                rowErrors[idx] = rowErr;
            });
            if (rowErrors.some((e) => Object.keys(e).length > 0)) {
                errors.admissionMethodTimelines = rowErrors;
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
                admissionMethodTimelines:
                    Array.isArray(c.admissionMethodTimelines) && c.admissionMethodTimelines.length > 0
                        ? c.admissionMethodTimelines.map((t) => ({
                              methodCode: String(t?.methodCode ?? "").trim(),
                              startDate: String(t?.startDate ?? "").slice(0, 10),
                              endDate: String(t?.endDate ?? "").slice(0, 10),
                              allowReservationSubmission: Boolean(t?.allowReservationSubmission),
                              quota: t?.quota != null ? String(t?.quota) : "",
                          }))
                        : [{ methodCode: "", startDate: "", endDate: "", allowReservationSubmission: false, quota: "" }],
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
            // OPEN status requires reason, DRAFT does not
            if (status === "OPEN") {
                const reason = cancelReason.trim();
                if (!reason) {
                    setCancelReasonError("Vui lòng nhập lý do hủy");
                    return;
                }
            }
        setSubmitLoading(true);
        try {
                const res = await cancelCampaignTemplate(templateId, cancelReason.trim());
            if (res?.status >= 200 && res?.status < 300) {
                enqueueSnackbar("Đã hủy chiến dịch thành công.", { variant: "success" });
                resetCancelFlow();
                const updated = await refreshCampaign();
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

    const openCloneConfirm = () => {
        setCloneTargetYear(String(Number(campaign?.year) + 1));
        setCloneYearError("");
        setConfirmCloneOpen(true);
    };

    const runCloneCampaign = async () => {
        if (!templateId || isPastYearCampaign) return;
        const targetYear = Number.parseInt(String(cloneTargetYear), 10);
        if (!Number.isFinite(targetYear) || targetYear <= 0) {
            setCloneYearError("Vui lòng nhập năm học mục tiêu hợp lệ");
            return;
        }
        setSubmitLoading(true);
        try {
            const res = await cloneCampaignTemplate(templateId, targetYear);
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
                setConfirmCloneOpen(false);
                setCloneTargetYear("");
                setCloneYearError("");
                if (Number.isFinite(newId) && newId > 0) {
                    navigate(`/school/campaigns/detail/${newId}`, {
                        replace: true,
                        state: { clonedFrom: Number(campaign?.year), openEdit: true },
                    });
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
                admissionMethodTimelines: (Array.isArray(formValues.admissionMethodTimelines)
                    ? formValues.admissionMethodTimelines
                    : []
                ).map((t) => ({
                    methodCode: String(t?.methodCode ?? "").trim(),
                    startDate: String(t?.startDate ?? "").trim(),
                    endDate: String(t?.endDate ?? "").trim(),
                    allowReservationSubmission: Boolean(t?.allowReservationSubmission),
                    quota: Number(t?.quota ?? 0),
                })),
            });
            if (res?.status === 200 || res?.data) {
                enqueueSnackbar("Đã lưu thay đổi chiến dịch.", { variant: "success" });
                const updated = await refreshCampaign();
                setIsInfoEditing(false);
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

    useEffect(() => {
        if (openEditAfterClone && campaign && !formLocked) {
            setIsInfoEditing(true);
        }
    }, [openEditAfterClone, campaign, formLocked]);

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

            {clonedFromYear && (
                <Box
                    sx={{
                        p: 2,
                        borderRadius: "12px",
                        bgcolor: "rgba(59, 130, 246, 0.08)",
                        border: "1px solid rgba(59, 130, 246, 0.28)",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1.5,
                    }}
                >
                    <Typography sx={{ fontSize: 20, lineHeight: 1, mt: 0.1 }}>ℹ️</Typography>
                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#1d4ed8" }}>
                            Bản nhân bản từ chiến dịch {clonedFromYear}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#374151", mt: 0.3 }}>
                            Kiểm tra lại ngày và quota trước khi công bố.
                        </Typography>
                    </Box>
                </Box>
            )}

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
                            onChange={(html) => {
                                setFormValues((prev) => ({ ...prev, description: html }));
                                setFormErrors((prev) => ({ ...prev, description: undefined }));
                            }}
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
                    <Box sx={{ mt: 2 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1e293b" }}>
                                    Mốc theo phương thức tuyển sinh
                                </Typography>
                                <Typography variant="body2" sx={{ color: "#64748b", mt: 0.4 }}>
                                    Thiết lập từng phương thức, thời gian áp dụng và quota.
                                </Typography>
                            </Box>
                            {isCampaignInfoEditable && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={addTimelineRow}
                                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, whiteSpace: "nowrap" }}
                                >
                                    Thêm phương thức
                                </Button>
                            )}
                        </Stack>
                        {formErrors.admissionMethodTimelines &&
                        typeof formErrors.admissionMethodTimelines === "string" ? (
                            <Typography variant="caption" sx={{ color: "#d32f2f", display: "block", mt: 1.2 }}>
                                {formErrors.admissionMethodTimelines}
                            </Typography>
                        ) : null}
                        <Stack spacing={1.2} sx={{ mt: 1.2 }}>
                            {(formValues.admissionMethodTimelines || []).map((row, idx) => {
                                const rowErr = Array.isArray(formErrors.admissionMethodTimelines)
                                    ? formErrors.admissionMethodTimelines[idx] || {}
                                    : {};
                                const selectedCodes = (formValues.admissionMethodTimelines || [])
                                    .map((r, rIdx) => (rIdx === idx ? "" : String(r?.methodCode ?? "").trim()))
                                    .filter(Boolean);
                                return (
                                    <Box
                                        key={`detail-timeline-${idx}`}
                                        sx={{
                                            border: "1px solid #dbeafe",
                                            borderRadius: 2,
                                            bgcolor: "#f8fbff",
                                            px: 2,
                                            py: 1.5,
                                        }}
                                    >
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                                            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 800 }}>
                                                Mốc {idx + 1}
                                            </Typography>
                                            {isCampaignInfoEditable && (
                                                <IconButton
                                                    size="small"
                                                    onClick={() => removeTimelineRow(idx)}
                                                    aria-label="Xóa phương thức"
                                                    title="Xóa"
                                                    sx={{
                                                        color: "#64748b",
                                                        "&:hover": { color: "#dc2626", bgcolor: "rgba(220, 38, 38, 0.08)" },
                                                    }}
                                                >
                                                    <CloseIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                        </Stack>

                                        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 1.2 }}>
                                            <Card
                                                variant="outlined"
                                                sx={{
                                                    flex: 1.6,
                                                    borderRadius: 2,
                                                    borderColor: "#dbeafe",
                                                    bgcolor: "#ffffff",
                                                    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.03)",
                                                }}
                                            >
                                                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                                                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 800, display: "block", mb: 1 }}>
                                                        Phương thức
                                                    </Typography>
                                                    <FormControl fullWidth error={!!rowErr.methodCode}>
                                                        <InputLabel>Phương thức</InputLabel>
                                                        <Select
                                                            value={row.methodCode || ""}
                                                            label="Phương thức"
                                                            onChange={(e) => handleTimelineChange(idx, "methodCode", e.target.value)}
                                                            disabled={!isCampaignInfoEditable}
                                                        >
                                                            {admissionMethodOptions
                                                                .filter((opt) => !selectedCodes.includes(opt.value))
                                                                .map((opt) => (
                                                                    <MenuItem key={opt.value} value={opt.value}>
                                                                        {opt.label}
                                                                    </MenuItem>
                                                                ))}
                                                        </Select>
                                                        {!!rowErr.methodCode && (
                                                            <Typography
                                                                variant="caption"
                                                                sx={{ color: "#d32f2f", ml: 1.2, mt: 0.5, display: "block" }}
                                                            >
                                                                {rowErr.methodCode}
                                                            </Typography>
                                                        )}
                                                    </FormControl>
                                                </CardContent>
                                            </Card>

                                            <Card
                                                variant="outlined"
                                                sx={{
                                                    flex: 1,
                                                    borderRadius: 2,
                                                    borderColor: "#dbeafe",
                                                    bgcolor: "#ffffff",
                                                    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.03)",
                                                }}
                                            >
                                                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                                                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 800, display: "block", mb: 1 }}>
                                                        Chỉ tiêu và giữ chỗ
                                                    </Typography>
                                                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                                                        <TextField
                                                            label="Quota"
                                                            type="number"
                                                            value={row.quota ?? ""}
                                                            onChange={(e) => handleTimelineChange(idx, "quota", e.target.value)}
                                                            inputProps={{ min: 1, step: 1 }}
                                                            error={!!rowErr.quota}
                                                            helperText={rowErr.quota}
                                                            fullWidth
                                                            InputProps={{ readOnly: !isCampaignInfoEditable }}
                                                        />
                                                        <FormControlLabel
                                                            sx={{ m: 0, flexShrink: 0 }}
                                                            control={
                                                                <Checkbox
                                                                    size="small"
                                                                    checked={!!row.allowReservationSubmission}
                                                                    onChange={(e) => handleTimelineChange(idx, "allowReservationSubmission", e.target.checked)}
                                                                    disabled={!isCampaignInfoEditable}
                                                                />
                                                            }
                                                            label="Cho phép nộp hồ sơ giữ chỗ"
                                                        />
                                                    </Stack>
                                                </CardContent>
                                            </Card>
                                        </Stack>

                                        <Card
                                            variant="outlined"
                                            sx={{
                                                mt: 1.5,
                                                borderRadius: 2,
                                                borderColor: "#dbeafe",
                                                bgcolor: "#ffffff",
                                                boxShadow: "0 6px 16px rgba(15, 23, 42, 0.03)",
                                            }}
                                        >
                                            <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                                                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 800, display: "block", mb: 1 }}>
                                                    Thời gian
                                                </Typography>
                                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                                    <TextField
                                                        label="Bắt đầu"
                                                        type="date"
                                                        value={row.startDate || ""}
                                                        onChange={(e) => handleTimelineChange(idx, "startDate", e.target.value)}
                                                        InputLabelProps={{ shrink: true }}
                                                        error={!!rowErr.startDate}
                                                        helperText={rowErr.startDate}
                                                        fullWidth
                                                        InputProps={{ readOnly: !isCampaignInfoEditable }}
                                                    />
                                                    <TextField
                                                        label="Kết thúc"
                                                        type="date"
                                                        value={row.endDate || ""}
                                                        onChange={(e) => handleTimelineChange(idx, "endDate", e.target.value)}
                                                        InputLabelProps={{ shrink: true }}
                                                        error={!!rowErr.endDate}
                                                        helperText={rowErr.endDate}
                                                        fullWidth
                                                        InputProps={{ readOnly: !isCampaignInfoEditable }}
                                                    />
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Box>
                        {!formLocked && (() => {
                            const allocated = (Array.isArray(formValues.admissionMethodTimelines) ? formValues.admissionMethodTimelines : [])
                                .reduce((s, t) => s + (Number(t?.quota) || 0), 0);
                            const max = configuredTotalQuota;
                            const pct = max > 0 ? Math.min((allocated / max) * 100, 100) : 0;
                            const barColor = max === 0 ? HEADER_ACCENT : allocated === max ? "#16a34a" : allocated < max ? "#d97706" : "#dc2626";
                            const textColor = max === 0 ? HEADER_ACCENT : allocated === max ? "#16a34a" : allocated < max ? "#d97706" : "#dc2626";
                            return (
                                <Box sx={{ mt: 2.5, p: 2, borderRadius: 2, bgcolor: "rgba(13, 100, 222, 0.06)", border: "1px solid #dbeafe" }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: max > 0 ? 1 : 0.5 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b" }}>
                                            Tổng quota đã phân bổ
                                        </Typography>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: textColor }}>
                                            {allocated.toLocaleString("vi-VN")}{max > 0 ? ` / ${max.toLocaleString("vi-VN")}` : ""}
                                        </Typography>
                                    </Stack>
                                    {max > 0 && (
                                        <Box sx={{ height: 8, borderRadius: 4, bgcolor: "rgba(0,0,0,0.08)", overflow: "hidden", mb: 1 }}>
                                            <Box sx={{ height: "100%", width: `${pct}%`, bgcolor: barColor, borderRadius: 4, transition: "width .3s ease, background-color .3s ease" }} />
                                        </Box>
                                    )}
                                    <Typography variant="caption" sx={{ color: textColor, display: "block" }}>
                                        {max === 0
                                            ? "Tổng quota từ tất cả phương thức phải bằng tổng chỉ tiêu hệ thống"
                                            : allocated === max
                                            ? "✓ Đã phân bổ đủ quota"
                                            : allocated < max
                                            ? `Còn thiếu ${(max - allocated).toLocaleString("vi-VN")} chỉ tiêu`
                                            : `Vượt quá ${(allocated - max).toLocaleString("vi-VN")} chỉ tiêu`}
                                    </Typography>
                                </Box>
                            );
                        })()}
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
                                            isInfoEditing && isFormDirty
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
                                                disabled={submitLoading || publishBlockedByPastEndDate || (isInfoEditing && isFormDirty)}
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
                                   <Tooltip title="Chiến dịch đang mở — chỉ có thể hủy">
                                       <span>
                                           <Button
                                               variant="outlined"
                                               onClick={handleOpenCancelFlow}
                                               disabled={submitLoading}
                                               color="error"
                                               sx={{ textTransform: "none", fontWeight: 600, borderRadius: "12px" }}
                                           >
                                               Hủy
                                           </Button>
                                       </span>
                                   </Tooltip>
                            )}
                                {isPrimaryBranch && isDraft && !isPastYearCampaign && (
                                    <Button
                                        variant="outlined"
                                        onClick={handleOpenCancelFlow}
                                        disabled={submitLoading}
                                        color="error"
                                        sx={{ textTransform: "none", fontWeight: 600, borderRadius: "12px" }}
                                    >
                                        Hủy
                                    </Button>
                                )}
                                {isPrimaryBranch && (status === "OPEN" || isCancelled) && !isPastYearCampaign && (
                                    <Button
                                        variant="outlined"
                                        onClick={openCloneConfirm}
                                        disabled={submitLoading}
                                        sx={{ textTransform: "none", fontWeight: 600, borderRadius: "12px", whiteSpace: "nowrap" }}
                                    >
                                        Nhân bản → {Number(campaign?.year) + 1}
                                    </Button>
                                )}
                        </Stack>
                    </Box>
                    {formErrors.year && (
                        <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
                            {formErrors.year}
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
                        Bạn có chắc chắn muốn <ConfirmHighlight>công bố chiến dịch này</ConfirmHighlight>? Sau khi công bố sẽ{" "}
                        <ConfirmHighlight>không thể chỉnh sửa thông tin cơ bản</ConfirmHighlight>.
                    </Typography>
                        <Box sx={{ mt: 2.5, p: 1.5, borderRadius: 1.5, bgcolor: "rgba(13, 100, 222, 0.06)", border: "1px solid #dbeafe" }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" sx={{ fontWeight: 600, color: "#1e293b" }}>
                                    Tổng chỉ tiêu tuyển sinh:
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: HEADER_ACCENT }}>
                                    {(Array.isArray(formValues.admissionMethodTimelines) ? formValues.admissionMethodTimelines : [])
                                        .reduce((sum, t) => sum + (Number(t?.quota) || 0), 0)
                                        .toLocaleString("vi-VN")}
                                </Typography>
                            </Stack>
                        </Box>
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
                                {isDraft ? (
                                    <Typography variant="h6" sx={{ fontWeight: 700, textAlign: "center", color: "#1e293b" }}>
                                        Bạn có chắc muốn hủy chiến dịch này?
                                    </Typography>
                                ) : (
                                    <Stack spacing={1.5}>
                                        <Typography variant="h6" sx={{ fontWeight: 700, color: "red" }}>
                                            ⚠️ Bạn đang hủy chiến dịch ĐANG MỞ
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                            Toàn bộ gói tuyển sinh sẽ bị đóng.
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#991b1b", lineHeight: 1.6 }}>
                                            Hành động này không thể hoàn tác.
                                        </Typography>
                                    </Stack>
                                )}
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
                                {isDraft ? (
                                    <Button
                                        variant="contained"
                                        onClick={runCancelCampaign}
                                        disabled={submitLoading}
                                        sx={{
                                            textTransform: "none",
                                            fontWeight: 600,
                                            borderRadius: "12px",
                                            bgcolor: "#991b1b",
                                            "&:hover": { bgcolor: "#7f1d1d" },
                                        }}
                                    >
                                        Hủy chiến dịch
                                    </Button>
                                ) : (
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
                                )}
                        </DialogActions>
                    </>
                )}

                {cancelFlowPhase === "reason" && (
                    <>
                        <DialogContent sx={{ pt: 2.5 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                Nhập lý do hủy
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6, color: "red" }}>
                                Vui lòng nhập lý do hủy chiến dịch. Thông tin này được gửi kèm yêu cầu hủy tới hệ thống
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
                open={confirmCloneOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    if (submitLoading) return;
                    setConfirmCloneOpen(false);
                    setCloneTargetYear("");
                    setCloneYearError("");
                }}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: "16px" } }}
            >
                <DialogContent sx={{ pt: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Nhân bản chiến dịch?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, lineHeight: 1.6 }}>
                        Chọn <ConfirmHighlight>năm học mục tiêu</ConfirmHighlight> để tạo một bản nháp mới từ chiến dịch này.
                    </Typography>
                    <TextField
                        label="Năm học mục tiêu"
                        type="number"
                        fullWidth
                        value={cloneTargetYear}
                        onChange={(e) => {
                            setCloneTargetYear(e.target.value);
                            if (cloneYearError) setCloneYearError("");
                        }}
                        error={!!cloneYearError}
                        helperText={cloneYearError || `Mặc định: ${Number(campaign?.year) + 1}`}
                        inputProps={{ min: 1, step: 1 }}
                        sx={{ mt: 2.5, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button
                        onClick={() => {
                            setConfirmCloneOpen(false);
                            setCloneTargetYear("");
                            setCloneYearError("");
                        }}
                        disabled={submitLoading}
                        sx={{ textTransform: "none" }}
                    >
                        Đóng
                    </Button>
                    <Button
                        variant="contained"
                        onClick={runCloneCampaign}
                        disabled={submitLoading}
                        sx={{ textTransform: "none", fontWeight: 600, borderRadius: "12px", bgcolor: HEADER_ACCENT }}
                    >
                        {submitLoading ? "Đang nhân bản..." : "Xác nhận nhân bản"}
                    </Button>
                </DialogActions>
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

        </Box>
    );
}
