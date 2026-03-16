import React, {useState, useMemo} from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ListIcon from "@mui/icons-material/List";
import CloseIcon from "@mui/icons-material/Close";
import {useNavigate, useParams} from "react-router-dom";
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

const LEARNING_MODES = [
    {value: "DAY_SCHOOL", label: "Bán trú"},
    {value: "BOARDING", label: "Nội trú"},
];

const MOCK_CAMPUSES = [
    {id: "1", name: "Cơ sở 1 - Quận 1"},
    {id: "2", name: "Cơ sở 2 - Bình Thạnh"},
    {id: "3", name: "Cơ sở 3 - Thủ Đức"},
];

const MOCK_PROGRAMS = [
    {id: "1", name: "Lớp 10 - Chương trình chuẩn"},
    {id: "2", name: "Lớp 10 - Chương trình nâng cao"},
    {id: "3", name: "Lớp 6 - Chương trình chuẩn"},
];

const initialMockOfferings = [
    {
        id: 1,
        campusId: "1",
        programId: "1",
        learningMode: "DAY_SCHOOL",
        quota: 120,
        tuitionFee: 4500000,
    },
    {
        id: 2,
        campusId: "1",
        programId: "2",
        learningMode: "DAY_SCHOOL",
        quota: 30,
        tuitionFee: 6000000,
    },
    {
        id: 3,
        campusId: "2",
        programId: "1",
        learningMode: "BOARDING",
        quota: 50,
        tuitionFee: 8500000,
    },
];

const emptyForm = {
    campusId: "",
    programId: "",
    learningMode: "DAY_SCHOOL",
    quota: "",
    tuitionFee: "",
};

function formatCurrency(n) {
    if (n == null || n === "") return "—";
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(Number(n));
}

export default function SchoolCampaignOfferings() {
    const navigate = useNavigate();
    const {campaignId} = useParams();
    const [offerings, setOfferings] = useState(initialMockOfferings);
    const [campusFilter, setCampusFilter] = useState("all");
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [selectedOffering, setSelectedOffering] = useState(null);
    const [formValues, setFormValues] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState({});

    const campaignName = `Chiến dịch #${campaignId || "—"}`;

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormValues((prev) => ({...prev, [name]: value}));
    };

    const filteredOfferings = useMemo(() => {
        if (campusFilter === "all") return offerings;
        return offerings.filter((o) => o.campusId === campusFilter);
    }, [offerings, campusFilter]);

    const getCampusName = (id) => MOCK_CAMPUSES.find((c) => c.id === id)?.name ?? id;
    const getProgramName = (id) => MOCK_PROGRAMS.find((p) => p.id === id)?.name ?? id;
    const getLearningModeLabel = (mode) =>
        LEARNING_MODES.find((m) => m.value === mode)?.label ?? mode;

    const validateForm = () => {
        const errors = {};
        if (!formValues.campusId) errors.campusId = "Vui lòng chọn cơ sở";
        if (!formValues.programId) errors.programId = "Vui lòng chọn chương trình";
        if (formValues.quota === "" || (formValues.quota !== "" && Number(formValues.quota) < 0))
            errors.quota = "Chỉ tiêu không hợp lệ";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleOpenAdd = () => {
        setSelectedOffering(null);
        setFormValues(emptyForm);
        setFormErrors({});
        setAddModalOpen(true);
    };

    const handleAddSubmit = () => {
        if (!validateForm()) return;
        const newOffering = {
            id: Date.now(),
            campusId: formValues.campusId,
            programId: formValues.programId,
            learningMode: formValues.learningMode,
            quota: Number(formValues.quota) || 0,
            tuitionFee: Number(formValues.tuitionFee) || 0,
        };
        setOfferings((prev) => [...prev, newOffering]);
        enqueueSnackbar("Thêm chỉ tiêu thành công", {variant: "success"});
        setAddModalOpen(false);
    };

    const handleOpenEdit = (offering) => {
        setSelectedOffering(offering);
        setFormValues({
            campusId: offering.campusId,
            programId: offering.programId,
            learningMode: offering.learningMode,
            quota: String(offering.quota),
            tuitionFee: String(offering.tuitionFee),
        });
        setFormErrors({});
        setEditModalOpen(true);
    };

    const handleEditSubmit = () => {
        if (!selectedOffering || !validateForm()) return;
        setOfferings((prev) =>
            prev.map((o) =>
                o.id === selectedOffering.id
                    ? {
                        ...o,
                        campusId: formValues.campusId,
                        programId: formValues.programId,
                        learningMode: formValues.learningMode,
                        quota: Number(formValues.quota) || 0,
                        tuitionFee: Number(formValues.tuitionFee) || 0,
                    }
                    : o
            )
        );
        enqueueSnackbar("Cập nhật chỉ tiêu thành công", {variant: "success"});
        setEditModalOpen(false);
    };

    const handleOpenDeleteConfirm = (offering) => {
        setSelectedOffering(offering);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (!selectedOffering) return;
        setOfferings((prev) => prev.filter((o) => o.id !== selectedOffering.id));
        enqueueSnackbar("Đã xóa chỉ tiêu", {variant: "info"});
        setDeleteConfirmOpen(false);
        setSelectedOffering(null);
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
                        <Button
                            startIcon={<ArrowBackIcon/>}
                            onClick={() => navigate("/school/campaigns")}
                            sx={{
                                color: "white",
                                textTransform: "none",
                                mb: 1,
                                "&:hover": {bgcolor: "rgba(255,255,255,0.1)"},
                            }}
                        >
                            Quay lại chiến dịch
                        </Button>
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 700,
                                letterSpacing: "-0.02em",
                                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            }}
                        >
                            Chỉ tiêu tuyển sinh
                        </Typography>
                        <Typography variant="body2" sx={{mt: 0.5, opacity: 0.95}}>
                            {campaignName} — Quản lý chỉ tiêu theo cơ sở và chương trình
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon/>}
                        onClick={handleOpenAdd}
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
                        Thêm chỉ tiêu
                    </Button>
                </Box>
            </Box>

            {/* Filter by campus */}
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
                    <FormControl size="small" sx={{minWidth: 200}}>
                        <InputLabel>Lọc theo cơ sở</InputLabel>
                        <Select
                            value={campusFilter}
                            label="Lọc theo cơ sở"
                            onChange={(e) => setCampusFilter(e.target.value)}
                            sx={{borderRadius: 2, bgcolor: "white"}}
                        >
                            <MenuItem value="all">Tất cả cơ sở</MenuItem>
                            {MOCK_CAMPUSES.map((c) => (
                                <MenuItem key={c.id} value={c.id}>
                                    {c.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </CardContent>
            </Card>

            {/* Offerings Table */}
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
                                    Cơ sở
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Chương trình
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Hình thức
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Chỉ tiêu
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Học phí
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
                            {filteredOfferings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{py: 8}}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                gap: 1.5,
                                            }}
                                        >
                                            <ListIcon sx={{fontSize: 56, color: "#cbd5e1"}}/>
                                            <Typography
                                                variant="h6"
                                                sx={{color: "#64748b", fontWeight: 600}}
                                            >
                                                Chưa có chỉ tiêu nào
                                            </Typography>
                                            <Typography variant="body2" sx={{color: "#94a3b8"}}>
                                                Thêm chỉ tiêu theo cơ sở và chương trình.
                                            </Typography>
                                            <Button
                                                variant="contained"
                                                startIcon={<AddIcon/>}
                                                onClick={handleOpenAdd}
                                                sx={{
                                                    mt: 1,
                                                    borderRadius: 2,
                                                    textTransform: "none",
                                                    fontWeight: 600,
                                                    background:
                                                        "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                                                }}
                                            >
                                                Thêm chỉ tiêu
                                            </Button>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredOfferings.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        hover
                                        sx={{
                                            "&:hover": {
                                                bgcolor: "rgba(122, 169, 235, 0.06)",
                                            },
                                        }}
                                    >
                                        <TableCell sx={{color: "#64748b"}}>
                                            {getCampusName(row.campusId)}
                                        </TableCell>
                                        <TableCell sx={{color: "#64748b"}}>
                                            {getProgramName(row.programId)}
                                        </TableCell>
                                        <TableCell sx={{color: "#64748b"}}>
                                            {getLearningModeLabel(row.learningMode)}
                                        </TableCell>
                                        <TableCell sx={{color: "#64748b"}}>
                                            {row.quota}
                                        </TableCell>
                                        <TableCell sx={{color: "#64748b"}}>
                                            {formatCurrency(row.tuitionFee)}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack
                                                direction="row"
                                                spacing={0.5}
                                                justifyContent="flex-end"
                                            >
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
                                                    onClick={() => handleOpenDeleteConfirm(row)}
                                                    sx={{
                                                        color: "#64748b",
                                                        "&:hover": {
                                                            color: "#dc2626",
                                                            bgcolor: "rgba(220, 38, 38, 0.08)",
                                                        },
                                                    }}
                                                    title="Xóa"
                                                >
                                                    <DeleteIcon fontSize="small"/>
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            {/* Add Offering Modal */}
            <Dialog
                open={addModalOpen}
                onClose={() => setAddModalOpen(false)}
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
                                Thêm chỉ tiêu
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b", mt: 0.5}}>
                                Thêm chỉ tiêu tuyển sinh cho chiến dịch này.
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={() => setAddModalOpen(false)}
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
                        <FormControl fullWidth size="small" error={!!formErrors.campusId}>
                            <InputLabel>Cơ sở</InputLabel>
                            <Select
                                name="campusId"
                                value={formValues.campusId}
                                label="Cơ sở"
                                onChange={handleChange}
                                sx={{borderRadius: 2}}
                            >
                                {MOCK_CAMPUSES.map((c) => (
                                    <MenuItem key={c.id} value={c.id}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                            {formErrors.campusId && (
                                <Typography variant="caption" color="error" sx={{mt: 0.5}}>
                                    {formErrors.campusId}
                                </Typography>
                            )}
                        </FormControl>
                        <FormControl fullWidth size="small" error={!!formErrors.programId}>
                            <InputLabel>Chương trình</InputLabel>
                            <Select
                                name="programId"
                                value={formValues.programId}
                                label="Chương trình"
                                onChange={handleChange}
                                sx={{borderRadius: 2}}
                            >
                                {MOCK_PROGRAMS.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>
                                        {p.name}
                                    </MenuItem>
                                ))}
                            </Select>
                            {formErrors.programId && (
                                <Typography variant="caption" color="error" sx={{mt: 0.5}}>
                                    {formErrors.programId}
                                </Typography>
                            )}
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <InputLabel>Hình thức học</InputLabel>
                            <Select
                                name="learningMode"
                                value={formValues.learningMode}
                                label="Hình thức học"
                                onChange={handleChange}
                                sx={{borderRadius: 2}}
                            >
                                {LEARNING_MODES.map((m) => (
                                    <MenuItem key={m.value} value={m.value}>
                                        {m.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Chỉ tiêu"
                            name="quota"
                            type="number"
                            fullWidth
                            value={formValues.quota}
                            onChange={handleChange}
                            error={!!formErrors.quota}
                            helperText={formErrors.quota}
                            inputProps={{min: 0}}
                        />
                        <TextField
                            label="Học phí (VNĐ)"
                            name="tuitionFee"
                            type="number"
                            fullWidth
                            value={formValues.tuitionFee}
                            onChange={handleChange}
                            inputProps={{min: 0}}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{px: 3, py: 2.5, borderTop: "1px solid #e2e8f0", gap: 1}}>
                    <Button
                        onClick={() => setAddModalOpen(false)}
                        variant="text"
                        color="inherit"
                        sx={{textTransform: "none", fontWeight: 500}}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleAddSubmit}
                        variant="contained"
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            px: 3,
                            background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                        }}
                    >
                        Thêm chỉ tiêu
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Offering Modal */}
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
                                Chỉnh sửa chỉ tiêu
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b", mt: 0.5}}>
                                Cập nhật thông tin chỉ tiêu tuyển sinh.
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
                        <FormControl fullWidth size="small">
                            <InputLabel>Cơ sở</InputLabel>
                            <Select
                                name="campusId"
                                value={formValues.campusId}
                                label="Cơ sở"
                                onChange={handleChange}
                                sx={{borderRadius: 2}}
                            >
                                {MOCK_CAMPUSES.map((c) => (
                                    <MenuItem key={c.id} value={c.id}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <InputLabel>Chương trình</InputLabel>
                            <Select
                                name="programId"
                                value={formValues.programId}
                                label="Chương trình"
                                onChange={handleChange}
                                sx={{borderRadius: 2}}
                            >
                                {MOCK_PROGRAMS.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>
                                        {p.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <InputLabel>Hình thức học</InputLabel>
                            <Select
                                name="learningMode"
                                value={formValues.learningMode}
                                label="Hình thức học"
                                onChange={handleChange}
                                sx={{borderRadius: 2}}
                            >
                                {LEARNING_MODES.map((m) => (
                                    <MenuItem key={m.value} value={m.value}>
                                        {m.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Chỉ tiêu"
                            name="quota"
                            type="number"
                            fullWidth
                            value={formValues.quota}
                            onChange={handleChange}
                            error={!!formErrors.quota}
                            helperText={formErrors.quota}
                            inputProps={{min: 0}}
                        />
                        <TextField
                            label="Học phí (VNĐ)"
                            name="tuitionFee"
                            type="number"
                            fullWidth
                            value={formValues.tuitionFee}
                            onChange={handleChange}
                            inputProps={{min: 0}}
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

            {/* Delete confirmation */}
            <Dialog
                open={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                PaperProps={{sx: {borderRadius: 3, p: 1}}}
            >
                <DialogTitle sx={{fontWeight: 700, color: "#1e293b"}}>
                    Xóa chỉ tiêu
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Bạn có chắc muốn xóa chỉ tiêu{" "}
                        <strong>
                            {selectedOffering &&
                                `${getCampusName(selectedOffering.campusId)} - ${getProgramName(selectedOffering.programId)}`}
                        </strong>
                        ?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{px: 3, pb: 2}}>
                    <Button onClick={() => setDeleteConfirmOpen(false)} color="inherit">
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteConfirm}
                        startIcon={<DeleteIcon/>}
                    >
                        Xóa
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
