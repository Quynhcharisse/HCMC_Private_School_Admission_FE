import React, {useState, useMemo, useEffect, useRef} from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    Divider,
    Fade,
    FormControl,
    FormControlLabel,
    Grow,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    Skeleton,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import Pagination from "@mui/material/Pagination";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import BlockIcon from "@mui/icons-material/Block";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CampaignIcon from "@mui/icons-material/Campaign";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import {useLocation, useNavigate} from "react-router-dom";
import {enqueueSnackbar} from "notistack";
import { useSchool } from "../../../contexts/SchoolContext.jsx";
import {
    getCampaignTemplatesByYear,
    createCampaignTemplate,
    exportAdmissionCampaignList,
    updateCampaignTemplateStatus,
    cloneCampaignTemplate,
    cancelCampaignTemplate,
} from "../../../services/CampaignService.jsx";
import {
    getSchoolConfigByKey,
    parseSchoolConfigResponseBody,
    SCHOOL_CONFIG_KEY,
} from "../../../services/SchoolFacilityService.jsx";
import CreatePostRichTextEditor from "../../ui/CreatePostRichTextEditor.jsx";
import { ConfirmHighlight } from "../../ui/ConfirmDialog.jsx";

const modalPaperSx = {
    borderRadius: "16px",
    boxShadow: "0 24px 48px rgba(0, 0, 0, 0.12)",
    bgcolor: "white",
    overflow: "hidden",
};
const modalBackdropSx = {
    backdropFilter: "blur(6px)",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
};
const sectionCardSx = {
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    bgcolor: "#ffffff",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
};

// Bảng vẫn có thể hiển thị thêm trạng thái khác từ API; filter chỉ theo 3 trạng thái admission campaign
const STATUS_FILTER_OPTIONS = [
    {value: "OPEN", label: "Đang mở"}, // OPEN_ADMISSION_CAMPAIGN / publish
    {value: "CANCELLED", label: "Đã hủy"}, // CANCELLED_ADMISSION_CAMPAIGN
    {value: "DRAFT", label: "Bản nháp"}, // DRAFT_ADMISSION_CAMPAIGN
];

const STATUS_OPTIONS = [
    ...STATUS_FILTER_OPTIONS,
    {value: "PAUSED", label: "Tạm dừng"},
    {value: "CLOSED", label: "Đã đóng"},
    {value: "EXPIRED", label: "Hết hạn"},
];

/** Normalize template from API (id or admissionCampaignTemplateId) */
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
    const normalizedTimelines = Array.isArray(row.admissionMethodTimelines)
        ? row.admissionMethodTimelines.map((t) => ({
              ...t,
              startDate: normalizeDateLikeToIso(t?.startDate),
              endDate: normalizeDateLikeToIso(t?.endDate),
          }))
        : [];

    return {
        ...row,
        id,
        admissionCampaignTemplateId: row.admissionCampaignTemplateId ?? row.id,
        status,
        numberOfOfferings: row.numberOfOfferings ?? 0,
        admissionMethodTimelines: normalizedTimelines,
    };
}

const emptyForm = {
    name: "",
    description: "",
    year: new Date().getFullYear(),
    startDate: "",
    endDate: "",
    admissionMethodTimelines: [{ methodCode: "", startDate: "", endDate: "", allowReservationSubmission: false, quota: "" }],
};

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

const CURRENT_YEAR = new Date().getFullYear();
/** Năm chọn khi xuất Excel (danh sách rộng để xuất theo từng năm) */
const CAMPAIGN_EXPORT_YEAR_OPTIONS = Array.from({length: 16}, (_, i) => CURRENT_YEAR + 1 - i);

/** Các năm quá khứ gộp trong tab «Các năm trước» (gọi API theo từng năm rồi merge). */
const PAST_YEARS_FETCH_COUNT = 8;
const PAST_YEARS_FOR_TAB = Array.from({length: PAST_YEARS_FETCH_COUNT}, (_, i) => CURRENT_YEAR - 1 - i);
const FUTURE_YEARS_FETCH_COUNT = 30;
const CURRENT_AND_FUTURE_YEARS_FOR_TAB = Array.from({length: FUTURE_YEARS_FETCH_COUNT + 1}, (_, i) => CURRENT_YEAR + i);

const CAMPAIGN_TAB_CURRENT = "current";
const CAMPAIGN_TAB_UPCOMING = "upcoming";
const CAMPAIGN_TAB_PAST = "past";

/** Gộp nhiều response, trùng id chỉ giữ một bản. */
function mergeCampaignListsById(rowsArrays) {
    const byId = new Map();
    for (const rows of rowsArrays) {
        if (!Array.isArray(rows)) continue;
        for (const row of rows) {
            const m = mapTemplate(row);
            if (!m) continue;
            const id = m.id;
            if (!byId.has(id)) byId.set(id, m);
        }
    }
    return [...byId.values()].sort((a, b) => {
        const ya = Number(a.year) || 0;
        const yb = Number(b.year) || 0;
        if (yb !== ya) return yb - ya;
        return String(a.name || "").localeCompare(String(b.name || ""), "vi");
    });
}

/** Parse YYYY-MM-DD as local calendar date (tránh lệch múi giờ so với LocalDate BE). */
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

function campaignDescriptionToInitialHtml(stored) {
    const raw = stored ?? "";
    const s = String(raw).trim();
    if (!s) return "";
    if (/<[a-z][\s/>]/i.test(s)) return String(raw);
    const esc = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<p>${esc}</p>`;
}

/** Map BE validation messages (EN / VI) → hiển thị tiếng Việt (Create + Update) */
const CAMPAIGN_ERROR_VI = {
    "Request is required": "Yêu cầu không được để trống",
    "Name is required": "Tên chiến dịch không được để trống",
    "Name is too long. Maximum length is 100 characters": "Tên chiến dịch quá dài. Độ dài tối đa là 100 ký tự",
    "Description is required": "Mô tả chiến dịch không được để trống",
    "Year is required": "Năm học không được để trống",
    "Cannot create a campaign for a past academic year": "Không thể tạo chiến dịch cho một năm học trong quá khứ",
    "Start date and end date are required": "Ngày bắt đầu và ngày kết thúc là bắt buộc",
    "Start date cannot be in the past": "Ngày bắt đầu không được ở trong quá khứ",
    "End date must be in the future": "Ngày kết thúc phải ở trong tương lai",
    "End date must be after start date": "Ngày kết thúc phải sau ngày bắt đầu",
    // Thông điệp tiếng Việt từ validationCreateAdmissionCampaignTemplate (BE)
    "Dữ liệu yêu cầu không được để trống": "Dữ liệu yêu cầu không được để trống",
    "Tên chiến dịch không được để trống": "Tên chiến dịch không được để trống",
    "Tên chiến dịch quá dài. Độ dài tối đa là 100 ký tự": "Tên chiến dịch quá dài. Độ dài tối đa là 100 ký tự",
    "Mô tả chiến dịch không được để trống": "Mô tả chiến dịch không được để trống",
    "Năm học không được để trống": "Năm học không được để trống",
    "Không thể tạo chiến dịch cho một năm học trong quá khứ": "Không thể tạo chiến dịch cho một năm học trong quá khứ",
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

    const existsTypo = /^A campaign template for the (\d+)year already exists$/.exec(trimmed);
    if (existsTypo) {
        return `Mẫu chiến dịch cho năm học ${existsTypo[1]} đã tồn tại`;
    }
    const existsSpaced = /^A campaign template for the (\d+) year already exists$/.exec(trimmed);
    if (existsSpaced) {
        return `Mẫu chiến dịch cho năm học ${existsSpaced[1]} đã tồn tại`;
    }

    const existsVi = /^Mẫu chiến dịch cho năm học (\d+) đã tồn tại\.?$/.exec(trimmed);
    if (existsVi) return trimmed.replace(/\.$/, "");

    return trimmed || fallback;
}

const CAMPAIGN_SUCCESS_VI = {
    "Create campaign template successfully": "Đã tạo chiến dịch thành công",
};

function getCampaignSuccessMessage(backendMessage, fallback) {
    if (!backendMessage) return fallback;
    const trimmed = String(backendMessage).trim();
    if (CAMPAIGN_SUCCESS_VI[trimmed]) return CAMPAIGN_SUCCESS_VI[trimmed];
    return trimmed || fallback;
}

export default function SchoolCampaigns() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isPrimaryBranch } = useSchool();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [campaignTab, setCampaignTab] = useState(CAMPAIGN_TAB_CURRENT);
    const [statusFilter, setStatusFilter] = useState("all");
    const [campaignCountByTab, setCampaignCountByTab] = useState({});
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createDescriptionFieldKey, setCreateDescriptionFieldKey] = useState(0);
    const [formValues, setFormValues] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState({});
    const [admissionMethodOptions, setAdmissionMethodOptions] = useState([]);
    const timelineItemRefs = useRef([]);
    const [pendingScrollTimelineIndex, setPendingScrollTimelineIndex] = useState(null);
    const [page, setPage] = useState(0);
    const rowsPerPage = 10;
    const [exporting, setExporting] = useState(false);
    const [exportYear, setExportYear] = useState(CURRENT_YEAR);
    const [publishLoading, setPublishLoading] = useState(false);
    const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
    const [publishTargetCampaign, setPublishTargetCampaign] = useState(null);
    const [cloneLoading, setCloneLoading] = useState(false);
    const [confirmCloneOpen, setConfirmCloneOpen] = useState(false);
    const [cloneTargetCampaign, setCloneTargetCampaign] = useState(null);
    const [cloneTargetYear, setCloneTargetYear] = useState("");
    const [cloneYearError, setCloneYearError] = useState("");
    const [cancelLoading, setCancelLoading] = useState(false);
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
    const [cancelTargetCampaign, setCancelTargetCampaign] = useState(null);
    const [cancelReason, setCancelReason] = useState("");
    const [cancelReasonError, setCancelReasonError] = useState("");
    const [cancelFlowPhase, setCancelFlowPhase] = useState("confirm");
    const [cancelBlockedMessage, setCancelBlockedMessage] = useState("");
    const [cancelBlockedCampaigns, setCancelBlockedCampaigns] = useState({});
    const [totalConfiguredQuota, setTotalConfiguredQuota] = useState(0);

    useEffect(() => {
        setExportYear(
            campaignTab === CAMPAIGN_TAB_CURRENT
                ? CURRENT_YEAR
                : campaignTab === CAMPAIGN_TAB_UPCOMING
                    ? CURRENT_YEAR + 1
                    : CURRENT_YEAR - 1
        );
    }, [campaignTab]);

    useEffect(() => {
        let cancelled = false;
        getSchoolConfigByKey(SCHOOL_CONFIG_KEY.ADMISSION_SETTINGS_DATA)
            .then((res) => {
                if (cancelled) return;
                const body = parseSchoolConfigResponseBody(res);
                const adm = body?.admissionSettingsData && typeof body.admissionSettingsData === "object"
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
                setTotalConfiguredQuota(Number.isFinite(tq) && tq > 0 ? tq : 0);
            })
            .catch(() => {
                if (cancelled) return;
                setAdmissionMethodOptions([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        const parseBody = (res) => {
            const raw = res?.data?.body ?? res?.data;
            if (Array.isArray(raw)) return raw;
            if (raw) return [raw];
            return [];
        };

        if (campaignTab === CAMPAIGN_TAB_CURRENT || campaignTab === CAMPAIGN_TAB_UPCOMING) {
            Promise.all(CURRENT_AND_FUTURE_YEARS_FOR_TAB.map((y) => getCampaignTemplatesByYear(y)))
                .then((responses) => {
                    if (cancelled) return;
                    const lists = responses.map(parseBody);
                    const merged = mergeCampaignListsById(lists);
                    const currentAndFuture = merged.filter((c) => Number(c.year) >= CURRENT_YEAR);
                    setCampaigns(currentAndFuture);
                    setCampaignCountByTab((prev) => ({
                        ...prev,
                        [CAMPAIGN_TAB_CURRENT]: currentAndFuture.filter((c) => Number(c.year) === CURRENT_YEAR).length,
                        [CAMPAIGN_TAB_UPCOMING]: currentAndFuture.filter((c) => Number(c.year) > CURRENT_YEAR).length,
                    }));
                })
                .catch((err) => {
                    if (cancelled) return;
                    console.error("Fetch campaign templates error:", err);
                    enqueueSnackbar(err?.response?.data?.message || "Không tải được danh sách chiến dịch", {
                        variant: "error",
                    });
                    setCampaigns([]);
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        } else {
            Promise.all(PAST_YEARS_FOR_TAB.map((y) => getCampaignTemplatesByYear(y)))
                .then((responses) => {
                    if (cancelled) return;
                    const lists = responses.map(parseBody);
                    const merged = mergeCampaignListsById(lists);
                    const past = merged.filter((c) => Number(c.year) < CURRENT_YEAR);
                    setCampaigns(past);
                    setCampaignCountByTab((prev) => ({
                        ...prev,
                        [CAMPAIGN_TAB_PAST]: past.length,
                    }));
                })
                .catch((err) => {
                    if (cancelled) return;
                    console.error("Fetch campaign templates error:", err);
                    enqueueSnackbar(err?.response?.data?.message || "Không tải được danh sách chiến dịch", {
                        variant: "error",
                    });
                    setCampaigns([]);
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        }

        return () => { cancelled = true; };
    }, [campaignTab]);

    useEffect(() => {
        if (loading || campaignTab !== CAMPAIGN_TAB_PAST) return;
        setCampaignCountByTab((prev) => ({ ...prev, [CAMPAIGN_TAB_PAST]: campaigns.length }));
    }, [loading, campaigns, campaignTab]);

    useEffect(() => {
        setPage(0);
    }, [campaignTab, search, statusFilter]);

    useEffect(() => {
        if (pendingScrollTimelineIndex == null) return;
        const target = timelineItemRefs.current[pendingScrollTimelineIndex];
        if (target && typeof target.scrollIntoView === "function") {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        setPendingScrollTimelineIndex(null);
    }, [pendingScrollTimelineIndex, formValues.admissionMethodTimelines?.length]);

    const isPastYearView = campaignTab === CAMPAIGN_TAB_PAST;

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormValues((prev) => ({
            ...prev,
            [name]: name === "year" ? (value === "" ? "" : parseInt(value, 10)) : value,
        }));
    };

    const handleTimelineChange = (index, field, value) => {
        setFormValues((prev) => {
            const next = Array.isArray(prev.admissionMethodTimelines)
                ? [...prev.admissionMethodTimelines]
                : [];
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
    };

    const addTimelineRow = () => {
        const currentLen = Array.isArray(formValues.admissionMethodTimelines)
            ? formValues.admissionMethodTimelines.length
            : 0;
        setPendingScrollTimelineIndex(currentLen);
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
    };

    const filteredCampaigns = useMemo(() => {
        let list = campaigns;
        const year = (campaign) => Number(campaign?.year) || 0;
        if (campaignTab === CAMPAIGN_TAB_CURRENT) {
            list = list.filter((c) => year(c) === CURRENT_YEAR);
        } else if (campaignTab === CAMPAIGN_TAB_UPCOMING) {
            list = list.filter((c) => year(c) > CURRENT_YEAR);
        } else {
            list = list.filter((c) => year(c) < CURRENT_YEAR);
        }
        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter((c) => c.name?.toLowerCase().includes(q));
        }
        if (statusFilter !== "all") {
            list = list.filter((c) => String(c.status).toUpperCase() === statusFilter);
        }
        // Ưu tiên campaign trạng thái DRAFT, sau đó OPEN
        return [...list].sort((a, b) => {
            const yearA = Number(a?.year) || 0;
            const yearB = Number(b?.year) || 0;
            if (yearB !== yearA) return yearB - yearA;
            const rank = (status) => {
                const s = String(status || "").toUpperCase();
                if (s === "DRAFT") return 0;
                if (s === "OPEN") return 1;
                return 2;
            };
            return rank(a?.status) - rank(b?.status);
        });
    }, [campaigns, campaignTab, search, statusFilter]);

    const paginatedCampaigns = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredCampaigns.slice(start, start + rowsPerPage);
    }, [filteredCampaigns, page]);

    const cloneDisabledMap = useMemo(() => {
        const activeYears = new Set();
        for (const c of campaigns) {
            const s = String(c.status || "").toUpperCase();
            if (s === "DRAFT" || s === "OPEN") activeYears.add(Number(c.year));
        }
        const result = {};
        for (const c of campaigns) {
            result[c.id] = activeYears.has(Number(c.year) + 1);
        }
        return result;
    }, [campaigns]);

    const validateForm = () => {
        const errors = {};
        const name = formValues.name?.trim() ?? "";
        const descriptionPlain = campaignDescriptionPlainText(formValues.description ?? "");
        const yearRaw = formValues.year;
        const yearNum = typeof yearRaw === "number" ? yearRaw : parseInt(String(yearRaw), 10);

        if (!name) errors.name = "Tên chiến dịch không được để trống";
        else if (name.length > 100) errors.name = "Tên chiến dịch quá dài. Độ dài tối đa là 100 ký tự";

        if (!descriptionPlain) errors.description = "Mô tả chiến dịch không được để trống";

        if (!Number.isFinite(yearNum) || yearNum <= 0) {
            errors.year = "Năm học không được để trống";
        } else if (yearNum < CURRENT_YEAR) {
            errors.year = "Không thể tạo chiến dịch cho một năm học trong quá khứ";
        }

        const startIso = formValues.startDate?.trim() ?? "";
        const endIso = formValues.endDate?.trim() ?? "";
        if (!startIso) errors.startDate = "Ngày bắt đầu không được để trống";
        if (!endIso) errors.endDate = "Ngày kết thúc không được để trống";

        const start = parseLocalDate(startIso);
        const end = parseLocalDate(endIso);
        if (startIso && !start) errors.startDate = "Ngày bắt đầu không hợp lệ";
        if (endIso && !end) errors.endDate = "Ngày kết thúc không hợp lệ";

        const today = startOfLocalToday();
        const earliestStartAllowed = addLocalDays(today, -1);

        if (start && !errors.startDate) {
            if (start.getTime() < earliestStartAllowed.getTime()) {
                errors.startDate = "Ngày bắt đầu không được ở trong quá khứ";
            }
        }
        if (end && !errors.endDate) {
            if (end.getTime() < today.getTime()) {
                errors.endDate = "Ngày kết thúc phải ở trong tương lai";
            }
        }
        if (start && end && !errors.startDate && !errors.endDate) {
            if (end.getTime() <= start.getTime()) {
                errors.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
            }
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

        if (
            Number.isFinite(yearNum) &&
            yearNum > 0 &&
            !errors.year &&
            campaigns.some((c) => Number(c.year) === yearNum && String(c.status || "").toUpperCase() === "OPEN")
        ) {
            errors.year = `Mẫu chiến dịch cho năm học ${yearNum} đã tồn tại`;
        }

        const campaignStart = parseLocalDate(startIso);
        const campaignEnd = parseLocalDate(endIso);
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
                if (campaignStart && rowStart && rowStart.getTime() < campaignStart.getTime()) {
                    rowErr.startDate = "Ngày bắt đầu phải nằm trong chiến dịch";
                }
                if (campaignEnd && rowEnd && rowEnd.getTime() > campaignEnd.getTime()) {
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

    const getCreatePayload = () => {
        const y = formValues.year;
        const yearNum = typeof y === "number" ? y : parseInt(String(y), 10);
        return {
            name: formValues.name.trim(),
            description: formValues.description?.trim() || "",
            year: Number.isFinite(yearNum) ? yearNum : 0,
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
        };
    };

    const handleOpenCreate = () => {
        if (isPastYearView) {
            enqueueSnackbar("Năm học đã qua — chỉ xem, không thể tạo chiến dịch mới.", { variant: "info" });
            return;
        }
        setFormValues({
            ...emptyForm,
            year: new Date().getFullYear(),
        });
        setFormErrors({});
        setCreateDescriptionFieldKey((k) => k + 1);
        setCreateModalOpen(true);
    };

    useEffect(() => {
        if (!location.state?.openCreateModal || !isPrimaryBranch || isPastYearView) return;
        setFormValues({
            ...emptyForm,
            year: new Date().getFullYear(),
        });
        setFormErrors({});
        setCreateDescriptionFieldKey((k) => k + 1);
        setCreateModalOpen(true);
        navigate(location.pathname, { replace: true, state: null });
    }, [isPastYearView, isPrimaryBranch, location.pathname, location.state, navigate]);

    const handleCreateSubmit = async () => {
        if (!validateForm()) return;
        setSubmitLoading(true);
        try {
            const payload = getCreatePayload();
            const res = await createCampaignTemplate(payload);
            if (res?.status >= 200 && res?.status < 300) {
                enqueueSnackbar(
                    getCampaignSuccessMessage(res?.data?.message, "Tạo chiến dịch thành công"),
                    { variant: "success" }
                );
                setCreateModalOpen(false);
                const createdYear = Number(payload.year);
                if (Number.isFinite(createdYear)) {
                    setCampaignTab(CAMPAIGN_TAB_CURRENT);
                }
                const refetch = await getCampaignTemplatesByYear(
                    Number.isFinite(createdYear) ? createdYear : CURRENT_YEAR
                );
                const raw = refetch?.data?.body ?? refetch?.data;
                let list = [];
                if (Array.isArray(raw)) {
                    list = raw;
                } else if (raw) {
                    list = [raw];
                }
                const mapped = list.map(mapTemplate).filter(Boolean);
                setCampaigns(mapped);
            } else {
                enqueueSnackbar(
                    getCampaignErrorMessage(res?.data?.message, "Tạo chiến dịch thất bại"),
                    { variant: "error" }
                );
            }
        } catch (err) {
            enqueueSnackbar(
                getCampaignErrorMessage(err?.response?.data?.message, "Tạo chiến dịch thất bại"),
                { variant: "error" }
            );
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleOpenView = (campaign) => {
        const id = campaign.id ?? campaign.admissionCampaignTemplateId;
        navigate(`/school/campaigns/view/${id}`, { state: { campaign } });
    };

    const handleOpenEdit = (campaign) => {
        const id = campaign.id ?? campaign.admissionCampaignTemplateId;
        navigate(`/school/campaigns/detail/${id}`, { state: { campaign } });
    };

    const getStatusLabel = (status) => {
        const upper = String(status || "").toUpperCase();
        const mapped = STATUS_OPTIONS.find((s) => s.value === upper);
        return mapped?.label ?? status ?? "—";
    };

    const getStatusColor = (status) => {
        const upper = String(status || "").toUpperCase();
        if (upper === "DRAFT") return {bg: "rgba(100, 116, 139, 0.14)", color: "#475569"};
        if (upper === "OPEN") return {bg: "rgba(34, 197, 94, 0.12)", color: "#16a34a"};
        if (upper === "PAUSED") return {bg: "rgba(250, 204, 21, 0.18)", color: "#a16207"};
        if (upper === "CANCELLED") return {bg: "rgba(248, 113, 113, 0.16)", color: "#b91c1c"};
        if (upper === "EXPIRED") return {bg: "rgba(248, 113, 113, 0.15)", color: "#b91c1c"};
        if (upper === "CLOSED") return {bg: "rgba(148, 163, 184, 0.2)", color: "#64748b"};
        return {bg: "rgba(148, 163, 184, 0.18)", color: "#64748b"};
    };

    const handleExportCampaignsExcel = async () => {
        if (exporting) return;
        const y = Number(exportYear);
        if (!Number.isFinite(y) || y <= 0) {
            enqueueSnackbar("Chọn năm hợp lệ để xuất.", {variant: "warning"});
            return;
        }
        setExporting(true);
        try {
            const res = await exportAdmissionCampaignList(y);
            const fileBlob = res?.data;
            if (!fileBlob) {
                enqueueSnackbar("Không có dữ liệu để xuất file.", {variant: "warning"});
                return;
            }
            const contentDisposition = res?.headers?.["content-disposition"] || "";
            const fileNameFromHeader = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)?.[1];
            const fileName = decodeURIComponent((fileNameFromHeader || "").replace(/"/g, "")) ||
                `danh-sach-chien-dich-tuyen-sinh-${y}.xlsx`;
            const downloadUrl = window.URL.createObjectURL(fileBlob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
            enqueueSnackbar("Xuất file Excel thành công.", {variant: "success"});
        } catch (e) {
            console.error("Export campaign list failed", e);
            enqueueSnackbar("Xuất file Excel thất bại.", {variant: "error"});
        } finally {
            setExporting(false);
        }
    };

    const openPublishConfirm = (campaign) => {
        if (!campaign?.id || publishLoading) return;
        if (String(campaign.status || "").toUpperCase() === "OPEN") return;
        setPublishTargetCampaign(campaign);
        setConfirmPublishOpen(true);
    };

    const handlePublishCampaign = async () => {
        if (!publishTargetCampaign?.id || publishLoading) return;
        setPublishLoading(true);
        try {
            await updateCampaignTemplateStatus(publishTargetCampaign.id);
            setCampaigns((prev) =>
                prev.map((item) =>
                    Number(item.id) === Number(publishTargetCampaign.id)
                        ? { ...item, status: "OPEN" }
                        : item
                )
            );
            setConfirmPublishOpen(false);
            setPublishTargetCampaign(null);
            enqueueSnackbar("Công bố chiến dịch thành công.", { variant: "success" });
        } catch {
            enqueueSnackbar("Công bố chiến dịch thất bại.", { variant: "error" });
        } finally {
            setPublishLoading(false);
        }
    };

    const openCloneConfirm = (campaign) => {
        setCloneTargetCampaign(campaign);
        setCloneTargetYear(String(Number(campaign?.year) + 1));
        setCloneYearError("");
        setConfirmCloneOpen(true);
    };

    const handleCloneCampaign = async () => {
        if (!cloneTargetCampaign?.id || cloneLoading) return;
        const targetYear = Number.parseInt(String(cloneTargetYear), 10);
        if (!Number.isFinite(targetYear) || targetYear <= 0) {
            setCloneYearError("Vui lòng nhập năm học mục tiêu hợp lệ");
            return;
        }
        setCloneLoading(true);
        try {
            const res = await cloneCampaignTemplate(cloneTargetCampaign.id, targetYear);
            if (res?.status >= 200 && res?.status < 300) {
                const body = res?.data?.body ?? res?.data ?? {};
                const newId = Number(body?.id ?? body?.admissionCampaignTemplateId ?? body?.data?.id ?? body?.data?.admissionCampaignTemplateId);
                enqueueSnackbar(res?.data?.message || "Đã nhân bản chiến dịch sang bản nháp mới.", { variant: "success" });
                setConfirmCloneOpen(false);
                setCloneTargetCampaign(null);
                setCloneTargetYear("");
                setCloneYearError("");
                if (Number.isFinite(newId) && newId > 0) {
                    navigate(`/school/campaigns/detail/${newId}`, {
                        replace: true,
                        state: { clonedFrom: Number(cloneTargetCampaign?.year), openEdit: true },
                    });
                } else {
                    window.location.reload();
                }
            } else {
                enqueueSnackbar(res?.data?.message || "Nhân bản chiến dịch thất bại.", { variant: "error" });
            }
        } catch (err) {
            enqueueSnackbar(err?.response?.data?.message || "Nhân bản chiến dịch thất bại.", { variant: "error" });
        } finally {
            setCloneLoading(false);
        }
    };

    const openCancelConfirm = (campaign) => {
        const status = String(campaign.status || "").toUpperCase();
        setCancelTargetCampaign(campaign);
        setCancelReason("");
        setCancelReasonError("");
        setCancelBlockedMessage("");
        setCancelFlowPhase(status === "OPEN" ? "reason" : "confirm");
        setConfirmCancelOpen(true);
    };

    const resetCancelDialog = () => {
        setConfirmCancelOpen(false);
        setCancelTargetCampaign(null);
        setCancelReason("");
        setCancelReasonError("");
        setCancelBlockedMessage("");
        setCancelFlowPhase("confirm");
    };

    const handleCancelCampaign = async () => {
        if (!cancelTargetCampaign?.id || cancelLoading) return;
        const isOpen = String(cancelTargetCampaign.status || "").toUpperCase() === "OPEN";
        const reason = cancelReason.trim();
        if (isOpen && !reason) {
            setCancelReasonError("Vui lòng nhập lý do hủy");
            return;
        }
        setCancelLoading(true);
        try {
            const res = await cancelCampaignTemplate(cancelTargetCampaign.id, reason);
            if (res?.status >= 200 && res?.status < 300) {
                setCampaigns((prev) =>
                    prev.map((item) =>
                        Number(item.id) === Number(cancelTargetCampaign.id)
                            ? { ...item, status: "CANCELLED" }
                            : item
                    )
                );
                enqueueSnackbar("Đã hủy chiến dịch thành công.", { variant: "success" });
                resetCancelDialog();
            } else {
                enqueueSnackbar(res?.data?.message || "Không thể hủy chiến dịch.", { variant: "error" });
            }
        } catch (err) {
            const code = err?.response?.status;
            const data = err?.response?.data;
            if (code === 412) {
                const msg =
                    (typeof data === "string" ? data : data?.message || data?.error || "") ||
                    "Còn hồ sơ chưa xử lý. Yêu cầu các cơ sở từ chối hồ sơ trước khi hủy.";
                setCancelBlockedMessage(msg);
                setCancelFlowPhase("blocked");
                if (cancelTargetCampaign?.id) {
                    setCancelBlockedCampaigns((prev) => ({ ...prev, [cancelTargetCampaign.id]: msg }));
                }
            } else {
                enqueueSnackbar(err?.response?.data?.message || "Không thể hủy chiến dịch.", { variant: "error" });
            }
        } finally {
            setCancelLoading(false);
        }
    };

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
            {/* Header — cùng style trang Cơ sở */}
            <Box
                sx={{
                    background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                    borderRadius: 3,
                    p: 3,
                    color: "white",
                    boxShadow: "0 8px 32px rgba(13, 100, 222, 0.25)",
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: {xs: "column", sm: "row"},
                        alignItems: {xs: "stretch", sm: "center"},
                        justifyContent: "space-between",
                        gap: 2,
                    }}
                >
                    <Box>
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 700,
                                letterSpacing: "-0.02em",
                                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            }}
                        >
                            Quản lý chiến dịch tuyển sinh
                        </Typography>
                        <Typography variant="body2" sx={{mt: 0.5, opacity: 0.95}}>
                            {isPrimaryBranch
                                ? "Theo dõi và cấu hình chiến dịch tuyển sinh của trường"
                                : "Xem kế hoạch tuyển sinh"}
                        </Typography>
                    </Box>
                    {isPrimaryBranch && !isPastYearView && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon/>}
                            onClick={handleOpenCreate}
                            sx={{
                                bgcolor: "rgba(255,255,255,0.95)",
                                color: "#0D64DE",
                                borderRadius: 2,
                                textTransform: "none",
                                fontWeight: 600,
                                px: 3,
                                py: 1.5,
                                boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                                "&:hover": {
                                    bgcolor: "white",
                                    boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                                },
                            }}
                        >
                            Tạo chiến dịch
                        </Button>
                    )}
                </Box>
            </Box>

            <Fade in timeout={220} key={campaignTab}>
                <Box sx={{width: "100%"}}>
            <Card
                elevation={0}
                sx={{
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 24px rgba(51,65,85,0.06)",
                    bgcolor: "#fff",
                    overflow: "hidden",
                }}
            >
                {/* Tiêu đề trong card — cùng kiểu màn Cài đặt */}
                <Box
                    sx={{
                        px: 2.5,
                        pt: 2.5,
                        pb: 1.5,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1.5,
                    }}
                >
                    <CampaignIcon sx={{color: "#0D64DE", fontSize: 28, mt: 0.25}}/>
                    <Box>
                        <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b", lineHeight: 1.3}}>
                            Danh sách chiến dịch
                        </Typography>
                        <Typography variant="body2" sx={{color: "#64748b", mt: 0.5}}>
                            {isPastYearView
                                ? "Năm học đã qua — chỉ xem lại dữ liệu, không tạo hay chỉnh sửa."
                                : campaignTab === CAMPAIGN_TAB_UPCOMING
                                    ? "Các chiến dịch sắp tới đã được tách riêng để theo dõi nhanh hơn."
                                    : "Xem và quản lý chiến dịch tuyển sinh cho năm học hiện tại"}
                        </Typography>
                    </Box>
                </Box>

                {/* Tabs năm học */}
                <Box sx={{px: 2.5}}>
                    <Tabs
                        value={campaignTab}
                        onChange={(_, v) => setCampaignTab(v)}
                        sx={{
                            minHeight: 48,
                            "& .MuiTabs-flexContainer": {
                                gap: 0.5,
                            },
                            "& .MuiTab-root": {
                                minHeight: 48,
                                px: 2,
                                py: 1,
                                textTransform: "none",
                                fontSize: "0.9375rem",
                                fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
                                color: "#64748b",
                                fontWeight: 500,
                                borderRadius: "8px",
                                transition: "all 0.2s ease",
                                "&:hover": {
                                    color: "#334155",
                                    bgcolor: "rgba(148, 163, 184, 0.12)",
                                },
                                "&.Mui-selected": {
                                    color: "#0D64DE",
                                    fontWeight: 700,
                                },
                            },
                            "& .MuiTabs-indicator": {
                                height: 3,
                                borderRadius: "3px 3px 0 0",
                                bgcolor: "#0D64DE",
                                transition: "all 0.2s ease",
                            },
                            "& .MuiTab-root:not(.Mui-selected) .campaign-year-tab-badge": {
                                bgcolor: "rgba(100, 116, 139, 0.14)",
                                color: "#64748b",
                            },
                        }}
                        TabIndicatorProps={{
                            sx: {
                                height: 3,
                                bgcolor: "#0D64DE",
                            },
                        }}
                    >
                        <Tab
                            value={CAMPAIGN_TAB_CURRENT}
                            label={
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="center"
                                    spacing={0.75}
                                    component="span"
                                >
                                    <Typography component="span" variant="body2" sx={{fontWeight: "inherit"}}>
                                        {`Năm hiện tại (${CURRENT_YEAR})`}
                                    </Typography>
                                    {campaignCountByTab[CAMPAIGN_TAB_CURRENT] !== undefined && (
                                        <Box
                                            component="span"
                                            className="campaign-year-tab-badge"
                                            sx={{
                                                minWidth: 22,
                                                height: 22,
                                                px: 0.75,
                                                borderRadius: "999px",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                lineHeight: "22px",
                                                textAlign: "center",
                                                bgcolor: "rgba(13, 100, 222, 0.12)",
                                                color: "#0D64DE",
                                                transition: "all 0.2s ease",
                                            }}
                                        >
                                            {campaignCountByTab[CAMPAIGN_TAB_CURRENT]}
                                        </Box>
                                    )}
                                </Stack>
                            }
                        />
                        <Tab
                            value={CAMPAIGN_TAB_UPCOMING}
                            label={
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="center"
                                    spacing={0.75}
                                    component="span"
                                >
                                    <Typography component="span" variant="body2" sx={{fontWeight: "inherit"}}>
                                        Sắp tới
                                    </Typography>
                                    {campaignCountByTab[CAMPAIGN_TAB_UPCOMING] !== undefined && (
                                        <Box
                                            component="span"
                                            className="campaign-year-tab-badge"
                                            sx={{
                                                minWidth: 22,
                                                height: 22,
                                                px: 0.75,
                                                borderRadius: "999px",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                lineHeight: "22px",
                                                textAlign: "center",
                                                bgcolor: "rgba(13, 100, 222, 0.12)",
                                                color: "#0D64DE",
                                                transition: "all 0.2s ease",
                                            }}
                                        >
                                            {campaignCountByTab[CAMPAIGN_TAB_UPCOMING]}
                                        </Box>
                                    )}
                                </Stack>
                            }
                        />
                        <Tab
                            value={CAMPAIGN_TAB_PAST}
                            label={
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="center"
                                    spacing={0.75}
                                    component="span"
                                >
                                    <Typography component="span" variant="body2" sx={{fontWeight: "inherit"}}>
                                        Các năm trước
                                    </Typography>
                                    {campaignCountByTab[CAMPAIGN_TAB_PAST] !== undefined && (
                                        <Box
                                            component="span"
                                            className="campaign-year-tab-badge"
                                            sx={{
                                                minWidth: 22,
                                                height: 22,
                                                px: 0.75,
                                                borderRadius: "999px",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                lineHeight: "22px",
                                                textAlign: "center",
                                                bgcolor: "rgba(13, 100, 222, 0.12)",
                                                color: "#0D64DE",
                                                transition: "all 0.2s ease",
                                            }}
                                        >
                                            {campaignCountByTab[CAMPAIGN_TAB_PAST]}
                                        </Box>
                                    )}
                                </Stack>
                            }
                        />
                    </Tabs>
                </Box>

                <Divider sx={{borderColor: "#e2e8f0"}}/>

                <CardContent sx={{p: 2.5, pb: 2}}>
                    <Stack
                        direction={{xs: "column", md: "row"}}
                        spacing={2}
                        alignItems={{xs: "stretch", md: "center"}}
                        flexWrap="wrap"
                    >
                        <TextField
                            placeholder="Tìm theo tên chiến dịch..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            size="small"
                            sx={{
                                flex: 1,
                                minWidth: 200,
                                maxWidth: {md: 280},
                                "& .MuiOutlinedInput-root": {borderRadius: "12px", bgcolor: "#f8fafc"},
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{color: "#64748b"}}/>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <FormControl size="small" sx={{minWidth: 140}}>
                            <InputLabel>Trạng thái</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Trạng thái"
                                onChange={(e) => setStatusFilter(e.target.value)}
                                sx={{borderRadius: "12px", bgcolor: "#f8fafc"}}
                            >
                                <MenuItem value="all">Tất cả trạng thái</MenuItem>
                                {STATUS_FILTER_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{minWidth: 120}}>
                            <InputLabel>Năm xuất</InputLabel>
                            <Select
                                value={exportYear}
                                label="Năm xuất"
                                onChange={(e) => setExportYear(Number(e.target.value))}
                                sx={{borderRadius: "12px", bgcolor: "#f8fafc"}}
                            >
                                {CAMPAIGN_EXPORT_YEAR_OPTIONS.map((y) => (
                                    <MenuItem key={y} value={y}>
                                        {y}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button
                            variant="outlined"
                            startIcon={<DownloadIcon/>}
                            onClick={handleExportCampaignsExcel}
                            disabled={exporting}
                            sx={{
                                textTransform: "none",
                                fontWeight: 600,
                                borderRadius: "12px",
                                borderColor: "#cbd5e1",
                                color: "#0f172a",
                                "&:hover": {borderColor: "#0D64DE", bgcolor: "rgba(13, 100, 222, 0.06)"},
                            }}
                        >
                            {exporting ? "Đang xuất..." : "Xuất Excel"}
                        </Button>
                    </Stack>
                </CardContent>

                <TableContainer sx={{borderTop: "1px solid #e2e8f0"}}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{bgcolor: "#f8fafc"}}>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Tên chiến dịch
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Năm
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Bắt đầu — Kết thúc
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Trạng thái
                                </TableCell>
                                {isPrimaryBranch && (
                                    <TableCell
                                        sx={{fontWeight: 700, color: "#1e293b", py: 2}}
                                        align="right"
                                    >
                                        Thao tác
                                    </TableCell>
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton variant="text" width="80%" /></TableCell>
                                        <TableCell><Skeleton variant="text" width={40} /></TableCell>
                                        <TableCell><Skeleton variant="text" width="70%" /></TableCell>
                                        <TableCell><Skeleton variant="rounded" width={70} height={24} /></TableCell>
                                        {isPrimaryBranch && <TableCell><Skeleton variant="rounded" width={100} height={32} /></TableCell>}
                                    </TableRow>
                                ))
                            ) : paginatedCampaigns.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isPrimaryBranch ? 5 : 4} align="center" sx={{py: 8}}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                gap: 1.5,
                                            }}
                                        >
                                            <CampaignIcon sx={{fontSize: 56, color: "#cbd5e1"}}/>
                                            <Typography
                                                variant="h6"
                                                sx={{color: "#64748b", fontWeight: 600}}
                                            >
                                                Chưa có chiến dịch
                                            </Typography>
                                            <Typography variant="body2" sx={{color: "#94a3b8"}}>
                                                {filteredCampaigns.length === 0 && campaigns.length > 0
                                                    ? "Không có kết quả phù hợp với tìm kiếm hoặc bộ lọc."
                                                    : campaigns.length === 0 && isPastYearView
                                                        ? "Không có chiến dịch nào trong các năm trước."
                                                        : campaigns.length === 0 &&
                                                            isPrimaryBranch &&
                                                            !isPastYearView
                                                          ? campaignTab === CAMPAIGN_TAB_UPCOMING
                                                              ? "Chưa có chiến dịch sắp tới."
                                                              : "Chưa có chiến dịch cho năm đã chọn — nhấn «+ Tạo chiến dịch» để bắt đầu."
                                                          : "Chưa có kế hoạch tuyển sinh."}
                                            </Typography>
                                            {campaigns.length === 0 && isPrimaryBranch && !isPastYearView && (
                                                <Button
                                                    variant="contained"
                                                    startIcon={<AddIcon/>}
                                                    onClick={handleOpenCreate}
                                                    sx={{
                                                        mt: 1,
                                                        borderRadius: 2,
                                                        textTransform: "none",
                                                        fontWeight: 600,
                                                        background:
                                                            "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                                                    }}
                                                >
                                                    Tạo chiến dịch
                                                </Button>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedCampaigns.map((row) => {
                                    const statusStyle = getStatusColor(row.status);
                                    return (
                                        <TableRow
                                            key={row.id}
                                            hover
                                            onClick={() => handleOpenView(row)}
                                            sx={{
                                                cursor: "pointer",
                                                "&:hover": {
                                                    bgcolor: "rgba(122, 169, 235, 0.06)",
                                                },
                                            }}
                                        >
                                            <TableCell>
                                                <Typography sx={{fontWeight: 600, color: "#1e293b"}}>
                                                    {row.name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{color: "#64748b"}}>{row.year}</TableCell>
                                            <TableCell sx={{color: "#64748b", whiteSpace: "nowrap"}}>
                                                {formatDate(row.startDate)} — {formatDate(row.endDate)}
                                            </TableCell>
                                            <TableCell>
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        px: 1.5,
                                                        py: 0.5,
                                                        borderRadius: 999,
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        bgcolor: statusStyle.bg,
                                                        color: statusStyle.color,
                                                    }}
                                                >
                                                    {getStatusLabel(row.status)}
                                                </Box>
                                            </TableCell>
                                            {isPrimaryBranch && (
                                                <TableCell
                                                    align="right"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Stack
                                                        direction="row"
                                                        spacing={0.25}
                                                        justifyContent="flex-end"
                                                    >
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleOpenView(row)}
                                                            title="Xem chi tiết"
                                                            aria-label="Xem chi tiết"
                                                            sx={{
                                                                color: "#64748b",
                                                                "&:hover": {
                                                                    color: "#0D64DE",
                                                                    bgcolor: "rgba(13, 100, 222, 0.08)",
                                                                },
                                                            }}
                                                        >
                                                            <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                        {!isPastYearView && String(row.status || "").toUpperCase() === "DRAFT" && (
                                                            <>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleOpenEdit(row)}
                                                                    title="Chỉnh sửa"
                                                                    aria-label="Chỉnh sửa"
                                                                    sx={{
                                                                        color: "#64748b",
                                                                        "&:hover": { color: "#0D64DE", bgcolor: "rgba(13, 100, 222, 0.08)" },
                                                                    }}
                                                                >
                                                                    <EditIcon fontSize="small" />
                                                                </IconButton>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => openPublishConfirm(row)}
                                                                    title="Công bố"
                                                                    aria-label="Công bố"
                                                                    sx={{
                                                                        color: "#64748b",
                                                                        "&:hover": { color: "#0D64DE", bgcolor: "rgba(13, 100, 222, 0.08)" },
                                                                    }}
                                                                >
                                                                    <FileUploadOutlinedIcon fontSize="small" />
                                                                </IconButton>
                                                                <Tooltip
                                                                    title={cancelBlockedCampaigns[row.id] || ""}
                                                                    arrow
                                                                    disableHoverListener={!cancelBlockedCampaigns[row.id]}
                                                                >
                                                                    <span>
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => openCancelConfirm(row)}
                                                                            disabled={!!cancelBlockedCampaigns[row.id]}
                                                                            aria-label="Hủy chiến dịch"
                                                                            sx={{
                                                                                color: "#64748b",
                                                                                "&:hover": { color: "#dc2626", bgcolor: "rgba(220, 38, 38, 0.08)" },
                                                                            }}
                                                                        >
                                                                            <BlockIcon fontSize="small" />
                                                                        </IconButton>
                                                                    </span>
                                                                </Tooltip>
                                                            </>
                                                        )}
                                                        {!isPastYearView && String(row.status || "").toUpperCase() === "OPEN" && (
                                                            <>
                                                                <Tooltip
                                                                    title={cancelBlockedCampaigns[row.id] || ""}
                                                                    arrow
                                                                    disableHoverListener={!cancelBlockedCampaigns[row.id]}
                                                                >
                                                                    <span>
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => openCancelConfirm(row)}
                                                                            disabled={!!cancelBlockedCampaigns[row.id]}
                                                                            aria-label="Hủy chiến dịch"
                                                                            sx={{
                                                                                color: "#64748b",
                                                                                "&:hover": { color: "#dc2626", bgcolor: "rgba(220, 38, 38, 0.08)" },
                                                                            }}
                                                                        >
                                                                            <BlockIcon fontSize="small" />
                                                                        </IconButton>
                                                                    </span>
                                                                </Tooltip>
                                                                <Tooltip
                                                                    title={cloneDisabledMap[row.id] ? `Năm ${Number(row.year) + 1} đã có chiến dịch DRAFT/OPEN` : `Nhân bản → ${Number(row.year) + 1}`}
                                                                    arrow
                                                                >
                                                                    <span>
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => openCloneConfirm(row)}
                                                                            aria-label="Nhân bản chiến dịch"
                                                                            sx={{
                                                                                color: "#64748b",
                                                                                "&:hover": { color: "#0D64DE", bgcolor: "rgba(13, 100, 222, 0.08)" },
                                                                            }}
                                                                        >
                                                                            <ContentCopyIcon fontSize="small" />
                                                                        </IconButton>
                                                                    </span>
                                                                </Tooltip>
                                                            </>
                                                        )}
                                                        {!isPastYearView && String(row.status || "").toUpperCase() === "CANCELLED" && (
                                                            <Tooltip
                                                                title={cloneDisabledMap[row.id] ? `Năm ${Number(row.year) + 1} đã có chiến dịch DRAFT/OPEN` : `Nhân bản → ${Number(row.year) + 1}`}
                                                                arrow
                                                            >
                                                                <span>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => openCloneConfirm(row)}
                                                                        aria-label="Nhân bản chiến dịch"
                                                                        sx={{
                                                                            color: "#64748b",
                                                                            "&:hover": { color: "#0D64DE", bgcolor: "rgba(13, 100, 222, 0.08)" },
                                                                        }}
                                                                    >
                                                                        <ContentCopyIcon fontSize="small" />
                                                                    </IconButton>
                                                                </span>
                                                            </Tooltip>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {filteredCampaigns.length > 0 && (
                    <Box
                        sx={{
                            borderTop: "1px solid #e2e8f0",
                            bgcolor: "#f8fafc",
                            px: 3,
                            py: 1.5,
                            display: "flex",
                            justifyContent: "flex-end",
                        }}
                    >
                        <Pagination
                            count={Math.ceil(filteredCampaigns.length / rowsPerPage)}
                            page={page + 1}
                            onChange={(_, p) => setPage(p - 1)}
                            color="primary"
                            shape="rounded"
                        />
                    </Box>
                )}
            </Card>
            </Box>
            </Fade>

            {/* Create Campaign Modal */}
            <Dialog
                open={createModalOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    setCreateModalOpen(false);
                }}
                fullWidth
                maxWidth="lg"
                PaperProps={{sx: modalPaperSx}}
                slotProps={{backdrop: {sx: modalBackdropSx}}}
            >
                <Box sx={{px: 3, pt: 3, pb: 0}}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 2,
                        }}
                    >
                        <Box>
                            <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b"}}>
                                Tạo chiến dịch
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b", mt: 0.5}}>
                                Điền thông tin chiến dịch tuyển sinh mới.
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={() => setCreateModalOpen(false)}
                            size="small"
                            sx={{mt: -0.5, mr: -0.5}}
                            aria-label="Đóng"
                        >
                            <CloseIcon fontSize="small"/>
                        </IconButton>
                    </Box>
                </Box>
                <DialogContent dividers={false} sx={{px: 3, pt: 2, pb: 1}}>
                    <Stack spacing={2}>
                        <Card elevation={0} sx={sectionCardSx}>
                            <CardContent sx={{p: 2.25, pb: 2.5}}>
                                <Stack spacing={2}>
                                    <Box>
                                        <Typography variant="subtitle1" sx={{fontWeight: 900, color: "#1e293b"}}>
                                            Thông tin chính
                                        </Typography>
                                        <Typography variant="body2" sx={{color: "#64748b", mt: 0.4}}>
                                            Nhập tên, năm học và mô tả ngắn gọn cho chiến dịch.
                                        </Typography>
                                    </Box>
                                    <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                                        <TextField
                                            label="Tên chiến dịch"
                                            name="name"
                                            fullWidth
                                            value={formValues.name}
                                            onChange={handleChange}
                                            error={!!formErrors.name}
                                            helperText={formErrors.name}
                                            required
                                            sx={{"& .MuiOutlinedInput-root": {borderRadius: "12px"}}}
                                        />
                                        <TextField
                                            label="Năm học"
                                            name="year"
                                            type="number"
                                            fullWidth
                                            value={formValues.year}
                                            onChange={handleChange}
                                            error={!!formErrors.year}
                                            helperText={formErrors.year}
                                            required
                                            inputProps={{min: CURRENT_YEAR, max: CURRENT_YEAR + 30}}
                                            sx={{
                                                maxWidth: {sm: 170},
                                                "& .MuiOutlinedInput-root": {borderRadius: "12px"},
                                            }}
                                        />
                                    </Stack>
                                    <Box>
                                        <Typography
                                            component="label"
                                            variant="body2"
                                            sx={{display: "block", mb: 0.75, fontWeight: 700, color: "#64748b"}}
                                        >
                                            Mô tả
                                        </Typography>
                                        <CreatePostRichTextEditor
                                            key={createDescriptionFieldKey}
                                            initialHtml={campaignDescriptionToInitialHtml(formValues.description)}
                                            onChange={(html) =>
                                                setFormValues((prev) => ({...prev, description: html}))
                                            }
                                            disabled={submitLoading}
                                            minEditorHeight={160}
                                            maxEditorHeight={240}
                                        />
                                        {formErrors.description ? (
                                            <Typography variant="caption" sx={{mt: 0.75, display: "block", color: "error.main"}}>
                                                {formErrors.description}
                                            </Typography>
                                        ) : null}
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>

                        <Card elevation={0} sx={sectionCardSx}>
                            <CardContent sx={{p: 2.25}}>
                                <Stack spacing={2}>
                                    <Box>
                                        <Typography variant="subtitle1" sx={{fontWeight: 900, color: "#1e293b"}}>
                                            Thời gian chiến dịch
                                        </Typography>
                                        <Typography variant="body2" sx={{color: "#64748b", mt: 0.4}}>
                                            Chọn mốc mở và đóng của toàn chiến dịch.
                                        </Typography>
                                    </Box>
                                    <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                                        <TextField
                                            label="Ngày bắt đầu"
                                            name="startDate"
                                            type="date"
                                            fullWidth
                                            value={formValues.startDate}
                                            onChange={handleChange}
                                            error={!!formErrors.startDate}
                                            helperText={formErrors.startDate}
                                            InputLabelProps={{shrink: true}}
                                            required
                                            sx={{"& .MuiOutlinedInput-root": {borderRadius: "12px"}}}
                                        />
                                        <TextField
                                            label="Ngày kết thúc"
                                            name="endDate"
                                            type="date"
                                            fullWidth
                                            value={formValues.endDate}
                                            onChange={handleChange}
                                            error={!!formErrors.endDate}
                                            helperText={formErrors.endDate}
                                            InputLabelProps={{shrink: true}}
                                            required
                                            sx={{"& .MuiOutlinedInput-root": {borderRadius: "12px"}}}
                                        />
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>

                        <Card elevation={0} sx={sectionCardSx}>
                            <CardContent sx={{p: 2.25}}>
                                <Stack spacing={1.5}>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                                        <Box>
                                            <Typography variant="subtitle1" sx={{fontWeight: 900, color: "#1e293b"}}>
                                                Mốc theo phương thức tuyển sinh
                                            </Typography>
                                            <Typography variant="body2" sx={{color: "#64748b", mt: 0.4}}>
                                                Thiết lập từng phương thức, thời gian áp dụng và quota.
                                            </Typography>
                                        </Box>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<AddIcon />}
                                            onClick={addTimelineRow}
                                            sx={{textTransform: "none", fontWeight: 700, borderRadius: 2, whiteSpace: "nowrap"}}
                                        >
                                            Thêm phương thức
                                        </Button>
                                    </Stack>
                                    {formErrors.admissionMethodTimelines && typeof formErrors.admissionMethodTimelines === "string" ? (
                                        <Typography variant="caption" sx={{color: "#d32f2f", display: "block"}}>
                                            {formErrors.admissionMethodTimelines}
                                        </Typography>
                                    ) : null}
                                    <Stack spacing={1.2}>
                                        {(formValues.admissionMethodTimelines || []).map((row, idx) => {
                                    const rowErr = Array.isArray(formErrors.admissionMethodTimelines)
                                        ? formErrors.admissionMethodTimelines[idx] || {}
                                        : {};
                                    return (
                                        <Grow in={true} style={{ transformOrigin: "0 0 0" }} key={`timeline-${idx}`}>
                                            <Box
                                                ref={(el) => {
                                                    timelineItemRefs.current[idx] = el;
                                                }}
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
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => removeTimelineRow(idx)}
                                                        aria-label="Xóa phương thức"
                                                        title="Xóa"
                                                        sx={{
                                                            color: "#64748b",
                                                            "&:hover": {
                                                                color: "#dc2626",
                                                                bgcolor: "rgba(220, 38, 38, 0.08)",
                                                            },
                                                        }}
                                                    >
                                                        <CloseIcon fontSize="small" />
                                                    </IconButton>
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
                                                                >
                                                                    {admissionMethodOptions
                                                                        .filter((opt) => {
                                                                            const selectedCodes = (formValues.admissionMethodTimelines || [])
                                                                                .map((r, rIdx) =>
                                                                                    rIdx === idx ? "" : String(r?.methodCode ?? "").trim()
                                                                                )
                                                                                .filter(Boolean);
                                                                            return !selectedCodes.includes(opt.value);
                                                                        })
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
                                                                />
                                                                
                                                                <FormControlLabel
                                                                    sx={{ m: 0, flexShrink: 0 }}
                                                                    control={
                                                                        <Checkbox
                                                                            size="small"
                                                                            checked={!!row.allowReservationSubmission}
                                                                            onChange={(e) =>
                                                                                handleTimelineChange(idx, "allowReservationSubmission", e.target.checked)
                                                                            }
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
                                                            />
                                                        </Stack>
                                                    </CardContent>
                                                </Card>
                                            </Box>
                                        </Grow>
                                    );
                                        })}
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Stack>
                </DialogContent>
                
                <DialogActions sx={{px: 3, py: 2.5, borderTop: "1px solid #e2e8f0", gap: 1, display: "flex", alignItems: "center"}}>
                    {(() => {
                        const allocated = (Array.isArray(formValues.admissionMethodTimelines) ? formValues.admissionMethodTimelines : [])
                            .reduce((s, t) => s + (Number(t?.quota) || 0), 0);
                        const max = totalConfiguredQuota;
                        const pct = max > 0 ? Math.min((allocated / max) * 100, 100) : 0;
                        const color = max === 0 ? "#0D64DE" : allocated === max ? "#16a34a" : allocated < max ? "#d97706" : "#dc2626";
                        const textColor = max === 0 ? "#64748b" : allocated === max ? "#16a34a" : allocated < max ? "#d97706" : "#dc2626";
                        return (
                            <Box sx={{ flex: 1, mr: 1 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                                        Quota đã phân bổ
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: textColor }}>
                                        {allocated.toLocaleString("vi-VN")}{max > 0 ? ` / ${max.toLocaleString("vi-VN")}` : ""}
                                        {max > 0 && allocated < max ? ` — còn thiếu ${(max - allocated).toLocaleString("vi-VN")}` : ""}
                                        {max > 0 && allocated > max ? ` — vượt ${(allocated - max).toLocaleString("vi-VN")}` : ""}
                                    </Typography>
                                </Stack>
                                {max > 0 && (
                                    <Box sx={{ height: 6, borderRadius: 3, bgcolor: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
                                        <Box sx={{ height: "100%", width: `${pct}%`, bgcolor: color, borderRadius: 3, transition: "width .3s ease, background-color .3s ease" }} />
                                    </Box>
                                )}
                            </Box>
                        );
                    })()}
                    <Button
                        onClick={() => setCreateModalOpen(false)}
                        variant="text"
                        color="inherit"
                        sx={{textTransform: "none", fontWeight: 500}}
                    >
                        Hủy bỏ
                    </Button>
                    <Button
                        onClick={handleCreateSubmit}
                        variant="contained"
                        disabled={submitLoading}
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            px: 3,
                            bgcolor: "#0D64DE",
                        }}
                    >
                        {submitLoading ? "Đang tạo…" : "Lưu nháp"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={confirmPublishOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    if (!publishLoading) {
                        setConfirmPublishOpen(false);
                        setPublishTargetCampaign(null);
                    }
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
                    <Button
                        onClick={() => {
                            setConfirmPublishOpen(false);
                            setPublishTargetCampaign(null);
                        }}
                        disabled={publishLoading}
                        sx={{ textTransform: "none" }}
                    >
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

            {/* Clone confirm dialog */}
            <Dialog
                open={confirmCloneOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    if (!cloneLoading) { setConfirmCloneOpen(false); setCloneTargetCampaign(null); }
                }}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: "16px" } }}
            >
                <DialogContent sx={{ pt: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Nhân bản chiến dịch?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Chọn <ConfirmHighlight>năm học mục tiêu</ConfirmHighlight> trước khi nhân bản.
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
                        helperText={cloneYearError || `Mặc định: ${Number(cloneTargetCampaign?.year) + 1}`}
                        inputProps={{ min: 1, step: 1 }}
                        sx={{ mt: 2.5, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button
                        onClick={() => { setConfirmCloneOpen(false); setCloneTargetCampaign(null); setCloneTargetYear(""); setCloneYearError(""); }}
                        disabled={cloneLoading}
                        sx={{ textTransform: "none" }}
                    >
                        Đóng
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

            {/* Cancel confirm dialog */}
            <Dialog
                open={confirmCancelOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    if (!cancelLoading) resetCancelDialog();
                }}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: "16px" } }}
            >
                {cancelFlowPhase === "confirm" && (
                    <>
                        <DialogContent sx={{ pt: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                Hủy chiến dịch?
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
                                Bạn có chắc muốn hủy chiến dịch{" "}
                                <ConfirmHighlight>{cancelTargetCampaign?.name}</ConfirmHighlight>?
                            </Typography>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                            <Button onClick={resetCancelDialog} disabled={cancelLoading} sx={{ textTransform: "none", color: "#64748b" }}>
                                Đóng
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleCancelCampaign}
                                disabled={cancelLoading}
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 600,
                                    borderRadius: "12px",
                                    bgcolor: "#991b1b",
                                    "&:hover": { bgcolor: "#7f1d1d" },
                                }}
                            >
                                {cancelLoading ? "Đang xử lý…" : "Hủy chiến dịch"}
                            </Button>
                        </DialogActions>
                    </>
                )}
                {cancelFlowPhase === "reason" && (
                    <>
                        <DialogContent sx={{ pt: 3 }}>
                            <Stack spacing={1.5} alignItems="flex-start">
                                <WarningAmberIcon sx={{ fontSize: 44, color: "#d97706" }} />
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b" }}>
                                        Bạn đang hủy chiến dịch ĐANG MỞ
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.6 }}>
                                        Toàn bộ gói tuyển sinh sẽ bị đóng.{" "}
                                        <Box component="span" sx={{ fontWeight: 700, color: "#b91c1c" }}>
                                            Hành động này không thể hoàn tác.
                                        </Box>
                                    </Typography>
                                </Box>
                            </Stack>
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
                        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                            <Button onClick={resetCancelDialog} disabled={cancelLoading} sx={{ textTransform: "none", color: "#64748b" }}>
                                Đóng
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleCancelCampaign}
                                disabled={cancelLoading || !cancelReason.trim()}
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 600,
                                    borderRadius: "12px",
                                    bgcolor: "#991b1b",
                                    "&:hover": { bgcolor: "#7f1d1d" },
                                    "&.Mui-disabled": { bgcolor: "rgba(153, 27, 27, 0.35)" },
                                }}
                            >
                                {cancelLoading ? "Đang xử lý…" : "Xác nhận hủy"}
                            </Button>
                        </DialogActions>
                    </>
                )}
                {cancelFlowPhase === "blocked" && (
                    <>
                        <DialogContent sx={{ pt: 3 }}>
                            <Stack spacing={1.5} alignItems="flex-start">
                                <WarningAmberIcon sx={{ fontSize: 44, color: "#d97706" }} />
                                <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b" }}>
                                    Không thể hủy chiến dịch
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                                    {cancelBlockedMessage}
                                </Typography>
                            </Stack>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2.5 }}>
                            <Button onClick={resetCancelDialog} variant="outlined" sx={{ textTransform: "none", borderColor: "#cbd5e1", color: "#64748b" }}>
                                Đóng
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
}
