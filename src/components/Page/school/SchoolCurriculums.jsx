import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    Skeleton,
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
    Grow,
} from "@mui/material";
import Pagination from "@mui/material/Pagination";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloseIcon from "@mui/icons-material/Close";
import SchoolIcon from "@mui/icons-material/School";
import DescriptionIcon from "@mui/icons-material/Description";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import { enqueueSnackbar } from "notistack";

import { getCurriculumList, saveCurriculum } from "../../../services/CurriculumService.jsx";

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

const CURRICULUM_TYPE_OPTIONS = ["INTEGRATED", "NATIONAL", "INTERNATIONAL"];
const METHOD_LEARNING_OPTIONS = ["TRADITIONAL", "PROJECT_BASED", "INQUIRY_BASED", "STEM_STEAM"];
const CURRICULUM_STATUS_OPTIONS = ["CUR_ACTIVE", "CUR_DRAFT", "CUR_ARCHIVED"];

const curriculumTypeI18N = {
    NATIONAL: "Quốc gia",
    INTERNATIONAL: "Quốc tế",
    INTEGRATED: "Tích hợp",
};

const methodLearningI18N = {
    TRADITIONAL: "Truyền thống",
    PROJECT_BASED: "Dự án (Project-based)",
    INQUIRY_BASED: "Khám phá (Inquiry-based)",
    STEM_STEAM: "STEM/STEAM",
};

const normalizeStatus = (status) => String(status || "").toUpperCase();

const getCurriculumStatusMeta = (status) => {
    const s = normalizeStatus(status);
    if (s === "CUR_ACTIVE") {
        return { label: "Đang hoạt động", bg: "rgba(34, 197, 94, 0.12)", color: "#16a34a" };
    }
    if (s === "CUR_DRAFT") {
        return { label: "Bản nháp", bg: "rgba(148, 163, 184, 0.2)", color: "#64748b" };
    }
    if (s === "CUR_ARCHIVED") {
        return { label: "Lưu trữ", bg: "rgba(234, 88, 12, 0.12)", color: "#c2410c" };
    }
    return { label: status ?? "—", bg: "rgba(148, 163, 184, 0.18)", color: "#64748b" };
};

const isActiveStatus = (status) => normalizeStatus(status) === "CUR_ACTIVE";

const toCurriculumTypeLabel = (value) => curriculumTypeI18N[value] ?? value ?? "—";

const toMethodLearningLabel = (value) => methodLearningI18N[value] ?? value ?? "—";

const subjectEmpty = () => ({
    name: "",
    description: "",
    isMandatory: false,
});

const emptyForm = () => ({
    subTypeName: "",
    description: "",
    curriculumType: "",
    methodLearning: "",
    enrollmentYear: "",
    publishNow: false,
    subjectOptions: [subjectEmpty()],
});

function mapCurriculumFromApi(item) {
    if (!item) return null;
    return {
        id: item.id,
        name: item.name,
        subTypeName: item.subTypeName ?? item.name,
        description: item.description || "",
        curriculumType: item.curriculumType,
        methodLearning: item.methodLearning,
        enrollmentYear: item.enrollmentYear,
        curriculumStatus: item.curriculumStatus,
        isLatest: item.isLatest,
        versionDisplay: item.versionDisplay,
        version: item.version,
        subjects: Array.isArray(item.subjects) ? item.subjects.map((s) => ({
            name: s.name,
            description: s.description || "",
            isMandatory: !!s.isMandatory,
        })) : [],
        groupCode: item.groupCode,
        programCount: Number(item.programCount) || 0,
        linkedProgramNames: Array.isArray(item.linkedProgramNames) ? item.linkedProgramNames : [],
    };
}

function mapSubjectOptionsForApi(subjectOptions) {
    return (subjectOptions || []).map((s) => ({
        name: String(s.name || "").trim(),
        description: String(s.description || "").trim(),
        isMandatory: !!s.isMandatory,
    }));
}

function ChipStatus({ status }) {
    const meta = getCurriculumStatusMeta(status);
    return (
        <Box
            component="span"
            sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                bgcolor: meta.bg,
                color: meta.color,
            }}
        >
            {meta.label}
        </Box>
    );
}

export default function SchoolCurriculums() {
    const [loading, setLoading] = useState(true);
    const [curriculums, setCurriculums] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [search, setSearch] = useState("");
    const [curriculumTypeFilter, setCurriculumTypeFilter] = useState("all");
    const [enrollmentYearFilter, setEnrollmentYearFilter] = useState("all");
    const [publishStatusFilter, setPublishStatusFilter] = useState("all");

    const [page, setPage] = useState(0);
    const rowsPerPage = 10;

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);

    const [selectedCurriculum, setSelectedCurriculum] = useState(null);
    const [viewCurriculum, setViewCurriculum] = useState(null);

    const [submitLoading, setSubmitLoading] = useState(false);
    const [confirmEvolveOpen, setConfirmEvolveOpen] = useState(false);
    const [curriculumToEditAfterConfirm, setCurriculumToEditAfterConfirm] = useState(null);
    const [pendingScrollSubjectIndex, setPendingScrollSubjectIndex] = useState(null);
    const [pendingScrollModal, setPendingScrollModal] = useState(null);
    const createSubjectItemRefs = useRef({});
    const editSubjectItemRefs = useRef({});

    const [formValues, setFormValues] = useState(emptyForm());
    const [formErrors, setFormErrors] = useState({});

    const enrollmentYearOptions = useMemo(() => {
        const set = new Set(curriculums.map((c) => c.enrollmentYear).filter((y) => y !== null && y !== undefined));
        return Array.from(set).sort((a, b) => Number(a) - Number(b));
    }, [curriculums]);

    const loadData = async (pageParam = page, pageSizeParam = rowsPerPage) => {
        setLoading(true);
        try {
            const res = await getCurriculumList(pageParam, pageSizeParam);
            const body = res?.data?.body ?? res?.data ?? null;

            const items = Array.isArray(body?.items)
                ? body.items
                : Array.isArray(body)
                    ? body
                    : [];

            const mapped = items
                .map(mapCurriculumFromApi)
                .filter(Boolean)
                .sort((a, b) => Number(b.version ?? 0) - Number(a.version ?? 0));

            setCurriculums(mapped);
            setTotalItems(Number(body?.totalItems ?? (Array.isArray(items) ? items.length : 0)));
        } catch (err) {
            console.error("Fetch curriculums error:", err);
            setCurriculums([]);
            setTotalItems(0);
            enqueueSnackbar("Không tải được danh sách chương trình học", { variant: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await loadData(page, rowsPerPage);
            if (cancelled) return;
        })();
        return () => {
            cancelled = true;
        };
    }, [page]);

    useEffect(() => {
        if (pendingScrollSubjectIndex === null || !pendingScrollModal) return;
        if (pendingScrollModal === "create" && !createModalOpen) return;
        if (pendingScrollModal === "edit" && !editModalOpen) return;
        const targetRefMap = pendingScrollModal === "create" ? createSubjectItemRefs.current : editSubjectItemRefs.current;
        const target = targetRefMap[pendingScrollSubjectIndex];
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            setPendingScrollSubjectIndex(null);
            setPendingScrollModal(null);
        }
    }, [createModalOpen, editModalOpen, pendingScrollSubjectIndex, pendingScrollModal, formValues.subjectOptions.length]);

    const filteredCurriculums = useMemo(() => {
        let list = curriculums;
        const q = search.trim().toLowerCase();
        if (q) list = list.filter((c) => String(c.subTypeName || "").toLowerCase().includes(q));

        if (curriculumTypeFilter !== "all") {
            list = list.filter((c) => c.curriculumType === curriculumTypeFilter);
        }

        if (enrollmentYearFilter !== "all") {
            const y = Number(enrollmentYearFilter);
            list = list.filter((c) => Number(c.enrollmentYear) === y);
        }

        if (publishStatusFilter !== "all") {
            list = list.filter((c) => normalizeStatus(c.curriculumStatus) === publishStatusFilter);
        }

        return list;
    }, [curriculums, search, curriculumTypeFilter, enrollmentYearFilter, publishStatusFilter]);

    const paginatedCurriculums = filteredCurriculums;

    const validateForm = () => {
        const errors = {};
        const subjectErrors = (formValues.subjectOptions || []).map(() => ({}));

        if (!String(formValues.subTypeName || "").trim()) errors.subTypeName = "Tên chương trình là bắt buộc";
        if (!String(formValues.description || "").trim()) errors.description = "Mô tả là bắt buộc";
        if (!String(formValues.curriculumType || "").trim()) errors.curriculumType = "Loại chương trình là bắt buộc";
        if (!String(formValues.methodLearning || "").trim()) errors.methodLearning = "Phương pháp học là bắt buộc";
        if (formValues.enrollmentYear === "" || Number.isNaN(Number(formValues.enrollmentYear))) {
            errors.enrollmentYear = "Năm tuyển sinh là bắt buộc";
        }

        const subjects = formValues.subjectOptions || [];
        if (subjects.length === 0) {
            errors.subjectOptions = "Phải có ít nhất 1 môn học";
        } else {
            subjects.forEach((s, idx) => {
                if (!String(s.name || "").trim()) subjectErrors[idx].name = "Tên môn học là bắt buộc";
            });

            const hasSubjectErrors = subjectErrors.some((se) => Object.keys(se).length > 0);
            if (hasSubjectErrors) errors.subjectOptions = subjectErrors;
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const getCreatePayload = (publishNow) => ({
        subTypeName: String(formValues.subTypeName || "").trim(),
        description: String(formValues.description || "").trim(),
        curriculumType: formValues.curriculumType,
        methodLearning: formValues.methodLearning,
        enrollmentYear: Number(formValues.enrollmentYear),
        publishNow: publishNow !== undefined ? !!publishNow : !!formValues.publishNow,
        subjectOptions: mapSubjectOptionsForApi(formValues.subjectOptions),
    });

    const getUpdatePayload = (publishNow) => ({
        curriculumId: selectedCurriculum?.id,
        ...getCreatePayload(publishNow),
    });

    const handleOpenCreate = () => {
        const defaultCurriculumType = "INTEGRATED";
        const defaultMethodLearning = "STEM_STEAM";
        setSelectedCurriculum(null);
        setViewCurriculum(null);
        setFormErrors({});
        setPendingScrollSubjectIndex(null);
        setPendingScrollModal(null);
        setFormValues({
            ...emptyForm(),
            curriculumType: defaultCurriculumType,
            methodLearning: defaultMethodLearning,
            enrollmentYear: new Date().getFullYear(),
            publishNow: false,
            subjectOptions: [subjectEmpty()],
        });
        setCreateModalOpen(true);
    };

    const handleOpenEdit = (curriculum) => {
        setSelectedCurriculum(curriculum);
        setViewCurriculum(null);

        const isActive = isActiveStatus(curriculum?.curriculumStatus);
        setFormValues({
            subTypeName: curriculum?.subTypeName || "",
            description: curriculum?.description || "",
            curriculumType: curriculum?.curriculumType || "",
            methodLearning: curriculum?.methodLearning || "",
            enrollmentYear: curriculum?.enrollmentYear ?? "",
            publishNow: isActive,
            subjectOptions:
                Array.isArray(curriculum?.subjects) && curriculum.subjects.length > 0
                    ? curriculum.subjects.map((s) => ({
                        name: s.name || "",
                        description: s.description || "",
                        isMandatory: !!s.isMandatory,
                    }))
                    : [subjectEmpty()],
        });

        setFormErrors({});
        setPendingScrollSubjectIndex(null);
        setPendingScrollModal(null);
        setEditModalOpen(true);
    };

    const handleEditClick = (curriculum) => {
        if (isActiveStatus(curriculum?.curriculumStatus)) {
            setCurriculumToEditAfterConfirm(curriculum);
            setConfirmEvolveOpen(true);
        } else {
            handleOpenEdit(curriculum);
        }
    };

    const handleConfirmEvolve = () => {
        if (curriculumToEditAfterConfirm) {
            handleOpenEdit(curriculumToEditAfterConfirm);
            setCurriculumToEditAfterConfirm(null);
        }
        setConfirmEvolveOpen(false);
    };

    const handleCloseCreate = () => {
        if (submitLoading) return;
        setCreateModalOpen(false);
        setFormErrors({});
        setPendingScrollSubjectIndex(null);
        setPendingScrollModal(null);
    };

    const handleCloseEdit = () => {
        if (submitLoading) return;
        setEditModalOpen(false);
        setFormErrors({});
        setSelectedCurriculum(null);
        setPendingScrollSubjectIndex(null);
        setPendingScrollModal(null);
    };

    const handleOpenView = (curriculum) => {
        setViewCurriculum(curriculum);
        setViewModalOpen(true);
    };

    const handleCreateSubmit = async (publishNow) => {
        if (!validateForm()) return;
        setSubmitLoading(true);
        try {
            const payload = getCreatePayload(publishNow);
            const res = await saveCurriculum(payload);
            if (res?.status === 200 || res?.data?.message) {
                enqueueSnackbar(res?.data?.message || "Tạo curriculum thành công", { variant: "success" });
                setCreateModalOpen(false);
                setFormErrors({});
                setPage(0);
                await loadData(0, rowsPerPage);
            } else {
                enqueueSnackbar(res?.data?.message || "Tạo curriculum thất bại", { variant: "error" });
            }
        } catch (err) {
            console.error("Create curriculum error:", err);
            enqueueSnackbar(err?.response?.data?.message || "Lỗi khi tạo curriculum", { variant: "error" });
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEditSubmit = async (publishNow) => {
        if (!selectedCurriculum) return;
        if (!validateForm()) return;
        setSubmitLoading(true);
        try {
            const payload = getUpdatePayload(publishNow);
            const res = await saveCurriculum(payload);
            if (res?.status === 200 || res?.data?.message) {
                enqueueSnackbar(res?.data?.message || "Cập nhật curriculum thành công", { variant: "success" });
                setEditModalOpen(false);
                setFormErrors({});
                setSelectedCurriculum(null);
                await loadData(page, rowsPerPage);
            } else {
                enqueueSnackbar(res?.data?.message || "Cập nhật curriculum thất bại", { variant: "error" });
            }
        } catch (err) {
            console.error("Update curriculum error:", err);
            enqueueSnackbar(err?.response?.data?.message || "Lỗi khi cập nhật curriculum", { variant: "error" });
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleBasicChange = (e) => {
        const { name, value } = e.target;
        setFormValues((prev) => {
            if (name === "enrollmentYear") {
                return { ...prev, enrollmentYear: value === "" ? "" : parseInt(value, 10) };
            }
            return { ...prev, [name]: value };
        });
    };

    const handleSubjectChange = (idx, field) => (e) => {
        const value = field === "isMandatory" ? e.target.checked : e.target.value;
        setFormValues((prev) => ({
            ...prev,
            subjectOptions: prev.subjectOptions.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
        }));
        setFormErrors({});
    };

    const handleAddSubject = () => {
        if (createModalOpen) {
            setPendingScrollSubjectIndex(formValues.subjectOptions.length);
            setPendingScrollModal("create");
        } else if (editModalOpen) {
            setPendingScrollSubjectIndex(formValues.subjectOptions.length);
            setPendingScrollModal("edit");
        }
        setFormValues((prev) => ({ ...prev, subjectOptions: [...prev.subjectOptions, subjectEmpty()] }));
        setFormErrors({});
    };

    const handleDeleteSubject = (idx) => {
        setFormValues((prev) => ({
            ...prev,
            subjectOptions: prev.subjectOptions.filter((_, i) => i !== idx),
        }));
        setFormErrors({});
    };

    const isEditFieldsLocked = (selectedCurriculum?.programCount ?? 0) > 0;

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%" }}>
            {/* Header */}
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
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: { xs: "stretch", sm: "center" },
                        justifyContent: "space-between",
                        gap: 2,
                    }}
                >
                    <Box>
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 800,
                                letterSpacing: "-0.02em",
                                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            }}
                        >
                            Quản lý chương trình học
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.95 }}>
                            Tạo mới, cập nhật và quản lý trạng thái công bố của các chương trình học.
                        </Typography>
                    </Box>

                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleOpenCreate}
                        sx={{
                            bgcolor: "rgba(255,255,255,0.95)",
                            color: "#0D64DE",
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 700,
                            px: 3,
                            py: 1.5,
                            boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                            "&:hover": { bgcolor: "white", boxShadow: "0 6px 20px rgba(0,0,0,0.2)" },
                        }}
                    >
                        Tạo chương trình
                    </Button>
                </Box>
            </Box>

            {/* Search & Filters */}
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                    bgcolor: "#F8FAFC",
                }}
            >
                <CardContent sx={{ p: 2.5 }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
                        <TextField
                            placeholder="Tìm theo tên chương trình..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(0);
                            }}
                            size="small"
                            sx={{
                                flex: 1,
                                minWidth: 220,
                                maxWidth: { md: 360 },
                                "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "white" },
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: "#64748b" }} />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <FormControl size="small" sx={{ minWidth: 180 }}>
                            <InputLabel>Loại chương trình</InputLabel>
                            <Select
                                value={curriculumTypeFilter}
                                label="Loại chương trình"
                                onChange={(e) => {
                                    setCurriculumTypeFilter(e.target.value);
                                    setPage(0);
                                }}
                                sx={{ borderRadius: 2, bgcolor: "white" }}
                            >
                                <MenuItem value="all">Tất cả</MenuItem>
                                {CURRICULUM_TYPE_OPTIONS.map((t) => (
                                    <MenuItem key={t} value={t}>
                                        {toCurriculumTypeLabel(t)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 170 }}>
                            <InputLabel>Năm tuyển sinh</InputLabel>
                            <Select
                                value={enrollmentYearFilter}
                                label="Năm tuyển sinh"
                                onChange={(e) => {
                                    setEnrollmentYearFilter(e.target.value);
                                    setPage(0);
                                }}
                                sx={{ borderRadius: 2, bgcolor: "white" }}
                            >
                                <MenuItem value="all">Tất cả</MenuItem>
                                {enrollmentYearOptions.map((y) => (
                                    <MenuItem key={y} value={String(y)}>
                                        {y}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel>Trạng thái</InputLabel>
                            <Select
                                value={publishStatusFilter}
                                label="Trạng thái"
                                onChange={(e) => {
                                    setPublishStatusFilter(e.target.value);
                                    setPage(0);
                                }}
                                sx={{ borderRadius: 2, bgcolor: "white" }}
                            >
                                <MenuItem value="all">Tất cả</MenuItem>
                                {CURRICULUM_STATUS_OPTIONS.map((s) => (
                                    <MenuItem key={s} value={s}>
                                        {getCurriculumStatusMeta(s).label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </CardContent>
            </Card>

            {/* Table */}
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 20px rgba(13, 100, 222, 0.06)",
                    overflow: "hidden",
                    bgcolor: "#F8FAFC",
                }}
            >
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>Tên chương trình</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>Mô tả</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>Loại chương trình</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>Phương pháp học</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>Năm tuyển sinh</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>Số chương trình</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>Trạng thái</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }} align="right">
                                    Thao tác
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton variant="text" width="60%" /></TableCell>
                                        <TableCell><Skeleton variant="text" width="40%" /></TableCell>
                                        <TableCell><Skeleton variant="text" width="40%" /></TableCell>
                                        <TableCell><Skeleton variant="text" width="50%" /></TableCell>
                                        <TableCell><Skeleton variant="text" width={60} /></TableCell>
                                        <TableCell><Skeleton variant="text" width={40} /></TableCell>
                                        <TableCell><Skeleton variant="rounded" width={90} height={24} /></TableCell>
                                        <TableCell align="right"><Skeleton variant="rounded" width={80} height={32} /></TableCell>
                                    </TableRow>
                                ))
                            ) : paginatedCurriculums.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
                                            <SchoolIcon sx={{ fontSize: 56, color: "#cbd5e1" }} />
                                            <Typography variant="h6" sx={{ color: "#64748b", fontWeight: 700 }}>
                                                Chưa có chương trình
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: "#94a3b8", maxWidth: 420 }}>
                                                {filteredCurriculums.length === 0 && curriculums.length > 0
                                                    ? "Không có kết quả phù hợp với tìm kiếm hoặc bộ lọc."
                                                    : "Chưa có chương trình nào. Hãy tạo chương trình đầu tiên để bắt đầu."}
                                            </Typography>
                                            {curriculums.length === 0 && (
                                                <Button
                                                    variant="contained"
                                                    startIcon={<AddIcon />}
                                                    onClick={handleOpenCreate}
                                                    sx={{
                                                        mt: 1,
                                                        borderRadius: 2,
                                                        textTransform: "none",
                                                        fontWeight: 700,
                                                        background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                                                    }}
                                                >
                                                    Tạo chương trình
                                                </Button>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedCurriculums.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        hover
                                        sx={{ "&:hover": { bgcolor: "rgba(122, 169, 235, 0.06)" } }}
                                    >
                                        <TableCell>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Box
                                                    sx={{
                                                        width: 40,
                                                        height: 32,
                                                        borderRadius: 1.5,
                                                        bgcolor: "rgba(13, 100, 222, 0.08)",
                                                        color: "#0D64DE",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontWeight: 800,
                                                    }}
                                                >
                                                    <DescriptionIcon sx={{ fontSize: 18 }} />
                                                </Box>
                                                <Box>
                                                    <Typography sx={{ fontWeight: 700, color: "#1e293b" }}>
                                                        {row.name || row.subTypeName}
                                                    </Typography>
                                                    {row.versionDisplay && (
                                                        <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                                                            {row.isLatest ? `Phiên bản: ${row.versionDisplay} (Mới nhất)` : row.versionDisplay}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{ color: "#64748b", maxWidth: 200 }} title={row.description}>
                                            <Typography noWrap variant="body2">{row.description || "—"}</Typography>
                                        </TableCell>
                                        <TableCell sx={{ color: "#64748b" }}>
                                            {toCurriculumTypeLabel(row.curriculumType)}
                                        </TableCell>
                                        <TableCell sx={{ color: "#64748b" }}>
                                            {toMethodLearningLabel(row.methodLearning)}
                                        </TableCell>
                                        <TableCell sx={{ color: "#64748b" }}>{row.enrollmentYear}</TableCell>
                                        <TableCell sx={{ color: "#64748b" }}>
                                            {row.programCount > 0 ? (
                                                <Tooltip
                                                    title={
                                                        <Box component="span">
                                                            {(row.linkedProgramNames || []).length > 0
                                                                ? row.linkedProgramNames.map((p, i) => <Box key={i}>• {p}</Box>)
                                                                : "Đã liên kết với chương trình"}
                                                        </Box>
                                                    }
                                                    arrow
                                                    placement="top"
                                                >
                                                    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, cursor: "help" }}>
                                                        {row.programCount}
                                                        <Typography component="span" sx={{ fontSize: 14, color: "#64748b" }}>ⓘ</Typography>
                                                    </Box>
                                                </Tooltip>
                                            ) : (
                                                "0"
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <ChipStatus status={row.curriculumStatus} />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenView(row)}
                                                    sx={{
                                                        color: "#64748b",
                                                        "&:hover": { color: "#0D64DE", bgcolor: "rgba(13, 100, 222, 0.08)" },
                                                    }}
                                                    title="Xem"
                                                >
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleEditClick(row)}
                                                    sx={{
                                                        color: "#64748b",
                                                        "&:hover": { color: "#0D64DE", bgcolor: "rgba(13, 100, 222, 0.08)" },
                                                    }}
                                                    title="Sửa"
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {totalItems > 0 &&
                    !loading && (
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
                                count={Math.ceil(totalItems / rowsPerPage)}
                                page={page + 1}
                                onChange={(_, p) => setPage(p - 1)}
                                color="primary"
                                shape="rounded"
                            />
                        </Box>
                    )}
            </Card>

            {/* Confirm Edit Active (Evolve) Dialog */}
            <Dialog
                open={confirmEvolveOpen}
                onClose={() => { setConfirmEvolveOpen(false); setCurriculumToEditAfterConfirm(null); }}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Chỉnh sửa chương trình đã công bố</DialogTitle>
                <DialogContent>
                    <Typography>
                        Bạn đang chỉnh sửa chương trình đã công bố. Một phiên bản mới sẽ được tạo và phiên bản hiện tại sẽ được lưu trữ. Bạn có muốn tiếp tục?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => { setConfirmEvolveOpen(false); setCurriculumToEditAfterConfirm(null); }} sx={{ textTransform: "none" }}>
                        Hủy
                    </Button>
                    <Button variant="contained" onClick={handleConfirmEvolve} sx={{ textTransform: "none", borderRadius: 2 }}>
                        Tiếp tục
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Curriculum Dialog */}
            <Dialog
                open={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
                slotProps={{ backdrop: { sx: modalBackdropSx } }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box>Chi tiết chương trình</Box>
                    <IconButton size="small" onClick={() => setViewModalOpen(false)} sx={{ bgcolor: "#f1f5f9", "&:hover": { bgcolor: "#e2e8f0" } }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
                    {viewCurriculum && (
                        <Stack spacing={2.2}>
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                    {viewCurriculum.name || viewCurriculum.subTypeName}
                                </Typography>
                                <ChipStatus status={viewCurriculum.curriculumStatus} />
                            </Stack>
                            {viewCurriculum.versionDisplay && (
                                <Typography variant="body2" sx={{ color: "#64748b" }}>
                                    Phiên bản: {viewCurriculum.versionDisplay} {viewCurriculum.isLatest ? "(Mới nhất)" : ""}
                                </Typography>
                            )}
                            {normalizeStatus(viewCurriculum.curriculumStatus) === "CUR_DRAFT" && (
                                <Typography variant="caption" sx={{ color: "#64748b", fontStyle: "italic" }}>
                                    Bản nháp - chưa công bố
                                </Typography>
                            )}
                            <Box>
                                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.6 }}>
                                    Mã nhóm (groupCode)
                                </Typography>
                                <Typography sx={{ fontWeight: 650, color: "#1e293b" }}>
                                    {viewCurriculum.groupCode || "—"}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.6 }}>
                                    Loại chương trình
                                </Typography>
                                <Typography sx={{ fontWeight: 650, color: "#1e293b" }}>
                                    {toCurriculumTypeLabel(viewCurriculum.curriculumType)}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.6 }}>
                                    Phương pháp học
                                </Typography>
                                <Typography sx={{ fontWeight: 650, color: "#1e293b" }}>
                                    {toMethodLearningLabel(viewCurriculum.methodLearning)}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.6 }}>
                                    Năm tuyển sinh
                                </Typography>
                                <Typography sx={{ fontWeight: 650, color: "#1e293b" }}>{viewCurriculum.enrollmentYear}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.6 }}>
                                    Mô tả
                                </Typography>
                                <Typography sx={{ color: "#374151", whiteSpace: "pre-wrap" }}>
                                    {viewCurriculum.description || "—"}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#1e293b", mb: 1 }}>
                                    Môn học
                                </Typography>
                                <Stack spacing={1.2}>
                                    {(viewCurriculum.subjects || []).map((s, idx) => (
                                        <Box
                                            key={`${s.name}-${idx}`}
                                            sx={{
                                                border: "1px solid #e2e8f0",
                                                borderRadius: 2,
                                                bgcolor: "#f8fafc",
                                                px: 1.5,
                                                py: 1.2,
                                            }}
                                        >
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                                                <Typography sx={{ fontWeight: 700, color: "#1e293b" }}>
                                                    {s.name}
                                                </Typography>
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    {s.isMandatory ? (
                                                        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.7 }}>
                                                            <DoneAllIcon fontSize="small" sx={{ color: "#16a34a" }} />
                                                            <Typography variant="caption" sx={{ color: "#16a34a", fontWeight: 700 }}>
                                                                Bắt buộc
                                                            </Typography>
                                                        </Box>
                                                    ) : (
                                                        <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700 }}>
                                                            Không bắt buộc
                                                        </Typography>
                                                    )}
                                                </Stack>
                                            </Stack>
                                            <Typography variant="body2" sx={{ color: "#64748b", mt: 0.7 }}>
                                                {s.description || "—"}
                                            </Typography>
                                        </Box>
                                    ))}
                                    {(viewCurriculum.subjects || []).length === 0 && (
                                        <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                                            Chưa có môn học.
                                        </Typography>
                                    )}
                                </Stack>
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setViewModalOpen(false)} sx={{ textTransform: "none", fontWeight: 600, color: "#64748b" }}>
                        Đóng
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Create Curriculum Dialog */}
            <Dialog
                open={createModalOpen}
                onClose={handleCloseCreate}
                fullWidth
                maxWidth="md"
                PaperProps={{ sx: modalPaperSx }}
                slotProps={{ backdrop: { sx: modalBackdropSx } }}
            >
                <DialogTitle sx={{ fontWeight: 850, color: "#1e293b", px: 3, pt: 2.6, pb: 0 }}>
                    Tạo chương trình
                </DialogTitle>
                <DialogContent dividers={false} sx={{ px: 3, pt: 2, pb: 1 }}>
                    <Stack spacing={2.4}>
                        {/* Basic Information */}
                        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1e293b" }}>
                            Thông tin cơ bản
                        </Typography>

                        <TextField
                            label="Tên chương trình"
                            name="subTypeName"
                            fullWidth
                            value={formValues.subTypeName}
                            onChange={handleBasicChange}
                            error={!!formErrors.subTypeName}
                            helperText={formErrors.subTypeName}
                            required
                        />

                        <TextField
                            label="Mô tả"
                            name="description"
                            fullWidth
                            value={formValues.description}
                            onChange={handleBasicChange}
                            error={!!formErrors.description}
                            helperText={formErrors.description}
                            multiline
                            rows={3}
                            required
                        />

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Loại chương trình</InputLabel>
                                <Select
                                    name="curriculumType"
                                    value={formValues.curriculumType}
                                    label="Loại chương trình"
                                    onChange={handleBasicChange}
                                    error={!!formErrors.curriculumType}
                                >
                                    {CURRICULUM_TYPE_OPTIONS.map((t) => (
                                        <MenuItem key={t} value={t}>
                                            {toCurriculumTypeLabel(t)}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {formErrors.curriculumType ? (
                                    <Typography variant="caption" sx={{ color: "#d32f2f", ml: 1.2, mt: 0.5, display: "block" }}>
                                        {formErrors.curriculumType}
                                    </Typography>
                                ) : null}
                            </FormControl>

                            <FormControl fullWidth size="small">
                                <InputLabel>Phương pháp học</InputLabel>
                                <Select
                                    name="methodLearning"
                                    value={formValues.methodLearning}
                                    label="Phương pháp học"
                                    onChange={handleBasicChange}
                                    error={!!formErrors.methodLearning}
                                >
                                    {METHOD_LEARNING_OPTIONS.map((m) => (
                                        <MenuItem key={m} value={m}>
                                            {toMethodLearningLabel(m)}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {formErrors.methodLearning ? (
                                    <Typography variant="caption" sx={{ color: "#d32f2f", ml: 1.2, mt: 0.5, display: "block" }}>
                                        {formErrors.methodLearning}
                                    </Typography>
                                ) : null}
                            </FormControl>
                        </Stack>

                        <TextField
                            label="Năm tuyển sinh"
                            name="enrollmentYear"
                            type="number"
                            fullWidth
                            value={formValues.enrollmentYear}
                            onChange={handleBasicChange}
                            error={!!formErrors.enrollmentYear}
                            helperText={formErrors.enrollmentYear}
                            required
                            inputProps={{ min: 2000, max: 2100, step: 1 }}
                        />

                        {/* Subjects */}
                        <Box sx={{ mt: 0.6 }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1e293b" }}>
                                    Môn học
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={handleAddSubject}
                                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                                >
                                    Thêm môn
                                </Button>
                            </Stack>

                            {formErrors.subjectOptions && typeof formErrors.subjectOptions === "string" ? (
                                <Typography variant="caption" sx={{ color: "#d32f2f", display: "block", mt: 1.2 }}>
                                    {formErrors.subjectOptions}
                                </Typography>
                            ) : null}

                            <Stack spacing={1.2} sx={{ mt: 1.2 }}>
                                {formValues.subjectOptions.map((subject, idx) => {
                                    const subjectErr =
                                        Array.isArray(formErrors.subjectOptions) && formErrors.subjectOptions[idx]
                                            ? formErrors.subjectOptions[idx]
                                            : null;
                                    return (
                                        <Grow in={true} style={{ transformOrigin: "0 0 0" }} key={`create-subject-${idx}`}>
                                            <Box
                                                ref={(el) => {
                                                    createSubjectItemRefs.current[idx] = el;
                                                }}
                                                sx={{
                                                    border: "1px solid #e2e8f0",
                                                    borderRadius: 2,
                                                    bgcolor: "#f8fafc",
                                                    px: 2,
                                                    py: 1.6,
                                                }}
                                            >
                                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                                                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 800 }}>
                                                        Môn {idx + 1}
                                                    </Typography>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDeleteSubject(idx)}
                                                        sx={{
                                                            color: "#64748b",
                                                            "&:hover": { color: "#dc2626", bgcolor: "rgba(220, 38, 38, 0.08)" },
                                                        }}
                                                        disabled={formValues.subjectOptions.length === 1}
                                                        title="Xóa"
                                                    >
                                                        <DeleteOutlineIcon fontSize="small" />
                                                    </IconButton>
                                                </Stack>

                                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 1 }}>
                                                    <TextField
                                                        label="Tên môn"
                                                        fullWidth
                                                        value={subject.name}
                                                        onChange={handleSubjectChange(idx, "name")}
                                                        error={!!subjectErr?.name}
                                                        helperText={subjectErr?.name}
                                                        required
                                                    />
                                                    <TextField
                                                        label="Mô tả môn"
                                                        fullWidth
                                                        value={subject.description}
                                                        onChange={handleSubjectChange(idx, "description")}
                                                    />
                                                </Stack>

                                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.2 }}>
                                                    <Typography sx={{ fontWeight: 800, color: "#1e293b" }}>Bắt buộc</Typography>
                                                    <Switch
                                                        checked={!!subject.isMandatory}
                                                        onChange={handleSubjectChange(idx, "isMandatory")}
                                                        sx={{
                                                            "& .MuiSwitch-switchBase.Mui-checked": { color: "#16a34a" },
                                                            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                                                backgroundColor: "#16a34a",
                                                            },
                                                        }}
                                                    />
                                                </Stack>
                                            </Box>
                                        </Grow>
                                    );
                                })}
                            </Stack>
                        </Box>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2.2, borderTop: "1px solid #e2e8f0", gap: 1 }}>
                    <Button onClick={handleCloseCreate} variant="text" color="inherit" sx={{ textTransform: "none", fontWeight: 700 }}>
                        Hủy
                    </Button>
                    <Button
                        onClick={() => handleCreateSubmit(false)}
                        variant="outlined"
                        disabled={submitLoading}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, px: 3 }}
                    >
                        {submitLoading ? "Đang lưu..." : "Lưu nháp"}
                    </Button>
                    <Button
                        onClick={() => handleCreateSubmit(true)}
                        variant="contained"
                        disabled={submitLoading}
                        sx={{
                            textTransform: "none",
                            fontWeight: 900,
                            borderRadius: 2,
                            px: 3,
                            background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                        }}
                    >
                        {submitLoading ? "Đang tạo..." : "Công bố"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Curriculum Dialog */}
            <Dialog
                open={editModalOpen}
                onClose={handleCloseEdit}
                fullWidth
                maxWidth="md"
                PaperProps={{ sx: modalPaperSx }}
                slotProps={{ backdrop: { sx: modalBackdropSx } }}
            >
                <DialogTitle sx={{ fontWeight: 850, color: "#1e293b", px: 3, pt: 2.6, pb: 0 }}>
                    Chỉnh sửa chương trình
                </DialogTitle>
                <DialogContent dividers={false} sx={{ px: 3, pt: 2, pb: 1 }}>
                    {/* reuse same form as create */}
                    <Stack spacing={2.4}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1e293b" }}>
                            Thông tin cơ bản
                        </Typography>

                        <TextField
                            label="Tên chương trình"
                            name="subTypeName"
                            fullWidth
                            value={formValues.subTypeName}
                            onChange={handleBasicChange}
                            error={!!formErrors.subTypeName}
                            helperText={formErrors.subTypeName}
                            required
                        />

                        <TextField
                            label="Mô tả"
                            name="description"
                            fullWidth
                            value={formValues.description}
                            onChange={handleBasicChange}
                            error={!!formErrors.description}
                            helperText={formErrors.description}
                            multiline
                            rows={3}
                            required
                        />

                        {isEditFieldsLocked && (
                            <Typography variant="body2" sx={{ color: "#c2410c", bgcolor: "rgba(234, 88, 12, 0.08)", p: 1.5, borderRadius: 2 }}>
                                Thông tin này không thể thay đổi vì đã được sử dụng bởi chương trình.
                            </Typography>
                        )}

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <FormControl fullWidth size="small" disabled={isEditFieldsLocked}>
                                <InputLabel>Loại chương trình</InputLabel>
                                <Select
                                    name="curriculumType"
                                    value={formValues.curriculumType}
                                    label="Loại chương trình"
                                    onChange={handleBasicChange}
                                >
                                    {CURRICULUM_TYPE_OPTIONS.map((t) => (
                                        <MenuItem key={t} value={t}>
                                            {toCurriculumTypeLabel(t)}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {formErrors.curriculumType ? (
                                    <Typography variant="caption" sx={{ color: "#d32f2f", ml: 1.2, mt: 0.5, display: "block" }}>
                                        {formErrors.curriculumType}
                                    </Typography>
                                ) : null}
                            </FormControl>

                            <FormControl fullWidth size="small">
                                <InputLabel>Phương pháp học</InputLabel>
                                <Select
                                    name="methodLearning"
                                    value={formValues.methodLearning}
                                    label="Phương pháp học"
                                    onChange={handleBasicChange}
                                >
                                    {METHOD_LEARNING_OPTIONS.map((m) => (
                                        <MenuItem key={m} value={m}>
                                            {toMethodLearningLabel(m)}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {formErrors.methodLearning ? (
                                    <Typography variant="caption" sx={{ color: "#d32f2f", ml: 1.2, mt: 0.5, display: "block" }}>
                                        {formErrors.methodLearning}
                                    </Typography>
                                ) : null}
                            </FormControl>
                        </Stack>

                        <TextField
                            label="Năm tuyển sinh"
                            name="enrollmentYear"
                            type="number"
                            fullWidth
                            value={formValues.enrollmentYear}
                            onChange={handleBasicChange}
                            error={!!formErrors.enrollmentYear}
                            helperText={formErrors.enrollmentYear}
                            required
                            disabled={isEditFieldsLocked}
                            inputProps={{ min: 2000, max: 2100, step: 1 }}
                        />

                        <Box sx={{ mt: 0.6 }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1e293b" }}>
                                    Môn học
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={handleAddSubject}
                                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                                >
                                    Thêm môn
                                </Button>
                            </Stack>

                            {formErrors.subjectOptions && typeof formErrors.subjectOptions === "string" ? (
                                <Typography variant="caption" sx={{ color: "#d32f2f", display: "block", mt: 1.2 }}>
                                    {formErrors.subjectOptions}
                                </Typography>
                            ) : null}

                            <Stack spacing={1.2} sx={{ mt: 1.2 }}>
                                {formValues.subjectOptions.map((subject, idx) => {
                                    const subjectErr =
                                        Array.isArray(formErrors.subjectOptions) && formErrors.subjectOptions[idx]
                                            ? formErrors.subjectOptions[idx]
                                            : null;
                                    return (
                                        <Grow in={true} style={{ transformOrigin: "0 0 0" }} key={`edit-subject-${idx}`}>
                                            <Box
                                                ref={(el) => {
                                                    editSubjectItemRefs.current[idx] = el;
                                                }}
                                                sx={{
                                                    border: "1px solid #e2e8f0",
                                                    borderRadius: 2,
                                                    bgcolor: "#f8fafc",
                                                    px: 2,
                                                    py: 1.6,
                                                }}
                                            >
                                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                                                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 800 }}>
                                                        Môn {idx + 1}
                                                    </Typography>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDeleteSubject(idx)}
                                                        sx={{
                                                            color: "#64748b",
                                                            "&:hover": { color: "#dc2626", bgcolor: "rgba(220, 38, 38, 0.08)" },
                                                        }}
                                                        disabled={formValues.subjectOptions.length === 1}
                                                        title="Xóa"
                                                    >
                                                        <DeleteOutlineIcon fontSize="small" />
                                                    </IconButton>
                                                </Stack>

                                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 1 }}>
                                                    <TextField
                                                        label="Tên môn"
                                                        fullWidth
                                                        value={subject.name}
                                                        onChange={handleSubjectChange(idx, "name")}
                                                        error={!!subjectErr?.name}
                                                        helperText={subjectErr?.name}
                                                        required
                                                    />
                                                    <TextField
                                                        label="Mô tả môn"
                                                        fullWidth
                                                        value={subject.description}
                                                        onChange={handleSubjectChange(idx, "description")}
                                                    />
                                                </Stack>

                                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.2 }}>
                                                    <Typography sx={{ fontWeight: 800, color: "#1e293b" }}>Bắt buộc</Typography>
                                                    <Switch
                                                        checked={!!subject.isMandatory}
                                                        onChange={handleSubjectChange(idx, "isMandatory")}
                                                        sx={{
                                                            "& .MuiSwitch-switchBase.Mui-checked": { color: "#16a34a" },
                                                            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                                                backgroundColor: "#16a34a",
                                                            },
                                                        }}
                                                    />
                                                </Stack>
                                            </Box>
                                        </Grow>
                                    );
                                })}
                            </Stack>
                        </Box>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2.2, borderTop: "1px solid #e2e8f0", gap: 1 }}>
                    <Button onClick={handleCloseEdit} variant="text" color="inherit" sx={{ textTransform: "none", fontWeight: 700 }}>
                        Hủy
                    </Button>
                    <Button
                        onClick={() => handleEditSubmit(false)}
                        variant="outlined"
                        disabled={submitLoading}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, px: 3 }}
                    >
                        {submitLoading ? "Đang lưu..." : "Lưu nháp"}
                    </Button>
                    <Button
                        onClick={() => handleEditSubmit(true)}
                        variant="contained"
                        disabled={submitLoading}
                        sx={{
                            textTransform: "none",
                            fontWeight: 900,
                            borderRadius: 2,
                            px: 3,
                            background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                        }}
                    >
                        {submitLoading ? "Đang cập nhật..." : "Công bố"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

