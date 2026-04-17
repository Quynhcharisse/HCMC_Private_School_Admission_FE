import React, {useEffect, useMemo, useRef, useState} from "react";
import {
    Alert,
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
    FormControl,
    FormControlLabel,
    FormLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Radio,
    RadioGroup,
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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PublicIcon from "@mui/icons-material/Public";
import ApartmentIcon from "@mui/icons-material/Apartment";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {enqueueSnackbar} from "notistack";
import {extractCampusListBody, listCampuses} from "../../../services/CampusService.jsx";
import {
    buildUpdateHolidayPayload,
    createHoliday,
    extractHolidayListBody,
    getCreateHolidayInitialValues,
    getHolidayList,
    HOLIDAY_IMPACT_LEVEL,
    HOLIDAY_SCOPE,
    parseHolidayConflictFromError,
    parsePreviewHolidayBody,
    previewHolidayUpdate,
    updateHoliday,
} from "../../../services/SchoolHolidayService.jsx";
import {useSchool} from "../../../contexts/SchoolContext.jsx";

const impactOptions = [
    {
        value: HOLIDAY_IMPACT_LEVEL.STUDENT_ONLY,
        label: "Học sinh nghỉ - Tư vấn viên vẫn làm việc tại trường và tiếp khách bình thường",
    },
    {
        value: HOLIDAY_IMPACT_LEVEL.STAFF_ONLY,
        label: "Nhân viên nghỉ - Học sinh vẫn học, nhưng hệ thống khóa các slot đặt lịch hẹn tư vấn.",
    },
    {value: HOLIDAY_IMPACT_LEVEL.ALL_SHUTDOWN, label: "Đóng toàn bộ hoạt động"},
    {
        value: HOLIDAY_IMPACT_LEVEL.ONLINE_ONLY,
        label: "Làm việc từ xa - Cho phép đặt lịch tư vấn nhưng chỉ qua hình thức trực tuyến",
    },
];

function normalizeCampus(dto) {
    return {
        id: dto?.id ?? dto?.campusId ?? "",
        name: dto?.name ?? dto?.campusName ?? "Cơ sở",
        isPrimaryBranch: dto?.isPrimaryBranch === true,
    };
}

function normalizeHolidayRow(item) {
    return {
        id: item?.id ?? "",
        title: String(item?.title ?? ""),
        startDate: String(item?.startDate ?? ""),
        endDate: String(item?.endDate ?? ""),
        impactLevel: String(item?.impactLevel ?? ""),
        isGlobal: item?.isGlobal === true,
        campusName: String(item?.campusName ?? ""),
        affectedSlotsCount: Number(item?.affectedSlotsCount ?? 0),
    };
}

function formatDateVi(dateStr) {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("vi-VN");
}

function impactLabel(level) {
    switch (level) {
        case HOLIDAY_IMPACT_LEVEL.STUDENT_ONLY:
            return "Học sinh nghỉ";
        case HOLIDAY_IMPACT_LEVEL.STAFF_ONLY:
            return "Nhân viên nghỉ";
        case HOLIDAY_IMPACT_LEVEL.ALL_SHUTDOWN:
            return "Nghỉ toàn trường";
        case HOLIDAY_IMPACT_LEVEL.ONLINE_ONLY:
            return "Chỉ làm việc online";
        default:
            return level || "—";
    }
}

function getImpactLevelChipColor(level) {
    switch (level) {
        case HOLIDAY_IMPACT_LEVEL.ALL_SHUTDOWN:
            return "error";
        case HOLIDAY_IMPACT_LEVEL.STAFF_ONLY:
            return "warning";
        case HOLIDAY_IMPACT_LEVEL.STUDENT_ONLY:
            return "success";
        case HOLIDAY_IMPACT_LEVEL.ONLINE_ONLY:
            return "info";
        default:
            return "default";
    }
}

function parseYmdLocal(ymd) {
    if (!ymd || typeof ymd !== "string") return null;
    const p = ymd.trim().split("-").map((x) => Number(x));
    if (p.length !== 3 || p.some((n) => !Number.isFinite(n))) return null;
    return new Date(p[0], p[1] - 1, p[2]);
}

function startOfTodayLocal() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Khóa sửa nếu ngày bắt đầu đã trước hôm nay (theo spec). */
function isHolidayEditLockedByStartDate(startDateStr) {
    const s = parseYmdLocal(startDateStr);
    if (!s) return false;
    return s < startOfTodayLocal();
}

function getMaxHolidayEndDate() {
    const d = startOfTodayLocal();
    d.setFullYear(d.getFullYear() + 2);
    return d;
}

const HOLIDAY_IMPACT_LEVEL_VALUES = new Set(Object.values(HOLIDAY_IMPACT_LEVEL));

function isValidHolidayImpactLevel(v) {
    return v != null && HOLIDAY_IMPACT_LEVEL_VALUES.has(String(v));
}

/** Khớp `HolidayValidation.createHolidayValidation` (BE). Trả về chuỗi lỗi hoặc `null`. */
function validateCreateHolidayRequest(formValues, isPrimaryBranch) {
    const title = String(formValues?.title ?? "").trim();
    if (!title) {
        return "Tiêu đề ngày nghỉ không được để trống.";
    }
    const start = formValues?.startDate;
    const end = formValues?.endDate;
    if (!start || !end) {
        return "Ngày bắt đầu và kết thúc là bắt buộc.";
    }
    const ds = parseYmdLocal(start);
    const de = parseYmdLocal(end);
    if (!ds || !de) {
        return "Ngày không hợp lệ.";
    }
    if (ds > de) {
        return "Ngày bắt đầu không thể sau ngày kết thúc.";
    }
    if (ds < startOfTodayLocal()) {
        return "Không thể tạo ngày nghỉ cho quá khứ.";
    }
    if (de > getMaxHolidayEndDate()) {
        return "Ngày nghỉ không được vượt quá 2 năm tính từ thời điểm hiện tại.";
    }
    if (!isValidHolidayImpactLevel(formValues?.holidayImpactLevel)) {
        const allowed = `[${Object.values(HOLIDAY_IMPACT_LEVEL).join(", ")}]`;
        return `Mức độ ảnh hưởng (Impact Level) không hợp lệ. Các giá trị cho phép: ${allowed}`;
    }
    const isGlobal = formValues?.scope === HOLIDAY_SCOPE.GLOBAL;
    if (isGlobal) {
        if (!isPrimaryBranch) {
            return "Chỉ cơ sở chính mới có quyền thiết lập lịch nghỉ toàn trường.";
        }
    } else if (formValues?.campusId == null || formValues?.campusId === "") {
        return "Phải chọn cơ sở (Campus) nếu không phải lịch nghỉ toàn trường.";
    }
    return null;
}

/** Khớp `HolidayValidation.updateHolidayValidation` (BE). */
function validateUpdateHolidayRequest(editForm) {
    if (editForm?.id == null || editForm?.id === "") {
        return "ID ngày nghỉ không được để trống.";
    }
    const title = String(editForm?.title ?? "").trim();
    if (!title) {
        return "Tiêu đề không được để trống.";
    }
    const start = editForm?.startDate;
    const end = editForm?.endDate;
    if (!start || !end) {
        return "Ngày bắt đầu và kết thúc là bắt buộc.";
    }
    const ds = parseYmdLocal(start);
    const de = parseYmdLocal(end);
    if (!ds || !de) {
        return "Ngày không hợp lệ.";
    }
    if (ds > de) {
        return "Ngày bắt đầu không thể sau ngày kết thúc.";
    }
    if (ds < startOfTodayLocal()) {
        return "Không thể cập nhật ngày nghỉ về quá khứ.";
    }
    if (!isValidHolidayImpactLevel(editForm?.holidayImpactLevel)) {
        return "Mức độ ảnh hưởng không hợp lệ.";
    }
    return null;
}

function formatConflictBookingRow(item, index) {
    if (!item || typeof item !== "object") return `Lịch ${index + 1}`;
    const parent = item.parentName ?? item.parent ?? item.guardianName ?? "";
    const student = item.studentName ?? item.student ?? item.childName ?? "";
    const slot =
        item.slotTime ??
        item.slotLabel ??
        item.bookingTime ??
        item.startTime ??
        item.time ??
        "";
    const parts = [parent, student, slot].filter(Boolean);
    return parts.length ? parts.join(" · ") : JSON.stringify(item);
}

/**
 * Bảng full width, `table-layout: fixed` — tổng % = 100.
 * Tiêu đề rộng nhất; thời gian / số lịch / hành động hẹp; mức ảnh hưởng & phạm vi vừa phải.
 */
const holidayTableCol = {
    title: {
        width: "34%",
        minWidth: 200,
        verticalAlign: "top",
        wordBreak: "break-word",
    },
    time: {
        width: "12%",
        minWidth: 122,
        whiteSpace: "nowrap",
        verticalAlign: "middle",
    },
    impact: {
        width: "20%",
        minWidth: 112,
        verticalAlign: "middle",
        textAlign: "center",
    },
    scope: {
        width: "14%",
        minWidth: 104,
        verticalAlign: "middle",
    },
    slots: {
        width: "9%",
        minWidth: 72,
        maxWidth: 96,
        textAlign: "center",
        verticalAlign: "middle",
    },
    actions: {
        width: "11%",
        minWidth: 76,
        textAlign: "right",
        verticalAlign: "middle",
    },
};

export default function SchoolHoliday() {
    const {isPrimaryBranch, currentCampusId} = useSchool();
    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [campuses, setCampuses] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [loadingHolidays, setLoadingHolidays] = useState(false);
    const [loadingCampuses, setLoadingCampuses] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [scopeFilter, setScopeFilter] = useState("ALL");
    const [search, setSearch] = useState("");

    const [openEditModal, setOpenEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        id: null,
        title: "",
        startDate: "",
        endDate: "",
        holidayImpactLevel: HOLIDAY_IMPACT_LEVEL.ALL_SHUTDOWN,
        forceCreate: false,
    });
    const [originalImpactLevel, setOriginalImpactLevel] = useState("");
    const [previewLockedSlotsBaseline, setPreviewLockedSlotsBaseline] = useState(0);
    const [previewData, setPreviewData] = useState({
        slotsToRestore: 0,
        slotsToLock: 0,
        conflictSlots: 0,
    });
    const [previewLoading, setPreviewLoading] = useState(false);
    const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
    const [conflictItems, setConflictItems] = useState([]);
    const [conflictMessage, setConflictMessage] = useState("");
    const [conflictAckForce, setConflictAckForce] = useState(false);
    const previewDebounceRef = useRef(null);

    const currentCampus = useMemo(() => {
        return campuses.find((item) => String(item.id) === String(currentCampusId)) || null;
    }, [campuses, currentCampusId]);

    const [formValues, setFormValues] = useState(() =>
        getCreateHolidayInitialValues({
            isPrimaryBranch,
            currentCampusId,
            currentCampusName: currentCampus?.name || "",
        })
    );

    useEffect(() => {
        setFormValues(
            getCreateHolidayInitialValues({
                isPrimaryBranch,
                currentCampusId,
                currentCampusName: currentCampus?.name || "",
            })
        );
    }, [isPrimaryBranch, currentCampusId, currentCampus]);

    const loadCampuses = async () => {
        setLoadingCampuses(true);
        try {
            const response = await listCampuses();
            const mapped = extractCampusListBody(response).map(normalizeCampus);
            setCampuses(mapped);
        } catch (error) {
            console.error("Load campuses failed", error);
            enqueueSnackbar("Không tải được danh sách cơ sở", {variant: "error"});
        } finally {
            setLoadingCampuses(false);
        }
    };

    const loadHolidayList = async () => {
        setLoadingHolidays(true);
        try {
            const response = await getHolidayList();
            const rows = extractHolidayListBody(response).map(normalizeHolidayRow);
            setHolidays(rows);
        } catch (error) {
            console.error("Load holiday list failed", error);
            enqueueSnackbar("Không tải được danh sách ngày nghỉ", {variant: "error"});
            setHolidays([]);
        } finally {
            setLoadingHolidays(false);
        }
    };

    useEffect(() => {
        loadHolidayList();
    }, []);

    useEffect(() => {
        if (!openEditModal || editForm.id == null) return;
        if (previewDebounceRef.current) {
            clearTimeout(previewDebounceRef.current);
        }
        previewDebounceRef.current = setTimeout(async () => {
            setPreviewLoading(true);
            try {
                const res = await previewHolidayUpdate({
                    id: editForm.id,
                    startDate: editForm.startDate,
                    endDate: editForm.endDate,
                    holidayImpactLevel: editForm.holidayImpactLevel,
                });
                setPreviewData(parsePreviewHolidayBody(res));
            } catch {
                setPreviewData({slotsToRestore: 0, slotsToLock: 0, conflictSlots: 0});
            } finally {
                setPreviewLoading(false);
            }
        }, 400);
        return () => {
            if (previewDebounceRef.current) {
                clearTimeout(previewDebounceRef.current);
            }
        };
    }, [openEditModal, editForm.id, editForm.startDate, editForm.endDate, editForm.holidayImpactLevel]);

    const handleOpenCreate = async () => {
        setOpenCreateModal(true);
        await loadCampuses();
    };

    const handleCloseCreate = () => {
        setOpenCreateModal(false);
        setFormValues(
            getCreateHolidayInitialValues({
                isPrimaryBranch,
                currentCampusId,
                currentCampusName: currentCampus?.name || "",
            })
        );
    };

    const handleOpenEdit = (row) => {
        setEditForm({
            id: row.id,
            title: row.title,
            startDate: row.startDate,
            endDate: row.endDate,
            holidayImpactLevel: row.impactLevel || HOLIDAY_IMPACT_LEVEL.ALL_SHUTDOWN,
            forceCreate: false,
        });
        setOriginalImpactLevel(row.impactLevel || "");
        setPreviewLockedSlotsBaseline(Number(row.affectedSlotsCount ?? 0));
        setPreviewData({slotsToRestore: 0, slotsToLock: 0, conflictSlots: 0});
        setOpenEditModal(true);
    };

    const handleCloseEdit = () => {
        setOpenEditModal(false);
        setConflictDialogOpen(false);
        setConflictItems([]);
        setConflictMessage("");
        setConflictAckForce(false);
        setEditForm({
            id: null,
            title: "",
            startDate: "",
            endDate: "",
            holidayImpactLevel: HOLIDAY_IMPACT_LEVEL.ALL_SHUTDOWN,
            forceCreate: false,
        });
    };

    const handleEditChange = (event) => {
        const {name, value, type, checked} = event.target;
        setEditForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleUpdateSubmit = async (forceCreate) => {
        const updateErr = validateUpdateHolidayRequest(editForm);
        if (updateErr) {
            enqueueSnackbar(updateErr, {variant: "warning"});
            return;
        }
        setSubmitting(true);
        try {
            await updateHoliday(
                buildUpdateHolidayPayload({
                    ...editForm,
                    forceCreate,
                })
            );
            enqueueSnackbar("Cập nhật ngày nghỉ thành công", {variant: "success"});
            handleCloseEdit();
            await loadHolidayList();
        } catch (error) {
            if (error?.response?.status === 409) {
                const parsed = parseHolidayConflictFromError(error);
                setConflictItems(parsed.items);
                setConflictMessage(parsed.message || "");
                setConflictAckForce(false);
                setConflictDialogOpen(true);
                return;
            }
            const msg = error?.response?.data?.message;
            if (error?.response?.status === 400) {
                enqueueSnackbar(msg || "Dữ liệu không hợp lệ hoặc trùng lịch nghỉ khác.", {variant: "error"});
                return;
            }
            enqueueSnackbar(msg || "Cập nhật thất bại", {variant: "error"});
        } finally {
            setSubmitting(false);
        }
    };

    const handleConflictConfirmUpdate = async () => {
        if (!conflictAckForce) {
            enqueueSnackbar("Vui lòng bật xác nhận để hủy lịch đã đặt và cập nhật.", {variant: "warning"});
            return;
        }
        await handleUpdateSubmit(true);
    };

    const handleChange = (event) => {
        const {name, value, type, checked} = event.target;
        setFormValues((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleScopeChange = (event) => {
        const scope = event.target.value;
        setFormValues((prev) => ({
            ...prev,
            scope,
            isGlobal: scope === HOLIDAY_SCOPE.GLOBAL,
            campusId: scope === HOLIDAY_SCOPE.GLOBAL ? "" : prev.campusId,
        }));
    };

    const validate = () => {
        const err = validateCreateHolidayRequest(formValues, isPrimaryBranch);
        if (err) {
            enqueueSnackbar(err, {variant: "warning"});
            return false;
        }
        return true;
    };

    const handleCreate = async () => {
        if (!validate() || submitting) return;
        setSubmitting(true);
        try {
            await createHoliday(formValues);
            enqueueSnackbar("Tạo holiday thành công", {variant: "success"});
            handleCloseCreate();
            await loadHolidayList();
        } catch (error) {
            console.error("Create holiday failed", error);
            enqueueSnackbar("Tạo holiday thất bại", {variant: "error"});
        } finally {
            setSubmitting(false);
        }
    };

    const isGlobal = formValues.scope === HOLIDAY_SCOPE.GLOBAL;
    const subCampusLocked = !isPrimaryBranch;
    const campusLabelForSubCampus = currentCampus?.name || formValues.campusName || "Cơ sở hiện tại";
    const filteredHolidays = useMemo(() => {
        let rows = holidays;
        if (scopeFilter === "GLOBAL") {
            rows = rows.filter((item) => item.isGlobal);
        } else if (scopeFilter === "CAMPUS") {
            rows = rows.filter((item) => !item.isGlobal);
        }
        const q = search.trim().toLowerCase();
        if (q) {
            rows = rows.filter(
                (item) =>
                    item.title.toLowerCase().includes(q) ||
                    item.campusName.toLowerCase().includes(q) ||
                    item.impactLevel.toLowerCase().includes(q)
            );
        }
        return rows;
    }, [holidays, scopeFilter, search]);

    const showImpactRelaxAlert =
        openEditModal &&
        originalImpactLevel === HOLIDAY_IMPACT_LEVEL.ALL_SHUTDOWN &&
        editForm.holidayImpactLevel === HOLIDAY_IMPACT_LEVEL.STUDENT_ONLY;

    return (
        <Box sx={{display: "flex", flexDirection: "column", gap: 2}}>
            <Box
                sx={{
                    background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                    borderRadius: 3,
                    p: {xs: 2.5, sm: 3},
                    color: "white",
                    boxShadow: "0 8px 32px rgba(13, 100, 222, 0.25)",
                }}
            >
                <Stack
                    direction={{xs: "column", sm: "row"}}
                    alignItems={{xs: "stretch", sm: "center"}}
                    justifyContent="space-between"
                    spacing={2}
                >
                    <Box>
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 700,
                                letterSpacing: "-0.02em",
                                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            }}
                        >
                           Quản lý lịch nghỉ toàn trường và theo từng cơ sở
                        </Typography>
                        <Typography variant="body2" sx={{mt: 0.5, opacity: 0.95}}>
                           
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon/>}
                        onClick={handleOpenCreate}
                        sx={{
                            alignSelf: {xs: "stretch", sm: "center"},
                            bgcolor: "rgba(255,255,255,0.95)",
                            color: "#0D64DE",
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            px: 2.5,
                            py: 1,
                            boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                            "&:hover": {bgcolor: "white"},
                        }}
                    >
                        Tạo ngày nghỉ
                    </Button>
                </Stack>
            </Box>

            <Card elevation={0} sx={{borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#f8fafc"}}>
                <CardContent sx={{p: 2}}>
                    <Stack direction={{xs: "column", md: "row"}} spacing={2}>
                        <TextField
                            size="small"
                            label="Tìm ngày nghỉ"
                            placeholder="Theo tiêu đề, cơ sở, mức ảnh hưởng..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            sx={{minWidth: 280, flex: 1}}
                        />
                        <FormControl size="small" sx={{minWidth: 220}}>
                            <InputLabel>Loại ngày nghỉ</InputLabel>
                            <Select
                                value={scopeFilter}
                                label="Loại ngày nghỉ"
                                onChange={(event) => setScopeFilter(event.target.value)}
                            >
                                <MenuItem value="ALL">Tất cả</MenuItem>
                                <MenuItem value="GLOBAL">Toàn trường</MenuItem>
                                <MenuItem value="CAMPUS">Riêng cơ sở</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </CardContent>
            </Card>

            <Card elevation={0} sx={{borderRadius: 3, border: "1px solid #e2e8f0"}}>
                <TableContainer sx={{overflowX: "auto", width: "100%"}}>
                    <Table
                        size="small"
                        sx={{
                            tableLayout: "fixed",
                            width: "100%",
                            "& .MuiTableCell-root": {
                                borderColor: "#e2e8f0",
                                py: 0.65,
                                px: 1,
                            },
                            "& .MuiTableHead-root .MuiTableCell-root": {
                                py: 0.75,
                                lineHeight: 1.2,
                            },
                        }}
                    >
                        <TableHead>
                            <TableRow sx={{bgcolor: "#f8fafc"}}>
                                <TableCell sx={{...holidayTableCol.title, fontWeight: 700}}>Tiêu đề</TableCell>
                                <TableCell sx={{...holidayTableCol.time, fontWeight: 700}}>Thời gian</TableCell>
                                <TableCell sx={{...holidayTableCol.impact, fontWeight: 700}}>Mức ảnh hưởng</TableCell>
                                <TableCell sx={{...holidayTableCol.scope, fontWeight: 700}}>Phạm vi</TableCell>
                                <TableCell sx={{...holidayTableCol.slots, fontWeight: 700, lineHeight: 1.15}}>
                                    Số lịch
                                    <br/>
                                    bị ảnh hưởng
                                </TableCell>
                                <TableCell sx={{...holidayTableCol.actions, fontWeight: 700}}>Hành động</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingHolidays ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{py: 4}}>
                                        Đang tải danh sách ngày nghỉ...
                                    </TableCell>
                                </TableRow>
                            ) : filteredHolidays.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{py: 4}}>
                                        Không có ngày nghỉ phù hợp bộ lọc.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredHolidays.map((row) => {
                                    const isReadOnlyForSubCampus = !isPrimaryBranch && row.isGlobal;
                                    const isEditLockedByDate = isHolidayEditLockedByStartDate(row.startDate);
                                    const editDisabled = isReadOnlyForSubCampus || isEditLockedByDate;
                                    const actionLockedForHistory = isReadOnlyForSubCampus || isEditLockedByDate;
                                    return (
                                        <TableRow key={row.id} hover sx={{"&:last-child td": {borderBottom: 0}}}>
                                            <TableCell sx={holidayTableCol.title}>
                                                <Typography sx={{fontWeight: 600, lineHeight: 1.3}}>{row.title}</Typography>
                                                <Typography variant="body2" sx={{color: "#64748b", mt: 0.15, lineHeight: 1.3}}>
                                                    {row.campusName || "—"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={holidayTableCol.time}>
                                                <Typography variant="body2" sx={{fontWeight: 500, lineHeight: 1.3}}>
                                                    {formatDateVi(row.startDate)} — {formatDateVi(row.endDate)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={holidayTableCol.impact}>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        justifyContent: "center",
                                                        width: "100%",
                                                    }}
                                                >
                                                    <Chip
                                                        size="small"
                                                        label={impactLabel(row.impactLevel)}
                                                        color={getImpactLevelChipColor(row.impactLevel)}
                                                        variant="outlined"
                                                        sx={{fontWeight: 600, maxWidth: "min(100%, 220px)"}}
                                                    />
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={holidayTableCol.scope}>
                                                <Stack direction="row" spacing={0.5} alignItems="center" sx={{minWidth: 0}}>
                                                    {row.isGlobal ? (
                                                        <>
                                                            <PublicIcon sx={{color: "#0D64DE", fontSize: 18, flexShrink: 0}}/>
                                                            <Typography variant="body2" sx={{lineHeight: 1.3}}>
                                                                Toàn trường
                                                            </Typography>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ApartmentIcon sx={{color: "#64748b", fontSize: 18, flexShrink: 0}}/>
                                                            <Typography variant="body2" sx={{lineHeight: 1.3}}>
                                                                Riêng cơ sở
                                                            </Typography>
                                                        </>
                                                    )}
                                                </Stack>
                                            </TableCell>
                                            <TableCell sx={holidayTableCol.slots}>
                                                <Typography variant="body2" sx={{fontWeight: 600, lineHeight: 1.3}}>
                                                    {row.affectedSlotsCount}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={holidayTableCol.actions}>
                                                <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                                                    <Tooltip
                                                        title={
                                                            isReadOnlyForSubCampus
                                                                ? "Lịch này do Trụ sở chính thiết lập"
                                                                : isEditLockedByDate
                                                                  ? "Không thể sửa ngày nghỉ đã hoặc đang diễn ra (theo ngày bắt đầu)"
                                                                  : "Sửa ngày nghỉ"
                                                        }
                                                    >
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                color="primary"
                                                                disabled={editDisabled}
                                                                onClick={() => handleOpenEdit(row)}
                                                                aria-label="Sửa ngày nghỉ"
                                                                sx={{p: 0.35}}
                                                            >
                                                                <EditIcon sx={{fontSize: 18}}/>
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Alert severity="info">
                Campus phụ sẽ chỉ có quyền đọc với ngày nghỉ Global do trụ sở chính thiết lập.
            </Alert>

            <Dialog open={openCreateModal} onClose={handleCloseCreate} fullWidth maxWidth="sm">
                <DialogTitle>Tạo Holiday</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{mt: 1}}>
                        <TextField
                            label="Tiêu đề"
                            name="title"
                            value={formValues.title}
                            onChange={handleChange}
                            required
                        />

                        <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                            <TextField
                                label="Ngày bắt đầu"
                                name="startDate"
                                type="date"
                                value={formValues.startDate}
                                onChange={handleChange}
                                InputLabelProps={{shrink: true}}
                                fullWidth
                            />
                            <TextField
                                label="Ngày kết thúc"
                                name="endDate"
                                type="date"
                                value={formValues.endDate}
                                onChange={handleChange}
                                InputLabelProps={{shrink: true}}
                                fullWidth
                            />
                        </Stack>

                        <FormControl fullWidth>
                            <InputLabel>Mức độ ảnh hưởng</InputLabel>
                            <Select
                                name="holidayImpactLevel"
                                value={formValues.holidayImpactLevel}
                                label="Mức độ ảnh hưởng"
                                onChange={handleChange}
                            >
                                {impactOptions.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl>
                            <FormLabel>Phạm vi áp dụng</FormLabel>
                            <RadioGroup value={formValues.scope} onChange={handleScopeChange}>
                                <FormControlLabel
                                    value={HOLIDAY_SCOPE.GLOBAL}
                                    control={<Radio/>}
                                    label="Áp dụng toàn trường (Global)"
                                    disabled={subCampusLocked}
                                />
                                <FormControlLabel
                                    value={HOLIDAY_SCOPE.CAMPUS}
                                    control={<Radio/>}
                                    label="Chỉ áp dụng cho cơ sở cụ thể"
                                />
                            </RadioGroup>
                        </FormControl>

                        {isPrimaryBranch ? (
                            <FormControl fullWidth disabled={isGlobal || loadingCampuses}>
                                <InputLabel>Chọn cơ sở</InputLabel>
                                <Select
                                    name="campusId"
                                    value={formValues.campusId}
                                    label="Chọn cơ sở"
                                    onChange={handleChange}
                                >
                                    {campuses.map((campus) => (
                                        <MenuItem key={campus.id} value={campus.id}>
                                            {campus.name}
                                            {campus.isPrimaryBranch ? " (Cơ sở chính)" : ""}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        ) : (
                            <TextField
                                label="Cơ sở áp dụng"
                                value={campusLabelForSubCampus}
                                disabled
                                fullWidth
                            />
                        )}

                        <FormControlLabel
                            control={
                                <Switch
                                    name="forceCreate"
                                    checked={Boolean(formValues.forceCreate)}
                                    onChange={handleChange}
                                    color="error"
                                />
                            }
                            label={<Typography sx={{ color: "red" }}> (*) Hủy tất cả những lịch đã đặt trùng với ngày nghỉ này</Typography>}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCreate}>Hủy</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={submitting}>
                        {submitting ? "Đang tạo..." : "Tạo mới"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openEditModal}
                onClose={(_, reason) => {
                    if (reason === "backdropClick") return;
                    handleCloseEdit();
                }}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>Chỉnh sửa ngày nghỉ</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{mt: 1}}>
                        <Typography variant="caption" color="text.secondary">
                            {previewLockedSlotsBaseline > 0
                                ? `Ngày nghỉ này hiện đang khóa ${previewLockedSlotsBaseline} slot tư vấn.`
                                : "Chưa có slot tư vấn bị khóa bởi ngày nghỉ này."}
                        </Typography>

                        {showImpactRelaxAlert ? (
                            <Alert severity="success" sx={{borderRadius: 2}}>
                                Mức độ ảnh hưởng mới cho phép Tư vấn viên làm việc. Hệ thống sẽ tự động mở lại các
                                lịch đã bị khóa trước đó.
                            </Alert>
                        ) : null}

                        <Card variant="outlined" sx={{borderRadius: 2, bgcolor: "#f8fafc"}}>
                            <CardContent sx={{py: 2, "&:last-child": {pb: 2}}}>
                                <Typography variant="subtitle2" sx={{fontWeight: 700, mb: 1}}>
                                    Xem trước thay đổi
                                </Typography>
                                {previewLoading ? (
                                    <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
                                        <CircularProgress size={18}/>
                                        <Typography variant="body2" color="text.secondary">
                                            Đang tính toán...
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Stack spacing={0.75}>
                                        <Typography variant="body2">
                                            Số slot sẽ được khôi phục (thu hẹp ngày nghỉ):{" "}
                                            <strong>{previewData.slotsToRestore}</strong>
                                        </Typography>
                                        <Typography variant="body2">
                                            Số slot sẽ bị khóa thêm (mở rộng ngày nghỉ):{" "}
                                            <strong>{previewData.slotsToLock}</strong>
                                        </Typography>
                                        <Typography variant="body2" color="warning.main">
                                            Số slot xung đột (đã có khách đặt):{" "}
                                            <strong>{previewData.conflictSlots}</strong>
                                        </Typography>
                                    </Stack>
                                )}
                            </CardContent>
                        </Card>

                        <TextField
                            label="Tiêu đề"
                            name="title"
                            value={editForm.title}
                            onChange={handleEditChange}
                            fullWidth
                            required
                        />

                        <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                            <TextField
                                label="Ngày bắt đầu"
                                name="startDate"
                                type="date"
                                value={editForm.startDate}
                                onChange={handleEditChange}
                                InputLabelProps={{shrink: true}}
                                fullWidth
                            />
                            <TextField
                                label="Ngày kết thúc"
                                name="endDate"
                                type="date"
                                value={editForm.endDate}
                                onChange={handleEditChange}
                                InputLabelProps={{shrink: true}}
                                fullWidth
                            />
                        </Stack>

                        <FormControl fullWidth>
                            <InputLabel>Mức độ ảnh hưởng</InputLabel>
                            <Select
                                name="holidayImpactLevel"
                                value={editForm.holidayImpactLevel}
                                label="Mức độ ảnh hưởng"
                                onChange={handleEditChange}
                                renderValue={(value) => (
                                    <Chip
                                        size="small"
                                        label={impactLabel(value)}
                                        color={getImpactLevelChipColor(value)}
                                        sx={{fontWeight: 600}}
                                    />
                                )}
                            >
                                {impactOptions.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Chip
                                                size="small"
                                                label={impactLabel(option.value)}
                                                color={getImpactLevelChipColor(option.value)}
                                                sx={{minWidth: 120, fontWeight: 600}}
                                            />
                                            <Typography variant="body2" sx={{whiteSpace: "normal"}}>
                                                {option.label}
                                            </Typography>
                                        </Stack>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControlLabel
                            control={
                                <Switch
                                    name="forceCreate"
                                    checked={Boolean(editForm.forceCreate)}
                                    onChange={handleEditChange}
                                    color="error"
                                />
                            }
                            label={
                                <Typography variant="body2" color="error">
                                    Buộc hủy lịch đã đặt trùng khoảng thời gian (nếu hệ thống yêu cầu)
                                </Typography>
                            }
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEdit}>Hủy</Button>
                    <Button variant="contained" onClick={() => handleUpdateSubmit(false)} disabled={submitting}>
                        {submitting ? "Đang lưu..." : "Cập nhật"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={conflictDialogOpen}
                onClose={() => setConflictDialogOpen(false)}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle>Xung đột lịch đặt</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{mt: 1}}>
                        <Typography variant="body2" color="text.secondary">
                            {conflictMessage ||
                                "Có lịch tư vấn đã được đặt trong khoảng thời gian mới. Xem danh sách bên dưới."}
                        </Typography>
                        {conflictItems.length === 0 ? (
                            <Alert severity="warning">Không có chi tiết slot từ máy chủ.</Alert>
                        ) : (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{fontWeight: 700}}>#</TableCell>
                                            <TableCell sx={{fontWeight: 700}}>Chi tiết</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {conflictItems.map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>{idx + 1}</TableCell>
                                                <TableCell>{formatConflictBookingRow(item, idx)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={conflictAckForce}
                                    onChange={(e) => setConflictAckForce(e.target.checked)}
                                    color="error"
                                />
                            }
                            label="Tôi xác nhận hủy các lịch trùng và cập nhật ngày nghỉ"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConflictDialogOpen(false)}>Đóng</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleConflictConfirmUpdate}
                        disabled={submitting}
                    >
                        {submitting ? "Đang xử lý..." : "Xác nhận hủy lịch & Cập nhật"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
