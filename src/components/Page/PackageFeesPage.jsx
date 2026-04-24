import React from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogContent,
    Divider,
    Skeleton,
    Step,
    StepLabel,
    Stepper,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { enqueueSnackbar } from "notistack";
import { BRAND_NAVY } from "../../constants/homeLandingTheme";
import { getAdminPackageFees } from "../../services/AdminService.jsx";
import {
    createSchoolSubscriptionPayment,
    getCurrentSchoolSubscription,
    previewSchoolSubscriptionChange,
} from "../../services/SchoolSubscriptionService.jsx";
import { normalizeUserRole } from "../../utils/userRole.js";
import SchoolServicePackagesGrid from "../ui/SchoolServicePackagesGrid.jsx";

const LAYOUT_HEADER_TOP_PX = { xs: "calc(72px + 24px)", md: "calc(80px + 32px)" };

function readSchoolRoleFromStorage() {
    try {
        if (typeof window === "undefined") return false;
        const raw = localStorage.getItem("user");
        if (!raw) return false;
        const user = JSON.parse(raw);
        return normalizeUserRole(user.role ?? "") === "SCHOOL";
    } catch {
        return false;
    }
}

function formatVnd(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "0 ₫";
    return `${new Intl.NumberFormat("vi-VN").format(Math.round(amount))} ₫`;
}

function formatDateDDMMYYYY(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function PreviewModalSkeleton() {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Skeleton variant="rounded" height={68} />
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
                <Skeleton variant="rounded" height={152} />
                <Skeleton variant="rounded" height={152} />
            </Box>
            <Skeleton variant="rounded" height={212} />
            <Skeleton variant="rounded" height={88} />
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
                <Skeleton variant="rounded" width={100} height={42} />
                <Skeleton variant="rounded" width={210} height={42} />
            </Box>
        </Box>
    );
}

function SubscriptionPreviewModal({
    open,
    onClose,
    onConfirm,
    previewLoading,
    submitLoading,
    selectedPackageName,
    previewError,
    previewData,
    fullScreen,
}) {
    const action = String(previewData?.action || "").toUpperCase();
    const isUpgrade = action === "UPGRADE";
    const title = isUpgrade ? "Xác nhận nâng cấp gói" : "Xác nhận gia hạn gói";
    const actionBadgeLabel = isUpgrade ? "Nâng cấp" : "Gia hạn";
    const badgeBg = isUpgrade ? "rgba(13,100,222,0.12)" : "rgba(14,165,233,0.14)";
    const badgeColor = isUpgrade ? "#0D64DE" : "#0369a1";
    const totalAmount = Number(previewData?.breakdown?.finalPrice ?? 0);
    const remainingDaysValue = Number(previewData?.target?.remainingDays);
    const hasRemainingDays = Number.isFinite(remainingDaysValue) && remainingDaysValue >= 0;
    const canConfirm = !previewLoading && !submitLoading && !previewError && previewData;

    return (
        <Dialog
            open={open}
            onClose={submitLoading ? undefined : onClose}
            fullWidth
            maxWidth="md"
            fullScreen={fullScreen}
            scroll="paper"
            PaperProps={{
                sx: {
                    borderRadius: { xs: "14px", md: "16px" },
                    boxShadow: "0 24px 54px rgba(15, 23, 42, 0.22)",
                    transform: open ? "scale(1)" : "scale(0.98)",
                    transition: "transform .22s ease",
                    overscrollBehavior: "contain",
                },
            }}
        >
            <DialogContent
                sx={{
                    p: { xs: 2, sm: 2.5, md: 3 },
                    overscrollBehavior: "contain",
                }}
            >
                {previewLoading ? (
                    <PreviewModalSkeleton />
                ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.25 }}>
                        <Box sx={{ p: { xs: 1.75, sm: 2 }, borderRadius: "14px", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 1.5,
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                }}
                            >
                                <Typography sx={{ fontSize: { xs: "1.05rem", sm: "1.2rem" }, fontWeight: 800, color: "#0f172a" }}>{title}</Typography>
                                <Chip label={actionBadgeLabel} size="small" sx={{ fontWeight: 700, bgcolor: badgeBg, color: badgeColor }} />
                            </Box>
                            <Typography sx={{ mt: 0.5, color: "#64748b", fontSize: "0.875rem" }}>Giữ nguyên ngày hết hạn hiện tại</Typography>
                            <Stepper activeStep={0} sx={{ pt: 1.5, pb: 0.2 }}>
                                <Step>
                                    <StepLabel>Xem trước</StepLabel>
                                </Step>
                                <Step>
                                    <StepLabel>Thanh toán</StepLabel>
                                </Step>
                                <Step>
                                    <StepLabel>Hoàn tất</StepLabel>
                                </Step>
                            </Stepper>
                        </Box>

                        {previewError ? (
                            <Alert severity="error" sx={{ borderRadius: "12px" }}>
                                {previewError}
                            </Alert>
                        ) : null}

                        {previewData ? (
                            <>
                                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr auto 1fr" }, alignItems: "stretch" }}>
                                    <Box sx={{ p: 2, borderRadius: "14px", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                                        <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", mb: 1 }}>
                                            Gói hiện tại
                                        </Typography>
                                        <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>{previewData?.current?.packageName || "—"}</Typography>
                                        <Typography sx={{ mt: 1, color: "#334155", fontSize: "0.875rem" }}>Giá: {formatVnd(previewData?.current?.price)}</Typography>
                                        <Typography sx={{ color: "#334155", fontSize: "0.875rem" }}>
                                            Thời hạn: {previewData?.current?.durationDays ?? 0} ngày
                                        </Typography>
                                        <Typography sx={{ color: "#334155", fontSize: "0.875rem" }}>
                                            Hết hạn: {formatDateDDMMYYYY(previewData?.current?.expiryDate)}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ display: { xs: "none", md: "grid" }, placeItems: "center", px: 0.5 }}>
                                        <ArrowForwardRoundedIcon sx={{ color: "#0D64DE" }} />
                                    </Box>

                                    <Box sx={{ p: 2, borderRadius: "14px", bgcolor: "rgba(13,100,222,0.06)", border: "1px solid rgba(13,100,222,0.35)" }}>
                                        <Typography sx={{ fontSize: "0.75rem", color: "#0D64DE", fontWeight: 700, textTransform: "uppercase", mb: 1 }}>
                                            Gói mục tiêu
                                        </Typography>
                                        <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
                                            {previewData?.target?.packageName || selectedPackageName || "—"}
                                        </Typography>
                                        <Typography sx={{ mt: 1, color: "#334155", fontSize: "0.875rem" }}>Giá: {formatVnd(previewData?.target?.price)}</Typography>
                                        <Typography sx={{ color: "#334155", fontSize: "0.875rem" }}>
                                            Thời hạn: {previewData?.target?.durationDays ?? 0} ngày
                                        </Typography>
                                        <Typography sx={{ color: "#334155", fontSize: "0.875rem" }}>
                                            Hết hạn mới: {formatDateDDMMYYYY(previewData?.target?.newExpiryDate)}
                                        </Typography>
                                        <Typography sx={{ mt: 0.75, color: "#0D64DE", fontSize: "0.8125rem", fontWeight: 600 }}>
                                            Còn lại: {hasRemainingDays ? remainingDaysValue : "—"} ngày
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ p: { xs: 2, sm: 2.25 }, borderRadius: "14px", bgcolor: "#fff", border: "1px solid #e2e8f0" }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.25 }}>
                                        <Typography sx={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
                                            Chi tiết thanh toán
                                        </Typography>
                                        <Tooltip title="Tiền chênh lệch được tính theo thời gian còn lại (proration)">
                                            <InfoOutlinedIcon sx={{ fontSize: 17, color: "#64748b", cursor: "help" }} />
                                        </Tooltip>
                                    </Box>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.9 }}>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                                            <Typography sx={{ color: "#334155", fontSize: "0.9rem" }}>Giá trị còn lại từ gói cũ</Typography>
                                            <Typography sx={{ color: "#16a34a", fontSize: "0.9rem", fontWeight: 700 }}>
                                                -{formatVnd(previewData?.target?.creditOld)}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                                            <Typography sx={{ color: "#334155", fontSize: "0.9rem" }}>Chi phí gói mới cho thời gian còn lại</Typography>
                                            <Typography sx={{ color: "#0f172a", fontSize: "0.9rem", fontWeight: 700 }}>
                                                {formatVnd(previewData?.target?.chargeNew)}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                                            <Typography sx={{ color: "#334155", fontSize: "0.9rem" }}>Chênh lệch trước phí & thuế</Typography>
                                            <Typography sx={{ color: "#0f172a", fontSize: "0.9rem", fontWeight: 700 }}>
                                                {formatVnd(previewData?.netAmount)}
                                            </Typography>
                                        </Box>
                                        <Divider sx={{ my: 0.5 }} />
                                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                                            <Typography sx={{ color: "#334155", fontSize: "0.9rem" }}>Phí dịch vụ</Typography>
                                            <Typography sx={{ color: "#0f172a", fontSize: "0.9rem", fontWeight: 700 }}>
                                                {formatVnd(previewData?.breakdown?.serviceFee)}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                                            <Typography sx={{ color: "#334155", fontSize: "0.9rem" }}>VAT</Typography>
                                            <Typography sx={{ color: "#0f172a", fontSize: "0.9rem", fontWeight: 700 }}>
                                                {formatVnd(previewData?.breakdown?.taxFee)}
                                            </Typography>
                                        </Box>
                                        <Divider sx={{ my: 0.5 }} />
                                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, alignItems: "flex-end" }}>
                                            <Typography sx={{ color: "#0f172a", fontSize: "1rem", fontWeight: 800 }}>Tổng thanh toán</Typography>
                                            <Typography sx={{ color: "#0D64DE", fontSize: { xs: "1.18rem", sm: "1.35rem" }, fontWeight: 900 }}>
                                                {formatVnd(totalAmount)}
                                            </Typography>
                                        </Box>
                                        <Typography sx={{ color: "#64748b", fontSize: "0.8rem", textAlign: "right" }}>
                                            Đây là số tiền bạn cần thanh toán
                                        </Typography>
                                    </Box>
                                </Box>

                                {previewData?.warnings?.message || previewData?.warnings?.pricingNote ? (
                                    <Box
                                        sx={{
                                            p: 1.5,
                                            borderRadius: "12px",
                                            border: "1px solid rgba(234,179,8,0.45)",
                                            bgcolor: "#fffbeb",
                                            display: "flex",
                                            gap: 1.25,
                                            alignItems: "flex-start",
                                        }}
                                    >
                                        <WarningAmberRoundedIcon sx={{ color: "#b45309", mt: "2px", fontSize: 20 }} />
                                        <Box sx={{ minWidth: 0 }}>
                                            {previewData?.warnings?.message ? (
                                                <Typography sx={{ color: "#92400e", fontSize: "0.85rem", lineHeight: 1.55 }}>
                                                    {previewData.warnings.message}
                                                </Typography>
                                            ) : null}
                                            {previewData?.warnings?.pricingNote ? (
                                                <Typography sx={{ color: "#92400e", fontSize: "0.85rem", lineHeight: 1.55, mt: 0.25 }}>
                                                    {previewData.warnings.pricingNote}
                                                </Typography>
                                            ) : null}
                                        </Box>
                                    </Box>
                                ) : null}
                            </>
                        ) : null}

                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 1.25,
                                mt: 0.5,
                                flexDirection: { xs: "column-reverse", sm: "row" },
                            }}
                        >
                            <Button
                                variant="outlined"
                                onClick={onClose}
                                disabled={submitLoading}
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 700,
                                    borderRadius: "10px",
                                    borderColor: "#cbd5e1",
                                    color: "#334155",
                                    width: { xs: "100%", sm: "auto" },
                                }}
                            >
                                Đóng
                            </Button>
                            <Button
                                variant="contained"
                                onClick={onConfirm}
                                disabled={!canConfirm}
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 700,
                                    borderRadius: "10px",
                                    bgcolor: "#0D64DE",
                                    boxShadow: "0 6px 18px rgba(13,100,222,0.28)",
                                    width: { xs: "100%", sm: "auto" },
                                    "&:hover": { bgcolor: "#0b5ad1" },
                                }}
                            >
                                {submitLoading ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Xác nhận & Thanh toán"}
                            </Button>
                        </Box>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default function PackageFeesPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const [isSchoolRole, setIsSchoolRole] = React.useState(() => readSchoolRoleFromStorage());
    const [schoolServicePackages, setSchoolServicePackages] = React.useState([]);
    const [servicePackagesLoading, setServicePackagesLoading] = React.useState(false);
    const [currentSubscription, setCurrentSubscription] = React.useState(null);
    const [previewOpen, setPreviewOpen] = React.useState(false);
    const [previewLoadingPackageId, setPreviewLoadingPackageId] = React.useState(null);
    const [paymentLoadingPackageId, setPaymentLoadingPackageId] = React.useState(null);
    const [previewPayload, setPreviewPayload] = React.useState(null);
    const [previewError, setPreviewError] = React.useState("");
    const [previewActionType, setPreviewActionType] = React.useState("RENEW");
    const [selectedPackage, setSelectedPackage] = React.useState(null);
    const hasCurrentSubscription = React.useMemo(() => {
        return !!(
            currentSubscription?.licenseKey ||
            currentSubscription?.packageName ||
            currentSubscription?.startDate ||
            currentSubscription?.endDate
        );
    }, [currentSubscription]);

    React.useEffect(() => {
        const sync = () => setIsSchoolRole(readSchoolRoleFromStorage());
        sync();
        window.addEventListener("focus", sync);
        window.addEventListener("storage", sync);
        return () => {
            window.removeEventListener("focus", sync);
            window.removeEventListener("storage", sync);
        };
    }, []);

    React.useEffect(() => {
        if (!isSchoolRole) {
            setSchoolServicePackages([]);
            return;
        }

        let cancelled = false;
        (async () => {
            setServicePackagesLoading(true);
            try {
                const res = await getAdminPackageFees();
                const raw = Array.isArray(res?.data?.body) ? res.data.body : [];
                const activePackages = raw.filter(
                    (item) => String(item?.status || "").trim().toUpperCase() === "PACKAGE_ACTIVE"
                );
                if (!cancelled) setSchoolServicePackages(activePackages);
            } catch (error) {
                console.error(error);
                if (!cancelled) {
                    setSchoolServicePackages([]);
                    enqueueSnackbar("Không thể tải danh sách gói dịch vụ.", { variant: "error" });
                }
            } finally {
                if (!cancelled) setServicePackagesLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isSchoolRole]);

    React.useEffect(() => {
        if (!isSchoolRole) {
            setCurrentSubscription(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await getCurrentSchoolSubscription();
                if (!cancelled) setCurrentSubscription(res?.data?.body || null);
            } catch {
                if (!cancelled) setCurrentSubscription(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isSchoolRole]);

    const resolveActionType = React.useCallback(
        (pkg) => {
            const currentPackageId = Number(currentSubscription?.packageId);
            const targetPackageId = Number(pkg?.id);
            if (Number.isFinite(currentPackageId) && Number.isFinite(targetPackageId) && currentPackageId === targetPackageId) {
                return "RENEW";
            }
            const currentName = String(currentSubscription?.packageName || "").trim().toLowerCase();
            const targetName = String(pkg?.name || "").trim().toLowerCase();
            if (currentName && targetName && currentName === targetName) return "RENEW";
            return "UPGRADE";
        },
        [currentSubscription]
    );

    const closePreviewModal = React.useCallback(() => {
        if (paymentLoadingPackageId != null) return;
        setPreviewOpen(false);
        setPreviewPayload(null);
        setPreviewError("");
        setSelectedPackage(null);
        setPreviewLoadingPackageId(null);
    }, [paymentLoadingPackageId]);

    const createPaymentAndRedirect = React.useCallback(async (pkg, actionType) => {
        const packageId = Number(pkg?.id);
        if (!Number.isFinite(packageId) || packageId <= 0) {
            enqueueSnackbar("Không xác định được gói dịch vụ.", { variant: "error" });
            return;
        }
        const actionLabel =
            actionType === "UPGRADE" ? "nâng cấp" : actionType === "RENEW" ? "gia hạn" : "mua mới";
        const description = pkg?.name?.trim()
            ? `Thanh toán ${actionLabel} gói ${pkg.name.trim()}`
            : `Thanh toán ${actionLabel} gói dịch vụ`;
        setPaymentLoadingPackageId(packageId);
        try {
            const res = await createSchoolSubscriptionPayment({ packageId, description });
            const paymentUrl = res?.data?.body;
            if (typeof paymentUrl === "string" && /^https?:\/\//i.test(paymentUrl.trim())) {
                const url = paymentUrl.trim();
                const w = window.open(url, "_blank");
                if (w) {
                    try {
                        w.opener = null;
                    } catch {
                    }
                } else {
                    enqueueSnackbar("Không mở được tab mới. Đang chuyển trong tab hiện tại.", { variant: "warning" });
                    window.location.assign(url);
                }
                return;
            }
            enqueueSnackbar(
                typeof res?.data?.message === "string" ? res.data.message : "Không nhận được liên kết thanh toán.",
                { variant: "warning" }
            );
        } catch (error) {
            const raw = error?.response?.data?.message ?? error?.response?.data?.body ?? error?.message;
            const msg = typeof raw === "string" ? raw : "Không thể tạo liên kết thanh toán.";
            enqueueSnackbar(msg, { variant: "error" });
        } finally {
            setPaymentLoadingPackageId(null);
        }
    }, []);

    const handleSchoolPackageBuyNow = React.useCallback(async (pkg) => {
        const packageId = Number(pkg?.id);
        if (!Number.isFinite(packageId) || packageId <= 0) {
            enqueueSnackbar("Không xác định được gói dịch vụ.", { variant: "error" });
            return;
        }
        if (!hasCurrentSubscription) {
            await createPaymentAndRedirect(pkg, "NEW_PURCHASE");
            return;
        }
        const actionType = resolveActionType(pkg);
        setSelectedPackage(pkg);
        setPreviewActionType(actionType);
        setPreviewPayload(null);
        setPreviewError("");
        setPreviewOpen(true);
        setPreviewLoadingPackageId(packageId);
        try {
            const res = await previewSchoolSubscriptionChange({ actionType, targetPackageId: packageId });
            setPreviewPayload(res?.data?.body || null);
        } catch (error) {
            const raw = error?.response?.data?.message ?? error?.response?.data?.body ?? error?.message;
            const msg = typeof raw === "string" ? raw : "Không thể xem trước thay đổi gói.";
            setPreviewError(msg);
        } finally {
            setPreviewLoadingPackageId(null);
        }
    }, [createPaymentAndRedirect, hasCurrentSubscription, resolveActionType]);

    const handleConfirmPayment = React.useCallback(async () => {
        if (!selectedPackage) return;
        await createPaymentAndRedirect(selectedPackage, previewActionType);
    }, [createPaymentAndRedirect, previewActionType, selectedPackage]);

    return (
        <>
            <Box
                sx={{
                    position: "relative",
                    zIndex: 1,
                    minHeight: "60vh",
                    pt: LAYOUT_HEADER_TOP_PX,
                    pb: { xs: 5, md: 7 },
                    background: "linear-gradient(180deg, #f8fafc 0%, #f0f9ff 100%)",
                }}
            >
                <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
                    <Typography
                        variant="h4"
                        sx={{
                            textAlign: "center",
                            fontWeight: 800,
                            color: BRAND_NAVY,
                            mb: 1,
                            fontSize: { xs: "1.6rem", md: "2rem" },
                        }}
                    >
                        Các gói dịch vụ
                    </Typography>
                    <Typography
                        sx={{
                            textAlign: "center",
                            color: "#64748b",
                            fontSize: { xs: "0.95rem", md: "1rem" },
                            mb: 4,
                        }}
                    >
                        Lựa chọn gói phù hợp để tăng hiệu quả tuyển sinh cho trường của bạn.
                    </Typography>

                    {!isSchoolRole ? (
                        <Typography sx={{ textAlign: "center", color: "#64748b", py: 2, maxWidth: 520, mx: "auto" }}>
                            Vui lòng đăng nhập bằng tài khoản nhà trường để xem và mua gói dịch vụ.
                        </Typography>
                    ) : (
                        <SchoolServicePackagesGrid
                            packages={schoolServicePackages}
                            loading={servicePackagesLoading}
                            buyNowLoadingPackageId={previewLoadingPackageId ?? paymentLoadingPackageId}
                            onBuyNow={handleSchoolPackageBuyNow}
                            cardsVisible
                        />
                    )}
                </Container>
            </Box>

            <SubscriptionPreviewModal
                open={previewOpen}
                onClose={closePreviewModal}
                onConfirm={handleConfirmPayment}
                previewLoading={previewLoadingPackageId != null}
                submitLoading={paymentLoadingPackageId != null}
                selectedPackageName={selectedPackage?.name || ""}
                previewError={previewError}
                previewData={previewPayload}
                fullScreen={isMobile}
            />
        </>
    );
}
