import React, {useEffect, useState} from "react";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Avatar,
    Chip,
    Stack,
    CircularProgress,
    IconButton,
    Tooltip,
} from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {enqueueSnackbar} from "notistack";
import {showSuccessSnackbar} from "../../ui/AppSnackbar.jsx";
import {getPendingSchoolRegistrations, verifySchoolRegistration} from "../../../services/AdminService.jsx";

export default function AdminSchoolVerification() {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [verifyingId, setVerifyingId] = useState(null);

    const fetchRegistrations = async () => {
        setLoading(true);
        try {
            const res = await getPendingSchoolRegistrations();
            const list = res?.data?.body || [];
            // Sort newest createdAt first
            const sorted = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setRegistrations(sorted);
        } catch (error) {
            console.error("Failed to load school registrations", error);
            enqueueSnackbar("Không thể tải danh sách hồ sơ trường học.", {variant: "error"});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRegistrations();
    }, []);

    const handleVerify = async (id) => {
        if (!id || verifyingId) return;
        setVerifyingId(id);
        try {
            const res = await verifySchoolRegistration(id);
            if (res && res.status === 200) {
                showSuccessSnackbar("Xác thực trường học thành công!");
                await fetchRegistrations();
            }
        } catch (error) {
            console.error("Verify school registration failed", error);
            const msg = error?.response?.data?.message || "Xác thực thất bại. Vui lòng thử lại.";
            enqueueSnackbar(msg, {variant: "error"});
        } finally {
            setVerifyingId(null);
        }
    };

    const renderStatusChip = (status) => {
        if (status === "ACCOUNT_PENDING_VERIFY" || status === "PENDING") {
            return <Chip label="Chờ xác thực" size="small" color="warning" />;
        }
        if (status === "VERIFIED") {
            return <Chip label="Đã xác thực" size="small" color="success" />;
        }
        return <Chip label={status || "Không xác định"} size="small" />;
    };

    return (
        <Box>
            <Box sx={{display: "flex", alignItems: "center", gap: 2, mb: 3}}>
                <SchoolIcon sx={{fontSize: 32, color: "#1d4ed8"}} />
                <Typography variant="h4" sx={{fontWeight: 700, color: "#1e293b"}}>
                    Xác Thực Trường Học
                </Typography>
            </Box>

            <Card
                elevation={2}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e0e7ff",
                }}
            >
                <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb: 2}}>
                        <Typography variant="subtitle1" sx={{color: "#475569", fontWeight: 600}}>
                            Danh sách hồ sơ đăng ký trường học đang chờ duyệt
                        </Typography>
                    </Stack>

                    <TableContainer component={Paper} elevation={0}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{bgcolor: "#f8fafc"}}>
                                    <TableCell
                                        align="center"
                                        sx={{
                                            fontWeight: 700,
                                            color: "#1e293b",
                                            whiteSpace: "nowrap",
                                            width: 60,
                                        }}
                                    >
                                        STT
                                    </TableCell>
                                    <TableCell
                                        align="center"
                                        sx={{
                                            fontWeight: 700,
                                            color: "#1e293b",
                                            whiteSpace: "nowrap",
                                            minWidth: 260,
                                        }}
                                    >
                                        Trường
                                    </TableCell>
                                    <TableCell
                                        align="center"
                                        sx={{
                                            fontWeight: 700,
                                            color: "#1e293b",
                                            whiteSpace: "nowrap",
                                            width: 140,
                                        }}
                                    >
                                        Mã số thuế
                                    </TableCell>
                                    <TableCell
                                        align="center"
                                        sx={{
                                            fontWeight: 700,
                                            color: "#1e293b",
                                            whiteSpace: "nowrap",
                                            minWidth: 260,
                                        }}
                                    >
                                        Cơ sở
                                    </TableCell>
                                    <TableCell
                                        align="center"
                                        sx={{
                                            fontWeight: 700,
                                            color: "#1e293b",
                                            whiteSpace: "nowrap",
                                            width: 140,
                                        }}
                                    >
                                        Hotline
                                    </TableCell>
                                    <TableCell
                                        align="center"
                                        sx={{
                                            fontWeight: 700,
                                            color: "#1e293b",
                                            whiteSpace: "nowrap",
                                            width: 140,
                                        }}
                                    >
                                        Giấy phép kinh doanh 
                                    </TableCell>
                                    <TableCell
                                        align="center"
                                        sx={{
                                            fontWeight: 700,
                                            color: "#1e293b",
                                            whiteSpace: "nowrap",
                                            width: 130,
                                        }}
                                    >
                                        Trạng thái
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            fontWeight: 700,
                                            color: "#1e293b",
                                            whiteSpace: "nowrap",
                                            width: 130,
                                        }}
                                        align="center"
                                    >
                                        Thao tác
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{py: 4}}>
                                            <CircularProgress size={28} />
                                        </TableCell>
                                    </TableRow>
                                ) : registrations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{py: 4}}>
                                            <Typography variant="body1" sx={{color: "#64748b"}}>
                                                Không có hồ sơ nào đang chờ xác thực.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    registrations.map((item, index) => (
                                        <TableRow key={item.id} hover>
                                            <TableCell align="center">{index + 1}</TableCell>
                                            <TableCell>
                                                <Box>
                                                    <Typography sx={{fontWeight: 600}}>
                                                        {item.schoolName}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{color: "#64748b"}}
                                                    >
                                                        Đại diện: {item.representativeName}
                                                    </Typography>
                                                    {item.websiteUrl && (
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                color: "#2563eb",
                                                                textDecoration: "underline",
                                                                cursor: "pointer",
                                                            }}
                                                            component="a"
                                                            href={item.websiteUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            {item.websiteUrl}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell align="center">{item.taxCode}</TableCell>
                                            <TableCell>
                                                <Typography sx={{fontWeight: 500}}>
                                                    {item.campusName}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{color: "#64748b"}}
                                                >
                                                    {item.campusAddress}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{color: "#64748b"}}
                                                >
                                                    {item.campusPhone}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">{item.hotline}</TableCell>
                                            <TableCell align="center">
                                                {item.businessLicenseUrl ? (
                                                    <Tooltip title="Xem giấy phép kinh doanh">
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            component="a"
                                                            href={item.businessLicenseUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                ) : (
                                                    <Typography variant="body2" sx={{color: "#94a3b8"}}>
                                                        Không có
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="center">{renderStatusChip(item.status)}</TableCell>
                                            <TableCell align="center">
                                                <Tooltip
                                                    title={
                                                        item.status === "VERIFIED"
                                                            ? "Đã xác thực"
                                                            : "Xác thực trường học"
                                                    }
                                                >
                                                    <span>
                                                        <IconButton
                                                            color="primary"
                                                            size="small"
                                                            disabled={
                                                                verifyingId === item.id ||
                                                                item.status === "VERIFIED"
                                                            }
                                                            onClick={() => handleVerify(item.id)}
                                                        >
                                                            {verifyingId === item.id ? (
                                                                <CircularProgress
                                                                    size={20}
                                                                    color="inherit"
                                                                />
                                                            ) : (
                                                                <TaskAltIcon fontSize="small" />
                                                            )}
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
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

