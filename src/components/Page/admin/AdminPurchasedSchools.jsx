import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Avatar,
    Box,
    Card,
    CardContent,
    CircularProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    alpha,
} from "@mui/material";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { enqueueSnackbar } from "notistack";
import { useLocation } from "react-router-dom";
import {
    adminTableBodyRowSx,
    adminTableContainerSx,
    adminTableHeadCellSx,
    adminTableHeadRowSx,
} from "../../../constants/adminTableStyles.js";
import { getAdminActiveSchoolList } from "../../../services/AdminService.jsx";

function normalizeActiveSchool(item, index) {
    return {
        id: item?.id ?? index + 1,
        schoolName: String(item?.schoolName || "—"),
        subscriptionName: String(item?.subscriptionName || "—"),
        licenseKey: String(item?.licenseKey || "—"),
        startDate: item?.startDate || "",
        endDate: item?.endDate || "",
        daysRemaining: Number.isFinite(Number(item?.daysRemaining)) ? Number(item.daysRemaining) : 0,
        isExpiringSoon: item?.isExpiringSoon === true,
    };
}

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("vi-VN");
}

export default function AdminPurchasedSchools() {
    const location = useLocation();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadActiveSchools = useCallback(async () => {
        setLoading(true);
        setItems([]);
        try {
            const response = await getAdminActiveSchoolList();
            const body = Array.isArray(response?.data?.body) ? response.data.body : [];
            setItems(body.map(normalizeActiveSchool));
        } catch (error) {
            console.error(error);
            setItems([]);
            enqueueSnackbar("Không thể tải danh sách trường đã mua gói.", { variant: "error" });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (location.pathname !== "/admin/purchased-schools") return;
        void loadActiveSchools();
    }, [loadActiveSchools, location.pathname, location.key]);

    const sortedItems = useMemo(
        () => [...items].sort((a, b) => Number(a.daysRemaining) - Number(b.daysRemaining)),
        [items]
    );

    return (
        <Box sx={{ p: { xs: 1, md: 2 }, borderRadius: 4, bgcolor: "#ffffff", color: "#1e293b" }}>
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
                <CardContent sx={{ p: { xs: 1.5, md: 1.9 }, "&:last-child": { pb: { xs: 1.5, md: 1.9 } } }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar
                            sx={{
                                bgcolor: alpha("#ffffff", 0.28),
                                color: "white",
                                width: 34,
                                height: 34,
                                border: "1px solid rgba(255,255,255,0.45)",
                            }}
                        >
                            <WorkspacePremiumOutlinedIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                                Trường học đã mua gói
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.3, fontSize: 13, fontWeight: 500 }}>
                                Danh sách trường đang có gói dịch vụ hoạt động
                            </Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <TableContainer component={Paper} elevation={0} sx={adminTableContainerSx}>
                <Table size="small" sx={{ tableLayout: "fixed" }}>
                    <TableHead>
                        <TableRow sx={adminTableHeadRowSx}>
                            <TableCell sx={{ ...adminTableHeadCellSx, width: "44%" }}>Trường học</TableCell>
                            <TableCell sx={{ ...adminTableHeadCellSx, width: "10%" }}>Gói dịch vụ</TableCell>
                            <TableCell sx={{ ...adminTableHeadCellSx, width: "12%" }}>Mã bản quyền</TableCell>
                            <TableCell sx={{ ...adminTableHeadCellSx, width: "11%" }}>Bắt đầu</TableCell>
                            <TableCell sx={{ ...adminTableHeadCellSx, width: "11%" }}>Kết thúc</TableCell>
                            <TableCell sx={{ ...adminTableHeadCellSx, width: "12%" }}>Còn lại (ngày)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                    <CircularProgress size={34} />
                                </TableCell>
                            </TableRow>
                        ) : sortedItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#64748b" }}>
                                    Chưa có dữ liệu trường đã mua gói.
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedItems.map((row, idx) => (
                                <TableRow key={`${row.licenseKey}-${row.id}-${idx}`} hover sx={adminTableBodyRowSx}>
                                    <TableCell sx={{ width: "44%" }}>
                                        <Typography sx={{ fontWeight: 600 }} noWrap title={row.schoolName}>
                                            {row.schoolName}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">{row.subscriptionName}</TableCell>
                                    <TableCell align="center">
                                        <Typography sx={{ fontFamily: "monospace", fontSize: 13 }}>{row.licenseKey}</Typography>
                                    </TableCell>
                                    <TableCell align="center">{formatDate(row.startDate)}</TableCell>
                                    <TableCell align="center">{formatDate(row.endDate)}</TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                                            <Typography
                                                component="span"
                                                sx={{ fontWeight: 700, color: row.isExpiringSoon ? "#b45309" : "#0f172a" }}
                                            >
                                                {row.daysRemaining}
                                            </Typography>
                                            {row.isExpiringSoon ? (
                                                <WarningAmberRoundedIcon sx={{ color: "#b45309", fontSize: 16 }} />
                                            ) : null}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
