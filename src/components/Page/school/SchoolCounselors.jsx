import React, {useState, useMemo, useEffect} from "react";
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
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Avatar,
} from "@mui/material";
import Pagination from "@mui/material/Pagination";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import CloseIcon from "@mui/icons-material/Close";
import {enqueueSnackbar} from "notistack";
import {fetchCounsellors, createCounsellor} from "../../../services/CounsellorService.jsx";

const InfoItem = ({ label, value }) => (
    <Box>
        <Typography variant="caption" sx={{color: "#94a3b8"}}>
            {label}
        </Typography>
        <Typography variant="body1" sx={{fontWeight: 600, color: "#1e293b"}}>
            {value}
        </Typography>
    </Box>
);

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

const _initialMockCounsellors = [
    {
        id: 1,
        fullName: "Nguyễn Thị Mai",
        email: "mai.nguyen@school.edu.vn",
        phone: "0901234567",
        specialty: "Tư vấn tuyển sinh THPT",
        shortBio: "5 năm kinh nghiệm tư vấn tuyển sinh.",
        avatar: null,
        status: "active",
    },
    {
        id: 2,
        fullName: "Trần Văn Minh",
        email: "minh.tran@school.edu.vn",
        phone: "0912345678",
        specialty: "Tư vấn chương trình quốc tế",
        shortBio: "Chuyên gia tư vấn chương trình song ngữ.",
        avatar: null,
        status: "active",
    },
    {
        id: 3,
        fullName: "Lê Thị Hương",
        email: "huong.le@school.edu.vn",
        phone: "0923456789",
        specialty: "Hỗ trợ phụ huynh",
        shortBio: "Tư vấn định hướng và hỗ trợ hồ sơ.",
        avatar: null,
        status: "inactive",
        campusName: "Cơ sở 1 - Quận 1",
        employeeCode: "MOCK-EMP-003",
        registerDate: "2024-03-10",
    },
];

const emptyForm = {
    email: "",
    status: true,
};

const mapCounsellorFromApi = (dto) => ({
    id: dto.id,
    fullName: dto.name || "",
    email: dto.account?.email || "",
    phone: "",
    specialty: "",
    shortBio: "",
    avatar: null,
    status: dto.account?.status === "ACCOUNT_ACTIVE" ? "active" : "inactive",
    campusName: dto.campusName,
    employeeCode: dto.employeeCode,
    registerDate: dto.account?.registerDate || "",
});

const formatDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return d;
    return date.toLocaleDateString("vi-VN");
};

export default function SchoolCounselors() {
    const [counselors, setCounselors] = useState([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
    const [selectedCounselor, setSelectedCounselor] = useState(null);
    const [formValues, setFormValues] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState({});
    const [page, setPage] = useState(0);
    const rowsPerPage = 10;
    const [totalItems, setTotalItems] = useState(0);
    const [_loading, setLoading] = useState(false);

    useEffect(() => {
        const loadCounsellors = async () => {
            setLoading(true);
            try {
                const res = await fetchCounsellors(page, rowsPerPage);
                const body = res?.data?.body;
                const list = body?.items;
                if (res && res.status === 200 && Array.isArray(list)) {
                    setCounselors(list.map(mapCounsellorFromApi));
                    setTotalItems(body?.totalItems ?? 0);
                } else {
                    setCounselors([]);
                    setTotalItems(0);
                }
            } catch (error) {
                console.error("Fetch counsellors error:", error);
                enqueueSnackbar("Không tải được danh sách tư vấn viên", {variant: "error"});
                setCounselors([]);
                setTotalItems(0);
            } finally {
                setLoading(false);
            }
        };

        loadCounsellors();
    }, [page]);

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormValues((prev) => ({...prev, [name]: value}));
    };

    const handleStatusToggle = (e) => {
        setFormValues((prev) => ({...prev, status: e.target.checked}));
    };

    const filteredCounselors = useMemo(() => {
        let list = counselors;
        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (c) =>
                    c.fullName?.toLowerCase().includes(q) ||
                    c.email?.toLowerCase().includes(q)
            );
        }
        if (statusFilter === "active") {
            list = list.filter((c) => c.status === "active");
        } else if (statusFilter === "inactive") {
            list = list.filter((c) => c.status === "inactive");
        }
        return list;
    }, [counselors, search, statusFilter]);

    const validateCreate = () => {
        const errors = {};
        if (!formValues.email?.trim()) errors.email = "Email là bắt buộc";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleOpenCreate = () => {
        setFormValues(emptyForm);
        setFormErrors({});
        setCreateModalOpen(true);
    };

    const handleCloseCreate = () => {
        setCreateModalOpen(false);
    };

    const handleCreateSubmit = async () => {
        if (!validateCreate()) return;
        try {
            const res = await createCounsellor(formValues.email.trim());
            const dto = res?.data?.body;
            if (res && res.status === 200 && dto) {
                const newCounsellor = mapCounsellorFromApi(dto);
                setCounselors((prev) => [newCounsellor, ...prev]);
                setTotalItems((prev) => prev + 1);
                enqueueSnackbar("Tạo tài khoản tư vấn viên thành công", {variant: "success"});
                setCreateModalOpen(false);
            } else {
                enqueueSnackbar("Không thể tạo tư vấn viên", {variant: "error"});
            }
        } catch (error) {
            console.error("Create counsellor error:", error);
            enqueueSnackbar("Lỗi khi tạo tư vấn viên", {variant: "error"});
        }
    };

    const handleOpenView = (counselor) => {
        setSelectedCounselor(counselor);
        setViewModalOpen(true);
    };

    const handleOpenEdit = (counselor) => {
        setSelectedCounselor(counselor);
        setFormValues({
            fullName: counselor.fullName || "",
            email: counselor.email || "",
            phone: counselor.phone || "",
            password: "",
            specialty: counselor.specialty || "",
            shortBio: counselor.shortBio || "",
            status: counselor.status === "active",
        });
        setFormErrors({});
        setEditModalOpen(true);
    };

    const handleEditSubmit = () => {
        if (!selectedCounselor) return;
        const errors = {};
        if (!formValues.fullName?.trim()) errors.fullName = "Họ tên là bắt buộc";
        if (!formValues.email?.trim()) errors.email = "Email là bắt buộc";
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setCounselors((prev) =>
            prev.map((c) =>
                c.id === selectedCounselor.id
                    ? {
                        ...c,
                        fullName: formValues.fullName.trim(),
                        email: formValues.email.trim(),
                        phone: formValues.phone?.trim() || "",
                        specialty: formValues.specialty?.trim() || "",
                        shortBio: formValues.shortBio?.trim() || "",
                        status: formValues.status ? "active" : "inactive",
                    }
                    : c
            )
        );
        enqueueSnackbar("Cập nhật tư vấn viên thành công", {variant: "success"});
        setEditModalOpen(false);
    };

    const handleOpenDisableConfirm = (counselor) => {
        setSelectedCounselor(counselor);
        setDisableConfirmOpen(true);
    };

    const handleDisableConfirm = () => {
        if (!selectedCounselor) return;
        setCounselors((prev) =>
            prev.map((c) =>
                c.id === selectedCounselor.id ? {...c, status: "inactive"} : c
            )
        );
        enqueueSnackbar("Đã vô hiệu hóa tài khoản tư vấn viên", {variant: "info"});
        setDisableConfirmOpen(false);
        setSelectedCounselor(null);
    };

    const getInitials = (name) => {
        if (!name?.trim()) return "?";
        return name
            .trim()
            .split(/\s+/)
            .map((s) => s[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
    };

    return (
        <Box sx={{display: "flex", flexDirection: "column", gap: 3, width: "100%"}}>
            {/* Header with gradient */}
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
                            Quản lý Tư vấn viên
                        </Typography>
                        <Typography variant="body2" sx={{mt: 0.5, opacity: 0.95}}>
                            Quản lý tài khoản tư vấn viên của trường
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
                        Tạo tài khoản tư vấn viên
                    </Button>
                </Box>
            </Box>

            {/* Search & Filter */}
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                }}
            >
                <CardContent sx={{p: 2.5}}>
                    <Stack
                        direction={{xs: "column", md: "row"}}
                        spacing={2}
                        alignItems={{xs: "stretch", md: "center"}}
                    >
                        <TextField
                            placeholder="Tìm theo tên hoặc email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            size="small"
                            sx={{
                                flex: 1,
                                maxWidth: {md: 360},
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2,
                                    bgcolor: "#f8fafc",
                                },
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{color: "#64748b"}}/>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <FormControl size="small" sx={{minWidth: 160}}>
                            <InputLabel>Trạng thái</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Trạng thái"
                                onChange={(e) => setStatusFilter(e.target.value)}
                                sx={{borderRadius: 2, bgcolor: "#f8fafc"}}
                            >
                                <MenuItem value="all">Tất cả</MenuItem>
                                <MenuItem value="active">Hoạt động</MenuItem>
                                <MenuItem value="inactive">Ngưng hoạt động</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </CardContent>
            </Card>

            {/* Table Card */}
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                    overflow: "hidden",
                }}
            >
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{bgcolor: "#f8fafc"}}>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Tư vấn viên
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Email
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Cơ sở
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
                            {filteredCounselors.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{py: 8}}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                gap: 1.5,
                                            }}
                                        >
                                            <SupportAgentIcon
                                                sx={{fontSize: 56, color: "#cbd5e1"}}
                                            />
                                            <Typography
                                                variant="h6"
                                                sx={{color: "#64748b", fontWeight: 600}}
                                            >
                                                Chưa có tư vấn viên nào
                                            </Typography>
                                            <Typography variant="body2" sx={{color: "#94a3b8"}}>
                                                {filteredCounselors.length === 0 && counselors.length > 0
                                                    ? "Không có kết quả phù hợp với tìm kiếm hoặc bộ lọc."
                                                    : "Tạo tài khoản tư vấn viên đầu tiên để bắt đầu."}
                                            </Typography>
                                            {counselors.length === 0 && (
                                                <Button
                                                    variant="contained"
                                                    startIcon={<AddIcon/>}
                                                    onClick={handleOpenCreate}
                                                    sx={{
                                                        mt: 1,
                                                        borderRadius: 2,
                                                        textTransform: "none",
                                                        fontWeight: 600,
                                                        background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                                                    }}
                                                >
                                                    Tạo tài khoản tư vấn viên
                                                </Button>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCounselors.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        hover
                                        sx={{
                                            "&:hover": {
                                                bgcolor: "rgba(122, 169, 235, 0.04)",
                                            },
                                        }}
                                    >
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={2}>
                                                <Avatar
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        bgcolor: "#7AA9EB",
                                                        fontSize: "0.875rem",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {getInitials(row.fullName)}
                                                </Avatar>
                                                <Typography
                                                    sx={{fontWeight: 600, color: "#1e293b"}}
                                                >
                                                    {row.fullName}
                                                </Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{color: "#64748b"}}>
                                            {row.email}
                                        </TableCell>
                                        <TableCell sx={{color: "#64748b"}}>
                                            {row.campusName || "—"}
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
                                                    bgcolor:
                                                        row.status === "active"
                                                            ? "rgba(34, 197, 94, 0.12)"
                                                            : "rgba(148, 163, 184, 0.2)",
                                                    color:
                                                        row.status === "active"
                                                            ? "#16a34a"
                                                            : "#64748b",
                                                }}
                                            >
                                                {row.status === "active" ? "Hoạt động" : "Ngưng hoạt động"}
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
                                                        "&:hover": {color: "#0D64DE", bgcolor: "rgba(13, 100, 222, 0.08)"},
                                                    }}
                                                    title="Xem"
                                                >
                                                    <VisibilityIcon fontSize="small"/>
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenEdit(row)}
                                                    sx={{
                                                        color: "#64748b",
                                                        "&:hover": {color: "#0D64DE", bgcolor: "rgba(13, 100, 222, 0.08)"},
                                                    }}
                                                    title="Sửa"
                                                >
                                                    <EditIcon fontSize="small"/>
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenDisableConfirm(row)}
                                                    disabled={row.status === "inactive"}
                                                    sx={{
                                                        color: "#64748b",
                                                        "&:hover": {color: "#dc2626", bgcolor: "rgba(220, 38, 38, 0.08)"},
                                                    }}
                                                    title="Vô hiệu hóa"
                                                >
                                                    <BlockIcon fontSize="small"/>
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {totalItems > 0 && (
                    <Box sx={{ borderTop: "1px solid #e2e8f0", px: 3, py: 1.5, display: "flex", justifyContent: "flex-end", bgcolor: "#f8fafc" }}>
                        <Pagination
                            count={Math.ceil(totalItems / rowsPerPage)}
                            page={page + 1}
                            onChange={(_, p) => setPage(p - 1)}
                            color="primary"
                            shape="rounded"
                        />
                    </Box>
                )}
            </Card>

            {/* Create Counselor Modal */}
            <Dialog
                open={createModalOpen}
                onClose={handleCloseCreate}
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
                                Tạo tài khoản tư vấn viên
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b", mt: 0.5}}>
                                Điền thông tin tư vấn viên mới bên dưới.
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={handleCloseCreate}
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
                            label="Email tư vấn viên"
                            name="email"
                            type="email"
                            fullWidth
                            value={formValues.email}
                            onChange={handleChange}
                            error={!!formErrors.email}
                            helperText={formErrors.email}
                            required
                        />
                        <Typography variant="body2" sx={{color: "#64748b", fontSize: 13}}>
                            Hệ thống sẽ tạo tài khoản với role <strong>COUNSELLOR</strong> dựa trên địa chỉ
                            email. Các thông tin khác (họ tên, mật khẩu, chuyên môn) sẽ được cập nhật sau khi
                            tư vấn viên đăng nhập lần đầu hoặc qua trang quản trị.
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{px: 3, py: 2.5, borderTop: "1px solid #e2e8f0", gap: 1}}>
                    <Button
                        onClick={handleCloseCreate}
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
                        Tạo
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Detail Modal */}
<Dialog
    open={viewModalOpen}
    onClose={() => setViewModalOpen(false)}
    maxWidth="sm"
    fullWidth
    PaperProps={{
        sx: {
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        },
    }}
    slotProps={{backdrop: {sx: modalBackdropSx}}}
>
    {/* HEADER */}
    <Box
        sx={{
            px: 3,
            py: 2.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #f1f5f9",
            background: "#fafafa",
        }}
    >
        <Typography variant="h6" sx={{fontWeight: 700}}>
            Chi tiết tư vấn viên
        </Typography>

        <IconButton
            onClick={() => setViewModalOpen(false)}
            size="small"
            sx={{
                bgcolor: "#f1f5f9",
                "&:hover": {bgcolor: "#e2e8f0"},
            }}
        >
            <CloseIcon fontSize="small"/>
        </IconButton>
    </Box>

    {/* CONTENT */}
    <DialogContent sx={{px: 3, py: 3}}>
        {selectedCounselor && (
            <Stack spacing={3}>
                {/* PROFILE */}
                <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                        sx={{
                            width: 64,
                            height: 64,
                            background:
                                "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                            fontWeight: 700,
                            fontSize: "1.4rem",
                        }}
                    >
                        {getInitials(selectedCounselor.fullName)}
                    </Avatar>

                    <Box>
                        <Typography variant="h6" sx={{fontWeight: 700}}>
                            {selectedCounselor.fullName}
                        </Typography>
                        <Typography variant="body2" sx={{color: "#64748b"}}>
                            {selectedCounselor.email}
                        </Typography>
                    </Box>
                </Stack>

                {/* INFO CARD */}
                <Box
                    sx={{
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: "#f8fafc",
                        border: "1px solid #f1f5f9",
                    }}
                >
                    <Stack spacing={2}>
                        <InfoItem
                            label="Cơ sở"
                            value={selectedCounselor.campusName || "—"}
                        />
                        <InfoItem
                            label="Mã nhân viên"
                            value={selectedCounselor.employeeCode || "—"}
                        />
                        <InfoItem
                            label="Ngày đăng ký"
                            value={formatDate(selectedCounselor.registerDate)}
                        />

                        {/* STATUS */}
                        <Box>
                            <Typography variant="caption" sx={{color: "#94a3b8"}}>
                                Trạng thái
                            </Typography>
                            <Box mt={1}>
                                <Box
                                    sx={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: "999px",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        bgcolor:
                                            selectedCounselor.status === "active"
                                                ? "#dcfce7"
                                                : "#f1f5f9",
                                        color:
                                            selectedCounselor.status === "active"
                                                ? "#16a34a"
                                                : "#64748b",
                                    }}
                                >
                                    ●{" "}
                                    {selectedCounselor.status === "active"
                                        ? "Hoạt động"
                                        : "Ngưng hoạt động"}
                                </Box>
                            </Box>
                        </Box>
                    </Stack>
                </Box>
            </Stack>
        )}
    </DialogContent>

    {/* FOOTER */}
    <DialogActions
        sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #f1f5f9",
        }}
    >
        <Button
            onClick={() => setViewModalOpen(false)}
            sx={{
                textTransform: "none",
                color: "#64748b",
                fontWeight: 500,
            }}
        >
            Đóng
        </Button>

        <Button
            variant="contained"
            startIcon={<EditIcon/>}
            onClick={() => {
                setViewModalOpen(false);
                handleOpenEdit(selectedCounselor);
            }}
            sx={{
                borderRadius: 2,
                px: 2.5,
                fontWeight: 600,
                background:
                    "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                boxShadow: "0 4px 14px rgba(13,100,222,0.4)",
                textTransform: "none",
                "&:hover": {
                    background:
                        "linear-gradient(135deg, #6b9be6 0%, #0b5ad1 100%)",
                },
            }}
        >
            Sửa thông tin
        </Button>
    </DialogActions>
</Dialog>

            {/* Edit Modal */}
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
                                Chỉnh sửa tư vấn viên
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b", mt: 0.5}}>
                                Cập nhật thông tin tư vấn viên.
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
                            label="Họ và tên"
                            name="fullName"
                            fullWidth
                            value={formValues.fullName}
                            onChange={handleChange}
                            error={!!formErrors.fullName}
                            helperText={formErrors.fullName}
                        />
                        <TextField
                            label="Email"
                            name="email"
                            type="email"
                            fullWidth
                            value={formValues.email}
                            onChange={handleChange}
                            error={!!formErrors.email}
                            helperText={formErrors.email}
                        />
                        <TextField
                            label="Số điện thoại"
                            name="phone"
                            fullWidth
                            value={formValues.phone}
                            onChange={handleChange}
                        />
                        <TextField
                            label="Chuyên môn / Lĩnh vực"
                            name="specialty"
                            fullWidth
                            value={formValues.specialty}
                            onChange={handleChange}
                        />
                        <TextField
                            label="Tiểu sử ngắn"
                            name="shortBio"
                            fullWidth
                            multiline
                            rows={3}
                            value={formValues.shortBio}
                            onChange={handleChange}
                        />
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <Typography sx={{fontWeight: 500}}>Trạng thái</Typography>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography
                                    variant="body2"
                                    sx={{color: formValues.status ? "#16a34a" : "#94a3b8"}}
                                >
                                    {formValues.status ? "Hoạt động" : "Ngưng hoạt động"}
                                </Typography>
                                <Switch
                                    checked={formValues.status}
                                    onChange={handleStatusToggle}
                                    sx={{
                                        "& .MuiSwitch-switchBase.Mui-checked": {color: "#0D64DE"},
                                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                            backgroundColor: "#0D64DE",
                                        },
                                    }}
                                />
                            </Stack>
                        </Box>
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

            {/* Disable confirmation dialog */}
            <Dialog
                open={disableConfirmOpen}
                onClose={() => setDisableConfirmOpen(false)}
                PaperProps={{sx: {borderRadius: 3, p: 1}}}
            >
                <DialogTitle sx={{display: "flex", alignItems: "center", gap: 1}}>
                    <PersonOffIcon color="error"/> Vô hiệu hóa tài khoản tư vấn viên
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Bạn có chắc muốn vô hiệu hóa tài khoản của{" "}
                        <strong>{selectedCounselor?.fullName}</strong>? Tư vấn viên này sẽ không thể
                        đăng nhập hoặc truy cập hệ thống nữa.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{px: 3, pb: 2}}>
                    <Button onClick={() => setDisableConfirmOpen(false)} color="inherit">
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDisableConfirm}
                        startIcon={<BlockIcon/>}
                    >
                        Vô hiệu hóa
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
