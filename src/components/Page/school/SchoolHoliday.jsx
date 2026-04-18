import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
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
    FormControl,
    FormControlLabel,
    FormLabel,
    IconButton,
    InputAdornment,
    InputLabel,
    LinearProgress,
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
import Pagination from "@mui/material/Pagination";
import AddIcon from "@mui/icons-material/Add";
import PublicIcon from "@mui/icons-material/Public";
import ApartmentIcon from "@mui/icons-material/Apartment";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
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

const InfoItem = ({label, value}) => (
    <Box>
        <Typography variant="caption" sx={{color: "#94a3b8"}}>
            {label}
        </Typography>
        <Box sx={{mt: 0.35}}>{value}</Box>
    </Box>
);

const modalPaperSx = {
    borderRadius: "16px",
    boxShadow: "0 24px 48px rgba(0, 0, 0, 0.12)",
    bgcolor: "white",
    overflow: "hidden",
};
const modalBackdropSx = {
    backdropFilter: "blur(6px)",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
};

/** Giống header bảng `SchoolCampus.jsx`. */
const campusTableHeadCellSx = {fontWeight: 700, color: "#1e293b", py: 2};
const tableHeadCellSx = campusTableHeadCellSx;

function impactLevelPillStyles(level) {
    switch (level) {
        case HOLIDAY_IMPACT_LEVEL.ALL_SHUTDOWN:
            return {bgcolor: "rgba(239, 68, 68, 0.12)", color: "#dc2626"};
        case HOLIDAY_IMPACT_LEVEL.STAFF_ONLY:
            return {bgcolor: "rgba(245, 158, 11, 0.16)", color: "#c2410c"};
        case HOLIDAY_IMPACT_LEVEL.STUDENT_ONLY:
            return {bgcolor: "rgba(34, 197, 94, 0.12)", color: "#16a34a"};
        case HOLIDAY_IMPACT_LEVEL.ONLINE_ONLY:
            return {bgcolor: "rgba(59, 130, 246, 0.12)", color: "#2563eb"};
        default:
            return {bgcolor: "rgba(148, 163, 184, 0.2)", color: "#64748b"};
    }
}

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
    const [page, setPage] = useState(0);
    const rowsPerPage = 10;
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedHoliday, setSelectedHoliday] = useState(null);

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
    /** Tăng mỗi lần gọi preview mới — bỏ qua response cũ, tránh nháy số liệu. */
    const previewSeqRef = useRef(0);

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
            /** GET 200 + [] là bình thường (chưa có ngày nghỉ) — không báo lỗi. Lỗi chỉ khi request throw (4xx/5xx/mạng). */
        } catch (error) {
            console.error("Load holiday list failed", error);
            const status = error?.response?.status;
            const serverMsg =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                (typeof error?.response?.data === "string" ? error.response.data : "");
            const detail =
                serverMsg ||
                (status === 404
                    ? "API danh sách ngày nghỉ không tồn tại hoặc sai đường dẫn."
                    : status === 403
                      ? "Không có quyền xem danh sách ngày nghỉ."
                      : status === 401
                        ? "Phiên đăng nhập hết hạn hoặc chưa đăng nhập."
                        : "");
            enqueueSnackbar(detail || "Không tải được danh sách ngày nghỉ (lỗi mạng hoặc máy chủ).", {
                variant: "error",
            });
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
            previewDebounceRef.current = null;
        }
        previewDebounceRef.current = setTimeout(() => {
            const seq = ++previewSeqRef.current;
            setPreviewLoading(true);
            (async () => {
                try {
                    const res = await previewHolidayUpdate({
                        id: editForm.id,
                        startDate: editForm.startDate,
                        endDate: editForm.endDate,
                        holidayImpactLevel: editForm.holidayImpactLevel,
                    });
                    if (seq !== previewSeqRef.current) return;
                    setPreviewData(parsePreviewHolidayBody(res));
                } catch {
                    if (seq !== previewSeqRef.current) return;
                    setPreviewData({slotsToRestore: 0, slotsToLock: 0, conflictSlots: 0});
                } finally {
                    if (seq === previewSeqRef.current) {
                        setPreviewLoading(false);
                    }
                }
            })();
        }, 400);
        return () => {
            if (previewDebounceRef.current) {
                clearTimeout(previewDebounceRef.current);
                previewDebounceRef.current = null;
            }
        };
    }, [openEditModal, editForm.id, editForm.startDate, editForm.endDate, editForm.holidayImpactLevel]);

    const handleOpenCreate = async () => {
        setOpenCreateModal(true);
        await loadCampuses();
    };

    const handleCloseCreate = () => {
        if (submitting) return;
        setOpenCreateModal(false);
        setFormValues(
            getCreateHolidayInitialValues({
                isPrimaryBranch,
                currentCampusId,
                currentCampusName: currentCampus?.name || "",
            })
        );
    };

    const getHolidayRowRestrictions = useCallback(
        (row) => {
            if (!row) {
                return {isReadOnlyForSubCampus: false, isEditLockedByDate: false, editDisabled: true};
            }
            const isReadOnlyForSubCampus = !isPrimaryBranch && row.isGlobal;
            const isEditLockedByDate = isHolidayEditLockedByStartDate(row.startDate);
            const editDisabled = isReadOnlyForSubCampus || isEditLockedByDate;
            return {isReadOnlyForSubCampus, isEditLockedByDate, editDisabled};
        },
        [isPrimaryBranch]
    );

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

    const handleOpenView = (row) => {
        setSelectedHoliday(row);
        setViewModalOpen(true);
    };

    const handleCloseView = () => {
        setViewModalOpen(false);
        setSelectedHoliday(null);
    };

    const handleOpenEditFromView = (row) => {
        handleCloseView();
        handleOpenEdit(row);
    };

    const handleCloseEdit = () => {
        if (submitting) return;
        if (previewDebounceRef.current) {
            clearTimeout(previewDebounceRef.current);
            previewDebounceRef.current = null;
        }
        previewSeqRef.current += 1;
        setPreviewLoading(false);
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
            enqueueSnackbar("Tạo ngày nghỉ thành công", {variant: "success"});
            handleCloseCreate();
            await loadHolidayList();
        } catch (error) {
            console.error("Create holiday failed", error);
            enqueueSnackbar("Tạo ngày nghỉ thất bại", {variant: "error"});
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

    const paginatedHolidays = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredHolidays.slice(start, start + rowsPerPage);
    }, [filteredHolidays, page, rowsPerPage]);

    useEffect(() => {
        setPage(0);
    }, [search, scopeFilter]);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(filteredHolidays.length / rowsPerPage));
        if (page >= totalPages) {
            setPage(Math.max(0, totalPages - 1));
        }
    }, [filteredHolidays.length, page, rowsPerPage]);

    const showImpactRelaxAlert =
        openEditModal &&
        originalImpactLevel === HOLIDAY_IMPACT_LEVEL.ALL_SHUTDOWN &&
        editForm.holidayImpactLevel === HOLIDAY_IMPACT_LEVEL.STUDENT_ONLY;

    const viewRowMeta = selectedHoliday ? getHolidayRowRestrictions(selectedHoliday) : null;

    return (
        <Box sx={{display: "flex", flexDirection: "column", gap: 3, width: "100%"}}>
            <Box
                sx={{
                    background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                    borderRadius: 3,
                    p: 3,
                    color: "white",
                    boxShadow: "0 8px 32px rgba(13, 100, 222, 0.25)",
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: {xs: "column", sm: "row"},
                        alignItems: {xs: "stretch", sm: "center"},
                        justifyContent: "space-between",
                        gap: 2,
                    }}
                >
                    <Box>
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 700,
                                letterSpacing: "-0.02em",
                                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            }}
                        >
                            Quản lý ngày nghỉ
                        </Typography>
                        <Typography variant="body2" sx={{mt: 0.5, opacity: 0.95}}>
                            Thiết lập lịch nghỉ toàn trường và theo từng cơ sở; ảnh hưởng tới lịch tư vấn đã đặt.
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon/>}
                        onClick={handleOpenCreate}
                        sx={{
                            alignSelf: {xs: "stretch", sm: "center"},
                            bgcolor: "#ffffff",
                            color: "#0D64DE",
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            px: 3,
                            py: 1.5,
                            boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                            "&:hover": {bgcolor: "#f8fafc", boxShadow: "0 6px 20px rgba(0,0,0,0.15)"},
                        }}
                    >
                        Tạo ngày nghỉ
                    </Button>
                </Box>
            </Box>

            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                    bgcolor: "#F8FAFC",
                }}
            >
                <CardContent sx={{p: 2.5}}>
                    <Stack
                        direction={{xs: "column", md: "row"}}
                        spacing={2}
                        alignItems={{xs: "stretch", md: "center"}}
                        flexWrap="wrap"
                    >
                        <TextField
                            placeholder="Tìm theo tiêu đề, cơ sở, mức ảnh hưởng..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            size="small"
                            sx={{
                                flex: 1,
                                minWidth: 200,
                                maxWidth: {md: 360},
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 2,
                                    bgcolor: "white",
                                },
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{color: "#64748b"}}/>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <FormControl size="small" sx={{minWidth: 200}}>
                            <InputLabel>Loại ngày nghỉ</InputLabel>
                            <Select
                                value={scopeFilter}
                                label="Loại ngày nghỉ"
                                onChange={(event) => setScopeFilter(event.target.value)}
                                sx={{borderRadius: 2, bgcolor: "white"}}
                            >
                                <MenuItem value="ALL">Tất cả</MenuItem>
                                <MenuItem value="GLOBAL">Toàn trường</MenuItem>
                                <MenuItem value="CAMPUS">Riêng cơ sở</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </CardContent>
            </Card>

            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                    overflow: "hidden",
                    position: "relative",
                    bgcolor: "#F8FAFC",
                }}
            >
                {loadingHolidays ? (
                    <LinearProgress
                        sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 3,
                            zIndex: 2,
                            "& .MuiLinearProgress-bar": {borderRadius: 0},
                        }}
                    />
                ) : null}
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{bgcolor: "#f1f5f9"}}>
                                <TableCell sx={tableHeadCellSx}>Ngày nghỉ</TableCell>
                                <TableCell sx={tableHeadCellSx}>Thời gian</TableCell>
                                <TableCell sx={{...tableHeadCellSx, textAlign: "center"}}>Mức ảnh hưởng</TableCell>
                                <TableCell sx={tableHeadCellSx}>Phạm vi</TableCell>
                                <TableCell sx={{...tableHeadCellSx, textAlign: "center"}}>Lịch bị ảnh hưởng</TableCell>
                                <TableCell sx={{...tableHeadCellSx, textAlign: "right"}}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingHolidays ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{py: 8}}>
                                        <Stack alignItems="center" spacing={1.5}>
                                            <CircularProgress size={36} thickness={4} sx={{color: "#2563eb"}}/>
                                            <Typography variant="body2" sx={{color: "#64748b"}}>
                                                Đang tải danh sách ngày nghỉ…
                                            </Typography>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ) : filteredHolidays.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{py: 8}}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                gap: 1.5,
                                            }}
                                        >
                                            <EventBusyOutlinedIcon sx={{fontSize: 56, color: "#cbd5e1"}}/>
                                            <Typography variant="h6" sx={{color: "#64748b", fontWeight: 600}}>
                                                {holidays.length === 0 ? "Chưa có ngày nghỉ" : "Không có kết quả phù hợp"}
                                            </Typography>
                                            <Typography variant="body2" sx={{color: "#94a3b8", textAlign: "center", maxWidth: 420}}>
                                                {holidays.length === 0
                                                    ? "Tạo ngày nghỉ đầu tiên để khóa hoặc điều chỉnh lịch tư vấn theo lịch nghỉ của trường."
                                                    : "Không có kết quả phù hợp với tìm kiếm hoặc bộ lọc."}
                                            </Typography>
                                            {holidays.length === 0 ? (
                                                <Button
                                                    variant="contained"
                                                    startIcon={<AddIcon/>}
                                                    onClick={handleOpenCreate}
                                                    sx={{
                                                        mt: 1,
                                                        borderRadius: 2,
                                                        textTransform: "none",
                                                        fontWeight: 600,
                                                        background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                                                    }}
                                                >
                                                    Tạo ngày nghỉ
                                                </Button>
                                            ) : null}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedHolidays.map((row) => {
                                    const {isReadOnlyForSubCampus, isEditLockedByDate, editDisabled} =
                                        getHolidayRowRestrictions(row);
                                    const impactSx = impactLevelPillStyles(row.impactLevel);
                                    return (
                                        <TableRow
                                            key={row.id}
                                            hover
                                            onClick={() => handleOpenView(row)}
                                            sx={{
                                                cursor: "pointer",
                                                "&:hover": {bgcolor: "rgba(122, 169, 235, 0.06)"},
                                            }}
                                        >
                                            <TableCell>
                                                <Box sx={{minWidth: 0}}>
                                                    <Typography sx={{fontWeight: 600, color: "#1e293b"}}>
                                                        {row.title}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{color: "#64748b"}} noWrap title={row.campusName || ""}>
                                                        {row.campusName || "—"}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{color: "#64748b"}}>
                                                <Typography variant="body2" sx={{fontWeight: 500}}>
                                                    {formatDateVi(row.startDate)} — {formatDateVi(row.endDate)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        px: 1.5,
                                                        py: 0.5,
                                                        borderRadius: 999,
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        display: "inline-block",
                                                        maxWidth: "100%",
                                                        ...impactSx,
                                                    }}
                                                >
                                                    {impactLabel(row.impactLevel)}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        px: 1.5,
                                                        py: 0.5,
                                                        borderRadius: 999,
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        bgcolor: row.isGlobal
                                                            ? "rgba(37, 99, 235, 0.12)"
                                                            : "rgba(148, 163, 184, 0.2)",
                                                        color: row.isGlobal ? "#1d4ed8" : "#64748b",
                                                    }}
                                                >
                                                    {row.isGlobal ? "Toàn trường" : "Riêng cơ sở"}
                                                </Box>
                                            </TableCell>
                                            <TableCell align="center" sx={{color: "#64748b"}}>
                                                {row.affectedSlotsCount}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenView(row);
                                                        }}
                                                        sx={{
                                                            color: "#64748b",
                                                            "&:hover": {color: "#0D64DE", bgcolor: "rgba(13, 100, 222, 0.08)"},
                                                        }}
                                                        title="Xem chi tiết"
                                                    >
                                                        <VisibilityIcon fontSize="small"/>
                                                    </IconButton>
                                                    <Tooltip
                                                        title={
                                                            isReadOnlyForSubCampus
                                                                ? "Lịch này do trụ sở chính thiết lập"
                                                                : isEditLockedByDate
                                                                  ? "Không thể sửa ngày nghỉ đã hoặc đang diễn ra"
                                                                  : "Sửa"
                                                        }
                                                    >
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                disabled={editDisabled}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenEdit(row);
                                                                }}
                                                                sx={{
                                                                    color: "#64748b",
                                                                    "&:hover": {
                                                                        color: "#0D64DE",
                                                                        bgcolor: "rgba(13, 100, 222, 0.08)",
                                                                    },
                                                                }}
                                                                title="Sửa"
                                                            >
                                                                <EditIcon fontSize="small"/>
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
                {filteredHolidays.length > 0 ? (
                    <Box
                        sx={{
                            borderTop: "1px solid #e2e8f0",
                            bgcolor: "#f8fafc",
                            px: 3,
                            py: 1.5,
                            display: "flex",
                            justifyContent: "flex-end",
                        }}
                    >
                        <Pagination
                            count={Math.max(1, Math.ceil(filteredHolidays.length / rowsPerPage))}
                            page={page + 1}
                            onChange={(_, p) => setPage(p - 1)}
                            color="primary"
                            shape="rounded"
                        />
                    </Box>
                ) : null}
            </Card>

            <Alert severity="info" sx={{borderRadius: 2, border: "1px solid #bfdbfe", bgcolor: "#eff6ff"}}>
                Cơ sở phụ chỉ xem được ngày nghỉ toàn trường do trụ sở chính thiết lập (không chỉnh sửa).
            </Alert>

            <Dialog
                open={openCreateModal}
                onClose={(e, reason) => {
                    if (reason === "backdropClick") return;
                    if (submitting && reason === "escapeKeyDown") return;
                    handleCloseCreate();
                }}
                fullWidth
                maxWidth="sm"
                aria-busy={submitting}
                PaperProps={{sx: {...modalPaperSx, position: "relative"}}}
                slotProps={{backdrop: {sx: modalBackdropSx}}}
            >
                {submitting ? (
                    <LinearProgress
                        sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 3,
                            zIndex: 2,
                            borderRadius: "16px 16px 0 0",
                        }}
                    />
                ) : null}
                <Box sx={{px: 3, pt: 3, pb: 0}}>
                    <Box sx={{display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2}}>
                        <Box>
                            <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b"}}>
                                Tạo ngày nghỉ
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b", mt: 0.5}}>
                                Khai báo khoảng thời gian, mức ảnh hưởng và phạm vi áp dụng.
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={handleCloseCreate}
                            size="small"
                            disabled={submitting}
                            sx={{mt: -0.5, mr: -0.5}}
                            aria-label="Đóng"
                        >
                            <CloseIcon fontSize="small"/>
                        </IconButton>
                    </Box>
                </Box>
                <DialogContent dividers={false} sx={{px: 3, pt: 2, pb: 1}}>
                    <Stack spacing={2.5}>
                        <TextField
                            label="Tiêu đề"
                            name="title"
                            value={formValues.title}
                            onChange={handleChange}
                            required
                            fullWidth
                            disabled={submitting}
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
                                disabled={submitting}
                            />
                            <TextField
                                label="Ngày kết thúc"
                                name="endDate"
                                type="date"
                                value={formValues.endDate}
                                onChange={handleChange}
                                InputLabelProps={{shrink: true}}
                                fullWidth
                                disabled={submitting}
                            />
                        </Stack>

                        <FormControl fullWidth disabled={submitting} sx={{minWidth: 0, maxWidth: "100%"}}>
                            <InputLabel>Mức độ ảnh hưởng</InputLabel>
                            <Select
                                name="holidayImpactLevel"
                                value={formValues.holidayImpactLevel}
                                label="Mức độ ảnh hưởng"
                                onChange={handleChange}
                                sx={{
                                    minWidth: 0,
                                    width: "100%",
                                    "& .MuiSelect-select": {
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    },
                                }}
                                renderValue={(value) => (
                                    <Typography component="span" variant="body2" noWrap sx={{display: "block"}}>
                                        {impactLabel(value)}
                                    </Typography>
                                )}
                                MenuProps={{
                                    PaperProps: {
                                        sx: {
                                            maxWidth: "min(100vw - 32px, 520px)",
                                        },
                                    },
                                }}
                            >
                                {impactOptions.map((option) => (
                                    <MenuItem
                                        key={option.value}
                                        value={option.value}
                                        sx={{whiteSpace: "normal", alignItems: "flex-start", py: 1.25}}
                                    >
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl disabled={submitting}>
                            <FormLabel sx={{color: "#334155", fontWeight: 600, mb: 0.5}}>Phạm vi áp dụng</FormLabel>
                            <RadioGroup value={formValues.scope} onChange={handleScopeChange}>
                                <FormControlLabel
                                    value={HOLIDAY_SCOPE.GLOBAL}
                                    control={<Radio/>}
                                    label="Áp dụng toàn trường"
                                    disabled={subCampusLocked}
                                />
                                <FormControlLabel
                                    value={HOLIDAY_SCOPE.CAMPUS}
                                    control={<Radio/>}
                                    label="Chỉ áp dụng cho một cơ sở"
                                />
                            </RadioGroup>
                        </FormControl>

                        {isPrimaryBranch ? (
                            <FormControl fullWidth disabled={isGlobal || loadingCampuses || submitting}>
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
                            <TextField label="Cơ sở áp dụng" value={campusLabelForSubCampus} disabled fullWidth/>
                        )}

                        <FormControlLabel
                            control={
                                <Switch
                                    name="forceCreate"
                                    checked={Boolean(formValues.forceCreate)}
                                    onChange={handleChange}
                                    color="error"
                                    disabled={submitting}
                                />
                            }
                            label={
                                <Typography variant="body2" sx={{color: "#b91c1c", fontWeight: 500}}>
                                    Hủy tất cả lịch đã đặt trùng với khoảng ngày nghỉ này
                                </Typography>
                            }
                        />
                        {submitting ? (
                            <Typography
                                variant="body2"
                                sx={{color: "#1d4ed8", fontWeight: 500, display: "flex", alignItems: "center", gap: 1}}
                            >
                                <CircularProgress size={18} thickness={5} sx={{color: "#2563eb"}}/>
                                Đang xử lý…
                            </Typography>
                        ) : null}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{px: 3, py: 2.5, borderTop: "1px solid #e2e8f0", gap: 1}}>
                    <Button
                        onClick={handleCloseCreate}
                        variant="text"
                        color="inherit"
                        disabled={submitting}
                        sx={{textTransform: "none", fontWeight: 500}}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={submitting}
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            px: 3,
                            background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                        }}
                    >
                        {submitting ? "Đang tạo…" : "Tạo"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={viewModalOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    handleCloseView();
                }}
                maxWidth="sm"
                fullWidth
                PaperProps={{sx: {...modalPaperSx, borderRadius: 3}}}
                slotProps={{backdrop: {sx: modalBackdropSx}}}
            >
                <Box
                    sx={{
                        px: 3,
                        py: 2.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1px solid #f1f5f9",
                        background: "#fafafa",
                    }}
                >
                    <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b"}}>
                        Chi tiết ngày nghỉ
                    </Typography>
                    <IconButton
                        onClick={handleCloseView}
                        size="small"
                        sx={{
                            bgcolor: "#f1f5f9",
                            "&:hover": {bgcolor: "#e2e8f0"},
                        }}
                        aria-label="Đóng"
                    >
                        <CloseIcon fontSize="small"/>
                    </IconButton>
                </Box>
                <DialogContent sx={{px: 3, py: 3}}>
                    {selectedHoliday ? (
                        <Stack spacing={2.5}>
                            <InfoItem
                                label="Tiêu đề"
                                value={
                                    <Typography variant="body1" sx={{fontWeight: 600, color: "#1e293b"}}>
                                        {selectedHoliday.title}
                                    </Typography>
                                }
                            />
                            <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                                <InfoItem
                                    label="Từ ngày"
                                    value={
                                        <Typography variant="body1" sx={{fontWeight: 600, color: "#1e293b"}}>
                                            {formatDateVi(selectedHoliday.startDate)}
                                        </Typography>
                                    }
                                />
                                <InfoItem
                                    label="Đến ngày"
                                    value={
                                        <Typography variant="body1" sx={{fontWeight: 600, color: "#1e293b"}}>
                                            {formatDateVi(selectedHoliday.endDate)}
                                        </Typography>
                                    }
                                />
                            </Stack>
                            <InfoItem
                                label="Mức ảnh hưởng"
                                value={
                                    <Chip
                                        size="small"
                                        label={impactLabel(selectedHoliday.impactLevel)}
                                        color={getImpactLevelChipColor(selectedHoliday.impactLevel)}
                                        variant="outlined"
                                        sx={{fontWeight: 600}}
                                    />
                                }
                            />
                            <InfoItem
                                label="Phạm vi"
                                value={
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        {selectedHoliday.isGlobal ? (
                                            <PublicIcon sx={{color: "#0D64DE", fontSize: 20}}/>
                                        ) : (
                                            <ApartmentIcon sx={{color: "#64748b", fontSize: 20}}/>
                                        )}
                                        <Typography variant="body1" sx={{fontWeight: 600, color: "#1e293b"}}>
                                            {selectedHoliday.isGlobal ? "Toàn trường" : "Riêng cơ sở"}
                                        </Typography>
                                    </Stack>
                                }
                            />
                            <InfoItem
                                label="Cơ sở"
                                value={
                                    <Typography variant="body1" sx={{fontWeight: 600, color: "#1e293b"}}>
                                        {selectedHoliday.campusName || "—"}
                                    </Typography>
                                }
                            />
                            <InfoItem
                                label="Số lịch tư vấn bị ảnh hưởng"
                                value={
                                    <Typography variant="body1" sx={{fontWeight: 600, color: "#1e293b"}}>
                                        {selectedHoliday.affectedSlotsCount}
                                    </Typography>
                                }
                            />
                            {viewRowMeta?.isReadOnlyForSubCampus ? (
                                <Alert severity="info" sx={{borderRadius: 2}}>
                                    Ngày nghỉ toàn trường do trụ sở chính quản lý — cơ sở phụ chỉ xem.
                                </Alert>
                            ) : null}
                            {viewRowMeta?.isEditLockedByDate ? (
                                <Alert severity="warning" sx={{borderRadius: 2}}>
                                    Đã qua ngày bắt đầu — không thể chỉnh sửa.
                                </Alert>
                            ) : null}
                        </Stack>
                    ) : null}
                </DialogContent>
                <DialogActions sx={{px: 3, py: 2, borderTop: "1px solid #e2e8f0", gap: 1}}>
                    <Button onClick={handleCloseView} variant="text" color="inherit" sx={{textTransform: "none", fontWeight: 500}}>
                        Đóng
                    </Button>
                    <Button
                        variant="contained"
                        disabled={!selectedHoliday || viewRowMeta?.editDisabled}
                        onClick={() => selectedHoliday && handleOpenEditFromView(selectedHoliday)}
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            px: 2.5,
                            background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                        }}
                    >
                        Chỉnh sửa
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openEditModal}
                onClose={(_, reason) => {
                    if (reason === "backdropClick") return;
                    if (submitting && reason === "escapeKeyDown") return;
                    handleCloseEdit();
                }}
                fullWidth
                maxWidth="sm"
                aria-busy={submitting}
                disableScrollLock
                PaperProps={{sx: {...modalPaperSx, position: "relative"}}}
                slotProps={{backdrop: {sx: modalBackdropSx}}}
            >
                {submitting ? (
                    <LinearProgress
                        sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 3,
                            zIndex: 2,
                            borderRadius: "16px 16px 0 0",
                        }}
                    />
                ) : null}
                <Box sx={{px: 3, pt: 3, pb: 0}}>
                    <Box sx={{display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2}}>
                        <Box>
                            <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b"}}>
                                Chỉnh sửa ngày nghỉ
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b", mt: 0.5}}>
                                {previewLockedSlotsBaseline > 0
                                    ? `Đang khóa ${previewLockedSlotsBaseline} slot tư vấn.`
                                    : "Chưa có slot bị khóa bởi ngày nghỉ này."}
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={handleCloseEdit}
                            size="small"
                            disabled={submitting}
                            sx={{mt: -0.5, mr: -0.5}}
                            aria-label="Đóng"
                        >
                            <CloseIcon fontSize="small"/>
                        </IconButton>
                    </Box>
                </Box>
                <DialogContent dividers={false} sx={{px: 3, pt: 2, pb: 1}}>
                    <Stack spacing={2.5}>
                        {showImpactRelaxAlert ? (
                            <Alert severity="success" sx={{borderRadius: 2}}>
                                Mức ảnh hưởng mới cho phép tư vấn viên làm việc. Hệ thống sẽ mở lại các lịch đã bị khóa
                                trước đó.
                            </Alert>
                        ) : null}

                        <Card variant="outlined" sx={{borderRadius: 2, bgcolor: "#f8fafc", borderColor: "#e2e8f0"}}>
                            <CardContent sx={{py: 2, "&:last-child": {pb: 2}}}>
                                <Typography variant="subtitle2" sx={{fontWeight: 700, mb: 1, color: "#0f172a"}}>
                                    Xem trước thay đổi
                                </Typography>
                                <Box sx={{position: "relative", minHeight: 72}}>
                                    <Stack
                                        spacing={0.75}
                                        sx={{
                                            opacity: previewLoading ? 0.38 : 1,
                                            transition: "opacity 0.2s ease",
                                        }}
                                    >
                                        <Typography variant="body2" sx={{color: "#334155"}}>
                                            Slot khôi phục (thu hẹp): <strong>{previewData.slotsToRestore}</strong>
                                        </Typography>
                                        <Typography variant="body2" sx={{color: "#334155"}}>
                                            Slot khóa thêm (mở rộng): <strong>{previewData.slotsToLock}</strong>
                                        </Typography>
                                        <Typography variant="body2" sx={{color: "#b45309"}}>
                                            Slot xung đột (đã có khách): <strong>{previewData.conflictSlots}</strong>
                                        </Typography>
                                    </Stack>
                                    {previewLoading ? (
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                inset: 0,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                bgcolor: "rgba(248, 250, 252, 0.78)",
                                                borderRadius: 1,
                                                pointerEvents: "none",
                                            }}
                                        >
                                            <CircularProgress size={22} thickness={4} sx={{color: "#2563eb"}}/>
                                        </Box>
                                    ) : null}
                                </Box>
                            </CardContent>
                        </Card>

                        <TextField
                            label="Tiêu đề"
                            name="title"
                            value={editForm.title}
                            onChange={handleEditChange}
                            fullWidth
                            required
                            disabled={submitting}
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
                                disabled={submitting}
                            />
                            <TextField
                                label="Ngày kết thúc"
                                name="endDate"
                                type="date"
                                value={editForm.endDate}
                                onChange={handleEditChange}
                                InputLabelProps={{shrink: true}}
                                fullWidth
                                disabled={submitting}
                            />
                        </Stack>

                        <FormControl fullWidth disabled={submitting} sx={{minWidth: 0, maxWidth: "100%"}}>
                            <InputLabel>Mức độ ảnh hưởng</InputLabel>
                            <Select
                                name="holidayImpactLevel"
                                value={editForm.holidayImpactLevel}
                                label="Mức độ ảnh hưởng"
                                onChange={handleEditChange}
                                sx={{
                                    minWidth: 0,
                                    width: "100%",
                                    "& .MuiSelect-select": {
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    },
                                }}
                                renderValue={(value) => (
                                    <Typography component="span" variant="body2" noWrap sx={{display: "block"}}>
                                        {impactLabel(value)}
                                    </Typography>
                                )}
                                MenuProps={{
                                    PaperProps: {
                                        sx: {
                                            maxWidth: "min(100vw - 32px, 520px)",
                                        },
                                    },
                                }}
                            >
                                {impactOptions.map((option) => (
                                    <MenuItem
                                        key={option.value}
                                        value={option.value}
                                        sx={{whiteSpace: "normal", alignItems: "flex-start", py: 1.25}}
                                    >
                                        {option.label}
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
                                    disabled={submitting}
                                />
                            }
                            label={
                                <Typography variant="body2" sx={{color: "#b91c1c"}}>
                                    Buộc hủy lịch đã đặt trùng khoảng thời gian (khi hệ thống yêu cầu)
                                </Typography>
                            }
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{px: 3, py: 2.5, borderTop: "1px solid #e2e8f0", gap: 1}}>
                    <Button
                        onClick={handleCloseEdit}
                        variant="text"
                        color="inherit"
                        disabled={submitting}
                        sx={{textTransform: "none", fontWeight: 500}}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => handleUpdateSubmit(false)}
                        disabled={submitting}
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            px: 3,
                            background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                        }}
                    >
                        {submitting ? "Đang lưu…" : "Cập nhật"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={conflictDialogOpen}
                onClose={(e, reason) => {
                    if (reason === "backdropClick") return;
                    if (submitting) return;
                    setConflictDialogOpen(false);
                }}
                fullWidth
                maxWidth="md"
                PaperProps={{sx: modalPaperSx}}
                slotProps={{backdrop: {sx: modalBackdropSx}}}
            >
                <Box sx={{px: 3, pt: 3, pb: 0}}>
                    <Box sx={{display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2}}>
                        <Box>
                            <Typography variant="h6" sx={{fontWeight: 700, color: "#1e293b"}}>
                                Xung đột lịch đặt
                            </Typography>
                            <Typography variant="body2" sx={{color: "#64748b", mt: 0.5}}>
                                {conflictMessage ||
                                    "Có lịch tư vấn đã đặt trong khoảng thời gian mới. Xem danh sách bên dưới."}
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={() => !submitting && setConflictDialogOpen(false)}
                            size="small"
                            disabled={submitting}
                            sx={{mt: -0.5, mr: -0.5}}
                            aria-label="Đóng"
                        >
                            <CloseIcon fontSize="small"/>
                        </IconButton>
                    </Box>
                </Box>
                <DialogContent dividers={false} sx={{px: 3, pt: 2, pb: 1}}>
                    <Stack spacing={2}>
                        {conflictItems.length === 0 ? (
                            <Alert severity="warning" sx={{borderRadius: 2}}>
                                Không có chi tiết slot từ máy chủ.
                            </Alert>
                        ) : (
                            <Card variant="outlined" sx={{borderRadius: 2, borderColor: "#e2e8f0", overflow: "hidden"}}>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{bgcolor: "#f1f5f9"}}>
                                                <TableCell sx={{...tableHeadCellSx, width: 56}}>#</TableCell>
                                                <TableCell sx={tableHeadCellSx}>Chi tiết lịch</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {conflictItems.map((item, idx) => (
                                                <TableRow key={idx} hover sx={{"&:last-child td": {borderBottom: 0}}}>
                                                    <TableCell sx={{color: "#64748b"}}>{idx + 1}</TableCell>
                                                    <TableCell sx={{color: "#1e293b"}}>
                                                        {formatConflictBookingRow(item, idx)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Card>
                        )}
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={conflictAckForce}
                                    onChange={(e) => setConflictAckForce(e.target.checked)}
                                    color="error"
                                    disabled={submitting}
                                />
                            }
                            label={
                                <Typography variant="body2" sx={{fontWeight: 500, color: "#b91c1c"}}>
                                    Tôi xác nhận hủy các lịch trùng và cập nhật ngày nghỉ
                                </Typography>
                            }
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{px: 3, py: 2.5, borderTop: "1px solid #e2e8f0", gap: 1}}>
                    <Button
                        onClick={() => setConflictDialogOpen(false)}
                        variant="text"
                        color="inherit"
                        disabled={submitting}
                        sx={{textTransform: "none", fontWeight: 500}}
                    >
                        Đóng
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleConflictConfirmUpdate}
                        disabled={submitting}
                        sx={{textTransform: "none", fontWeight: 600, borderRadius: 2, px: 2.5}}
                    >
                        {submitting ? "Đang xử lý…" : "Xác nhận hủy lịch & cập nhật"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
