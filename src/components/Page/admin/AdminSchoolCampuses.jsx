import React, {useEffect, useState} from "react";
import {
    Box,
    Breadcrumbs,
    Card,
    CardContent,
    Chip,
    IconButton,
    Link,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Pagination,
    Stack,
} from "@mui/material";
import ApartmentIcon from "@mui/icons-material/Apartment";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import {useLocation, useNavigate, useParams} from "react-router-dom";
import {enqueueSnackbar} from "notistack";
import {getSchoolCampuses} from "../../../services/AdminService.jsx";
import {
    adminSttChipSx,
    adminTableBodyRowSx,
    adminTableContainerSx,
    adminTableHeadCellSx,
    adminTableHeadRowSx,
} from "../../../constants/adminTableStyles.js";
import {
    adminCampusDisplayNameStorageKey,
    adminSchoolDisplayNameStorageKey,
} from "../../../constants/adminBreadcrumbStorage.js";

export default function AdminSchoolCampuses() {
    const navigate = useNavigate();
    const location = useLocation();
    const {schoolId} = useParams();

    const [schoolDisplayName, setSchoolDisplayName] = useState("");
    const [campuses, setCampuses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        page: 0,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
    });

    const fetchCampuses = async (page = 0) => {
        setLoading(true);
        try {
            const res = await getSchoolCampuses({schoolId, page, pageSize: pagination.pageSize});
            const body = res?.data?.body;
            const items = body?.items || [];
            setCampuses(items);
            const inferredName = items.map((c) => c?.schoolName).find((s) => s && String(s).trim());
            if (inferredName) {
                const n = String(inferredName).trim();
                setSchoolDisplayName(n);
                try {
                    sessionStorage.setItem(adminSchoolDisplayNameStorageKey(schoolId), n);
                } catch {}
            }
            try {
                items.forEach((c) => {
                    const cid = c?.campusId;
                    const cnm = c?.campusName != null ? String(c.campusName).trim() : "";
                    if (cid != null && cnm) {
                        sessionStorage.setItem(adminCampusDisplayNameStorageKey(cid), cnm);
                    }
                });
            } catch {}
            setPagination({
                page: body?.currentPage ?? page,
                pageSize: body?.pageSize ?? 10,
                totalItems: body?.totalItems ?? 0,
                totalPages: body?.totalPages ?? 0,
                hasNext: body?.hasNext ?? false,
                hasPrevious: body?.hasPrevious ?? false,
            });
        } catch (e) {
            console.error("Failed to load campuses", e);
            enqueueSnackbar("Không thể tải danh sách cơ sở.", {variant: "error"});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampuses(0);
    }, [schoolId]);

    const schoolNameFromNav = location.state?.schoolName;
    const schoolIdFromNav = location.state?.schoolId;
    useEffect(() => {
        const fromNav = schoolNameFromNav != null ? String(schoolNameFromNav).trim() : "";
        const navMatchesSchool =
            fromNav &&
            (schoolIdFromNav == null || String(schoolIdFromNav) === String(schoolId));
        if (navMatchesSchool) {
            setSchoolDisplayName(fromNav);
            try {
                sessionStorage.setItem(adminSchoolDisplayNameStorageKey(schoolId), fromNav);
            } catch {}
            return;
        }
        try {
            const cached = sessionStorage.getItem(adminSchoolDisplayNameStorageKey(schoolId));
            setSchoolDisplayName(cached || "");
        } catch {
            setSchoolDisplayName("");
        }
    }, [schoolId, schoolNameFromNav, schoolIdFromNav]);

    const renderStatusChip = (status) => {
        const norm = String(status ?? "").trim().toUpperCase();
        if (!norm) return <Chip label="Không xác định" size="small"/>;
        if (norm === "ACTIVE" || norm === "ACCOUNT_ACTIVE" || norm === "VERIFIED") {
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
        if (norm === "PENDING" || norm === "ACCOUNT_PENDING_VERIFY") {
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
        if (norm === "ACCOUNT_RESTRICTED") {
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
        if (norm === "ACCOUNT_INACTIVE" || norm === "INACTIVE" || norm === "DISABLED") {
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
        return (
            <Chip
                label={status}
                size="small"
                sx={{
                    bgcolor: "rgba(148,163,184,0.2)",
                    color: "#64748b",
                    border: "1px solid rgba(203,213,225,0.45)",
                    fontWeight: 600,
                }}
            />
        );
    };

    const breadcrumbSchoolLabel = schoolDisplayName.trim() || "Nhà trường";

    const handleOpenConsultants = (campus) => {
        const campusId = campus?.campusId;
        if (!campusId) return;
        const campusNameTrim = String(campus?.campusName || "").trim();
        if (campusNameTrim) {
            try {
                sessionStorage.setItem(adminCampusDisplayNameStorageKey(campusId), campusNameTrim);
            } catch {}
        }
        const schoolNameTrim = schoolDisplayName.trim();
        navigate(`/admin/campuses/${campusId}/consultants?schoolId=${schoolId}`, {
            state: {
                schoolId,
                ...(schoolNameTrim ? {schoolName: schoolNameTrim} : {}),
                campusId,
                ...(campusNameTrim ? {campusName: campusNameTrim} : {}),
            },
        });
    };

    return (
        <Box>
            <Breadcrumbs separator="›" aria-label="điều hướng" sx={{mb: 1}}>
                <Link
                    underline="hover"
                    color="inherit"
                    onClick={() => navigate("/admin/users?tab=SCHOOL")}
                    sx={{cursor: "pointer", fontWeight: 700}}
                >
                    Trường học
                </Link>
                <Typography color="text.primary" sx={{fontWeight: 700}}>
                    {breadcrumbSchoolLabel}
                </Typography>
                <Typography color="text.primary" sx={{fontWeight: 700}}>
                    Cơ sở
                </Typography>
            </Breadcrumbs>

            <Box sx={{display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2}}>
                <Box sx={{display: "flex", alignItems: "center", gap: 2}}>
                    <IconButton onClick={() => navigate("/admin/users?tab=SCHOOL")} size="small">
                        <ArrowBackIcon/>
                    </IconButton>
                    <ApartmentIcon sx={{fontSize: 30, color: "#2563eb"}}/>
                    <Typography variant="h5" sx={{fontWeight: 700, color: "#1e293b"}}>
                        Danh sách cơ sở
                    </Typography>
                </Box>
            </Box>

            <Card
                elevation={2}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e0e7ff",
                }}
            >
                <CardContent>
                    {loading ? (
                        <Typography variant="body2" sx={{color: "#64748b", mb: 2}}>
                            Đang tải danh sách cơ sở...
                        </Typography>
                    ) : null}

                    {campuses.length === 0 && !loading ? (
                        <Box sx={{py: 4, textAlign: "center"}}>
                            <Typography variant="h6" sx={{mb: 1, color: "#1e293b"}}>
                                Trường này chưa có cơ sở
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b"}}>
                                Khi trường thêm cơ sở mới, bạn sẽ thấy thông tin hiển thị tại đây.
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer component={Paper} elevation={0} sx={adminTableContainerSx}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={adminTableHeadRowSx}>
                                        <TableCell
                                            align="center"
                                            sx={{...adminTableHeadCellSx, width: 60}}
                                        >
                                            STT
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={{...adminTableHeadCellSx, minWidth: 200}}
                                        >
                                            Tên cơ sở
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={{...adminTableHeadCellSx, minWidth: 220}}
                                        >
                                            Địa chỉ
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={{...adminTableHeadCellSx, minWidth: 220}}
                                        >
                                            Email
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={{...adminTableHeadCellSx, width: 160}}
                                        >
                                            Số điện thoại
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={{...adminTableHeadCellSx, width: 140}}
                                        >
                                            Tư vấn viên
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={{...adminTableHeadCellSx, width: 140}}
                                        >
                                            Trạng thái
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {campuses.map((campus, index) => (
                                            <TableRow
                                                key={campus.campusId || index}
                                                hover
                                                sx={adminTableBodyRowSx}
                                            >
                                                <TableCell align="center">
                                                    <Chip
                                                        label={pagination.page * pagination.pageSize + index + 1}
                                                        size="small"
                                                        sx={adminSttChipSx}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography sx={{fontWeight: 600, fontSize: 14}}>
                                                        {campus.campusName}
                                                    </Typography>
                                                    {campus.isPrimaryBranch && (
                                                        <Typography
                                                            sx={{
                                                                fontSize: 11,
                                                                color: "#16a34a",
                                                                fontWeight: 600,
                                                                mt: 0.5,
                                                            }}
                                                        >
                                                            (Cơ sở chính)
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography sx={{fontSize: 13}}>
                                                        {campus.address || "-"}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography sx={{fontSize: 13}}>
                                                        {campus.account?.email || "-"}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography sx={{fontSize: 13}}>
                                                        {campus.phoneNumber || "-"}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleOpenConsultants(campus)}
                                                        disabled={!campus?.campusId}
                                                        aria-label="Xem tư vấn viên"
                                                        sx={{color: "#38bdf8"}}
                                                    >
                                                        <SupportAgentIcon fontSize="small"/>
                                                    </IconButton>
                                                </TableCell>
                                                <TableCell align="center">
                                                    {renderStatusChip(campus.status)}
                                                </TableCell>
                                            </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {campuses.length > 0 && pagination.totalPages > 1 && (
                        <Box sx={{display: "flex", justifyContent: "space-between", mt: 2, alignItems: "center"}}>
                            <Typography variant="body2" sx={{color: "#64748b"}}>
                                Trang {pagination.page + 1} / {Math.max(pagination.totalPages, 1)} –{" "}
                                {pagination.totalItems} cơ sở
                            </Typography>
                            <Stack spacing={1} direction="row" justifyContent="flex-end">
                                <Pagination
                                    count={pagination.totalPages || 1}
                                    page={pagination.page + 1}
                                    size="small"
                                    color="primary"
                                    onChange={(_, value) => {
                                        fetchCampuses(value - 1);
                                    }}
                                />
                            </Stack>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}

