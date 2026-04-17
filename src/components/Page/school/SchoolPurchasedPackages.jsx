import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    LinearProgress,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import { getCurrentSchoolSubscription } from "../../../services/SchoolSubscriptionService.jsx";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage.js";
import BranchQuotaRequestToPrimaryCard from "./BranchQuotaRequestToPrimaryCard.jsx";
import { useSchool } from "../../../contexts/SchoolContext.jsx";

const PAGE_BG = "#F7F9FC";
const CARD_RADIUS = "16px";
const CARD_SHADOW = "0 1px 3px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.06)";

function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function mapResourceSummary(raw) {
    if (!raw || typeof raw !== "object") return null;
    const t = Number(raw.totalPackageQuota);
    const m = Number(raw.myCampusQuota);
    const o = Number(raw.otherCampusesQuota);
    return {
        totalPackageQuota: Number.isFinite(t) ? Math.max(0, t) : 0,
        myCampusQuota: Number.isFinite(m) ? Math.max(0, m) : 0,
        otherCampusesQuota: Number.isFinite(o) ? Math.max(0, o) : 0,
    };
}

/**
 * Campus chính: còn gói có hạn ngạch nhưng trụ sở hoặc chi nhánh đang 0 → chuyển tới
 * Cấu hình chung → tab Phân bổ nguồn lực (`/school/facility-config?tab=resource-distribution`).
 */
function shouldRedirectToResourceDistribution(rs) {
    if (!rs) return false;
    if (!(rs.totalPackageQuota > 0)) return false;
    return rs.myCampusQuota === 0 || rs.otherCampusesQuota === 0;
}

/** Map API body → normalized subscription model */
function mapSubscription(body) {
    if (!body || typeof body !== "object") return null;
    const startDate = body.startDate || "";
    const endDate = body.endDate || "";
    if (!startDate && !endDate && !body.packageName && !body.licenseKey) return null;

    const remainingRaw = body.dasRemaining ?? body.daysRemaining;
    const dasRemaining =
        typeof remainingRaw === "number" && Number.isFinite(remainingRaw) ? Math.max(0, remainingRaw) : 0;

    const licenseKey = body.licenseKey != null ? String(body.licenseKey) : "";
    const id = licenseKey || "current-subscription";
    const isExpired = body.isExpired === true;
    const resourceSummary = mapResourceSummary(body.resourceSummary);

    return {
        id,
        packageName: typeof body.packageName === "string" ? body.packageName : "Gói đăng ký",
        licenseKey: licenseKey || "—",
        startDate,
        endDate,
        dasRemaining,
        isExpired,
        resourceSummary,
        statusMessage: localizeSubscriptionStatusMessage(
            typeof body.statusMessage === "string" ? body.statusMessage : "",
            body
        ),
        suggestion: localizeSubscriptionSuggestion(
            typeof body.suggestion === "string" ? body.suggestion : "",
            body
        ),
    };
}

function formatDateDDMMYYYY(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

/**
 * BE có thể trả suggestion tiếng Anh; hiển thị tiếng Việt cho người dùng.
 * Ví dụ: … from day to day2026-05-12 (thiếu khoảng trắng trước ngày).
 */
function localizeSubscriptionSuggestion(raw, body) {
    const text = typeof raw === "string" ? raw.trim() : "";
    if (!text) return "";

    const re =
        /^If you purchase the same package '([^']+)',\s*time will be accumulated continuously from day to day\s*(\d{4}-\d{2}-\d{2})\.?$/i;
    let m = text.match(re);
    if (!m) {
        const reTight =
            /^If you purchase the same package '([^']+)',\s*time will be accumulated continuously from day to day(\d{4}-\d{2}-\d{2})\.?$/i;
        m = text.match(reTight);
    }
    if (m) {
        const pkg = m[1];
        const iso = m[2];
        return `Nếu bạn mua lại cùng gói "${pkg}", thời hạn sử dụng sẽ được cộng dồn liên tục kể từ ngày ${formatDateDDMMYYYY(iso)}.`;
    }

    if (/^If you purchase the same package/i.test(text) && body?.packageName && body?.endDate) {
        return `Nếu bạn mua lại cùng gói "${body.packageName}", thời hạn sử dụng sẽ được cộng dồn liên tục kể từ ngày ${formatDateDDMMYYYY(body.endDate)}.`;
    }

    return text;
}

/**
 * BE có thể trả statusMessage tiếng Anh (vd. Active (Remaining 30 days)).
 */
function localizeSubscriptionStatusMessage(raw, body) {
    const text = typeof raw === "string" ? raw.trim() : "";
    if (!text) return "";

    const activeRe = /^Active\s*\(\s*Remaining\s+(\d+)\s+days?\s*\)\s*$/i;
    const m = text.match(activeRe);
    if (m) {
        const n = parseInt(m[1], 10);
        return Number.isFinite(n) ? `Đang hoạt động (Còn ${n} ngày)` : text;
    }

    if (/^Expired\b/i.test(text)) {
        return "Đã hết hạn";
    }
    if (/^Inactive\b/i.test(text)) {
        return "Không hoạt động";
    }

    if (/Active\s*\(\s*Remaining/i.test(text) && body && typeof body.dasRemaining === "number") {
        const n = Math.max(0, body.dasRemaining);
        return `Đang hoạt động (Còn ${n} ngày)`;
    }

    return text;
}

/** Elapsed % through [startDate, endDate] by calendar (0–100). */
function subscriptionElapsedPercent(startDate, endDate, isExpired) {
    if (isExpired) return 100;
    const start = startOfDay(new Date(startDate));
    const end = startOfDay(new Date(endDate));
    const today = startOfDay(new Date());
    const total = Math.max(1, end - start);
    if (today <= start) return 0;
    if (today >= end) return 100;
    const elapsed = today - start;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

function SubscriptionEmptyState({ onBuy, branchReadOnly }) {
    return (
        <Box
            sx={{
                bgcolor: "#fff",
                borderRadius: CARD_RADIUS,
                boxShadow: CARD_SHADOW,
                border: "1px solid rgba(226, 232, 240, 0.9)",
                py: { xs: 6, sm: 8 },
                px: 3,
                textAlign: "center",
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
            }}
        >
            <Box sx={{ maxWidth: 200, mx: "auto", mb: 3, color: "#cbd5e1" }} aria-hidden>
                <svg viewBox="0 0 120 100" width="100%" height="auto">
                    <rect x="10" y="30" width="45" height="55" rx="8" fill="currentColor" opacity="0.35" />
                    <rect x="62" y="18" width="48" height="67" rx="8" fill="currentColor" opacity="0.55" />
                    <rect x="38" y="8" width="38" height="38" rx="6" fill="currentColor" opacity="0.25" />
                </svg>
            </Box>
            <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
                Chưa có gói đăng ký đang hoạt động
            </Typography>
            <Typography sx={{ color: "#64748b", mt: 1.5, mb: 3, fontSize: "0.9375rem", lineHeight: 1.6 }}>
                {branchReadOnly
                    ? "Chi nhánh không thể mua gói. Vui lòng liên hệ trụ sở chính để kích hoạt dịch vụ."
                    : "Mua gói dịch vụ để sử dụng đầy đủ tính năng cho trường của bạn."}
            </Typography>
            <Button
                variant="contained"
                onClick={onBuy}
                sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: "10px",
                    px: 3,
                    py: 1.25,
                    bgcolor: "#0D64DE",
                    boxShadow: "0 4px 12px rgba(13, 100, 222, 0.25)",
                    "&:hover": {
                        bgcolor: "#0b5ad1",
                        boxShadow: "0 6px 16px rgba(13, 100, 222, 0.35)",
                    },
                }}
            >
                {branchReadOnly ? "Về bảng điều khiển" : "Mua gói"}
            </Button>
        </Box>
    );
}

function SuggestionPanel({ text }) {
    if (!text?.trim()) return null;
    return (
        <Box
            sx={{
                mt: 3,
                p: 2.5,
                borderRadius: "12px",
                bgcolor: "rgba(59, 130, 246, 0.06)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                display: "flex",
                gap: 2,
                alignItems: "flex-start",
            }}
        >
            <LightbulbOutlinedIcon sx={{ color: "#3b82f6", fontSize: 26, flexShrink: 0, mt: 0.25 }} />
            <Typography sx={{ color: "#1e40af", fontSize: "0.9375rem", lineHeight: 1.65, fontWeight: 500 }}>
                {text}
            </Typography>
        </Box>
    );
}

function ResourceMetricCard({ icon, label, value, accent }) {
    return (
        <Box
            sx={{
                bgcolor: "#fff",
                borderRadius: "14px",
                border: "1px solid rgba(226, 232, 240, 0.95)",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                p: 2,
                display: "flex",
                flexDirection: "column",
                gap: 1,
                minWidth: 0,
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: accent || "#64748b" }}>{icon}</Box>
            <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {label}
            </Typography>
            <Typography sx={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                {value}
            </Typography>
        </Box>
    );
}

function ResourceSummaryMetrics({ rs }) {
    if (!rs) return null;
    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
                gap: 2,
                width: "100%",
            }}
        >
            <ResourceMetricCard
                icon={<StorefrontOutlinedIcon sx={{ fontSize: 22 }} />}
                label="Tổng tài nguyên hiện có"
                value={rs.totalPackageQuota}
                accent="#0D64DE"
            />
            <ResourceMetricCard
                icon={<HubOutlinedIcon sx={{ fontSize: 22 }} />}
                label="Tài nguyên của cơ sở chính hiện có"
                value={rs.myCampusQuota}
                accent="#047857"
            />
            <ResourceMetricCard
                icon={<AccountTreeOutlinedIcon sx={{ fontSize: 22 }} />}
                label="Tài nguyên của các chi nhánh hiện có"
                value={rs.otherCampusesQuota}
                accent="#b45309"
            />
        </Box>
    );
}

function PaymentSuccessSummaryCard({ resourceSummary, packageName, onManageBranches, onContinue }) {
    return (
        <Box
            sx={{
                bgcolor: "#fff",
                borderRadius: CARD_RADIUS,
                boxShadow: CARD_SHADOW,
                border: "1px solid rgba(34, 197, 94, 0.35)",
                p: { xs: 2.5, sm: 3.5 },
                width: "100%",
                boxSizing: "border-box",
            }}
        >
            <Box sx={{ textAlign: "center", mb: 2.5 }}>
                <CheckCircleRoundedIcon sx={{ fontSize: { xs: 64, sm: 72 }, color: "#16a34a", display: "block", mx: "auto" }} />
                <Typography sx={{ mt: 1.5, fontSize: { xs: "1.35rem", sm: "1.5rem" }, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
                    Thanh toán thành công
                </Typography>
                {packageName ? (
                    <Typography sx={{ mt: 0.75, color: "#64748b", fontSize: "0.9375rem" }}>
                        Gói: <Box component="span" sx={{ fontWeight: 600, color: "#334155" }}>{packageName}</Box>
                    </Typography>
                ) : null}
            </Box>
            <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", mb: 1.5 }}>
                Báo cáo tài nguyên tổng thể
            </Typography>
            <ResourceSummaryMetrics rs={resourceSummary} />
            <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, mt: 3, justifyContent: "center" }}>
                <Button
                    variant="outlined"
                    onClick={onManageBranches}
                    sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        borderRadius: "10px",
                        borderColor: "#e2e8f0",
                        color: "#334155",
                        py: 1.25,
                        "&:hover": { borderColor: "#cbd5e1", bgcolor: "rgba(248,250,252,0.95)" },
                    }}
                >
                    Quản lý chi tiết chi nhánh
                </Button>
                <Button
                    variant="contained"
                    onClick={onContinue}
                    sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        borderRadius: "10px",
                        py: 1.25,
                        bgcolor: "#0D64DE",
                        boxShadow: "0 4px 12px rgba(13, 100, 222, 0.25)",
                        "&:hover": { bgcolor: "#0b5ad1", boxShadow: "0 6px 16px rgba(13, 100, 222, 0.35)" },
                    }}
                >
                    Tiếp tục
                </Button>
            </Box>
        </Box>
    );
}

function SubscriptionMainCard({ sub, onViewDetails, onRenewOrUpgrade, hideCommerceActions }) {
    const expiringSoon = !sub.isExpired && sub.dasRemaining < 5;
    const elapsedPct = useMemo(
        () => subscriptionElapsedPercent(sub.startDate, sub.endDate, sub.isExpired),
        [sub.startDate, sub.endDate, sub.isExpired]
    );

    const borderColor = sub.isExpired
        ? "rgba(239, 68, 68, 0.45)"
        : expiringSoon
          ? "rgba(234, 179, 8, 0.5)"
          : "rgba(226, 232, 240, 0.95)";
    const borderWidth = sub.isExpired || expiringSoon ? 2 : 1;

    const remainingStrong = expiringSoon && !sub.isExpired;

    return (
        <Box
            sx={{
                bgcolor: "#fff",
                borderRadius: CARD_RADIUS,
                boxShadow: CARD_SHADOW,
                border: `${borderWidth}px solid`,
                borderColor,
                p: { xs: 2.5, sm: 3, md: 3.5 },
                width: "100%",
            }}
        >
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "1fr",
                        md: "repeat(2, minmax(0, 1fr))",
                        lg: "minmax(0, 3fr) minmax(0, 2.25fr) minmax(0, 2.25fr) minmax(0, 1.8fr)",
                    },
                    gap: { xs: 3, md: 3, lg: 4 },
                    alignItems: { lg: "stretch" },
                }}
            >
                {/* (1) Package info ~30% */}
                <Box sx={{ minWidth: 0, order: { xs: 1, lg: 1 } }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, mb: 1.5 }}>
                        <Typography
                            component="h2"
                            sx={{
                                fontSize: { xs: "1.25rem", sm: "1.375rem" },
                                fontWeight: 700,
                                color: "#0f172a",
                                letterSpacing: "-0.02em",
                                lineHeight: 1.3,
                            }}
                        >
                            {sub.packageName}
                        </Typography>
                        {sub.isExpired ? (
                            <Chip label="Hết hạn" size="small" sx={{ fontWeight: 700, bgcolor: "#fef2f2", color: "#b91c1c" }} />
                        ) : (
                            <Chip label="Đang hoạt động" size="small" sx={{ fontWeight: 700, bgcolor: "#ecfdf5", color: "#047857" }} />
                        )}
                        {expiringSoon ? (
                            <Chip
                                label="Sắp hết hạn"
                                size="small"
                                sx={{ fontWeight: 700, bgcolor: "#fffbeb", color: "#b45309" }}
                            />
                        ) : null}
                    </Box>
                    <Typography sx={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 500 }}>
                        Mã license
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: "0.9375rem",
                            fontWeight: 600,
                            color: "#334155",
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                            wordBreak: "break-all",
                        }}
                    >
                        {sub.licenseKey}
                    </Typography>
                </Box>

                {/* (2) Timeline ~25% */}
                <Box
                    sx={{
                        minWidth: 0,
                        order: { xs: 2, lg: 2 },
                        pl: { lg: 2 },
                        borderLeft: { lg: "1px solid rgba(241, 245, 249, 1)" },
                        borderTop: { xs: "1px solid rgba(241, 245, 249, 1)", lg: "none" },
                        pt: { xs: 2.5, lg: 0 },
                    }}
                >
                    <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", mb: 2 }}>
                        Thời hạn gói
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
                        <Box>
                            <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>Ngày bắt đầu</Typography>
                            <Typography sx={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0f172a" }}>
                                {formatDateDDMMYYYY(sub.startDate)}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>Ngày kết thúc</Typography>
                            <Typography sx={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0f172a" }}>
                                {formatDateDDMMYYYY(sub.endDate)}
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ mt: 2.5 }}>
                        <Typography sx={{ fontSize: "0.6875rem", color: "#94a3b8", fontWeight: 600, mb: 0.75 }}>
                            Tiến độ chu kỳ
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={elapsedPct}
                            sx={{
                                height: 6,
                                borderRadius: 999,
                                bgcolor: "rgba(148, 163, 184, 0.2)",
                                "& .MuiLinearProgress-bar": {
                                    borderRadius: 999,
                                    bgcolor: sub.isExpired ? "#94a3b8" : "#3b82f6",
                                },
                            }}
                        />
                    </Box>
                </Box>

                {/* (3) Remaining ~25% */}
                <Box
                    sx={{
                        minWidth: 0,
                        order: { xs: 3, lg: 3 },
                        borderLeft: { lg: "1px solid rgba(241, 245, 249, 1)" },
                        borderTop: { xs: "1px solid rgba(241, 245, 249, 1)", lg: "none" },
                        pt: { xs: 2.5, lg: 0 },
                        pl: { lg: 2 },
                    }}
                >
                    <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", mb: 1.5 }}>
                        Ngày còn lại
                    </Typography>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 0.75,
                            flexWrap: "wrap",
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: { xs: "2.25rem", sm: "2.75rem" },
                                fontWeight: 800,
                                color: remainingStrong ? "#b45309" : sub.isExpired ? "#64748b" : "#0f172a",
                                letterSpacing: "-0.03em",
                                lineHeight: 1,
                            }}
                        >
                            {sub.isExpired ? 0 : sub.dasRemaining}
                        </Typography>
                        <Typography sx={{ fontSize: "1rem", fontWeight: 600, color: "#64748b" }}>ngày</Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={sub.isExpired ? 0 : Math.max(0, 100 - elapsedPct)}
                        sx={{
                            mt: 2,
                            height: 8,
                            borderRadius: 999,
                            bgcolor: "rgba(148, 163, 184, 0.2)",
                            "& .MuiLinearProgress-bar": {
                                borderRadius: 999,
                                bgcolor: remainingStrong ? "#ea580c" : "#10b981",
                            },
                        }}
                    />
                </Box>

                {/* (4) Actions ~20% */}
                <Box
                    sx={{
                        minWidth: 0,
                        order: { xs: 99, lg: 4 },
                        display: "flex",
                        flexDirection: "column",
                        alignItems: { xs: "stretch", lg: "flex-end" },
                        justifyContent: "center",
                        gap: 1.25,
                        borderLeft: { lg: "1px solid rgba(241, 245, 249, 1)" },
                        borderTop: { xs: "1px solid rgba(241, 245, 249, 1)", lg: "none" },
                        pt: { xs: 2.5, lg: 0 },
                        pl: { lg: 2 },
                    }}
                >
                    <Button
                        variant="outlined"
                        onClick={() => onViewDetails(sub.id)}
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: "10px",
                            borderColor: "#e2e8f0",
                            color: "#334155",
                            minWidth: { lg: 160 },
                            "&:hover": { borderColor: "#cbd5e1", bgcolor: "rgba(248,250,252,0.9)" },
                        }}
                    >
                        Xem chi tiết
                    </Button>
                    {!hideCommerceActions ? (
                        sub.isExpired ? (
                            <Button
                                variant="contained"
                                onClick={onRenewOrUpgrade}
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 600,
                                    borderRadius: "10px",
                                    minWidth: { lg: 160 },
                                    bgcolor: "#dc2626",
                                    boxShadow: "none",
                                    "&:hover": { bgcolor: "#b91c1c", boxShadow: "0 4px 12px rgba(220,38,38,0.25)" },
                                }}
                            >
                                Gia hạn ngay
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                onClick={onRenewOrUpgrade}
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 600,
                                    borderRadius: "10px",
                                    minWidth: { lg: 160 },
                                    bgcolor: "#0D64DE",
                                    boxShadow: "0 4px 12px rgba(13, 100, 222, 0.25)",
                                    "&:hover": {
                                        bgcolor: "#0b5ad1",
                                        boxShadow: "0 6px 16px rgba(13, 100, 222, 0.35)",
                                    },
                                }}
                            >
                                Nâng cấp
                            </Button>
                        )
                    ) : null}
                </Box>
            </Box>
        </Box>
    );
}

function SubscriptionDetailPage({ sub, onBack, onRenewOrUpgrade, hideCommerceActions }) {
    if (!sub) {
        return (
            <Box sx={{ textAlign: "center", py: 8, maxWidth: 400, mx: "auto" }}>
                <Typography sx={{ fontWeight: 700, color: "#0f172a", mb: 1 }}>Không tìm thấy gói đăng ký</Typography>
                <Button onClick={onBack} sx={{ textTransform: "none", fontWeight: 600 }}>
                    Quay lại
                </Button>
            </Box>
        );
    }
    const elapsedPct = subscriptionElapsedPercent(sub.startDate, sub.endDate, sub.isExpired);
    return (
        <Box sx={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
            <Box
                sx={{
                    bgcolor: "#fff",
                    borderRadius: CARD_RADIUS,
                    boxShadow: CARD_SHADOW,
                    border: sub.isExpired ? "2px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(226, 232, 240, 0.95)",
                    p: { xs: 2.5, sm: 4 },
                    width: "100%",
                    boxSizing: "border-box",
                }}
            >
                <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
                    {sub.packageName}
                </Typography>
                <Typography
                    sx={{
                        color: sub.isExpired ? "#64748b" : "#0D64DE",
                        mt: 1,
                        fontSize: "0.9375rem",
                        fontWeight: 600,
                    }}
                >
                    {sub.statusMessage}
                </Typography>
                <Box sx={{ mt: 3, display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                    {[
                        ["Mã license", sub.licenseKey],
                        ["Ngày bắt đầu", formatDateDDMMYYYY(sub.startDate)],
                        ["Ngày kết thúc", formatDateDDMMYYYY(sub.endDate)],
                        ["Ngày còn lại", sub.isExpired ? "0" : String(sub.dasRemaining)],
                    ].map(([k, v]) => (
                        <Box key={k} sx={{ py: 1.5, borderBottom: "1px solid #f1f5f9" }}>
                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
                                {k}
                            </Typography>
                            <Typography sx={{ fontWeight: 600, color: "#0f172a", mt: 0.5 }}>{v}</Typography>
                        </Box>
                    ))}
                </Box>
                <Box sx={{ mt: 2 }}>
                    <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, mb: 0.75 }}>Tiến độ chu kỳ</Typography>
                    <LinearProgress
                        variant="determinate"
                        value={elapsedPct}
                        sx={{
                            height: 8,
                            borderRadius: 999,
                            bgcolor: "rgba(148, 163, 184, 0.2)",
                            "& .MuiLinearProgress-bar": { borderRadius: 999, bgcolor: "#3b82f6" },
                        }}
                    />
                </Box>
                {!hideCommerceActions ? (
                    <Box sx={{ mt: 3, display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                        <Button
                            variant="contained"
                            onClick={onRenewOrUpgrade}
                            sx={{
                                textTransform: "none",
                                fontWeight: 600,
                                borderRadius: "10px",
                                ...(sub.isExpired
                                    ? {
                                          bgcolor: "#dc2626",
                                          boxShadow: "none",
                                          "&:hover": { bgcolor: "#b91c1c", boxShadow: "0 4px 12px rgba(220,38,38,0.25)" },
                                      }
                                    : {
                                          bgcolor: "#0D64DE",
                                          boxShadow: "0 4px 12px rgba(13, 100, 222, 0.25)",
                                          "&:hover": {
                                              bgcolor: "#0b5ad1",
                                              boxShadow: "0 6px 16px rgba(13, 100, 222, 0.35)",
                                          },
                                      }),
                            }}
                        >
                            {sub.isExpired ? "Gia hạn ngay" : "Nâng cấp"}
                        </Button>
                    </Box>
                ) : null}
                {sub.resourceSummary ? (
                    <Box sx={{ mt: 3 }}>
                        <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", mb: 1.5 }}>
                            Phân bổ hạn ngạch nhanh
                        </Typography>
                        <ResourceSummaryMetrics rs={sub.resourceSummary} />
                    </Box>
                ) : null}
                {sub.suggestion ? (
                    <Box sx={{ mt: 3 }}>
                        <SuggestionPanel text={sub.suggestion} />
                    </Box>
                ) : null}
            </Box>
            {hideCommerceActions ? (
                <Box sx={{ mt: 3 }}>
                    <BranchQuotaRequestToPrimaryCard disabled={false} />
                </Box>
            ) : null}
        </Box>
    );
}

function CurrentSubscriptionPage({
    subscription,
    loading,
    error,
    onRetry,
    showPaymentSuccessSummary,
    onContinuePaymentSuccess,
    isPrimaryBranch,
    schoolCtxLoading,
}) {
    const navigate = useNavigate();

    const goPackageFees = () => navigate("/package-fees");
    const viewDetails = (id) => navigate(`/school/purchased-packages/${encodeURIComponent(id)}`);
    const goCampusList = () => navigate("/school/campus");
    const branchReadOnly = !schoolCtxLoading && !isPrimaryBranch;

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%" }}>
            {/* Page Header — cùng phong cách SchoolCampus */}
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
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: { xs: "stretch", sm: "center" },
                        justifyContent: "space-between",
                        gap: 2,
                    }}
                >
                    <Box>
                        <Typography
                            variant="h4"
                            component="h1"
                            sx={{
                                fontWeight: 700,
                                letterSpacing: "-0.02em",
                                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            }}
                        >
                            Gói đăng ký hiện tại
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.95 }}>
                            {branchReadOnly
                                ? "Thông tin gói theo trường — chỉ trụ sở chính được mua / phân bổ gói."
                                : "Xem và quản lý gói dịch vụ đang sử dụng của trường"}
                        </Typography>
                    </Box>
                    {!branchReadOnly ? (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={goPackageFees}
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
                            Nâng cấp / Gia hạn gói
                        </Button>
                    ) : null}
                </Box>
            </Box>

            <Box
                sx={{
                    bgcolor: PAGE_BG,
                    borderRadius: { xs: 0, sm: "12px" },
                    py: { xs: 2, sm: 3 },
                    px: 0,
                    width: "100%",
                    boxSizing: "border-box",
                }}
            >
                {error ? (
                    <Alert
                        severity="error"
                        sx={{ mb: 2, borderRadius: "12px", mx: 0 }}
                        action={
                            <Button color="inherit" size="small" onClick={onRetry} sx={{ textTransform: "none", fontWeight: 600 }}>
                                Thử lại
                            </Button>
                        }
                    >
                        {error}
                    </Alert>
                ) : null}

                {branchReadOnly ? (
                    <Alert severity="info" sx={{ mb: 2, borderRadius: "12px" }}>
                        Chi nhánh chỉ xem thông tin gói; mua gói và phân bổ tài nguyên do trụ sở chính thực hiện.
                    </Alert>
                ) : null}

                {branchReadOnly ? <BranchQuotaRequestToPrimaryCard disabled={loading} /> : null}

                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
                        <CircularProgress size={40} sx={{ color: "#64748b" }} />
                    </Box>
                ) : !error && !subscription ? (
                    <SubscriptionEmptyState
                        branchReadOnly={branchReadOnly}
                        onBuy={branchReadOnly ? () => navigate("/school/dashboard") : goPackageFees}
                    />
                ) : subscription ? (
                    <>
                        {showPaymentSuccessSummary ? (
                            <Box sx={{ mb: 3 }}>
                                <PaymentSuccessSummaryCard
                                    resourceSummary={subscription.resourceSummary}
                                    packageName={subscription.packageName}
                                    onManageBranches={goCampusList}
                                    onContinue={onContinuePaymentSuccess}
                                />
                            </Box>
                        ) : null}
                        <SubscriptionMainCard
                            sub={subscription}
                            onViewDetails={viewDetails}
                            onRenewOrUpgrade={goPackageFees}
                            hideCommerceActions={branchReadOnly}
                        />
                        {isPrimaryBranch && subscription.resourceSummary ? (
                            <Box sx={{ mt: 3 }}>
                                <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", mb: 1.5 }}>
                                    Báo cáo tài nguyên tổng thể
                                </Typography>
                                <ResourceSummaryMetrics rs={subscription.resourceSummary} />
                            </Box>
                        ) : null}
                        <SuggestionPanel text={subscription.suggestion} />
                    </>
                ) : null}
            </Box>
        </Box>
    );
}

export default function SchoolPurchasedPackages() {
    const { subscriptionId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isPrimaryBranch, loading: schoolCtxLoading } = useSchool();
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const resourceRedirectKeyRef = useRef("");

    const branchReadOnly = !schoolCtxLoading && !isPrimaryBranch;

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getCurrentSchoolSubscription();
            const body = res?.data?.body;
            setSubscription(mapSubscription(body));
        } catch (e) {
            const status = e?.response?.status;
            if (status === 404) {
                setSubscription(null);
            } else {
                setSubscription(null);
                setError(getApiErrorMessage(e));
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const paymentSuccessParam = searchParams.get("payment") === "success";

    const showPaymentSuccessSummary = useMemo(() => {
        if (!paymentSuccessParam || !isPrimaryBranch || schoolCtxLoading) return false;
        if (!subscription?.resourceSummary) return false;
        if (shouldRedirectToResourceDistribution(subscription.resourceSummary)) return false;
        return true;
    }, [paymentSuccessParam, isPrimaryBranch, schoolCtxLoading, subscription]);

    const onContinuePaymentSuccess = useCallback(() => {
        navigate("/school/purchased-packages", { replace: true });
    }, [navigate]);

    useEffect(() => {
        if (subscriptionId) return;
        if (schoolCtxLoading || loading) return;
        if (!paymentSuccessParam) {
            resourceRedirectKeyRef.current = "";
            return;
        }
        if (!isPrimaryBranch || !subscription?.resourceSummary) return;
        if (!shouldRedirectToResourceDistribution(subscription.resourceSummary)) {
            resourceRedirectKeyRef.current = "";
            return;
        }
        const rs = subscription.resourceSummary;
        const key = `${subscription.licenseKey}:${rs.totalPackageQuota}:${rs.myCampusQuota}:${rs.otherCampusesQuota}`;
        if (resourceRedirectKeyRef.current === key) return;
        resourceRedirectKeyRef.current = key;
        const n = rs.totalPackageQuota;
        const msg =
            rs.myCampusQuota === 0 && rs.otherCampusesQuota === 0
                ? `Trường có ${n} tài nguyên trong gói nhưng trụ sở và chi nhánh chưa được phân bổ. Vui lòng Phân bổ nguồn lực…`
                : rs.myCampusQuota === 0
                  ? `Hạn ngạch tại trụ sở đang bằng 0 (gói ${n} tài nguyên). Vui lòng Phân bổ nguồn lực…`
                  : `Tổng hạn ngạch chi nhánh đang bằng 0 (gói ${n} tài nguyên). Vui lòng Phân bổ nguồn lực…`;
        enqueueSnackbar(msg, { variant: "warning", autoHideDuration: 4800 });
        navigate("/school/facility-config?tab=resource-distribution", { replace: true });
    }, [subscriptionId, schoolCtxLoading, loading, paymentSuccessParam, isPrimaryBranch, subscription, navigate]);

    const goPackageFees = () => navigate("/package-fees");
    const detailSub =
        subscriptionId && subscription && subscription.id === subscriptionId ? subscription : subscriptionId ? null : null;

    if (subscriptionId) {
        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%" }}>
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
                            flexDirection: { xs: "column", sm: "row" },
                            alignItems: { xs: "stretch", sm: "center" },
                            justifyContent: "space-between",
                            gap: 2,
                        }}
                    >
                        <Box>
                            <Typography
                                variant="h4"
                                component="h1"
                                sx={{
                                    fontWeight: 700,
                                    letterSpacing: "-0.02em",
                                    textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                                }}
                            >
                                Chi tiết gói đăng ký
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.95 }}>
                                Thông tin license và thời hạn sử dụng
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            onClick={() => navigate("/school/purchased-packages")}
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
                            Quay lại gói đăng ký
                        </Button>
                    </Box>
                </Box>

                <Box
                    sx={{
                        bgcolor: PAGE_BG,
                        borderRadius: { xs: 0, sm: "12px" },
                        py: { xs: 2, sm: 3 },
                        px: 0,
                        width: "100%",
                        boxSizing: "border-box",
                    }}
                >
                    {loading && !subscription ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
                            <CircularProgress size={40} sx={{ color: "#64748b" }} />
                        </Box>
                    ) : error && !subscription ? (
                        <Alert
                            severity="error"
                            action={
                                <Button color="inherit" size="small" onClick={load} sx={{ textTransform: "none", fontWeight: 600 }}>
                                    Thử lại
                                </Button>
                            }
                        >
                            {error}
                        </Alert>
                    ) : (
                        <SubscriptionDetailPage
                            sub={detailSub}
                            onBack={() => navigate("/school/purchased-packages")}
                            onRenewOrUpgrade={goPackageFees}
                            hideCommerceActions={branchReadOnly}
                        />
                    )}
                </Box>
            </Box>
        );
    }

    return (
        <CurrentSubscriptionPage
            subscription={subscription}
            loading={loading}
            error={error}
            onRetry={load}
            showPaymentSuccessSummary={showPaymentSuccessSummary}
            onContinuePaymentSuccess={onContinuePaymentSuccess}
            isPrimaryBranch={isPrimaryBranch}
            schoolCtxLoading={schoolCtxLoading}
        />
    );
}
