import React, {useEffect, useState} from "react";
import {
    Avatar,
    Box,
    Card,
    CardContent,
    Chip,
    IconButton,
    InputAdornment,
    Tab,
    Tabs,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Breadcrumbs,
    Link,
    TextField,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    alpha,
    Pagination,
} from "@mui/material";
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SchoolIcon from '@mui/icons-material/School';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import BlockIcon from '@mui/icons-material/Block';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {useNavigate} from "react-router-dom";
import {enqueueSnackbar} from "notistack";
import {getUsersByRole} from "../../../services/AdminService.jsx";

export default function AdminUsersManagement() {
    const navigate = useNavigate();

    const [roleTab, setRoleTab] = useState("PARENT");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [selectedParent, setSelectedParent] = useState(null);
    const [pagination, setPagination] = useState({
        page: 0,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
    });

    const fetchUsers = async (opts = {}) => {
        const role = opts.role || roleTab;
        const page = opts.page ?? pagination.page ?? 0;
        const pageSize = opts.pageSize ?? pagination.pageSize ?? 10;
        const keyword = opts.search ?? search;

        setLoading(true);
        try {
            const res = await getUsersByRole({role, page, pageSize, search: keyword});
            const body = res?.data?.body;
            setUsers(body?.items || []);
            setPagination({
                page: body?.currentPage ?? page,
                pageSize: body?.pageSize ?? pageSize,
                totalItems: body?.totalItems ?? 0,
                totalPages: body?.totalPages ?? 0,
                hasNext: body?.hasNext ?? false,
                hasPrevious: body?.hasPrevious ?? false,
            });
        } catch (e) {
            console.error("Failed to load users", e);
            enqueueSnackbar("Không thể tải danh sách người dùng.", {variant: "error"});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // load lần đầu theo tab mặc định
        fetchUsers({page: 0});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roleTab]);

    const handleTabChange = (event, newValue) => {
        setRoleTab(newValue);
        setPagination(prev => ({...prev, page: 0}));
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchUsers({page: 0});
    };

    const handlePageChange = (_, page) => {
        fetchUsers({page: page - 1});
    };

    const handleOpenCampuses = (schoolId) => {
        if (!schoolId) return;
        navigate(`/admin/schools/${schoolId}/campuses`);
    };

    const handleOpenParentDetail = (user) => {
        if (!user) return;
        setSelectedParent(user);
    };

    const handleCloseParentDetail = () => {
        setSelectedParent(null);
    };

    const maskIdCardNumber = (idCardNumber) => {
        if (!idCardNumber) return "-";
        const normalized = String(idCardNumber);
        if (normalized.length <= 8) return normalized;
        return `${normalized.slice(0, 4)}****${normalized.slice(-4)}`;
    };

    const getRoleLabel = (role) => {
        if (role === "PARENT") return "Phụ huynh";
        if (role === "SCHOOL") return "Nhà trường";
        return role || "-";
    };

    const getGenderLabel = (gender) => {
        if (!gender) return "-";
        if (gender === "MALE") return "Nam";
        if (gender === "FEMALE") return "Nữ";
        if (gender === "OTHER") return "Khác";
        return gender;
    };

    const getRelationshipLabel = (relationship) => {
        if (!relationship) return "-";
        if (relationship === "FATHER") return "Cha";
        if (relationship === "MOTHER") return "Mẹ";
        if (relationship === "GUARDIAN") return "Người giám hộ";
        if (relationship === "GRANDPARENT") return "Ông/Bà";
        if (relationship === "SIBLING") return "Anh/Chị/Em";
        return relationship;
    };

    const detailSectionSx = {
        border: "1px solid #bfdbfe",
        borderRadius: 3,
        bgcolor: "#eff6ff",
        p: {xs: 1.4, md: 1.8},
        boxShadow: "0 10px 24px rgba(37,99,235,0.14)",
    };

    const renderDetailField = (label, value, fullWidth = false) => (
        <Box
            sx={{
                border: "1px solid #bfdbfe",
                borderRadius: 2.25,
                bgcolor: "#ffffff",
                px: 1.3,
                py: 1.1,
                gridColumn: fullWidth ? {xs: "auto", md: "1 / span 2"} : "auto",
                boxShadow: "0 5px 12px rgba(37,99,235,0.08)",
            }}
        >
            <Typography sx={{fontSize: 12, color: "#1d4ed8", mb: 0.35, fontWeight: 700}}>{label}</Typography>
            <Typography sx={{fontSize: 14, color: "#0f172a", fontWeight: 600}}>{value || "-"}</Typography>
        </Box>
    );

    const renderRestrictedChip = (isRestricted) => (
        isRestricted ? (
            <Chip
                icon={<BlockIcon sx={{fontSize: 14}} />}
                label="Bị hạn chế"
                size="small"
                sx={{
                    bgcolor: "rgba(239,68,68,0.16)",
                    color: "#ef4444",
                    border: "1px solid rgba(239,68,68,0.32)",
                    fontWeight: 700,
                    "& .MuiChip-icon": {color: "#ef4444"},
                }}
            />
        ) : (
            <Chip
                label="Không"
                size="small"
                sx={{
                    bgcolor: "rgba(16,185,129,0.14)",
                    color: "#059669",
                    border: "1px solid rgba(16,185,129,0.28)",
                    fontWeight: 700,
                }}
            />
        )
    );

    const renderStatusChip = (status) => {
        if (!status) return <Chip label="Không xác định" size="small"/>;
        if (status === "ACCOUNT_ACTIVE") {
            return (
                <Chip
                    label="Hoạt động"
                    size="small"
                    sx={{
                        bgcolor: "rgba(16,185,129,0.16)",
                        color: "#34d399",
                        border: "1px solid rgba(52,211,153,0.35)",
                        fontWeight: 600,
                    }}
                />
            );
        }
        if (status === "ACCOUNT_PENDING_VERIFY") {
            return (
                <Chip
                    label="Chờ duyệt"
                    size="small"
                    sx={{
                        bgcolor: "rgba(245,158,11,0.16)",
                        color: "#fbbf24",
                        border: "1px solid rgba(251,191,36,0.35)",
                        fontWeight: 600,
                    }}
                />
            );
        }
        if (status === "ACCOUNT_RESTRICTED") {
            return (
                <Chip
                    label="Bị hạn chế"
                    size="small"
                    sx={{
                        bgcolor: "rgba(239,68,68,0.16)",
                        color: "#f87171",
                        border: "1px solid rgba(248,113,113,0.35)",
                        fontWeight: 600,
                    }}
                />
            );
        }
        return (
            <Chip
                label={status}
                size="small"
                sx={{
                    bgcolor: "rgba(148,163,184,0.2)",
                    color: "#cbd5e1",
                    border: "1px solid rgba(203,213,225,0.3)",
                }}
            />
        );
    };

    const activeCount = users.filter((u) => (u.overallStatus || u.status || u.primaryCampus?.status) === "ACCOUNT_ACTIVE").length;
    const parentCount = pagination.totalItems || 0;
    const schoolCount = pagination.totalItems || 0;
    const statCards = [
        {
            label: "Tổng người dùng",
            value: pagination.totalItems || 0,
            trend: `Trang ${pagination.page + 1}/${Math.max(1, pagination.totalPages || 1)}`,
            icon: <PeopleIcon sx={{fontSize: 22}}/>,
            iconColor: "#2563eb",
            iconBg: "#dbeafe",
            cardBg: "#eef7ff",
            cardBorder: "#dbeafe",
        },
        {
            label: "Đang hoạt động",
            value: activeCount,
            trend: "Theo dữ liệu trang hiện tại",
            icon: <TrendingUpIcon sx={{fontSize: 22}}/>,
            iconColor: "#16a34a",
            iconBg: "#dcfce7",
            cardBg: "#effcf5",
            cardBorder: "#d6f5e4",
        },
        ...(roleTab === "PARENT"
            ? [{
                label: "Phụ huynh",
                value: parentCount,
                trend: "Đang xem",
                icon: <FamilyRestroomIcon sx={{fontSize: 22}}/>,
                iconColor: "#f97316",
                iconBg: "#ffedd5",
                cardBg: "#fff7ec",
                cardBorder: "#fde7c7",
            }]
            : [{
                label: "Nhà trường",
                value: schoolCount,
                trend: "Đang xem",
                icon: <SchoolIcon sx={{fontSize: 22}}/>,
                iconColor: "#0ea5e9",
                iconBg: "#e0f2fe",
                cardBg: "#eef7ff",
                cardBorder: "#bae6fd",
            }]),
    ];

    return (
        <Box
            sx={{
                p: {xs: 1, md: 2},
                borderRadius: 4,
                bgcolor: "#ffffff",
                color: "#0f172a",
            }}
        >
            <Breadcrumbs separator="›" aria-label="breadcrumb" sx={{mb: 1, color: "#64748b"}}>
                <Link underline="hover" color="inherit" onClick={() => navigate("/admin/users")} sx={{cursor: "pointer", color: "#2563eb"}}>
                    Users
                </Link>
            </Breadcrumbs>

            <Card
                elevation={0}
                sx={{
                    borderRadius: 3.5,
                    mb: 2.5,
                    color: "white",
                    background: "linear-gradient(95deg, #2563eb 0%, #3158ef 40%, #6d3df2 72%, #8b3dff 100%)",
                    boxShadow: "0 18px 34px rgba(67, 56, 202, 0.28)",
                }}
            >
                <CardContent sx={{p: {xs: 2.2, md: 2.8}, "&:last-child": {pb: {xs: 2.2, md: 2.8}}}}>
                    <Box sx={{display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2}}>
                        <Box sx={{display: "flex", alignItems: "center", gap: 1.5}}>
                            <Avatar
                                sx={{
                                    bgcolor: alpha("#ffffff", 0.2),
                                    color: "white",
                                    width: 42,
                                    height: 42,
                                }}
                            >
                                <PeopleIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" sx={{fontWeight: 700, lineHeight: 1.2}}>
                                    Quản Lý Người Dùng
                                </Typography>
                                <Typography variant="body2" sx={{opacity: 0.92, mt: 0.45}}>
                                    Hệ thống quản lý và theo dõi tài khoản người dùng
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <Box
                sx={{
                    mb: 2.5,
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, minmax(0, 1fr))",
                        md: "repeat(3, minmax(0, 1fr))",
                    },
                    gap: 2,
                    width: "100%",
                }}
            >
                {statCards.map((item) => (
                    <Box key={item.label}>
                        <Card
                            elevation={0}
                            sx={{
                                borderRadius: 3,
                                border: `1px solid ${item.cardBorder}`,
                                bgcolor: item.cardBg,
                                minHeight: 132,
                            }}
                        >
                            <CardContent
                                sx={{
                                    py: 2,
                                    px: 2.25,
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "flex-start",
                                    justifyContent: "space-between",
                                }}
                            >
                                <Box>
                                    <Box>
                                        <Typography sx={{fontSize: 12, color: "#64748b"}}>
                                            {item.label}
                                        </Typography>
                                        <Typography sx={{fontSize: 30, lineHeight: 1.2, fontWeight: 800, color: "#0f172a"}}>
                                            {item.value}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Avatar
                                    sx={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: "50%",
                                        bgcolor: item.iconBg,
                                        color: item.iconColor,
                                        mt: 0.5,
                                    }}
                                >
                                    {item.icon}
                                </Avatar>
                            </CardContent>
                        </Card>
                    </Box>
                ))}
            </Box>

            <Card
                elevation={0}
                sx={{
                    borderRadius: 4,
                    border: '1px solid #e2e8f0',
                    bgcolor: "#ffffff",
                    overflow: "hidden",
                }}
            >
                <CardContent sx={{p: {xs: 1.5, md: 2.5}}}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1.5,
                            mb: 2,
                            flexWrap: "wrap",
                        }}
                    >
                        <Tabs
                            value={roleTab}
                            onChange={handleTabChange}
                            sx={{
                                minHeight: 40,
                                bgcolor: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: 999,
                                p: 0.5,
                                "& .MuiTabs-indicator": {display: "none"},
                            }}
                        >
                            <Tab
                                label="Phụ huynh"
                                value="PARENT"
                                sx={{
                                    minHeight: 34,
                                    px: 2,
                                    borderRadius: 999,
                                    textTransform: "none",
                                    color: "#64748b",
                                    fontWeight: 700,
                                    "&.Mui-selected": {color: "#0f172a", bgcolor: "#ede9fe"},
                                }}
                            />
                            <Tab
                                label="Nhà trường"
                                value="SCHOOL"
                                sx={{
                                    minHeight: 34,
                                    px: 2,
                                    borderRadius: 999,
                                    textTransform: "none",
                                    color: "#64748b",
                                    fontWeight: 700,
                                    "&.Mui-selected": {color: "#0f172a", bgcolor: "#e0f2fe"},
                                }}
                            />
                        </Tabs>

                        <Box
                            component="form"
                            onSubmit={handleSearchSubmit}
                            sx={{display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap"}}
                        >
                            <TextField
                                size="small"
                                placeholder="Tìm theo tên hoặc địa chỉ..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                sx={{
                                    minWidth: {xs: "100%", sm: 300},
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: 999,
                                        bgcolor: "#ffffff",
                                        color: "#0f172a",
                                        "& fieldset": {borderColor: "#cbd5e1"},
                                        "&:hover fieldset": {borderColor: "#7dd3fc"},
                                        "&.Mui-focused fieldset": {borderColor: "#38bdf8"},
                                    },
                                }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" sx={{color: "#64748b"}}/>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <IconButton sx={{color: "#64748b", border: "1px solid #cbd5e1"}}>
                                <FilterListIcon fontSize="small"/>
                            </IconButton>
                            <IconButton sx={{color: "#64748b", border: "1px solid #cbd5e1"}}>
                                <DownloadIcon fontSize="small"/>
                            </IconButton>
                        </Box>
                    </Box>

                    <TableContainer
                        component={Paper}
                        elevation={0}
                        sx={{bgcolor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 3}}
                    >
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{bgcolor: '#f8fafc'}}>
                                    <TableCell align="center" sx={{fontWeight: 700, color: '#334155', width: 60}}>
                                        STT
                                    </TableCell>
                                    {roleTab === "SCHOOL" && (
                                        <>
                                            <TableCell align="center" sx={{fontWeight: 700, color: '#334155', minWidth: 160}}>
                                                Tên trường
                                            </TableCell>
                                            <TableCell align="center" sx={{fontWeight: 700, color: '#334155', minWidth: 200}}>
                                                Website
                                            </TableCell>
                                            <TableCell align="center" sx={{fontWeight: 700, color: '#334155', width: 160}}>
                                                Hotline
                                            </TableCell>
                                            <TableCell align="center" sx={{fontWeight: 700, color: '#334155', width: 180}}>
                                                Mã số thuế
                                            </TableCell>
                                        </>
                                    )}
                                    {roleTab === "PARENT" && (
                                        <>
                                            <TableCell align="center" sx={{fontWeight: 700, color: '#334155', minWidth: 220}}>
                                                Họ tên
                                            </TableCell>
                                            <TableCell align="center" sx={{fontWeight: 700, color: '#334155', minWidth: 240}}>
                                                Email
                                            </TableCell>
                                            <TableCell align="center" sx={{fontWeight: 700, color: '#334155', minWidth: 140}}>
                                                Số điện thoại
                                            </TableCell>
                                            <TableCell align="center" sx={{fontWeight: 700, color: '#334155', minWidth: 150}}>
                                                Trạng thái
                                            </TableCell>
                                            <TableCell align="center" sx={{fontWeight: 700, color: '#334155', minWidth: 140}}>
                                                Hạn chế
                                            </TableCell>
                                        </>
                                    )}
                                    {roleTab === "SCHOOL" && (
                                        <TableCell align="center" sx={{fontWeight: 700, color: '#334155', width: 150}}>
                                            Trạng thái
                                        </TableCell>
                                    )}
                                    <TableCell align="center" sx={{fontWeight: 700, color: '#334155', width: roleTab === "PARENT" ? 110 : 90}}>
                                        Chi Tiết
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={roleTab === "SCHOOL" ? 7 : 8} align="center" sx={{py: 4, color: "#64748b"}}>
                                            <Typography variant="body2" sx={{color: "#64748b"}}>
                                                Đang tải dữ liệu...
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={roleTab === "SCHOOL" ? 7 : 8} align="center" sx={{py: 4}}>
                                            <Typography variant="body1" sx={{color: '#64748b'}}>
                                                Chưa có dữ liệu người dùng
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user, index) => (
                                        <TableRow
                                            key={user.accountId || user.schoolId || index}
                                            hover
                                            sx={{
                                                "& td": {borderBottomColor: "#e2e8f0", color: "#334155"},
                                                "&:hover": {bgcolor: "#f8fafc"},
                                            }}
                                        >
                                            <TableCell align="center">
                                                <Chip
                                                    label={pagination.page * pagination.pageSize + index + 1}
                                                    size="small"
                                                    sx={{
                                                        width: 28,
                                                        height: 24,
                                                        fontWeight: 700,
                                                        bgcolor: "rgba(139,92,246,0.22)",
                                                        color: "#7c3aed",
                                                        border: "1px solid rgba(196,181,253,0.3)",
                                                    }}
                                                />
                                            </TableCell>
                                            {roleTab === "SCHOOL" && (
                                                <>
                                                    <TableCell align="center">
                                                        <Typography sx={{fontWeight: 600, fontSize: 14, color: "#0f172a"}}>
                                                            {user.schoolName || "Trường chưa đặt tên"}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Typography
                                                            sx={{
                                                                fontSize: 13,
                                                                color: "#38bdf8",
                                                                textDecoration: user.websiteUrl ? "underline" : "none",
                                                                wordBreak: "break-all",
                                                                cursor: user.websiteUrl ? "pointer" : "default",
                                                            }}
                                                            component={user.websiteUrl ? "a" : "span"}
                                                            href={user.websiteUrl || undefined}
                                                            target={user.websiteUrl ? "_blank" : undefined}
                                                            rel={user.websiteUrl ? "noopener noreferrer" : undefined}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                            }}
                                                        >
                                                            {user.websiteUrl || "-"}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Typography sx={{fontSize: 14, color: "#334155"}}>
                                                            {user.hotline || "-"}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Typography sx={{fontSize: 14, color: "#334155"}}>
                                                            {user.taxCode || "-"}
                                                        </Typography>
                                                    </TableCell>
                                                </>
                                            )}
                                            {roleTab === "PARENT" && (
                                                <>
                                                    <TableCell align="center">
                                                        <Typography sx={{fontSize: 14, fontWeight: 700, color: "#0f172a"}}>
                                                            {user.name || "-"}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Typography sx={{fontSize: 14, color: "#334155"}}>
                                                            {user.email || user.account?.email || "-"}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Typography sx={{fontSize: 14, color: "#334155"}}>
                                                            {user.phone || "-"}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {renderStatusChip(user.status)}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {renderRestrictedChip(!!user.isRestricted)}
                                                    </TableCell>
                                                </>
                                            )}
                                            {roleTab === "SCHOOL" && (
                                                <TableCell align="center">
                                                    {renderStatusChip(
                                                        user.overallStatus ||
                                                        user.status ||
                                                        user.primaryCampus?.status
                                                    )}
                                                </TableCell>
                                            )}
                                            <TableCell align="center">
                                                {roleTab === "SCHOOL" ? (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleOpenCampuses(user?.schoolId)}
                                                        disabled={!user?.schoolId}
                                                        aria-label="Xem campus"
                                                        sx={{color: "#38bdf8"}}
                                                    >
                                                        <VisibilityIcon fontSize="small"/>
                                                    </IconButton>
                                                ) : (
                                                    <IconButton
                                                        size="small"
                                                        sx={{color: "#64748b"}}
                                                        onClick={() => handleOpenParentDetail(user)}
                                                        aria-label="Xem chi tiết phụ huynh"
                                                    >
                                                        <VisibilityIcon fontSize="small"/>
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="center"
                        spacing={1.2}
                        sx={{mt: 1.8}}
                    >
                        <Pagination
                            page={pagination.page + 1}
                            count={Math.max(1, pagination.totalPages || 1)}
                            onChange={handlePageChange}
                            shape="rounded"
                            disabled={loading}
                            sx={{
                                "& .MuiPaginationItem-root": {
                                    borderRadius: 2,
                                    color: "#334155",
                                    border: "1px solid #cbd5e1",
                                    bgcolor: "#ffffff",
                                },
                                "& .MuiPaginationItem-root:hover": {
                                    bgcolor: "#eef2ff",
                                    borderColor: "#a5b4fc",
                                },
                                "& .Mui-selected": {
                                    bgcolor: "#4f46e5 !important",
                                    color: "#ffffff",
                                    borderColor: "#4f46e5",
                                    boxShadow: "0 6px 14px rgba(79,70,229,0.35)",
                                },
                            }}
                        />
                    </Stack>
                </CardContent>
            </Card>

            <Dialog
                open={!!selectedParent}
                onClose={handleCloseParentDetail}
                fullWidth
                maxWidth="md"
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        overflow: "hidden",
                        border: "1px solid #93c5fd",
                        boxShadow: "0 24px 48px rgba(37,99,235,0.24)",
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        fontWeight: 800,
                        color: "#0f172a",
                        pb: 1.2,
                        background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 48%, #93c5fd 100%)",
                        borderBottom: "1px solid #93c5fd",
                    }}
                >
                    Chi tiết phụ huynh
                </DialogTitle>
                <DialogContent
                    dividers
                    sx={{
                        bgcolor: "#eff6ff",
                        backgroundImage:
                            "radial-gradient(circle at top right, rgba(59,130,246,0.24), transparent 45%), radial-gradient(circle at bottom left, rgba(37,99,235,0.2), transparent 42%)",
                    }}
                >
                    <Stack spacing={1.5}>
                        <Box sx={detailSectionSx}>
                            <Typography sx={{fontSize: 13, fontWeight: 800, color: "#1e40af", mb: 1}}>
                                Thông tin cơ bản
                            </Typography>
                            <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 1}}>
                                {renderDetailField("Họ và tên", selectedParent?.name)}
                                {renderDetailField("Giới tính", getGenderLabel(selectedParent?.gender))}
                                {renderDetailField("Vai trò", getRoleLabel(selectedParent?.role))}
                                {renderDetailField("Mối quan hệ", getRelationshipLabel(selectedParent?.relationship))}
                            </Box>
                        </Box>

                        <Box sx={detailSectionSx}>
                            <Typography sx={{fontSize: 13, fontWeight: 800, color: "#1e40af", mb: 1}}>
                                Liên hệ
                            </Typography>
                            <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 1}}>
                                {renderDetailField("Email", selectedParent?.email)}
                                {renderDetailField("Số điện thoại", selectedParent?.phone)}
                                {renderDetailField("Địa chỉ", selectedParent?.currentAddress, true)}
                            </Box>
                        </Box>

                        <Box sx={detailSectionSx}>
                            <Typography sx={{fontSize: 13, fontWeight: 800, color: "#1e40af", mb: 1}}>
                                Thông tin cá nhân
                            </Typography>
                            <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 1}}>
                                {renderDetailField("Số CCCD/CMND", maskIdCardNumber(selectedParent?.idCardNumber))}
                                {renderDetailField("Nghề nghiệp", selectedParent?.occupation)}
                                {renderDetailField("Nơi làm việc", selectedParent?.workplace)}
                            </Box>
                        </Box>

                        <Box sx={detailSectionSx}>
                            <Typography sx={{fontSize: 13, fontWeight: 800, color: "#1e40af", mb: 1}}>
                                Trạng thái tài khoản
                            </Typography>
                            <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 1}}>
                                <Box sx={{border: "1px solid #bfdbfe", borderRadius: 2.25, bgcolor: "#ffffff", px: 1.3, py: 1.1, boxShadow: "0 5px 12px rgba(37,99,235,0.08)"}}>
                                    <Typography sx={{fontSize: 12, color: "#1d4ed8", mb: 0.5, fontWeight: 700}}>Trạng thái</Typography>
                                    {renderStatusChip(selectedParent?.status)}
                                </Box>
                                <Box sx={{border: "1px solid #bfdbfe", borderRadius: 2.25, bgcolor: "#ffffff", px: 1.3, py: 1.1, boxShadow: "0 5px 12px rgba(37,99,235,0.08)"}}>
                                    <Typography sx={{fontSize: 12, color: "#1d4ed8", mb: 0.5, fontWeight: 700}}>Bị hạn chế</Typography>
                                    {renderRestrictedChip(!!selectedParent?.isRestricted)}
                                </Box>
                                {selectedParent?.isRestricted && renderDetailField("Lý do hạn chế", selectedParent?.restrictionReason, true)}
                            </Box>
                        </Box>
                    </Stack>
                </DialogContent>
            </Dialog>
        </Box>
    );
}
