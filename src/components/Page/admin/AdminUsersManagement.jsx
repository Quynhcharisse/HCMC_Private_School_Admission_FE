import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
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
    Switch,
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
import ApartmentIcon from '@mui/icons-material/Apartment';
import PlaceIcon from '@mui/icons-material/Place';
import InsightsIcon from '@mui/icons-material/Insights';
import CallIcon from '@mui/icons-material/Call';
import BadgeIcon from '@mui/icons-material/Badge';
import LockIcon from '@mui/icons-material/Lock';
import {useLocation, useNavigate} from "react-router-dom";
import {enqueueSnackbar} from "notistack";
import {exportSchools, exportUsersByRole, getUsersByRole, setAccountRestricted} from "../../../services/AdminService.jsx";
import ConfirmDialog, {ConfirmHighlight} from "../../ui/ConfirmDialog.jsx";
import {APP_PRIMARY_MAIN} from "../../../constants/homeLandingTheme";
import {
    adminTableBodyRowSx,
    adminTableContainerSx,
    adminTableHeadCellSx,
    adminTableHeadRowSx,
} from "../../../constants/adminTableStyles.js";

/** BE trả accId; thêm các alias thường gặp để tương thích */
const resolveAccountId = (u) => {
    if (!u) return null;
    const id =
        u.accId ??
        u.accountId ??
        u.account?.accId ??
        u.account?.accountId ??
        u.account?.id;
    if (id === null || id === undefined || id === "") return null;
    return id;
};

const accountIdSetKey = (id) => (id === null || id === undefined ? "" : String(id));

/** Phân trang hiển thị; tải một lần nhiều bản ghi để search theo tên hoàn toàn phía FE */
const TABLE_PAGE_SIZE = 10;
const FETCH_PAGE_SIZE = 5000;

export default function AdminUsersManagement() {
    const navigate = useNavigate();
    const location = useLocation();

    const getRoleTabFromSearch = (searchString) => {
        const params = new URLSearchParams(searchString);
        const tab = params.get("tab");
        return tab === "SCHOOL" ? "SCHOOL" : "PARENT";
    };

    const [roleTab, setRoleTab] = useState(() => getRoleTabFromSearch(location.search));
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [users, setUsers] = useState([]);
    const [selectedParent, setSelectedParent] = useState(null);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [pagination, setPagination] = useState({
        page: 0,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
    });
    const [restrictDialog, setRestrictDialog] = useState({open: false, user: null});
    const [unrestrictDialog, setUnrestrictDialog] = useState({open: false, user: null});
    const [restrictReasonInput, setRestrictReasonInput] = useState("");
    const [restrictingAccountIds, setRestrictingAccountIds] = useState(() => new Set());

    const fetchUsers = useCallback(async (opts = {}) => {
        const role = opts.role || roleTab;

        setLoading(true);
        try {
            const res = await getUsersByRole({role, page: 0, pageSize: FETCH_PAGE_SIZE});
            const body = res?.data?.body;
            const items = body?.items || [];
            setUsers(items);
            setPagination({
                page: 0,
                pageSize: TABLE_PAGE_SIZE,
                totalItems: body?.totalItems ?? items.length,
                totalPages: Math.max(1, Math.ceil(items.length / TABLE_PAGE_SIZE)),
                hasNext: body?.hasNext ?? false,
                hasPrevious: body?.hasPrevious ?? false,
            });
        } catch (e) {
            console.error("Failed to load users", e);
            enqueueSnackbar("Không thể tải danh sách người dùng.", {variant: "error"});
        } finally {
            setLoading(false);
        }
    }, [roleTab]);

    const fetchUsersRef = useRef(fetchUsers);
    fetchUsersRef.current = fetchUsers;

    const nameSearchQuery = search.trim().toLowerCase();

    const filteredUsers = useMemo(() => {
        if (!nameSearchQuery) return users;
        return users.filter((u) => {
            if (roleTab === "PARENT") {
                const name = String(u.name ?? u.fullName ?? u.account?.name ?? "").toLowerCase();
                return name.includes(nameSearchQuery);
            }
            const school = String(u.schoolName ?? "").toLowerCase();
            return school.includes(nameSearchQuery);
        });
    }, [users, nameSearchQuery, roleTab]);

    const totalListPages = Math.max(1, Math.ceil(filteredUsers.length / TABLE_PAGE_SIZE) || 1);

    const displayedUsers = useMemo(() => {
        const start = pagination.page * TABLE_PAGE_SIZE;
        return filteredUsers.slice(start, start + TABLE_PAGE_SIZE);
    }, [filteredUsers, pagination.page]);

    useEffect(() => {
        setPagination((prev) => ({...prev, page: 0}));
    }, [search]);

    useEffect(() => {
        const maxPage = Math.max(0, Math.ceil(filteredUsers.length / TABLE_PAGE_SIZE) - 1);
        setPagination((prev) => (prev.page > maxPage ? {...prev, page: maxPage} : prev));
    }, [filteredUsers.length]);

    useEffect(() => {
        fetchUsersRef.current({page: 0});
    }, [roleTab]);

    useEffect(() => {
        const tabFromUrl = getRoleTabFromSearch(location.search);
        setRoleTab((prev) => (prev === tabFromUrl ? prev : tabFromUrl));
    }, [location.search]);

    const handleTabChange = (event, newValue) => {
        setRoleTab(newValue);
        setPagination(prev => ({...prev, page: 0}));
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
    };

    const handlePageChange = (_, page) => {
        setPagination((prev) => ({...prev, page: page - 1}));
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

    const handleOpenSchoolDetail = (user) => {
        const schoolId = Number(user?.schoolId);
        if (!Number.isFinite(schoolId) || schoolId <= 0) {
            enqueueSnackbar("Không tìm thấy mã trường để xem chi tiết.", { variant: "warning" });
            return;
        }
        navigate(`/admin/schools/${schoolId}/detail`, {
            state: { school: user },
        });
    };

    const handleCloseSchoolDetail = () => {
        setSelectedSchool(null);
    };

    const updateUserByAccountId = (accountId, patch) => {
        if (accountId === null || accountId === undefined || accountId === "") return;
        const key = accountIdSetKey(accountId);
        const matches = (row) => accountIdSetKey(resolveAccountId(row)) === key;
        setUsers((prev) => prev.map((u) => (matches(u) ? {...u, ...patch} : u)));
        setSelectedParent((p) => (p && matches(p) ? {...p, ...patch} : p));
        setSelectedSchool((s) => (s && matches(s) ? {...s, ...patch} : s));
    };

    const setRestrictingId = (accountId, on) => {
        const key = accountIdSetKey(accountId);
        if (!key) return;
        setRestrictingAccountIds((prev) => {
            const next = new Set(prev);
            if (on) next.add(key);
            else next.delete(key);
            return next;
        });
    };

    const buildRestrictPatch = (user, restricted, reasonText) => {
        if (restricted) {
            return {
                isRestricted: true,
                restrictionReason: reasonText || null,
                ...(roleTab === "PARENT"
                    ? {status: "ACCOUNT_RESTRICTED"}
                    : {overallStatus: "ACCOUNT_RESTRICTED"}),
            };
        }
        const patch = {isRestricted: false, restrictionReason: null};
        if (roleTab === "PARENT") {
            if (user.status === "ACCOUNT_RESTRICTED") patch.status = "ACCOUNT_ACTIVE";
        } else {
            if (user.overallStatus === "ACCOUNT_RESTRICTED") patch.overallStatus = "ACCOUNT_ACTIVE";
            if (user.status === "ACCOUNT_RESTRICTED") patch.status = "ACCOUNT_ACTIVE";
        }
        return patch;
    };

    const handleRestrictSwitch = (user, checked) => {
        const accountId = resolveAccountId(user);
        if (accountId === null || accountId === undefined || accountId === "") return;
        if (checked) {
            setRestrictReasonInput("");
            setRestrictDialog({open: true, user});
            return;
        }
        setUnrestrictDialog({open: true, user});
    };

    const handleCloseUnrestrictDialog = () => {
        setUnrestrictDialog({open: false, user: null});
    };

    const submitUnrestrict = async (user) => {
        const accountId = resolveAccountId(user);
        if (accountId === null || accountId === undefined || accountId === "") return false;
        setRestrictingId(accountId, true);
        try {
            await setAccountRestricted(accountId, {
                isRestricted: false,
                reason: "Gỡ hạn chế bởi quản trị viên",
            });
            updateUserByAccountId(accountId, buildRestrictPatch(user, false));
            enqueueSnackbar("Đã gỡ hạn chế tài khoản.", {variant: "success"});
            return true;
        } catch (e) {
            console.error("setAccountRestricted (unrestrict) failed", e);
            const msg = e?.response?.data?.message || e?.response?.data?.body?.message;
            enqueueSnackbar(msg || "Không thể gỡ hạn chế. Vui lòng thử lại.", {variant: "error"});
            return false;
        } finally {
            setRestrictingId(accountId, false);
        }
    };

    const submitUnrestrictConfirm = async () => {
        const user = unrestrictDialog.user;
        if (!user) return;
        const ok = await submitUnrestrict(user);
        if (ok) handleCloseUnrestrictDialog();
    };

    const handleCloseRestrictDialog = () => {
        setRestrictDialog({open: false, user: null});
        setRestrictReasonInput("");
    };

    const submitRestrictConfirm = async () => {
        const user = restrictDialog.user;
        const accountId = resolveAccountId(user);
        if (accountId === null || accountId === undefined || accountId === "") return;
        const reason = restrictReasonInput.trim() || "Hạn chế bởi quản trị viên";
        setRestrictingId(accountId, true);
        try {
            await setAccountRestricted(accountId, {isRestricted: true, reason});
            updateUserByAccountId(accountId, buildRestrictPatch(user, true, reason));
            enqueueSnackbar("Đã hạn chế tài khoản.", {variant: "success"});
            handleCloseRestrictDialog();
        } catch (e) {
            console.error("setAccountRestricted (restrict) failed", e);
            const msg = e?.response?.data?.message || e?.response?.data?.body?.message;
            enqueueSnackbar(msg || "Không thể hạn chế tài khoản. Vui lòng thử lại.", {variant: "error"});
        } finally {
            setRestrictingId(accountId, false);
        }
    };

    const renderRestrictToggle = (user) => {
        const accountId = resolveAccountId(user);
        const restricted = !!(user?.isRestricted ?? user?.account?.isRestricted);
        if (accountId === null || accountId === undefined || accountId === "") {
            return (
                <Typography variant="body2" sx={{color: "#94a3b8"}}>
                    —
                </Typography>
            );
        }
        const busy = restrictingAccountIds.has(accountIdSetKey(accountId));
        return (
            <Switch
                size="medium"
                checked={restricted}
                disabled={busy}
                onChange={(_, checked) => handleRestrictSwitch(user, checked)}
                color={restricted ? "error" : "default"}
                inputProps={{"aria-label": "Bật hoặc tắt hạn chế tài khoản"}}
            />
        );
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

    const getStatusLabel = (status) => {
        if (!status) return "Không xác định";
        if (status === "ACCOUNT_ACTIVE") return "Hoạt động";
        if (status === "ACCOUNT_PENDING_VERIFY") return "Chờ duyệt";
        if (status === "ACCOUNT_INACTIVE") return "Không hoạt động";
        if (status === "ACCOUNT_RESTRICTED") return "Bị hạn chế";
        return status;
    };

    const getFoundedYear = (foundingDate) => {
        if (!foundingDate) return "-";
        const year = new Date(foundingDate).getFullYear();
        return Number.isNaN(year) ? "-" : year;
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return "-";
        const parsed = new Date(dateValue);
        if (Number.isNaN(parsed.getTime())) return "-";
        return parsed.toLocaleDateString("vi-VN");
    };

    const handleExportExcel = async () => {
        if (exporting) return;
        setExporting(true);
        try {
            const isSchoolTab = roleTab === "SCHOOL";
            const res = isSchoolTab
                ? await exportSchools()
                : await exportUsersByRole({role: "PARENT"});
            const fileBlob = res?.data;
            if (!fileBlob) {
                enqueueSnackbar("Không có dữ liệu để xuất file.", {variant: "warning"});
                return;
            }

            const contentDisposition = res?.headers?.["content-disposition"] || "";
            const fileNameFromHeader = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i)?.[1];
            const fileName = decodeURIComponent((fileNameFromHeader || "").replace(/"/g, "")) ||
                (isSchoolTab
                    ? `danh-sach-nha-truong-${new Date().toISOString().slice(0, 10)}.xlsx`
                    : `danh-sach-phu-huynh-${new Date().toISOString().slice(0, 10)}.xlsx`);

            const downloadUrl = window.URL.createObjectURL(fileBlob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
            enqueueSnackbar("Xuất file Excel thành công.", {variant: "success"});
        } catch (error) {
            console.error("Export excel failed", error);
            enqueueSnackbar("Xuất file Excel thất bại.", {variant: "error"});
        } finally {
            setExporting(false);
        }
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
            <Typography sx={{fontSize: 12, color: "#2563eb", mb: 0.35, fontWeight: 700}}>{label}</Typography>
            <Typography sx={{fontSize: 14, color: "#1e293b", fontWeight: 600}}>{value || "-"}</Typography>
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
        if (status === "ACCOUNT_INACTIVE") {
            return (
                <Chip
                    label="Không hoạt động"
                    size="small"
                    sx={{
                        bgcolor: "rgba(71,85,105,0.16)",
                        color: "#475569",
                        border: "1px solid rgba(71,85,105,0.28)",
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

    const restrictConfirmLoading =
        !!restrictDialog.open &&
        restrictingAccountIds.has(accountIdSetKey(resolveAccountId(restrictDialog.user)));

    const unrestrictConfirmLoading =
        !!unrestrictDialog.open &&
        restrictingAccountIds.has(accountIdSetKey(resolveAccountId(unrestrictDialog.user)));

    return (
        <Box
            sx={{
                p: {xs: 1, md: 2},
                borderRadius: 4,
                bgcolor: "#ffffff",
                color: "#1e293b",
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
                    background: "linear-gradient(95deg, #60a5fa 0%, #818cf8 46%, #a78bfa 100%)",
                    boxShadow: "0 12px 24px rgba(99, 102, 241, 0.2)",
                }}
            >
                <CardContent sx={{p: {xs: 1.5, md: 1.9}, "&:last-child": {pb: {xs: 1.5, md: 1.9}}}}>
                    <Box sx={{display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2}}>
                        <Box sx={{display: "flex", alignItems: "center", gap: 1.5}}>
                            <Avatar
                                sx={{
                                    bgcolor: alpha("#ffffff", 0.28),
                                    color: "white",
                                    width: 34,
                                    height: 34,
                                    border: "1px solid rgba(255,255,255,0.45)",
                                }}
                            >
                                <PeopleIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h6" sx={{fontWeight: 800, lineHeight: 1.2, textShadow: "0 1px 2px rgba(15,23,42,0.24)"}}>
                                    Quản Lý Người Dùng
                                </Typography>
                                <Typography variant="body2" sx={{opacity: 1, mt: 0.3, fontSize: 13, fontWeight: 500, textShadow: "0 1px 2px rgba(15,23,42,0.2)"}}>
                                    Hệ thống quản lý và theo dõi tài khoản người dùng
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

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
                                    "&.Mui-selected": {color: "#1e293b", bgcolor: "#ede9fe"},
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
                                    "&.Mui-selected": {color: "#1e293b", bgcolor: "#e0f2fe"},
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
                                placeholder="Tìm theo tên..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                sx={{
                                    minWidth: {xs: "100%", sm: 300},
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: 999,
                                        bgcolor: "#ffffff",
                                        color: "#1e293b",
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
                            <IconButton
                                onClick={handleExportExcel}
                                disabled={exporting}
                                sx={{color: "#64748b", border: "1px solid #cbd5e1"}}
                            >
                                <DownloadIcon fontSize="small"/>
                            </IconButton>
                        </Box>
                    </Box>

                    <TableContainer component={Paper} elevation={0} sx={adminTableContainerSx}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={adminTableHeadRowSx}>
                                    <TableCell align="center" sx={{...adminTableHeadCellSx, width: 60}}>
                                        STT
                                    </TableCell>
                                    {roleTab === "SCHOOL" && (
                                        <>
                                            <TableCell sx={{...adminTableHeadCellSx, width: 56, pl: 1.5, pr: 0.5}}>
                                                
                                            </TableCell>
                                            <TableCell align="center" sx={{...adminTableHeadCellSx, minWidth: 240}}>
                                                Tên trường
                                            </TableCell>
                                            <TableCell align="center" sx={{...adminTableHeadCellSx, width: 160}}>
                                                Mã số thuế
                                            </TableCell>
                                            <TableCell align="center" sx={{...adminTableHeadCellSx, minWidth: 180}}>
                                                Website
                                            </TableCell>
                                            <TableCell align="center" sx={{...adminTableHeadCellSx, width: 150}}>
                                                Hotline
                                            </TableCell>
                                            <TableCell align="center" sx={{...adminTableHeadCellSx, width: 140}}>
                                                Trạng thái
                                            </TableCell>
                                            <TableCell align="center" sx={{...adminTableHeadCellSx, minWidth: 120}}>
                                                Hạn chế
                                            </TableCell>
                                        </>
                                    )}
                                    {roleTab === "PARENT" && (
                                        <>
                                            <TableCell align="center" sx={{...adminTableHeadCellSx, minWidth: 220}}>
                                                Họ tên
                                            </TableCell>
                                            <TableCell align="center" sx={{...adminTableHeadCellSx, minWidth: 240}}>
                                                Email
                                            </TableCell>
                                            <TableCell align="center" sx={{...adminTableHeadCellSx, minWidth: 140}}>
                                                Số điện thoại
                                            </TableCell>
                                            <TableCell align="center" sx={{...adminTableHeadCellSx, minWidth: 150}}>
                                                Trạng thái
                                            </TableCell>
                                            <TableCell align="center" sx={{...adminTableHeadCellSx, minWidth: 140}}>
                                                Hạn chế
                                            </TableCell>
                                        </>
                                    )}
                                    <TableCell align="center" sx={{...adminTableHeadCellSx, width: roleTab === "PARENT" ? 92 : 78, px: 0.5}}>
                                        Chi Tiết
                                    </TableCell>
                                    {roleTab === "SCHOOL" && (
                                        <TableCell align="center" sx={{...adminTableHeadCellSx, width: 72, px: 0.5}}>
                                            Campus
                                        </TableCell>
                                    )}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={roleTab === "SCHOOL" ? 10 : 7} align="center" sx={{py: 4, color: "#64748b"}}>
                                            <Typography variant="body2" sx={{color: "#64748b"}}>
                                                Đang tải dữ liệu...
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : displayedUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={roleTab === "SCHOOL" ? 10 : 7} align="center" sx={{py: 4}}>
                                            <Typography variant="body1" sx={{color: '#64748b'}}>
                                                {users.length === 0
                                                    ? "Chưa có dữ liệu người dùng"
                                                    : "Không tìm thấy người dùng phù hợp"}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    displayedUsers.map((user, index) => (
                                        <TableRow
                                            key={resolveAccountId(user) || user.schoolId || index}
                                            hover
                                            sx={adminTableBodyRowSx}
                                        >
                                            <TableCell align="center">
                                                <Chip
                                                    label={pagination.page * pagination.pageSize + index + 1}
                                                    size="small"
                                                    sx={{
                                                        width: 28,
                                                        height: 24,
                                                        fontWeight: 700,
                                                        bgcolor: "rgba(37,99,235,0.18)",
                                                        color: APP_PRIMARY_MAIN,
                                                        border: "1px solid rgba(96,165,250,0.35)",
                                                    }}
                                                />
                                            </TableCell>
                                            {roleTab === "SCHOOL" && (
                                                <>
                                                    <TableCell align="left" sx={{pl: 1.5, pr: 0.5}}>
                                                        <Avatar
                                                            src={user.logoUrl || undefined}
                                                            alt={user.schoolName || "logo trường"}
                                                            sx={{width: 34, height: 34, bgcolor: "#e2e8f0"}}
                                                        >
                                                            {(user.schoolName || "S").charAt(0).toUpperCase()}
                                                        </Avatar>
                                                    </TableCell>
                                                    <TableCell align="left" sx={{pl: 0.5}}>
                                                        <Typography sx={{fontWeight: 600, fontSize: 14, color: "#1e293b"}}>
                                                            {user.schoolName || "Trường chưa đặt tên"}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Typography sx={{fontSize: 14, color: "#334155"}}>
                                                            {user.taxCode || "-"}
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
                                                        {renderStatusChip(user.overallStatus || user.status || user.primaryCampus?.status)}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {renderRestrictToggle(user)}
                                                    </TableCell>
                                                </>
                                            )}
                                            {roleTab === "PARENT" && (
                                                <>
                                                    <TableCell align="center">
                                                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.25}>
                                                            <Avatar
                                                                src={user.avatar || undefined}
                                                                alt={user.name || ""}
                                                                sx={{width: 34, height: 34, bgcolor: "#e2e8f0", flexShrink: 0}}
                                                            >
                                                                {(user.name || "?").charAt(0).toUpperCase()}
                                                            </Avatar>
                                                            <Typography sx={{fontSize: 14, fontWeight: 700, color: "#1e293b"}}>
                                                                {user.name || "-"}
                                                            </Typography>
                                                        </Stack>
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
                                                        {renderRestrictToggle(user)}
                                                    </TableCell>
                                                </>
                                            )}
                                            <TableCell align="center" sx={{px: 0.5}}>
                                                {roleTab === "SCHOOL" ? (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleOpenSchoolDetail(user)}
                                                        aria-label="Xem chi tiết trường"
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
                                            {roleTab === "SCHOOL" && (
                                                <TableCell align="center" sx={{px: 0.5}}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleOpenCampuses(user?.schoolId)}
                                                        disabled={!user?.schoolId}
                                                        aria-label="Xem campus"
                                                        sx={{color: "#2563eb"}}
                                                    >
                                                        <SchoolIcon fontSize="small"/>
                                                    </IconButton>
                                                </TableCell>
                                            )}
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
                            count={totalListPages}
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
                                    bgcolor: `${APP_PRIMARY_MAIN} !important`,
                                    color: "#ffffff",
                                    borderColor: APP_PRIMARY_MAIN,
                                    boxShadow: "0 6px 14px rgba(37,99,235,0.35)",
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
                        color: "#1e293b",
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
                            <Stack direction="row" spacing={0.8} alignItems="center" sx={{mb: 1}}>
                                <PeopleIcon sx={{fontSize: 17, color: "#2563eb"}} />
                                <Typography sx={{fontSize: 13, fontWeight: 800, color: "#2563eb"}}>
                                    Thông tin cơ bản
                                </Typography>
                            </Stack>
                            <Box
                                sx={{
                                    border: "1px solid #bfdbfe",
                                    borderRadius: 2.25,
                                    bgcolor: "#ffffff",
                                    px: 1.4,
                                    py: 1.25,
                                    mb: 1,
                                    boxShadow: "0 5px 12px rgba(37,99,235,0.08)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                }}
                            >
                                <Avatar
                                    src={selectedParent?.avatar || undefined}
                                    alt={selectedParent?.name || ""}
                                    sx={{width: 56, height: 56, flexShrink: 0}}
                                >
                                    {(selectedParent?.name || "?").charAt(0).toUpperCase()}
                                </Avatar>
                                <Typography sx={{fontSize: 18, color: "#1e293b", fontWeight: 700, lineHeight: 1.25}}>
                                    {selectedParent?.name || "-"}
                                </Typography>
                            </Box>
                            <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 1}}>
                                {renderDetailField("Giới tính", getGenderLabel(selectedParent?.gender))}
                                {renderDetailField("Vai trò", getRoleLabel(selectedParent?.role))}
                                {renderDetailField("Mối quan hệ", getRelationshipLabel(selectedParent?.relationship))}
                            </Box>
                        </Box>

                        <Box sx={detailSectionSx}>
                            <Stack direction="row" spacing={0.8} alignItems="center" sx={{mb: 1}}>
                                <CallIcon sx={{fontSize: 17, color: "#2563eb"}} />
                                <Typography sx={{fontSize: 13, fontWeight: 800, color: "#2563eb"}}>
                                    Liên hệ
                                </Typography>
                            </Stack>
                            <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 1}}>
                                {renderDetailField("Email", selectedParent?.email)}
                                {renderDetailField("Số điện thoại", selectedParent?.phone)}
                                {renderDetailField("Địa chỉ", selectedParent?.currentAddress, true)}
                            </Box>
                        </Box>

                        <Box sx={detailSectionSx}>
                            <Stack direction="row" spacing={0.8} alignItems="center" sx={{mb: 1}}>
                                <BadgeIcon sx={{fontSize: 17, color: "#2563eb"}} />
                                <Typography sx={{fontSize: 13, fontWeight: 800, color: "#2563eb"}}>
                                    Thông tin cá nhân
                                </Typography>
                            </Stack>
                            <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 1}}>
                                {renderDetailField("Số CCCD/CMND", maskIdCardNumber(selectedParent?.idCardNumber))}
                                {renderDetailField("Nghề nghiệp", selectedParent?.occupation)}
                                {renderDetailField("Nơi làm việc", selectedParent?.workplace)}
                            </Box>
                        </Box>

                        <Box sx={detailSectionSx}>
                            <Stack direction="row" spacing={0.8} alignItems="center" sx={{mb: 1}}>
                                <LockIcon sx={{fontSize: 17, color: "#2563eb"}} />
                                <Typography sx={{fontSize: 13, fontWeight: 800, color: "#2563eb"}}>
                                    Trạng thái tài khoản
                                </Typography>
                            </Stack>
                            <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 1}}>
                                <Box sx={{border: "1px solid #bfdbfe", borderRadius: 2.25, bgcolor: "#ffffff", px: 1.3, py: 1.1, boxShadow: "0 5px 12px rgba(37,99,235,0.08)"}}>
                                    <Typography sx={{fontSize: 12, color: "#2563eb", mb: 0.5, fontWeight: 700}}>Trạng thái</Typography>
                                    {renderStatusChip(selectedParent?.status)}
                                </Box>
                                <Box sx={{border: "1px solid #bfdbfe", borderRadius: 2.25, bgcolor: "#ffffff", px: 1.3, py: 1.1, boxShadow: "0 5px 12px rgba(37,99,235,0.08)"}}>
                                    <Typography sx={{fontSize: 12, color: "#2563eb", mb: 0.5, fontWeight: 700}}>Bị hạn chế</Typography>
                                    {renderRestrictedChip(!!selectedParent?.isRestricted)}
                                </Box>
                                {selectedParent?.isRestricted && renderDetailField("Lý do hạn chế", selectedParent?.restrictionReason, true)}
                            </Box>
                        </Box>
                    </Stack>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!selectedSchool}
                onClose={handleCloseSchoolDetail}
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
                        color: "#1e293b",
                        pb: 1.2,
                        background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 48%, #93c5fd 100%)",
                        borderBottom: "1px solid #93c5fd",
                    }}
                >
                    Chi tiết nhà trường
                </DialogTitle>
                <DialogContent dividers sx={{bgcolor: "#eff6ff"}}>
                    <Stack spacing={1.5}>
                        <Box sx={detailSectionSx}>
                            <Stack direction="row" spacing={0.8} alignItems="center" sx={{mb: 1}}>
                                <ApartmentIcon sx={{fontSize: 17, color: "#2563eb"}} />
                                <Typography sx={{fontSize: 13, fontWeight: 800, color: "#2563eb"}}>
                                    Thông tin chung
                                </Typography>
                            </Stack>
                            <Box
                                sx={{
                                    border: "1px solid #bfdbfe",
                                    borderRadius: 2.25,
                                    bgcolor: "#ffffff",
                                    px: 1.4,
                                    py: 1.25,
                                    boxShadow: "0 5px 12px rgba(37,99,235,0.08)",
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 1.5,
                                }}
                            >
                                <Avatar
                                    src={selectedSchool?.logoUrl || undefined}
                                    alt={selectedSchool?.schoolName || "logo"}
                                    sx={{width: 56, height: 56, mt: 0.2}}
                                >
                                    {(selectedSchool?.schoolName || "S").charAt(0).toUpperCase()}
                                </Avatar>
                                <Box sx={{minWidth: 0}}>
                                    <Typography sx={{fontSize: 18, color: "#1e293b", fontWeight: 700, lineHeight: 1.25, mb: 0.9}}>
                                        {selectedSchool?.schoolName || "-"}
                                    </Typography>
                                    <Typography sx={{fontSize: 14, color: "#1e293b", lineHeight: 1.45}}>
                                        {selectedSchool?.schoolDescription || "-"}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>

                        <Box sx={detailSectionSx}>
                            <Stack direction="row" spacing={0.8} alignItems="center" sx={{mb: 1}}>
                                <PlaceIcon sx={{fontSize: 17, color: "#2563eb"}} />
                                <Typography sx={{fontSize: 13, fontWeight: 800, color: "#2563eb"}}>
                                    Cơ sở chính
                                </Typography>
                            </Stack>
                            <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 1}}>
                                {renderDetailField("Tên cơ sở", selectedSchool?.primaryCampus?.campusName)}
                                {renderDetailField("Số điện thoại", selectedSchool?.primaryCampus?.phoneNumber)}
                                {renderDetailField("Địa chỉ", selectedSchool?.primaryCampus?.address, true)}
                            </Box>
                        </Box>

                        <Box sx={detailSectionSx}>
                            <Stack direction="row" spacing={0.8} alignItems="center" sx={{mb: 1}}>
                                <InsightsIcon sx={{fontSize: 17, color: "#2563eb"}} />
                                <Typography sx={{fontSize: 13, fontWeight: 800, color: "#2563eb"}}>
                                    Thông tin hệ thống
                                </Typography>
                            </Stack>
                            <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 1}}>
                                {renderDetailField("Mã số thuế", selectedSchool?.taxCode)}
                                {renderDetailField("Ngày thành lập", formatDate(selectedSchool?.foundingDate))}
                                {renderDetailField("Số cơ sở", selectedSchool?.campusCount ?? "-")}
                                {renderDetailField("Số tư vấn viên", selectedSchool?.counsellorCount ?? "-")}
                            </Box>
                        </Box>

                        <Box sx={detailSectionSx}>
                            <Stack direction="row" spacing={0.8} alignItems="center" sx={{mb: 1}}>
                                <CallIcon sx={{fontSize: 17, color: "#2563eb"}} />
                                <Typography sx={{fontSize: 13, fontWeight: 800, color: "#2563eb"}}>
                                    Liên hệ
                                </Typography>
                            </Stack>
                            <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 1}}>
                                {renderDetailField("Hotline", selectedSchool?.hotline)}
                                {renderDetailField("Website", selectedSchool?.websiteUrl)}
                            </Box>
                        </Box>

                        <Box sx={detailSectionSx}>
                            <Stack direction="row" spacing={0.8} alignItems="center" sx={{mb: 1}}>
                                <BadgeIcon sx={{fontSize: 17, color: "#2563eb"}} />
                                <Typography sx={{fontSize: 13, fontWeight: 800, color: "#2563eb"}}>
                                    Đại diện
                                </Typography>
                            </Stack>
                            <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 1}}>
                                {renderDetailField("Người đại diện", selectedSchool?.representativeName)}
                            </Box>
                        </Box>

                        <Box sx={detailSectionSx}>
                            <Stack direction="row" spacing={0.8} alignItems="center" sx={{mb: 1}}>
                                <LockIcon sx={{fontSize: 17, color: "#2563eb"}} />
                                <Typography sx={{fontSize: 13, fontWeight: 800, color: "#2563eb"}}>
                                    Trạng thái
                                </Typography>
                            </Stack>
                            <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 1}}>
                                <Box sx={{border: "1px solid #bfdbfe", borderRadius: 2.25, bgcolor: "#ffffff", px: 1.3, py: 1.1, boxShadow: "0 5px 12px rgba(37,99,235,0.08)"}}>
                                    <Typography sx={{fontSize: 12, color: "#2563eb", mb: 0.5, fontWeight: 700}}>Trạng thái tổng</Typography>
                                    {renderStatusChip(selectedSchool?.overallStatus || selectedSchool?.status)}
                                </Box>
                            </Box>
                        </Box>
                    </Stack>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={restrictDialog.open}
                title="Hạn chế tài khoản"
                description={
                    restrictDialog.user ? (
                        <>
                            Bạn có chắc muốn <ConfirmHighlight>hạn chế tài khoản</ConfirmHighlight>{" "}
                            <ConfirmHighlight>
                                {restrictDialog.user?.name || restrictDialog.user?.schoolName || "Người dùng"}
                            </ConfirmHighlight>
                            ?
                        </>
                    ) : (
                        ""
                    )
                }
                extraDescription={
                    <>
                        Có thể ghi lý do bên dưới (tùy chọn). Tài khoản sẽ bị{" "}
                        <ConfirmHighlight>giới hạn theo chính sách hệ thống</ConfirmHighlight>.
                    </>
                }
                cancelText="Hủy"
                confirmText={restrictConfirmLoading ? "Đang xử lý..." : "Xác nhận hạn chế"}
                loading={restrictConfirmLoading}
                onCancel={handleCloseRestrictDialog}
                onConfirm={() => void submitRestrictConfirm()}
                confirmButtonSx={{
                    background: "#dc2626",
                    boxShadow: "0 6px 14px rgba(220,38,38,0.32)",
                    "&:hover": {
                        background: "#b91c1c",
                        boxShadow: "0 8px 16px rgba(220,38,38,0.38)",
                    },
                }}
            >
                <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Lý do hạn chế"
                    placeholder="Ví dụ: Vi phạm điều khoản sử dụng..."
                    value={restrictReasonInput}
                    onChange={(e) => setRestrictReasonInput(e.target.value)}
                    disabled={restrictConfirmLoading}
                    sx={{
                        "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            bgcolor: "#ffffff",
                        },
                    }}
                />
            </ConfirmDialog>

            <ConfirmDialog
                open={unrestrictDialog.open}
                title="Gỡ hạn chế tài khoản"
                description={
                    unrestrictDialog.user ? (
                        <>
                            Bạn có chắc muốn <ConfirmHighlight>gỡ hạn chế</ConfirmHighlight> cho tài khoản{" "}
                            <ConfirmHighlight>
                                {unrestrictDialog.user?.name || unrestrictDialog.user?.schoolName || "Người dùng"}
                            </ConfirmHighlight>
                            ?
                        </>
                    ) : (
                        ""
                    )
                }
                extraDescription={
                    <>
                        Sau khi gỡ, người dùng có thể <ConfirmHighlight>sử dụng tài khoản</ConfirmHighlight> theo quyền và
                        chính sách hiện hành của hệ thống.
                    </>
                }
                cancelText="Hủy"
                confirmText={unrestrictConfirmLoading ? "Đang xử lý..." : "Xác nhận gỡ hạn chế"}
                loading={unrestrictConfirmLoading}
                onCancel={handleCloseUnrestrictDialog}
                onConfirm={() => void submitUnrestrictConfirm()}
            />
        </Box>
    );
}
