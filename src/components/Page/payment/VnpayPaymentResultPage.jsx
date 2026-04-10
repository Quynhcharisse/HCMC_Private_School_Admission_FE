/**
 * Trang kết quả thanh toán VNPAY (đọc query trên URL của SPA).
 *
 * VNPAY luôn redirect tới đúng `vnp_ReturnUrl` lúc tạo link thanh toán (thường là API backend,
 * ví dụ http://localhost:8080/api/v1/school/vnpay/callback/url?...). Trang này KHÔNG tự chạy
 * nếu URL vẫn là cổng backend — cần backend sau khi xử lý/verify giao dịch trả HTTP 302
 * chuyển trình duyệt sang: {ORIGIN_SPA}/payment/vnpay-result + giữ nguyên query string (?vnp_...).
 * Dev: ORIGIN_SPA thường là http://localhost:5173 (Vite), không phải :8080.
 */
import React from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Container,
    Divider,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import {useNavigate, useSearchParams} from "react-router-dom";
import {enqueueSnackbar} from "notistack";
import {getRoleDashboardRoute} from "../../../utils/roleRouting";

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
    return {
        vnp,
        responseCode: get("vnp_ResponseCode"),
        transactionNo: get("vnp_TransactionNo"),
        txnRef: get("vnp_TxnRef"),
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

function getHomePath() {
    try {
        const raw = localStorage.getItem("user");
        if (!raw) return "/home";
        const user = JSON.parse(raw);
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

    const transactionId = parsed.transactionNo || parsed.txnRef || "";
    const amountDisplay = formatVnpAmount(parsed.amountRaw);
    const payDateDisplay = formatVnpPayDate(parsed.payDateRaw);

    /** -1 = chưa bắt đầu đếm; 0 = hết giờ (cho phép auto redirect); empty state dùng 0 và không redirect */
    const [countdown, setCountdown] = React.useState(-1);
    const failToastShownRef = React.useRef(false);

    const redirectTarget = getHomePath();

    React.useEffect(() => {
        if (status === "empty") {
            setCountdown(0);
            return undefined;
        }
        const start = status === "success" ? 8 : status === "pending" ? 12 : 10;
        setCountdown(start);
        let remaining = start;
        const id = window.setInterval(() => {
            remaining -= 1;
            setCountdown(Math.max(0, remaining));
            if (remaining <= 0) {
                window.clearInterval(id);
            }
        }, 1000);
        return () => window.clearInterval(id);
    }, [status]);

    React.useEffect(() => {
        if (status === "failed" || status === "unknown") {
            if (failToastShownRef.current) return;
            failToastShownRef.current = true;
            const code = parsed.responseCode;
            const extra = code ? ` (mã: ${code})` : "";
            enqueueSnackbar(`Giao dịch không thành công${extra}`, {variant: "error"});
        }
    }, [status, parsed.responseCode]);

    React.useEffect(() => {
        if (status === "empty" || countdown < 0 || countdown > 0) return undefined;
        const tid = window.setTimeout(() => {
            navigate(redirectTarget, {replace: true});
        }, 0);
        return () => window.clearTimeout(tid);
    }, [countdown, status, navigate, redirectTarget]);

    const handleCopyTxn = async () => {
        if (!transactionId) return;
        try {
            await navigator.clipboard.writeText(transactionId);
            enqueueSnackbar("Đã sao chép mã giao dịch", {variant: "success"});
        } catch {
            enqueueSnackbar("Không thể sao chép", {variant: "error"});
        }
    };

    const handleRetry = () => {
        navigate("/home#goi-dich-vu", {replace: false});
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
            ? "Giao dịch của bạn đã được xử lý thành công"
            : status === "failed"
                ? "Đã xảy ra lỗi trong quá trình thanh toán"
                : status === "pending"
                    ? "Ngân hàng đang xác nhận giao dịch. Vui lòng chờ trong giây lát."
                    : status === "unknown"
                        ? "Không nhận được mã phản hồi đầy đủ từ cổng thanh toán."
                        : "Liên kết không hợp lệ hoặc thiếu dữ liệu từ VNPAY.";

    const Row = ({label, value, copyable = false}) => (
        <Box
            sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 2,
                py: 1.35,
            }}
        >
            <Typography
                component="span"
                sx={{
                    fontFamily: '"Inter", "Roboto", "Segoe UI", sans-serif',
                    fontSize: "0.9rem",
                    color: "#64748b",
                    fontWeight: 500,
                    flexShrink: 0,
                }}
            >
                {label}
            </Typography>
            <Box sx={{display: "flex", alignItems: "center", gap: 0.5, textAlign: "right", minWidth: 0}}>
                <Typography
                    component="span"
                    sx={{
                        fontFamily: '"Inter", "Roboto", "Segoe UI", sans-serif',
                        fontSize: "0.9rem",
                        color: "#0f172a",
                        fontWeight: 600,
                        wordBreak: "break-word",
                    }}
                >
                    {value || "—"}
                </Typography>
                {copyable && value ? (
                    <Tooltip title="Sao chép">
                        <IconButton size="small" onClick={handleCopyTxn} aria-label="Sao chép mã giao dịch" sx={{ml: 0.25}}>
                            <ContentCopyRoundedIcon sx={{fontSize: 18, color: "#94a3b8"}}/>
                        </IconButton>
                    </Tooltip>
                ) : null}
            </Box>
        </Box>
    );

    return (
        <Box
            sx={{
                minHeight: "calc(100vh - 120px)",
                py: {xs: 3, sm: 5},
                px: {xs: 2, sm: 3},
                background: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 45%, #e0f2fe 100%)",
                fontFamily: '"Inter", "Roboto", "Segoe UI", sans-serif',
            }}
        >
            <Container maxWidth="sm" sx={{display: "flex", justifyContent: "center"}}>
                <Card
                    elevation={0}
                    sx={{
                        width: "100%",
                        maxWidth: 440,
                        borderRadius: "20px",
                        boxShadow: "0 4px 24px rgba(15, 23, 42, 0.08), 0 12px 48px rgba(15, 23, 42, 0.06)",
                        border: "1px solid rgba(148, 163, 184, 0.18)",
                        overflow: "hidden",
                        "@keyframes vnpCardIn": {
                            from: {opacity: 0, transform: "scale(0.96) translateY(10px)"},
                            to: {opacity: 1, transform: "scale(1) translateY(0)"},
                        },
                        animation: "vnpCardIn 0.55s cubic-bezier(0.22, 0.61, 0.36, 1) forwards",
                    }}
                >
                    <CardContent sx={{p: {xs: 2.5, sm: 3.5}}}>
                        <Stack spacing={2.5} alignItems="center" sx={{textAlign: "center", mb: 1}}>
                            {renderIcon()}
                            <Box>
                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: {xs: "1.35rem", sm: "1.5rem"},
                                        color: "#0f172a",
                                        letterSpacing: "-0.02em",
                                        mb: 0.75,
                                    }}
                                >
                                    {title}
                                </Typography>
                                <Typography
                                    sx={{
                                        color: "#64748b",
                                        fontSize: {xs: "0.9rem", sm: "0.95rem"},
                                        lineHeight: 1.55,
                                        maxWidth: 360,
                                        mx: "auto",
                                    }}
                                >
                                    {subtitle}
                                </Typography>
                            </Box>
                        </Stack>

                        {status === "failed" && parsed.responseCode ? (
                            <Alert severity="error" sx={{mb: 2, borderRadius: 2, textAlign: "left"}}>
                                Mã phản hồi VNPAY: <strong>{parsed.responseCode}</strong>
                                {parsed.bankCode ? (
                                    <>
                                        {" "}
                                        · Ngân hàng: <strong>{parsed.bankCode}</strong>
                                    </>
                                ) : null}
                            </Alert>
                        ) : null}

                        {status !== "empty" ? (
                            <Box
                                sx={{
                                    mt: 1,
                                    mb: 2.5,
                                    borderRadius: 2,
                                    bgcolor: "rgba(248, 250, 252, 0.9)",
                                    border: "1px solid rgba(226, 232, 240, 0.95)",
                                    px: {xs: 1.5, sm: 2},
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        letterSpacing: "0.06em",
                                        color: "#94a3b8",
                                        textTransform: "uppercase",
                                        pt: 1.5,
                                        pb: 0.5,
                                    }}
                                >
                                    Thông tin giao dịch
                                </Typography>
                                <Divider sx={{borderColor: "rgba(226, 232, 240, 0.9)"}}/>
                                <Row label="Mã giao dịch" value={transactionId || null} copyable={Boolean(transactionId)}/>
                                <Divider sx={{borderColor: "rgba(226, 232, 240, 0.9)"}}/>
                                <Row label="Số tiền" value={amountDisplay}/>
                                <Divider sx={{borderColor: "rgba(226, 232, 240, 0.9)"}}/>
                                <Row label="Nội dung thanh toán" value={parsed.orderInfo || null}/>
                                <Divider sx={{borderColor: "rgba(226, 232, 240, 0.9)"}}/>
                                <Row label="Thời gian giao dịch" value={payDateDisplay}/>
                                <Divider sx={{borderColor: "rgba(226, 232, 240, 0.9)"}}/>
                                <Row label="Phương thức thanh toán" value="VNPAY"/>
                                <Divider sx={{borderColor: "rgba(226, 232, 240, 0.9)"}}/>
                                <Row label="Trạng thái" value={statusLabel(status)}/>
                            </Box>
                        ) : null}

                        <Stack spacing={1.25} sx={{mt: 1}}>
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={() => navigate(redirectTarget, {replace: true})}
                                sx={{
                                    borderRadius: 999,
                                    textTransform: "none",
                                    fontWeight: 700,
                                    py: 1.25,
                                    fontSize: "0.95rem",
                                    boxShadow: "none",
                                    bgcolor: "#0f172a",
                                    "&:hover": {bgcolor: "#1e293b", boxShadow: "0 4px 14px rgba(15,23,42,0.2)"},
                                }}
                            >
                                {redirectTarget.startsWith("/school") ? "Về trang quản trị" : "Quay về trang chủ"}
                            </Button>
                            {(status === "failed" || status === "unknown" || status === "empty") && (
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    onClick={handleRetry}
                                    sx={{
                                        borderRadius: 999,
                                        textTransform: "none",
                                        fontWeight: 600,
                                        py: 1.15,
                                        borderColor: "#cbd5e1",
                                        color: "#334155",
                                        "&:hover": {borderColor: "#94a3b8", bgcolor: "rgba(248,250,252,0.8)"},
                                    }}
                                >
                                    Thử lại thanh toán
                                </Button>
                            )}
                        </Stack>

                        {status !== "empty" && countdown > 0 && (
                            <Typography
                                sx={{
                                    mt: 2,
                                    textAlign: "center",
                                    fontSize: "0.8rem",
                                    color: "#94a3b8",
                                }}
                            >
                                Tự chuyển trang sau{" "}
                                <Box component="span" sx={{fontWeight: 700, color: "#64748b"}}>
                                    {countdown}s
                                </Box>
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            </Container>
        </Box>
    );
}
