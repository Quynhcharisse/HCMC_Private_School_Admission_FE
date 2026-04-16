import React, { useEffect, useMemo, useState } from "react";
import { Avatar, Box, Button, Chip, Paper, Stack, TextField, Typography } from "@mui/material";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { enqueueSnackbar } from "notistack";
import { sendCampusQuotaRequestEmail } from "../../../services/emailService.jsx";
import { getCampusQuotaRequestSummaryForEmailJs } from "../../../services/CampusService.jsx";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage.js";

/**
 * @param {object} props
 * @param {boolean} props.disabled
 * @param {number} [props.quotaUsage] — nếu truyền cùng `quotaMax`, không gọi API xem trước (vd. trang Tư vấn viên).
 * @param {number} [props.quotaMax]
 */
export default function BranchQuotaRequestToPrimaryCard({ disabled, quotaUsage, quotaMax }) {
    const [requestedAmount, setRequestedAmount] = useState("10");
    const [userNote, setUserNote] = useState("");
    const [sending, setSending] = useState(false);

    const externalQuota = typeof quotaUsage === "number" && typeof quotaMax === "number";

    const [fetchedUsage, setFetchedUsage] = useState(null);
    const [fetchedMax, setFetchedMax] = useState(null);
    const [fetchingMeta, setFetchingMeta] = useState(() => !externalQuota);

    useEffect(() => {
        if (externalQuota) return undefined;
        let cancelled = false;
        (async () => {
            setFetchingMeta(true);
            try {
                const body = await getCampusQuotaRequestSummaryForEmailJs();
                if (cancelled) return;
                setFetchedUsage(Number(body?.currentUsage));
                setFetchedMax(Number(body?.maxQuota));
            } catch {
                if (!cancelled) {
                    setFetchedUsage(NaN);
                    setFetchedMax(NaN);
                }
            } finally {
                if (!cancelled) setFetchingMeta(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [externalQuota]);

    const usage = useMemo(() => {
        if (externalQuota) return Number(quotaUsage);
        if (fetchedUsage == null) return NaN;
        return Number(fetchedUsage);
    }, [externalQuota, quotaUsage, fetchedUsage]);

    const max = useMemo(() => {
        if (externalQuota) return Number(quotaMax);
        if (fetchedMax == null) return NaN;
        return Number(fetchedMax);
    }, [externalQuota, quotaMax, fetchedMax]);

    const atQuotaLimit =
        !fetchingMeta &&
        Number.isFinite(usage) &&
        Number.isFinite(max) &&
        max > 0 &&
        usage === max;

    const handleSend = async () => {
        const n = parseInt(String(requestedAmount).trim(), 10);
        if (!Number.isFinite(n) || n < 1) {
            enqueueSnackbar("Vui lòng nhập số lượng yêu cầu là số nguyên dương.", { variant: "warning" });
            return;
        }
        setSending(true);
        try {
            await sendCampusQuotaRequestEmail({ requestedAmount: n, userNote });
            enqueueSnackbar("Đã gửi yêu cầu tới email trụ sở chính.", { variant: "success" });
        } catch (e) {
            enqueueSnackbar(getApiErrorMessage(e), { variant: "error" });
        } finally {
            setSending(false);
        }
    };

    if (!atQuotaLimit) return null;

    return (
        <Paper
            elevation={0}
            sx={{
                mb: 2,
                width: "100%",
                boxSizing: "border-box",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                boxShadow: "0 4px 24px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.06)",
            }}
        >
            <Box
                sx={{
                    bgcolor: "#fff",
                    px: { xs: 2, sm: 2.75 },
                    py: 2.25,
                    borderBottom: "1px solid rgba(226, 232, 240, 0.95)",
                }}
            >
                <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
                    <Avatar
                        sx={{
                            width: 48,
                            height: 48,
                            bgcolor: "rgba(13, 100, 222, 0.08)",
                            color: "#0D64DE",
                            border: "1px solid rgba(13, 100, 222, 0.2)",
                        }}
                    >
                        <EmailOutlinedIcon sx={{ fontSize: 26 }} />
                    </Avatar>
                    <Box sx={{ flex: "1 1 200px", minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.02em", lineHeight: 1.25, color: "#0f172a" }}>
                            Yêu cầu thêm nguồn lực từ trụ sở
                        </Typography>
                        <Typography sx={{ mt: 0.35, fontSize: "0.8125rem", lineHeight: 1.45, color: "#334155" }}>
                            Chi nhánh đã dùng hết hạn ngạch được phân bổ — gửi email để trụ sở chính xem xét.
                        </Typography>
                    </Box>
                    <Chip
                        label={`${usage} / ${max}`}
                        size="small"
                        sx={{
                            fontWeight: 800,
                            letterSpacing: "0.02em",
                            bgcolor: "#f1f5f9",
                            color: "#0f172a",
                            border: "1px solid #e2e8f0",
                            height: 30,
                        }}
                    />
                </Stack>
            </Box>

            <Box sx={{ px: { xs: 2, sm: 2.75 }, py: 2.5, bgcolor: "#f8fafc" }}>
                <Typography sx={{ fontSize: "0.875rem", color: "#475569", lineHeight: 1.65, mb: 2.25 }}>
                    Nhập số lượng nguồn lực mong muốn và ghi chú (nếu có). Nội dung email gồm thông tin trường, cơ sở và hạn ngạch hiện tại theo dữ liệu hệ thống.
                </Typography>

                <Stack spacing={2}>
                    <TextField
                        label="Số lượng đề xuất"
                        type="number"
                        size="small"
                        fullWidth
                        inputProps={{ min: 1, step: 1 }}
                        value={requestedAmount}
                        onChange={(e) => setRequestedAmount(e.target.value)}
                        disabled={disabled || sending}
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                bgcolor: "#fff",
                                borderRadius: "10px",
                            },
                        }}
                    />
                    <TextField
                        label="Ghi chú (tùy chọn)"
                        size="small"
                        fullWidth
                        multiline
                        minRows={2}
                        placeholder="Ví dụ: Cần thêm tư vấn viên cho mùa tuyển sinh"
                        value={userNote}
                        onChange={(e) => setUserNote(e.target.value)}
                        disabled={disabled || sending}
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                bgcolor: "#fff",
                                borderRadius: "10px",
                            },
                        }}
                    />
                </Stack>

                <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={handleSend}
                    disabled={disabled || sending}
                    startIcon={<SendRoundedIcon />}
                    sx={{
                        mt: 2.5,
                        textTransform: "none",
                        fontWeight: 700,
                        borderRadius: "12px",
                        py: 1.35,
                        bgcolor: "#0D64DE",
                        boxShadow: "0 4px 14px rgba(13, 100, 222, 0.35)",
                        "&:hover": { bgcolor: "#0b5ad1", boxShadow: "0 6px 20px rgba(13, 100, 222, 0.4)" },
                    }}
                >
                    {sending ? "Đang gửi…" : "Gửi yêu cầu qua email"}
                </Button>
            </Box>
        </Paper>
    );
}
