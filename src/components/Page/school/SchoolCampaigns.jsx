import React, {useState, useMemo, useEffect} from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import Pagination from "@mui/material/Pagination";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import CampaignIcon from "@mui/icons-material/Campaign";
import CloseIcon from "@mui/icons-material/Close";
import {useNavigate} from "react-router-dom";
import {enqueueSnackbar} from "notistack";
import { useSchool } from "../../../contexts/SchoolContext.jsx";
import { getCampaignTemplatesByYear, createCampaignTemplate } from "../../../services/CampaignService.jsx";

const modalPaperSx = {
    borderRadius: "16px",
    boxShadow: "0 24px 48px rgba(0, 0, 0, 0.12)",
    bgcolor: "white",
    overflow: "hidden",
};
const modalBackdropSx = {
    backdropFilter: "blur(6px)",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
};

// Backend has many statuses; UI focuses on main campaign lifecycle ones
const STATUS_OPTIONS = [
    {value: "OPEN", label: "Đang mở"},
    {value: "PAUSED", label: "Tạm dừng"},
    {value: "CLOSED", label: "Đã đóng"},
    {value: "EXPIRED", label: "Hết hạn"},
];

/** Normalize template from API (id or admissionCampaignTemplateId) */
function mapTemplate(row) {
    if (!row) return null;
    const id = row.admissionCampaignTemplateId ?? row.id;
    const status = row.status ? String(row.status).toUpperCase() : "OPEN";

    return {
        ...row,
        id,
        admissionCampaignTemplateId: row.admissionCampaignTemplateId ?? row.id,
        status,
        numberOfOfferings: row.numberOfOfferings ?? 0,
    };
}

const emptyForm = {
    name: "",
    description: "",
    year: new Date().getFullYear(),
    startDate: "",
    endDate: "",
};

function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN");
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

/** Map BE validation messages (EN) → hiển thị tiếng Việt (Create + Update) */
const CAMPAIGN_ERROR_VI = {
    "Request is required": "Yêu cầu không được để trống",
    "Name is required": "Tên chiến dịch là bắt buộc",
    "Name is too long. Maximum length is 100 characters": "Tên chiến dịch quá dài. Tối đa 100 ký tự",
    "Description is required": "Mô tả là bắt buộc",
    "Year is required": "Năm là bắt buộc",
    "A campaign template for the year already exists": "Đã tồn tại chiến dịch cho năm này",
    "Cannot create a campaign for a past year": "Không thể tạo chiến dịch cho năm đã qua",
    "Start date and end date are required": "Ngày bắt đầu và ngày kết thúc là bắt buộc",
    "Start date cannot be in the past": "Ngày bắt đầu không được ở quá khứ",
    "End date must be after start date": "Ngày kết thúc phải sau ngày bắt đầu",
    "End date must be a future date": "Ngày kết thúc phải từ hôm nay trở đi",
};

function getCampaignErrorMessage(backendMessage, fallback) {
    if (!backendMessage) return fallback;
    const trimmed = String(backendMessage).trim();
    return CAMPAIGN_ERROR_VI[trimmed] ?? trimmed ?? fallback;
}

export default function SchoolCampaigns() {
    const navigate = useNavigate();
    const { isPrimaryBranch } = useSchool();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [yearFilter, setYearFilter] = useState(String(CURRENT_YEAR));
    const [statusFilter, setStatusFilter] = useState("all");
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [formValues, setFormValues] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState({});
    const [page, setPage] = useState(0);
    const rowsPerPage = 10;
    useEffect(() => {
        let cancelled = false;
        const year = parseInt(yearFilter, 10);
        const yearParam = Number.isFinite(year) ? year : CURRENT_YEAR;
        setLoading(true);
        getCampaignTemplatesByYear(yearParam)
            .then((res) => {
                if (cancelled) return;
                const raw = res?.data?.body ?? res?.data;
                let list = [];
                if (Array.isArray(raw)) {
                    list = raw;
                } else if (raw) {
                    list = [raw];
                }
                const mapped = list.map(mapTemplate).filter(Boolean);
                setCampaigns(mapped);
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("Fetch campaign templates error:", err);
                enqueueSnackbar(err?.response?.data?.message || "Không tải được danh sách chiến dịch", {
                    variant: "error",
                });
                setCampaigns([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [yearFilter]);

    useEffect(() => {
        setPage(0);
    }, [yearFilter, search, statusFilter]);

    const years = useMemo(() => YEAR_OPTIONS, []);

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormValues((prev) => ({
            ...prev,
            [name]: name === "year" ? (value === "" ? "" : parseInt(value, 10)) : value,
        }));
    };

    const filteredCampaigns = useMemo(() => {
        let list = campaigns;
        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter((c) => c.name?.toLowerCase().includes(q));
        }
        if (statusFilter !== "all") {
            list = list.filter((c) => String(c.status).toUpperCase() === statusFilter);
        }
        return list;
    }, [campaigns, search, statusFilter]);

    const paginatedCampaigns = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredCampaigns.slice(start, start + rowsPerPage);
    }, [filteredCampaigns, page]);

    const validateForm = () => {
        const errors = {};
        if (!formValues.name?.trim()) errors.name = "Tên chiến dịch là bắt buộc";
        if (!formValues.startDate?.trim()) errors.startDate = "Ngày bắt đầu là bắt buộc";
        if (!formValues.endDate?.trim()) errors.endDate = "Ngày kết thúc là bắt buộc";
        const start = formValues.startDate?.trim();
        const end = formValues.endDate?.trim();
        if (start && end && new Date(end) < new Date(start)) {
            errors.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const getCreatePayload = () => ({
        name: formValues.name.trim(),
        description: formValues.description?.trim() || "",
        year: formValues.year || new Date().getFullYear(),
        startDate: formValues.startDate?.trim() || "",
        endDate: formValues.endDate?.trim() || "",
    });

    const handleOpenCreate = () => {
        setFormValues({
            ...emptyForm,
            year: new Date().getFullYear(),
        });
        setFormErrors({});
        setCreateModalOpen(true);
    };

    const handleCreateSubmit = async () => {
        if (!validateForm()) return;
        setSubmitLoading(true);
        try {
            const payload = getCreatePayload();
            const res = await createCampaignTemplate(payload);
            if (res?.status === 200 || res?.data?.message) {
                enqueueSnackbar(res?.data?.message || "Tạo chiến dịch thành công", { variant: "success" });
                setCreateModalOpen(false);
                const createdYear = Number(payload.year);
                if (Number.isFinite(createdYear) && createdYear !== parseInt(yearFilter, 10)) {
                    setYearFilter(String(createdYear));
                }
                const refetch = await getCampaignTemplatesByYear(
                    Number.isFinite(createdYear) ? createdYear : parseInt(yearFilter, 10)
                );
                const raw = refetch?.data?.body ?? refetch?.data;
                let list = [];
                if (Array.isArray(raw)) {
                    list = raw;
                } else if (raw) {
                    list = [raw];
                }
                const mapped = list.map(mapTemplate).filter(Boolean);
                setCampaigns(mapped);
            } else {
                enqueueSnackbar(
                    getCampaignErrorMessage(res?.data?.message, "Tạo chiến dịch thất bại"),
                    { variant: "error" }
                );
            }
        } catch (err) {
            enqueueSnackbar(
                getCampaignErrorMessage(err?.response?.data?.message, "Tạo chiến dịch thất bại"),
                { variant: "error" }
            );
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleOpenView = (campaign) => {
        const id = campaign.id ?? campaign.admissionCampaignTemplateId;
        navigate(`/school/campaigns/detail/${id}`, { state: { campaign } });
    };

    const handleOpenEdit = (campaign) => {
        const id = campaign.id ?? campaign.admissionCampaignTemplateId;
        navigate(`/school/campaigns/detail/${id}`, { state: { campaign } });
    };

    const getStatusLabel = (status) => {
        const upper = String(status || "").toUpperCase();
        const mapped = STATUS_OPTIONS.find((s) => s.value === upper);
        return mapped?.label ?? status ?? "—";
    };

    const getStatusColor = (status) => {
        const upper = String(status || "").toUpperCase();
        if (upper === "OPEN") return {bg: "rgba(34, 197, 94, 0.12)", color: "#16a34a"};
        if (upper === "PAUSED") return {bg: "rgba(250, 204, 21, 0.18)", color: "#a16207"};
        if (upper === "EXPIRED") return {bg: "rgba(248, 113, 113, 0.15)", color: "#b91c1c"};
        if (upper === "CLOSED") return {bg: "rgba(148, 163, 184, 0.2)", color: "#64748b"};
        return {bg: "rgba(148, 163, 184, 0.18)", color: "#64748b"};
    };

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                width: "100%",
                fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
            }}
        >
            {/* Header — cùng style trang Cơ sở */}
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
                        flexDirection: {xs: "column", sm: "row"},
                        alignItems: {xs: "stretch", sm: "center"},
                        justifyContent: "space-between",
                        gap: 2,
                    }}
                >
                    <Box>
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 700,
                                letterSpacing: "-0.02em",
                                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            }}
                        >
                            Quản lý chiến dịch tuyển sinh
                        </Typography>
                        <Typography variant="body2" sx={{mt: 0.5, opacity: 0.95}}>
                            {isPrimaryBranch
                                ? "Theo dõi và cấu hình chiến dịch tuyển sinh của trường"
                                : "Xem kế hoạch tuyển sinh"}
                        </Typography>
                    </Box>
                    {isPrimaryBranch && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon/>}
                            onClick={handleOpenCreate}
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
                            Tạo chiến dịch
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Search & Filters */}
            <Card
                elevation={0}
                sx={{
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 24px rgba(15,23,42,0.06)",
                    bgcolor: "#fff",
                }}
            >
                <CardContent sx={{p: 2.5}}>
                    <Stack
                        direction={{xs: "column", md: "row"}}
                        spacing={2}
                        alignItems={{xs: "stretch", md: "center"}}
                        flexWrap="wrap"
                    >
                        <TextField
                            placeholder="Tìm theo tên chiến dịch..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            size="small"
                            sx={{
                                flex: 1,
                                minWidth: 200,
                                maxWidth: {md: 280},
                                "& .MuiOutlinedInput-root": {borderRadius: "12px", bgcolor: "#f8fafc"},
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{color: "#64748b"}}/>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <FormControl size="small" sx={{minWidth: 140}}>
                            <InputLabel>Năm</InputLabel>
                            <Select
                                value={yearFilter}
                                label="Năm"
                                onChange={(e) => setYearFilter(e.target.value)}
                                sx={{borderRadius: "12px", bgcolor: "#f8fafc"}}
                            >
                                <MenuItem value="0">Tất cả năm</MenuItem>
                                {years.map((y) => (
                                    <MenuItem key={y} value={String(y)}>
                                        {y}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{minWidth: 140}}>
                            <InputLabel>Trạng thái</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Trạng thái"
                                onChange={(e) => setStatusFilter(e.target.value)}
                                sx={{borderRadius: "12px", bgcolor: "#f8fafc"}}
                            >
                                <MenuItem value="all">Tất cả trạng thái</MenuItem>
                                {STATUS_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </CardContent>
            </Card>

            {/* Table */}
            <Card
                elevation={0}
                sx={{
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 24px rgba(15,23,42,0.06)",
                    overflow: "hidden",
                    bgcolor: "#fff",
                }}
            >
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{bgcolor: "#f8fafc"}}>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Tên chiến dịch
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Năm
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Bắt đầu — Kết thúc
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Trạng thái
                                </TableCell>
                                {isPrimaryBranch && (
                                    <TableCell
                                        sx={{fontWeight: 700, color: "#1e293b", py: 2}}
                                        align="right"
                                    >
                                        Thao tác
                                    </TableCell>
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton variant="text" width="80%" /></TableCell>
                                        <TableCell><Skeleton variant="text" width={40} /></TableCell>
                                        <TableCell><Skeleton variant="text" width="70%" /></TableCell>
                                        <TableCell><Skeleton variant="rounded" width={70} height={24} /></TableCell>
                                        {isPrimaryBranch && <TableCell><Skeleton variant="rounded" width={100} height={32} /></TableCell>}
                                    </TableRow>
                                ))
                            ) : paginatedCampaigns.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isPrimaryBranch ? 5 : 4} align="center" sx={{py: 8}}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                gap: 1.5,
                                            }}
                                        >
                                            <CampaignIcon sx={{fontSize: 56, color: "#cbd5e1"}}/>
                                            <Typography
                                                variant="h6"
                                                sx={{color: "#64748b", fontWeight: 600}}
                                            >
                                                Chưa có chiến dịch
                                            </Typography>
                                            <Typography variant="body2" sx={{color: "#94a3b8"}}>
                                                {filteredCampaigns.length === 0 && campaigns.length > 0
                                                    ? "Không có kết quả phù hợp với tìm kiếm hoặc bộ lọc."
                                                    : isPrimaryBranch
                                                        ? "Chưa có chiến dịch cho năm đã chọn — nhấn «+ Tạo chiến dịch» để bắt đầu."
                                                        : "Chưa có kế hoạch tuyển sinh."}
                                            </Typography>
                                            {campaigns.length === 0 && isPrimaryBranch && (
                                                <Button
                                                    variant="contained"
                                                    startIcon={<AddIcon/>}
                                                    onClick={handleOpenCreate}
                                                    sx={{
                                                        mt: 1,
                                                        borderRadius: 2,
                                                        textTransform: "none",
                                                        fontWeight: 600,
                                                        background:
                                                            "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                                                    }}
                                                >
                                                    Tạo chiến dịch
                                                </Button>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedCampaigns.map((row) => {
                                    const statusStyle = getStatusColor(row.status);
                                    return (
                                        <TableRow
                                            key={row.id}
                                            hover
                                            onClick={() => handleOpenView(row)}
                                            sx={{
                                                cursor: "pointer",
                                                "&:hover": {
                                                    bgcolor: "rgba(122, 169, 235, 0.06)",
                                                },
                                            }}
                                        >
                                            <TableCell>
                                                <Typography sx={{fontWeight: 600, color: "#1e293b"}}>
                                                    {row.name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{color: "#64748b"}}>{row.year}</TableCell>
                                            <TableCell sx={{color: "#64748b", whiteSpace: "nowrap"}}>
                                                {formatDate(row.startDate)} — {formatDate(row.endDate)}
                                            </TableCell>
                                            <TableCell>
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        px: 1.5,
                                                        py: 0.5,
                                                        borderRadius: 999,
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        bgcolor: statusStyle.bg,
                                                        color: statusStyle.color,
                                                    }}
                                                >
                                                    {getStatusLabel(row.status)}
                                                </Box>
                                            </TableCell>
                                            {isPrimaryBranch && (
                                                <TableCell
                                                    align="right"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Stack
                                                        direction="row"
                                                        spacing={0.25}
                                                        justifyContent="flex-end"
                                                    >
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleOpenView(row)}
                                                            title="Xem chi tiết"
                                                            aria-label="Xem chi tiết"
                                                            sx={{
                                                                color: "#64748b",
                                                                "&:hover": {
                                                                    color: "#0D64DE",
                                                                    bgcolor: "rgba(13, 100, 222, 0.08)",
                                                                },
                                                            }}
                                                        >
                                                            <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleOpenEdit(row)}
                                                            title="Chỉnh sửa"
                                                            aria-label="Chỉnh sửa"
                                                            sx={{
                                                                color: "#64748b",
                                                                "&:hover": {
                                                                    color: "#0D64DE",
                                                                    bgcolor: "rgba(13, 100, 222, 0.08)",
                                                                },
                                                            }}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Stack>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {filteredCampaigns.length > 0 && (
                    <Box
                        sx={{
                            borderTop: "1px solid #e2e8f0",
                            bgcolor: "#f8fafc",
                            px: 3,
                            py: 1.5,
                            display: "flex",
                            justifyContent: "flex-end",
                        }}
                    >
                        <Pagination
                            count={Math.ceil(filteredCampaigns.length / rowsPerPage)}
                            page={page + 1}
                            onChange={(_, p) => setPage(p - 1)}
                            color="primary"
                            shape="rounded"
                        />
                    </Box>
                )}
            </Card>

            {/* Create Campaign Modal */}
            <Dialog
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{sx: modalPaperSx}}
                slotProps={{backdrop: {sx: modalBackdropSx}}}
            >
                <Box sx={{px: 3, pt: 3, pb: 0}}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 2,
                        }}
                    >
                        <Box>
                            <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b"}}>
                                Tạo chiến dịch
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b", mt: 0.5}}>
                                Điền thông tin chiến dịch tuyển sinh mới.
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={() => setCreateModalOpen(false)}
                            size="small"
                            sx={{mt: -0.5, mr: -0.5}}
                            aria-label="Đóng"
                        >
                            <CloseIcon fontSize="small"/>
                        </IconButton>
                    </Box>
                </Box>
                <DialogContent dividers={false} sx={{px: 3, pt: 2, pb: 1}}>
                    <Stack spacing={2.5}>
                        <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                            <TextField
                                label="Tên chiến dịch"
                                name="name"
                                fullWidth
                                value={formValues.name}
                                onChange={handleChange}
                                error={!!formErrors.name}
                                helperText={formErrors.name}
                                required
                                sx={{"& .MuiOutlinedInput-root": {borderRadius: "12px"}}}
                            />
                            <TextField
                                label="Năm"
                                name="year"
                                type="number"
                                fullWidth
                                value={formValues.year}
                                onChange={handleChange}
                                inputProps={{min: 2020, max: 2035}}
                                sx={{
                                    maxWidth: {sm: 160},
                                    "& .MuiOutlinedInput-root": {borderRadius: "12px"},
                                }}
                            />
                        </Stack>
                        <TextField
                            label="Mô tả"
                            name="description"
                            fullWidth
                            multiline
                            rows={3}
                            value={formValues.description}
                            onChange={handleChange}
                            sx={{"& .MuiOutlinedInput-root": {borderRadius: "12px"}}}
                        />
                        <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                            <TextField
                                label="Ngày bắt đầu"
                                name="startDate"
                                type="date"
                                fullWidth
                                value={formValues.startDate}
                                onChange={handleChange}
                                error={!!formErrors.startDate}
                                helperText={formErrors.startDate}
                                InputLabelProps={{shrink: true}}
                                required
                                sx={{"& .MuiOutlinedInput-root": {borderRadius: "12px"}}}
                            />
                            <TextField
                                label="Ngày kết thúc"
                                name="endDate"
                                type="date"
                                fullWidth
                                value={formValues.endDate}
                                onChange={handleChange}
                                error={!!formErrors.endDate}
                                helperText={formErrors.endDate}
                                InputLabelProps={{shrink: true}}
                                required
                                sx={{"& .MuiOutlinedInput-root": {borderRadius: "12px"}}}
                            />
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{px: 3, py: 2.5, borderTop: "1px solid #e2e8f0", gap: 1}}>
                    <Button
                        onClick={() => setCreateModalOpen(false)}
                        variant="text"
                        color="inherit"
                        sx={{textTransform: "none", fontWeight: 500}}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleCreateSubmit}
                        variant="contained"
                        disabled={submitLoading}
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            px: 3,
                            bgcolor: "#0D64DE",
                        }}
                    >
                        {submitLoading ? "Đang tạo…" : "Lưu"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
