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
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
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
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import AddIcon from "@mui/icons-material/Add";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { getSystemConfig, updateSystemConfig } from "../../../services/SystemConfigService.jsx";
import { autoFillAdminSchoolQuotas } from "../../../services/AdminService.jsx";
import { getPublicSchoolList } from "../../../services/SchoolPublicService.jsx";
import { enqueueSnackbar } from "notistack";
import { sanitizeAdmissionSettingsForApi } from "../../../utils/admissionSettingsShared.js";

/** Hạn mức theo năm học: đọc đúng key BE trả là `admissionQuota`. */
function getAdmissionQuotaMap(cfg) {
    if (!cfg || typeof cfg !== "object") return {};
    const raw = cfg.admissionQuota;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

    // Shape mới: admissionQuota = { source: {...}, quotas: [...] }
    if (raw.source || Array.isArray(raw.quotas)) {
        const year = String(raw?.source?.year ?? "").trim();
        const key = year || "current";
        return { [key]: raw };
    }

    // Shape cũ: admissionQuota = { "2025": {...}, "2026": {...} }
    return raw;
}

function getBusinessConfig(cfg) {
    if (!cfg || typeof cfg !== "object") return {};
    return cfg.businessData ?? cfg.business ?? {};
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

export default function AdminPlatformSettings() {
    const tabs = useMemo(
        () => [
            { label: "Cài đặt Doanh nghiệp", key: "business" },
            { label: "Tuyển sinh (mẫu chung)", key: "admission" },
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
    const [status, setStatus] = useState({ type: "", message: "" });

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
            extraCounsellorFeePerSlot: featureUnitPrices.extraCounsellorFeePerSlot == null ? "" : String(featureUnitPrices.extraCounsellorFeePerSlot),
            extraPostFee: featureUnitPrices.extraPostFee == null ? "" : String(featureUnitPrices.extraPostFee),
            aiChatbotMonthlyFee: featureUnitPrices.aiChatbotMonthlyFee == null ? "" : String(featureUnitPrices.aiChatbotMonthlyFee),
            premiumSupportFee: featureUnitPrices.premiumSupportFee == null ? "" : String(featureUnitPrices.premiumSupportFee),
            topRankingFee: featureUnitPrices.topRankingFee == null ? "" : String(featureUnitPrices.topRankingFee),
            durationDays: packageQuotas.durationDays == null ? "" : String(packageQuotas.durationDays),
            trialCounsellor: packageQuotas.trialCounsellor == null ? "" : String(packageQuotas.trialCounsellor),
            standardCounsellor: packageQuotas.standardCounsellor == null ? "" : String(packageQuotas.standardCounsellor),
            enterpriseCounsellor: packageQuotas.enterpriseCounsellor == null ? "" : String(packageQuotas.enterpriseCounsellor),
            trialPostLimit: packageQuotas.trialPostLimit == null ? "" : String(packageQuotas.trialPostLimit),
            standardPostLimit: packageQuotas.standardPostLimit == null ? "" : String(packageQuotas.standardPostLimit),
            enterprisePostLimit: packageQuotas.enterprisePostLimit == null ? "" : String(packageQuotas.enterprisePostLimit),
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
        extraCounsellorFeePerSlot: "",
        extraPostFee: "",
        aiChatbotMonthlyFee: "",
        premiumSupportFee: "",
        topRankingFee: "",
        durationDays: "",
        trialCounsellor: "",
        standardCounsellor: "",
        enterpriseCounsellor: "",
        trialPostLimit: "",
        standardPostLimit: "",
        enterprisePostLimit: "",
    });
    const [businessErrors, setBusinessErrors] = useState({});
    const [businessPricingTab, setBusinessPricingTab] = useState(0);
    const [businessPricingSubTab, setBusinessPricingSubTab] = useState(0);

    const [businessEditing, setBusinessEditing] = useState(false);

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
        autoCloseOnFull: true,
        quotaAlertThresholdPercent: 90,
    });
    const [admissionTemplateEditing, setAdmissionTemplateEditing] = useState(false);

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

        getMoney("baseTrialPrice", "Giá nền gói Trial");
        getMoney("baseStandardPrice", "Giá nền gói Standard");
        getMoney("baseEnterprisePrice", "Giá nền gói Enterprise");
        getMoney("extraCounsellorFeePerSlot", "Đơn giá mua thêm tư vấn viên");
        getMoney("extraPostFee", "Phí mua thêm bài đăng");
        getMoney("aiChatbotMonthlyFee", "Phí duy trì Trợ lý AI");
        getMoney("premiumSupportFee", "Phí hỗ trợ cao cấp");
        getMoney("topRankingFee", "Phí đẩy Top tìm kiếm");
        getPositiveInt("durationDays", "Thời hạn gói mặc định");
        getPositiveInt("trialCounsellor", "Số tư vấn viên gói Trial");
        getPositiveInt("standardCounsellor", "Số tư vấn viên gói Standard");
        getPositiveInt("enterpriseCounsellor", "Số tư vấn viên gói Enterprise");
        getPositiveInt("trialPostLimit", "Giới hạn bài đăng gói Trial");
        getPositiveInt("standardPostLimit", "Giới hạn bài đăng gói Standard");
        getPositiveInt("enterprisePostLimit", "Giới hạn bài đăng gói Enterprise", { allowNegativeOne: true });

        return errors;
    };

    const getAdmissionInitialForm = (cfg) => {
        const adm = cfg?.admissionSettingsData;
        if (!adm || typeof adm !== "object") {
            return { allowedMethods: [], autoCloseOnFull: true, quotaAlertThresholdPercent: 90 };
        }
        return {
            allowedMethods: Array.isArray(adm.allowedMethods)
                ? adm.allowedMethods.map((m) => ({
                      code: m?.code != null ? String(m.code) : "",
                      displayName: m?.displayName != null ? String(m.displayName) : "",
                      description: m?.description != null ? String(m.description) : "",
                  }))
                : [],
            autoCloseOnFull: typeof adm.autoCloseOnFull === "boolean" ? adm.autoCloseOnFull : true,
            quotaAlertThresholdPercent:
                adm.quotaAlertThresholdPercent != null && !Number.isNaN(Number(adm.quotaAlertThresholdPercent))
                    ? Number(adm.quotaAlertThresholdPercent)
                    : 90,
        };
    };

    const fetchConfig = async () => {
        setLoadingConfig(true);
        try {
            const res = await getSystemConfig();
            const body = res?.data?.body ?? res?.data;
            setConfigBody(body);
            setStatus({ type: "", message: "" });
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
                        // Ưu tiên đúng payload /school/public/list: { id, name }
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
        setAdmissionTemplateEditing(false);
    }, [configBody]);

    useEffect(() => {
        if (activeTabKey !== "business") setBusinessEditing(false);
        if (activeTabKey !== "media") setMediaEditing(false);
        if (activeTabKey !== "limits") setQuotaEditing(false);
        if (activeTabKey !== "admission") setAdmissionTemplateEditing(false);
    }, [activeTabKey]);

    useEffect(() => {
        if (mediaFormatsTab > 1) setMediaFormatsTab(0);
    }, [mediaFormatsTab]);

    const cancelBusiness = () => {
        if (!configBody) return;
        const bizInit = getBusinessInitialForm(configBody);
        setBusinessForm(bizInit);
        setBusinessErrors(validateBusiness(bizInit));
        setStatus({ type: "", message: "" });
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
        if (quotaMode === "add" && year) {
            const quotaMap = getAdmissionQuotaMap(configBody);
            if (Object.prototype.hasOwnProperty.call(quotaMap, year)) {
                errors.year = "Năm học này đã tồn tại.";
            }
        }
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
        setStatus({ type: "", message: "" });
        try {
            const prevBusiness = getBusinessConfig(configBody);
            const minPay = parseFinite(businessForm.minPay);
            const maxPay = parseFinite(businessForm.maxPay);
            const taxRate = toRateDecimal(businessForm.taxRatePct);
            const serviceRate = toRateDecimal(businessForm.serviceRatePct);

            const updatedBody = {
                businessData: {
                    ...prevBusiness,
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
                            extraCounsellorFeePerSlot: Math.trunc(parseFinite(businessForm.extraCounsellorFeePerSlot) ?? 0),
                            extraPostFee: Math.trunc(parseFinite(businessForm.extraPostFee) ?? 0),
                            aiChatbotMonthlyFee: Math.trunc(parseFinite(businessForm.aiChatbotMonthlyFee) ?? 0),
                            premiumSupportFee: Math.trunc(parseFinite(businessForm.premiumSupportFee) ?? 0),
                            topRankingFee: Math.trunc(parseFinite(businessForm.topRankingFee) ?? 0),
                        },
                        packageQuotas: {
                            durationDays: Math.trunc(parseFinite(businessForm.durationDays) ?? 0),
                            trialCounsellor: Math.trunc(parseFinite(businessForm.trialCounsellor) ?? 0),
                            standardCounsellor: Math.trunc(parseFinite(businessForm.standardCounsellor) ?? 0),
                            enterpriseCounsellor: Math.trunc(parseFinite(businessForm.enterpriseCounsellor) ?? 0),
                            trialPostLimit: Math.trunc(parseFinite(businessForm.trialPostLimit) ?? 0),
                            standardPostLimit: Math.trunc(parseFinite(businessForm.standardPostLimit) ?? 0),
                            enterprisePostLimit: Math.trunc(parseFinite(businessForm.enterprisePostLimit) ?? -1),
                        },
                    },
                },
            };

            const updateRes = await updateSystemConfig(updatedBody);
            assertSystemConfigUpdateSuccess(updateRes);
            enqueueSnackbar("Cập nhật Cài đặt Doanh nghiệp thành công.", { variant: "success" });
            setStatus({ type: "success", message: "Cập nhật thành công." });
            await fetchConfig();
            ok = true;
        } catch (e) {
            console.error("saveBusiness failed", e);
            const msg = apiErrorMessage(e, "Cập nhật thất bại. Vui lòng thử lại.");
            enqueueSnackbar(msg, { variant: "error" });
            setStatus({ type: "error", message: msg });
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
        const pct = Number(admissionTemplateForm.quotaAlertThresholdPercent ?? 0);
        if (Number.isNaN(pct) || pct < 0 || pct > 100) {
            enqueueSnackbar("Ngưỡng cảnh báo phải từ 0 đến 100.", { variant: "error" });
            return;
        }
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

    const renderAdmissionTab = () => {
        const rowDisabled = !admissionTemplateEditing || saving;
        const methods = admissionTemplateForm.allowedMethods || [];
        const admissionInputSx = {
            "& .MuiOutlinedInput-root": {
                borderRadius: 1.75,
                bgcolor: "#ffffff",
                "& fieldset": { borderColor: "#d1d5db" },
                "&:hover fieldset": { borderColor: "#94a3b8" },
                "&.Mui-focused fieldset": { borderColor: "#64748b" },
            },
        };

        return (
            <Stack spacing={2.5} sx={{ width: "100%" }}>
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 2,
                        border: "1px solid #e2e8f0",
                        overflow: "hidden",
                    }}
                >
                    <Box
                        sx={{
                            px: 2,
                            py: 1.1,
                            borderBottom: "1px solid",
                            borderColor: "#e2e8f0",
                            bgcolor: "#f8fafc",
                        }}
                    >
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#111827" }}>
                            Danh sách phương thức
                        </Typography>
                    </Box>
                    <TableContainer sx={{ maxWidth: "100%" }}>
                        <Table size="small" sx={{ minWidth: 800, tableLayout: "fixed" }}>
                            <TableHead>
                                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                    <TableCell sx={{ fontWeight: 700, color: "#374151", width: "28%", minWidth: 220, py: 1.2 }}>
                                        Mã (code)
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#374151", width: "28%", minWidth: 180, py: 1.2 }}>
                                        Tên hiển thị
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#374151", py: 1.2 }}>Mô tả</TableCell>
                                    <TableCell align="center" sx={{ width: 52, py: 1.2 }} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {methods.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} sx={{ py: 4, textAlign: "center", border: 0 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Chưa có phương thức. Nhấn <strong>Thêm phương thức</strong> bên dưới để tạo dòng đầu tiên trong mẫu hệ thống.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    methods.map((row, idx) => (
                                        <TableRow
                                            key={`adm-${idx}-${row.code ?? "row"}`}
                                            hover
                                            sx={{ "&:nth-of-type(even)": { bgcolor: "#fafafa" } }}
                                        >
                                            <TableCell sx={{ verticalAlign: "top", pt: 1.5, pb: 1.5, minWidth: 220 }}>
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
                                            </TableCell>
                                            <TableCell sx={{ verticalAlign: "top", pt: 1.5, pb: 1.5 }}>
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
                                            </TableCell>
                                            <TableCell sx={{ verticalAlign: "top", pt: 1.5, pb: 1.5 }}>
                                                <TextField
                                                    size="small"
                                                    fullWidth
                                                    multiline
                                                    minRows={2}
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
                                            </TableCell>
                                            <TableCell align="center" sx={{ verticalAlign: "top", pt: 1.25 }}>
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
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Box
                        sx={{
                            px: 2,
                            py: 1.5,
                            borderTop: "1px solid",
                            borderColor: "#e2e8f0",
                            bgcolor: "#f8fafc",
                            display: "flex",
                            justifyContent: "flex-start",
                        }}
                    >
                        <Button
                            variant="contained"
                            size="medium"
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
                                bgcolor: "#1f2937",
                                "&:hover": { bgcolor: "#111827" },
                            }}
                        >
                            Thêm phương thức
                        </Button>
                    </Box>
                </Paper>

                {admissionTemplateEditing ? (
                    <Paper
                        elevation={0}
                        variant="outlined"
                        sx={{
                            p: 2,
                            borderRadius: 2,
                            borderColor: "rgba(37, 99, 235, 0.28)",
                            bgcolor: "rgba(37, 99, 235, 0.04)",
                        }}
                    >
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between">
                            <Typography variant="body2" sx={{ color: "#334155", maxWidth: 640 }}>
                                Thay đổi trong bảng chỉ lưu trên trình duyệt cho đến khi bạn nhấn{" "}
                                <strong>Lưu mẫu</strong> hoặc <strong>Lưu</strong> — không có nút «nộp» từng ô mã.
                            </Typography>
                            <Stack direction="row" spacing={1} flexShrink={0}>
                                <Button
                                    variant="outlined"
                                    disabled={saving}
                                    onClick={() => {
                                        cancelAdmissionTemplate();
                                        setAdmissionTemplateEditing(false);
                                    }}
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
                                    Lưu mẫu
                                </Button>
                            </Stack>
                        </Stack>
                    </Paper>
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
        const integerField = (label, field, unit, allowNegativeOne = false) => (
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
                    helperText={businessErrors[field] || ""}
                    inputProps={{ step: 1, ...(allowNegativeOne ? { min: -1 } : { min: 0 }) }}
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
                            label="Định giá dịch vụ"
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
                            {moneyField("Min thanh toán", "minPay")}
                            {moneyField("Max thanh toán", "maxPay")}
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
                                <Tab label="Đơn giá tính năng mua thêm" />
                                <Tab label="Định mức theo gói" />
                            </Tabs>
                            <Box sx={{ border: "1px solid #d0d7de", borderRadius: 2, p: 1.25, bgcolor: "#ffffff" }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#2563eb", mb: 1.25 }}>
                                    {businessPricingSubTab === 0 ? "Nhóm A - Giá nền gói cước" : businessPricingSubTab === 1 ? "Nhóm B - Đơn giá tính năng mua thêm" : "Nhóm C - Định mức theo gói"}
                                </Typography>
                                {businessPricingSubTab === 0 ? (
                                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 1.5 }}>
                                        {moneyField("Gói dùng thử (Trial)", "baseTrialPrice")}
                                        {moneyField("Gói tiêu chuẩn (Standard)", "baseStandardPrice")}
                                        {moneyField("Gói doanh nghiệp (Enterprise)", "baseEnterprisePrice")}
                                    </Box>
                                ) : null}
                                {businessPricingSubTab === 1 ? (
                                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 1.5 }}>
                                        {moneyField("Mua thêm 1 tư vấn viên", "extraCounsellorFeePerSlot")}
                                        {moneyField("Phí mua thêm bài đăng", "extraPostFee")}
                                        {moneyField("Phí duy trì Trợ lý AI", "aiChatbotMonthlyFee")}
                                        {moneyField("Phí hỗ trợ cao cấp (VIP)", "premiumSupportFee")}
                                        {moneyField("Phí đẩy Top tìm kiếm", "topRankingFee")}
                                    </Box>
                                ) : null}
                                {businessPricingSubTab === 2 ? (
                                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 1.5 }}>
                                        {integerField("Thời hạn gói mặc định", "durationDays", "ngày")}
                                        {integerField("Số tư vấn viên (Gói Trial)", "trialCounsellor", "người")}
                                        {integerField("Số tư vấn viên (Gói Standard)", "standardCounsellor", "người")}
                                        {integerField("Số tư vấn viên (Gói Enterprise)", "enterpriseCounsellor", "người")}
                                        {integerField("Giới hạn bài đăng gói dùng thử", "trialPostLimit", "bài")}
                                        {integerField("Giới hạn bài đăng gói tiêu chuẩn", "standardPostLimit", "bài")}
                                        {integerField("Giới hạn bài đăng gói doanh nghiệp", "enterprisePostLimit", "bài", true)}
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
                <Box sx={{ mb: 2.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13, color: "#0f172a", mb: 1 }}>
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

                <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#ffffff", mb: 2 }}>
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
                                                    border: "1px solid #e2e8f0",
                                                    borderRadius: 2,
                                                    px: 1.25,
                                                    py: 1,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    bgcolor: "#ffffff",
                                                    minHeight: 64,
                                                }}
                                            >
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
                                    <Box sx={{ width: "100%" }}>
                                        <Typography variant="body2" sx={{ color: "#64748b", px: 0.5 }}>
                                            Không có dữ liệu.
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
                                                    value={row.schoolName || `School #${row.schoolId}`}
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
                        "linear-gradient(95deg, #2563eb 0%, #3158ef 40%, #6d3df2 72%, #8b3dff 100%)",
                    boxShadow: "0 18px 34px rgba(67, 56, 202, 0.28)",
                }}
            >
                <CardContent sx={{ p: { xs: 2.2, md: 2.8 }, "&:last-child": { pb: { xs: 2.2, md: 2.8 } } }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Avatar
                                sx={{
                                    bgcolor: alpha("#ffffff", 0.2),
                                    color: "white",
                                    width: 42,
                                    height: 42,
                                }}
                            >
                                <SettingsOutlinedIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                    Cài đặt nền tảng
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.92, mt: 0.45 }}>
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

                            {activeTabKey === "business" && status.message ? (
                                <Alert severity={status.type || "success"} sx={{ mt: 2 }}>
                                    {status.message}
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
        </Box>
    );
}

