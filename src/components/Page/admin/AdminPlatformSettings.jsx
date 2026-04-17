import React, { useEffect, useMemo, useState } from "react";
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
    FormControl,
    Grid,
    IconButton,
    InputAdornment,
    Link,
    MenuItem,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Select,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { BarChart } from "@mui/x-charts/BarChart";
import { getSystemConfig, updateSystemConfig } from "../../../services/SystemConfigService.jsx";
import { enqueueSnackbar } from "notistack";

export default function AdminPlatformSettings() {
    const tabs = useMemo(
        () => [
            { label: "Cài đặt Doanh nghiệp", key: "business" },
            { label: "Cài đặt Phương tiện", key: "media" },
            { label: "Cài đặt Hạn mức Tuyển sinh", key: "limits" },
            { label: "Cài đặt Chính sách Đăng ký", key: "policies" },
        ],
        []
    );

    const currencyOptions = ["VND"];
    const [activeTab, setActiveTab] = useState(0);
    const activeTabKey = tabs[activeTab]?.key;
    const [currency, setCurrency] = useState(currencyOptions[0]);

    const [configBody, setConfigBody] = useState(null);
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState({ type: "", message: "" });

    const getBusinessInitialForm = (cfg) => {
        const business = cfg?.business || {};
        const minPay = business.minPay ?? "";
        const maxPay = business.maxPay ?? "";
        const taxRatePct = Number(business.taxRate ?? 0) * 100;
        const serviceRatePct = Number(business.serviceRate ?? 0) * 100;
        return {
            minPay: minPay === "" ? "" : String(minPay),
            maxPay: maxPay === "" ? "" : String(maxPay),
            taxRatePct: String(Math.round(taxRatePct * 100) / 100),
            serviceRatePct: String(Math.round(serviceRatePct * 100) / 100),
        };
    };

    const getSubscriptionInitialForm = (cfg) => {
        const sub = cfg?.subscription || {};
        return {
            trialDays: sub.trialDays ?? "",
            gracePeriod: sub.gracePeriod ?? "",
            minSubscriptionMonth: sub.minSubscriptionMonth ?? "",
        };
    };

    const [businessForm, setBusinessForm] = useState({
        minPay: "",
        maxPay: "",
        taxRatePct: "0",
        serviceRatePct: "0",
    });
    const [businessErrors, setBusinessErrors] = useState({});

    const [businessEditing, setBusinessEditing] = useState(false);

    const [subscriptionForm, setSubscriptionForm] = useState({
        trialDays: "",
        gracePeriod: "",
        minSubscriptionMonth: "",
    });
    const [subscriptionErrors, setSubscriptionErrors] = useState({});

    const [subscriptionEditing, setSubscriptionEditing] = useState(false);
    const [mediaEditing, setMediaEditing] = useState(false);
    const [quotaEditing, setQuotaEditing] = useState(false);

    const [selectedQuotaYear, setSelectedQuotaYear] = useState("");
    const [quotaForm, setQuotaForm] = useState({ sourceUrl: "" });
    const [quotaErrors, setQuotaErrors] = useState({});

    const [mediaFormatsTab, setMediaFormatsTab] = useState(0);
    const [imgFormatsDraft, setImgFormatsDraft] = useState([]);
    const [videoFormatsDraft, setVideoFormatsDraft] = useState([]);
    const [docFormatsDraft, setDocFormatsDraft] = useState([]);

    const [mediaLimitsForm, setMediaLimitsForm] = useState({
        maxImgSize: "",
        maxVideoSize: "",
        maxDocSize: "",
    });
    const [mediaLimitsErrors, setMediaLimitsErrors] = useState({});

    const [reportEditing, setReportEditing] = useState(false);
    const [reportForm, setReportForm] = useState({
        maxResolutionDay: "",
        responseDeadline: "",
        activationDeadline: "",
        bonusDays: "",
        bonusCondition: "",
        description: "",
    });
    const [reportErrors, setReportErrors] = useState({});
    const [severityDraft, setSeverityDraft] = useState([]);
    const [severityDialogOpen, setSeverityDialogOpen] = useState(false);
    const [severityDialogMode, setSeverityDialogMode] = useState("add");
    const [severityDialogIndex, setSeverityDialogIndex] = useState(-1);
    const [severityDialogValue, setSeverityDialogValue] = useState({
        name: "",
        description: "",
        compensationPct: "",
    });
    const [severityDialogError, setSeverityDialogError] = useState({
        name: "",
        compensationPct: "",
    });

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

        return errors;
    };

    const validateSubscription = (form) => {
        const errors = {};
        const trialDays = parseFinite(form.trialDays);
        const gracePeriod = parseFinite(form.gracePeriod);
        const minSubscriptionMonth = parseFinite(form.minSubscriptionMonth);

        if (trialDays === null) errors.trialDays = "Vui lòng nhập Số ngày dùng thử.";
        if (gracePeriod === null) errors.gracePeriod = "Vui lòng nhập Thời gian gia hạn.";
        if (minSubscriptionMonth === null) errors.minSubscriptionMonth = "Vui lòng nhập Số tháng đăng ký tối thiểu.";

        if (trialDays !== null && trialDays < 0) errors.trialDays = "Số ngày dùng thử không được âm.";
        if (gracePeriod !== null && gracePeriod < 0) errors.gracePeriod = "Thời gian gia hạn không được âm.";
        if (minSubscriptionMonth !== null && minSubscriptionMonth < 1) errors.minSubscriptionMonth = "Số tháng đăng ký tối thiểu phải >= 1.";

        return errors;
    };

    const validateReport = (form) => {
        const errors = {};
        const maxResolutionDay = parseFinite(form.maxResolutionDay);
        const bonusDays = parseFinite(form.bonusDays);

        if (maxResolutionDay === null) errors.maxResolutionDay = "Vui lòng nhập số ngày giải quyết tối đa.";
        if (bonusDays === null) errors.bonusDays = "Vui lòng nhập số ngày thưởng.";

        if (maxResolutionDay !== null && maxResolutionDay < 0)
            errors.maxResolutionDay = "Số ngày giải quyết tối đa không được âm.";
        if (bonusDays !== null && bonusDays < 0) errors.bonusDays = "Số ngày thưởng không được âm.";

        return errors;
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
        if (!configBody) return;
        const bizInit = getBusinessInitialForm(configBody);
        setBusinessForm(bizInit);
        setBusinessErrors(validateBusiness(bizInit));

        const subInit = getSubscriptionInitialForm(configBody);
        setSubscriptionForm(subInit);
        setSubscriptionErrors(validateSubscription(subInit));

        const quotaYears = Object.keys(configBody?.quota || {});
        setSelectedQuotaYear((prev) => prev || quotaYears[0] || "");

        const media = configBody?.media || {};
        setImgFormatsDraft(getFormatListFromMedia(media, ["imgFormats", "imgFormat"]));
        setVideoFormatsDraft(getFormatListFromMedia(media, ["videoFormats", "videoFormat"]));
        setDocFormatsDraft(getFormatListFromMedia(media, ["docFormats", "docFormat"]));

        setMediaLimitsForm({
            maxImgSize: media.maxImgSize ?? "",
            maxVideoSize: media.maxVideoSize ?? "",
            maxDocSize: media.maxDocSize ?? "",
        });
        setMediaLimitsErrors({});

        const report = configBody?.report || {};
        setSeverityDraft(report.severityLevels || []);
        setReportForm({
            maxResolutionDay: report.maxResolutionDay ?? "",
            responseDeadline: report.responseDeadline ?? "",
            activationDeadline: report.activationDeadline ?? "",
            bonusDays: report.bonusDays ?? "",
            bonusCondition: report.bonusCondition ?? "",
            description: report.description ?? "",
        });
        setReportErrors({});
        setReportEditing(false);
        setSeverityDialogOpen(false);
        setSeverityDialogMode("add");
        setSeverityDialogIndex(-1);
        setSeverityDialogValue({
            name: "",
            description: "",
            compensationPct: "",
        });
        setSeverityDialogError({ name: "", compensationPct: "" });
        setFormatDialogOpen(false);
        setFormatDialogMode("add");
        setFormatDialogIndex(-1);
        setFormatDialogValue("");
        setFormatDialogError("");

        setBusinessEditing(false);
        setSubscriptionEditing(false);
        setMediaEditing(false);
        setReportEditing(false);
        setQuotaEditing(false);
    }, [configBody]);

    useEffect(() => {
        if (activeTabKey !== "business") setBusinessEditing(false);
        if (activeTabKey !== "policies") setSubscriptionEditing(false);
        if (activeTabKey !== "media") setMediaEditing(false);
        if (activeTabKey !== "limits") setQuotaEditing(false);
    }, [activeTabKey]);

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

    const cancelSubscription = () => {
        if (!configBody) return;
        const subInit = getSubscriptionInitialForm(configBody);
        setSubscriptionForm(subInit);
        setSubscriptionErrors(validateSubscription(subInit));
        setStatus({ type: "", message: "" });
    };

    const startSubscriptionEdit = () => {
        setSubscriptionEditing(true);
    };

    const cancelSubscriptionEdit = () => {
        cancelSubscription();
        setSubscriptionEditing(false);
    };

    const saveSubscriptionEdit = async () => {
        const ok = await saveSubscriptionPolicy();
        if (ok) setSubscriptionEditing(false);
    };

    const cancelMediaFormats = () => {
        if (!configBody) return;
        const media = configBody?.media || {};
        setImgFormatsDraft(getFormatListFromMedia(media, ["imgFormats", "imgFormat"]));
        setVideoFormatsDraft(getFormatListFromMedia(media, ["videoFormats", "videoFormat"]));
        setDocFormatsDraft(getFormatListFromMedia(media, ["docFormats", "docFormat"]));
        setMediaLimitsForm({
            maxImgSize: media.maxImgSize ?? "",
            maxVideoSize: media.maxVideoSize ?? "",
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

    const startReportEdit = () => {
        setReportEditing(true);
        setStatus({ type: "", message: "" });
    };

    const cancelReport = () => {
        if (!configBody) return;
        const report = configBody?.report || {};
        setSeverityDraft(report.severityLevels || []);
        setReportForm({
            maxResolutionDay: report.maxResolutionDay ?? "",
            responseDeadline: report.responseDeadline ?? "",
            activationDeadline: report.activationDeadline ?? "",
            bonusDays: report.bonusDays ?? "",
            bonusCondition: report.bonusCondition ?? "",
            description: report.description ?? "",
        });
        setReportErrors({});
        setStatus({ type: "", message: "" });
    };

    const cancelReportEdit = () => {
        cancelReport();
        setReportEditing(false);
    };

    const saveReportEdit = async () => {
        if (!configBody) return;
        const errors = validateReport(reportForm);
        setReportErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setSaving(true);
        let ok = false;
        setStatus({ type: "", message: "" });
        try {
            const currentReport = configBody.report || {};
            const maxResolutionDay = parseFinite(reportForm.maxResolutionDay);
            const bonusDays = parseFinite(reportForm.bonusDays);

            const updatedBody = {
                reportData: {
                    maxResolutionDay: maxResolutionDay ?? 0,
                    responseDeadline: reportForm.responseDeadline || null,
                    activationDeadline: reportForm.activationDeadline || null,
                    bonusDays: bonusDays ?? 0,
                    bonusCondition: reportForm.bonusCondition || "",
                    description: reportForm.description || "",
                    levels: (severityDraft || []).map((lvl) => ({
                        name: lvl.name,
                    })),
                    // giữ lại các field khác nếu backend có
                    ...currentReport,
                },
            };
            await updateSystemConfig(updatedBody);
            enqueueSnackbar("Cập nhật Cài đặt Báo cáo thành công.", {
                variant: "success",
            });
            setStatus({ type: "success", message: "Cập nhật thành công." });
            await fetchConfig();
            ok = true;
        } catch (e) {
            console.error("saveReportEdit failed", e);
            const msg =
                e?.response?.data?.message || "Cập nhật thất bại. Vui lòng thử lại.";
            enqueueSnackbar(msg, { variant: "error" });
            setStatus({ type: "error", message: msg });
        } finally {
            setSaving(false);
        }
        if (ok) setReportEditing(false);
        return ok;
    };

    const openSeverityDialog = (mode, index = -1) => {
        setSeverityDialogMode(mode);
        setSeverityDialogIndex(index);
        setSeverityDialogError({ name: "", compensationPct: "" });
        if (mode === "edit" && index >= 0 && index < severityDraft.length) {
            const item = severityDraft[index];
            const compRaw = Number(item?.compensation) || 0;
            const compensationPct = compRaw <= 1 ? compRaw * 100 : compRaw;
            setSeverityDialogValue({
                name: item?.name || "",
                description: item?.description || "",
                compensationPct: String(compensationPct),
            });
        } else {
            setSeverityDialogValue({
                name: "",
                description: "",
                compensationPct: "",
            });
        }
        setSeverityDialogOpen(true);
    };

    const closeSeverityDialog = () => {
        setSeverityDialogOpen(false);
        setSeverityDialogIndex(-1);
        setSeverityDialogMode("add");
        setSeverityDialogError({ name: "", compensationPct: "" });
    };

    const submitSeverityDialog = () => {
        const errors = { name: "", compensationPct: "" };
        const name = severityDialogValue.name.trim();
        const pctNum = parseFinite(severityDialogValue.compensationPct);
        if (!name) {
            errors.name = "Vui lòng nhập tên mức độ.";
        }
        if (pctNum === null || pctNum < 0 || pctNum > 100) {
            errors.compensationPct = "Phần trăm bồi thường phải trong khoảng 0–100.";
        }
        if (errors.name || errors.compensationPct) {
            setSeverityDialogError(errors);
            return;
        }
        const compensationDecimal = pctNum / 100;

        if (severityDialogMode === "add") {
            setSeverityDraft((prev) => [
                ...prev,
                {
                    name,
                    description: severityDialogValue.description.trim(),
                    compensation: compensationDecimal,
                },
            ]);
        } else if (severityDialogMode === "edit") {
            setSeverityDraft((prev) => {
                const idx = severityDialogIndex;
                if (idx < 0 || idx >= prev.length) return prev;
                const next = [...prev];
                next[idx] = {
                    ...(next[idx] || {}),
                    name,
                    description: severityDialogValue.description.trim(),
                    compensation: compensationDecimal,
                };
                return next;
            });
        }
        closeSeverityDialog();
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
        } else if (formatDialogType === "video") {
            updateFormatDraft(setVideoFormatsDraft);
        } else {
            updateFormatDraft(setDocFormatsDraft);
        }

        closeFormatDialog();
    };

    const validateMediaLimits = (form) => {
        const errors = {};
        const fields = [
            "maxImgSize",
            "maxVideoSize",
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
            const updatedBody = {
                mediaData: {
                    maxImgSize: parseFinite(mediaLimitsForm.maxImgSize),
                    maxVideoSize: parseFinite(mediaLimitsForm.maxVideoSize),
                    maxDocSize: parseFinite(mediaLimitsForm.maxDocSize),
                    imgFormats: imgFormatsDraft.map((f) => ({ format: f })),
                    videoFormats: videoFormatsDraft.map((f) => ({ format: f })),
                    docFormats: docFormatsDraft.map((f) => ({ format: f })),
                },
            };
            await updateSystemConfig(updatedBody);
            enqueueSnackbar("Cập nhật cấu hình phương tiện thành công.", { variant: "success" });
            setStatus({ type: "success", message: "Cập nhật thành công." });
            await fetchConfig();
            ok = true;
        } catch (e) {
            console.error("saveMediaFormats failed", e);
            const msg = e?.response?.data?.message || "Cập nhật thất bại. Vui lòng thử lại.";
            enqueueSnackbar(msg, { variant: "error" });
            setStatus({ type: "error", message: msg });
        } finally {
            setSaving(false);
        }
        return ok;
    };

    const getQuotaInitialForm = (year) => {
        const quota = configBody?.quota || {};
        const item = quota[year] || {};
        return {
            sourceUrl: item.sourceUrl || "",
        };
    };

    const validateQuota = (form) => {
        const errors = {};
        if (form.sourceUrl && typeof form.sourceUrl === "string" && form.sourceUrl.length > 2048) {
            errors.sourceUrl = "URL quá dài.";
        }
        return errors;
    };

    const cancelQuota = () => {
        if (!configBody || !selectedQuotaYear) return;
        const form = getQuotaInitialForm(selectedQuotaYear);
        setQuotaForm(form);
        setQuotaErrors(validateQuota(form));
        setStatus({ type: "", message: "" });
    };

    const startQuotaEdit = () => {
        if (!configBody || !selectedQuotaYear) return;
        const form = getQuotaInitialForm(selectedQuotaYear);
        setQuotaForm(form);
        setQuotaErrors(validateQuota(form));
        setQuotaEditing(true);
    };

    const cancelQuotaEdit = () => {
        cancelQuota();
        setQuotaEditing(false);
    };

    const saveQuotaEdit = async () => {
        if (!configBody || !selectedQuotaYear) return;
        const errors = validateQuota(quotaForm);
        setQuotaErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setSaving(true);
        let ok = false;
        setStatus({ type: "", message: "" });
        try {
            const currentQuota = configBody.quota || {};
            const existing = currentQuota[selectedQuotaYear] || {};
            const updatedQuota = {
                ...currentQuota,
                [selectedQuotaYear]: {
                    ...existing,
                    sourceUrl: quotaForm.sourceUrl || "",
                },
            };

            const updatedBody = { quota: updatedQuota };

            await updateSystemConfig(updatedBody);
            enqueueSnackbar("Cập nhật Cài đặt Hạn mức Tuyển sinh thành công.", { variant: "success" });
            setStatus({ type: "success", message: "Cập nhật thành công." });
            await fetchConfig();
            ok = true;
        } catch (e) {
            console.error("saveQuotaEdit failed", e);
            const msg = e?.response?.data?.message || "Cập nhật thất bại. Vui lòng thử lại.";
            enqueueSnackbar(msg, { variant: "error" });
            setStatus({ type: "error", message: msg });
        } finally {
            setSaving(false);
        }
        if (ok) setQuotaEditing(false);
        return ok;
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
            const minPay = parseFinite(businessForm.minPay);
            const maxPay = parseFinite(businessForm.maxPay);
            const taxRate = toRateDecimal(businessForm.taxRatePct);
            const serviceRate = toRateDecimal(businessForm.serviceRatePct);

            const updatedBody = {
                business: {
                    minPay,
                    maxPay,
                    taxRate,
                    serviceRate,
                },
            };

            await updateSystemConfig(updatedBody);
            enqueueSnackbar("Cập nhật Cài đặt Doanh nghiệp thành công.", { variant: "success" });
            setStatus({ type: "success", message: "Cập nhật thành công." });
            await fetchConfig();
            ok = true;
        } catch (e) {
            console.error("saveBusiness failed", e);
            const msg = e?.response?.data?.message || "Cập nhật thất bại. Vui lòng thử lại.";
            enqueueSnackbar(msg, { variant: "error" });
            setStatus({ type: "error", message: msg });
        } finally {
            setSaving(false);
        }
        return ok;
    };

    const saveSubscriptionPolicy = async () => {
        if (!configBody) return;
        const errors = validateSubscription(subscriptionForm);
        setSubscriptionErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setSaving(true);
        let ok = false;
        setStatus({ type: "", message: "" });
        try {
            const trialDays = parseFinite(subscriptionForm.trialDays);
            const gracePeriod = parseFinite(subscriptionForm.gracePeriod);
            const minSubscriptionMonth = parseFinite(subscriptionForm.minSubscriptionMonth);

            const updatedBody = {
                subscription: {
                    trialDays,
                    gracePeriod,
                    minSubscriptionMonth,
                },
            };

            await updateSystemConfig(updatedBody);
            enqueueSnackbar("Cập nhật Chính sách Đăng ký thành công.", { variant: "success" });
            setStatus({ type: "success", message: "Cập nhật thành công." });
            await fetchConfig();
            ok = true;
        } catch (e) {
            console.error("saveSubscriptionPolicy failed", e);
            const msg = e?.response?.data?.message || "Cập nhật thất bại. Vui lòng thử lại.";
            enqueueSnackbar(msg, { variant: "error" });
            setStatus({ type: "error", message: msg });
        } finally {
            setSaving(false);
        }
        return ok;
    };

    const renderBusinessTab = () => (
        <Box sx={{ width: "100%" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#2563eb", mb: 1.5 }}>
                Cài đặt doanh nghiệp
            </Typography>
            {(() => {
                const businessDisabled = !businessEditing || saving;
                const serviceRateValue = businessForm.serviceRatePct === "" ? "" : Number(businessForm.serviceRatePct);

                return (
                    <Box
                        sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 1.5,
                            width: "100%",
                            alignItems: "stretch",
                        }}
                    >
                        <Box
                            sx={{
                                flex: "1 1 220px",
                                minWidth: 240,
                                ...settingsFieldCardSx,
                            }}
                        >
                            <Typography sx={settingsFieldLabelSx}>
                                Thuế suất (%)
                            </Typography>
                            <Tooltip title="Nhập tỷ lệ phần trăm thuế suất.">
                                <TextField
                                    size="small"
                                    fullWidth
                                    disabled={businessDisabled}
                                    value={businessForm.taxRatePct}
                                    onChange={(e) => {
                                        const nextVal = e.target.value;
                                        setBusinessForm((prev) => {
                                            const next = { ...prev, taxRatePct: nextVal };
                                            setBusinessErrors(validateBusiness(next));
                                            return next;
                                        });
                                    }}
                                    error={Boolean(businessErrors.taxRatePct)}
                                    helperText={businessErrors.taxRatePct || ""}
                                    type="number"
                                    inputProps={{ min: 0, max: 100, step: 1 }}
                                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                                    sx={settingsInputSx}
                                />
                            </Tooltip>
                        </Box>

                        <Box
                            sx={{
                                flex: "1 1 220px",
                                minWidth: 240,
                                ...settingsFieldCardSx,
                            }}
                        >
                            <Typography sx={settingsFieldLabelSx}>
                                Tỷ lệ phí dịch vụ (%)
                            </Typography>
                            <Tooltip title="Nhập tỷ lệ phần trăm phí dịch vụ.">
                                <TextField
                                    size="small"
                                    fullWidth
                                    disabled={businessDisabled}
                                    value={serviceRateValue}
                                    onChange={(e) => {
                                        const nextVal = e.target.value;
                                        setBusinessForm((prev) => {
                                            const next = { ...prev, serviceRatePct: nextVal };
                                            setBusinessErrors(validateBusiness(next));
                                            return next;
                                        });
                                    }}
                                    error={Boolean(businessErrors.serviceRatePct)}
                                    helperText={businessErrors.serviceRatePct || ""}
                                    type="number"
                                    inputProps={{ min: 0, max: 100, step: 1 }}
                                    sx={settingsInputSx}
                                />
                            </Tooltip>
                        </Box>

                        <Box
                            sx={{
                                flex: "1 1 280px",
                                minWidth: 320,
                                ...settingsFieldCardSx,
                            }}
                        >
                            <Typography sx={settingsFieldLabelSx}>
                                Số tiền giao dịch tối thiểu
                            </Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <TextField
                                    size="small"
                                    type="text"
                                    fullWidth
                                    disabled={businessDisabled}
                                    value={formatMoneyVN(businessForm.minPay)}
                                    onChange={(e) => {
                                        const nextVal = sanitizeMoneyInput(e.target.value);
                                        setBusinessForm((prev) => {
                                            const next = { ...prev, minPay: nextVal };
                                            setBusinessErrors(validateBusiness(next));
                                            return next;
                                        });
                                    }}
                                    error={Boolean(businessErrors.minPay)}
                                    helperText={businessErrors.minPay || ""}
                                    inputProps={{ inputMode: "numeric" }}
                                    sx={settingsInputSx}
                                />
                                <Typography sx={{ fontSize: 12, fontWeight: 500, color: "#1d4ed8", minWidth: 56, textAlign: "right" }}>
                                    VND
                                </Typography>
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                flex: "1 1 280px",
                                minWidth: 320,
                                ...settingsFieldCardSx,
                            }}
                        >
                            <Typography sx={settingsFieldLabelSx}>
                                Số tiền giao dịch tối đa
                            </Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <TextField
                                    size="small"
                                    type="text"
                                    fullWidth
                                    disabled={businessDisabled}
                                    value={formatMoneyVN(businessForm.maxPay)}
                                    onChange={(e) => {
                                        const nextVal = sanitizeMoneyInput(e.target.value);
                                        setBusinessForm((prev) => {
                                            const next = { ...prev, maxPay: nextVal };
                                            setBusinessErrors(validateBusiness(next));
                                            return next;
                                        });
                                    }}
                                    error={Boolean(businessErrors.maxPay)}
                                    helperText={businessErrors.maxPay || ""}
                                    inputProps={{ inputMode: "numeric" }}
                                    sx={settingsInputSx}
                                />
                                <Typography sx={{ fontSize: 12, fontWeight: 500, color: "#1d4ed8", minWidth: 56, textAlign: "right" }}>
                                    VND
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                );
            })()}
        </Box>
    );

    const renderSubscriptionTab = () => (
        <Box>
            {(() => {
                const subscriptionDisabled = !subscriptionEditing || saving;
                return (
                    <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#2563eb", mb: 1.5 }}>
                Cấu hình Chính sách Đăng ký
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, width: "100%", alignItems: "stretch" }}>
                <Box sx={{ flex: "1 1 220px", minWidth: 240, ...settingsFieldCardSx }}>
                    <Typography sx={settingsFieldLabelSx}>Số ngày dùng thử</Typography>
                    <Tooltip title="Số ngày dùng thử trước khi người dùng bắt đầu giai đoạn thanh toán.">
                        <TextField
                            size="small"
                            fullWidth
                            disabled={subscriptionDisabled}
                            type="number"
                            value={subscriptionForm.trialDays}
                            onChange={(e) => {
                                const nextVal = e.target.value;
                                setSubscriptionForm((prev) => {
                                    const next = { ...prev, trialDays: nextVal };
                                    setSubscriptionErrors(validateSubscription(next));
                                    return next;
                                });
                            }}
                            inputProps={{ min: 0 }}
                            error={Boolean(subscriptionErrors.trialDays)}
                            helperText={subscriptionErrors.trialDays || ""}
                            sx={settingsInputSx}
                        />
                    </Tooltip>
                </Box>

                <Box sx={{ flex: "1 1 220px", minWidth: 240, ...settingsFieldCardSx }}>
                    <Typography sx={settingsFieldLabelSx}>Thời gian gia hạn</Typography>
                    <Tooltip title="Khoảng thời gian gia hạn sau khi hết hạn thanh toán (đơn vị: ngày).">
                        <TextField
                            size="small"
                            fullWidth
                            disabled={subscriptionDisabled}
                            type="number"
                            value={subscriptionForm.gracePeriod}
                            onChange={(e) => {
                                const nextVal = e.target.value;
                                setSubscriptionForm((prev) => {
                                    const next = { ...prev, gracePeriod: nextVal };
                                    setSubscriptionErrors(validateSubscription(next));
                                    return next;
                                });
                            }}
                            inputProps={{ min: 0 }}
                            error={Boolean(subscriptionErrors.gracePeriod)}
                            helperText={subscriptionErrors.gracePeriod || ""}
                            sx={settingsInputSx}
                        />
                    </Tooltip>
                </Box>

                <Box sx={{ flex: "1 1 220px", minWidth: 240, ...settingsFieldCardSx }}>
                    <Typography sx={settingsFieldLabelSx}>Số tháng đăng ký tối thiểu</Typography>
                    <Tooltip title="Số tháng đăng ký tối thiểu bắt buộc (đơn vị: tháng).">
                        <TextField
                            size="small"
                            fullWidth
                            disabled={subscriptionDisabled}
                            type="number"
                            value={subscriptionForm.minSubscriptionMonth}
                            onChange={(e) => {
                                const nextVal = e.target.value;
                                setSubscriptionForm((prev) => {
                                    const next = { ...prev, minSubscriptionMonth: nextVal };
                                    setSubscriptionErrors(validateSubscription(next));
                                    return next;
                                });
                            }}
                            inputProps={{ min: 1 }}
                            error={Boolean(subscriptionErrors.minSubscriptionMonth)}
                            helperText={subscriptionErrors.minSubscriptionMonth || ""}
                            sx={settingsInputSx}
                        />
                    </Tooltip>
                </Box>
            </Box>

            <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end", gap: 1 }}>
                {subscriptionEditing ? (
                    <>
                        <Button
                            variant="outlined"
                            onClick={cancelSubscriptionEdit}
                            disabled={saving}
                            sx={cancelButtonSx}
                        >
                            Hủy
                        </Button>
                        <Button
                            variant="contained"
                            disabled={saving || loadingConfig || Object.keys(subscriptionErrors).length > 0}
                            onClick={() => void saveSubscriptionEdit()}
                            sx={saveButtonSx}
                        >
                            Lưu
                        </Button>
                    </>
                ) : (
                    <Button
                        variant="outlined"
                        onClick={startSubscriptionEdit}
                        disabled={saving}
                        sx={cancelButtonSx}
                    >
                        Chỉnh sửa
                    </Button>
                )}
            </Box>

            {status.message ? (
                <Alert severity={status.type || "success"} sx={{ mt: 2 }}>
                    {status.message}
                </Alert>
            ) : null}
                    </Box>
                );
            })()}
        </Box>
    );

    const renderMediaTab = () => {
        const activeFormatType = mediaFormatsTab === 0 ? "image" : mediaFormatsTab === 1 ? "video" : "doc";
        const mediaDisabled = !mediaEditing || saving;
        const imgFormats = imgFormatsDraft || [];
        const videoFormats = videoFormatsDraft || [];
        const docFormats = docFormatsDraft || [];

        const list = activeFormatType === "image" ? imgFormats : activeFormatType === "video" ? videoFormats : docFormats;
        const dialogTypeLabel = activeFormatType === "image" ? "ảnh" : activeFormatType === "video" ? "video" : "tài liệu";

        const deleteFormatFromDraft = (type, index) => {
            if (type === "image") {
                setImgFormatsDraft((prev) => prev.filter((_, i) => i !== index));
                return;
            }
            if (type === "video") {
                setVideoFormatsDraft((prev) => prev.filter((_, i) => i !== index));
                return;
            }
            setDocFormatsDraft((prev) => prev.filter((_, i) => i !== index));
        };

        return (
            <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#2563eb", mb: 1.5 }}>
                    Cấu hình phương tiện
                </Typography>

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
                                md: "repeat(3, minmax(0, 1fr))",
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
                                Dung lượng video tối đa
                            </Typography>
                            <TextField
                                size="small"
                                fullWidth
                                type="number"
                                disabled={mediaDisabled}
                                value={mediaLimitsForm.maxVideoSize}
                                onChange={(e) => {
                                    const nextVal = e.target.value;
                                    setMediaLimitsForm((prev) => {
                                        const next = { ...prev, maxVideoSize: nextVal };
                                        setMediaLimitsErrors(validateMediaLimits(next));
                                        return next;
                                    });
                                }}
                                error={Boolean(mediaLimitsErrors.maxVideoSize)}
                                helperText={mediaLimitsErrors.maxVideoSize || ""}
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
                            sx={{ borderBottom: "1px solid #e2e8f0", "& .MuiTabs-indicator": { height: 3 } }}
                        >
                            <Tab label="Định dạng ảnh" sx={{ fontWeight: 700, textTransform: "none" }} />
                            <Tab label="Định dạng video" sx={{ fontWeight: 700, textTransform: "none" }} />
                            <Tab label="Định dạng tài liệu" sx={{ fontWeight: 700, textTransform: "none" }} />
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
                        {formatDialogType === "image" ? "ảnh" : formatDialogType === "video" ? "video" : "tài liệu"}
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
        const quota = configBody?.quota || {};
        const quotaYears = Object.keys(quota);
        const selectedYear = selectedQuotaYear || quotaYears[0] || "";
        const isEditing = quotaEditing;
        const rows = quotaYears.map((year) => {
            const item = quota[year] || {};
            return {
                year,
                sourceUrl: item?.sourceUrl || "",
                hasQuota: Boolean(item?.quotas && Object.keys(item.quotas).length),
            };
        });

        return (
            <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#2563eb", mb: 1.5 }}>
                    Cài đặt Hạn mức Tuyển sinh
                </Typography>

                <Box sx={{ px: { xs: 0.5, md: 1 } }}>
                    {rows.length ? (
                        <Stack spacing={0.75}>
                            {rows.map((row) => {
                                const isSelected = row.year === selectedYear;
                                return (
                                    <Box
                                        key={row.year}
                                        sx={{
                                            display: "flex",
                                            alignItems: { xs: "flex-start", md: "center" },
                                            flexDirection: { xs: "column", md: "row" },
                                            gap: 1.25,
                                            borderRadius: 2,
                                            px: 1.25,
                                            py: 1,
                                            bgcolor: isSelected ? "#f0f9ff" : "#ffffff",
                                            border: "1px solid",
                                            borderColor: isSelected ? "#60a5fa" : "#e2e8f0",
                                            transition: "all 0.15s ease",
                                            "&:hover": {
                                                borderColor: "#93c5fd",
                                                boxShadow: "0 6px 14px rgba(37, 99, 235, 0.10)",
                                            },
                                        }}
                                    >
                                        {/* Left: title + subtext */}
                                        <Box
                                            sx={{
                                                minWidth: { xs: "100%", md: 260 },
                                            }}
                                        >
                                            <Typography sx={{ fontSize: 15, fontWeight: 600, color: "#0f172a", mb: 0.35 }}>
                                                Năm học {row.year}
                                            </Typography>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, minWidth: 0 }}>
                                                <LinkOutlinedIcon sx={{ fontSize: 16, color: "#9ca3af", flexShrink: 0 }} />
                                                {row.sourceUrl ? (
                                                    <Link
                                                        href={row.sourceUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        sx={{
                                                            fontSize: 12.5,
                                                            color: "#64748b",
                                                            textDecorationColor: "#cbd5e1",
                                                            textUnderlineOffset: "2px",
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            display: "block",
                                                        }}
                                                    >
                                                        {row.sourceUrl}
                                                    </Link>
                                                ) : (
                                                    <Typography variant="body2" sx={{ color: "#9ca3af", fontSize: 12.5 }}>
                                                        Không có nguồn dữ liệu
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>

                                        {/* Middle: status badge */}
                                        <Box sx={{ minWidth: { xs: "auto", md: 170 } }}>
                                            <Chip
                                                size="small"
                                                label={row.hasQuota ? "Đã cấu hình" : "Chưa cấu hình"}
                                                sx={{
                                                    bgcolor: row.hasQuota ? "#dcfce7" : "#fff7ed",
                                                    color: row.hasQuota ? "#166534" : "#c2410c",
                                                    borderRadius: 1.5,
                                                    fontWeight: 600,
                                                }}
                                            />
                                        </Box>

                                        {/* Right: actions */}
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.35, ml: { xs: 0, md: "auto" } }}>
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    setSelectedQuotaYear(row.year);
                                                    const form = getQuotaInitialForm(row.year);
                                                    setQuotaForm(form);
                                                    setQuotaErrors(validateQuota(form));
                                                    setQuotaEditing(true);
                                                }}
                                                sx={{ color: "#2563eb" }}
                                                aria-label={`Chỉnh sửa ${row.year}`}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                sx={{ color: "#94a3b8" }}
                                                aria-label={`Mở chi tiết ${row.year}`}
                                                onClick={() => setSelectedQuotaYear(row.year)}
                                            >
                                                <ChevronRightIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Stack>
                    ) : (
                        <Typography variant="body2" sx={{ color: "#64748b", py: 1, textAlign: "center" }}>
                            Không có dữ liệu.
                        </Typography>
                    )}

                        <Dialog
                            open={isEditing}
                            onClose={cancelQuotaEdit}
                            fullWidth
                            maxWidth="sm"
                        >
                            <DialogTitle sx={{ fontWeight: 700 }}>
                                Cập nhật nguồn dữ liệu – Năm học {selectedYear}
                            </DialogTitle>
                            <DialogContent sx={{ pt: 1.5 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Nguồn dữ liệu (URL)"
                                    margin="dense"
                                    disabled={saving}
                                    value={quotaForm.sourceUrl}
                                    onChange={(e) => {
                                        const next = { ...quotaForm, sourceUrl: e.target.value };
                                        setQuotaForm(next);
                                        setQuotaErrors(validateQuota(next));
                                    }}
                                    error={Boolean(quotaErrors.sourceUrl)}
                                    helperText={quotaErrors.sourceUrl || "Có thể để trống nếu không có đường dẫn công khai."}
                                />
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

    const renderReportTab = () => {
        const report = configBody?.report || {};
        const levels = report.severityLevels || [];
        const sortedLevels = [...levels]
            .filter((x) => typeof x?.name === "string")
            .sort((a, b) => {
                const ca = Number(a?.compensation) || 0;
                const cb = Number(b?.compensation) || 0;
                return cb - ca;
            });

        const severityNameMap = {
            Minor: "Nhẹ",
            Moderate: "Trung bình",
            Major: "Nặng",
            Critical: "Nghiêm trọng",
        };

        const isEditing = reportEditing;

        return (
            <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#2563eb", mb: 1.5 }}>
                    Cài đặt Báo cáo
                </Typography>

                <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", width: "100%" }}>
                    <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                        <Box>
                            <Box>
                                <Typography
                                        sx={{
                                            fontWeight: 700,
                                            fontSize: 14,
                                            color: "#0f172a",
                                            mb: 1.5,
                                        }}
                                    >
                                        Cấu hình thời gian chi trả
                                    </Typography>

                                    {isEditing ? (
                                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                                            <Box sx={{ flex: "1 1 200px", minWidth: 220, ...settingsFieldCardSx }}>
                                                <Typography sx={settingsFieldLabelSx}>
                                                    Số ngày giải quyết tối đa
                                                </Typography>
                                                <TextField
                                                    size="small"
                                                    fullWidth
                                                    type="number"
                                                    value={reportForm.maxResolutionDay}
                                                    onChange={(e) => {
                                                        const next = { ...reportForm, maxResolutionDay: e.target.value };
                                                        setReportForm(next);
                                                        setReportErrors(validateReport(next));
                                                    }}
                                                    error={Boolean(reportErrors.maxResolutionDay)}
                                                    helperText={reportErrors.maxResolutionDay || ""}
                                                    sx={settingsInputSx}
                                                    inputProps={{ min: 0 }}
                                                    InputProps={{
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                ngày
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                />
                                            </Box>

                                            <Box sx={{ flex: "1 1 260px", minWidth: 260, ...settingsFieldCardSx }}>
                                                <Typography sx={settingsFieldLabelSx}>
                                                    Hạn xử lý báo cáo
                                                </Typography>
                                                <TextField
                                                    size="small"
                                                    fullWidth
                                                    type="datetime-local"
                                                    value={reportForm.responseDeadline}
                                                    onChange={(e) =>
                                                        setReportForm((prev) => ({
                                                            ...prev,
                                                            responseDeadline: e.target.value,
                                                        }))
                                                    }
                                                    sx={settingsInputSx}
                                                />
                                            </Box>

                                            <Box sx={{ flex: "1 1 260px", minWidth: 260, ...settingsFieldCardSx }}>
                                                <Typography sx={settingsFieldLabelSx}>
                                                    Hạn kích hoạt chi trả
                                                </Typography>
                                                <TextField
                                                    size="small"
                                                    fullWidth
                                                    type="datetime-local"
                                                    value={reportForm.activationDeadline}
                                                    onChange={(e) =>
                                                        setReportForm((prev) => ({
                                                            ...prev,
                                                            activationDeadline: e.target.value,
                                                        }))
                                                    }
                                                    sx={settingsInputSx}
                                                />
                                            </Box>
                                        </Box>
                                    ) : (
                                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                                            <Box sx={{ flex: "1 1 200px", minWidth: 220, ...settingsFieldCardSx }}>
                                                <Typography sx={settingsFieldLabelSx}>
                                                    Số ngày chi trả tối đa
                                                </Typography>
                                                <Typography sx={{ fontSize: 14, color: "#0f172a" }}>
                                                    {report.maxDisbursementDay ?? "-"} ngày
                                                </Typography>
                                            </Box>
                                        </Box>
                                    )}

                                    <Box sx={{ mt: 2.5, p: { xs: 1.5, md: 2 }, bgcolor: "#f9fafb", borderRadius: 2, border: "1px solid #e5e7eb" }}>
                                        <Typography
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: 13,
                                                color: "#0f172a",
                                                mb: 1,
                                            }}
                                        >
                                            Quy trình chi trả
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontSize: 13,
                                                color: "#64748b",
                                                mb: 1.25,
                                            }}
                                        >
                                            Sau khi báo cáo được giải quyết và khoản bồi thường được phê
                                            duyệt, hệ thống bắt đầu quy trình chi trả cho người dùng.
                                        </Typography>
                                        {isEditing ? (
                                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 0.5 }}>
                                                <Box sx={{ flex: "1 1 260px", minWidth: 260, ...settingsFieldCardSx }}>
                                                    <Typography sx={settingsFieldLabelSx}>
                                                        Số ngày thưởng thêm
                                                    </Typography>
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        type="number"
                                                        value={reportForm.bonusDays}
                                                        onChange={(e) => {
                                                            const next = { ...reportForm, bonusDays: e.target.value };
                                                            setReportForm(next);
                                                            setReportErrors(validateReport(next));
                                                        }}
                                                        error={Boolean(reportErrors.bonusDays)}
                                                        helperText={reportErrors.bonusDays || ""}
                                                        sx={settingsInputSx}
                                                        inputProps={{ min: 0 }}
                                                        InputProps={{
                                                            endAdornment: (
                                                                <InputAdornment position="end">
                                                                    ngày
                                                                </InputAdornment>
                                                            ),
                                                        }}
                                                    />
                                                </Box>
                                                <Box sx={{ flex: "1 1 260px", minWidth: 260, ...settingsFieldCardSx }}>
                                                    <Typography sx={settingsFieldLabelSx}>
                                                        Điều kiện áp dụng thưởng
                                                    </Typography>
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        value={reportForm.bonusCondition}
                                                        onChange={(e) =>
                                                            setReportForm((prev) => ({
                                                                ...prev,
                                                                bonusCondition: e.target.value,
                                                            }))
                                                        }
                                                        sx={settingsInputSx}
                                                    />
                                                </Box>
                                                <Box sx={{ width: "100%", ...settingsFieldCardSx }}>
                                                    <Typography sx={settingsFieldLabelSx}>
                                                        Mô tả quy tắc chi trả
                                                    </Typography>
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        multiline
                                                        minRows={3}
                                                        value={reportForm.description}
                                                        onChange={(e) =>
                                                            setReportForm((prev) => ({
                                                                ...prev,
                                                                description: e.target.value,
                                                            }))
                                                        }
                                                        sx={settingsInputSx}
                                                    />
                                                </Box>
                                            </Box>
                                        ) : null}
                            </Box>

                            <Box sx={{ mt: 3 }}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            mb: 1.5,
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: 14,
                                                color: "#0f172a",
                                            }}
                                        >
                                            Cấu hình mức độ nghiêm trọng
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            onClick={() => openSeverityDialog("add")}
                                            sx={{
                                                bgcolor: "#0ea5e9",
                                                fontWeight: 700,
                                                borderRadius: 2,
                                                textTransform: "none",
                                                "&:hover": { bgcolor: "#0284c7" },
                                            }}
                                        >
                                            + Thêm mức độ
                                        </Button>
                                    </Box>

                                    {sortedLevels.length ? (
                                        <Stack spacing={1}>
                                            {sortedLevels.map((level) => {
                                                const compRaw = Number(level.compensation) || 0;
                                                const compensationPct =
                                                    compRaw <= 1 ? compRaw * 100 : compRaw;
                                                const pctLabel = `${compensationPct}% bồi thường`;
                                                const nameVi =
                                                    severityNameMap[level.name] || level.name;
                                                return (
                                                    <Box
                                                        key={level.name}
                                                        sx={{
                                                            border: "1px solid #e2e8f0",
                                                            borderRadius: 2,
                                                            px: 1.5,
                                                            py: 1,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "space-between",
                                                            gap: 2,
                                                            bgcolor: "#ffffff",
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: 1.25,
                                                                flex: 1,
                                                                minWidth: 0,
                                                            }}
                                                        >
                                                            <Box
                                                                sx={{
                                                                    width: 10,
                                                                    height: 10,
                                                                    borderRadius: "50%",
                                                                    bgcolor:
                                                                        level.name === "Critical"
                                                                            ? "#ef4444"
                                                                            : level.name ===
                                                                              "Major"
                                                                            ? "#f97316"
                                                                            : level.name ===
                                                                              "Moderate"
                                                                            ? "#eab308"
                                                                            : "#22c55e",
                                                                }}
                                                            />
                                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                <Box
                                                                    sx={{
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        gap: 1,
                                                                        mb: 0.25,
                                                                    }}
                                                                >
                                                                    <Typography
                                                                        sx={{
                                                                            fontWeight: 700,
                                                                            fontSize: 14,
                                                                            color: "#0f172a",
                                                                        }}
                                                                    >
                                                                        {nameVi}
                                                                    </Typography>
                                                                    <Chip
                                                                        label="Hoạt động"
                                                                        size="small"
                                                                        sx={{
                                                                            bgcolor: "#16a34a",
                                                                            color: "#ffffff",
                                                                            fontSize: 11,
                                                                            fontWeight: 700,
                                                                            borderRadius: 999,
                                                                            px: 0.75,
                                                                        }}
                                                                    />
                                                                    <Chip
                                                                        label={pctLabel}
                                                                        size="small"
                                                                        sx={{
                                                                            bgcolor: "#eff6ff",
                                                                            borderRadius: 999,
                                                                            fontSize: 11,
                                                                            fontWeight: 700,
                                                                            color: "#1d4ed8",
                                                                        }}
                                                                    />
                                                                </Box>
                                                                {level.description ? (
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{
                                                                            fontSize: 12,
                                                                            color: "#6b7280",
                                                                        }}
                                                                    >
                                                                        {level.description}
                                                                    </Typography>
                                                                ) : null}
                                                            </Box>
                                                        </Box>
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: 0.5,
                                                            }}
                                                        >
                                                            <IconButton
                                                                size="small"
                                                                disabled={!reportEditing}
                                                                sx={{ color: "#6b7280" }}
                                                                aria-label={`Chỉnh sửa mức ${nameVi}`}
                                                                onClick={() =>
                                                                    openSeverityDialog(
                                                                        "edit",
                                                                        severityDraft.findIndex(
                                                                            (x) => x.name === level.name
                                                                        )
                                                                    )
                                                                }
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                disabled={!reportEditing}
                                                                sx={{ color: "#ef4444" }}
                                                                aria-label={`Xóa mức ${nameVi}`}
                                                                onClick={() =>
                                                                    setSeverityDraft((prev) =>
                                                                        prev.filter(
                                                                            (x) => x.name !== level.name
                                                                        )
                                                                    )
                                                                }
                                                            >
                                                                <DeleteOutlineIcon fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    </Box>
                                                );
                                            })}
                                        </Stack>
                                    ) : (
                                        <Typography variant="body2" sx={{ color: "#64748b" }}>
                                            Không có dữ liệu mức độ báo cáo.
                                        </Typography>
                                    )}
                                </Box>

                                <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end", gap: 1 }}>
                                    {reportEditing ? (
                                        <>
                                            <Button
                                                variant="outlined"
                                                onClick={cancelReportEdit}
                                                disabled={saving}
                                                sx={cancelButtonSx}
                                            >
                                                Hủy
                                            </Button>
                                            <Button
                                                variant="contained"
                                                disabled={saving}
                                                onClick={() => void saveReportEdit()}
                                                sx={saveButtonSx}
                                            >
                                                Lưu
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            variant="outlined"
                                            onClick={startReportEdit}
                                            disabled={saving}
                                            sx={cancelButtonSx}
                                        >
                                            Chỉnh sửa
                                        </Button>
                                    )}
                                </Box>

                                {activeTabKey === "report" && status.message ? (
                                    <Alert severity={status.type || "success"} sx={{ mt: 2 }}>
                                        {status.message}
                                    </Alert>
                                ) : null}
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                <Dialog
                    open={severityDialogOpen}
                    onClose={closeSeverityDialog}
                    fullWidth
                    maxWidth="sm"
                >
                    <DialogTitle sx={{ fontWeight: 700 }}>
                        {severityDialogMode === "add" ? "Thêm" : "Chỉnh sửa"} mức độ báo cáo
                    </DialogTitle>
                    <DialogContent sx={{ pt: 1.5 }}>
                        <Stack spacing={2}>
                            <TextField
                                label="Tên mức độ"
                                size="small"
                                fullWidth
                                value={severityDialogValue.name}
                                onChange={(e) => {
                                    setSeverityDialogValue((prev) => ({
                                        ...prev,
                                        name: e.target.value,
                                    }));
                                    if (severityDialogError.name) {
                                        setSeverityDialogError((prev) => ({
                                            ...prev,
                                            name: "",
                                        }));
                                    }
                                }}
                                error={Boolean(severityDialogError.name)}
                                helperText={severityDialogError.name || ""}
                            />
                            <TextField
                                label="Mô tả"
                                size="small"
                                fullWidth
                                multiline
                                minRows={2}
                                value={severityDialogValue.description}
                                onChange={(e) =>
                                    setSeverityDialogValue((prev) => ({
                                        ...prev,
                                        description: e.target.value,
                                    }))
                                }
                            />
                            <TextField
                                label="Phần trăm bồi thường (%)"
                                size="small"
                                fullWidth
                                type="number"
                                value={severityDialogValue.compensationPct}
                                onChange={(e) => {
                                    setSeverityDialogValue((prev) => ({
                                        ...prev,
                                        compensationPct: e.target.value,
                                    }));
                                    if (severityDialogError.compensationPct) {
                                        setSeverityDialogError((prev) => ({
                                            ...prev,
                                            compensationPct: "",
                                        }));
                                    }
                                }}
                                error={Boolean(severityDialogError.compensationPct)}
                                helperText={
                                    severityDialogError.compensationPct ||
                                    "Nhập số nguyên từ 0 đến 100, ví dụ: 25."
                                }
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button
                            onClick={closeSeverityDialog}
                            variant="outlined"
                            sx={cancelButtonSx}
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={submitSeverityDialog}
                            variant="contained"
                            sx={saveButtonSx}
                        >
                            Lưu
                        </Button>
                    </DialogActions>
                </Dialog>
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
                        borderBottom: "1px solid #e2e8f0",
                        "& .MuiTabs-indicator": { height: 3 },
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
                                color: "#64748b",
                                minHeight: 40,
                                fontSize: 13,
                                "&.Mui-selected": {
                                    color: "#2563eb",
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
                            {activeTabKey === "media" ? renderMediaTab() : null}
                            {activeTabKey === "limits" ? renderLimitsTab() : null}
                            {activeTabKey === "policies" ? renderSubscriptionTab() : null}

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

