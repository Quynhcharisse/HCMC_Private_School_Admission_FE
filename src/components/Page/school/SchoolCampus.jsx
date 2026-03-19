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
} from "@mui/material";
import Pagination from "@mui/material/Pagination";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import ApartmentIcon from "@mui/icons-material/Apartment";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import CloseIcon from "@mui/icons-material/Close";
import {enqueueSnackbar} from "notistack";
import {useSchool} from "../../../contexts/SchoolContext.jsx";
import {listCampuses, createCampus} from "../../../services/CampusService.jsx";

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

const initialMockCampuses = [
    {
        id: 1,
        name: "Cơ sở 1 - Quận 1",
        address: "123 Nguyễn Huệ, Phường Bến Nghé",
        city: "Quận 1",
        district: "Quận 1",
        phone: "028 3822 1234",
        email: "campus1@school.edu.vn",
        description: "Cơ sở chính, gần trung tâm thành phố.",
        imageUrl: null,
        status: "active",
        counselorCount: 3,
    },
    {
        id: 2,
        name: "Cơ sở 2 - Bình Thạnh",
        address: "456 Điện Biên Phủ, Phường 25",
        city: "Bình Thạnh",
        district: "Bình Thạnh",
        phone: "028 3899 5678",
        email: "campus2@school.edu.vn",
        description: "Cơ sở mở rộng, khu vực phía Bắc.",
        imageUrl: null,
        status: "active",
        counselorCount: 2,
    },
    {
        id: 3,
        name: "Cơ sở 3 - Thủ Đức",
        address: "789 Võ Văn Ngân, Phường Linh Chiểu",
        city: "Thủ Đức",
        district: "Thủ Đức",
        phone: "028 3726 9012",
        email: "campus3@school.edu.vn",
        description: "Cơ sở tại thành phố Thủ Đức.",
        imageUrl: null,
        status: "inactive",
        counselorCount: 0,
    },
];

const BOARDING_TYPE_OPTIONS = [
    { value: "NONE", label: "Không nội trú" },
    { value: "FULL_BOARDING", label: "Nội trú toàn phần" },
    { value: "SEMI_BOARDING", label: "Nội trú bán phần" },
    { value: "BOTH", label: "Cả hai" },
];

const emptyForm = {
    name: "",
    address: "",
    city: "",
    district: "",
    phone: "",
    email: "",
    latitude: "",
    longitude: "",
    boardingType: "NONE",
    description: "",
    imageFile: null,
    imagePreview: null,
    status: true,
};

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='60' viewBox='0 0 80 60' fill='%23e2e8f0'%3E%3Crect width='80' height='60' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%2394a3b8'%3ECampus%3C/text%3E%3C/svg%3E";

const formatDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return d;
    return date.toLocaleDateString("vi-VN");
};

const getBoardingTypeLabelVi = (boardingType, boardingTypeLabel) => {
    const match = BOARDING_TYPE_OPTIONS.find((o) => o.value === boardingType);
    if (match) return match.label;
    return boardingTypeLabel || "—";
};

export default function SchoolCampus() {
    const { isPrimaryBranch } = useSchool();
    const [campuses, setCampuses] = useState([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [districtFilter, setDistrictFilter] = useState("all");
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
    const [selectedCampus, setSelectedCampus] = useState(null);
    const [formValues, setFormValues] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState({});
    const [page, setPage] = useState(0);
    const rowsPerPage = 10;

    const districts = useMemo(() => {
        const set = new Set(campuses.map((c) => c.district).filter(Boolean));
        return Array.from(set).sort();
    }, [campuses]);

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormValues((prev) => ({...prev, [name]: value}));
    };

    const handleStatusToggle = (e) => {
        setFormValues((prev) => ({...prev, status: e.target.checked}));
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const preview = URL.createObjectURL(file);
        setFormValues((prev) => ({
            ...prev,
            imageFile: file,
            imagePreview: preview,
        }));
    };

    const clearImagePreview = () => {
        if (formValues.imagePreview) {
            URL.revokeObjectURL(formValues.imagePreview);
        }
        setFormValues((prev) => ({
            ...prev,
            imageFile: null,
            imagePreview: null,
        }));
    };

    const filteredCampuses = useMemo(() => {
        let list = campuses;
        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (c) =>
                    c.name?.toLowerCase().includes(q) ||
                    c.address?.toLowerCase().includes(q)
            );
        }
        if (statusFilter === "active") {
            list = list.filter((c) => c.status === "active");
        } else if (statusFilter === "inactive") {
            list = list.filter((c) => c.status === "inactive");
        }
        if (districtFilter !== "all") {
            list = list.filter((c) => c.district === districtFilter);
        }
        return list;
    }, [campuses, search, statusFilter, districtFilter]);

    const paginatedCampuses = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredCampuses.slice(start, start + rowsPerPage);
    }, [filteredCampuses, page]);

    const validateForm = () => {
        const errors = {};
        if (!formValues.name?.trim()) errors.name = "Tên cơ sở là bắt buộc";
        if (!formValues.email?.trim()) errors.email = "Email là bắt buộc";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const mapCampusFromApi = (dto, account) => ({
        id: dto.id,
        name: dto.name,
        address: dto.address,
        city: dto.city ?? "",
        district: dto.district ?? "",
        latitude: dto.latitude,
        longitude: dto.longitude,
        boardingType: dto.boardingType ?? "NONE",
        boardingTypeLabel: dto.boardingTypeLabel ?? "",
        phone: dto.phoneNumber,
        email: account?.email ?? "",
        description: "",
        imageUrl: null,
        isPrimaryBranch: dto.isPrimaryBranch ?? false,
        campusStatus: dto.status,
        status: dto.status === "VERIFIED" ? "active" : "inactive",
        accountStatus: account?.status ?? "",
        accountRegisterDate: account?.registerDate ?? "",
        counselorCount: 0,
    });

    useEffect(() => {
        const loadCampuses = async () => {
            try {
                const res = await listCampuses();
                const list = res?.data?.body;
                if (res && res.status === 200 && Array.isArray(list)) {
                    // Mỗi phần tử body đã chứa cả campus và account
                    setCampuses(list.map((dto) => mapCampusFromApi(dto, dto.account)));
                } else {
                    setCampuses(initialMockCampuses);
                }
            } catch (error) {
                console.error("Fetch campuses error:", error);
                enqueueSnackbar("Không tải được danh sách cơ sở", {variant: "error"});
                setCampuses(initialMockCampuses);
            }
        };

        loadCampuses();
    }, []);

    const handleOpenCreate = () => {
        setSelectedCampus(null);
        setFormValues(emptyForm);
        setFormErrors({});
        setCreateModalOpen(true);
    };

    const handleCloseCreate = () => {
        clearImagePreview();
        setCreateModalOpen(false);
    };

    const handleCreateSubmit = async () => {
        if (!validateForm()) return;

        try {
            const res = await createCampus({
                email: formValues.email.trim(),
                name: formValues.name.trim(),
                address: formValues.address?.trim() || "",
                phone: formValues.phone?.trim() || "",
                city: formValues.city?.trim() || undefined,
                district: formValues.district?.trim() || undefined,
                latitude: formValues.latitude !== "" ? formValues.latitude : undefined,
                longitude: formValues.longitude !== "" ? formValues.longitude : undefined,
                boardingType: formValues.boardingType || "NONE",
            });

            const body = res?.data?.body;
            if (res && res.status === 200 && body?.campus) {
                const account = body.campus.account ?? body.account;
                const newCampus = mapCampusFromApi(body.campus, account);
                setCampuses((prev) => [newCampus, ...prev]);
                enqueueSnackbar("Tạo cơ sở thành công", {variant: "success"});
                handleCloseCreate();
            } else {
                enqueueSnackbar("Không thể tạo cơ sở", {variant: "error"});
            }
        } catch (error) {
            console.error("Create campus error:", error);
            enqueueSnackbar("Lỗi khi tạo cơ sở", {variant: "error"});
        }
    };

    const handleOpenView = (campus) => {
        setSelectedCampus(campus);
        setViewModalOpen(true);
    };

    const handleOpenEdit = (campus) => {
        setSelectedCampus(campus);
        setFormValues({
            name: campus.name || "",
            address: campus.address || "",
            city: campus.city || "",
            district: campus.district || "",
            phone: campus.phone || "",
            email: campus.email || "",
            latitude: campus.latitude ?? "",
            longitude: campus.longitude ?? "",
            boardingType: campus.boardingType || "NONE",
            description: campus.description || "",
            imageFile: null,
            imagePreview: campus.imageUrl || null,
            status: campus.status === "active",
        });
        setFormErrors({});
        setEditModalOpen(true);
    };

    const getPayload = () => {
        const latitude = formValues.latitude !== "" ? Number(formValues.latitude) : undefined;
        const longitude = formValues.longitude !== "" ? Number(formValues.longitude) : undefined;

        return {
            name: formValues.name?.trim() || "",
            address: formValues.address?.trim() || "",
            city: formValues.city?.trim() || "",
            district: formValues.district?.trim() || "",
            phone: formValues.phone?.trim() || "",
            email: formValues.email?.trim() || "",
            latitude: latitude !== undefined && Number.isNaN(latitude) ? undefined : latitude,
            longitude: longitude !== undefined && Number.isNaN(longitude) ? undefined : longitude,
            boardingType: formValues.boardingType || "NONE",
            description: formValues.description?.trim() || "",
            imageUrl: formValues.imagePreview ?? selectedCampus?.imageUrl ?? null,
            status: formValues.status ? "active" : "inactive",
        };
    };

    const handleEditSubmit = () => {
        if (!selectedCampus || !validateForm()) return;
        const payload = getPayload();
        setCampuses((prev) =>
            prev.map((c) =>
                c.id === selectedCampus.id ? {...c, ...payload} : c
            )
        );
        enqueueSnackbar("Cập nhật cơ sở thành công", {variant: "success"});
        setEditModalOpen(false);
    };

    const handleOpenDisableConfirm = (campus) => {
        setSelectedCampus(campus);
        setDisableConfirmOpen(true);
    };

    const handleDisableConfirm = () => {
        if (!selectedCampus) return;
        setCampuses((prev) =>
            prev.map((c) =>
                c.id === selectedCampus.id ? {...c, status: "inactive"} : c
            )
        );
        enqueueSnackbar("Đã vô hiệu hóa cơ sở", {variant: "info"});
        setDisableConfirmOpen(false);
        setSelectedCampus(null);
    };

    return (
        <Box sx={{display: "flex", flexDirection: "column", gap: 3, width: "100%"}}>
            {/* Page Header */}
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
                            Quản lý Cơ sở
                        </Typography>
                        <Typography variant="body2" sx={{mt: 0.5, opacity: 0.95}}>
                            {isPrimaryBranch
                                ? "Quản lý tất cả cơ sở của trường bạn"
                                : "Xem thông tin cơ sở của bạn"}
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
                            Tạo cơ sở
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Search & Filter */}
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
                            placeholder="Tìm theo tên hoặc địa chỉ..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            size="small"
                            sx={{
                                flex: 1,
                                minWidth: 200,
                                maxWidth: {md: 320},
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2,
                                    bgcolor: "white",
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
                        <FormControl size="small" sx={{minWidth: 140}}>
                            <InputLabel>Trạng thái</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Trạng thái"
                                onChange={(e) => setStatusFilter(e.target.value)}
                                sx={{borderRadius: 2, bgcolor: "white"}}
                            >
                                <MenuItem value="all">Tất cả</MenuItem>
                                <MenuItem value="active">Hoạt động</MenuItem>
                                <MenuItem value="inactive">Ngưng hoạt động</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{minWidth: 160}}>
                            <InputLabel>Quận / Khu vực</InputLabel>
                            <Select
                                value={districtFilter}
                                label="Quận / Khu vực"
                                onChange={(e) => setDistrictFilter(e.target.value)}
                                sx={{borderRadius: 2, bgcolor: "white"}}
                            >
                                <MenuItem value="all">Tất cả</MenuItem>
                                {districts.map((district) => (
                                    <MenuItem key={district} value={district}>
                                        {district}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </CardContent>
            </Card>

            {/* Campus Table */}
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
                                    Địa chỉ
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Số điện thoại
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Chi nhánh chính
                                </TableCell>
                                <TableCell sx={{fontWeight: 700, color: "#1e293b", py: 2}}>
                                    Trạng thái cơ sở
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
                            {paginatedCampuses.length === 0 ? (
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
                                            <ApartmentIcon
                                                sx={{fontSize: 56, color: "#cbd5e1"}}
                                            />
                                            <Typography
                                                variant="h6"
                                                sx={{color: "#64748b", fontWeight: 600}}
                                            >
                                                Chưa có cơ sở nào
                                            </Typography>
                                            <Typography variant="body2" sx={{color: "#94a3b8"}}>
                                                {filteredCampuses.length === 0 && campuses.length > 0
                                                    ? "Không có kết quả phù hợp với tìm kiếm hoặc bộ lọc."
                                                    : isPrimaryBranch
                                                        ? "Tạo cơ sở đầu tiên để bắt đầu."
                                                        : "Chưa có dữ liệu cơ sở."}
                                            </Typography>
                                            {campuses.length === 0 && isPrimaryBranch && (
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
                                                    Tạo cơ sở
                                                </Button>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedCampuses.map((row) => (
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
                                            <Stack direction="row" alignItems="center" spacing={2}>
                                                <Box
                                                    component="img"
                                                    src={row.imageUrl || PLACEHOLDER_IMAGE}
                                                    alt={row.name}
                                                    sx={{
                                                        width: 56,
                                                        height: 42,
                                                        borderRadius: 1.5,
                                                        objectFit: "cover",
                                                        border: "1px solid #e2e8f0",
                                                    }}
                                                />
                                                <Typography
                                                    sx={{fontWeight: 600, color: "#1e293b"}}
                                                >
                                                    {row.name}
                                                </Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{color: "#64748b", maxWidth: 200}}>
                                            <Typography noWrap title={row.address}>
                                                {row.address || "—"}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{color: "#64748b"}}>
                                            {row.phone || "—"}
                                        </TableCell>
                                        <TableCell sx={{color: "#64748b"}}>
                                            {row.isPrimaryBranch ? "Có" : "Không"}
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
                                                {row.status === "active" ? "Xác thực" : "Chưa xác thực"}
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
                                                    title="Xem chi tiết"
                                                >
                                                    <VisibilityIcon fontSize="small"/>
                                                </IconButton>
                                                {isPrimaryBranch && (
                                                    <>
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
                                                    </>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {filteredCampuses.length > 0 && (
                    <Box sx={{ borderTop: "1px solid #e2e8f0", bgcolor: "#f8fafc", px: 3, py: 1.5, display: "flex", justifyContent: "flex-end" }}>
                        <Pagination
                            count={Math.ceil(filteredCampuses.length / rowsPerPage)}
                            page={page + 1}
                            onChange={(_, p) => setPage(p - 1)}
                            color="primary"
                            shape="rounded"
                        />
                    </Box>
                )}
            </Card>

            {/* Create Campus Modal */}
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
                                Tạo cơ sở
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b", mt: 0.5}}>
                                Điền thông tin cơ sở mới bên dưới.
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
                            label="Tên cơ sở"
                            name="name"
                            fullWidth
                            value={formValues.name}
                            onChange={handleChange}
                            error={!!formErrors.name}
                            helperText={formErrors.name}
                            required
                        />
                        <TextField
                            label="Địa chỉ"
                            name="address"
                            fullWidth
                            value={formValues.address}
                            onChange={handleChange}
                            placeholder="8, Hồ Đắc Di, Tây Thạnh Tân Phú, TP Hồ Chí Minh"
                        />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                label="Thành phố"
                                name="city"
                                fullWidth
                                value={formValues.city}
                                onChange={handleChange}
                                placeholder="TP Hồ Chí Minh"
                            />
                            <TextField
                                label="Quận / Huyện"
                                name="district"
                                fullWidth
                                value={formValues.district}
                                onChange={handleChange}
                                placeholder="Tân Phú"
                            />
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                label="Vĩ độ"
                                name="latitude"
                                type="number"
                                fullWidth
                                value={formValues.latitude}
                                onChange={handleChange}
                                placeholder="10.8012"
                                inputProps={{ step: "any" }}
                            />
                            <TextField
                                label="Kinh độ"
                                name="longitude"
                                type="number"
                                fullWidth
                                value={formValues.longitude}
                                onChange={handleChange}
                                placeholder="106.7104"
                                inputProps={{ step: "any" }}
                            />
                        </Stack>
                        <FormControl fullWidth>
                            <InputLabel>Loại nội trú</InputLabel>
                            <Select
                                name="boardingType"
                                value={formValues.boardingType}
                                label="Loại nội trú"
                                onChange={handleChange}
                            >
                                {BOARDING_TYPE_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Số điện thoại"
                            name="phone"
                            fullWidth
                            value={formValues.phone}
                            onChange={handleChange}
                            placeholder="0983810915"
                        />
                        <TextField
                            label="Email quản lý cơ sở"
                            name="email"
                            type="email"
                            fullWidth
                            value={formValues.email}
                            onChange={handleChange}
                            error={!!formErrors.email}
                            helperText={formErrors.email}
                            placeholder="truonghongductphcm@gmail.com"
                            required
                        />
                        <Typography variant="body2" sx={{color: "#64748b", fontSize: 13}}>
                            Hệ thống sẽ tạo cơ sở mới và tài khoản quản lý tương ứng với role{" "}
                            <strong>SCHOOL</strong> dựa trên email này.
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
                        Tạo cơ sở
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Details Modal */}
            <Dialog
                open={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{sx: {borderRadius: 3}}}
            >
                <DialogTitle sx={{fontWeight: 700, color: "#1e293b"}}>
                    Chi tiết cơ sở
                </DialogTitle>
                <DialogContent dividers>
                    {selectedCampus && (
                        <Stack spacing={2}>
                            <Box
                                component="img"
                                src={selectedCampus.imageUrl || PLACEHOLDER_IMAGE}
                                alt={selectedCampus.name}
                                sx={{
                                    width: "100%",
                                    maxHeight: 200,
                                    borderRadius: 2,
                                    objectFit: "cover",
                                    border: "1px solid #e2e8f0",
                                }}
                            />
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Tên cơ sở
                                </Typography>
                                <Typography variant="h6" sx={{fontWeight: 600}}>
                                    {selectedCampus.name}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Địa chỉ
                                </Typography>
                                <Typography variant="body1">
                                    {selectedCampus.address || "—"}
                                </Typography>
                            </Box>
                            {(selectedCampus.city || selectedCampus.district) && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Thành phố / Quận
                                    </Typography>
                                    <Typography variant="body1">
                                        {[selectedCampus.city, selectedCampus.district].filter(Boolean).join(" / ") || "—"}
                                    </Typography>
                                </Box>
                            )}
                            {(selectedCampus.latitude != null || selectedCampus.longitude != null) && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Tọa độ
                                    </Typography>
                                    <Typography variant="body1">
                                        {[selectedCampus.latitude, selectedCampus.longitude].filter((v) => v != null && v !== "").join(", ") || "—"}
                                    </Typography>
                                </Box>
                            )}
                            {(selectedCampus.boardingType || selectedCampus.boardingTypeLabel) && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Loại nội trú
                                    </Typography>
                                    <Typography variant="body1">
                                        {getBoardingTypeLabelVi(
                                            selectedCampus.boardingType,
                                            selectedCampus.boardingTypeLabel
                                        )}
                                    </Typography>
                                </Box>
                            )}
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Số điện thoại
                                </Typography>
                                <Typography variant="body1">
                                    {selectedCampus.phone || "—"}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Email
                                </Typography>
                                <Typography variant="body1">
                                    {selectedCampus.email || "—"}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Chi nhánh chính
                                </Typography>
                                <Typography variant="body1">
                                    {selectedCampus.isPrimaryBranch ? "Có" : "Không"}
                                </Typography>
                            </Box>
                            <Box sx={{display: "flex", gap: 2, alignItems: "center"}}>
                                <Typography variant="caption" color="text.secondary">
                                    Trạng thái cơ sở
                                </Typography>
                                <Box
                                    component="span"
                                    sx={{
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: 999,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        bgcolor:
                                            selectedCampus.status === "active"
                                                ? "rgba(34, 197, 94, 0.12)"
                                                : "rgba(148, 163, 184, 0.2)",
                                        color:
                                            selectedCampus.status === "active"
                                                ? "#16a34a"
                                                : "#64748b",
                                    }}
                                >
                                    {selectedCampus.status === "active" ? "Xác thực" : "Chưa xác thực"}
                                </Box>
                            </Box>
                            <Box sx={{display: "flex", gap: 2, alignItems: "center"}}>
                                <Typography variant="caption" color="text.secondary">
                                    Trạng thái tài khoản
                                </Typography>
                                <Box
                                    component="span"
                                    sx={{
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: 999,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        bgcolor:
                                            selectedCampus.accountStatus === "ACCOUNT_ACTIVE"
                                                ? "rgba(34, 197, 94, 0.12)"
                                                : "rgba(148, 163, 184, 0.2)",
                                        color:
                                            selectedCampus.accountStatus === "ACCOUNT_ACTIVE"
                                                ? "#16a34a"
                                                : "#64748b",
                                    }}
                                >
                                    {selectedCampus.accountStatus === "ACCOUNT_ACTIVE"
                                        ? "Hoạt động"
                                        : "Ngưng hoạt động"}
                                </Box>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Ngày đăng ký tài khoản
                                </Typography>
                                <Typography variant="body1">
                                    {formatDate(selectedCampus.accountRegisterDate)}
                                </Typography>
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewModalOpen(false)} color="inherit">
                        Đóng
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<EditIcon/>}
                        onClick={() => {
                            setViewModalOpen(false);
                            handleOpenEdit(selectedCampus);
                        }}
                        sx={{
                            background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                            textTransform: "none",
                        }}
                    >
                        Sửa
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Campus Modal */}
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
                                Chỉnh sửa cơ sở
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b", mt: 0.5}}>
                                Cập nhật thông tin cơ sở.
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
                            label="Tên cơ sở"
                            name="name"
                            fullWidth
                            value={formValues.name}
                            onChange={handleChange}
                            error={!!formErrors.name}
                            helperText={formErrors.name}
                        />
                        <TextField
                            label="Địa chỉ"
                            name="address"
                            fullWidth
                            value={formValues.address}
                            onChange={handleChange}
                        />
                        <TextField
                            label="Quận / Thành phố"
                            name="city"
                            fullWidth
                            value={formValues.city}
                            onChange={handleChange}
                        />
                        <TextField
                            label="Số điện thoại"
                            name="phone"
                            fullWidth
                            value={formValues.phone}
                            onChange={handleChange}
                        />
                        <TextField
                            label="Email"
                            name="email"
                            type="email"
                            fullWidth
                            value={formValues.email}
                            onChange={handleChange}
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
                        <Box>
                            <Typography variant="body2" sx={{mb: 1, color: "#64748b"}}>
                                Ảnh cơ sở
                            </Typography>
                            <Button
                                component="label"
                                variant="outlined"
                                startIcon={<CloudUploadIcon/>}
                                sx={{borderRadius: 2, textTransform: "none"}}
                            >
                                Tải ảnh lên
                                <input
                                    type="file"
                                    hidden
                                    accept="image/*"
                                    onChange={handleImageChange}
                                />
                            </Button>
                            {(formValues.imagePreview || selectedCampus?.imageUrl) && (
                                <Box
                                    component="img"
                                    src={formValues.imagePreview || selectedCampus?.imageUrl || PLACEHOLDER_IMAGE}
                                    alt="Preview"
                                    sx={{
                                        mt: 1,
                                        maxHeight: 120,
                                        borderRadius: 2,
                                        border: "1px solid #e2e8f0",
                                    }}
                                />
                            )}
                        </Box>
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
                    <PersonOffIcon color="error"/> Vô hiệu hóa cơ sở
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Bạn có chắc muốn vô hiệu hóa{" "}
                        <strong>{selectedCampus?.name}</strong>? Cơ sở này sẽ được
                        đánh dấu là ngưng hoạt động và có thể bị ẩn khỏi phụ huynh.
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
