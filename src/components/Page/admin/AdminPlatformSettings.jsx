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
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { getSystemConfig, updateSystemConfig } from "../../../services/SystemConfigService.jsx";
import { enqueueSnackbar } from "notistack";
import { sanitizeAdmissionSettingsForApi } from "../../../utils/admissionSettingsShared.js";

/** Hạn mức theo năm học: GET thường trả `admissionQuota`; bản cũ có thể là `quota`. */
function getAdmissionQuotaMap(cfg) {
    if (!cfg || typeof cfg !== "object") return {};
    const m = cfg.admissionQuota ?? cfg.quota;
    return m && typeof m === "object" && !Array.isArray(m) ? m : {};
}

function mergeSystemConfigPayload(cfg, patch) {
    if (!cfg || typeof cfg !== "object") return patch;
    return { ...cfg, ...patch };
}

function apiErrorMessage(e, fallback) {
    const d = e?.response?.data;
    const m = d?.message ?? d?.body?.message ?? d?.error ?? e?.message;
    const s = m != null ? String(m).trim() : "";
    return s || fallback;
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

    const [businessForm, setBusinessForm] = useState({
        minPay: "",
        maxPay: "",
        taxRatePct: "0",
        serviceRatePct: "0",
    });
    const [businessErrors, setBusinessErrors] = useState({});

    const [businessEditing, setBusinessEditing] = useState(false);

    const [mediaEditing, setMediaEditing] = useState(false);
    const [quotaEditing, setQuotaEditing] = useState(false);

    const [selectedQuotaYear, setSelectedQuotaYear] = useState("");
    const [quotaForm, setQuotaForm] = useState({ sourceUrl: "" });
    const [quotaErrors, setQuotaErrors] = useState({});

    const [admissionTemplateForm, setAdmissionTemplateForm] = useState({
        allowedMethods: [],
        autoCloseOnFull: true,
        quotaAlertThresholdPercent: 90,
    });
    const [admissionTemplateEditing, setAdmissionTemplateEditing] = useState(false);

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
        if (!configBody) return;
        const bizInit = getBusinessInitialForm(configBody);
        setBusinessForm(bizInit);
        setBusinessErrors(validateBusiness(bizInit));

        const quotaYears = Object.keys(getAdmissionQuotaMap(configBody));
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
            const prevMedia = configBody.media || {};
            const {
                imgFormats: _imgF,
                videoFormats: _vidF,
                docFormats: _docF,
                imgFormat: _imgOld,
                videoFormat: _vidOld,
                docFormat: _docOld,
                ...mediaRest
            } = prevMedia;
            const mediaPatch = {
                mediaData: {
                    ...mediaRest,
                    maxImgSize: parseFinite(mediaLimitsForm.maxImgSize),
                    maxVideoSize: parseFinite(mediaLimitsForm.maxVideoSize),
                    maxDocSize: parseFinite(mediaLimitsForm.maxDocSize),
                    imgFormat: imgFormatsDraft.map((f) => ({ format: f })),
                    videoFormat: videoFormatsDraft.map((f) => ({ format: f })),
                    docFormat: docFormatsDraft.map((f) => ({ format: f })),
                },
            };
            await updateSystemConfig(mergeSystemConfigPayload(configBody, mediaPatch));
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
            const currentQuota = getAdmissionQuotaMap(configBody);
            const existing = currentQuota[selectedQuotaYear] || {};
            const updatedAdmissionQuota = {
                ...currentQuota,
                [selectedQuotaYear]: {
                    ...existing,
                    sourceUrl: quotaForm.sourceUrl || "",
                },
            };

            const updatedBody = mergeSystemConfigPayload(configBody, {
                admissionQuotaData: updatedAdmissionQuota,
            });

            await updateSystemConfig(updatedBody);
            enqueueSnackbar("Cập nhật Cài đặt Hạn mức Tuyển sinh thành công.", { variant: "success" });
            setStatus({ type: "success", message: "Cập nhật thành công." });
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

            const updatedBody = mergeSystemConfigPayload(configBody, {
                businessData: {
                    ...(configBody.businessData || {}),
                    minPay: minPay != null ? Math.trunc(minPay) : minPay,
                    maxPay: maxPay != null ? Math.trunc(maxPay) : maxPay,
                    taxRate,
                    serviceRate,
                },
            });

            await updateSystemConfig(updatedBody);
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
            await updateSystemConfig(
                mergeSystemConfigPayload(configBody, { admissionSettingsData: sanitized })
            );
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
        const methodCount = methods.filter((m) => String(m?.code ?? "").trim()).length;

        return (
            <Stack spacing={2.5} sx={{ width: "100%" }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2, sm: 2.5 },
                        borderRadius: 2.5,
                        border: "1px solid",
                        borderColor: "divider",
                        background: (theme) =>
                            `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 45%, #fff 100%)`,
                    }}
                >
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-start" }} justifyContent="space-between">
                        <Stack direction="row" spacing={1.75} alignItems="flex-start">
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 2,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                                    color: "primary.main",
                                    flexShrink: 0,
                                }}
                            >
                                <AssignmentOutlinedIcon sx={{ fontSize: 26 }} />
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.35 }}>
                                    Mẫu phương thức tuyển sinh
                                </Typography>
                                <Typography variant="body2" sx={{ color: "#64748b", mt: 0.75, maxWidth: 720 }}>
                                    Định nghĩa danh mục mặc định toàn hệ thống. Trường có thể lấy mẫu này khi cấu hình; mỗi trường vẫn có thể lưu bản riêng sau khi chỉnh.
                                </Typography>
                            </Box>
                        </Stack>
                        <Chip
                            size="small"
                            label={`${methodCount} mã hợp lệ`}
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 700, alignSelf: { xs: "flex-start", sm: "center" } }}
                        />
                    </Stack>
                </Paper>

                <Alert severity="info" variant="outlined" icon={false} sx={{ borderRadius: 2, bgcolor: "rgba(37, 99, 235, 0.04)", borderColor: "rgba(37, 99, 235, 0.22)" }}>
                    <Typography variant="body2" sx={{ color: "#334155", fontWeight: 600 }}>
                        Gợi ý cho quản trị
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>
                        <strong>Mã (code)</strong> là khóa tham chiếu (hồ sơ, quy trình). Giữ mã ổn định; chỉnh tên/mô tả an toàn hơn là đổi mã khi đã có trường áp dụng.
                    </Typography>
                </Alert>

                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 2.5,
                        border: "1px solid",
                        borderColor: "divider",
                        overflow: "hidden",
                    }}
                >
                    <Box
                        sx={{
                            px: 2,
                            py: 1.25,
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            bgcolor: "rgba(248, 250, 252, 0.95)",
                        }}
                    >
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                            Danh sách phương thức
                        </Typography>
                    </Box>
                    <TableContainer sx={{ maxWidth: "100%" }}>
                        <Table size="small" sx={{ minWidth: 800, tableLayout: "fixed" }}>
                            <TableHead>
                                <TableRow sx={{ bgcolor: "rgba(241, 245, 249, 0.85)" }}>
                                    <TableCell sx={{ fontWeight: 800, color: "#334155", width: "28%", minWidth: 220, py: 1.25 }}>
                                        Mã (code)
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 800, color: "#334155", width: "28%", minWidth: 180, py: 1.25 }}>
                                        Tên hiển thị
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 800, color: "#334155", py: 1.25 }}>Mô tả</TableCell>
                                    <TableCell align="center" sx={{ width: 52, py: 1.25 }} />
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
                                            sx={{ "&:nth-of-type(even)": { bgcolor: "rgba(248, 250, 252, 0.5)" } }}
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
                            borderColor: "divider",
                            bgcolor: "rgba(248, 250, 252, 0.6)",
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
                                bgcolor: "#2563eb",
                                "&:hover": { boxShadow: "0 4px 14px rgba(37, 99, 235, 0.28)", bgcolor: "#1d4ed8" },
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
        const quota = getAdmissionQuotaMap(configBody);
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

