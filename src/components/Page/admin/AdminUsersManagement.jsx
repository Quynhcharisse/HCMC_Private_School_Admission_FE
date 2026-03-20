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
    Button,
    Stack,
} from "@mui/material";
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import SchoolIcon from '@mui/icons-material/School';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import {useNavigate} from "react-router-dom";
import {enqueueSnackbar} from "notistack";
import {getUsersByRole} from "../../../services/AdminService.jsx";

export default function AdminUsersManagement() {
    const navigate = useNavigate();

    const [roleTab, setRoleTab] = useState("PARENT");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
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

    const handleOpenCampuses = (schoolId) => {
        if (!schoolId) return;
        navigate(`/admin/schools/${schoolId}/campuses`);
    };

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
    const parentCount = roleTab === "PARENT" ? pagination.totalItems : "-";
    const schoolCount = roleTab === "SCHOOL" ? pagination.totalItems : "-";
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
            icon: <FavoriteBorderIcon sx={{fontSize: 22}}/>,
            iconColor: "#16a34a",
            iconBg: "#dcfce7",
            cardBg: "#effcf5",
            cardBorder: "#d6f5e4",
        },
        {
            label: "Phụ huynh",
            value: parentCount,
            trend: roleTab === "PARENT" ? "Đang xem" : "Chuyển tab để xem",
            icon: <VerifiedUserIcon sx={{fontSize: 22}}/>,
            iconColor: "#f97316",
            iconBg: "#ffedd5",
            cardBg: "#fff7ec",
            cardBorder: "#fde7c7",
        },
        {
            label: "Nhà trường",
            value: schoolCount,
            trend: roleTab === "SCHOOL" ? "Đang xem" : "Chuyển tab để xem",
            icon: <SchoolIcon sx={{fontSize: 22}}/>,
            iconColor: "#0ea5e9",
            iconBg: "#e0f2fe",
            cardBg: "#eef7ff",
            cardBorder: "#bae6fd",
        },
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

            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: "space-between", gap: 2, mb: 2.5, flexWrap: "wrap"}}>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                    <Avatar sx={{bgcolor: "#7c3aed", width: 44, height: 44}}>
                        <PeopleIcon sx={{fontSize: 24, color: '#f5f3ff'}}/>
                    </Avatar>
                    <Box>
                        <Typography variant="h4" sx={{fontWeight: 700, color: '#0f172a', letterSpacing: "-0.02em"}}>
                            Quản Lý Người Dùng
                        </Typography>
                        <Typography variant="body2" sx={{color: "#64748b"}}>
                            Hệ thống quản lý thông minh và hiện đại
                        </Typography>
                    </Box>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon/>}
                    sx={{
                        borderRadius: 999,
                        textTransform: "none",
                        fontWeight: 700,
                        bgcolor: "#8b5cf6",
                        boxShadow: "0 8px 20px rgba(139,92,246,0.45)",
                        "&:hover": {bgcolor: "#7c3aed"},
                    }}
                >
                    Thêm mới
                </Button>
            </Box>

            <Box
                sx={{
                    mb: 2.5,
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, minmax(0, 1fr))",
                        lg: "repeat(4, minmax(0, 1fr))",
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
                                        <Typography sx={{fontSize: 12, color: "#22d3ee"}}>
                                            {item.trend}
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
                                                Email
                                            </TableCell>
                                            <TableCell align="center" sx={{fontWeight: 700, color: '#334155', minWidth: 160}}>
                                                Mối quan hệ
                                            </TableCell>
                                            <TableCell align="center" sx={{fontWeight: 700, color: '#334155', minWidth: 160}}>
                                                Tên
                                            </TableCell>
                                        </>
                                    )}
                                    <TableCell align="center" sx={{fontWeight: 700, color: '#334155', width: 150}}>
                                        Trạng thái
                                    </TableCell>
                                    <TableCell align="center" sx={{fontWeight: 700, color: '#334155', width: 90}}>
                                        Thao tác
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={roleTab === "SCHOOL" ? 7 : 6} align="center" sx={{py: 4, color: "#64748b"}}>
                                            <Typography variant="body2" sx={{color: "#64748b"}}>
                                                Đang tải dữ liệu...
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={roleTab === "SCHOOL" ? 7 : 6} align="center" sx={{py: 4}}>
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
                                                        <Typography sx={{fontSize: 14, color: "#334155"}}>
                                                            {user.primaryCampus?.account?.email ||
                                                             user.email ||
                                                             user.account?.email ||
                                                             "-"}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Typography sx={{fontSize: 14, color: "#334155"}}>
                                                            {user.relationship || user.relationshipToStudent || "-"}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Typography sx={{fontSize: 14, fontWeight: 600, color: "#0f172a"}}>
                                                            {user.name || user.representativeName || "-"}
                                                        </Typography>
                                                    </TableCell>
                                                </>
                                            )}
                                            <TableCell align="center">
                                                {renderStatusChip(
                                                    user.overallStatus ||
                                                    user.status ||
                                                    user.primaryCampus?.status
                                                )}
                                            </TableCell>
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
                                                    <IconButton size="small" sx={{color: "#64748b"}}>
                                                        <MoreVertIcon fontSize="small"/>
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );
}
