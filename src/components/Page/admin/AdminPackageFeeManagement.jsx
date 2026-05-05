import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    InputLabel,
    IconButton,
    Paper,
    Select,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    alpha,
    MenuItem,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import PolicyOutlinedIcon from "@mui/icons-material/PolicyOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HighlightOffRoundedIcon from "@mui/icons-material/HighlightOffRounded";
import AddIcon from "@mui/icons-material/Add";
import FileUploadSharpIcon from "@mui/icons-material/FileUploadSharp";
import BlockSharpIcon from "@mui/icons-material/BlockSharp";
import { enqueueSnackbar } from "notistack";
import ConfirmDialog, { ConfirmHighlight } from "../../ui/ConfirmDialog.jsx";
import { APP_PRIMARY_MAIN } from "../../../constants/homeLandingTheme";
import {
    adminDialogActionsSx,
    adminDialogContentSx,
    adminDialogPaperSx,
    adminDialogTitleSx,
} from "../../../constants/adminDialogStyles.js";
import {
    adminDataCardBorderSx,
    adminSttChipSx,
    adminTableBodyRowSx,
    adminTableContainerSx,
    adminTableHeadCellSx,
    adminTableHeadRowSx,
} from "../../../constants/adminTableStyles.js";
import { deactiveAdminPackageFee, getAdminPackageFees, publishAdminPackageFee, upsertAdminPackageFee } from "../../../services/AdminService.jsx";
import { getSystemConfig } from "../../../services/SystemConfigService.jsx";

const defaultForm = {
    packageId: null,
    name: "",
    packageType: "STANDARD",
    durationDays: "",
    maxCounsellors: "",
    postLimit: "",
    hasAiAssistant: false,
    parentPostPermission: "CREATE_POST",
    supportLevel: "STANDARD_SUPPORT",
};

const PACKAGE_TYPES = ["TRIAL", "STANDARD", "ENTERPRISE"];
const SUPPORT_LEVELS = ["BASIC_SUPPORT", "STANDARD_SUPPORT", "PREMIUM_SUPPORT"];
const PARENT_POST_PERMISSIONS = ["VIEW_ONLY", "CREATE_POST"];

function packageTypeLabelVi(value) {
    const v = String(value || "").toUpperCase();
    if (v === "TRIAL") return "Dùng thử";
    if (v === "STANDARD") return "Tiêu chuẩn";
    if (v === "ENTERPRISE") return "Doanh nghiệp";
    return value == null || value === "" ? "—" : String(value);
}

function supportLevelLabelVi(value) {
    const v = String(value || "").toUpperCase();
    if (v === "BASIC_SUPPORT") return "Hỗ trợ cơ bản";
    if (v === "STANDARD_SUPPORT") return "Hỗ trợ tiêu chuẩn";
    if (v === "PREMIUM_SUPPORT") return "Hỗ trợ cao cấp";
    return value == null || value === "" ? "—" : String(value);
}

function parentPostPermissionLabelVi(value) {
    const v = String(value || "").toUpperCase();
    if (v === "VIEW_ONLY") return "Chỉ xem bài đăng";
    if (v === "CREATE_POST") return "Được tạo bài đăng";
    return value == null || value === "" ? "—" : String(value);
}

function packageStatusLabel(status) {
    const s = String(status || "").toUpperCase();
    if (s === "DRAFT" || s === "PACKAGE_DRAFT") return "Bản nháp";
    if (s === "PACKAGE_PUBLISHED" || s === "PUBLISHED") return "Đã phát hành";
    if (s === "PACKAGE_ACTIVE" || s === "ACTIVE") return "Hoạt động";
    if (s === "PACKAGE_PENDING_DEACTIVE" || s === "PENDING_DEACTIVE") return "Chờ ngừng bán";
    if (s === "PACKAGE_DEACTIVATED" || s === "DEACTIVATED") return "Đã ngừng bán";
    return status || "Không xác định";
}

function packageStatusChipProps(status) {
    const s = String(status || "").toUpperCase();
    if (s === "PACKAGE_DRAFT" || s === "DRAFT") return { color: "warning", variant: "filled" };
    if (s === "PACKAGE_ACTIVE" || s === "ACTIVE" || s === "PACKAGE_PUBLISHED" || s === "PUBLISHED")
        return { color: "success", variant: "filled" };
    if (s === "PACKAGE_PENDING_DEACTIVE" || s === "PENDING_DEACTIVE") return { color: "warning", variant: "outlined" };
    if (s === "PACKAGE_DEACTIVATED" || s === "DEACTIVATED") return { color: "error", variant: "outlined" };
    return { color: "default", variant: "outlined" };
}

function canDeactivatePackage(status) {
    return status === "PACKAGE_ACTIVE" || status === "PACKAGE_PUBLISHED";
}

function pickHttpErrorMessage(error, fallback) {
    const d = error?.response?.data;
    if (!d || typeof d !== "object") return fallback;
    if (typeof d.message === "string" && d.message.trim()) return d.message.trim();
    if (typeof d.error === "string" && d.error.trim()) return d.error.trim();
    if (typeof d?.body?.message === "string" && d.body.message.trim()) return d.body.message.trim();
    return fallback;
}

const vndFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

function formatVnd(amount) {
    if (amount === "" || amount === null || amount === undefined) return "";
    const n = Number(amount);
    if (Number.isNaN(n) || n < 0) return "";
    return vndFormatter.format(Math.trunc(n));
}

function parsePricingAmount(value) {
    if (value == null) return null;
    if (typeof value === "object") {
        const nestedAmount = value.amount;
        const parsedNested = Number(nestedAmount);
        if (Number.isFinite(parsedNested)) return parsedNested;
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

const FEATURE_CONTRIBUTION_LABEL_VI = {
    aiAssistantFee: "Phí trợ lý AI",
    premiumSupportFee: "Phí hỗ trợ ưu tiên",
    aiChatbotMonthlyFee: "Phí Chatbot AI (tháng)",
};

function featureContributionLabelVi(key) {
    const k = String(key || "").trim();
    if (FEATURE_CONTRIBUTION_LABEL_VI[k]) return FEATURE_CONTRIBUTION_LABEL_VI[k];
    return "Phí tính năng";
}

function mapPackageFromApi(item) {
    const features = item?.fullFeatures || item?.features || item?.featureData || {};
    const pricingBreakdown = item?.pricingBreakdown || {};
    const featureBreakdown = pricingBreakdown?.features || {};
    return {
        id: item?.id ?? null,
        name: item?.name || "",
        packageType: item?.packageType || "STANDARD",
        price:
            parsePricingAmount(item?.price) ??
            parsePricingAmount(item?.netPrice) ??
            parsePricingAmount(pricingBreakdown?.netPrice),
        basePrice: parsePricingAmount(item?.basePrice) ?? parsePricingAmount(pricingBreakdown?.basePrice),
        totalFeatureAmount:
            parsePricingAmount(item?.totalFeatureAmount) ?? parsePricingAmount(featureBreakdown?.amount),
        netPrice: parsePricingAmount(item?.netPrice) ?? parsePricingAmount(pricingBreakdown?.netPrice) ?? parsePricingAmount(item?.price),
        serviceFee: parsePricingAmount(item?.serviceFee) ?? parsePricingAmount(pricingBreakdown?.serviceFee),
        taxFee: parsePricingAmount(item?.taxFee) ?? parsePricingAmount(pricingBreakdown?.taxFee),
        finalPrice: parsePricingAmount(item?.finalPrice) ?? parsePricingAmount(pricingBreakdown?.finalPrice),
        durationDays: item?.durationDays != null ? Number(item.durationDays) : null,
        status: item?.status || "",
        featureContributions: featureBreakdown?.details || item?.featureContributions || {},
        features: {
            maxCounsellors: Number(features?.maxCounsellors ?? item?.maxCounsellors ?? 0),
            postLimit: Number(features?.postLimit ?? item?.postLimit ?? 0),
            hasAiAssistant: Boolean(features?.hasAiAssistant ?? item?.hasAiAssistant ?? features?.allowChat),
            parentPostPermission: String(features?.parentPostPermission || item?.parentPostPermission || "CREATE_POST"),
            supportLevel: String(features?.supportLevel || item?.supportLevel || "STANDARD_SUPPORT"),
        },
    };
}

function normalizePackageStatus(status) {
    const raw = String(status || "").toUpperCase();
    if (raw === "PACKAGE_DRAFT" || raw === "DRAFT") return "DRAFT";
    if (raw === "PACKAGE_ACTIVE" || raw === "ACTIVE") return "ACTIVE";
    if (raw === "PACKAGE_PUBLISHED" || raw === "PUBLISHED") return "PUBLISHED";
    if (raw === "PACKAGE_PENDING_DEACTIVE" || raw === "PENDING_DEACTIVE") return "PENDING_DEACTIVE";
    if (raw === "PACKAGE_DEACTIVATED" || raw === "DEACTIVATED") return "DEACTIVATED";
    return raw || "UNKNOWN";
}

function mapPricePreviewFromUpsertResponse(response) {
    const body = response?.data?.body || {};
    const subscription = body?.subscription || {};
    const pricing = body?.pricing || {};
    const pricingFeatures = pricing?.features || {};
    const featureContributions =
        (pricingFeatures?.details && typeof pricingFeatures.details === "object" ? pricingFeatures.details : null) ??
        (body?.featureContributions && typeof body.featureContributions === "object" ? body.featureContributions : {});
    const packageId = Number(subscription?.id ?? body?.packageId ?? body?.id);
    return {
        packageId: Number.isFinite(packageId) ? packageId : null,
        status: normalizePackageStatus(subscription?.status || "DRAFT"),
        price: parsePricingAmount(subscription?.netPrice) ?? parsePricingAmount(pricing?.netPrice),
        basePrice: parsePricingAmount(pricing?.basePrice),
        totalFeatureAmount:
            parsePricingAmount(pricing?.totalFeatureAmount) ?? parsePricingAmount(pricingFeatures?.amount),
        netPrice: parsePricingAmount(pricing?.netPrice) ?? parsePricingAmount(subscription?.netPrice),
        serviceFee: parsePricingAmount(pricing?.serviceFee) ?? parsePricingAmount(subscription?.serviceFee),
        taxFee: parsePricingAmount(pricing?.taxFee) ?? parsePricingAmount(subscription?.taxFee),
        finalPrice: parsePricingAmount(pricing?.finalPrice) ?? parsePricingAmount(subscription?.finalPrice),
        featureContributions:
            featureContributions && typeof featureContributions === "object" ? featureContributions : {},
    };
}

const packageDetailSectionSx = {
    border: "1px solid #bfdbfe",
    borderRadius: 3,
    bgcolor: "#eff6ff",
    p: { xs: 1.4, md: 1.8 },
    boxShadow: "0 10px 24px rgba(37,99,235,0.14)",
};

const packageDetailFieldBoxSx = {
    border: "1px solid #bfdbfe",
    borderRadius: 2.25,
    bgcolor: "#ffffff",
    px: 1.3,
    py: 1.1,
    boxShadow: "0 5px 12px rgba(37,99,235,0.08)",
};

const detailInfoLabelSx = { fontSize: 12, color: "#94a3b8", fontWeight: 600, display: "block", mb: 0.35 };
const detailInfoValueSx = { fontSize: 15, color: "#1e293b", fontWeight: 500, wordBreak: "break-word" };

const detailFeatureGridLabelSx = { fontSize: 12, color: "#94a3b8", fontWeight: 600, lineHeight: 1.3 };
const detailFeatureGridValueSx = { fontSize: 15, color: "#1e293b", fontWeight: 500, lineHeight: 1.35 };
const featureIconWrapSx = {
    width: 44,
    height: 44,
    borderRadius: 2,
    bgcolor: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
};

const pricingBreakSectionTitleSx = (compact) => ({
    fontSize: compact ? 11 : 11.5,
    fontWeight: 800,
    color: "#64748b",
    letterSpacing: "0.03em",
    textTransform: "uppercase",
    mb: 0.35,
});

function PackagePricingBreakdownView({
    basePrice,
    totalFeatureAmount,
    netPrice,
    priceFallback,
    serviceFee,
    taxFee,
    finalPrice,
    featureContributions = {},
    variant = "detail",
}) {
    const compact = variant === "sidebar";
    const labelFs = compact ? 12 : 13;
    const valueFs = compact ? 12 : 13;
    const contrib = Object.entries(featureContributions || {}).filter(([, v]) => parsePricingAmount(v) != null);
    const tamTinhRaw =
        netPrice != null && !Number.isNaN(Number(netPrice))
            ? Number(netPrice)
            : priceFallback != null && !Number.isNaN(Number(priceFallback))
              ? Number(priceFallback)
              : null;

    const fmt = (n) => (n != null && !Number.isNaN(Number(n)) ? `${formatVnd(n)} VNĐ` : "—");

    const row = (left, right, { pl = 0, leftWeight = 500, rightWeight = 600, leftColor = "#475569", rightColor = "#0f172a" } = {}) => (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1.5, pl }}>
            <Typography sx={{ fontSize: labelFs, color: leftColor, fontWeight: leftWeight, lineHeight: 1.35 }}>{left}</Typography>
            <Typography
                sx={{ fontSize: valueFs, color: rightColor, fontWeight: rightWeight, textAlign: "right", whiteSpace: "nowrap" }}
            >
                {right}
            </Typography>
        </Box>
    );

    const labelOnlyRow = (left, { pl = 0, leftWeight = 600, leftColor = "#475569" } = {}) => (
        <Box sx={{ pl }}>
            <Typography sx={{ fontSize: labelFs, color: leftColor, fontWeight: leftWeight, lineHeight: 1.35 }}>{left}</Typography>
        </Box>
    );

    return (
        <Box
            sx={{
                border: "1px solid #e2e8f0",
                borderRadius: 2.25,
                bgcolor: "#ffffff",
                px: compact ? 1.25 : 1.6,
                py: compact ? 1.2 : 1.45,
            }}
        >
            <Stack spacing={0.35}>
                <Typography sx={pricingBreakSectionTitleSx(compact)}>Cấu hình giá</Typography>
                {row("Giá nền", fmt(basePrice), { pl: 1.25 })}
                {labelOnlyRow("Phí tính năng", { pl: 1.25 })}
                {contrib.length ? (
                    <Stack spacing={0.45} sx={{ pl: 2.5, pt: 0.15, pb: 0.35 }}>
                        {contrib.map(([key, value]) =>
                            row(featureContributionLabelVi(key), fmt(parsePricingAmount(value)), {
                                pl: 0,
                                leftWeight: 500,
                                rightWeight: 600,
                                leftColor: "#64748b",
                            })
                        )}
                    </Stack>
                ) : null}

                <Divider sx={{ my: compact ? 1 : 1.15, borderColor: "#e2e8f0", borderStyle: "dashed" }} />

                {row("Tạm tính", fmt(tamTinhRaw), {
                    pl: 0,
                    leftWeight: 700,
                    rightWeight: 700,
                    leftColor: "#475569",
                    rightColor: "#475569",
                })}

                <Divider sx={{ my: compact ? 1 : 1.15, borderColor: "#e2e8f0", borderStyle: "dashed" }} />

                <Typography sx={pricingBreakSectionTitleSx(compact)}>Các khoản phí khác</Typography>
                {row("Phí dịch vụ", fmt(serviceFee), { pl: 1.25 })}
                {row("Thuế (VAT)", fmt(taxFee), { pl: 1.25 })}

                <Divider sx={{ my: compact ? 1 : 1.15, borderColor: "#cbd5e1" }} />

                <Box
                    sx={{
                        mt: 0.35,
                        py: 1,
                        px: 1.25,
                        borderRadius: 2,
                        bgcolor: "#eff6ff",
                        borderLeft: "4px solid #2563eb",
                    }}
                >
                    {row("Tổng thanh toán", fmt(finalPrice), {
                        pl: 0,
                        leftWeight: 800,
                        rightWeight: 800,
                        leftColor: "#1d4ed8",
                        rightColor: "#2563eb",
                    })}
                </Box>
            </Stack>
        </Box>
    );
}

function PackageDetailPriceDurationSection({
    price,
    basePrice,
    totalFeatureAmount,
    netPrice,
    serviceFee,
    taxFee,
    finalPrice,
    durationDays,
    packageType,
    featureContributions,
}) {
    const hasDuration = durationDays != null && !Number.isNaN(Number(durationDays));
    return (
        <Box sx={packageDetailSectionSx}>
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 1.5 }}>
                <PaymentsOutlinedIcon sx={{ fontSize: 17, color: "#2563eb" }} />
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#2563eb" }}>Giá & thời hạn gói</Typography>
            </Stack>
            <PackagePricingBreakdownView
                basePrice={basePrice}
                totalFeatureAmount={totalFeatureAmount}
                netPrice={netPrice}
                priceFallback={price}
                serviceFee={serviceFee}
                taxFee={taxFee}
                finalPrice={finalPrice}
                featureContributions={featureContributions}
                variant="detail"
            />
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0,1fr))" },
                    gap: 1.25,
                    width: "100%",
                    mt: 1.5,
                }}
            >
                <Box
                    sx={{
                        border: "1px solid #bfdbfe",
                        borderRadius: 2.2,
                        bgcolor: "#ffffff",
                        px: 1.6,
                        py: 1.25,
                    }}
                >
                    <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 700, mb: 0.7 }}>Loại gói</Typography>
                    <Typography sx={{ fontSize: 13, color: "#0f172a", fontWeight: 600, lineHeight: 1.25 }}>
                        {packageTypeLabelVi(packageType)}
                    </Typography>
                </Box>
                <Box
                    sx={{
                        border: "1px solid #bfdbfe",
                        borderRadius: 2.2,
                        bgcolor: "#ffffff",
                        px: 1.6,
                        py: 1.25,
                    }}
                >
                    <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 700, mb: 0.7 }}>Thời hạn</Typography>
                    <Stack direction="row" alignItems="center" spacing={1.1} sx={{ minWidth: 0 }}>
                        <CalendarMonthOutlinedIcon sx={{ fontSize: 22, color: "#2563eb" }} aria-hidden />
                        <Typography sx={{ fontSize: 13, color: "#0f172a", fontWeight: 600, lineHeight: 1.25 }}>
                            {hasDuration ? `${Number(durationDays)} ngày` : "—"}
                        </Typography>
                    </Stack>
                </Box>
            </Box>
        </Box>
    );
}

function PackageDetailInfoSection({ row }) {
    return (
        <Box sx={packageDetailSectionSx}>
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 1.5 }}>
                <InfoOutlinedIcon sx={{ fontSize: 17, color: "#2563eb" }} />
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#2563eb" }}>Thông tin gói</Typography>
            </Stack>
            <Stack spacing={1.25}>
                <Box sx={packageDetailFieldBoxSx}>
                    <Typography sx={detailInfoLabelSx}>Tên gói</Typography>
                    <Typography sx={detailInfoValueSx}>{row.name || "—"}</Typography>
                </Box>
            </Stack>
        </Box>
    );
}

function PackageFeatureGridCell({ Icon, label, value, iconColor = "#64748b", iconBg = "#f1f5f9" }) {
    return (
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box sx={{ ...featureIconWrapSx, bgcolor: iconBg }} aria-hidden>
                <Icon sx={{ fontSize: 22, color: iconColor }} />
            </Box>
            <Box sx={{ minWidth: 0, pt: 0.15 }}>
                <Typography sx={detailFeatureGridLabelSx}>{label}</Typography>
                {typeof value === "string" || typeof value === "number" ? (
                    <Typography sx={detailFeatureGridValueSx}>{value}</Typography>
                ) : (
                    value
                )}
            </Box>
        </Stack>
    );
}

function PackageFeaturesDetailGrid({ features }) {
    const f = features || {};
    const aiAssistantChip = f.hasAiAssistant ? (
        <Chip
            size="small"
            icon={<CheckCircleRoundedIcon sx={{ color: "#16a34a !important" }} />}
            label="Trợ lý AI"
            variant="outlined"
            sx={{ borderColor: "#86efac", bgcolor: "#f0fdf4", color: "#166534", fontWeight: 700 }}
        />
    ) : (
        <Chip
            size="small"
            icon={<HighlightOffRoundedIcon sx={{ color: "#dc2626 !important" }} />}
            label="Trợ lý AI"
            variant="outlined"
            sx={{ borderColor: "#fecaca", bgcolor: "#fef2f2", color: "#991b1b", fontWeight: 700 }}
        />
    );
    const cells = [
        { Icon: SupportAgentOutlinedIcon, label: "Tư vấn viên", value: String(f.maxCounsellors ?? 0), iconColor: "#2563eb", iconBg: "#dbeafe" },
        { Icon: ExtensionOutlinedIcon, label: "Số bài đăng", value: String(f.postLimit ?? 0), iconColor: "#7c3aed", iconBg: "#ede9fe" },
        {
            Icon: PolicyOutlinedIcon,
            label: "Quyền nhà trường",
            value: parentPostPermissionLabelVi(f.parentPostPermission),
            iconColor: "#0f766e",
            iconBg: "#ccfbf1",
        },
        { Icon: SupportAgentOutlinedIcon, label: "Mức hỗ trợ", value: supportLevelLabelVi(f.supportLevel), iconColor: "#4f46e5", iconBg: "#e0e7ff" },
    ];
    return (
        <Stack spacing={2.6}>
            <Stack
                direction="row"
                spacing={1.4}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
                sx={{ pt: 0.35, pb: 0.35 }}
            >
                {aiAssistantChip}
            </Stack>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
                    gap: { xs: 2, md: 2.5 },
                    columnGap: { md: 3 },
                    rowGap: { xs: 2, md: 2.75 },
                    width: "100%",
                }}
            >
                {cells.map((c) => (
                    <PackageFeatureGridCell
                        key={c.label}
                        Icon={c.Icon}
                        label={c.label}
                        value={c.value}
                        iconColor={c.iconColor}
                        iconBg={c.iconBg}
                    />
                ))}
            </Box>
        </Stack>
    );
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

function extractPlatformPackageQuotasFromConfig(cfg) {
    if (!cfg || typeof cfg !== "object") return {};
    const businessData = asConfigRecord(cfg.businessData);
    const business = asConfigRecord(cfg.business);
    const spBiz = asConfigRecord(business.subscriptionPricing);
    const spData = asConfigRecord(businessData.subscriptionPricing);
    return {
        ...(typeof spBiz.packageQuotas === "object" && spBiz.packageQuotas ? spBiz.packageQuotas : {}),
        ...(typeof spData.packageQuotas === "object" && spData.packageQuotas ? spData.packageQuotas : {}),
    };
}

function hasUsablePackageQuotas(quotas) {
    if (!quotas || typeof quotas !== "object") return false;
    return Object.keys(quotas).some((k) => {
        const v = quotas[k];
        if (v == null || v === "") return false;
        const n = Number(v);
        return Number.isFinite(n);
    });
}

function quotasToPackageFormFields(packageType, quotas) {
    const t = String(packageType || "").toUpperCase();
    let mc;
    let pl;
    let durationDays;
    if (t === "TRIAL") {
        mc = quotas.trialCounsellor;
        pl = quotas.trialPostLimit;
        const rawD = quotas.durationDays;
        if (rawD != null && rawD !== "" && Number.isFinite(Number(rawD))) {
            const di = Math.trunc(Number(rawD));
            durationDays = di >= 1 ? String(di) : "";
        } else {
            durationDays = "";
        }
    } else if (t === "STANDARD") {
        mc = quotas.standardCounsellor;
        pl = quotas.standardPostLimit;
        durationDays = undefined;
    } else if (t === "ENTERPRISE") {
        mc = quotas.enterpriseCounsellor;
        pl = quotas.enterprisePostLimit;
        durationDays = undefined;
    } else {
        return { maxCounsellors: "", postLimit: "", durationDays: undefined };
    }
    const maxCounsellors =
        mc != null && mc !== "" && Number.isFinite(Number(mc)) ? String(Math.trunc(Number(mc))) : "";
    let postLimit = "";
    if (pl != null && pl !== "") {
        const pn = Number(pl);
        if (pn === -1) postLimit = "-1";
        else if (Number.isFinite(pn)) postLimit = String(Math.trunc(pn));
    }
    return { maxCounsellors, postLimit, durationDays };
}

function buildPayload(form, isEdit) {
    const normalizedParentPostPermission = PARENT_POST_PERMISSIONS.includes(form.parentPostPermission)
        ? form.parentPostPermission
        : "CREATE_POST";
    const normalizedPackageType = PACKAGE_TYPES.includes(form.packageType) ? form.packageType : "STANDARD";
    const isTrial = normalizedPackageType === "TRIAL";
    const normalizedSupportLevel = SUPPORT_LEVELS.includes(form.supportLevel) ? form.supportLevel : "STANDARD_SUPPORT";
    const supportLevel = isTrial ? "BASIC_SUPPORT" : normalizedSupportLevel;
    const body = {
        name: String(form.name).trim(),
        packageType: normalizedPackageType,
        durationDays: Number(form.durationDays),
        featureData: {
            maxCounsellors: Number(form.maxCounsellors),
            postLimit: Number(form.postLimit),
            hasAiAssistant: isTrial ? false : Boolean(form.hasAiAssistant),
            parentPostPermission: normalizedParentPostPermission,
            isFeatured: false,
            topRanking: 0,
            supportLevel,
        },
    };
    if (isEdit) {
        return { packageId: Number(form.packageId), ...body };
    }
    return body;
}

export default function AdminPackageFeeManagement() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const isCompact = useMediaQuery(theme.breakpoints.down("lg"));
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailRow, setDetailRow] = useState(null);
    const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
    const [publishTargetRow, setPublishTargetRow] = useState(null);
    const [publishLoading, setPublishLoading] = useState(false);
    const [deactiveConfirmOpen, setDeactiveConfirmOpen] = useState(false);
    const [deactiveTargetRow, setDeactiveTargetRow] = useState(null);
    const [deactiveLoading, setDeactiveLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [form, setForm] = useState(defaultForm);
    const platformPackageQuotasRef = useRef(null);
    const [platformQuotasForFormLoaded, setPlatformQuotasForFormLoaded] = useState(false);
    const [pricePreview, setPricePreview] = useState({
        packageId: null,
        status: "DRAFT",
        price: null,
        basePrice: null,
        totalFeatureAmount: null,
        netPrice: null,
        serviceFee: null,
        taxFee: null,
        finalPrice: null,
        featureContributions: {},
    });

    const isEdit = form.packageId != null;
    const isTrialPackage = form.packageType === "TRIAL";
    const lockAutoQuotaCounsellorPost = platformQuotasForFormLoaded;
    const trialPlatformDurationRaw = Number(platformPackageQuotasRef.current?.durationDays);
    const lockAutoTrialDurationDays =
        platformQuotasForFormLoaded &&
        isTrialPackage &&
        Number.isFinite(trialPlatformDurationRaw) &&
        Math.trunc(trialPlatformDurationRaw) >= 1;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAdminPackageFees();
            const list = Array.isArray(res?.data?.body) ? res.data.body : [];
            const mapped = list.map(mapPackageFromApi);
            setItems(mapped);
            return mapped;
        } catch (e) {
            console.error(e);
            enqueueSnackbar("Không thể tải danh sách phí gói dịch vụ.", { variant: "error" });
            setItems([]);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const sortedItems = useMemo(() => {
        const clone = [...items];
        clone.sort((a, b) => {
            const ida = a.id != null && !Number.isNaN(Number(a.id)) ? Number(a.id) : Number.POSITIVE_INFINITY;
            const idb = b.id != null && !Number.isNaN(Number(b.id)) ? Number(b.id) : Number.POSITIVE_INFINITY;
            return ida - idb;
        });
        return clone;
    }, [items]);

    const openCreateDialog = () => {
        platformPackageQuotasRef.current = null;
        setPlatformQuotasForFormLoaded(false);
        setForm(defaultForm);
        setSubmitAttempted(false);
        setPricePreview({
            packageId: null,
            status: "DRAFT",
            price: null,
            basePrice: null,
            totalFeatureAmount: null,
            netPrice: null,
            serviceFee: null,
            taxFee: null,
            finalPrice: null,
            featureContributions: {},
        });
        setDialogOpen(true);
        getSystemConfig()
            .then((res) => {
                const body = res?.data?.body ?? res?.data?.data ?? res?.data;
                const quotas = extractPlatformPackageQuotasFromConfig(body);
                platformPackageQuotasRef.current = quotas;
                setPlatformQuotasForFormLoaded(hasUsablePackageQuotas(quotas));
                setForm((prev) => {
                    if (prev.packageId != null) return prev;
                    const patch = quotasToPackageFormFields(prev.packageType, quotas);
                    const stillBlankLimits =
                        (prev.maxCounsellors === "" || prev.maxCounsellors == null) &&
                        (prev.postLimit === "" || prev.postLimit == null);
                    const stillBlankTrialDuration =
                        prev.packageType === "TRIAL" &&
                        (prev.durationDays === "" || prev.durationDays == null);
                    if (!stillBlankLimits && !stillBlankTrialDuration) return prev;
                    const next = { ...prev };
                    if (stillBlankLimits) {
                        next.maxCounsellors = patch.maxCounsellors;
                        next.postLimit = patch.postLimit;
                    }
                    if (stillBlankTrialDuration && patch.durationDays !== undefined) {
                        next.durationDays = patch.durationDays;
                    }
                    return next;
                });
            })
            .catch((e) => {
                console.error("getSystemConfig for package quotas failed", e);
                setPlatformQuotasForFormLoaded(false);
            });
    };

    const openEditDialog = (row) => {
        if (row?.status !== "PACKAGE_DRAFT") {
            enqueueSnackbar("Chỉ có thể cập nhật gói đang ở trạng thái bản nháp.", { variant: "warning" });
            return;
        }
        platformPackageQuotasRef.current = null;
        setPlatformQuotasForFormLoaded(false);
        setForm({
            packageId: row.id,
            name: row.name,
            packageType: PACKAGE_TYPES.includes(row.packageType) ? row.packageType : "STANDARD",
            durationDays: row.durationDays != null && !Number.isNaN(Number(row.durationDays)) ? Number(row.durationDays) : "",
            maxCounsellors: row.features.maxCounsellors,
            postLimit: row.features.postLimit,
            hasAiAssistant: row.features.hasAiAssistant,
            parentPostPermission: PARENT_POST_PERMISSIONS.includes(row.features.parentPostPermission)
                ? row.features.parentPostPermission
                : "CREATE_POST",
            supportLevel:
                PACKAGE_TYPES.includes(row.packageType) && row.packageType === "TRIAL"
                    ? "BASIC_SUPPORT"
                    : SUPPORT_LEVELS.includes(row.features.supportLevel)
                      ? row.features.supportLevel
                      : "STANDARD_SUPPORT",
        });
        setSubmitAttempted(false);
        setPricePreview({
            packageId: row.id ?? null,
            status: normalizePackageStatus(row.status),
            price: row.price ?? row.netPrice ?? null,
            basePrice: row.basePrice ?? null,
            totalFeatureAmount: row.totalFeatureAmount ?? null,
            netPrice: row.netPrice ?? row.price ?? null,
            serviceFee: row.serviceFee ?? null,
            taxFee: row.taxFee ?? null,
            finalPrice: row.finalPrice ?? null,
            featureContributions: row.featureContributions || {},
        });
        setDialogOpen(true);
        getSystemConfig()
            .then((res) => {
                const body = res?.data?.body ?? res?.data?.data ?? res?.data;
                const quotas = extractPlatformPackageQuotasFromConfig(body);
                platformPackageQuotasRef.current = quotas;
                setPlatformQuotasForFormLoaded(hasUsablePackageQuotas(quotas));
            })
            .catch((e) => {
                console.error("getSystemConfig for package quotas failed", e);
                setPlatformQuotasForFormLoaded(false);
            });
    };

    const closeDialog = () => {
        if (submitting) return;
        setDialogOpen(false);
        platformPackageQuotasRef.current = null;
        setPlatformQuotasForFormLoaded(false);
        setForm(defaultForm);
        setSubmitAttempted(false);
        setPricePreview({
            packageId: null,
            status: "DRAFT",
            price: null,
            basePrice: null,
            totalFeatureAmount: null,
            netPrice: null,
            serviceFee: null,
            taxFee: null,
            finalPrice: null,
            featureContributions: {},
        });
    };

    const openDetailDialog = (row) => {
        setDetailRow(row);
        setDetailOpen(true);
    };

    const closeDetailDialog = () => {
        setDetailOpen(false);
        setDetailRow(null);
    };

    const openPublishConfirmFromDetail = () => {
        if (!detailRow) return;
        openPublishConfirm(detailRow);
    };
    const openPublishConfirmFromForm = () => {
        const id = Number(form.packageId);
        if (!Number.isFinite(id) || id < 1) {
            enqueueSnackbar("Vui lòng tạo gói trước khi công bố.", { variant: "warning" });
            return;
        }
        if (pricePreview.status !== "DRAFT") {
            enqueueSnackbar("Chỉ có thể công bố gói khi gói đang ở trạng thái bản nháp.", { variant: "warning" });
            return;
        }
        openPublishConfirm({
            id,
            name: String(form.name || "").trim() || `#${id}`,
            status: "PACKAGE_DRAFT",
        });
    };

    const openEditFromDetail = () => {
        if (!detailRow) return;
        const row = detailRow;
        closeDetailDialog();
        openEditDialog(row);
    };

    const openPublishConfirm = (row) => {
        if (row?.status !== "PACKAGE_DRAFT") {
            enqueueSnackbar("Chỉ có thể công khai gói ở trạng thái Bản nháp.", { variant: "warning" });
            return;
        }
        if (row?.id == null) return;
        setPublishTargetRow(row);
        setPublishConfirmOpen(true);
    };

    const closePublishConfirm = () => {
        if (publishLoading) return;
        setPublishConfirmOpen(false);
        setPublishTargetRow(null);
    };

    const handleConfirmPublish = async () => {
        if (!publishTargetRow?.id) return;
        setPublishLoading(true);
        try {
            await publishAdminPackageFee(publishTargetRow.id);
            enqueueSnackbar("Đã công khai gói dịch vụ.", { variant: "success" });
            closePublishConfirm();
            closeDialog();
            closeDetailDialog();
            await load();
        } catch (e) {
            console.error(e);
            enqueueSnackbar(pickHttpErrorMessage(e, "Không thể công khai gói. Vui lòng thử lại."), { variant: "error" });
        } finally {
            setPublishLoading(false);
        }
    };

    const openDeactiveConfirm = (row) => {
        if (!canDeactivatePackage(row?.status)) {
            enqueueSnackbar("Chỉ có thể ngừng mở bán gói đang hoạt động hoặc đã phát hành.", { variant: "warning" });
            return;
        }
        if (row?.id == null) return;
        setDeactiveTargetRow(row);
        setDeactiveConfirmOpen(true);
    };

    const closeDeactiveConfirm = () => {
        if (deactiveLoading) return;
        setDeactiveConfirmOpen(false);
        setDeactiveTargetRow(null);
    };

    const handleConfirmDeactive = async () => {
        if (!deactiveTargetRow?.id) return;
        setDeactiveLoading(true);
        try {
            await deactiveAdminPackageFee(deactiveTargetRow.id);
            enqueueSnackbar("Đã gửi yêu cầu ngừng mở bán gói.", { variant: "success" });
            closeDeactiveConfirm();
            await load();
        } catch (e) {
            console.error(e);
            enqueueSnackbar(pickHttpErrorMessage(e, "Không thể ngừng mở bán gói. Vui lòng thử lại."), { variant: "error" });
        } finally {
            setDeactiveLoading(false);
        }
    };

    const handleChange = (key) => (e) => {
        const value = e?.target?.type === "checkbox" ? e.target.checked : e.target.value;
        setForm((prev) => {
            const next = { ...prev, [key]: value };
            if (key === "packageType") {
                const quotas = platformPackageQuotasRef.current;
                if (quotas) {
                    const { maxCounsellors, postLimit, durationDays } = quotasToPackageFormFields(value, quotas);
                    next.maxCounsellors = maxCounsellors;
                    next.postLimit = postLimit;
                    if (durationDays !== undefined) {
                        next.durationDays = durationDays;
                    }
                }
                if (value === "TRIAL") {
                    next.hasAiAssistant = false;
                    next.supportLevel = "BASIC_SUPPORT";
                }
            }
            return next;
        });
    };

    const validateForm = () => {
        const name = String(form.name).trim();
        if (!name) return "Vui lòng nhập tên gói.";
        if (name.length > 100) return "Tên gói không được vượt quá 100 ký tự.";
        if (!PACKAGE_TYPES.includes(form.packageType)) return "Loại gói không hợp lệ.";
        const dur = Number(form.durationDays);
        if (form.durationDays === "" || Number.isNaN(dur) || dur < 1 || !Number.isInteger(dur)) {
            return "Thời hạn gói (ngày) phải là số nguyên dương.";
        }
        if (form.maxCounsellors === "" || Number(form.maxCounsellors) < 0) return "Số tư vấn viên tối đa không hợp lệ.";
        const maxCounsellors = Number(form.maxCounsellors);
        if (!Number.isInteger(maxCounsellors) || maxCounsellors < 0) return "Số tư vấn viên tối đa phải là số nguyên >= 0.";
        const postLimit = Number(form.postLimit);
        if (
            form.postLimit === "" ||
            Number.isNaN(postLimit) ||
            !Number.isInteger(postLimit) ||
            (postLimit < 0 && postLimit !== -1)
        ) {
            return "Giới hạn bài đăng phải là số nguyên >= 0 hoặc -1 (không giới hạn).";
        }
        if (!PARENT_POST_PERMISSIONS.includes(form.parentPostPermission)) return "Quyền đăng bài của nhà trường không hợp lệ.";
        if (!SUPPORT_LEVELS.includes(form.supportLevel)) return "Mức hỗ trợ không hợp lệ.";
        if (form.packageId != null) {
            const pid = Number(form.packageId);
            if (!Number.isFinite(pid) || pid < 1) {
                return "Cập nhật cần mã định danh gói hợp lệ.";
            }
        }
        return null;
    };
    const formValidationError = validateForm();

    const submit = async () => {
        setSubmitAttempted(true);
        const validationError = validateForm();
        if (validationError) {
            enqueueSnackbar(validationError, { variant: "warning" });
            return;
        }
        setSubmitting(true);
        try {
            if (isEdit && (form.packageId == null || Number.isNaN(Number(form.packageId)))) {
                enqueueSnackbar("Cập nhật cần có mã gói dịch vụ.", { variant: "warning" });
                setSubmitting(false);
                return;
            }
            const payload = buildPayload(form, isEdit);
            const upsertRes = await upsertAdminPackageFee(payload);
            const refreshedItems = await load();
            const upsertPackageId =
                Number(upsertRes?.data?.body?.packageId ?? upsertRes?.data?.body?.id ?? upsertRes?.data?.packageId ?? upsertRes?.data?.id) ||
                null;
            const fallbackMatchedItem =
                refreshedItems
                    .filter((it) => it.name === String(form.name).trim() && it.packageType === form.packageType)
                    .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0] || null;
            const matchedItem = refreshedItems.find((it) => it.id === upsertPackageId) || fallbackMatchedItem;
            if (matchedItem) {
                const upsertPreview = mapPricePreviewFromUpsertResponse(upsertRes);
                setForm((prev) => ({ ...prev, packageId: matchedItem.id ?? prev.packageId }));
                setPricePreview({
                    packageId: upsertPreview.packageId ?? matchedItem.id ?? null,
                    status: upsertPreview.status || normalizePackageStatus(matchedItem.status),
                    price: upsertPreview.price ?? matchedItem.price ?? matchedItem.netPrice ?? null,
                    basePrice: upsertPreview.basePrice ?? matchedItem.basePrice ?? null,
                    totalFeatureAmount: upsertPreview.totalFeatureAmount ?? matchedItem.totalFeatureAmount ?? null,
                    netPrice: upsertPreview.netPrice ?? matchedItem.netPrice ?? matchedItem.price ?? null,
                    serviceFee: upsertPreview.serviceFee ?? matchedItem.serviceFee ?? null,
                    taxFee: upsertPreview.taxFee ?? matchedItem.taxFee ?? null,
                    finalPrice: upsertPreview.finalPrice ?? matchedItem.finalPrice ?? null,
                    featureContributions: upsertPreview.featureContributions || matchedItem.featureContributions || {},
                });
            }
            enqueueSnackbar(isEdit ? "Lưu nháp cập nhật thành công." : "Lưu nháp gói mới thành công.", {
                variant: "success",
            });
        } catch (e) {
            console.error(e);
            enqueueSnackbar(pickHttpErrorMessage(e, "Không thể lưu gói dịch vụ. Vui lòng thử lại."), {
                variant: "error",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 1, md: 2 }, borderRadius: 4, bgcolor: "#ffffff", color: "#1e293b" }}>
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3.5,
                    mb: 2.5,
                    color: "white",
                    background: "linear-gradient(95deg, #60a5fa 0%, #818cf8 46%, #a78bfa 100%)",
                    boxShadow: "0 12px 24px rgba(99, 102, 241, 0.2)",
                }}
            >
                <CardContent sx={{ p: { xs: 1.5, md: 1.9 }, "&:last-child": { pb: { xs: 1.5, md: 1.9 } } }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
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
                                <MonetizationOnOutlinedIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, textShadow: "0 1px 2px rgba(15,23,42,0.24)" }}>
                                    Quản lý phí gói dịch vụ
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 1, mt: 0.3, fontSize: 13, fontWeight: 500, textShadow: "0 1px 2px rgba(15,23,42,0.2)" }}>
                                    Tạo mới hoặc cập nhật gói ở trạng thái Bản nháp
                                </Typography>
                            </Box>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={openCreateDialog}
                            sx={{
                                textTransform: "none",
                                fontWeight: 700,
                                px: 2,
                                boxShadow: "0 6px 14px rgba(37,99,235,0.35)",
                            }}
                        >
                            Tạo gói mới
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            <Card elevation={0} sx={{ ...adminDataCardBorderSx, borderRadius: 2 }}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1e293b", mb: 1.5 }}>
                        Danh sách gói dịch vụ
                    </Typography>
                    <TableContainer component={Paper} elevation={0} sx={adminTableContainerSx}>
                        <Table
                            size="small"
                            sx={{
                                width: "100%",
                                minWidth: 0,
                                tableLayout: isCompact ? "fixed" : "auto",
                                "& .MuiTableCell-root": {
                                    px: isCompact ? 0.5 : isMobile ? 0.75 : 1.25,
                                    py: isCompact ? 0.7 : isMobile ? 0.9 : 1.1,
                                    fontSize: isCompact ? 11 : isMobile ? 12 : 14,
                                },
                            }}
                        >
                            <TableHead>
                                <TableRow sx={adminTableHeadRowSx}>
                                    <TableCell align="center" sx={adminTableHeadCellSx}>
                                        STT
                                    </TableCell>
                                    <TableCell align="center" sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>
                                        Tên gói
                                    </TableCell>
                                    <TableCell align="center" sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>
                                        Tổng thanh toán (VNĐ)
                                    </TableCell>
                                    <TableCell align="center" sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>
                                        Thời hạn (ngày)
                                    </TableCell>
                                    <TableCell align="center" sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>
                                        Trạng thái
                                    </TableCell>
                                    <TableCell align="center" sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>
                                        Chi tiết
                                    </TableCell>
                                    <TableCell align="center" sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>
                                        Thao tác
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                            <CircularProgress size={36} sx={{ color: APP_PRIMARY_MAIN }} />
                                        </TableCell>
                                    </TableRow>
                                ) : sortedItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: "#64748b" }}>
                                            Chưa có gói dịch vụ nào.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedItems.map((row, idx) => {
                                        const isDraft = row.status === "PACKAGE_DRAFT";
                                        const canDeactive = canDeactivatePackage(row.status);
                                        return (
                                            <TableRow key={`${row.id ?? "new"}-${idx}`} hover sx={adminTableBodyRowSx}>
                                                <TableCell align="center" sx={{ whiteSpace: "nowrap", verticalAlign: "middle" }}>
                                                    <Chip label={idx + 1} size="small" sx={adminSttChipSx} />
                                                </TableCell>
                                                <TableCell align="left" sx={{ verticalAlign: "middle", maxWidth: isCompact ? 140 : 280 }}>
                                                    <Typography
                                                        fontWeight={700}
                                                        color="#1e293b"
                                                        sx={{
                                                            textAlign: "left",
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                        }}
                                                    >
                                                        {row.name}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center" sx={{ whiteSpace: "nowrap", verticalAlign: "middle", fontWeight: 700 }}>
                                                    {row.finalPrice != null && !Number.isNaN(Number(row.finalPrice))
                                                        ? formatVnd(row.finalPrice)
                                                        : "—"}
                                                </TableCell>
                                                <TableCell align="center" sx={{ whiteSpace: "nowrap", verticalAlign: "middle" }}>
                                                    {row.durationDays != null && !Number.isNaN(Number(row.durationDays))
                                                        ? row.durationDays
                                                        : "—"}
                                                </TableCell>
                                                <TableCell align="center" sx={{ whiteSpace: "nowrap", verticalAlign: "middle" }}>
                                                    <Chip
                                                        size="small"
                                                        label={packageStatusLabel(row.status)}
                                                        {...packageStatusChipProps(row.status)}
                                                        sx={{
                                                            maxWidth: "100%",
                                                            "& .MuiChip-label": {
                                                                px: isMobile ? 0.75 : 1,
                                                                fontSize: isMobile ? 11 : 12,
                                                            },
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell align="center" sx={{ whiteSpace: "nowrap", verticalAlign: "middle" }}>
                                                    <Tooltip title="Xem chi tiết">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => openDetailDialog(row)}
                                                            sx={{
                                                                color: "#0f766e",
                                                                border: "1px solid",
                                                                borderColor: "#99f6e4",
                                                                bgcolor: "#f0fdfa",
                                                                borderRadius: 2,
                                                            }}
                                                        >
                                                            <VisibilityOutlinedIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell align="center" sx={{ whiteSpace: "nowrap", verticalAlign: "middle" }}>
                                                    <Stack direction="row" spacing={0.75} justifyContent="center" alignItems="center" flexWrap="wrap" useFlexGap>
                                                        <Tooltip title={isDraft ? "Cập nhật gói" : "Chỉ cập nhật được gói ở trạng thái Bản nháp"}>
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    disabled={!isDraft}
                                                                    onClick={() => openEditDialog(row)}
                                                                    sx={{
                                                                        color: isDraft ? "#2563eb" : "#94a3b8",
                                                                        border: "1px solid",
                                                                        borderColor: isDraft ? "#93c5fd" : "#e2e8f0",
                                                                        bgcolor: isDraft ? "#eff6ff" : "#f8fafc",
                                                                        borderRadius: 2,
                                                                    }}
                                                                >
                                                                    <EditOutlinedIcon fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                        <Tooltip
                                                            title={
                                                                canDeactive
                                                                    ? "Ngừng mở bán (gói không còn trên trang chủ để trường mới mua)"
                                                                    : "Chỉ áp dụng cho gói đang hoạt động hoặc đã phát hành"
                                                            }
                                                        >
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    disabled={!canDeactive}
                                                                    onClick={() => openDeactiveConfirm(row)}
                                                                    sx={{
                                                                        color: canDeactive ? "#b91c1c" : "#94a3b8",
                                                                        border: "1px solid",
                                                                        borderColor: canDeactive ? "#fecaca" : "#e2e8f0",
                                                                        bgcolor: canDeactive ? "#fef2f2" : "#f8fafc",
                                                                        borderRadius: 2,
                                                                    }}
                                                                >
                                                                    <BlockSharpIcon fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            <Dialog
                open={detailOpen}
                onClose={closeDetailDialog}
                fullWidth
                maxWidth="md"
                PaperProps={{ sx: adminDialogPaperSx }}
            >
                <DialogTitle
                    component="div"
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        fontWeight: 800,
                        color: "#1e293b",
                        pb: 1.2,
                        pr: 1,
                        bgcolor: "#ffffff",
                        borderBottom: "1px solid #e2e8f0",
                    }}
                >
                    <Typography component="h2" sx={{ fontWeight: 800, fontSize: "1.25rem", lineHeight: 1.3, m: 0 }}>
                        Chi tiết gói dịch vụ
                    </Typography>
                    <IconButton
                        onClick={closeDetailDialog}
                        aria-label="Đóng"
                        size="small"
                        sx={{
                            color: "#475569",
                            "&:hover": { bgcolor: "rgba(255,255,255,0.55)", color: "#1e293b" },
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent
                    dividers
                    sx={{
                        bgcolor: "#ffffff",
                        pt: 2.5,
                        pb: 3,
                        px: { xs: 2, sm: 3 },
                    }}
                >
                    {detailRow && (
                        <Stack spacing={2}>
                            <PackageDetailInfoSection row={detailRow} />
                            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                <Chip size="small" label={packageStatusLabel(detailRow.status)} {...packageStatusChipProps(detailRow.status)} />
                            </Stack>
                            <PackageDetailPriceDurationSection
                                price={detailRow.price}
                                basePrice={detailRow.basePrice}
                                totalFeatureAmount={detailRow.totalFeatureAmount}
                                netPrice={detailRow.netPrice}
                                serviceFee={detailRow.serviceFee}
                                taxFee={detailRow.taxFee}
                                finalPrice={detailRow.finalPrice}
                                durationDays={detailRow.durationDays}
                                packageType={detailRow.packageType}
                                featureContributions={detailRow.featureContributions}
                            />

                            <Box sx={{ pt: 0.5 }}>
                                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 2 }}>
                                    <ExtensionOutlinedIcon sx={{ fontSize: 17, color: "#2563eb" }} />
                                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#2563eb" }}>Tính năng</Typography>
                                </Stack>
                                <PackageFeaturesDetailGrid features={detailRow.features} />
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
                {detailRow?.status === "PACKAGE_DRAFT" ? (
                    <DialogActions sx={adminDialogActionsSx}>
                        <Button
                            variant="outlined"
                            onClick={openEditFromDetail}
                            disabled={!detailRow}
                            startIcon={<EditOutlinedIcon />}
                            sx={{ textTransform: "none", fontWeight: 600 }}
                        >
                            Chỉnh sửa
                        </Button>
                        <Button
                            variant="contained"
                            onClick={openPublishConfirmFromDetail}
                            disabled={!detailRow}
                            startIcon={<FileUploadSharpIcon />}
                            sx={{ textTransform: "none", fontWeight: 700 }}
                        >
                            Công khai
                        </Button>
                    </DialogActions>
                ) : null}
            </Dialog>

            <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="md" PaperProps={{ sx: adminDialogPaperSx }}>
                <DialogTitle sx={{ ...adminDialogTitleSx, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                    <Typography component="span" sx={{ fontWeight: 800, fontSize: "1.12rem" }}>
                        {isEdit ? "Cập nhật gói nháp" : "Tạo gói nháp"}
                    </Typography>
                    {isEdit ? (
                        <Chip
                            size="small"
                            label={packageStatusLabel(pricePreview.status || "DRAFT")}
                            {...packageStatusChipProps(pricePreview.status || "DRAFT")}
                        />
                    ) : null}
                </DialogTitle>
                <DialogContent dividers sx={adminDialogContentSx}>
                    <Box sx={{ mt: 1 }}>
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.8fr 1fr" }, gap: 2 }}>
                            <Stack spacing={2}>
                                <Typography variant="subtitle2" sx={{ color: "#1e40af", fontWeight: 700 }}>
                                    A. Thông tin gói
                                </Typography>
                                <TextField label="Tên gói" required size="small" value={form.name} onChange={handleChange("name")} fullWidth />
                                <FormControl fullWidth size="small" required>
                                    <InputLabel id="package-type-label">Loại gói</InputLabel>
                                    <Select
                                        labelId="package-type-label"
                                        label="Loại gói"
                                        value={form.packageType}
                                        onChange={handleChange("packageType")}
                                        renderValue={(v) => packageTypeLabelVi(v)}
                                    >
                                        {PACKAGE_TYPES.map((v) => (
                                            <MenuItem key={v} value={v}>
                                                {packageTypeLabelVi(v)}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <TextField
                                    label="Thời hạn gói (ngày)"
                                    type="number"
                                    size="small"
                                    required
                                    value={form.durationDays}
                                    onChange={handleChange("durationDays")}
                                    fullWidth
                                    disabled={submitting || lockAutoTrialDurationDays}
                                    inputProps={{ min: 1 }}
                                />
                                <Divider />
                                <Typography variant="subtitle2" sx={{ color: "#1e40af", fontWeight: 700 }}>
                                    B. Tính năng
                                </Typography>
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                                    <TextField
                                        label="Số tư vấn viên tối đa"
                                        type="number"
                                        size="small"
                                        value={form.maxCounsellors}
                                        onChange={handleChange("maxCounsellors")}
                                        fullWidth
                                        disabled={submitting || lockAutoQuotaCounsellorPost}
                                        inputProps={{ min: 0 }}
                                    />
                                    <TextField
                                        label="Giới hạn bài đăng"
                                        type="number"
                                        size="small"
                                        value={form.postLimit}
                                        onChange={handleChange("postLimit")}
                                        fullWidth
                                        disabled={submitting || lockAutoQuotaCounsellorPost}
                                    />
                                </Stack>
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                                    <FormControl fullWidth size="small" required>
                                        <InputLabel id="parent-post-permission-label">Quyền nhà trường đăng bài</InputLabel>
                                        <Select
                                            labelId="parent-post-permission-label"
                                            label="Quyền nhà trường đăng bài"
                                            value={form.parentPostPermission}
                                            onChange={handleChange("parentPostPermission")}
                                            renderValue={(v) => parentPostPermissionLabelVi(v)}
                                        >
                                            {PARENT_POST_PERMISSIONS.map((v) => (
                                                <MenuItem key={v} value={v}>
                                                    {parentPostPermissionLabelVi(v)}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <FormControl fullWidth size="small" required>
                                        <InputLabel id="support-level-label">Mức hỗ trợ</InputLabel>
                                        <Select
                                            labelId="support-level-label"
                                            label="Mức hỗ trợ"
                                            value={isTrialPackage ? "BASIC_SUPPORT" : form.supportLevel}
                                            onChange={handleChange("supportLevel")}
                                            disabled={isTrialPackage}
                                            renderValue={(v) => supportLevelLabelVi(v)}
                                        >
                                            {SUPPORT_LEVELS.map((v) => (
                                                <MenuItem key={v} value={v} disabled={isTrialPackage && v !== "BASIC_SUPPORT"}>
                                                    {supportLevelLabelVi(v)}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Stack>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={Boolean(form.hasAiAssistant)}
                                            onChange={(e) => setForm((prev) => ({ ...prev, hasAiAssistant: e.target.checked }))}
                                            disabled={isTrialPackage}
                                        />
                                    }
                                    label="Bật trợ lý AI"
                                    sx={{ width: "100%", m: 0, py: 0.8, px: 1.2, border: "1px solid #e2e8f0", borderRadius: 1.5 }}
                                />
                                {isTrialPackage && (
                                    <Typography variant="caption" color="#b45309">
                                        Gói dùng thử: trợ lý AI luôn tắt; mức hỗ trợ cố định là Hỗ trợ cơ bản.
                                    </Typography>
                                )}
                                {submitAttempted && formValidationError ? (
                                    <Typography variant="caption" sx={{ color: "#b91c1c" }}>
                                        {formValidationError}
                                    </Typography>
                                ) : null}
                            </Stack>
                            <Box
                                sx={{
                                    border: "1px solid #dbeafe",
                                    bgcolor: "#f8fbff",
                                    borderRadius: 2,
                                    p: 1.5,
                                    height: "fit-content",
                                }}
                            >
                                <Typography sx={{ fontWeight: 800, color: "#1e40af", mb: 1.2 }}>Giá dự kiến</Typography>
                                <PackagePricingBreakdownView
                                    basePrice={pricePreview.basePrice}
                                    totalFeatureAmount={pricePreview.totalFeatureAmount}
                                    netPrice={pricePreview.netPrice}
                                    priceFallback={pricePreview.price}
                                    serviceFee={pricePreview.serviceFee}
                                    taxFee={pricePreview.taxFee}
                                    finalPrice={pricePreview.finalPrice}
                                    featureContributions={pricePreview.featureContributions}
                                    variant="sidebar"
                                />
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={adminDialogActionsSx}>
                    <Button onClick={closeDialog} disabled={submitting} sx={{ textTransform: "none" }}>
                        Hủy
                    </Button>
                    {isEdit && pricePreview.status === "DRAFT" ? (
                        <Button
                            variant="outlined"
                            onClick={openPublishConfirmFromForm}
                            disabled={submitting || publishLoading}
                            startIcon={<FileUploadSharpIcon />}
                            sx={{ textTransform: "none", fontWeight: 700 }}
                        >
                            Công bố
                        </Button>
                    ) : null}
                    <Button
                        variant="contained"
                        onClick={submit}
                        disabled={submitting}
                        sx={{ textTransform: "none", fontWeight: 700 }}
                    >
                        {submitting ? <CircularProgress size={22} color="inherit" /> : isEdit ? "Lưu" : "Tạo"}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={publishConfirmOpen}
                title="Công khai gói dịch vụ"
                description={
                    publishTargetRow ? (
                        <>
                            Bạn có chắc chắn muốn <ConfirmHighlight>công khai</ConfirmHighlight> gói{" "}
                            <ConfirmHighlight>{publishTargetRow.name}</ConfirmHighlight>?
                        </>
                    ) : (
                        "Bạn có chắc chắn muốn công khai gói dịch vụ này?"
                    )
                }
                extraDescription={
                    <>
                        Gói sẽ <ConfirmHighlight>hiển thị cho khách hàng</ConfirmHighlight> trên hệ thống.
                    </>
                }
                cancelText="Hủy"
                confirmText={publishLoading ? "Đang xử lý..." : "Công khai"}
                onCancel={closePublishConfirm}
                onConfirm={handleConfirmPublish}
                loading={publishLoading}
            />

            <ConfirmDialog
                open={deactiveConfirmOpen}
                title="Ngừng mở bán gói"
                description={
                    deactiveTargetRow ? (
                        <>
                            Bạn có chắc chắn muốn <ConfirmHighlight>ngừng mở bán</ConfirmHighlight> gói{" "}
                            <ConfirmHighlight>{deactiveTargetRow.name}</ConfirmHighlight>?
                        </>
                    ) : (
                        "Bạn có chắc chắn muốn ngừng mở bán gói dịch vụ này?"
                    )
                }
                extraDescription={
                    <>
                        Trường đang sử dụng gói vẫn thấy gói ở trạng thái hoạt động. Gói sẽ chuyển sang{" "}
                        <ConfirmHighlight>chờ ngừng bán</ConfirmHighlight> — không còn hiển thị trên trang chủ để trường mới
                        chọn mua.
                    </>
                }
                cancelText="Hủy"
                confirmText={deactiveLoading ? "Đang xử lý..." : "Ngừng mở bán"}
                onCancel={closeDeactiveConfirm}
                onConfirm={handleConfirmDeactive}
                loading={deactiveLoading}
                confirmButtonSx={{
                    background: "#dc2626",
                    boxShadow: "0 6px 14px rgba(220,38,38,0.35)",
                    "&:hover": {
                        background: "#b91c1c",
                        boxShadow: "0 8px 16px rgba(220,38,38,0.4)",
                    },
                }}
            />
        </Box>
    );
}
