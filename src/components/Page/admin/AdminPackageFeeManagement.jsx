import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    InputLabel,
    IconButton,
    Paper,
    Select,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    alpha,
    MenuItem,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import AddIcon from "@mui/icons-material/Add";
import { enqueueSnackbar } from "notistack";
import { APP_PRIMARY_MAIN } from "../../../constants/homeLandingTheme";
import {
    adminDialogActionsSx,
    adminDialogContentSx,
    adminDialogPaperSx,
    adminDialogTitleSx,
} from "../../../constants/adminDialogStyles.js";
import {
    adminDataCardBorderSx,
    adminTableBodyRowSx,
    adminTableContainerSx,
    adminTableHeadCellSx,
    adminTableHeadRowSx,
} from "../../../constants/adminTableStyles.js";
import { getAdminPackageFees, upsertAdminPackageFee } from "../../../services/AdminService.jsx";

const defaultForm = {
    packageId: null,
    name: "",
    description: "",
    maxCounsellors: "",
    maxAdmissions: "",
    allowChat: false,
    parentPostPermission: "CREATE_POST",
    isFeatured: false,
    topRanking: "",
    supportLevel: "STANDARD",
};

const supportLevelOptions = [
    { value: "BASIC", label: "Hỗ trợ qua Email hoặc gọi điện hotline của trường" },
    { value: "STANDARD", label: "Nhắn tin với tư vấn viên hỗ trợ trực tiếp 24/7" },
    { value: "ENTERPRISE", label: "Hệ thống AI thông minh & Chuyên viên tư vấn cấp cao" },
];

function toVietnameseStatus(status) {
    if (status === "PACKAGE_DRAFT") return "Bản nháp";
    if (status === "PACKAGE_PUBLISHED") return "Đã phát hành";
    return status || "Không xác định";
}

function toVietnamesePermission(permission) {
    if (permission === "CREATE_POST") return "Được tạo bài đăng";
    if (permission === "VIEW_ONLY") return "Chỉ xem bài viết của trường";
    if (permission === "NONE") return "Không có quyền cộng đồng";
    return permission || "Không xác định";
}

function pickHttpErrorMessage(error, fallback) {
    const d = error?.response?.data;
    if (!d || typeof d !== "object") return fallback;
    if (typeof d.message === "string" && d.message.trim()) return d.message.trim();
    if (typeof d.error === "string" && d.error.trim()) return d.error.trim();
    if (typeof d?.body?.message === "string" && d.body.message.trim()) return d.body.message.trim();
    return fallback;
}

function mapPackageFromApi(item) {
    const features = item?.features || {};
    return {
        id: item?.id ?? null,
        name: item?.name || "",
        description: item?.description || "",
        status: item?.status || "",
        features: {
            maxCounsellors: Number(features?.maxCounsellors ?? 0),
            maxAdmissions: Number(features?.maxAdmissions ?? 0),
            allowChat: Boolean(features?.allowChat),
            parentPostPermission: String(features?.parentPostPermission || "CREATE_POST"),
            isFeatured: Boolean(features?.isFeatured),
            topRanking: Number(features?.topRanking ?? 0),
            supportLevel: String(features?.supportLevel || "STANDARD"),
        },
    };
}

function buildPayload(form, isEdit) {
    return {
        ...(isEdit ? { packageId: form.packageId } : {}),
        name: String(form.name).trim(),
        description: String(form.description).trim(),
        featureData: {
            maxCounsellors: Number(form.maxCounsellors),
            maxAdmissions: Number(form.maxAdmissions),
            allowChat: Boolean(form.allowChat),
            parentPostPermission: String(form.parentPostPermission || "CREATE_POST"),
            isFeatured: Boolean(form.isFeatured),
            topRanking: Number(form.topRanking),
            supportLevel: String(form.supportLevel || "STANDARD"),
        },
    };
}

export default function AdminPackageFeeManagement() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const isCompact = useMediaQuery(theme.breakpoints.down("lg"));
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState(defaultForm);

    const isEdit = form.packageId != null;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAdminPackageFees();
            const list = Array.isArray(res?.data?.body) ? res.data.body : [];
            setItems(list.map(mapPackageFromApi));
        } catch (e) {
            console.error(e);
            enqueueSnackbar("Không thể tải danh sách phí gói dịch vụ.", { variant: "error" });
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const sortedItems = useMemo(() => {
        const clone = [...items];
        clone.sort((a, b) => {
            const ra = Number(a.features?.topRanking ?? 0);
            const rb = Number(b.features?.topRanking ?? 0);
            if (ra !== rb) return ra - rb;
            return String(a.name).localeCompare(String(b.name), "vi", { sensitivity: "base" });
        });
        return clone;
    }, [items]);

    const openCreateDialog = () => {
        setForm(defaultForm);
        setDialogOpen(true);
    };

    const openEditDialog = (row) => {
        setForm({
            packageId: row.id,
            name: row.name,
            description: row.description,
            maxCounsellors: row.features.maxCounsellors,
            maxAdmissions: row.features.maxAdmissions,
            allowChat: row.features.allowChat,
            parentPostPermission: row.features.parentPostPermission,
            isFeatured: row.features.isFeatured,
            topRanking: row.features.topRanking,
            supportLevel: row.features.supportLevel,
        });
        setDialogOpen(true);
    };

    const closeDialog = () => {
        if (submitting) return;
        setDialogOpen(false);
        setForm(defaultForm);
    };

    const handleChange = (key) => (e) => {
        const value = e?.target?.type === "checkbox" ? e.target.checked : e.target.value;
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const validateForm = () => {
        if (!String(form.name).trim()) return "Vui lòng nhập tên gói.";
        if (!String(form.description).trim()) return "Vui lòng nhập mô tả gói.";
        if (form.maxCounsellors === "" || Number(form.maxCounsellors) < 0) return "Số tư vấn viên tối đa không hợp lệ.";
        if (form.maxAdmissions === "" || Number(form.maxAdmissions) < 0) return "Số tuyển sinh tối đa không hợp lệ.";
        if (form.topRanking === "" || Number(form.topRanking) < 0) return "Thứ hạng ưu tiên không hợp lệ.";
        return null;
    };

    const submit = async () => {
        const validationError = validateForm();
        if (validationError) {
            enqueueSnackbar(validationError, { variant: "warning" });
            return;
        }
        setSubmitting(true);
        try {
            const payload = buildPayload(form, isEdit);
            await upsertAdminPackageFee(payload);
            enqueueSnackbar(isEdit ? "Cập nhật gói dịch vụ thành công." : "Tạo gói dịch vụ thành công.", {
                variant: "success",
            });
            closeDialog();
            await load();
        } catch (e) {
            console.error(e);
            enqueueSnackbar(pickHttpErrorMessage(e, "Không thể lưu gói dịch vụ. Vui lòng thử lại."), {
                variant: "error",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 1, md: 2 }, borderRadius: 4, bgcolor: "#ffffff", color: "#1e293b" }}>
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3.5,
                    mb: 2.5,
                    color: "white",
                    background: "linear-gradient(95deg, #2563eb 0%, #3158ef 40%, #6d3df2 72%, #8b3dff 100%)",
                    boxShadow: "0 18px 34px rgba(67, 56, 202, 0.28)",
                }}
            >
                <CardContent sx={{ p: { xs: 2.2, md: 2.8 }, "&:last-child": { pb: { xs: 2.2, md: 2.8 } } }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: alpha("#ffffff", 0.2), color: "white", width: 42, height: 42 }}>
                                <MonetizationOnOutlinedIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                    Quản lý phí gói dịch vụ
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.92, mt: 0.45 }}>
                                    Tạo mới hoặc cập nhật gói ở trạng thái Bản nháp
                                </Typography>
                            </Box>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={openCreateDialog}
                            sx={{
                                textTransform: "none",
                                fontWeight: 700,
                                px: 2,
                                boxShadow: "0 6px 14px rgba(37,99,235,0.35)",
                            }}
                        >
                            Tạo gói mới
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            <Card elevation={0} sx={{ ...adminDataCardBorderSx, borderRadius: 2 }}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <TableContainer component={Paper} elevation={0} sx={adminTableContainerSx}>
                        <Table
                            size="small"
                            sx={{
                                width: "100%",
                                minWidth: 0,
                                tableLayout: isCompact ? "fixed" : "auto",
                                "& .MuiTableCell-root": {
                                    px: isCompact ? 0.5 : isMobile ? 0.75 : 1.25,
                                    py: isCompact ? 0.7 : isMobile ? 0.9 : 1.1,
                                    fontSize: isCompact ? 11 : isMobile ? 12 : 14,
                                },
                            }}
                        >
                            <TableHead>
                                <TableRow sx={adminTableHeadRowSx}>
                                    <TableCell sx={adminTableHeadCellSx}>#</TableCell>
                                    <TableCell sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>Tên gói dịch vụ</TableCell>
                                    <TableCell sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>Trạng thái</TableCell>
                                    <TableCell sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>Xếp hạng ưu tiên</TableCell>
                                    <TableCell sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>Mức hỗ trợ</TableCell>
                                    <TableCell sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>Tư vấn viên tối đa</TableCell>
                                    <TableCell sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>Tuyển sinh tối đa</TableCell>
                                    <TableCell sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>Nổi bật</TableCell>
                                    <TableCell sx={{ ...adminTableHeadCellSx, whiteSpace: "normal", lineHeight: 1.2 }}>Thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                                            <CircularProgress size={36} sx={{ color: APP_PRIMARY_MAIN }} />
                                        </TableCell>
                                    </TableRow>
                                ) : sortedItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 4, color: "#64748b" }}>
                                            Chưa có gói dịch vụ nào.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedItems.map((row, idx) => {
                                        const isDraft = row.status === "PACKAGE_DRAFT";
                                        return (
                                            <TableRow key={`${row.id ?? "new"}-${idx}`} hover sx={adminTableBodyRowSx}>
                                                <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>{idx + 1}</TableCell>
                                                <TableCell>
                                                    <Typography
                                                        fontWeight={700}
                                                        color="#1e293b"
                                                        sx={{
                                                            minWidth: isCompact ? 0 : 220,
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                        }}
                                                    >
                                                        {row.name}
                                                    </Typography>
                                                    {!isMobile && (
                                                        <Typography variant="caption" color="#64748b">
                                                            {row.description}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                                                    <Chip
                                                        size="small"
                                                        label={toVietnameseStatus(row.status)}
                                                        color={isDraft ? "warning" : "default"}
                                                        variant={isDraft ? "filled" : "outlined"}
                                                        sx={{
                                                            maxWidth: "100%",
                                                            "& .MuiChip-label": {
                                                                px: isMobile ? 0.75 : 1,
                                                                fontSize: isMobile ? 11 : 12,
                                                            },
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>{row.features.topRanking}</TableCell>
                                                <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                                                    {isCompact
                                                        ? row.features.supportLevel
                                                        : supportLevelOptions.find((x) => x.value === row.features.supportLevel)?.label || row.features.supportLevel}
                                                </TableCell>
                                                <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>{row.features.maxCounsellors}</TableCell>
                                                <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>{row.features.maxAdmissions}</TableCell>
                                                <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>{row.features.isFeatured ? "Có" : "Không"}</TableCell>
                                                <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                                                    <Tooltip title={isDraft ? "Cập nhật gói" : "Chỉ cập nhật được gói ở trạng thái Bản nháp"}>
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                disabled={!isDraft}
                                                                onClick={() => openEditDialog(row)}
                                                                sx={{
                                                                    color: isDraft ? "#2563eb" : "#94a3b8",
                                                                    border: "1px solid",
                                                                    borderColor: isDraft ? "#93c5fd" : "#e2e8f0",
                                                                    bgcolor: isDraft ? "#eff6ff" : "#f8fafc",
                                                                    borderRadius: 2,
                                                                }}
                                                            >
                                                                <EditOutlinedIcon fontSize="small" />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="md" PaperProps={{ sx: adminDialogPaperSx }}>
                <DialogTitle sx={adminDialogTitleSx}>
                    {isEdit ? "Cập nhật gói dịch vụ (Bản nháp)" : "Tạo gói dịch vụ mới"}
                </DialogTitle>
                <DialogContent dividers sx={adminDialogContentSx}>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Typography variant="subtitle2" sx={{ color: "#1e40af", fontWeight: 700 }}>
                            Thông tin cơ bản
                        </Typography>
                        <TextField label="Tên gói dịch vụ" size="small" value={form.name} onChange={handleChange("name")} fullWidth />
                        <TextField
                            label="Mô tả"
                            size="small"
                            value={form.description}
                            onChange={handleChange("description")}
                            fullWidth
                            multiline
                            minRows={2}
                        />
                        <Divider />
                        <Typography variant="subtitle2" sx={{ color: "#1e40af", fontWeight: 700 }}>
                            Cấu hình tính năng
                        </Typography>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                            <TextField
                                label="Số tư vấn viên tối đa"
                                type="number"
                                size="small"
                                value={form.maxCounsellors}
                                onChange={handleChange("maxCounsellors")}
                                fullWidth
                            />
                            <TextField
                                label="Số tuyển sinh tối đa"
                                type="number"
                                size="small"
                                value={form.maxAdmissions}
                                onChange={handleChange("maxAdmissions")}
                                fullWidth
                            />
                            <TextField
                                label="Thứ hạng ưu tiên"
                                type="number"
                                size="small"
                                value={form.topRanking}
                                onChange={handleChange("topRanking")}
                                fullWidth
                            />
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="parent-post-permission-label">Quyền đăng bài của phụ huynh</InputLabel>
                                <Select
                                    labelId="parent-post-permission-label"
                                    label="Quyền đăng bài của phụ huynh"
                                    value={form.parentPostPermission}
                                    onChange={handleChange("parentPostPermission")}
                                >
                                    <MenuItem value="NONE">Không có quyền cộng đồng</MenuItem>
                                    <MenuItem value="CREATE_POST">Được tạo bài đăng</MenuItem>
                                    <MenuItem value="VIEW_ONLY">Chỉ xem bài viết của trường</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl fullWidth size="small">
                                <InputLabel id="support-level-label">Mức hỗ trợ</InputLabel>
                                <Select
                                    labelId="support-level-label"
                                    label="Mức hỗ trợ"
                                    value={form.supportLevel}
                                    onChange={handleChange("supportLevel")}
                                >
                                    {supportLevelOptions.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.2}
                            sx={{ bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 2, px: 1.5, py: 1 }}
                        >
                            <FormControlLabel
                                control={<Switch checked={Boolean(form.allowChat)} onChange={(e) => setForm((prev) => ({ ...prev, allowChat: e.target.checked }))} />}
                                label="Cho phép chat"
                            />
                            <FormControlLabel
                                control={<Switch checked={Boolean(form.isFeatured)} onChange={(e) => setForm((prev) => ({ ...prev, isFeatured: e.target.checked }))} />}
                                label="Đánh dấu nổi bật"
                            />
                        </Stack>
                        <Typography variant="caption" color="#64748b">
                            Quyền phụ huynh hiện tại: {toVietnamesePermission(form.parentPostPermission)}
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions sx={adminDialogActionsSx}>
                    <Button onClick={closeDialog} disabled={submitting} sx={{ textTransform: "none" }}>
                        Hủy
                    </Button>
                    <Button variant="contained" onClick={submit} disabled={submitting} sx={{ textTransform: "none", fontWeight: 700 }}>
                        {submitting ? <CircularProgress size={22} color="inherit" /> : isEdit ? "Lưu cập nhật" : "Tạo mới"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
