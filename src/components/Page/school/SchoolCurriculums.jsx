import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
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
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { enqueueSnackbar } from "notistack";

import { useSchool } from "../../../contexts/SchoolContext.jsx";
import { activateCurriculum, getCurriculumList, saveCurriculum } from "../../../services/CurriculumService.jsx";

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
        return { label: "Hoạt động", bg: "rgba(34, 197, 94, 0.12)", color: "#16a34a" };
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

/**
 * BE generateName() luôn prefix "Hệ " + subTypeName. Nếu BE trả nhầm "Hệ ..." trong field subTypeName
 * thì cần bỏ các tiền tố "Hệ " lặp ở đầu để tránh "Hệ Hệ ..." khi submit.
 */
function stripLeadingHePrefix(value) {
    let s = String(value ?? "").trim();
    while (s.length > 0) {
        const m = s.match(/^Hệ\s+/u);
        if (!m) break;
        s = s.slice(m[0].length).trim();
    }
    return s;
}

function mapSubTypeNameForForm(item) {
    const raw = item?.subTypeName;
    if (raw != null && String(raw).trim() !== "") {
        return stripLeadingHePrefix(raw);
    }
    return item?.name ?? "";
}

function mapCurriculumFromApi(item) {
    if (!item) return null;
    return {
        id: item.id,
        name: item.name,
        subTypeName: mapSubTypeNameForForm(item),
        description: item.description || "",
        curriculumType: item.curriculumType,
        methodLearning: item.methodLearning,
        enrollmentYear: item.enrollmentYear,
        curriculumStatus: item.curriculumStatus ?? item.status,
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
        canEditIdentity: item.canEditIdentity,
    };
}

function extractCurriculumIdFromResponse(res) {
    // BE có thể trả ID ở nhiều vị trí khác nhau.
    const location = res?.headers?.location ?? res?.headers?.Location ?? null;
    if (location) {
        const match = String(location).match(/\/(\d+)(?:\/)?$/);
        if (match?.[1]) return Number(match[1]);
    }

    return (
        res?.data?.body?.id ??
        res?.data?.body?.curriculumId ??
        res?.data?.body?.draftId ??
        res?.data?.body?.createdId ??
        res?.data?.id ??
        res?.data?.curriculumId ??
        null
    );
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
    const { isPrimaryBranch } = useSchool();
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
    const [evolveLoading, setEvolveLoading] = useState(false);
    const [publishLoading, setPublishLoading] = useState(false);
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
        if (q) {
            list = list.filter((c) => {
                const hay = `${c.name || ""} ${c.subTypeName || ""}`.toLowerCase();
                return hay.includes(q);
            });
        }

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

    const getCreatePayload = () => ({
        subTypeName: String(formValues.subTypeName || "").trim(),
        description: String(formValues.description || "").trim(),
        curriculumType: formValues.curriculumType,
        methodLearning: formValues.methodLearning,
        enrollmentYear: Number(formValues.enrollmentYear),
        publishNow: false,
        subjectOptions: mapSubjectOptionsForApi(formValues.subjectOptions),
    });

    const getUpdatePayload = () => ({
        curriculumId: selectedCurriculum?.id,
        ...getCreatePayload(),
    });

    const handleOpenCreate = () => {
        if (!isPrimaryBranch) return;
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
        if (!isPrimaryBranch) return;
        setSelectedCurriculum(curriculum);
        setViewCurriculum(null);

        setFormValues({
            subTypeName: curriculum?.subTypeName || "",
            description: curriculum?.description || "",
            curriculumType: curriculum?.curriculumType || "",
            methodLearning: curriculum?.methodLearning || "",
            enrollmentYear: curriculum?.enrollmentYear ?? "",
            // Luôn lưu/update theo chế độ "draft" ở client; publish do PATCH activate thực hiện.
            publishNow: false,
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
        if (!isPrimaryBranch) {
            handleOpenView(curriculum);
            return;
        }
        if (normalizeStatus(curriculum?.curriculumStatus) === "CUR_ARCHIVED") {
            enqueueSnackbar("Chương trình đã lưu trữ, không thể chỉnh sửa.", { variant: "warning" });
            return;
        }
        if (isActiveStatus(curriculum?.curriculumStatus)) {
            setCurriculumToEditAfterConfirm(curriculum);
            setConfirmEvolveOpen(true);
        } else {
            handleOpenEdit(curriculum);
        }
    };

    const handleConfirmEvolve = async () => {
        if (!isPrimaryBranch) return;
        if (!curriculumToEditAfterConfirm) return;
        setEvolveLoading(true);
        try {
            const base = curriculumToEditAfterConfirm;
            const draftRes = await saveCurriculum({
                curriculumId: base.id,
                subTypeName: String(base.subTypeName || base.name || "").trim(),
                description: String(base.description || "").trim(),
                curriculumType: base.curriculumType,
                methodLearning: base.methodLearning,
                enrollmentYear: Number(base.enrollmentYear),
                publishNow: false,
                subjectOptions: mapSubjectOptionsForApi(base.subjects),
            });

            const newDraftId = extractCurriculumIdFromResponse(draftRes);
            if (!newDraftId) {
                enqueueSnackbar(
                    draftRes?.data?.message ||
                        "Tạo bản nháp từ curriculum đang hoạt động thành công, nhưng không lấy được ID bản nháp. Bạn vẫn có thể chỉnh sửa và công bố từ màn hình hiện tại.",
                    { variant: "warning" }
                );
            }
            const draftCurriculum = newDraftId
                ? { ...base, id: newDraftId, curriculumStatus: "CUR_DRAFT" }
                : { ...base, id: base.id, curriculumStatus: "CUR_DRAFT" };
            handleOpenEdit(draftCurriculum);
            setCurriculumToEditAfterConfirm(null);
        } catch (err) {
            console.error("Evolve curriculum error:", err);
            enqueueSnackbar(err?.response?.data?.message || "Lỗi khi tạo bản nháp từ curriculum đang hoạt động.", { variant: "error" });
        } finally {
            setEvolveLoading(false);
            setConfirmEvolveOpen(false);
        }
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

    const handlePublishFromView = async () => {
        if (!isPrimaryBranch) return;
        if (!viewCurriculum) return;
        if (publishLoading) return;

        const statusKey = normalizeStatus(viewCurriculum?.curriculumStatus);
        if (statusKey !== "CUR_DRAFT") return;

        setPublishLoading(true);
        try {
            const actRes = await activateCurriculum(viewCurriculum.id);
            enqueueSnackbar(actRes?.data?.message || "Curriculum đã được công bố", { variant: "success" });
            setViewModalOpen(false);
            setViewCurriculum(null);
            await loadData(page, rowsPerPage);
        } catch (err) {
            console.error("Publish curriculum error:", err);
            enqueueSnackbar(err?.response?.data?.message || "Lỗi khi công bố curriculum", { variant: "error" });
        } finally {
            setPublishLoading(false);
        }
    };

    const handleCreateSubmit = async (shouldActivate) => {
        if (!isPrimaryBranch) return;
        if (!validateForm()) return;
        setSubmitLoading(true);
        try {
            const payload = getCreatePayload();
            const draftRes = await saveCurriculum(payload);
            const newDraftId = extractCurriculumIdFromResponse(draftRes);

            if (!shouldActivate) {
                enqueueSnackbar(draftRes?.data?.message || "Tạo bản nháp curriculum thành công", { variant: "success" });
            } else if (newDraftId) {
                const actRes = await activateCurriculum(newDraftId);
                enqueueSnackbar(actRes?.data?.message || "Curriculum đã được công bố", { variant: "success" });
            } else {
                enqueueSnackbar(
                    draftRes?.data?.message ||
                        "Đã tạo bản nháp thành công, nhưng không lấy được ID để công bố tự động. Vui lòng mở bản nháp và bấm 'Công bố' lại.",
                    { variant: "warning" }
                );
            }

            setCreateModalOpen(false);
            setFormErrors({});
            setPage(0);
            await loadData(0, rowsPerPage);
        } catch (err) {
            console.error("Create curriculum error:", err);
            enqueueSnackbar(err?.response?.data?.message || "Lỗi khi tạo curriculum", { variant: "error" });
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEditSubmit = async (shouldActivate) => {
        if (!isPrimaryBranch) return;
        if (!selectedCurriculum) return;
        if (!validateForm()) return;
        setSubmitLoading(true);
        try {
            const payload = getUpdatePayload();
            const draftRes = await saveCurriculum(payload);

            if (!shouldActivate) {
                enqueueSnackbar(draftRes?.data?.message || "Cập nhật bản nháp thành công", { variant: "success" });
                setEditModalOpen(false);
                setFormErrors({});
                setSelectedCurriculum(null);
                await loadData(page, rowsPerPage);
                return;
            }

            const isActive = isActiveStatus(selectedCurriculum?.curriculumStatus);
            const newDraftId = extractCurriculumIdFromResponse(draftRes);
            const activateId = isActive ? newDraftId || selectedCurriculum.id : selectedCurriculum.id;

            if (activateId) {
                const actRes = await activateCurriculum(activateId);
                enqueueSnackbar(actRes?.data?.message || "Curriculum đã được công bố", { variant: "success" });
            } else {
                enqueueSnackbar(
                    draftRes?.data?.message || "Đã lưu bản nháp nhưng không thể công bố tự động (thiếu ID).",
                    { variant: "warning" }
                );
            }

            setEditModalOpen(false);
            setFormErrors({});
            setSelectedCurriculum(null);
            await loadData(page, rowsPerPage);
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

    const tableColSpan = isPrimaryBranch ? 7 : 6;

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
                            {isPrimaryBranch
                                ? "Tạo mới, cập nhật và quản lý trạng thái công bố của các chương trình học."
                                : "Xem chương trình học của trường (cơ sở phụ không được tạo/sửa/công bố)."}
                        </Typography>
                    </Box>

                    {isPrimaryBranch && (
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
                    )}
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
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>Loại chương trình</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>Phương pháp học</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>Năm tuyển sinh</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>Số chương trình</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>Trạng thái</TableCell>
                                {isPrimaryBranch && (
                                    <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }} align="right">
                                        Thao tác
                                    </TableCell>
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton variant="text" width="60%" /></TableCell>
                                        <TableCell><Skeleton variant="text" width="40%" /></TableCell>
                                        <TableCell><Skeleton variant="text" width="50%" /></TableCell>
                                        <TableCell><Skeleton variant="text" width={60} /></TableCell>
                                        <TableCell><Skeleton variant="text" width={40} /></TableCell>
                                        <TableCell><Skeleton variant="rounded" width={90} height={24} /></TableCell>
                                        {isPrimaryBranch && (
                                            <TableCell align="right">
                                                <Skeleton variant="rounded" width={80} height={32} />
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            ) : paginatedCurriculums.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={tableColSpan} align="center" sx={{ py: 8 }}>
                                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
                                            <SchoolIcon sx={{ fontSize: 56, color: "#cbd5e1" }} />
                                            <Typography variant="h6" sx={{ color: "#64748b", fontWeight: 700 }}>
                                                Chưa có chương trình
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: "#94a3b8", maxWidth: 420 }}>
                                                {filteredCurriculums.length === 0 && curriculums.length > 0
                                                    ? "Không có kết quả phù hợp với tìm kiếm hoặc bộ lọc."
                                                    : curriculums.length === 0 && isPrimaryBranch
                                                      ? "Chưa có chương trình nào. Hãy tạo chương trình đầu tiên để bắt đầu."
                                                      : "Chưa có chương trình nào."}
                                            </Typography>
                                            {curriculums.length === 0 && isPrimaryBranch && (
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
                                        onClick={() => handleOpenView(row)}
                                        sx={{
                                            cursor: "pointer",
                                            "&:hover": { bgcolor: "rgba(122, 169, 235, 0.06)" },
                                        }}
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
                                        {isPrimaryBranch && (
                                            <TableCell align="right">
                                                <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenView(row);
                                                        }}
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
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditClick(row);
                                                        }}
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
                                        )}
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
                onClose={() => {
                    if (evolveLoading) return;
                    setConfirmEvolveOpen(false);
                    setCurriculumToEditAfterConfirm(null);
                }}
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
                    <Button
                        onClick={() => {
                            if (evolveLoading) return;
                            setConfirmEvolveOpen(false);
                            setCurriculumToEditAfterConfirm(null);
                        }}
                        disabled={evolveLoading}
                        sx={{ textTransform: "none" }}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirmEvolve}
                        disabled={evolveLoading}
                        sx={{ textTransform: "none", borderRadius: 2 }}
                    >
                        {evolveLoading ? "Đang tạo..." : "Tiếp tục"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Curriculum Dialog */}
            <Dialog
                open={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
                slotProps={{ backdrop: { sx: modalBackdropSx } }}
            >
                <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
                    {viewCurriculum && (() => {
                        return (
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
                                <Box>
                                    <Typography sx={{ fontWeight: 900, color: "#1e293b", fontSize: 22, lineHeight: 1.2 }}>
                                        Chi tiết chương trình
                                    </Typography>
                                </Box>

                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                                    <IconButton
                                        size="small"
                                        onClick={() => setViewModalOpen(false)}
                                        sx={{
                                            bgcolor: "#f1f5f9",
                                            "&:hover": { bgcolor: "#e2e8f0", boxShadow: "0 8px 16px rgba(2, 6, 23, 0.06)" },
                                        }}
                                    >
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Box>
                        );
                    })()}
                </DialogTitle>

                <DialogContent
                    dividers={false}
                    sx={{
                        px: 3,
                        py: 2.5,
                        maxHeight: "calc(100vh - 220px)",
                        overflow: "auto",
                        scrollBehavior: "smooth",
                    }}
                >
                    {viewCurriculum && (() => {
                        const statusKey = normalizeStatus(viewCurriculum.curriculumStatus);
                        const statusLabel = statusKey === "CUR_DRAFT" ? "Bản nháp" : statusKey === "CUR_ACTIVE" ? "Hoạt động" : "Lưu trữ";

                        return (
                            <Stack spacing={2.5}>
                                {!isPrimaryBranch ? (
                                    <Alert severity="info" sx={{ py: 0.75 }}>
                                        Cơ sở phụ chỉ xem được thông tin. Tạo, chỉnh sửa và công bố chỉ thực hiện tại cơ sở chính.
                                    </Alert>
                                ) : null}
                                {/* Hero section */}
                                <Box
                                    sx={{
                                        borderRadius: 3,
                                        bgcolor: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(51,65,85,0.03) 100%)",
                                        border: "1px solid rgba(148, 163, 184, 0.35)",
                                        p: 3,
                                    }}
                                >
                                    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3, flexWrap: "wrap" }}>
                                        <Box sx={{ minWidth: 260 }}>
                                            <Typography sx={{ fontWeight: 950, color: "#1e293b", fontSize: 24, lineHeight: 1.25 }}>
                                                {viewCurriculum.name || viewCurriculum.subTypeName}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: "#64748b", mt: 1.1, lineHeight: 1.6, maxWidth: 620 }}>
                                                {viewCurriculum.description || "—"}
                                            </Typography>
                                        </Box>

                                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1.2 }}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                <Box
                                                    sx={{
                                                        px: 1.6,
                                                        py: 0.7,
                                                        borderRadius: 999,
                                                        bgcolor:
                                                            statusKey === "CUR_DRAFT"
                                                                ? "rgba(245, 158, 11, 0.16)"
                                                                : statusKey === "CUR_ACTIVE"
                                                                    ? "rgba(37, 99, 235, 0.14)"
                                                                    : "rgba(100, 116, 139, 0.16)",
                                                        color:
                                                            statusKey === "CUR_DRAFT"
                                                                ? "#d97706"
                                                                : statusKey === "CUR_ACTIVE"
                                                                    ? "#2563eb"
                                                                    : "#475569",
                                                        fontWeight: 900,
                                                        fontSize: 12,
                                                        border: "1px solid rgba(148, 163, 184, 0.35)",
                                                    }}
                                                >
                                                    {statusLabel}
                                                </Box>
                                            </Box>

                                            <Typography variant="caption" sx={{ color: "#64748b" }}>
                                                {viewCurriculum.versionDisplay ? `${viewCurriculum.versionDisplay}` : "Phiên bản: —"}
                                                {viewCurriculum.isLatest ? " • Mới nhất" : ""}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Detail section */}
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                                        gap: 2,
                                    }}
                                >
                                    {[
                                        {
                                            label: "Mã nhóm",
                                            value: viewCurriculum.groupCode || "—",
                                        },
                                        {
                                            label: "Loại chương trình",
                                            value: toCurriculumTypeLabel(viewCurriculum.curriculumType),
                                        },
                                        {
                                            label: "Phương pháp học",
                                            value: toMethodLearningLabel(viewCurriculum.methodLearning),
                                        },
                                        {
                                            label: "Năm tuyển sinh",
                                            value: viewCurriculum.enrollmentYear ?? "—",
                                        },
                                    ].map((item, idx) => (
                                        <Box
                                            key={`${item.label}-${idx}`}
                                            sx={{
                                                border: "1px solid rgba(226, 232, 240, 1)",
                                                borderRadius: 3,
                                                bgcolor: "#ffffff",
                                                px: 2.2,
                                                py: 1.6,
                                                transition: "box-shadow 180ms ease, border-color 180ms ease",
                                                "&:hover": {
                                                    boxShadow: "0 14px 30px rgba(2, 6, 23, 0.08)",
                                                    borderColor: "rgba(148, 163, 184, 0.8)",
                                                },
                                            }}
                                        >
                                            <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.7 }}>
                                                {item.label}
                                            </Typography>
                                            <Typography sx={{ fontWeight: 800, color: "#1e293b" }}>{item.value}</Typography>
                                        </Box>
                                    ))}
                                </Box>

                                {/* Description card */}
                                <Card
                                    elevation={0}
                                    sx={{
                                        bgcolor: "#f8fafc",
                                        border: "1px solid rgba(226, 232, 240, 1)",
                                        borderRadius: 3,
                                    }}
                                >
                                    <CardContent sx={{ p: 2.7 }}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.1, mb: 1 }}>
                                            <Box
                                                sx={{
                                                    width: 34,
                                                    height: 34,
                                                    borderRadius: 2,
                                                    bgcolor: "rgba(13, 100, 222, 0.10)",
                                                    color: "#0D64DE",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                }}
                                            >
                                                <DescriptionIcon sx={{ fontSize: 18 }} />
                                            </Box>
                                            <Typography sx={{ fontWeight: 900, color: "#1e293b" }}>Mô tả</Typography>
                                        </Box>
                                        <Typography sx={{ color: "#374151", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                                            {viewCurriculum.description || "—"}
                                        </Typography>
                                    </CardContent>
                                </Card>

                                {/* Subjects */}
                                <Card
                                    elevation={0}
                                    sx={{
                                        bgcolor: "#ffffff",
                                        border: "1px solid rgba(226, 232, 240, 1)",
                                        borderRadius: 3,
                                    }}
                                >
                                    <CardContent sx={{ p: 2.5 }}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.4 }}>
                                            <MenuBookIcon sx={{ fontSize: 18, color: "#0D64DE" }} />
                                            <Typography sx={{ fontWeight: 950, color: "#1e293b", fontSize: 16 }}>Môn học</Typography>
                                        </Box>

                                        <Stack spacing={1.2}>
                                            {(viewCurriculum.subjects || []).map((s, idx) => (
                                                <Box
                                                    key={`${s.name}-${idx}`}
                                                    sx={{
                                                        border: "1px solid rgba(226, 232, 240, 1)",
                                                        borderRadius: 3,
                                                        bgcolor: "#ffffff",
                                                        px: 1.8,
                                                        py: 1.4,
                                                        transition:
                                                            "box-shadow 180ms ease, border-color 180ms ease, transform 180ms ease",
                                                        "&:hover": {
                                                            boxShadow: "0 16px 34px rgba(2, 6, 23, 0.08)",
                                                            borderColor: "rgba(148, 163, 184, 0.85)",
                                                            transform: "translateY(-1px)",
                                                        },
                                                    }}
                                                >
                                                    <Stack
                                                        direction="row"
                                                        justifyContent="space-between"
                                                        alignItems="center"
                                                        spacing={2}
                                                    >
                                                        <Typography sx={{ fontWeight: 850, color: "#1e293b" }}>{s.name}</Typography>
                                                        <Box
                                                            sx={{
                                                                px: 1.2,
                                                                py: 0.55,
                                                                borderRadius: 999,
                                                                fontSize: 12,
                                                                fontWeight: 900,
                                                                border: "1px solid rgba(226, 232, 240, 1)",
                                                                bgcolor: s.isMandatory
                                                                    ? "rgba(34, 197, 94, 0.14)"
                                                                    : "rgba(148, 163, 184, 0.18)",
                                                                color: s.isMandatory ? "#16a34a" : "#64748b",
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                gap: 0.6,
                                                                whiteSpace: "nowrap",
                                                            }}
                                                        >
                                                            {s.isMandatory ? (
                                                                <>
                                                                    <DoneAllIcon fontSize="small" sx={{ color: "#16a34a" }} />
                                                                    Bắt buộc
                                                                </>
                                                            ) : (
                                                                "Không bắt buộc"
                                                            )}
                                                        </Box>
                                                    </Stack>
                                                    <Typography sx={{ color: "#64748b", mt: 1, lineHeight: 1.6 }}>
                                                        {s.description || "—"}
                                                    </Typography>
                                                </Box>
                                            ))}
                                            {(viewCurriculum.subjects || []).length === 0 && (
                                                <Typography variant="body2" sx={{ color: "#94a3b8", px: 0.5 }}>
                                                    Chưa có môn học.
                                                </Typography>
                                            )}
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Stack>
                        );
                    })()}
                </DialogContent>

                <DialogActions
                    sx={{
                        px: 3,
                        py: 2,
                        borderTop: "1px solid #e2e8f0",
                        position: "sticky",
                        bottom: 0,
                        backgroundColor: "white",
                        zIndex: 1,
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 1,
                    }}
                >
                    {isPrimaryBranch && normalizeStatus(viewCurriculum?.curriculumStatus) === "CUR_DRAFT" && (
                        <Button
                            onClick={handlePublishFromView}
                            variant="contained"
                            disabled={publishLoading}
                            sx={{
                                textTransform: "none",
                                fontWeight: 900,
                                borderRadius: 2,
                                px: 3,
                                background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                            }}
                        >
                            {publishLoading ? "Đang công bố..." : "Công bố"}
                        </Button>
                    )}
                    <Button onClick={() => setViewModalOpen(false)} sx={{ textTransform: "none", fontWeight: 700, color: "#475569" }}>
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
                </DialogActions>
            </Dialog>
        </Box>
    );
}

