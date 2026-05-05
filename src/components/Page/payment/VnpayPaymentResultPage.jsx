/**
 * Trang kết quả thanh toán VNPAY (đọc query trên URL của SPA).
 *
 * Flow: `vnp_ReturnUrl` trỏ thẳng FE (vd. /payment/vnpay-result). Sau khi VNPAY redirect kèm ?vnp_...,
 * trang này gọi GET /api/v1/school/vnpay-callback + cùng query string để BE verify và kích hoạt gói.
 * Khi thành công: GET /api/v1/school/payment/receipt?txnRef=vnp_TxnRef để hiển thị hóa đơn;
 * nút tải PDF gọi GET /api/v1/school/subscription/receipt/export?txnRef=...
 * Không tự chuyển trang: user bấm nút điều hướng khi muốn rời trang.
 */
import React from "react";
import {
    Alert,
    alpha,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Container,
    Divider,
    IconButton,
    LinearProgress,
    Skeleton,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import SummarizeRoundedIcon from "@mui/icons-material/SummarizeRounded";
import {useNavigate, useSearchParams} from "react-router-dom";
import {enqueueSnackbar} from "notistack";
import {getRoleDashboardRoute} from "../../../utils/roleRouting";
import {
    exportSchoolSubscriptionReceiptPdf,
    forwardSchoolVnpayCallback,
    getSchoolPaymentReceipt,
} from "../../../services/SchoolSubscriptionService.jsx";
import {getApiErrorMessage} from "../../../utils/getApiErrorMessage.js";
import {getPackageTypeLabelVi} from "../../../utils/servicePackageDisplay.js";

/** Bù chiều cao Header cố định (`AppBar position="fixed"` trong WebAppLayout), khớp scroll anchor HomePage ~80px + biên */
const LAYOUT_HEADER_OFFSET_PX = 88;

/** Chiều rộng tối đa cột nội dung + footer (card rộng dần theo breakpoint) */
const VNPAY_RECEIPT_MAX_WIDTH_SX = {
    width: "100%",
    maxWidth: {xs: "100%", sm: 600, md: 720, lg: 840},
};

const SUCCESS = "#22c55e";
const ERROR = "#ef4444";
const PENDING = "#f59e0b";
const UNKNOWN = "#64748b";

function safeDecodeURIComponent(value) {
    if (value == null || value === "") return "";
    try {
        return decodeURIComponent(value.replace(/\+/g, " "));
    } catch {
        return value;
    }
}

function formatVnpAmount(raw) {
    if (raw == null || raw === "") return null;
    const n = parseInt(String(raw), 10);
    if (!Number.isFinite(n)) return null;
    const vnd = n / 100;
    return new Intl.NumberFormat("vi-VN", {style: "currency", currency: "VND"}).format(vnd);
}

function formatVndFromNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return new Intl.NumberFormat("vi-VN", {style: "currency", currency: "VND"}).format(n);
}

function formatIsoDateVi(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString("vi-VN");
}

function parseFilenameFromContentDisposition(header) {
    if (!header || typeof header !== "string") return null;
    const utf8 = /filename\*=UTF-8''([^;\s]+)/i.exec(header);
    if (utf8?.[1]) {
        try {
            return decodeURIComponent(utf8[1].trim());
        } catch {
            return utf8[1].trim();
        }
    }
    const quoted = /filename="([^"]+)"/i.exec(header);
    if (quoted?.[1]) return quoted[1].trim();
    const unquoted = /filename=([^;\s]+)/i.exec(header);
    if (unquoted?.[1]) return unquoted[1].trim().replace(/^["']|["']$/g, "");
    return null;
}

function formatVnpPayDate(raw) {
    if (!raw || String(raw).length < 14) return null;
    const s = String(raw);
    const y = s.slice(0, 4);
    const m = s.slice(4, 6);
    const d = s.slice(6, 8);
    const H = s.slice(8, 10);
    const M = s.slice(10, 12);
    const S = s.slice(12, 14);
    return `${d}/${m}/${y} ${H}:${M}:${S}`;
}

function parseVnpFromSearchParams(searchParams) {
    const vnp = {};
    searchParams.forEach((v, k) => {
        if (k.startsWith("vnp_")) {
            vnp[k] = v;
        }
    });
    const get = (key) => {
        const val = vnp[key];
        return val == null ? "" : String(val).trim();
    };
    let txnRef = get("vnp_TxnRef");
    if (!txnRef) {
        const keys = Object.keys(vnp);
        const matchKey = keys.find((k) => k.toLowerCase() === "vnp_txnref");
        if (matchKey) txnRef = String(vnp[matchKey] ?? "").trim();
    }
    return {
        vnp,
        responseCode: get("vnp_ResponseCode"),
        transactionNo: get("vnp_TransactionNo"),
        txnRef,
        amountRaw: get("vnp_Amount"),
        orderInfo: safeDecodeURIComponent(get("vnp_OrderInfo")),
        payDateRaw: get("vnp_PayDate"),
        bankCode: get("vnp_BankCode"),
        cardType: get("vnp_CardType"),
        hasVnpParams: Object.keys(vnp).length > 0,
    };
}

function resolveStatus(parsed) {
    const {hasVnpParams, responseCode, transactionNo, txnRef} = parsed;
    if (!hasVnpParams) {
        return "empty";
    }
    const code = responseCode;
    if (code === "00") {
        return "success";
    }
    if (code === "01") {
        return "pending";
    }
    if (code !== "") {
        return "failed";
    }
    if (transactionNo || txnRef) {
        return "unknown";
    }
    return "empty";
}

function statusLabel(status) {
    switch (status) {
        case "success":
            return "Thành công";
        case "failed":
            return "Thất bại";
        case "pending":
            return "Đang xử lý";
        case "unknown":
            return "Chưa xác định";
        default:
            return "—";
    }
}

const FONT_UI = '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif';

function StatusPill({status}) {
    const map = {
        success: {bg: alpha("#22c55e", 0.14), color: "#15803d", border: alpha("#22c55e", 0.35)},
        failed: {bg: alpha("#ef4444", 0.12), color: "#b91c1c", border: alpha("#ef4444", 0.35)},
        pending: {bg: alpha("#f59e0b", 0.14), color: "#b45309", border: alpha("#f59e0b", 0.38)},
        unknown: {bg: alpha("#64748b", 0.12), color: "#475569", border: alpha("#64748b", 0.3)},
        empty: {bg: alpha("#94a3b8", 0.12), color: "#64748b", border: alpha("#94a3b8", 0.25)},
    };
    const s = map[status] || map.empty;
    return (
        <Chip
            label={statusLabel(status)}
            size="small"
            sx={{
                fontFamily: FONT_UI,
                fontWeight: 700,
                fontSize: "0.75rem",
                height: 28,
                borderRadius: 999,
                bgcolor: s.bg,
                color: s.color,
                border: `1px solid ${s.border}`,
                "& .MuiChip-label": {px: 1.5},
            }}
        />
    );
}

function SectionHeading({icon: Icon, title, dense = false}) {
    return (
        <Stack direction="row" alignItems="center" spacing={1} sx={{mb: 1.25, mt: dense ? 0 : 2.5}}>
            <Box
                sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: alpha("#0D64DE", 0.08),
                    color: "#0D64DE",
                }}
            >
                <Icon sx={{fontSize: 20}}/>
            </Box>
            <Typography
                sx={{
                    fontFamily: FONT_UI,
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    color: "#475569",
                    letterSpacing: "0.02em",
                }}
            >
                {title}
            </Typography>
        </Stack>
    );
}

function SummaryGridRow({label, children, highlight = false, rawRight = false}) {
    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: "minmax(0,1fr) minmax(0,1.1fr)",
                gap: 1.5,
                alignItems: "center",
                py: 1.35,
            }}
        >
            <Typography
                sx={{
                    fontFamily: FONT_UI,
                    fontSize: "0.8125rem",
                    color: "#64748b",
                    fontWeight: 600,
                }}
            >
                {label}
            </Typography>
            <Box sx={{minWidth: 0, justifySelf: "end", textAlign: "right", width: "100%"}}>
                {highlight ? (
                    <Typography
                        sx={{
                            fontFamily: FONT_UI,
                            fontSize: {xs: "1.15rem", sm: "1.25rem"},
                            fontWeight: 800,
                            color: "#0f172a",
                            letterSpacing: "-0.02em",
                        }}
                    >
                        {children}
                    </Typography>
                ) : rawRight ? (
                    children
                ) : (
                    <Typography
                        component="div"
                        sx={{
                            fontFamily: FONT_UI,
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            color: "#0f172a",
                            wordBreak: "break-word",
                        }}
                    >
                        {children}
                    </Typography>
                )}
            </Box>
        </Box>
    );
}

function ReceiptSkeletonBlock() {
    return (
        <Stack spacing={0} sx={{py: 0.5}}>
            <Skeleton variant="rounded" height={36} sx={{borderRadius: 2, mb: 1.5}}/>
            {[1, 2, 3, 4].map((i) => (
                <Box key={i} sx={{py: 1.25}}>
                    <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <Skeleton variant="text" width="38%" height={20}/>
                        <Skeleton variant="text" width="42%" height={20}/>
                    </Stack>
                </Box>
            ))}
            <Skeleton variant="rounded" height={36} sx={{borderRadius: 2, mt: 2, mb: 1}}/>
            <Skeleton variant="text" width="70%" height={24}/>
            <Skeleton variant="rounded" height={88} sx={{borderRadius: 2, mt: 2}}/>
        </Stack>
    );
}

/** Sau thanh toán VNPAY: tài khoản trường về trang gói đã mua; các role khác về dashboard mặc định */
function getPostPaymentRedirectPath() {
    try {
        const raw = localStorage.getItem("user");
        if (!raw) return "/home";
        const user = JSON.parse(raw);
        const role = user?.role?.toUpperCase?.() ?? "";
        if (role === "SCHOOL") {
            return "/school/purchased-packages";
        }
        return getRoleDashboardRoute(user?.role) || "/home";
    } catch {
        return "/home";
    }
}

export default function VnpayPaymentResultPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const parsed = React.useMemo(() => parseVnpFromSearchParams(searchParams), [searchParams]);
    const status = React.useMemo(() => resolveStatus(parsed), [parsed]);
    const queryKey = searchParams.toString();

    const transactionId = parsed.transactionNo || parsed.txnRef || "";
    /** Ưu tiên mã tham chiếu đơn hàng (txnRef) cho sao chép / hiển thị tóm tắt */
    const summaryTxnId = String(parsed.txnRef || parsed.transactionNo || "").trim() || transactionId;
    const amountDisplay = formatVnpAmount(parsed.amountRaw);
    const payDateDisplay = formatVnpPayDate(parsed.payDateRaw);

    /** na = không gọi BE; có tham số vnp_ thì gọi callback */
    const [backendVerify, setBackendVerify] = React.useState("na");

    const [receipt, setReceipt] = React.useState(null);
    const [receiptLoading, setReceiptLoading] = React.useState(false);
    const [receiptError, setReceiptError] = React.useState("");
    const [exportLoading, setExportLoading] = React.useState(false);

    const failToastShownRef = React.useRef(false);

    const redirectTarget = React.useMemo(() => {
        const base = getPostPaymentRedirectPath();
        if (base === "/school/purchased-packages" && status === "success") {
            return "/school/purchased-packages?payment=success";
        }
        return base;
    }, [status]);

    React.useEffect(() => {
        if (!parsed.hasVnpParams) {
            setBackendVerify("na");
            return undefined;
        }
        setBackendVerify("loading");
        const q = window.location.search;
        let cancelled = false;
        (async () => {
            try {
                await forwardSchoolVnpayCallback(q);
                if (!cancelled) {
                    setBackendVerify("success");
                }
            } catch (err) {
                if (!cancelled) {
                    setBackendVerify("error");
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [parsed.hasVnpParams, queryKey]);

    /** Gọi receipt sau khi vnpay-callback không còn loading (BE thường cần ghi nhận giao dịch trước). Vẫn thử khi callback lỗi. */
    React.useEffect(() => {
        if (status !== "success" || !parsed.txnRef) {
            setReceipt(null);
            setReceiptError("");
            setReceiptLoading(false);
            return undefined;
        }
        if (backendVerify === "loading" || backendVerify === "na") {
            setReceipt(null);
            setReceiptError("");
            setReceiptLoading(false);
            return undefined;
        }
        let cancelled = false;
        setReceipt(null);
        setReceiptError("");
        setReceiptLoading(true);
        (async () => {
            try {
                const res = await getSchoolPaymentReceipt(parsed.txnRef);
                const rawBody = res?.data?.body;
                const body =
                    rawBody && typeof rawBody === "object"
                        ? rawBody
                        : typeof rawBody === "string"
                          ? (() => {
                                try {
                                    return JSON.parse(rawBody);
                                } catch {
                                    return null;
                                }
                            })()
                        : null;
                if (!cancelled) {
                    setReceipt(body);
                }
            } catch (err) {
                if (!cancelled) {
                    setReceipt(null);
                    setReceiptError(getApiErrorMessage(err));
                }
            } finally {
                if (!cancelled) {
                    setReceiptLoading(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [backendVerify, status, parsed.txnRef, queryKey]);

    React.useEffect(() => {
        if (status === "failed" || status === "unknown") {
            if (failToastShownRef.current) return;
            failToastShownRef.current = true;
            const code = parsed.responseCode;
            const extra = code ? ` (mã: ${code})` : "";
            enqueueSnackbar(`Giao dịch không thành công${extra}`, {variant: "error"});
        }
    }, [status, parsed.responseCode]);

    const handleCopyTxn = async () => {
        if (!summaryTxnId) return;
        try {
            await navigator.clipboard.writeText(summaryTxnId);
            enqueueSnackbar("Đã sao chép mã giao dịch", {variant: "success"});
        } catch {
            enqueueSnackbar("Không thể sao chép", {variant: "error"});
        }
    };

    const handleRetry = () => {
        navigate("/home#goi-dich-vu", {replace: false});
    };

    const handleDownloadReceiptPdf = async () => {
        const txnRef = String(parsed.txnRef || "").trim();
        if (!txnRef) {
            enqueueSnackbar("Không có mã tham chiếu giao dịch (vnp_TxnRef).", {variant: "warning"});
            return;
        }
        setExportLoading(true);
        try {
            const res = await exportSchoolSubscriptionReceiptPdf(txnRef);
            const blob = new Blob([res.data], {
                type: res.headers?.["content-type"] || "application/pdf",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const fromHeader = parseFilenameFromContentDisposition(res.headers?.["content-disposition"]);
            a.download = fromHeader || `hoa-don-${txnRef}.pdf`;
            a.rel = "noopener";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            enqueueSnackbar("Đã tải hóa đơn.", {variant: "success"});
        } catch (err) {
            enqueueSnackbar(getApiErrorMessage(err) || "Không thể tải hóa đơn.", {variant: "error"});
        } finally {
            setExportLoading(false);
        }
    };

    const renderIcon = () => {
        const iconSx = {
            fontSize: {xs: 72, sm: 88},
            display: "block",
            mx: "auto",
        };
        if (status === "success") {
            return (
                <Box
                    sx={{
                        "@keyframes vnpSuccessPop": {
                            "0%": {transform: "scale(0.2)", opacity: 0},
                            "55%": {transform: "scale(1.08)", opacity: 1},
                            "100%": {transform: "scale(1)", opacity: 1},
                        },
                        "@keyframes vnpSuccessRing": {
                            "0%": {boxShadow: `0 0 0 0 ${SUCCESS}66`},
                            "70%": {boxShadow: `0 0 0 14px ${SUCCESS}00`},
                            "100%": {boxShadow: `0 0 0 0 ${SUCCESS}00`},
                        },
                        width: {xs: 96, sm: 112},
                        height: {xs: 96, sm: 112},
                        borderRadius: "50%",
                        mx: "auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        animation: "vnpSuccessRing 1.4s ease-out 0.35s 1",
                    }}
                >
                    <CheckCircleRoundedIcon
                        sx={{
                            ...iconSx,
                            color: SUCCESS,
                            animation: "vnpSuccessPop 0.65s cubic-bezier(0.34, 1.45, 0.64, 1) forwards",
                        }}
                    />
                </Box>
            );
        }
        if (status === "failed") {
            return <CancelRoundedIcon sx={{...iconSx, color: ERROR}}/>;
        }
        if (status === "pending") {
            return (
                <Box
                    sx={{
                        width: {xs: 96, sm: 112},
                        height: {xs: 96, sm: 112},
                        borderRadius: "50%",
                        mx: "auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "rgba(245, 158, 11, 0.12)",
                    }}
                >
                    <CircularProgress size={52} thickness={4} sx={{color: PENDING}}/>
                </Box>
            );
        }
        if (status === "unknown") {
            return <HelpOutlineRoundedIcon sx={{...iconSx, color: UNKNOWN}}/>;
        }
        return <HelpOutlineRoundedIcon sx={{...iconSx, color: "#cbd5e1"}}/>;
    };

    const title =
        status === "success"
            ? "Thanh toán thành công"
            : status === "failed"
                ? "Thanh toán thất bại"
                : status === "pending"
                    ? "Đang xử lý thanh toán"
                    : status === "unknown"
                        ? "Không xác định trạng thái"
                        : "Không tìm thấy thông tin giao dịch";

    const subtitle =
        status === "success"
            ? "Giao dịch đã được xử lý thành công. Biên lai điện tử bên dưới có thể dùng để đối soát."
            : status === "failed"
                ? "Đã xảy ra lỗi trong quá trình thanh toán. Bạn có thể thử lại hoặc chọn phương thức khác."
                : status === "pending"
                    ? "Ngân hàng đang xác nhận giao dịch. Vui lòng chờ trong giây lát."
                    : status === "unknown"
                        ? "Không nhận được mã phản hồi đầy đủ từ cổng thanh toán."
                        : "Liên kết không hợp lệ hoặc thiếu dữ liệu từ VNPAY. Hãy quay lại trang gói dịch vụ.";

    const glassCardSx = {
        borderRadius: {xs: "18px", sm: "22px"},
        border: `1px solid ${alpha("#fff", 0.65)}`,
        background: alpha("#fff", 0.55),
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow: "0 8px 32px rgba(15, 23, 42, 0.07), 0 2px 8px rgba(15, 23, 42, 0.04)",
    };

    const DetailRow = ({label, value}) => (
        <>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0,1fr) minmax(0,1.1fr)",
                    gap: 1.5,
                    alignItems: "start",
                    py: 1.2,
                }}
            >
                <Typography sx={{fontFamily: FONT_UI, fontSize: "0.8125rem", color: "#64748b", fontWeight: 600}}>
                    {label}
                </Typography>
                <Typography
                    sx={{
                        fontFamily: FONT_UI,
                        fontSize: "0.875rem",
                        color: "#0f172a",
                        fontWeight: 600,
                        textAlign: "right",
                        wordBreak: "break-word",
                    }}
                >
                    {value || "—"}
                </Typography>
            </Box>
            <Divider sx={{borderColor: alpha("#e2e8f0", 0.95)}}/>
        </>
    );

    const showPdf = status === "success" && Boolean(parsed.txnRef);
    const primaryIsSchool = redirectTarget.startsWith("/school");
    const showRetryInFooter = status === "failed" || status === "unknown" || status === "empty";
    /** Nút chính + PDF nằm trong card Hóa đơn; footer chỉ còn khi cần nút ngoài card (vd. thử lại) */
    const showStickyFooter = !showPdf || showRetryInFooter;

    const primaryButtonSx = {
        borderRadius: "14px",
        textTransform: "none",
        fontWeight: 800,
        py: 1.35,
        fontSize: "0.95rem",
        color: "#fff",
        fontFamily: FONT_UI,
        boxShadow: "0 8px 24px rgba(13, 100, 222, 0.28)",
        ...(primaryIsSchool
            ? {
                  background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                  "&:hover": {
                      background: "linear-gradient(135deg, #6b9be6 0%, #0b5ad1 100%)",
                      boxShadow: "0 10px 28px rgba(13, 100, 222, 0.35)",
                  },
              }
            : {
                  bgcolor: "#0f172a",
                  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.2)",
                  "&:hover": {bgcolor: "#1e293b"},
              }),
    };

    const pdfButtonSx = {
        borderRadius: "14px",
        textTransform: "none",
        fontWeight: 700,
        py: 1.2,
        fontFamily: FONT_UI,
        borderColor: alpha("#0D64DE", 0.35),
        color: "#0D64DE",
        bgcolor: alpha("#fff", 0.7),
        "&:hover": {
            borderColor: "#0D64DE",
            bgcolor: alpha("#0D64DE", 0.06),
        },
    };

    return (
        <Box
            sx={{
                boxSizing: "border-box",
                minHeight: "100vh",
                pt: `${LAYOUT_HEADER_OFFSET_PX}px`,
                pb: showStickyFooter ? {xs: 10, sm: 11} : {xs: 4, sm: 5},
                px: {xs: 2, sm: 3},
                background: "linear-gradient(165deg, #f8fafc 0%, #e8f0fe 38%, #dbeafe 72%, #f1f5f9 100%)",
                fontFamily: FONT_UI,
            }}
        >
            {parsed.hasVnpParams && backendVerify === "loading" ? (
                <LinearProgress
                    sx={{
                        position: "fixed",
                        top: LAYOUT_HEADER_OFFSET_PX,
                        left: 0,
                        right: 0,
                        zIndex: 10,
                        height: 3,
                        "& .MuiLinearProgress-bar": {transition: "transform 0.35s ease"},
                    }}
                />
            ) : null}

            <Container
                disableGutters
                maxWidth={false}
                sx={{
                    ...VNPAY_RECEIPT_MAX_WIDTH_SX,
                    mx: "auto",
                    position: "relative",
                    "@keyframes vnpFadeUp": {
                        from: {opacity: 0, transform: "translateY(12px)"},
                        to: {opacity: 1, transform: "translateY(0)"},
                    },
                    animation: "vnpFadeUp 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) forwards",
                }}
            >
                <Stack spacing={2.25}>
                    <Stack spacing={2} alignItems="center" sx={{textAlign: "center", pt: {xs: 0.5, sm: 1}}}>
                        {renderIcon()}
                        <Box>
                            <Typography
                                sx={{
                                    fontWeight: 800,
                                    fontSize: {xs: "1.4rem", sm: "1.55rem"},
                                    color: "#0f172a",
                                    letterSpacing: "-0.03em",
                                    lineHeight: 1.2,
                                    fontFamily: FONT_UI,
                                }}
                            >
                                {title}
                            </Typography>
                            <Typography
                                sx={{
                                    color: "#64748b",
                                    fontSize: {xs: "0.9rem", sm: "0.9375rem"},
                                    lineHeight: 1.6,
                                    maxWidth: {xs: "100%", sm: 560, md: 640},
                                    mx: "auto",
                                    mt: 1,
                                    fontFamily: FONT_UI,
                                }}
                            >
                                {subtitle}
                            </Typography>
                            {parsed.hasVnpParams && backendVerify === "loading" ? (
                                <Typography
                                    sx={{
                                        color: "#0D64DE",
                                        fontSize: "0.85rem",
                                        fontWeight: 600,
                                        mt: 1.25,
                                        fontFamily: FONT_UI,
                                    }}
                                >
                                    Đang xác nhận giao dịch với hệ thống…
                                </Typography>
                            ) : null}
                        </Box>
                    </Stack>

                    {status === "failed" && parsed.responseCode ? (
                        <Alert severity="error" sx={{borderRadius: "16px", ...glassCardSx}}>
                            Mã phản hồi VNPAY: <strong>{parsed.responseCode}</strong>
                            {parsed.bankCode ? (
                                <>
                                    {" "}
                                    · Ngân hàng: <strong>{parsed.bankCode}</strong>
                                </>
                            ) : null}
                        </Alert>
                    ) : null}

                    {status === "empty" ? (
                        <Card elevation={0} sx={{...glassCardSx}}>
                            <CardContent sx={{p: {xs: 2.5, sm: 3}, textAlign: "center"}}>
                                <Typography sx={{fontFamily: FONT_UI, color: "#64748b", fontSize: "0.95rem", lineHeight: 1.65}}>
                                    Không có tham số giao dịch VNPAY trên đường dẫn. Nếu bạn vừa thanh toán, hãy mở lại
                                    liên kết từ ngân hàng hoặc kiểm tra lịch sử gói đã mua.
                                </Typography>
                            </CardContent>
                        </Card>
                    ) : null}

                    {status !== "empty" ? (
                        <Card elevation={0} sx={{...glassCardSx}}>
                            <CardContent sx={{p: {xs: 2, sm: 2.5}}}>
                                <Stack direction="row" alignItems="center" spacing={1} sx={{mb: 2}}>
                                    <SummarizeRoundedIcon sx={{color: "#0D64DE", fontSize: 26}}/>
                                    <Typography
                                        sx={{
                                            fontFamily: FONT_UI,
                                            fontWeight: 800,
                                            fontSize: "1.05rem",
                                            color: "#0f172a",
                                            letterSpacing: "-0.02em",
                                        }}
                                    >
                                        Tóm tắt giao dịch
                                    </Typography>
                                </Stack>
                                <Divider sx={{borderColor: alpha("#e2e8f0", 0.95), mb: 1}}/>
                                <SummaryGridRow label="Mã giao dịch" rawRight>
                                    <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.25} sx={{width: "100%"}}>
                                        <Typography
                                            sx={{
                                                fontFamily: FONT_UI,
                                                fontSize: "0.875rem",
                                                fontWeight: 700,
                                                color: "#0f172a",
                                                wordBreak: "break-all",
                                                textAlign: "right",
                                            }}
                                        >
                                            {summaryTxnId || "—"}
                                        </Typography>
                                        {summaryTxnId ? (
                                            <Tooltip title="Sao chép">
                                                <IconButton
                                                    size="small"
                                                    onClick={handleCopyTxn}
                                                    aria-label="Sao chép mã giao dịch"
                                                    sx={{color: "#94a3b8"}}
                                                >
                                                    <ContentCopyRoundedIcon sx={{fontSize: 18}}/>
                                                </IconButton>
                                            </Tooltip>
                                        ) : null}
                                    </Stack>
                                </SummaryGridRow>
                                <Divider sx={{borderColor: alpha("#e2e8f0", 0.95)}}/>
                                <SummaryGridRow label="Số tiền" highlight>
                                    {amountDisplay || "—"}
                                </SummaryGridRow>
                                <Divider sx={{borderColor: alpha("#e2e8f0", 0.95)}}/>
                                <SummaryGridRow label="Phương thức">VNPAY</SummaryGridRow>
                                <Divider sx={{borderColor: alpha("#e2e8f0", 0.95)}}/>
                                <SummaryGridRow label="Thời gian">{payDateDisplay || "—"}</SummaryGridRow>
                                <Divider sx={{borderColor: alpha("#e2e8f0", 0.95)}}/>
                                <SummaryGridRow label="Trạng thái" rawRight>
                                    <Box sx={{display: "flex", justifyContent: "flex-end", width: "100%"}}>
                                        <StatusPill status={status}/>
                                    </Box>
                                </SummaryGridRow>
                                {parsed.orderInfo ? (
                                    <>
                                        <Divider sx={{borderColor: alpha("#e2e8f0", 0.95)}}/>
                                        <SummaryGridRow label="Nội dung">{parsed.orderInfo}</SummaryGridRow>
                                    </>
                                ) : null}
                            </CardContent>
                        </Card>
                    ) : null}

                    {status === "success" && parsed.txnRef ? (
                        <Card elevation={0} sx={{...glassCardSx, border: `1px solid ${alpha("#0D64DE", 0.12)}`}}>
                            <CardContent sx={{p: {xs: 2, sm: 2.5}}}>
                                <Stack direction="row" alignItems="center" spacing={1} sx={{mb: 2}}>
                                    <ReceiptLongRoundedIcon sx={{color: "#0D64DE", fontSize: 26}}/>
                                    <Box>
                                        <Typography
                                            sx={{
                                                fontFamily: FONT_UI,
                                                fontWeight: 800,
                                                fontSize: "1.05rem",
                                                color: "#0f172a",
                                                letterSpacing: "-0.02em",
                                            }}
                                        >
                                            Hóa đơn
                                        </Typography>
                                    </Box>
                                </Stack>
                                <Divider sx={{borderColor: alpha("#0D64DE", 0.12), mb: 1}}/>
                                {backendVerify === "loading" || backendVerify === "na" ? (
                                    <Typography
                                        sx={{
                                            color: "#64748b",
                                            fontSize: "0.875rem",
                                            lineHeight: 1.6,
                                            textAlign: "left",
                                            py: 1,
                                            fontFamily: FONT_UI,
                                        }}
                                    >
                                        Đang xác nhận giao dịch với hệ thống… Sau đó tự động tải thông tin hóa đơn (mã
                                        tham chiếu: <strong>{parsed.txnRef}</strong>).
                                    </Typography>
                                ) : receiptLoading ? (
                                    <ReceiptSkeletonBlock/>
                                ) : receipt ? (
                                    <>
                                        <SectionHeading dense icon={ReceiptLongRoundedIcon} title="Thông tin giao dịch"/>
                                        <DetailRow label="Mã tham chiếu (txnRef)" value={receipt?.transaction?.txnRef}/>
                                        <DetailRow label="Ngân hàng" value={receipt?.transaction?.bankCode}/>
                                        <DetailRow label="Loại thẻ" value={receipt?.transaction?.cardType}/>
                                        <DetailRow label="Mã VNPAY" value={receipt?.transaction?.vnpTransactionNo}/>
                                        <DetailRow label="Thời gian thanh toán" value={receipt?.transaction?.payDate}/>
                                        <DetailRow label="Trạng thái" value={receipt?.transaction?.status}/>

                                        {receipt?.school?.schoolName ? (
                                            <>
                                                <SectionHeading icon={BusinessRoundedIcon} title="Nhà trường"/>
                                                <DetailRow label="Tên trường" value={receipt.school.schoolName}/>
                                            </>
                                        ) : null}

                                        {receipt?.package &&
                                        (receipt.package.packageName || receipt.package.licenseKey) ? (
                                            <>
                                                <SectionHeading icon={Inventory2RoundedIcon} title="Gói dịch vụ"/>
                                                <DetailRow label="Tên gói" value={receipt.package.packageName}/>
                                                <DetailRow
                                                    label="Loại gói"
                                                    value={getPackageTypeLabelVi(receipt.package.packageType)}
                                                />
                                                <DetailRow
                                                    label="Thời hạn"
                                                    value={
                                                        receipt.package.durationDays != null
                                                            ? `${receipt.package.durationDays} ngày`
                                                            : "—"
                                                    }
                                                />
                                                <DetailRow label="License key" value={receipt.package.licenseKey}/>
                                                <DetailRow label="Bắt đầu" value={formatIsoDateVi(receipt.package.startDate)}/>
                                                <DetailRow label="Hết hạn" value={formatIsoDateVi(receipt.package.endDate)}/>
                                            </>
                                        ) : null}

                                        {receipt?.financial ? (
                                            <>
                                                <SectionHeading icon={PaymentsRoundedIcon} title="Chi tiết thanh toán"/>
                                                <DetailRow label="Giá gói" value={formatVndFromNumber(receipt.financial.basePrice)}/>
                                                <DetailRow label="Phí dịch vụ" value={formatVndFromNumber(receipt.financial.serviceFee)}/>
                                                <DetailRow label="VAT" value={formatVndFromNumber(receipt.financial.taxFee)}/>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                        gap: 2,
                                                        py: 2,
                                                        mt: 0.5,
                                                        px: 1.5,
                                                        borderRadius: "14px",
                                                        bgcolor: alpha("#0D64DE", 0.06),
                                                        border: `1px solid ${alpha("#0D64DE", 0.12)}`,
                                                    }}
                                                >
                                                    <Typography sx={{fontFamily: FONT_UI, fontWeight: 800, color: "#0f172a", fontSize: "0.9rem"}}>
                                                        Tổng thanh toán
                                                    </Typography>
                                                    <Typography
                                                        sx={{
                                                            fontFamily: FONT_UI,
                                                            fontWeight: 800,
                                                            fontSize: {xs: "1.2rem", sm: "1.35rem"},
                                                            color: "#0D64DE",
                                                            letterSpacing: "-0.02em",
                                                        }}
                                                    >
                                                        {formatVndFromNumber(receipt.financial.totalPaid)}
                                                    </Typography>
                                                </Box>
                                            </>
                                        ) : null}
                                    </>
                                ) : receiptError ? (
                                    <Alert severity="warning" sx={{borderRadius: "14px", textAlign: "left"}}>
                                        {receiptError}
                                    </Alert>
                                ) : !receiptLoading && (backendVerify === "success" || backendVerify === "error") ? (
                                    <Typography sx={{color: "#64748b", fontSize: "0.875rem", py: 1, textAlign: "left", fontFamily: FONT_UI}}>
                                        Chưa nhận được nội dung hóa đơn từ máy chủ. Bạn vẫn có thể thử tải file PDF bằng
                                        nút trong khung này.
                                    </Typography>
                                ) : null}
                                {showPdf ? (
                                    <Stack
                                        spacing={1.15}
                                        sx={{
                                            mt: 2.5,
                                            pt: 2.5,
                                            borderTop: `1px solid ${alpha("#0D64DE", 0.12)}`,
                                        }}
                                    >
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            onClick={() => navigate(redirectTarget, {replace: true})}
                                            sx={primaryButtonSx}
                                        >
                                            {primaryIsSchool ? "Về trang quản trị" : "Quay về trang chủ"}
                                        </Button>
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            disabled={exportLoading}
                                            startIcon={
                                                exportLoading ? (
                                                    <CircularProgress size={18} sx={{color: "#0D64DE"}}/>
                                                ) : (
                                                    <DownloadRoundedIcon/>
                                                )
                                            }
                                            onClick={handleDownloadReceiptPdf}
                                            sx={pdfButtonSx}
                                        >
                                            Tải hóa đơn PDF
                                        </Button>
                                    </Stack>
                                ) : null}
                            </CardContent>
                        </Card>
                    ) : null}
                </Stack>
            </Container>

            {showStickyFooter ? (
                <Box
                    sx={{
                        position: "fixed",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 9,
                        px: {xs: 2, sm: 3},
                        pb: "max(12px, env(safe-area-inset-bottom))",
                        pt: 1.5,
                        background:
                            "linear-gradient(180deg, rgba(248,250,252,0) 0%, rgba(248,250,252,0.92) 28%, #f8fafc 100%)",
                        backdropFilter: "blur(8px)",
                    }}
                >
                    <Box sx={{...VNPAY_RECEIPT_MAX_WIDTH_SX, mx: "auto"}}>
                        <Stack spacing={1.15}>
                            {!showPdf ? (
                                <Button
                                    fullWidth
                                    variant="contained"
                                    onClick={() => navigate(redirectTarget, {replace: true})}
                                    sx={primaryButtonSx}
                                >
                                    {primaryIsSchool ? "Về trang quản trị" : "Quay về trang chủ"}
                                </Button>
                            ) : null}
                            {showRetryInFooter ? (
                                <Button
                                    fullWidth
                                    variant="text"
                                    onClick={handleRetry}
                                    sx={{
                                        borderRadius: "14px",
                                        textTransform: "none",
                                        fontWeight: 700,
                                        py: 1,
                                        fontFamily: FONT_UI,
                                        color: "#64748b",
                                        "&:hover": {bgcolor: alpha("#64748b", 0.08)},
                                    }}
                                >
                                    Thử lại thanh toán
                                </Button>
                            ) : null}
                        </Stack>
                    </Box>
                </Box>
            ) : null}
        </Box>
    );
}
