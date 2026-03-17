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
    Link
} from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {useNavigate, useParams} from "react-router-dom";
import {enqueueSnackbar} from "notistack";
import {getCampusCounsellors} from "../../../services/AdminService.jsx";

export default function AdminCampusConsultants() {
    const navigate = useNavigate();
    const {campusId} = useParams();

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [campusId]);

    const renderStatusChip = (status) => {
        if (!status) return <Chip label="Không xác định" size="small"/>;
        if (status === "ACCOUNT_ACTIVE") return <Chip label="Hoạt động" size="small" color="success"/>;
        if (status === "ACCOUNT_RESTRICTED") return <Chip label="Bị hạn chế" size="small" color="error"/>;
        return <Chip label={status} size="small"/>;
    };

    const campusLabel = campusName || `Campus ${campusId}`;

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
                <Typography color="inherit">{campusLabel}</Typography>
                <Typography color="text.primary">Consultants</Typography>
            </Breadcrumbs>

            <Box sx={{display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2}}>
                <Box sx={{display: "flex", alignItems: "center", gap: 2}}>
                    <IconButton onClick={() => navigate(-1)} size="small">
                        <ArrowBackIcon/>
                    </IconButton>
                    <GroupIcon sx={{fontSize: 30, color: "#1d4ed8"}}/>
                    <Typography variant="h5" sx={{fontWeight: 700, color: "#1e293b"}}>
                        Danh Sách Tư Vấn Viên
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
                            Đang tải danh sách tư vấn viên...
                        </Typography>
                    ) : null}

                    {consultants.length === 0 && !loading ? (
                        <Box sx={{py: 4, textAlign: "center"}}>
                            <Typography variant="h6" sx={{mb: 1, color: "#0f172a"}}>
                                Campus này chưa có tư vấn viên
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b"}}>
                                Khi campus thêm tư vấn viên mới, bạn sẽ thấy thông tin hiển thị tại đây.
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer component={Paper} elevation={0}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{bgcolor: "#f8fafc"}}>
                                        <TableCell sx={{fontWeight: 700, color: "#1e293b", width: 60}}>
                                            STT
                                        </TableCell>
                                        <TableCell sx={{fontWeight: 700, color: "#1e293b", minWidth: 180}}>
                                            Tên
                                        </TableCell>
                                        <TableCell sx={{fontWeight: 700, color: "#1e293b", minWidth: 220}}>
                                            Email
                                        </TableCell>
                                        <TableCell sx={{fontWeight: 700, color: "#1e293b", minWidth: 180}}>
                                            Mã nhân viên
                                        </TableCell>
                                        <TableCell sx={{fontWeight: 700, color: "#1e293b", width: 140}}>
                                            Trạng thái
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {consultants.map((item, index) => (
                                        <TableRow key={item.counsellorId || item.accountId || index} hover>
                                            <TableCell>
                                                {pagination.page * pagination.pageSize + index + 1}
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={{fontWeight: 600, fontSize: 14}}>
                                                    {item.name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={{fontSize: 13}}>
                                                    {item.email}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={{fontSize: 13}}>
                                                    {item.employeeCode}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {renderStatusChip(item.status)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {consultants.length > 0 && (
                        <Box sx={{display: "flex", justifyContent: "space-between", mt: 2}}>
                            <Typography variant="body2" sx={{color: "#64748b"}}>
                                Trang {pagination.page + 1} / {Math.max(pagination.totalPages, 1)} –{" "}
                                {pagination.totalItems} tư vấn viên
                            </Typography>
                            <Box sx={{display: "flex", gap: 1}}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    disabled={!pagination.hasPrevious || loading}
                                    onClick={() => fetchConsultants(pagination.page - 1)}
                                >
                                    Trước
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    disabled={!pagination.hasNext || loading}
                                    onClick={() => fetchConsultants(pagination.page + 1)}
                                >
                                    Sau
                                </Button>
                            </Box>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}

