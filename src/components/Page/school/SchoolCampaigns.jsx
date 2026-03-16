import React, {useState, useMemo} from "react";
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
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    TablePagination,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import ListIcon from "@mui/icons-material/List";
import CampaignIcon from "@mui/icons-material/Campaign";
import CloseIcon from "@mui/icons-material/Close";
import {useNavigate} from "react-router-dom";
import {enqueueSnackbar} from "notistack";

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

const ROWS_PER_PAGE_OPTIONS = [5, 10, 25];

const STATUS_OPTIONS = [
    {value: "active", label: "Đang diễn ra"},
    {value: "upcoming", label: "Sắp diễn ra"},
    {value: "closed", label: "Đã kết thúc"},
];

const initialMockCampaigns = [
    {
        id: 1,
        name: "Tuyển sinh lớp 10 năm 2025",
        description: "Chiến dịch tuyển sinh lớp 10 cho năm học 2025-2026.",
        year: 2025,
        startDate: "2025-03-01",
        endDate: "2025-07-15",
        numberOfOfferings: 3,
        status: "active",
    },
    {
        id: 2,
        name: "Tuyển sinh lớp 6 năm 2025",
        description: "Chiến dịch tuyển sinh lớp 6 năm học 2025-2026.",
        year: 2025,
        startDate: "2025-04-01",
        endDate: "2025-06-30",
        numberOfOfferings: 2,
        status: "upcoming",
    },
    {
        id: 3,
        name: "Tuyển sinh lớp 10 năm 2024",
        description: "Chiến dịch tuyển sinh lớp 10 năm học 2024-2025.",
        year: 2024,
        startDate: "2024-03-01",
        endDate: "2024-07-20",
        numberOfOfferings: 4,
        status: "closed",
    },
];

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

export default function SchoolCampaigns() {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState(initialMockCampaigns);
    const [search, setSearch] = useState("");
    const [yearFilter, setYearFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [formValues, setFormValues] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState({});
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const years = useMemo(() => {
        const set = new Set(campaigns.map((c) => c.year).filter(Boolean));
        return Array.from(set).sort((a, b) => b - a);
    }, [campaigns]);

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
        if (yearFilter !== "all") {
            const y = parseInt(yearFilter, 10);
            list = list.filter((c) => c.year === y);
        }
        if (statusFilter !== "all") {
            list = list.filter((c) => c.status === statusFilter);
        }
        return list;
    }, [campaigns, search, yearFilter, statusFilter]);

    const paginatedCampaigns = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredCampaigns.slice(start, start + rowsPerPage);
    }, [filteredCampaigns, page, rowsPerPage]);

    const validateForm = () => {
        const errors = {};
        if (!formValues.name?.trim()) errors.name = "Tên chiến dịch là bắt buộc";
        if (!formValues.startDate?.trim()) errors.startDate = "Ngày bắt đầu là bắt buộc";
        if (!formValues.endDate?.trim()) errors.endDate = "Ngày kết thúc là bắt buộc";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const getPayload = () => ({
        name: formValues.name.trim(),
        description: formValues.description?.trim() || "",
        year: formValues.year || new Date().getFullYear(),
        startDate: formValues.startDate?.trim() || "",
        endDate: formValues.endDate?.trim() || "",
        numberOfOfferings: selectedCampaign?.numberOfOfferings ?? 0,
        status: selectedCampaign?.status ?? "upcoming",
    });

    const handleOpenCreate = () => {
        setSelectedCampaign(null);
        setFormValues({
            ...emptyForm,
            year: new Date().getFullYear(),
        });
        setFormErrors({});
        setCreateModalOpen(true);
    };

    const handleCreateSubmit = () => {
        if (!validateForm()) return;
        const payload = getPayload();
        const newCampaign = {
            id: Date.now(),
            ...payload,
            numberOfOfferings: 0,
            status: "upcoming",
        };
        setCampaigns((prev) => [newCampaign, ...prev]);
        enqueueSnackbar("Tạo chiến dịch thành công", {variant: "success"});
        setCreateModalOpen(false);
    };

    const handleOpenView = (campaign) => {
        setSelectedCampaign(campaign);
        setViewModalOpen(true);
    };

    const handleOpenEdit = (campaign) => {
        setSelectedCampaign(campaign);
        setFormValues({
            name: campaign.name || "",
            description: campaign.description || "",
            year: campaign.year || new Date().getFullYear(),
            startDate: campaign.startDate || "",
            endDate: campaign.endDate || "",
        });
        setFormErrors({});
        setEditModalOpen(true);
    };

    const handleEditSubmit = () => {
        if (!selectedCampaign || !validateForm()) return;
        const payload = getPayload();
        setCampaigns((prev) =>
            prev.map((c) =>
                c.id === selectedCampaign.id
                    ? {...c, ...payload, numberOfOfferings: c.numberOfOfferings, status: c.status}
                    : c
            )
        );
        enqueueSnackbar("Cập nhật chiến dịch thành công", {variant: "success"});
        setEditModalOpen(false);
    };

    const handleManageOfferings = (campaign) => {
        navigate(`/school/campaigns/offerings/${campaign.id}`);
    };

    const getStatusLabel = (status) => {
        const o = STATUS_OPTIONS.find((s) => s.value === status);
        return o?.label ?? status;
    };

    const getStatusColor = (status) => {
        if (status === "active") return {bg: "rgba(34, 197, 94, 0.12)", color: "#16a34a"};
        if (status === "upcoming") return {bg: "rgba(59, 130, 246, 0.12)", color: "#2563eb"};
        return {bg: "rgba(148, 163, 184, 0.2)", color: "#64748b"};
    };

    return (
        <Box sx={{display: "flex", flexDirection: "column", gap: 3, width: "100%"}}>
            {/* Header */}
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
                            Chiến dịch tuyển sinh
                        </Typography>
                        <Typography variant="body2" sx={{mt: 0.5, opacity: 0.95}}>
                            Quản lý chiến dịch tuyển sinh của trường
                        </Typography>
                    </Box>
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
                </Box>
            </Box>

            {/* Search & Filters */}
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                    bgcolor: "#F8FAFC",
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
                                "& .MuiOutlinedInput-root": {borderRadius: 2, bgcolor: "white"},
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{color: "#64748b"}}/>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <FormControl size="small" sx={{minWidth: 120}}>
                            <InputLabel>Năm</InputLabel>
                            <Select
                                value={yearFilter}
                                label="Năm"
                                onChange={(e) => setYearFilter(e.target.value)}
                                sx={{borderRadius: 2, bgcolor: "white"}}
                            >
                                <MenuItem value="all">Tất cả</MenuItem>
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
                                sx={{borderRadius: 2, bgcolor: "white"}}
                            >
                                <MenuItem value="all">Tất cả</MenuItem>
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
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                    overflow: "hidden",
                    bgcolor: "#F8FAFC",
                }}
            >
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{bgcolor: "#f1f5f9"}}>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Tên chiến dịch
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Năm
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Ngày bắt đầu
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Ngày kết thúc
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Số chỉ tiêu
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Trạng thái
                                </TableCell>
                                <TableCell
                                    sx={{fontWeight: 700, color: "#1e293b", py: 2}}
                                    align="right"
                                >
                                    Thao tác
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedCampaigns.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{py: 8}}>
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
                                                Chưa có chiến dịch nào
                                            </Typography>
                                            <Typography variant="body2" sx={{color: "#94a3b8"}}>
                                                {filteredCampaigns.length === 0 && campaigns.length > 0
                                                    ? "Không có kết quả phù hợp với tìm kiếm hoặc bộ lọc."
                                                    : "Tạo chiến dịch tuyển sinh đầu tiên của bạn."}
                                            </Typography>
                                            {campaigns.length === 0 && (
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
                                            sx={{
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
                                            <TableCell sx={{color: "#64748b"}}>
                                                {formatDate(row.startDate)}
                                            </TableCell>
                                            <TableCell sx={{color: "#64748b"}}>
                                                {formatDate(row.endDate)}
                                            </TableCell>
                                            <TableCell sx={{color: "#64748b"}}>
                                                {row.numberOfOfferings ?? 0}
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
                                            <TableCell align="right">
                                                <Stack
                                                    direction="row"
                                                    spacing={0.5}
                                                    justifyContent="flex-end"
                                                >
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleOpenView(row)}
                                                        sx={{
                                                            color: "#64748b",
                                                            "&:hover": {
                                                                color: "#0D64DE",
                                                                bgcolor: "rgba(13, 100, 222, 0.08)",
                                                            },
                                                        }}
                                                        title="Xem chi tiết"
                                                    >
                                                        <VisibilityIcon fontSize="small"/>
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleOpenEdit(row)}
                                                        sx={{
                                                            color: "#64748b",
                                                            "&:hover": {
                                                                color: "#0D64DE",
                                                                bgcolor: "rgba(13, 100, 222, 0.08)",
                                                            },
                                                        }}
                                                        title="Chỉnh sửa"
                                                    >
                                                        <EditIcon fontSize="small"/>
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleManageOfferings(row)}
                                                        sx={{
                                                            color: "#64748b",
                                                            "&:hover": {
                                                                color: "#0D64DE",
                                                                bgcolor: "rgba(13, 100, 222, 0.08)",
                                                            },
                                                        }}
                                                        title="Quản lý chỉ tiêu"
                                                    >
                                                        <ListIcon fontSize="small"/>
                                                    </IconButton>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {filteredCampaigns.length > 0 && (
                    <TablePagination
                        component="div"
                        count={filteredCampaigns.length}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                        sx={{
                            borderTop: "1px solid #e2e8f0",
                            bgcolor: "#f8fafc",
                            ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows": {
                                color: "#64748b",
                            },
                        }}
                    />
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
                        <TextField
                            label="Tên chiến dịch"
                            name="name"
                            fullWidth
                            value={formValues.name}
                            onChange={handleChange}
                            error={!!formErrors.name}
                            helperText={formErrors.name}
                            required
                        />
                        <TextField
                            label="Mô tả"
                            name="description"
                            fullWidth
                            multiline
                            rows={3}
                            value={formValues.description}
                            onChange={handleChange}
                        />
                        <TextField
                            label="Năm"
                            name="year"
                            type="number"
                            fullWidth
                            value={formValues.year}
                            onChange={handleChange}
                            inputProps={{min: 2020, max: 2030}}
                        />
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
                        />
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
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            px: 3,
                            background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                        }}
                    >
                        Tạo chiến dịch
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Modal */}
            <Dialog
                open={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                maxWidth="sm"
                fullWidth
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
                        <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b"}}>
                            Chi tiết chiến dịch
                        </Typography>
                        <IconButton
                            onClick={() => setViewModalOpen(false)}
                            size="small"
                            sx={{mt: -0.5, mr: -0.5}}
                            aria-label="Đóng"
                        >
                            <CloseIcon fontSize="small"/>
                        </IconButton>
                    </Box>
                </Box>
                <DialogContent dividers={false} sx={{px: 3, pt: 2, pb: 2}}>
                    {selectedCampaign && (
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Tên chiến dịch
                                </Typography>
                                <Typography variant="h6" sx={{fontWeight: 600}}>
                                    {selectedCampaign.name}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Mô tả
                                </Typography>
                                <Typography variant="body1">
                                    {selectedCampaign.description || "—"}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Năm · Ngày bắt đầu · Ngày kết thúc
                                </Typography>
                                <Typography variant="body1">
                                    {selectedCampaign.year} · {formatDate(selectedCampaign.startDate)} ·{" "}
                                    {formatDate(selectedCampaign.endDate)}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Số chỉ tiêu · Trạng thái
                                </Typography>
                                <Typography variant="body1">
                                    {selectedCampaign.numberOfOfferings ?? 0} ·{" "}
                                    {getStatusLabel(selectedCampaign.status)}
                                </Typography>
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{px: 3, py: 2, borderTop: "1px solid #e2e8f0"}}>
                    <Button onClick={() => setViewModalOpen(false)} color="inherit">
                        Đóng
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<ListIcon/>}
                        onClick={() => {
                            setViewModalOpen(false);
                            handleManageOfferings(selectedCampaign);
                        }}
                        sx={{
                            background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                            textTransform: "none",
                        }}
                    >
                        Quản lý chỉ tiêu
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Campaign Modal */}
            <Dialog
                open={editModalOpen}
                onClose={() => setEditModalOpen(false)}
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
                                Chỉnh sửa chiến dịch
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b", mt: 0.5}}>
                                Cập nhật thông tin chiến dịch.
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={() => setEditModalOpen(false)}
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
                        <TextField
                            label="Tên chiến dịch"
                            name="name"
                            fullWidth
                            value={formValues.name}
                            onChange={handleChange}
                            error={!!formErrors.name}
                            helperText={formErrors.name}
                        />
                        <TextField
                            label="Mô tả"
                            name="description"
                            fullWidth
                            multiline
                            rows={3}
                            value={formValues.description}
                            onChange={handleChange}
                        />
                        <TextField
                            label="Năm"
                            name="year"
                            type="number"
                            fullWidth
                            value={formValues.year}
                            onChange={handleChange}
                            inputProps={{min: 2020, max: 2030}}
                        />
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
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{px: 3, py: 2.5, borderTop: "1px solid #e2e8f0", gap: 1}}>
                    <Button
                        onClick={() => setEditModalOpen(false)}
                        variant="text"
                        color="inherit"
                        sx={{textTransform: "none", fontWeight: 500}}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleEditSubmit}
                        variant="contained"
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            px: 3,
                            background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                        }}
                    >
                        Lưu
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
