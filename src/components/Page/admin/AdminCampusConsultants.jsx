import React, {useEffect, useState} from "react";
import {
    Box,
    Breadcrumbs,
    Button,
    Card,
    CardContent,
    Chip,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Link,
    Pagination,
    Stack,
} from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DownloadIcon from "@mui/icons-material/Download";
import {useLocation, useNavigate, useParams, useSearchParams} from "react-router-dom";
import {enqueueSnackbar} from "notistack";
import {exportCampusCounsellors, getCampusCounsellors} from "../../../services/AdminService.jsx";
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

export default function AdminCampusConsultants() {
    const navigate = useNavigate();
    const {campusId} = useParams();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const schoolId = String(searchParams.get("schoolId") || location.state?.schoolId || "").trim();

    const [consultants, setConsultants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        page: 0,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
    });
    const [displaySchoolName, setDisplaySchoolName] = useState("");
    const [displayCampusName, setDisplayCampusName] = useState("");
    const [exporting, setExporting] = useState(false);

    const schoolNameFromNav = location.state?.schoolName ?? location.state?.schoolLabel;
    const schoolIdFromNav = location.state?.schoolId;
    const campusNameFromNav = location.state?.campusName;
    const campusIdFromNav = location.state?.campusId;

    useEffect(() => {
        if (!schoolId) {
            setDisplaySchoolName("");
            return;
        }
        const fromNav = schoolNameFromNav != null ? String(schoolNameFromNav).trim() : "";
        const navMatches =
            fromNav &&
            (schoolIdFromNav == null || String(schoolIdFromNav) === String(schoolId));
        if (navMatches) {
            setDisplaySchoolName(fromNav);
            try {
                sessionStorage.setItem(adminSchoolDisplayNameStorageKey(schoolId), fromNav);
            } catch {}
            return;
        }
        try {
            const cached = sessionStorage.getItem(adminSchoolDisplayNameStorageKey(schoolId));
            setDisplaySchoolName(cached || "");
        } catch {
            setDisplaySchoolName("");
        }
    }, [schoolId, schoolNameFromNav, schoolIdFromNav]);

    useEffect(() => {
        if (!campusId) {
            setDisplayCampusName("");
            return;
        }
        const fromNav = campusNameFromNav != null ? String(campusNameFromNav).trim() : "";
        const navMatches =
            fromNav &&
            (campusIdFromNav == null || String(campusIdFromNav) === String(campusId));
        if (navMatches) {
            setDisplayCampusName(fromNav);
            try {
                sessionStorage.setItem(adminCampusDisplayNameStorageKey(campusId), fromNav);
            } catch {}
            return;
        }
        try {
            const cached = sessionStorage.getItem(adminCampusDisplayNameStorageKey(campusId));
            setDisplayCampusName(cached || "");
        } catch {
            setDisplayCampusName("");
        }
    }, [campusId, campusNameFromNav, campusIdFromNav]);

    const fetchConsultants = async (page = 0) => {
        setLoading(true);
        try {
            const res = await getCampusCounsellors({campusId, page, pageSize: pagination.pageSize});
            const body = res?.data?.body;
            const items = body?.items || [];
            setConsultants(items);
            const inferredCampus = items.map((i) => i?.campusName).find((s) => s && String(s).trim());
            if (inferredCampus) {
                const cn = String(inferredCampus).trim();
                setDisplayCampusName(cn);
                try {
                    sessionStorage.setItem(adminCampusDisplayNameStorageKey(campusId), cn);
                } catch {}
            }
            const inferredSchool = items.map((i) => i?.schoolName).find((s) => s && String(s).trim());
            if (inferredSchool && schoolId) {
                const sn = String(inferredSchool).trim();
                setDisplaySchoolName(sn);
                try {
                    sessionStorage.setItem(adminSchoolDisplayNameStorageKey(schoolId), sn);
                } catch {}
            }
            setPagination({
                page: body?.currentPage ?? page,
                pageSize: body?.pageSize ?? 10,
                totalItems: body?.totalItems ?? 0,
                totalPages: body?.totalPages ?? 0,
                hasNext: body?.hasNext ?? false,
                hasPrevious: body?.hasPrevious ?? false,
            });
        } catch (e) {
            console.error("Failed to load consultants", e);
            enqueueSnackbar("Không thể tải danh sách tư vấn viên.", {variant: "error"});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConsultants(0);
    }, [campusId]);

    const handleExportCounsellors = async () => {
        if (exporting) return;
        setExporting(true);
        try {
            const res = await exportCampusCounsellors();
            const fileBlob = res?.data;
            if (!fileBlob) {
                enqueueSnackbar("Không có dữ liệu để xuất file.", {variant: "warning"});
                return;
            }

            const contentDisposition = res?.headers?.["content-disposition"] || "";
            const fileNameFromHeader = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i)?.[1];
            const fileName = decodeURIComponent((fileNameFromHeader || "").replace(/"/g, "")) ||
                `danh-sach-tu-van-vien-${new Date().toISOString().slice(0, 10)}.xlsx`;

            const downloadUrl = window.URL.createObjectURL(fileBlob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
            enqueueSnackbar("Xuất file thành công.", {variant: "success"});
        } catch (e) {
            console.error("Export consultants failed", e);
            enqueueSnackbar("Xuất file thất bại.", {variant: "error"});
        } finally {
            setExporting(false);
        }
    };

    const renderStatusChip = (status) => {
        if (!status) return <Chip label="Không xác định" size="small"/>;
        if (status === "ACCOUNT_ACTIVE") return <Chip label="Hoạt động" size="small" color="success"/>;
        if (status === "ACCOUNT_RESTRICTED") return <Chip label="Bị hạn chế" size="small" color="error"/>;
        return <Chip label={status} size="small"/>;
    };

    const schoolTitle = displaySchoolName.trim() || "Nhà trường";
    const campusTitle = displayCampusName.trim() || "Cơ sở";
    const contextLine = [displaySchoolName.trim() || null, displayCampusName.trim() || null]
        .filter(Boolean)
        .join(" · ");

    const goToCampusList = () => {
        if (schoolId) {
            const sn = displaySchoolName.trim();
            navigate(`/admin/schools/${schoolId}/campuses`, {
                state: {
                    schoolId,
                    ...(sn ? {schoolName: sn} : {}),
                },
            });
            return;
        }
        navigate("/admin/users?tab=SCHOOL");
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
                <Link underline="hover" color="inherit" onClick={goToCampusList} sx={{cursor: "pointer", fontWeight: 700}}>
                    {schoolTitle}
                </Link>
                <Typography color="inherit" sx={{fontWeight: 700}}>
                    {campusTitle}
                </Typography>
                <Typography color="text.primary" sx={{fontWeight: 700}}>
                    Tư vấn viên
                </Typography>
            </Breadcrumbs>

            <Box sx={{display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2}}>
                <Box sx={{display: "flex", alignItems: "center", gap: 2}}>
                    <IconButton onClick={() => navigate(-1)} size="small">
                        <ArrowBackIcon/>
                    </IconButton>
                    <GroupIcon sx={{fontSize: 30, color: "#2563eb"}}/>
                    <Box>
                        <Typography variant="h5" sx={{fontWeight: 700, color: "#1e293b"}}>
                            Danh sách tư vấn viên
                        </Typography>
                        {contextLine ? (
                            <Typography variant="body2" sx={{color: "#64748b", mt: 0.35}}>
                                {contextLine}
                            </Typography>
                        ) : null}
                    </Box>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<DownloadIcon/>}
                    onClick={handleExportCounsellors}
                    disabled={exporting}
                    sx={{textTransform: "none", fontWeight: 600}}
                >
                    {exporting ? "Đang xuất..." : "Xuất file"}
                </Button>
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
                            Đang tải danh sách tư vấn viên...
                        </Typography>
                    ) : null}

                    {consultants.length === 0 && !loading ? (
                        <Box sx={{py: 4, textAlign: "center"}}>
                            <Typography variant="h6" sx={{mb: 1, color: "#1e293b"}}>
                                Cơ sở này chưa có tư vấn viên
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b"}}>
                                Khi cơ sở thêm tư vấn viên mới, bạn sẽ thấy thông tin hiển thị tại đây.
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer component={Paper} elevation={0} sx={adminTableContainerSx}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={adminTableHeadRowSx}>
                                        <TableCell align="center" sx={{...adminTableHeadCellSx, width: 60}}>
                                            STT
                                        </TableCell>
                                        <TableCell align="center" sx={{...adminTableHeadCellSx, minWidth: 180}}>
                                            Tên
                                        </TableCell>
                                        <TableCell align="center" sx={{...adminTableHeadCellSx, minWidth: 220}}>
                                            Email
                                        </TableCell>
                                        <TableCell align="center" sx={{...adminTableHeadCellSx, minWidth: 180}}>
                                            Mã nhân viên
                                        </TableCell>
                                        <TableCell align="center" sx={{...adminTableHeadCellSx, width: 140}}>
                                            Trạng thái
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {consultants.map((item, index) => (
                                        <TableRow
                                            key={item.counsellorId || item.accountId || index}
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
                                                    {item.name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography sx={{fontSize: 13}}>
                                                    {item.email}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography sx={{fontSize: 13}}>
                                                    {item.employeeCode}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                {renderStatusChip(item.status)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {consultants.length > 0 && pagination.totalPages > 1 && (
                        <Box sx={{display: "flex", justifyContent: "space-between", mt: 2, alignItems: "center"}}>
                            <Typography variant="body2" sx={{color: "#64748b"}}>
                                Trang {pagination.page + 1} / {Math.max(pagination.totalPages, 1)} –{" "}
                                {pagination.totalItems} tư vấn viên
                            </Typography>
                            <Stack spacing={1} direction="row" justifyContent="flex-end">
                                <Pagination
                                    count={pagination.totalPages || 1}
                                    page={pagination.page + 1}
                                    size="small"
                                    color="primary"
                                    onChange={(_, value) => {
                                        fetchConsultants(value - 1);
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

