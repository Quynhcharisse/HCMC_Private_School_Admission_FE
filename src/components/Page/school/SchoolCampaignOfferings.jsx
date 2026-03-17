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
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ListIcon from "@mui/icons-material/List";
import CloseIcon from "@mui/icons-material/Close";
import {useNavigate, useParams, useLocation} from "react-router-dom";
import {enqueueSnackbar} from "notistack";
import {listCampuses} from "../../../services/CampusService.jsx";
import {
    getCampaignOfferingsByCampus,
    createCampaignOffering,
} from "../../../services/CampaignService.jsx";

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
    { value: "DAY_SCHOOL", label: "Bán trú" },
    { value: "BOARDING", label: "Nội trú" },
];

const APPLICATION_STATUS_OPTIONS = [
    { value: "OPEN", label: "Đang mở" },
    { value: "CLOSED", label: "Đã đóng" },
];

/** Placeholder until program list API exists */
const PROGRAMS_PLACEHOLDER = [
    { id: 1, name: "Lớp 10 - Chương trình chuẩn" },
    { id: 2, name: "Lớp 10 - Chương trình nâng cao" },
    { id: 3, name: "Lớp 6 - Chương trình chuẩn" },
];

const emptyForm = {
    campusId: "",
    programId: "",
    learningMode: "DAY_SCHOOL",
    quota: "",
    tuitionFee: "",
    applicationStatus: "OPEN",
    openDate: "",
    closeDate: "",
};

function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN");
}

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
    const { campaignId } = useParams();
    const location = useLocation();
    const campaignFromState = location.state?.campaign;

    const [campuses, setCampuses] = useState([]);
    const [campusesLoading, setCampusesLoading] = useState(true);
    const [campusFilter, setCampusFilter] = useState("");
    const [offerings, setOfferings] = useState([]);
    const [offeringsLoading, setOfferingsLoading] = useState(false);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [formValues, setFormValues] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState({});

    const campaignName = campaignFromState?.name || `Chiến dịch #${campaignId || "—"}`;
    const campaignIdNum = campaignId ? parseInt(campaignId, 10) : 0;

    useEffect(() => {
        let cancelled = false;
        setCampusesLoading(true);
        listCampuses()
            .then((res) => {
                if (cancelled) return;
                const list = res?.data?.body ?? res?.data;
                const arr = Array.isArray(list)
                    ? list.map((c) => ({ id: c.id ?? c.campusId, name: c.name ?? "Cơ sở" }))
                    : [];
                setCampuses(arr);
                if (arr.length > 0 && !campusFilter) setCampusFilter(String(arr[0].id));
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("Fetch campuses error:", err);
                enqueueSnackbar("Không tải được danh sách cơ sở", { variant: "error" });
            })
            .finally(() => {
                if (!cancelled) setCampusesLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!campusFilter || !campaignIdNum) {
            setOfferings([]);
            return;
        }
        let cancelled = false;
        setOfferingsLoading(true);
        getCampaignOfferingsByCampus(parseInt(campusFilter, 10), campaignIdNum)
            .then((res) => {
                if (cancelled) return;
                const list = res?.data?.body ?? res?.data;
                setOfferings(Array.isArray(list) ? list : []);
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("Fetch offerings error:", err);
                enqueueSnackbar("Không tải được danh sách chỉ tiêu", { variant: "error" });
                setOfferings([]);
            })
            .finally(() => {
                if (!cancelled) setOfferingsLoading(false);
            });
        return () => { cancelled = true; };
    }, [campusFilter, campaignIdNum]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormValues((prev) => ({ ...prev, [name]: value }));
    };

    const getCampusName = (id) => campuses.find((c) => String(c.id) === String(id))?.name ?? id;
    const getProgramName = (id) =>
        PROGRAMS_PLACEHOLDER.find((p) => p.id === Number(id))?.name ?? id ?? "—";
    const getLearningModeLabel = (mode) =>
        LEARNING_MODES.find((m) => m.value === mode)?.label ?? mode;
    const getApplicationStatusLabel = (s) =>
        APPLICATION_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s ?? "—";

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
        setFormValues({
            ...emptyForm,
            campusId: campusFilter || (campuses[0]?.id != null ? String(campuses[0].id) : ""),
        });
        setFormErrors({});
        setAddModalOpen(true);
    };

    const handleAddSubmit = async () => {
        if (!validateForm() || !campaignIdNum) return;
        setSubmitLoading(true);
        try {
            const res = await createCampaignOffering({
                admissionCampaignId: campaignIdNum,
                campusId: Number(formValues.campusId),
                programId: Number(formValues.programId),
                quota: Number(formValues.quota) || 0,
                learningMode: formValues.learningMode || "DAY_SCHOOL",
                tuitionFee: Number(formValues.tuitionFee) || 0,
                applicationStatus: formValues.applicationStatus || "OPEN",
                openDate: formValues.openDate || new Date().toISOString().slice(0, 10),
                closeDate: formValues.closeDate || new Date().toISOString().slice(0, 10),
            });
            if (res?.status === 200 || res?.data) {
                enqueueSnackbar("Tạo chỉ tiêu thành công", { variant: "success" });
                setAddModalOpen(false);
                const refetch = await getCampaignOfferingsByCampus(
                    parseInt(campusFilter, 10),
                    campaignIdNum
                );
                const list = refetch?.data?.body ?? refetch?.data;
                setOfferings(Array.isArray(list) ? list : []);
            } else {
                enqueueSnackbar(res?.data?.message || "Tạo chỉ tiêu thất bại", { variant: "error" });
            }
        } catch (err) {
            enqueueSnackbar(err?.response?.data?.message || "Tạo chỉ tiêu thất bại", {
                variant: "error",
            });
        } finally {
            setSubmitLoading(false);
        }
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

            {/* Select campus */}
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                    bgcolor: "#F8FAFC",
                }}
            >
                <CardContent sx={{ p: 2.5 }}>
                    <FormControl size="small" sx={{ minWidth: 240 }} disabled={campusesLoading}>
                        <InputLabel>Chọn cơ sở</InputLabel>
                        <Select
                            value={campusFilter}
                            label="Chọn cơ sở"
                            onChange={(e) => setCampusFilter(e.target.value)}
                            sx={{ borderRadius: 2, bgcolor: "white" }}
                        >
                            {campuses.map((c) => (
                                <MenuItem key={c.id} value={String(c.id)}>
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
                            <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>
                                    Chương trình
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>
                                    Hình thức học
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>
                                    Chỉ tiêu
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>
                                    Học phí
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>
                                    Trạng thái hồ sơ
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>
                                    Ngày mở
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>
                                    Ngày đóng
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {offeringsLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton variant="text" width="70%" /></TableCell>
                                        <TableCell><Skeleton variant="text" width={60} /></TableCell>
                                        <TableCell><Skeleton variant="text" width={40} /></TableCell>
                                        <TableCell><Skeleton variant="text" width={80} /></TableCell>
                                        <TableCell><Skeleton variant="text" width={50} /></TableCell>
                                        <TableCell><Skeleton variant="text" width={70} /></TableCell>
                                        <TableCell><Skeleton variant="text" width={70} /></TableCell>
                                    </TableRow>
                                ))
                            ) : offerings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                gap: 1.5,
                                            }}
                                        >
                                            <ListIcon sx={{ fontSize: 56, color: "#cbd5e1" }} />
                                            <Typography variant="h6" sx={{ color: "#64748b", fontWeight: 600 }}>
                                                Chưa có chỉ tiêu nào
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                                                Thêm chỉ tiêu theo cơ sở và chương trình.
                                            </Typography>
                                            <Button
                                                variant="contained"
                                                startIcon={<AddIcon />}
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
                                offerings.map((row) => (
                                    <TableRow
                                        key={row.id ?? row.admissionCampaignOfferingId ?? Math.random()}
                                        hover
                                        sx={{
                                            "&:hover": { bgcolor: "rgba(122, 169, 235, 0.06)" },
                                        }}
                                    >
                                        <TableCell sx={{ color: "#64748b" }}>
                                            {row.programName ?? getProgramName(row.programId)}
                                        </TableCell>
                                        <TableCell sx={{ color: "#64748b" }}>
                                            {getLearningModeLabel(row.learningMode)}
                                        </TableCell>
                                        <TableCell sx={{ color: "#64748b" }}>{row.quota}</TableCell>
                                        <TableCell sx={{ color: "#64748b" }}>
                                            {formatCurrency(row.tuitionFee)}
                                        </TableCell>
                                        <TableCell sx={{ color: "#64748b" }}>
                                            {getApplicationStatusLabel(row.applicationStatus)}
                                        </TableCell>
                                        <TableCell sx={{ color: "#64748b" }}>
                                            {formatDate(row.openDate)}
                                        </TableCell>
                                        <TableCell sx={{ color: "#64748b" }}>
                                            {formatDate(row.closeDate)}
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
                <DialogContent dividers={false} sx={{ px: 3, pt: 2, pb: 1 }}>
                    <Stack spacing={2.5}>
                        <FormControl fullWidth size="small" error={!!formErrors.campusId}>
                            <InputLabel>Cơ sở</InputLabel>
                            <Select
                                name="campusId"
                                value={formValues.campusId}
                                label="Cơ sở"
                                onChange={handleChange}
                                sx={{ borderRadius: 2 }}
                            >
                                {campuses.map((c) => (
                                    <MenuItem key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                            {formErrors.campusId && (
                                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
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
                                sx={{ borderRadius: 2 }}
                            >
                                {PROGRAMS_PLACEHOLDER.map((p) => (
                                    <MenuItem key={p.id} value={String(p.id)}>
                                        {p.name}
                                    </MenuItem>
                                ))}
                            </Select>
                            {formErrors.programId && (
                                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
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
                                sx={{ borderRadius: 2 }}
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
                            inputProps={{ min: 0 }}
                        />
                        <TextField
                            label="Học phí (VNĐ)"
                            name="tuitionFee"
                            type="number"
                            fullWidth
                            value={formValues.tuitionFee}
                            onChange={handleChange}
                            inputProps={{ min: 0 }}
                        />
                        <FormControl fullWidth size="small">
                            <InputLabel>Trạng thái hồ sơ</InputLabel>
                            <Select
                                name="applicationStatus"
                                value={formValues.applicationStatus}
                                label="Trạng thái hồ sơ"
                                onChange={handleChange}
                                sx={{ borderRadius: 2 }}
                            >
                                {APPLICATION_STATUS_OPTIONS.map((o) => (
                                    <MenuItem key={o.value} value={o.value}>
                                        {o.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Ngày mở"
                            name="openDate"
                            type="date"
                            fullWidth
                            value={formValues.openDate}
                            onChange={handleChange}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label="Ngày đóng"
                            name="closeDate"
                            type="date"
                            fullWidth
                            value={formValues.closeDate}
                            onChange={handleChange}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2.5, borderTop: "1px solid #e2e8f0", gap: 1 }}>
                    <Button
                        onClick={() => setAddModalOpen(false)}
                        variant="text"
                        color="inherit"
                        sx={{ textTransform: "none", fontWeight: 500 }}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleAddSubmit}
                        variant="contained"
                        disabled={submitLoading}
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            px: 3,
                            background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                        }}
                    >
                        {submitLoading ? "Đang tạo…" : "Tạo chỉ tiêu"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
