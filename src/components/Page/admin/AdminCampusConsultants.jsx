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
    adminTableBodyRowSx,
    adminTableContainerSx,
    adminTableHeadCellSx,
    adminTableHeadRowSx,
} from "../../../constants/adminTableStyles.js";

export default function AdminCampusConsultants() {
    const navigate = useNavigate();
    const {campusId} = useParams();
    const location = useLocation();
    const [searchParams] = useSearchParams();

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
    const [campusName, setCampusName] = useState("");
    const [exporting, setExporting] = useState(false);

    const fetchConsultants = async (page = 0) => {
        setLoading(true);
        try {
            const res = await getCampusCounsellors({campusId, page, pageSize: pagination.pageSize});
            const body = res?.data?.body;
            const items = body?.items || [];
            setConsultants(items);
            if (!campusName && items.length > 0) {
                setCampusName(items[0].campusName || "");
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

    const schoolIdFromState = location.state?.schoolId;
    const schoolIdFromQuery = searchParams.get("schoolId");
    const schoolId = schoolIdFromState || schoolIdFromQuery;
    const schoolLabel = location.state?.schoolLabel || (schoolId ? `Trường ${schoolId}` : "Trường");
    const campusLabel = location.state?.campusName || campusName || `Cơ sở ${campusId}`;

    return (
        <Box>
            <Breadcrumbs separator="›" aria-label="điều hướng" sx={{mb: 1}}>
                <Link
                    underline="hover"
                    color="inherit"
                    onClick={() => {
                        if (schoolId) {
                            navigate(`/admin/schools/${schoolId}/campuses`);
                            return;
                        }
                        navigate("/admin/users");
                    }}
                    sx={{cursor: "pointer"}}
                >
                    {schoolLabel}
                </Link>
                <Typography color="inherit">{campusLabel}</Typography>
                <Typography color="text.primary">Tư vấn viên</Typography>
            </Breadcrumbs>

            <Box sx={{display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2}}>
                <Box sx={{display: "flex", alignItems: "center", gap: 2}}>
                    <IconButton onClick={() => navigate(-1)} size="small">
                        <ArrowBackIcon/>
                    </IconButton>
                    <GroupIcon sx={{fontSize: 30, color: "#2563eb"}}/>
                    <Typography variant="h5" sx={{fontWeight: 700, color: "#1e293b"}}>
                        Danh sách tư vấn viên
                    </Typography>
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
                                                {pagination.page * pagination.pageSize + index + 1}
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

