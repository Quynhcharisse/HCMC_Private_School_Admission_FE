import React, {useEffect, useMemo, useState} from "react";
import {
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Modal,
    Paper,
    Stack,
    Tab,
    Tabs,
    Typography
} from "@mui/material";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import {enqueueSnackbar} from "notistack";
import {
    getParentAdmissionReservationForms,
    pickAdmissionReservationFormsFromResponse
} from "../../services/ParentService.jsx";
import {APP_PRIMARY_DARK, BRAND_NAVY} from "../../constants/homeLandingTheme";

const FILTERS = [
    {value: "ALL", label: "Tất cả"},
    {value: "PENDING", label: "Chờ duyệt", statuses: ["RESERVATION_PENDING", "PENDING"]},
    {value: "CONFIRMED", label: "Đã xác nhận", statuses: ["RESERVATION_CONFIRMED", "CONFIRMED", "APPROVED", "ACCEPTED"]},
    {value: "REJECTED", label: "Từ chối", statuses: ["RESERVATION_REJECTED", "REJECTED"]},
    {value: "CANCELLED", label: "Đã hủy", statuses: ["RESERVATION_CANCELLED", "CANCELLED"]}
];

const STATUS_META = {
    RESERVATION_PENDING: {
        label: "Chờ duyệt",
        color: "#c2410c",
        bg: "#ffedd5",
        border: "#fed7aa"
    },
    PENDING: {
        label: "Chờ duyệt",
        color: "#c2410c",
        bg: "#ffedd5",
        border: "#fed7aa"
    },
    RESERVATION_CONFIRMED: {
        label: "Đã xác nhận",
        color: "#047857",
        bg: "#d1fae5",
        border: "#a7f3d0"
    },
    CONFIRMED: {
        label: "Đã xác nhận",
        color: "#047857",
        bg: "#d1fae5",
        border: "#a7f3d0"
    },
    APPROVED: {
        label: "Đã xác nhận",
        color: "#047857",
        bg: "#d1fae5",
        border: "#a7f3d0"
    },
    REJECTED: {
        label: "Từ chối",
        color: "#b91c1c",
        bg: "#fee2e2",
        border: "#fecaca"
    },
    RESERVATION_REJECTED: {
        label: "Từ chối",
        color: "#b91c1c",
        bg: "#fee2e2",
        border: "#fecaca"
    },
    CANCELLED: {
        label: "Đã hủy",
        color: "#475569",
        bg: "#e2e8f0",
        border: "#cbd5e1"
    },
    RESERVATION_CANCELLED: {
        label: "Đã hủy",
        color: "#475569",
        bg: "#e2e8f0",
        border: "#cbd5e1"
    }
};

const DOCUMENT_LABELS = {
    HOC_BA: "Học bạ",
    GIAY_KSTN: "Giấy khai sinh",
    ANH_THE: "Ảnh thẻ",
    HB12: "Học bạ lớp 12",
    CCCD: "CCCD/CMND"
};

const hasText = (value) => value != null && String(value).trim() !== "";

const formatDateTime = (value) => {
    if (!hasText(value)) return "Chưa cập nhật";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).trim();
    return date.toLocaleString("vi-VN", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
};

const formatDateOnly = (value) => {
    if (!hasText(value)) return "Chưa cập nhật";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).trim();
    return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
};

const getGenderLabel = (gender) => {
    const key = String(gender || "").trim().toUpperCase();
    if (key === "MALE") return "Nam";
    if (key === "FEMALE") return "Nữ";
    return hasText(gender) ? String(gender).trim() : "Chưa cập nhật";
};

const getDocumentLabel = (key) => {
    const normalized = String(key || "").trim().toUpperCase();
    return DOCUMENT_LABELS[normalized] || normalized || "Minh chứng";
};

const getStatusMeta = (status) => {
    const key = String(status || "").trim().toUpperCase();
    return STATUS_META[key] || {
        label: hasText(status) ? String(status).replaceAll("_", " ") : "Chưa cập nhật",
        color: "#334155",
        bg: "#e2e8f0",
        border: "#cbd5e1"
    };
};

const getFilterCount = (rows, filter) => {
    if (filter.value === "ALL") return rows.length;
    const allowed = new Set(filter.statuses || []);
    return rows.filter((row) => allowed.has(String(row?.status || "").trim().toUpperCase())).length;
};

function InfoRow({label, value}) {
    return (
        <Stack
            spacing={0.45}
            sx={{
                height: "100%",
                bgcolor: "#fff",
                border: "1px solid #cfe5fb",
                borderRadius: 2,
                p: 1.5,
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.06)"
            }}
        >
            <Typography sx={{fontSize: 13, color: "#2563eb", fontWeight: 700}}>
                {label}
            </Typography>
            <Typography sx={{fontSize: 14.5, color: "#1e293b", fontWeight: 600}}>
                {hasText(value) ? value : "Chưa cập nhật"}
            </Typography>
        </Stack>
    );
}

function ReservationCard({reservation, onOpenDetail}) {
    const statusMeta = getStatusMeta(reservation?.status);

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 2.5,
                overflow: "hidden",
                border: "1px solid #e2e8f0",
                bgcolor: "#fff",
                boxShadow: "0 8px 22px rgba(15, 23, 42, 0.05)",
                transition: "border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease",
                "&:hover": {
                    borderColor: "#bfdbfe",
                    boxShadow: "0 12px 28px rgba(37, 99, 235, 0.1)",
                    transform: "translateY(-1px)"
                }
            }}
        >
            <Stack
                direction={{xs: "column", md: "row"}}
                alignItems={{xs: "stretch", md: "center"}}
                justifyContent="space-between"
                gap={2}
                sx={{
                    px: {xs: 2, md: 2.5},
                    py: 2.25
                }}
            >
                <Stack direction="row" alignItems="flex-start" gap={1.5} sx={{minWidth: 0, flex: 1}}>
                    <Avatar sx={{bgcolor: "#eff6ff", color: BRAND_NAVY, width: 44, height: 44, flex: "0 0 auto"}}>
                        <SchoolRoundedIcon fontSize="small" />
                    </Avatar>
                    <Box sx={{minWidth: 0}}>
                        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1} sx={{mb: 0.6}}>
                            <Typography sx={{fontSize: 17, fontWeight: 600, color: BRAND_NAVY, lineHeight: 1.3}}>
                                {reservation?.schoolName || "Trường đang cập nhật"}
                            </Typography>
                            <Chip
                                label={statusMeta.label}
                                size="small"
                                sx={{
                                    bgcolor: statusMeta.bg,
                                    color: statusMeta.color,
                                    border: `1px solid ${statusMeta.border}`,
                                    fontWeight: 500,
                                    borderRadius: 999
                                }}
                            />
                        </Stack>
                        <Typography sx={{fontSize: 14, color: "#475569", mb: 1}}>
                            {reservation?.programName || "Chương trình tuyển sinh đang cập nhật"}
                        </Typography>
                        <Stack spacing={0.75}>
                            <Stack direction="row" alignItems="center" spacing={0.75}>
                                <LocationOnRoundedIcon sx={{fontSize: 18, color: "#64748b"}} />
                                <Typography sx={{fontSize: 13.5, color: "#475569"}}>
                                    {reservation?.campusName || "Cơ sở chưa cập nhật"}
                                </Typography>
                            </Stack>
                            <Typography sx={{fontSize: 13.5, color: "#64748b"}}>
                                Ngày nộp: {formatDateOnly(reservation?.createdTime)}
                            </Typography>
                        </Stack>
                    </Box>
                </Stack>
                <Button
                    variant="outlined"
                    startIcon={<ArticleOutlinedIcon />}
                    onClick={() => onOpenDetail(reservation)}
                    sx={{
                        borderRadius: 999,
                        px: 2.4,
                        fontWeight: 500,
                        borderColor: "#bfdbfe",
                        color: BRAND_NAVY,
                        flex: {xs: "1 1 auto", sm: "0 0 auto"}
                    }}
                >
                    Xem chi tiết
                </Button>
            </Stack>
        </Paper>
    );
}

function DetailDialog({reservation, onClose}) {
    const documents = Array.isArray(reservation?.profileMetadata) ? reservation.profileMetadata : [];
    const open = Boolean(reservation);
    const statusMeta = getStatusMeta(reservation?.status);
    const [previewImage, setPreviewImage] = useState(null);

    useEffect(() => {
        if (!open) setPreviewImage(null);
    }, [open]);

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                fullWidth
                maxWidth="md"
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: "hidden",
                        bgcolor: "#e8f4fc"
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        px: 3,
                        py: 2.25,
                        bgcolor: "#d9ecff",
                        borderBottom: "1px solid #b8d8f4"
                    }}
                >
                    <Box>
                        <Typography sx={{fontSize: 20, fontWeight: 700, color: "#0f172a"}}>
                            Chi tiết đơn giữ chỗ
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose}>
                        <CloseRoundedIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{bgcolor: "#e8f4fc", borderColor: "#b8d8f4", p: 3}}>
                    <Stack spacing={2.5}>
                        <Paper elevation={0} sx={{p: 2, borderRadius: 3, border: "1px solid #c7e2f8", bgcolor: "#eef7ff"}}>
                            <Stack direction={{xs: "column", sm: "row"}} alignItems={{xs: "flex-start", sm: "center"}} justifyContent="space-between" gap={1.5} sx={{mb: 2}}>
                                <Typography sx={{fontWeight: 700, color: BRAND_NAVY}}>
                                    Thông tin trường
                                </Typography>
                                <Chip
                                    label={statusMeta.label}
                                    size="small"
                                    sx={{
                                        bgcolor: statusMeta.bg,
                                        color: statusMeta.color,
                                        border: `1px solid ${statusMeta.border}`,
                                        fontWeight: 600,
                                        borderRadius: 999
                                    }}
                                />
                            </Stack>
                            <Grid container spacing={2}>
                                <Grid size={{xs: 12, sm: 6}}>
                                    <InfoRow label="Trường" value={reservation?.schoolName} />
                                </Grid>
                                <Grid size={{xs: 12, sm: 6}}>
                                    <InfoRow label="Chương trình" value={reservation?.programName} />
                                </Grid>
                                <Grid size={{xs: 12, sm: 6}}>
                                    <InfoRow label="Cơ sở học" value={reservation?.campusName} />
                                </Grid>
                                <Grid size={{xs: 12, sm: 6}}>
                                <InfoRow label="Ngày nộp" value={formatDateOnly(reservation?.createdTime)} />
                                </Grid>
                                <Grid size={{xs: 12}}>
                                    <InfoRow label="Địa chỉ" value={reservation?.address} />
                                </Grid>
                            </Grid>
                        </Paper>

                        <Paper elevation={0} sx={{p: 2, borderRadius: 3, border: "1px solid #c7e2f8", bgcolor: "#eef7ff"}}>
                            <Typography sx={{fontWeight: 700, color: BRAND_NAVY, mb: 2}}>
                                Thông tin hồ sơ
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid size={{xs: 12, sm: 4}}>
                                    <InfoRow label="Học sinh" value={reservation?.studentName} />
                                </Grid>
                                <Grid size={{xs: 12, sm: 4}}>
                                    <InfoRow label="Giới tính" value={getGenderLabel(reservation?.gender)} />
                                </Grid>
                                <Grid size={{xs: 12, sm: 4}}>
                                    <InfoRow label="Phương thức xét tuyển" value={reservation?.methodName || reservation?.admissionMethodCode} />
                                </Grid>
                                <Grid size={{xs: 12, sm: 4}}>
                                    <InfoRow label="Phụ huynh" value={reservation?.parentName} />
                                </Grid>
                                <Grid size={{xs: 12, sm: 4}}>
                                    <InfoRow label="Email" value={reservation?.parentEmail} />
                                </Grid>
                                <Grid size={{xs: 12, sm: 4}}>
                                    <InfoRow label="Điện thoại" value={reservation?.parentPhone} />
                                </Grid>
                                {hasText(reservation?.rejectReason) && (
                                    <Grid size={{xs: 12}}>
                                        <InfoRow label="Lý do từ chối" value={reservation.rejectReason} />
                                    </Grid>
                                )}
                                {hasText(reservation?.cancelReason) && (
                                    <Grid size={{xs: 12}}>
                                        <InfoRow label="Lý do hủy" value={reservation.cancelReason} />
                                    </Grid>
                                )}
                            </Grid>
                        </Paper>

                        {documents.length === 0 ? (
                            <Paper elevation={0} sx={{p: 4, textAlign: "center", borderRadius: 3, border: "1px dashed #b8d8f4", bgcolor: "#eef7ff"}}>
                                <ArticleOutlinedIcon sx={{fontSize: 48, color: "#94a3b8", mb: 1}} />
                                <Typography sx={{fontWeight: 800, color: "#475569"}}>
                                    Chưa có ảnh minh chứng trong đơn này.
                                </Typography>
                            </Paper>
                        ) : (
                            documents.map((doc, docIndex) => {
                                const images = Array.isArray(doc?.imageUrl) ? doc.imageUrl : [];
                                return (
                                    <Paper
                                        key={`${doc?.key || "document"}-${docIndex}`}
                                        elevation={0}
                                        sx={{p: 2, borderRadius: 3, border: "1px solid #c7e2f8", bgcolor: "#eef7ff"}}
                                    >
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1.5} sx={{mb: 1.5}}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <ArticleOutlinedIcon sx={{color: BRAND_NAVY}} />
                                                <Typography sx={{fontWeight: 700, color: BRAND_NAVY}}>
                                                    {getDocumentLabel(doc?.key)}
                                                </Typography>
                                            </Stack>
                                            <Chip
                                                label={`${images.length} ảnh`}
                                                size="small"
                                                sx={{bgcolor: "#eff6ff", color: BRAND_NAVY, fontWeight: 800}}
                                            />
                                        </Stack>
                                        <Grid container spacing={1.5}>
                                            {images.map((imageUrl, imageIndex) => (
                                                <Grid key={`${imageUrl}-${imageIndex}`} size={{xs: 6, sm: 4, md: 3}}>
                                                    <Box
                                                        component="button"
                                                        type="button"
                                                        onClick={() => setPreviewImage({url: imageUrl, title: `${getDocumentLabel(doc?.key)} ${imageIndex + 1}`})}
                                                        sx={{
                                                            display: "block",
                                                            width: "100%",
                                                            height: 150,
                                                            p: 0,
                                                            borderRadius: 2.5,
                                                            overflow: "hidden",
                                                            border: "1px solid #dbeafe",
                                                            bgcolor: "#f1f5f9",
                                                            cursor: "zoom-in"
                                                        }}
                                                    >
                                                        <Box
                                                            component="img"
                                                            src={imageUrl}
                                                            alt={`${getDocumentLabel(doc?.key)} ${imageIndex + 1}`}
                                                            sx={{
                                                                width: "100%",
                                                                height: "100%",
                                                                objectFit: "cover",
                                                                display: "block"
                                                            }}
                                                        />
                                                    </Box>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Paper>
                                );
                            })
                        )}
                    </Stack>
                </DialogContent>
            </Dialog>

            <Modal
                open={Boolean(previewImage)}
                onClose={() => setPreviewImage(null)}
                slotProps={{
                    backdrop: {
                        sx: {
                            backdropFilter: "blur(8px)",
                            bgcolor: "rgba(15, 23, 42, 0.24)"
                        }
                    }
                }}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    p: {xs: 2, md: 4}
                }}
            >
                <Box
                    sx={{
                        outline: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    <Box
                        component="img"
                        src={previewImage?.url || ""}
                        alt={previewImage?.title || "Minh chứng"}
                        sx={{
                            maxWidth: "92vw",
                            maxHeight: "84vh",
                            objectFit: "contain",
                            display: "block",
                            bgcolor: "transparent",
                            visibility: previewImage?.url ? "visible" : "hidden"
                        }}
                    />
                </Box>
            </Modal>
        </>
    );
}

export default function ParentAdmissionReservationsPage() {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL");
    const [selectedReservation, setSelectedReservation] = useState(null);

    useEffect(() => {
        let mounted = true;

        async function loadReservations() {
            setLoading(true);
            try {
                const response = await getParentAdmissionReservationForms();
                const rows = pickAdmissionReservationFormsFromResponse(response);
                if (mounted) setReservations(rows);
            } catch (error) {
                console.error("[ParentAdmissionReservationsPage] load error:", error);
                if (mounted) setReservations([]);
                enqueueSnackbar("Không thể tải danh sách đơn đăng ký. Vui lòng thử lại sau.", {variant: "error"});
            } finally {
                if (mounted) setLoading(false);
            }
        }

        loadReservations();
        return () => {
            mounted = false;
        };
    }, []);

    const filteredReservations = useMemo(() => {
        if (filter === "ALL") return reservations;
        const currentFilter = FILTERS.find((item) => item.value === filter);
        const allowed = new Set(currentFilter?.statuses || []);
        return reservations.filter((row) => allowed.has(String(row?.status || "").trim().toUpperCase()));
    }, [filter, reservations]);

    return (
        <Box sx={{bgcolor: "#f5f8fc", minHeight: "100%", pt: {xs: 14, md: 13}, pb: {xs: 2.5, md: 3}}}>
            <Container maxWidth="lg">
                <Paper
                    elevation={0}
                    sx={{
                        mb: 2,
                        px: {xs: 2, md: 2.5},
                        py: {xs: 2.25, md: 2.6},
                        borderRadius: 2,
                        color: "#fff",
                        background: "linear-gradient(120deg, #2563eb 0%, #1d8ee8 58%, #10a6df 100%)",
                        boxShadow: "0 18px 42px rgba(37,99,235,0.2)"
                    }}
                >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                        <Box>
                            <Typography
                                variant="h5"
                                sx={{fontWeight: 600, letterSpacing: -0.2, lineHeight: 1.25}}
                            >
                                Quản lý đơn đăng ký
                            </Typography>
                            <Typography sx={{mt: 0.85, color: "rgba(255,255,255,0.86)", fontSize: 14, fontWeight: 400}}>
                                Xem lại các đơn tuyển sinh đã nộp theo từng trạng thái.
                            </Typography>
                        </Box>
                        <Avatar
                            sx={{
                                width: 42,
                                height: 42,
                                flex: "0 0 auto",
                                bgcolor: "rgba(255,255,255,0.18)",
                                color: "#fff",
                                border: "1px solid rgba(255,255,255,0.32)"
                            }}
                        >
                            <AssignmentTurnedInRoundedIcon fontSize="small" />
                        </Avatar>
                    </Stack>
                </Paper>

                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 2,
                        overflow: "hidden",
                        bgcolor: "#fff",
                        border: "1px solid #dbe3ee",
                        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)"
                    }}
                >
                    <Box sx={{borderBottom: "1px solid #e5eaf1", px: {xs: 0.5, md: 1.25}}}>
                        <Tabs
                            value={filter}
                            onChange={(_, value) => setFilter(value)}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                                minHeight: 48,
                                "& .MuiTabs-indicator": {
                                    height: 2,
                                    borderRadius: 999,
                                    bgcolor: APP_PRIMARY_DARK
                                },
                                "& .MuiTab-root": {
                                    minHeight: 48,
                                    px: {xs: 1.5, md: 2},
                                    textTransform: "none",
                                    fontWeight: 500,
                                    color: "#475569",
                                    fontSize: 13
                                },
                                "& .Mui-selected": {
                                    color: `${APP_PRIMARY_DARK} !important`
                                }
                            }}
                        >
                            {FILTERS.map((item) => (
                                <Tab
                                    key={item.value}
                                    value={item.value}
                                    label={`${item.label} (${getFilterCount(reservations, item)})`}
                                />
                            ))}
                        </Tabs>
                    </Box>

                    <Box sx={{px: {xs: 1.5, md: 2}, py: {xs: 2, md: 2.5}}}>
                        {loading ? (
                            <Box sx={{p: 5, textAlign: "center", borderRadius: 2, border: "1px dashed #d8dee8"}}>
                                <CircularProgress size={28} />
                                <Typography sx={{mt: 2, color: "#64748b", fontWeight: 400}}>
                                    Đang tải danh sách đơn đăng ký...
                                </Typography>
                            </Box>
                        ) : filteredReservations.length === 0 ? (
                            <Box sx={{p: 5, textAlign: "center", borderRadius: 2, border: "1px dashed #d8dee8"}}>
                                <AssignmentTurnedInRoundedIcon sx={{fontSize: 34, color: "#94a3b8", mb: 1.5}} />
                                <Typography sx={{fontWeight: 400, color: "#64748b"}}>
                                    Không có đơn đăng ký ở trạng thái này.
                                </Typography>
                            </Box>
                        ) : (
                            <Stack spacing={2.25}>
                                {filteredReservations.map((reservation, index) => (
                                    <ReservationCard
                                        key={reservation?.id ?? `${reservation?.studentName || "reservation"}-${index}`}
                                        reservation={reservation}
                                        onOpenDetail={setSelectedReservation}
                                    />
                                ))}
                            </Stack>
                        )}
                    </Box>
                </Paper>
            </Container>
            <DetailDialog reservation={selectedReservation} onClose={() => setSelectedReservation(null)} />
        </Box>
    );
}
