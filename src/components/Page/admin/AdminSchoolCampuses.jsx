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
import {useNavigate, useParams} from "react-router-dom";
import {enqueueSnackbar} from "notistack";
import {getSchoolCampuses} from "../../../services/AdminService.jsx";

export default function AdminSchoolCampuses() {
    const navigate = useNavigate();
    const {schoolId} = useParams();

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
            setCampuses(body?.items || []);
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
            enqueueSnackbar("Không thể tải danh sách campus.", {variant: "error"});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampuses(0);
    }, [schoolId]);

    const renderStatusChip = (status) => {
        if (!status) return <Chip label="Không xác định" size="small"/>;
        if (status === "VERIFIED") return <Chip label="Đã xác thực" size="small" color="success"/>;
        if (status === "PENDING") return <Chip label="Chờ duyệt" size="small" color="warning"/>;
        return <Chip label={status} size="small"/>;
    };

    const handleRowClick = (campus) => {
        const campusId = campus?.campusId;
        if (!campusId) return;
        navigate(`/admin/campuses/${campusId}/consultants`);
    };

    const breadcrumbSchoolLabel = `School ${schoolId}`;

    return (
        <Box>
            <Breadcrumbs separator="›" aria-label="breadcrumb" sx={{mb: 1}}>
                <Link
                    underline="hover"
                    color="inherit"
                    onClick={() => navigate("/admin/users")}
                    sx={{cursor: "pointer"}}
                >
                    Users
                </Link>
                <Typography color="text.primary">{breadcrumbSchoolLabel}</Typography>
            </Breadcrumbs>

            <Box sx={{display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2}}>
                <Box sx={{display: "flex", alignItems: "center", gap: 2}}>
                    <IconButton onClick={() => navigate(-1)} size="small">
                        <ArrowBackIcon/>
                    </IconButton>
                    <ApartmentIcon sx={{fontSize: 30, color: "#1d4ed8"}}/>
                    <Typography variant="h5" sx={{fontWeight: 700, color: "#1e293b"}}>
                        Danh Sách Campus
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
                            Đang tải danh sách campus...
                        </Typography>
                    ) : null}

                    {campuses.length === 0 && !loading ? (
                        <Box sx={{py: 4, textAlign: "center"}}>
                            <Typography variant="h6" sx={{mb: 1, color: "#0f172a"}}>
                                Trường này chưa có campus
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b"}}>
                                Khi trường thêm campus mới, bạn sẽ thấy thông tin hiển thị tại đây.
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer component={Paper} elevation={0}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{bgcolor: "#f8fafc"}}>
                                        <TableCell
                                            align="center"
                                            sx={{fontWeight: 700, color: "#1e293b", width: 60}}
                                        >
                                            STT
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={{fontWeight: 700, color: "#1e293b", minWidth: 200}}
                                        >
                                            Tên campus
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={{fontWeight: 700, color: "#1e293b", minWidth: 220}}
                                        >
                                            Địa chỉ
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={{fontWeight: 700, color: "#1e293b", width: 160}}
                                        >
                                            Số điện thoại
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={{fontWeight: 700, color: "#1e293b", width: 140}}
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
                                                sx={{cursor: "pointer"}}
                                                onClick={() => handleRowClick(campus)}
                                            >
                                                <TableCell align="center">
                                                    {pagination.page * pagination.pageSize + index + 1}
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
                                                        {campus.city} - {campus.district}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography sx={{fontSize: 13}}>
                                                        {campus.phoneNumber}
                                                    </Typography>
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
                                {pagination.totalItems} campus
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

