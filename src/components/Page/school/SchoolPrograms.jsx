import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    MenuItem,
    Skeleton,
    Stack,
    Step,
    StepLabel,
    Stepper,
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
import Divider from "@mui/material/Divider";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import SchoolIcon from "@mui/icons-material/School";
import SearchIcon from "@mui/icons-material/Search";
import VerifiedIcon from "@mui/icons-material/Verified";

import { enqueueSnackbar } from "notistack";

import { useSchool } from "../../../contexts/SchoolContext.jsx";
import { getCurriculumList } from "../../../services/CurriculumService.jsx";
import { getProgramList, saveProgram } from "../../../services/ProgramService.jsx";

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

const PROGRAM_STATUS_OPTIONS = [
    { value: "all", label: "Tất cả" },
    { value: "PRO_ACTIVE", label: "Hoạt động" },
    { value: "PRO_INACTIVE", label: "Không hoạt động" },
];

const CURRICULUM_TYPE_OPTIONS = ["INTEGRATED", "NATIONAL", "INTERNATIONAL"];

const curriculumTypeI18N = {
    NATIONAL: "Quốc gia",
    INTERNATIONAL: "Quốc tế",
    INTEGRATED: "Tích hợp",
};

const normalizeStatus = (status) => String(status || "").toUpperCase();

const toCurriculumTypeLabel = (value) => curriculumTypeI18N[value] ?? value ?? "—";

const formatVND = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    try {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0,
        }).format(n);
    } catch {
        return `${Math.trunc(n).toLocaleString("vi-VN")} VND`;
    }
};

/** Đồng bộ với SchoolCurriculums: subTypeName dùng cho form/API không được chứa tiền tố "Hệ " lặp. */
function stripLeadingHePrefix(value) {
    let s = String(value ?? "").trim();
    while (s.length > 0) {
        const m = s.match(/^Hệ\s+/u);
        if (!m) break;
        s = s.slice(m[0].length).trim();
    }
    return s;
}

function mapSubTypeNameForProgramSelect(item) {
    const raw = item?.subTypeName;
    if (raw != null && String(raw).trim() !== "") {
        return stripLeadingHePrefix(raw);
    }
    return item?.name ?? "";
}

function mapCurriculumForProgramSelect(item) {
    if (!item) return null;
    return {
        id: item.id,
        subTypeName: mapSubTypeNameForProgramSelect(item),
        curriculumType: item.curriculumType,
        enrollmentYear: item.enrollmentYear,
        curriculumStatus: item.curriculumStatus,
        isLatest: !!item.isLatest,
        versionDisplay: item.versionDisplay,
        subjects: Array.isArray(item.subjects)
            ? item.subjects.map((s) => ({
                  name: s.name ?? "",
                  description: s.description ?? "",
                  isMandatory: !!s.isMandatory,
              }))
            : [],
    };
}

const MAX_TEXT_FIELD_LEN = 2000;

function tuitionFeeToDigitString(value) {
    if (value === "" || value == null) return "";
    const n = Math.trunc(Number(value));
    if (!Number.isFinite(n) || n < 0) return "";
    return String(n);
}

function mapProgramFromApi(item) {
    if (!item) return null;
    const rawStatus = normalizeStatus(item.isActive);
    const programStatus = normalizeStatus(item.programStatus);
    const isActiveBool =
        typeof item.isActive === "boolean"
            ? item.isActive
            : programStatus === "PRO_ACTIVE" ||
              rawStatus === "PRO_ACTIVE" ||
              rawStatus === "ACTIVE" ||
              rawStatus === "TRUE";

    return {
        id: item.id,
        curriculumId:
            item.curriculumId ??
            item.curriculumID ??
            item.curriculum_id ??
            item.programCurriculumId ??
            item.program_curriculum_id ??
            item.programCurriculumID ??
            item.curriculum?.id ??
            item.curriculum?.Id ??
            null,
        curriculumName: item.curriculumName ?? item.curriculum ?? "",
        enrollmentYear: item.enrollmentYear ?? "",
        curriculumType: item.curriculumType ?? "",
        curriculumStatus: item.curriculumStatus ?? "",
        programStatus: item.programStatus ?? "",
        baseTuitionFee: Number(item.baseTuitionFee ?? 0),
        targetStudentDescription: item.targetStudentDescription ?? "",
        graduationStandard: item.graduationStandard ?? "",
        offeringCount: Number(item.offeringCount ?? 0),
        effectiveOfferingCount: Number(item.effectiveOfferingCount ?? 0),
        schoolId: item.schoolId ?? null,
        isActiveRaw: item.isActive,
        isActiveBool,
        createdAt:
            item.createdAt ??
            item.created_at ??
            item.createdTime ??
            item.created_time ??
            item.created_date ??
            null,
    };
}

function toEpoch(value) {
    if (!value) return null;
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
}

function getProgramStatusMeta(isActiveBool) {
    if (isActiveBool) {
        return { label: "Hoạt động", bg: "rgba(34, 197, 94, 0.12)", color: "#16a34a" };
    }
    return { label: "Không hoạt động", bg: "rgba(148, 163, 184, 0.2)", color: "#64748b" };
}

function ProgramStatusBadge({ isActiveBool }) {
    const meta = getProgramStatusMeta(isActiveBool);
    return (
        <Box
            component="span"
            sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                bgcolor: meta.bg,
                color: meta.color,
            }}
        >
            {meta.label}
        </Box>
    );
}

function safeString(v) {
    return String(v ?? "");
}

export default function SchoolPrograms() {
    const { isPrimaryBranch } = useSchool();
    const [loading, setLoading] = useState(true);
    const [programs, setPrograms] = useState([]);
    const [totalItems, setTotalItems] = useState(0);

    const [page, setPage] = useState(0);
    const rowsPerPage = 10;

    const [search, setSearch] = useState("");
    const [enrollmentYearFilter, setEnrollmentYearFilter] = useState("all");
    const [curriculumTypeFilter, setCurriculumTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    // Modal
    const [programModalOpen, setProgramModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create"); // 'create' | 'edit' | 'view'
    const [activeStep, setActiveStep] = useState(0);

    const [submitLoading, setSubmitLoading] = useState(false);

    const [selectedProgram, setSelectedProgram] = useState(null);
    const [originalCurriculumId, setOriginalCurriculumId] = useState(null);

    const [disableCurriculumSelection, setDisableCurriculumSelection] = useState(false);
    const [curriculumSelectionWarning, setCurriculumSelectionWarning] = useState("");

    const [curriculumOptionsLoading, setCurriculumOptionsLoading] = useState(false);
    const [curriculumOptions, setCurriculumOptions] = useState([]);
    const [selectedCurriculum, setSelectedCurriculum] = useState(null);

    const [formErrors, setFormErrors] = useState({});
    const [formValues, setFormValues] = useState({
        baseTuitionFee: "",
        graduationStandard: "",
        targetStudentDescription: "",
        isActive: true,
    });

    const enrollmentYearOptions = useMemo(() => {
        const set = new Set(programs.map((p) => p.enrollmentYear).filter((y) => y !== null && y !== undefined && y !== ""));
        return Array.from(set)
            .map((y) => Number(y))
            .filter((y) => Number.isFinite(y))
            .sort((a, b) => a - b);
    }, [programs]);

    const curriculumTypeOptions = useMemo(() => {
        const set = new Set(programs.map((p) => p.curriculumType).filter(Boolean));
        return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
    }, [programs]);

    const filteredPrograms = useMemo(() => {
        let list = programs;
        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter((p) => safeString(p.curriculumName).toLowerCase().includes(q));
        }
        if (enrollmentYearFilter !== "all") {
            const y = Number(enrollmentYearFilter);
            list = list.filter((p) => Number(p.enrollmentYear) === y);
        }
        if (curriculumTypeFilter !== "all") {
            list = list.filter((p) => p.curriculumType === curriculumTypeFilter);
        }
        if (statusFilter !== "all") {
            const wantActive = statusFilter === "PRO_ACTIVE";
            list = list.filter((p) => p.isActiveBool === wantActive);
        }
        return list;
    }, [programs, search, enrollmentYearFilter, curriculumTypeFilter, statusFilter]);

    const tableColSpan = isPrimaryBranch ? 6 : 5;

    const loadData = async (pageParam = page, pageSizeParam = rowsPerPage) => {
        setLoading(true);
        try {
            const res = await getProgramList(pageParam, pageSizeParam);
            const raw = res?.data?.body ?? res?.data ?? res;
            const items = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];
            const mapped = items.map(mapProgramFromApi).filter(Boolean);
            mapped.sort((a, b) => {
                const da = toEpoch(a.createdAt);
                const db = toEpoch(b.createdAt);
                if (da !== null || db !== null) {
                    // "Tạo sau cùng" = createdAt lớn hơn lên đầu
                    if (da === null) return 1;
                    if (db === null) return -1;
                    if (db !== da) return db - da;
                }
                // Fallback: dùng id giảm dần
                return Number(b.id) - Number(a.id);
            });
            setPrograms(mapped);

            const total = Number(raw?.totalItems ?? raw?.total ?? (Array.isArray(raw?.items) ? raw.items.length : mapped.length));
            setTotalItems(Number.isFinite(total) ? total : 0);
        } catch (err) {
            console.error("Fetch programs error:", err);
            setPrograms([]);
            setTotalItems(0);
            enqueueSnackbar(err?.response?.data?.message || "Không tải được danh sách program", { variant: "error" });
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const ensureCurriculumOptionsLoaded = async () => {
        if (curriculumOptions.length > 0 || curriculumOptionsLoading) return;
        setCurriculumOptionsLoading(true);
        try {
            // Fetch a large set because Step 1 needs search/select by curriculum
            const res = await getCurriculumList(0, 1000);
            const raw = res?.data?.body ?? res?.data ?? res;
            const items = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];

            const mapped = items.map(mapCurriculumForProgramSelect).filter(Boolean);

            const active = mapped.filter((c) => normalizeStatus(c.curriculumStatus) === "CUR_ACTIVE");

            // Put latest first
            active.sort((a, b) => Number(b.isLatest) - Number(a.isLatest));

            setCurriculumOptions(active);
        } catch (err) {
            console.error("Fetch curriculum options error:", err);
            enqueueSnackbar(err?.response?.data?.message || "Không tải được curriculum để tạo program", { variant: "error" });
            setCurriculumOptions([]);
        } finally {
            setCurriculumOptionsLoading(false);
        }
    };

    const pickCurriculumForEdit = (program) => {
        if (!program) return null;
        if (program.curriculumId) {
            const found = curriculumOptions.find((c) => c.id === program.curriculumId);
            if (found) return found;
        }
        // Fallback by name + year
        const name = safeString(program.curriculumName).trim().toLowerCase();
        const year = Number(program.enrollmentYear);
        if (!name && !Number.isFinite(year)) return null;
        return (
            curriculumOptions.find((c) => safeString(c.subTypeName).trim().toLowerCase() === name && Number(c.enrollmentYear) === year) ||
            curriculumOptions.find((c) => safeString(c.subTypeName).trim().toLowerCase() === name)
        );
    };

    useEffect(() => {
        if (!programModalOpen) return;
        if (modalMode !== "edit") return;
        if (!selectedProgram) return;
        if (selectedCurriculum) return;

        if (curriculumOptions.length === 0 && !curriculumOptionsLoading) return;
        if (curriculumOptionsLoading) return;

        const found = pickCurriculumForEdit(selectedProgram);
        if (found) setSelectedCurriculum(found);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [programModalOpen, modalMode, selectedProgram, curriculumOptions, curriculumOptionsLoading]);

    const handleOpenCreate = async () => {
        if (!isPrimaryBranch) return;
        setModalMode("create");
        setActiveStep(0);
        setSelectedProgram(null);
        setOriginalCurriculumId(null);
        setDisableCurriculumSelection(false);
        setCurriculumSelectionWarning("");
        setSelectedCurriculum(null);
        setFormErrors({});
        setFormValues({
            baseTuitionFee: "",
            graduationStandard: "",
            targetStudentDescription: "",
            isActive: true,
        });
        setProgramModalOpen(true);
        await ensureCurriculumOptionsLoaded();
    };

    const handleOpenEdit = async (program) => {
        if (!isPrimaryBranch) return;
        setModalMode("edit");
        setActiveStep(0);
        setSelectedProgram(program);
        setOriginalCurriculumId(program.curriculumId ?? null);
        const hasOfferingHistory = Number(program.offeringCount) > 0;
        setDisableCurriculumSelection(hasOfferingHistory);
        setCurriculumSelectionWarning(
            hasOfferingHistory
                ? "Chương trình đã có lịch sử tuyển sinh (offering). Không thể thay đổi khung chương trình (Curriculum)."
                : ""
        );
        setSelectedCurriculum(null);
        setFormErrors({});
        setFormValues({
            baseTuitionFee: tuitionFeeToDigitString(program.baseTuitionFee),
            graduationStandard: program.graduationStandard ?? "",
            targetStudentDescription: program.targetStudentDescription ?? "",
            isActive: !!program.isActiveBool,
        });
        setProgramModalOpen(true);
        await ensureCurriculumOptionsLoaded();
        // selection will be picked by useEffect after options load
    };

    const handleOpenView = (program) => {
        setModalMode("view");
        setActiveStep(0);
        setSelectedProgram(program);
        setOriginalCurriculumId(null);
        setDisableCurriculumSelection(false);
        setCurriculumSelectionWarning("");
        setSelectedCurriculum(null);
        setFormErrors({});
        setFormValues({
            baseTuitionFee: tuitionFeeToDigitString(program.baseTuitionFee),
            graduationStandard: program.graduationStandard ?? "",
            targetStudentDescription: program.targetStudentDescription ?? "",
            isActive: !!program.isActiveBool,
        });
        setProgramModalOpen(true);
    };

    const handleCloseProgramModal = () => {
        if (submitLoading) return;
        setProgramModalOpen(false);
        setActiveStep(0);
        setSelectedProgram(null);
        setOriginalCurriculumId(null);
        setDisableCurriculumSelection(false);
        setCurriculumSelectionWarning("");
        setSelectedCurriculum(null);
        setFormErrors({});
        setFormValues({
            baseTuitionFee: "",
            graduationStandard: "",
            targetStudentDescription: "",
            isActive: true,
        });
    };

    const effectiveCurriculumId = disableCurriculumSelection && originalCurriculumId ? originalCurriculumId : selectedCurriculum?.id;

    const validateStep1 = () => {
        const errors = {};
        if (!effectiveCurriculumId) errors.curriculumId = "Vui lòng chọn khung chương trình.";
        setFormErrors((prev) => ({ ...prev, ...errors }));
        return Object.keys(errors).length === 0;
    };

    const validateStep2 = () => {
        const errors = {};
        const feeDigits = safeString(formValues.baseTuitionFee).replace(/\D/g, "");
        const fee = feeDigits === "" ? NaN : Number(feeDigits);
        if (feeDigits === "" || !Number.isFinite(fee)) errors.baseTuitionFee = "Học phí gốc là bắt buộc.";
        else if (fee < 0) errors.baseTuitionFee = "Học phí gốc phải ≥ 0.";
        const gs = safeString(formValues.graduationStandard).trim();
        if (!gs) errors.graduationStandard = "Tiêu chuẩn đầu ra là bắt buộc.";
        else if (gs.length > MAX_TEXT_FIELD_LEN)
            errors.graduationStandard = `Tối đa ${MAX_TEXT_FIELD_LEN} ký tự.`;
        const td = safeString(formValues.targetStudentDescription).trim();
        if (!td) errors.targetStudentDescription = "Đối tượng học sinh là bắt buộc.";
        else if (td.length > MAX_TEXT_FIELD_LEN)
            errors.targetStudentDescription = `Tối đa ${MAX_TEXT_FIELD_LEN} ký tự.`;
        setFormErrors((prev) => ({ ...prev, ...errors }));
        return Object.keys(errors).length === 0;
    };

    const handleNext = () => {
        if (activeStep === 0) {
            if (!validateStep1()) return;
        }
        if (activeStep === 1) {
            if (!validateStep2()) return;
        }
        setActiveStep((s) => Math.min(2, s + 1));
        setFormErrors({});
    };

    const handleBack = () => setActiveStep((s) => Math.max(0, s - 1));

    const buildPayload = (curriculumIdOverride) => {
        const curriculumId = curriculumIdOverride ?? effectiveCurriculumId;
        const feeDigits = safeString(formValues.baseTuitionFee).replace(/\D/g, "");
        const payload = {
            curriculumId,
            graduationStandard: safeString(formValues.graduationStandard).trim(),
            targetStudentDescription: safeString(formValues.targetStudentDescription).trim(),
            baseTuitionFee: feeDigits === "" ? 0 : Number(feeDigits),
            isActive: !!formValues.isActive,
        };
        if (modalMode === "edit" && selectedProgram?.id != null) {
            const pid = Number(selectedProgram.id);
            if (Number.isFinite(pid) && pid > 0) {
                payload.programId = pid;
            }
        }
        return payload;
    };

    const handleSubmit = async () => {
        if (submitLoading) return;
        if (!isPrimaryBranch) return;

        // Validate before submit always
        if (activeStep === 0) {
            if (!validateStep1()) return;
        }
        if (activeStep >= 1) {
            if (!validateStep2()) return;
        }

        const curriculumId = effectiveCurriculumId;
        if (!curriculumId) {
            enqueueSnackbar("Bạn cần chọn khung chương trình.", { variant: "error" });
            return;
        }

        setSubmitLoading(true);
        try {
            const payload = buildPayload(curriculumId);
            const res = await saveProgram(payload);
            const ok = res?.status >= 200 && res?.status < 300;
            if (ok || res?.data?.message) {
                enqueueSnackbar(res?.data?.message || "Tạo/cập nhật program thành công", { variant: "success" });
                setProgramModalOpen(false);
                setFormErrors({});
                setActiveStep(0);
                setSelectedProgram(null);
                setSelectedCurriculum(null);
                setDisableCurriculumSelection(false);
                setCurriculumSelectionWarning("");
                setPage(0);
                await loadData(0, rowsPerPage);
                return;
            }

            enqueueSnackbar(res?.data?.message || "Lỗi khi lưu program", { variant: "error" });
        } catch (err) {
            console.error("Submit program error:", err);
            const status = err?.response?.status;
            let backendMsg = err?.response?.data?.message;
            if (!backendMsg) {
                if (status === 400) backendMsg = "Dữ liệu không hợp lệ. Vui lòng kiểm tra các trường hoặc Curriculum chưa Active.";
                else if (status === 403)
                    backendMsg = "Không có quyền (chỉ cơ sở chính mới thực hiện được, hoặc tài khoản bị hạn chế).";
                else if (status === 404) backendMsg = "Không tìm thấy Program hoặc Curriculum trong phạm vi trường.";
                else if (status === 409) backendMsg = "Trùng tiêu chuẩn đầu ra trong cùng một Curriculum.";
                else backendMsg = "Lỗi khi lưu program";
            }
            const normalized = String(backendMsg || "").toLowerCase();

            const cannotChange =
                normalized.includes("cannot change curriculum") || normalized.includes("cannot change curriculum because");

            if (cannotChange) {
                setDisableCurriculumSelection(true);
                setCurriculumSelectionWarning(
                    "Chương trình này đã có lớp học, bạn không thể thay đổi Khung chương trình (Curriculum) nhưng vẫn có thể sửa Học phí và Tiêu chuẩn đầu ra."
                );
                enqueueSnackbar(backendMsg, { variant: "error" });

                if (originalCurriculumId) {
                    const originalCur = curriculumOptions.find((c) => c.id === originalCurriculumId);
                    if (originalCur) setSelectedCurriculum(originalCur);
                }
                return;
            }

            enqueueSnackbar(backendMsg, { variant: "error" });
        } finally {
            setSubmitLoading(false);
        }
    };

    const currencyInputAdornment = (
        <InputAdornment position="start" sx={{ fontWeight: 800, color: "#64748b" }}>
            VND
        </InputAdornment>
    );

    const curriculumPreview = disableCurriculumSelection
        ? (originalCurriculumId ? curriculumOptions.find((c) => c.id === originalCurriculumId) : selectedCurriculum)
        : selectedCurriculum;

    const lockActiveSwitch =
        modalMode === "edit" && selectedProgram != null && Number(selectedProgram.effectiveOfferingCount) > 0;

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
                        <Typography variant="h4" sx={{ fontWeight: 850, letterSpacing: "-0.02em", textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                            Quản lý Program
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.95 }}>
                            {isPrimaryBranch
                                ? "Tạo mới, cập nhật và bật/tắt trạng thái các program."
                                : "Xem danh sách program của trường (cơ sở phụ không được tạo/sửa)."}
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
                                fontWeight: 800,
                                px: 3,
                                py: 1.5,
                                boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                                "&:hover": { bgcolor: "white", boxShadow: "0 6px 20px rgba(0,0,0,0.2)" },
                            }}
                        >
                            Tạo Program
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
                            placeholder="Tìm theo tên khung chương trình..."
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

                        <Box sx={{ minWidth: 180 }}>
                            <SelectLike
                                label="Năm tuyển sinh"
                                value={enrollmentYearFilter}
                                options={[
                                    { value: "all", label: "Tất cả" },
                                    ...enrollmentYearOptions.map((y) => ({ value: String(y), label: String(y) })),
                                ]}
                                onChange={(v) => {
                                    setEnrollmentYearFilter(v);
                                    setPage(0);
                                }}
                            />
                        </Box>

                        <Box sx={{ minWidth: 180 }}>
                            <SelectLike
                                label="Loại khung chương trình"
                                value={curriculumTypeFilter}
                                options={[
                                    { value: "all", label: "Tất cả" },
                                    ...(curriculumTypeOptions.length > 0 ? curriculumTypeOptions : CURRICULUM_TYPE_OPTIONS).map((t) => ({
                                        value: t,
                                        label: toCurriculumTypeLabel(t),
                                    })),
                                ]}
                                onChange={(v) => {
                                    setCurriculumTypeFilter(v);
                                    setPage(0);
                                }}
                            />
                        </Box>

                        <Box sx={{ minWidth: 180 }}>
                            <SelectLike
                                label="Trạng thái"
                                value={statusFilter}
                                options={PROGRAM_STATUS_OPTIONS}
                                onChange={(v) => {
                                    setStatusFilter(v);
                                    setPage(0);
                                }}
                            />
                        </Box>
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
                                <TableCell sx={{ fontWeight: 800, color: "#1e293b", py: 2 }}>Tên khung chương trình</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: "#1e293b", py: 2 }}>Năm tuyển sinh</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: "#1e293b", py: 2 }}>Loại khung chương trình</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: "#1e293b", py: 2 }}>Học phí gốc</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: "#1e293b", py: 2 }}>Trạng thái</TableCell>
                                {isPrimaryBranch && (
                                    <TableCell sx={{ fontWeight: 800, color: "#1e293b", py: 2 }} align="right">
                                        Thao tác
                                    </TableCell>
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell>
                                            <Skeleton variant="text" width="55%" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton variant="text" width="35%" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton variant="text" width="45%" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton variant="text" width="45%" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton variant="rounded" width={90} height={24} />
                                        </TableCell>
                                        {isPrimaryBranch && (
                                            <TableCell align="right">
                                                <Skeleton variant="rounded" width={100} height={32} />
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            ) : filteredPrograms.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={tableColSpan} align="center" sx={{ py: 8 }}>
                                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
                                            <SchoolIcon sx={{ fontSize: 56, color: "#cbd5e1" }} />
                                            <Typography variant="h6" sx={{ color: "#64748b", fontWeight: 800 }}>
                                                Chưa có program
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: "#94a3b8", maxWidth: 420 }}>
                                                {programs.length === 0
                                                    ? isPrimaryBranch
                                                        ? "Hãy tạo program đầu tiên để bắt đầu."
                                                        : "Chưa có program nào."
                                                    : "Không có kết quả phù hợp với tìm kiếm hoặc bộ lọc."}
                                            </Typography>
                                            {programs.length === 0 && isPrimaryBranch && (
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
                                                    + Tạo Program
                                                </Button>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredPrograms.map((row) => (
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
                                            <Tooltip title={row.curriculumName}>
                                                <Typography sx={{ fontWeight: 800, color: "#1e293b" }} noWrap>
                                                    {row.curriculumName || "—"}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell sx={{ color: "#64748b" }}>{row.enrollmentYear || "—"}</TableCell>
                                        <TableCell sx={{ color: "#64748b" }}>{toCurriculumTypeLabel(row.curriculumType)}</TableCell>
                                        <TableCell sx={{ color: "#64748b" }}>{formatVND(row.baseTuitionFee)}</TableCell>
                                        <TableCell>
                                            <ProgramStatusBadge isActiveBool={row.isActiveBool} />
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
                                                        title="Xem chi tiết"
                                                    >
                                                        <VisibilityIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenEdit(row);
                                                        }}
                                                        sx={{
                                                            color: "#64748b",
                                                            "&:hover": { color: "#0D64DE", bgcolor: "rgba(13, 100, 222, 0.08)" },
                                                        }}
                                                        title="Chỉnh sửa"
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

                {totalItems > 0 && !loading && (
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

            {/* Create/Edit Program Dialog */}
            <Dialog
                open={programModalOpen}
                onClose={handleCloseProgramModal}
                fullWidth
                maxWidth="md"
                PaperProps={{ sx: modalPaperSx }}
                slotProps={{ backdrop: { sx: modalBackdropSx } }}
            >
                <DialogTitle sx={{ fontWeight: 900, color: "#1e293b", px: 3, pt: 2.6, pb: 0 }}>
                    {modalMode === "create" ? "Tạo Program" : modalMode === "edit" ? "Chỉnh sửa Program" : "Chi tiết Program"}
                </DialogTitle>

                <DialogContent dividers={false} sx={{ px: 3, pt: 1.6, pb: 1 }}>
                    {modalMode === "view" && selectedProgram ? (
                        <Stack spacing={2.2} sx={{ mt: 0.5 }}>
                            {!isPrimaryBranch ? (
                                <Alert severity="info" sx={{ py: 0.75 }}>
                                    Cơ sở phụ chỉ xem được thông tin. Tạo và cập nhật program chỉ thực hiện tại cơ sở chính.
                                </Alert>
                            ) : null}
                            <Card
                                elevation={0}
                                sx={{
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 3,
                                    bgcolor: "#F8FAFC",
                                }}
                            >
                                <CardContent sx={{ p: 2.6 }}>
                                    <Stack spacing={1.5}>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                Khung chương trình
                                            </Typography>
                                            <Typography sx={{ fontWeight: 900, color: "#1e293b" }}>
                                                {selectedProgram.curriculumName || "—"}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: "#64748b" }}>
                                                {selectedProgram.enrollmentYear || "—"} • {toCurriculumTypeLabel(selectedProgram.curriculumType)}
                                            </Typography>
                                        </Box>

                                        <Divider />

                                        <Box>
                                            <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                Học phí gốc
                                            </Typography>
                                            <Typography sx={{ fontWeight: 950, color: "#1e293b" }}>{formatVND(formValues.baseTuitionFee)}</Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                Đối tượng học sinh
                                            </Typography>
                                            <Typography sx={{ color: "#334155", whiteSpace: "pre-wrap" }}>
                                                {formValues.targetStudentDescription || "—"}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                Tiêu chuẩn đầu ra
                                            </Typography>
                                            <Typography sx={{ color: "#334155", whiteSpace: "pre-wrap" }}>
                                                {formValues.graduationStandard || "—"}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                Trạng thái
                                            </Typography>
                                            <ProgramStatusBadge isActiveBool={!!formValues.isActive} />
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Stack>
                    ) : (
                        <>
                            <Stepper activeStep={activeStep} sx={{ pt: 1.5, pb: 1.8 }}>
                                <Step>
                                    <StepLabel>Chọn Curriculum</StepLabel>
                                </Step>
                                <Step>
                                    <StepLabel>Nhập thông tin</StepLabel>
                                </Step>
                                <Step>
                                    <StepLabel>Xem lại & Gửi yêu cầu</StepLabel>
                                </Step>
                            </Stepper>

                            <Stack spacing={2.2} sx={{ mt: 0.5 }}>
                        {activeStep === 0 && (
                            <>
                                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1e293b" }}>
                                    Step 1. Chọn khung chương trình (Curriculum)
                                </Typography>

                                {curriculumSelectionWarning ? (
                                    <Alert severity="warning" sx={{ py: 0.75 }}>
                                        {curriculumSelectionWarning}
                                    </Alert>
                                ) : null}

                                <Autocomplete
                                    value={selectedCurriculum}
                                    onChange={(e, newValue) => {
                                        setSelectedCurriculum(newValue);
                                        setFormErrors({});
                                    }}
                                    options={curriculumOptions}
                                    loading={curriculumOptionsLoading}
                                    getOptionLabel={(opt) =>
                                        opt ? `${opt.subTypeName} - ${opt.enrollmentYear}` : ""
                                    }
                                    isOptionEqualToValue={(a, b) => (a && b ? a.id === b.id : a === b)}
                                    disabled={disableCurriculumSelection || curriculumOptionsLoading}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Khung chương trình"
                                            placeholder="Chọn khung chương trình..."
                                            error={!!formErrors.curriculumId}
                                            helperText={formErrors.curriculumId || ""}
                                        />
                                    )}
                                    renderOption={(props, option) => (
                                        <Box component="li" {...props} key={option.id}>
                                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ width: "100%" }}>
                                                <Box>
                                                    <Typography sx={{ fontWeight: 800, color: "#1e293b" }}>
                                                        {option.subTypeName}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: "#64748b" }}>
                                                        {option.enrollmentYear} • {toCurriculumTypeLabel(option.curriculumType)}
                                                    </Typography>
                                                </Box>
                                                {option.isLatest && (
                                                    <Chip
                                                        icon={<VerifiedIcon fontSize="small" />}
                                                        label="Mới nhất"
                                                        size="small"
                                                        sx={{
                                                            bgcolor: "rgba(13, 100, 222, 0.10)",
                                                            color: "#0D64DE",
                                                            fontWeight: 900,
                                                        }}
                                                    />
                                                )}
                                            </Stack>
                                        </Box>
                                    )}
                                />

                                <Box sx={{ mt: 0.5 }}>
                                    {curriculumPreview ? (
                                        <Card
                                            elevation={0}
                                            sx={{
                                                border: "1px solid #e2e8f0",
                                                borderRadius: 3,
                                                bgcolor: "#F8FAFC",
                                            }}
                                        >
                                            <CardContent sx={{ p: 2.4 }}>
                                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
                                                    <Box>
                                                        <Typography sx={{ fontWeight: 950, color: "#1e293b" }}>
                                                            {curriculumPreview.subTypeName}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: "#64748b" }}>
                                                            {curriculumPreview.enrollmentYear} • {toCurriculumTypeLabel(curriculumPreview.curriculumType)}
                                                        </Typography>
                                                    </Box>
                                                    <Box>
                                                        {curriculumPreview.isLatest ? <Chip label="Mới nhất" sx={{ fontWeight: 900 }} /> : null}
                                                    </Box>
                                                </Stack>

                                                <Box sx={{ mt: 2 }}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#1e293b", mb: 1 }}>
                                                        Preview môn học
                                                    </Typography>
                                                    <Stack spacing={1.2}>
                                                        {(curriculumPreview.subjects || []).slice(0, 8).map((s, idx) => (
                                                            <Box
                                                                key={`${s.name}-${idx}`}
                                                                sx={{
                                                                    border: "1px solid #e2e8f0",
                                                                    borderRadius: 2,
                                                                    bgcolor: "#ffffff",
                                                                    px: 1.8,
                                                                    py: 1.2,
                                                                }}
                                                            >
                                                                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                                                                    <Typography sx={{ fontWeight: 850, color: "#1e293b" }}>{s.name || "—"}</Typography>
                                                                    {s.isMandatory ? (
                                                                        <Typography variant="caption" sx={{ color: "#16a34a", fontWeight: 900 }}>
                                                                            Bắt buộc
                                                                        </Typography>
                                                                    ) : (
                                                                        <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 900 }}>
                                                                            Không bắt buộc
                                                                        </Typography>
                                                                    )}
                                                                </Stack>
                                                                <Typography variant="body2" sx={{ color: "#64748b", mt: 0.7 }}>
                                                                    {s.description || "—"}
                                                                </Typography>
                                                            </Box>
                                                        ))}
                                                        {(curriculumPreview.subjects || []).length === 0 && (
                                                            <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                                                                Chưa có môn học.
                                                            </Typography>
                                                        )}
                                                    </Stack>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    ) : curriculumOptionsLoading ? (
                                        <Stack spacing={1.2}>
                                            <Skeleton variant="rounded" height={28} />
                                            <Skeleton variant="rounded" height={18} width="65%" />
                                            {Array.from({ length: 4 }).map((_, i) => (
                                                <Skeleton key={i} variant="rounded" height={62} />
                                            ))}
                                        </Stack>
                                    ) : (
                                        <Box
                                            sx={{
                                                border: "1px dashed #cbd5e1",
                                                borderRadius: 3,
                                                bgcolor: "#ffffff",
                                                p: 2.2,
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ color: "#64748b" }}>
                                                Chọn curriculum để xem preview môn học.
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            </>
                        )}

                        {activeStep === 1 && (
                            <>
                                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1e293b" }}>
                                    Step 2. Nhập thông tin Program
                                </Typography>

                                {curriculumSelectionWarning && (
                                    <Alert severity="warning">{curriculumSelectionWarning}</Alert>
                                )}

                                <TextField
                                    label="Học phí gốc"
                                    fullWidth
                                    value={
                                        formValues.baseTuitionFee === ""
                                            ? ""
                                            : Number(formValues.baseTuitionFee).toLocaleString("vi-VN")
                                    }
                                    onChange={(e) => {
                                        const digits = e.target.value.replace(/\D/g, "");
                                        setFormValues((prev) => ({
                                            ...prev,
                                            baseTuitionFee: digits,
                                        }));
                                        setFormErrors((prev) => ({ ...prev, baseTuitionFee: undefined }));
                                    }}
                                    inputProps={{ inputMode: "numeric", maxLength: 18 }}
                                    error={!!formErrors.baseTuitionFee}
                                    helperText={
                                        formErrors.baseTuitionFee ||
                                        "Nhập học phí gốc (VND). Hiển thị phân cách hàng nghìn để dễ đọc."
                                    }
                                    InputProps={{
                                        startAdornment: currencyInputAdornment,
                                    }}
                                />

                                <TextField
                                    label="Tiêu chuẩn đầu ra"
                                    fullWidth
                                    value={formValues.graduationStandard}
                                    onChange={(e) => {
                                        setFormValues((prev) => ({ ...prev, graduationStandard: e.target.value }));
                                        setFormErrors((prev) => ({ ...prev, graduationStandard: undefined }));
                                    }}
                                    multiline
                                    rows={3}
                                    inputProps={{ maxLength: MAX_TEXT_FIELD_LEN }}
                                    error={!!formErrors.graduationStandard}
                                    helperText={
                                        formErrors.graduationStandard ||
                                        `Mô tả các chứng chỉ/kỹ năng đạt được. Tối đa ${MAX_TEXT_FIELD_LEN} ký tự.`
                                    }
                                />

                                <TextField
                                    label="Đối tượng học sinh"
                                    fullWidth
                                    value={formValues.targetStudentDescription}
                                    onChange={(e) => {
                                        setFormValues((prev) => ({ ...prev, targetStudentDescription: e.target.value }));
                                        setFormErrors((prev) => ({ ...prev, targetStudentDescription: undefined }));
                                    }}
                                    multiline
                                    rows={3}
                                    inputProps={{ maxLength: MAX_TEXT_FIELD_LEN }}
                                    error={!!formErrors.targetStudentDescription}
                                    helperText={
                                        formErrors.targetStudentDescription ||
                                        `Ví dụ: học sinh giỏi, định hướng du học... Tối đa ${MAX_TEXT_FIELD_LEN} ký tự.`
                                    }
                                />

                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#1e293b" }}>
                                            Trạng thái hoạt động
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "#64748b" }}>
                                            ON: Hoạt động • OFF: Không hoạt động
                                        </Typography>
                                    </Box>
                                    <Tooltip
                                        title={
                                            lockActiveSwitch
                                                ? "Có gói tuyển sinh hiệu lực (Mở / Tạm dừng / Đầy chỗ) — không thể tắt trạng thái hoạt động."
                                                : ""
                                        }
                                        disableHoverListener={!lockActiveSwitch}
                                    >
                                        <span>
                                            <Switch
                                                checked={!!formValues.isActive}
                                                disabled={lockActiveSwitch}
                                                onChange={(e) =>
                                                    setFormValues((prev) => ({ ...prev, isActive: e.target.checked }))
                                                }
                                                sx={{
                                                    "& .MuiSwitch-switchBase.Mui-checked": { color: "#16a34a" },
                                                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                                        backgroundColor: "#16a34a",
                                                    },
                                                }}
                                            />
                                        </span>
                                    </Tooltip>
                                </Box>
                            </>
                        )}

                        {activeStep === 2 && (
                            <>
                                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1e293b" }}>
                                    Step 3. Xem lại & Gửi yêu cầu
                                </Typography>

                                {curriculumSelectionWarning && (
                                    <Alert severity="warning">{curriculumSelectionWarning}</Alert>
                                )}

                                <Card
                                    elevation={0}
                                    sx={{
                                        border: "1px solid #e2e8f0",
                                        borderRadius: 3,
                                        bgcolor: "#F8FAFC",
                                    }}
                                >
                                    <CardContent sx={{ p: 2.6 }}>
                                        <Stack spacing={1.5}>
                                            <Box>
                                                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                    Curriculum
                                                </Typography>
                                                <Typography sx={{ fontWeight: 900, color: "#1e293b" }}>
                                                    {curriculumPreview?.subTypeName || selectedCurriculum?.subTypeName || "—"}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: "#64748b" }}>
                                                    {curriculumPreview?.enrollmentYear || selectedCurriculum?.enrollmentYear || "—"} •{" "}
                                                    {toCurriculumTypeLabel(curriculumPreview?.curriculumType || selectedCurriculum?.curriculumType)}
                                                </Typography>
                                            </Box>

                                            <Divider />

                                            <Box>
                                                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                    Học phí gốc
                                                </Typography>
                                                <Typography sx={{ fontWeight: 950, color: "#1e293b" }}>{formatVND(formValues.baseTuitionFee)}</Typography>
                                            </Box>

                                            <Box>
                                                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                    Đối tượng học sinh
                                                </Typography>
                                                <Typography sx={{ color: "#334155", whiteSpace: "pre-wrap" }}>
                                                    {formValues.targetStudentDescription || "—"}
                                                </Typography>
                                            </Box>

                                            <Box>
                                                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                    Tiêu chuẩn đầu ra
                                                </Typography>
                                                <Typography sx={{ color: "#334155", whiteSpace: "pre-wrap" }}>
                                                    {formValues.graduationStandard || "—"}
                                                </Typography>
                                            </Box>

                                            <Box>
                                                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                    Trạng thái
                                                </Typography>
                                                <ProgramStatusBadge isActiveBool={!!formValues.isActive} />
                                            </Box>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                            </Stack>
                        </>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2.2, borderTop: "1px solid #e2e8f0", gap: 1 }}>
                    {modalMode === "view" ? (
                        <Button
                            onClick={handleCloseProgramModal}
                            variant="contained"
                            sx={{
                                textTransform: "none",
                                fontWeight: 800,
                                borderRadius: 2,
                                px: 3,
                                background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                            }}
                        >
                            Đóng
                        </Button>
                    ) : (
                        <>
                            <Button
                                onClick={handleCloseProgramModal}
                                variant="text"
                                color="inherit"
                                sx={{ textTransform: "none", fontWeight: 800 }}
                                disabled={submitLoading}
                            >
                                Hủy
                            </Button>

                            {activeStep > 0 ? (
                                <Button
                                    onClick={handleBack}
                                    variant="outlined"
                                    disabled={submitLoading}
                                    sx={{ textTransform: "none", fontWeight: 800, borderRadius: 2, px: 3 }}
                                >
                                    Quay lại
                                </Button>
                            ) : (
                                <Box sx={{ flex: 1 }} />
                            )}

                            {activeStep < 2 ? (
                                <Button
                                    onClick={handleNext}
                                    variant="contained"
                                    disabled={submitLoading}
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 950,
                                        borderRadius: 2,
                                        px: 3,
                                        background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                                    }}
                                >
                                    Tiếp tục
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    variant="contained"
                                    disabled={submitLoading}
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 950,
                                        borderRadius: 2,
                                        px: 3,
                                        background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                                    }}
                                >
                                    {submitLoading
                                        ? "Đang gửi..."
                                        : modalMode === "create"
                                          ? "Tạo Program"
                                          : "Cập nhật Program"}
                                </Button>
                            )}
                        </>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
}

function SelectLike({ value, options, onChange, label }) {
    return (
        <TextField
            select
            size="small"
            fullWidth
            value={value}
            label={label}
            onChange={(e) => onChange(e.target.value)}
            sx={{ borderRadius: 2, bgcolor: "white" }}
        >
            {(options || []).map((opt) => (
                <MenuItem key={String(opt.value)} value={opt.value}>
                    {opt.label}
                </MenuItem>
            ))}
        </TextField>
    );
}

