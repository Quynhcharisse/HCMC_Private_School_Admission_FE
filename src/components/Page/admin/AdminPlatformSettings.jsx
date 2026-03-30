import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    alpha,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
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
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { BarChart } from "@mui/x-charts/BarChart";
import axiosClient from "../../../configs/APIConfig.jsx";
import { enqueueSnackbar } from "notistack";

export default function AdminPlatformSettings() {
    const tabs = useMemo(
        () => [
            { label: "Cài đặt Doanh nghiệp", key: "business" },
            { label: "Cài đặt Phương tiện", key: "media" },
            { label: "Cài đặt Hạn mức Tuyển sinh", key: "limits" },
            { label: "Cài đặt Chính sách Đăng ký", key: "policies" },
            { label: "Cài đặt Báo cáo", key: "report" },
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
        const taxRatePct = Number(business.taxRate ?? 0);
        const serviceRatePct = Number(business.serviceRate ?? 0);
        return {
            minPay: minPay === "" ? "" : String(minPay),
            maxPay: maxPay === "" ? "" : String(maxPay),
            taxRatePct: String(Math.round(taxRatePct * 100) / 100),
            serviceRatePct: String(Math.round(serviceRatePct * 100) / 100),
        };
    };

    const getSubscriptionInitialForm = (cfg) => {
        const sub = cfg?.subscription || {};
        const biz = cfg?.business || {};
        return {
            trialDays: sub.trialDays ?? "",
            gracePeriod: sub.gracePeriod ?? "",
            minSubscriptionMonth: sub.minSubscriptionMonth ?? "",
            taxRatePct: String(Math.round(Number(biz.taxRate ?? 0) * 100) / 100),
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
        taxRatePct: "0",
        minSubscriptionMonth: "",
    });
    const [subscriptionErrors, setSubscriptionErrors] = useState({});

    const [subscriptionEditing, setSubscriptionEditing] = useState(false);
    const [mediaEditing, setMediaEditing] = useState(false);

    const [selectedQuotaYear, setSelectedQuotaYear] = useState("");

    const [mediaFormatsTab, setMediaFormatsTab] = useState(0);
    const [imgFormatsDraft, setImgFormatsDraft] = useState([]);
    const [videoFormatsDraft, setVideoFormatsDraft] = useState([]);

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

    const parseFinite = (v) => {
        if (v === "" || v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    };

    const normalizeFormatString = (raw) => {
        const v = String(raw ?? "").trim().toLowerCase();
        if (!v) return "";
        if (!v.startsWith(".")) return `.${v}`;
        return v;
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
        const taxRatePct = parseFinite(form.taxRatePct);
        const minSubscriptionMonth = parseFinite(form.minSubscriptionMonth);

        if (trialDays === null) errors.trialDays = "Vui lòng nhập Số ngày dùng thử.";
        if (gracePeriod === null) errors.gracePeriod = "Vui lòng nhập Thời gian gia hạn.";
        if (minSubscriptionMonth === null) errors.minSubscriptionMonth = "Vui lòng nhập Số tháng đăng ký tối thiểu.";
        if (taxRatePct === null) errors.taxRatePct = "Vui lòng nhập Thuế suất.";

        if (trialDays !== null && trialDays < 0) errors.trialDays = "Số ngày dùng thử không được âm.";
        if (gracePeriod !== null && gracePeriod < 0) errors.gracePeriod = "Thời gian gia hạn không được âm.";
        if (minSubscriptionMonth !== null && minSubscriptionMonth < 1) errors.minSubscriptionMonth = "Số tháng đăng ký tối thiểu phải >= 1.";
        if (taxRatePct !== null && (taxRatePct < 0 || taxRatePct > 100)) errors.taxRatePct = "Thuế suất phải trong [0..100].";

        return errors;
    };

    const fetchConfig = async () => {
        setLoadingConfig(true);
        try {
            const res = await axiosClient.get("/system/config");
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
        setImgFormatsDraft((media.imgFormat || []).map((x) => x?.format).filter(Boolean));
        setVideoFormatsDraft((media.videoFormat || []).map((x) => x?.format).filter(Boolean));
        setFormatDialogOpen(false);
        setFormatDialogMode("add");
        setFormatDialogIndex(-1);
        setFormatDialogValue("");
        setFormatDialogError("");

        setBusinessEditing(false);
        setSubscriptionEditing(false);
        setMediaEditing(false);
    }, [configBody]);

    useEffect(() => {
        if (activeTabKey !== "business") setBusinessEditing(false);
        if (activeTabKey !== "policies") setSubscriptionEditing(false);
        if (activeTabKey !== "media") setMediaEditing(false);
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
        setImgFormatsDraft((media.imgFormat || []).map((x) => x?.format).filter(Boolean));
        setVideoFormatsDraft((media.videoFormat || []).map((x) => x?.format).filter(Boolean));
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
        return Math.round(pct * 10000) / 10000;
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

        if (formatDialogType === "image") {
            setImgFormatsDraft((prev) => {
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
        } else {
            setVideoFormatsDraft((prev) => {
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
        }

        closeFormatDialog();
    };

    const saveMediaFormats = async () => {
        if (!configBody) return;
        setSaving(true);
        let ok = false;
        setStatus({ type: "", message: "" });
        try {
            const updatedBody = {
                media: {
                    imgFormat: imgFormatsDraft.map((f) => ({ format: f })),
                    videoFormat: videoFormatsDraft.map((f) => ({ format: f })),
                },
            };
            await axiosClient.put("/system/config", { body: updatedBody });
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

            await axiosClient.put("/system/config", { body: updatedBody });
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
            const taxRate = toRateDecimal(subscriptionForm.taxRatePct);

            const updatedBody = {
                subscription: {
                    trialDays,
                    gracePeriod,
                    minSubscriptionMonth,
                },
                business: {
                    taxRate,
                },
            };

            await axiosClient.put("/system/config", { body: updatedBody });
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
                const taxRateValue = businessForm.taxRatePct === "" ? "" : Number(businessForm.taxRatePct);
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
                                border: "1px solid #e2e8f0",
                                borderRadius: 2,
                                p: 1.25,
                                bgcolor: "#f8fafc",
                                height: "100%",
                                boxSizing: "border-box",
                            }}
                        >
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#64748b", mb: 0.5 }}>
                                Thuế suất (%)
                            </Typography>
                            <Tooltip title="Tỷ lệ thuế áp dụng cho giao dịch (đơn vị: %).">
                                <TextField
                                    size="small"
                                    fullWidth
                                    disabled={businessDisabled}
                                    value={taxRateValue}
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
                                    inputProps={{ min: 0, max: 100, step: 0.01 }}
                                />
                            </Tooltip>
                        </Box>

                        <Box
                            sx={{
                                flex: "1 1 220px",
                                minWidth: 240,
                                border: "1px solid #e2e8f0",
                                borderRadius: 2,
                                p: 1.25,
                                bgcolor: "#f8fafc",
                                height: "100%",
                                boxSizing: "border-box",
                            }}
                        >
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#64748b", mb: 0.5 }}>
                                Phí dịch vụ (%)
                            </Typography>
                            <Tooltip title="Phí dịch vụ tính trên giao dịch (đơn vị: %).">
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
                                    inputProps={{ min: 0, max: 100, step: 0.01 }}
                                />
                            </Tooltip>
                        </Box>

                        <Box
                            sx={{
                                flex: "1 1 280px",
                                minWidth: 320,
                                border: "1px solid #e2e8f0",
                                borderRadius: 2,
                                p: 1.25,
                                bgcolor: "#f8fafc",
                                height: "100%",
                                boxSizing: "border-box",
                            }}
                        >
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#64748b", mb: 0.5 }}>
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
                                />
                                <FormControl size="small" sx={{ minWidth: 90 }}>
                                    <Select value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={businessDisabled}>
                                        {currencyOptions.map((c) => (
                                            <MenuItem key={c} value={c}>
                                                {c}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                flex: "1 1 280px",
                                minWidth: 320,
                                border: "1px solid #e2e8f0",
                                borderRadius: 2,
                                p: 1.25,
                                bgcolor: "#f8fafc",
                                height: "100%",
                                boxSizing: "border-box",
                            }}
                        >
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#64748b", mb: 0.5 }}>
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
                                />
                                <FormControl size="small" sx={{ minWidth: 90 }}>
                                    <Select value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={businessDisabled}>
                                        {currencyOptions.map((c) => (
                                            <MenuItem key={c} value={c}>
                                                {c}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
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
                <Box sx={{ flex: "1 1 220px", minWidth: 240, border: "1px solid #e2e8f0", borderRadius: 2, p: 1.25, bgcolor: "#f8fafc", boxSizing: "border-box" }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#64748b", mb: 0.5 }}>Số ngày dùng thử</Typography>
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
                        />
                    </Tooltip>
                </Box>

                <Box sx={{ flex: "1 1 220px", minWidth: 240, border: "1px solid #e2e8f0", borderRadius: 2, p: 1.25, bgcolor: "#f8fafc", boxSizing: "border-box" }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#64748b", mb: 0.5 }}>Thời gian gia hạn</Typography>
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
                        />
                    </Tooltip>
                </Box>

                <Box sx={{ flex: "1 1 220px", minWidth: 240, border: "1px solid #e2e8f0", borderRadius: 2, p: 1.25, bgcolor: "#f8fafc", boxSizing: "border-box" }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#64748b", mb: 0.5 }}>Thuế suất (%)</Typography>
                    <Tooltip title="Thuế suất áp dụng cho đăng ký (đơn vị: %).">
                        <TextField
                            size="small"
                            fullWidth
                            disabled={subscriptionDisabled}
                            type="number"
                            value={subscriptionForm.taxRatePct}
                            onChange={(e) => {
                                const nextVal = e.target.value;
                                setSubscriptionForm((prev) => {
                                    const next = { ...prev, taxRatePct: nextVal };
                                    setSubscriptionErrors(validateSubscription(next));
                                    return next;
                                });
                            }}
                            inputProps={{ min: 0, max: 100 }}
                            error={Boolean(subscriptionErrors.taxRatePct)}
                            helperText={subscriptionErrors.taxRatePct || ""}
                            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                        />
                    </Tooltip>
                </Box>

                <Box sx={{ flex: "1 1 220px", minWidth: 240, border: "1px solid #e2e8f0", borderRadius: 2, p: 1.25, bgcolor: "#f8fafc", boxSizing: "border-box" }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#64748b", mb: 0.5 }}>Số tháng đăng ký tối thiểu</Typography>
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
        const media = configBody?.media || {};
        const isImageTab = mediaFormatsTab === 0;
        const mediaDisabled = !mediaEditing || saving;
        const imgFormats = imgFormatsDraft || [];
        const videoFormats = videoFormatsDraft || [];

        const list = isImageTab ? imgFormats : videoFormats;
        const dialogTypeLabel = isImageTab ? "ảnh" : "video";

        const deleteFormatFromDraft = (type, index) => {
            if (type === "image") {
                setImgFormatsDraft((prev) => prev.filter((_, i) => i !== index));
                return;
            }
            setVideoFormatsDraft((prev) => prev.filter((_, i) => i !== index));
        };

        const capacityValue = isImageTab ? media.maxImgSize : media.maxVideoSize;
        const reportValue = isImageTab ? media.maxReportImg : media.maxReportVideo;
        const refValue = isImageTab ? media.maxDesignRefImg : media.maxDesignRefVideo;
        const feedbackValue = isImageTab ? media.maxFeedbackImg : media.maxFeedbackVideo;
        const reportUnit = isImageTab ? "ảnh" : "video";
        const summaryItems = isImageTab
            ? [
                  { label: "Dung lượng tối đa:", value: `${capacityValue ?? "-"}MB` },
                  { label: "Báo cáo tối đa:", value: `${reportValue ?? "-"} ${reportUnit}` },
                  { label: "Tham chiếu tối đa:", value: `${refValue ?? "-"} ${reportUnit}` },
                  { label: "Phản hồi tối đa:", value: `${feedbackValue ?? "-"} ${reportUnit}` },
              ]
            : [
                  { label: "Dung lượng tối đa:", value: `${capacityValue ?? "-"}MB` },
                  { label: "Báo cáo tối đa:", value: `${reportValue ?? "-"} ${reportUnit}` },
                  { label: "Phản hồi tối đa:", value: `${feedbackValue ?? "-"} ${reportUnit}` },
              ];

        return (
            <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#2563eb", mb: 1.5 }}>
                    Cấu hình phương tiện
                </Typography>

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
                        </Tabs>

                        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, gap: 2 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                                    Cấu hình định dạng {dialogTypeLabel} được chấp nhận
                                </Typography>

                                <Button
                                    variant="contained"
                                    onClick={() => openAddFormatDialog(isImageTab ? "image" : "video")}
                                    sx={{
                                        bgcolor: "#0ea5e9",
                                        fontWeight: 700,
                                        borderRadius: 2,
                                        textTransform: "none",
                                        "&:hover": { bgcolor: "#0284c7" },
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
                                                                isImageTab ? "image" : "video",
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
                                                                isImageTab ? "image" : "video",
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

                            <Box
                                sx={{
                                    mt: 2,
                                    p: { xs: 1.25, md: 1.5 },
                                    bgcolor: "#eff6ff",
                                    border: "1px solid #bfdbfe",
                                    borderRadius: "12px",
                                }}
                            >
                                <Box
                                    sx={{
                                        width: "100%",
                                        display: "flex",
                                        alignItems: "baseline",
                                        justifyContent: "space-between",
                                        gap: 2,
                                        flexWrap: "nowrap",
                                    }}
                                >
                                    {summaryItems.map((item) => (
                                        <Box key={item.label} sx={{ display: "flex", alignItems: "baseline", gap: 1, flex: "1 1 0" }}>
                                            <Typography sx={{ fontSize: 14, color: "#64748b", fontWeight: 600 }}>{item.label}</Typography>
                                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{item.value}</Typography>
                                        </Box>
                                    ))}
                                </Box>
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
                        {formatDialogMode === "add" ? "Thêm" : "Sửa"} định dạng {formatDialogType === "image" ? "ảnh" : "video"}
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

                <Card elevation={0} sx={{ borderRadius: 2, border: "1px solid #e2e8f0" }}>
                    <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                        <Box sx={{ mb: 2, maxWidth: 280 }}>
                            <FormControl size="small" fullWidth>
                                <Select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedQuotaYear(e.target.value)}
                                    displayEmpty
                                    sx={{ borderRadius: 1 }}
                                >
                                    {quotaYears.map((y) => (
                                        <MenuItem key={y} value={y}>
                                            {y}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        <TableContainer sx={{ border: "1px solid #e2e8f0", borderRadius: 1 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                        <TableCell align="center" sx={{ fontWeight: 700, color: "#334155" }}>Năm học</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700, color: "#334155" }}>Nguồn dữ liệu</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700, color: "#334155" }}>Hạn mức tuyển sinh</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700, color: "#334155" }}>
                                            Thao tác
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.length ? (
                                        rows.map((row) => (
                                            <TableRow
                                                key={row.year}
                                                sx={{
                                                    bgcolor: row.year === selectedYear ? "#f0f9ff" : "#fff",
                                                }}
                                            >
                                                <TableCell align="center" sx={{ color: "#0f172a", fontWeight: 600 }}>{row.year}</TableCell>
                                                <TableCell align="center">
                                                    {row.sourceUrl ? (
                                                        <Link
                                                            href={row.sourceUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            sx={{ color: "#2563eb", textDecorationColor: "#2563eb" }}
                                                        >
                                                            {row.sourceUrl}
                                                        </Link>
                                                    ) : (
                                                        <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                                                            Không có
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell align="center" sx={{ color: row.hasQuota ? "#0f172a" : "#64748b", fontWeight: 600 }}>
                                                    {row.hasQuota ? "Đã cấu hình" : "Chưa cấu hình"}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => setSelectedQuotaYear(row.year)}
                                                        sx={{ color: "#2563eb" }}
                                                        aria-label={`Cập nhật ${row.year}`}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center">
                                                <Typography variant="body2" sx={{ color: "#64748b", py: 1, textAlign: "center" }}>
                                                    Không có dữ liệu.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            </Box>
        );
    };

    const renderReportTab = () => {
        const report = configBody?.report || {};
        const levels = report.severityLevels || [];
        const sortedLevels = [...levels]
            .filter((x) => Number.isFinite(Number(x?.compensation)))
            .sort((a, b) => Number(b.compensation) - Number(a.compensation));
        const severityNameMap = {
            Minor: "Nhẹ",
            Moderate: "Trung bình",
            Major: "Nặng",
            Critical: "Nghiêm trọng",
        };
        const chartData = sortedLevels.map((x) => ({
            level: severityNameMap[x.name] || x.name,
            compensation: Number(x.compensation) || 0,
        }));
        const values = chartData.map((x) => x.compensation);
        const minValue = values.length ? Math.min(...values) : 0;
        const maxValue = values.length ? Math.max(...values) : 0;
        const span = Math.max(maxValue - minValue, 1);
        const t1 = minValue + span * 0.25;
        const t2 = minValue + span * 0.5;
        const t3 = minValue + span * 0.75;
        return (
            <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#2563eb", mb: 1.5 }}>
                    Cấu hình báo cáo
                </Typography>

                <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e2e8f0", width: "100%" }}>
                    <CardContent>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                            <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>
                                Mức độ nghiêm trọng
                            </Typography>
                            <Box
                                sx={{
                                    px: 1.25,
                                    py: 0.6,
                                    borderRadius: 2,
                                    bgcolor: "#eff6ff",
                                    border: "1px solid #bfdbfe",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.75,
                                }}
                            >
                                <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                                    Số ngày chi trả tối đa
                                </Typography>
                                <Typography sx={{ fontSize: 16, color: "#2563eb", fontWeight: 800 }}>
                                    {report.maxDisbursementDay ?? "-"}
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ width: "100%" }}>
                            {chartData.length ? (
                                <BarChart
                                    height={240}
                                    dataset={chartData}
                                    layout="horizontal"
                                    xAxis={[
                                        {
                                            min: 0,
                                            colorMap: {
                                                type: "piecewise",
                                                thresholds: [t1, t2, t3],
                                                colors: ["#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6"],
                                            },
                                        },
                                    ]}
                                    yAxis={[{ scaleType: "band", dataKey: "level", width: 95 }]}
                                    series={[
                                        {
                                            dataKey: "compensation",
                                            valueFormatter: (value) => `${value ?? 0}`,
                                        },
                                    ]}
                                    margin={{ left: 0, right: 8, top: 10, bottom: 20 }}
                                    sx={{ width: "100%" }}
                                />
                            ) : (
                                <Typography variant="body2" sx={{ color: "#64748b" }}>
                                    Không có dữ liệu.
                                </Typography>
                            )}
                        </Box>
                    </CardContent>
                </Card>
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
                            {activeTabKey === "report" ? renderReportTab() : null}

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

