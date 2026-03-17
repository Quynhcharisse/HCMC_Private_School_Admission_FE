import React, {useEffect, useState} from "react";
import {
    Box,
    Card,
    CardContent,
    Chip,
    Divider,
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
} from "@mui/material";
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
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

    const handleRowClick = (user) => {
        if (roleTab === "SCHOOL") {
            const schoolId = user?.schoolId;
            if (!schoolId) return;
            navigate(`/admin/schools/${schoolId}/campuses`);
        }
    };

    const renderStatusChip = (status) => {
        if (!status) return <Chip label="Không xác định" size="small"/>;
        if (status === "ACCOUNT_ACTIVE") {
            return <Chip label="Hoạt động" size="small" color="success"/>;
        }
        if (status === "ACCOUNT_PENDING_VERIFY") {
            return <Chip label="Chờ xác minh" size="small" color="warning"/>;
        }
        if (status === "ACCOUNT_RESTRICTED") {
            return <Chip label="Bị hạn chế" size="small" color="error"/>;
        }
        return <Chip label={status} size="small"/>;
    };

    return (
        <Box>
            <Breadcrumbs separator="›" aria-label="breadcrumb" sx={{mb: 1}}>
                <Link underline="hover" color="inherit" onClick={() => navigate("/admin/users")} sx={{cursor: "pointer"}}>
                    Users
                </Link>
            </Breadcrumbs>

            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: "space-between", gap: 2, mb: 2}}>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                    <PeopleIcon sx={{fontSize: 32, color: '#1d4ed8'}}/>
                    <Typography variant="h4" sx={{fontWeight: 700, color: '#1e293b'}}>
                        Quản Lý Người Dùng
                    </Typography>
                </Box>
            </Box>

            <Card
                elevation={2}
                sx={{
                    borderRadius: 3,
                    border: '1px solid #e0e7ff',
                }}
            >
                <CardContent>
                    <Tabs
                        value={roleTab}
                        onChange={handleTabChange}
                        sx={{mb: 2}}
                        textColor="primary"
                        indicatorColor="primary"
                    >
                        <Tab label="Parent" value="PARENT"/>
                        <Tab label="School" value="SCHOOL"/>
                    </Tabs>

                    <Box
                        component="form"
                        onSubmit={handleSearchSubmit}
                        sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 1.5,
                            mb: 2,
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <TextField
                            size="small"
                            placeholder="Tìm theo tên, email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            sx={{minWidth: {xs: "100%", sm: 260}, maxWidth: 360}}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" sx={{color: "#64748b"}}/>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Box sx={{display: "flex", gap: 1}}>
                            <Button
                                type="submit"
                                variant="contained"
                                size="small"
                                disabled={loading}
                            >
                                Tìm kiếm
                            </Button>
                            <IconButton
                                size="small"
                                onClick={() => {
                                    setSearch("");
                                    fetchUsers({page: 0, search: ""});
                                }}
                                disabled={loading}
                            >
                                <RefreshIcon fontSize="small"/>
                            </IconButton>
                        </Box>
                    </Box>

                    <Divider sx={{mb: 2}}/>

                    <TableContainer component={Paper} elevation={0}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{bgcolor: '#f8fafc'}}>
                                    <TableCell
                                        align="center"
                                        sx={{fontWeight: 700, color: '#1e293b', width: 60}}
                                    >
                                        STT
                                    </TableCell>
                                    {roleTab === "SCHOOL" && (
                                        <TableCell
                                            align="center"
                                            sx={{fontWeight: 700, color: '#1e293b', minWidth: 220}}
                                        >
                                            Trường
                                        </TableCell>
                                    )}
                                    <TableCell
                                        align="center"
                                        sx={{fontWeight: 700, color: '#1e293b', minWidth: 200}}
                                    >
                                        Email
                                    </TableCell>
                                    {roleTab === "PARENT" && (
                                        <TableCell
                                            align="center"
                                            sx={{fontWeight: 700, color: '#1e293b', minWidth: 160}}
                                        >
                                            Mối quan hệ
                                        </TableCell>
                                    )}
                                    <TableCell
                                        align="center"
                                        sx={{fontWeight: 700, color: '#1e293b', minWidth: 160}}
                                    >
                                        Tên
                                    </TableCell>
                                    <TableCell
                                        align="center"
                                        sx={{fontWeight: 700, color: '#1e293b', width: 140}}
                                    >
                                        Trạng Thái
                                    </TableCell>
                                    {roleTab === "SCHOOL" && (
                                        <TableCell
                                            align="center"
                                            sx={{fontWeight: 700, color: '#1e293b', width: 80}}
                                        >
                                            Chi tiết
                                        </TableCell>
                                    )}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={roleTab === "SCHOOL" ? 6 : 5} align="center" sx={{py: 4}}>
                                            <Typography variant="body2" sx={{color: "#64748b"}}>
                                                Đang tải dữ liệu...
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={roleTab === "SCHOOL" ? 6 : 5} align="center" sx={{py: 4}}>
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
                                                cursor: roleTab === "SCHOOL" ? "pointer" : "default",
                                            }}
                                            onClick={() => handleRowClick(user)}
                                        >
                                            <TableCell align="center">
                                                {pagination.page * pagination.pageSize + index + 1}
                                            </TableCell>
                                            {roleTab === "SCHOOL" && (
                                                <TableCell>
                                                    <Typography sx={{fontWeight: 600, fontSize: 14}}>
                                                        {user.schoolName || "Trường chưa đặt tên"}
                                                    </Typography>
                                                    {user.primaryCampus?.address && (
                                                        <Typography
                                                            variant="body2"
                                                            sx={{color: "#64748b", fontSize: 12}}
                                                        >
                                                            {user.primaryCampus.address}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                            )}
                                            <TableCell>
                                                <Typography sx={{fontSize: 14}}>
                                                    {user.primaryCampus?.account?.email ||
                                                     user.email ||
                                                     user.account?.email ||
                                                     "-"}
                                                </Typography>
                                            </TableCell>
                                            {roleTab === "PARENT" && (
                                                <TableCell align="center">
                                                    <Typography sx={{fontSize: 14}}>
                                                        {user.relationship || user.relationshipToStudent || "-"}
                                                    </Typography>
                                                </TableCell>
                                            )}
                                            <TableCell>
                                                <Typography sx={{fontSize: 14}}>
                                                    {user.name || user.representativeName || "-"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                {renderStatusChip(
                                                    user.overallStatus ||
                                                    user.status ||
                                                    user.primaryCampus?.status
                                                )}
                                            </TableCell>
                                            {roleTab === "SCHOOL" && (
                                                <TableCell align="right">
                                                    <ArrowForwardIosIcon sx={{fontSize: 16, color: "#94a3b8"}}/>
                                                </TableCell>
                                            )}
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
