import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    alpha,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    IconButton,
    InputAdornment,
    Link,
    MenuItem,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Popover,
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
import debounce from "debounce";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import AddIcon from "@mui/icons-material/Add";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
    confirmSystemConfigImport,
    getSystemConfig,
    importSystemConfigPreview,
    updateSystemConfig,
    validateSystemConfigSingleRow,
    validateSystemConfigRows,
} from "../../../services/SystemConfigService.jsx";
import { autoFillAdminSchoolQuotas } from "../../../services/AdminService.jsx";
import { getPublicSchoolList } from "../../../services/SchoolPublicService.jsx";
import { enqueueSnackbar } from "notistack";
import { adminSttChipSx } from "../../../constants/adminTableStyles.js";
import { sanitizeAdmissionSettingsForApi } from "../../../utils/admissionSettingsShared.js";
function getAdmissionQuotaMap(cfg) {
    if (!cfg || typeof cfg !== "object") return {};
    const raw = cfg.admissionQuota;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

    if (raw.source || Array.isArray(raw.quotas)) {
        const year = String(raw?.source?.year ?? "").trim();
        const key = year || "current";
        return { [key]: raw };
    }

    return raw;
}

function asConfigRecord(raw) {
    if (raw == null) return {};
    if (typeof raw === "string") {
        const t = raw.trim();
        if (!t) return {};
        try {
            const parsed = JSON.parse(t);
            return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
        } catch {
            return {};
        }
    }
    if (typeof raw === "object" && !Array.isArray(raw)) return raw;
    return {};
}

function getBusinessConfig(cfg) {
    if (!cfg || typeof cfg !== "object") return {};
    const businessData = asConfigRecord(cfg.businessData);
    const business = asConfigRecord(cfg.business);

    const businessPricingFromData = asConfigRecord(businessData.subscriptionPricing);
    const businessPricingFromBusiness = asConfigRecord(business.subscriptionPricing);

    const mergedSubscriptionPricing = {
        ...businessPricingFromBusiness,
        ...businessPricingFromData,
        basePrices: {
            ...(businessPricingFromBusiness.basePrices ?? {}),
            ...(businessPricingFromData.basePrices ?? {}),
        },
        packageQuotas: {
            ...(businessPricingFromBusiness.packageQuotas ?? {}),
            ...(businessPricingFromData.packageQuotas ?? {}),
        },
        featureUnitPrices: {
            ...(businessPricingFromBusiness.featureUnitPrices ?? {}),
            ...(businessPricingFromData.featureUnitPrices ?? {}),
        },
        trialRatioCap:
            businessPricingFromData.trialRatioCap ??
            businessPricingFromBusiness.trialRatioCap ??
            businessData.trialRatioCap ??
            business.trialRatioCap,
    };

    return {
        ...business,
        ...businessData,
        subscriptionPricing: mergedSubscriptionPricing,
    };
}

const TRIAL_RATIO_CAP_INFO_TOOLTIP = "Tỉ lệ này xác định quy mô của gói Dùng thử so với gói Tiêu chuẩn. Giúp tự động cân đối hạn mức vận hành (tư vấn viên, bài đăng) để bảo vệ quyền lợi của các gói trả phí.";

const TRIAL_RATIO_CAP_INPUT_HINT = "15%: ít tính năng • 30%: vừa đủ • 40%: nhiều tính năng";

function trialRatioCapDecimalToFormPctString(cap) {
    if (cap == null || cap === "") return "";
    const n = Number(cap);
    if (!Number.isFinite(n)) return String(cap).trim();
    const pct = n * 100;
    const rounded = Math.round(pct * 100) / 100;
    if (Number.isInteger(rounded)) return String(Math.trunc(rounded));
    return String(rounded);
}

function formPctStringToTrialRatioCapDecimal(pctStr) {
    const raw = Number(String(pctStr ?? "").trim());
    if (!Number.isFinite(raw)) return NaN;
    return Math.round((raw / 100) * 10000) / 10000;
}

function getMediaConfig(cfg) {
    if (!cfg || typeof cfg !== "object") return {};
    return cfg.mediaData ?? cfg.media ?? {};
}

function apiErrorMessage(e, fallback) {
    const d = e?.response?.data;
    const m = d?.message ?? d?.body?.message ?? d?.error ?? e?.message;
    const s = m != null ? String(m).trim() : "";
    return s || fallback;
}

function assertSystemConfigUpdateSuccess(response, fallbackMessage = "Cập nhật thất bại. Vui lòng thử lại.") {
    const status = Number(response?.status);
    if (!Number.isFinite(status) || status < 200 || status >= 300) {
        throw new Error(fallbackMessage);
    }
    const messageRaw = response?.data?.message ?? response?.data?.body?.message ?? "";
    const message = String(messageRaw ?? "").trim();
    if (message && !/thành công/i.test(message)) {
        throw new Error(message);
    }
}

function extractBusinessConfigSaveSideEffects(response) {
    const root = response?.data;
    const body = root?.body ?? root?.data ?? (root && typeof root === "object" ? root : {});
    if (!body || typeof body !== "object" || Array.isArray(body)) return { bulletLines: [] };

    const bullets = [];
    const pending =
        body.packageInactivePendingCount ??
        body.inactivePendingCount ??
        (Array.isArray(body.packagesInactivePending) ? body.packagesInactivePending.length : undefined);
    const deactivated =
        body.packageDeactivatedCount ??
        body.deactivatedCount ??
        (Array.isArray(body.packagesDeactivated) ? body.packagesDeactivated.length : undefined);

    if (pending != null && Number.isFinite(Number(pending))) {
        bullets.push(
            `Đã xử lý gói có giá thay đổi và đang có người dùng → PACKAGE_INACTIVE_PENDING: ${Number(pending)} gói (không bán mới / gia hạn; người đang dùng đến hết hạn).`
        );
    }
    if (deactivated != null && Number.isFinite(Number(deactivated))) {
        bullets.push(
            `Đã vô hiệu hóa gói có giá thay đổi và chưa ai dùng → PACKAGE_DEACTIVATED: ${Number(deactivated)} gói.`
        );
    }

    const pkgs = body.affectedPackages ?? body.packagesWithPriceChange ?? body.packageImpacts;
    if (Array.isArray(pkgs) && pkgs.length > 0) {
        const labels = pkgs
            .map((p) => String(p?.name ?? p?.packageName ?? p?.title ?? p?.id ?? "").trim())
            .filter(Boolean)
            .slice(0, 8);
        if (labels.length > 0) {
            bullets.push(`Gói bị tính lại giá (ví dụ): ${labels.join(", ")}${pkgs.length > labels.length ? ", …" : ""}.`);
        }
    }

    const notice = body.postSaveNotice ?? body.workflowMessage ?? body.detail;
    if (typeof notice === "string" && notice.trim()) bullets.push(notice.trim());

    return { bulletLines: bullets };
}

const IMPORT_TYPE_LABEL = {
    ALLOWED_METHODS: "Phương thức xét tuyển",
    ADMISSION_PROCESSES: "Quy trình tuyển sinh",
    METHOD_DOCUMENTS: "Hồ sơ theo phương thức",
};

const IMPORT_TYPE_OPTIONS = Object.keys(IMPORT_TYPE_LABEL);

const ADMISSION_IMPORT_COLUMN_LABEL = {
    index: "STT",
    code: "Mã",
    displayName: "Tên hiển thị",
    display_name: "Tên hiển thị",
    description: "Mô tả",
    methodCode: "Mã phương thức",
    method_code: "Mã phương thức",
    stepName: "Tên bước",
    step_name: "Tên bước",
    stepOrder: "Thứ tự bước",
    step_order: "Thứ tự bước",
    name: "Tên",
    required: "Bắt buộc",
    isRequired: "Bắt buộc",
    is_required: "Bắt buộc",
    documentCode: "Mã hồ sơ",
    document_code: "Mã hồ sơ",
    documentName: "Tên hồ sơ",
    document_name: "Tên hồ sơ",
    stepCode: "Mã bước",
    step_code: "Mã bước",
    processName: "Tên quy trình",
    process_name: "Tên quy trình",
    processCode: "Mã quy trình",
    process_code: "Mã quy trình",
    order: "Thứ tự",
    sortOrder: "Thứ tự sắp xếp",
    sort_order: "Thứ tự sắp xếp",
    title: "Tiêu đề",
    notes: "Ghi chú",
    note: "Ghi chú",
    remark: "Ghi chú",
    category: "Danh mục",
    type: "Loại",
    url: "Liên kết",
    link: "Liên kết",
    fileType: "Định dạng tệp",
    file_type: "Định dạng tệp",
    fileTypes: "Định dạng tệp",
    instruction: "Hướng dẫn",
    instructions: "Hướng dẫn",
    minFileSize: "Dung lượng tối thiểu",
    maxFileSize: "Dung lượng tối đa",
    methodDocumentCode: "Mã hồ sơ theo phương thức",
    method_document_code: "Mã hồ sơ theo phương thức",
    documentType: "Loại hồ sơ",
    document_type: "Loại hồ sơ",
    optional: "Tùy chọn",
    active: "Kích hoạt",
    enabled: "Bật",
    disabled: "Tắt",
};

function getAdmissionImportColumnLabel(columnKey) {
    const key = String(columnKey ?? "").trim();
    if (!key) return "—";
    if (ADMISSION_IMPORT_COLUMN_LABEL[key]) return ADMISSION_IMPORT_COLUMN_LABEL[key];
    const lower = key.toLowerCase();
    if (ADMISSION_IMPORT_COLUMN_LABEL[lower]) return ADMISSION_IMPORT_COLUMN_LABEL[lower];
    const snake = key
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
        .toLowerCase();
    if (ADMISSION_IMPORT_COLUMN_LABEL[snake]) return ADMISSION_IMPORT_COLUMN_LABEL[snake];
    return key;
}

const normalizeImportErrorText = (error) => {
    if (!error) return "";
    if (typeof error === "string") return error.trim();
    if (Array.isArray(error?.fields)) {
        return error.fields
            .map((field) => String(field?.message ?? "").trim())
            .filter(Boolean)
            .join("; ");
    }
    if (Array.isArray(error)) return error.map((item) => normalizeImportErrorText(item)).filter(Boolean).join("; ");
    if (typeof error === "object") {
        const values = Object.values(error).map((item) => normalizeImportErrorText(item)).filter(Boolean);
        return values.join("; ");
    }
    return String(error).trim();
};

const normalizeImportRow = (item) => {
    const rowData = item?.rowData && typeof item.rowData === "object" ? { ...item.rowData } : {};
    const errorText = normalizeImportErrorText(item?.error);
    return {
        rowData,
        error: item?.error ?? null,
        errorText,
        isError: Boolean(item?.isError || errorText),
    };
};

export default function AdminPlatformSettings() {
    const tabs = useMemo(
        () => [
            { label: "Cài đặt Doanh nghiệp", key: "business" },
            { label: "Cấu hình tuyển sinh", key: "admission" },
            { label: "Cài đặt Phương tiện", key: "media" },
            { label: "Cài đặt Hạn mức Tuyển sinh", key: "limits" },
        ],
        []
    );

    const [activeTab, setActiveTab] = useState(0);
    const activeTabKey = tabs[activeTab]?.key;

    const [configBody, setConfigBody] = useState(null);
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState({ type: "", message: "", workflowNote: "" });

    const getBusinessInitialForm = (cfg) => {
        const business = getBusinessConfig(cfg);
        const subscriptionPricing = business.subscriptionPricing ?? {};
        const basePrices = subscriptionPricing.basePrices ?? {};
        const featureUnitPrices = subscriptionPricing.featureUnitPrices ?? {};
        const packageQuotas = subscriptionPricing.packageQuotas ?? {};
        const minPay = business.minPay ?? "";
        const maxPay = business.maxPay ?? "";
        const taxRatePct = Number(business.taxRate ?? 0) * 100;
        const serviceRatePct = Number(business.serviceRate ?? 0) * 100;
        return {
            minPay: minPay === "" ? "" : String(minPay),
            maxPay: maxPay === "" ? "" : String(maxPay),
            taxRatePct: String(Math.round(taxRatePct * 100) / 100),
            serviceRatePct: String(Math.round(serviceRatePct * 100) / 100),
            baseTrialPrice: basePrices.trial == null ? "" : String(basePrices.trial),
            baseStandardPrice: basePrices.standard == null ? "" : String(basePrices.standard),
            baseEnterprisePrice: basePrices.enterprise == null ? "" : String(basePrices.enterprise),
            aiChatbotMonthlyFee: featureUnitPrices.aiChatbotMonthlyFee == null ? "" : String(featureUnitPrices.aiChatbotMonthlyFee),
            premiumSupportFee: featureUnitPrices.premiumSupportFee == null ? "" : String(featureUnitPrices.premiumSupportFee),
            durationDays: packageQuotas.durationDays == null ? "" : String(packageQuotas.durationDays),
            trialCounsellor: packageQuotas.trialCounsellor == null ? "" : String(packageQuotas.trialCounsellor),
            standardCounsellor: packageQuotas.standardCounsellor == null ? "" : String(packageQuotas.standardCounsellor),
            enterpriseCounsellor: packageQuotas.enterpriseCounsellor == null ? "" : String(packageQuotas.enterpriseCounsellor),
            trialPostLimit: packageQuotas.trialPostLimit == null ? "" : String(packageQuotas.trialPostLimit),
            standardPostLimit: packageQuotas.standardPostLimit == null ? "" : String(packageQuotas.standardPostLimit),
            enterprisePostLimit: packageQuotas.enterprisePostLimit == null ? "" : String(packageQuotas.enterprisePostLimit),
            trialRatioCapPct: trialRatioCapDecimalToFormPctString(subscriptionPricing.trialRatioCap),
        };
    };

    const [businessForm, setBusinessForm] = useState({
        minPay: "",
        maxPay: "",
        taxRatePct: "0",
        serviceRatePct: "0",
        baseTrialPrice: "",
        baseStandardPrice: "",
        baseEnterprisePrice: "",
        aiChatbotMonthlyFee: "",
        premiumSupportFee: "",
        durationDays: "",
        trialCounsellor: "",
        standardCounsellor: "",
        enterpriseCounsellor: "",
        trialPostLimit: "",
        standardPostLimit: "",
        enterprisePostLimit: "",
        trialRatioCapPct: "",
    });
    const [businessErrors, setBusinessErrors] = useState({});
    const [businessPricingTab, setBusinessPricingTab] = useState(0);
    const [businessPricingSubTab, setBusinessPricingSubTab] = useState(0);

    const [businessEditing, setBusinessEditing] = useState(false);
    const [trialRatioCapInfoAnchor, setTrialRatioCapInfoAnchor] = useState(null);

    const [mediaEditing, setMediaEditing] = useState(false);
    const [quotaEditing, setQuotaEditing] = useState(false);

    const [selectedQuotaYear, setSelectedQuotaYear] = useState("");
    const [schoolOptions, setSchoolOptions] = useState([]);
    const [loadingSchools, setLoadingSchools] = useState(false);
    const quotaRowIdRef = useRef(0);
    const createQuotaEntry = ({ schoolId = "", value = "" } = {}) => {
        const sid = schoolId === "" ? "" : Number(schoolId);
        const matched = schoolOptions.find((s) => Number(s.schoolId) === sid);
        return {
            id: `quota_row_${quotaRowIdRef.current++}`,
            schoolId: schoolId === "" ? "" : String(sid),
            schoolName: matched?.schoolName ?? "",
            value: value === "" || value == null ? "" : String(value),
        };
    };
    const [quotaForm, setQuotaForm] = useState({
        year: "",
        sourceName: "",
        sourceType: "NEWS_ARTICLE",
        sourceUrl: "",
        quotas: [createQuotaEntry()],
    });
    const [quotaErrors, setQuotaErrors] = useState({});
    const [quotaMode, setQuotaMode] = useState("edit");
    const [autoFillingQuota, setAutoFillingQuota] = useState(false);

    const [admissionTemplateForm, setAdmissionTemplateForm] = useState({
        allowedMethods: [],
        methodAdmissionProcess: [],
        methodDocumentRequirements: [],
    });
    const [importType, setImportType] = useState("ALLOWED_METHODS");
    const [admissionImportRows, setAdmissionImportRows] = useState([]);
    const [confirmingAdmissionImport, setConfirmingAdmissionImport] = useState(false);
    const [admissionImportConfirmOpen, setAdmissionImportConfirmOpen] = useState(false);
    const [admissionImportPreviewOpen, setAdmissionImportPreviewOpen] = useState(false);
    const [validatingImportRow, setValidatingImportRow] = useState(false);
    const [admissionTemplateEditing, setAdmissionTemplateEditing] = useState(false);
    const [admissionImportPreview, setAdmissionImportPreview] = useState(null);
    const [importingAdmissionTemplate, setImportingAdmissionTemplate] = useState(false);
    const admissionImportInputRef = useRef(null);
    const rowValidationVersionRef = useRef({});
    const validateRowDebouncedRef = useRef(null);

    const [mediaFormatsTab, setMediaFormatsTab] = useState(0);
    const [imgFormatsDraft, setImgFormatsDraft] = useState([]);
    const [docFormatsDraft, setDocFormatsDraft] = useState([]);

    const [mediaLimitsForm, setMediaLimitsForm] = useState({
        maxImgSize: "",
        maxDocSize: "",
    });
    const [mediaLimitsErrors, setMediaLimitsErrors] = useState({});

    const [formatDialogOpen, setFormatDialogOpen] = useState(false);
    const [formatDialogMode, setFormatDialogMode] = useState("add");
    const [formatDialogType, setFormatDialogType] = useState("image");
    const [formatDialogIndex, setFormatDialogIndex] = useState(-1);
    const [formatDialogValue, setFormatDialogValue] = useState("");
    const [formatDialogError, setFormatDialogError] = useState("");

    const actionButtonSx = {
        textTransform: "none",
        fontWeight: 700,
        borderRadius: 2,
        px: 2.5,
        py: 0.9,
    };
    const cancelButtonSx = {
        ...actionButtonSx,
        borderColor: "#93c5fd",
        color: "#2563eb",
        bgcolor: "#ffffff",
        "&:hover": {
            borderColor: "#60a5fa",
            bgcolor: "#eff6ff",
        },
    };
    const saveButtonSx = {
        ...actionButtonSx,
        bgcolor: "#2563eb",
        color: "#ffffff",
        boxShadow: "0 8px 18px rgba(37,99,235,0.28)",
        "&:hover": { bgcolor: "#1d4ed8", boxShadow: "0 10px 22px rgba(29,78,216,0.32)" },
    };
    const settingsFieldCardSx = {
        border: "1px solid #dbeafe",
        borderRadius: 2.5,
        p: 1.5,
        bgcolor: "#ffffff",
        backgroundImage: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
        boxShadow: "0 6px 16px rgba(37, 99, 235, 0.08)",
        transition: "all 0.2s ease",
        height: "100%",
        boxSizing: "border-box",
        "&:hover": {
            borderColor: "#93c5fd",
            boxShadow: "0 10px 24px rgba(37, 99, 235, 0.14)",
            transform: "translateY(-1px)",
        },
    };
    const settingsFieldLabelSx = { fontSize: 12, fontWeight: 500, color: "#1d4ed8", mb: 0.75 };
    const settingsInputSx = {
        "& .MuiOutlinedInput-root": {
            borderRadius: 2,
            bgcolor: "#ffffff",
            transition: "all 0.2s ease",
            "& fieldset": { borderColor: "#bfdbfe" },
            "&:hover fieldset": { borderColor: "#60a5fa" },
            "&.Mui-focused fieldset": { borderColor: "#2563eb", borderWidth: "1px" },
            "&.Mui-focused": {
                boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.18)",
            },
        },
        "& .MuiFormHelperText-root": {
            marginLeft: 0,
        },
    };

    const parseFinite = (v) => {
        if (v === "" || v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    };

    const normalizeFormatString = (raw) => {
        const v = String(raw ?? "").trim().toLowerCase();
        if (!v) return "";
        return v;
    };

    const getFormatListFromMedia = (media, keys = []) => {
        const source = keys.find((key) => Array.isArray(media?.[key]));
        if (!source) return [];
        return media[source]
            .map((item) => {
                if (typeof item === "string") return item;
                return item?.format;
            })
            .map((value) => String(value ?? "").trim())
            .filter(Boolean);
    };

    const sanitizeMoneyInput = (raw) => {
        const digits = String(raw ?? "").replace(/[^\d]/g, "");
        return digits;
    };

    const formatMoneyVN = (rawDigits) => {
        if (rawDigits === "" || rawDigits === null || rawDigits === undefined) return "";
        const n = Number(rawDigits);
        if (!Number.isFinite(n)) return "";
        return new Intl.NumberFormat("vi-VN").format(n);
    };

    const openAddFormatDialog = (type) => {
        setFormatDialogType(type);
        setFormatDialogMode("add");
        setFormatDialogIndex(-1);
        setFormatDialogValue("");
        setFormatDialogError("");
        setFormatDialogOpen(true);
    };

    const openEditFormatDialog = (type, index, currentValue) => {
        setFormatDialogType(type);
        setFormatDialogMode("edit");
        setFormatDialogIndex(index);
        setFormatDialogValue(currentValue ?? "");
        setFormatDialogError("");
        setFormatDialogOpen(true);
    };

    const validateBusiness = (form) => {
        const errors = {};
        const getMoney = (field, label) => {
            const value = parseFinite(form[field]);
            if (value === null) {
                errors[field] = `Vui lòng nhập ${label}.`;
                return null;
            }
            if (value < 0) {
                errors[field] = `${label} không được âm.`;
                return null;
            }
            return value;
        };
        const getPositiveInt = (field, label, { allowNegativeOne = false } = {}) => {
            const raw = String(form[field] ?? "").trim();
            if (!raw) {
                errors[field] = `Vui lòng nhập ${label}.`;
                return null;
            }
            const num = Number(raw);
            if (!Number.isInteger(num)) {
                errors[field] = `${label} phải là số nguyên.`;
                return null;
            }
            if (allowNegativeOne && num === -1) return num;
            if (num < 0) {
                errors[field] = `${label} không được âm.`;
                return null;
            }
            return num;
        };

        const minPay = parseFinite(form.minPay);
        const maxPay = parseFinite(form.maxPay);
        const taxRatePct = parseFinite(form.taxRatePct);
        const serviceRatePct = parseFinite(form.serviceRatePct);

        if (minPay === null) errors.minPay = "Vui lòng nhập Số tiền giao dịch tối thiểu.";
        if (maxPay === null) errors.maxPay = "Vui lòng nhập Số tiền giao dịch tối đa.";
        if (minPay !== null && minPay < 0) errors.minPay = "Số tiền giao dịch tối thiểu không được âm.";
        if (maxPay !== null && maxPay < 0) errors.maxPay = "Số tiền giao dịch tối đa không được âm.";
        if (minPay !== null && maxPay !== null && maxPay < minPay)
            errors.maxPay = "Số tiền giao dịch tối đa phải >= số tiền giao dịch tối thiểu.";

        if (taxRatePct === null) errors.taxRatePct = "Vui lòng nhập Thuế suất.";
        if (serviceRatePct === null) errors.serviceRatePct = "Vui lòng nhập Phí dịch vụ.";

        if (taxRatePct !== null && (taxRatePct < 0 || taxRatePct > 100)) errors.taxRatePct = "Thuế suất phải trong [0..100].";
        if (serviceRatePct !== null && (serviceRatePct < 0 || serviceRatePct > 100))
            errors.serviceRatePct = "Phí dịch vụ phải trong [0..100].";

        getMoney("baseTrialPrice", "Giá nền gói Dùng thử");
        getMoney("baseStandardPrice", "Giá nền gói Tiêu chuẩn");
        getMoney("baseEnterprisePrice", "Giá nền gói Doanh nghiệp");
        getMoney("aiChatbotMonthlyFee", "Phí duy trì Trợ lý AI");
        getMoney("premiumSupportFee", "Phí hỗ trợ cao cấp");
        getPositiveInt("durationDays", "Thời hạn gói dùng thử");
        getPositiveInt("trialCounsellor", "Số tư vấn viên gói Dùng thử");
        getPositiveInt("standardCounsellor", "Số tư vấn viên gói Tiêu chuẩn");
        getPositiveInt("enterpriseCounsellor", "Số tư vấn viên gói Doanh nghiệp");
        getPositiveInt("trialPostLimit", "Giới hạn bài đăng gói Dùng thử");
        getPositiveInt("standardPostLimit", "Giới hạn bài đăng gói Tiêu chuẩn");
        getPositiveInt("enterprisePostLimit", "Giới hạn bài đăng gói Doanh nghiệp");

        const capStr = String(form.trialRatioCapPct ?? "").trim();
        let capPctNum = NaN;
        if (!capStr) {
            errors.trialRatioCapPct = "Vui lòng nhập Giới hạn tỉ lệ gói Dùng thử (%).";
        } else {
            capPctNum = Number(capStr);
            if (!Number.isFinite(capPctNum)) {
                errors.trialRatioCapPct = "Giá trị phải là số (ví dụ 30 tương đương 30%).";
            } else if (capPctNum <= 0 || capPctNum >= 100) {
                errors.trialRatioCapPct =
                    "Tỉ lệ trần phải lớn hơn 0% và nhỏ hơn 100% (tỷ lệ thập phân trên máy chủ: 0 < … < 1).";
            }
        }

        const trialC = Number(String(form.trialCounsellor ?? "").trim());
        const standardC = Number(String(form.standardCounsellor ?? "").trim());
        const enterpriseC = Number(String(form.enterpriseCounsellor ?? "").trim());
        if (
            !errors.trialCounsellor &&
            !errors.standardCounsellor &&
            !errors.enterpriseCounsellor &&
            Number.isInteger(trialC) &&
            Number.isInteger(standardC) &&
            Number.isInteger(enterpriseC)
        ) {
            if (!(trialC < standardC && standardC < enterpriseC)) {
                errors.standardCounsellor =
                    "Số tư vấn viên phải tăng nghiêm ngặt theo gói: Dùng thử < Tiêu chuẩn < Doanh nghiệp.";
            }
        }

        const trialP = Number(String(form.trialPostLimit ?? "").trim());
        const standardP = Number(String(form.standardPostLimit ?? "").trim());
        const enterpriseP = Number(String(form.enterprisePostLimit ?? "").trim());
        if (!errors.trialPostLimit && !errors.standardPostLimit && !errors.enterprisePostLimit) {
            if (Number.isInteger(trialP) && Number.isInteger(standardP) && Number.isInteger(enterpriseP)) {
                if (!(trialP < standardP && standardP < enterpriseP)) {
                    errors.standardPostLimit =
                        "Giới hạn bài đăng phải tăng nghiêm ngặt theo gói: Dùng thử < Tiêu chuẩn < Doanh nghiệp.";
                }
            }
        }

        const capDecimal = Number.isFinite(capPctNum) ? capPctNum / 100 : NaN;
        if (
            !errors.trialCounsellor &&
            !errors.standardCounsellor &&
            !errors.trialRatioCapPct &&
            Number.isFinite(capDecimal) &&
            capDecimal > 0 &&
            capDecimal < 1 &&
            Number.isInteger(trialC) &&
            Number.isInteger(standardC) &&
            trialC >= 0 &&
            standardC >= 0
        ) {
            const maxTrialByCap = Math.floor(standardC * capDecimal);
            if (trialC > maxTrialByCap) {
                errors.trialCounsellor = `Theo giới hạn tỉ lệ (${capPctNum}%), gói Dùng thử không được quá ${maxTrialByCap} tư vấn viên (≤ ⌊${standardC} × ${capDecimal}⌋ so với gói Tiêu chuẩn).`;
            }
        }

        return errors;
    };

    const getAdmissionInitialForm = (cfg) => {
        const adm = cfg?.admissionSettingsData;
        if (!adm || typeof adm !== "object") {
            return { allowedMethods: [], methodAdmissionProcess: [], methodDocumentRequirements: [] };
        }
        const processSource = Array.isArray(adm.methodAdmissionProcess)
            ? adm.methodAdmissionProcess
            : Array.isArray(adm.admissionProcesses)
              ? adm.admissionProcesses
              : [];
        const methodDocsSource = Array.isArray(adm.methodDocumentRequirements)
            ? adm.methodDocumentRequirements
            : Array.isArray(adm?.documentRequirementsData?.byMethod)
              ? adm.documentRequirementsData.byMethod
              : Array.isArray(adm.byMethod)
                ? adm.byMethod
                : [];
        const normalizedProcessSource = processSource.some((group) => Array.isArray(group?.steps))
            ? processSource
            : (() => {
                  const grouped = {};
                  processSource.forEach((row) => {
                      const methodCode = String(row?.methodCode ?? "").trim();
                      if (!methodCode) return;
                      if (!Array.isArray(grouped[methodCode])) grouped[methodCode] = [];
                      grouped[methodCode].push({
                          stepOrder:
                              row?.stepOrder != null && !Number.isNaN(Number(row.stepOrder))
                                  ? Number(row.stepOrder)
                                  : grouped[methodCode].length + 1,
                          stepName: row?.stepName != null ? String(row.stepName) : "",
                          description: row?.description != null ? String(row.description) : "",
                      });
                  });
                  return Object.entries(grouped).map(([methodCode, steps]) => ({
                      methodCode,
                      steps: [...steps].sort((a, b) => Number(a?.stepOrder || 0) - Number(b?.stepOrder || 0)),
                  }));
              })();
        const normalizedMethodDocsSource = methodDocsSource.some((group) => Array.isArray(group?.documents))
            ? methodDocsSource
            : (() => {
                  const grouped = {};
                  methodDocsSource.forEach((row) => {
                      const methodCode = String(row?.methodCode ?? "").trim();
                      if (!methodCode) return;
                      if (!Array.isArray(grouped[methodCode])) grouped[methodCode] = [];
                      grouped[methodCode].push({
                          code: row?.code != null ? String(row.code) : "",
                          name: row?.name != null ? String(row.name) : "",
                          required: row?.required === true,
                      });
                  });
                  return Object.entries(grouped).map(([methodCode, documents]) => ({
                      methodCode,
                      documents,
                  }));
              })();
        return {
            allowedMethods: Array.isArray(adm.allowedMethods)
                ? adm.allowedMethods.map((m) => ({
                      code: m?.code != null ? String(m.code) : "",
                      displayName: m?.displayName != null ? String(m.displayName) : "",
                      description: m?.description != null ? String(m.description) : "",
                  }))
                : [],
            methodAdmissionProcess: normalizedProcessSource.map((group) => ({
                      methodCode: group?.methodCode != null ? String(group.methodCode) : "",
                      steps: Array.isArray(group?.steps)
                          ? group.steps.map((step, idx) => ({
                                stepOrder:
                                    step?.stepOrder != null && !Number.isNaN(Number(step.stepOrder))
                                        ? Number(step.stepOrder)
                                        : idx + 1,
                                stepName: step?.stepName != null ? String(step.stepName) : "",
                                description: step?.description != null ? String(step.description) : "",
                            }))
                          : [],
                  })),
            methodDocumentRequirements: normalizedMethodDocsSource.map((group) => ({
                      methodCode: group?.methodCode != null ? String(group.methodCode) : "",
                      documents: Array.isArray(group?.documents)
                          ? group.documents.map((doc) => ({
                                code: doc?.code != null ? String(doc.code) : "",
                                name: doc?.name != null ? String(doc.name) : "",
                                required: doc?.required === true,
                            }))
                          : [],
                  })),
        };
    };

    const fetchConfig = async () => {
        setLoadingConfig(true);
        try {
            const res = await getSystemConfig();
            const body = res?.data?.body ?? res?.data?.data ?? res?.data;
            setConfigBody(body);
            setStatus({ type: "", message: "", workflowNote: "" });
        } catch (e) {
            console.error("Failed to fetch system config", e);
            enqueueSnackbar("Không thể tải cấu hình nền tảng.", { variant: "error" });
            setConfigBody(null);
        } finally {
            setLoadingConfig(false);
        }
    };

    useEffect(() => {
        void fetchConfig();
    }, []);

    useEffect(() => {
        const fetchSchools = async () => {
            setLoadingSchools(true);
            try {
                const schools = await getPublicSchoolList();
                const normalized = (Array.isArray(schools) ? schools : [])
                    .map((item) => ({
                        schoolId: Number(item?.id ?? item?.schoolId),
                        schoolName: String(item?.name ?? item?.schoolName ?? "").trim(),
                    }))
                    .filter((item) => Number.isFinite(item.schoolId) && item.schoolName);
                setSchoolOptions(normalized);
                setQuotaForm((prev) => {
                    const existingBySchoolId = new Map(
                        (Array.isArray(prev?.quotas) ? prev.quotas : [])
                            .map((row) => [Number(row?.schoolId), String(row?.value ?? "")])
                            .filter(([sid]) => Number.isFinite(sid))
                    );
                    const nextRows = normalized.map((school) =>
                        createQuotaEntry({
                            schoolId: school.schoolId,
                            value: existingBySchoolId.get(Number(school.schoolId)) ?? "",
                        })
                    );
                    return { ...prev, quotas: nextRows };
                });
            } catch (e) {
                console.error("Failed to fetch schools for quota form", e);
                setSchoolOptions([]);
            } finally {
                setLoadingSchools(false);
            }
        };
        void fetchSchools();
    }, []);

    useEffect(() => {
        if (!configBody) return;
        const bizInit = getBusinessInitialForm(configBody);
        setBusinessForm(bizInit);
        setBusinessErrors(validateBusiness(bizInit));

        const quotaYears = Object.keys(getAdmissionQuotaMap(configBody));
        setSelectedQuotaYear((prev) => prev || quotaYears[0] || "");

        const media = getMediaConfig(configBody);
        setImgFormatsDraft(getFormatListFromMedia(media, ["imgFormats", "imgFormat"]));
        setDocFormatsDraft(getFormatListFromMedia(media, ["docFormats", "docFormat"]));

        setMediaLimitsForm({
            maxImgSize: media.maxImgSize ?? "",
            maxDocSize: media.maxDocSize ?? "",
        });
        setMediaLimitsErrors({});

        setFormatDialogOpen(false);
        setFormatDialogMode("add");
        setFormatDialogIndex(-1);
        setFormatDialogValue("");
        setFormatDialogError("");

        setBusinessEditing(false);
        setMediaEditing(false);
        setQuotaEditing(false);

        const admInit = getAdmissionInitialForm(configBody);
        setAdmissionTemplateForm(admInit);
        setAdmissionImportPreview({
            allowedMethods: admInit.allowedMethods,
            documentRequirementsData: {
                mandatoryAll: Array.isArray(configBody?.admissionSettingsData?.documentRequirementsData?.mandatoryAll)
                    ? configBody.admissionSettingsData.documentRequirementsData.mandatoryAll
                    : [],
                byMethod: admInit.methodDocumentRequirements,
            },
            admissionProcesses: admInit.methodAdmissionProcess,
        });
        setAdmissionImportRows([]);
        rowValidationVersionRef.current = {};
        setAdmissionTemplateEditing(false);
    }, [configBody]);

    useEffect(() => {
        if (activeTabKey !== "business") setBusinessEditing(false);
        if (activeTabKey !== "media") setMediaEditing(false);
        if (activeTabKey !== "limits") setQuotaEditing(false);
        if (activeTabKey !== "admission") setAdmissionTemplateEditing(false);
    }, [activeTabKey]);

    useEffect(() => {
        const debounced = debounce(async ({ row, rowIndex, type, version }) => {
            try {
                const validatedRow = await validateSystemConfigSingleRow({ type, row });
                if (!validatedRow) return;
                const latest = rowValidationVersionRef.current?.[rowIndex];
                if (latest !== version) return;
                setAdmissionImportRows((prev) => {
                    if (!Array.isArray(prev) || !prev[rowIndex]) return prev;
                    const next = [...prev];
                    next[rowIndex] = normalizeImportRow(validatedRow);
                    return next;
                });
            } catch (error) {
                void error;
            } finally {
                setValidatingImportRow(false);
            }
        }, 500);
        validateRowDebouncedRef.current = debounced;
        return () => {
            if (typeof debounced.clear === "function") debounced.clear();
        };
    }, []);

    useEffect(() => {
        if (mediaFormatsTab > 1) setMediaFormatsTab(0);
    }, [mediaFormatsTab]);

    const cancelBusiness = () => {
        if (!configBody) return;
        const bizInit = getBusinessInitialForm(configBody);
        setBusinessForm(bizInit);
        setBusinessErrors(validateBusiness(bizInit));
        setStatus({ type: "", message: "", workflowNote: "" });
    };

    const startBusinessEdit = () => {
        setBusinessEditing(true);
    };

    const cancelBusinessEdit = () => {
        cancelBusiness();
        setBusinessEditing(false);
    };

    const saveBusinessEdit = async () => {
        const ok = await saveBusiness();
        if (ok) setBusinessEditing(false);
    };

    const cancelMediaFormats = () => {
        if (!configBody) return;
        const media = getMediaConfig(configBody);
        setImgFormatsDraft(getFormatListFromMedia(media, ["imgFormats", "imgFormat"]));
        setDocFormatsDraft(getFormatListFromMedia(media, ["docFormats", "docFormat"]));
        setMediaLimitsForm({
            maxImgSize: media.maxImgSize ?? "",
            maxDocSize: media.maxDocSize ?? "",
        });
        setMediaLimitsErrors({});
        setFormatDialogOpen(false);
        setFormatDialogMode("add");
        setFormatDialogIndex(-1);
        setFormatDialogValue("");
        setFormatDialogError("");
        setStatus({ type: "", message: "" });
    };

    const startMediaEdit = () => {
        setMediaEditing(true);
    };

    const cancelMediaEdit = () => {
        cancelMediaFormats();
        setMediaEditing(false);
    };

    const saveMediaEdit = async () => {
        const ok = await saveMediaFormats();
        if (ok) setMediaEditing(false);
    };

    const toRateDecimal = (ratePctValue) => {
        const pct = parseFinite(ratePctValue);
        if (pct === null) return null;
        const decimal = pct / 100;
        return Math.round(decimal * 10000) / 10000;
    };

    const closeFormatDialog = () => {
        setFormatDialogOpen(false);
        setFormatDialogValue("");
        setFormatDialogIndex(-1);
        setFormatDialogError("");
    };

    const submitFormatDialog = () => {
        if (!configBody) return;
        const normalized = normalizeFormatString(formatDialogValue);
        if (!normalized) {
            setFormatDialogError("Vui lòng nhập định dạng hợp lệ.");
            return;
        }

        const updateFormatDraft = (setter) => {
            setter((prev) => {
                const exists = prev.includes(normalized);
                if (formatDialogMode === "add") {
                    if (exists) {
                        setFormatDialogError("Định dạng đã tồn tại.");
                        return prev;
                    }
                    return [...prev, normalized];
                }
                const idx = formatDialogIndex;
                if (idx < 0 || idx >= prev.length) return prev;
                const next = [...prev];
                if (exists && prev[idx] !== normalized) {
                    setFormatDialogError("Định dạng đã tồn tại.");
                    return prev;
                }
                next[idx] = normalized;
                return next;
            });
        };

        if (formatDialogType === "image") {
            updateFormatDraft(setImgFormatsDraft);
        } else {
            updateFormatDraft(setDocFormatsDraft);
        }

        closeFormatDialog();
    };

    const validateMediaLimits = (form) => {
        const errors = {};
        const fields = [
            "maxImgSize",
            "maxDocSize",
        ];
        fields.forEach((key) => {
            const v = parseFinite(form[key]);
            if (v !== null && v < 0) {
                errors[key] = "Giá trị không được âm.";
            }
        });
        return errors;
    };

    const saveMediaFormats = async () => {
        if (!configBody) return;

        const limitErrors = validateMediaLimits(mediaLimitsForm);
        setMediaLimitsErrors(limitErrors);
        if (Object.keys(limitErrors).length > 0) return;

        setSaving(true);
        let ok = false;
        setStatus({ type: "", message: "" });
        try {
            const prevMedia = getMediaConfig(configBody);
            const {
                imgFormats: _imgF,
                docFormats: _docF,
                videoFormats: _videoF,
                imgFormat: _imgOld,
                docFormat: _docOld,
                videoFormat: _videoOld,
                maxVideoSize: _maxVideoSizeOld,
                ...mediaRest
            } = prevMedia;
            const mediaPatch = {
                mediaData: {
                    ...mediaRest,
                    maxImgSize: parseFinite(mediaLimitsForm.maxImgSize),
                    maxDocSize: parseFinite(mediaLimitsForm.maxDocSize),
                    imgFormats: imgFormatsDraft.map((f) => ({ format: normalizeFormatString(f) })),
                    docFormats: docFormatsDraft.map((f) => ({ format: normalizeFormatString(f) })),
                },
            };
            const updateRes = await updateSystemConfig(mediaPatch);
            assertSystemConfigUpdateSuccess(updateRes);
            enqueueSnackbar("Cập nhật cấu hình phương tiện thành công.", { variant: "success" });
            setStatus({ type: "success", message: "Cập nhật thành công." });
            await fetchConfig();
            ok = true;
        } catch (e) {
            console.error("saveMediaFormats failed", e);
            const msg = apiErrorMessage(e, "Cập nhật thất bại. Vui lòng thử lại.");
            enqueueSnackbar(msg, { variant: "error" });
            setStatus({ type: "error", message: msg });
        } finally {
            setSaving(false);
        }
        return ok;
    };

    const getQuotaInitialForm = (year) => {
        const quota = getAdmissionQuotaMap(configBody);
        const item = quota[year] || {};
        const source = item?.source && typeof item.source === "object" ? item.source : {};
        const entries = [];
        if (Array.isArray(item?.quotas)) {
            item.quotas.forEach((q) => {
                const sid = Number(q?.schoolId);
                const value = Number(q?.value);
                if (Number.isFinite(sid) && Number.isInteger(value) && value >= 0) {
                    entries.push(createQuotaEntry({ schoolId: sid, value }));
                }
            });
        } else if (item?.quotas && typeof item.quotas === "object") {
            Object.entries(item.quotas).forEach(([k, v]) => {
                const sid = Number(k);
                const value = Number(v);
                if (Number.isFinite(sid) && Number.isInteger(value) && value >= 0) {
                    entries.push(createQuotaEntry({ schoolId: sid, value }));
                }
            });
        }
        return {
            year: String(source?.year ?? year ?? ""),
            sourceName: String(source?.sourceName ?? ""),
            sourceType: "NEWS_ARTICLE",
            sourceUrl: String(source?.sourceUrl ?? item?.sourceUrl ?? ""),
            quotas: entries.length ? entries : [createQuotaEntry()],
        };
    };

    const validateQuota = (form, { strict = false } = {}) => {
        const errors = {};
        const year = String(form?.year ?? "").trim();
        if (!year) errors.year = "Vui lòng nhập năm học.";
        if (year.length > 50) errors.year = "Năm học quá dài.";
        const sourceName = String(form?.sourceName ?? "").trim();
        if (sourceName.length > 255) errors.sourceName = "Tên nguồn quá dài.";
        const sourceUrl = String(form?.sourceUrl ?? "").trim();
        if (strict && !sourceUrl) {
            errors.sourceUrl = "Vui lòng nhập nguồn dữ liệu.";
        } else if (sourceUrl.length > 2048) {
            errors.sourceUrl = "URL quá dài.";
        } else if (sourceUrl) {
            const lower = sourceUrl.toLowerCase();
            if (!lower.endsWith(".html")) {
                errors.sourceUrl = "Nguồn dữ liệu chỉ chấp nhận file .html.";
            }
        }
        const quotaRows = Array.isArray(form?.quotas) ? form.quotas : [];
        const usedSchoolIds = new Set();
        quotaRows.forEach((row) => {
            const sid = Number(row?.schoolId);
            const normalizedValue = String(row?.value ?? "").trim();
            const rowId = row?.id ?? "";
            if (!sid && normalizedValue === "") return;
            if (!Number.isFinite(sid) || sid <= 0) {
                errors[`quotaSchool:${rowId}`] = "Vui lòng chọn trường.";
                return;
            }
            if (usedSchoolIds.has(sid)) {
                errors[`quotaSchool:${rowId}`] = "Trường đã tồn tại trong danh sách.";
                return;
            }
            usedSchoolIds.add(sid);
            if (normalizedValue === "") {
                if (strict) errors[`quotaValue:${rowId}`] = "Chỉ tiêu phải là số nguyên >= 0.";
                return;
            }
            const n = Number(normalizedValue);
            if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
                errors[`quotaValue:${rowId}`] = "Chỉ tiêu phải là số nguyên >= 0.";
            }
        });
        return errors;
    };

    const cancelQuota = () => {
        if (!configBody || !selectedQuotaYear) return;
        const form = getQuotaInitialForm(selectedQuotaYear);
        setQuotaForm(form);
        setQuotaErrors(validateQuota(form));
        setStatus({ type: "", message: "" });
    };

    const startQuotaAdd = () => {
        const form = {
            year: "",
            sourceName: "",
            sourceType: "NEWS_ARTICLE",
            sourceUrl: "",
            quotas: schoolOptions.map((school) => createQuotaEntry({ schoolId: school.schoolId, value: "" })),
        };
        setQuotaMode("add");
        setQuotaForm(form);
        setQuotaErrors({});
        setQuotaEditing(true);
    };

    const cancelQuotaEdit = () => {
        cancelQuota();
        setQuotaEditing(false);
    };

    const saveQuotaEdit = async () => {
        if (!configBody) return;
        const errors = validateQuota(quotaForm, { strict: true });
        setQuotaErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setSaving(true);
        let ok = false;
        setStatus({ type: "", message: "" });
        try {
            const normalizedYear = String(quotaForm.year ?? "").trim();
            const sanitizedQuotas = (quotaForm.quotas || []).reduce((acc, row) => {
                const schoolId = Number(row?.schoolId);
                const valueStr = String(row?.value ?? "").trim();
                if (!Number.isFinite(schoolId) || valueStr === "") return acc;
                const valueNum = Number(valueStr);
                if (!Number.isFinite(valueNum) || !Number.isInteger(valueNum) || valueNum < 0) return acc;
                acc.push({ schoolId: Math.trunc(schoolId), value: valueNum });
                return acc;
            }, []);
            const updatedBody = {
                admissionQuotaData: {
                    source: {
                        sourceName: String(quotaForm.sourceName ?? "").trim(),
                        sourceUrl: String(quotaForm.sourceUrl ?? "").trim(),
                        sourceType: String(quotaForm.sourceType ?? "NEWS_ARTICLE"),
                        year: normalizedYear,
                    },
                    quotas: sanitizedQuotas,
                },
            };

            const updateRes = await updateSystemConfig(updatedBody);
            assertSystemConfigUpdateSuccess(updateRes);
            enqueueSnackbar("Cập nhật Cài đặt Hạn mức Tuyển sinh thành công.", { variant: "success" });
            setStatus({ type: "success", message: "Cập nhật thành công." });
            setSelectedQuotaYear(normalizedYear);
            await fetchConfig();
            ok = true;
        } catch (e) {
            console.error("saveQuotaEdit failed", e);
            const msg = apiErrorMessage(e, "Cập nhật thất bại. Vui lòng thử lại.");
            enqueueSnackbar(msg, { variant: "error" });
            setStatus({ type: "error", message: msg });
        } finally {
            setSaving(false);
        }
        if (ok) setQuotaEditing(false);
        return ok;
    };

    const autoFillQuotaByAI = async () => {
        const currentUrl = String(quotaForm.sourceUrl ?? "").trim();
        if (!currentUrl) {
            enqueueSnackbar("Vui lòng nhập nguồn dữ liệu (URL) trước khi tự động điền.", { variant: "warning" });
            return;
        }
        if (!currentUrl.toLowerCase().endsWith(".html")) {
            enqueueSnackbar("Nguồn dữ liệu chỉ chấp nhận file .html.", { variant: "warning" });
            return;
        }
        setAutoFillingQuota(true);
        try {
            const res = await autoFillAdminSchoolQuotas({ url: currentUrl });
            const body = res?.data?.body ?? {};
            const source = body?.source && typeof body.source === "object" ? body.source : {};
            const quotas = Array.isArray(body?.quotas) ? body.quotas : [];
            const quotaBySchoolId = new Map();
            quotas.forEach((item) => {
                const sid = Number(item?.schoolId);
                const value = Number(item?.value);
                if (Number.isFinite(sid) && Number.isInteger(value) && value >= 0) {
                    quotaBySchoolId.set(sid, value);
                }
            });
            let missingSchools = [];

            setQuotaForm((prev) => {
                const nextRows = (prev?.quotas || []).map((row) => {
                    const sid = Number(row?.schoolId);
                    if (!Number.isFinite(sid)) return row;
                    const nextValue = quotaBySchoolId.get(sid);
                    return {
                        ...row,
                        value: nextValue == null ? "" : String(nextValue),
                    };
                });
                const next = {
                    ...prev,
                    sourceName: source?.sourceName != null ? String(source.sourceName) : prev.sourceName,
                    sourceUrl: source?.sourceUrl != null ? String(source.sourceUrl) : prev.sourceUrl,
                    sourceType: source?.sourceType != null ? String(source.sourceType) : prev.sourceType,
                    year: source?.year != null ? String(source.year) : prev.year,
                    quotas: nextRows,
                };
                missingSchools = nextRows
                    .filter((row) => {
                        const sid = Number(row?.schoolId);
                        return Number.isFinite(sid) && !quotaBySchoolId.has(sid);
                    })
                    .map((row) => row.schoolName)
                    .filter(Boolean);
                setQuotaErrors(validateQuota(next));
                return next;
            });

            enqueueSnackbar("Đã tự động điền chỉ tiêu bằng AI.", { variant: "success" });
            if (missingSchools.length > 0) {
                const preview = missingSchools.slice(0, 3).join(", ");
                const remain = missingSchools.length > 3 ? ` và ${missingSchools.length - 3} trường khác` : "";
                enqueueSnackbar(`Chưa có chỉ tiêu cho: ${preview}${remain}. Vui lòng nhập tay.`, { variant: "warning" });
            }
        } catch (e) {
            console.error("autoFillQuotaByAI failed", e);
            enqueueSnackbar(apiErrorMessage(e, "Không thể tự động điền chỉ tiêu. Vui lòng thử lại."), { variant: "error" });
        } finally {
            setAutoFillingQuota(false);
        }
    };

    const saveBusiness = async () => {
        if (!configBody) return;
        const errors = validateBusiness(businessForm);
        setBusinessErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setSaving(true);
        let ok = false;
        setStatus({ type: "", message: "", workflowNote: "" });
        try {
            const minPay = parseFinite(businessForm.minPay);
            const maxPay = parseFinite(businessForm.maxPay);
            const taxRate = toRateDecimal(businessForm.taxRatePct);
            const serviceRate = toRateDecimal(businessForm.serviceRatePct);
            const trialRatioCap = formPctStringToTrialRatioCapDecimal(businessForm.trialRatioCapPct);

            const updatedBody = {
                businessData: {
                    minPay: minPay != null ? Math.trunc(minPay) : minPay,
                    maxPay: maxPay != null ? Math.trunc(maxPay) : maxPay,
                    taxRate,
                    serviceRate,
                    subscriptionPricing: {
                        basePrices: {
                            trial: Math.trunc(parseFinite(businessForm.baseTrialPrice) ?? 0),
                            standard: Math.trunc(parseFinite(businessForm.baseStandardPrice) ?? 0),
                            enterprise: Math.trunc(parseFinite(businessForm.baseEnterprisePrice) ?? 0),
                        },
                        featureUnitPrices: {
                            aiChatbotMonthlyFee: Math.trunc(parseFinite(businessForm.aiChatbotMonthlyFee) ?? 0),
                            premiumSupportFee: Math.trunc(parseFinite(businessForm.premiumSupportFee) ?? 0),
                        },
                        packageQuotas: {
                            durationDays: Math.trunc(parseFinite(businessForm.durationDays) ?? 0),
                            trialCounsellor: Math.trunc(parseFinite(businessForm.trialCounsellor) ?? 0),
                            standardCounsellor: Math.trunc(parseFinite(businessForm.standardCounsellor) ?? 0),
                            enterpriseCounsellor: Math.trunc(parseFinite(businessForm.enterpriseCounsellor) ?? 0),
                            trialPostLimit: Math.trunc(parseFinite(businessForm.trialPostLimit) ?? 0),
                            standardPostLimit: Math.trunc(parseFinite(businessForm.standardPostLimit) ?? 0),
                            enterprisePostLimit: Math.trunc(parseFinite(businessForm.enterprisePostLimit) ?? 0),
                        },
                        trialRatioCap,
                    },
                },
            };

            const updateRes = await updateSystemConfig(updatedBody);
            assertSystemConfigUpdateSuccess(updateRes);
            const sideEffects = extractBusinessConfigSaveSideEffects(updateRes);
            const workflowLines = [
                "Sau khi lưu, hệ thống phía server thực hiện lần lượt:",
                "Bước 1 — Lưu cấu hình vào CSDL: tìm bản ghi PlatformConfig khóa business; chưa có thì tạo, có rồi thì ghi đè JSON mới.",
                "Bước 2 — Kiểm tra tác động: lấy toàn bộ gói PACKAGE_ACTIVE, tính lại finalPrice theo cấu hình vừa lưu.",
                "Bước 3 — Gói có giá đổi so với trước: nếu đang có người dùng → PACKAGE_INACTIVE_PENDING (khóa mua mới/gia hạn, người đang dùng đến hết hạn); nếu chưa ai dùng → PACKAGE_DEACTIVATED.",
            ];
            if (sideEffects.bulletLines.length > 0) {
                workflowLines.push("Chi tiết từ phản hồi API:", ...sideEffects.bulletLines);
            }
            enqueueSnackbar("Cập nhật Cài đặt Doanh nghiệp thành công.", { variant: "success" });
            setStatus({
                type: "success",
                message: "Đã lưu cấu hình doanh nghiệp.",
                workflowNote: workflowLines.join("\n"),
            });
            await fetchConfig();
            ok = true;
        } catch (e) {
            console.error("saveBusiness failed", e);
            const msg = apiErrorMessage(e, "Cập nhật thất bại. Vui lòng thử lại.");
            enqueueSnackbar(msg, { variant: "error" });
            setStatus({ type: "error", message: msg, workflowNote: "" });
        } finally {
            setSaving(false);
        }
        return ok;
    };

    const cancelAdmissionTemplate = () => {
        if (!configBody) return;
        setAdmissionTemplateForm(getAdmissionInitialForm(configBody));
        setStatus({ type: "", message: "" });
    };

    const saveAdmissionTemplate = async () => {
        if (!configBody) return;
        setSaving(true);
        setStatus({ type: "", message: "" });
        try {
            const sanitized = sanitizeAdmissionSettingsForApi(admissionTemplateForm);
            const updateRes = await updateSystemConfig({ admissionSettingsData: sanitized });
            assertSystemConfigUpdateSuccess(updateRes);
            enqueueSnackbar(
                "Đã cập nhật mẫu phương thức. Các trường đang dùng bản riêng không tự đổi.",
                { variant: "success" }
            );
            setStatus({ type: "success", message: "Mẫu hệ thống đã lưu." });
            await fetchConfig();
            setAdmissionTemplateEditing(false);
        } catch (e) {
            console.error("saveAdmissionTemplate failed", e);
            const msg = apiErrorMessage(e, "Cập nhật thất bại. Vui lòng thử lại.");
            enqueueSnackbar(msg, { variant: "error" });
            setStatus({ type: "error", message: msg });
        } finally {
            setSaving(false);
        }
    };

    const handleSelectAdmissionTemplateFile = () => {
        if (saving || importingAdmissionTemplate || confirmingAdmissionImport) return;
        admissionImportInputRef.current?.click();
    };

    const handleAdmissionTemplateImport = async (event) => {
        const file = event?.target?.files?.[0];
        if (!file) return;
        setImportingAdmissionTemplate(true);
        setStatus({ type: "", message: "" });
        try {
            const previewRes = await importSystemConfigPreview({ type: importType, file });
            const rows = Array.isArray(previewRes?.rows) ? previewRes.rows.map((item) => normalizeImportRow(item)) : [];
            setAdmissionImportRows(rows);
            const errorCount = rows.filter((row) => row.isError).length;
            if (rows.length === 0) {
                enqueueSnackbar("File không có dữ liệu để nhập.", { variant: "warning" });
            } else if (errorCount === 0) {
                enqueueSnackbar("Dữ liệu hợp lệ, bạn có thể xác nhận nhập ngay.", { variant: "success" });
                setAdmissionImportPreviewOpen(true);
            } else {
                enqueueSnackbar(`Đã tải xem trước: ${errorCount}/${rows.length} dòng có lỗi.`, { variant: "warning" });
                setAdmissionImportPreviewOpen(true);
            }
            setStatus({ type: "", message: "" });
        } catch (e) {
            console.error("import admission template failed", e);
            const msg = apiErrorMessage(e, "Xem trước nhập dữ liệu thất bại. Vui lòng kiểm tra file mẫu.");
            enqueueSnackbar(msg, { variant: "error" });
            setStatus({ type: "error", message: msg });
        } finally {
            setImportingAdmissionTemplate(false);
            if (event?.target) event.target.value = "";
        }
    };

    const handleImportCellChange = (rowIndex, field, value) => {
        let rowPayload = null;
        setAdmissionImportRows((prev) => {
            const next = [...(Array.isArray(prev) ? prev : [])];
            const cur = next[rowIndex];
            if (!cur) return prev;
            const nextRow = {
                ...cur,
                rowData: { ...(cur.rowData || {}), [field]: value },
            };
            rowPayload = nextRow.rowData;
            next[rowIndex] = nextRow;
            return next;
        });
        if (!rowPayload) return;
        const version = (rowValidationVersionRef.current[rowIndex] || 0) + 1;
        rowValidationVersionRef.current[rowIndex] = version;
        setValidatingImportRow(true);
        validateRowDebouncedRef.current?.({
            row: rowPayload,
            rowIndex,
            type: importType,
            version,
        });
    };

    const handleConfirmAdmissionImport = async () => {
        const rows = Array.isArray(admissionImportRows) ? admissionImportRows : [];
        if (!rows.length) return;
        if (rows.some((item) => item.isError)) {
            enqueueSnackbar("Vui lòng sửa hết các dòng lỗi trước khi xác nhận nhập.", { variant: "warning" });
            return;
        }
        setAdmissionImportConfirmOpen(false);
        setConfirmingAdmissionImport(true);
        setStatus({ type: "", message: "" });
        try {
            const payloadRows = rows.map((item) => ({
                rowData: item?.rowData || {},
                error: item?.error ?? null,
                isError: Boolean(item?.isError),
            }));
            const validateRes = await validateSystemConfigRows({ type: importType, rows: payloadRows });
            const validatedRows = Array.isArray(validateRes?.rows) ? validateRes.rows.map((item) => normalizeImportRow(item)) : [];
            if (validatedRows.length) {
                setAdmissionImportRows(validatedRows);
            }
            const hasValidateError = validatedRows.some((item) => item?.isError);
            if (hasValidateError) {
                enqueueSnackbar("Dữ liệu còn lỗi sau khi kiểm tra lại. Vui lòng sửa trước khi xác nhận nhập.", { variant: "warning" });
                setAdmissionImportPreviewOpen(true);
                return;
            }
            const rowsForConfirm = validatedRows.length
                ? validatedRows.map((item) => ({
                    rowData: item?.rowData || {},
                    error: item?.error ?? null,
                    isError: Boolean(item?.isError),
                }))
                : payloadRows;
            const res = await confirmSystemConfigImport({ type: importType, rows: rowsForConfirm });
            const successMsg = String(res?.data?.message || "Xác nhận nhập dữ liệu thành công").trim();
            enqueueSnackbar(successMsg, { variant: "success" });
            setStatus({ type: "success", message: successMsg });
            await fetchConfig();
            setAdmissionImportRows([]);
            setAdmissionImportPreviewOpen(false);
        } catch (e) {
            const msg = apiErrorMessage(e, "Xác nhận nhập dữ liệu thất bại. Vui lòng thử lại.");
            enqueueSnackbar(msg, { variant: "error" });
            setStatus({ type: "error", message: msg });
        } finally {
            setConfirmingAdmissionImport(false);
        }
    };

    const openAdmissionImportConfirmModal = () => {
        const rows = Array.isArray(admissionImportRows) ? admissionImportRows : [];
        if (!rows.length) return;
        if (rows.some((item) => item.isError)) {
            enqueueSnackbar("Vui lòng sửa hết các dòng lỗi trước khi xác nhận nhập.", { variant: "warning" });
            return;
        }
        setAdmissionImportConfirmOpen(true);
    };

    const renderAdmissionTab = () => {
        const rowDisabled = !admissionTemplateEditing || saving;
        const methods = admissionTemplateForm.allowedMethods || [];
        const preview = admissionImportPreview;
        const docsByMethod = Array.isArray(preview?.documentRequirementsData?.byMethod)
            ? preview.documentRequirementsData.byMethod
            : [];
        const processByMethod = Array.isArray(preview?.admissionProcesses) ? preview.admissionProcesses : [];
        const processByMethodMap = processByMethod.reduce((acc, group) => {
            const methodCode = String(group?.methodCode ?? "").trim();
            if (!methodCode) return acc;
            acc[methodCode] = Array.isArray(group?.steps)
                ? [...group.steps].sort((a, b) => Number(a?.stepOrder || 0) - Number(b?.stepOrder || 0))
                : [];
            return acc;
        }, {});
        const methodNameMap = methods.reduce((acc, method) => {
            const code = String(method?.code ?? "").trim();
            if (!code) return acc;
            acc[code] = String(method?.displayName || code).trim();
            return acc;
        }, {});
        const importRows = Array.isArray(admissionImportRows) ? admissionImportRows : [];
        const importErrorCount = importRows.filter((row) => row?.isError).length;
        const importValidCount = Math.max(0, importRows.length - importErrorCount);
        const hasImportError = importErrorCount > 0;
        const canConfirmImport = importRows.length > 0 && !hasImportError && !confirmingAdmissionImport && !saving;
        const importColumns = importRows.length
            ? Object.keys(importRows.reduce((acc, row) => ({ ...acc, ...(row?.rowData || {}) }), {}))
            : [];
        const admissionInputSx = {
            "& .MuiOutlinedInput-root": {
                borderRadius: 1.75,
                bgcolor: "#ffffff",
                "& fieldset": { borderColor: "#bfdbfe" },
                "&:hover fieldset": { borderColor: "#60a5fa" },
                "&.Mui-focused fieldset": { borderColor: "#2563eb" },
            },
            "& .MuiInputBase-input": {
                color: "#374151",
            },
            "& .MuiInputBase-input.Mui-disabled": {
                WebkitTextFillColor: "#374151",
                color: "#374151",
            },
        };
        const previewHeaderRowSx = {
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 120px" },
            gap: 1.25,
            px: 1,
            py: 0.75,
            borderRadius: 1,
            bgcolor: "#eef4ff",
            mb: 1,
        };
        const previewDataRowSx = {
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 120px" },
            gap: 1.25,
            px: 1,
            py: 0.9,
            borderRadius: 0.9,
            borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
            bgcolor: "transparent",
            transition: "all 220ms ease",
            "&:hover": {
                bgcolor: "#eff6ff",
                transform: "translateX(2px)",
            },
        };
        const previewSectionCardSx = {
            p: 1.5,
            borderRadius: 2,
            border: "1px solid #dbe7fb",
            bgcolor: "#ffffff",
            boxShadow: "0 6px 16px rgba(15, 23, 42, 0.04)",
        };
        const previewSectionTitleSx = {
            fontWeight: 800,
            color: "#1e3a8a",
            mb: 1,
            px: 1.1,
            py: 0.6,
            borderRadius: 1,
            bgcolor: "#eff6ff",
            border: "1px solid #dbeafe",
            display: "block",
        };

        return (
            <Stack spacing={2.5} sx={{ width: "100%" }}>
                <Box>
                    <Box
                        sx={{
                            px: 0.5,
                            py: 0.5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 1,
                        }}
                    >
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            <TextField
                                select
                                size="small"
                                label="Loại nhập liệu"
                                value={importType}
                                disabled={saving || importingAdmissionTemplate || confirmingAdmissionImport}
                                onChange={(e) => setImportType(String(e.target.value || "ALLOWED_METHODS"))}
                                sx={{ minWidth: 240 }}
                            >
                                {IMPORT_TYPE_OPTIONS.map((typeKey) => (
                                    <MenuItem key={typeKey} value={typeKey}>
                                        {IMPORT_TYPE_LABEL[typeKey]}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={importingAdmissionTemplate ? <CircularProgress size={14} /> : <FileUploadOutlinedIcon />}
                                disabled={saving || importingAdmissionTemplate || confirmingAdmissionImport}
                                onClick={handleSelectAdmissionTemplateFile}
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 700,
                                    borderRadius: 2,
                                }}
                            >
                                {importingAdmissionTemplate ? "Đang tải lên..." : "Tải lên"}
                            </Button>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<AddIcon />}
                                disabled={rowDisabled}
                                onClick={() =>
                                    setAdmissionTemplateForm((p) => ({
                                        ...p,
                                        allowedMethods: [...(p.allowedMethods || []), { code: "", displayName: "", description: "" }],
                                    }))
                                }
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 700,
                                    borderRadius: 2,
                                    boxShadow: "none",
                                    bgcolor: "#2563eb",
                                    "&:hover": { bgcolor: "#1d4ed8" },
                                }}
                            >
                                Thêm phương thức
                            </Button>
                        </Stack>
                    </Box>
                    <input
                        ref={admissionImportInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        hidden
                        onChange={handleAdmissionTemplateImport}
                    />
                    <Dialog
                        open={admissionImportPreviewOpen}
                        onClose={() => setAdmissionImportPreviewOpen(false)}
                        fullWidth
                        maxWidth="lg"
                        PaperProps={{ sx: { borderRadius: 3, border: "1px solid #dbeafe" } }}
                    >
                        <DialogTitle sx={{ fontWeight: 800, color: "#0f172a" }}>
                            Kiểm tra dữ liệu trước khi nhập — {IMPORT_TYPE_LABEL[importType]}
                        </DialogTitle>
                        <DialogContent sx={{ pt: "8px !important" }}>
                            <Typography variant="body2" sx={{ color: "#475569", mb: 1 }}>
                                Tổng: {importRows.length} | Hợp lệ: {importValidCount} | Lỗi: {importErrorCount}
                                {validatingImportRow ? " | Đang kiểm tra..." : ""}
                            </Typography>
                            {importRows.length > 0 ? (
                                <TableContainer
                                    sx={{
                                        borderRadius: 1.5,
                                        border: "1px solid #dbeafe",
                                        bgcolor: "#ffffff",
                                        maxHeight: 420,
                                    }}
                                >
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 800 }}>STT</TableCell>
                                                {importColumns.map((key) => (
                                                    <TableCell key={`modal-col-${key}`} sx={{ fontWeight: 800 }}>
                                                        {getAdmissionImportColumnLabel(key)}
                                                    </TableCell>
                                                ))}
                                                <TableCell sx={{ fontWeight: 800 }}>Trạng thái</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {importRows.map((row, rowIdx) => (
                                                <TableRow key={`modal-import-row-${rowIdx}`} hover>
                                                    <TableCell align="center">
                                                        <Chip label={rowIdx + 1} size="small" sx={adminSttChipSx} />
                                                    </TableCell>
                                                    {importColumns.map((key) => (
                                                        <TableCell key={`modal-import-row-${rowIdx}-cell-${key}`}>
                                                            <TextField
                                                                fullWidth
                                                                size="small"
                                                                value={row?.rowData?.[key] ?? ""}
                                                                disabled={key === "index"}
                                                                onChange={(e) => handleImportCellChange(rowIdx, key, e.target.value)}
                                                                error={Boolean(row?.isError)}
                                                                inputProps={{
                                                                    "aria-label": getAdmissionImportColumnLabel(key),
                                                                }}
                                                                sx={{ minWidth: 120 }}
                                                            />
                                                        </TableCell>
                                                    ))}
                                                    <TableCell>
                                                        <Chip
                                                            size="small"
                                                            color={row?.isError ? "error" : "success"}
                                                            label={row?.isError ? (row?.errorText || "Lỗi dữ liệu") : "Hợp lệ"}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Typography variant="body2" sx={{ color: "#64748b" }}>
                                    Chưa có dữ liệu xem trước.
                                </Typography>
                            )}
                        </DialogContent>
                        <DialogActions sx={{ px: 2, pb: 2 }}>
                            <Button variant="outlined" onClick={() => setAdmissionImportPreviewOpen(false)} sx={cancelButtonSx}>
                                Đóng
                            </Button>
                            <Button
                                variant="contained"
                                disabled={!canConfirmImport}
                                onClick={openAdmissionImportConfirmModal}
                                sx={saveButtonSx}
                            >
                                Xác nhận nhập
                            </Button>
                        </DialogActions>
                    </Dialog>
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 2.25,
                            border: "1px solid rgba(191, 219, 254, 0.9)",
                            bgcolor: "rgba(248,251,255,0.78)",
                            boxShadow: "0 10px 22px rgba(37, 99, 235, 0.08)",
                            transition: "all 220ms ease",
                            "&:hover": {
                                borderColor: "rgba(96, 165, 250, 0.65)",
                                boxShadow: "0 14px 28px rgba(37, 99, 235, 0.14)",
                            },
                        }}
                    >
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#1d4ed8", mb: 1 }}>
                            Phương thức tuyển sinh
                        </Typography>
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: { xs: "1fr", md: "0.9fr 1fr 1.5fr 52px" },
                                gap: 1.25,
                                px: 1,
                                py: 0.75,
                                borderRadius: 1.5,
                                bgcolor: "#eaf2ff",
                                border: "1px solid #cfe1ff",
                                mb: 1.1,
                            }}
                        >
                            <Typography sx={{ fontWeight: 800, color: "#374151", fontSize: 13 }}>Mã phương thức</Typography>
                            <Typography sx={{ fontWeight: 800, color: "#374151", fontSize: 13 }}>Tên hiển thị</Typography>
                            <Typography sx={{ fontWeight: 800, color: "#374151", fontSize: 13 }}>Mô tả</Typography>
                            <Typography sx={{ fontWeight: 800, color: "#374151", fontSize: 13, textAlign: "center" }}>Xóa</Typography>
                        </Box>

                        {methods.length === 0 ? (
                            <Box
                                sx={{
                                    py: 4,
                                    px: 2,
                                    borderRadius: 2,
                                    border: "1px dashed #cbd5e1",
                                    bgcolor: "#ffffff",
                                    textAlign: "center",
                                }}
                            >
                                <Typography variant="body2" sx={{ color: "#374151" }}>
                                    Chưa có phương thức. Nhấn <strong>Thêm phương thức</strong> phía trên để tạo dòng đầu tiên trong mẫu hệ thống.
                                </Typography>
                            </Box>
                        ) : (
                            <Stack spacing={1}>
                                {methods.map((row, idx) => (
                                    <Box
                                        key={`adm-${idx}-${row.code ?? "row"}`}
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: { xs: "1fr", md: "0.9fr 1fr 1.5fr 52px" },
                                            gap: 1.25,
                                            p: 1.1,
                                            borderRadius: 2.25,
                                            border: "1px solid rgba(148, 163, 184, 0.24)",
                                            bgcolor: "rgba(255,255,255,0.88)",
                                            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.08)",
                                            transition: "all 0.2s ease",
                                            "&:hover": {
                                                borderColor: "rgba(59,130,246,0.45)",
                                                boxShadow: "0 10px 20px rgba(37, 99, 235, 0.14)",
                                                transform: "translateY(-1px)",
                                            },
                                        }}
                                    >
                                        <TextField
                                            size="small"
                                            fullWidth
                                            placeholder="VD: HOC_BA"
                                            value={row.code}
                                            disabled={rowDisabled}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setAdmissionTemplateForm((p) => {
                                                    const next = [...(p.allowedMethods || [])];
                                                    next[idx] = { ...next[idx], code: v };
                                                    return { ...p, allowedMethods: next };
                                                });
                                            }}
                                            onBlur={() => {
                                                setAdmissionTemplateForm((p) => {
                                                    const next = [...(p.allowedMethods || [])];
                                                    const cur = next[idx];
                                                    if (!cur) return p;
                                                    const trimmed = String(cur.code ?? "").trim();
                                                    if (trimmed === cur.code) return p;
                                                    next[idx] = { ...cur, code: trimmed };
                                                    return { ...p, allowedMethods: next };
                                                });
                                            }}
                                            inputProps={{
                                                spellCheck: false,
                                                autoComplete: "off",
                                                autoCapitalize: "off",
                                                "aria-label": "Mã phương thức",
                                            }}
                                            sx={{
                                                minWidth: 0,
                                                "& .MuiInputBase-root": { py: 0.25 },
                                                "& .MuiInputBase-input": {
                                                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                                    fontSize: "0.9375rem",
                                                    letterSpacing: "0.02em",
                                                    py: 1,
                                                },
                                                ...admissionInputSx,
                                            }}
                                        />
                                        <TextField
                                            size="small"
                                            fullWidth
                                            placeholder="Tên trên giao diện"
                                            value={row.displayName}
                                            disabled={rowDisabled}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setAdmissionTemplateForm((p) => {
                                                    const next = [...(p.allowedMethods || [])];
                                                    next[idx] = { ...next[idx], displayName: v };
                                                    return { ...p, allowedMethods: next };
                                                });
                                            }}
                                            sx={admissionInputSx}
                                        />
                                        <TextField
                                            size="small"
                                            fullWidth
                                            multiline
                                            minRows={1}
                                            maxRows={4}
                                            placeholder="Mô tả ngắn cho tư vấn / trường"
                                            value={row.description}
                                            disabled={rowDisabled}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setAdmissionTemplateForm((p) => {
                                                    const next = [...(p.allowedMethods || [])];
                                                    next[idx] = { ...next[idx], description: v };
                                                    return { ...p, allowedMethods: next };
                                                });
                                            }}
                                            sx={admissionInputSx}
                                        />
                                        <Box sx={{ display: "flex", justifyContent: "center", pt: 0.25 }}>
                                            <Tooltip title="Xóa dòng" placement="left">
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        disabled={rowDisabled}
                                                        aria-label="Xóa dòng"
                                                        onClick={() =>
                                                            setAdmissionTemplateForm((p) => {
                                                                const next = [...(p.allowedMethods || [])];
                                                                next.splice(idx, 1);
                                                                return { ...p, allowedMethods: next };
                                                            })
                                                        }
                                                    >
                                                        <DeleteOutlineIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
                                    </Box>
                                ))}
                            </Stack>
                        )}
                    </Box>
                </Box>

                {preview ? (
                    <Stack spacing={1.5} sx={{ width: "100%" }}>
                        <Box sx={previewSectionCardSx}>
                            <Typography sx={previewSectionTitleSx}>Hồ sơ theo phương thức</Typography>
                            <Stack spacing={1.4}>
                                {docsByMethod.length === 0 ? (
                                    <Typography variant="body2" sx={{ color: "#64748b" }}>Không có dữ liệu hồ sơ theo phương thức.</Typography>
                                ) : (
                                    docsByMethod.map((group, idx) => {
                                        const methodCode = String(group?.methodCode ?? "").trim();
                                        const methodLabel = methodNameMap[methodCode] || methodCode || "Phương thức";
                                        const docs = Array.isArray(group?.documents) ? group.documents : [];
                                        const steps = processByMethodMap[methodCode] || [];
                                        return (
                                            <Box
                                                key={`method-doc-group-${idx}`}
                                                sx={{
                                                    p: 1.1,
                                                    borderRadius: 1.5,
                                                    bgcolor: "#fcfdff",
                                                    border: "1px solid #e2e8f0",
                                                    transition: "all 220ms ease",
                                                    boxShadow: "0 4px 10px rgba(15, 23, 42, 0.04)",
                                                    "&:hover": {
                                                        borderColor: "#bfdbfe",
                                                        boxShadow: "0 10px 18px rgba(37, 99, 235, 0.12)",
                                                        transform: "translateY(-1px)",
                                                    },
                                                }}
                                            >
                                                <Typography
                                                    sx={{
                                                        fontWeight: 800,
                                                        color: "#1f2937",
                                                        mb: 0.9,
                                                        px: 0.9,
                                                        py: 0.4,
                                                        borderRadius: 1,
                                                        bgcolor: "#eef2ff",
                                                        display: "inline-block",
                                                        border: "1px solid #dbeafe",
                                                    }}
                                                >
                                                    {methodLabel}
                                                </Typography>
                                                <Box sx={previewHeaderRowSx}>
                                                    <Typography sx={{ fontWeight: 800, color: "#374151", fontSize: 13 }}>Tên hồ sơ</Typography>
                                                    <Typography sx={{ fontWeight: 800, color: "#374151", fontSize: 13, textAlign: "center" }}>Trạng thái</Typography>
                                                </Box>
                                                {docs.length === 0 ? (
                                                    <Typography variant="body2" sx={{ color: "#64748b" }}>Không có hồ sơ.</Typography>
                                                ) : (
                                                    <Stack spacing={0.8}>
                                                        {docs.map((doc, dIdx) => {
                                                            const isRequired = doc?.required === true;
                                                            return (
                                                                <Box
                                                                    key={`method-doc-${idx}-${dIdx}`}
                                                                    sx={previewDataRowSx}
                                                                >
                                                                    <Typography variant="body2" sx={{ color: "#1e293b", fontWeight: 600 }}>{doc?.name || "-"}</Typography>
                                                                    <Chip
                                                                        size="small"
                                                                        label={isRequired ? "Bắt buộc" : "Tùy chọn"}
                                                                        sx={{
                                                                            height: 24,
                                                                            fontWeight: 700,
                                                                            fontSize: 11,
                                                                            color: isRequired ? "#b91c1c" : "#166534",
                                                                            bgcolor: isRequired ? "#fee2e2" : "#dcfce7",
                                                                            border: `1px solid ${isRequired ? "#fecaca" : "#bbf7d0"}`,
                                                                            justifySelf: "center",
                                                                        }}
                                                                    />
                                                                </Box>
                                                            );
                                                        })}
                                                    </Stack>
                                                )}
                                                <Box
                                                    sx={{
                                                        mt: 1.25,
                                                        p: 0.8,
                                                        borderRadius: 1.5,
                                                        bgcolor: "#ffffff",
                                                        border: "1px dashed #dbeafe",
                                                    }}
                                                >
                                                    <Typography sx={{ fontWeight: 800, color: "#1d4ed8", mb: 1, fontSize: 13.5 }}>
                                                        Quy trình tuyển sinh
                                                    </Typography>
                                                    {steps.length === 0 ? (
                                                        <Typography variant="body2" sx={{ color: "#64748b" }}>Không có bước.</Typography>
                                                    ) : (
                                                        <Stack spacing={0.2}>
                                                            {steps.map((step, sIdx) => {
                                                                const isLast = sIdx === steps.length - 1;
                                                                const stepNumber = step?.stepOrder ?? sIdx + 1;
                                                                return (
                                                                    <Box
                                                                        key={`method-step-inline-${idx}-${sIdx}`}
                                                                        sx={{
                                                                            display: "grid",
                                                                            gridTemplateColumns: "32px 1fr",
                                                                            gap: 1.1,
                                                                            minHeight: 64,
                                                                            borderRadius: 1.5,
                                                                            px: 0.5,
                                                                            py: 0.45,
                                                                            transition: "all 200ms ease",
                                                                            "&:hover": {
                                                                                bgcolor: "#f1f7ff",
                                                                                transform: "translateX(2px)",
                                                                            },
                                                                        }}
                                                                    >
                                                                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                                                            <Box
                                                                                sx={{
                                                                                    width: 30,
                                                                                    height: 30,
                                                                                    borderRadius: "50%",
                                                                                    bgcolor: "#2563eb",
                                                                                    color: "#ffffff",
                                                                                    fontWeight: 600,
                                                                                    fontSize: 12,
                                                                                    display: "flex",
                                                                                    alignItems: "center",
                                                                                    justifyContent: "center",
                                                                                    boxShadow: "0 6px 14px rgba(37, 99, 235, 0.35)",
                                                                                }}
                                                                            >
                                                                                {stepNumber}
                                                                            </Box>
                                                                            {!isLast ? (
                                                                                <Box
                                                                                    sx={{
                                                                                        width: "2px",
                                                                                        flex: 1,
                                                                                        borderRadius: 999,
                                                                                        bgcolor: "rgba(148, 163, 184, 0.45)",
                                                                                        mt: 0.5,
                                                                                        mb: -0.2,
                                                                                    }}
                                                                                />
                                                                            ) : null}
                                                                        </Box>
                                                                        <Box
                                                                            sx={{
                                                                                pt: 0.15,
                                                                                minWidth: 0,
                                                                                px: 0.2,
                                                                                py: 0.45,
                                                                            }}
                                                                        >
                                                                            <Typography sx={{ color: "#0f172a", fontWeight: 600, lineHeight: 1.3, fontSize: 14 }}>
                                                                                {step?.stepName || `Bước ${stepNumber}`}
                                                                            </Typography>
                                                                            <Typography variant="body2" sx={{ color: "#475569", mt: 0.35, lineHeight: 1.45 }}>
                                                                                {step?.description || "Không có mô tả"}
                                                                            </Typography>
                                                                        </Box>
                                                                    </Box>
                                                                );
                                                            })}
                                                        </Stack>
                                                    )}
                                                </Box>
                                            </Box>
                                        );
                                    })
                                )}
                            </Stack>
                        </Box>
                    </Stack>
                ) : null}

            </Stack>
        );
    };

    const renderBusinessTab = () => {
        const businessDisabled = !businessEditing || saving;
        const handleBusinessFieldChange = (field, value) => {
            setBusinessForm((prev) => {
                const next = { ...prev, [field]: value };
                setBusinessErrors(validateBusiness(next));
                return next;
            });
        };
        const moneyField = (label, field) => (
            <Box sx={{ ...settingsFieldCardSx }}>
                <Typography sx={settingsFieldLabelSx}>{label}</Typography>
                <TextField
                    size="small"
                    type="text"
                    fullWidth
                    disabled={businessDisabled}
                    value={formatMoneyVN(businessForm[field])}
                    onChange={(e) => handleBusinessFieldChange(field, sanitizeMoneyInput(e.target.value))}
                    error={Boolean(businessErrors[field])}
                    helperText={businessErrors[field] || ""}
                    inputProps={{ inputMode: "numeric" }}
                    InputProps={{ endAdornment: <InputAdornment position="end">VNĐ</InputAdornment> }}
                    sx={settingsInputSx}
                />
            </Box>
        );
        const integerField = (label, field, unit, allowNegativeOne = false, helperHint = "") => (
            <Box sx={{ ...settingsFieldCardSx }}>
                <Typography sx={settingsFieldLabelSx}>{label}</Typography>
                <TextField
                    size="small"
                    fullWidth
                    type="number"
                    disabled={businessDisabled}
                    value={businessForm[field]}
                    onChange={(e) => handleBusinessFieldChange(field, e.target.value)}
                    error={Boolean(businessErrors[field])}
                    helperText={businessErrors[field] || helperHint}
                    inputProps={{ step: 1, ...(allowNegativeOne ? { min: -1 } : { min: 0 }) }}
                    placeholder={allowNegativeOne && helperHint ? "-1" : ""}
                    InputProps={{ endAdornment: <InputAdornment position="end">{unit}</InputAdornment> }}
                    sx={settingsInputSx}
                />
            </Box>
        );

        return (
            <Box sx={{ width: "100%" }}>
                <Box
                    sx={{
                        border: "1px solid #dbeafe",
                        borderRadius: 2.5,
                        bgcolor: "#ffffff",
                        p: { xs: 1, sm: 1.25 },
                    }}
                >
                    <Tabs
                        value={businessPricingTab}
                        onChange={(_, v) => setBusinessPricingTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            position: "relative",
                            borderBottom: "1px solid rgba(148, 163, 184, 0.35)",
                            mb: 2,
                            minHeight: 42,
                            px: 0.5,
                            "& .MuiTabs-flexContainer": { gap: 0.6 },
                            "& .MuiTabs-scroller": {
                                overflow: "visible !important",
                            },
                            "& .MuiTabs-indicator": {
                                display: "block",
                                height: "100%",
                                top: 0,
                                borderRadius: "14px 14px 0 0",
                                background: "#f8fbff",
                                border: "1px solid rgba(59, 130, 246, 0.35)",
                                borderBottom: "none",
                                boxShadow:
                                    "0 -2px 12px rgba(37, 99, 235, 0.16), 0 0 0 1px rgba(191, 219, 254, 0.7) inset",
                                transition: "all 260ms cubic-bezier(0.4, 0, 0.2, 1)",
                                zIndex: 0,
                            },
                        }}
                    >
                        <Tab
                            label="Cấu hình chung"
                            sx={{
                                textTransform: "none",
                                fontWeight: 600,
                                color: "#475569",
                                borderRadius: "14px 14px 0 0",
                                minHeight: 44,
                                minWidth: 140,
                                px: 2,
                                bgcolor: "transparent",
                                border: "none",
                                transition: "all 0.2s ease",
                                zIndex: 1,
                                "&:hover": {
                                    color: "#2563eb",
                                },
                                "&.Mui-selected": {
                                    color: "#1e293b",
                                    fontWeight: 700,
                                },
                            }}
                        />
                        <Tab
                            label="Cài đặt gói"
                            sx={{
                                textTransform: "none",
                                fontWeight: 600,
                                color: "#475569",
                                borderRadius: "14px 14px 0 0",
                                minHeight: 44,
                                minWidth: 140,
                                px: 2,
                                bgcolor: "transparent",
                                border: "none",
                                transition: "all 0.2s ease",
                                zIndex: 1,
                                "&:hover": {
                                    color: "#2563eb",
                                },
                                "&.Mui-selected": {
                                    color: "#1e293b",
                                    fontWeight: 700,
                                },
                            }}
                        />
                    </Tabs>

                    {businessPricingTab === 0 ? (
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 1.5 }}>
                            <Box sx={{ ...settingsFieldCardSx }}>
                                <Typography sx={settingsFieldLabelSx}>Tỷ lệ thuế (VAT)</Typography>
                                <TextField
                                    size="small"
                                    fullWidth
                                    disabled={businessDisabled}
                                    value={businessForm.taxRatePct}
                                    onChange={(e) => handleBusinessFieldChange("taxRatePct", e.target.value)}
                                    error={Boolean(businessErrors.taxRatePct)}
                                    helperText={businessErrors.taxRatePct || ""}
                                    type="number"
                                    inputProps={{ min: 0, max: 100, step: 0.01 }}
                                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                                    sx={settingsInputSx}
                                />
                            </Box>
                            <Box sx={{ ...settingsFieldCardSx }}>
                                <Typography sx={settingsFieldLabelSx}>Phí dịch vụ hệ thống</Typography>
                                <TextField
                                    size="small"
                                    fullWidth
                                    disabled={businessDisabled}
                                    value={businessForm.serviceRatePct}
                                    onChange={(e) => handleBusinessFieldChange("serviceRatePct", e.target.value)}
                                    error={Boolean(businessErrors.serviceRatePct)}
                                    helperText={businessErrors.serviceRatePct || ""}
                                    type="number"
                                    inputProps={{ min: 0, max: 100, step: 0.01 }}
                                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                                    sx={settingsInputSx}
                                />
                            </Box>
                            {moneyField("Thanh toán tối thiểu", "minPay")}
                            {moneyField("Thanh toán tối đa", "maxPay")}
                        </Box>
                    ) : (
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "240px minmax(0, 1fr)" }, gap: 2 }}>
                            <Tabs
                                orientation="vertical"
                                value={Math.max(0, Math.min(2, businessPricingSubTab))}
                                onChange={(_, v) => setBusinessPricingSubTab(v)}
                                variant="scrollable"
                                sx={{
                                    border: "1px solid #d0d7de",
                                    bgcolor: "#f6f8fa",
                                    borderRadius: 2,
                                    p: 0.75,
                                    minHeight: 240,
                                    "& .MuiTabs-indicator": {
                                        left: 0,
                                        width: 4,
                                        borderRadius: "0 999px 999px 0",
                                        bgcolor: "#2563eb",
                                    },
                                    "& .MuiTab-root": {
                                        alignItems: "flex-start",
                                        textAlign: "left",
                                        textTransform: "none",
                                        fontWeight: 700,
                                        color: "#57606a",
                                        borderRadius: 1.5,
                                        minHeight: 44,
                                        px: 1.25,
                                        "&.Mui-selected": {
                                            color: "#24292f",
                                            bgcolor: "#ffffff",
                                            boxShadow: "inset 0 0 0 1px #d0d7de",
                                        },
                                    },
                                }}
                            >
                                <Tab label="Giá nền gói cước" />
                                <Tab label="Định mức theo gói" />
                                <Tab label="Đơn giá tính năng mua thêm" />
                            </Tabs>
                            <Box sx={{ border: "1px solid #d0d7de", borderRadius: 2, p: 1.25, bgcolor: "#ffffff" }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#2563eb", mb: 1.25 }}>
                                    {businessPricingSubTab === 0 ? "Giá nền gói cước" : businessPricingSubTab === 1 ? "Định mức theo gói" : "Đơn giá tính năng mua thêm"}
                                </Typography>
                                {businessPricingSubTab === 0 ? (
                                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 1.5 }}>
                                        {moneyField("Gói dùng thử", "baseTrialPrice")}
                                        {moneyField("Gói tiêu chuẩn", "baseStandardPrice")}
                                        {moneyField("Gói doanh nghiệp", "baseEnterprisePrice")}
                                    </Box>
                                ) : null}
                                {businessPricingSubTab === 1 ? (
                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                                            gap: 1.5,
                                            alignItems: "stretch",
                                        }}
                                    >
                                        {integerField("Thời hạn gói dùng thử", "durationDays", "ngày")}
                                        <Box sx={{ ...settingsFieldCardSx }}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, mb: 0.75 }}>
                                                <Typography
                                                    component="span"
                                                    sx={{ fontSize: 12, fontWeight: 500, color: "#1d4ed8" }}
                                                >
                                                    Trial được dùng bao nhiêu % so với gói Tiêu chuẩn
                                                </Typography>
                                                <IconButton
                                                    type="button"
                                                    size="small"
                                                    onClick={(e) => setTrialRatioCapInfoAnchor(e.currentTarget)}
                                                    aria-label="Ví dụ: % trial so với gói Tiêu chuẩn"
                                                    sx={{ p: 0.25, color: "#1d4ed8" }}
                                                >
                                                    <InfoOutlinedIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </Box>
                                            <Popover
                                                open={Boolean(trialRatioCapInfoAnchor)}
                                                anchorEl={trialRatioCapInfoAnchor}
                                                onClose={() => setTrialRatioCapInfoAnchor(null)}
                                                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                                                transformOrigin={{ vertical: "top", horizontal: "left" }}
                                                slotProps={{
                                                    paper: {
                                                        sx: {
                                                            minWidth: { xs: "min(92vw, 360px)", sm: 420 },
                                                            maxWidth: { xs: "92vw", sm: 560 },
                                                            p: { xs: 1.75, sm: 2.25 },
                                                            border: "1px solid #e2e8f0",
                                                            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.12)",
                                                        },
                                                    },
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontSize: { xs: 14, sm: 15 },
                                                        lineHeight: 1.55,
                                                        fontWeight: 600,
                                                        color: "#0f172a",
                                                    }}
                                                >
                                                    {TRIAL_RATIO_CAP_INFO_TOOLTIP}
                                                </Typography>
                                            </Popover>
                                            <TextField
                                                size="small"
                                                fullWidth
                                                type="number"
                                                disabled={businessDisabled}
                                                value={businessForm.trialRatioCapPct}
                                                onChange={(e) => handleBusinessFieldChange("trialRatioCapPct", e.target.value)}
                                                error={Boolean(businessErrors.trialRatioCapPct)}
                                                {...(businessErrors.trialRatioCapPct ? { helperText: businessErrors.trialRatioCapPct } : {})}
                                                InputProps={{
                                                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                                }}
                                                inputProps={{ min: 0, max: 100, step: 0.01 }}
                                                sx={settingsInputSx}
                                            />
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    mt: 0.5,
                                                    fontSize: 12,
                                                    lineHeight: 1.45,
                                                    color: "#64748b",
                                                }}
                                            >
                                                {TRIAL_RATIO_CAP_INPUT_HINT}
                                            </Typography>
                                        </Box>
                                        {integerField("Số tư vấn viên (Gói dùng thử)", "trialCounsellor", "người")}
                                        {integerField("Giới hạn bài đăng (Gói dùng thử)", "trialPostLimit", "bài")}
                                        {integerField("Số tư vấn viên (Gói tiêu chuẩn)", "standardCounsellor", "người")}
                                        {integerField("Giới hạn bài đăng (Gói tiêu chuẩn)", "standardPostLimit", "bài")}
                                        {integerField("Số tư vấn viên (Gói doanh nghiệp)", "enterpriseCounsellor", "người")}
                                        {integerField("Giới hạn bài đăng (Gói doanh nghiệp)", "enterprisePostLimit", "bài")}
                                    </Box>
                                ) : null}
                                {businessPricingSubTab === 2 ? (
                                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 1.5 }}>
                                        {moneyField("Phí Chatbot AI (tháng)", "aiChatbotMonthlyFee")}
                                        {moneyField("Phí hỗ trợ ưu tiên", "premiumSupportFee")}
                                    </Box>
                                ) : null}
                            </Box>
                        </Box>
                    )}
                </Box>
            </Box>
        );
    };

    const renderMediaTab = () => {
        const activeFormatType = mediaFormatsTab === 0 ? "image" : "doc";
        const mediaDisabled = !mediaEditing || saving;
        const imgFormats = imgFormatsDraft || [];
        const docFormats = docFormatsDraft || [];

        const list = activeFormatType === "image" ? imgFormats : docFormats;
        const dialogTypeLabel = activeFormatType === "image" ? "ảnh" : "tài liệu";

        const deleteFormatFromDraft = (type, index) => {
            if (type === "image") {
                setImgFormatsDraft((prev) => prev.filter((_, i) => i !== index));
                return;
            }
            setDocFormatsDraft((prev) => prev.filter((_, i) => i !== index));
        };

        return (
            <Box>
                <Box
                    sx={{
                        mb: 2.5,
                        p: { xs: 1.25, sm: 1.5 },
                        borderRadius: 3,
                        border: "1px solid #e2e8f0",
                        bgcolor: "#ffffff",
                        boxShadow: "0 10px 22px rgba(15,23,42,0.05)",
                    }}
                >
                    <Typography sx={{ fontWeight: 800, fontSize: 13, color: "#0f172a", mb: 1.25 }}>
                        Giới hạn kích thước tệp
                    </Typography>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "repeat(2, minmax(0, 1fr))",
                                md: "repeat(2, minmax(0, 1fr))",
                            },
                            gap: 1.5,
                            width: "100%",
                        }}
                    >
                        <Box
                            sx={{
                                ...settingsFieldCardSx,
                            }}
                        >
                            <Typography sx={settingsFieldLabelSx}>
                                Dung lượng ảnh tối đa
                            </Typography>
                            <TextField
                                size="small"
                                fullWidth
                                type="number"
                                disabled={mediaDisabled}
                                value={mediaLimitsForm.maxImgSize}
                                onChange={(e) => {
                                    const nextVal = e.target.value;
                                    setMediaLimitsForm((prev) => {
                                        const next = { ...prev, maxImgSize: nextVal };
                                        setMediaLimitsErrors(validateMediaLimits(next));
                                        return next;
                                    });
                                }}
                                error={Boolean(mediaLimitsErrors.maxImgSize)}
                                helperText={mediaLimitsErrors.maxImgSize || ""}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">MB</InputAdornment>,
                                }}
                                sx={settingsInputSx}
                            />
                        </Box>

                        <Box
                            sx={{
                                ...settingsFieldCardSx,
                            }}
                        >
                            <Typography sx={settingsFieldLabelSx}>
                                Dung lượng tài liệu tối đa
                            </Typography>
                            <TextField
                                size="small"
                                fullWidth
                                type="number"
                                disabled={mediaDisabled}
                                value={mediaLimitsForm.maxDocSize}
                                onChange={(e) => {
                                    const nextVal = e.target.value;
                                    setMediaLimitsForm((prev) => {
                                        const next = { ...prev, maxDocSize: nextVal };
                                        setMediaLimitsErrors(validateMediaLimits(next));
                                        return next;
                                    });
                                }}
                                error={Boolean(mediaLimitsErrors.maxDocSize)}
                                helperText={mediaLimitsErrors.maxDocSize || ""}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">MB</InputAdornment>,
                                }}
                                sx={settingsInputSx}
                            />
                        </Box>
                    </Box>
                </Box>

                <Card
                    elevation={0}
                    sx={{
                        borderRadius: 3,
                        border: "1px solid #e2e8f0",
                        bgcolor: "#ffffff",
                        mb: 2,
                        boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
                    }}
                >
                    <CardContent sx={{ p: 0 }}>
                        <Tabs
                            value={mediaFormatsTab}
                            onChange={(_, v) => setMediaFormatsTab(v)}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                                position: "relative",
                                borderBottom: "1px solid rgba(148, 163, 184, 0.35)",
                                minHeight: 42,
                                px: 0.5,
                                "& .MuiTabs-flexContainer": { gap: 0.6 },
                                "& .MuiTabs-scroller": {
                                    overflow: "visible !important",
                                },
                                "& .MuiTabs-indicator": {
                                    display: "block",
                                    height: "100%",
                                    top: 0,
                                    borderRadius: "14px 14px 0 0",
                                    background: "#f8fbff",
                                    border: "1px solid rgba(59, 130, 246, 0.35)",
                                    borderBottom: "none",
                                    boxShadow:
                                        "0 -2px 12px rgba(37, 99, 235, 0.16), 0 0 0 1px rgba(191, 219, 254, 0.7) inset",
                                    transition: "all 260ms cubic-bezier(0.4, 0, 0.2, 1)",
                                    zIndex: 0,
                                },
                            }}
                        >
                            <Tab
                                label="Định dạng ảnh"
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 600,
                                    color: "#475569",
                                    borderRadius: "14px 14px 0 0",
                                    minHeight: 44,
                                    minWidth: 140,
                                    px: 2,
                                    bgcolor: "transparent",
                                    border: "none",
                                    transition: "all 0.2s ease",
                                    zIndex: 1,
                                    "&:hover": { color: "#2563eb" },
                                    "&.Mui-selected": { color: "#1e293b", fontWeight: 700 },
                                }}
                            />
                            <Tab
                                label="Định dạng tài liệu"
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 600,
                                    color: "#475569",
                                    borderRadius: "14px 14px 0 0",
                                    minHeight: 44,
                                    minWidth: 160,
                                    px: 2,
                                    bgcolor: "transparent",
                                    border: "none",
                                    transition: "all 0.2s ease",
                                    zIndex: 1,
                                    "&:hover": { color: "#2563eb" },
                                    "&.Mui-selected": { color: "#1e293b", fontWeight: 700 },
                                }}
                            />
                        </Tabs>

                        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, gap: 2 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                                    Cấu hình định dạng {dialogTypeLabel} được chấp nhận
                                </Typography>

                                <Button
                                    variant="contained"
                                    onClick={() => openAddFormatDialog(activeFormatType)}
                                    disabled={mediaDisabled}
                                    sx={{
                                        bgcolor: "#0ea5e9",
                                        fontWeight: 700,
                                        borderRadius: 2,
                                        textTransform: "none",
                                        "&:hover": { bgcolor: "#0284c7" },
                                        "&.Mui-disabled": {
                                            bgcolor: "#e2e8f0",
                                            color: "#94a3b8",
                                        },
                                    }}
                                >
                                    + Thêm định dạng
                                </Button>
                            </Box>

                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25, width: "100%" }}>
                                {list.length ? (
                                    list.map((fmt, idx) => {
                                        const displayFmt = normalizeFormatString(fmt);
                                        return (
                                            <Box
                                                key={`${fmt}-${idx}`}
                                                sx={{
                                                    flex: "1 1 220px",
                                                    minWidth: 200,
                                                    border: "1px solid #dbeafe",
                                                    borderRadius: 2.5,
                                                    px: 1.25,
                                                    py: 1,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    bgcolor: "#f8fbff",
                                                    minHeight: 64,
                                                    transition: "all 0.2s ease",
                                                    "&:hover": {
                                                        borderColor: "#93c5fd",
                                                        bgcolor: "#f0f9ff",
                                                        boxShadow: "0 8px 20px rgba(37,99,235,0.12)",
                                                    },
                                                }}
                                            >
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.9, minWidth: 0 }}>
                                                    <Typography
                                                        sx={{
                                                            fontSize: 13,
                                                            fontWeight: 700,
                                                            color: "#0f172a",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {displayFmt}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ display: "flex", gap: 0.25 }}>
                                                    <IconButton
                                                        size="small"
                                                        disabled={mediaDisabled}
                                                        onClick={() =>
                                                            openEditFormatDialog(
                                                                activeFormatType,
                                                                idx,
                                                                fmt
                                                            )
                                                        }
                                                        sx={{
                                                            color: "#64748b",
                                                            "&.Mui-disabled": { color: "#cbd5e1" },
                                                        }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        disabled={mediaDisabled}
                                                        onClick={() =>
                                                            deleteFormatFromDraft(
                                                                activeFormatType,
                                                                idx
                                                            )
                                                        }
                                                        sx={{
                                                            color: "#dc2626",
                                                            "&.Mui-disabled": { color: "#cbd5e1" },
                                                        }}
                                                    >
                                                        <DeleteOutlineIcon fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            </Box>
                                        );
                                    })
                                ) : (
                                    <Box
                                        sx={{
                                            width: "100%",
                                            borderRadius: 2,
                                            border: "1px dashed #cbd5e1",
                                            bgcolor: "#f8fafc",
                                            py: 2.5,
                                            px: 1.5,
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 600 }}>
                                            Chưa có định dạng nào. Hãy thêm định dạng đầu tiên cho {dialogTypeLabel}.
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                        </Box>
                    </CardContent>
                </Card>

                <Dialog
                    open={formatDialogOpen}
                    onClose={closeFormatDialog}
                    fullWidth
                    maxWidth="sm"
                    PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}
                >
                    <DialogTitle
                        sx={{
                            fontWeight: 900,
                            color: "#0f172a",
                            background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 48%, #93c5fd 100%)",
                            borderBottom: "1px solid #93c5fd",
                        }}
                    >
                        {formatDialogMode === "add" ? "Thêm" : "Sửa"} định dạng{" "}
                        {formatDialogType === "image" ? "ảnh" : "tài liệu"}
                    </DialogTitle>
                    <DialogContent sx={{ bgcolor: "#eff6ff" }}>
                        <TextField
                            label="Định dạng (ví dụ: .jpg)"
                            fullWidth
                            size="small"
                            value={formatDialogValue}
                            onChange={(e) => {
                                setFormatDialogValue(e.target.value);
                                if (formatDialogError) setFormatDialogError("");
                            }}
                            error={Boolean(formatDialogError)}
                            helperText={formatDialogError || "Bạn có thể nhập 'jpg' hoặc '.jpg'."}
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={closeFormatDialog} variant="outlined" sx={cancelButtonSx}>
                            Hủy
                        </Button>
                        <Button onClick={() => submitFormatDialog()} variant="contained" sx={saveButtonSx}>
                            Lưu
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    };

    const renderLimitsTab = () => {
        const quota = getAdmissionQuotaMap(configBody);
        const quotaYears = Object.keys(quota);
        const selectedYear = selectedQuotaYear || quotaYears[0] || "";
        const isEditing = quotaEditing;
        const quotaPreviewGroups = quotaYears
            .map((yearKey) => {
                const item = quota[yearKey] || {};
                const source = item?.source && typeof item.source === "object" ? item.source : {};
                const rows = Array.isArray(item?.quotas)
                    ? item.quotas
                        .map((row) => ({
                            schoolId: Number(row?.schoolId),
                            schoolName: String(row?.schoolName ?? "").trim(),
                            value: Number(row?.value),
                        }))
                        .filter((row) => Number.isFinite(row.schoolId))
                    : [];
                return {
                    yearKey,
                    source,
                    rows,
                };
            })
            .sort((a, b) => String(b.source?.year ?? b.yearKey).localeCompare(String(a.source?.year ?? a.yearKey)));
        const quotaFieldSx = {
            "& .MuiInputBase-input": {
                color: "#0f172a",
            },
            "& .MuiInputBase-input.Mui-disabled": {
                WebkitTextFillColor: "#0f172a",
                color: "#0f172a",
            },
            "& .MuiFormHelperText-root": {
                color: "#334155",
            },
        };

        return (
            <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#1d4ed8", px: { xs: 0.5, md: 1 } }}>
                        Dữ liệu hạn mức hiện tại
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={startQuotaAdd}
                        disabled={saving}
                        sx={cancelButtonSx}
                    >
                        Thêm năm học
                    </Button>
                </Box>

                <Box sx={{ px: { xs: 0.5, md: 1 } }}>
                    <Box
                        sx={{
                            border: "1px solid #bfdbfe",
                            borderRadius: 3,
                            p: { xs: 1.5, sm: 2 },
                            bgcolor: "#f8fbff",
                            backgroundImage: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
                            boxShadow: "0 10px 24px rgba(37, 99, 235, 0.08)",
                            mb: 1.75,
                        }}
                    >
                        {quotaPreviewGroups.length ? (
                            <Stack spacing={1}>
                                {quotaPreviewGroups.map((group) => {
                                    const sourceInfo = group.source || {};
                                    const quotaRows = group.rows || [];
                                    const yearLabel = sourceInfo?.year || group.yearKey;
                                    return (
                                        <Box
                                            key={`preview-group-${yearLabel}`}
                                            sx={{
                                                p: 1.2,
                                                bgcolor: "transparent",
                                            }}
                                        >
                                            <Typography sx={{ fontWeight: 800, color: "#1d4ed8", fontSize: 13, mb: 0.8 }}>
                                                Năm học {yearLabel}
                                            </Typography>
                                            <Stack spacing={0.55} sx={{ mb: 0.95 }}>
                                                <Box sx={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 1.5 }}>
                                                    <Typography variant="body2" sx={{ color: "#334155", fontWeight: 700 }}>
                                                        Tên nguồn
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: "#0f172a" }}>
                                                        {sourceInfo?.sourceName || "Chưa có"}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 1.5 }}>
                                                    <Typography variant="body2" sx={{ color: "#334155", fontWeight: 700 }}>
                                                        Loại nguồn
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: "#0f172a" }}>
                                                        {sourceInfo?.sourceType || "Chưa có"}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 1.5 }}>
                                                    <Typography variant="body2" sx={{ color: "#334155", fontWeight: 700 }}>
                                                        Liên kết
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: "#0f172a", wordBreak: "break-all" }}>
                                                        {sourceInfo?.sourceUrl ? (
                                                            <Link
                                                                href={sourceInfo.sourceUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                sx={{
                                                                    color: "#2563eb",
                                                                    textDecorationColor: "#93c5fd",
                                                                    textUnderlineOffset: "2px",
                                                                }}
                                                            >
                                                                {sourceInfo.sourceUrl}
                                                            </Link>
                                                        ) : (
                                                            "Chưa có"
                                                        )}
                                                    </Typography>
                                                </Box>
                                            </Stack>

                                            <Box sx={{ border: "1px solid #dbeafe", borderRadius: 1.5, overflow: "hidden", bgcolor: "#ffffff" }}>
                                                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 96px", px: 1.1, py: 0.8, bgcolor: "#eff6ff" }}>
                                                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#475569" }}>
                                                        Trường
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#475569", textAlign: "right" }}>
                                                        Chỉ tiêu
                                                    </Typography>
                                                </Box>
                                                {quotaRows.length ? (
                                                    <Stack spacing={0} divider={<Box sx={{ borderBottom: "1px solid #e2e8f0" }} />}>
                                                        {quotaRows.map((row) => (
                                                            <Box
                                                                key={`quota-preview-${yearLabel}-${row.schoolId}`}
                                                                sx={{
                                                                    display: "grid",
                                                                    gridTemplateColumns: "1fr 96px",
                                                                    gap: 1,
                                                                    px: 1.1,
                                                                    py: 0.85,
                                                                }}
                                                            >
                                                                <Typography variant="body2" sx={{ color: "#0f172a" }}>
                                                                    {row.schoolName || `Trường #${row.schoolId}`}
                                                                </Typography>
                                                                <Typography variant="body2" sx={{ color: "#1d4ed8", fontWeight: 700, textAlign: "right" }}>
                                                                    {Number.isFinite(row.value) ? row.value : "Chưa có"}
                                                                </Typography>
                                                            </Box>
                                                        ))}
                                                    </Stack>
                                                ) : (
                                                    <Typography variant="body2" sx={{ color: "#64748b", px: 1.1, py: 1 }}>
                                                        Chưa có chỉ tiêu đã lưu.
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        ) : (
                            <Typography variant="body2" sx={{ color: "#64748b" }}>
                                Chưa có dữ liệu hạn mức tuyển sinh.
                            </Typography>
                        )}
                    </Box>

                        <Dialog
                            open={isEditing}
                            onClose={cancelQuotaEdit}
                            fullWidth
                            maxWidth="md"
                            PaperProps={{
                                sx: {
                                    borderRadius: 3,
                                    border: "1px solid #dbeafe",
                                    overflow: "hidden",
                                },
                            }}
                        >
                            <DialogTitle
                                sx={{
                                    fontWeight: 800,
                                    color: "#0f172a",
                                    borderBottom: "1px solid #dbeafe",
                                    background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 100%)",
                                }}
                            >
                                {quotaMode === "add"
                                    ? "Thêm năm học mới"
                                    : `Cập nhật nguồn dữ liệu – Năm học ${selectedYear}`}
                            </DialogTitle>
                            <DialogContent sx={{ pt: 2, bgcolor: "#f8fafc" }}>
                                <Box
                                    sx={{
                                        border: "1px solid #dbeafe",
                                        borderRadius: 2.5,
                                        bgcolor: "#ffffff",
                                        p: { xs: 1.5, sm: 2 },
                                        mb: 2,
                                    }}
                                >
                                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#1d4ed8", mb: 1.25 }}>
                                        Thông tin nguồn dữ liệu
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                                            gap: 1.25,
                                        }}
                                    >
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Năm học"
                                            disabled={saving || quotaMode !== "add"}
                                            value={quotaForm.year}
                                            onChange={(e) => {
                                                const next = { ...quotaForm, year: e.target.value };
                                                setQuotaForm(next);
                                                setQuotaErrors(validateQuota(next));
                                            }}
                                            error={Boolean(quotaErrors.year)}
                                            helperText={quotaErrors.year || " "}
                                            sx={quotaFieldSx}
                                        />
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Loại nguồn"
                                            disabled
                                            value="TRANG TIN TỨC"
                                            helperText="Loại nguồn cố định."
                                            sx={quotaFieldSx}
                                        />
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Tên nguồn"
                                            disabled={saving}
                                            value={quotaForm.sourceName}
                                            multiline
                                            minRows={2}
                                            onChange={(e) => {
                                                const next = { ...quotaForm, sourceName: e.target.value };
                                                setQuotaForm(next);
                                                setQuotaErrors(validateQuota(next));
                                            }}
                                            error={Boolean(quotaErrors.sourceName)}
                                            helperText={quotaErrors.sourceName || " "}
                                            sx={[
                                                quotaFieldSx,
                                                {
                                                    "& .MuiInputBase-root": {
                                                        minHeight: 72,
                                                        alignItems: "flex-start",
                                                    },
                                                },
                                            ]}
                                        />
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Liên kết nguồn dữ liệu"
                                            disabled={saving}
                                            value={quotaForm.sourceUrl}
                                            multiline
                                            minRows={2}
                                            onChange={(e) => {
                                                const next = { ...quotaForm, sourceUrl: e.target.value };
                                                setQuotaForm(next);
                                                setQuotaErrors(validateQuota(next));
                                            }}
                                            error={Boolean(quotaErrors.sourceUrl)}
                                            helperText={quotaErrors.sourceUrl || "Chỉ nhận liên kết file .html"}
                                            sx={[
                                                quotaFieldSx,
                                                {
                                                    "& .MuiInputBase-root": {
                                                        minHeight: 72,
                                                        alignItems: "flex-start",
                                                    },
                                                },
                                            ]}
                                        />
                                    </Box>
                                </Box>

                                <Box
                                    sx={{
                                        border: "1px solid #dbeafe",
                                        borderRadius: 2.5,
                                        bgcolor: "#ffffff",
                                        p: { xs: 1.5, sm: 2 },
                                    }}
                                >
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }}>
                                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#1d4ed8" }}>
                                            Danh sách chỉ tiêu
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            disabled={saving || autoFillingQuota}
                                            onClick={() => void autoFillQuotaByAI()}
                                            sx={{
                                                textTransform: "none",
                                                fontWeight: 700,
                                                borderRadius: 2,
                                                borderColor: "#93c5fd",
                                                color: "#1d4ed8",
                                                bgcolor: "#f8fbff",
                                            }}
                                        >
                                            {autoFillingQuota ? "Đang tự động điền..." : "✨ Tự động điền bằng AI"}
                                        </Button>
                                    </Stack>
                                    <Stack spacing={1.1}>
                                        {loadingSchools ? (
                                            <Typography variant="body2" sx={{ color: "#64748b" }}>
                                                Đang tải danh sách trường...
                                            </Typography>
                                        ) : (quotaForm.quotas || []).length === 0 ? (
                                            <Typography variant="body2" sx={{ color: "#64748b" }}>
                                                Chưa có dòng chỉ tiêu.
                                            </Typography>
                                        ) : (quotaForm.quotas || []).map((row) => (
                                            <Box
                                                key={row.id}
                                                sx={{
                                                    display: "grid",
                                                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                                                    gap: 1,
                                                    alignItems: "center",
                                                    p: 1.1,
                                                    borderRadius: 2,
                                                    border: "1px solid #e2e8f0",
                                                    bgcolor: "#f8fbff",
                                                }}
                                            >
                                                <TextField
                                                    size="small"
                                                    label="Trường"
                                                    disabled
                                                    multiline
                                                    minRows={2}
                                                    value={row.schoolName || `Trường #${row.schoolId}`}
                                                    InputProps={{
                                                        sx: { alignItems: "flex-start" },
                                                    }}
                                                    sx={[
                                                        quotaFieldSx,
                                                        {
                                                            "& .MuiInputBase-root": {
                                                                minHeight: 72,
                                                            },
                                                        },
                                                    ]}
                                                />
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    label="Chỉ tiêu"
                                                    disabled={saving}
                                                    value={row.value}
                                                    onChange={(e) => {
                                                        const nextValue = e.target.value;
                                                        setQuotaForm((prev) => {
                                                            const nextRows = (prev.quotas || []).map((r) =>
                                                                r.id === row.id ? { ...r, value: nextValue } : r
                                                            );
                                                            const next = { ...prev, quotas: nextRows };
                                                            setQuotaErrors(validateQuota(next));
                                                            return next;
                                                        });
                                                    }}
                                                    error={Boolean(quotaErrors[`quotaValue:${row.id}`])}
                                                    helperText={quotaErrors[`quotaValue:${row.id}`] || ""}
                                                    inputProps={{ min: 0, step: 1 }}
                                                    sx={[
                                                        quotaFieldSx,
                                                        {
                                                            "& .MuiInputBase-root": {
                                                                minHeight: 72,
                                                            },
                                                        },
                                                    ]}
                                                />
                                            </Box>
                                        ))}
                                    </Stack>
                                </Box>
                            </DialogContent>
                            <DialogActions sx={{ px: 3, pb: 2 }}>
                                <Button
                                    onClick={cancelQuotaEdit}
                                    variant="outlined"
                                    disabled={saving}
                                    sx={cancelButtonSx}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    onClick={() => void saveQuotaEdit()}
                                    variant="contained"
                                    disabled={saving || Object.keys(quotaErrors).length > 0}
                                    sx={saveButtonSx}
                                >
                                    Lưu
                                </Button>
                            </DialogActions>
                        </Dialog>

                        {activeTabKey === "limits" && status.message ? (
                            <Alert severity={status.type || "success"} sx={{ mt: 2 }}>
                                {status.message}
                            </Alert>
                        ) : null}
                </Box>
            </Box>
        );
    };

    return (
        <Box
            sx={{
                p: { xs: 1, md: 2 },
                borderRadius: 4,
                bgcolor: "#ffffff",
                color: "#1e293b",
                width: "100%",
            }}
        >
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3.5,
                    mb: 2.5,
                    color: "white",
                    background:
                        "linear-gradient(95deg, #60a5fa 0%, #818cf8 46%, #a78bfa 100%)",
                    boxShadow: "0 12px 24px rgba(99, 102, 241, 0.2)",
                }}
            >
                <CardContent sx={{ p: { xs: 1.5, md: 1.9 }, "&:last-child": { pb: { xs: 1.5, md: 1.9 } } }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Avatar
                                sx={{
                                    bgcolor: alpha("#ffffff", 0.28),
                                    color: "white",
                                    width: 34,
                                    height: 34,
                                    border: "1px solid rgba(255,255,255,0.45)",
                                }}
                            >
                                <SettingsOutlinedIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, textShadow: "0 1px 2px rgba(15,23,42,0.24)" }}>
                                    Cài đặt nền tảng
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 1, mt: 0.3, fontSize: 13, fontWeight: 500, textShadow: "0 1px 2px rgba(15,23,42,0.2)" }}>
                                    Cấu hình các thiết lập toàn hệ thống và hành vi nền tảng.
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <Paper
                variant="outlined"
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    bgcolor: "#ffffff",
                    p: { xs: 1.5, md: 2 },
                    width: "100%",
                    boxSizing: "border-box",
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <SettingsOutlinedIcon sx={{ color: "#38bdf8", fontSize: 20 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a" }}>
                        Cấu hình nền tảng
                    </Typography>
                </Stack>

                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        position: "relative",
                        minHeight: 42,
                        px: 0.5,
                        borderBottom: "1px solid rgba(148, 163, 184, 0.35)",
                        "& .MuiTabs-flexContainer": { gap: 0.6 },
                        "& .MuiTabs-scroller": {
                            overflow: "visible !important",
                        },
                        "& .MuiTabs-indicator": {
                            display: "block",
                            height: "100%",
                            top: 0,
                            borderRadius: "14px 14px 0 0",
                            background: "#f8fbff",
                            border: "1px solid rgba(59, 130, 246, 0.35)",
                            borderBottom: "none",
                            boxShadow:
                                "0 -2px 12px rgba(37, 99, 235, 0.16), 0 0 0 1px rgba(191, 219, 254, 0.7) inset",
                            transition: "all 260ms cubic-bezier(0.4, 0, 0.2, 1)",
                            zIndex: 0,
                        },
                        mb: 2,
                    }}
                >
                    {tabs.map((t) => (
                        <Tab
                            key={t.key}
                            label={t.label}
                            sx={{
                                textTransform: "none",
                                fontWeight: 600,
                                color: "#475569",
                                borderRadius: "14px 14px 0 0",
                                minHeight: 44,
                                minWidth: 140,
                                px: 2,
                                bgcolor: "transparent",
                                border: "none",
                                transition: "all 0.2s ease",
                                zIndex: 1,
                                "&:hover": {
                                    color: "#2563eb",
                                },
                                fontSize: 13,
                                "&.Mui-selected": {
                                    color: "#1e293b",
                                    fontWeight: 700,
                                },
                            }}
                        />
                    ))}
                </Tabs>

                <Box sx={{ pt: 1 }}>
                    {loadingConfig && !configBody ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            {activeTabKey === "business" ? renderBusinessTab() : null}
                            {activeTabKey === "admission" ? renderAdmissionTab() : null}
                            {activeTabKey === "media" ? renderMediaTab() : null}
                            {activeTabKey === "limits" ? renderLimitsTab() : null}

                            {activeTabKey === "admission" ? (
                                <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end", gap: 1 }}>
                                    {admissionTemplateEditing ? (
                                        <>
                                            <Button
                                                variant="outlined"
                                                onClick={() => {
                                                    cancelAdmissionTemplate();
                                                    setAdmissionTemplateEditing(false);
                                                }}
                                                disabled={saving}
                                                sx={cancelButtonSx}
                                            >
                                                Hủy
                                            </Button>
                                            <Button
                                                variant="contained"
                                                disabled={saving}
                                                onClick={() => void saveAdmissionTemplate()}
                                                sx={saveButtonSx}
                                            >
                                                Lưu
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            variant="outlined"
                                            onClick={() => setAdmissionTemplateEditing(true)}
                                            disabled={saving}
                                            sx={cancelButtonSx}
                                        >
                                            Chỉnh sửa
                                        </Button>
                                    )}
                                </Box>
                            ) : null}

                            {activeTabKey === "business" ? (
                                <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end", gap: 1 }}>
                                    {businessEditing ? (
                                        <>
                                            <Button variant="outlined" onClick={cancelBusinessEdit} disabled={saving} sx={cancelButtonSx}>
                                                Hủy
                                            </Button>
                                            <Button
                                                variant="contained"
                                                disabled={saving || Object.keys(businessErrors).length > 0}
                                                onClick={() => void saveBusinessEdit()}
                                                sx={saveButtonSx}
                                            >
                                                Lưu
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            variant="outlined"
                                            onClick={startBusinessEdit}
                                            disabled={saving}
                                            sx={cancelButtonSx}
                                        >
                                            Chỉnh sửa
                                        </Button>
                                    )}
                                </Box>
                            ) : null}

                            {activeTabKey === "media" ? (
                                <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end", gap: 1 }}>
                                    {mediaEditing ? (
                                        <>
                                            <Button variant="outlined" onClick={cancelMediaEdit} disabled={saving} sx={cancelButtonSx}>
                                                Hủy
                                            </Button>
                                            <Button
                                                variant="contained"
                                                disabled={saving}
                                                onClick={() => void saveMediaEdit()}
                                                sx={saveButtonSx}
                                            >
                                                Lưu
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            variant="outlined"
                                            onClick={startMediaEdit}
                                            disabled={saving}
                                            sx={cancelButtonSx}
                                        >
                                            Chỉnh sửa
                                        </Button>
                                    )}
                                </Box>
                            ) : null}

                            {activeTabKey === "business" && (status.message || status.workflowNote) ? (
                                <Alert severity={status.type || "success"} sx={{ mt: 2 }}>
                                    {status.message ? (
                                        <Typography sx={{ fontWeight: 700, mb: status.workflowNote ? 1 : 0 }}>{status.message}</Typography>
                                    ) : null}
                                    {status.workflowNote ? (
                                        <Box component="div">
                                            {String(status.workflowNote)
                                                .split("\n")
                                                .map((line) => line.trim())
                                                .filter(Boolean)
                                                .map((line, idx) => (
                                                    <Typography key={idx} variant="body2" sx={{ color: "#334155", mb: 0.5, lineHeight: 1.5 }}>
                                                        {line}
                                                    </Typography>
                                                ))}
                                        </Box>
                                    ) : null}
                                </Alert>
                            ) : null}

                            {activeTabKey === "admission" && status.message ? (
                                <Alert severity={status.type || "success"} sx={{ mt: 2 }}>
                                    {status.message}
                                </Alert>
                            ) : null}

                            {activeTabKey === "media" && status.message ? (
                                <Alert severity={status.type || "success"} sx={{ mt: 2 }}>
                                    {status.message}
                                </Alert>
                            ) : null}
                        </>
                    )}
                </Box>
            </Paper>

            <Dialog
                open={admissionImportConfirmOpen}
                onClose={() => {
                    if (!confirmingAdmissionImport) setAdmissionImportConfirmOpen(false);
                }}
                fullWidth
                maxWidth="xs"
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        border: "1px solid #dbeafe",
                    },
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#0f172a" }}>Xác nhận nhập dữ liệu</DialogTitle>
                <DialogContent sx={{ pt: "8px !important" }}>
                    <Typography variant="body2" sx={{ color: "#334155" }}>
                        Bạn có chắc muốn nhập dữ liệu cho loại{" "}
                        <strong>{IMPORT_TYPE_LABEL[importType] || importType}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button
                        variant="outlined"
                        disabled={confirmingAdmissionImport}
                        onClick={() => setAdmissionImportConfirmOpen(false)}
                        sx={cancelButtonSx}
                    >
                        Không
                    </Button>
                    <Button
                        variant="contained"
                        disabled={confirmingAdmissionImport}
                        onClick={() => void handleConfirmAdmissionImport()}
                        sx={saveButtonSx}
                    >
                        {confirmingAdmissionImport ? "Đang xử lý..." : "Có, xác nhận nhập"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

